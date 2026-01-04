/**
 * Agency Access Service
 * Story 2.3: Grant Agency Group Access to Users
 * Story 2.4: Grant Subagency-Specific Access
 *
 * Provides operations for managing agency access:
 * - Agency group-level access (user sees all subagencies in group)
 * - Subagency-specific access (user sees only that subagency)
 * - User search autocomplete
 * - Cache invalidation on access changes
 */

import { prisma } from '../db/index.js';
import { auditService, AuditAction } from './auditService.js';
import { invalidateUserContext } from './userContextService.js';

type PrismaUniqueError = {
  code?: string;
};

function isUniqueConstraintError(error: unknown): boolean {
  const prismaError = error as PrismaUniqueError;
  return prismaError?.code === 'P2002';
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface AgencyGroupAccessUser {
  contactId: string;
  name: string;
  email: string;
  grantedBy: { id: string; name: string } | null;
  grantedAt: Date;
}

export interface SubagencyAccessUser {
  contactId: string;
  name: string;
  email: string;
  accessType: 'direct' | 'inherited';
  inheritedFrom?: { agencyGroupId: string; agencyGroupName: string };
  grantedBy?: { id: string; name: string } | null;
  grantedAt?: Date;
}

export interface ContactSearchResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  roles: string[];
  jobTitle?: string | null;
}

// =============================================================================
// AGENCY GROUP ACCESS
// =============================================================================

/**
 * Get all users with access to an agency group
 */
export async function getAgencyGroupAccess(agencyGroupId: string): Promise<AgencyGroupAccessUser[]> {
  const grants = await prisma.agencyGroupGrant.findMany({
    where: { agencyGroupId },
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      grantedByUser: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { grantedAt: 'desc' },
  });

  return grants.map((g) => ({
    contactId: g.contact.id,
    name: [g.contact.firstName, g.contact.lastName].filter(Boolean).join(' ') || g.contact.email,
    email: g.contact.email,
    grantedBy: g.grantedByUser
      ? {
          id: g.grantedByUser.id,
          name:
            [g.grantedByUser.firstName, g.grantedByUser.lastName].filter(Boolean).join(' ') ||
            'Unknown',
        }
      : null,
    grantedAt: g.grantedAt,
  }));
}

/**
 * Grant agency group access to a user
 */
export async function grantAgencyGroupAccess(
  agencyGroupId: string,
  contactId: string,
  grantedBy: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  // Verify agency group exists
  const agencyGroup = await prisma.agencyGroup.findUnique({
    where: { id: agencyGroupId },
    select: { id: true, name: true },
  });

  if (!agencyGroup) {
    throw new AgencyAccessError('Agency group not found', 'AGENCY_GROUP_NOT_FOUND');
  }

  // Verify contact exists
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, email: true, cognitoId: true, firstName: true, lastName: true },
  });

  if (!contact) {
    throw new AgencyAccessError('User not found', 'USER_NOT_FOUND');
  }

  // Check if already has access
  const existing = await prisma.agencyGroupGrant.findUnique({
    where: {
      contactId_agencyGroupId: { contactId, agencyGroupId },
    },
  });

  if (existing) {
    throw new AgencyAccessError('User already has access to this agency group', 'ALREADY_GRANTED');
  }

  // Grant access
  try {
    await prisma.agencyGroupGrant.create({
      data: {
        contactId,
        agencyGroupId,
        grantedBy,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AgencyAccessError('User already has access to this agency group', 'ALREADY_GRANTED');
    }
    throw error;
  }

  // Invalidate user context cache so they get updated access
  if (contact.cognitoId) {
    invalidateUserContext(contact.cognitoId);
  }

  // Audit log
  await auditService.log({
    action: AuditAction.AGENCY_GROUP_ACCESS_GRANTED,
    entityType: 'agency_group_grant',
    entityId: agencyGroupId,
    userId: grantedBy,
    details: {
      contactId,
      contactEmail: contact.email,
      contactName: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
      agencyGroupId,
      agencyGroupName: agencyGroup.name,
    },
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });
}

/**
 * Revoke agency group access from a user
 */
export async function revokeAgencyGroupAccess(
  agencyGroupId: string,
  contactId: string,
  revokedBy: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  // Verify the grant exists
  const grant = await prisma.agencyGroupGrant.findUnique({
    where: {
      contactId_agencyGroupId: { contactId, agencyGroupId },
    },
    include: {
      contact: {
        select: { email: true, cognitoId: true, firstName: true, lastName: true },
      },
      agencyGroup: {
        select: { name: true },
      },
    },
  });

  if (!grant) {
    throw new AgencyAccessError('Access grant not found', 'GRANT_NOT_FOUND');
  }

  // Delete the grant
  await prisma.agencyGroupGrant.delete({
    where: {
      contactId_agencyGroupId: { contactId, agencyGroupId },
    },
  });

  // Invalidate user context cache
  if (grant.contact.cognitoId) {
    invalidateUserContext(grant.contact.cognitoId);
  }

  // Audit log
  await auditService.log({
    action: AuditAction.AGENCY_GROUP_ACCESS_REVOKED,
    entityType: 'agency_group_grant',
    entityId: agencyGroupId,
    userId: revokedBy,
    details: {
      contactId,
      contactEmail: grant.contact.email,
      contactName: [grant.contact.firstName, grant.contact.lastName].filter(Boolean).join(' '),
      agencyGroupId,
      agencyGroupName: grant.agencyGroup.name,
    },
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });
}

// =============================================================================
// SUBAGENCY ACCESS
// =============================================================================

/**
 * Get all users with access to a subagency (direct + inherited from group)
 */
export async function getSubagencyAccess(subagencyId: string): Promise<SubagencyAccessUser[]> {
  // Get subagency with its agency group
  const subagency = await prisma.subagency.findUnique({
    where: { id: subagencyId },
    include: { agencyGroup: true },
  });

  if (!subagency) {
    throw new AgencyAccessError('Subagency not found', 'SUBAGENCY_NOT_FOUND');
  }

  // Get direct subagency grants
  const directGrants = await prisma.subagencyGrant.findMany({
    where: { subagencyId },
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      grantedByUser: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Get inherited access from agency group
  const inheritedGrants = await prisma.agencyGroupGrant.findMany({
    where: { agencyGroupId: subagency.agencyGroupId },
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      grantedByUser: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  const users: SubagencyAccessUser[] = [];

  // Add direct access users
  for (const g of directGrants) {
    users.push({
      contactId: g.contact.id,
      name: [g.contact.firstName, g.contact.lastName].filter(Boolean).join(' ') || g.contact.email,
      email: g.contact.email,
      accessType: 'direct',
      grantedBy: g.grantedByUser
        ? {
            id: g.grantedByUser.id,
            name: [g.grantedByUser.firstName, g.grantedByUser.lastName].filter(Boolean).join(' '),
          }
        : null,
      grantedAt: g.grantedAt,
    });
  }

  // Add inherited access users (excluding those with direct access)
  const directContactIds = new Set(directGrants.map((g) => g.contact.id));
  for (const g of inheritedGrants) {
    if (!directContactIds.has(g.contact.id)) {
      users.push({
        contactId: g.contact.id,
        name:
          [g.contact.firstName, g.contact.lastName].filter(Boolean).join(' ') || g.contact.email,
        email: g.contact.email,
        accessType: 'inherited',
        inheritedFrom: {
          agencyGroupId: subagency.agencyGroupId,
          agencyGroupName: subagency.agencyGroup.name,
        },
        grantedBy: g.grantedByUser
          ? {
              id: g.grantedByUser.id,
              name: [g.grantedByUser.firstName, g.grantedByUser.lastName].filter(Boolean).join(' '),
            }
          : null,
        grantedAt: g.grantedAt,
      });
    }
  }

  return users;
}

/**
 * Grant subagency-specific access to a user
 */
export async function grantSubagencyAccess(
  subagencyId: string,
  contactId: string,
  grantedBy: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  // Verify subagency exists
  const subagency = await prisma.subagency.findUnique({
    where: { id: subagencyId },
    include: { agencyGroup: { select: { name: true } } },
  });

  if (!subagency) {
    throw new AgencyAccessError('Subagency not found', 'SUBAGENCY_NOT_FOUND');
  }

  // Verify contact exists
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, email: true, cognitoId: true, firstName: true, lastName: true },
  });

  if (!contact) {
    throw new AgencyAccessError('User not found', 'USER_NOT_FOUND');
  }

  // Check if already has direct access
  const existing = await prisma.subagencyGrant.findUnique({
    where: {
      contactId_subagencyId: { contactId, subagencyId },
    },
  });

  if (existing) {
    throw new AgencyAccessError('User already has direct access to this subagency', 'ALREADY_GRANTED');
  }

  // Grant access
  try {
    await prisma.subagencyGrant.create({
      data: {
        contactId,
        subagencyId,
        grantedBy,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AgencyAccessError('User already has direct access to this subagency', 'ALREADY_GRANTED');
    }
    throw error;
  }

  // Invalidate user context cache
  if (contact.cognitoId) {
    invalidateUserContext(contact.cognitoId);
  }

  // Audit log
  await auditService.log({
    action: AuditAction.SUBAGENCY_ACCESS_GRANTED,
    entityType: 'subagency_grant',
    entityId: subagencyId,
    userId: grantedBy,
    details: {
      contactId,
      contactEmail: contact.email,
      contactName: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
      subagencyId,
      subagencyName: subagency.name,
      agencyGroupName: subagency.agencyGroup.name,
    },
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });
}

/**
 * Revoke subagency-specific access from a user
 */
export async function revokeSubagencyAccess(
  subagencyId: string,
  contactId: string,
  revokedBy: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  // Verify the grant exists
  const grant = await prisma.subagencyGrant.findUnique({
    where: {
      contactId_subagencyId: { contactId, subagencyId },
    },
    include: {
      contact: {
        select: { email: true, cognitoId: true, firstName: true, lastName: true },
      },
      subagency: {
        include: { agencyGroup: { select: { name: true } } },
      },
    },
  });

  if (!grant) {
    throw new AgencyAccessError('Access grant not found', 'GRANT_NOT_FOUND');
  }

  // Delete the grant
  await prisma.subagencyGrant.delete({
    where: {
      contactId_subagencyId: { contactId, subagencyId },
    },
  });

  // Invalidate user context cache
  if (grant.contact.cognitoId) {
    invalidateUserContext(grant.contact.cognitoId);
  }

  // Audit log
  await auditService.log({
    action: AuditAction.SUBAGENCY_ACCESS_REVOKED,
    entityType: 'subagency_grant',
    entityId: subagencyId,
    userId: revokedBy,
    details: {
      contactId,
      contactEmail: grant.contact.email,
      contactName: [grant.contact.firstName, grant.contact.lastName].filter(Boolean).join(' '),
      subagencyId,
      subagencyName: grant.subagency.name,
      agencyGroupName: grant.subagency.agencyGroup.name,
    },
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });
}

// =============================================================================
// CONTACT SEARCH
// =============================================================================

/**
 * Search contacts for autocomplete
 * Requires at least 3 characters, returns max 10 results
 */
export async function searchContacts(query: string): Promise<ContactSearchResult[]> {
  if (!query || query.length < 3) {
    return [];
  }

  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
      active: true, // Only active users
      isInternal: true, // Only internal users
    },
    include: {
      contactRoles: {
        include: {
          role: {
            select: { name: true },
          },
        },
      },
    },
    take: 10,
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  return contacts.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    roles: c.contactRoles.map((cr) => cr.role.name),
    jobTitle: c.jobTitle,
  }));
}

// =============================================================================
// ERROR CLASS
// =============================================================================

export class AgencyAccessError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AgencyAccessError';
    this.code = code;
  }
}

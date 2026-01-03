/**
 * Bulk User Operations Service
 * Story 2.7: Bulk User Operations
 *
 * Provides bulk role assignment, agency access grants, deactivation, and export support.
 * Ensures audit logging and user context invalidation per operation.
 */

import { randomUUID } from 'crypto';
import { prisma } from '../db/index.js';
import { auditService, AuditAction } from './auditService.js';
import { invalidateUserContext } from './userContextService.js';

export class BulkUserOperationError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'BulkUserOperationError';
    this.code = code;
    this.details = details;
  }
}

export interface BulkRoleAssignResult {
  batchId: string;
  assignedCount: number;
  skippedCount: number;
  results: Array<{
    userId: string;
    status: 'assigned' | 'skipped' | 'error';
    reason?: string;
  }>;
}

export interface BulkAccessGrantResult {
  batchId: string;
  grantedCount: number;
  skippedCount: number;
  results: Array<{
    userId: string;
    granted: number;
    skipped: number;
    errors: string[];
  }>;
}

export interface BulkDeactivateResult {
  batchId: string;
  deactivatedCount: number;
  skippedCount: number;
  skippedSelf: boolean;
  results: Array<{
    userId: string;
    status: 'deactivated' | 'skipped' | 'error';
    reason?: string;
  }>;
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => id && id.trim().length > 0)));
}

function buildUserResultMap(userIds: string[]) {
  return new Map(
    userIds.map((id) => [
      id,
      {
        userId: id,
        granted: 0,
        skipped: 0,
        errors: [] as string[],
      },
    ])
  );
}

export async function bulkAssignRole(
  userIds: string[],
  roleId: string,
  actorId: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<BulkRoleAssignResult> {
  const uniqueUserIds = uniqueIds(userIds);

  if (uniqueUserIds.length === 0) {
    throw new BulkUserOperationError('At least one userId is required', 'INVALID_INPUT');
  }

  if (!roleId || roleId.trim().length === 0) {
    throw new BulkUserOperationError('roleId is required', 'INVALID_INPUT');
  }

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, name: true },
  });

  if (!role) {
    throw new BulkUserOperationError('Role not found', 'ROLE_NOT_FOUND');
  }

  const contacts = await prisma.contact.findMany({
    where: { id: { in: uniqueUserIds } },
    select: { id: true, cognitoId: true, email: true, firstName: true, lastName: true },
  });

  const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));
  const missingIds = uniqueUserIds.filter((id) => !contactMap.has(id));
  const contactIds = contacts.map((contact) => contact.id);

  const existingRoles = await prisma.contactRole.findMany({
    where: {
      contactId: { in: contactIds },
      roleId,
    },
    select: { contactId: true },
  });

  const existingSet = new Set(existingRoles.map((entry) => entry.contactId));
  const toAssign = contactIds.filter((id) => !existingSet.has(id));
  const assignedSet = new Set(toAssign);
  const batchId = randomUUID();

  if (toAssign.length > 0) {
    await prisma.contactRole.createMany({
      data: toAssign.map((contactId) => ({
        contactId,
        roleId: role.id,
        grantedBy: actorId,
      })),
    });

    await Promise.all(
      toAssign.map((contactId) =>
        auditService.log({
          action: AuditAction.BULK_ROLE_ASSIGN,
          entityType: 'contact_role',
          entityId: contactId,
          userId: actorId,
          ipAddress: auditContext?.ipAddress,
          userAgent: auditContext?.userAgent,
          details: {
            batchId,
            roleId: role.id,
            roleName: role.name,
            contactId,
          },
        })
      )
    );
  }

  for (const contact of contacts) {
    if (assignedSet.has(contact.id) && contact.cognitoId) {
      invalidateUserContext(contact.cognitoId);
    }
  }

  const results = uniqueUserIds.map((userId) => {
    if (missingIds.includes(userId)) {
      return { userId, status: 'error' as const, reason: 'USER_NOT_FOUND' };
    }
    if (existingSet.has(userId)) {
      return { userId, status: 'skipped' as const, reason: 'ALREADY_ASSIGNED' };
    }
    return { userId, status: 'assigned' as const };
  });

  return {
    batchId,
    assignedCount: toAssign.length,
    skippedCount: results.filter((result) => result.status !== 'assigned').length,
    results,
  };
}

export async function bulkGrantAccess(
  userIds: string[],
  input: { agencyGroupId?: string; subagencyIds?: string[] },
  actorId: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<BulkAccessGrantResult> {
  const uniqueUserIds = uniqueIds(userIds);

  if (uniqueUserIds.length === 0) {
    throw new BulkUserOperationError('At least one userId is required', 'INVALID_INPUT');
  }

  const hasGroup = typeof input.agencyGroupId === 'string' && input.agencyGroupId.trim().length > 0;
  const subagencyIds = input.subagencyIds ? uniqueIds(input.subagencyIds) : [];
  const hasSubagencies = subagencyIds.length > 0;

  if (hasGroup === hasSubagencies) {
    throw new BulkUserOperationError(
      'Provide either agencyGroupId or subagencyIds',
      'MISSING_ACCESS_TARGET'
    );
  }

  const contacts = await prisma.contact.findMany({
    where: { id: { in: uniqueUserIds } },
    select: { id: true, cognitoId: true, email: true, firstName: true, lastName: true },
  });

  const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));
  const missingIds = uniqueUserIds.filter((id) => !contactMap.has(id));
  const contactIds = contacts.map((contact) => contact.id);
  const batchId = randomUUID();

  const resultsMap = buildUserResultMap(uniqueUserIds);
  for (const missingId of missingIds) {
    const entry = resultsMap.get(missingId);
    if (entry) {
      entry.errors.push('USER_NOT_FOUND');
      entry.skipped += 1;
    }
  }

  if (hasGroup) {
    const agencyGroup = await prisma.agencyGroup.findUnique({
      where: { id: input.agencyGroupId },
      select: { id: true, name: true },
    });

    if (!agencyGroup) {
      throw new BulkUserOperationError('Agency group not found', 'AGENCY_GROUP_NOT_FOUND');
    }

    const existingGrants = await prisma.agencyGroupGrant.findMany({
      where: {
        agencyGroupId: agencyGroup.id,
        contactId: { in: contactIds },
      },
      select: { contactId: true },
    });

    const existingSet = new Set(existingGrants.map((grant) => grant.contactId));
    const toGrant = contactIds.filter((id) => !existingSet.has(id));
    const grantedSet = new Set(toGrant);

    if (toGrant.length > 0) {
      await prisma.agencyGroupGrant.createMany({
        data: toGrant.map((contactId) => ({
          contactId,
          agencyGroupId: agencyGroup.id,
          grantedBy: actorId,
        })),
      });

      await Promise.all(
        toGrant.map((contactId) =>
          auditService.log({
            action: AuditAction.BULK_ACCESS_GRANT,
            entityType: 'agency_group_grant',
            entityId: agencyGroup.id,
            userId: actorId,
            ipAddress: auditContext?.ipAddress,
            userAgent: auditContext?.userAgent,
            details: {
              batchId,
              accessType: 'agency_group',
              contactId,
              agencyGroupId: agencyGroup.id,
              agencyGroupName: agencyGroup.name,
            },
          })
        )
      );
    }

    for (const contact of contacts) {
      const entry = resultsMap.get(contact.id);
      if (!entry) continue;

      if (existingSet.has(contact.id)) {
        entry.skipped += 1;
      } else if (grantedSet.has(contact.id)) {
        entry.granted += 1;
      }
    }

    for (const contact of contacts) {
      if (grantedSet.has(contact.id) && contact.cognitoId) {
        invalidateUserContext(contact.cognitoId);
      }
    }

    const grantedCount = toGrant.length;
    const skippedCount = uniqueUserIds.length - grantedCount;

    return {
      batchId,
      grantedCount,
      skippedCount,
      results: Array.from(resultsMap.values()),
    };
  }

  const subagencies = await prisma.subagency.findMany({
    where: { id: { in: subagencyIds } },
    include: { agencyGroup: { select: { id: true, name: true } } },
  });

  if (subagencies.length !== subagencyIds.length) {
    throw new BulkUserOperationError('One or more subagencies not found', 'SUBAGENCY_NOT_FOUND');
  }

  const subagencyMap = new Map(
    subagencies.map((subagency) => [subagency.id, subagency])
  );

  if (missingIds.length > 0 && subagencyIds.length > 1) {
    for (const missingId of missingIds) {
      const entry = resultsMap.get(missingId);
      if (entry) {
        entry.skipped += subagencyIds.length - 1;
      }
    }
  }

  const existingGrants = await prisma.subagencyGrant.findMany({
    where: {
      contactId: { in: contactIds },
      subagencyId: { in: subagencyIds },
    },
    select: { contactId: true, subagencyId: true },
  });

  const existingKey = new Set(existingGrants.map((grant) => `${grant.contactId}:${grant.subagencyId}`));
  const toGrant: Array<{ contactId: string; subagencyId: string }> = [];

  for (const contactId of contactIds) {
    for (const subagencyId of subagencyIds) {
      const key = `${contactId}:${subagencyId}`;
      if (!existingKey.has(key)) {
        toGrant.push({ contactId, subagencyId });
      }
    }
  }

  if (toGrant.length > 0) {
    await prisma.subagencyGrant.createMany({
      data: toGrant.map((entry) => ({
        contactId: entry.contactId,
        subagencyId: entry.subagencyId,
        grantedBy: actorId,
      })),
    });

    await Promise.all(
      toGrant.map((entry) => {
        const subagency = subagencyMap.get(entry.subagencyId);
        return auditService.log({
          action: AuditAction.BULK_ACCESS_GRANT,
          entityType: 'subagency_grant',
          entityId: entry.subagencyId,
          userId: actorId,
          ipAddress: auditContext?.ipAddress,
          userAgent: auditContext?.userAgent,
          details: {
            batchId,
            accessType: 'subagency',
            contactId: entry.contactId,
            subagencyId: entry.subagencyId,
            subagencyName: subagency?.name,
            agencyGroupId: subagency?.agencyGroup.id,
            agencyGroupName: subagency?.agencyGroup.name,
          },
        });
      })
    );
  }

  const grantedByContact = new Map<string, number>();
  const skippedByContact = new Map<string, number>();

  for (const contactId of contactIds) {
    grantedByContact.set(contactId, 0);
    skippedByContact.set(contactId, 0);
  }

  for (const contactId of contactIds) {
    for (const subagencyId of subagencyIds) {
      const key = `${contactId}:${subagencyId}`;
      if (existingKey.has(key)) {
        skippedByContact.set(contactId, (skippedByContact.get(contactId) || 0) + 1);
      } else {
        grantedByContact.set(contactId, (grantedByContact.get(contactId) || 0) + 1);
      }
    }
  }

  for (const contact of contacts) {
    const entry = resultsMap.get(contact.id);
    if (!entry) continue;

    entry.granted += grantedByContact.get(contact.id) || 0;
    entry.skipped += skippedByContact.get(contact.id) || 0;
  }

  const contactsWithGrants = new Set(toGrant.map((entry) => entry.contactId));
  for (const contact of contacts) {
    if (contactsWithGrants.has(contact.id) && contact.cognitoId) {
      invalidateUserContext(contact.cognitoId);
    }
  }

  const grantedCount = toGrant.length;
  const expectedOps = uniqueUserIds.length * subagencyIds.length;
  const skippedCount = expectedOps - grantedCount;

  return {
    batchId,
    grantedCount,
    skippedCount,
    results: Array.from(resultsMap.values()),
  };
}

export async function bulkDeactivateUsers(
  userIds: string[],
  actorId: string,
  currentUserId: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<BulkDeactivateResult> {
  const uniqueUserIds = uniqueIds(userIds);

  if (uniqueUserIds.length === 0) {
    throw new BulkUserOperationError('At least one userId is required', 'INVALID_INPUT');
  }

  const skippedSelf = uniqueUserIds.includes(currentUserId);
  const filteredUserIds = uniqueUserIds.filter((id) => id !== currentUserId);

  const contacts = await prisma.contact.findMany({
    where: { id: { in: filteredUserIds } },
    select: { id: true, active: true, cognitoId: true, email: true, firstName: true, lastName: true },
  });

  const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));
  const missingIds = filteredUserIds.filter((id) => !contactMap.has(id));
  const toDeactivate = contacts.filter((contact) => contact.active).map((contact) => contact.id);

  const batchId = randomUUID();

  if (toDeactivate.length > 0) {
    await prisma.contact.updateMany({
      where: { id: { in: toDeactivate } },
      data: { active: false },
    });

    await Promise.all(
      toDeactivate.map((contactId) =>
        auditService.log({
          action: AuditAction.BULK_DEACTIVATE,
          entityType: 'contact',
          entityId: contactId,
          userId: actorId,
          ipAddress: auditContext?.ipAddress,
          userAgent: auditContext?.userAgent,
          details: {
            batchId,
            contactId,
          },
        })
      )
    );
  }

  for (const contact of contacts) {
    if (toDeactivate.includes(contact.id) && contact.cognitoId) {
      invalidateUserContext(contact.cognitoId);
    }
  }

  const results = uniqueUserIds.map((userId) => {
    if (userId === currentUserId) {
      return { userId, status: 'skipped' as const, reason: 'SELF_DEACTIVATION_BLOCKED' };
    }
    if (missingIds.includes(userId)) {
      return { userId, status: 'error' as const, reason: 'USER_NOT_FOUND' };
    }
    if (toDeactivate.includes(userId)) {
      return { userId, status: 'deactivated' as const };
    }
    return { userId, status: 'skipped' as const, reason: 'ALREADY_INACTIVE' };
  });

  return {
    batchId,
    deactivatedCount: toDeactivate.length,
    skippedCount: results.filter((result) => result.status !== 'deactivated').length,
    skippedSelf,
    results,
  };
}

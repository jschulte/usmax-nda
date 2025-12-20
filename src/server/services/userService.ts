/**
 * User Service
 * Story 2.5: User/Contact Management
 *
 * Provides CRUD operations for user/contact management:
 * - User directory listing with pagination
 * - User creation with validation
 * - User updates
 * - User deactivation (soft delete)
 * - Audit logging for all operations
 */

import { prisma } from '../db/index.js';
import type { Prisma } from '../../generated/prisma/index.js';
import { auditService, AuditAction } from './auditService.js';
import { invalidateUserContext } from './userContextService.js';

// =============================================================================
// INTERFACES
// =============================================================================

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  workPhone?: string;
  cellPhone?: string;
  jobTitle?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  workPhone?: string;
  cellPhone?: string;
  jobTitle?: string;
}

export interface UserListResult {
  users: UserWithAccess[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserWithAccess {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  workPhone: string | null;
  cellPhone: string | null;
  jobTitle: string | null;
  active: boolean;
  roles: string[];
  agencyAccess: {
    groups: string[];
    subagencies: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSearchResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  jobTitle: string | null;
  active: boolean;
  roles: string[];
}

// =============================================================================
// USER OPERATIONS
// =============================================================================

/**
 * List all users with pagination and optional search
 */
export async function listUsers(options: {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
}): Promise<UserListResult> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const skip = (page - 1) * limit;
  const search = options.search?.trim();

  // Build where clause
  const where: Prisma.ContactWhereInput = {};

  if (options.active !== undefined) {
    where.active = options.active;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Get total count
  const total = await prisma.contact.count({ where });

  // Get users with roles and access
  const users = await prisma.contact.findMany({
    where,
    include: {
      contactRoles: {
        include: {
          role: {
            select: { name: true },
          },
        },
      },
      agencyGroupGrants: {
        include: {
          agencyGroup: {
            select: { name: true },
          },
        },
      },
      subagencyGrants: {
        include: {
          subagency: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    skip,
    take: limit,
  });

  const formattedUsers: UserWithAccess[] = users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    workPhone: u.workPhone,
    cellPhone: u.cellPhone,
    jobTitle: u.jobTitle,
    active: u.active,
    roles: u.contactRoles.map((cr) => cr.role.name),
    agencyAccess: {
      groups: u.agencyGroupGrants.map((g) => g.agencyGroup.name),
      subagencies: u.subagencyGrants.map((g) => g.subagency.name),
    },
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  return {
    users: formattedUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Search users for autocomplete (type-ahead)
 */
export async function searchUsers(options: {
  query: string;
  active?: boolean;
  limit?: number;
}): Promise<UserSearchResult[]> {
  const query = options.query.trim();
  if (!query || query.length < 3) {
    return [];
  }

  const where: Prisma.ContactWhereInput = {
    OR: [
      { firstName: { contains: query, mode: 'insensitive' } },
      { lastName: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ],
  };

  if (options.active !== undefined) {
    where.active = options.active;
  }

  const users = await prisma.contact.findMany({
    where,
    include: {
      contactRoles: {
        include: {
          role: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    take: Math.min(50, Math.max(1, options.limit ?? 10)),
  });

  return users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    jobTitle: u.jobTitle,
    active: u.active,
    roles: u.contactRoles.map((cr) => cr.role.name),
  }));
}

/**
 * Get a single user by ID
 */
export async function getUser(id: string) {
  const user = await prisma.contact.findUnique({
    where: { id },
    include: {
      contactRoles: {
        include: {
          role: {
            select: { id: true, name: true, description: true },
          },
        },
      },
      agencyGroupGrants: {
        include: {
          agencyGroup: {
            select: { id: true, name: true, code: true },
          },
          grantedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      subagencyGrants: {
        include: {
          subagency: {
            select: {
              id: true,
              name: true,
              code: true,
              agencyGroup: { select: { name: true } },
            },
          },
          grantedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    workPhone: user.workPhone,
    cellPhone: user.cellPhone,
    jobTitle: user.jobTitle,
    active: user.active,
    cognitoId: user.cognitoId,
    roles: user.contactRoles.map((cr) => ({
      id: cr.role.id,
      name: cr.role.name,
      description: cr.role.description,
      grantedAt: cr.grantedAt,
    })),
    agencyGroupGrants: user.agencyGroupGrants.map((g) => ({
      agencyGroup: g.agencyGroup,
      grantedBy: g.grantedByUser
        ? {
            id: g.grantedByUser.id,
            name: [g.grantedByUser.firstName, g.grantedByUser.lastName].filter(Boolean).join(' '),
          }
        : null,
      grantedAt: g.grantedAt,
    })),
    subagencyGrants: user.subagencyGrants.map((g) => ({
      subagency: {
        ...g.subagency,
        agencyGroupName: g.subagency.agencyGroup.name,
      },
      grantedBy: g.grantedByUser
        ? {
            id: g.grantedByUser.id,
            name: [g.grantedByUser.firstName, g.grantedByUser.lastName].filter(Boolean).join(' '),
          }
        : null,
      grantedAt: g.grantedAt,
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Create a new user/contact
 */
export async function createUser(
  input: CreateUserInput,
  createdBy: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
) {
  const normalizedEmail = input.email.trim().toLowerCase();

  // Check for duplicate email
  const existing = await prisma.contact.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
  });

  if (existing) {
    throw new UserServiceError('Email already exists', 'DUPLICATE_EMAIL');
  }

  const user = await prisma.contact.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: normalizedEmail,
      workPhone: input.workPhone,
      cellPhone: input.cellPhone,
      jobTitle: input.jobTitle,
      isInternal: true,
      active: true,
    },
  });

  // Audit log
  await auditService.log({
    action: AuditAction.USER_CREATED,
    entityType: 'contact',
    entityId: user.id,
    userId: createdBy,
    details: {
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    },
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });

  return user;
}

/**
 * Update an existing user
 */
export async function updateUser(
  id: string,
  input: UpdateUserInput,
  updatedBy: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
) {
  // Check user exists
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) {
    throw new UserServiceError('User not found', 'NOT_FOUND');
  }

  const normalizedEmail = input.email ? input.email.trim().toLowerCase() : undefined;

  // Check for duplicate email if changing
  if (normalizedEmail && normalizedEmail !== existing.email.toLowerCase()) {
    const duplicate = await prisma.contact.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        id: { not: id },
      },
    });
    if (duplicate) {
      throw new UserServiceError('Email already exists', 'DUPLICATE_EMAIL');
    }
  }

  const user = await prisma.contact.update({
    where: { id },
    data: {
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(normalizedEmail !== undefined && { email: normalizedEmail }),
      ...(input.workPhone !== undefined && { workPhone: input.workPhone }),
      ...(input.cellPhone !== undefined && { cellPhone: input.cellPhone }),
      ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
    },
  });

  // Audit log
  await auditService.log({
    action: AuditAction.USER_UPDATED,
    entityType: 'contact',
    entityId: user.id,
    userId: updatedBy,
    details: {
      changes: input,
      previousEmail: existing.email,
      newEmail: user.email,
    },
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });

  return user;
}

/**
 * Deactivate a user (soft delete)
 * Preserves data for audit purposes but prevents login
 */
export async function deactivateUser(
  id: string,
  deactivatedBy: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
) {
  // Check user exists
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) {
    throw new UserServiceError('User not found', 'NOT_FOUND');
  }

  if (!existing.active) {
    throw new UserServiceError('User is already deactivated', 'ALREADY_DEACTIVATED');
  }

  // Prevent self-deactivation
  if (id === deactivatedBy) {
    throw new UserServiceError('Cannot deactivate yourself', 'SELF_DEACTIVATION');
  }

  const user = await prisma.contact.update({
    where: { id },
    data: { active: false },
  });

  // Invalidate user context cache so they can't access the system
  if (existing.cognitoId) {
    invalidateUserContext(existing.cognitoId);
  }

  // Audit log
  await auditService.log({
    action: AuditAction.USER_DEACTIVATED,
    entityType: 'contact',
    entityId: user.id,
    userId: deactivatedBy,
    details: {
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    },
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });

  return user;
}

// =============================================================================
// ERROR CLASS
// =============================================================================

export class UserServiceError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'UserServiceError';
    this.code = code;
  }
}

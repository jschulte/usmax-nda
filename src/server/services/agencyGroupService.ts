/**
 * Agency Group Service
 * Story 2.1: Agency Groups CRUD
 *
 * Provides CRUD operations for agency groups with:
 * - Subagency count for list view
 * - Delete prevention if subagencies exist
 * - Audit logging for all operations
 */

import { prisma } from '../db/index.js';
import { AuditAction } from './auditService.js';
import { detectFieldChanges } from '../utils/detectFieldChanges.js';
import type { UserContext } from '../types/auth.js';
import type { Prisma } from '../../generated/prisma/index.js';

export interface CreateAgencyGroupInput {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateAgencyGroupInput {
  name?: string;
  code?: string;
  description?: string | null;
}

export interface AgencyGroupWithCount {
  id: string;
  name: string;
  code: string;
  description: string | null;
  subagencyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

type AgencyGroupRecordWithCount = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { subagencies: number };
};

type PrismaUniqueError = {
  code?: string;
  meta?: {
    target?: string[] | string;
  };
};

function getUniqueConstraintTarget(error: unknown): string | null {
  const prismaError = error as PrismaUniqueError;
  if (prismaError?.code !== 'P2002') return null;

  const target = prismaError.meta?.target;
  if (Array.isArray(target)) {
    if (target.includes('name')) return 'name';
    if (target.includes('code')) return 'code';
  }
  if (typeof target === 'string') {
    if (target.includes('name')) return 'name';
    if (target.includes('code')) return 'code';
  }

  return null;
}

function mapUniqueConstraintError(error: unknown): AgencyGroupError | null {
  const target = getUniqueConstraintTarget(error);
  if (!target) return null;

  if (target === 'name') {
    return new AgencyGroupError('Agency group name must be unique', 'DUPLICATE_NAME');
  }

  if (target === 'code') {
    return new AgencyGroupError('Agency group code must be unique', 'DUPLICATE_CODE');
  }

  return null;
}

function mapGroupWithCount(group: AgencyGroupRecordWithCount): AgencyGroupWithCount {
  return {
    id: group.id,
    name: group.name,
    code: group.code,
    description: group.description,
    subagencyCount: group._count.subagencies,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

/**
 * Pagination parameters for agency groups
 * Story H-1: Agency Groups Pagination
 */
export interface ListAgencyGroupsParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Paginated response for agency groups
 * Story H-1: Agency Groups Pagination
 */
export interface AgencyGroupsListResult {
  agencyGroups: AgencyGroupWithCount[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Get all agency groups with subagency counts
 * Story H-1: Added pagination support
 */
export async function listAgencyGroups(
  params?: ListAgencyGroupsParams
): Promise<AgencyGroupsListResult> {
  const rawPage = params?.page;
  const rawLimit = params?.limit;
  const normalizedPage =
    Number.isFinite(rawPage) && (rawPage as number) > 0 ? Math.floor(rawPage as number) : 1;
  const normalizedLimit =
    Number.isFinite(rawLimit) && (rawLimit as number) > 0
      ? Math.min(Math.floor(rawLimit as number), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const search = params?.search?.trim();
  const skip = (normalizedPage - 1) * normalizedLimit;

  // Build where clause for optional search
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : undefined;

  // Get total count for pagination
  const total = await prisma.agencyGroup.count({ where });

  // Get paginated groups
  const groups = await prisma.agencyGroup.findMany({
    where,
    include: {
      _count: {
        select: { subagencies: true },
      },
    },
    orderBy: { name: 'asc' },
    skip,
    take: normalizedLimit,
  });

  return {
    agencyGroups: groups.map(mapGroupWithCount),
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      totalPages: Math.ceil(total / normalizedLimit),
    },
  };
}

/**
 * Get agency groups scoped to a user's access
 */
export async function listAgencyGroupsForUser(
  userContext: UserContext
): Promise<AgencyGroupWithCount[]> {
  const groupIds = new Set<string>(userContext.authorizedAgencyGroups || []);

  if (userContext.authorizedSubagencies?.length) {
    const subagencies = await prisma.subagency.findMany({
      where: { id: { in: userContext.authorizedSubagencies } },
      select: { agencyGroupId: true },
    });

    for (const subagency of subagencies) {
      groupIds.add(subagency.agencyGroupId);
    }
  }

  if (groupIds.size === 0) {
    return [];
  }

  const groups = await prisma.agencyGroup.findMany({
    where: { id: { in: Array.from(groupIds) } },
    include: {
      _count: {
        select: { subagencies: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  if (!userContext.authorizedSubagencies?.length) {
    return groups.map(mapGroupWithCount);
  }

  const fullAccessGroups = new Set<string>(userContext.authorizedAgencyGroups || []);
  const scopedCounts = await prisma.subagency.groupBy({
    by: ['agencyGroupId'],
    where: {
      id: { in: userContext.authorizedSubagencies },
      agencyGroupId: { in: Array.from(groupIds) },
    },
    _count: { _all: true },
  });

  const scopedCountMap = new Map<string, number>(
    scopedCounts.map((entry) => [entry.agencyGroupId, entry._count._all])
  );

  return groups.map((group) => {
    const fullAccess = fullAccessGroups.has(group.id);
    const subagencyCount = fullAccess
      ? group._count.subagencies
      : scopedCountMap.get(group.id) ?? 0;

    return {
      ...mapGroupWithCount(group),
      subagencyCount,
    };
  });
}

/**
 * Get a single agency group by ID with its subagencies
 */
export async function getAgencyGroup(id: string) {
  const group = await prisma.agencyGroup.findUnique({
    where: { id },
    include: {
      subagencies: {
        orderBy: { name: 'asc' },
      },
    },
  });

  return group;
}

/**
 * Create a new agency group
 */
export async function createAgencyGroup(
  input: CreateAgencyGroupInput,
  userId: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const normalizedName = input.name.trim();
      const normalizedCode = input.code.trim().toUpperCase();
      const normalizedDescription = input.description?.trim() || undefined;

      // Check for duplicate name or code
      const existing = await tx.agencyGroup.findFirst({
        where: {
          OR: [
            { name: { equals: normalizedName, mode: 'insensitive' } },
            { code: { equals: normalizedCode, mode: 'insensitive' } },
          ],
        },
      });

      if (existing) {
        const isNameDuplicate = existing.name.trim().toLowerCase() === normalizedName.toLowerCase();
        const isCodeDuplicate = existing.code.trim().toLowerCase() === normalizedCode.toLowerCase();
        throw new AgencyGroupError(
          isNameDuplicate
            ? 'Agency group name must be unique'
            : 'Agency group code must be unique',
          isNameDuplicate ? 'DUPLICATE_NAME' : 'DUPLICATE_CODE',
          isCodeDuplicate && !isNameDuplicate ? { field: 'code' } : undefined
        );
      }

      const group = await tx.agencyGroup.create({
        data: {
          name: normalizedName,
          code: normalizedCode,
          description: normalizedDescription,
        },
        include: {
          _count: { select: { subagencies: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.AGENCY_GROUP_CREATED,
          entityType: 'agency_group',
          entityId: group.id,
          userId,
          details: { name: group.name, code: group.code },
          ipAddress: auditContext?.ipAddress ?? null,
          userAgent: auditContext?.userAgent ?? null,
        },
      });

      return mapGroupWithCount(group);
    });
  } catch (error) {
    if (error instanceof AgencyGroupError) {
      throw error;
    }
    const mapped = mapUniqueConstraintError(error);
    if (mapped) {
      throw mapped;
    }
    throw error;
  }
}

/**
 * Update an existing agency group
 */
export async function updateAgencyGroup(
  id: string,
  input: UpdateAgencyGroupInput,
  userId: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const normalizedName = input.name?.trim();
      const normalizedCode = input.code?.trim().toUpperCase();
      // Check group exists
      const existing = await tx.agencyGroup.findUnique({ where: { id } });
      if (!existing) {
        throw new AgencyGroupError('Agency group not found', 'NOT_FOUND');
      }

      // Check for duplicate name if changing
      if (normalizedName && normalizedName !== existing.name) {
        const duplicate = await tx.agencyGroup.findFirst({
          where: {
            id: { not: id },
            name: { equals: normalizedName, mode: 'insensitive' },
          },
        });
        if (duplicate) {
          throw new AgencyGroupError('Agency group name must be unique', 'DUPLICATE_NAME');
        }
      }

      // Check for duplicate code if changing
      if (normalizedCode && normalizedCode !== existing.code) {
        const duplicate = await tx.agencyGroup.findFirst({
          where: {
            id: { not: id },
            code: { equals: normalizedCode, mode: 'insensitive' },
          },
        });
        if (duplicate) {
          throw new AgencyGroupError('Agency group code must be unique', 'DUPLICATE_CODE');
        }
      }

      const group = await tx.agencyGroup.update({
        where: { id },
        data: {
          ...(normalizedName && { name: normalizedName }),
          ...(normalizedCode && { code: normalizedCode }),
          ...(input.description !== undefined && { description: input.description }),
        },
        include: {
          _count: { select: { subagencies: true } },
        },
      });

      const beforeValues: Record<string, unknown> = {
        name: existing.name,
        code: existing.code,
        description: existing.description,
      };

      const afterValues: Record<string, unknown> = {
        name: normalizedName ?? existing.name,
        code: normalizedCode ?? existing.code,
        description: input.description ?? existing.description,
      };

      const fieldChanges = detectFieldChanges(beforeValues, afterValues);

      await tx.auditLog.create({
        data: {
          action: AuditAction.AGENCY_GROUP_UPDATED,
          entityType: 'agency_group',
          entityId: group.id,
          userId,
          details: {
            changes: fieldChanges,
            previousName: existing.name,
            newName: group.name,
          } as unknown as Prisma.InputJsonValue,
          ipAddress: auditContext?.ipAddress ?? null,
          userAgent: auditContext?.userAgent ?? null,
        },
      });

      return mapGroupWithCount(group);
    });
  } catch (error) {
    if (error instanceof AgencyGroupError) {
      throw error;
    }
    const mapped = mapUniqueConstraintError(error);
    if (mapped) {
      throw mapped;
    }
    throw error;
  }
}

/**
 * Delete an agency group (only if no subagencies exist)
 */
export async function deleteAgencyGroup(
  id: string,
  userId: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
) {
  return prisma.$transaction(async (tx) => {
    // Check group exists
    const group = await tx.agencyGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subagencies: true },
        },
      },
    });

    if (!group) {
      throw new AgencyGroupError('Agency group not found', 'NOT_FOUND');
    }

    // Prevent deletion if subagencies exist
    if (group._count.subagencies > 0) {
      throw new AgencyGroupError(
        'Cannot delete agency group with existing subagencies',
        'HAS_SUBAGENCIES',
        { subagencyCount: group._count.subagencies }
      );
    }

    await tx.agencyGroup.delete({ where: { id } });

    await tx.auditLog.create({
      data: {
        action: AuditAction.AGENCY_GROUP_DELETED,
        entityType: 'agency_group',
        entityId: id,
        userId,
        details: { name: group.name, code: group.code },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
      },
    });
  });
}

/**
 * Custom error class for agency group operations
 */
export class AgencyGroupError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AgencyGroupError';
    this.code = code;
    this.details = details;
  }
}

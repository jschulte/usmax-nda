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

export interface CreateAgencyGroupInput {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateAgencyGroupInput {
  name?: string;
  code?: string;
  description?: string;
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

/**
 * Get all agency groups with subagency counts
 */
export async function listAgencyGroups(): Promise<AgencyGroupWithCount[]> {
  const groups = await prisma.agencyGroup.findMany({
    include: {
      _count: {
        select: { subagencies: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    code: g.code,
    description: g.description,
    subagencyCount: g._count.subagencies,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }));
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
      // Check for duplicate name or code
      const existing = await tx.agencyGroup.findFirst({
        where: {
          OR: [{ name: input.name }, { code: input.code }],
        },
      });

      if (existing) {
        const isNameDuplicate = existing.name === input.name;
        throw new AgencyGroupError(
          isNameDuplicate
            ? 'Agency group name must be unique'
            : 'Agency group code must be unique',
          isNameDuplicate ? 'DUPLICATE_NAME' : 'DUPLICATE_CODE'
        );
      }

      const group = await tx.agencyGroup.create({
        data: {
          name: input.name,
          code: input.code,
          description: input.description,
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

      return group;
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
      // Check group exists
      const existing = await tx.agencyGroup.findUnique({ where: { id } });
      if (!existing) {
        throw new AgencyGroupError('Agency group not found', 'NOT_FOUND');
      }

      // Check for duplicate name if changing
      if (input.name && input.name !== existing.name) {
        const duplicate = await tx.agencyGroup.findUnique({
          where: { name: input.name },
        });
        if (duplicate) {
          throw new AgencyGroupError('Agency group name must be unique', 'DUPLICATE_NAME');
        }
      }

      // Check for duplicate code if changing
      if (input.code && input.code !== existing.code) {
        const duplicate = await tx.agencyGroup.findUnique({
          where: { code: input.code },
        });
        if (duplicate) {
          throw new AgencyGroupError('Agency group code must be unique', 'DUPLICATE_CODE');
        }
      }

      const group = await tx.agencyGroup.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.code && { code: input.code }),
          ...(input.description !== undefined && { description: input.description }),
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.AGENCY_GROUP_UPDATED,
          entityType: 'agency_group',
          entityId: group.id,
          userId,
          details: {
            changes: input,
            previousName: existing.name,
            newName: group.name,
          },
          ipAddress: auditContext?.ipAddress ?? null,
          userAgent: auditContext?.userAgent ?? null,
        },
      });

      return group;
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

/**
 * Subagency Service
 * Story 2.2: Subagencies CRUD
 *
 * Provides CRUD operations for subagencies with:
 * - NDA count for list view
 * - Delete prevention if NDAs exist
 * - Unique name within group validation
 * - Audit logging for all operations
 */

import { prisma } from '../db/index.js';
import { auditService, AuditAction } from './auditService.js';

export interface CreateSubagencyInput {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateSubagencyInput {
  name?: string;
  code?: string;
  description?: string;
}

export interface SubagencyWithCount {
  id: string;
  name: string;
  code: string;
  description: string | null;
  agencyGroupId: string;
  ndaCount: number;
  createdAt: Date;
  updatedAt: Date;
}

type PrismaUniqueError = {
  code?: string;
  meta?: {
    target?: string[] | string;
  };
};

function getUniqueConstraintTarget(error: unknown): 'name' | 'code' | null {
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
    if (target.includes('subagencies_agency_group_id_name')) return 'name';
    if (target.includes('subagencies_agency_group_id_code')) return 'code';
  }

  return null;
}

function mapUniqueConstraintError(error: unknown): SubagencyError | null {
  const target = getUniqueConstraintTarget(error);
  if (!target) return null;

  if (target === 'name') {
    return new SubagencyError(
      'Subagency name must be unique within agency group',
      'DUPLICATE_NAME'
    );
  }

  return new SubagencyError(
    'Subagency code must be unique within agency group',
    'DUPLICATE_CODE'
  );
}

function normalizeName(value: string): string {
  return value.trim();
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Get all subagencies within an agency group with NDA counts
 * Optionally filter to a list of allowed subagency IDs.
 */
export async function listSubagenciesInGroup(
  agencyGroupId: string,
  allowedSubagencyIds?: string[]
): Promise<SubagencyWithCount[]> {
  const subagencies = await prisma.subagency.findMany({
    where: {
      agencyGroupId,
      ...(allowedSubagencyIds ? { id: { in: allowedSubagencyIds } } : {}),
    },
    include: {
      _count: {
        select: { ndas: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return subagencies.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    description: s.description,
    agencyGroupId: s.agencyGroupId,
    ndaCount: s._count.ndas,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

/**
 * Get a single subagency by ID
 */
export async function getSubagency(id: string) {
  const subagency = await prisma.subagency.findUnique({
    where: { id },
    include: {
      agencyGroup: {
        select: { id: true, name: true, code: true },
      },
      _count: {
        select: { ndas: true },
      },
    },
  });

  if (!subagency) return null;

  return {
    id: subagency.id,
    name: subagency.name,
    code: subagency.code,
    description: subagency.description,
    agencyGroupId: subagency.agencyGroupId,
    agencyGroup: subagency.agencyGroup,
    ndaCount: subagency._count.ndas,
    createdAt: subagency.createdAt,
    updatedAt: subagency.updatedAt,
  };
}

/**
 * Create a new subagency within an agency group
 */
export async function createSubagency(
  agencyGroupId: string,
  input: CreateSubagencyInput,
  userId: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
) {
  const normalizedName = normalizeName(input.name);
  const normalizedCode = normalizeCode(input.code);

  // Verify agency group exists
  const agencyGroup = await prisma.agencyGroup.findUnique({
    where: { id: agencyGroupId },
  });

  if (!agencyGroup) {
    throw new SubagencyError('Agency group not found', 'AGENCY_GROUP_NOT_FOUND');
  }

  // Check for duplicate name within the group
  const existingByName = await prisma.subagency.findFirst({
    where: {
      agencyGroupId,
      name: {
        equals: normalizedName,
        mode: 'insensitive',
      },
    },
  });

  if (existingByName) {
    throw new SubagencyError(
      'Subagency name must be unique within agency group',
      'DUPLICATE_NAME'
    );
  }

  // Check for duplicate code within the group
  const existingByCode = await prisma.subagency.findFirst({
    where: {
      agencyGroupId,
      code: {
        equals: normalizedCode,
        mode: 'insensitive',
      },
    },
  });

  if (existingByCode) {
    throw new SubagencyError(
      'Subagency code must be unique within agency group',
      'DUPLICATE_CODE'
    );
  }

  try {
    const subagency = await prisma.subagency.create({
      data: {
        name: normalizedName,
        code: normalizedCode,
        description: input.description,
        agencyGroupId,
      },
    });

    // Audit log
    await auditService.log({
      action: AuditAction.SUBAGENCY_CREATED,
      entityType: 'subagency',
      entityId: subagency.id,
      userId,
      details: {
        name: subagency.name,
        code: subagency.code,
        agencyGroupId,
        agencyGroupName: agencyGroup.name,
      },
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    });

    return subagency;
  } catch (error) {
    const uniqueError = mapUniqueConstraintError(error);
    if (uniqueError) {
      throw uniqueError;
    }
    throw error;
  }
}

/**
 * Update an existing subagency
 */
export async function updateSubagency(
  id: string,
  input: UpdateSubagencyInput,
  userId: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
) {
  const normalizedName = input.name ? normalizeName(input.name) : undefined;
  const normalizedCode = input.code ? normalizeCode(input.code) : undefined;

  // Check subagency exists
  const existing = await prisma.subagency.findUnique({
    where: { id },
    include: { agencyGroup: { select: { name: true } } },
  });

  if (!existing) {
    throw new SubagencyError('Subagency not found', 'NOT_FOUND');
  }

  // Check for duplicate name within the group if changing
  if (normalizedName && normalizedName !== existing.name) {
    const duplicateName = await prisma.subagency.findFirst({
      where: {
        agencyGroupId: existing.agencyGroupId,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
        NOT: { id },
      },
    });
    if (duplicateName) {
      throw new SubagencyError(
        'Subagency name must be unique within agency group',
        'DUPLICATE_NAME'
      );
    }
  }

  // Check for duplicate code within the group if changing
  if (normalizedCode && normalizedCode !== existing.code) {
    const duplicateCode = await prisma.subagency.findFirst({
      where: {
        agencyGroupId: existing.agencyGroupId,
        code: {
          equals: normalizedCode,
          mode: 'insensitive',
        },
        NOT: { id },
      },
    });
    if (duplicateCode) {
      throw new SubagencyError(
        'Subagency code must be unique within agency group',
        'DUPLICATE_CODE'
      );
    }
  }

  try {
    const subagency = await prisma.subagency.update({
      where: { id },
      data: {
        ...(normalizedName && { name: normalizedName }),
        ...(normalizedCode && { code: normalizedCode }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });

    // Audit log
    await auditService.log({
      action: AuditAction.SUBAGENCY_UPDATED,
      entityType: 'subagency',
      entityId: subagency.id,
      userId,
      details: {
        changes: {
          ...(normalizedName !== undefined ? { name: normalizedName } : {}),
          ...(normalizedCode !== undefined ? { code: normalizedCode } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
        } as any,
        previousName: existing.name,
        newName: subagency.name,
        agencyGroupName: existing.agencyGroup.name,
      },
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    });

    return subagency;
  } catch (error) {
    const uniqueError = mapUniqueConstraintError(error);
    if (uniqueError) {
      throw uniqueError;
    }
    throw error;
  }
}

/**
 * Delete a subagency (only if no NDAs exist)
 */
export async function deleteSubagency(
  id: string,
  userId: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
) {
  // Check subagency exists
  const subagency = await prisma.subagency.findUnique({
    where: { id },
    include: {
      agencyGroup: { select: { name: true } },
      _count: {
        select: { ndas: true },
      },
    },
  });

  if (!subagency) {
    throw new SubagencyError('Subagency not found', 'NOT_FOUND');
  }

  // Prevent deletion if NDAs exist
  if (subagency._count.ndas > 0) {
    throw new SubagencyError(
      `Cannot delete subagency with ${subagency._count.ndas} existing NDAs`,
      'HAS_NDAS',
      { ndaCount: subagency._count.ndas }
    );
  }

  await prisma.subagency.delete({ where: { id } });

  // Audit log
  await auditService.log({
    action: AuditAction.SUBAGENCY_DELETED,
    entityType: 'subagency',
    entityId: id,
    userId,
    details: {
      name: subagency.name,
      code: subagency.code,
      agencyGroupName: subagency.agencyGroup.name,
    },
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });
}

/**
 * Custom error class for subagency operations
 */
export class SubagencyError extends Error {
  code: string;
  details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'SubagencyError';
    this.code = code;
    this.details = details;
  }
}

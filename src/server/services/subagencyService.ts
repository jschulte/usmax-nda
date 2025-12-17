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

/**
 * Get all subagencies within an agency group with NDA counts
 */
export async function listSubagenciesInGroup(agencyGroupId: string): Promise<SubagencyWithCount[]> {
  const subagencies = await prisma.subagency.findMany({
    where: { agencyGroupId },
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
      name: input.name,
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
      code: input.code,
    },
  });

  if (existingByCode) {
    throw new SubagencyError(
      'Subagency code must be unique within agency group',
      'DUPLICATE_CODE'
    );
  }

  const subagency = await prisma.subagency.create({
    data: {
      name: input.name,
      code: input.code,
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
  // Check subagency exists
  const existing = await prisma.subagency.findUnique({
    where: { id },
    include: { agencyGroup: { select: { name: true } } },
  });

  if (!existing) {
    throw new SubagencyError('Subagency not found', 'NOT_FOUND');
  }

  // Check for duplicate name within the group if changing
  if (input.name && input.name !== existing.name) {
    const duplicateName = await prisma.subagency.findFirst({
      where: {
        agencyGroupId: existing.agencyGroupId,
        name: input.name,
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
  if (input.code && input.code !== existing.code) {
    const duplicateCode = await prisma.subagency.findFirst({
      where: {
        agencyGroupId: existing.agencyGroupId,
        code: input.code,
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

  const subagency = await prisma.subagency.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.code && { code: input.code }),
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
      changes: input,
      previousName: existing.name,
      newName: subagency.name,
      agencyGroupName: existing.agencyGroup.name,
    },
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });

  return subagency;
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

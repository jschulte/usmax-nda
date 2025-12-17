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
import { auditService, AuditAction } from './auditService.js';

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
  // Check for duplicate name
  const existing = await prisma.agencyGroup.findFirst({
    where: {
      OR: [{ name: input.name }, { code: input.code }],
    },
  });

  if (existing) {
    throw new AgencyGroupError(
      existing.name === input.name
        ? 'Agency group name must be unique'
        : 'Agency group code must be unique',
      'DUPLICATE_NAME'
    );
  }

  const group = await prisma.agencyGroup.create({
    data: {
      name: input.name,
      code: input.code,
      description: input.description,
    },
  });

  // Audit log
  await auditService.log({
    action: AuditAction.AGENCY_GROUP_CREATED,
    entityType: 'agency_group',
    entityId: group.id,
    userId,
    details: { name: group.name, code: group.code },
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });

  return group;
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
  // Check group exists
  const existing = await prisma.agencyGroup.findUnique({ where: { id } });
  if (!existing) {
    throw new AgencyGroupError('Agency group not found', 'NOT_FOUND');
  }

  // Check for duplicate name if changing
  if (input.name && input.name !== existing.name) {
    const duplicate = await prisma.agencyGroup.findUnique({
      where: { name: input.name },
    });
    if (duplicate) {
      throw new AgencyGroupError('Agency group name must be unique', 'DUPLICATE_NAME');
    }
  }

  // Check for duplicate code if changing
  if (input.code && input.code !== existing.code) {
    const duplicate = await prisma.agencyGroup.findUnique({
      where: { code: input.code },
    });
    if (duplicate) {
      throw new AgencyGroupError('Agency group code must be unique', 'DUPLICATE_CODE');
    }
  }

  const group = await prisma.agencyGroup.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.code && { code: input.code }),
      ...(input.description !== undefined && { description: input.description }),
    },
  });

  // Audit log
  await auditService.log({
    action: AuditAction.AGENCY_GROUP_UPDATED,
    entityType: 'agency_group',
    entityId: group.id,
    userId,
    details: {
      changes: input,
      previousName: existing.name,
      newName: group.name,
    },
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });

  return group;
}

/**
 * Delete an agency group (only if no subagencies exist)
 */
export async function deleteAgencyGroup(
  id: string,
  userId: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
) {
  // Check group exists
  const group = await prisma.agencyGroup.findUnique({
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
      `Cannot delete agency group with ${group._count.subagencies} existing subagencies`,
      'HAS_SUBAGENCIES'
    );
  }

  await prisma.agencyGroup.delete({ where: { id } });

  // Audit log
  await auditService.log({
    action: AuditAction.AGENCY_GROUP_DELETED,
    entityType: 'agency_group',
    entityId: id,
    userId,
    details: { name: group.name, code: group.code },
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });
}

/**
 * Custom error class for agency group operations
 */
export class AgencyGroupError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AgencyGroupError';
    this.code = code;
  }
}

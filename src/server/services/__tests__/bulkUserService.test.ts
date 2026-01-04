/**
 * Tests for Bulk User Operations Service
 * Story 2.7: Bulk User Operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  const prismaMock = {
    role: {
      findUnique: vi.fn(),
    },
    contact: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    contactRole: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    agencyGroup: {
      findUnique: vi.fn(),
    },
    agencyGroupGrant: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    subagency: {
      findMany: vi.fn(),
    },
    subagencyGrant: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  };

  return { prisma: prismaMock, default: prismaMock };
});

vi.mock('../auditService.js', () => ({
  auditService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
  AuditAction: {
    BULK_ROLE_ASSIGN: 'bulk_role_assign',
    BULK_ACCESS_GRANT: 'bulk_access_grant',
    BULK_DEACTIVATE: 'bulk_deactivate',
  },
}));

vi.mock('../userContextService.js', () => ({
  invalidateUserContext: vi.fn(),
}));

import { prisma } from '../../db/index.js';
import { auditService } from '../auditService.js';
import { invalidateUserContext } from '../userContextService.js';
import {
  bulkAssignRole,
  bulkGrantAccess,
  bulkDeactivateUsers,
} from '../bulkUserService.js';

const mockPrisma = vi.mocked(prisma);
const mockAudit = vi.mocked(auditService);
const mockInvalidate = vi.mocked(invalidateUserContext);

describe('bulkUserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns roles in bulk and skips existing assignments', async () => {
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'NDA User' } as any);
    mockPrisma.contact.findMany.mockResolvedValue([
      { id: 'user-1', cognitoId: 'cog-1', email: 'u1@test.com', firstName: 'U1', lastName: 'User' },
      { id: 'user-2', cognitoId: 'cog-2', email: 'u2@test.com', firstName: 'U2', lastName: 'User' },
    ] as any);
    mockPrisma.contactRole.findMany.mockResolvedValue([{ contactId: 'user-1' }] as any);

    const result = await bulkAssignRole(['user-1', 'user-2'], 'role-1', 'actor-1');

    expect(mockPrisma.contactRole.createMany).toHaveBeenCalledWith({
      data: [{ contactId: 'user-2', roleId: 'role-1', grantedBy: 'actor-1' }],
      skipDuplicates: true,
    });
    expect(mockAudit.log).toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith('cog-2');
    expect(result.assignedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
  });

  it('grants agency group access in bulk', async () => {
    mockPrisma.contact.findMany.mockResolvedValue([
      { id: 'user-1', cognitoId: 'cog-1', email: 'u1@test.com', firstName: 'U1', lastName: 'User' },
      { id: 'user-2', cognitoId: 'cog-2', email: 'u2@test.com', firstName: 'U2', lastName: 'User' },
    ] as any);
    mockPrisma.agencyGroup.findUnique.mockResolvedValue({ id: 'group-1', name: 'DoD' } as any);
    mockPrisma.agencyGroupGrant.findMany.mockResolvedValue([{ contactId: 'user-1' }] as any);

    const result = await bulkGrantAccess(
      ['user-1', 'user-2'],
      { agencyGroupId: 'group-1' },
      'actor-1'
    );

    expect(mockPrisma.agencyGroupGrant.createMany).toHaveBeenCalledWith({
      data: [{ contactId: 'user-2', agencyGroupId: 'group-1', grantedBy: 'actor-1' }],
      skipDuplicates: true,
    });
    expect(mockAudit.log).toHaveBeenCalled();
    expect(result.grantedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
  });

  it('grants subagency access in bulk and skips existing grants', async () => {
    mockPrisma.contact.findMany.mockResolvedValue([
      { id: 'user-1', cognitoId: 'cog-1', email: 'u1@test.com', firstName: 'U1', lastName: 'User' },
    ] as any);
    mockPrisma.subagency.findMany.mockResolvedValue([
      { id: 'sub-1', name: 'Air Force', agencyGroup: { id: 'group-1', name: 'DoD' } },
      { id: 'sub-2', name: 'Navy', agencyGroup: { id: 'group-1', name: 'DoD' } },
    ] as any);
    mockPrisma.subagencyGrant.findMany.mockResolvedValue([
      { contactId: 'user-1', subagencyId: 'sub-1' },
    ] as any);

    const result = await bulkGrantAccess(
      ['user-1'],
      { subagencyIds: ['sub-1', 'sub-2'] },
      'actor-1'
    );

    expect(mockPrisma.subagencyGrant.createMany).toHaveBeenCalledWith({
      data: [{ contactId: 'user-1', subagencyId: 'sub-2', grantedBy: 'actor-1' }],
      skipDuplicates: true,
    });
    expect(result.grantedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.results[0].granted).toBe(1);
    expect(result.results[0].skipped).toBe(1);
  });

  it('bulk deactivates users and skips self', async () => {
    mockPrisma.contact.findMany.mockResolvedValue([
      { id: 'user-2', active: true, cognitoId: 'cog-2', email: 'u2@test.com', firstName: 'U2', lastName: 'User' },
      { id: 'user-3', active: false, cognitoId: 'cog-3', email: 'u3@test.com', firstName: 'U3', lastName: 'User' },
    ] as any);
    mockPrisma.contact.updateMany.mockResolvedValue({ count: 1 } as any);

    const result = await bulkDeactivateUsers(['user-1', 'user-2', 'user-3'], 'actor-1', 'user-1');

    expect(mockPrisma.contact.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['user-2'] } },
      data: { active: false },
    });
    expect(mockAudit.log).toHaveBeenCalled();
    expect(result.deactivatedCount).toBe(1);
    expect(result.skippedSelf).toBe(true);
  });
});

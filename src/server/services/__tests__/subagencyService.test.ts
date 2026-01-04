/**
 * Tests for Subagency Service
 * Story 2.2: Subagencies CRUD
 *
 * Tests:
 * - List subagencies with NDA counts
 * - Get single subagency
 * - Create subagency with validation
 * - Update subagency with duplicate checking
 * - Delete subagency (prevent if has NDAs)
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma - must be defined before imports
vi.mock('../../db/index.js', () => {
  const prismaMock = {
    agencyGroup: {
      findUnique: vi.fn(),
    },
    subagency: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  return { prisma: prismaMock, default: prismaMock };
});

import {
  listSubagenciesInGroup,
  getSubagency,
  createSubagency,
  updateSubagency,
  deleteSubagency,
  SubagencyError,
} from '../subagencyService.js';
import { prisma } from '../../db/index.js';
import { auditService } from '../auditService.js';

// Get the mocked prisma for assertions
const mockPrisma = vi.mocked(prisma);
const mockAuditService = vi.mocked(auditService);

// Mock audit service
vi.mock('../auditService.js', () => ({
  auditService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
  AuditAction: {
    SUBAGENCY_CREATED: 'subagency_created',
    SUBAGENCY_UPDATED: 'subagency_updated',
    SUBAGENCY_DELETED: 'subagency_deleted',
  },
}));

describe('Subagency Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listSubagenciesInGroup', () => {
    it('returns subagencies with NDA counts', async () => {
      const mockSubagencies = [
        {
          id: 'sub-1',
          name: 'Air Force',
          code: 'AIR_FORCE',
          description: 'USAF',
          agencyGroupId: 'group-1',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
          _count: { ndas: 15 },
        },
        {
          id: 'sub-2',
          name: 'Army',
          code: 'ARMY',
          description: 'US Army',
          agencyGroupId: 'group-1',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
          _count: { ndas: 8 },
        },
      ];

      mockPrisma.subagency.findMany.mockResolvedValue(mockSubagencies);

      const result = await listSubagenciesInGroup('group-1');

      expect(mockPrisma.subagency.findMany).toHaveBeenCalledWith({
        where: { agencyGroupId: 'group-1' },
        include: { _count: { select: { ndas: true } } },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'sub-1',
        name: 'Air Force',
        code: 'AIR_FORCE',
        description: 'USAF',
        agencyGroupId: 'group-1',
        ndaCount: 15,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('returns empty array when no subagencies exist', async () => {
      mockPrisma.subagency.findMany.mockResolvedValue([]);
      const result = await listSubagenciesInGroup('group-1');
      expect(result).toEqual([]);
    });

    it('filters subagencies by allowed IDs when provided', async () => {
      mockPrisma.subagency.findMany.mockResolvedValue([]);

      await listSubagenciesInGroup('group-1', ['sub-1']);

      expect(mockPrisma.subagency.findMany).toHaveBeenCalledWith({
        where: { agencyGroupId: 'group-1', id: { in: ['sub-1'] } },
        include: { _count: { select: { ndas: true } } },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getSubagency', () => {
    it('returns subagency with agency group info', async () => {
      const mockSubagency = {
        id: 'sub-1',
        name: 'Air Force',
        code: 'AIR_FORCE',
        description: 'USAF',
        agencyGroupId: 'group-1',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        agencyGroup: { id: 'group-1', name: 'DoD', code: 'DOD' },
        _count: { ndas: 10 },
      };

      mockPrisma.subagency.findUnique.mockResolvedValue(mockSubagency);

      const result = await getSubagency('sub-1');

      expect(result).toEqual({
        id: 'sub-1',
        name: 'Air Force',
        code: 'AIR_FORCE',
        description: 'USAF',
        agencyGroupId: 'group-1',
        agencyGroup: { id: 'group-1', name: 'DoD', code: 'DOD' },
        ndaCount: 10,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('returns null when subagency not found', async () => {
      mockPrisma.subagency.findUnique.mockResolvedValue(null);
      const result = await getSubagency('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createSubagency', () => {
    it('creates subagency successfully', async () => {
      const mockSubagency = {
        id: 'new-sub',
        name: 'Navy',
        code: 'NAVY',
        description: 'US Navy',
        agencyGroupId: 'group-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.agencyGroup.findUnique.mockResolvedValue({
        id: 'group-1',
        name: 'DoD',
      });
      mockPrisma.subagency.findFirst.mockResolvedValue(null);
      mockPrisma.subagency.create.mockResolvedValue(mockSubagency);

      const result = await createSubagency(
        'group-1',
        { name: 'Navy', code: 'navy', description: 'US Navy' },
        'user-123'
      );

      expect(mockPrisma.subagency.findFirst).toHaveBeenNthCalledWith(1, {
        where: { agencyGroupId: 'group-1', name: { equals: 'Navy', mode: 'insensitive' } },
      });
      expect(mockPrisma.subagency.findFirst).toHaveBeenNthCalledWith(2, {
        where: { agencyGroupId: 'group-1', code: { equals: 'NAVY', mode: 'insensitive' } },
      });
      expect(mockPrisma.subagency.create).toHaveBeenCalledWith({
        data: {
          name: 'Navy',
          code: 'NAVY',
          description: 'US Navy',
          agencyGroupId: 'group-1',
        },
      });
      expect(result).toEqual(mockSubagency);
    });

    it('throws error when agency group not found', async () => {
      mockPrisma.agencyGroup.findUnique.mockResolvedValue(null);

      await expect(
        createSubagency('nonexistent', { name: 'Navy', code: 'NAVY' }, 'user-123')
      ).rejects.toThrow(SubagencyError);

      try {
        await createSubagency('nonexistent', { name: 'Navy', code: 'NAVY' }, 'user-123');
      } catch (error) {
        expect(error).toBeInstanceOf(SubagencyError);
        expect((error as SubagencyError).code).toBe('AGENCY_GROUP_NOT_FOUND');
      }
    });

    it('throws error for duplicate name within group', async () => {
      mockPrisma.agencyGroup.findUnique.mockResolvedValue({ id: 'group-1', name: 'DoD' });
      mockPrisma.subagency.findFirst.mockResolvedValueOnce({
        id: 'existing',
        name: 'Navy',
      });

      await expect(
        createSubagency('group-1', { name: 'Navy', code: 'NEW_CODE' }, 'user-123')
      ).rejects.toThrow(SubagencyError);

      try {
        await createSubagency('group-1', { name: 'Navy', code: 'NEW_CODE' }, 'user-123');
      } catch (error) {
        expect((error as SubagencyError).code).toBe('DUPLICATE_NAME');
      }
    });

    it('throws error for duplicate code within group', async () => {
      mockPrisma.agencyGroup.findUnique.mockResolvedValue({ id: 'group-1', name: 'DoD' });
      mockPrisma.subagency.findFirst
        .mockResolvedValueOnce(null) // Name check passes
        .mockResolvedValueOnce({ id: 'existing', code: 'NAVY' }); // Code check fails

      await expect(
        createSubagency('group-1', { name: 'New Name', code: 'NAVY' }, 'user-123')
      ).rejects.toThrow(SubagencyError);

      try {
        await createSubagency('group-1', { name: 'New Name', code: 'NAVY' }, 'user-123');
      } catch (error) {
        expect((error as SubagencyError).code).toBe('DUPLICATE_CODE');
      }
    });

    it('maps prisma unique constraint errors to duplicate name', async () => {
      mockPrisma.agencyGroup.findUnique.mockResolvedValue({ id: 'group-1', name: 'DoD' });
      mockPrisma.subagency.findFirst.mockResolvedValue(null);
      mockPrisma.subagency.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['agency_group_id', 'name'] },
      });

      await expect(
        createSubagency('group-1', { name: 'Navy', code: 'NAVY' }, 'user-123')
      ).rejects.toMatchObject({ code: 'DUPLICATE_NAME' });
    });
  });

  describe('updateSubagency', () => {
    it('updates subagency successfully', async () => {
      const existingSubagency = {
        id: 'sub-1',
        name: 'Old Name',
        code: 'OLD_CODE',
        description: 'Old',
        agencyGroupId: 'group-1',
        agencyGroup: { name: 'DoD' },
      };

      const updatedSubagency = {
        ...existingSubagency,
        name: 'New Name',
        code: 'NEW_CODE',
        updatedAt: new Date(),
      };

      mockPrisma.subagency.findUnique.mockResolvedValueOnce(existingSubagency);
      mockPrisma.subagency.findFirst.mockResolvedValue(null);
      mockPrisma.subagency.update.mockResolvedValue(updatedSubagency);

      const result = await updateSubagency(
        'sub-1',
        { name: 'New Name', code: 'new_code' },
        'user-123'
      );

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'subagency_updated',
          details: expect.objectContaining({
            changes: expect.arrayContaining([
              { field: 'name', before: 'Old Name', after: 'New Name' },
              { field: 'code', before: 'OLD_CODE', after: 'NEW_CODE' },
            ]),
          }),
        })
      );
      expect(result).toEqual(updatedSubagency);
    });

    it('throws error when subagency not found', async () => {
      mockPrisma.subagency.findUnique.mockResolvedValue(null);

      await expect(
        updateSubagency('nonexistent', { name: 'New Name' }, 'user-123')
      ).rejects.toThrow(SubagencyError);

      try {
        await updateSubagency('nonexistent', { name: 'New Name' }, 'user-123');
      } catch (error) {
        expect((error as SubagencyError).code).toBe('NOT_FOUND');
      }
    });

    it('throws error for duplicate name when updating', async () => {
      // Reset mocks
      mockPrisma.subagency.findUnique.mockReset();
      mockPrisma.subagency.findFirst.mockReset();

      mockPrisma.subagency.findUnique.mockResolvedValueOnce({
        id: 'sub-1',
        name: 'Old Name',
        agencyGroupId: 'group-1',
        agencyGroup: { name: 'DoD' },
      });
      mockPrisma.subagency.findFirst.mockResolvedValueOnce({
        id: 'sub-2',
        name: 'New Name',
      }); // Different subagency has this name

      await expect(
        updateSubagency('sub-1', { name: 'New Name' }, 'user-123')
      ).rejects.toThrow(SubagencyError);
    });

    it('verifies duplicate name error code', async () => {
      // Reset mocks
      mockPrisma.subagency.findUnique.mockReset();
      mockPrisma.subagency.findFirst.mockReset();

      mockPrisma.subagency.findUnique.mockResolvedValueOnce({
        id: 'sub-1',
        name: 'Old Name',
        agencyGroupId: 'group-1',
        agencyGroup: { name: 'DoD' },
      });
      mockPrisma.subagency.findFirst.mockResolvedValueOnce({
        id: 'sub-2',
        name: 'New Name',
      });

      try {
        await updateSubagency('sub-1', { name: 'New Name' }, 'user-123');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as SubagencyError).code).toBe('DUPLICATE_NAME');
      }
    });

    it('maps prisma unique constraint errors to duplicate code', async () => {
      mockPrisma.subagency.findUnique.mockResolvedValueOnce({
        id: 'sub-1',
        name: 'Old Name',
        code: 'OLD_CODE',
        agencyGroupId: 'group-1',
        agencyGroup: { name: 'DoD' },
      });
      mockPrisma.subagency.findFirst.mockResolvedValue(null);
      mockPrisma.subagency.update.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['agency_group_id', 'code'] },
      });

      await expect(
        updateSubagency('sub-1', { code: 'new_code' }, 'user-123')
      ).rejects.toMatchObject({ code: 'DUPLICATE_CODE' });
    });
  });

  describe('deleteSubagency', () => {
    it('deletes subagency without NDAs', async () => {
      mockPrisma.subagency.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Test Subagency',
        code: 'TEST',
        agencyGroup: { name: 'DoD' },
        _count: { ndas: 0 },
      });
      mockPrisma.subagency.delete.mockResolvedValue({});

      await deleteSubagency('sub-1', 'user-123');

      expect(mockPrisma.subagency.delete).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
      });
    });

    it('throws error when subagency not found', async () => {
      mockPrisma.subagency.findUnique.mockResolvedValue(null);

      await expect(deleteSubagency('nonexistent', 'user-123')).rejects.toThrow(
        SubagencyError
      );

      try {
        await deleteSubagency('nonexistent', 'user-123');
      } catch (error) {
        expect((error as SubagencyError).code).toBe('NOT_FOUND');
      }
    });

    it('throws error when subagency has NDAs', async () => {
      mockPrisma.subagency.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Test Subagency',
        code: 'TEST',
        agencyGroup: { name: 'DoD' },
        _count: { ndas: 25 },
      });

      await expect(deleteSubagency('sub-1', 'user-123')).rejects.toThrow(
        SubagencyError
      );

      try {
        await deleteSubagency('sub-1', 'user-123');
      } catch (error) {
        expect(error).toBeInstanceOf(SubagencyError);
        expect((error as SubagencyError).code).toBe('HAS_NDAS');
        expect((error as SubagencyError).message).toContain('25 existing NDAs');
        expect((error as SubagencyError).details?.ndaCount).toBe(25);
      }
    });
  });

  describe('SubagencyError', () => {
    it('creates error with message, code, and details', () => {
      const error = new SubagencyError('Test error', 'TEST_CODE', { extra: 'data' });
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('SubagencyError');
      expect(error.details).toEqual({ extra: 'data' });
    });
  });
});

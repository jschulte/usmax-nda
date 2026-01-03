/**
 * Tests for Agency Group Service
 * Story 2.1: Agency Groups CRUD
 *
 * Tests:
 * - List agency groups with subagency counts
 * - Get single agency group with subagencies
 * - Create agency group with validation
 * - Update agency group with duplicate checking
 * - Delete agency group (prevent if has subagencies)
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTx = vi.hoisted(() => ({
  agencyGroup: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

// Mock prisma - must be defined before imports
vi.mock('../../db/index.js', () => ({
  prisma: {
    agencyGroup: mockTx.agencyGroup,
    auditLog: mockTx.auditLog,
    $transaction: vi.fn(async (callback: (tx: typeof mockTx) => Promise<unknown>) => callback(mockTx)),
  },
}));

import {
  listAgencyGroups,
  getAgencyGroup,
  createAgencyGroup,
  updateAgencyGroup,
  deleteAgencyGroup,
  AgencyGroupError,
} from '../agencyGroupService.js';
import { prisma } from '../../db/index.js';

// Get the mocked prisma for assertions
const mockPrisma = vi.mocked(prisma);

describe('Agency Group Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.agencyGroup.count.mockResolvedValue(0);
  });

  describe('listAgencyGroups', () => {
    it('returns agency groups with subagency counts', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          name: 'Department of Defense',
          code: 'DOD',
          description: 'Military agencies',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
          _count: { subagencies: 5 },
        },
        {
          id: 'group-2',
          name: 'Fed Civ',
          code: 'FED_CIV',
          description: 'Federal civilian agencies',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
          _count: { subagencies: 10 },
        },
      ];

      mockPrisma.agencyGroup.count.mockResolvedValue(2);
      mockPrisma.agencyGroup.findMany.mockResolvedValue(mockGroups);

      const result = await listAgencyGroups();

      expect(mockPrisma.agencyGroup.findMany).toHaveBeenCalledWith({
        include: { _count: { select: { subagencies: true } } },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 50,
        where: undefined,
      });
      expect(result.agencyGroups).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.agencyGroups[0]).toEqual({
        id: 'group-1',
        name: 'Department of Defense',
        code: 'DOD',
        description: 'Military agencies',
        subagencyCount: 5,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('returns empty array when no groups exist', async () => {
      mockPrisma.agencyGroup.count.mockResolvedValue(0);
      mockPrisma.agencyGroup.findMany.mockResolvedValue([]);
      const result = await listAgencyGroups();
      expect(result.agencyGroups).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getAgencyGroup', () => {
    it('returns agency group with its subagencies', async () => {
      const mockGroup = {
        id: 'group-1',
        name: 'Department of Defense',
        code: 'DOD',
        description: 'Military agencies',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        subagencies: [
          { id: 'sub-1', name: 'Army', code: 'ARMY' },
          { id: 'sub-2', name: 'Navy', code: 'NAVY' },
        ],
      };

      mockPrisma.agencyGroup.findUnique.mockResolvedValue(mockGroup);

      const result = await getAgencyGroup('group-1');

      expect(mockPrisma.agencyGroup.findUnique).toHaveBeenCalledWith({
        where: { id: 'group-1' },
        include: { subagencies: { orderBy: { name: 'asc' } } },
      });
      expect(result).toEqual(mockGroup);
    });

    it('returns null when group not found', async () => {
      mockPrisma.agencyGroup.findUnique.mockResolvedValue(null);
      const result = await getAgencyGroup('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createAgencyGroup', () => {
    it('creates agency group successfully', async () => {
      const mockGroup = {
        id: 'new-group',
        name: 'Commercial',
        code: 'COMMERCIAL',
        description: 'Commercial clients',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { subagencies: 0 },
      };

      mockPrisma.agencyGroup.findFirst.mockResolvedValue(null);
      mockPrisma.agencyGroup.create.mockResolvedValue(mockGroup);

      const result = await createAgencyGroup(
        { name: 'Commercial', code: 'COMMERCIAL', description: 'Commercial clients' },
        'user-123'
      );

      expect(mockPrisma.agencyGroup.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { equals: 'Commercial', mode: 'insensitive' } },
            { code: { equals: 'COMMERCIAL', mode: 'insensitive' } },
          ],
        },
      });
      expect(mockPrisma.agencyGroup.create).toHaveBeenCalledWith({
        data: {
          name: 'Commercial',
          code: 'COMMERCIAL',
          description: 'Commercial clients',
        },
        include: { _count: { select: { subagencies: true } } },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'new-group',
        name: 'Commercial',
        code: 'COMMERCIAL',
        description: 'Commercial clients',
        subagencyCount: 0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('throws error for duplicate name', async () => {
      mockPrisma.agencyGroup.findFirst.mockResolvedValue({
        id: 'existing',
        name: 'Commercial',
        code: 'OTHER',
      });

      await expect(
        createAgencyGroup({ name: 'Commercial', code: 'COMMERCIAL' }, 'user-123')
      ).rejects.toMatchObject({ code: 'DUPLICATE_NAME' });
    });

    it('throws error for duplicate code', async () => {
      mockPrisma.agencyGroup.findFirst.mockResolvedValue({
        id: 'existing',
        name: 'Other Name',
        code: 'COMMERCIAL',
      });

      await expect(
        createAgencyGroup({ name: 'New Name', code: 'COMMERCIAL' }, 'user-123')
      ).rejects.toMatchObject({ code: 'DUPLICATE_CODE' });
    });

    it('maps unique constraint errors to duplicate name', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: ['name'] },
      });

      await expect(
        createAgencyGroup({ name: 'DoD', code: 'DOD' }, 'user-123')
      ).rejects.toMatchObject({ code: 'DUPLICATE_NAME' });
    });
  });

  describe('updateAgencyGroup', () => {
    it('updates agency group successfully', async () => {
      const existingGroup = {
        id: 'group-1',
        name: 'Old Name',
        code: 'OLD_CODE',
        description: 'Old description',
      };

      const updatedGroup = {
        ...existingGroup,
        name: 'New Name',
        code: 'NEW_CODE',
        description: 'New description',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date(),
        _count: { subagencies: 2 },
      };

      mockPrisma.agencyGroup.findUnique
        .mockResolvedValueOnce(existingGroup) // Check exists
        .mockResolvedValueOnce(null); // Check duplicate code
      mockPrisma.agencyGroup.findFirst
        .mockResolvedValueOnce(null) // Check duplicate name
        .mockResolvedValueOnce(null); // Check duplicate code
      mockPrisma.agencyGroup.update.mockResolvedValue(updatedGroup);

      const result = await updateAgencyGroup(
        'group-1',
        { name: 'New Name', code: 'NEW_CODE', description: 'New description' },
        'user-123'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            details: expect.objectContaining({
              changes: expect.arrayContaining([
                { field: 'name', before: 'Old Name', after: 'New Name' },
                { field: 'code', before: 'OLD_CODE', after: 'NEW_CODE' },
                { field: 'description', before: 'Old description', after: 'New description' },
              ]),
            }),
          }),
        })
      );
      expect(result).toEqual({
        id: 'group-1',
        name: 'New Name',
        code: 'NEW_CODE',
        description: 'New description',
        subagencyCount: 2,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('throws error when group not found', async () => {
      mockPrisma.agencyGroup.findUnique.mockResolvedValue(null);

      await expect(
        updateAgencyGroup('nonexistent', { name: 'New Name' }, 'user-123')
      ).rejects.toThrow(AgencyGroupError);

      try {
        await updateAgencyGroup('nonexistent', { name: 'New Name' }, 'user-123');
      } catch (error) {
        expect(error).toBeInstanceOf(AgencyGroupError);
        expect((error as AgencyGroupError).code).toBe('NOT_FOUND');
      }
    });

    it('throws error for duplicate name when updating', async () => {
      // Reset the mock
      mockPrisma.agencyGroup.findUnique.mockReset();
      mockPrisma.agencyGroup.findFirst.mockReset();

      // First call: Check if group exists (by id) - returns the existing group
      // Second call: Check if name is duplicate (by name) - returns different group with same name
      mockPrisma.agencyGroup.findUnique
        .mockResolvedValueOnce({ id: 'group-1', name: 'Old Name', code: 'CODE' });
      mockPrisma.agencyGroup.findFirst
        .mockResolvedValueOnce({ id: 'group-2', name: 'New Name', code: 'OTHER' }); // Different group has this name

      await expect(
        updateAgencyGroup('group-1', { name: 'New Name' }, 'user-123')
      ).rejects.toThrow(AgencyGroupError);
    });

    it('verifies duplicate name error code', async () => {
      // Reset the mock
      mockPrisma.agencyGroup.findUnique.mockReset();
      mockPrisma.agencyGroup.findFirst.mockReset();

      // First call: Check if group exists (by id) - returns the existing group
      // Second call: Check if name is duplicate (by name) - returns different group with same name
      mockPrisma.agencyGroup.findUnique
        .mockResolvedValueOnce({ id: 'group-1', name: 'Old Name', code: 'CODE' });
      mockPrisma.agencyGroup.findFirst
        .mockResolvedValueOnce({ id: 'group-2', name: 'New Name', code: 'OTHER' });

      try {
        await updateAgencyGroup('group-1', { name: 'New Name' }, 'user-123');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AgencyGroupError);
        expect((error as AgencyGroupError).code).toBe('DUPLICATE_NAME');
      }
    });
  });

  describe('deleteAgencyGroup', () => {
    it('deletes agency group without subagencies', async () => {
      mockPrisma.agencyGroup.findUnique.mockResolvedValue({
        id: 'group-1',
        name: 'Test Group',
        code: 'TEST',
        _count: { subagencies: 0 },
      });
      mockPrisma.agencyGroup.delete.mockResolvedValue({});

      await deleteAgencyGroup('group-1', 'user-123');

      expect(mockPrisma.agencyGroup.delete).toHaveBeenCalledWith({
        where: { id: 'group-1' },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('throws error when group not found', async () => {
      mockPrisma.agencyGroup.findUnique.mockResolvedValue(null);

      await expect(deleteAgencyGroup('nonexistent', 'user-123')).rejects.toThrow(
        AgencyGroupError
      );

      try {
        await deleteAgencyGroup('nonexistent', 'user-123');
      } catch (error) {
        expect(error).toBeInstanceOf(AgencyGroupError);
        expect((error as AgencyGroupError).code).toBe('NOT_FOUND');
      }
    });

    it('throws error when group has subagencies', async () => {
      mockPrisma.agencyGroup.findUnique.mockResolvedValue({
        id: 'group-1',
        name: 'Test Group',
        code: 'TEST',
        _count: { subagencies: 5 },
      });

      await expect(deleteAgencyGroup('group-1', 'user-123')).rejects.toThrow(
        AgencyGroupError
      );

      try {
        await deleteAgencyGroup('group-1', 'user-123');
      } catch (error) {
        expect(error).toBeInstanceOf(AgencyGroupError);
        expect((error as AgencyGroupError).code).toBe('HAS_SUBAGENCIES');
        expect((error as AgencyGroupError).message).toBe(
          'Cannot delete agency group with existing subagencies'
        );
        expect((error as AgencyGroupError).details).toEqual({ subagencyCount: 5 });
      }
    });
  });

  describe('AgencyGroupError', () => {
    it('creates error with message and code', () => {
      const error = new AgencyGroupError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('AgencyGroupError');
    });
  });
});

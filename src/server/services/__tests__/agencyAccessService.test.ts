/**
 * Tests for Agency Access Service
 * Story 2.3: Grant Agency Group Access to Users
 * Story 2.4: Grant Subagency-Specific Access
 *
 * Tests:
 * - Agency group access: grant, revoke, list
 * - Subagency access: grant, revoke, list (direct + inherited)
 * - Contact search autocomplete
 * - Cache invalidation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma - must be defined before imports
vi.mock('../../db/index.js', () => ({
  prisma: {
    agencyGroup: {
      findUnique: vi.fn(),
    },
    contact: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    agencyGroupGrant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    subagency: {
      findUnique: vi.fn(),
    },
    subagencyGrant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock user context service
vi.mock('../userContextService.js', () => ({
  invalidateUserContext: vi.fn(),
}));

// Mock audit service
vi.mock('../auditService.js', () => ({
  auditService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
  AuditAction: {
    AGENCY_GROUP_ACCESS_GRANTED: 'agency_group_access_granted',
    AGENCY_GROUP_ACCESS_REVOKED: 'agency_group_access_revoked',
    SUBAGENCY_ACCESS_GRANTED: 'subagency_access_granted',
    SUBAGENCY_ACCESS_REVOKED: 'subagency_access_revoked',
  },
}));

import {
  getAgencyGroupAccess,
  grantAgencyGroupAccess,
  revokeAgencyGroupAccess,
  getSubagencyAccess,
  grantSubagencyAccess,
  revokeSubagencyAccess,
  searchContacts,
  AgencyAccessError,
} from '../agencyAccessService.js';
import { prisma } from '../../db/index.js';
import { invalidateUserContext } from '../userContextService.js';

// Get the mocked prisma for assertions
const mockPrisma = vi.mocked(prisma);
const mockInvalidateUserContext = vi.mocked(invalidateUserContext);

describe('Agency Access Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAgencyGroupAccess', () => {
    it('returns users with agency group access', async () => {
      const mockGrants = [
        {
          contact: { id: 'user-1', firstName: 'Kelly', lastName: 'Davidson', email: 'kelly@test.com' },
          grantedByUser: { id: 'admin-1', firstName: 'Admin', lastName: 'User' },
          grantedAt: new Date('2025-01-15'),
        },
        {
          contact: { id: 'user-2', firstName: 'John', lastName: 'Smith', email: 'john@test.com' },
          grantedByUser: null,
          grantedAt: new Date('2025-01-10'),
        },
      ];

      mockPrisma.agencyGroupGrant.findMany.mockResolvedValue(mockGrants);

      const result = await getAgencyGroupAccess('group-1');

      expect(mockPrisma.agencyGroupGrant.findMany).toHaveBeenCalledWith({
        where: { agencyGroupId: 'group-1' },
        include: expect.any(Object),
        orderBy: { grantedAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        contactId: 'user-1',
        name: 'Kelly Davidson',
        email: 'kelly@test.com',
        grantedBy: { id: 'admin-1', name: 'Admin User' },
        grantedAt: expect.any(Date),
      });
      expect(result[1].grantedBy).toBeNull();
    });
  });

  describe('grantAgencyGroupAccess', () => {
    it('grants access successfully', async () => {
      mockPrisma.agencyGroup.findUnique.mockResolvedValue({
        id: 'group-1',
        name: 'DoD',
      });
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'kelly@test.com',
        cognitoId: 'cognito-123',
        firstName: 'Kelly',
        lastName: 'Davidson',
      });
      mockPrisma.agencyGroupGrant.findUnique.mockResolvedValue(null);
      mockPrisma.agencyGroupGrant.create.mockResolvedValue({});

      await grantAgencyGroupAccess('group-1', 'user-1', 'admin-1');

      expect(mockPrisma.agencyGroupGrant.create).toHaveBeenCalledWith({
        data: {
          contactId: 'user-1',
          agencyGroupId: 'group-1',
          grantedBy: 'admin-1',
        },
      });
      expect(mockInvalidateUserContext).toHaveBeenCalledWith('cognito-123');
    });

    it('throws error when agency group not found', async () => {
      mockPrisma.agencyGroup.findUnique.mockResolvedValue(null);

      await expect(
        grantAgencyGroupAccess('nonexistent', 'user-1', 'admin-1')
      ).rejects.toThrow(AgencyAccessError);

      try {
        await grantAgencyGroupAccess('nonexistent', 'user-1', 'admin-1');
      } catch (error) {
        expect((error as AgencyAccessError).code).toBe('AGENCY_GROUP_NOT_FOUND');
      }
    });

    it('throws error when user not found', async () => {
      mockPrisma.agencyGroup.findUnique.mockResolvedValue({ id: 'group-1', name: 'DoD' });
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      await expect(
        grantAgencyGroupAccess('group-1', 'nonexistent', 'admin-1')
      ).rejects.toThrow(AgencyAccessError);

      try {
        await grantAgencyGroupAccess('group-1', 'nonexistent', 'admin-1');
      } catch (error) {
        expect((error as AgencyAccessError).code).toBe('USER_NOT_FOUND');
      }
    });

    it('throws error when already has access', async () => {
      mockPrisma.agencyGroup.findUnique.mockResolvedValue({ id: 'group-1', name: 'DoD' });
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
      });
      mockPrisma.agencyGroupGrant.findUnique.mockResolvedValue({
        id: 'existing-grant',
      });

      await expect(
        grantAgencyGroupAccess('group-1', 'user-1', 'admin-1')
      ).rejects.toThrow(AgencyAccessError);

      try {
        await grantAgencyGroupAccess('group-1', 'user-1', 'admin-1');
      } catch (error) {
        expect((error as AgencyAccessError).code).toBe('ALREADY_GRANTED');
      }
    });
  });

  describe('revokeAgencyGroupAccess', () => {
    it('revokes access successfully', async () => {
      mockPrisma.agencyGroupGrant.findUnique.mockResolvedValue({
        contact: {
          email: 'kelly@test.com',
          cognitoId: 'cognito-123',
          firstName: 'Kelly',
          lastName: 'Davidson',
        },
        agencyGroup: { name: 'DoD' },
      });
      mockPrisma.agencyGroupGrant.delete.mockResolvedValue({});

      await revokeAgencyGroupAccess('group-1', 'user-1', 'admin-1');

      expect(mockPrisma.agencyGroupGrant.delete).toHaveBeenCalled();
      expect(mockInvalidateUserContext).toHaveBeenCalledWith('cognito-123');
    });

    it('throws error when grant not found', async () => {
      mockPrisma.agencyGroupGrant.findUnique.mockResolvedValue(null);

      await expect(
        revokeAgencyGroupAccess('group-1', 'user-1', 'admin-1')
      ).rejects.toThrow(AgencyAccessError);

      try {
        await revokeAgencyGroupAccess('group-1', 'user-1', 'admin-1');
      } catch (error) {
        expect((error as AgencyAccessError).code).toBe('GRANT_NOT_FOUND');
      }
    });
  });

  describe('getSubagencyAccess', () => {
    it('returns direct and inherited access', async () => {
      mockPrisma.subagency.findUnique.mockResolvedValue({
        id: 'sub-1',
        agencyGroupId: 'group-1',
        agencyGroup: { id: 'group-1', name: 'DoD' },
      });

      // Direct access
      mockPrisma.subagencyGrant.findMany.mockResolvedValue([
        {
          contact: { id: 'user-1', firstName: 'Direct', lastName: 'User', email: 'direct@test.com' },
          grantedByUser: { id: 'admin-1', firstName: 'Admin', lastName: 'User' },
          grantedAt: new Date(),
        },
      ]);

      // Inherited access from group
      mockPrisma.agencyGroupGrant.findMany.mockResolvedValue([
        {
          contact: { id: 'user-2', firstName: 'Inherited', lastName: 'User', email: 'inherited@test.com' },
          grantedByUser: { id: 'admin-1', firstName: 'Admin', lastName: 'User' },
          grantedAt: new Date(),
        },
      ]);

      const result = await getSubagencyAccess('sub-1');

      expect(result).toHaveLength(2);
      expect(result.find((u) => u.accessType === 'direct')).toBeDefined();
      expect(result.find((u) => u.accessType === 'inherited')).toBeDefined();
    });

    it('throws error when subagency not found', async () => {
      mockPrisma.subagency.findUnique.mockResolvedValue(null);

      await expect(getSubagencyAccess('nonexistent')).rejects.toThrow(AgencyAccessError);

      try {
        await getSubagencyAccess('nonexistent');
      } catch (error) {
        expect((error as AgencyAccessError).code).toBe('SUBAGENCY_NOT_FOUND');
      }
    });
  });

  describe('grantSubagencyAccess', () => {
    it('grants access successfully', async () => {
      mockPrisma.subagency.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Air Force',
        agencyGroup: { name: 'DoD' },
      });
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        cognitoId: 'cognito-123',
        firstName: 'Test',
        lastName: 'User',
      });
      mockPrisma.subagencyGrant.findUnique.mockResolvedValue(null);
      mockPrisma.subagencyGrant.create.mockResolvedValue({});

      await grantSubagencyAccess('sub-1', 'user-1', 'admin-1');

      expect(mockPrisma.subagencyGrant.create).toHaveBeenCalled();
      expect(mockInvalidateUserContext).toHaveBeenCalledWith('cognito-123');
    });

    it('throws error when subagency not found', async () => {
      mockPrisma.subagency.findUnique.mockResolvedValue(null);

      await expect(
        grantSubagencyAccess('nonexistent', 'user-1', 'admin-1')
      ).rejects.toThrow(AgencyAccessError);

      try {
        await grantSubagencyAccess('nonexistent', 'user-1', 'admin-1');
      } catch (error) {
        expect((error as AgencyAccessError).code).toBe('SUBAGENCY_NOT_FOUND');
      }
    });
  });

  describe('revokeSubagencyAccess', () => {
    it('revokes access successfully', async () => {
      mockPrisma.subagencyGrant.findUnique.mockResolvedValue({
        contact: {
          email: 'test@test.com',
          cognitoId: 'cognito-123',
          firstName: 'Test',
          lastName: 'User',
        },
        subagency: {
          name: 'Air Force',
          agencyGroup: { name: 'DoD' },
        },
      });
      mockPrisma.subagencyGrant.delete.mockResolvedValue({});

      await revokeSubagencyAccess('sub-1', 'user-1', 'admin-1');

      expect(mockPrisma.subagencyGrant.delete).toHaveBeenCalled();
      expect(mockInvalidateUserContext).toHaveBeenCalledWith('cognito-123');
    });

    it('throws error when grant not found', async () => {
      mockPrisma.subagencyGrant.findUnique.mockResolvedValue(null);

      await expect(
        revokeSubagencyAccess('sub-1', 'user-1', 'admin-1')
      ).rejects.toThrow(AgencyAccessError);

      try {
        await revokeSubagencyAccess('sub-1', 'user-1', 'admin-1');
      } catch (error) {
        expect((error as AgencyAccessError).code).toBe('GRANT_NOT_FOUND');
      }
    });
  });

  describe('searchContacts', () => {
    it('returns matching contacts', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([
        {
          id: 'user-1',
          firstName: 'Kelly',
          lastName: 'Davidson',
          email: 'kelly@test.com',
          active: true,
          contactRoles: [{ role: { name: 'NDA User' } }],
        },
        {
          id: 'user-2',
          firstName: 'Kevin',
          lastName: 'Miller',
          email: 'kevin@test.com',
          active: true,
          contactRoles: [{ role: { name: 'Admin' } }],
        },
      ]);

      const result = await searchContacts('kel');

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
            isInternal: true,
          }),
          take: 10,
        })
      );
      expect(result).toHaveLength(2);
      expect(result[0].roles).toEqual(['NDA User']);
    });

    it('returns empty array for short query', async () => {
      const result = await searchContacts('ke');
      expect(result).toEqual([]);
      expect(mockPrisma.contact.findMany).not.toHaveBeenCalled();
    });

    it('returns empty array for empty query', async () => {
      const result = await searchContacts('');
      expect(result).toEqual([]);
    });
  });

  describe('AgencyAccessError', () => {
    it('creates error with message and code', () => {
      const error = new AgencyAccessError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('AgencyAccessError');
    });
  });
});

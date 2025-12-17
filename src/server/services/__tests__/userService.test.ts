/**
 * Tests for User Service
 * Story 2.5: User/Contact Management
 *
 * Tests:
 * - User listing with pagination and search
 * - User CRUD operations
 * - Duplicate email validation
 * - Deactivation rules
 * - Audit logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma - must be defined before imports
vi.mock('../../db/index.js', () => ({
  prisma: {
    contact: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
    USER_CREATED: 'user_created',
    USER_UPDATED: 'user_updated',
    USER_DEACTIVATED: 'user_deactivated',
  },
}));

import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,
  UserServiceError,
} from '../userService.js';
import { prisma } from '../../db/index.js';
import { invalidateUserContext } from '../userContextService.js';
import { auditService } from '../auditService.js';

// Get the mocked prisma for assertions
const mockPrisma = vi.mocked(prisma);
const mockInvalidateUserContext = vi.mocked(invalidateUserContext);
const mockAuditService = vi.mocked(auditService);

describe('User Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsers', () => {
    it('returns paginated users with roles and access', async () => {
      mockPrisma.contact.count.mockResolvedValue(2);
      mockPrisma.contact.findMany.mockResolvedValue([
        {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          workPhone: '555-1234',
          cellPhone: null,
          jobTitle: 'Developer',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          contactRoles: [{ role: { name: 'NDA User' } }],
          agencyGroupGrants: [{ agencyGroup: { name: 'DoD' } }],
          subagencyGrants: [{ subagency: { name: 'Air Force' } }],
        },
        {
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@test.com',
          workPhone: null,
          cellPhone: '555-5678',
          jobTitle: 'Manager',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          contactRoles: [{ role: { name: 'Admin' } }],
          agencyGroupGrants: [],
          subagencyGrants: [],
        },
      ]);

      const result = await listUsers({ page: 1, limit: 10 });

      expect(result.users).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(result.users[0]).toMatchObject({
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        roles: ['NDA User'],
        agencyAccess: {
          groups: ['DoD'],
          subagencies: ['Air Force'],
        },
      });
    });

    it('applies search filter', async () => {
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.contact.findMany.mockResolvedValue([]);

      await listUsers({ search: 'john' });

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: 'john', mode: 'insensitive' } },
              { lastName: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('applies active filter', async () => {
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.contact.findMany.mockResolvedValue([]);

      await listUsers({ active: false });

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: false,
          }),
        })
      );
    });

    it('uses default pagination values', async () => {
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.contact.findMany.mockResolvedValue([]);

      const result = await listUsers({});

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('enforces max limit of 100', async () => {
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.contact.findMany.mockResolvedValue([]);

      await listUsers({ limit: 500 });

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });
  });

  describe('getUser', () => {
    it('returns user with full details', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        workPhone: '555-1234',
        cellPhone: null,
        jobTitle: 'Developer',
        active: true,
        cognitoId: 'cognito-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        contactRoles: [
          {
            role: { id: 'role-1', name: 'NDA User', description: 'Standard user' },
            grantedAt: new Date(),
          },
        ],
        agencyGroupGrants: [
          {
            agencyGroup: { id: 'group-1', name: 'DoD', code: 'DOD' },
            grantedByUser: { id: 'admin-1', firstName: 'Admin', lastName: 'User' },
            grantedAt: new Date(),
          },
        ],
        subagencyGrants: [
          {
            subagency: {
              id: 'sub-1',
              name: 'Air Force',
              code: 'USAF',
              agencyGroup: { name: 'DoD' },
            },
            grantedByUser: null,
            grantedAt: new Date(),
          },
        ],
      });

      const result = await getUser('user-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-1');
      expect(result!.roles).toHaveLength(1);
      expect(result!.roles[0].name).toBe('NDA User');
      expect(result!.agencyGroupGrants).toHaveLength(1);
      expect(result!.agencyGroupGrants[0].grantedBy?.name).toBe('Admin User');
      expect(result!.subagencyGrants).toHaveLength(1);
      expect(result!.subagencyGrants[0].subagency.agencyGroupName).toBe('DoD');
    });

    it('returns null when user not found', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      const result = await getUser('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('creates user successfully', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);
      mockPrisma.contact.create.mockResolvedValue({
        id: 'new-user',
        firstName: 'New',
        lastName: 'User',
        email: 'new@test.com',
        workPhone: null,
        cellPhone: null,
        jobTitle: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await createUser(
        {
          firstName: 'New',
          lastName: 'User',
          email: 'new@test.com',
        },
        'admin-1'
      );

      expect(result.id).toBe('new-user');
      expect(mockPrisma.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'New',
          lastName: 'User',
          email: 'new@test.com',
          active: true,
        }),
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('creates user with all optional fields', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);
      mockPrisma.contact.create.mockResolvedValue({
        id: 'new-user',
        firstName: 'New',
        lastName: 'User',
        email: 'new@test.com',
        workPhone: '555-1234',
        cellPhone: '555-5678',
        jobTitle: 'Developer',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await createUser(
        {
          firstName: 'New',
          lastName: 'User',
          email: 'new@test.com',
          workPhone: '555-1234',
          cellPhone: '555-5678',
          jobTitle: 'Developer',
        },
        'admin-1'
      );

      expect(mockPrisma.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workPhone: '555-1234',
          cellPhone: '555-5678',
          jobTitle: 'Developer',
        }),
      });
    });

    it('throws error for duplicate email', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@test.com',
      });

      await expect(
        createUser(
          {
            firstName: 'New',
            lastName: 'User',
            email: 'existing@test.com',
          },
          'admin-1'
        )
      ).rejects.toThrow(UserServiceError);

      try {
        await createUser(
          {
            firstName: 'New',
            lastName: 'User',
            email: 'existing@test.com',
          },
          'admin-1'
        );
      } catch (error) {
        expect((error as UserServiceError).code).toBe('DUPLICATE_EMAIL');
      }
    });
  });

  describe('updateUser', () => {
    it('updates user successfully', async () => {
      mockPrisma.contact.findUnique.mockReset();
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'old@test.com',
        firstName: 'Old',
        lastName: 'Name',
      });
      mockPrisma.contact.update.mockResolvedValue({
        id: 'user-1',
        firstName: 'Updated',
        lastName: 'Name',
        email: 'old@test.com',
        workPhone: null,
        cellPhone: null,
        jobTitle: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await updateUser(
        'user-1',
        { firstName: 'Updated' },
        'admin-1'
      );

      expect(result.firstName).toBe('Updated');
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('throws error when user not found', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      await expect(
        updateUser('nonexistent', { firstName: 'New' }, 'admin-1')
      ).rejects.toThrow(UserServiceError);

      try {
        await updateUser('nonexistent', { firstName: 'New' }, 'admin-1');
      } catch (error) {
        expect((error as UserServiceError).code).toBe('NOT_FOUND');
      }
    });

    it('throws error for duplicate email on update', async () => {
      mockPrisma.contact.findUnique.mockReset();
      mockPrisma.contact.findUnique
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'original@test.com',
          firstName: 'Original',
        })
        .mockResolvedValueOnce({
          id: 'other-user',
          email: 'taken@test.com',
        });

      await expect(
        updateUser('user-1', { email: 'taken@test.com' }, 'admin-1')
      ).rejects.toThrow(UserServiceError);

      try {
        mockPrisma.contact.findUnique.mockReset();
        mockPrisma.contact.findUnique
          .mockResolvedValueOnce({
            id: 'user-1',
            email: 'original@test.com',
            firstName: 'Original',
          })
          .mockResolvedValueOnce({
            id: 'other-user',
            email: 'taken@test.com',
          });
        await updateUser('user-1', { email: 'taken@test.com' }, 'admin-1');
      } catch (error) {
        expect((error as UserServiceError).code).toBe('DUPLICATE_EMAIL');
      }
    });

    it('allows updating to same email (no change)', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'same@test.com',
        firstName: 'User',
      });
      mockPrisma.contact.update.mockResolvedValue({
        id: 'user-1',
        firstName: 'Updated',
        lastName: 'Name',
        email: 'same@test.com',
        workPhone: null,
        cellPhone: null,
        jobTitle: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Should not throw - same email is allowed
      await updateUser('user-1', { email: 'same@test.com', firstName: 'Updated' }, 'admin-1');

      expect(mockPrisma.contact.update).toHaveBeenCalled();
    });
  });

  describe('deactivateUser', () => {
    it('deactivates user successfully', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        firstName: 'Active',
        lastName: 'User',
        active: true,
        cognitoId: 'cognito-123',
      });
      mockPrisma.contact.update.mockResolvedValue({
        id: 'user-1',
        firstName: 'Active',
        lastName: 'User',
        email: 'user@test.com',
        workPhone: null,
        cellPhone: null,
        jobTitle: null,
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await deactivateUser('user-1', 'admin-1');

      expect(mockPrisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { active: false },
      });
      expect(mockInvalidateUserContext).toHaveBeenCalledWith('cognito-123');
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('throws error when user not found', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      await expect(
        deactivateUser('nonexistent', 'admin-1')
      ).rejects.toThrow(UserServiceError);

      try {
        await deactivateUser('nonexistent', 'admin-1');
      } catch (error) {
        expect((error as UserServiceError).code).toBe('NOT_FOUND');
      }
    });

    it('throws error when user already deactivated', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        active: false,
      });

      await expect(
        deactivateUser('user-1', 'admin-1')
      ).rejects.toThrow(UserServiceError);

      try {
        await deactivateUser('user-1', 'admin-1');
      } catch (error) {
        expect((error as UserServiceError).code).toBe('ALREADY_DEACTIVATED');
      }
    });

    it('throws error when trying to self-deactivate', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@test.com',
        active: true,
      });

      await expect(
        deactivateUser('admin-1', 'admin-1')
      ).rejects.toThrow(UserServiceError);

      try {
        await deactivateUser('admin-1', 'admin-1');
      } catch (error) {
        expect((error as UserServiceError).code).toBe('SELF_DEACTIVATION');
      }
    });

    it('does not invalidate cache for user without cognitoId', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        firstName: 'User',
        lastName: 'Name',
        active: true,
        cognitoId: null, // Not linked to Cognito
      });
      mockPrisma.contact.update.mockResolvedValue({
        id: 'user-1',
        firstName: 'User',
        lastName: 'Name',
        email: 'user@test.com',
        workPhone: null,
        cellPhone: null,
        jobTitle: null,
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await deactivateUser('user-1', 'admin-1');

      expect(mockInvalidateUserContext).not.toHaveBeenCalled();
    });
  });

  describe('UserServiceError', () => {
    it('creates error with message and code', () => {
      const error = new UserServiceError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('UserServiceError');
    });
  });
});

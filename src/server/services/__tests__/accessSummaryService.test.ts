/**
 * Tests for Access Summary Service
 * Story 2.6: Access Control Summary View
 *
 * Tests:
 * - getUserAccessSummary returns complete access data
 * - Effective permissions are deduplicated
 * - Export returns all users with access
 * - CSV conversion works correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma - must be defined before imports
vi.mock('../../db/index.js', () => {
  const prismaMock = {
    contact: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };

  return { prisma: prismaMock, default: prismaMock };
});

import {
  getUserAccessSummary,
  exportAllUsersAccess,
  convertToCSV,
} from '../accessSummaryService.js';
import { prisma } from '../../db/index.js';

// Get the mocked prisma for assertions
const mockPrisma = vi.mocked(prisma);

describe('Access Summary Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserAccessSummary', () => {
    it('returns complete access summary for a user', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'user-1',
        firstName: 'Kelly',
        lastName: 'Davidson',
        email: 'kelly@test.com',
        contactRoles: [
          {
            grantedAt: new Date(),
            role: {
              id: 'role-1',
              name: 'Admin',
              description: 'System administrator',
              rolePermissions: [
                {
                  permission: {
                    code: 'admin:manage_users',
                    name: 'Manage Users',
                    category: 'admin',
                  },
                },
                {
                  permission: {
                    code: 'nda:create',
                    name: 'Create NDAs',
                    category: 'nda',
                  },
                },
              ],
            },
          },
          {
            grantedAt: new Date(),
            role: {
              id: 'role-2',
              name: 'NDA User',
              description: 'Standard NDA user',
              rolePermissions: [
                {
                  permission: {
                    code: 'nda:create',
                    name: 'Create NDAs',
                    category: 'nda',
                  },
                },
                {
                  permission: {
                    code: 'nda:view',
                    name: 'View NDAs',
                    category: 'nda',
                  },
                },
              ],
            },
          },
        ],
        agencyGroupGrants: [
          {
            grantedAt: new Date(),
            agencyGroup: {
              id: 'group-1',
              name: 'DoD',
              code: 'DOD',
              subagencies: [
                { id: 'sub-1', name: 'Air Force', code: 'USAF' },
                { id: 'sub-2', name: 'Navy', code: 'USN' },
              ],
            },
            grantedByUser: {
              id: 'admin-1',
              firstName: 'Admin',
              lastName: 'User',
            },
          },
        ],
        subagencyGrants: [
          {
            grantedAt: new Date(),
            subagency: {
              id: 'sub-3',
              name: 'NIH',
              code: 'NIH',
              agencyGroup: {
                id: 'group-2',
                name: 'Fed Civ',
                code: 'FEDCIV',
              },
            },
            grantedByUser: null,
          },
        ],
      });

      const result = await getUserAccessSummary('user-1');

      expect(result).not.toBeNull();
      expect(result!.user.name).toBe('Kelly Davidson');
      expect(result!.user.email).toBe('kelly@test.com');

      // Check roles
      expect(result!.roles).toHaveLength(2);
      expect(result!.roles[0].name).toBe('Admin');

      // Check effective permissions (deduplicated)
      expect(result!.effectivePermissions).toContain('admin:manage_users');
      expect(result!.effectivePermissions).toContain('nda:create');
      expect(result!.effectivePermissions).toContain('nda:view');
      // nda:create appears in both roles but should only appear once
      const createCount = result!.effectivePermissions.filter(p => p === 'nda:create').length;
      expect(createCount).toBe(1);

      // Check agency group access
      expect(result!.agencyGroupAccess).toHaveLength(1);
      expect(result!.agencyGroupAccess[0].name).toBe('DoD');
      expect(result!.agencyGroupAccess[0].subagencies).toHaveLength(2);
      expect(result!.agencyGroupAccess[0].grantedBy?.name).toBe('Admin User');

      // Check direct subagency access
      expect(result!.subagencyAccess).toHaveLength(1);
      expect(result!.subagencyAccess[0].name).toBe('NIH');
      expect(result!.subagencyAccess[0].agencyGroup.name).toBe('Fed Civ');
      expect(result!.subagencyAccess[0].grantedBy).toBeNull();
    });

    it('returns null for non-existent user', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      const result = await getUserAccessSummary('nonexistent');

      expect(result).toBeNull();
    });

    it('handles user with no roles', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'user-1',
        firstName: 'New',
        lastName: 'User',
        email: 'new@test.com',
        contactRoles: [],
        agencyGroupGrants: [],
        subagencyGrants: [],
      });

      const result = await getUserAccessSummary('user-1');

      expect(result).not.toBeNull();
      expect(result!.roles).toHaveLength(0);
      expect(result!.effectivePermissions).toHaveLength(0);
      expect(result!.agencyGroupAccess).toHaveLength(0);
      expect(result!.subagencyAccess).toHaveLength(0);
    });

    it('uses email as name when firstName/lastName are empty', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'user-1',
        firstName: null,
        lastName: null,
        email: 'test@test.com',
        contactRoles: [],
        agencyGroupGrants: [],
        subagencyGrants: [],
      });

      const result = await getUserAccessSummary('user-1');

      expect(result!.user.name).toBe('test@test.com');
    });
  });

  describe('exportAllUsersAccess', () => {
    it('returns all users with their access', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([
        {
          firstName: 'Kelly',
          lastName: 'Davidson',
          email: 'kelly@test.com',
          contactRoles: [{ role: { name: 'Admin' } }],
          agencyGroupGrants: [
            {
              grantedAt: new Date('2025-01-15'),
              agencyGroup: {
                name: 'DoD',
                subagencies: [{ id: 'sub-1', name: 'Air Force' }],
              },
              grantedByUser: { firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
            },
          ],
          subagencyGrants: [
            {
              grantedAt: new Date('2025-01-16'),
              subagency: {
                id: 'sub-2',
                name: 'NIH',
                agencyGroup: { id: 'group-2', name: 'Fed Civ' },
              },
              grantedByUser: null,
            },
          ],
        },
        {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@test.com',
          contactRoles: [{ role: { name: 'NDA User' } }],
          agencyGroupGrants: [],
          subagencyGrants: [],
        },
        {
          firstName: null,
          lastName: null,
          email: 'inactive@test.com',
          contactRoles: [],
          agencyGroupGrants: [],
          subagencyGrants: [],
        },
      ]);

      const result = await exportAllUsersAccess();

      expect(result).toHaveLength(3);

      expect(result[0].userName).toBe('Kelly Davidson');
      expect(result[0].roles).toBe('Admin');
      expect(result[0].agencyGroups).toBe('DoD');
      expect(result[0].subagencies).toBe('NIH (direct), Air Force (via DoD)');
      expect(result[0].grantedBy).toBe('DoD: Admin User; NIH: Unknown');
      expect(result[0].grantedAt).toBe('DoD: 2025-01-15; NIH: 2025-01-16');

      expect(result[1].userName).toBe('John Smith');
      expect(result[1].roles).toBe('NDA User');
      expect(result[1].agencyGroups).toBe('None');
      expect(result[1].subagencies).toBe('None');
      expect(result[1].grantedBy).toBe('None');
      expect(result[1].grantedAt).toBe('None');

      expect(result[2].userName).toBe('inactive@test.com');
      expect(result[2].roles).toBe('None');
      expect(result[2].grantedBy).toBe('None');
    });

    it('joins multiple roles and agencies with commas', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([
        {
          firstName: 'Multi',
          lastName: 'Access',
          email: 'multi@test.com',
          contactRoles: [
            { role: { name: 'Admin' } },
            { role: { name: 'NDA User' } },
          ],
          agencyGroupGrants: [
            {
              grantedAt: new Date('2025-02-01'),
              agencyGroup: { name: 'DoD', subagencies: [] },
              grantedByUser: { firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
            },
            {
              grantedAt: new Date('2025-02-02'),
              agencyGroup: { name: 'Commercial', subagencies: [] },
              grantedByUser: null,
            },
          ],
          subagencyGrants: [
            {
              grantedAt: new Date('2025-02-03'),
              subagency: { id: 'sub-1', name: 'NIH', agencyGroup: { id: 'g-1', name: 'Fed Civ' } },
              grantedByUser: null,
            },
            {
              grantedAt: new Date('2025-02-04'),
              subagency: { id: 'sub-2', name: 'NASA', agencyGroup: { id: 'g-2', name: 'Fed Civ' } },
              grantedByUser: null,
            },
          ],
        },
      ]);

      const result = await exportAllUsersAccess();

      expect(result[0].roles).toBe('Admin, NDA User');
      expect(result[0].agencyGroups).toBe('DoD, Commercial');
      expect(result[0].subagencies).toBe('NIH (direct), NASA (direct)');
    });
  });

  describe('convertToCSV', () => {
    it('generates valid CSV with headers', () => {
      const data = [
        {
          userName: 'Kelly Davidson',
          email: 'kelly@test.com',
          roles: 'Admin',
          agencyGroups: 'DoD',
          subagencies: 'NIH (direct)',
          grantedBy: 'DoD: Admin User',
          grantedAt: 'DoD: 2025-01-15',
        },
      ];

      const csv = convertToCSV(data);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('User Name,Email,Roles,Agency Groups,Subagencies,Granted By,Granted At');
      expect(lines[1]).toBe('Kelly Davidson,kelly@test.com,Admin,DoD,NIH (direct),DoD: Admin User,DoD: 2025-01-15');
    });

    it('escapes values with commas', () => {
      const data = [
        {
          userName: 'Test User',
          email: 'test@test.com',
          roles: 'Admin, NDA User',
          agencyGroups: 'None',
          subagencies: 'None',
          grantedBy: 'None',
          grantedAt: 'None',
        },
      ];

      const csv = convertToCSV(data);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('"Admin, NDA User"');
    });

    it('escapes values with quotes', () => {
      const data = [
        {
          userName: 'Test "Quote" User',
          email: 'test@test.com',
          roles: 'None',
          agencyGroups: 'None',
          subagencies: 'None',
          grantedBy: 'None',
          grantedAt: 'None',
        },
      ];

      const csv = convertToCSV(data);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('"Test ""Quote"" User"');
    });

    it('handles empty data', () => {
      const csv = convertToCSV([]);
      const lines = csv.split('\n');

      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe('User Name,Email,Roles,Agency Groups,Subagencies,Granted By,Granted At');
    });
  });
});

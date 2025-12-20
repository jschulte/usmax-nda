/**
 * User Context Service Tests
 * Story 1.2: JWT Middleware & User Context
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockPrisma = {
  contact: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  role: {
    findUnique: vi.fn(),
  },
  subagency: {
    findMany: vi.fn(),
  },
};

vi.mock('../../db/index.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

const originalEnv = process.env;

async function importService() {
  return await import('../userContextService.js');
}

describe('userContextService (database mode)', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, DATABASE_URL: 'postgres://test' };
    vi.resetModules();
    mockPrisma.contact.findUnique.mockReset();
    mockPrisma.contact.create.mockReset();
    mockPrisma.role.findUnique.mockReset();
    mockPrisma.subagency.findMany.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads full user context with roles, permissions, and agency grants', async () => {
    const { loadUserContext, clearAllUserContextCache } = await importService();
    clearAllUserContextCache();

    mockPrisma.contact.findUnique.mockResolvedValue({
      id: 'contact-1',
      cognitoId: 'cognito-123',
      email: 'user@test.com',
      firstName: 'Test',
      lastName: 'User',
      active: true,
      contactRoles: [
        {
          role: {
            name: 'NDA User',
            rolePermissions: [
              { permission: { code: 'nda:view' } },
              { permission: { code: 'nda:create' } },
            ],
          },
        },
      ],
      agencyGroupGrants: [
        {
          agencyGroupId: 'agency-group-1',
          agencyGroup: { subagencies: [{ id: 'sub-1' }, { id: 'sub-2' }] },
        },
      ],
      subagencyGrants: [{ subagencyId: 'sub-direct-1' }],
    });

    const context = await loadUserContext('cognito-123');

    expect(context).not.toBeNull();
    expect(context!.roles).toEqual(['NDA User']);
    expect(context!.permissions.has('nda:view')).toBe(true);
    expect(context!.permissions.has('nda:create')).toBe(true);
    expect(context!.authorizedAgencyGroups).toEqual(['agency-group-1']);
    expect(context!.authorizedSubagencies).toEqual(['sub-direct-1']);
    expect(context!.active).toBe(true);
  });

  it('returns null when user is not found', async () => {
    const { loadUserContext, clearAllUserContextCache } = await importService();
    clearAllUserContextCache();

    mockPrisma.contact.findUnique.mockResolvedValue(null);

    const context = await loadUserContext('missing');
    expect(context).toBeNull();
  });

  it('caches user context and avoids duplicate lookups', async () => {
    const { loadUserContext, clearAllUserContextCache } = await importService();
    clearAllUserContextCache();

    mockPrisma.contact.findUnique.mockResolvedValue({
      id: 'contact-1',
      cognitoId: 'cognito-123',
      email: 'user@test.com',
      firstName: 'Test',
      lastName: 'User',
      active: true,
      contactRoles: [],
      agencyGroupGrants: [],
      subagencyGrants: [],
    });

    await loadUserContext('cognito-123');
    await loadUserContext('cognito-123');

    expect(mockPrisma.contact.findUnique).toHaveBeenCalledTimes(1);
  });

  it('invalidates cached context when requested', async () => {
    const {
      loadUserContext,
      invalidateUserContext,
      clearAllUserContextCache,
    } = await importService();
    clearAllUserContextCache();

    mockPrisma.contact.findUnique.mockResolvedValue({
      id: 'contact-1',
      cognitoId: 'cognito-123',
      email: 'user@test.com',
      firstName: 'Test',
      lastName: 'User',
      active: true,
      contactRoles: [],
      agencyGroupGrants: [],
      subagencyGrants: [],
    });

    await loadUserContext('cognito-123');
    invalidateUserContext('cognito-123');
    await loadUserContext('cognito-123');

    expect(mockPrisma.contact.findUnique).toHaveBeenCalledTimes(2);
  });

  it('creates contact for first login with default role', async () => {
    const { createContactForFirstLogin } = await importService();

    mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-readonly' });
    mockPrisma.contact.create.mockResolvedValue({
      id: 'contact-1',
      email: 'new@test.com',
      active: true,
      contactRoles: [
        {
          role: {
            name: 'Read-Only',
            rolePermissions: [{ permission: { code: 'nda:view' } }],
          },
        },
      ],
    });

    const context = await createContactForFirstLogin('cognito-999', 'new@test.com');

    expect(context.contactId).toBe('contact-1');
    expect(context.roles).toEqual(['Read-Only']);
    expect(context.permissions.has('nda:view')).toBe(true);
  });

  it('throws when default Read-Only role is missing', async () => {
    const { createContactForFirstLogin } = await importService();

    mockPrisma.role.findUnique.mockResolvedValue(null);

    await expect(createContactForFirstLogin('cognito-999', 'new@test.com')).rejects.toThrow(
      'Default role not found: Read-Only'
    );
  });
});

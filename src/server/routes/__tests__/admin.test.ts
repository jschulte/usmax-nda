/**
 * Admin Routes Tests
 * Story 1.3: RBAC Permission System
 * Task 6.5: Integration tests for admin role management APIs
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PERMISSIONS, PERMISSION_DESCRIPTIONS } from '../../constants/permissions.js';

vi.mock('../../middleware/authenticateJWT.js', () => ({
  authenticateJWT: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'admin@usmax.com' };
    next();
  },
}));

vi.mock('../../middleware/attachUserContext.js', () => ({
  attachUserContext: (req: any, _res: any, next: any) => {
    req.userContext = {
      id: 'user-1',
      contactId: 'contact-1',
      email: 'admin@usmax.com',
      name: 'Admin User',
      active: true,
      roles: ['Admin'],
      permissions: new Set(['admin:manage_users']),
      authorizedAgencyGroups: [],
      authorizedSubagencies: [],
    };
    next();
  },
}));

vi.mock('../../middleware/checkPermissions.js', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

const mockPrisma = {
  role: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  permission: {
    findMany: vi.fn(),
  },
  contact: {
    findUnique: vi.fn(),
  },
  contactRole: {
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('../../db/index.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

vi.mock('../../services/auditService.js', () => ({
  auditService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
  AuditAction: {
    ROLE_ASSIGNED: 'role_assigned',
    ROLE_REMOVED: 'role_removed',
    ACCESS_EXPORT: 'access_export',
  },
}));

vi.mock('../../services/userContextService.js', () => ({
  invalidateUserContext: vi.fn(),
}));

vi.mock('../../services/accessSummaryService.js', () => ({
  exportAllUsersAccess: vi.fn().mockResolvedValue([]),
  convertToCSV: vi.fn().mockReturnValue(''),
}));

import { auditService } from '../../services/auditService.js';
import { invalidateUserContext } from '../../services/userContextService.js';

describe('Admin Routes Integration', () => {
  let app: express.Express;

  beforeAll(() => {
    vi.resetModules();
  });

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { default: adminRouter } = await import('../admin');
    app.use('/api/admin', adminRouter);

    vi.clearAllMocks();
  });

  describe('GET /api/admin/roles', () => {
    it('returns roles with permissions', async () => {
      vi.mocked(mockPrisma.role.findMany).mockResolvedValue([
        {
          id: 'role-1',
          name: 'Admin',
          description: 'Administrator role',
          isSystemRole: true,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-02'),
          rolePermissions: [
            {
              permission: {
                id: 'perm-1',
                code: PERMISSIONS.NDA_VIEW,
                name: 'View NDAs',
                category: 'nda',
              },
            },
          ],
        },
      ] as any);

      const response = await request(app).get('/api/admin/roles');

      expect(response.status).toBe(200);
      expect(response.body.roles).toHaveLength(1);
      expect(response.body.roles[0].name).toBe('Admin');
      expect(response.body.roles[0].permissions[0].code).toBe(PERMISSIONS.NDA_VIEW);
    });
  });

  describe('GET /api/admin/permissions', () => {
    it('returns permissions with descriptions', async () => {
      vi.mocked(mockPrisma.permission.findMany).mockResolvedValue([
        {
          id: 'perm-1',
          code: PERMISSIONS.NDA_VIEW,
          name: 'View NDAs',
          description: 'Raw description',
          category: 'nda',
        },
      ] as any);

      const response = await request(app).get('/api/admin/permissions');

      expect(response.status).toBe(200);
      expect(response.body.permissions).toHaveLength(1);
      expect(response.body.permissions[0].code).toBe(PERMISSIONS.NDA_VIEW);
      expect(response.body.permissions[0].description).toBe(
        PERMISSION_DESCRIPTIONS[PERMISSIONS.NDA_VIEW]
      );
    });
  });

  describe('POST /api/admin/users/:id/roles', () => {
    it('assigns a role to a user', async () => {
      vi.mocked(mockPrisma.contact.findUnique).mockResolvedValue({
        id: 'contact-2',
        email: 'user@usmax.com',
        cognitoId: 'cognito-2',
      } as any);
      vi.mocked(mockPrisma.role.findUnique).mockResolvedValue({
        id: 'role-1',
        name: 'NDA User',
      } as any);
      vi.mocked(mockPrisma.contactRole.findUnique).mockResolvedValue(null as any);
      vi.mocked(mockPrisma.contactRole.create).mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/admin/users/contact-2/roles')
        .send({ roleId: 'role-1' });

      expect(response.status).toBe(201);
      expect(response.body.roleName).toBe('NDA User');
      expect(vi.mocked(invalidateUserContext)).toHaveBeenCalledWith('cognito-2');
      expect(vi.mocked(auditService.log)).toHaveBeenCalled();
    });

    it('returns 400 when roleId is missing', async () => {
      const response = await request(app)
        .post('/api/admin/users/contact-2/roles')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_ROLE_ID');
    });
  });

  describe('DELETE /api/admin/users/:id/roles/:roleId', () => {
    it('blocks removal of the last role', async () => {
      vi.mocked(mockPrisma.contact.findUnique).mockResolvedValue({
        id: 'contact-2',
        email: 'user@usmax.com',
        cognitoId: 'cognito-2',
      } as any);
      vi.mocked(mockPrisma.role.findUnique).mockResolvedValue({
        id: 'role-1',
        name: 'NDA User',
      } as any);
      vi.mocked(mockPrisma.contactRole.findUnique).mockResolvedValue({
        contactId: 'contact-2',
        roleId: 'role-1',
      } as any);
      vi.mocked(mockPrisma.contactRole.count).mockResolvedValue(1 as any);

      const response = await request(app).delete('/api/admin/users/contact-2/roles/role-1');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('LAST_ROLE');
    });
  });
});

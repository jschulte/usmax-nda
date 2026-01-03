/**
 * Role Assignment Route Tests
 * Story 9.5: Verify role assignment responses and error codes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

const prismaMock = {
  contact: {
    findUnique: vi.fn(),
  },
  role: {
    findUnique: vi.fn(),
  },
  contactRole: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('../../db/index.js', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

vi.mock('../../middleware/authenticateJWT.js', () => ({
  authenticateJWT: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin-1', email: 'admin@usmax.com' };
    next();
  },
}));

vi.mock('../../middleware/attachUserContext.js', () => ({
  attachUserContext: (req: any, _res: any, next: any) => {
    req.userContext = {
      id: 'admin-1',
      contactId: 'admin-1',
      email: 'admin@usmax.com',
      name: 'Admin User',
      roles: ['Admin'],
      permissions: new Set(['admin:manage_users', 'admin:view_audit_logs']),
      authorizedAgencyGroups: [],
      authorizedSubagencies: [],
    };
    next();
  },
}));

vi.mock('../../middleware/checkPermissions.js', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireAnyPermission: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../services/userContextService.js', () => ({
  invalidateUserContext: vi.fn(),
}));

vi.mock('../../services/auditService.js', async () => {
  const actual = await vi.importActual<typeof import('../../services/auditService.js')>(
    '../../services/auditService.js'
  );
  return {
    ...actual,
    auditService: {
      log: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe('Admin role assignment routes', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { default: adminRouter } = await import('../admin.js');
    app.use('/api/admin', adminRouter);
  });

  it('returns 409 when user already has role', async () => {
    vi.mocked(prismaMock.contact.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'user@usmax.com',
      cognitoId: 'cognito-1',
    } as any);
    vi.mocked(prismaMock.role.findUnique).mockResolvedValue({
      id: 'role-1',
      name: 'Read-Only',
    } as any);
    vi.mocked(prismaMock.contactRole.findUnique).mockResolvedValue({
      contactId: 'user-1',
      roleId: 'role-1',
    } as any);

    const response = await request(app)
      .post('/api/admin/users/user-1/roles')
      .send({ roleId: 'role-1' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('ROLE_ALREADY_ASSIGNED');
    expect(response.body.error).toBe('User already has this role');
  });

  it('returns 404 when user not found', async () => {
    vi.mocked(prismaMock.contact.findUnique).mockResolvedValue(null);

    const response = await request(app)
      .post('/api/admin/users/user-404/roles')
      .send({ roleId: 'role-1' });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('USER_NOT_FOUND');
  });

  it('returns 404 when role not found', async () => {
    vi.mocked(prismaMock.contact.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'user@usmax.com',
      cognitoId: 'cognito-1',
    } as any);
    vi.mocked(prismaMock.role.findUnique).mockResolvedValue(null);

    const response = await request(app)
      .post('/api/admin/users/user-1/roles')
      .send({ roleId: 'role-missing' });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('ROLE_NOT_FOUND');
  });

  it('assigns role successfully', async () => {
    vi.mocked(prismaMock.contact.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'user@usmax.com',
      cognitoId: 'cognito-1',
    } as any);
    vi.mocked(prismaMock.role.findUnique).mockResolvedValue({
      id: 'role-1',
      name: 'Read-Only',
    } as any);
    vi.mocked(prismaMock.contactRole.findUnique).mockResolvedValue(null);
    vi.mocked(prismaMock.contactRole.create).mockResolvedValue({
      contactId: 'user-1',
      roleId: 'role-1',
    } as any);

    const response = await request(app)
      .post('/api/admin/users/user-1/roles')
      .send({ roleId: 'role-1' });

    expect(response.status).toBe(201);
    expect(response.body.roleName).toBe('Read-Only');
  });
});

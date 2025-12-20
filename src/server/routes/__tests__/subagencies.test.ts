/**
 * Subagencies Routes Tests
 * Story 2.2: Subagencies CRUD
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PERMISSIONS } from '../../constants/permissions.js';
import { ROLE_NAMES, type UserContext } from '../../types/auth.js';

let currentUserContext: UserContext = {
  id: 'user-1',
  email: 'admin@usmax.com',
  contactId: 'contact-1',
  permissions: new Set([PERMISSIONS.ADMIN_MANAGE_AGENCIES, PERMISSIONS.NDA_VIEW]),
  roles: [ROLE_NAMES.ADMIN],
  authorizedAgencyGroups: ['group-1'],
  authorizedSubagencies: ['sub-1'],
  active: true,
};

const mockPrisma = {
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

vi.mock('../../middleware/authenticateJWT.js', () => ({
  authenticateJWT: (req: any, _res: any, next: any) => {
    req.user = { id: currentUserContext.id, email: currentUserContext.email };
    next();
  },
}));

vi.mock('../../middleware/attachUserContext.js', () => ({
  attachUserContext: (req: any, _res: any, next: any) => {
    req.userContext = currentUserContext;
    next();
  },
}));

vi.mock('../../middleware/checkPermissions.js', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireAnyPermission: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../db/index.js', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

vi.mock('../../services/auditService.js', () => ({
  auditService: { log: vi.fn().mockResolvedValue(undefined) },
  AuditAction: {
    SUBAGENCY_CREATED: 'subagency_created',
    SUBAGENCY_UPDATED: 'subagency_updated',
    SUBAGENCY_DELETED: 'subagency_deleted',
  },
}));

describe('Subagencies Routes', () => {
  const buildApp = async () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { default: subagencyRouter } = await import('../subagencies');
    app.use('/api', subagencyRouter);

    return app;
  };

  beforeEach(() => {
    currentUserContext = {
      id: 'user-1',
      email: 'admin@usmax.com',
      contactId: 'contact-1',
      permissions: new Set([PERMISSIONS.ADMIN_MANAGE_AGENCIES, PERMISSIONS.NDA_VIEW]),
      roles: [ROLE_NAMES.ADMIN],
      authorizedAgencyGroups: ['group-1'],
      authorizedSubagencies: ['sub-1'],
      active: true,
    };

    vi.clearAllMocks();
  });

  it('GET /api/agency-groups/:groupId/subagencies returns subagencies', async () => {
    const app = await buildApp();
    mockPrisma.subagency.findMany.mockResolvedValueOnce([
      {
        id: 'sub-1',
        name: 'Air Force',
        code: 'USAF',
        description: 'United States Air Force',
        agencyGroupId: 'group-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { ndas: 3 },
      },
    ]);

    const response = await request(app).get('/api/agency-groups/group-1/subagencies');

    expect(response.status).toBe(200);
    expect(response.body.subagencies).toHaveLength(1);
    expect(response.body.subagencies[0].name).toBe('Air Force');
    expect(mockPrisma.subagency.findMany).toHaveBeenCalledWith({
      where: { agencyGroupId: 'group-1' },
      include: { _count: { select: { ndas: true } } },
      orderBy: { name: 'asc' },
    });
  });

  it('GET /api/agency-groups/:groupId/subagencies scopes to authorized subagencies', async () => {
    currentUserContext = {
      id: 'user-2',
      email: 'user@usmax.com',
      contactId: 'contact-2',
      permissions: new Set([PERMISSIONS.NDA_VIEW]),
      roles: [ROLE_NAMES.NDA_USER],
      authorizedAgencyGroups: [],
      authorizedSubagencies: ['sub-1'],
      active: true,
    };

    const app = await buildApp();
    mockPrisma.subagency.findMany.mockResolvedValueOnce([
      {
        id: 'sub-1',
        name: 'Air Force',
        code: 'USAF',
        description: null,
        agencyGroupId: 'group-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { ndas: 0 },
      },
    ]);

    const response = await request(app).get('/api/agency-groups/group-1/subagencies');

    expect(response.status).toBe(200);
    expect(response.body.subagencies).toHaveLength(1);
    expect(mockPrisma.subagency.findMany).toHaveBeenCalledWith({
      where: { agencyGroupId: 'group-1', id: { in: ['sub-1'] } },
      include: { _count: { select: { ndas: true } } },
      orderBy: { name: 'asc' },
    });
  });

  it('POST /api/agency-groups/:groupId/subagencies creates a subagency', async () => {
    const app = await buildApp();
    mockPrisma.agencyGroup.findUnique.mockResolvedValueOnce({
      id: 'group-1',
      name: 'DoD',
    });
    mockPrisma.subagency.findFirst.mockResolvedValue(null);
    mockPrisma.subagency.create.mockResolvedValueOnce({
      id: 'sub-2',
      name: 'Navy',
      code: 'NAVY',
      description: 'United States Navy',
      agencyGroupId: 'group-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .post('/api/agency-groups/group-1/subagencies')
      .send({ name: 'Navy', code: 'navy', description: 'United States Navy' });

    expect(response.status).toBe(201);
    expect(response.body.subagency).toBeDefined();
    expect(response.body.subagency.name).toBe('Navy');
  });

  it('GET /api/subagencies/:id returns a subagency', async () => {
    const app = await buildApp();
    mockPrisma.subagency.findUnique.mockResolvedValueOnce({
      id: 'sub-5',
      name: 'Space Force',
      code: 'USSF',
      description: null,
      agencyGroupId: 'group-9',
      agencyGroup: { id: 'group-9', name: 'DoD', code: 'DOD' },
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { ndas: 1 },
    });

    const response = await request(app).get('/api/subagencies/sub-5');

    expect(response.status).toBe(200);
    expect(response.body.subagency).toBeDefined();
    expect(response.body.subagency.name).toBe('Space Force');
  });

  it('GET /api/subagencies/:id hides subagencies outside access scope', async () => {
    currentUserContext = {
      id: 'user-3',
      email: 'user@usmax.com',
      contactId: 'contact-3',
      permissions: new Set([PERMISSIONS.NDA_VIEW]),
      roles: [ROLE_NAMES.NDA_USER],
      authorizedAgencyGroups: [],
      authorizedSubagencies: [],
      active: true,
    };

    const app = await buildApp();
    mockPrisma.subagency.findUnique.mockResolvedValueOnce({
      id: 'sub-9',
      name: 'Restricted',
      code: 'REST',
      description: null,
      agencyGroupId: 'group-9',
      agencyGroup: { id: 'group-9', name: 'DoD', code: 'DOD' },
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { ndas: 0 },
    });

    const response = await request(app).get('/api/subagencies/sub-9');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('PUT /api/subagencies/:id updates a subagency', async () => {
    const app = await buildApp();
    mockPrisma.subagency.findUnique.mockResolvedValueOnce({
      id: 'sub-6',
      name: 'Old Name',
      code: 'OLD',
      description: 'Old description',
      agencyGroupId: 'group-1',
      agencyGroup: { name: 'DoD' },
    });
    mockPrisma.subagency.findFirst.mockResolvedValue(null);
    mockPrisma.subagency.update.mockResolvedValueOnce({
      id: 'sub-6',
      name: 'Updated Name',
      code: 'UPDATED',
      description: 'Updated description',
      agencyGroupId: 'group-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .put('/api/subagencies/sub-6')
      .send({ name: 'Updated Name', code: 'updated', description: 'Updated description' });

    expect(response.status).toBe(200);
    expect(response.body.subagency).toBeDefined();
    expect(response.body.subagency.name).toBe('Updated Name');
  });

  it('DELETE /api/subagencies/:id returns ndaCount when blocked', async () => {
    const app = await buildApp();
    mockPrisma.subagency.findUnique.mockResolvedValueOnce({
      id: 'sub-3',
      name: 'Restricted',
      code: 'REST',
      agencyGroup: { name: 'DoD' },
      _count: { ndas: 4 },
    });

    const response = await request(app).delete('/api/subagencies/sub-3');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('HAS_NDAS');
    expect(response.body.ndaCount).toBe(4);
  });
});

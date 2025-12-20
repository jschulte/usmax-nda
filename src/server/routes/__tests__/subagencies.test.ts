/**
 * Subagencies Routes Tests
 * Story 2.2: Subagencies CRUD
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PERMISSIONS } from '../../constants/permissions';
import { ROLE_NAMES, type UserContext } from '../../types/auth';

process.env.USE_MOCK_AUTH = 'true';
process.env.COOKIE_SECURE = 'false';

const mockUserContext: UserContext = {
  id: 'mock-user-001',
  email: 'admin@usmax.com',
  contactId: 'contact-123',
  permissions: new Set([PERMISSIONS.ADMIN_MANAGE_AGENCIES]),
  roles: [ROLE_NAMES.ADMIN],
  authorizedAgencyGroups: [],
  authorizedSubagencies: [],
  active: true,
};

const createMockToken = () => {
  const payload = {
    sub: mockUserContext.id,
    email: mockUserContext.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `mock.${encoded}.signature`;
};

const mockAccessCookie = () => `access_token=${createMockToken()}`;

const mockListSubagencies = vi.fn();
const mockGetSubagency = vi.fn();
const mockCreateSubagency = vi.fn();
const mockUpdateSubagency = vi.fn();
const mockDeleteSubagency = vi.fn();

class MockSubagencyError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SubagencyError';
    this.code = code;
    this.details = details;
  }
}

vi.mock('../../services/subagencyService.js', () => ({
  listSubagenciesInGroup: mockListSubagencies,
  getSubagency: mockGetSubagency,
  createSubagency: mockCreateSubagency,
  updateSubagency: mockUpdateSubagency,
  deleteSubagency: mockDeleteSubagency,
  SubagencyError: MockSubagencyError,
}));

vi.mock('../../services/userContextService.js', () => ({
  loadUserContext: vi.fn().mockResolvedValue(mockUserContext),
  createContactForFirstLogin: vi.fn(),
}));

vi.mock('../../services/auditService.js', () => ({
  auditService: { log: vi.fn().mockResolvedValue(undefined) },
  AuditAction: {
    ADMIN_BYPASS: 'admin_bypass',
    PERMISSION_DENIED: 'permission_denied',
    USER_AUTO_PROVISIONED: 'user_auto_provisioned',
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
    vi.clearAllMocks();
  });

  it('GET /api/agency-groups/:groupId/subagencies returns subagencies', async () => {
    const app = await buildApp();
    const subagencies = [
      {
        id: 'sub-1',
        name: 'Air Force',
        code: 'USAF',
        description: 'United States Air Force',
        agencyGroupId: 'group-1',
        ndaCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockListSubagencies.mockResolvedValueOnce(subagencies);

    const response = await request(app)
      .get('/api/agency-groups/group-1/subagencies')
      .set('Cookie', [mockAccessCookie()]);

    expect(response.status).toBe(200);
    expect(response.body.subagencies).toHaveLength(1);
    expect(response.body.subagencies[0].name).toBe('Air Force');
  });

  it('POST /api/agency-groups/:groupId/subagencies creates a subagency', async () => {
    const app = await buildApp();
    const created = {
      id: 'sub-2',
      name: 'Navy',
      code: 'NAVY',
      description: 'United States Navy',
      agencyGroupId: 'group-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCreateSubagency.mockResolvedValueOnce(created);

    const response = await request(app)
      .post('/api/agency-groups/group-1/subagencies')
      .set('Cookie', [mockAccessCookie()])
      .send({ name: 'Navy', code: 'navy', description: 'United States Navy' });

    expect(response.status).toBe(201);
    expect(response.body.subagency).toBeDefined();
    expect(mockCreateSubagency).toHaveBeenCalledWith(
      'group-1',
      { name: 'Navy', code: 'NAVY', description: 'United States Navy' },
      mockUserContext.contactId,
      expect.any(Object)
    );
  });

  it('GET /api/subagencies/:id returns a subagency', async () => {
    const app = await buildApp();
    mockGetSubagency.mockResolvedValueOnce({
      id: 'sub-5',
      name: 'Space Force',
      code: 'USSF',
      description: null,
      agencyGroupId: 'group-9',
      agencyGroup: { id: 'group-9', name: 'DoD', code: 'DOD' },
      ndaCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .get('/api/subagencies/sub-5')
      .set('Cookie', [mockAccessCookie()]);

    expect(response.status).toBe(200);
    expect(response.body.subagency).toBeDefined();
    expect(response.body.subagency.name).toBe('Space Force');
  });

  it('PUT /api/subagencies/:id updates a subagency', async () => {
    const app = await buildApp();
    mockUpdateSubagency.mockResolvedValueOnce({
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
      .set('Cookie', [mockAccessCookie()])
      .send({ name: 'Updated Name', code: 'updated', description: 'Updated description' });

    expect(response.status).toBe(200);
    expect(response.body.subagency).toBeDefined();
    expect(mockUpdateSubagency).toHaveBeenCalledWith(
      'sub-6',
      { name: 'Updated Name', code: 'UPDATED', description: 'Updated description' },
      mockUserContext.contactId,
      expect.any(Object)
    );
  });

  it('DELETE /api/subagencies/:id returns ndaCount when blocked', async () => {
    const app = await buildApp();
    mockDeleteSubagency.mockRejectedValueOnce(
      new MockSubagencyError('Cannot delete subagency with 4 existing NDAs', 'HAS_NDAS', { ndaCount: 4 })
    );

    const response = await request(app)
      .delete('/api/subagencies/sub-3')
      .set('Cookie', [mockAccessCookie()]);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('HAS_NDAS');
    expect(response.body.ndaCount).toBe(4);
  });
});

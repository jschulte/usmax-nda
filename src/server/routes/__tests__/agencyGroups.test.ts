/**
 * Agency Groups Routes Tests
 * Story 2.1: Agency Groups CRUD
 * Task 4.2: API integration tests
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

let mockRoles = ['Admin'];
let mockPermissions = new Set(['admin:manage_agencies']);

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
      roles: mockRoles,
      permissions: mockPermissions,
      authorizedAgencyGroups: [],
      authorizedSubagencies: [],
    };
    next();
  },
}));

vi.mock('../../services/auditService.js', () => ({
  auditService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
  AuditAction: {
    ADMIN_BYPASS: 'admin_bypass',
    PERMISSION_DENIED: 'permission_denied',
  },
}));

vi.mock('../../services/agencyGroupService.js', () => {
  class AgencyGroupError extends Error {
    code: string;
    details?: Record<string, unknown>;

    constructor(message: string, code: string, details?: Record<string, unknown>) {
      super(message);
      this.name = 'AgencyGroupError';
      this.code = code;
      this.details = details;
    }
  }

  return {
    listAgencyGroups: vi.fn(),
    listAgencyGroupsForUser: vi.fn(),
    getAgencyGroup: vi.fn(),
    createAgencyGroup: vi.fn(),
    updateAgencyGroup: vi.fn(),
    deleteAgencyGroup: vi.fn(),
    AgencyGroupError,
  };
});

import * as agencyGroupService from '../../services/agencyGroupService.js';

describe('Agency Groups Routes Integration', () => {
  let app: express.Express;

  beforeAll(() => {
    vi.resetModules();
  });

  beforeEach(async () => {
    mockRoles = ['Admin'];
    mockPermissions = new Set(['admin:manage_agencies']);

    app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { default: agencyGroupsRouter } = await import('../agencyGroups');
    app.use('/api/agency-groups', agencyGroupsRouter);

    vi.clearAllMocks();
  });

  describe('GET /api/agency-groups', () => {
    it('returns 403 when user lacks permission', async () => {
      mockRoles = [];
      mockPermissions = new Set();

      const response = await request(app).get('/api/agency-groups');

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('PERMISSION_DENIED');
    });

    it('allows users with NDA permissions', async () => {
      mockRoles = [];
      mockPermissions = new Set(['nda:create']);

      const mockGroups = [
        {
          id: 'group-1',
          name: 'DoD',
          code: 'DOD',
          description: 'Department of Defense',
          subagencyCount: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(agencyGroupService.listAgencyGroupsForUser).mockResolvedValue(mockGroups as any);

      const response = await request(app).get('/api/agency-groups');

      expect(response.status).toBe(200);
      expect(response.body.agencyGroups).toHaveLength(1);
      expect(agencyGroupService.listAgencyGroupsForUser).toHaveBeenCalled();
    });

    it('returns agency groups list', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          name: 'DoD',
          code: 'DOD',
          description: 'Department of Defense',
          subagencyCount: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(agencyGroupService.listAgencyGroups).mockResolvedValue({
        agencyGroups: mockGroups as any,
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
      } as any);

      const response = await request(app).get('/api/agency-groups');

      expect(response.status).toBe(200);
      expect(response.body.agencyGroups).toHaveLength(1);
      expect(response.body.agencyGroups[0].name).toBe('DoD');
    });
  });

  describe('POST /api/agency-groups', () => {
    it('creates agency group and returns 201', async () => {
      const createdGroup = {
        id: 'group-1',
        name: 'Commercial',
        code: 'COMMERCIAL',
        description: 'Commercial agencies',
        subagencyCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(agencyGroupService.createAgencyGroup).mockResolvedValue(createdGroup as any);

      const response = await request(app)
        .post('/api/agency-groups')
        .send({ name: 'Commercial', code: 'COMMERCIAL' });

      expect(response.status).toBe(201);
      expect(response.body.agencyGroup).toBeDefined();
      expect(response.body.agencyGroup.name).toBe('Commercial');
    });

    it('returns 400 on duplicate name', async () => {
      const error = new agencyGroupService.AgencyGroupError(
        'Agency group name must be unique',
        'DUPLICATE_NAME'
      );

      vi.mocked(agencyGroupService.createAgencyGroup).mockRejectedValue(error);

      const response = await request(app)
        .post('/api/agency-groups')
        .send({ name: 'DoD', code: 'DOD' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Agency group name must be unique');
      expect(response.body.code).toBe('DUPLICATE_NAME');
    });
  });

  describe('GET /api/agency-groups/:id', () => {
    it('returns agency group details', async () => {
      const group = {
        id: 'group-1',
        name: 'DoD',
        code: 'DOD',
        description: 'Department of Defense',
        subagencies: [],
      };

      vi.mocked(agencyGroupService.getAgencyGroup).mockResolvedValue(group as any);

      const response = await request(app).get('/api/agency-groups/group-1');

      expect(response.status).toBe(200);
      expect(response.body.agencyGroup).toBeDefined();
      expect(response.body.agencyGroup.name).toBe('DoD');
    });
  });

  describe('PUT /api/agency-groups/:id', () => {
    it('updates agency group and returns 200', async () => {
      const updatedGroup = {
        id: 'group-1',
        name: 'DoD Updated',
        code: 'DOD',
        description: 'Updated description',
      };

      vi.mocked(agencyGroupService.updateAgencyGroup).mockResolvedValue(updatedGroup as any);

      const response = await request(app)
        .put('/api/agency-groups/group-1')
        .send({ name: 'DoD Updated' });

      expect(response.status).toBe(200);
      expect(response.body.agencyGroup).toBeDefined();
      expect(response.body.agencyGroup.name).toBe('DoD Updated');
    });
  });

  describe('DELETE /api/agency-groups/:id', () => {
    it('deletes agency group and returns 204', async () => {
      vi.mocked(agencyGroupService.deleteAgencyGroup).mockResolvedValue(undefined as any);

      const response = await request(app).delete('/api/agency-groups/group-1');

      expect(response.status).toBe(204);
    });

    it('returns 400 with subagency count when delete is blocked', async () => {
      const error = new agencyGroupService.AgencyGroupError(
        'Cannot delete agency group with existing subagencies',
        'HAS_SUBAGENCIES',
        { subagencyCount: 3 }
      );

      vi.mocked(agencyGroupService.deleteAgencyGroup).mockRejectedValue(error);

      const response = await request(app).delete('/api/agency-groups/group-1');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot delete agency group with existing subagencies');
      expect(response.body.code).toBe('HAS_SUBAGENCIES');
      expect(response.body.subagencyCount).toBe(3);
    });
  });
});

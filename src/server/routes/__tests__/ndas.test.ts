/**
 * NDA Routes Integration Tests
 * Story 1.4: Row-Level Security Implementation
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

vi.mock('../../middleware/authenticateJWT.js', () => ({
  authenticateJWT: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'user@usmax.com' };
    next();
  },
}));

vi.mock('../../middleware/attachUserContext.js', () => ({
  attachUserContext: (req: any, _res: any, next: any) => {
    req.userContext = {
      id: 'user-1',
      contactId: 'contact-1',
      email: 'user@usmax.com',
      name: 'Test User',
      active: true,
      roles: ['NDA User'],
      permissions: new Set(['nda:view', 'nda:create', 'nda:update']),
      authorizedAgencyGroups: ['agency-1'],
      authorizedSubagencies: ['sub-1'],
    };
    next();
  },
}));

vi.mock('../../middleware/checkPermissions.js', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireAnyPermission: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../middleware/scopeToAgencies.js', () => ({
  scopeToAgencies: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../services/ndaService.js', () => {
  class NdaServiceError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }

  return {
    listNdas: vi.fn(),
    getNda: vi.fn(),
    getNdaDetail: vi.fn(),
    exportNdas: vi.fn(),
    createNda: vi.fn(),
    updateNda: vi.fn(),
    changeNdaStatus: vi.fn(),
    cloneNda: vi.fn(),
    updateDraft: vi.fn(),
    getIncompleteFields: vi.fn(),
    getFilterPresets: vi.fn().mockReturnValue([]),
    NdaServiceError,
    NdaStatus: {},
  };
});

import * as ndaService from '../../services/ndaService.js';

describe('NDA Routes Integration', () => {
  let app: express.Express;

  beforeAll(() => {
    vi.resetModules();
  });

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { default: ndaRouter } = await import('../ndas');
    app.use('/api/ndas', ndaRouter);

    vi.clearAllMocks();
  });

  describe('GET /api/ndas', () => {
    it('returns NDA list payload', async () => {
      vi.mocked(ndaService.listNdas).mockResolvedValue({
        ndas: [{ id: 'nda-1', displayId: 1001 }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      } as any);

      const response = await request(app).get('/api/ndas');

      expect(response.status).toBe(200);
      expect(response.body.ndas).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });
  });

  describe('GET /api/ndas/:id', () => {
    it('returns 404 when NDA not accessible', async () => {
      vi.mocked(ndaService.getNdaDetail).mockResolvedValue(null);

      const response = await request(app).get('/api/ndas/nda-missing');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('returns NDA detail when accessible', async () => {
      vi.mocked(ndaService.getNdaDetail).mockResolvedValue({
        nda: { id: 'nda-1', displayId: 1001 },
        documents: [],
        emails: [],
        auditTrail: [],
        statusHistory: [],
        statusProgression: { steps: [], isTerminal: false },
        availableActions: {
          canEdit: true,
          canSendEmail: false,
          canUploadDocument: false,
          canChangeStatus: false,
          canDelete: false,
        },
      } as any);

      const response = await request(app).get('/api/ndas/nda-1');

      expect(response.status).toBe(200);
      expect(response.body.nda.id).toBe('nda-1');
    });
  });
});

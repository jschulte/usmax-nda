import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

vi.mock('../../middleware/authenticateJWT.js', () => ({
  authenticateJWT: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../middleware/attachUserContext.js', () => ({
  attachUserContext: (req: any, _res: any, next: any) => {
    req.userContext = {
      id: 'user-1',
      contactId: 'contact-1',
      email: 'user@usmax.test',
      name: 'Test User',
      active: true,
      roles: ['NDA User'],
      permissions: new Set(['nda:create', 'nda:view']),
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

vi.mock('../../services/notificationService.js', () => ({
  autoSubscribePocs: vi.fn(),
  notifyStakeholders: vi.fn(),
  NotificationEvent: { NDA_CREATED: 'nda_created' },
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
    createNda: vi.fn(),
    getNdaDetail: vi.fn(),
    cloneNda: vi.fn(),
    NdaServiceError,
  };
});

import * as ndaService from '../../services/ndaService.js';

describe('NDA creation flow (E2E)', () => {
  let app: express.Express;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { default: ndaRouter } = await import('../ndas');
    app.use('/api/ndas', ndaRouter);

    vi.clearAllMocks();
  });

  it('creates an NDA and retrieves it via detail endpoint', async () => {
    vi.mocked(ndaService.createNda).mockResolvedValue({
      id: 'nda-1',
      displayId: 1590,
      companyName: 'E2E Corp',
      status: 'CREATED',
      agencyGroup: { id: 'agency-1', name: 'DoD', code: 'DOD' },
      subagency: null,
      createdAt: new Date(),
    } as any);

    vi.mocked(ndaService.getNdaDetail).mockResolvedValue({
      nda: { id: 'nda-1', displayId: 1590, companyName: 'E2E Corp' },
      documents: [],
      emails: [],
      auditTrail: [],
      statusHistory: [],
      statusProgression: { steps: [], isTerminal: false },
      availableActions: {
        canEdit: true,
        canSendEmail: true,
        canUploadDocument: true,
        canChangeStatus: true,
        canDelete: false,
      },
    } as any);

    const createResponse = await request(app).post('/api/ndas').send({
      companyName: 'E2E Corp',
      agencyGroupId: 'agency-1',
      subagencyId: 'sub-1',
      abbreviatedName: 'E2E-CORP',
      authorizedPurpose: 'E2E NDA creation test',
      relationshipPocId: 'contact-2',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.nda.displayId).toBeGreaterThanOrEqual(1590);

    const detailResponse = await request(app).get('/api/ndas/nda-1');

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.nda.id).toBe('nda-1');
  });

  it('clones an NDA and returns the cloned summary', async () => {
    vi.mocked(ndaService.cloneNda).mockResolvedValue({
      id: 'nda-2',
      displayId: 1600,
      companyName: 'E2E Corp',
      status: 'CREATED',
      agencyGroup: { id: 'agency-1', name: 'DoD', code: 'DOD' },
      subagency: null,
      clonedFrom: { id: 'nda-1', displayId: 1590, companyName: 'E2E Corp' },
      createdAt: new Date(),
    } as any);

    const cloneResponse = await request(app).post('/api/ndas/nda-1/clone').send({
      abbreviatedName: 'E2E-CLONE',
    });

    expect(cloneResponse.status).toBe(201);
    expect(cloneResponse.body.nda.id).toBe('nda-2');
    expect(cloneResponse.body.nda.clonedFrom.displayId).toBe(1590);
  });
});

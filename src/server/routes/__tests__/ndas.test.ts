/**
 * NDA Routes Integration Tests
 * Story 1.4: Row-Level Security Implementation
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

const prismaMock = vi.hoisted(() => ({
  internalNote: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

vi.mock('../../db/index.js', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

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

vi.mock('../../services/companySuggestionsService.js', () => ({
  getRecentCompanies: vi.fn(),
  getCompanyDefaults: vi.fn(),
  searchCompanies: vi.fn(),
  getMostCommonAgency: vi.fn(),
}));

import * as ndaService from '../../services/ndaService.js';
import * as companySuggestionsService from '../../services/companySuggestionsService.js';

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

    it('rejects search queries shorter than 2 characters', async () => {
      const response = await request(app).get('/api/ndas?search=a');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_SEARCH_QUERY');
    });

    it('rejects search queries longer than 100 characters', async () => {
      const longQuery = 'a'.repeat(101);
      const response = await request(app).get(`/api/ndas?search=${longQuery}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_SEARCH_QUERY');
    });
  });

  describe('Company suggestion endpoints', () => {
    it('returns recent company suggestions', async () => {
      vi.mocked(companySuggestionsService.getRecentCompanies).mockResolvedValue([
        { companyName: 'TechCorp', count: 2, lastUsed: new Date() },
      ]);

      const response = await request(app).get('/api/ndas/company-suggestions?limit=5');

      expect(response.status).toBe(200);
      expect(response.body.companies).toHaveLength(1);
      expect(response.body.companies[0].companyName).toBe('TechCorp');
      expect(companySuggestionsService.getRecentCompanies).toHaveBeenCalledWith(
        expect.any(Object),
        5
      );
    });

    it('falls back to default limit when company suggestions limit is invalid', async () => {
      vi.mocked(companySuggestionsService.getRecentCompanies).mockResolvedValue([]);

      const response = await request(app).get('/api/ndas/company-suggestions?limit=abc');

      expect(response.status).toBe(200);
      expect(companySuggestionsService.getRecentCompanies).toHaveBeenCalledWith(
        expect.any(Object),
        10
      );
    });

    it('returns company defaults for auto-fill', async () => {
      vi.mocked(companySuggestionsService.getCompanyDefaults).mockResolvedValue({
        companyCity: 'San Francisco',
      });

      const response = await request(app).get(
        '/api/ndas/company-defaults?name=TechCorp&agencyGroupId=agency-1&subagencyId=sub-1'
      );

      expect(response.status).toBe(200);
      expect(response.body.defaults.companyCity).toBe('San Francisco');
      expect(companySuggestionsService.getCompanyDefaults).toHaveBeenCalledWith(
        'TechCorp',
        expect.any(Object),
        {
          agencyGroupId: 'agency-1',
          subagencyId: 'sub-1',
        }
      );
    });

    it('validates company defaults query', async () => {
      const response = await request(app).get('/api/ndas/company-defaults');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('rejects blank company defaults query', async () => {
      const response = await request(app).get('/api/ndas/company-defaults?name=%20%20');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('validates company search query length', async () => {
      const response = await request(app).get('/api/ndas/company-search?q=a');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('searches companies by query', async () => {
      vi.mocked(companySuggestionsService.searchCompanies).mockResolvedValue([
        { name: 'TechCorp', count: 4 },
      ]);

      const response = await request(app).get('/api/ndas/company-search?q=Tech');

      expect(response.status).toBe(200);
      expect(response.body.companies).toHaveLength(1);
      expect(response.body.companies[0].name).toBe('TechCorp');
      expect(companySuggestionsService.searchCompanies).toHaveBeenCalledWith(
        'Tech',
        expect.any(Object),
        20
      );
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

  describe('POST /api/ndas', () => {
    it('creates NDA and returns summary payload', async () => {
      vi.mocked(ndaService.createNda).mockResolvedValue({
        id: 'nda-1',
        displayId: 1590,
        companyName: 'TechCorp',
        status: 'CREATED',
        agencyGroup: { id: 'agency-1', name: 'DoD', code: 'DOD' },
        subagency: null,
        createdAt: new Date(),
      } as any);

      const response = await request(app).post('/api/ndas').send({
        companyName: 'TechCorp',
        agencyGroupId: 'agency-1',
        abbreviatedName: 'TC-DoD',
        authorizedPurpose: 'Proposal work',
        relationshipPocId: 'contact-2',
      });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('NDA created successfully');
      expect(response.body.nda.id).toBe('nda-1');
      expect(response.body.nda.displayId).toBe(1590);
    });

    it('returns validation error for invalid input', async () => {
      const error = new ndaService.NdaServiceError('Company Name is required', 'VALIDATION_ERROR');
      vi.mocked(ndaService.createNda).mockRejectedValue(error);

      const response = await request(app).post('/api/ndas').send({
        companyName: '',
        agencyGroupId: 'agency-1',
        abbreviatedName: 'TC-DoD',
        authorizedPurpose: 'Proposal work',
        relationshipPocId: 'contact-2',
      });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.error).toBe('Company Name is required');
    });
  });

  describe('POST /api/ndas/:id/clone', () => {
    it('returns cloned NDA summary', async () => {
      vi.mocked(ndaService.cloneNda).mockResolvedValue({
        id: 'nda-2',
        displayId: 1600,
        companyName: 'TechCorp',
        status: 'CREATED',
        agencyGroup: { id: 'agency-1', name: 'DoD', code: 'DOD' },
        subagency: null,
        clonedFrom: { id: 'nda-1', displayId: 1500, companyName: 'TechCorp' },
        createdAt: new Date(),
      } as any);

      const response = await request(app).post('/api/ndas/nda-1/clone').send({
        abbreviatedName: 'TC-Clone',
      });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('NDA cloned successfully');
      expect(response.body.nda.id).toBe('nda-2');
      expect(response.body.nda.clonedFrom.displayId).toBe(1500);
    });

    it('returns 404 when source NDA not found', async () => {
      const error = new ndaService.NdaServiceError('Source NDA not found', 'NOT_FOUND');
      vi.mocked(ndaService.cloneNda).mockRejectedValue(error);

      const response = await request(app).post('/api/ndas/nda-missing/clone').send({});

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });
  });

  describe('Internal notes', () => {
    beforeEach(() => {
      prismaMock.internalNote.findMany.mockReset();
      prismaMock.internalNote.create.mockReset();
      prismaMock.internalNote.update.mockReset();
      prismaMock.internalNote.delete.mockReset();
      prismaMock.internalNote.findUnique.mockReset();
      prismaMock.auditLog.create.mockReset();
    });

    it('lists notes for an NDA', async () => {
      vi.mocked(ndaService.getNda).mockResolvedValue({ id: 'nda-1' } as any);
      prismaMock.internalNote.findMany.mockResolvedValue([
        {
          id: 'note-1',
          ndaId: 'nda-1',
          userId: 'contact-1',
          noteText: 'Note 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'contact-1', firstName: 'Test', lastName: 'User', email: 'user@usmax.com' },
        },
      ]);

      const response = await request(app).get('/api/ndas/nda-1/notes');

      expect(response.status).toBe(200);
      expect(response.body.notes).toHaveLength(1);
      expect(response.body.notes[0].id).toBe('note-1');
      expect(prismaMock.internalNote.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          ndaId: 'nda-1',
          userId: 'contact-1',
        },
      }));
    });

    it('creates an internal note', async () => {
      vi.mocked(ndaService.getNda).mockResolvedValue({ id: 'nda-1' } as any);
      prismaMock.internalNote.create.mockResolvedValue({
        id: 'note-1',
        ndaId: 'nda-1',
        userId: 'contact-1',
        noteText: 'New note',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'contact-1', firstName: 'Test', lastName: 'User', email: 'user@usmax.com' },
      });

      const response = await request(app)
        .post('/api/ndas/nda-1/notes')
        .send({ noteText: 'New note' });

      expect(response.status).toBe(201);
      expect(response.body.note.id).toBe('note-1');
    });

    it('rejects empty note text', async () => {
      const response = await request(app)
        .post('/api/ndas/nda-1/notes')
        .send({ noteText: '  ' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('updates an internal note for the owner', async () => {
      vi.mocked(ndaService.getNda).mockResolvedValue({ id: 'nda-1' } as any);
      prismaMock.internalNote.findUnique.mockResolvedValue({
        id: 'note-1',
        ndaId: 'nda-1',
        userId: 'contact-1',
      });
      prismaMock.internalNote.update.mockResolvedValue({
        id: 'note-1',
        ndaId: 'nda-1',
        userId: 'contact-1',
        noteText: 'Updated note',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'contact-1', firstName: 'Test', lastName: 'User', email: 'user@usmax.com' },
      });

      const response = await request(app)
        .put('/api/ndas/nda-1/notes/note-1')
        .send({ noteText: 'Updated note' });

      expect(response.status).toBe(200);
      expect(response.body.note.noteText).toBe('Updated note');
    });

    it('rejects edits for notes owned by other users', async () => {
      prismaMock.internalNote.findUnique.mockResolvedValue({
        id: 'note-1',
        ndaId: 'nda-1',
        userId: 'contact-2',
      });

      const response = await request(app)
        .put('/api/ndas/nda-1/notes/note-1')
        .send({ noteText: 'Updated note' });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOTE_NOT_FOUND');
    });

    it('rejects edits when NDA id does not match', async () => {
      prismaMock.internalNote.findUnique.mockResolvedValue({
        id: 'note-1',
        ndaId: 'nda-2',
        userId: 'contact-1',
      });

      const response = await request(app)
        .put('/api/ndas/nda-1/notes/note-1')
        .send({ noteText: 'Updated note' });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOTE_NOT_FOUND');
    });

    it('deletes an internal note for the owner', async () => {
      vi.mocked(ndaService.getNda).mockResolvedValue({ id: 'nda-1' } as any);
      prismaMock.internalNote.findUnique.mockResolvedValue({
        id: 'note-1',
        ndaId: 'nda-1',
        userId: 'contact-1',
      });
      prismaMock.internalNote.delete.mockResolvedValue({ id: 'note-1' });

      const response = await request(app).delete('/api/ndas/nda-1/notes/note-1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Note deleted successfully');
    });

    it('rejects deletes for notes owned by other users', async () => {
      prismaMock.internalNote.findUnique.mockResolvedValue({
        id: 'note-1',
        ndaId: 'nda-1',
        userId: 'contact-2',
      });

      const response = await request(app).delete('/api/ndas/nda-1/notes/note-1');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOTE_NOT_FOUND');
    });
  });
});

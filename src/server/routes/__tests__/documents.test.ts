/**
 * Document Upload Routes Integration Tests
 * Story 4.1: Document Upload with Drag-Drop
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

vi.mock('../../services/documentService.js', async () => {
  const actual = await vi.importActual<typeof import('../../services/documentService.js')>(
    '../../services/documentService.js'
  );

  return {
    ...actual,
    uploadNdaDocument: vi.fn(),
  };
});

import * as documentService from '../../services/documentService.js';

describe('Document Upload Routes Integration', () => {
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

  it('uploads a document and returns metadata', async () => {
    vi.mocked(documentService.uploadNdaDocument).mockResolvedValue({
      id: 'doc-1',
      ndaId: 'nda-1',
      filename: 'test.pdf',
      documentType: 'UPLOADED',
      isFullyExecuted: false,
      versionNumber: 1,
    } as any);

    const response = await request(app)
      .post('/api/ndas/nda-1/documents/upload')
      .attach('file', Buffer.from('%PDF-1.4 test'), 'test.pdf');

    expect(response.status).toBe(201);
    expect(response.body.document).toBeDefined();
    expect(response.body.document.filename).toBe('test.pdf');
    expect(documentService.uploadNdaDocument).toHaveBeenCalled();
  });

  it('returns 400 when no file is provided', async () => {
    const response = await request(app)
      .post('/api/ndas/nda-1/documents/upload');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid file types', async () => {
    const response = await request(app)
      .post('/api/ndas/nda-1/documents/upload')
      .attach('file', Buffer.from('evil'), 'malware.exe');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_FILE_TYPE');
  });

  it('returns 404 when NDA is not found', async () => {
    const { DocumentServiceError } = await import('../../services/documentService.js');
    vi.mocked(documentService.uploadNdaDocument).mockRejectedValue(
      new DocumentServiceError('NDA not found', 'NDA_NOT_FOUND')
    );

    const response = await request(app)
      .post('/api/ndas/nda-missing/documents/upload')
      .attach('file', Buffer.from('%PDF-1.4 test'), 'test.pdf');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NDA_NOT_FOUND');
  });
});

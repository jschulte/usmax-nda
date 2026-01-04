/**
 * RTF Templates Create Route Tests
 * Story 7.1: RTF Template Creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const permissionState = {
  permissions: new Set<string>(),
};

vi.mock('../../middleware/authenticateJWT.js', () => ({
  authenticateJWT: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../middleware/attachUserContext.js', () => ({
  attachUserContext: (req: any, _res: any, next: any) => {
    req.userContext = {
      id: 'admin-1',
      contactId: 'contact-admin-1',
      email: 'admin@usmax.com',
      name: 'Admin User',
      active: true,
      roles: ['Admin'],
      permissions: permissionState.permissions,
      authorizedAgencyGroups: [],
      authorizedSubagencies: [],
    };
    next();
  },
}));

vi.mock('../../middleware/checkPermissions.js', () => ({
  requireAnyPermission: () => (_req: any, _res: any, next: any) => next(),
  requirePermission: (permission: string) => (req: any, res: any, next: any) => {
    if (!req.userContext?.permissions?.has(permission)) {
      return res.status(403).json({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
    }
    return next();
  },
}));

const createTemplateMock = vi.fn();
vi.mock('../../services/templateService.js', () => ({
  getTemplatesForNda: vi.fn(),
  listTemplates: vi.fn(),
  getTemplate: vi.fn(),
  listTemplateDefaults: vi.fn(),
  assignTemplateDefault: vi.fn(),
  removeTemplateDefault: vi.fn(),
  generatePreview: vi.fn(),
  saveEditedDocument: vi.fn(),
  createTemplate: (...args: any[]) => createTemplateMock(...args),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  TemplateServiceError: class TemplateServiceError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
      this.name = 'TemplateServiceError';
    }
  },
}));

const validateTemplateMock = vi.fn();
const sanitizeHtmlMock = vi.fn((html: string) => html);
vi.mock('../../services/rtfTemplateValidation.js', () => ({
  validateTemplate: (...args: any[]) => validateTemplateMock(...args),
  sanitizeHtml: (html: string) => sanitizeHtmlMock(html),
}));

import templatesRouter from '../templates.js';

describe('RTF Templates Create Route', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    permissionState.permissions = new Set(['admin:manage_templates']);
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use('/api/rtf-templates', templatesRouter);
  });

  it('returns 403 when permission is missing', async () => {
    permissionState.permissions = new Set();

    const res = await request(app)
      .post('/api/rtf-templates')
      .send({ name: 'Test', content: Buffer.from('{\\rtf1\\ansi test}').toString('base64') });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PERMISSION_DENIED');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/rtf-templates')
      .send({ content: Buffer.from('{\\rtf1\\ansi test}').toString('base64') });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 413 when content exceeds max size', async () => {
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64');
    const res = await request(app)
      .post('/api/rtf-templates')
      .send({ name: 'Big Template', content: oversized });

    expect(res.status).toBe(413);
    expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns validation errors and unknown placeholders', async () => {
    validateTemplateMock.mockReturnValue({
      valid: false,
      errors: ['Unknown placeholders found: badField'],
      unknownPlaceholders: ['badField'],
    });

    const res = await request(app)
      .post('/api/rtf-templates')
      .send({
        name: 'Invalid Template',
        content: Buffer.from('{\\rtf1\\ansi test}').toString('base64'),
        htmlSource: Buffer.from('<p>{{badField}}</p>').toString('base64'),
      });

    expect(res.status).toBe(400);
    expect(res.body.validationErrors).toEqual(['Unknown placeholders found: badField']);
    expect(res.body.unknownPlaceholders).toEqual(['badField']);
  });

  it('creates a template with sanitized htmlSource', async () => {
    validateTemplateMock.mockReturnValue({ valid: true, errors: [] });
    sanitizeHtmlMock.mockReturnValue('<p>Safe</p>');
    createTemplateMock.mockResolvedValue({ id: 'template-1', name: 'Template 1' });

    const res = await request(app)
      .post('/api/rtf-templates')
      .send({
        name: 'Template 1',
        content: Buffer.from('{\\rtf1\\ansi test}').toString('base64'),
        htmlSource: Buffer.from('<script>alert(1)</script><p>Safe</p>').toString('base64'),
        isDefault: true,
      });

    expect(res.status).toBe(201);
    expect(createTemplateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Template 1',
        htmlSource: Buffer.from('<p>Safe</p>'),
        isDefault: true,
      }),
      'contact-admin-1',
      expect.any(Object)
    );
  });
});

/**
 * RTF Templates Editor Access Tests
 * Story 9.18: RTF Template Rich Text Editor
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
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../services/templateService.js', () => ({
  getTemplatesForNda: vi.fn(),
  listTemplates: vi.fn(),
  getTemplate: vi.fn(),
  generatePreview: vi.fn(),
  saveEditedDocument: vi.fn(),
  createTemplate: vi.fn(),
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

vi.mock('../../services/templatePreviewService.js', () => ({
  generateTemplatePreview: vi.fn(),
  validatePlaceholders: vi.fn(),
  SAMPLE_MERGE_FIELDS: {},
}));

vi.mock('../../services/rtfTemplateValidation.js', () => ({
  validateTemplate: vi.fn(),
  sanitizeHtml: vi.fn((html: string) => html),
}));

import templatesRouter from '../templates.js';
import * as templateService from '../../services/templateService.js';

const mockService = templateService as any;

describe('RTF Templates Editor Access', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/rtf-templates', templatesRouter);
  });

  it('returns template content for admins', async () => {
    permissionState.permissions = new Set(['admin:manage_templates']);
    const content = Buffer.from('{\\rtf1\\ansi Test content}');

    mockService.getTemplate.mockResolvedValue({
      id: 'template-1',
      name: 'Admin Template',
      description: null,
      content,
      agencyGroupId: null,
      isDefault: false,
      isActive: true,
    });

    const res = await request(app).get('/api/rtf-templates/template-1');

    expect(res.status).toBe(200);
    expect(res.body.template.content).toBe(content.toString('base64'));
  });

  it('omits template content for non-admins', async () => {
    permissionState.permissions = new Set(['nda:view']);
    const content = Buffer.from('{\\rtf1\\ansi Test content}');

    mockService.getTemplate.mockResolvedValue({
      id: 'template-1',
      name: 'User Template',
      description: null,
      content,
      agencyGroupId: null,
      isDefault: false,
      isActive: true,
    });

    const res = await request(app).get('/api/rtf-templates/template-1');

    expect(res.status).toBe(200);
    expect(res.body.template.content).toBeUndefined();
  });
});

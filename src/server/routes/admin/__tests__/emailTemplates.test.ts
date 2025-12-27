/**
 * Admin Email Templates Routes Tests
 * Story 9.16: Create Email Template Editor UI
 *
 * Tests CRUD operations for email template management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock authentication middleware
vi.mock('../../../middleware/authenticateJWT.js', () => ({
  authenticateJWT: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin-1', email: 'admin@usmax.com' };
    next();
  },
}));

vi.mock('../../../middleware/attachUserContext.js', () => ({
  attachUserContext: (req: any, _res: any, next: any) => {
    req.userContext = {
      id: 'admin-1',
      contactId: 'contact-admin-1',
      email: 'admin@usmax.com',
      name: 'Admin User',
      active: true,
      roles: ['Admin'],
      permissions: new Set(['admin:manage_templates']),
      authorizedAgencyGroups: [],
      authorizedSubagencies: [],
    };
    next();
  },
}));

vi.mock('../../../middleware/checkPermissions.js', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock audit service
vi.mock('../../../services/auditService.js', () => ({
  auditService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
  AuditAction: {
    EMAIL_TEMPLATE_CREATED: 'email_template_created',
    EMAIL_TEMPLATE_UPDATED: 'email_template_updated',
    EMAIL_TEMPLATE_DELETED: 'email_template_deleted',
  },
}));

// Mock email template service
const mockService = {
  listEmailTemplates: vi.fn(),
  getEmailTemplate: vi.fn(),
  createEmailTemplate: vi.fn(),
  updateEmailTemplate: vi.fn(),
  deleteEmailTemplate: vi.fn(),
};

vi.mock('../../../services/emailTemplateService.js', () => mockService);

import adminEmailTemplatesRouter from '../emailTemplates.js';

describe('Admin Email Templates Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/admin/email-templates', adminEmailTemplatesRouter);
  });

  describe('GET /api/admin/email-templates', () => {
    it('should list all active templates by default', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Standard NDA Email',
          description: 'Default template',
          subject: 'NDA {{displayId}}',
          body: 'Dear {{companyName}}...',
          isDefault: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockService.listEmailTemplates.mockResolvedValue(mockTemplates);

      const res = await request(app).get('/api/admin/email-templates');

      expect(res.status).toBe(200);
      expect(res.body.templates).toEqual(mockTemplates);
      expect(res.body.count).toBe(1);
      expect(mockService.listEmailTemplates).toHaveBeenCalledWith(false);
    });

    it('should include inactive templates when requested', async () => {
      mockService.listEmailTemplates.mockResolvedValue([]);

      const res = await request(app).get('/api/admin/email-templates?includeInactive=true');

      expect(res.status).toBe(200);
      expect(mockService.listEmailTemplates).toHaveBeenCalledWith(true);
    });
  });

  describe('GET /api/admin/email-templates/:id', () => {
    it('should return a specific template', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Standard NDA Email',
        description: null,
        subject: 'NDA {{displayId}}',
        body: 'Dear {{companyName}}...',
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.getEmailTemplate.mockResolvedValue(mockTemplate);

      const res = await request(app).get('/api/admin/email-templates/template-1');

      expect(res.status).toBe(200);
      expect(res.body.template).toEqual(mockTemplate);
    });

    it('should return 404 if template not found', async () => {
      mockService.getEmailTemplate.mockResolvedValue(null);

      const res = await request(app).get('/api/admin/email-templates/invalid-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Email template not found');
      expect(res.body.code).toBe('TEMPLATE_NOT_FOUND');
    });
  });

  describe('POST /api/admin/email-templates', () => {
    it('should create a new template', async () => {
      const newTemplate = {
        name: 'New Template',
        description: 'Test template',
        subject: 'Test Subject',
        body: 'Test body with {{companyName}}',
        isDefault: false,
      };

      const createdTemplate = {
        id: 'template-new',
        ...newTemplate,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.createEmailTemplate.mockResolvedValue(createdTemplate);

      const res = await request(app).post('/api/admin/email-templates').send(newTemplate);

      expect(res.status).toBe(201);
      expect(res.body.template).toEqual(createdTemplate);
      expect(mockService.createEmailTemplate).toHaveBeenCalledWith({
        name: newTemplate.name,
        description: newTemplate.description,
        subject: newTemplate.subject,
        body: newTemplate.body,
        isDefault: false,
      });
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app).post('/api/admin/email-templates').send({
        subject: 'Test',
        body: 'Test',
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('should return 400 if subject is missing', async () => {
      const res = await request(app).post('/api/admin/email-templates').send({
        name: 'Test',
        body: 'Test',
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('should return 400 if body is missing', async () => {
      const res = await request(app).post('/api/admin/email-templates').send({
        name: 'Test',
        subject: 'Test',
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });
  });

  describe('PUT /api/admin/email-templates/:id', () => {
    it('should update an existing template', async () => {
      const existingTemplate = {
        id: 'template-1',
        name: 'Old Name',
        description: null,
        subject: 'Old Subject',
        body: 'Old body',
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedTemplate = {
        ...existingTemplate,
        name: 'New Name',
        subject: 'New Subject',
      };

      mockService.getEmailTemplate.mockResolvedValue(existingTemplate);
      mockService.updateEmailTemplate.mockResolvedValue(updatedTemplate);

      const res = await request(app)
        .put('/api/admin/email-templates/template-1')
        .send({ name: 'New Name', subject: 'New Subject' });

      expect(res.status).toBe(200);
      expect(res.body.template.name).toBe('New Name');
      expect(res.body.template.subject).toBe('New Subject');
    });

    it('should return 404 if template not found', async () => {
      mockService.getEmailTemplate.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/admin/email-templates/invalid-id')
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TEMPLATE_NOT_FOUND');
    });
  });

  describe('DELETE /api/admin/email-templates/:id', () => {
    it('should delete a template', async () => {
      const template = {
        id: 'template-1',
        name: 'Template to Delete',
        description: null,
        subject: 'Subject',
        body: 'Body',
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.getEmailTemplate.mockResolvedValue(template);
      mockService.deleteEmailTemplate.mockResolvedValue(undefined);

      const res = await request(app).delete('/api/admin/email-templates/template-1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Email template deleted successfully');
      expect(mockService.deleteEmailTemplate).toHaveBeenCalledWith('template-1');
    });

    it('should return 404 if template not found', async () => {
      mockService.getEmailTemplate.mockResolvedValue(null);

      const res = await request(app).delete('/api/admin/email-templates/invalid-id');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TEMPLATE_NOT_FOUND');
    });

    it('should return 400 if trying to delete default template', async () => {
      const defaultTemplate = {
        id: 'template-1',
        name: 'Default Template',
        description: null,
        subject: 'Subject',
        body: 'Body',
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.getEmailTemplate.mockResolvedValue(defaultTemplate);
      mockService.deleteEmailTemplate.mockRejectedValue(
        new Error('Cannot delete the default template. Set another template as default first.')
      );

      const res = await request(app).delete('/api/admin/email-templates/template-1');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('CANNOT_DELETE_DEFAULT');
    });
  });
});

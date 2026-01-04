/**
 * Admin Email Template Routes
 * Story 9.16: Create Email Template Editor UI
 *
 * Admin endpoints for managing email templates:
 * - GET /api/admin/email-templates - List all templates (including inactive)
 * - GET /api/admin/email-templates/:id - Get template by ID
 * - POST /api/admin/email-templates - Create new template
 * - PUT /api/admin/email-templates/:id - Update template
 * - DELETE /api/admin/email-templates/:id - Soft delete template
 *
 * All routes require admin:manage_templates permission (Story 9.16)
 */

import { Router, type Request, type Response } from 'express';
import { requirePermission } from '../../middleware/checkPermissions.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { auditService, AuditAction } from '../../services/auditService.js';
import {
  listEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  type CreateEmailTemplateInput,
  type UpdateEmailTemplateInput,
} from '../../services/emailTemplateService.js';
import { validateEmailTemplatePlaceholders } from '../../validators/emailTemplatePlaceholderValidator.js';

const router: Router = Router();

// All admin email template routes require admin:manage_templates
router.use(requirePermission(PERMISSIONS.ADMIN_MANAGE_TEMPLATES));

/**
 * GET /api/admin/email-templates
 * List all email templates (including inactive)
 * Story 9.16 AC1
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const templates = await listEmailTemplates(includeInactive);

    return res.json({
      templates,
      count: templates.length,
    });
  } catch (error) {
    console.error('[Admin/EmailTemplates] Error listing templates:', error);
    return res.status(500).json({
      error: 'Failed to list email templates',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/admin/email-templates/:id
 * Get a specific email template by ID
 * Story 9.16 AC3
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const template = await getEmailTemplate(id);

    if (!template) {
      return res.status(404).json({
        error: 'Email template not found',
        code: 'TEMPLATE_NOT_FOUND',
      });
    }

    return res.json({ template });
  } catch (error) {
    console.error('[Admin/EmailTemplates] Error fetching template:', error);
    return res.status(500).json({
      error: 'Failed to fetch email template',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/admin/email-templates
 * Create a new email template
 * Story 9.16 AC2
 *
 * Body: { name, description?, subject, body, isDefault? }
 */
router.post('/', async (req: Request, res: Response) => {
  const { name, description, subject, body, isDefault } = req.body as CreateEmailTemplateInput;

  // Validation
  if (!name || !subject || !body) {
    return res.status(400).json({
      error: 'Missing required fields: name, subject, body',
      code: 'MISSING_FIELDS',
    });
  }

  if (name.trim().length === 0) {
    return res.status(400).json({
      error: 'Template name cannot be empty',
      code: 'INVALID_NAME',
    });
  }

  if (subject.trim().length === 0) {
    return res.status(400).json({
      error: 'Subject cannot be empty',
      code: 'INVALID_SUBJECT',
    });
  }

  if (body.trim().length === 0) {
    return res.status(400).json({
      error: 'Body cannot be empty',
      code: 'INVALID_BODY',
    });
  }

  const subjectValidation = validateEmailTemplatePlaceholders(subject.trim());
  const bodyValidation = validateEmailTemplatePlaceholders(body.trim());

  if (!subjectValidation.valid || !bodyValidation.valid) {
    return res.status(400).json({
      error: 'Invalid placeholders in email template',
      code: 'INVALID_PLACEHOLDERS',
      details: {
        subject: subjectValidation.errors,
        body: bodyValidation.errors,
        unknownPlaceholders: {
          subject: subjectValidation.unknownPlaceholders,
          body: bodyValidation.unknownPlaceholders,
        },
      },
    });
  }

  try {
    const template = await createEmailTemplate({
      name: name.trim(),
      description: description?.trim() || null,
      subject: subject.trim(),
      body: body.trim(),
      isDefault: isDefault ?? false,
    });

    // Audit log
    await auditService.log({
      action: AuditAction.EMAIL_TEMPLATE_CREATED,
      entityType: 'email_template',
      entityId: template.id,
      userId: req.userContext!.contactId,
      details: {
        templateName: template.name,
        isDefault: template.isDefault,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      message: 'Email template created successfully',
      template,
    });
  } catch (error) {
    console.error('[Admin/EmailTemplates] Error creating template:', error);
    return res.status(500).json({
      error: 'Failed to create email template',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PUT /api/admin/email-templates/:id
 * Update an existing email template
 * Story 9.16 AC3
 *
 * Body: { name?, description?, subject?, body?, isDefault?, isActive? }
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body as UpdateEmailTemplateInput;

  // Validation
  if (updates.name !== undefined && updates.name.trim().length === 0) {
    return res.status(400).json({
      error: 'Template name cannot be empty',
      code: 'INVALID_NAME',
    });
  }

  if (updates.subject !== undefined && updates.subject.trim().length === 0) {
    return res.status(400).json({
      error: 'Subject cannot be empty',
      code: 'INVALID_SUBJECT',
    });
  }

  if (updates.body !== undefined && updates.body.trim().length === 0) {
    return res.status(400).json({
      error: 'Body cannot be empty',
      code: 'INVALID_BODY',
    });
  }

  const subjectValidation = updates.subject !== undefined
    ? validateEmailTemplatePlaceholders(updates.subject.trim())
    : null;
  const bodyValidation = updates.body !== undefined
    ? validateEmailTemplatePlaceholders(updates.body.trim())
    : null;

  if ((subjectValidation && !subjectValidation.valid) || (bodyValidation && !bodyValidation.valid)) {
    return res.status(400).json({
      error: 'Invalid placeholders in email template',
      code: 'INVALID_PLACEHOLDERS',
      details: {
        subject: subjectValidation?.errors ?? [],
        body: bodyValidation?.errors ?? [],
        unknownPlaceholders: {
          subject: subjectValidation?.unknownPlaceholders ?? [],
          body: bodyValidation?.unknownPlaceholders ?? [],
        },
      },
    });
  }

  try {
    // Check if template exists
    const existing = await getEmailTemplate(id);
    if (!existing) {
      return res.status(404).json({
        error: 'Email template not found',
        code: 'TEMPLATE_NOT_FOUND',
      });
    }

    const template = await updateEmailTemplate(id, updates);

    // Audit log
    await auditService.log({
      action: AuditAction.EMAIL_TEMPLATE_UPDATED,
      entityType: 'email_template',
      entityId: template.id,
      userId: req.userContext!.contactId,
      details: {
        templateName: template.name,
        updatedFields: updates,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: 'Email template updated successfully',
      template,
    });
  } catch (error) {
    console.error('[Admin/EmailTemplates] Error updating template:', error);
    return res.status(500).json({
      error: 'Failed to update email template',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * DELETE /api/admin/email-templates/:id
 * Soft delete an email template (set isActive = false)
 * Story 9.16
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const template = await getEmailTemplate(id);
    if (!template) {
      return res.status(404).json({
        error: 'Email template not found',
        code: 'TEMPLATE_NOT_FOUND',
      });
    }

    await deleteEmailTemplate(id);

    // Audit log
    await auditService.log({
      action: AuditAction.EMAIL_TEMPLATE_DELETED,
      entityType: 'email_template',
      entityId: id,
      userId: req.userContext!.contactId,
      details: {
        templateName: template.name,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: 'Email template deleted successfully',
    });
  } catch (error: any) {
    console.error('[Admin/EmailTemplates] Error deleting template:', error);

    // Handle specific error messages from the service
    if (error.message?.includes('default template')) {
      return res.status(400).json({
        error: error.message,
        code: 'CANNOT_DELETE_DEFAULT',
      });
    }

    return res.status(500).json({
      error: 'Failed to delete email template',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;

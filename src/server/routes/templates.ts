/**
 * Template Routes
 * Story 3.13: RTF Template Selection & Preview
 *
 * REST API endpoints for RTF template management:
 * - GET    /api/rtf-templates              - List templates (with agency filter)
 * - GET    /api/rtf-templates/:id          - Get template details
 * - POST   /api/rtf-templates              - Create template (admin)
 * - PUT    /api/rtf-templates/:id          - Update template (admin)
 * - DELETE /api/rtf-templates/:id          - Delete template (admin)
 * - POST   /api/ndas/:id/preview-document  - Generate preview
 * - POST   /api/ndas/:id/save-edited-document - Save edited document
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requirePermission, requireAnyPermission } from '../middleware/checkPermissions.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  getTemplatesForNda,
  listTemplates,
  getTemplate,
  generatePreview,
  saveEditedDocument,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  TemplateServiceError,
} from '../services/templateService.js';
import {
  generateTemplatePreview,
  validatePlaceholders,
} from '../services/templatePreviewService.js';
import {
  validateTemplate,
  sanitizeHtml,
} from '../services/rtfTemplateValidation.js';

const router: Router = Router();
const MAX_RTF_SIZE = 5 * 1024 * 1024; // 5MB

// All routes require authentication and user context
router.use(authenticateJWT);
router.use(attachUserContext);

/**
 * GET /api/rtf-templates
 * List all active templates with recommendations based on agency
 *
 * Query params:
 * - agencyGroupId: For recommendation matching
 * - includeInactive: Include inactive templates (admin only)
 */
router.get(
  '/',
  requireAnyPermission([PERMISSIONS.NDA_VIEW, PERMISSIONS.NDA_CREATE]),
  async (req, res) => {
    try {
      const { agencyGroupId, includeInactive } = req.query;

      let templates;
      if (agencyGroupId && typeof agencyGroupId === 'string') {
        templates = await getTemplatesForNda(agencyGroupId);
      } else {
        const showInactive =
          includeInactive === 'true' &&
          req.userContext?.permissions.has(PERMISSIONS.ADMIN_MANAGE_TEMPLATES);
        templates = await listTemplates(showInactive);
      }

      res.json({
        templates,
        count: templates.length,
      });
    } catch (error) {
      console.error('[Templates] Error listing templates:', error);
      res.status(500).json({
        error: 'Failed to list templates',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/rtf-templates/:id
 * Get template details
 */
router.get(
  '/:id',
  requireAnyPermission([PERMISSIONS.NDA_VIEW, PERMISSIONS.NDA_CREATE]),
  async (req, res) => {
    try {
      const template = await getTemplate(req.params.id);

      if (!template) {
        return res.status(404).json({
          error: 'Template not found',
          code: 'NOT_FOUND',
        });
      }

      // Don't return content to regular users
      const isAdmin = req.userContext?.permissions.has(PERMISSIONS.ADMIN_MANAGE_TEMPLATES);
      res.json({
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          agencyGroupId: template.agencyGroupId,
          isDefault: template.isDefault,
          isActive: template.isActive,
          // Only include content for admins
          content: isAdmin ? template.content.toString('base64') : undefined,
        },
      });
    } catch (error) {
      console.error('[Templates] Error getting template:', error);
      res.status(500).json({
        error: 'Failed to get template',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/rtf-templates/preview
 * Generate preview of template content with sample data
 *
 * Body:
 * - htmlContent: string (HTML from Quill editor with {{placeholders}})
 *
 * Returns:
 * - previewHtml: HTML with placeholders replaced by sample values
 */
router.post(
  '/preview',
  requirePermission(PERMISSIONS.ADMIN_MANAGE_TEMPLATES),
  async (req, res) => {
    try {
      const { htmlContent } = req.body;

      if (!htmlContent) {
        return res.status(400).json({
          error: 'htmlContent is required',
          code: 'VALIDATION_ERROR',
        });
      }

      // Validate content length to prevent DoS (max 1MB)
      const MAX_HTML_LENGTH = 1024 * 1024; // 1MB
      if (htmlContent.length > MAX_HTML_LENGTH) {
        return res.status(413).json({
          error: `Content too large. Maximum size is ${MAX_HTML_LENGTH} bytes`,
          code: 'PAYLOAD_TOO_LARGE',
        });
      }

      // Sanitize HTML to prevent XSS
      const sanitized = sanitizeHtml(htmlContent);

      // Validate placeholders before generating preview
      const unknownPlaceholders = validatePlaceholders(sanitized);
      if (unknownPlaceholders.length > 0) {
        return res.status(400).json({
          error: `Unknown placeholders: ${unknownPlaceholders.join(', ')}`,
          code: 'VALIDATION_ERROR',
          unknownPlaceholders,
        });
      }

      // Generate preview with sample data
      const previewHtml = generateTemplatePreview(sanitized);

      res.json({
        previewHtml,
      });
    } catch (error) {
      console.error('[Templates] Error generating preview:', error);
      res.status(500).json({
        error: 'Failed to generate preview',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/rtf-templates
 * Create a new template (admin only)
 *
 * Body:
 * - name: string (required)
 * - description: string (optional)
 * - content: base64 encoded RTF content (required)
 * - htmlSource: base64 encoded HTML source (optional, for WYSIWYG editing)
 * - agencyGroupId: string (optional)
 * - isDefault: boolean (optional)
 */
router.post(
  '/',
  requirePermission(PERMISSIONS.ADMIN_MANAGE_TEMPLATES),
  async (req, res) => {
    try {
      const { name, description, content, htmlSource, agencyGroupId, isDefault } = req.body;

      if (!name || !content) {
        return res.status(400).json({
          error: 'Name and content are required',
          code: 'VALIDATION_ERROR',
        });
      }

      const contentBuffer = Buffer.from(content, 'base64');
      if (contentBuffer.length > MAX_RTF_SIZE) {
        return res.status(413).json({
          error: `Content too large. Maximum size is ${MAX_RTF_SIZE} bytes`,
          code: 'PAYLOAD_TOO_LARGE',
        });
      }

      // If htmlSource is provided (from WYSIWYG editor), validate both HTML and RTF
      if (htmlSource) {
        const htmlContent = Buffer.from(htmlSource, 'base64').toString('utf-8');
        const rtfContent = contentBuffer.toString('utf-8');

        const validation = validateTemplate(htmlContent, rtfContent);
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Template validation failed',
            code: 'VALIDATION_ERROR',
            validationErrors: validation.errors,
          });
        }
      }

      const template = await createTemplate(
        {
          name,
          description,
          content: contentBuffer,
          agencyGroupId,
          isDefault,
        },
        req.userContext!.contactId,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent') ?? undefined,
        }
      );

      res.status(201).json({
        message: 'Template created successfully',
        template,
      });
    } catch (error) {
      if (error instanceof TemplateServiceError) {
        const statusCode = error.code === 'VALIDATION_ERROR' ? 400 : 500;
        return res.status(statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[Templates] Error creating template:', error);
      res.status(500).json({
        error: 'Failed to create template',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * PUT /api/rtf-templates/:id
 * Update a template (admin only)
 *
 * Body (all optional):
 * - name: string
 * - description: string
 * - content: base64 encoded RTF content
 * - htmlSource: base64 encoded HTML source (optional, for WYSIWYG editing)
 * - agencyGroupId: string | null
 * - isDefault: boolean
 * - isActive: boolean
 */
router.put(
  '/:id',
  requirePermission(PERMISSIONS.ADMIN_MANAGE_TEMPLATES),
  async (req, res) => {
    try {
      const { name, description, content, htmlSource, agencyGroupId, isDefault, isActive } = req.body;

      const contentBuffer = content ? Buffer.from(content, 'base64') : undefined;
      if (htmlSource && !contentBuffer) {
        return res.status(400).json({
          error: 'content is required when htmlSource is provided',
          code: 'VALIDATION_ERROR',
        });
      }
      if (contentBuffer && contentBuffer.length > MAX_RTF_SIZE) {
        return res.status(413).json({
          error: `Content too large. Maximum size is ${MAX_RTF_SIZE} bytes`,
          code: 'PAYLOAD_TOO_LARGE',
        });
      }

      // If htmlSource is provided (from WYSIWYG editor), validate both HTML and RTF
      if (htmlSource && contentBuffer) {
        const htmlContent = Buffer.from(htmlSource, 'base64').toString('utf-8');
        const rtfContent = contentBuffer.toString('utf-8');

        const validation = validateTemplate(htmlContent, rtfContent);
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Template validation failed',
            code: 'VALIDATION_ERROR',
            validationErrors: validation.errors,
          });
        }
      }

      const template = await updateTemplate(
        req.params.id,
        {
          name,
          description,
          content: contentBuffer,
          agencyGroupId,
          isDefault,
          isActive,
        },
        req.userContext!.contactId,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent') ?? undefined,
        }
      );

      res.json({
        message: 'Template updated successfully',
        template,
      });
    } catch (error) {
      if (error instanceof TemplateServiceError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;
        return res.status(statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[Templates] Error updating template:', error);
      res.status(500).json({
        error: 'Failed to update template',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * DELETE /api/rtf-templates/:id
 * Delete a template (soft delete - sets isActive = false)
 */
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.ADMIN_MANAGE_TEMPLATES),
  async (req, res) => {
    try {
      await deleteTemplate(req.params.id, req.userContext!.contactId, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? undefined,
      });

      res.json({
        message: 'Template deleted successfully',
      });
    } catch (error) {
      if (error instanceof TemplateServiceError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;
        return res.status(statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[Templates] Error deleting template:', error);
      res.status(500).json({
        error: 'Failed to delete template',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

export default router;

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

const router: Router = Router();

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
 * POST /api/rtf-templates
 * Create a new template (admin only)
 *
 * Body:
 * - name: string (required)
 * - description: string (optional)
 * - content: base64 encoded RTF content (required)
 * - agencyGroupId: string (optional)
 * - isDefault: boolean (optional)
 */
router.post(
  '/',
  requirePermission(PERMISSIONS.ADMIN_MANAGE_TEMPLATES),
  async (req, res) => {
    try {
      const { name, description, content, agencyGroupId, isDefault } = req.body;

      if (!name || !content) {
        return res.status(400).json({
          error: 'Name and content are required',
          code: 'VALIDATION_ERROR',
        });
      }

      const contentBuffer = Buffer.from(content, 'base64');

      const template = await createTemplate(
        {
          name,
          description,
          content: contentBuffer,
          agencyGroupId,
          isDefault,
        },
        req.userContext!
      );

      res.status(201).json({
        message: 'Template created successfully',
        template,
      });
    } catch (error) {
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
 * - agencyGroupId: string | null
 * - isDefault: boolean
 * - isActive: boolean
 */
router.put(
  '/:id',
  requirePermission(PERMISSIONS.ADMIN_MANAGE_TEMPLATES),
  async (req, res) => {
    try {
      const { name, description, content, agencyGroupId, isDefault, isActive } = req.body;

      const contentBuffer = content ? Buffer.from(content, 'base64') : undefined;

      const template = await updateTemplate(req.params.id, {
        name,
        description,
        content: contentBuffer,
        agencyGroupId,
        isDefault,
        isActive,
      });

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
      await deleteTemplate(req.params.id);

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

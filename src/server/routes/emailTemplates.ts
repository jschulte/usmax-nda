import express from 'express';
import { listEmailTemplates } from '../services/emailTemplateService.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { requirePermission } from '../middleware/checkPermissions.js';

const router = express.Router();

/**
 * GET /api/email-templates
 * List active email templates for the composer
 *
 * Query params:
 * - includeInactive: Include inactive templates (admin only)
 */
router.get(
  '/',
  requirePermission(PERMISSIONS.NDA_SEND_EMAIL),
  async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      if (includeInactive && !req.userContext?.permissions.has(PERMISSIONS.ADMIN_MANAGE_TEMPLATES)) {
        return res.status(403).json({
          error: 'Not authorized to view inactive templates',
          code: 'FORBIDDEN',
        });
      }

      const templates = await listEmailTemplates(includeInactive);
      res.json({ templates, count: templates.length });
    } catch (error) {
      console.error('[EmailTemplates] Error listing templates:', error);
      res.status(500).json({
        error: 'Failed to list email templates',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

export default router;

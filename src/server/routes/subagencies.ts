/**
 * Subagencies Routes
 * Story 2.2: Subagencies CRUD
 *
 * REST endpoints for managing subagencies:
 * - GET /api/agency-groups/:groupId/subagencies - List subagencies in group
 * - GET /api/subagencies/:id - Get single subagency
 * - POST /api/agency-groups/:groupId/subagencies - Create subagency
 * - PUT /api/subagencies/:id - Update subagency
 * - DELETE /api/subagencies/:id - Delete subagency (if no NDAs)
 *
 * Write routes require admin:manage_agencies permission
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requireAnyPermission, requirePermission } from '../middleware/checkPermissions.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  listSubagenciesInGroup,
  getSubagency,
  createSubagency,
  updateSubagency,
  deleteSubagency,
  SubagencyError,
} from '../services/subagencyService.js';

const router: RouterType = Router();

function isAdmin(req: Request): boolean {
  return req.userContext?.permissions?.has(PERMISSIONS.ADMIN_MANAGE_AGENCIES) ?? false;
}

// Apply authentication to all routes
router.use(authenticateJWT);
router.use(attachUserContext);

/**
 * GET /api/agency-groups/:groupId/subagencies
 * List all subagencies within an agency group
 * Task 1.2
 *
 * Available to users with NDA view/create or admin manage agencies permission
 */
router.get(
  '/agency-groups/:groupId/subagencies',
  requireAnyPermission([PERMISSIONS.NDA_VIEW, PERMISSIONS.NDA_CREATE, PERMISSIONS.ADMIN_MANAGE_AGENCIES]),
  async (req: Request, res: Response) => {
    const { groupId } = req.params;

    try {
      if (!isAdmin(req)) {
        const hasGroupAccess = req.userContext?.authorizedAgencyGroups.includes(groupId) ?? false;
        const allowedSubagencies = req.userContext?.authorizedSubagencies ?? [];

        if (!hasGroupAccess && allowedSubagencies.length === 0) {
          return res.json({ subagencies: [] });
        }

        if (!hasGroupAccess) {
          const subagencies = await listSubagenciesInGroup(groupId, allowedSubagencies);
          return res.json({ subagencies });
        }
      }

      const subagencies = await listSubagenciesInGroup(groupId);
      return res.json({ subagencies });
    } catch (error) {
      console.error('[Subagencies] Error listing subagencies:', error);
      return res.status(500).json({
        error: 'Failed to list subagencies',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/subagencies/:id
 * Get single subagency with its agency group info
 * Task 1.3
 *
 * Available to users with NDA view/create or admin manage agencies permission
 */
router.get(
  '/subagencies/:id',
  requireAnyPermission([PERMISSIONS.NDA_VIEW, PERMISSIONS.NDA_CREATE, PERMISSIONS.ADMIN_MANAGE_AGENCIES]),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const subagency = await getSubagency(id);

      if (!subagency) {
        return res.status(404).json({
          error: 'Subagency not found',
          code: 'NOT_FOUND',
        });
      }

      if (!isAdmin(req)) {
        const hasGroupAccess = req.userContext?.authorizedAgencyGroups.includes(subagency.agencyGroupId) ?? false;
        const hasDirectAccess = req.userContext?.authorizedSubagencies.includes(subagency.id) ?? false;

        if (!hasGroupAccess && !hasDirectAccess) {
          return res.status(404).json({
            error: 'Subagency not found',
            code: 'NOT_FOUND',
          });
        }
      }

      return res.json({ subagency });
    } catch (error) {
      console.error('[Subagencies] Error fetching subagency:', error);
      return res.status(500).json({
        error: 'Failed to fetch subagency',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/agency-groups/:groupId/subagencies
 * Create new subagency in agency group
 * Task 1.4
 *
 * Body: { name: string, code: string, description?: string }
 *
 * Requires: admin:manage_agencies permission
 */
router.post('/agency-groups/:groupId/subagencies', requirePermission(PERMISSIONS.ADMIN_MANAGE_AGENCIES), async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { name, code, description } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      error: 'Name is required',
      code: 'MISSING_NAME',
    });
  }

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({
      error: 'Code is required',
      code: 'MISSING_CODE',
    });
  }

  // Validate code format (uppercase alphanumeric with underscores)
  const codeRegex = /^[A-Z0-9_]+$/;
  if (!codeRegex.test(code.trim().toUpperCase())) {
    return res.status(400).json({
      error: 'Code must be uppercase alphanumeric with underscores only',
      code: 'INVALID_CODE_FORMAT',
    });
  }

  try {
    const subagency = await createSubagency(
      groupId,
      {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || undefined,
      },
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    return res.status(201).json({ subagency });
  } catch (error) {
    if (error instanceof SubagencyError) {
      if (error.code === 'AGENCY_GROUP_NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: 'AGENCY_GROUP_NOT_FOUND',
        });
      }
      if (error.code === 'DUPLICATE_NAME' || error.code === 'DUPLICATE_CODE') {
        return res.status(409).json({
          error: error.message,
          code: error.code,
        });
      }
    }
    console.error('[Subagencies] Error creating subagency:', error);
    return res.status(500).json({
      error: 'Failed to create subagency',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PUT /api/subagencies/:id
 * Update subagency
 * Task 1.5
 *
 * Body: { name?: string, code?: string, description?: string }
 *
 * Requires: admin:manage_agencies permission
 */
router.put('/subagencies/:id', requirePermission(PERMISSIONS.ADMIN_MANAGE_AGENCIES), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, code, description } = req.body;

  // Build update object with only provided fields
  const updateData: { name?: string; code?: string; description?: string } = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Name cannot be empty',
        code: 'INVALID_NAME',
      });
    }
    updateData.name = name.trim();
  }

  if (code !== undefined) {
    if (typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({
        error: 'Code cannot be empty',
        code: 'INVALID_CODE',
      });
    }
    const codeRegex = /^[A-Z0-9_]+$/;
    const normalizedCode = code.trim().toUpperCase();
    if (!codeRegex.test(normalizedCode)) {
      return res.status(400).json({
        error: 'Code must be uppercase alphanumeric with underscores only',
        code: 'INVALID_CODE_FORMAT',
      });
    }
    updateData.code = normalizedCode;
  }

  if (description !== undefined) {
    updateData.description = description?.trim() || undefined;
  }

  // Ensure at least one field to update
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      error: 'No fields to update',
      code: 'NO_UPDATES',
    });
  }

  try {
    const subagency = await updateSubagency(
      id,
      updateData,
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    return res.json({ subagency });
  } catch (error) {
    if (error instanceof SubagencyError) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: 'NOT_FOUND',
        });
      }
      if (error.code === 'DUPLICATE_NAME' || error.code === 'DUPLICATE_CODE') {
        return res.status(409).json({
          error: error.message,
          code: error.code,
        });
      }
    }
    console.error('[Subagencies] Error updating subagency:', error);
    return res.status(500).json({
      error: 'Failed to update subagency',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * DELETE /api/subagencies/:id
 * Delete subagency (only if no NDAs exist)
 * Task 1.6
 *
 * Requires: admin:manage_agencies permission
 */
router.delete('/subagencies/:id', requirePermission(PERMISSIONS.ADMIN_MANAGE_AGENCIES), async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await deleteSubagency(
      id,
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    return res.status(204).send();
  } catch (error) {
    if (error instanceof SubagencyError) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: 'NOT_FOUND',
        });
      }
      if (error.code === 'HAS_NDAS') {
        return res.status(400).json({
          error: 'Cannot delete subagency with existing NDAs',
          code: 'HAS_NDAS',
          ndaCount: error.details?.ndaCount,
        });
      }
    }
    console.error('[Subagencies] Error deleting subagency:', error);
    return res.status(500).json({
      error: 'Failed to delete subagency',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;

/**
 * Agency Groups Routes
 * Story 2.1: Agency Groups CRUD
 *
 * REST endpoints for managing agency groups:
 * - GET /api/agency-groups - List all agency groups with subagency counts
 * - GET /api/agency-groups/:id - Get single agency group with subagencies
 * - POST /api/agency-groups - Create new agency group
 * - PUT /api/agency-groups/:id - Update agency group
 * - DELETE /api/agency-groups/:id - Delete agency group (if no subagencies)
 *
 * Write routes require admin:manage_agencies permission
 * List route is available to NDA and admin roles (needed for NDA creation)
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requireAnyPermission, requirePermission } from '../middleware/checkPermissions.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  listAgencyGroups,
  listAgencyGroupsForUser,
  getAgencyGroup,
  createAgencyGroup,
  updateAgencyGroup,
  deleteAgencyGroup,
  AgencyGroupError,
  type ListAgencyGroupsParams,
} from '../services/agencyGroupService.js';

const router: RouterType = Router();

// Apply authentication to all routes
router.use(authenticateJWT);
router.use(attachUserContext);

/**
 * GET /api/agency-groups
 * List all agency groups with subagency counts
 * Task 1.4
 * Story H-1: Added pagination support
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 * - search: Search by name or code
 *
 * Requires: nda:view, nda:create, or admin:manage_agencies permission
 */
router.get(
  '/',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.ADMIN_MANAGE_AGENCIES,
  ]),
  async (req: Request, res: Response) => {
    try {
      const isAdmin = req.userContext?.permissions?.has(PERMISSIONS.ADMIN_MANAGE_AGENCIES);

      // Parse pagination params
      const params: ListAgencyGroupsParams = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        search: req.query.search as string | undefined,
      };

      if (isAdmin) {
        // Admin gets paginated response
        const result = await listAgencyGroups(params);
        return res.json(result);
      } else {
        // Non-admin users get scoped list (no pagination for now)
        const groups = await listAgencyGroupsForUser(req.userContext!);
        return res.json({
          agencyGroups: groups,
          pagination: {
            page: 1,
            limit: groups.length,
            total: groups.length,
            totalPages: 1,
          },
        });
      }
    } catch (error) {
      console.error('[AgencyGroups] Error listing agency groups:', error);
      return res.status(500).json({
        error: 'Failed to list agency groups',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/agency-groups/:id
 * Get single agency group with its subagencies
 * Task 1.5
 *
 * Requires: admin:manage_agencies permission
 */
router.get('/:id', requirePermission(PERMISSIONS.ADMIN_MANAGE_AGENCIES), async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const group = await getAgencyGroup(id);

    if (!group) {
      return res.status(404).json({
        error: 'Agency group not found',
        code: 'NOT_FOUND',
      });
    }

    return res.json({ agencyGroup: group });
  } catch (error) {
    console.error('[AgencyGroups] Error fetching agency group:', error);
    return res.status(500).json({
      error: 'Failed to fetch agency group',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/agency-groups
 * Create new agency group
 * Task 1.1, 1.2, 1.3
 *
 * Body: { name: string, code: string, description?: string }
 *
 * Requires: admin:manage_agencies permission
 */
router.post('/', requirePermission(PERMISSIONS.ADMIN_MANAGE_AGENCIES), async (req: Request, res: Response) => {
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
  const normalizedCode = code.trim().toUpperCase();
  if (!codeRegex.test(normalizedCode)) {
    return res.status(400).json({
      error: 'Code must be uppercase alphanumeric with underscores only',
      code: 'INVALID_CODE_FORMAT',
    });
  }

  try {
    const group = await createAgencyGroup(
      {
        name: name.trim(),
        code: normalizedCode,
        description: description?.trim() || undefined,
      },
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    return res.status(201).json({ agencyGroup: group });
  } catch (error) {
    if (error instanceof AgencyGroupError) {
      if (error.code === 'DUPLICATE_NAME' || error.code === 'DUPLICATE_CODE') {
        return res.status(400).json({
          error: error.message,
          code: error.code,
        });
      }
    }
    console.error('[AgencyGroups] Error creating agency group:', error);
    return res.status(500).json({
      error: 'Failed to create agency group',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PUT /api/agency-groups/:id
 * Update agency group
 * Task 1.6
 *
 * Body: { name?: string, code?: string, description?: string }
 *
 * Requires: admin:manage_agencies permission
 */
router.put('/:id', requirePermission(PERMISSIONS.ADMIN_MANAGE_AGENCIES), async (req: Request, res: Response) => {
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
    const group = await updateAgencyGroup(
      id,
      updateData,
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    return res.json({ agencyGroup: group });
  } catch (error) {
    if (error instanceof AgencyGroupError) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: 'NOT_FOUND',
        });
      }
      if (error.code === 'DUPLICATE_NAME' || error.code === 'DUPLICATE_CODE') {
        return res.status(400).json({
          error: error.message,
          code: error.code,
        });
      }
    }
    console.error('[AgencyGroups] Error updating agency group:', error);
    return res.status(500).json({
      error: 'Failed to update agency group',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * DELETE /api/agency-groups/:id
 * Delete agency group (only if no subagencies exist)
 * Task 1.7, 1.8
 *
 * Requires: admin:manage_agencies permission
 */
router.delete('/:id', requirePermission(PERMISSIONS.ADMIN_MANAGE_AGENCIES), async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await deleteAgencyGroup(
      id,
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    return res.status(204).send();
  } catch (error) {
    if (error instanceof AgencyGroupError) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: 'NOT_FOUND',
        });
      }
      if (error.code === 'HAS_SUBAGENCIES') {
        return res.status(400).json({
          error: error.message,
          code: 'HAS_SUBAGENCIES',
          subagencyCount: error.details?.subagencyCount,
        });
      }
    }
    console.error('[AgencyGroups] Error deleting agency group:', error);
    return res.status(500).json({
      error: 'Failed to delete agency group',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;

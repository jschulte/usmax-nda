/**
 * NDA Routes
 * Story 3.1: Create NDA with Basic Form
 *
 * REST API endpoints for NDA operations:
 * - GET    /api/ndas         - List NDAs with pagination and filtering
 * - GET    /api/ndas/:id     - Get NDA details
 * - POST   /api/ndas         - Create new NDA
 * - PUT    /api/ndas/:id     - Update NDA
 * - PATCH  /api/ndas/:id/status - Change NDA status
 *
 * All endpoints require authentication and appropriate permissions.
 * Row-level security is enforced via agency access grants.
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requirePermission, requireAnyPermission } from '../middleware/checkPermissions.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  createNda,
  getNda,
  listNdas,
  updateNda,
  changeNdaStatus,
  NdaServiceError,
  NdaStatus,
} from '../services/ndaService.js';

const router = Router();

// All routes require authentication and user context
router.use(authenticateJWT);
router.use(attachUserContext);

/**
 * GET /api/ndas
 * List NDAs with pagination and filtering
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Column to sort by (default: createdAt)
 * - sortOrder: 'asc' or 'desc' (default: desc)
 * - agencyGroupId: Filter by agency group
 * - subagencyId: Filter by subagency
 * - companyName: Filter by company (partial match)
 * - status: Filter by status
 * - createdById: Filter by creator
 * - effectiveDateFrom: Filter by effective date >=
 * - effectiveDateTo: Filter by effective date <=
 * - showInactive: Include inactive NDAs (default: false)
 * - showCancelled: Include cancelled NDAs (default: false)
 *
 * Requires: nda:view permission (via any NDA permission)
 */
router.get(
  '/',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
    PERMISSIONS.NDA_DELETE,
  ]),
  async (req, res) => {
    try {
      const params = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
        agencyGroupId: req.query.agencyGroupId as string | undefined,
        subagencyId: req.query.subagencyId as string | undefined,
        companyName: req.query.companyName as string | undefined,
        status: req.query.status as NdaStatus | undefined,
        createdById: req.query.createdById as string | undefined,
        effectiveDateFrom: req.query.effectiveDateFrom as string | undefined,
        effectiveDateTo: req.query.effectiveDateTo as string | undefined,
        showInactive: req.query.showInactive === 'true',
        showCancelled: req.query.showCancelled === 'true',
      };

      const result = await listNdas(params, req.userContext!);

      res.json(result);
    } catch (error) {
      console.error('[NDAs] Error listing NDAs:', error);
      res.status(500).json({
        error: 'Failed to list NDAs',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/:id
 * Get NDA details by ID
 *
 * Requires: nda:view permission (via any NDA permission)
 */
router.get(
  '/:id',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
    PERMISSIONS.NDA_DELETE,
  ]),
  async (req, res) => {
    try {
      const nda = await getNda(req.params.id, req.userContext!);

      if (!nda) {
        return res.status(404).json({
          error: 'NDA not found or access denied',
          code: 'NOT_FOUND',
        });
      }

      res.json(nda);
    } catch (error) {
      console.error('[NDAs] Error getting NDA:', error);
      res.status(500).json({
        error: 'Failed to get NDA',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/ndas
 * Create a new NDA
 *
 * Body:
 * - companyName: string (required)
 * - agencyGroupId: string (required)
 * - subagencyId: string (optional)
 * - agencyOfficeName: string (optional)
 * - abbreviatedName: string (required)
 * - authorizedPurpose: string (required, max 255 chars)
 * - effectiveDate: ISO date string (optional)
 * - usMaxPosition: 'PRIME' | 'SUB' | 'TEAMING' | 'OTHER' (optional, default: PRIME)
 * - isNonUsMax: boolean (optional, default: false)
 * - opportunityPocId: string (optional, defaults to current user)
 * - contractsPocId: string (optional)
 * - relationshipPocId: string (required)
 * - companyCity: string (optional)
 * - companyState: string (optional)
 * - stateOfIncorporation: string (optional)
 *
 * Requires: nda:create permission
 */
router.post('/', requirePermission(PERMISSIONS.NDA_CREATE), async (req, res) => {
  try {
    const {
      companyName,
      companyCity,
      companyState,
      stateOfIncorporation,
      agencyGroupId,
      subagencyId,
      agencyOfficeName,
      abbreviatedName,
      authorizedPurpose,
      effectiveDate,
      usMaxPosition,
      isNonUsMax,
      opportunityPocId,
      contractsPocId,
      relationshipPocId,
    } = req.body;

    const nda = await createNda(
      {
        companyName,
        companyCity,
        companyState,
        stateOfIncorporation,
        agencyGroupId,
        subagencyId,
        agencyOfficeName,
        abbreviatedName,
        authorizedPurpose,
        effectiveDate,
        usMaxPosition,
        isNonUsMax,
        opportunityPocId,
        contractsPocId,
        relationshipPocId,
      },
      req.userContext!,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

    res.status(201).json({
      message: 'NDA created successfully',
      nda: {
        id: nda.id,
        displayId: nda.displayId,
        companyName: nda.companyName,
        status: nda.status,
        agencyGroup: nda.agencyGroup,
        subagency: nda.subagency,
        createdAt: nda.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof NdaServiceError) {
      const statusCode =
        error.code === 'VALIDATION_ERROR'
          ? 400
          : error.code === 'UNAUTHORIZED_AGENCY'
            ? 403
            : error.code === 'INVALID_SUBAGENCY'
              ? 400
              : 500;

      return res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[NDAs] Error creating NDA:', error);
    res.status(500).json({
      error: 'Failed to create NDA',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PUT /api/ndas/:id
 * Update an existing NDA
 *
 * Body (all optional):
 * - companyName: string
 * - agencyGroupId: string
 * - subagencyId: string | null
 * - agencyOfficeName: string
 * - abbreviatedName: string
 * - authorizedPurpose: string (max 255 chars)
 * - effectiveDate: ISO date string | null
 * - usMaxPosition: 'PRIME' | 'SUB' | 'TEAMING' | 'OTHER'
 * - isNonUsMax: boolean
 * - contractsPocId: string | null
 * - relationshipPocId: string
 * - companyCity: string
 * - companyState: string
 * - stateOfIncorporation: string
 *
 * Requires: nda:update permission
 */
router.put('/:id', requirePermission(PERMISSIONS.NDA_UPDATE), async (req, res) => {
  try {
    const {
      companyName,
      companyCity,
      companyState,
      stateOfIncorporation,
      agencyGroupId,
      subagencyId,
      agencyOfficeName,
      abbreviatedName,
      authorizedPurpose,
      effectiveDate,
      usMaxPosition,
      isNonUsMax,
      contractsPocId,
      relationshipPocId,
    } = req.body;

    const nda = await updateNda(
      req.params.id,
      {
        companyName,
        companyCity,
        companyState,
        stateOfIncorporation,
        agencyGroupId,
        subagencyId,
        agencyOfficeName,
        abbreviatedName,
        authorizedPurpose,
        effectiveDate,
        usMaxPosition,
        isNonUsMax,
        contractsPocId,
        relationshipPocId,
      },
      req.userContext!,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

    res.json({
      message: 'NDA updated successfully',
      nda: {
        id: nda.id,
        displayId: nda.displayId,
        companyName: nda.companyName,
        status: nda.status,
        agencyGroup: nda.agencyGroup,
        subagency: nda.subagency,
        updatedAt: nda.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof NdaServiceError) {
      const statusCode =
        error.code === 'NOT_FOUND'
          ? 404
          : error.code === 'VALIDATION_ERROR'
            ? 400
            : error.code === 'UNAUTHORIZED_AGENCY'
              ? 403
              : 500;

      return res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[NDAs] Error updating NDA:', error);
    res.status(500).json({
      error: 'Failed to update NDA',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PATCH /api/ndas/:id/status
 * Change NDA status
 *
 * Body:
 * - status: 'CREATED' | 'EMAILED' | 'IN_REVISION' | 'FULLY_EXECUTED' | 'INACTIVE' | 'CANCELLED'
 *
 * Requires: nda:mark_status permission
 */
router.patch('/:id/status', requirePermission(PERMISSIONS.NDA_MARK_STATUS), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Status is required',
        code: 'VALIDATION_ERROR',
      });
    }

    // Validate status value
    const validStatuses = ['CREATED', 'EMAILED', 'IN_REVISION', 'FULLY_EXECUTED', 'INACTIVE', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }

    const nda = await changeNdaStatus(req.params.id, status as NdaStatus, req.userContext!, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      message: 'NDA status updated successfully',
      nda: {
        id: nda.id,
        displayId: nda.displayId,
        status: nda.status,
        statusHistory: nda.statusHistory,
      },
    });
  } catch (error) {
    if (error instanceof NdaServiceError) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;

      return res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[NDAs] Error changing NDA status:', error);
    res.status(500).json({
      error: 'Failed to change NDA status',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;

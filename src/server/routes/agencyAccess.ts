/**
 * Agency Access Routes
 * Story 2.3: Grant Agency Group Access to Users
 * Story 2.4: Grant Subagency-Specific Access
 *
 * REST endpoints for managing agency access:
 * - GET /api/agency-groups/:id/access - List users with group access
 * - POST /api/agency-groups/:id/access - Grant group access
 * - DELETE /api/agency-groups/:id/access/:contactId - Revoke group access
 * - GET /api/subagencies/:id/access - List users with subagency access (direct + inherited)
 * - POST /api/subagencies/:id/access - Grant subagency access
 * - DELETE /api/subagencies/:id/access/:contactId - Revoke subagency access
 * - GET /api/contacts/search - User autocomplete search
 *
 * All routes require admin:manage_agencies permission
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requirePermission } from '../middleware/checkPermissions.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  getAgencyGroupAccess,
  grantAgencyGroupAccess,
  revokeAgencyGroupAccess,
  getSubagencyAccess,
  grantSubagencyAccess,
  revokeSubagencyAccess,
  searchContacts,
  AgencyAccessError,
} from '../services/agencyAccessService.js';

const router: RouterType = Router();

// Apply authentication and permission check to all routes
router.use(authenticateJWT);
router.use(attachUserContext);
router.use(requirePermission(PERMISSIONS.ADMIN_MANAGE_AGENCIES));

// =============================================================================
// AGENCY GROUP ACCESS ROUTES
// =============================================================================

/**
 * GET /api/agency-groups/:id/access
 * List users with access to this agency group
 * Story 2.3 - AC2
 */
router.get('/agency-groups/:id/access', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const users = await getAgencyGroupAccess(id);
    return res.json({ users });
  } catch (error) {
    console.error('[AgencyAccess] Error getting group access:', error);
    return res.status(500).json({
      error: 'Failed to get agency group access',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/agency-groups/:id/access
 * Grant agency group access to a user
 * Story 2.3 - AC1
 *
 * Body: { contactId: string }
 */
router.post('/agency-groups/:id/access', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { contactId } = req.body;

  if (!contactId || typeof contactId !== 'string') {
    return res.status(400).json({
      error: 'contactId is required',
      code: 'MISSING_CONTACT_ID',
    });
  }

  try {
    await grantAgencyGroupAccess(
      id,
      contactId,
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    return res.status(201).json({
      message: 'Access granted successfully',
      agencyGroupId: id,
      contactId,
    });
  } catch (error) {
    if (error instanceof AgencyAccessError) {
      if (error.code === 'AGENCY_GROUP_NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: error.code,
        });
      }
      if (error.code === 'USER_NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: error.code,
        });
      }
      if (error.code === 'ALREADY_GRANTED') {
        return res.status(409).json({
          error: error.message,
          code: error.code,
        });
      }
    }
    console.error('[AgencyAccess] Error granting group access:', error);
    return res.status(500).json({
      error: 'Failed to grant agency group access',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * DELETE /api/agency-groups/:id/access/:contactId
 * Revoke agency group access from a user
 * Story 2.3 - AC3
 */
router.delete('/agency-groups/:id/access/:contactId', async (req: Request, res: Response) => {
  const { id, contactId } = req.params;

  try {
    await revokeAgencyGroupAccess(
      id,
      contactId,
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    return res.status(204).send();
  } catch (error) {
    if (error instanceof AgencyAccessError) {
      if (error.code === 'GRANT_NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: error.code,
        });
      }
    }
    console.error('[AgencyAccess] Error revoking group access:', error);
    return res.status(500).json({
      error: 'Failed to revoke agency group access',
      code: 'INTERNAL_ERROR',
    });
  }
});

// =============================================================================
// SUBAGENCY ACCESS ROUTES
// =============================================================================

/**
 * GET /api/subagencies/:id/access
 * List users with access to this subagency (direct + inherited)
 * Story 2.4 - AC3
 */
router.get('/subagencies/:id/access', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const users = await getSubagencyAccess(id);
    return res.json({ users });
  } catch (error) {
    if (error instanceof AgencyAccessError) {
      if (error.code === 'SUBAGENCY_NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: error.code,
        });
      }
    }
    console.error('[AgencyAccess] Error getting subagency access:', error);
    return res.status(500).json({
      error: 'Failed to get subagency access',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/subagencies/:id/access
 * Grant subagency-specific access to a user
 * Story 2.4 - AC1
 *
 * Body: { contactId: string }
 */
router.post('/subagencies/:id/access', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { contactId } = req.body;

  if (!contactId || typeof contactId !== 'string') {
    return res.status(400).json({
      error: 'contactId is required',
      code: 'MISSING_CONTACT_ID',
    });
  }

  try {
    await grantSubagencyAccess(
      id,
      contactId,
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    return res.status(201).json({
      message: 'Access granted successfully',
      subagencyId: id,
      contactId,
    });
  } catch (error) {
    if (error instanceof AgencyAccessError) {
      if (error.code === 'SUBAGENCY_NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: error.code,
        });
      }
      if (error.code === 'USER_NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: error.code,
        });
      }
      if (error.code === 'ALREADY_GRANTED') {
        return res.status(409).json({
          error: error.message,
          code: error.code,
        });
      }
    }
    console.error('[AgencyAccess] Error granting subagency access:', error);
    return res.status(500).json({
      error: 'Failed to grant subagency access',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * DELETE /api/subagencies/:id/access/:contactId
 * Revoke subagency-specific access from a user
 * Story 2.4 - AC4
 */
router.delete('/subagencies/:id/access/:contactId', async (req: Request, res: Response) => {
  const { id, contactId } = req.params;

  try {
    await revokeSubagencyAccess(
      id,
      contactId,
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    return res.status(204).send();
  } catch (error) {
    if (error instanceof AgencyAccessError) {
      if (error.code === 'GRANT_NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: error.code,
        });
      }
    }
    console.error('[AgencyAccess] Error revoking subagency access:', error);
    return res.status(500).json({
      error: 'Failed to revoke subagency access',
      code: 'INTERNAL_ERROR',
    });
  }
});

// =============================================================================
// CONTACT SEARCH ROUTE
// =============================================================================

/**
 * GET /api/contacts/search?q=<query>
 * Search contacts for autocomplete
 * Story 2.3 - AC4
 * Requires at least 3 characters
 */
router.get('/contacts/search', async (req: Request, res: Response) => {
  const query = req.query.q as string;

  if (!query || query.length < 3) {
    return res.status(400).json({
      error: 'Search query must be at least 3 characters',
      code: 'QUERY_TOO_SHORT',
    });
  }

  try {
    const contacts = await searchContacts(query);
    return res.json({ contacts });
  } catch (error) {
    console.error('[AgencyAccess] Error searching contacts:', error);
    return res.status(500).json({
      error: 'Failed to search contacts',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;

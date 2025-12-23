/**
 * Users Routes
 * Story 2.5: User/Contact Management
 *
 * REST API endpoints for user CRUD operations:
 * - GET    /api/users         - List all users with pagination
 * - GET    /api/users/:id     - Get user details
 * - POST   /api/users         - Create new user
 * - PUT    /api/users/:id     - Update user
 * - DELETE /api/users/:id     - Deactivate user (soft delete)
 *
 * All endpoints require admin:manage_users permission.
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requirePermission } from '../middleware/checkPermissions.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  listUsers,
  searchUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  UserServiceError,
} from '../services/userService.js';
import { getUserAccessSummary } from '../services/accessSummaryService.js';

const router: Router = Router();

// All routes require authentication, user context, and admin:manage_users permission
router.use(authenticateJWT);
router.use(attachUserContext);
router.use(requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS));

/**
 * GET /api/users
 * List all users with pagination and optional search
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - search: Search term for name/email
 * - active: Filter by active status (true/false)
 */
router.get('/', async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const search = req.query.search as string | undefined;
    const active = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;

    const result = await listUsers({ page, limit, search, active });

    res.json(result);
  } catch (error) {
    console.error('[Users] Error listing users:', error);
    res.status(500).json({
      error: 'Failed to list users',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/users/search?q=<query>
 * Search users for autocomplete (type-ahead)
 *
 * Query params:
 * - q: Search term (min 3 characters)
 * - active: Filter by active status (true/false, optional)
 */
router.get('/search', async (req, res) => {
  const query = (req.query.q as string | undefined)?.trim() || '';
  const active =
    req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;

  if (query.length < 3) {
    return res.status(400).json({
      error: 'Search query must be at least 3 characters',
      code: 'QUERY_TOO_SHORT',
    });
  }

  try {
    const users = await searchUsers({ query, active, limit: 10 });
    return res.json({ users });
  } catch (error) {
    console.error('[Users] Error searching users:', error);
    return res.status(500).json({
      error: 'Failed to search users',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/users/:id
 * Get user details by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await getUser(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    res.json(user);
  } catch (error) {
    console.error('[Users] Error getting user:', error);
    res.status(500).json({
      error: 'Failed to get user',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/users
 * Create a new user
 *
 * Body:
 * - firstName: string (required)
 * - lastName: string (required)
 * - email: string (required)
 * - workPhone: string (optional)
 * - cellPhone: string (optional)
 * - jobTitle: string (optional)
 */
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, workPhone, cellPhone, jobTitle } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        error: 'firstName, lastName, and email are required',
        code: 'VALIDATION_ERROR',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        code: 'VALIDATION_ERROR',
      });
    }

    const user = await createUser(
      { firstName, lastName, email, workPhone, cellPhone, jobTitle },
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof UserServiceError) {
      if (error.code === 'DUPLICATE_EMAIL') {
        return res.status(409).json({
          error: error.message,
          code: error.code,
        });
      }
    }

    console.error('[Users] Error creating user:', error);
    res.status(500).json({
      error: 'Failed to create user',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PUT /api/users/:id
 * Update an existing user
 *
 * Body (all optional):
 * - firstName: string
 * - lastName: string
 * - email: string
 * - workPhone: string
 * - cellPhone: string
 * - jobTitle: string
 */
router.put('/:id', async (req, res) => {
  try {
    const { firstName, lastName, email, workPhone, cellPhone, jobTitle } = req.body;

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
          code: 'VALIDATION_ERROR',
        });
      }
    }

    const user = await updateUser(
      req.params.id,
      { firstName, lastName, email, workPhone, cellPhone, jobTitle },
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof UserServiceError) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: error.code,
        });
      }
      if (error.code === 'DUPLICATE_EMAIL') {
        return res.status(409).json({
          error: error.message,
          code: error.code,
        });
      }
    }

    console.error('[Users] Error updating user:', error);
    res.status(500).json({
      error: 'Failed to update user',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * DELETE /api/users/:id
 * Deactivate a user (soft delete)
 *
 * Deactivated users:
 * - Cannot log in
 * - Preserve data for audit purposes
 * - Can be found in listing with active=false filter
 */
router.delete('/:id', async (req, res) => {
  try {
    await deactivateUser(
      req.params.id,
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

    res.json({
      message: 'User deactivated successfully',
    });
  } catch (error) {
    if (error instanceof UserServiceError) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: error.code,
        });
      }
      if (error.code === 'ALREADY_DEACTIVATED') {
        return res.status(409).json({
          error: error.message,
          code: error.code,
        });
      }
      if (error.code === 'SELF_DEACTIVATION') {
        return res.status(400).json({
          error: error.message,
          code: error.code,
        });
      }
    }

    console.error('[Users] Error deactivating user:', error);
    res.status(500).json({
      error: 'Failed to deactivate user',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PATCH /api/users/:id/deactivate
 * Deactivate a user (soft delete)
 *
 * Returns: 204 No Content
 */
router.patch('/:id/deactivate', async (req, res) => {
  try {
    await deactivateUser(
      req.params.id,
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

    return res.status(204).send();
  } catch (error) {
    if (error instanceof UserServiceError) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: error.code,
        });
      }
      if (error.code === 'ALREADY_DEACTIVATED') {
        return res.status(409).json({
          error: error.message,
          code: error.code,
        });
      }
      if (error.code === 'SELF_DEACTIVATION') {
        return res.status(400).json({
          error: error.message,
          code: error.code,
        });
      }
    }

    console.error('[Users] Error deactivating user:', error);
    return res.status(500).json({
      error: 'Failed to deactivate user',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PATCH /api/users/:id/reactivate
 * Reactivate a deactivated user
 * Story H-1: Show Inactive Users - reactivation feature
 *
 * Returns: 204 No Content
 */
router.patch('/:id/reactivate', async (req, res) => {
  try {
    await reactivateUser(
      req.params.id,
      req.userContext!.contactId,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

    return res.status(204).send();
  } catch (error) {
    if (error instanceof UserServiceError) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
          code: error.code,
        });
      }
      if (error.code === 'ALREADY_ACTIVE') {
        return res.status(409).json({
          error: error.message,
          code: error.code,
        });
      }
    }

    console.error('[Users] Error reactivating user:', error);
    return res.status(500).json({
      error: 'Failed to reactivate user',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/users/:id/access-summary
 * Get complete access summary for a user
 * Story 2.6 Task 1
 *
 * Returns:
 * - User info
 * - Roles with permissions
 * - Effective permissions (deduplicated from all roles)
 * - Agency group access (with subagencies)
 * - Direct subagency access
 */
router.get('/:id/access-summary', async (req, res) => {
  try {
    const summary = await getUserAccessSummary(req.params.id);

    if (!summary) {
      return res.status(404).json({
        error: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    res.json(summary);
  } catch (error) {
    console.error('[Users] Error getting access summary:', error);
    res.status(500).json({
      error: 'Failed to get access summary',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;

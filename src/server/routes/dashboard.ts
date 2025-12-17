/**
 * Dashboard Routes
 * Stories 5.8-5.12: Dashboard & Metrics
 *
 * REST API endpoints for dashboard operations:
 * - GET /api/dashboard - Get personalized dashboard data
 * - GET /api/dashboard/metrics - Get at-a-glance metrics only
 * - GET /api/dashboard/config - Get dashboard configuration
 *
 * All endpoints require authentication and appropriate permissions.
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requireAnyPermission } from '../middleware/checkPermissions.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { getDashboard, getDashboardConfig } from '../services/dashboardService.js';

const router = Router();

// All routes require authentication and user context
router.use(authenticateJWT);
router.use(attachUserContext);

/**
 * GET /api/dashboard
 * Get personalized dashboard data
 * Story 5.8: Personalized Dashboard
 *
 * Returns:
 * - recentNdas: Last 5 NDAs user created or is POC for
 * - itemsNeedingAttention: Stale, expiring, waiting on 3rd party
 * - metrics: Active count, expiring soon, average cycle time
 * - recentActivity: Last 10 activity items
 *
 * Requires: Any NDA permission
 */
router.get(
  '/',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      // Get config from system settings
      const config = await getDashboardConfig();

      // Get personalized dashboard data
      const dashboard = await getDashboard(req.userContext!, config);

      res.json(dashboard);
    } catch (error) {
      console.error('[Dashboard] Error getting dashboard:', error);
      res.status(500).json({
        error: 'Failed to load dashboard',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/dashboard/config
 * Get dashboard configuration (thresholds)
 *
 * Returns configurable thresholds for stale detection, expiration alerts, etc.
 *
 * Requires: Any NDA permission
 */
router.get(
  '/config',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (_req, res) => {
    try {
      const config = await getDashboardConfig();
      res.json({ config });
    } catch (error) {
      console.error('[Dashboard] Error getting config:', error);
      res.status(500).json({
        error: 'Failed to load dashboard config',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

export default router;

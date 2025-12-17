/**
 * Notification Routes
 * Story 3.11: Email Notifications to Stakeholders
 *
 * REST API endpoints for notification management:
 * - GET    /api/me/notification-preferences       - Get current user's preferences
 * - PUT    /api/me/notification-preferences       - Update current user's preferences
 * - GET    /api/me/subscriptions                  - Get current user's NDA subscriptions
 * - POST   /api/ndas/:id/subscribe                - Subscribe to NDA notifications
 * - DELETE /api/ndas/:id/subscribe                - Unsubscribe from NDA notifications
 * - GET    /api/ndas/:id/subscribers              - Get NDA subscribers (admin)
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requirePermission, requireAnyPermission } from '../middleware/checkPermissions.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  subscribeToNda,
  unsubscribeFromNda,
  getNdaSubscribers,
  getUserSubscriptions,
  NotificationServiceError,
} from '../services/notificationService.js';

const router = Router();

// All routes require authentication and user context
router.use(authenticateJWT);
router.use(attachUserContext);

/**
 * GET /api/me/notification-preferences
 * Get current user's notification preferences
 */
router.get('/me/notification-preferences', async (req, res) => {
  try {
    const preferences = await getNotificationPreferences(req.userContext!.userId);
    res.json({ preferences });
  } catch (error) {
    console.error('[Notifications] Error getting preferences:', error);
    res.status(500).json({
      error: 'Failed to get notification preferences',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PUT /api/me/notification-preferences
 * Update current user's notification preferences
 *
 * Body (all optional):
 * - onNdaCreated: boolean
 * - onNdaEmailed: boolean
 * - onDocumentUploaded: boolean
 * - onStatusChanged: boolean
 * - onFullyExecuted: boolean
 */
router.put('/me/notification-preferences', async (req, res) => {
  try {
    const {
      onNdaCreated,
      onNdaEmailed,
      onDocumentUploaded,
      onStatusChanged,
      onFullyExecuted,
    } = req.body;

    const preferences = await updateNotificationPreferences(
      req.userContext!.userId,
      {
        onNdaCreated,
        onNdaEmailed,
        onDocumentUploaded,
        onStatusChanged,
        onFullyExecuted,
      },
      req.userContext!
    );

    res.json({
      message: 'Notification preferences updated',
      preferences,
    });
  } catch (error) {
    if (error instanceof NotificationServiceError) {
      return res.status(error.code === 'UNAUTHORIZED' ? 403 : 500).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[Notifications] Error updating preferences:', error);
    res.status(500).json({
      error: 'Failed to update notification preferences',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/me/subscriptions
 * Get current user's NDA subscriptions
 */
router.get('/me/subscriptions', async (req, res) => {
  try {
    const subscriptions = await getUserSubscriptions(req.userContext!.userId);
    res.json({ subscriptions });
  } catch (error) {
    console.error('[Notifications] Error getting subscriptions:', error);
    res.status(500).json({
      error: 'Failed to get subscriptions',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/ndas/:id/subscribe
 * Subscribe to NDA notifications
 */
router.post(
  '/ndas/:id/subscribe',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      await subscribeToNda(
        req.params.id,
        req.userContext!.userId,
        req.userContext!
      );

      res.status(201).json({
        message: 'Subscribed to NDA notifications',
      });
    } catch (error) {
      if (error instanceof NotificationServiceError) {
        return res.status(error.code === 'NDA_NOT_FOUND' ? 404 : 500).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[Notifications] Error subscribing to NDA:', error);
      res.status(500).json({
        error: 'Failed to subscribe to NDA',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * DELETE /api/ndas/:id/subscribe
 * Unsubscribe from NDA notifications
 */
router.delete(
  '/ndas/:id/subscribe',
  async (req, res) => {
    try {
      await unsubscribeFromNda(
        req.params.id,
        req.userContext!.userId,
        req.userContext!
      );

      res.json({
        message: 'Unsubscribed from NDA notifications',
      });
    } catch (error) {
      if (error instanceof NotificationServiceError) {
        return res.status(error.code === 'UNAUTHORIZED' ? 403 : 500).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[Notifications] Error unsubscribing from NDA:', error);
      res.status(500).json({
        error: 'Failed to unsubscribe from NDA',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/:id/subscribers
 * Get NDA subscribers (admin or POC only)
 */
router.get(
  '/ndas/:id/subscribers',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_UPDATE,
    PERMISSIONS.ADMIN_MANAGE_USERS,
  ]),
  async (req, res) => {
    try {
      const subscribers = await getNdaSubscribers(req.params.id);
      res.json({ subscribers });
    } catch (error) {
      console.error('[Notifications] Error getting subscribers:', error);
      res.status(500).json({
        error: 'Failed to get NDA subscribers',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

export default router;

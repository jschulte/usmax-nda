/**
 * Admin Test Notifications Route
 * Story 9.17: Send Test Notification with Recipient Selection
 *
 * Admin endpoint for sending test notifications:
 * - POST /api/admin/test-notifications/send - Send test notification to selected users
 *
 * Requires admin:manage_users permission (Story 9.17 AC1)
 */

import { Router, type Request, type Response } from 'express';
import { requirePermission } from '../../middleware/checkPermissions.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { sendTestNotification, NotificationEvent } from '../../services/notificationService.js';

const router: Router = Router();

// All test notification routes require admin:manage_users permission
router.use(requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS));

/**
 * POST /api/admin/test-notifications/send
 * Send test notification to selected recipient(s)
 * Story 9.17 AC4
 *
 * Body: { notificationType: NotificationEvent, recipientIds: string[] }
 */
router.post('/send', async (req: Request, res: Response) => {
  const { notificationType, recipientIds } = req.body;

  // Validation
  if (!notificationType) {
    return res.status(400).json({
      error: 'Notification type is required',
      code: 'MISSING_NOTIFICATION_TYPE',
    });
  }

  if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
    return res.status(400).json({
      error: 'At least one recipient is required',
      code: 'MISSING_RECIPIENTS',
    });
  }

  // Validate notification type
  const validTypes = Object.values(NotificationEvent);
  if (!validTypes.includes(notificationType)) {
    return res.status(400).json({
      error: `Invalid notification type. Valid types: ${validTypes.join(', ')}`,
      code: 'INVALID_NOTIFICATION_TYPE',
    });
  }

  try {
    const sent = await sendTestNotification(
      notificationType,
      recipientIds,
      req.userContext!
    );

    return res.json({
      success: true,
      sent,
      message: `Test notification sent to ${sent} recipient(s)`,
    });
  } catch (error) {
    console.error('[Admin/TestNotifications] Error sending test notification:', error);
    return res.status(500).json({
      error: 'Failed to send test notification',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;

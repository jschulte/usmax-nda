/**
 * Admin Test Notifications Routes Tests
 * Story 9.17: Send Test Notification with Recipient Selection
 *
 * Tests test notification sending functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock authentication middleware
vi.mock('../../../middleware/authenticateJWT.js', () => ({
  authenticateJWT: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin-1', email: 'admin@usmax.com' };
    next();
  },
}));

vi.mock('../../../middleware/attachUserContext.js', () => ({
  attachUserContext: (req: any, _res: any, next: any) => {
    req.userContext = {
      id: 'admin-1',
      contactId: 'contact-admin-1',
      email: 'admin@usmax.com',
      name: 'Admin User',
      active: true,
      roles: ['Admin'],
      permissions: new Set(['admin:manage_users']),
      authorizedAgencyGroups: [],
      authorizedSubagencies: [],
    };
    next();
  },
}));

vi.mock('../../../middleware/checkPermissions.js', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock notification service
const mockSendTestNotification = vi.fn();

vi.mock('../../../services/notificationService.js', () => ({
  sendTestNotification: mockSendTestNotification,
  NotificationEvent: {
    NDA_CREATED: 'nda_created',
    NDA_EMAILED: 'nda_emailed',
    DOCUMENT_UPLOADED: 'document_uploaded',
    STATUS_CHANGED: 'status_changed',
    FULLY_EXECUTED: 'fully_executed',
    APPROVAL_REQUESTED: 'approval_requested',
    ASSIGNED_TO_ME: 'assigned_to_me',
    NDA_REJECTED: 'nda_rejected',
  },
}));

import adminTestNotificationsRouter from '../testNotifications.js';

describe('Admin Test Notifications Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/admin/test-notifications', adminTestNotificationsRouter);
  });

  describe('POST /api/admin/test-notifications/send', () => {
    it('should send test notification to selected users', async () => {
      mockSendTestNotification.mockResolvedValue(2);

      const res = await request(app)
        .post('/api/admin/test-notifications/send')
        .send({
          notificationType: 'nda_created',
          recipientIds: ['user-1', 'user-2'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sent).toBe(2);
      expect(res.body.message).toContain('2 recipient(s)');
      expect(mockSendTestNotification).toHaveBeenCalledWith(
        'nda_created',
        ['user-1', 'user-2'],
        expect.objectContaining({ contactId: 'contact-admin-1' })
      );
    });

    it('should return 400 if notification type is missing', async () => {
      const res = await request(app)
        .post('/api/admin/test-notifications/send')
        .send({
          recipientIds: ['user-1'],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Notification type is required');
      expect(res.body.code).toBe('MISSING_NOTIFICATION_TYPE');
    });

    it('should return 400 if recipients are missing', async () => {
      const res = await request(app)
        .post('/api/admin/test-notifications/send')
        .send({
          notificationType: 'nda_created',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('At least one recipient is required');
      expect(res.body.code).toBe('MISSING_RECIPIENTS');
    });

    it('should return 400 if recipients is an empty array', async () => {
      const res = await request(app)
        .post('/api/admin/test-notifications/send')
        .send({
          notificationType: 'nda_created',
          recipientIds: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('At least one recipient is required');
      expect(res.body.code).toBe('MISSING_RECIPIENTS');
    });

    it('should return 400 if notification type is invalid', async () => {
      const res = await request(app)
        .post('/api/admin/test-notifications/send')
        .send({
          notificationType: 'invalid_type',
          recipientIds: ['user-1'],
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_NOTIFICATION_TYPE');
    });

    it('should send test notification to multiple users', async () => {
      mockSendTestNotification.mockResolvedValue(5);

      const res = await request(app)
        .post('/api/admin/test-notifications/send')
        .send({
          notificationType: 'status_changed',
          recipientIds: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
        });

      expect(res.status).toBe(200);
      expect(res.body.sent).toBe(5);
    });

    it('should handle service errors gracefully', async () => {
      mockSendTestNotification.mockRejectedValue(new Error('Email service unavailable'));

      const res = await request(app)
        .post('/api/admin/test-notifications/send')
        .send({
          notificationType: 'nda_created',
          recipientIds: ['user-1'],
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to send test notification');
      expect(res.body.code).toBe('INTERNAL_ERROR');
    });

    it('should work with different notification types', async () => {
      const types = ['nda_created', 'nda_emailed', 'status_changed', 'approval_requested'];

      for (const type of types) {
        mockSendTestNotification.mockResolvedValue(1);

        const res = await request(app)
          .post('/api/admin/test-notifications/send')
          .send({
            notificationType: type,
            recipientIds: ['user-1'],
          });

        expect(res.status).toBe(200);
        expect(mockSendTestNotification).toHaveBeenCalledWith(
          type,
          ['user-1'],
          expect.any(Object)
        );
      }
    });
  });
});

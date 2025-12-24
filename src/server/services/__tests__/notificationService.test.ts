/**
 * Notification Service Tests
 * Story 3.11: Email Notifications to Stakeholders
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  subscribeToNda,
  unsubscribeFromNda,
  getNdaSubscribers,
  autoSubscribePocs,
  notifyStakeholders,
  getUserSubscriptions,
  notifyPocAssignment,
  NotificationEvent,
  NotificationServiceError,
} from '../notificationService.js';
import type { UserContext } from '../../types/auth.js';

// Mock Prisma
vi.mock('../../db/index.js', () => ({
  prisma: {
    notificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    ndaSubscription: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    nda: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    contact: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock email service
vi.mock('../emailService.js', () => ({
  queueEmail: vi.fn().mockResolvedValue({ emailId: 'test-email-id', status: 'QUEUED' }),
}));

// Mock audit service
vi.mock('../auditService.js', () => ({
  auditService: {
    log: vi.fn(),
  },
  AuditAction: {
    NDA_STATUS_CHANGED: 'nda_status_changed',
  },
}));

vi.mock('../ndaService.js', () => ({
  buildSecurityFilter: vi.fn().mockResolvedValue({}),
}));

import { prisma } from '../../db/index.js';
const mockPrisma = vi.mocked(prisma);

describe('Notification Service', () => {
  const mockUserContext: UserContext = {
    id: 'cognito-sub-123',
    contactId: 'user-123',
    email: 'user@test.com',
    permissions: new Set(['nda:view']),
    roles: ['NDA User'],
    authorizedAgencyGroups: [],
    authorizedSubagencies: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNotificationPreferences', () => {
    it('should return existing preferences', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        id: 'pref-1',
        contactId: 'user-123',
        onNdaCreated: true,
        onNdaEmailed: false,
        onDocumentUploaded: true,
        onStatusChanged: true,
        onFullyExecuted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const prefs = await getNotificationPreferences('user-123');

      expect(prefs.onNdaCreated).toBe(true);
      expect(prefs.onNdaEmailed).toBe(false);
      expect(prefs.onDocumentUploaded).toBe(true);
    });

    it('should return defaults when no preferences exist', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);

      const prefs = await getNotificationPreferences('user-123');

      expect(prefs.onNdaCreated).toBe(true);
      expect(prefs.onNdaEmailed).toBe(true);
      expect(prefs.onDocumentUploaded).toBe(true);
      expect(prefs.onStatusChanged).toBe(true);
      expect(prefs.onFullyExecuted).toBe(true);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update preferences for self', async () => {
      mockPrisma.notificationPreference.upsert.mockResolvedValue({
        id: 'pref-1',
        contactId: 'user-123',
        onNdaCreated: false,
        onNdaEmailed: true,
        onDocumentUploaded: true,
        onStatusChanged: true,
        onFullyExecuted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const prefs = await updateNotificationPreferences(
        'user-123',
        { onNdaCreated: false },
        mockUserContext
      );

      expect(prefs.onNdaCreated).toBe(false);
      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalled();
    });

    it('should reject update for another user without admin permission', async () => {
      await expect(
        updateNotificationPreferences(
          'other-user',
          { onNdaCreated: false },
          mockUserContext
        )
      ).rejects.toThrow(NotificationServiceError);
    });

    it('should allow admin to update other user preferences', async () => {
      const adminContext: UserContext = {
        ...mockUserContext,
        contactId: 'admin-123',
        permissions: new Set(['admin:manage_users']),
      };

      mockPrisma.notificationPreference.upsert.mockResolvedValue({
        id: 'pref-1',
        contactId: 'other-user',
        onNdaCreated: false,
        onNdaEmailed: true,
        onDocumentUploaded: true,
        onStatusChanged: true,
        onFullyExecuted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const prefs = await updateNotificationPreferences(
        'other-user',
        { onNdaCreated: false },
        adminContext
      );

      expect(prefs.onNdaCreated).toBe(false);
    });
  });

  describe('subscribeToNda', () => {
    it('should subscribe user to NDA', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue({
        id: 'nda-123',
      } as any);

      mockPrisma.ndaSubscription.upsert.mockResolvedValue({
        id: 'sub-1',
        ndaId: 'nda-123',
        contactId: 'user-123',
        createdAt: new Date(),
      });

      await subscribeToNda('nda-123', 'user-123', mockUserContext);

      expect(mockPrisma.ndaSubscription.upsert).toHaveBeenCalledWith({
        where: {
          ndaId_contactId: { ndaId: 'nda-123', contactId: 'user-123' },
        },
        create: { ndaId: 'nda-123', contactId: 'user-123' },
        update: {},
      });
    });

    it('should throw error for non-existent NDA', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(null);

      await expect(subscribeToNda('nonexistent', 'user-123', mockUserContext))
        .rejects.toThrow(NotificationServiceError);
    });
  });

  describe('unsubscribeFromNda', () => {
    it('should unsubscribe user from NDA', async () => {
      mockPrisma.ndaSubscription.deleteMany.mockResolvedValue({ count: 1 });

      await unsubscribeFromNda('nda-123', 'user-123', mockUserContext);

      expect(mockPrisma.ndaSubscription.deleteMany).toHaveBeenCalledWith({
        where: { ndaId: 'nda-123', contactId: 'user-123' },
      });
    });

    it('should reject unsubscribing another user without admin permission', async () => {
      await expect(
        unsubscribeFromNda('nda-123', 'other-user', mockUserContext)
      ).rejects.toThrow(NotificationServiceError);
    });
  });

  describe('getNdaSubscribers', () => {
    it('should return list of subscribers', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue({
        id: 'nda-123',
        createdById: 'user-123',
        opportunityPocId: 'user-123',
        contractsPocId: null,
        relationshipPocId: 'user-999',
      } as any);

      mockPrisma.ndaSubscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          contactId: 'user-1',
          contact: {
            id: 'user-1',
            email: 'user1@test.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
        {
          id: 'sub-2',
          contactId: 'user-2',
          contact: {
            id: 'user-2',
            email: 'user2@test.com',
            firstName: 'Jane',
            lastName: 'Smith',
          },
        },
      ] as any);

      const subscribers = await getNdaSubscribers('nda-123', mockUserContext);

      expect(subscribers).toHaveLength(2);
      expect(subscribers[0].contact.email).toBe('user1@test.com');
    });
  });

  describe('autoSubscribePocs', () => {
    it('should auto-subscribe all POCs and creator', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        opportunityPocId: 'poc-1',
        contractsPocId: 'poc-2',
        relationshipPocId: 'poc-3',
        createdById: 'creator-1',
      } as any);

      mockPrisma.ndaSubscription.createMany.mockResolvedValue({ count: 4 });

      await autoSubscribePocs('nda-123');

      expect(mockPrisma.ndaSubscription.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          { ndaId: 'nda-123', contactId: 'poc-1' },
          { ndaId: 'nda-123', contactId: 'poc-2' },
          { ndaId: 'nda-123', contactId: 'poc-3' },
          { ndaId: 'nda-123', contactId: 'creator-1' },
        ]),
        skipDuplicates: true,
      });
    });

    it('should handle null contractsPocId', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        opportunityPocId: 'poc-1',
        contractsPocId: null,
        relationshipPocId: 'poc-3',
        createdById: 'creator-1',
      } as any);

      mockPrisma.ndaSubscription.createMany.mockResolvedValue({ count: 3 });

      await autoSubscribePocs('nda-123');

      expect(mockPrisma.ndaSubscription.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          { ndaId: 'nda-123', contactId: 'poc-1' },
          { ndaId: 'nda-123', contactId: 'poc-3' },
          { ndaId: 'nda-123', contactId: 'creator-1' },
        ]),
        skipDuplicates: true,
      });
    });
  });

  describe('notifyStakeholders', () => {
    it('should notify subscribers based on preferences', async () => {
      // Mock subscribers
      mockPrisma.ndaSubscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          contactId: 'subscriber-1',
          contact: {
            id: 'subscriber-1',
            email: 'sub1@test.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ] as any);

      // Mock preferences (all enabled)
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        id: 'pref-1',
        contactId: 'subscriber-1',
        onNdaCreated: true,
        onNdaEmailed: true,
        onDocumentUploaded: true,
        onStatusChanged: true,
        onFullyExecuted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await notifyStakeholders(
        {
          ndaId: 'nda-123',
          displayId: 1590,
          companyName: 'TechCorp',
          event: NotificationEvent.STATUS_CHANGED,
          changedBy: { id: 'changer-1', name: 'Admin User' },
          timestamp: new Date(),
          previousValue: 'Created',
          newValue: 'Emailed',
        },
        mockUserContext
      );

      expect(result.notified).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it('should skip subscribers who disabled the event', async () => {
      // Mock subscribers
      mockPrisma.ndaSubscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          contactId: 'subscriber-1',
          contact: {
            id: 'subscriber-1',
            email: 'sub1@test.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ] as any);

      // Mock preferences (status changed disabled)
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        id: 'pref-1',
        contactId: 'subscriber-1',
        onNdaCreated: true,
        onNdaEmailed: true,
        onDocumentUploaded: true,
        onStatusChanged: false, // Disabled
        onFullyExecuted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await notifyStakeholders(
        {
          ndaId: 'nda-123',
          displayId: 1590,
          companyName: 'TechCorp',
          event: NotificationEvent.STATUS_CHANGED,
          changedBy: { id: 'changer-1', name: 'Admin User' },
          timestamp: new Date(),
        },
        mockUserContext
      );

      expect(result.notified).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should not notify the person who made the change', async () => {
      // Mock subscribers (includes the changer)
      mockPrisma.ndaSubscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          contactId: 'user-123', // Same as mockUserContext.userId (changer)
          contact: {
            id: 'user-123',
            email: 'user@test.com',
            firstName: 'Self',
            lastName: 'User',
          },
        },
      ] as any);

      const result = await notifyStakeholders(
        {
          ndaId: 'nda-123',
          displayId: 1590,
          companyName: 'TechCorp',
          event: NotificationEvent.STATUS_CHANGED,
          changedBy: { id: 'user-123', name: 'User' }, // Same user
          timestamp: new Date(),
        },
        mockUserContext
      );

      // Should skip because it's the same user
      expect(result.notified).toBe(0);
      expect(result.skipped).toBe(0); // Filtered out before preference check
    });
  });

  describe('getUserSubscriptions', () => {
    it('should return user subscriptions with NDA info', async () => {
      mockPrisma.ndaSubscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          ndaId: 'nda-1',
          createdAt: new Date('2024-01-15'),
          nda: {
            id: 'nda-1',
            displayId: 1590,
            companyName: 'TechCorp',
            status: 'CREATED',
          },
        },
        {
          id: 'sub-2',
          ndaId: 'nda-2',
          createdAt: new Date('2024-01-16'),
          nda: {
            id: 'nda-2',
            displayId: 1591,
            companyName: 'AnotherCorp',
            status: 'SENT_PENDING_SIGNATURE',
          },
        },
      ] as any);

      const subs = await getUserSubscriptions('user-123', mockUserContext);

      expect(subs).toHaveLength(2);
      expect(subs[0].nda.companyName).toBe('TechCorp');
      expect(subs[1].nda.companyName).toBe('AnotherCorp');
    });
  });

  // Story H-1 Task 15.4: Tests for ASSIGNED_TO_ME notification trigger
  describe('notifyPocAssignment', () => {
    it('should send notification when POC is assigned', async () => {
      // Mock NDA
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        companyName: 'TechCorp',
      } as any);

      // Mock assigned contact
      mockPrisma.contact.findUnique
        .mockResolvedValueOnce({
          id: 'poc-123',
          email: 'poc@test.com',
          firstName: 'John',
          lastName: 'POC',
        } as any)
        // Mock assigner (for name)
        .mockResolvedValueOnce({
          id: 'user-123',
          firstName: 'Admin',
          lastName: 'User',
        } as any);

      // Mock preferences (enabled)
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        id: 'pref-1',
        contactId: 'poc-123',
        onNdaCreated: true,
        onNdaEmailed: true,
        onDocumentUploaded: true,
        onStatusChanged: true,
        onFullyExecuted: true,
        onAssignedToMe: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Mock subscription upsert
      mockPrisma.ndaSubscription.upsert.mockResolvedValue({
        id: 'sub-1',
        ndaId: 'nda-123',
        contactId: 'poc-123',
        createdAt: new Date(),
      });

      await notifyPocAssignment('nda-123', 'poc-123', 'Contracts POC', mockUserContext);

      // Verify email was queued
      const { queueEmail } = await import('../emailService.js');
      expect(queueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          ndaId: 'nda-123',
          toRecipients: ['poc@test.com'],
          subject: expect.stringContaining('TechCorp'),
        }),
        mockUserContext
      );

      // Verify auto-subscription
      expect(mockPrisma.ndaSubscription.upsert).toHaveBeenCalledWith({
        where: {
          ndaId_contactId: { ndaId: 'nda-123', contactId: 'poc-123' },
        },
        create: { ndaId: 'nda-123', contactId: 'poc-123' },
        update: {},
      });
    });

    it('should not send notification when user assigns themselves', async () => {
      const selfAssignContext: UserContext = {
        ...mockUserContext,
        contactId: 'poc-123',
      };

      await notifyPocAssignment('nda-123', 'poc-123', 'Opportunity POC', selfAssignContext);

      // Should not query NDA or send email
      expect(mockPrisma.nda.findUnique).not.toHaveBeenCalled();

      const { queueEmail } = await import('../emailService.js');
      expect(queueEmail).not.toHaveBeenCalled();
    });

    it('should not send notification when preference is disabled', async () => {
      // Mock NDA
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        companyName: 'TechCorp',
      } as any);

      // Mock preferences (onAssignedToMe disabled)
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        id: 'pref-1',
        contactId: 'poc-123',
        onNdaCreated: true,
        onNdaEmailed: true,
        onDocumentUploaded: true,
        onStatusChanged: true,
        onFullyExecuted: true,
        onAssignedToMe: false, // Disabled
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await notifyPocAssignment('nda-123', 'poc-123', 'Relationship POC', mockUserContext);

      // Email should not be queued
      const { queueEmail } = await import('../emailService.js');
      expect(queueEmail).not.toHaveBeenCalled();
    });

    it('should handle non-existent NDA gracefully', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue(null);

      // Should not throw, just log warning
      await expect(
        notifyPocAssignment('nonexistent', 'poc-123', 'Contracts POC', mockUserContext)
      ).resolves.toBeUndefined();
    });

    it('should handle non-existent contact gracefully', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        companyName: 'TechCorp',
      } as any);

      // Preferences found
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        id: 'pref-1',
        onAssignedToMe: true,
      } as any);

      // Contact not found
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      // Should not throw
      await expect(
        notifyPocAssignment('nda-123', 'nonexistent', 'Contracts POC', mockUserContext)
      ).resolves.toBeUndefined();
    });
  });

  describe('ASSIGNED_TO_ME event handling', () => {
    it('should include onAssignedToMe in default preferences', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);

      const prefs = await getNotificationPreferences('user-123');

      expect(prefs.onAssignedToMe).toBe(true);
    });

    it('should return onAssignedToMe from existing preferences', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        id: 'pref-1',
        contactId: 'user-123',
        onNdaCreated: true,
        onNdaEmailed: true,
        onDocumentUploaded: true,
        onStatusChanged: true,
        onFullyExecuted: true,
        onAssignedToMe: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const prefs = await getNotificationPreferences('user-123');

      expect(prefs.onAssignedToMe).toBe(false);
    });

    it('should update onAssignedToMe preference', async () => {
      mockPrisma.notificationPreference.upsert.mockResolvedValue({
        id: 'pref-1',
        contactId: 'user-123',
        onNdaCreated: true,
        onNdaEmailed: true,
        onDocumentUploaded: true,
        onStatusChanged: true,
        onFullyExecuted: true,
        onAssignedToMe: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const prefs = await updateNotificationPreferences(
        'user-123',
        { onAssignedToMe: false },
        mockUserContext
      );

      expect(prefs.onAssignedToMe).toBe(false);
    });
  });
});

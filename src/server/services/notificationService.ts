/**
 * Notification Service
 * Story 3.11: Email Notifications to Stakeholders
 *
 * Handles notification preferences and stakeholder notifications
 */

import { prisma } from '../db/index.js';
import { queueEmail } from './emailService.js';
import { auditService, AuditAction } from './auditService.js';
import type { UserContext } from '../types/auth.js';
import { ROLE_NAMES } from '../types/auth.js';
import { buildSecurityFilter } from './ndaService.js';

/**
 * Notification event types
 * Story H-1 Task 13: Added ASSIGNED_TO_ME for POC assignment notifications
 */
export enum NotificationEvent {
  NDA_CREATED = 'nda_created',
  NDA_EMAILED = 'nda_emailed',
  DOCUMENT_UPLOADED = 'document_uploaded',
  STATUS_CHANGED = 'status_changed',
  FULLY_EXECUTED = 'fully_executed',
  // Story H-1 Task 13: Notify when assigned as POC
  ASSIGNED_TO_ME = 'assigned_to_me',
  // Story 10.18: Approval workflow notifications
  APPROVAL_REQUESTED = 'approval_requested',
  NDA_REJECTED = 'nda_rejected',
}

/**
 * Details for a notification
 */
export interface NotificationDetails {
  ndaId: string;
  displayId: number;
  companyName: string;
  event: NotificationEvent;
  changedBy: { id: string; name: string };
  timestamp: Date;
  previousValue?: string;
  newValue?: string;
}

/**
 * Notification preference structure
 * Story H-1 Task 13: Added onAssignedToMe preference
 * NOTE: Requires database migration to add onAssignedToMe column to NotificationPreference table
 */
export interface NotificationPreferences {
  onNdaCreated: boolean;
  onNdaEmailed: boolean;
  onDocumentUploaded: boolean;
  onStatusChanged: boolean;
  onFullyExecuted: boolean;
  // Story H-1 Task 13: Notify when assigned as POC
  onAssignedToMe: boolean;
}

/**
 * Custom error for notification service
 */
export class NotificationServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'NotificationServiceError';
  }
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(
  contactId: string
): Promise<NotificationPreferences> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { contactId },
  });

  // Return defaults if no preferences exist
  // Story H-1 Task 13: Added onAssignedToMe default
  if (!prefs) {
    return {
      onNdaCreated: true,
      onNdaEmailed: true,
      onDocumentUploaded: true,
      onStatusChanged: true,
      onFullyExecuted: true,
      onAssignedToMe: true,
    };
  }

  // Story H-1 Task 13: Added onAssignedToMe
  return {
    onNdaCreated: prefs.onNdaCreated,
    onNdaEmailed: prefs.onNdaEmailed,
    onDocumentUploaded: prefs.onDocumentUploaded,
    onStatusChanged: prefs.onStatusChanged,
    onFullyExecuted: prefs.onFullyExecuted,
    onAssignedToMe: prefs.onAssignedToMe,
  };
}

/**
 * Update notification preferences for a user
 */
export async function updateNotificationPreferences(
  contactId: string,
  preferences: Partial<NotificationPreferences>,
  userContext: UserContext
): Promise<NotificationPreferences> {
  // Verify user can update these preferences (must be self or admin)
  if (contactId !== userContext.contactId && !userContext.permissions.has('admin:manage_users')) {
    throw new NotificationServiceError(
      'Cannot update preferences for another user',
      'UNAUTHORIZED'
    );
  }

  // Story H-1 Task 13: Added onAssignedToMe preference
  const updated = await prisma.notificationPreference.upsert({
    where: { contactId },
    create: {
      contactId,
      onNdaCreated: preferences.onNdaCreated ?? true,
      onNdaEmailed: preferences.onNdaEmailed ?? true,
      onDocumentUploaded: preferences.onDocumentUploaded ?? true,
      onStatusChanged: preferences.onStatusChanged ?? true,
      onFullyExecuted: preferences.onFullyExecuted ?? true,
      onAssignedToMe: preferences.onAssignedToMe ?? true,
    },
    update: {
      ...(preferences.onNdaCreated !== undefined && { onNdaCreated: preferences.onNdaCreated }),
      ...(preferences.onNdaEmailed !== undefined && { onNdaEmailed: preferences.onNdaEmailed }),
      ...(preferences.onDocumentUploaded !== undefined && { onDocumentUploaded: preferences.onDocumentUploaded }),
      ...(preferences.onStatusChanged !== undefined && { onStatusChanged: preferences.onStatusChanged }),
      ...(preferences.onFullyExecuted !== undefined && { onFullyExecuted: preferences.onFullyExecuted }),
      ...(preferences.onAssignedToMe !== undefined && { onAssignedToMe: preferences.onAssignedToMe }),
    },
  });

  // Story H-1 Task 13: Added onAssignedToMe
  return {
    onNdaCreated: updated.onNdaCreated,
    onNdaEmailed: updated.onNdaEmailed,
    onDocumentUploaded: updated.onDocumentUploaded,
    onStatusChanged: updated.onStatusChanged,
    onFullyExecuted: updated.onFullyExecuted,
    onAssignedToMe: updated.onAssignedToMe,
  };
}

/**
 * Subscribe a user to an NDA's notifications
 */
export async function subscribeToNda(
  ndaId: string,
  contactId: string,
  userContext: UserContext
): Promise<void> {
  // Verify the NDA exists and user can access it
  const securityFilter = await buildSecurityFilter(userContext);
  const nda = await prisma.nda.findFirst({
    where: {
      id: ndaId,
      ...securityFilter,
    },
    select: { id: true },
  });

  if (!nda) {
    throw new NotificationServiceError('NDA not found', 'NDA_NOT_FOUND');
  }

  // Create subscription (ignore if already exists)
  await prisma.ndaSubscription.upsert({
    where: {
      ndaId_contactId: { ndaId, contactId },
    },
    create: { ndaId, contactId },
    update: {}, // No update needed
  });
}

/**
 * Unsubscribe a user from an NDA's notifications
 */
export async function unsubscribeFromNda(
  ndaId: string,
  contactId: string,
  userContext: UserContext
): Promise<void> {
  // Verify user can unsubscribe (must be self or admin)
  if (contactId !== userContext.contactId && !userContext.permissions.has('admin:manage_users')) {
    throw new NotificationServiceError(
      'Cannot unsubscribe another user',
      'UNAUTHORIZED'
    );
  }

  await prisma.ndaSubscription.deleteMany({
    where: { ndaId, contactId },
  });
}

/**
 * Get subscriptions for an NDA
 */
export async function getNdaSubscribers(
  ndaId: string,
  userContext: UserContext
): Promise<
  Array<{
    id: string;
    contactId: string;
    contact: { id: string; email: string; firstName: string | null; lastName: string | null };
  }>
> {
  // Verify NDA exists and is within user's access scope
  const securityFilter = await buildSecurityFilter(userContext);
  const nda = await prisma.nda.findFirst({
    where: {
      id: ndaId,
      ...securityFilter,
    },
    select: {
      id: true,
      createdById: true,
      opportunityPocId: true,
      contractsPocId: true,
      relationshipPocId: true,
    },
  });

  if (!nda) {
    throw new NotificationServiceError('NDA not found', 'NDA_NOT_FOUND');
  }

  const isAdmin =
    userContext.roles.includes(ROLE_NAMES.ADMIN) ||
    userContext.permissions.has('admin:manage_users');

  const isPocOrCreator =
    userContext.contactId === nda.createdById ||
    userContext.contactId === nda.opportunityPocId ||
    userContext.contactId === nda.relationshipPocId ||
    (nda.contractsPocId ? userContext.contactId === nda.contractsPocId : false);

  if (!isAdmin && !isPocOrCreator) {
    throw new NotificationServiceError('Access denied', 'UNAUTHORIZED');
  }

  return listNdaSubscribers(ndaId);
}

async function listNdaSubscribers(ndaId: string): Promise<
  Array<{
    id: string;
    contactId: string;
    contact: { id: string; email: string; firstName: string | null; lastName: string | null };
  }>
> {
  return prisma.ndaSubscription.findMany({
    where: { ndaId },
    select: {
      id: true,
      contactId: true,
      contact: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

/**
 * Auto-subscribe POCs when NDA is created
 */
export async function autoSubscribePocs(ndaId: string): Promise<void> {
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    select: {
      opportunityPocId: true,
      contractsPocId: true,
      relationshipPocId: true,
      createdById: true,
    },
  });

  if (!nda) return;

  // Collect unique POC IDs
  const pocIds = new Set<string>();
  pocIds.add(nda.opportunityPocId);
  if (nda.contractsPocId) pocIds.add(nda.contractsPocId);
  pocIds.add(nda.relationshipPocId);
  pocIds.add(nda.createdById);

  // Create subscriptions for all POCs
  const subscriptions = Array.from(pocIds).map((contactId) => ({
    ndaId,
    contactId,
  }));

  await prisma.ndaSubscription.createMany({
    data: subscriptions,
    skipDuplicates: true,
  });
}

/**
 * Map event to preference field
 * Story H-1 Task 13: Added ASSIGNED_TO_ME mapping
 */
function eventToPreferenceField(event: NotificationEvent): keyof NotificationPreferences {
  switch (event) {
    case NotificationEvent.NDA_CREATED:
      return 'onNdaCreated';
    case NotificationEvent.NDA_EMAILED:
      return 'onNdaEmailed';
    case NotificationEvent.DOCUMENT_UPLOADED:
      return 'onDocumentUploaded';
    case NotificationEvent.STATUS_CHANGED:
      return 'onStatusChanged';
    case NotificationEvent.FULLY_EXECUTED:
      return 'onFullyExecuted';
    case NotificationEvent.ASSIGNED_TO_ME:
      return 'onAssignedToMe';
    default:
      return 'onStatusChanged';
  }
}

/**
 * Generate notification email subject
 * Story H-1 Task 13: Added ASSIGNED_TO_ME label
 */
function generateNotificationSubject(details: NotificationDetails): string {
  const eventLabels: Record<NotificationEvent, string> = {
    [NotificationEvent.NDA_CREATED]: 'Created',
    [NotificationEvent.NDA_EMAILED]: 'Emailed',
    [NotificationEvent.DOCUMENT_UPLOADED]: 'Document Uploaded',
    [NotificationEvent.STATUS_CHANGED]: `Now ${details.newValue || 'Updated'}`,
    [NotificationEvent.FULLY_EXECUTED]: 'Fully Executed',
    [NotificationEvent.ASSIGNED_TO_ME]: 'You Were Assigned',
    [NotificationEvent.APPROVAL_REQUESTED]: 'Approval Requested', // Story 10.18
    [NotificationEvent.NDA_REJECTED]: 'Rejected', // Story 10.18
  };

  const label = eventLabels[details.event];
  return `NDA Status Update: ${details.companyName} NDA - ${label}`;
}

/**
 * Generate notification email body
 * Story H-1 Task 13: Added ASSIGNED_TO_ME message
 */
function generateNotificationBody(details: NotificationDetails): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const ndaUrl = `${baseUrl}/nda/${details.ndaId}`;
  const eventMessages: Record<NotificationEvent, string> = {
    [NotificationEvent.NDA_CREATED]: 'A new NDA has been created.',
    [NotificationEvent.NDA_EMAILED]: 'The NDA has been emailed to the partner.',
    [NotificationEvent.DOCUMENT_UPLOADED]: 'A new document has been uploaded to the NDA.',
    [NotificationEvent.STATUS_CHANGED]: `The NDA status has changed from "${details.previousValue}" to "${details.newValue}".`,
    [NotificationEvent.FULLY_EXECUTED]: 'The NDA has been marked as fully executed.',
    [NotificationEvent.ASSIGNED_TO_ME]: `You have been assigned as a Point of Contact for this NDA${details.newValue ? ` (${details.newValue})` : ''}.`,
    [NotificationEvent.APPROVAL_REQUESTED]: 'An NDA has been submitted for your approval. Please review and approve or reject.', // Story 10.18
    [NotificationEvent.NDA_REJECTED]: `Your NDA has been rejected${details.newValue ? `. Reason: ${details.newValue}` : ''}. Please review and resubmit.`, // Story 10.18
  };

  return `Hello,

${eventMessages[details.event]}

NDA Details:
- Reference: #${details.displayId}
- Company: ${details.companyName}
- Changed by: ${details.changedBy.name}
- Time: ${details.timestamp.toLocaleString()}

View NDA: ${ndaUrl}

Best regards,
USMax Notifications

---
You are receiving this email because you are subscribed to this NDA.
To manage your notification preferences, please visit your settings in the system.`;
}

/**
 * Notify stakeholders of an NDA event
 */
export async function notifyStakeholders(
  details: NotificationDetails,
  userContext: UserContext
): Promise<{ notified: number; skipped: number }> {
  // Get all subscribers for this NDA
  const subscribers = await listNdaSubscribers(details.ndaId);

  // Filter out the person who made the change (they don't need notification)
  const filteredSubscribers = subscribers.filter(
    (sub) => sub.contactId !== details.changedBy.id
  );

  let notified = 0;
  let skipped = 0;

  for (const subscriber of filteredSubscribers) {
    // Check notification preferences
    const prefs = await getNotificationPreferences(subscriber.contactId);
    const prefField = eventToPreferenceField(details.event);

    if (!prefs[prefField]) {
      skipped++;
      continue;
    }

    // Send notification email
    try {
      const subject = generateNotificationSubject(details);
      const body = generateNotificationBody(details);

      await queueEmail(
        {
          ndaId: details.ndaId,
          subject,
          toRecipients: [subscriber.contact.email],
          ccRecipients: [],
          bccRecipients: [],
          body,
        },
        userContext
      );

      notified++;
    } catch (error) {
      console.error(`[Notification] Failed to notify ${subscriber.contact.email}:`, error);
      skipped++;
    }
  }

  // Log notification event
  await auditService.log({
    action: AuditAction.NDA_STATUS_CHANGED,
    entityType: 'notification',
    entityId: details.ndaId,
    userId: userContext.contactId,
    details: {
      event: details.event,
      notified,
      skipped,
    },
  });

  return { notified, skipped };
}

/**
 * Get subscriptions for a user
 */
export async function getUserSubscriptions(
  contactId: string,
  userContext: UserContext
): Promise<
  Array<{
    id: string;
    ndaId: string;
    nda: { id: string; displayId: number; companyName: string; status: string };
    createdAt: Date;
  }>
> {
  return prisma.ndaSubscription.findMany({
    where: {
      contactId,
      nda: {
        ...(await buildSecurityFilter(userContext)),
      },
    },
    select: {
      id: true,
      ndaId: true,
      createdAt: true,
      nda: {
        select: {
          id: true,
          displayId: true,
          companyName: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Notify a user when they are assigned as a POC for an NDA
 * Story H-1 Task 13: POC assignment notifications
 *
 * @param ndaId - The NDA the user is being assigned to
 * @param assignedContactId - The user being assigned
 * @param pocType - Type of POC role (e.g., 'Opportunity POC', 'Contracts POC')
 * @param assignedBy - User context of who made the assignment
 */
export async function notifyPocAssignment(
  ndaId: string,
  assignedContactId: string,
  pocType: string,
  assignedBy: UserContext
): Promise<void> {
  // Don't notify if user is assigning themselves
  if (assignedContactId === assignedBy.contactId) {
    return;
  }

  // Get NDA details
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    select: {
      id: true,
      displayId: true,
      companyName: true,
    },
  });

  if (!nda) {
    console.warn('[Notification] Cannot notify POC assignment - NDA not found:', ndaId);
    return;
  }

  // Check user's notification preferences
  const prefs = await getNotificationPreferences(assignedContactId);
  if (!prefs.onAssignedToMe) {
    console.log('[Notification] POC assignment notification skipped - user preference disabled');
    return;
  }

  // Get assigned user's email
  const assignedContact = await prisma.contact.findUnique({
    where: { id: assignedContactId },
    select: { email: true, firstName: true, lastName: true },
  });

  if (!assignedContact) {
    console.warn('[Notification] Cannot notify POC assignment - contact not found:', assignedContactId);
    return;
  }

  // Get assigner's name
  const assigner = await prisma.contact.findUnique({
    where: { id: assignedBy.contactId },
    select: { firstName: true, lastName: true },
  });
  const assignerName = assigner
    ? `${assigner.firstName || ''} ${assigner.lastName || ''}`.trim() || 'A user'
    : 'A user';

  // Build and send notification
  const details: NotificationDetails = {
    ndaId: nda.id,
    displayId: nda.displayId,
    companyName: nda.companyName,
    event: NotificationEvent.ASSIGNED_TO_ME,
    changedBy: { id: assignedBy.contactId, name: assignerName },
    timestamp: new Date(),
    newValue: pocType,
  };

  try {
    const subject = generateNotificationSubject(details);
    const body = generateNotificationBody(details);

    await queueEmail(
      {
        ndaId: nda.id,
        subject,
        toRecipients: [assignedContact.email],
        ccRecipients: [],
        bccRecipients: [],
        body,
      },
      assignedBy
    );

    // Auto-subscribe the POC to future notifications
    await prisma.ndaSubscription.upsert({
      where: {
        ndaId_contactId: { ndaId: nda.id, contactId: assignedContactId },
      },
      create: { ndaId: nda.id, contactId: assignedContactId },
      update: {},
    });

    console.log(`[Notification] POC assignment notification sent to ${assignedContact.email} for NDA #${nda.displayId}`);
  } catch (error) {
    console.error('[Notification] Failed to send POC assignment notification:', error);
  }
}

/**
 * Send test notification to specified users
 * Story 9.17: Send Test Notification with Recipient Selection
 *
 * @param notificationType - Type of notification to send
 * @param recipientIds - Array of contact IDs to send to
 * @param userContext - Admin user sending the test
 * @returns Number of notifications sent
 */
export async function sendTestNotification(
  notificationType: NotificationEvent,
  recipientIds: string[],
  userContext: UserContext
): Promise<number> {
  // Create mock NDA details for test notification
  const mockDetails: NotificationDetails = {
    ndaId: 'test-nda-' + Date.now(),
    displayId: 99999,
    companyName: 'Test Company Inc.',
    event: notificationType,
    changedBy: {
      id: userContext.contactId,
      name: userContext.name || 'Test User',
    },
    timestamp: new Date(),
    previousValue: notificationType === NotificationEvent.STATUS_CHANGED ? 'Draft' : undefined,
    newValue: notificationType === NotificationEvent.STATUS_CHANGED ? 'Sent' :
              notificationType === NotificationEvent.ASSIGNED_TO_ME ? 'Opportunity POC' :
              notificationType === NotificationEvent.NDA_REJECTED ? 'Missing required fields' : undefined,
  };

  let sent = 0;

  for (const recipientId of recipientIds) {
    try {
      // Get recipient details
      const recipient = await prisma.contact.findUnique({
        where: { id: recipientId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!recipient) {
        console.warn(`[TestNotification] Recipient not found: ${recipientId}`);
        continue;
      }

      // Generate test notification
      let subject = generateNotificationSubject(mockDetails);
      let body = generateNotificationBody(mockDetails);

      // Add TEST prefix to subject (AC5)
      subject = `[TEST] ${subject}`;

      // Add test disclaimer to body (AC5)
      body = `⚠️  THIS IS A TEST NOTIFICATION  ⚠️
This notification was sent by ${userContext.name || userContext.email} to test the notification system.
The NDA details below are simulated and do not represent an actual NDA.

---

${body}

---

⚠️  THIS IS A TEST NOTIFICATION  ⚠️`;

      // Send test email
      await queueEmail(
        {
          ndaId: mockDetails.ndaId,
          subject,
          toRecipients: [recipient.email],
          ccRecipients: [],
          bccRecipients: [],
          body,
        },
        userContext
      );

      sent++;
    } catch (error) {
      console.error(`[TestNotification] Failed to send to recipient ${recipientId}:`, error);
    }
  }

  // Log test notification event (AC4)
  await auditService.log({
    action: AuditAction.TEST_NOTIFICATION_SENT,
    entityType: 'notification',
    entityId: null,
    userId: userContext.contactId,
    details: {
      notificationType,
      recipientCount: sent,
      recipientIds,
    },
    ipAddress: undefined,
    userAgent: undefined,
  });

  return sent;
}

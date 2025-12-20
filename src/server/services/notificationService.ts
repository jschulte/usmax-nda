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
 */
export enum NotificationEvent {
  NDA_CREATED = 'nda_created',
  NDA_EMAILED = 'nda_emailed',
  DOCUMENT_UPLOADED = 'document_uploaded',
  STATUS_CHANGED = 'status_changed',
  FULLY_EXECUTED = 'fully_executed',
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
 */
export interface NotificationPreferences {
  onNdaCreated: boolean;
  onNdaEmailed: boolean;
  onDocumentUploaded: boolean;
  onStatusChanged: boolean;
  onFullyExecuted: boolean;
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
  if (!prefs) {
    return {
      onNdaCreated: true,
      onNdaEmailed: true,
      onDocumentUploaded: true,
      onStatusChanged: true,
      onFullyExecuted: true,
    };
  }

  return {
    onNdaCreated: prefs.onNdaCreated,
    onNdaEmailed: prefs.onNdaEmailed,
    onDocumentUploaded: prefs.onDocumentUploaded,
    onStatusChanged: prefs.onStatusChanged,
    onFullyExecuted: prefs.onFullyExecuted,
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

  const updated = await prisma.notificationPreference.upsert({
    where: { contactId },
    create: {
      contactId,
      onNdaCreated: preferences.onNdaCreated ?? true,
      onNdaEmailed: preferences.onNdaEmailed ?? true,
      onDocumentUploaded: preferences.onDocumentUploaded ?? true,
      onStatusChanged: preferences.onStatusChanged ?? true,
      onFullyExecuted: preferences.onFullyExecuted ?? true,
    },
    update: {
      ...(preferences.onNdaCreated !== undefined && { onNdaCreated: preferences.onNdaCreated }),
      ...(preferences.onNdaEmailed !== undefined && { onNdaEmailed: preferences.onNdaEmailed }),
      ...(preferences.onDocumentUploaded !== undefined && { onDocumentUploaded: preferences.onDocumentUploaded }),
      ...(preferences.onStatusChanged !== undefined && { onStatusChanged: preferences.onStatusChanged }),
      ...(preferences.onFullyExecuted !== undefined && { onFullyExecuted: preferences.onFullyExecuted }),
    },
  });

  return {
    onNdaCreated: updated.onNdaCreated,
    onNdaEmailed: updated.onNdaEmailed,
    onDocumentUploaded: updated.onDocumentUploaded,
    onStatusChanged: updated.onStatusChanged,
    onFullyExecuted: updated.onFullyExecuted,
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
  const nda = await prisma.nda.findFirst({
    where: {
      id: ndaId,
      ...buildSecurityFilter(userContext),
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
  const nda = await prisma.nda.findFirst({
    where: {
      id: ndaId,
      ...buildSecurityFilter(userContext),
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
    userContext.permissions.has('admin:bypass') ||
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
    default:
      return 'onStatusChanged';
  }
}

/**
 * Generate notification email subject
 */
function generateNotificationSubject(details: NotificationDetails): string {
  const eventLabels: Record<NotificationEvent, string> = {
    [NotificationEvent.NDA_CREATED]: 'Created',
    [NotificationEvent.NDA_EMAILED]: 'Emailed',
    [NotificationEvent.DOCUMENT_UPLOADED]: 'Document Uploaded',
    [NotificationEvent.STATUS_CHANGED]: `Now ${details.newValue || 'Updated'}`,
    [NotificationEvent.FULLY_EXECUTED]: 'Fully Executed',
  };

  const label = eventLabels[details.event];
  return `NDA Status Update: ${details.companyName} NDA - ${label}`;
}

/**
 * Generate notification email body
 */
function generateNotificationBody(details: NotificationDetails): string {
  const eventMessages: Record<NotificationEvent, string> = {
    [NotificationEvent.NDA_CREATED]: 'A new NDA has been created.',
    [NotificationEvent.NDA_EMAILED]: 'The NDA has been emailed to the partner.',
    [NotificationEvent.DOCUMENT_UPLOADED]: 'A new document has been uploaded to the NDA.',
    [NotificationEvent.STATUS_CHANGED]: `The NDA status has changed from "${details.previousValue}" to "${details.newValue}".`,
    [NotificationEvent.FULLY_EXECUTED]: 'The NDA has been marked as fully executed.',
  };

  return `Hello,

${eventMessages[details.event]}

NDA Details:
- Reference: #${details.displayId}
- Company: ${details.companyName}
- Changed by: ${details.changedBy.name}
- Time: ${details.timestamp.toLocaleString()}

You can view the full NDA details in the USMax NDA Management System.

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
        ...buildSecurityFilter(userContext),
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

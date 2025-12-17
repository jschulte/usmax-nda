/**
 * Email Service
 * Story 3.10: Email Composition & Sending
 *
 * Handles email composition, queuing, and sending via AWS SES
 */

import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { prisma } from '../db/index.js';
import { auditService, AuditAction } from './auditService.js';
import { EmailStatus } from '../../generated/prisma/index.js';
import type { UserContext } from '../types/auth.js';

// Re-export for use in other modules
export { EmailStatus };

/**
 * Custom error for email service operations
 */
export class EmailServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'EmailServiceError';
  }
}

/**
 * Email preview data for composer
 */
export interface EmailPreview {
  subject: string;
  toRecipients: string[];
  ccRecipients: string[];
  bccRecipients: string[];
  body: string;
  attachments: Array<{
    filename: string;
    documentId: string;
  }>;
}

/**
 * Parameters for composing an email
 */
export interface ComposeEmailParams {
  ndaId: string;
  subject?: string;
  toRecipients?: string[];
  ccRecipients?: string[];
  bccRecipients?: string[];
  body?: string;
}

/**
 * Parameters for sending an email
 */
export interface SendEmailParams {
  ndaId: string;
  subject: string;
  toRecipients: string[];
  ccRecipients: string[];
  bccRecipients: string[];
  body: string;
}

// SES client configuration
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Default CC/BCC configuration (can be moved to system config later)
const DEFAULT_CC_RECIPIENTS: string[] = [];
const DEFAULT_BCC_RECIPIENTS: string[] = [];

/**
 * Generate email subject line from NDA data
 */
export function generateEmailSubject(nda: {
  companyName: string;
  abbreviatedName: string;
  agencyOfficeName?: string | null;
  agencyGroup?: { name: string };
}): string {
  const agency = nda.agencyOfficeName || nda.agencyGroup?.name || 'Agency';
  return `NDA from USMax - for ${nda.companyName} for ${nda.abbreviatedName} at ${agency}`;
}

/**
 * Generate email body from NDA data (basic template)
 */
export function generateEmailBody(nda: {
  displayId: number;
  companyName: string;
  abbreviatedName: string;
  agencyOfficeName?: string | null;
  relationshipPoc?: { firstName?: string | null; lastName?: string | null };
}): string {
  const pocName = nda.relationshipPoc
    ? `${nda.relationshipPoc.firstName || ''} ${nda.relationshipPoc.lastName || ''}`.trim() || 'Partner'
    : 'Partner';

  return `Dear ${pocName},

Please find attached the Non-Disclosure Agreement (NDA) for ${nda.companyName} regarding ${nda.abbreviatedName}.

Please review the attached document, sign, and return at your earliest convenience.

If you have any questions or concerns, please don't hesitate to reach out.

Best regards,
USMax

NDA Reference: #${nda.displayId}`;
}

/**
 * Get email preview data for the composer
 */
export async function getEmailPreview(
  ndaId: string,
  userContext: UserContext
): Promise<EmailPreview> {
  // Fetch NDA with related data
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    include: {
      agencyGroup: true,
      relationshipPoc: true,
      documents: {
        where: { documentType: 'GENERATED' },
        orderBy: { uploadedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!nda) {
    throw new EmailServiceError('NDA not found', 'NDA_NOT_FOUND');
  }

  // Get relationship POC email for TO field
  const toRecipients: string[] = [];
  if (nda.relationshipPoc?.email) {
    toRecipients.push(nda.relationshipPoc.email);
  }

  // Get current user for CC
  const currentUser = await prisma.contact.findUnique({
    where: { id: userContext.userId },
    select: { email: true },
  });

  const ccRecipients = [...DEFAULT_CC_RECIPIENTS];
  if (currentUser?.email) {
    ccRecipients.push(currentUser.email);
  }

  // Generate subject and body
  const subject = generateEmailSubject(nda);
  const body = generateEmailBody(nda);

  // Get attachments
  const attachments = nda.documents.map((doc) => ({
    filename: doc.filename,
    documentId: doc.id,
  }));

  return {
    subject,
    toRecipients,
    ccRecipients,
    bccRecipients: [...DEFAULT_BCC_RECIPIENTS],
    body,
    attachments,
  };
}

/**
 * Queue an email for sending
 */
export async function queueEmail(
  params: SendEmailParams,
  userContext: UserContext
): Promise<{ emailId: string; status: EmailStatus }> {
  const { ndaId, subject, toRecipients, ccRecipients, bccRecipients, body } = params;

  // Validate NDA exists
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    select: { id: true, displayId: true },
  });

  if (!nda) {
    throw new EmailServiceError('NDA not found', 'NDA_NOT_FOUND');
  }

  // Validate recipients
  if (toRecipients.length === 0) {
    throw new EmailServiceError('At least one recipient is required', 'NO_RECIPIENTS');
  }

  // Create email record
  const email = await prisma.ndaEmail.create({
    data: {
      ndaId,
      subject,
      toRecipients,
      ccRecipients,
      bccRecipients,
      body,
      sentById: userContext.userId,
      status: 'QUEUED',
    },
  });

  // Log audit event
  await auditService.log({
    action: AuditAction.EMAIL_QUEUED,
    entityType: 'nda_email',
    entityId: email.id,
    userId: userContext.userId,
    details: {
      ndaId,
      ndaDisplayId: nda.displayId,
      subject,
      toRecipients,
      ccRecipients: ccRecipients.length,
      bccRecipients: bccRecipients.length,
    },
  });

  // In production, we would queue to pg-boss here
  // For now, attempt immediate send
  try {
    await sendEmail(email.id, userContext);
    return { emailId: email.id, status: EmailStatus.SENT };
  } catch (error) {
    // Email will remain queued for retry
    return { emailId: email.id, status: EmailStatus.QUEUED };
  }
}

/**
 * Send an email via SES
 */
export async function sendEmail(
  emailId: string,
  userContext: UserContext
): Promise<void> {
  const email = await prisma.ndaEmail.findUnique({
    where: { id: emailId },
    include: {
      nda: {
        include: {
          documents: {
            where: { documentType: 'GENERATED' },
            orderBy: { uploadedAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!email) {
    throw new EmailServiceError('Email not found', 'EMAIL_NOT_FOUND');
  }

  // Build MIME message
  const fromEmail = process.env.SES_FROM_EMAIL || 'nda@usmax.com';
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  let rawMessage = `From: ${fromEmail}\r\n`;
  rawMessage += `To: ${email.toRecipients.join(', ')}\r\n`;
  if (email.ccRecipients.length > 0) {
    rawMessage += `Cc: ${email.ccRecipients.join(', ')}\r\n`;
  }
  if (email.bccRecipients.length > 0) {
    rawMessage += `Bcc: ${email.bccRecipients.join(', ')}\r\n`;
  }
  rawMessage += `Subject: ${email.subject}\r\n`;
  rawMessage += `MIME-Version: 1.0\r\n`;
  rawMessage += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

  // Body part
  rawMessage += `--${boundary}\r\n`;
  rawMessage += `Content-Type: text/plain; charset=UTF-8\r\n`;
  rawMessage += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
  rawMessage += `${email.body}\r\n\r\n`;

  // End boundary
  rawMessage += `--${boundary}--\r\n`;

  try {
    // Send via SES
    const command = new SendRawEmailCommand({
      RawMessage: { Data: Buffer.from(rawMessage) },
    });

    const result = await sesClient.send(command);

    // Update email record with success
    await prisma.ndaEmail.update({
      where: { id: emailId },
      data: {
        status: 'SENT',
        sesMessageId: result.MessageId,
      },
    });

    // Auto-transition NDA status to EMAILED
    await prisma.nda.update({
      where: { id: email.ndaId },
      data: { status: 'EMAILED' },
    });

    // Record status change in history
    await prisma.ndaStatusHistory.create({
      data: {
        ndaId: email.ndaId,
        status: 'EMAILED',
        changedById: userContext.userId,
      },
    });

    // Log success
    await auditService.log({
      action: AuditAction.EMAIL_SENT,
      entityType: 'nda_email',
      entityId: emailId,
      userId: userContext.userId,
      details: {
        ndaId: email.ndaId,
        sesMessageId: result.MessageId,
      },
    });
  } catch (error) {
    // Update email record with failure
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.ndaEmail.update({
      where: { id: emailId },
      data: {
        status: 'FAILED',
        retryCount: { increment: 1 },
        lastError: errorMessage,
      },
    });

    // Log failure
    await auditService.log({
      action: AuditAction.EMAIL_FAILED,
      entityType: 'nda_email',
      entityId: emailId,
      userId: userContext.userId,
      details: {
        ndaId: email.ndaId,
        error: errorMessage,
      },
    });

    throw new EmailServiceError(`Failed to send email: ${errorMessage}`, 'SEND_FAILED');
  }
}

/**
 * Get emails for an NDA
 */
export async function getNdaEmails(ndaId: string): Promise<
  Array<{
    id: string;
    subject: string;
    toRecipients: string[];
    sentAt: Date;
    status: EmailStatus;
    sentBy: { id: string; firstName: string | null; lastName: string | null };
  }>
> {
  const emails = await prisma.ndaEmail.findMany({
    where: { ndaId },
    orderBy: { sentAt: 'desc' },
    select: {
      id: true,
      subject: true,
      toRecipients: true,
      sentAt: true,
      status: true,
      sentBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return emails;
}

/**
 * Retry failed emails (for background job)
 */
export async function retryFailedEmails(): Promise<number> {
  const MAX_RETRIES = 3;

  const failedEmails = await prisma.ndaEmail.findMany({
    where: {
      status: 'FAILED',
      retryCount: { lt: MAX_RETRIES },
    },
    include: {
      nda: { select: { id: true } },
    },
  });

  let retried = 0;
  for (const email of failedEmails) {
    try {
      // Create a system context for retry
      const systemContext: UserContext = {
        userId: email.sentById,
        email: '',
        permissions: new Set(['nda:send_email']),
        agencyScope: { type: 'all' as const, agencyGroupIds: [], subagencyIds: [] },
      };

      await sendEmail(email.id, systemContext);
      retried++;
    } catch {
      // Will be retried on next run
    }
  }

  return retried;
}

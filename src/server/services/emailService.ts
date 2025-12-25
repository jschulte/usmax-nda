/**
 * Email Service
 * Story 3.10: Email Composition & Sending
 *
 * Handles email composition, queuing, and sending via AWS SES
 */

import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { prisma } from '../db/index.js';
import { auditService, AuditAction } from './auditService.js';
import { attemptAutoTransition, StatusTrigger } from './statusTransitionService.js';
import { EmailStatus } from '../../generated/prisma/index.js';
import type { UserContext } from '../types/auth.js';
import { buildSecurityFilter } from './ndaService.js';
import { getEmailDefaults, getEmailAdminAlerts } from './systemConfigService.js';
import { enqueueEmailJob, isEmailQueueReady } from '../jobs/emailQueue.js';
import { POC_PATTERNS } from '../validators/pocValidator.js';
import { getDocumentContent } from './s3Service.js';
import { getDefaultEmailTemplate, getEmailTemplate } from './emailTemplateService.js';
import { reportError } from './errorReportingService.js';

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

function buildSystemContext(contactId: string): UserContext {
  return {
    id: '',
    email: '',
    contactId,
    permissions: new Set(['nda:send_email']),
    roles: [],
    authorizedAgencyGroups: [],
    authorizedSubagencies: [],
  };
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
  templateId?: string | null;
  templateName?: string | null;
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
  templateId?: string;
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
  templateId?: string;
}

// SES client configuration
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
});


function assertNoCrlf(value: string, fieldName: string): void {
  if (/[\r\n]/.test(value)) {
    throw new EmailServiceError(`${fieldName} contains invalid characters`, 'VALIDATION_ERROR');
  }
}

function sanitizeFilename(value: string): string {
  const stripped = value.replace(/[\r\n]/g, '').replace(/"/g, "'");
  return stripped || 'attachment';
}

function normalizeRecipientList(value: unknown, fieldName: string): string[] {
  const rawList = Array.isArray(value) ? value : value ? [value] : [];

  const recipients = rawList
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);

  if (recipients.length === 0) return [];

  for (const addr of recipients) {
    assertNoCrlf(addr, fieldName);
    if (!POC_PATTERNS.email.test(addr)) {
      throw new EmailServiceError(`Invalid email address in ${fieldName}`, 'VALIDATION_ERROR');
    }
  }

  // Avoid accidental abuse (SES has limits; keep conservative here)
  if (recipients.length > 50) {
    throw new EmailServiceError(`Too many recipients in ${fieldName}`, 'VALIDATION_ERROR');
  }

  return recipients;
}

async function getAccessibleNdaOrThrow<T extends object>(
  ndaId: string,
  userContext: UserContext,
  opts: { include?: T; select?: T } = {}
): Promise<any> {
  const securityFilter = await buildSecurityFilter(userContext);
  const nda = await prisma.nda.findFirst({
    where: {
      id: ndaId,
      ...securityFilter,
    },
    ...(opts as any),
  });

  if (!nda) {
    // Return 404-style error to avoid leaking NDA existence across agencies.
    throw new EmailServiceError('NDA not found', 'NDA_NOT_FOUND');
  }

  return nda;
}

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

function buildEmailSignature(nda: {
  opportunityPoc?: { firstName?: string | null; lastName?: string | null; emailSignature?: string | null };
}): string {
  const signature = nda.opportunityPoc?.emailSignature?.trim();
  if (signature) return signature;

  const name = [nda.opportunityPoc?.firstName, nda.opportunityPoc?.lastName]
    .filter(Boolean)
    .join(' ');

  return `USMax${name ? `\n${name}` : ''}`;
}

function buildEmailMergeFields(nda: {
  displayId: number;
  companyName: string;
  abbreviatedName: string;
  agencyOfficeName?: string | null;
  agencyGroup?: { name: string };
  relationshipPoc?: { firstName?: string | null; lastName?: string | null };
  opportunityPoc?: { firstName?: string | null; lastName?: string | null; emailSignature?: string | null };
}): Record<string, string> {
  const relationshipName = nda.relationshipPoc
    ? `${nda.relationshipPoc.firstName || ''} ${nda.relationshipPoc.lastName || ''}`.trim()
    : '';

  const opportunityName = nda.opportunityPoc
    ? `${nda.opportunityPoc.firstName || ''} ${nda.opportunityPoc.lastName || ''}`.trim()
    : '';

  return {
    displayId: String(nda.displayId),
    companyName: nda.companyName,
    abbreviatedName: nda.abbreviatedName,
    agencyOfficeName: nda.agencyOfficeName || '',
    agencyGroupName: nda.agencyGroup?.name || '',
    relationshipPocName: relationshipName,
    opportunityPocName: opportunityName,
    signature: buildEmailSignature(nda),
  };
}

function mergeEmailTemplateText(template: string, fields: Record<string, string>): string {
  return template.replace(/\\{\\{(\\w+)\\}\\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      return fields[key] ?? '';
    }
    return match;
  });
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
  opportunityPoc?: { firstName?: string | null; lastName?: string | null; emailSignature?: string | null; email?: string | null };
  effectiveDate?: Date | string | null;
  usMaxPosition?: string | null;
  ndaType?: string | null;
  agencyGroup?: { name?: string } | null;
}): string {
  const pocName = nda.relationshipPoc
    ? `${nda.relationshipPoc.firstName || ''} ${nda.relationshipPoc.lastName || ''}`.trim() || 'Partner'
    : 'Partner';

  const signature = buildEmailSignature(nda);

  // Story 9.15: Enhanced email body with more details
  const effectiveDateStr = nda.effectiveDate
    ? new Date(nda.effectiveDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Upon execution';

  const positionLabels: Record<string, string> = {
    PRIME: 'Prime Contractor',
    SUB_CONTRACTOR: 'Sub-contractor',
    OTHER: 'Other'
  };
  const usMaxPos = nda.usMaxPosition ? (positionLabels[nda.usMaxPosition] || nda.usMaxPosition) : 'Prime Contractor';

  const typeLabels: Record<string, string> = {
    MUTUAL: 'Mutual NDA',
    CONSULTANT: 'Consultant Agreement'
  };
  const ndaTypeLabel = nda.ndaType ? (typeLabels[nda.ndaType] || nda.ndaType) : 'Mutual NDA';

  const agencyName = nda.agencyGroup?.name || (nda.agencyOfficeName || 'Government Agency');

  return `Dear ${pocName},

Please find attached the Non-Disclosure Agreement for your review and signature.

NDA DETAILS:
• Company: ${nda.companyName}
• Project: ${nda.abbreviatedName}
• USmax Position: ${usMaxPos}
• Agency: ${agencyName}
• Effective Date: ${effectiveDateStr}
• Agreement Type: ${ndaTypeLabel}

NEXT STEPS:
1. Review the attached NDA document carefully
2. Sign where indicated
3. Return the executed copy to us

Please complete this review at your earliest convenience. If you have any questions or need clarification, please contact:

${nda.opportunityPoc ? `${nda.opportunityPoc.firstName || ''} ${nda.opportunityPoc.lastName || ''}`.trim() : 'Our team'}
${nda.opportunityPoc?.email ? `Email: ${nda.opportunityPoc.email}` : ''}

Best regards,
${signature}

Reference: NDA #${nda.displayId}`;
}

/**
 * Get email preview data for the composer
 */
export async function getEmailPreview(
  ndaId: string,
  userContext: UserContext,
  templateId?: string
): Promise<EmailPreview> {
  // Fetch NDA with related data
  const nda = await getAccessibleNdaOrThrow(ndaId, userContext, {
    include: {
      agencyGroup: true,
      relationshipPoc: true,
      opportunityPoc: {
        select: {
          firstName: true,
          lastName: true,
          emailSignature: true,
        },
      },
      documents: {
        where: { documentType: 'GENERATED' },
        orderBy: { uploadedAt: 'desc' },
        take: 1,
      },
    },
  });

  // Get relationship POC email for TO field
  const toRecipients: string[] = [];
  if (nda.relationshipPoc?.email) {
    toRecipients.push(nda.relationshipPoc.email);
  }

  // Get current user for CC
  const currentUser = await prisma.contact.findUnique({
    where: { id: userContext.contactId },
    select: { email: true },
  });

  const { defaultCc, defaultBcc } = await getEmailDefaults();

  const ccRecipients = [...defaultCc];
  if (currentUser?.email) {
    ccRecipients.push(currentUser.email);
  }

  // Resolve email template (if provided or default)
  let template = null;
  if (templateId) {
    template = await getEmailTemplate(templateId);
    if (!template || !template.isActive) {
      throw new EmailServiceError('Email template not found', 'TEMPLATE_NOT_FOUND');
    }
  } else {
    template = await getDefaultEmailTemplate();
  }

  // Generate subject and body (template merge if available)
  let subject: string;
  let body: string;
  if (template) {
    const fields = buildEmailMergeFields(nda);
    subject = mergeEmailTemplateText(template.subject, fields).trim();
    body = mergeEmailTemplateText(template.body, fields).trim();
  } else {
    subject = '';
    body = '';
  }

  if (!subject) {
    subject = generateEmailSubject(nda);
  }
  if (!body) {
    body = generateEmailBody(nda);
  }

  // Get attachments
  const attachments = nda.documents.map((doc: { filename: string; id: string }) => ({
    filename: doc.filename,
    documentId: doc.id,
  }));

  // Story 10.9: Get subscribed contacts for BCC (Notify on NDA Changes)
  const subscriptions = await prisma.ndaSubscription.findMany({
    where: { ndaId },
    include: {
      contact: {
        select: { email: true },
      },
    },
  });

  const subscribedEmails = subscriptions
    .map((sub) => sub.contact.email)
    .filter((email): email is string => !!email);

  return {
    subject,
    toRecipients,
    ccRecipients,
    bccRecipients: [...defaultBcc, ...subscribedEmails], // Story 10.9: Include subscribers
    body,
    templateId: template?.id ?? null,
    templateName: template?.name ?? null,
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
  const { ndaId, subject, toRecipients, ccRecipients, bccRecipients, body, templateId } = params;

  // Validate NDA exists and is accessible
  const nda = await getAccessibleNdaOrThrow(ndaId, userContext, {
    select: {
      id: true,
      displayId: true,
      documents: {
        where: { documentType: 'GENERATED' },
        orderBy: { uploadedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!nda.documents || nda.documents.length === 0) {
    throw new EmailServiceError('No generated document available to attach', 'NO_ATTACHMENT');
  }

  const safeSubject = String(subject ?? '').trim();
  if (!safeSubject) {
    throw new EmailServiceError('Subject is required', 'VALIDATION_ERROR');
  }
  assertNoCrlf(safeSubject, 'Subject');
  if (safeSubject.length > 255) {
    throw new EmailServiceError('Subject is too long', 'VALIDATION_ERROR');
  }

  const safeTo = normalizeRecipientList(toRecipients, 'To');
  const safeCc = normalizeRecipientList(ccRecipients, 'Cc');
  const safeBcc = normalizeRecipientList(bccRecipients, 'Bcc');

  // Validate recipients
  if (safeTo.length === 0) {
    throw new EmailServiceError('At least one recipient is required', 'NO_RECIPIENTS');
  }

  const safeBody = String(body ?? '');

  let resolvedTemplateId: string | null = null;
  if (templateId) {
    const template = await getEmailTemplate(templateId);
    if (!template || !template.isActive) {
      throw new EmailServiceError('Email template not found', 'TEMPLATE_NOT_FOUND');
    }
    resolvedTemplateId = template.id;
  }

  // Create email record
  const email = await prisma.ndaEmail.create({
    data: {
      ndaId,
      subject: safeSubject,
      toRecipients: safeTo,
      ccRecipients: safeCc,
      bccRecipients: safeBcc,
      body: safeBody,
      templateId: resolvedTemplateId,
      sentById: userContext.contactId,
      status: 'QUEUED',
    },
  });

  // Log audit event
  await auditService.log({
    action: AuditAction.EMAIL_QUEUED,
    entityType: 'nda_email',
    entityId: email.id,
    userId: userContext.contactId,
    details: {
      ndaId,
      ndaDisplayId: nda.displayId,
      subject,
      toRecipients,
      ccRecipients: ccRecipients.length,
      bccRecipients: bccRecipients.length,
    },
  });

  const jobId = await enqueueEmailJob({ emailId: email.id });
  if (jobId) {
    return { emailId: email.id, status: EmailStatus.QUEUED };
  }

  if (!isEmailQueueReady()) {
    console.warn('[EmailService] Email queue not ready, attempting immediate send.');
  }

  try {
    await sendEmail(email.id, userContext);
    return { emailId: email.id, status: EmailStatus.SENT };
  } catch (error) {
    console.error('[EmailService] Failed to send email via SES', error);
    // Email will remain queued for retry when queue is available
    return { emailId: email.id, status: EmailStatus.QUEUED };
  }
}

/**
 * Send an email via SES
 */
export async function sendEmail(
  emailId: string,
  userContext?: UserContext
): Promise<void> {
  const email = await prisma.ndaEmail.findUnique({
    where: { id: emailId },
    include: {
      sentBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      nda: {
        select: {
          id: true,
          displayId: true,
          companyName: true,
          status: true,
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

  const effectiveContext = userContext ?? buildSystemContext(email.sentById);

  // Build MIME message
  const fromEmail = process.env.SES_FROM_EMAIL || 'nda@usmax.com';
  assertNoCrlf(fromEmail, 'From');
  assertNoCrlf(email.subject, 'Subject');
  for (const addr of [...email.toRecipients, ...email.ccRecipients, ...email.bccRecipients]) {
    assertNoCrlf(addr, 'Recipient');
    if (!POC_PATTERNS.email.test(addr)) {
      throw new EmailServiceError('Invalid recipient email address', 'VALIDATION_ERROR');
    }
  }
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

  const attachment = email.nda.documents[0];
  if (!attachment) {
    throw new EmailServiceError('No generated document available to attach', 'NO_ATTACHMENT');
  }

  const attachmentFilename = sanitizeFilename(attachment.filename);
  const attachmentContentType = attachment.fileType || 'application/octet-stream';
  assertNoCrlf(attachmentContentType, 'Attachment content type');

  const attachmentContent = await getDocumentContent(attachment.s3Key);
  const attachmentBase64 = attachmentContent.toString('base64');

  rawMessage += `--${boundary}\r\n`;
  rawMessage += `Content-Type: ${attachmentContentType}; name="${attachmentFilename}"\r\n`;
  rawMessage += `Content-Disposition: attachment; filename="${attachmentFilename}"\r\n`;
  rawMessage += `Content-Transfer-Encoding: base64\r\n\r\n`;
  rawMessage += `${attachmentBase64}\r\n\r\n`;

  // End boundary
  rawMessage += `--${boundary}--\r\n`;

  try {
    // Check if we're in mock email mode (no SES credentials or explicitly set)
    const useMockEmail = process.env.USE_MOCK_EMAIL === 'true' ||
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.SES_FROM_EMAIL;

    let messageId: string;

    if (useMockEmail) {
      // Log email details for demo/testing - this shows what WOULD be sent
      console.log('\n' + '='.repeat(60));
      console.log('[EmailService] MOCK EMAIL MODE - Email would be sent:');
      console.log('='.repeat(60));
      console.log(`  From: ${fromEmail}`);
      console.log(`  To: ${email.toRecipients.join(', ')}`);
      if (email.ccRecipients?.length) console.log(`  CC: ${email.ccRecipients.join(', ')}`);
      console.log(`  Subject: ${email.subject}`);
      console.log(`  NDA: ${email.nda.companyName} (ID: ${email.nda.displayId})`);
      console.log(`  Attachment: ${attachmentFilename} (${Math.round(attachmentBase64.length * 0.75 / 1024)}KB)`);
      console.log(`  Body Preview: ${email.body.substring(0, 200)}${email.body.length > 200 ? '...' : ''}`);
      console.log('='.repeat(60) + '\n');

      // Generate a mock message ID
      messageId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    } else {
      // Send via SES
      const command = new SendRawEmailCommand({
        RawMessage: { Data: Buffer.from(rawMessage) },
      });

      const result = await sesClient.send(command);
      messageId = result.MessageId || `ses-${Date.now()}`;
    }

    // Update email record with success
    await prisma.ndaEmail.update({
      where: { id: emailId },
      data: {
        status: 'SENT',
        sesMessageId: messageId,
      },
    });

    // Log email send success
    await auditService.log({
      action: AuditAction.EMAIL_SENT,
      entityType: 'nda_email',
      entityId: emailId,
      userId: effectiveContext.contactId,
      details: {
        ndaId: email.ndaId,
        sesMessageId: messageId,
        mockMode: useMockEmail,
      },
    });

    // Auto-transition NDA status to EMAILED (Story 3.12)
    // This will only transition if the NDA is in CREATED status
    // and properly record the transition in audit log
    const transition = await attemptAutoTransition(
      email.ndaId,
      StatusTrigger.EMAIL_SENT,
      effectiveContext
    );

    if (transition) {
      try {
        const { notifyStakeholders, NotificationEvent } = await import('./notificationService.js');
        await notifyStakeholders(
          {
            ndaId: email.ndaId,
            displayId: email.nda.displayId,
            companyName: email.nda.companyName,
            event: NotificationEvent.NDA_EMAILED,
            changedBy: {
              id: effectiveContext.contactId,
              name: email.sentBy
                ? `${email.sentBy.firstName ?? ''} ${email.sentBy.lastName ?? ''}`.trim() || 'System'
                : 'System',
            },
            timestamp: new Date(),
            previousValue: transition.previousStatus,
            newValue: transition.newStatus,
          },
          effectiveContext
        );
      } catch (notifyError) {
        console.error('[EmailService] Failed to send status notifications', notifyError);
      }
    }
  } catch (error) {
    // Update email record with failure
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    reportError(error, {
      emailId,
      ndaId: email.ndaId,
      source: 'email_send',
    });

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
      userId: effectiveContext.contactId,
      details: {
        ndaId: email.ndaId,
        error: errorMessage,
      },
    });

    throw new EmailServiceError(`Failed to send email: ${errorMessage}`, 'SEND_FAILED');
  }
}

export async function handlePermanentEmailFailure(
  emailId: string,
  error: unknown,
  retryCount?: number
): Promise<void> {
  reportError(error, {
    emailId,
    retryCount,
    source: 'email_queue',
  });

  const email = await prisma.ndaEmail.findUnique({
    where: { id: emailId },
    include: {
      nda: {
        select: {
          id: true,
          displayId: true,
          companyName: true,
        },
      },
      sentBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  if (!email) return;

  try {
    await sendAdminAlertEmail({
      emailId,
      ndaId: email.ndaId,
      displayId: email.nda.displayId,
      companyName: email.nda.companyName,
      sentBy: email.sentBy
        ? `${email.sentBy.firstName ?? ''} ${email.sentBy.lastName ?? ''}`.trim() || email.sentBy.email || 'Unknown'
        : 'Unknown',
      error,
      retryCount,
    });
  } catch (alertError) {
    reportError(alertError, {
      emailId,
      ndaId: email.ndaId,
      source: 'email_admin_alert',
    });
  }
}

async function sendAdminAlertEmail(details: {
  emailId: string;
  ndaId: string;
  displayId: number;
  companyName: string;
  sentBy: string;
  error: unknown;
  retryCount?: number;
}): Promise<void> {
  const recipients = await getEmailAdminAlerts();
  if (!recipients.length) return;

  const fromEmail = process.env.SES_FROM_EMAIL || 'nda@usmax.com';
  assertNoCrlf(fromEmail, 'From');

  for (const addr of recipients) {
    assertNoCrlf(addr, 'Recipient');
    if (!POC_PATTERNS.email.test(addr)) {
      throw new EmailServiceError('Invalid admin alert recipient email address', 'VALIDATION_ERROR');
    }
  }

  const subject = `NDA Email Failure: #${details.displayId} ${details.companyName}`;
  const errorMessage = details.error instanceof Error ? details.error.message : String(details.error);

  const body = `An NDA email failed after all retry attempts.\n\n` +
    `NDA: #${details.displayId} (${details.companyName})\n` +
    `Email ID: ${details.emailId}\n` +
    `Sent by: ${details.sentBy}\n` +
    `Retry count: ${details.retryCount ?? 'unknown'}\n` +
    `Error: ${errorMessage}\n\n` +
    `Please review the email queue and NDA record.\n`;

  const rawMessage = [
    `From: ${fromEmail}`,
    `To: ${recipients.join(', ')}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ].join('\r\n');

  await sesClient.send(
    new SendRawEmailCommand({
      RawMessage: { Data: Buffer.from(rawMessage) },
    })
  );
}

/**
 * Get emails for an NDA
 */
export async function getNdaEmails(
  ndaId: string,
  userContext: UserContext
): Promise<
  Array<{
    id: string;
    subject: string;
    toRecipients: string[];
    sentAt: Date;
    status: EmailStatus;
    sentBy: { id: string; firstName: string | null; lastName: string | null };
  }>
> {
  // Validate NDA exists and is accessible
  await getAccessibleNdaOrThrow(ndaId, userContext, { select: { id: true } });

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
        id: '', // System user
        contactId: email.sentById,
        email: '',
        permissions: new Set(['nda:send_email']),
        roles: [],
        authorizedAgencyGroups: [],
        authorizedSubagencies: [],
      };

      await sendEmail(email.id, systemContext);
      retried++;
    } catch {
      // Will be retried on next run
    }
  }

  return retried;
}

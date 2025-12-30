/**
 * Email Preview Component
 *
 * Shows a live preview of the email that will be sent
 * Includes subject, recipients, body, and attachments
 */

import React from 'react';
import { Mail, Paperclip, User } from 'lucide-react';
import { Card } from './ui/AppCard';
import { Badge } from './ui/AppBadge';

interface EmailPreviewProps {
  subject: string;
  toRecipients: string[];
  ccRecipients?: string[];
  bccRecipients?: string[];
  body: string;
  attachments?: Array<{
    filename: string;
    size?: number;
  }>;
}

export function EmailPreview({
  subject,
  toRecipients,
  ccRecipients = [],
  bccRecipients = [],
  body,
  attachments = []
}: EmailPreviewProps) {
  const formatRecipientList = (emails: string[]) => {
    if (emails.length === 0) return '—';
    if (emails.length <= 2) return emails.join(', ');
    return `${emails.slice(0, 2).join(', ')} and ${emails.length - 2} more`;
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--color-border)]">
        <Mail className="w-5 h-5 text-[var(--color-primary)]" />
        <h3 className="font-semibold">Email Preview</h3>
        <Badge variant="info" className="text-xs ml-auto">Preview</Badge>
      </div>

      <div className="space-y-3">
        {/* Subject */}
        <div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-1 font-medium">Subject</p>
          <div className="px-3 py-2 bg-gray-50 rounded border border-[var(--color-border)]">
            <p className="text-sm font-medium">{subject || <span className="text-[var(--color-text-muted)]">No subject</span>}</p>
          </div>
        </div>

        {/* To */}
        <div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-1 font-medium">To</p>
          <div className="px-3 py-2 bg-gray-50 rounded border border-[var(--color-border)]">
            <p className="text-sm">{formatRecipientList(toRecipients)}</p>
          </div>
        </div>

        {/* CC */}
        {ccRecipients.length > 0 && (
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-1 font-medium">CC</p>
            <div className="px-3 py-2 bg-gray-50 rounded border border-[var(--color-border)]">
              <p className="text-sm">{formatRecipientList(ccRecipients)}</p>
            </div>
          </div>
        )}

        {/* BCC */}
        {bccRecipients.length > 0 && (
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-1 font-medium">BCC</p>
            <div className="px-3 py-2 bg-gray-50 rounded border border-[var(--color-border)]">
              <p className="text-sm">{formatRecipientList(bccRecipients)}</p>
            </div>
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-1 font-medium">Attachments</p>
            <div className="space-y-2">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded"
                >
                  <Paperclip className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="text-sm text-[var(--color-text-primary)]">{attachment.filename}</span>
                  {attachment.size && (
                    <span className="text-xs text-[var(--color-text-muted)] ml-auto">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-1 font-medium">Message</p>
          <div className="px-4 py-3 bg-white border border-[var(--color-border)] rounded min-h-[200px]">
            <div
              className="text-sm whitespace-pre-wrap"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {body || <span className="text-[var(--color-text-muted)] italic">No message body</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Preview note */}
      <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-muted)]">
          This is how your email will appear to recipients. Double-check all details before sending.
        </p>
      </div>
    </Card>
  );
}

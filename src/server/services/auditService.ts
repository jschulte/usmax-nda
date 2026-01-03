/**
 * Audit Logging Service
 * Story 1.1: AWS Cognito MFA Integration
 * Story 1.2: JWT Middleware & User Context (extended)
 *
 * Handles audit logging for system events:
 * - Authentication: login_success, login_failed, mfa_success, mfa_failed, logout
 * - User provisioning: user_auto_provisioned
 * - Authorization: permission_denied, admin_bypass, unauthorized_access_attempt
 *
 * Logs to console in development, writes to audit_log table when database is available.
 */

import type { Prisma } from '../../generated/prisma/index.js';
import prisma from '../db/index.js';
import { reportError } from './errorReportingService.js';

export enum AuditAction {
  // Authentication events (Story 1.1)
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  MFA_SUCCESS = 'mfa_success',
  MFA_FAILED = 'mfa_failed',
  LOGOUT = 'logout',

  // User provisioning events (Story 1.2)
  USER_AUTO_PROVISIONED = 'user_auto_provisioned',

  // Authorization events (Story 1.3)
  PERMISSION_DENIED = 'permission_denied',
  ADMIN_BYPASS = 'admin_bypass',

  // Role management events (Story 1.3)
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',

  // Row-level security events (Story 1.4)
  UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt',

  // Agency management events (Story 2.1, 2.2)
  AGENCY_GROUP_CREATED = 'agency_group_created',
  AGENCY_GROUP_UPDATED = 'agency_group_updated',
  AGENCY_GROUP_DELETED = 'agency_group_deleted',
  SUBAGENCY_CREATED = 'subagency_created',
  SUBAGENCY_UPDATED = 'subagency_updated',
  SUBAGENCY_DELETED = 'subagency_deleted',

  // Access management events (Story 2.3, 2.4)
  AGENCY_GROUP_ACCESS_GRANTED = 'agency_group_access_granted',
  AGENCY_GROUP_ACCESS_REVOKED = 'agency_group_access_revoked',
  SUBAGENCY_ACCESS_GRANTED = 'subagency_access_granted',
  SUBAGENCY_ACCESS_REVOKED = 'subagency_access_revoked',

  // User management events (Story 2.5)
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DEACTIVATED = 'user_deactivated',
  USER_REACTIVATED = 'user_reactivated', // Story H-1: Reactivation feature

  // Access export events (Story 2.6)
  ACCESS_EXPORT = 'access_export',

  // Bulk user operations (Story 2.7)
  BULK_ROLE_ASSIGN = 'bulk_role_assign',
  BULK_ACCESS_GRANT = 'bulk_access_grant',
  BULK_DEACTIVATE = 'bulk_deactivate',

  // NDA management events (Story 3.1+)
  NDA_CREATED = 'nda_created',
  NDA_UPDATED = 'nda_updated',
  NDA_CLONED = 'nda_cloned',
  NDA_STATUS_CHANGED = 'nda_status_changed',
  NDA_DELETED = 'nda_deleted',

  // Document management events (Story 3.5+, 4.1+)
  DOCUMENT_GENERATED = 'document_generated',
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_DOWNLOADED = 'document_downloaded',
  DOCUMENT_MARKED_EXECUTED = 'document_marked_executed',
  DOCUMENT_DELETED = 'document_deleted',

  // Email events (Story 3.10)
  EMAIL_QUEUED = 'email_queued',
  EMAIL_SENT = 'email_sent',
  EMAIL_FAILED = 'email_failed',

  // Internal notes events (Story 9.1)
  INTERNAL_NOTE_CREATED = 'internal_note_created',
  INTERNAL_NOTE_UPDATED = 'internal_note_updated',
  INTERNAL_NOTE_DELETED = 'internal_note_deleted',

  // Email template management events (Story 9.16)
  EMAIL_TEMPLATE_CREATED = 'email_template_created',
  EMAIL_TEMPLATE_UPDATED = 'email_template_updated',
  EMAIL_TEMPLATE_DELETED = 'email_template_deleted',

  // Test notification events (Story 9.17)
  TEST_NOTIFICATION_SENT = 'test_notification_sent',
}

/**
 * Field change record for audit trail
 * Story 6.2: Track before/after values for entity updates
 */
export interface FieldChange {
  /** Field name (e.g., "companyName", "status") */
  field: string;
  /** Previous value before update */
  before: unknown;
  /** New value after update */
  after: unknown;
}

/**
 * Details object for audit log entries
 * Story 6.1: Added result tracking for success/error status
 * Story 6.2: Added field change tracking for updates
 */
export interface AuditLogDetails {
  /** Result of the operation: 'success' or 'error' */
  result?: 'success' | 'error';
  /** HTTP status code if from HTTP request */
  statusCode?: number;
  /** Request duration in milliseconds */
  duration?: number;
  /** Error message if result is 'error' */
  errorMessage?: string;
  /** Request path */
  path?: string;
  /** HTTP method */
  method?: string;
  /** Field changes (Story 6.2): before/after values for updated fields */
  changes?: FieldChange[];
  /** Additional context-specific details */
  [key: string]: unknown;
}

export interface AuditLogEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  userId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  /** Additional details including result status (Story 6.1) */
  details?: AuditLogDetails;
}

interface StoredAuditEntry extends AuditLogEntry {
  id: string;
  createdAt: Date;
}

/**
 * Audit Logging Service
 *
 * Story 6.1: Comprehensive Action Logging
 *
 * IMPORTANT: This service is APPEND-ONLY by design (AC4).
 * - The audit_log table should NEVER have UPDATE or DELETE operations.
 * - Only INSERT operations are permitted to maintain compliance.
 * - This service intentionally provides NO update or delete methods.
 * - For compliance: Consider adding PostgreSQL RULE or TRIGGER to
 *   prevent DELETE/UPDATE at the database level.
 *
 * @example
 * // Log an audit event
 * await auditService.log({
 *   action: AuditAction.NDA_CREATED,
 *   entityType: 'nda',
 *   entityId: nda.id,
 *   userId: userContext.contactId,
 *   details: { result: 'success', statusCode: 201 },
 * });
 */
class AuditService {
  // In-memory store for fallback when database is unavailable
  private logs: StoredAuditEntry[] = [];
  private dbAvailable = true;

  /**
   * Log an audit event
   * Async to not block the auth flow
   * Writes to database when available, falls back to in-memory
   */
  async log(entry: AuditLogEntry): Promise<void> {
    const storedEntry: StoredAuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date(),
    };

    // Log to console for debugging (development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUDIT]', JSON.stringify({
        timestamp: storedEntry.createdAt.toISOString(),
        action: storedEntry.action,
        entityType: storedEntry.entityType,
        userId: storedEntry.userId,
        ipAddress: storedEntry.ipAddress,
        details: storedEntry.details,
      }));
    }

    // Try to write to database
    if (this.dbAvailable) {
      try {
        await prisma.auditLog.create({
          data: {
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId ?? null,
            userId: entry.userId ?? null,
            ipAddress: entry.ipAddress ?? null,
            userAgent: entry.userAgent ?? null,
            details: entry.details ? (entry.details as Prisma.InputJsonValue) : undefined,
          },
        });
        return; // Success - don't store in memory
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        // Database not available (maybe not migrated yet)
        if (err.code === 'P1001' || err.code === 'P2021') {
          this.dbAvailable = false;
          console.warn('[AUDIT] Database not available, falling back to in-memory logging');
        } else {
          // Story 6.1 Task 4: Enhanced failure alerting
          // Structured console error with timestamp and context
          console.error('[AUDIT] Database write failed:', {
            timestamp: new Date().toISOString(),
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            userId: entry.userId,
            error: err.message || String(error),
          });

          // Report to Sentry if configured (Story 6.1 AC3)
          reportError(error, {
            source: 'auditService.log',
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
          });
        }
      }
    }

    // Fallback: Store in memory
    this.logs.push(storedEntry);

    // Keep only last 1000 entries in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  /**
   * Get recent audit logs (for development/testing)
   */
  getRecentLogs(limit: number = 100): StoredAuditEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get logs for a specific user
   */
  getLogsForUser(userId: string, limit: number = 100): StoredAuditEntry[] {
    return this.logs
      .filter((log) => log.userId === userId)
      .slice(-limit);
  }

  /**
   * Get logs by action type
   */
  getLogsByAction(action: AuditAction, limit: number = 100): StoredAuditEntry[] {
    return this.logs
      .filter((log) => log.action === action)
      .slice(-limit);
  }
}

// Singleton instance
export const auditService = new AuditService();

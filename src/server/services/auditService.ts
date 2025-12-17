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

import prisma from '../db/index.js';

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
}

export interface AuditLogEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  userId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

interface StoredAuditEntry extends AuditLogEntry {
  id: string;
  createdAt: Date;
}

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
            details: entry.details ?? undefined,
          },
        });
        return; // Success - don't store in memory
      } catch (error: any) {
        // Database not available (maybe not migrated yet)
        if (error.code === 'P1001' || error.code === 'P2021') {
          this.dbAvailable = false;
          console.warn('[AUDIT] Database not available, falling back to in-memory logging');
        } else {
          console.error('[AUDIT] Database error:', error);
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

/**
 * Audit Log Routes
 * Epic 6: Audit Trail & Compliance
 * Stories 6.5, 6.7-6.9: Audit Log Viewing and Export
 *
 * REST API endpoints for audit log operations:
 * - GET /api/admin/audit-logs            - Get all audit logs with filtering (admin only)
 * - GET /api/admin/audit-logs/export     - Export audit logs to CSV (admin only)
 * - GET /api/ndas/:id/audit-trail        - Get audit trail for specific NDA
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requirePermission, requireAnyPermission } from '../middleware/checkPermissions.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { prisma } from '../db/index.js';
import { Prisma } from '../../generated/prisma/index.js';
import { auditService, AuditAction } from '../services/auditService.js';
import { buildSecurityFilter } from '../services/ndaService.js';

const router: Router = Router();

// All routes require authentication and user context
router.use(authenticateJWT);
router.use(attachUserContext);

/**
 * System events that should be filtered from user-facing audit trail views
 * Story 9.2: These events are logged for security monitoring but hidden from UI by default
 * Issue #19: Expanded to include all system/security events
 * Code Review: Added successful auth events to reduce timeline noise
 */
const SYSTEM_EVENTS = [
  // Authorization/Permission events
  AuditAction.PERMISSION_DENIED,
  AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
  AuditAction.ADMIN_BYPASS,
  // Authentication events (routine, not NDA-specific)
  AuditAction.LOGIN_SUCCESS,
  AuditAction.LOGIN_FAILED,
  AuditAction.MFA_SUCCESS,
  AuditAction.MFA_FAILED,
  AuditAction.LOGOUT,
  // Auto-provisioning (system event)
  AuditAction.USER_AUTO_PROVISIONED,
];

type AuditLogDetails = Prisma.JsonObject;

function isJsonObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getDetailString(details: AuditLogDetails, key: string): string | undefined {
  const value = details[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * GET /api/admin/audit-logs
 * Get all audit logs with filtering (admin only)
 * Story 6.7: Centralized Audit Log Viewer
 * Story 6.8: Audit Log Filtering
 *
 * Query Parameters:
 * - page: number (default 1)
 * - limit: number (default 50, max 100)
 * - userId: filter by user ID
 * - action: filter by action type
 * - entityType: filter by entity type (nda, document, user, etc.)
 * - entityId: filter by specific entity ID
 * - startDate: filter from date (ISO string)
 * - endDate: filter to date (ISO string)
 * - ipAddress: filter by IP address
 * - batchId: filter by bulk operation batch ID
 * - search: search in details JSON
 */
router.get(
  '/admin/audit-logs',
  requirePermission(PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS),
  async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const skip = (page - 1) * limit;

      // Build filter conditions
      const where: Prisma.AuditLogWhereInput = {};

      // Story 9.2: Filter system events from UI (unless explicitly requested)
      const includeSystemEvents = req.query.includeSystemEvents === 'true';
      const actionFilter = req.query.action as string | undefined;
      if (actionFilter) {
        where.action = includeSystemEvents
          ? { in: [actionFilter] }
          : { in: [actionFilter], notIn: SYSTEM_EVENTS };
      } else if (!includeSystemEvents) {
        where.action = { notIn: SYSTEM_EVENTS };
      }

      if (req.query.userId) {
        where.userId = req.query.userId as string;
      }

      if (req.query.entityType) {
        where.entityType = req.query.entityType as string;
      }

      if (req.query.entityId) {
        where.entityId = req.query.entityId as string;
      }

      if (req.query.ipAddress) {
        where.ipAddress = req.query.ipAddress as string;
      }

      if (req.query.batchId) {
        const andFilters = Array.isArray(where.AND)
          ? where.AND
          : where.AND
            ? [where.AND]
            : [];

        where.AND = [
          ...andFilters,
          {
            details: {
              path: ['batchId'],
              equals: req.query.batchId as string,
            },
          },
        ];
      }

      // Date range filtering
      if (req.query.startDate || req.query.endDate) {
        where.createdAt = {};
        if (req.query.startDate) {
          where.createdAt.gte = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
          where.createdAt.lte = new Date(req.query.endDate as string);
        }
      }

      // Get total count and audit logs
      const [total, auditLogs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            userId: true,
            ipAddress: true,
            userAgent: true,
            details: true,
            createdAt: true,
          },
        }),
      ]);

      // Get unique user IDs to fetch user names
      const userIds = [...new Set(auditLogs.map(log => log.userId).filter(Boolean))] as string[];
      const users = userIds.length > 0 ? await prisma.contact.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      }) : [];

      const userMap = new Map(users.map(u => [u.id, u]));

      // Enrich audit logs with user info
      const enrichedLogs = auditLogs.map(log => ({
        ...log,
        user: log.userId ? userMap.get(log.userId) || null : null,
      }));

      res.json({
        auditLogs: enrichedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        filters: {
          availableActions: Object.values(AuditAction),
          availableEntityTypes: ['nda', 'document', 'user', 'authentication', 'agency_group', 'subagency', 'email', 'notification'],
        },
      });
    } catch (error) {
      console.error('[AuditLogs] Error getting audit logs:', error);
      res.status(500).json({
        error: 'Failed to get audit logs',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/admin/audit-logs/export
 * Export audit logs to CSV (admin only)
 * Story 6.9: Audit Log Export
 *
 * Query Parameters: Same as /api/admin/audit-logs (filters)
 * - format: 'csv' (default) or 'json'
 */
router.get(
  '/admin/audit-logs/export',
  requirePermission(PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS),
  async (req, res) => {
    try {
      // Build filter conditions (same as above)
      const where: Prisma.AuditLogWhereInput = {};

      const includeSystemEvents = req.query.includeSystemEvents === 'true';
      const actionFilter = req.query.action as string | undefined;
      if (actionFilter) {
        where.action = includeSystemEvents
          ? { in: [actionFilter] }
          : { in: [actionFilter], notIn: SYSTEM_EVENTS };
      } else if (!includeSystemEvents) {
        where.action = { notIn: SYSTEM_EVENTS };
      }

      if (req.query.userId) {
        where.userId = req.query.userId as string;
      }

      if (req.query.entityType) {
        where.entityType = req.query.entityType as string;
      }

      if (req.query.entityId) {
        where.entityId = req.query.entityId as string;
      }

      if (req.query.ipAddress) {
        where.ipAddress = req.query.ipAddress as string;
      }

      if (req.query.batchId) {
        const andFilters = Array.isArray(where.AND)
          ? where.AND
          : where.AND
            ? [where.AND]
            : [];

        where.AND = [
          ...andFilters,
          {
            details: {
              path: ['batchId'],
              equals: req.query.batchId as string,
            },
          },
        ];
      }

      if (req.query.startDate || req.query.endDate) {
        where.createdAt = {};
        if (req.query.startDate) {
          where.createdAt.gte = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
          where.createdAt.lte = new Date(req.query.endDate as string);
        }
      }

      // Get all matching audit logs (limit to 10000 for export)
      const auditLogs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10000,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          userId: true,
          ipAddress: true,
          userAgent: true,
          details: true,
          createdAt: true,
        },
      });

      // Get user names
      const userIds = [...new Set(auditLogs.map(log => log.userId).filter(Boolean))] as string[];
      const users = userIds.length > 0 ? await prisma.contact.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      }) : [];

      const userMap = new Map(users.map(u => [u.id, u]));

      const format = (req.query.format as string) || 'csv';

      if (format === 'json') {
        // JSON export
        const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const enrichedLogs = auditLogs.map(log => ({
          ...log,
          userName: log.userId ?
            (() => {
              const user = userMap.get(log.userId);
              return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : null;
            })() : null,
        }));

        res.json(enrichedLogs);
      } else {
        // CSV export
        const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // CSV header
        const csvHeader = 'ID,Timestamp,Action,Entity Type,Entity ID,User ID,User Name,IP Address,User Agent,Details\n';
        res.write(csvHeader);

        // Write rows
        for (const log of auditLogs) {
          const user = log.userId ? userMap.get(log.userId) : null;
          const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : '';

          const row = [
            log.id,
            log.createdAt.toISOString(),
            log.action,
            log.entityType,
            log.entityId || '',
            log.userId || '',
            escapeCsvField(userName),
            log.ipAddress || '',
            escapeCsvField(log.userAgent || ''),
            escapeCsvField(JSON.stringify(log.details || {})),
          ].join(',');

          res.write(row + '\n');
        }

        res.end();
      }

      // Log the export action
      await auditService.log({
        action: AuditAction.ACCESS_EXPORT,
        entityType: 'audit_log',
        userId: req.userContext!.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: {
          format,
          count: auditLogs.length,
          filters: { ...req.query },
        },
      });
    } catch (error) {
      console.error('[AuditLogs] Error exporting audit logs:', error);
      res.status(500).json({
        error: 'Failed to export audit logs',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/:id/audit-trail
 * Get audit trail for a specific NDA
 * Story 6.5: NDA Audit Trail Viewer
 * Story 6.6: Visual Timeline Display (provides data for frontend)
 *
 * Query Parameters:
 * - page: number (default 1)
 * - limit: number (default 50)
 * - actionTypes: comma-separated list of action types to filter
 */
router.get(
  '/ndas/:id/audit-trail',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      const ndaId = req.params.id;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const skip = (page - 1) * limit;

      // Build security filter to ensure user can access this NDA
      const securityFilter = await buildSecurityFilter(req.userContext!);

      // Verify NDA exists and user has access
      const nda = await prisma.nda.findFirst({
        where: {
          id: ndaId,
          ...securityFilter,
        },
        select: { id: true, displayId: true, companyName: true },
      });

      if (!nda) {
        return res.status(404).json({
          error: 'NDA not found',
          code: 'NDA_NOT_FOUND',
        });
      }

      // Build filter for audit logs
      const where: Prisma.AuditLogWhereInput = {
        entityId: ndaId,
        entityType: { in: ['nda', 'document', 'email', 'notification'] },
      };

      // Story 9.2: Always filter system events from NDA timeline
      where.action = { notIn: SYSTEM_EVENTS };

      // Optional action type filter
      if (req.query.actionTypes) {
        const actionTypes = (req.query.actionTypes as string).split(',');
        where.action = { in: actionTypes, notIn: SYSTEM_EVENTS };
      }

      // Get total and audit logs
      const [total, auditLogs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            userId: true,
            ipAddress: true,
            details: true,
            createdAt: true,
          },
        }),
      ]);

      // Get user names
      const userIds = [...new Set(auditLogs.map(log => log.userId).filter(Boolean))] as string[];
      const users = userIds.length > 0 ? await prisma.contact.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      }) : [];

      const userMap = new Map(users.map(u => [u.id, u]));

      // Map action to icon and label for timeline display
      const actionMetadata: Record<string, { icon: string; label: string; color: string }> = {
        [AuditAction.NDA_CREATED]: { icon: 'plus', label: 'Created', color: 'green' },
        [AuditAction.NDA_UPDATED]: { icon: 'edit', label: 'Updated', color: 'blue' },
        [AuditAction.NDA_CLONED]: { icon: 'copy', label: 'Cloned', color: 'purple' },
        [AuditAction.NDA_STATUS_CHANGED]: { icon: 'arrow-right', label: 'Status Changed', color: 'orange' },
        [AuditAction.DOCUMENT_UPLOADED]: { icon: 'upload', label: 'Document Uploaded', color: 'teal' },
        [AuditAction.DOCUMENT_DOWNLOADED]: { icon: 'download', label: 'Document Downloaded', color: 'gray' },
        [AuditAction.DOCUMENT_GENERATED]: { icon: 'file-text', label: 'Document Generated', color: 'indigo' },
        [AuditAction.DOCUMENT_MARKED_EXECUTED]: { icon: 'check-circle', label: 'Marked Executed', color: 'green' },
        [AuditAction.EMAIL_QUEUED]: { icon: 'mail', label: 'Email Queued', color: 'yellow' },
        [AuditAction.EMAIL_SENT]: { icon: 'send', label: 'Email Sent', color: 'blue' },
        [AuditAction.EMAIL_FAILED]: { icon: 'alert-triangle', label: 'Email Failed', color: 'red' },
      };

      // Enrich audit logs with timeline metadata
      const timeline = auditLogs.map(log => {
        const user = log.userId ? userMap.get(log.userId) : null;
        const userName = user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
          : 'System';

        const meta = actionMetadata[log.action] || {
          icon: 'circle',
          label: log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          color: 'gray'
        };

        // Generate human-readable description
        let description = meta.label;
        const details: AuditLogDetails = isJsonObject(log.details) ? log.details : {};
        if (log.action === AuditAction.NDA_STATUS_CHANGED) {
          const previousStatus = getDetailString(details, 'previousStatus');
          const newStatus = getDetailString(details, 'newStatus');
          if (previousStatus && newStatus) {
            description = `Status changed from "${previousStatus}" to "${newStatus}"`;
          }
        } else if (log.action === AuditAction.NDA_UPDATED) {
          const changedFields = details.changedFields;
          if (isJsonObject(changedFields)) {
            description = `Updated: ${Object.keys(changedFields).join(', ')}`;
          }
        } else if (
          log.action === AuditAction.DOCUMENT_UPLOADED ||
          log.action === AuditAction.DOCUMENT_DOWNLOADED
        ) {
          const filename = getDetailString(details, 'filename');
          if (filename) {
            description = `${meta.label}: ${filename}`;
          }
        } else if (log.action === AuditAction.EMAIL_SENT) {
          const subject = getDetailString(details, 'subject');
          if (subject) {
            description = `Email sent: "${subject}"`;
          }
        }

        return {
          id: log.id,
          timestamp: log.createdAt,
          relativeTime: getRelativeTime(log.createdAt),
          action: log.action,
          entityType: log.entityType,
          user: {
            id: log.userId,
            name: userName,
          },
          icon: meta.icon,
          label: meta.label,
          color: meta.color,
          description,
          details: log.details,
        };
      });

      res.json({
        nda: {
          id: nda.id,
          displayId: nda.displayId,
          companyName: nda.companyName,
        },
        timeline,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('[AuditLogs] Error getting NDA audit trail:', error);
      res.status(500).json({
        error: 'Failed to get audit trail',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * Helper: Escape CSV field
 */
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Helper: Get relative time string
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) === 1 ? '' : 's'} ago`;
}

export default router;

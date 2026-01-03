/**
 * Audit Middleware
 * Story 6.1: Comprehensive Action Logging
 *
 * Automatically logs all user actions (POST, PUT, DELETE, PATCH) with complete details.
 * Uses res.on('finish') to capture response status after handler completion.
 * Logging is fire-and-forget (non-blocking).
 *
 * @see src/server/services/auditService.ts - Core audit service
 * @see docs/architecture.md - Middleware pipeline documentation
 */

import type { Request, Response, NextFunction } from 'express';
import { auditService, AuditAction } from '../services/auditService.js';
import { reportError } from '../services/errorReportingService.js';
import type { UserContext } from '../types/auth.js';

// Extend Express Request to include userContext
declare global {
  namespace Express {
    interface Request {
      userContext?: UserContext;
    }
  }
}

/**
 * Route-to-Action mapping configuration
 * Maps HTTP method + path pattern to AuditAction and entityType
 */
interface RouteActionConfig {
  method: string;
  pattern: RegExp;
  action: AuditAction;
  entityType: string;
  /** Optional function to extract entity ID from path */
  extractId?: (path: string) => string | undefined;
}

/**
 * Extract UUID from path at specified segment position
 */
function extractUuidFromPath(path: string, segmentIndex: number): string | undefined {
  const segments = path.split('/').filter(Boolean);
  const segment = segments[segmentIndex];
  // UUID pattern: 8-4-4-4-12 hex characters
  if (segment && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return segment;
  }
  return undefined;
}

/**
 * Route-to-Action mapping for all auditable endpoints
 * Order matters: more specific patterns should come before general ones
 */
const ROUTE_ACTION_MAP: RouteActionConfig[] = [
  // === NDA Routes ===
  // Clone NDA (must be before general NDA update)
  {
    method: 'POST',
    pattern: /^\/api\/ndas\/[^/]+\/clone$/,
    action: AuditAction.NDA_CLONED,
    entityType: 'nda',
    extractId: (path) => extractUuidFromPath(path, 2), // /api/ndas/{id}/clone
  },
  // Send email (must be before general NDA update)
  {
    method: 'POST',
    pattern: /^\/api\/ndas\/[^/]+\/send-email$/,
    action: AuditAction.EMAIL_QUEUED,
    entityType: 'email',
    extractId: (path) => extractUuidFromPath(path, 2), // /api/ndas/{id}/send-email
  },
  // Generate RTF document
  {
    method: 'POST',
    pattern: /^\/api\/ndas\/[^/]+\/generate-rtf$/,
    action: AuditAction.DOCUMENT_GENERATED,
    entityType: 'document',
    extractId: (path) => extractUuidFromPath(path, 2),
  },
  // Upload document
  {
    method: 'POST',
    pattern: /^\/api\/ndas\/[^/]+\/documents$/,
    action: AuditAction.DOCUMENT_UPLOADED,
    entityType: 'document',
    extractId: (path) => extractUuidFromPath(path, 2),
  },
  // Mark document as executed
  {
    method: 'PATCH',
    pattern: /^\/api\/documents\/[^/]+\/mark-executed$/,
    action: AuditAction.DOCUMENT_MARKED_EXECUTED,
    entityType: 'document',
    extractId: (path) => extractUuidFromPath(path, 2),
  },
  // Change NDA status
  {
    method: 'PATCH',
    pattern: /^\/api\/ndas\/[^/]+\/status$/,
    action: AuditAction.NDA_STATUS_CHANGED,
    entityType: 'nda',
    extractId: (path) => extractUuidFromPath(path, 2),
  },
  // Create NDA
  {
    method: 'POST',
    pattern: /^\/api\/ndas\/?$/,
    action: AuditAction.NDA_CREATED,
    entityType: 'nda',
  },
  // Update NDA
  {
    method: 'PUT',
    pattern: /^\/api\/ndas\/[^/]+$/,
    action: AuditAction.NDA_UPDATED,
    entityType: 'nda',
    extractId: (path) => extractUuidFromPath(path, 2),
  },
  // Delete NDA
  {
    method: 'DELETE',
    pattern: /^\/api\/ndas\/[^/]+$/,
    action: AuditAction.NDA_DELETED,
    entityType: 'nda',
    extractId: (path) => extractUuidFromPath(path, 2),
  },

  // === Agency Group Routes ===
  {
    method: 'POST',
    pattern: /^\/api\/agency-groups\/?$/,
    action: AuditAction.AGENCY_GROUP_CREATED,
    entityType: 'agency_group',
  },
  {
    method: 'PUT',
    pattern: /^\/api\/agency-groups\/[^/]+$/,
    action: AuditAction.AGENCY_GROUP_UPDATED,
    entityType: 'agency_group',
    extractId: (path) => extractUuidFromPath(path, 2),
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/agency-groups\/[^/]+$/,
    action: AuditAction.AGENCY_GROUP_DELETED,
    entityType: 'agency_group',
    extractId: (path) => extractUuidFromPath(path, 2),
  },

  // === Agency Group Access Routes ===
  {
    method: 'POST',
    pattern: /^\/api\/agency-groups\/[^/]+\/access$/,
    action: AuditAction.AGENCY_GROUP_ACCESS_GRANTED,
    entityType: 'agency_group',
    extractId: (path) => extractUuidFromPath(path, 2),
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/agency-groups\/[^/]+\/access\/[^/]+$/,
    action: AuditAction.AGENCY_GROUP_ACCESS_REVOKED,
    entityType: 'agency_group',
    extractId: (path) => extractUuidFromPath(path, 2),
  },

  // === Subagency Routes ===
  {
    method: 'POST',
    pattern: /^\/api\/agency-groups\/[^/]+\/subagencies$/,
    action: AuditAction.SUBAGENCY_CREATED,
    entityType: 'subagency',
    extractId: (path) => extractUuidFromPath(path, 2), // Parent agency group ID
  },
  {
    method: 'PUT',
    pattern: /^\/api\/subagencies\/[^/]+$/,
    action: AuditAction.SUBAGENCY_UPDATED,
    entityType: 'subagency',
    extractId: (path) => extractUuidFromPath(path, 2),
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/subagencies\/[^/]+$/,
    action: AuditAction.SUBAGENCY_DELETED,
    entityType: 'subagency',
    extractId: (path) => extractUuidFromPath(path, 2),
  },

  // === Subagency Access Routes ===
  {
    method: 'POST',
    pattern: /^\/api\/subagencies\/[^/]+\/access$/,
    action: AuditAction.SUBAGENCY_ACCESS_GRANTED,
    entityType: 'subagency',
    extractId: (path) => extractUuidFromPath(path, 2),
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/subagencies\/[^/]+\/access\/[^/]+$/,
    action: AuditAction.SUBAGENCY_ACCESS_REVOKED,
    entityType: 'subagency',
    extractId: (path) => extractUuidFromPath(path, 2),
  },

  // === User Routes ===
  {
    method: 'POST',
    pattern: /^\/api\/users\/?$/,
    action: AuditAction.USER_CREATED,
    entityType: 'user',
  },
  {
    method: 'PUT',
    pattern: /^\/api\/users\/[^/]+$/,
    action: AuditAction.USER_UPDATED,
    entityType: 'user',
    extractId: (path) => extractUuidFromPath(path, 2),
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/users\/[^/]+\/deactivate$/,
    action: AuditAction.USER_DEACTIVATED,
    entityType: 'user',
    extractId: (path) => extractUuidFromPath(path, 2),
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/users\/[^/]+\/reactivate$/,
    action: AuditAction.USER_REACTIVATED,
    entityType: 'user',
    extractId: (path) => extractUuidFromPath(path, 2),
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/users\/[^/]+$/,
    action: AuditAction.USER_DEACTIVATED,
    entityType: 'user',
    extractId: (path) => extractUuidFromPath(path, 2),
  },

  // === Role Management Routes ===
  {
    method: 'POST',
    pattern: /^\/api\/admin\/users\/[^/]+\/roles$/,
    action: AuditAction.ROLE_ASSIGNED,
    entityType: 'user',
    extractId: (path) => extractUuidFromPath(path, 3), // /api/admin/users/{id}/roles
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/admin\/users\/[^/]+\/roles\/[^/]+$/,
    action: AuditAction.ROLE_REMOVED,
    entityType: 'user',
    extractId: (path) => extractUuidFromPath(path, 3),
  },
];

/**
 * Paths to exclude from audit logging
 */
const EXCLUDED_PATHS = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/mfa-challenge',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/me',
  '/assets',
  '/favicon.ico',
];

/**
 * Determine the audit action for a given request
 */
export function determineAction(method: string, path: string): RouteActionConfig | undefined {
  // Check exclusions first
  if (EXCLUDED_PATHS.some(excluded => path === excluded || path.startsWith(excluded + '/'))) {
    return undefined;
  }

  // Find matching route action
  for (const config of ROUTE_ACTION_MAP) {
    if (config.method === method && config.pattern.test(path)) {
      return config;
    }
  }

  return undefined;
}

/**
 * Audit Middleware
 *
 * Automatically logs POST, PUT, DELETE, PATCH requests to the audit log.
 * Uses res.on('finish') to capture the final response status.
 * Logging is async (fire-and-forget) to not block the response.
 *
 * @example
 * // Apply globally before routes in index.ts
 * app.use(auditMiddleware);
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip read-only methods
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Capture start time for duration tracking
  const startTime = Date.now();

  // Hook into response finish event
  res.on('finish', () => {
    // Determine action after route has been processed
    const actionConfig = determineAction(req.method, req.path);

    // Skip if no action mapping found
    if (!actionConfig) {
      return;
    }

    // Extract entity ID if applicable
    const entityId = actionConfig.extractId
      ? actionConfig.extractId(req.path)
      : undefined;

    // Determine result based on status code
    const isSuccess = res.statusCode >= 200 && res.statusCode < 400;

    // Build details object
    const details: Record<string, unknown> = {
      result: isSuccess ? 'success' : 'error',
      statusCode: res.statusCode,
      duration: Date.now() - startTime,
      path: req.path,
      method: req.method,
    };

    // Add error message for non-success responses
    if (!isSuccess) {
      details.errorMessage = res.statusMessage || `HTTP ${res.statusCode}`;
    }

    // Fire-and-forget async logging
    const forwardedFor = req.headers?.['x-forwarded-for'];
    const clientIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]?.trim()
        : req.ip;

    auditService.log({
      action: actionConfig.action,
      entityType: actionConfig.entityType,
      entityId: entityId ?? null,
      userId: req.userContext?.contactId ?? null,
      ipAddress: clientIp,
      userAgent: req.get('user-agent'),
      details,
    }).catch((err) => {
      // Log failure but don't crash (Story 6.1 AC3)
      console.error('[AuditMiddleware] Failed to log audit entry:', {
        timestamp: new Date().toISOString(),
        action: actionConfig.action,
        entityType: actionConfig.entityType,
        entityId,
        error: err instanceof Error ? err.message : String(err),
      });
      // Report to Sentry if configured (Story 6.1 Task 4)
      reportError(err, {
        source: 'auditMiddleware',
        action: actionConfig.action,
        entityType: actionConfig.entityType,
        entityId,
      });
    });
  });

  next();
}

export default auditMiddleware;

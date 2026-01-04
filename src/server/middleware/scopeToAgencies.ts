/**
 * Agency Scope Middleware
 * Story 1.4: Row-Level Security Implementation
 * Story H-1: Added explicit audit logging for unauthorized access attempts
 *
 * Middleware that computes and attaches the user's agency scope to the request.
 * This scope is used to filter NDA queries to only return authorized data.
 *
 * Middleware Pipeline Order:
 * authenticateJWT → attachUserContext → checkPermissions → scopeToAgencies → Route Handler
 *
 * AC1, AC2, AC3: Agency-based filtering with proper access control
 */

import type { Request, Response, NextFunction } from 'express';
import {
  getUserAgencyScope,
  type AgencyScope,
} from '../services/agencyScopeService.js';
import { auditService, AuditAction } from '../services/auditService.js';

/**
 * Middleware that computes the user's agency scope and attaches it to the request.
 *
 * Usage:
 * - Apply after authenticateJWT, attachUserContext, and checkPermissions
 * - Access scope via `req.agencyScope` in route handlers
 * - ALWAYS spread `...req.agencyScope` into NDA queries
 *
 * @example
 * router.get('/api/ndas',
 *   authenticateJWT,
 *   attachUserContext,
 *   requirePermission(PERMISSIONS.NDA_VIEW),
 *   scopeToAgencies,
 *   async (req, res) => {
 *     const ndas = await prisma.nda.findMany({
 *       where: { ...req.agencyScope }, // MANDATORY
 *     });
 *     res.json(ndas);
 *   }
 * );
 */
export async function scopeToAgencies(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  // Require user context (should be populated by attachUserContext)
  if (!req.userContext) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED',
    });
  }

  try {
    // Use pre-computed scope from user context if available,
    // otherwise compute it fresh
    let scope: AgencyScope;

    const hasGroupAccess =
      (req.userContext.authorizedAgencyGroups?.length ?? 0) > 0;
    const hasDirectSubagencyAccess =
      (req.userContext.authorizedSubagencies?.length ?? 0) > 0;

    if (!hasGroupAccess && !hasDirectSubagencyAccess) {
      // User explicitly has no agency access - log this for audit trail
      // Story H-1: Explicit audit logging for unauthorized access attempts
      const userAgentHeader =
        typeof req.get === 'function'
          ? req.get('user-agent')
          : req.headers?.['user-agent'];
      await auditService.log({
        action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
        entityType: 'agency_scope',
        userId: req.userContext.contactId,
        ipAddress: req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown',
        userAgent: userAgentHeader || 'unknown',
        details: {
          reason: 'no_agency_access',
          path: req.path,
          method: req.method,
          message: 'User attempted to access agency-scoped resource without any agency access',
        },
      });
      scope = { subagencyId: { in: [] } };
    } else if (!hasGroupAccess && hasDirectSubagencyAccess) {
      // Use cached direct subagency access when no groups are assigned
      scope = { subagencyId: { in: req.userContext.authorizedSubagencies } };
    } else {
      // Compute full scope (expands group access and unions with direct grants)
      scope = await getUserAgencyScope(req.userContext.contactId);
    }

    // Attach scope to request for use in route handlers
    req.agencyScope = scope;

    return next();
  } catch (error) {
    console.error('[ScopeToAgencies] Error computing agency scope:', error);
    return res.status(500).json({
      error: 'Failed to determine access scope',
      code: 'SCOPE_ERROR',
    });
  }
}

/**
 * Helper to check if user has any agency access.
 * Use this to return empty results for users without access.
 *
 * @param req - Express request with agencyScope
 * @returns true if user has at least one authorized subagency
 */
export function hasAgencyAccess(req: Request): boolean {
  return (req.agencyScope?.subagencyId.in.length ?? 0) > 0;
}

/**
 * Get the list of authorized subagency IDs from the request.
 *
 * @param req - Express request with agencyScope
 * @returns Array of authorized subagency IDs
 */
export function getAuthorizedSubagencyIds(req: Request): string[] {
  return req.agencyScope?.subagencyId.in ?? [];
}

// Type declaration is in types/auth.ts

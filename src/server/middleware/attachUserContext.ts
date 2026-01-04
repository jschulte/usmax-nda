/**
 * Attach User Context Middleware
 * Story 1.2: JWT Middleware & User Context
 * Task 3: Attach User Context Middleware
 *
 * Loads full user context (permissions, roles, agency access) after JWT validation.
 * Should be used after authenticateJWT in the middleware pipeline.
 *
 * AC4: Loads Contact record, roles, permissions, and agency grants from database
 */

import type { Request, Response, NextFunction } from 'express';
import {
  loadUserContext,
  createContactForFirstLogin,
} from '../services/userContextService.js';
import { auditService, AuditAction } from '../services/auditService.js';

/**
 * Middleware that attaches full user context to the request
 *
 * After JWT validation (authenticateJWT), this middleware:
 * 1. Loads user's contact record from database
 * 2. Aggregates permissions from all assigned roles
 * 3. Loads agency group and subagency access grants
 * 4. Attaches complete UserContext to req.userContext
 *
 * If user exists in Cognito but not in database (first login):
 * - Creates a new contact record
 * - Assigns default "Read-Only" role
 * - Logs the auto-provisioning event
 */
export async function attachUserContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  // Require JWT to be validated first
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED',
    });
  }

  try {
    // Try to load existing user context
    let userContext = await loadUserContext(req.user.id);

    // Handle first-time login (user in Cognito but not in database)
    if (!userContext) {
      // Auto-provision the user with default role
      userContext = await createContactForFirstLogin(req.user.id, req.user.email);

      // Log the auto-provisioning event
      await auditService.log({
        action: AuditAction.USER_AUTO_PROVISIONED,
        entityType: 'contact',
        entityId: userContext.contactId,
        details: {
          cognitoId: req.user.id,
          email: req.user.email,
          defaultRole: 'Read-Only',
        },
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

    }

    if (!userContext) {
      return res.status(401).json({
        error: 'User account not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Block inactive users (soft-deactivated)
    if (userContext.active === false) {
      return res.status(401).json({
        error: 'User account is inactive',
        code: 'USER_INACTIVE',
      });
    }

    // Attach full context to request
    req.userContext = userContext;
    req.user = {
      ...req.user,
      ...userContext,
      // Explicitly surface permissions/roles on req.user (AC2)
      permissions: userContext.permissions,
      roles: userContext.roles,
    };

    next();
  } catch (error) {
    console.error('[User Context] Error loading user context:', error);

    // Don't expose internal errors
    return res.status(500).json({
      error: 'Failed to load user context',
      code: 'CONTEXT_LOAD_ERROR',
    });
  }
}

/**
 * Optional variant that doesn't fail if user context can't be loaded
 * Useful for endpoints that work with or without full context
 */
export async function attachUserContextOptional(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    return next();
  }

  try {
    const userContext = await loadUserContext(req.user.id);
    if (userContext && userContext.active !== false) {
      req.userContext = userContext;
      req.user = {
        ...req.user,
        ...userContext,
        permissions: userContext.permissions,
        roles: userContext.roles,
      };
    }
  } catch (error) {
    console.warn('[User Context] Optional context load failed:', error);
    // Continue without context
  }

  next();
}

/**
 * Extract client IP address from request
 */
function getClientIp(req: Request): string | undefined {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress;
}

/**
 * Permission Check Middleware
 * Story 1.3: RBAC Permission System
 *
 * Provides middleware factories for checking user permissions:
 * - requirePermission(permission) - requires single permission
 * - requireAnyPermission(permissions) - requires at least one (OR logic)
 * - requireAllPermissions(permissions) - requires all permissions (AND logic)
 *
 * AC2, AC3, AC4, AC5: Permission enforcement with admin bypass
 */

import type { Request, Response, NextFunction } from 'express';
import { auditService, AuditAction } from '../services/auditService.js';
import { PERMISSION_DENIED_MESSAGES, type Permission } from '../constants/permissions.js';
import { ROLE_NAMES } from '../types/auth.js';

/**
 * Check if user is an admin (has admin bypass)
 */
function isAdmin(req: Request): boolean {
  return req.userContext?.roles.includes(ROLE_NAMES.ADMIN) ?? false;
}

/**
 * Middleware factory that requires a single permission
 *
 * @param permission - The permission code to check
 * @returns Express middleware
 *
 * @example
 * router.post('/api/ndas',
 *   authenticateJWT,
 *   attachUserContext,
 *   requirePermission(PERMISSIONS.NDA_CREATE),
 *   createNdaHandler
 * );
 */
export function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    // Require user context (should be populated by attachUserContext)
    if (!req.userContext) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Admin bypass - Admin role has all permissions (AC5)
    if (isAdmin(req)) {
      // Log admin bypass for audit transparency
      await auditService.log({
        action: AuditAction.ADMIN_BYPASS,
        entityType: 'permission_check',
        userId: req.userContext.contactId,
        details: { permission, bypassReason: 'admin_role' },
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
      return next();
    }

    // Check if user has the required permission (AC2)
    if (req.userContext.permissions.has(permission)) {
      return next();
    }

    // Permission denied (AC3)
    await auditService.log({
      action: AuditAction.PERMISSION_DENIED,
      entityType: 'permission_check',
      userId: req.userContext.contactId,
      details: {
        permission,
        userRoles: req.userContext.roles,
        endpoint: `${req.method} ${req.originalUrl}`,
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    const friendlyMessage =
      PERMISSION_DENIED_MESSAGES[permission] || `Permission '${permission}' required`;

    return res.status(403).json({
      error: friendlyMessage,
      code: 'PERMISSION_DENIED',
      requiredPermission: permission,
    });
  };
}

/**
 * Middleware factory that requires at least one of the specified permissions (OR logic)
 *
 * @param permissions - Array of permission codes (user needs at least one)
 * @returns Express middleware
 *
 * @example
 * router.get('/api/ndas/:id',
 *   authenticateJWT,
 *   attachUserContext,
 *   requireAnyPermission([PERMISSIONS.NDA_VIEW, PERMISSIONS.NDA_UPDATE]),
 *   getNdaHandler
 * );
 */
export function requireAnyPermission(permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    if (!req.userContext) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Admin bypass
    if (isAdmin(req)) {
      await auditService.log({
        action: AuditAction.ADMIN_BYPASS,
        entityType: 'permission_check',
        userId: req.userContext.contactId,
        details: { permissions, logic: 'any', bypassReason: 'admin_role' },
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
      return next();
    }

    // Check if user has ANY of the permissions (AC4 - union logic)
    const hasPermission = permissions.some((p) => req.userContext!.permissions.has(p));

    if (hasPermission) {
      return next();
    }

    // Permission denied
    await auditService.log({
      action: AuditAction.PERMISSION_DENIED,
      entityType: 'permission_check',
      userId: req.userContext.contactId,
      details: {
        permissions,
        logic: 'any',
        userRoles: req.userContext.roles,
        endpoint: `${req.method} ${req.originalUrl}`,
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return res.status(403).json({
      error: 'Insufficient permissions',
      code: 'PERMISSION_DENIED',
      requiredPermissions: permissions,
      logic: 'any',
    });
  };
}

/**
 * Middleware factory that requires ALL specified permissions (AND logic)
 *
 * @param permissions - Array of permission codes (user needs all of them)
 * @returns Express middleware
 *
 * @example
 * router.delete('/api/ndas/:id',
 *   authenticateJWT,
 *   attachUserContext,
 *   requireAllPermissions([PERMISSIONS.NDA_DELETE, PERMISSIONS.NDA_VIEW]),
 *   deleteNdaHandler
 * );
 */
export function requireAllPermissions(permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    if (!req.userContext) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Admin bypass
    if (isAdmin(req)) {
      await auditService.log({
        action: AuditAction.ADMIN_BYPASS,
        entityType: 'permission_check',
        userId: req.userContext.contactId,
        details: { permissions, logic: 'all', bypassReason: 'admin_role' },
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
      return next();
    }

    // Check if user has ALL permissions
    const hasAllPermissions = permissions.every((p) => req.userContext!.permissions.has(p));

    if (hasAllPermissions) {
      return next();
    }

    // Find missing permissions for helpful error message
    const missingPermissions = permissions.filter((p) => !req.userContext!.permissions.has(p));

    await auditService.log({
      action: AuditAction.PERMISSION_DENIED,
      entityType: 'permission_check',
      userId: req.userContext.contactId,
      details: {
        permissions,
        missingPermissions,
        logic: 'all',
        userRoles: req.userContext.roles,
        endpoint: `${req.method} ${req.originalUrl}`,
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return res.status(403).json({
      error: 'Insufficient permissions',
      code: 'PERMISSION_DENIED',
      missingPermissions,
      logic: 'all',
    });
  };
}

/**
 * Helper to check if current user has a specific permission
 * Useful for conditional logic in route handlers
 *
 * @param req - Express request with userContext
 * @param permission - Permission to check
 * @returns true if user has permission or is admin
 */
export function hasPermission(req: Request, permission: Permission): boolean {
  if (!req.userContext) {
    return false;
  }

  // Admin has all permissions
  if (isAdmin(req)) {
    return true;
  }

  return req.userContext.permissions.has(permission);
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
  return req.ip || req.socket.remoteAddress;
}

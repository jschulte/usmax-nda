/**
 * Tests for checkPermissions Middleware
 * Story 1.3: RBAC Permission System
 *
 * Tests:
 * - requirePermission: single permission check
 * - requireAnyPermission: OR logic
 * - requireAllPermissions: AND logic
 * - Admin bypass behavior
 * - 403 response format
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  hasPermission,
} from '../checkPermissions.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { ROLE_NAMES } from '../../types/auth.js';

// Mock auditService
vi.mock('../../services/auditService.js', () => ({
  auditService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
  AuditAction: {
    PERMISSION_DENIED: 'permission_denied',
    ADMIN_BYPASS: 'admin_bypass',
  },
}));

// Helper to create mock request with user context
function createMockRequest(userContext?: Partial<Request['userContext']>): Partial<Request> {
  return {
    userContext: userContext ? {
      id: 'test-cognito-id',
      email: 'test@usmax.com',
      contactId: 'test-contact-id',
      roles: ['Read-Only'],
      permissions: new Set<string>(),
      authorizedAgencyGroups: [],
      authorizedSubagencies: [],
      ...userContext,
    } : undefined,
    method: 'GET',
    originalUrl: '/api/test',
    headers: { 'user-agent': 'test-agent' },
    ip: '127.0.0.1',
  };
}

// Helper to create mock response
function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

// Mock next function
const mockNext = vi.fn() as unknown as NextFunction;

describe('checkPermissions Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requirePermission', () => {
    it('returns 401 when no userContext exists', async () => {
      const req = createMockRequest() as Request;
      delete req.userContext;
      const res = createMockResponse() as Response;

      const middleware = requirePermission(PERMISSIONS.NDA_VIEW);
      await middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('allows access when user has the required permission', async () => {
      const req = createMockRequest({
        permissions: new Set([PERMISSIONS.NDA_VIEW]),
      }) as Request;
      const res = createMockResponse() as Response;

      const middleware = requirePermission(PERMISSIONS.NDA_VIEW);
      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when user lacks required permission', async () => {
      const req = createMockRequest({
        permissions: new Set([PERMISSIONS.NDA_VIEW]),
        roles: ['Read-Only'],
      }) as Request;
      const res = createMockResponse() as Response;

      const middleware = requirePermission(PERMISSIONS.NDA_CREATE);
      await middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PERMISSION_DENIED',
        requiredPermission: PERMISSIONS.NDA_CREATE,
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns user-friendly error message for known permissions', async () => {
      const req = createMockRequest({
        permissions: new Set(),
        roles: ['Read-Only'],
      }) as Request;
      const res = createMockResponse() as Response;

      const middleware = requirePermission(PERMISSIONS.NDA_SEND_EMAIL);
      await middleware(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining("don't have permission to send emails"),
      }));
    });

    it('allows admin bypass for any permission (AC5)', async () => {
      const req = createMockRequest({
        permissions: new Set(), // Admin has no explicit permissions in set
        roles: [ROLE_NAMES.ADMIN],
      }) as Request;
      const res = createMockResponse() as Response;

      const middleware = requirePermission(PERMISSIONS.NDA_DELETE);
      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireAnyPermission', () => {
    it('returns 401 when no userContext exists', async () => {
      const req = createMockRequest() as Request;
      delete req.userContext;
      const res = createMockResponse() as Response;

      const middleware = requireAnyPermission([PERMISSIONS.NDA_VIEW, PERMISSIONS.NDA_CREATE]);
      await middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('allows access when user has at least one permission (AC4 - union logic)', async () => {
      const req = createMockRequest({
        permissions: new Set([PERMISSIONS.NDA_VIEW]),
      }) as Request;
      const res = createMockResponse() as Response;

      const middleware = requireAnyPermission([PERMISSIONS.NDA_CREATE, PERMISSIONS.NDA_VIEW]);
      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('returns 403 when user has none of the required permissions', async () => {
      const req = createMockRequest({
        permissions: new Set([PERMISSIONS.NDA_VIEW]),
        roles: ['Read-Only'],
      }) as Request;
      const res = createMockResponse() as Response;

      const middleware = requireAnyPermission([PERMISSIONS.NDA_CREATE, PERMISSIONS.NDA_DELETE]);
      await middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PERMISSION_DENIED',
        requiredPermissions: [PERMISSIONS.NDA_CREATE, PERMISSIONS.NDA_DELETE],
        logic: 'any',
      }));
    });

    it('allows admin bypass for any permission combination', async () => {
      const req = createMockRequest({
        permissions: new Set(),
        roles: [ROLE_NAMES.ADMIN],
      }) as Request;
      const res = createMockResponse() as Response;

      const middleware = requireAnyPermission([PERMISSIONS.NDA_DELETE, PERMISSIONS.ADMIN_MANAGE_USERS]);
      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAllPermissions', () => {
    it('returns 401 when no userContext exists', async () => {
      const req = createMockRequest() as Request;
      delete req.userContext;
      const res = createMockResponse() as Response;

      const middleware = requireAllPermissions([PERMISSIONS.NDA_VIEW, PERMISSIONS.NDA_UPDATE]);
      await middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('allows access when user has all required permissions', async () => {
      const req = createMockRequest({
        permissions: new Set([PERMISSIONS.NDA_VIEW, PERMISSIONS.NDA_UPDATE, PERMISSIONS.NDA_CREATE]),
      }) as Request;
      const res = createMockResponse() as Response;

      const middleware = requireAllPermissions([PERMISSIONS.NDA_VIEW, PERMISSIONS.NDA_UPDATE]);
      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('returns 403 when user is missing one or more permissions', async () => {
      const req = createMockRequest({
        permissions: new Set([PERMISSIONS.NDA_VIEW]),
        roles: ['Limited User'],
      }) as Request;
      const res = createMockResponse() as Response;

      const middleware = requireAllPermissions([PERMISSIONS.NDA_VIEW, PERMISSIONS.NDA_UPDATE]);
      await middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PERMISSION_DENIED',
        missingPermissions: [PERMISSIONS.NDA_UPDATE],
        logic: 'all',
      }));
    });

    it('reports all missing permissions in response', async () => {
      const req = createMockRequest({
        permissions: new Set([PERMISSIONS.NDA_VIEW]),
        roles: ['Limited User'],
      }) as Request;
      const res = createMockResponse() as Response;

      const middleware = requireAllPermissions([
        PERMISSIONS.NDA_VIEW,
        PERMISSIONS.NDA_UPDATE,
        PERMISSIONS.NDA_DELETE,
      ]);
      await middleware(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        missingPermissions: expect.arrayContaining([
          PERMISSIONS.NDA_UPDATE,
          PERMISSIONS.NDA_DELETE,
        ]),
      }));
    });

    it('allows admin bypass for all permissions', async () => {
      const req = createMockRequest({
        permissions: new Set(),
        roles: [ROLE_NAMES.ADMIN],
      }) as Request;
      const res = createMockResponse() as Response;

      const middleware = requireAllPermissions([
        PERMISSIONS.NDA_DELETE,
        PERMISSIONS.ADMIN_MANAGE_USERS,
        PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS,
      ]);
      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('hasPermission helper', () => {
    it('returns false when no userContext exists', () => {
      const req = createMockRequest() as Request;
      delete req.userContext;

      expect(hasPermission(req, PERMISSIONS.NDA_VIEW)).toBe(false);
    });

    it('returns true when user has the permission', () => {
      const req = createMockRequest({
        permissions: new Set([PERMISSIONS.NDA_VIEW]),
      }) as Request;

      expect(hasPermission(req, PERMISSIONS.NDA_VIEW)).toBe(true);
    });

    it('returns false when user lacks the permission', () => {
      const req = createMockRequest({
        permissions: new Set([PERMISSIONS.NDA_VIEW]),
      }) as Request;

      expect(hasPermission(req, PERMISSIONS.NDA_CREATE)).toBe(false);
    });

    it('returns true for admin regardless of explicit permissions', () => {
      const req = createMockRequest({
        permissions: new Set(),
        roles: [ROLE_NAMES.ADMIN],
      }) as Request;

      expect(hasPermission(req, PERMISSIONS.NDA_DELETE)).toBe(true);
      expect(hasPermission(req, PERMISSIONS.ADMIN_MANAGE_USERS)).toBe(true);
    });
  });

  describe('Multi-role support (AC4)', () => {
    it('aggregates permissions from multiple roles', async () => {
      // User with both NDA User and Limited User permissions
      const req = createMockRequest({
        permissions: new Set([
          PERMISSIONS.NDA_CREATE,
          PERMISSIONS.NDA_UPDATE,
          PERMISSIONS.NDA_VIEW,
          PERMISSIONS.NDA_UPLOAD_DOCUMENT,
        ]),
        roles: ['NDA User', 'Limited User'],
      }) as Request;
      const res = createMockResponse() as Response;

      // Should have access to NDA create from NDA User role
      const middleware1 = requirePermission(PERMISSIONS.NDA_CREATE);
      await middleware1(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();

      vi.clearAllMocks();

      // Should also have upload permission (common to both)
      const middleware2 = requirePermission(PERMISSIONS.NDA_UPLOAD_DOCUMENT);
      await middleware2(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

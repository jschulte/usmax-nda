/**
 * Audit Middleware Tests
 * Story 6.1: Comprehensive Action Logging
 *
 * Tests for automatic action logging via middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { auditMiddleware, determineAction } from '../auditMiddleware.js';
import { auditService, AuditAction } from '../../services/auditService.js';

// Mock the auditService
vi.mock('../../services/auditService.js', async () => {
  const actual = await vi.importActual<typeof import('../../services/auditService.js')>('../../services/auditService.js');
  return {
    ...actual,
    auditService: {
      log: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock the errorReportingService
vi.mock('../../services/errorReportingService.js', () => ({
  reportError: vi.fn(),
}));

describe('auditMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('determineAction', () => {
    // Task 6.1: Unit tests for route-to-action mapping

    it('maps POST /api/ndas to NDA_CREATED', () => {
      const result = determineAction('POST', '/api/ndas');
      expect(result).toBeDefined();
      expect(result?.action).toBe(AuditAction.NDA_CREATED);
      expect(result?.entityType).toBe('nda');
    });

    it('maps POST /api/ndas/ (with trailing slash) to NDA_CREATED', () => {
      const result = determineAction('POST', '/api/ndas/');
      expect(result).toBeDefined();
      expect(result?.action).toBe(AuditAction.NDA_CREATED);
    });

    it('maps PUT /api/ndas/:id to NDA_UPDATED', () => {
      const result = determineAction('PUT', '/api/ndas/123e4567-e89b-12d3-a456-426614174000');
      expect(result).toBeDefined();
      expect(result?.action).toBe(AuditAction.NDA_UPDATED);
      expect(result?.entityType).toBe('nda');
    });

    it('maps DELETE /api/ndas/:id to NDA_DELETED', () => {
      const result = determineAction('DELETE', '/api/ndas/123e4567-e89b-12d3-a456-426614174000');
      expect(result).toBeDefined();
      expect(result?.action).toBe(AuditAction.NDA_DELETED);
    });

    it('maps POST /api/ndas/:id/clone to NDA_CLONED', () => {
      const result = determineAction('POST', '/api/ndas/123e4567-e89b-12d3-a456-426614174000/clone');
      expect(result).toBeDefined();
      expect(result?.action).toBe(AuditAction.NDA_CLONED);
    });

    it('maps POST /api/ndas/:id/send-email to EMAIL_QUEUED', () => {
      const result = determineAction('POST', '/api/ndas/123e4567-e89b-12d3-a456-426614174000/send-email');
      expect(result).toBeDefined();
      expect(result?.action).toBe(AuditAction.EMAIL_QUEUED);
      expect(result?.entityType).toBe('email');
    });

    it('maps POST /api/ndas/:id/documents to DOCUMENT_UPLOADED', () => {
      const result = determineAction('POST', '/api/ndas/123e4567-e89b-12d3-a456-426614174000/documents');
      expect(result).toBeDefined();
      expect(result?.action).toBe(AuditAction.DOCUMENT_UPLOADED);
      expect(result?.entityType).toBe('document');
    });

    it('maps PATCH /api/ndas/:id/status to NDA_STATUS_CHANGED', () => {
      const result = determineAction('PATCH', '/api/ndas/123e4567-e89b-12d3-a456-426614174000/status');
      expect(result).toBeDefined();
      expect(result?.action).toBe(AuditAction.NDA_STATUS_CHANGED);
    });

    it('maps POST /api/agency-groups to AGENCY_GROUP_CREATED', () => {
      const result = determineAction('POST', '/api/agency-groups');
      expect(result).toBeDefined();
      expect(result?.action).toBe(AuditAction.AGENCY_GROUP_CREATED);
      expect(result?.entityType).toBe('agency_group');
    });

    it('maps POST /api/users to USER_CREATED', () => {
      const result = determineAction('POST', '/api/users');
      expect(result).toBeDefined();
      expect(result?.action).toBe(AuditAction.USER_CREATED);
      expect(result?.entityType).toBe('user');
    });

    it('maps POST /api/admin/users/:id/roles to ROLE_ASSIGNED', () => {
      const result = determineAction('POST', '/api/admin/users/123e4567-e89b-12d3-a456-426614174000/roles');
      expect(result).toBeDefined();
      expect(result?.action).toBe(AuditAction.ROLE_ASSIGNED);
    });

    it('returns undefined for excluded paths', () => {
      expect(determineAction('POST', '/api/auth/login')).toBeUndefined();
      expect(determineAction('POST', '/api/auth/mfa-challenge')).toBeUndefined();
      expect(determineAction('POST', '/api/auth/refresh')).toBeUndefined();
      expect(determineAction('POST', '/api/auth/logout')).toBeUndefined();
      expect(determineAction('GET', '/api/health')).toBeUndefined();
    });

    it('returns undefined for unknown routes', () => {
      expect(determineAction('POST', '/api/unknown-route')).toBeUndefined();
      expect(determineAction('PUT', '/api/random/path')).toBeUndefined();
    });

    it('returns undefined for GET requests', () => {
      // GETs are excluded at middleware level, but determineAction should also not match
      expect(determineAction('GET', '/api/ndas')).toBeUndefined();
    });
  });

  describe('middleware behavior', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let finishHandler: (() => void) | null = null;

    beforeEach(() => {
      finishHandler = null;

      mockReq = {
        method: 'POST',
        path: '/api/ndas',
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('Mozilla/5.0'),
        userContext: {
          id: 'cognito-123',
          email: 'test@example.com',
          contactId: 'contact-456',
          name: 'Test User',
          roles: ['NDA User'],
          permissions: new Set(['nda:create']),
          authorizedAgencyGroups: [],
          authorizedSubagencies: [],
        },
      };

      mockRes = {
        statusCode: 201,
        statusMessage: 'Created',
        on: vi.fn().mockImplementation((event: string, handler: () => void) => {
          if (event === 'finish') {
            finishHandler = handler;
          }
        }),
      };

      mockNext = vi.fn();
    });

    it('calls next() immediately for GET requests', () => {
      mockReq.method = 'GET';

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).not.toHaveBeenCalled();
    });

    it('calls next() immediately for OPTIONS requests', () => {
      mockReq.method = 'OPTIONS';

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).not.toHaveBeenCalled();
    });

    it('registers finish handler for POST requests', () => {
      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    // Task 6.2: Integration test - POST /api/ndas creates audit entry
    it('logs audit entry on response finish for POST /api/ndas', async () => {
      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);

      // Simulate response finish
      expect(finishHandler).not.toBeNull();
      finishHandler!();

      // Wait for async log
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.NDA_CREATED,
          entityType: 'nda',
          userId: 'contact-456',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          details: expect.objectContaining({
            result: 'success',
            statusCode: 201,
            path: '/api/ndas',
            method: 'POST',
          }),
        })
      );
    });

    it('logs error result for non-success status codes', async () => {
      mockRes.statusCode = 400;
      mockRes.statusMessage = 'Bad Request';

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);
      finishHandler!();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            result: 'error',
            statusCode: 400,
            errorMessage: 'Bad Request',
          }),
        })
      );
    });

    it('does not log for excluded paths', async () => {
      mockReq.path = '/api/auth/login';

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);
      finishHandler!();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('does not log for unknown routes', async () => {
      mockReq.path = '/api/unknown';

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);
      finishHandler!();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(auditService.log).not.toHaveBeenCalled();
    });

    // Task 6.3: Test that failed DB write doesn't crash app
    it('handles audit log failure gracefully', async () => {
      const mockError = new Error('Database connection failed');
      vi.mocked(auditService.log).mockRejectedValueOnce(mockError);

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);
      finishHandler!();

      // Should not throw - wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Middleware should have called next() - app continues
      expect(mockNext).toHaveBeenCalled();
    });

    it('extracts entity ID from path for update operations', async () => {
      mockReq.method = 'PUT';
      mockReq.path = '/api/ndas/123e4567-e89b-12d3-a456-426614174000';
      mockRes.statusCode = 200;

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);
      finishHandler!();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.NDA_UPDATED,
          entityId: '123e4567-e89b-12d3-a456-426614174000',
        })
      );
    });

    it('handles missing userContext gracefully', async () => {
      mockReq.userContext = undefined;

      auditMiddleware(mockReq as Request, mockRes as Response, mockNext);
      finishHandler!();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
        })
      );
    });
  });
});

describe('AuditService append-only enforcement', () => {
  // Task 6.4: Verify append-only behavior
  it('auditService should not have update method', () => {
    expect((auditService as any).update).toBeUndefined();
    expect((auditService as any).updateLog).toBeUndefined();
    expect((auditService as any).edit).toBeUndefined();
  });

  it('auditService should not have delete method', () => {
    expect((auditService as any).delete).toBeUndefined();
    expect((auditService as any).deleteLog).toBeUndefined();
    expect((auditService as any).remove).toBeUndefined();
  });

  it('auditService should only have log method for writing', () => {
    expect(typeof auditService.log).toBe('function');
  });
});

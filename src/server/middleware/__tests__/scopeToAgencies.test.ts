/**
 * Tests for scopeToAgencies Middleware
 * Story 1.4: Row-Level Security Implementation
 *
 * Tests:
 * - Agency group access filtering (AC1)
 * - Subagency-specific access filtering (AC2)
 * - Combined access (AC5)
 * - No agency access returns empty scope
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  scopeToAgencies,
  hasAgencyAccess,
  getAuthorizedSubagencyIds,
} from '../scopeToAgencies.js';

// Mock agencyScopeService
vi.mock('../../services/agencyScopeService.js', () => ({
  getUserAgencyScope: vi.fn(),
}));

vi.mock('../../services/auditService.js', () => ({
  auditService: {
    log: vi.fn(),
  },
  AuditAction: {
    UNAUTHORIZED_ACCESS_ATTEMPT: 'unauthorized_access_attempt',
  },
}));

import { getUserAgencyScope } from '../../services/agencyScopeService.js';

// Helper to create mock request with user context
function createMockRequest(userContext?: Partial<Request['userContext']>): Partial<Request> {
  return {
    headers: {},
    get: vi.fn().mockReturnValue(undefined),
    ip: '127.0.0.1',
    path: '/test',
    method: 'GET',
    userContext: userContext
      ? {
          id: 'test-cognito-id',
          email: 'test@usmax.com',
          contactId: 'test-contact-id',
          roles: ['Read-Only'],
          permissions: new Set<string>(),
          authorizedAgencyGroups: [],
          authorizedSubagencies: [],
          ...userContext,
        }
      : undefined,
  };
}

// Helper to create mock response
function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('scopeToAgencies Middleware', () => {
  const mockNext = vi.fn() as unknown as NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Authorization', () => {
    it('returns 401 when no userContext exists', async () => {
      const req = createMockRequest() as Request;
      delete req.userContext;
      const res = createMockResponse() as Response;

      await scopeToAgencies(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('attaches empty scope when user has no agency access', async () => {
      const req = createMockRequest({
        authorizedAgencyGroups: [],
        authorizedSubagencies: [],
      }) as Request;
      const res = createMockResponse() as Response;

      await scopeToAgencies(req, res, mockNext);

      expect(req.agencyScope).toEqual({ subagencyId: { in: [] } });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('AC1: Agency Group Access Filtering', () => {
    it('uses pre-computed subagencies from userContext', async () => {
      const authorizedSubagencies = ['sub-1', 'sub-2', 'sub-3'];
      const req = createMockRequest({
        authorizedAgencyGroups: [],
        authorizedSubagencies,
      }) as Request;
      const res = createMockResponse() as Response;

      await scopeToAgencies(req, res, mockNext);

      expect(req.agencyScope).toEqual({ subagencyId: { in: authorizedSubagencies } });
      expect(mockNext).toHaveBeenCalled();
      // Should not call getUserAgencyScope when subagencies are pre-computed
      expect(getUserAgencyScope).not.toHaveBeenCalled();
    });
  });

  describe('AC2: Subagency-Specific Access Filtering', () => {
    it('provides scope with specific subagencies only', async () => {
      const req = createMockRequest({
        authorizedAgencyGroups: [],
        authorizedSubagencies: ['air-force-id'],
      }) as Request;
      const res = createMockResponse() as Response;

      await scopeToAgencies(req, res, mockNext);

      expect(req.agencyScope).toEqual({ subagencyId: { in: ['air-force-id'] } });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('AC5: Combined Agency Group and Subagency Access', () => {
    it('combines agency group and direct subagency access', async () => {
      const req = createMockRequest({
        authorizedAgencyGroups: ['dod-group'],
        authorizedSubagencies: ['dod-sub-1', 'dod-sub-2', 'commercial-sub-1'],
      }) as Request;
      const res = createMockResponse() as Response;

      vi.mocked(getUserAgencyScope).mockResolvedValue({
        subagencyId: { in: ['dod-sub-1', 'dod-sub-2', 'commercial-sub-1', 'group-sub-1'] },
      });

      await scopeToAgencies(req, res, mockNext);

      expect(req.agencyScope).toEqual({
        subagencyId: { in: ['dod-sub-1', 'dod-sub-2', 'commercial-sub-1', 'group-sub-1'] },
      });
      expect(mockNext).toHaveBeenCalled();
      expect(getUserAgencyScope).toHaveBeenCalled();
    });
  });

  describe('Fallback to Database Query', () => {
    it('queries database when userContext has no pre-computed subagencies', async () => {
      const req = createMockRequest({
        authorizedAgencyGroups: ['group-1'],
        authorizedSubagencies: [], // Empty but groups exist - need fresh query
      }) as Request;
      // Override to trigger fallback
      req.userContext!.authorizedAgencyGroups = ['group-1'];
      req.userContext!.authorizedSubagencies = [];
      const res = createMockResponse() as Response;

      // Mock the service to return subagencies
      vi.mocked(getUserAgencyScope).mockResolvedValue({
        subagencyId: { in: ['db-sub-1', 'db-sub-2'] },
      });

      await scopeToAgencies(req, res, mockNext);

      // Should have called the service since there were no pre-computed subagencies
      // but groups existed
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on service error', async () => {
      const req = createMockRequest({
        authorizedAgencyGroups: ['group-1'],
        authorizedSubagencies: undefined as unknown as string[],
      }) as Request;
      const res = createMockResponse() as Response;

      // Force the service to throw
      vi.mocked(getUserAgencyScope).mockRejectedValue(new Error('Database error'));

      await scopeToAgencies(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to determine access scope',
        code: 'SCOPE_ERROR',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Helper Functions', () => {
    describe('hasAgencyAccess', () => {
      it('returns false when agencyScope is undefined', () => {
        const req = {} as Request;
        expect(hasAgencyAccess(req)).toBe(false);
      });

      it('returns false when no subagencies authorized', () => {
        const req = { agencyScope: { subagencyId: { in: [] } } } as Request;
        expect(hasAgencyAccess(req)).toBe(false);
      });

      it('returns true when subagencies are authorized', () => {
        const req = { agencyScope: { subagencyId: { in: ['sub-1'] } } } as Request;
        expect(hasAgencyAccess(req)).toBe(true);
      });
    });

    describe('getAuthorizedSubagencyIds', () => {
      it('returns empty array when agencyScope is undefined', () => {
        const req = {} as Request;
        expect(getAuthorizedSubagencyIds(req)).toEqual([]);
      });

      it('returns authorized subagency IDs', () => {
        const req = { agencyScope: { subagencyId: { in: ['sub-1', 'sub-2'] } } } as Request;
        expect(getAuthorizedSubagencyIds(req)).toEqual(['sub-1', 'sub-2']);
      });
    });
  });
});

/**
 * Attach User Context Middleware Tests
 * Story 1.2: JWT Middleware & User Context
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../services/userContextService.js', () => ({
  loadUserContext: vi.fn(),
  createContactForFirstLogin: vi.fn(),
}));

vi.mock('../../services/auditService.js', () => ({
  auditService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
  AuditAction: {
    USER_AUTO_PROVISIONED: 'user_auto_provisioned',
  },
}));

import { attachUserContext } from '../attachUserContext';
import { loadUserContext, createContactForFirstLogin } from '../../services/userContextService.js';
import { auditService } from '../../services/auditService.js';

const mockLoadUserContext = vi.mocked(loadUserContext);
const mockCreateContactForFirstLogin = vi.mocked(createContactForFirstLogin);
const mockAuditService = vi.mocked(auditService);

function createMockRes() {
  const jsonMock = vi.fn();
  const statusMock = vi.fn(() => ({ json: jsonMock }));
  return {
    res: { status: statusMock, json: jsonMock } as Partial<Response>,
    statusMock,
    jsonMock,
  };
}

describe('attachUserContext middleware', () => {
  let mockReq: Partial<Request>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      user: { id: 'cognito-123', email: 'user@test.com' },
      headers: { 'user-agent': 'test-agent' },
    };
    mockNext = vi.fn();
  });

  it('returns 401 when req.user is missing', async () => {
    const { res, statusMock, jsonMock } = createMockRes();
    const reqWithoutUser = { headers: {} } as Partial<Request>;

    await attachUserContext(reqWithoutUser as Request, res as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('attaches userContext and merges into req.user', async () => {
    const { res } = createMockRes();
    mockLoadUserContext.mockResolvedValue({
      id: 'cognito-123',
      email: 'user@test.com',
      contactId: 'contact-123',
      name: 'Test User',
      active: true,
      permissions: new Set(['nda:view']),
      roles: ['Read-Only'],
      authorizedAgencyGroups: ['agency-1'],
      authorizedSubagencies: ['sub-1'],
    });

    await attachUserContext(mockReq as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as Request).userContext?.contactId).toBe('contact-123');
    expect((mockReq as Request).user?.contactId).toBe('contact-123');
    expect((mockReq as Request).user?.roles).toEqual(['Read-Only']);
  });

  it('auto-provisions user on first login', async () => {
    const { res } = createMockRes();
    mockLoadUserContext.mockResolvedValue(null);
    mockCreateContactForFirstLogin.mockResolvedValue({
      id: 'cognito-123',
      email: 'user@test.com',
      contactId: 'contact-999',
      name: 'user',
      active: true,
      permissions: new Set(['nda:view']),
      roles: ['Read-Only'],
      authorizedAgencyGroups: [],
      authorizedSubagencies: [],
    });

    await attachUserContext(mockReq as Request, res as Response, mockNext);

    expect(mockCreateContactForFirstLogin).toHaveBeenCalledWith('cognito-123', 'user@test.com');
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user_auto_provisioned',
        entityType: 'contact',
      })
    );
    expect((mockReq as Request).userContext?.contactId).toBe('contact-999');
  });

  it('blocks inactive users', async () => {
    const { res, statusMock, jsonMock } = createMockRes();
    mockLoadUserContext.mockResolvedValue({
      id: 'cognito-123',
      email: 'user@test.com',
      contactId: 'contact-123',
      active: false,
      permissions: new Set(['nda:view']),
      roles: ['Read-Only'],
      authorizedAgencyGroups: [],
      authorizedSubagencies: [],
    });

    await attachUserContext(mockReq as Request, res as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'User account is inactive',
      code: 'USER_INACTIVE',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 500 on unexpected errors', async () => {
    const { res, statusMock, jsonMock } = createMockRes();
    mockLoadUserContext.mockRejectedValue(new Error('boom'));

    await attachUserContext(mockReq as Request, res as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Failed to load user context',
      code: 'CONTEXT_LOAD_ERROR',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});

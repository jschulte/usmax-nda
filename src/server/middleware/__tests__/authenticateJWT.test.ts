/**
 * JWT Authentication Middleware Tests
 * Story 1.1: AWS Cognito MFA Integration
 * Task 7.1: Unit tests for JWT validation middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authenticateJWT, optionalAuth } from '../authenticateJWT';

// Mock environment
const originalEnv = process.env;

describe('authenticateJWT middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset environment
    process.env = {
      ...originalEnv,
      USE_MOCK_AUTH: 'true',
      COGNITO_USER_POOL_ID: 'us-east-1_test',
      COGNITO_APP_CLIENT_ID: 'testclient123',
    };

    // Create mock response
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockReq = {
      cookies: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('when no token is provided', () => {
    it('should return 401 with NO_TOKEN code', async () => {
      mockReq.cookies = {};

      await authenticateJWT(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'NO_TOKEN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('with mock tokens (USE_MOCK_AUTH=true)', () => {
    it('should authenticate valid mock token', async () => {
      // Create a valid mock token
      const payload = {
        sub: 'test-user-id',
        email: 'test@usmax.com',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };
      const mockToken = `mock.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;

      mockReq.cookies = { access_token: mockToken };

      await authenticateJWT(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as Request).user).toEqual({
        id: 'test-user-id',
        email: 'test@usmax.com',
      });
    });

    it('should reject expired mock token', async () => {
      // Create an expired mock token
      const payload = {
        sub: 'test-user-id',
        email: 'test@usmax.com',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };
      const mockToken = `mock.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;

      mockReq.cookies = { access_token: mockToken };

      await authenticateJWT(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Token expired, please login again',
        code: 'TOKEN_EXPIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid mock token format', async () => {
      mockReq.cookies = { access_token: 'mock.invalid' };

      await authenticateJWT(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    });
  });
});

describe('optionalAuth middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      USE_MOCK_AUTH: 'true',
    };

    mockReq = {
      cookies: {},
    };

    mockRes = {};

    mockNext = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should call next without error when no token', async () => {
    mockReq.cookies = {};

    await optionalAuth(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as Request).user).toBeUndefined();
  });

  it('should populate user when valid token present', async () => {
    const payload = {
      sub: 'test-user-id',
      email: 'test@usmax.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const mockToken = `mock.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;

    mockReq.cookies = { access_token: mockToken };

    await optionalAuth(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as Request).user).toEqual({
      id: 'test-user-id',
      email: 'test@usmax.com',
    });
  });

  it('should call next without error when token is invalid', async () => {
    mockReq.cookies = { access_token: 'invalid-token' };

    await optionalAuth(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as Request).user).toBeUndefined();
  });
});

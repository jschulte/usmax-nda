/**
 * Authentication Audit Logging Tests
 * Story 6.4: Verify all login attempts are tracked
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { auditService } from '../../services/auditService.js';

// Mock cognitoService
vi.mock('../../services/cognitoService.js', () => ({
  cognitoService: {
    initiateAuth: vi.fn(),
    respondToMFAChallenge: vi.fn(),
  },
}));

// Mock auditService
vi.mock('../../services/auditService.js', async () => {
  const actual = await vi.importActual<typeof import('../../services/auditService.js')>(
    '../../services/auditService.js'
  );
  return {
    ...actual,
    auditService: {
      log: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe('Authentication Audit Logging', () => {
  let app: express.Express;

  beforeAll(() => {
    process.env.USE_MOCK_AUTH = 'true';
    process.env.COOKIE_SECURE = 'false';
    vi.resetModules();
  });

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { default: authRouter } = await import('../auth');
    app.use('/api/auth', authRouter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const buildMockToken = (email: string, sub: string = 'contact-123'): string => {
    const payload = {
      sub,
      email,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    return `mock.${Buffer.from(JSON.stringify(payload)).toString('base64')}.sig`;
  };

  it('logs LOGIN_SUCCESS when login returns tokens', async () => {
    const { cognitoService } = await import('../../services/cognitoService.js');

    vi.mocked(cognitoService.initiateAuth).mockResolvedValue({
      type: 'tokens',
      tokens: {
        accessToken: buildMockToken('test@usmax.com'),
        refreshToken: 'mock-refresh',
        idToken: 'mock-id',
        expiresIn: 3600,
      },
    });

    const response = await request(app)
      .post('/api/auth/login')
      .set('User-Agent', 'TestAgent/1.0')
      .send({ email: 'test@usmax.com', password: 'Test1234!@#$' });

    expect(response.status).toBe(200);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'login_success',
        entityType: 'authentication',
        ipAddress: expect.any(String),
        userAgent: 'TestAgent/1.0',
        details: expect.objectContaining({
          email: 'test@usmax.com',
          method: 'cognito_direct',
        }),
      })
    );
  });

  it('logs LOGIN_FAILED when credentials are invalid', async () => {
    const { cognitoService } = await import('../../services/cognitoService.js');

    vi.mocked(cognitoService.initiateAuth).mockRejectedValue(new Error('Invalid credentials'));

    const response = await request(app)
      .post('/api/auth/login')
      .set('User-Agent', 'TestAgent/1.0')
      .send({ email: 'test@usmax.com', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'login_failed',
        details: expect.objectContaining({
          email: 'test@usmax.com',
          reason: 'invalid_credentials',
        }),
      })
    );
  });

  it('logs MFA_SUCCESS and LOGIN_SUCCESS on MFA verification', async () => {
    const { cognitoService } = await import('../../services/cognitoService.js');

    vi.mocked(cognitoService.respondToMFAChallenge).mockResolvedValue({
      success: true,
      tokens: {
        accessToken: buildMockToken('test@usmax.com'),
        refreshToken: 'mock-refresh',
        idToken: 'mock-id',
        expiresIn: 3600,
      },
    });

    const response = await request(app)
      .post('/api/auth/mfa-challenge')
      .set('User-Agent', 'TestAgent/1.0')
      .set('Cookie', ['_auth_email=test@usmax.com'])
      .send({ session: 'mock-session', mfaCode: '123456' });

    expect(response.status).toBe(200);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'mfa_success',
        details: expect.objectContaining({
          email: 'test@usmax.com',
          method: 'cognito_mfa',
        }),
      })
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'login_success',
        details: expect.objectContaining({
          email: 'test@usmax.com',
          method: 'cognito_mfa',
        }),
      })
    );
  });

  it('logs MFA_FAILED with attemptsRemaining on MFA error', async () => {
    const { cognitoService } = await import('../../services/cognitoService.js');

    vi.mocked(cognitoService.respondToMFAChallenge).mockResolvedValue({
      success: false,
      attemptsRemaining: 2,
      error: 'Invalid MFA code, please try again',
    });

    const response = await request(app)
      .post('/api/auth/mfa-challenge')
      .set('User-Agent', 'TestAgent/1.0')
      .set('Cookie', ['_auth_email=test@usmax.com'])
      .send({ session: 'mock-session', mfaCode: '000000' });

    expect(response.status).toBe(401);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'mfa_failed',
        details: expect.objectContaining({
          email: 'test@usmax.com',
          reason: 'invalid_mfa',
          attemptsRemaining: 2,
        }),
      })
    );
  });
});

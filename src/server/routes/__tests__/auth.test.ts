/**
 * Authentication Routes Tests
 * Story 1.1: AWS Cognito MFA Integration
 * Task 7.2: Integration tests for auth endpoints (mock Cognito responses)
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

// Set environment before importing routes
process.env.USE_MOCK_AUTH = 'true';
process.env.COOKIE_SECURE = 'false';

describe('Auth Routes Integration', () => {
  let app: express.Express;

  beforeAll(async () => {
    // Clear module cache to ensure fresh imports with new env vars
    vi.resetModules();
  });

  beforeEach(async () => {
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { __resetMockAuthState } = await import('../../services/cognitoService');
    __resetMockAuthState();

    // Dynamic import after setting env
    const { default: authRouter } = await import('../auth');
    app.use('/api/auth', authRouter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return MFA challenge for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@usmax.com',
          password: 'Admin123!@#$',
        });

      expect(response.status).toBe(200);
      expect(response.body.challengeName).toBe('SOFTWARE_TOKEN_MFA');
      expect(response.body.session).toMatch(/^mock-session-/);
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
      expect(response.body.code).toBe('MISSING_CREDENTIALS');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@usmax.com',
          password: 'wrong-password',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/mfa-challenge', () => {
    it('should return tokens for valid MFA code', async () => {
      // First login to get a session
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@usmax.com',
          password: 'Admin123!@#$',
        });

      const session = loginResponse.body.session;
      // Get the _auth_email cookie from login response
      const loginCookies = loginResponse.headers['set-cookie'] || [];
      const authEmailCookie = loginCookies.find((c: string) => c.includes('_auth_email'));

      // Then verify MFA with email cookie
      const mfaResponse = await request(app)
        .post('/api/auth/mfa-challenge')
        .set('Cookie', authEmailCookie ? [authEmailCookie] : [])
        .send({
          session,
          mfaCode: '123456', // Mock MFA code
        });

      expect(mfaResponse.status).toBe(200);
      expect(mfaResponse.body.user).toBeDefined();
      expect(mfaResponse.body.user.email).toBe('admin@usmax.com');
      expect(mfaResponse.body.expiresAt).toBeDefined();
      expect(mfaResponse.body.csrfToken).toBeDefined();

      // Check that cookies were set
      const cookies = mfaResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('access_token'))).toBe(true);
      expect(cookies.some((c: string) => c.includes('refresh_token'))).toBe(true);
      expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true);
      expect(cookies.some((c: string) => c.includes('csrf_token'))).toBe(true);
    });

    it('should reject invalid MFA code with attempts remaining', async () => {
      // First login to get a session
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@usmax.com',
          password: 'Test1234!@#$',
        });

      const session = loginResponse.body.session;
      const loginCookies = loginResponse.headers['set-cookie'] || [];
      const authEmailCookie = loginCookies.find((c: string) => c.includes('_auth_email'));

      // Try with wrong code
      const mfaResponse = await request(app)
        .post('/api/auth/mfa-challenge')
        .set('Cookie', authEmailCookie ? [authEmailCookie] : [])
        .send({
          session,
          mfaCode: '000000', // Wrong code
        });

      expect(mfaResponse.status).toBe(401);
      expect(mfaResponse.body.error).toBe('Invalid MFA code, please try again');
      expect(mfaResponse.body.attemptsRemaining).toBe(2);
      expect(mfaResponse.body.code).toBe('INVALID_MFA');
    });

    it('should lock account after 3 failed attempts', async () => {
      // First login to get a session
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@usmax.com',
          password: 'Test1234!@#$',
        });

      const session = loginResponse.body.session;
      const loginCookies = loginResponse.headers['set-cookie'] || [];
      const authEmailCookie = loginCookies.find((c: string) => c.includes('_auth_email'));

      // Fail 3 times
      await request(app).post('/api/auth/mfa-challenge').set('Cookie', authEmailCookie ? [authEmailCookie] : []).send({ session, mfaCode: '000001' });
      await request(app).post('/api/auth/mfa-challenge').set('Cookie', authEmailCookie ? [authEmailCookie] : []).send({ session, mfaCode: '000002' });
      const finalResponse = await request(app)
        .post('/api/auth/mfa-challenge')
        .set('Cookie', authEmailCookie ? [authEmailCookie] : [])
        .send({ session, mfaCode: '000003' });

      expect(finalResponse.status).toBe(401);
      expect(finalResponse.body.error).toBe('Account temporarily locked. Please try again in 5 minutes.');
      expect(finalResponse.body.attemptsRemaining).toBe(0);
      expect(finalResponse.body.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens when valid refresh token present', async () => {
      // First complete full login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@usmax.com',
          password: 'Admin123!@#$',
        });

      const loginCookies = loginResponse.headers['set-cookie'] || [];
      const authEmailCookie = loginCookies.find((c: string) => c.includes('_auth_email'));

      const mfaResponse = await request(app)
        .post('/api/auth/mfa-challenge')
        .set('Cookie', authEmailCookie ? [authEmailCookie] : [])
        .send({
          session: loginResponse.body.session,
          mfaCode: '123456',
        });

      // Extract cookies
      const cookies = mfaResponse.headers['set-cookie'] || [];
      const refreshCookie = cookies.find((c: string) => c.includes('refresh_token'));
      const csrfCookie = cookies.find((c: string) => c.includes('csrf_token'));
      const csrfToken = mfaResponse.body.csrfToken;

      // Try to refresh
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshCookie, csrfCookie].filter(Boolean) as string[])
        .set('x-csrf-token', csrfToken);

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.expiresAt).toBeDefined();
      expect(refreshResponse.body.csrfToken).toBeDefined();
    });

    it('should return 401 when no refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh');

      expect(response.status).toBe(403); // Returns 403 Forbidden when no refresh token
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear all auth cookies', async () => {
      // First complete full login to get CSRF token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@usmax.com',
          password: 'Admin123!@#$',
        });

      const loginCookies = loginResponse.headers['set-cookie'] || [];
      const authEmailCookie = loginCookies.find((c: string) => c.includes('_auth_email'));

      const mfaResponse = await request(app)
        .post('/api/auth/mfa-challenge')
        .set('Cookie', authEmailCookie ? [authEmailCookie] : [])
        .send({
          session: loginResponse.body.session,
          mfaCode: '123456',
        });

      const cookies = mfaResponse.headers['set-cookie'] || [];
      const csrfCookie = cookies.find((c: string) => c.includes('csrf_token'));
      const csrfToken = mfaResponse.body.csrfToken;

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', csrfCookie ? [csrfCookie] : [])
        .set('x-csrf-token', csrfToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify cookies are cleared (set with max-age=0 or expires in past)
      const logoutCookies = response.headers['set-cookie'];
      expect(logoutCookies).toBeDefined();
      expect(logoutCookies.some((c: string) => c.includes('access_token'))).toBe(true);
      expect(logoutCookies.some((c: string) => c.includes('refresh_token'))).toBe(true);
      expect(logoutCookies.some((c: string) => c.includes('csrf_token'))).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info when authenticated', async () => {
      // First complete full login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@usmax.com',
          password: 'Admin123!@#$',
        });

      const loginCookies = loginResponse.headers['set-cookie'] || [];
      const authEmailCookie = loginCookies.find((c: string) => c.includes('_auth_email'));

      const mfaResponse = await request(app)
        .post('/api/auth/mfa-challenge')
        .set('Cookie', authEmailCookie ? [authEmailCookie] : [])
        .send({
          session: loginResponse.body.session,
          mfaCode: '123456',
        });

      // Extract cookies
      const cookies = mfaResponse.headers['set-cookie'] || [];
      const accessCookie = cookies.find((c: string) => c.includes('access_token'));

      // Request /me with cookie
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Cookie', accessCookie ? [accessCookie] : []);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.user).toBeDefined();
      expect(meResponse.body.user.email).toBe('admin@usmax.com');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
      expect(response.body.code).toBe('NO_TOKEN');
    });
  });
});

// Unit tests for the Cognito service
describe('CognitoService', () => {
  beforeEach(() => {
    process.env.USE_MOCK_AUTH = 'true';
  });

  describe('mock mode', () => {
    it('should return MFA challenge for valid credentials', async () => {
      const { cognitoService } = await import('../../services/cognitoService');

      const result = await cognitoService.initiateAuth('admin@usmax.com', 'Admin123!@#$');

      expect(result.type).toBe('mfa_required');
      expect(result.challenge).toBeDefined();
      expect(result.challenge?.challengeName).toBe('SOFTWARE_TOKEN_MFA');
      expect(result.challenge?.session).toMatch(/^mock-session-/);
    });

    it('should reject invalid credentials', async () => {
      const { cognitoService } = await import('../../services/cognitoService');

      await expect(
        cognitoService.initiateAuth('admin@usmax.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should validate MFA code correctly', async () => {
      const { cognitoService } = await import('../../services/cognitoService');

      // First, get a session
      const authResult = await cognitoService.initiateAuth('admin@usmax.com', 'Admin123!@#$');
      const session = authResult.challenge!.session;

      // Then verify with correct code
      const mfaResult = await cognitoService.respondToMFAChallenge(
        session,
        '123456',  // Mock MFA code
        'admin@usmax.com'
      );

      expect(mfaResult.success).toBe(true);
      expect(mfaResult.tokens).toBeDefined();
      expect(mfaResult.tokens?.accessToken).toMatch(/^mock\./);
    });

    it('should reject invalid MFA code with attempts remaining', async () => {
      const { cognitoService } = await import('../../services/cognitoService');

      // Get a session
      const authResult = await cognitoService.initiateAuth('test@usmax.com', 'Test1234!@#$');
      const session = authResult.challenge!.session;

      // Try with wrong code
      const mfaResult = await cognitoService.respondToMFAChallenge(
        session,
        '000000',  // Wrong code
        'test@usmax.com'
      );

      expect(mfaResult.success).toBe(false);
      expect(mfaResult.attemptsRemaining).toBe(2);
      expect(mfaResult.error).toBe('Invalid MFA code, please try again');
    });

    it('should lock after 3 failed MFA attempts', async () => {
      const { cognitoService } = await import('../../services/cognitoService');

      // Get a session
      const authResult = await cognitoService.initiateAuth('admin@usmax.com', 'Admin123!@#$');
      const session = authResult.challenge!.session;

      // Fail 3 times
      await cognitoService.respondToMFAChallenge(session, '000001', 'admin@usmax.com');
      await cognitoService.respondToMFAChallenge(session, '000002', 'admin@usmax.com');
      const finalResult = await cognitoService.respondToMFAChallenge(session, '000003', 'admin@usmax.com');

      expect(finalResult.success).toBe(false);
      expect(finalResult.attemptsRemaining).toBe(0);
      expect(finalResult.error).toBe('Account temporarily locked. Please try again in 5 minutes.');
    });
  });
});

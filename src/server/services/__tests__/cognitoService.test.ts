/**
 * Unit Tests for CognitoService
 * Story 1.1: AWS Cognito MFA Integration
 * Task 10.1: Unit tests for cognitoService (with mocked AWS SDK)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cognitoService, __resetMockAuthState } from '../cognitoService';

// Set up mock environment
process.env.USE_MOCK_AUTH = 'true';
process.env.COGNITO_USER_POOL_ID = 'test-pool';
process.env.COGNITO_APP_CLIENT_ID = 'test-client';

describe('CognitoService - Mock Mode', () => {
  beforeEach(() => {
    // Reset service state
    vi.clearAllMocks();
    __resetMockAuthState();
  });

  describe('initiateAuth', () => {
    it('should return MFA challenge for valid mock credentials', async () => {
      const result = await cognitoService.initiateAuth('admin@usmax.com', 'Admin123!@#$');

      expect(result.type).toBe('mfa_required');
      expect(result.challenge).toBeDefined();
      expect(result.challenge?.challengeName).toBe('SOFTWARE_TOKEN_MFA');
      expect(result.challenge?.session).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      await expect(
        cognitoService.initiateAuth('admin@usmax.com', 'WrongPassword')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        cognitoService.initiateAuth('nonexistent@usmax.com', 'AnyPassword123!')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should handle test user credentials', async () => {
      const result = await cognitoService.initiateAuth('test@usmax.com', 'Test1234!@#$');

      expect(result.type).toBe('mfa_required');
      expect(result.challenge).toBeDefined();
    });
  });

  describe('respondToMFAChallenge', () => {
    it('should return tokens for correct MFA code (123456)', async () => {
      // First get MFA challenge
      const authResult = await cognitoService.initiateAuth('admin@usmax.com', 'Admin123!@#$');
      expect(authResult.type).toBe('mfa_required');

      // Respond with correct code
      const mfaResult = await cognitoService.respondToMFAChallenge(
        authResult.challenge!.session,
        '123456',
        'admin@usmax.com'
      );

      expect(mfaResult.success).toBe(true);
      expect(mfaResult.tokens).toBeDefined();
      expect(mfaResult.tokens?.accessToken).toBeDefined();
      expect(mfaResult.tokens?.refreshToken).toBeDefined();
      expect(mfaResult.tokens?.idToken).toBeDefined();
      expect(mfaResult.tokens?.expiresIn).toBe(14400); // 4 hours
    });

    it('should reject invalid MFA code', async () => {
      const authResult = await cognitoService.initiateAuth('admin@usmax.com', 'Admin123!@#$');

      const result = await cognitoService.respondToMFAChallenge(
        authResult.challenge!.session,
        '000000',
        'admin@usmax.com'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid MFA code');
    });

    it('should track MFA attempts and show remaining count', async () => {
      const authResult = await cognitoService.initiateAuth('test@usmax.com', 'Test1234!@#$');

      // First failed attempt
      const result1 = await cognitoService.respondToMFAChallenge(
        authResult.challenge!.session,
        '111111',
        'test@usmax.com'
      );

      expect(result1.success).toBe(false);
      expect(result1.attemptsRemaining).toBe(2);

      // Second failed attempt
      const result2 = await cognitoService.respondToMFAChallenge(
        authResult.challenge!.session,
        '222222',
        'test@usmax.com'
      );

      expect(result2.success).toBe(false);
      expect(result2.attemptsRemaining).toBe(1);
    });

    it('should lock account after 3 failed MFA attempts', async () => {
      const authResult = await cognitoService.initiateAuth('admin@usmax.com', 'Admin123!@#$');

      // 3 failed attempts
      for (let i = 0; i < 3; i++) {
        const result = await cognitoService.respondToMFAChallenge(
          authResult.challenge!.session,
          '999999',
          'admin@usmax.com'
        );

        expect(result.success).toBe(false);

        if (i === 2) {
          expect(result.error).toContain('Account temporarily locked');
        }
      }

      // 4th attempt should be locked
      const result4 = await cognitoService.respondToMFAChallenge(
        authResult.challenge!.session,
        '123456', // Even correct code should be rejected
        'admin@usmax.com'
      );

      expect(result4.success).toBe(false);
      expect(result4.error).toContain('Account temporarily locked');
    });

    it('should reset MFA state after successful login', async () => {
      // First login with correct code
      const authResult1 = await cognitoService.initiateAuth('test@usmax.com', 'Test1234!@#$');
      const mfaResult1 = await cognitoService.respondToMFAChallenge(
        authResult1.challenge!.session,
        '123456',
        'test@usmax.com'
      );

      expect(mfaResult1.success).toBe(true);

      // Second login should have clean slate (no attempt tracking from first login)
      const authResult2 = await cognitoService.initiateAuth('test@usmax.com', 'Test1234!@#$');
      const mfaResult2 = await cognitoService.respondToMFAChallenge(
        authResult2.challenge!.session,
        '123456',
        'test@usmax.com'
      );

      expect(mfaResult2.success).toBe(true);
    });

    it('should reject invalid session', async () => {
      const result = await cognitoService.respondToMFAChallenge(
        'invalid-session-id',
        '123456',
        'admin@usmax.com'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired session');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh access token with valid refresh token', async () => {
      // First get tokens
      const authResult = await cognitoService.initiateAuth('admin@usmax.com', 'Admin123!@#$');
      const mfaResult = await cognitoService.respondToMFAChallenge(
        authResult.challenge!.session,
        '123456',
        'admin@usmax.com'
      );

      expect(mfaResult.tokens).toBeDefined();
      const originalRefreshToken = mfaResult.tokens!.refreshToken;

      // Refresh tokens
      const newTokens = await cognitoService.refreshTokens(originalRefreshToken);

      expect(newTokens).toBeDefined();
      expect(newTokens?.accessToken).toBeDefined();
      expect(newTokens?.idToken).toBeDefined();
      expect(newTokens?.refreshToken).toBe(originalRefreshToken); // Same refresh token
      expect(newTokens?.expiresIn).toBe(14400); // 4 hours
    });

    it('should return null for invalid refresh token', async () => {
      const result = await cognitoService.refreshTokens('invalid-refresh-token');
      expect(result).toBeNull();
    });

    it('should return null for empty refresh token', async () => {
      const result = await cognitoService.refreshTokens('');
      expect(result).toBeNull();
    });
  });

  describe('Token Structure', () => {
    it('should return properly structured JWT tokens', async () => {
      const authResult = await cognitoService.initiateAuth('admin@usmax.com', 'Admin123!@#$');
      const mfaResult = await cognitoService.respondToMFAChallenge(
        authResult.challenge!.session,
        '123456',
        'admin@usmax.com'
      );

      expect(mfaResult.success).toBe(true);
      expect(mfaResult.tokens).toBeDefined();

      const { accessToken, idToken, refreshToken } = mfaResult.tokens!;

      // Tokens should be non-empty strings
      expect(accessToken).toBeTruthy();
      expect(idToken).toBeTruthy();
      expect(refreshToken).toBeTruthy();

      // Tokens should be different
      expect(accessToken).not.toBe(refreshToken);

      // Token format: Mock tokens have 3 parts separated by dots (mock.{payload}.signature)
      expect(accessToken.split('.').length).toBe(3);
      expect(idToken.split('.').length).toBe(3);
    });

    it('should include user information in tokens', async () => {
      const authResult = await cognitoService.initiateAuth('admin@usmax.com', 'Admin123!@#$');
      const mfaResult = await cognitoService.respondToMFAChallenge(
        authResult.challenge!.session,
        '123456',
        'admin@usmax.com'
      );

      expect(mfaResult.success).toBe(true);
      const { idToken } = mfaResult.tokens!;

      // Decode mock JWT payload
      const payloadBase64 = idToken.split('.')[1];
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString();
      const payload = JSON.parse(payloadJson);

      expect(payload.email).toBe('admin@usmax.com');
      expect(payload.sub).toBe('mock-user-001');
      expect(payload.token_use).toBe('access'); // Mock uses 'access' not 'id'
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent MFA challenges for same user', async () => {
      const auth1 = await cognitoService.initiateAuth('admin@usmax.com', 'Admin123!@#$');
      const auth2 = await cognitoService.initiateAuth('admin@usmax.com', 'Admin123!@#$');

      // Both sessions should be valid
      expect(auth1.challenge?.session).toBeDefined();
      expect(auth2.challenge?.session).toBeDefined();
      expect(auth1.challenge?.session).not.toBe(auth2.challenge?.session);

      // Both should accept correct MFA code
      const mfa1 = await cognitoService.respondToMFAChallenge(
        auth1.challenge!.session,
        '123456',
        'admin@usmax.com'
      );

      const mfa2 = await cognitoService.respondToMFAChallenge(
        auth2.challenge!.session,
        '123456',
        'admin@usmax.com'
      );

      expect(mfa1.success).toBe(true);
      expect(mfa2.success).toBe(true);
    });

    it('should handle empty email gracefully', async () => {
      await expect(
        cognitoService.initiateAuth('', 'AnyPassword123!')
      ).rejects.toThrow();
    });

    it('should handle empty password gracefully', async () => {
      await expect(
        cognitoService.initiateAuth('admin@usmax.com', '')
      ).rejects.toThrow();
    });
  });
});

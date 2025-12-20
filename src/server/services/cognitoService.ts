/**
 * Cognito Authentication Service
 * Story 1.1: AWS Cognito MFA Integration
 *
 * Handles all Cognito interactions including:
 * - User authentication (initiateAuth)
 * - MFA verification (respondToAuthChallenge)
 * - Token refresh
 *
 * Supports mock mode for development without AWS credentials.
 */

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  type InitiateAuthCommandOutput,
  type RespondToAuthChallengeCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';

// Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

export interface MFAChallenge {
  challengeName: string;
  session: string;
}

export interface AuthResult {
  type: 'tokens' | 'mfa_required';
  tokens?: AuthTokens;
  challenge?: MFAChallenge;
}

export interface UserInfo {
  id: string;
  email: string;
}

// Mock data for development
const MOCK_USERS = new Map([
  ['admin@usmax.com', { password: 'Admin123!@#$', id: 'mock-user-001', email: 'admin@usmax.com' }],
  ['test@usmax.com', { password: 'Test1234!@#$', id: 'mock-user-002', email: 'test@usmax.com' }],
]);

const MOCK_MFA_CODE = '123456';

// Track failed MFA attempts per session
const mfaAttempts = new Map<string, number>();

class CognitoService {
  private client: CognitoIdentityProviderClient | null = null;
  private _userPoolId: string | null = null;
  private _clientId: string | null = null;
  private _useMock: boolean | null = null;
  private _initialized = false;

  // Lazy getters to ensure env vars are loaded before access
  private get userPoolId(): string {
    this.ensureInitialized();
    return this._userPoolId!;
  }

  private get clientId(): string {
    this.ensureInitialized();
    return this._clientId!;
  }

  private get useMock(): boolean {
    this.ensureInitialized();
    return this._useMock!;
  }

  private ensureInitialized(): void {
    if (this._initialized) return;

    this._userPoolId = process.env.COGNITO_USER_POOL_ID || '';
    this._clientId = process.env.COGNITO_APP_CLIENT_ID || '';
    this._useMock = process.env.USE_MOCK_AUTH === 'true';

    if (!this._useMock) {
      this.client = new CognitoIdentityProviderClient({
        region: process.env.COGNITO_REGION || 'us-east-1',
      });
    }

    this._initialized = true;
  }

  /**
   * Initiate authentication with email and password
   * Returns either tokens (if MFA not required) or MFA challenge
   */
  async initiateAuth(email: string, password: string): Promise<AuthResult> {
    if (this.useMock) {
      return this.mockInitiateAuth(email, password);
    }

    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_SRP_AUTH',
      ClientId: this.clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await this.client!.send(command);
    return this.parseAuthResponse(response);
  }

  /**
   * Respond to MFA challenge with TOTP code
   */
  async respondToMFAChallenge(
    session: string,
    mfaCode: string,
    email: string
  ): Promise<{ success: boolean; tokens?: AuthTokens; attemptsRemaining?: number; error?: string }> {
    if (this.useMock) {
      return this.mockRespondToMFA(session, mfaCode, email);
    }

    try {
      const command = new RespondToAuthChallengeCommand({
        ChallengeName: 'SOFTWARE_TOKEN_MFA',
        ClientId: this.clientId,
        Session: session,
        ChallengeResponses: {
          USERNAME: email,
          SOFTWARE_TOKEN_MFA_CODE: mfaCode,
        },
      });

      const response = await this.client!.send(command);

      if (response.AuthenticationResult) {
        return {
          success: true,
          tokens: {
            accessToken: response.AuthenticationResult.AccessToken!,
            refreshToken: response.AuthenticationResult.RefreshToken!,
            idToken: response.AuthenticationResult.IdToken!,
            expiresIn: response.AuthenticationResult.ExpiresIn || 14400, // 4 hours default
          },
        };
      }

      return { success: false, error: 'Unexpected response from Cognito' };
    } catch (error: any) {
      // Handle specific Cognito errors
      if (error.name === 'CodeMismatchException') {
        const attempts = (mfaAttempts.get(session) || 0) + 1;
        mfaAttempts.set(session, attempts);

        if (attempts >= 3) {
          mfaAttempts.delete(session);
          return { success: false, attemptsRemaining: 0, error: 'Account temporarily locked' };
        }

        return { success: false, attemptsRemaining: 3 - attempts, error: 'Invalid MFA code' };
      }

      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    if (this.useMock) {
      return this.mockRefreshTokens(refreshToken);
    }

    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const response = await this.client!.send(command);

      if (response.AuthenticationResult) {
        return {
          accessToken: response.AuthenticationResult.AccessToken!,
          refreshToken: refreshToken, // Refresh token stays the same
          idToken: response.AuthenticationResult.IdToken!,
          expiresIn: response.AuthenticationResult.ExpiresIn || 14400,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  // === Mock implementations for development ===

  private mockInitiateAuth(email: string, password: string): AuthResult {
    const user = MOCK_USERS.get(email.toLowerCase());

    if (!user || user.password !== password) {
      throw new Error('Invalid credentials');
    }

    // Always require MFA in mock mode (per FR32)
    const mockSession = `mock-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    mfaAttempts.set(mockSession, 0);

    return {
      type: 'mfa_required',
      challenge: {
        challengeName: 'SOFTWARE_TOKEN_MFA',
        session: mockSession,
      },
    };
  }

  private mockRespondToMFA(
    session: string,
    mfaCode: string,
    email: string
  ): { success: boolean; tokens?: AuthTokens; attemptsRemaining?: number; error?: string } {
    const user = MOCK_USERS.get(email.toLowerCase());
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if session is valid
    if (!mfaAttempts.has(session)) {
      return { success: false, error: 'Invalid or expired session' };
    }

    // Check MFA code
    if (mfaCode !== MOCK_MFA_CODE) {
      const attempts = (mfaAttempts.get(session) || 0) + 1;
      mfaAttempts.set(session, attempts);

      if (attempts >= 3) {
        mfaAttempts.delete(session);
        return { success: false, attemptsRemaining: 0, error: 'Account temporarily locked' };
      }

      return { success: false, attemptsRemaining: 3 - attempts, error: 'Invalid MFA code' };
    }

    // Success - generate mock tokens
    mfaAttempts.delete(session);

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 4 * 60 * 60; // 4 hours

    // Create mock JWT payload
    const mockPayload = {
      sub: user.id,
      email: user.email,
      'cognito:username': user.email,
      token_use: 'access',
      iss: `https://cognito-idp.us-east-1.amazonaws.com/mock-pool`,
      exp: now + expiresIn,
      iat: now,
    };

    // Base64 encode for mock token (not a real JWT, just for development)
    const mockToken = `mock.${Buffer.from(JSON.stringify(mockPayload)).toString('base64')}.signature`;

    return {
      success: true,
      tokens: {
        accessToken: mockToken,
        refreshToken: `mock-refresh-${user.id}-${Date.now()}`,
        idToken: mockToken,
        expiresIn,
      },
    };
  }

  private mockRefreshTokens(refreshToken: string): AuthTokens | null {
    // Extract user ID from mock refresh token (format: mock-refresh-{userId}-{timestamp})
    // User ID may contain hyphens (e.g., mock-user-001), so extract everything between "mock-refresh-" and the last hyphen-number
    const match = refreshToken.match(/mock-refresh-(mock-user-\d+)-\d+$/);
    if (!match) {
      return null;
    }

    const userId = match[1];
    const user = Array.from(MOCK_USERS.values()).find((u) => u.id === userId);
    if (!user) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 4 * 60 * 60;

    const mockPayload = {
      sub: user.id,
      email: user.email,
      'cognito:username': user.email,
      token_use: 'access',
      iss: `https://cognito-idp.us-east-1.amazonaws.com/mock-pool`,
      exp: now + expiresIn,
      iat: now,
    };

    const mockToken = `mock.${Buffer.from(JSON.stringify(mockPayload)).toString('base64')}.signature`;

    return {
      accessToken: mockToken,
      refreshToken,
      idToken: mockToken,
      expiresIn,
    };
  }

  private parseAuthResponse(response: InitiateAuthCommandOutput): AuthResult {
    if (response.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
      return {
        type: 'mfa_required',
        challenge: {
          challengeName: response.ChallengeName,
          session: response.Session!,
        },
      };
    }

    if (response.AuthenticationResult) {
      return {
        type: 'tokens',
        tokens: {
          accessToken: response.AuthenticationResult.AccessToken!,
          refreshToken: response.AuthenticationResult.RefreshToken!,
          idToken: response.AuthenticationResult.IdToken!,
          expiresIn: response.AuthenticationResult.ExpiresIn || 14400,
        },
      };
    }

    throw new Error('Unexpected auth response');
  }
}

// Singleton instance
export const cognitoService = new CognitoService();

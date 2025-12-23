/**
 * Authentication Routes
 * Story 1.1: AWS Cognito MFA Integration
 *
 * Endpoints:
 * - POST /api/auth/login - Initiate login, returns MFA challenge
 * - POST /api/auth/mfa-challenge - Verify MFA code, returns tokens in cookies
 * - POST /api/auth/refresh - Refresh access token
 * - POST /api/auth/logout - Clear auth cookies
 * - GET /api/auth/me - Get current user info
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { randomBytes } from 'crypto';
import { cognitoService } from '../services/cognitoService.js';
import { auditService, AuditAction } from '../services/auditService.js';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';

const router: RouterType = Router();

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true, // Not accessible to JavaScript (XSS prevention)
  secure: process.env.COOKIE_SECURE === 'true', // HTTPS only in production
  sameSite: 'strict' as const, // CSRF prevention
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: '/',
};

const ACCESS_TOKEN_MAX_AGE = 4 * 60 * 60 * 1000; // 4 hours in ms
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

// CSRF token cookie options (intentionally NOT HttpOnly so client can read)
const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'strict' as const,
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: '/',
  maxAge: REFRESH_TOKEN_MAX_AGE,
};

function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

function getOrSetCsrfToken(req: Request, res: Response): string {
  const existing = req.cookies?.csrf_token;
  if (existing) return existing;
  const token = generateCsrfToken();
  res.cookie('csrf_token', token, CSRF_COOKIE_OPTIONS);
  return token;
}

function requireCsrfToken(req: Request, res: Response, next: () => void) {
  const headerToken = req.get('x-csrf-token');
  const cookieToken = req.cookies?.csrf_token;
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'INVALID_CSRF',
    });
  }
  return next();
}

/**
 * POST /api/auth/login
 * Initiates authentication with email and password
 * Returns MFA challenge (MFA is always required per FR32)
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required',
      code: 'MISSING_CREDENTIALS',
    });
  }

  try {
    const result = await cognitoService.initiateAuth(email, password);

    if (result.type === 'mfa_required' && result.challenge) {
      // Store email in session for MFA step (needed for challenge response)
      // Using a simple approach - in production, consider encrypting or using session storage
      res.cookie('_auth_email', email, {
        ...COOKIE_OPTIONS,
        maxAge: 5 * 60 * 1000, // 5 minutes - MFA challenge timeout
      });

      return res.json({
        challengeName: result.challenge.challengeName,
        session: result.challenge.session,
      });
    }

    // Direct token response (shouldn't happen with MFA enforced)
    if (result.type === 'tokens' && result.tokens) {
      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      const csrfToken = getOrSetCsrfToken(req, res);

      await auditService.log({
        action: AuditAction.LOGIN_SUCCESS,
        entityType: 'authentication',
        userId: null, // Will be populated from token
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        details: { email, method: 'cognito_direct' },
      });

      return res.json({
        user: { email },
        expiresAt: Date.now() + result.tokens.expiresIn * 1000,
        csrfToken,
      });
    }

    return res.status(500).json({
      error: 'Unexpected authentication response',
      code: 'AUTH_ERROR',
    });
  } catch (error: any) {
    await auditService.log({
      action: AuditAction.LOGIN_FAILED,
      entityType: 'authentication',
      userId: null,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      details: { email, reason: 'invalid_credentials' },
    });

    return res.status(401).json({
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS',
    });
  }
});

/**
 * POST /api/auth/mfa-challenge
 * Verifies MFA code and returns tokens
 * AC1: Successful MFA flow
 * AC2: Invalid MFA code handling with retry limit
 */
router.post('/mfa-challenge', async (req: Request, res: Response) => {
  const { session, mfaCode } = req.body;
  const email = req.cookies._auth_email;

  if (!session || !mfaCode) {
    return res.status(400).json({
      error: 'Session and MFA code are required',
      code: 'MISSING_MFA_DATA',
    });
  }

  if (!email) {
    return res.status(400).json({
      error: 'Session expired, please login again',
      code: 'SESSION_EXPIRED',
    });
  }

  try {
    const result = await cognitoService.respondToMFAChallenge(session, mfaCode, email);

    if (!result.success) {
      await auditService.log({
        action: AuditAction.MFA_FAILED,
        entityType: 'authentication',
        userId: null,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        details: { email, reason: 'invalid_mfa', attemptsRemaining: result.attemptsRemaining },
      });

      // AC2: Return error with retry count
      return res.status(401).json({
        error: result.error || 'Invalid MFA code, please try again',
        attemptsRemaining: result.attemptsRemaining,
        code: result.attemptsRemaining === 0 ? 'ACCOUNT_LOCKED' : 'INVALID_MFA',
      });
    }

    // Success - set auth cookies
    if (result.tokens) {
      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      const csrfToken = getOrSetCsrfToken(req, res);

      // Clear the temporary email cookie
      res.clearCookie('_auth_email', COOKIE_OPTIONS);

      // Extract user info from token for response
      const userInfo = extractUserFromToken(result.tokens.accessToken);

      await auditService.log({
        action: AuditAction.MFA_SUCCESS,
        entityType: 'authentication',
        userId: userInfo?.id || null,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        details: { email, method: 'cognito_mfa' },
      });

      await auditService.log({
        action: AuditAction.LOGIN_SUCCESS,
        entityType: 'authentication',
        userId: userInfo?.id || null,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        details: { email, method: 'cognito_mfa' },
      });

      return res.json({
        user: userInfo || { email },
        expiresAt: Date.now() + result.tokens.expiresIn * 1000,
        csrfToken,
      });
    }

    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  } catch (error: any) {
    console.error('MFA challenge error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refreshes the access token using the refresh token
 * AC3: Session extension
 */
router.post('/refresh', requireCsrfToken, async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({
      error: 'No refresh token',
      code: 'NO_REFRESH_TOKEN',
    });
  }

  try {
    const tokens = await cognitoService.refreshTokens(refreshToken);

    if (!tokens) {
      return res.status(401).json({
        error: 'Session expired',
        code: 'SESSION_EXPIRED',
      });
    }

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    const csrfToken = getOrSetCsrfToken(req, res);

    return res.json({
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      csrfToken,
    });
  } catch (error) {
    return res.status(401).json({
      error: 'Session expired',
      code: 'SESSION_EXPIRED',
    });
  }
});

/**
 * POST /api/auth/logout
 * Clears all auth cookies
 * AC5: Logout clears all state
 */
router.post('/logout', requireCsrfToken, async (req: Request, res: Response) => {
  const accessToken = req.cookies.access_token;
  const userInfo = accessToken ? extractUserFromToken(accessToken) : null;

  // Clear all auth cookies
  res.clearCookie('access_token', COOKIE_OPTIONS);
  res.clearCookie('refresh_token', COOKIE_OPTIONS);
  res.clearCookie('_auth_email', COOKIE_OPTIONS);
  res.clearCookie('csrf_token', CSRF_COOKIE_OPTIONS);

  await auditService.log({
    action: AuditAction.LOGOUT,
    entityType: 'authentication',
    userId: userInfo?.id || null,
    ipAddress: req.ip || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    details: { method: 'user_initiated' },
  });

  return res.json({ success: true });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user info with permissions
 * Story H-1: Added attachUserContext to expose permissions for usePermissions hook
 * Requires valid access token
 */
router.get('/me', authenticateJWT, attachUserContext, (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(500).json({
      error: 'Authentication context missing',
      code: 'AUTH_CONTEXT_MISSING',
    });
  }

  const accessToken = req.cookies.access_token;
  const expiresAt = accessToken ? getTokenExpiry(accessToken) : null;
  const csrfToken = getOrSetCsrfToken(req, res);

  // Include permissions and roles from userContext for frontend usePermissions hook
  const permissions = req.userContext?.permissions
    ? Array.from(req.userContext.permissions)
    : [];
  const roles = req.userContext?.roles ?? [];

  return res.json({
    user: {
      ...req.user,
      permissions,
      roles,
    },
    expiresAt,
    csrfToken,
  });
});

// === Helper Functions ===

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  res.cookie('refresh_token', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

function extractUserFromToken(token: string): { id: string; email: string } | null {
  try {
    // Handle mock tokens
    if (token.startsWith('mock.')) {
      if (process.env.USE_MOCK_AUTH !== 'true') return null;
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
      return {
        id: payload.sub,
        email: payload.email,
      };
    }

    // Handle real JWT tokens
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return {
      id: payload.sub,
      email: payload.email || payload['cognito:username'],
    };
  } catch {
    return null;
  }
}

function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export default router;

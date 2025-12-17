/**
 * JWT Authentication Middleware
 * Story 1.1: AWS Cognito MFA Integration
 * Task 3: JWT Validation Middleware
 *
 * Validates JWT access tokens from Cognito using aws-jwt-verify.
 * Extracts user information and attaches to request.
 *
 * AC1, AC4: Validates tokens stored in HttpOnly cookies
 */

import type { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        // Permissions will be added in Story 1.3
      };
    }
  }
}

// Verifier instance - created lazily and cached
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifier && process.env.USE_MOCK_AUTH !== 'true') {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      tokenUse: 'access',
      clientId: process.env.COGNITO_APP_CLIENT_ID!,
    });
  }
  return verifier;
}

/**
 * JWT Authentication Middleware
 *
 * Validates the access token from cookies and populates req.user
 *
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export async function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  // Extract token from HttpOnly cookie (AC4)
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_TOKEN',
    });
  }

  try {
    // Handle mock tokens in development
    if (process.env.USE_MOCK_AUTH === 'true' && token.startsWith('mock.')) {
      const userInfo = extractMockUserFromToken(token);
      if (!userInfo) {
        return res.status(401).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN',
        });
      }

      // Check if mock token is expired
      if (userInfo.exp && userInfo.exp < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({
          error: 'Token expired, please login again',
          code: 'TOKEN_EXPIRED',
        });
      }

      req.user = {
        id: userInfo.id,
        email: userInfo.email,
      };
      return next();
    }

    // Verify real Cognito JWT (Task 3.1, 3.2)
    const jwtVerifier = getVerifier();
    if (!jwtVerifier) {
      // If no verifier (mock mode without mock token), fail
      return res.status(500).json({
        error: 'Authentication not configured',
        code: 'AUTH_NOT_CONFIGURED',
      });
    }

    const payload = await jwtVerifier.verify(token);

    // Extract user info from validated token (Task 3.3, 3.4)
    req.user = {
      id: payload.sub,
      email: (payload as any).email || (payload as any)['cognito:username'],
      // permissions will be loaded in Story 1.3
    };

    next();
  } catch (error: any) {
    // Handle specific error types (Task 3.5)
    if (error.name === 'JwtExpiredError' || error.message?.includes('expired')) {
      return res.status(401).json({
        error: 'Token expired, please login again',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JwtInvalidSignatureError') {
      return res.status(401).json({
        error: 'Invalid token signature',
        code: 'INVALID_SIGNATURE',
      });
    }

    if (error.name === 'JwtInvalidClaimError') {
      return res.status(401).json({
        error: 'Invalid token claims',
        code: 'INVALID_CLAIMS',
      });
    }

    // Generic invalid token error
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }
}

/**
 * Optional authentication middleware
 * Does not fail if no token present, but populates req.user if valid token exists
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies.access_token;

  if (!token) {
    return next();
  }

  try {
    if (process.env.USE_MOCK_AUTH === 'true' && token.startsWith('mock.')) {
      const userInfo = extractMockUserFromToken(token);
      if (userInfo && (!userInfo.exp || userInfo.exp >= Math.floor(Date.now() / 1000))) {
        req.user = {
          id: userInfo.id,
          email: userInfo.email,
        };
      }
      return next();
    }

    const jwtVerifier = getVerifier();
    if (jwtVerifier) {
      const payload = await jwtVerifier.verify(token);
      req.user = {
        id: payload.sub,
        email: (payload as any).email || (payload as any)['cognito:username'],
      };
    }
  } catch {
    // Ignore errors in optional auth
  }

  next();
}

/**
 * Extract user info from mock token
 * Mock tokens have format: mock.<base64-payload>.signature
 */
function extractMockUserFromToken(token: string): { id: string; email: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const payloadBase64 = parts[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

    return {
      id: payload.sub,
      email: payload.email,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

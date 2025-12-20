/**
 * Middleware Pipeline Integration Test
 * Story 1.2: JWT Middleware & User Context
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

// Ensure mock auth and no database for mock user context
process.env.USE_MOCK_AUTH = 'true';
process.env.COOKIE_SECURE = 'false';
delete process.env.DATABASE_URL;

describe('middleware pipeline', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.resetModules();
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { authenticateJWT } = await import('../authenticateJWT');
    const { attachUserContext } = await import('../attachUserContext');

    app.get('/protected', authenticateJWT, attachUserContext, (req, res) => {
      res.json({
        user: req.user
          ? { ...req.user, permissions: Array.from(req.user.permissions ?? []) }
          : null,
        userContext: req.userContext
          ? {
              ...req.userContext,
              permissions: Array.from(req.userContext.permissions ?? []),
            }
          : null,
      });
    });
  });

  it('returns user context when valid mock token is provided', async () => {
    const payload = {
      sub: 'mock-user-001',
      email: 'admin@usmax.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = `mock.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;

    const response = await request(app)
      .get('/protected')
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.userContext).toMatchObject({
      id: 'mock-user-001',
      email: 'admin@usmax.com',
      contactId: 'mock-contact-001',
      roles: ['Admin'],
    });
    expect(response.body.user.permissions).toContain('nda:view');
  });
});

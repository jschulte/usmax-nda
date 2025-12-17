/**
 * USMax NDA Management System - Express Server
 * Story 1.1: AWS Cognito MFA Integration
 *
 * This is the main entry point for the backend server.
 * Handles authentication, API routing, and middleware setup.
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config(); // Also load .env if exists

import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import agencyGroupsRouter from './routes/agencyGroups.js';
import subagenciesRouter from './routes/subagencies.js';
import agencyAccessRouter from './routes/agencyAccess.js';
import usersRouter from './routes/users.js';
import ndasRouter from './routes/ndas.js';
import notificationsRouter from './routes/notifications.js';
import templatesRouter from './routes/templates.js';
import contactsRouter from './routes/contacts.js';
import dashboardRouter from './routes/dashboard.js';
import { authenticateJWT } from './middleware/authenticateJWT.js';
import { attachUserContext } from './middleware/attachUserContext.js';
import type { Express } from 'express';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// === Middleware Setup ===

// CORS configuration for frontend (Task 2.6)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON bodies
app.use(express.json());

// Parse cookies (Task 2.7)
app.use(cookieParser());

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// === Routes ===

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    useMockAuth: process.env.USE_MOCK_AUTH === 'true',
  });
});

// Auth routes (public)
app.use('/api/auth', authRouter);

// Admin routes (requires admin:manage_users permission - Story 1.3)
app.use('/api/admin', adminRouter);

// Agency Groups routes (requires admin:manage_agencies permission - Story 2.1)
app.use('/api/agency-groups', agencyGroupsRouter);

// Subagencies routes (requires admin:manage_agencies permission - Story 2.2)
// Note: Some routes are under /api/agency-groups/:groupId/subagencies
app.use('/api', subagenciesRouter);

// Agency Access routes (requires admin:manage_agencies permission - Story 2.3, 2.4)
// Handles access grants for agency groups and subagencies
app.use('/api', agencyAccessRouter);

// Users routes (requires admin:manage_users permission - Story 2.5)
app.use('/api/users', usersRouter);

// NDAs routes (requires nda:* permissions - Story 3.1+)
app.use('/api/ndas', ndasRouter);

// Notifications routes (Story 3.11)
// Handles notification preferences and NDA subscriptions
app.use('/api', notificationsRouter);

// Templates routes (Story 3.13)
// RTF template selection and preview
app.use('/api/rtf-templates', templatesRouter);

// Contacts routes (Story 3.14)
// POC management and internal user lookup
app.use('/api/contacts', contactsRouter);

// Dashboard routes (Stories 5.8-5.12)
// Personalized dashboard, metrics, alerts
app.use('/api/dashboard', dashboardRouter);

// Protected routes example (requires authentication + user context)
// Middleware pipeline: authenticateJWT → attachUserContext → route handler
app.get('/api/protected', authenticateJWT, attachUserContext, (req, res) => {
  res.json({
    message: 'You have access to protected resources',
    user: {
      id: req.userContext?.id,
      email: req.userContext?.email,
      contactId: req.userContext?.contactId,
      name: req.userContext?.name,
      roles: req.userContext?.roles,
      permissions: req.userContext?.permissions ? Array.from(req.userContext.permissions) : [],
      authorizedAgencyGroups: req.userContext?.authorizedAgencyGroups,
      authorizedSubagencies: req.userContext?.authorizedSubagencies,
    },
  });
});

// User context endpoint (returns full user context)
app.get('/api/me', authenticateJWT, attachUserContext, (req, res) => {
  if (!req.userContext) {
    return res.status(401).json({ error: 'User context not loaded', code: 'NO_CONTEXT' });
  }

  res.json({
    id: req.userContext.id,
    email: req.userContext.email,
    contactId: req.userContext.contactId,
    name: req.userContext.name,
    roles: req.userContext.roles,
    permissions: Array.from(req.userContext.permissions),
    authorizedAgencyGroups: req.userContext.authorizedAgencyGroups,
    authorizedSubagencies: req.userContext.authorizedSubagencies,
  });
});

// === Error Handling ===

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err);

  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({
    error: message,
    code: 'INTERNAL_ERROR',
  });
});

// === Server Start ===

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║          USMax NDA Management System - API Server         ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                 ║
║  Mock Auth Mode:    ${process.env.USE_MOCK_AUTH === 'true' ? 'ENABLED' : 'DISABLED'}                          ║
║  Environment:       ${process.env.NODE_ENV || 'development'}                      ║
╠═══════════════════════════════════════════════════════════╣
║  Auth Endpoints:                                          ║
║    POST /api/auth/login         - Initiate login          ║
║    POST /api/auth/mfa-challenge - Verify MFA code         ║
║    POST /api/auth/refresh       - Refresh tokens          ║
║    POST /api/auth/logout        - Logout                  ║
║    GET  /api/auth/me            - Current user info       ║
╠═══════════════════════════════════════════════════════════╣
║  Admin Endpoints (Story 1.3):                             ║
║    GET  /api/admin/roles        - List all roles          ║
║    GET  /api/admin/permissions  - List all permissions    ║
║    GET  /api/admin/users/:id/roles - Get user roles       ║
║    POST /api/admin/users/:id/roles - Assign role          ║
║    DELETE /api/admin/users/:id/roles/:roleId - Remove     ║
╠═══════════════════════════════════════════════════════════╣
║  Agency Groups Endpoints (Story 2.1):                     ║
║    GET    /api/agency-groups      - List all groups       ║
║    GET    /api/agency-groups/:id  - Get group details     ║
║    POST   /api/agency-groups      - Create group          ║
║    PUT    /api/agency-groups/:id  - Update group          ║
║    DELETE /api/agency-groups/:id  - Delete group          ║
╠═══════════════════════════════════════════════════════════╣
║  Subagencies Endpoints (Story 2.2):                       ║
║    GET  /api/agency-groups/:id/subagencies - List subs    ║
║    GET  /api/subagencies/:id     - Get subagency          ║
║    POST /api/agency-groups/:id/subagencies - Create       ║
║    PUT  /api/subagencies/:id     - Update subagency       ║
║    DELETE /api/subagencies/:id   - Delete subagency       ║
╠═══════════════════════════════════════════════════════════╣
║  Agency Access Endpoints (Story 2.3, 2.4):                ║
║    GET  /api/agency-groups/:id/access - List group access ║
║    POST /api/agency-groups/:id/access - Grant group       ║
║    DEL  /api/agency-groups/:id/access/:cid - Revoke group ║
║    GET  /api/subagencies/:id/access - List sub access     ║
║    POST /api/subagencies/:id/access - Grant sub access    ║
║    DEL  /api/subagencies/:id/access/:cid - Revoke sub     ║
║    GET  /api/contacts/search?q= - User autocomplete       ║
╠═══════════════════════════════════════════════════════════╣
║  Users Endpoints (Story 2.5, 2.6):                        ║
║    GET    /api/users           - List users (paginated)   ║
║    GET    /api/users/:id       - Get user details         ║
║    POST   /api/users           - Create user              ║
║    PUT    /api/users/:id       - Update user              ║
║    DELETE /api/users/:id       - Deactivate user          ║
║    GET    /api/users/:id/access-summary - Access summary  ║
╠═══════════════════════════════════════════════════════════╣
║  Access Export (Story 2.6):                               ║
║    GET    /api/admin/access-export - CSV compliance audit ║
╠═══════════════════════════════════════════════════════════╣
║  NDA Endpoints (Stories 3.1-3.3):                         ║
║    GET    /api/ndas             - List NDAs (filtered)    ║
║    GET    /api/ndas/:id         - Get NDA details         ║
║    POST   /api/ndas             - Create NDA              ║
║    POST   /api/ndas/:id/clone   - Clone NDA (Story 3.3)   ║
║    PUT    /api/ndas/:id         - Update NDA              ║
║    PATCH  /api/ndas/:id/status  - Change NDA status       ║
╠═══════════════════════════════════════════════════════════╣
║  Company Suggestions (Story 3.2):                         ║
║    GET /api/ndas/company-suggestions - Recent companies   ║
║    GET /api/ndas/company-defaults    - Auto-fill values   ║
║    GET /api/ndas/company-search      - Search companies   ║
║    GET /api/ndas/company-agency      - Most common agency ║
╠═══════════════════════════════════════════════════════════╣
║  Agency Suggestions (Story 3.4):                          ║
║    GET /api/ndas/agency-suggestions  - Agency suggestions ║
║    GET /api/ndas/agency-subagencies  - Common subagencies ║
╠═══════════════════════════════════════════════════════════╣
║  Mock Users (when USE_MOCK_AUTH=true):                    ║
║    admin@usmax.com / Admin123!@#$  (MFA: 123456)          ║
║    test@usmax.com  / Test1234!@#$  (MFA: 123456)          ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;

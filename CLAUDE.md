# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This project uses the BMAD method for development workflow. See the "BMad Method (BMAD)" section below for available workflows.

## Project Structure & Module Organization
- `src/` holds application code.
  - `src/client/` is the front-end services and auth context.
  - `src/components/` contains React UI components and screens.
  - `src/server/` contains Express routes, services, middleware, and jobs.
- `prisma/` contains `schema.prisma`, migrations, and seed scripts.
- `docs/` includes architecture notes and sprint artifacts.
- `dist/` is the build output, `build/` contains compiled artifacts.

## Build, Test, and Development Commands
- `npm run dev` starts client + server together (Vite + TSX watch).
- `npm run dev:client` runs the Vite front-end only.
- `npm run dev:server` runs the Express server only.
- `npm run build` builds the client and TypeScript server output.
- `npm run start` runs the compiled server from `dist/`.
- `npm run test` runs Vitest in watch mode.
- `npm run test:run` runs the full Vitest suite once.
- `npm run db:generate` regenerates Prisma client.
- `npm run db:migrate` runs Prisma migrations.
- `npm run db:seed` seeds the database (see `prisma/seed.ts`).

## Coding Style & Naming Conventions
- TypeScript + React with 2‑space indentation and existing import order.
- Use descriptive, domain-specific names (e.g., `ndaService`, `generateDocument`).
- Prefer explicit types for service interfaces and API responses.
- No formatter/linter is configured; match the surrounding file style.

## Testing Guidelines
- Tests use Vitest. Patterns are in `src/**/__tests__/*.test.ts`.
- Service tests live in `src/server/services/__tests__`.
- Route tests live in `src/server/routes/__tests__`.
- Run a focused test via `npx vitest run path/to/test`.

## Commit & Pull Request Guidelines
- Recent commits mix plain messages and conventional prefixes (e.g., `feat:`, `fix:`).
- Recommended: use short, imperative messages (`feat: add draft autosave`).
- PRs should include: purpose, key changes, and testing performed.
- Add screenshots for UI changes and link related issues/stories.

## Security & Configuration Tips
- Server uses environment variables (e.g., database/S3/Sentry). Keep secrets out of git.
- Prisma migrations should accompany schema changes.
- Verify agency-scoped access rules when touching NDA or agency endpoints.

## Project Overview

USmax NDA Management System - a government-grade NDA (Non-Disclosure Agreement) lifecycle management application replacing a legacy Windows system. Built for CMMC Level 1 compliance with MFA, row-level security, and comprehensive audit logging.

**Tech Stack:** React 18 + Vite + Express + PostgreSQL + Prisma + AWS (Cognito, S3, SES)

## Essential Commands

```bash
# Development (runs Vite frontend + Express backend concurrently)
pnpm dev

# Run only frontend
pnpm dev:client

# Run only backend
pnpm dev:server

# Build for production
pnpm build

# Start production server
pnpm start

# Run all tests
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run a single test file
pnpm test src/server/services/__tests__/ndaService.test.ts

# Database commands
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations (dev)
pnpm db:push        # Push schema without migrations
pnpm db:seed        # Seed development data
pnpm db:studio      # Open Prisma Studio GUI
```

## Architecture Overview

### Backend Structure (`src/server/`)

```
middleware/          # Auth pipeline: authenticateJWT → attachUserContext → checkPermissions → scopeToAgencies
routes/              # Express route handlers (REST endpoints)
services/            # Business logic (ndaService, emailService, documentService, etc.)
validators/          # Input validation (pocValidator)
jobs/                # Background jobs (emailQueue with pg-boss)
types/               # TypeScript types (auth.ts)
constants/           # Permission codes, enums
utils/               # Helpers (scopedQuery)
db/                  # Database connection
```

**Key Middleware Pipeline:**
1. `authenticateJWT` - Validates Cognito JWT from cookies
2. `attachUserContext` - Loads user roles, permissions, agency access
3. `checkPermissions` - Verifies user has required permission
4. `scopeToAgencies` - Filters data to authorized agencies (row-level security)

### Frontend Structure (`src/client/`)

```
pages/               # Route components (LoginPage, Dashboard, NDAList)
components/          # Reusable UI components
contexts/            # React contexts (AuthContext)
hooks/               # Custom hooks (useAuth)
stores/              # Zustand stores (appStore)
```

### Database Schema (`prisma/schema.prisma`)

**Core Entities:**
- `Contact` - Users (USmax staff), unified with external contacts
- `Role`, `Permission`, `RolePermission`, `ContactRole` - RBAC
- `AgencyGroup`, `Subagency` - Organizational hierarchy
- `AgencyGroupGrant`, `SubagencyGrant` - Data access control
- `Nda` - Main NDA entity with 4 POC FKs (opportunity, contracts, relationship, contacts)
- `Document` - S3 document metadata
- `NdaEmail` - Email history with delivery tracking
- `AuditLog` - Immutable action history
- `RtfTemplate`, `EmailTemplate` - Document/email templates

### Security Model

**Authentication:** AWS Cognito with MFA (TOTP or SMS)
- Tokens stored in HttpOnly cookies (not localStorage)
- CSRF protection via double-submit cookie pattern

**Authorization (Two Layers):**
1. **RBAC** - Permission-based (`nda:create`, `nda:send_email`, `admin:*`)
2. **Row-Level Security** - Agency-scoped queries (users see only NDAs for their authorized agencies)

```typescript
// MANDATORY: All NDA queries must include agency scoping
const ndas = await prisma.nda.findMany({
  where: {
    ...userFilters,
    subagencyId: { in: authorizedSubagencyIds }  // NEVER skip this
  }
});
```

## Project Overview

USmax NDA Management System - a government-grade NDA (Non-Disclosure Agreement) lifecycle management application replacing a legacy Windows system. Built for CMMC Level 1 compliance with MFA, row-level security, and comprehensive audit logging.

**Tech Stack:** React 18 + Vite + Express + PostgreSQL + Prisma + AWS (Cognito, S3, SES)

## Essential Commands

```bash
# Development (runs Vite frontend + Express backend concurrently)
pnpm dev

# Run only frontend
pnpm dev:client

# Run only backend
pnpm dev:server

# Build for production
pnpm build

# Start production server
pnpm start

# Run all tests
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run a single test file
pnpm test src/server/services/__tests__/ndaService.test.ts

# Database commands
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations (dev)
pnpm db:push        # Push schema without migrations
pnpm db:seed        # Seed development data
pnpm db:studio      # Open Prisma Studio GUI
```

## Architecture Overview

### Backend Structure (`src/server/`)

```
middleware/          # Auth pipeline: authenticateJWT → attachUserContext → checkPermissions → scopeToAgencies
routes/              # Express route handlers (REST endpoints)
services/            # Business logic (ndaService, emailService, documentService, etc.)
validators/          # Input validation (pocValidator)
jobs/                # Background jobs (emailQueue with pg-boss)
types/               # TypeScript types (auth.ts)
constants/           # Permission codes, enums
utils/               # Helpers (scopedQuery)
db/                  # Database connection
```

**Key Middleware Pipeline:**
1. `authenticateJWT` - Validates Cognito JWT from cookies
2. `attachUserContext` - Loads user roles, permissions, agency access
3. `checkPermissions` - Verifies user has required permission
4. `scopeToAgencies` - Filters data to authorized agencies (row-level security)

### Frontend Structure (`src/client/`)

```
pages/               # Route components (LoginPage, Dashboard, NDAList)
components/          # Reusable UI components
contexts/            # React contexts (AuthContext)
hooks/               # Custom hooks (useAuth)
stores/              # Zustand stores (appStore)
```

### Database Schema (`prisma/schema.prisma`)

**Core Entities:**
- `Contact` - Users (USmax staff), unified with external contacts
- `Role`, `Permission`, `RolePermission`, `ContactRole` - RBAC
- `AgencyGroup`, `Subagency` - Organizational hierarchy
- `AgencyGroupGrant`, `SubagencyGrant` - Data access control
- `Nda` - Main NDA entity with 4 POC FKs (opportunity, contracts, relationship, contacts)
- `Document` - S3 document metadata
- `NdaEmail` - Email history with delivery tracking
- `AuditLog` - Immutable action history
- `RtfTemplate`, `EmailTemplate` - Document/email templates

### Security Model

**Authentication:** AWS Cognito with MFA (TOTP or SMS)
- Tokens stored in HttpOnly cookies (not localStorage)
- CSRF protection via double-submit cookie pattern

**Authorization (Two Layers):**
1. **RBAC** - Permission-based (`nda:create`, `nda:send_email`, `admin:*`)
2. **Row-Level Security** - Agency-scoped queries (users see only NDAs for their authorized agencies)

```typescript
// MANDATORY: All NDA queries must include agency scoping
const ndas = await prisma.nda.findMany({
  where: {
    ...userFilters,
    subagencyId: { in: authorizedSubagencyIds }  // NEVER skip this
  }
});
```

## Code Patterns

### Naming Conventions
- **Database:** snake_case (`agency_groups`, `created_at`)
- **TypeScript:** camelCase (`agencyGroup`, `createdAt`)
- **Components:** PascalCase (`NDAList.tsx`, `UserForm.tsx`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_UPLOAD_SIZE`)

### TypeScript Rules
- **Never use `any`** - Use proper types or `unknown` + type guards
- **Path aliases:** `@/components`, `@server/services` (configured in tsconfig)
- **Type-only imports:** `import type { NDA } from '@/types'`

### Prisma Patterns
```typescript
// Use Prisma Client (type-safe, SQL injection safe)
const nda = await prisma.nda.findUnique({
  where: { id },
  include: { subagency: { include: { agencyGroup: true } } }
});

// Transactions for multi-step operations
await prisma.$transaction(async (tx) => {
  const nda = await tx.nda.create({ data });
  await tx.auditLog.create({ data: { action: 'nda_created', ... } });
});
```

### Error Handling
- Services throw descriptive errors
- Express error middleware catches all, reports to Sentry
- Return user-friendly messages (never expose stack traces)

### Testing Patterns
- Tests co-located: `service.ts` → `__tests__/service.test.ts`
- Use factories for test data (fresh per test)
- Mock AWS services (S3, SES, Cognito)
- Database tests use transaction rollback for isolation

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
COGNITO_USER_POOL_ID=us-east-1_xxx
COGNITO_APP_CLIENT_ID=xxx
COGNITO_REGION=us-east-1

# Development
USE_MOCK_AUTH=true  # Enables mock authentication without AWS

# Mock Users (when USE_MOCK_AUTH=true)
# admin@usmax.com / Admin123!@#$ (admin role)
# test@usmax.com / Test1234!@#$ (standard user)
# Mock MFA code: 123456
```

## Critical Rules

1. **NEVER `prisma db push --accept-data-loss`** - Data loss is unacceptable
2. **ALWAYS scope NDA queries to user's agencies** - Security requirement
3. **ALWAYS log mutations to audit_log** - Compliance requirement
4. **NEVER store tokens in localStorage** - Use HttpOnly cookies only
5. **NEVER commit secrets** - Use .env (gitignored)
6. **AWS changes via Terraform only** - Infrastructure as code in `infrastructure/`
7. **GitHub Actions for deployment** - Not manual AWS CLI commands

## BMad Method (BMAD)

This project uses the BMad Method for development workflow. Key directories:
- `.bmad/` - BMAD configuration and workflows
- `docs/sprint-artifacts/` - Story files and sprint status

```bash
# Check sprint status
cat docs/sprint-artifacts/sprint-status.yaml

# Common BMAD workflows
/bmad:bmm:workflows:code-review        # Adversarial code review
/bmad:bmm:workflows:dev-story          # Implement a story
/bmad:bmm:workflows:sprint-status      # Sprint overview
```

## API Endpoints Overview

- `POST /api/auth/login` - Initiate auth, returns MFA challenge
- `POST /api/auth/mfa-challenge` - Complete MFA, sets cookies
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Clear cookies
- `GET /api/auth/me` - Current user info

- `GET/POST /api/ndas` - List/create NDAs
- `GET/PUT/DELETE /api/ndas/:id` - NDA operations
- `POST /api/ndas/:id/generate-rtf` - Generate document
- `POST /api/ndas/:id/send-email` - Send email
- `POST /api/ndas/:id/clone` - Duplicate NDA

- `GET/POST /api/agencies` - Agency groups
- `GET/POST /api/subagencies` - Subagencies
- `GET/POST /api/users` - User/contact management
- `GET/POST /api/templates` - RTF templates
- `GET /api/audit-logs` - Audit trail (admin)

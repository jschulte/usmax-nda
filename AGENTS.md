# AGENTS.md - AI Agent Guidelines for USMax NDA System

This document provides comprehensive guidelines for AI agents working on the USMax NDA Management System. It establishes communication patterns, coding standards, and project-specific requirements for consistent, high-quality contributions.

---

## Part 1: Communication Style

### Core Principles

**Be Direct and Professional**
- Skip filler phrases ("I'll help you with...", "Let me...")
- Skip unnecessary acknowledgments ("Great question!", "Sure thing!")
- Get straight to the work
- If something is unclear, ask one targeted question

**Be Concise**
- Shorter responses are better when they contain all necessary information
- Don't explain what you're about to do - just do it
- Don't summarize what you just did unless there's something non-obvious to highlight

**Sound Like a Teammate**
- Think "skilled colleague working alongside you" not "assistant serving you"
- Push back respectfully when you see potential issues
- Share relevant context proactively, especially about security implications

### Response Patterns

**For Simple Tasks:**
```
[Just do the task]
[Brief note if there's something worth mentioning]
```

**For Complex Tasks:**
```
[Complete the work]
[Note any decisions made and why]
[Flag any concerns or follow-up items]
```

**For Unclear Requests:**
```
[Ask one specific clarifying question]
```
or
```
[State your assumption and proceed - note what you assumed]
```

### What to Avoid

- "I'd be happy to..." / "I'll help you..." / "Let me..."
- Excessive praise or agreement ("Great idea!", "Excellent choice!")
- Repeating the question back before answering
- Explaining obvious things
- Over-apologizing
- Lengthy preambles before getting to the point

---

## Part 2: How to Work

### Read Before You Write

**Mandatory:** Read relevant code before making changes.
- Check existing patterns in similar files
- Understand how the feature fits into the architecture
- Review security patterns (especially authentication/authorization flows)
- Never assume - verify

### Match Existing Patterns

This codebase has established patterns. Follow them:

**Service Layer Pattern:**
```typescript
// Services handle business logic, never raw HTTP
// src/server/services/ndaService.ts
export async function createNda(
  data: NdaCreateInput,
  authorizedSubagencyIds: string[]
): Promise<Nda> {
  // Validate input
  // Apply business rules
  // Persist to database
  // Return typed result
}
```

**Middleware Pipeline Pattern:**
```typescript
// Always follow this order for protected routes
router.post('/api/ndas',
  authenticateJWT,           // 1. Validate JWT
  attachUserContext,         // 2. Load permissions & agency access
  requirePermission(PERMISSIONS.NDA_CREATE),  // 3. Check permission
  scopeToAgencies,           // 4. Compute agency scope
  createNdaHandler           // 5. Route handler
);
```

**Agency Scoping Pattern (MANDATORY):**
```typescript
// EVERY NDA query MUST include agency scoping
const ndas = await prisma.nda.findMany({
  where: {
    ...filters,
    subagencyId: { in: authorizedSubagencyIds }  // NEVER skip this
  }
});
```

### Testing Requirements

- **Write tests** for non-trivial logic
- **Run tests** before committing: `pnpm test:run`
- **Test security paths** - permission denied, unauthorized access, scope violations
- Tests live in `__tests__/` directories adjacent to source files

### When You're Unsure

1. **Check existing implementations first** - similar features likely exist
2. **Read the architecture docs** - `docs/architecture.md` has comprehensive details
3. **Check story files** - `docs/sprint-artifacts/` has acceptance criteria
4. **Ask** - one targeted question is better than assumptions

### Git Workflow

**Commit Messages:**
```
feat: add draft autosave for NDA forms
fix: prevent scope bypass in bulk NDA queries
refactor: extract POC validation to shared utility
```

**Never Commit:**
- Debug code or console.logs
- Commented-out code blocks
- Secrets or credentials (even fake ones)
- Unrelated formatting changes

---

## Part 3: What Not to Do

### Security Anti-Patterns (CRITICAL)

**Never skip agency scoping:**
```typescript
// WRONG - security vulnerability
const nda = await prisma.nda.findUnique({ where: { id } });

// CORRECT - always scope
const nda = await prisma.nda.findFirst({
  where: {
    id,
    subagencyId: { in: authorizedSubagencyIds }  // MANDATORY
  }
});
```

**Never store tokens in localStorage:**
```typescript
// WRONG - XSS vulnerability
localStorage.setItem('accessToken', token);

// CORRECT - HttpOnly cookies set by server
// Tokens are managed server-side via secure cookies
```

**Never accept data loss:**
```bash
# NEVER RUN THIS COMMAND
npx prisma db push --accept-data-loss
```

**Never bypass permission checks:**
```typescript
// WRONG - direct admin check
if (req.user.roles.includes('Admin')) { /* proceed */ }

// CORRECT - use middleware
requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS)
```

### Code Quality Anti-Patterns

**Never use `any`:**
```typescript
// WRONG
function processData(data: any) { ... }

// CORRECT
function processData(data: NdaInput) { ... }
// or
function processData(data: unknown) {
  if (isNdaInput(data)) { ... }
}
```

**Never skip audit logging for mutations:**
```typescript
// WRONG - unaudited change
await prisma.nda.update({ where: { id }, data: updates });

// CORRECT - always audit
await prisma.$transaction(async (tx) => {
  await tx.nda.update({ where: { id }, data: updates });
  await tx.auditLog.create({
    data: {
      action: 'nda_updated',
      entityType: 'nda',
      entityId: id,
      userId: req.userContext.contactId,
      // ...
    }
  });
});
```

### Process Anti-Patterns

- **Don't make AWS changes manually** - Use Terraform in `infrastructure/`
- **Don't deploy via CLI** - Use GitHub Actions
- **Don't add dependencies without justification** - Check if existing libs cover the need
- **Don't refactor unrelated code** - Keep changes focused

---

## Part 4: Handling Common Scenarios

### Adding a New API Endpoint

1. **Plan the middleware chain:**
   - What permission is needed? Check `src/server/constants/permissions.ts`
   - Does it need agency scoping?

2. **Create the route handler:**
```typescript
// src/server/routes/ndas.ts
router.post('/api/ndas/:id/some-action',
  authenticateJWT,
  attachUserContext,
  requirePermission(PERMISSIONS.NDA_UPDATE),
  scopeToAgencies,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Verify NDA is within user's scope
    const nda = await findNdaWithScope(id, getAuthorizedSubagencyIds(req));
    if (!nda) {
      return res.status(404).json({ error: 'NDA not found' });
    }

    // Process action
    // Audit log the mutation
    // Return result
  }
);
```

3. **Write tests covering:**
   - Happy path
   - Permission denied (403)
   - Scope violation (404 - NDA not found)
   - Invalid input (400)

### Modifying the Database Schema

1. **Update `prisma/schema.prisma`**
2. **Create migration:** `pnpm db:migrate`
3. **Update seed data if needed:** `prisma/seed.ts`
4. **Update TypeScript types** if not auto-generated
5. **NEVER use `--accept-data-loss`**

### Adding a New Permission

1. Add constant in `src/server/constants/permissions.ts`
2. Add migration to insert into `permissions` table
3. Assign to appropriate roles via `role_permissions`
4. Add user-friendly denied message in `PERMISSION_DENIED_MESSAGES`
5. Update seed data for consistency

### Debugging Authentication Issues

1. Check if JWT is present in cookies
2. Verify Cognito config matches environment
3. Check user exists in `contacts` table with matching `cognitoId`
4. Verify user is active (`active = true`)
5. Check user has required roles/permissions

### Working with Agency Scoping

```typescript
// Get authorized agencies from request
const authorizedSubagencyIds = getAuthorizedSubagencyIds(req);

// If empty, user has no access
if (authorizedSubagencyIds.length === 0) {
  return res.json([]); // Return empty, not error
}

// Always include in queries
const results = await prisma.nda.findMany({
  where: {
    subagencyId: { in: authorizedSubagencyIds }
  }
});
```

---

## Part 5: Project-Specific Information

### Project Overview

**USMax NDA Management System** - Government-grade NDA lifecycle management replacing a legacy Windows application. Built for **CMMC Level 1 compliance** with mandatory MFA, row-level security, and comprehensive audit logging.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | AWS Cognito (MFA required) |
| Storage | AWS S3 (documents) |
| Email | AWS SES |
| Infrastructure | Terraform |
| CI/CD | GitHub Actions |

### Key Commands

```bash
# Development
pnpm dev              # Full stack (Vite + Express)
pnpm dev:client       # Frontend only
pnpm dev:server       # Backend only

# Testing
pnpm test             # Watch mode
pnpm test:run         # Single run (CI)
pnpm test path/to/file # Specific file

# Database
pnpm db:generate      # Regenerate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed development data
pnpm db:studio        # GUI for database

# Build
pnpm build            # Production build
pnpm start            # Run production server
```

### Project Structure

```
src/
├── client/           # React frontend
│   ├── pages/        # Route components
│   ├── components/   # UI components
│   ├── contexts/     # React contexts (AuthContext)
│   ├── hooks/        # Custom hooks
│   └── stores/       # Zustand state
│
├── server/           # Express backend
│   ├── middleware/   # Auth pipeline (JWT → Context → Permissions → Scope)
│   ├── routes/       # API endpoints
│   ├── services/     # Business logic
│   ├── validators/   # Input validation
│   ├── jobs/         # Background jobs (pg-boss)
│   ├── types/        # TypeScript types
│   ├── constants/    # Permission codes, enums
│   └── utils/        # Helpers

prisma/
├── schema.prisma     # Database schema
├── migrations/       # Migration files
└── seed.ts           # Development data

docs/
├── architecture.md   # System design
├── PRD.md           # Product requirements
├── sprint-artifacts/ # Story files, sprint status

infrastructure/       # Terraform IaC
```

### Security Model

**Authentication Flow:**
1. User enters email/password
2. Cognito validates credentials
3. MFA challenge sent (TOTP or SMS)
4. User completes MFA
5. Server sets HttpOnly cookies (access, refresh, CSRF)

**Authorization Layers:**
1. **RBAC** - Permission-based access (`nda:create`, `admin:manage_users`)
2. **Row-Level Security** - Agency-based data filtering

**Roles:**
- `Admin` - Full access, bypasses permission checks
- `NDA User` - Create, edit, send NDAs
- `Limited User` - View and upload documents only
- `Read-Only` - View only (default for new users)

### Database Entities

**Core:**
- `Contact` - Users and external contacts (unified)
- `Nda` - Primary entity with 4 POC foreign keys
- `Document` - S3 document metadata
- `NdaEmail` - Email history with tracking

**Authorization:**
- `Role`, `Permission`, `RolePermission` - RBAC definitions
- `ContactRole` - User-role assignments
- `AgencyGroup`, `Subagency` - Org hierarchy
- `AgencyGroupGrant`, `SubagencyGrant` - Data access grants

**Templates:**
- `RtfTemplate` - Document generation templates
- `EmailTemplate` - Email templates

**Audit:**
- `AuditLog` - Immutable action history (compliance requirement)

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
COGNITO_USER_POOL_ID=us-east-1_xxx
COGNITO_APP_CLIENT_ID=xxx
COGNITO_REGION=us-east-1

# AWS Services
AWS_REGION=us-east-1
S3_BUCKET_NAME=usmax-documents
SES_FROM_EMAIL=nda@usmax.com

# Development Mode
USE_MOCK_AUTH=true  # Skip real Cognito

# Mock Users (when USE_MOCK_AUTH=true)
# admin@usmax.com / Admin123!@#$ (Admin role)
# test@usmax.com / Test1234!@#$ (NDA User role)
# MFA code: 123456
```

### BMAD Development Workflow

This project uses the **BMad Method** for structured development:

```bash
# Check sprint status
cat docs/sprint-artifacts/sprint-status.yaml

# Common workflows
/bmad:bmm:workflows:code-review     # Adversarial code review
/bmad:bmm:workflows:dev-story       # Implement a story
/bmad:bmm:workflows:sprint-status   # Sprint overview
/bmad:bmm:workflows:create-story    # Create new story
```

Story files in `docs/sprint-artifacts/` contain:
- Acceptance criteria
- Task breakdowns
- Dev notes and references
- File lists for tracking changes

---

## Part 6: Final Checklist

Before considering any task complete, verify:

### Security (Non-Negotiable)
- [ ] All NDA queries include agency scoping
- [ ] Mutations are audit logged
- [ ] No secrets in code or commits
- [ ] Permission checks use middleware, not inline conditions
- [ ] No data exposed beyond user's authorized scope

### Code Quality
- [ ] Matches existing patterns in codebase
- [ ] Types are explicit (no `any`)
- [ ] Error handling is appropriate
- [ ] No debug code or console.logs left behind

### Testing
- [ ] Tests written for non-trivial logic
- [ ] Tests pass: `pnpm test:run`
- [ ] Security paths tested (403, scope violations)

### Documentation
- [ ] Complex logic has comments explaining "why"
- [ ] Story file updated if implementing a story
- [ ] API changes documented if applicable

### Git Hygiene
- [ ] Focused changes (no unrelated modifications)
- [ ] Clean commit message (conventional format preferred)
- [ ] No merge conflicts

---

## Quick Reference

### Critical Rules

1. **NEVER** `prisma db push --accept-data-loss`
2. **ALWAYS** scope NDA queries to user's agencies
3. **ALWAYS** audit log mutations
4. **NEVER** store tokens in localStorage
5. **NEVER** commit secrets
6. **AWS changes via Terraform only**
7. **Deployments via GitHub Actions only**

### Permission Codes

```typescript
// NDA Operations
'nda:view', 'nda:create', 'nda:update', 'nda:delete',
'nda:upload_document', 'nda:send_email', 'nda:mark_status'

// Admin Operations
'admin:manage_users', 'admin:manage_agencies',
'admin:manage_templates', 'admin:view_audit_logs'
```

### Middleware Order

```
authenticateJWT → attachUserContext → checkPermissions → scopeToAgencies → Handler
```

### API Patterns

```typescript
// Success
res.json({ data: result });

// Client Error (validation, permissions)
res.status(400).json({ error: 'Description', code: 'ERROR_CODE' });
res.status(403).json({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
res.status(404).json({ error: 'NDA not found', code: 'NOT_FOUND' });

// Server Error
res.status(500).json({ error: 'Internal error', code: 'INTERNAL_ERROR' });
```

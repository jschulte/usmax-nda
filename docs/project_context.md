---
project_name: 'usmax-nda'
user_name: 'Jonah'
date: '2025-12-15'
sections_completed: ['technology_stack', 'database_rules', 'typescript_rules', 'security_rules', 'prisma_rules', 'testing_rules', 'migration_rules', 'configuration_rules', 'api_rules', 'anti_patterns']
existing_patterns_found: 17
status: 'complete'
completedAt: '2025-12-15'
---

# Project Context - USMax NDA Management System

**Last Updated:** 2025-12-15
**For:** AI Agents and Developers

This document contains critical implementation rules and patterns that AI agents MUST follow when writing code for this project. Read this file BEFORE implementing any feature.

---

## Technology Stack & Versions

**Frontend:**
- React 19.x (upgrade from 18.3.1)
- TypeScript 5.x (strict mode REQUIRED)
- Vite 6.3.5 (build tool)
- Radix UI (accessible component primitives)
- Tailwind CSS (utility-first styling)
- TanStack Query v5 (server state management)
- React Hook Form 7.55.0 + Zod (forms + validation)
- Axios (HTTP client with interceptors)
- React Router (client-side routing)

**Backend:**
- Node.js 20 LTS
- Express.js (REST API)
- TypeScript (shared types with frontend)
- Prisma ORM (PostgreSQL, type-safe queries)
- pg-boss (PostgreSQL-based job queue)
- AWS SDK v3 (S3, SES, Cognito, Secrets Manager)

**Database:**
- PostgreSQL 15 on AWS Lightsail (Docker container)
- 17 tables (see architecture.md for complete schema)

**Infrastructure:**
- AWS Lightsail 4GB instance ($40/month)
- Docker Compose (Nginx + Express + PostgreSQL)
- S3 multi-region (us-east-1 primary, us-west-2 replica)
- AWS Cognito (MFA authentication)
- AWS SES (email delivery)
- Sentry (error tracking)
- CloudWatch (monitoring)

---

## Critical Implementation Rules

### Database Rules (NEVER VIOLATE)

**❌ DON'T store entities as JSONB - use proper foreign keys**
```sql
-- WRONG: contacts_poc JSONB
-- RIGHT: contacts_contact_id UUID REFERENCES contacts(id)
```
**Reason:** Contacts are people (entities), not unstructured data. Proper FK enables queries, referential integrity, updates.

**✅ ALWAYS apply row-level security to NDA queries**
```typescript
// WRONG: await prisma.nda.findMany();  // User sees ALL NDAs (security violation!)
// RIGHT: await scopeNDAsToUser(userId);  // Filters by user's authorized agencies
```
**Reason:** Users can only see NDAs for their authorized Agency Groups/Subagencies (FR35-37).

**✅ ALWAYS use UUIDs for primary keys (+ display_id for UI)**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
display_id SERIAL UNIQUE  -- User sees "NDA #1590", but API uses UUID
```
**Reason:** UUIDs prevent enumeration attacks (can't guess other NDA IDs).

**✅ Database naming: snake_case (PostgreSQL convention)**
```sql
-- Tables: users, ndas, agency_groups (plural, snake_case)
-- Columns: first_name, created_at, opportunity_contact_id
-- Prisma auto-maps to camelCase in TypeScript
```

**✅ Index ALL filterable fields (15 legacy filter fields)**
```sql
CREATE INDEX idx_ndas_company ON ndas(company_name);
CREATE INDEX idx_ndas_status ON ndas(status);
CREATE INDEX idx_ndas_effective_date ON ndas(effective_date);
-- Performance requirement: <500ms API response (NFR-P2)
```

**✅ Source of truth principle: Current state with entity, history in audit_log**
```sql
-- granted_by and granted_at stored IN access grant table (source of truth for UI)
-- audit_log separately tracks all access changes (compliance history)
-- NEVER query audit_log to reconstruct current state!
```

### TypeScript Rules (MANDATORY)

**❌ NEVER use `any` type**
```typescript
// WRONG: const data: any = await fetch();
// RIGHT: const data: NDA = await fetch();
// OR: const data: unknown = ...; if (isNDA(data)) {...}
```
**Reason:** Defeats type safety. Use proper types or `unknown` + type guards.

**✅ ALWAYS handle async errors (try/catch or Express catches)**
```typescript
// Services: try/catch and throw AppError
async create(data: CreateNDAInput) {
  try {
    return await prisma.nda.create({...});
  } catch (error) {
    logger.error('NDA creation failed', { error });
    throw new AppError('Failed to create NDA', 500, 'NDA_CREATE_FAILED');
  }
}

// Controllers: let Express error middleware catch
export const handler = async (req, res, next) => {
  try {
    const result = await service.method();
    res.json({ data: result });
  } catch (error) {
    next(error);  // Express middleware reports to Sentry, returns user-friendly error
  }
};
```

**✅ Use path aliases (configured in tsconfig.json)**
```typescript
// RIGHT: import { Button } from '@/components/ui/button';
// RIGHT: import { NDAService } from '@server/services/ndaService';
// WRONG: import { Button } from '../../../components/ui/button';
```

**✅ Type-only imports for types (tree-shaking)**
```typescript
import type { NDA, User, Agency } from '@/types';
```

**✅ Strict mode enabled - follow all TypeScript compiler errors**

### Security Rules (CRITICAL - NEVER SKIP)

**✅ EVERY mutation MUST log to audit_log (no exceptions)**
```typescript
// Audit middleware automatically logs POST/PUT/DELETE
// For manual audit entries:
await auditService.log({
  action: 'access_granted',
  entityType: 'agency_group_access',
  entityId: accessGrant.id,
  userId: req.user.id,
  beforeValue: null,
  afterValue: accessGrant,
  ipAddress: req.ip
});
```
**Reason:** CMMC Level 1 requires comprehensive audit trail (NFR-C3).

**✅ Row-level security on EVERY NDA query (use helper function)**
```typescript
// Export from server/src/utils/agencyScopeHelper.ts
export async function scopeNDAsToUser(userId: string) {
  // Returns Prisma where clause filtering NDAs by user's authorized agencies
  // MUST be applied to every prisma.nda.findMany/findFirst call
}
```

**✅ Validate on client AND server (defense in depth)**
```typescript
// Frontend: React Hook Form + Zod (real-time validation)
// Backend: express-validator + same Zod schema (never trust client)
// Database: CHECK constraints, NOT NULL, FK (last defense)
```

**✅ MFA required for all users (AWS Cognito enforces)**
**✅ Encrypt at rest (PostgreSQL + S3) and in transit (TLS 1.3)**

### Prisma Rules

**✅ Prefer type-safe Prisma Client queries**
```typescript
// RIGHT: await prisma.nda.findUnique({ where: { id }, include: { documents: true } });
// Use raw SQL only for complex queries Prisma can't express
```

**✅ Parameterized queries if using raw SQL**
```typescript
// RIGHT: await prisma.$queryRaw`SELECT * FROM ndas WHERE id = ${id}`;
// Prisma auto-parameterizes, prevents SQL injection
```

**✅ Use transactions for atomic operations**
```typescript
await prisma.$transaction(async (tx) => {
  // All operations succeed or all rollback
});
```

**✅ ALWAYS apply row-level security helper to NDA queries**
**✅ Include related entities with `include` (not N+1 queries)**

### Testing Rules (QUALITY GATE)

**✅ ≥80% test coverage REQUIRED (CI fails if not met)**
**✅ All tests MUST pass before merge (CI gate)**
**✅ Zero flaky tests allowed (fix or delete)**

**✅ Test isolation - factory pattern for data**
```typescript
// Each test gets fresh data from factory
const testUser = createTestUser();  // New instance every time
const testNDA = createTestNDA({ companyName: 'TechCorp' });
```

**✅ Mock external services (S3, SES, Cognito) in unit tests**
```typescript
import { mockClient } from 'aws-sdk-client-mock';
const s3Mock = mockClient(S3Client);
s3Mock.on(PutObjectCommand).resolves({ ETag: 'mock' });
```

**✅ Database reset between integration tests**
```typescript
beforeEach(async () => {
  await truncateAllTables();  // Or use transactions
  await seedTestData();
});
```

**✅ Co-located unit tests**
```
ndaService.ts
ndaService.test.ts  // Same directory
```

### Migration Rules (PREVENT DATA LOSS)

**✅ Snapshot before EVERY migration (automated in GitHub Actions)**
**✅ Test migrations locally FIRST (never untested in prod)**
**✅ Backward-compatible ONLY (first 6 months minimum)**
```sql
-- SAFE: ADD COLUMN (nullable or DEFAULT)
-- SAFE: CREATE TABLE, CREATE INDEX
-- DANGEROUS: DROP, RENAME, ALTER TYPE (defer to maintenance window)
```

**✅ PR review for all migrations (two sets of eyes)**
**✅ Document every migration with context**
```sql
-- Why, safety analysis, rollback plan
```

**✅ Brief downtime acceptable (<5 min, off-hours, users notified)**

### Configuration Rules

**✅ Use system_config table for admin-editable settings**
```typescript
// Session timeout, alert thresholds, feature flags → database (admin UI can change)
// NOT environment variables (requires deployment to change)
```

**✅ Environment variables for infrastructure secrets ONLY**
```bash
DATABASE_URL, AWS credentials, API keys → env vars
Feature config → system_config table
```

**✅ Configuration precedence: Env vars > DB config > Code constants**

### API Response Rules

**✅ Standardized response wrapper**
```typescript
// Success: res.json({ data: {...} })
// Error: res.status(4xx/5xx).json({ error: { message, code, field } })
```

**✅ Consolidated endpoints, not one per filter**
```typescript
// RIGHT: /api/ndas?status=X&agency=Y&page=1
// WRONG: /api/ndas/by-status/:status
```

**✅ Semantic HTTP status codes**
```
200 OK, 201 Created, 204 No Content
400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found
500 Internal Server Error
```

### Critical Anti-Patterns (NEVER DO THESE)

**❌ DON'T:**
1. Store entities as JSONB when they should be tables
2. Skip row-level security on NDA queries (users see unauthorized data!)
3. Use `any` type in TypeScript
4. Skip audit logging for "quick fixes"
5. Skip server-side validation ("client already validated")
6. Store tokens in localStorage (memory only for security)
7. Query ndas without scopeNDAsToUser() filter
8. String concatenate SQL (use Prisma or parameterized)
9. Share mutable test data across tests
10. Make real AWS calls in unit tests (mock them!)
11. Return 200 OK with error in response body
12. Commit console.log() debug statements
13. Skip migration testing locally
14. Use DROP/RENAME in migrations without backward compatibility plan

**✅ DO:**
1. Use proper foreign keys for all entity relationships
2. Apply row-level security to EVERY NDA query
3. Use specific types or `unknown` + type guards
4. Log ALL mutations to audit_log (no exceptions)
5. Validate on client AND server (defense in depth)
6. Follow naming conventions (snake_case DB, camelCase TS)
7. Use scopeNDAsToUser() helper for all NDA queries
8. Use Prisma Client (type-safe, injection-safe)
9. Create fresh test data with factories per test
10. Mock external services (aws-sdk-client-mock)
11. Use semantic HTTP status codes (4xx/5xx for errors)
12. Remove debug logging before commit
13. Test migrations on local Docker first
14. Document migration rationale and rollback plan

---

**Most Critical Rules (Top 5 - NEVER VIOLATE):**
1. **Row-level security:** ALWAYS use scopeNDAsToUser() on NDA queries
2. **Audit everything:** Log ALL mutations to audit_log
3. **No `any` type:** Use proper types or `unknown`
4. **Proper relationships:** Foreign keys, not JSONB for entities
5. **Migration safety:** Snapshot + test + backward-compatible

---

**Reference:** See `docs/architecture.md` for complete architectural decisions and detailed patterns.


## Usage Guidelines

**For AI Agents:**
- ✅ Read this file BEFORE implementing any code
- ✅ Follow ALL rules exactly as documented
- ✅ When in doubt, prefer the more restrictive/safe option
- ✅ Refer to `docs/architecture.md` for detailed architectural decisions
- ✅ Refer to `docs/prd.md` for complete requirements (159 FRs + 63 NFRs)

**For Human Developers:**
- Keep this file lean and focused on critical agent needs
- Update when technology stack or patterns change
- Review quarterly to remove outdated or obvious rules
- Add new rules when you discover agent mistakes or edge cases

**Priority:** This file captures rules that prevent implementation mistakes. Not general best practices (agents already know those), but project-specific patterns that could be missed.

---

**Last Updated:** 2025-12-15
**Status:** Complete and ready for AI agent integration

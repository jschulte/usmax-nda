---
project_name: 'usmax-nda'
user_name: 'Jonah'
date: '2026-01-02'
sections_completed: ['technology_stack', 'language_specific_rules', 'framework_specific_rules', 'testing_rules', 'code_quality_style', 'development_workflow', 'critical_dont_miss_rules']
status: 'complete'
rule_count: 87
section_count: 7
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Core Stack
- **Frontend:** React 18.3.1, Vite 6.3.5, TypeScript 5.7.2 (strict mode)
- **Backend:** Node.js 20 LTS, Express 4.21.2, TypeScript 5.7.2 (strict mode)
- **Database:** PostgreSQL 15 (Lightsail), Prisma 7.1.0 ORM
- **Authentication:** AWS Cognito (via aws-jwt-verify 4.0.1)
- **Storage:** AWS S3 (SDK v3.953.0), pre-signed URLs (15-min TTL)
- **Email:** AWS SES (SDK v3.953.0), pg-boss 12.5.2 for retry queue
- **UI Components:** Radix UI (18 packages, v1.1+/v2.1+), Tailwind CSS, tailwind-merge
- **Forms:** React Hook Form 7.55.0 + Zod validation
- **Testing:** Vitest 2.1.8, Testing Library, Supertest, Playwright
- **Document Generation:** docx 9.5.1 library + Handlebars 4.7.8 templates

### Critical Version Notes
- TypeScript strict mode required (non-negotiable for type safety)
- AWS SDKs at v3.953.0+ (Cognito at v3.700.0+ minimum)
- Prisma migrations require PostgreSQL 15+
- Radix UI primitives have peer dependency on React 18+
- Tests must run on Node 20 LTS (ESM modules required)

## Language-Specific Rules (TypeScript)

### Strict Mode Requirements
- TypeScript strict mode **mandatory** in both `tsconfig.json` and `tsconfig.server.json`
- Never use `any` type - use proper types or `unknown` + type guards
- Never suppress errors with `// @ts-ignore` without documented reason

### Import/Export Conventions
- **Path aliases required:** `@/` (frontend), `@server/` (backend) - never relative imports
- **Type-only imports:** `import type { NDA } from '@/types'` (enables tree-shaking)
- **Named imports preferred:** `import { createNDA } from './service'` (better refactoring)
- **Default exports only for:** React components, service classes
- **Named exports for:** utilities, types, constants, factory functions

### Async/Await Rules
- **All async operations require try/catch or next(error) middleware delegation**
- **Never return Promise without type annotation:** `async function (data): Promise<NDA>`
- **Services throw descriptive errors** (caught by Express middleware)
- **Controllers wrap service calls in try/catch** or delegate to Express error handler
- **Never unhandled rejections:** Every async call must have error handling

### Error Handling Pattern
```typescript
// ✅ Service throws, controller/middleware catches
export async function createNDA(data: CreateNDARequest): Promise<NDA> {
  try {
    return await prisma.nda.create({ data });
  } catch (error) {
    logger.error('Failed to create NDA', { error, data });
    throw new AppError('Failed to create NDA', 500, 'NDA_CREATE_FAILED');
  }
}

// ✅ Controller delegates to Express error middleware
export const handler = async (req, res, next) => {
  try {
    const result = await service.createNDA(req.body);
    res.json({ data: result });
  } catch (error) {
    next(error);  // Express error middleware handles
  }
};
```

### No Magic Numbers or String Literals
- Use `const` for reusable values
- Configuration from environment variables or database
- Magic thresholds belong in `system_config` table

## Framework-Specific Rules (React + Express)

### React Component Patterns

**Component Organization:**
- Page-level components: `src/components/screens/` (NDAList.tsx, NDADetail.tsx)
- Reusable components: `src/components/ui/` (Button.tsx, Dialog.tsx)
- Layout components: `src/components/layout/` (AppShell.tsx, Navigation.tsx)
- Co-located validation: Zod schemas next to forms
- Co-located tests: `Component.test.tsx` in same directory

**Mandatory Patterns:**
- **UI Components:** Always use Radix UI primitives (never `<button>`, `<input>` directly)
- **Forms:** React Hook Form with Zod validation, never manual useState
- **Authentication:** Tokens in memory or HttpOnly cookies ONLY (never localStorage)
- **Data Fetching:** TanStack Query for server state (caching, refetching, optimistic updates)
- **Styling:** Tailwind CSS utility classes, use tailwind-merge for conditional classes
- **Props:** Use `interface ComponentProps { ... }` for type safety, spread for DOM elements

**Component Pattern:**
```typescript
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: () => Promise<void>;
}

export function ConfirmDialog({ open, onOpenChange, title, onConfirm }: DialogProps) {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      logger.error('Confirm failed', { error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Confirming...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Express API Patterns

**Middleware Pipeline (Mandatory Order):**
```typescript
// MUST follow this order - critical for security
app.use(morgan());           // Logging
app.use(helmet());           // Security headers
app.use(cors());             // CORS policy
app.use(express.json());     // Body parsing

app.use(authenticateJWT);    // ← Cognito JWT validation
app.use(attachUserContext);  // ← Load user from DB
app.use(checkPermissions);   // ← RBAC permission check
app.use(scopeToAgencies);    // ← Row-level security filter

app.post('/api/ndas', createNDAHandler);

app.use(auditMiddleware);    // ← Log all mutations
app.use(errorHandler);       // ← Global error catch
```

**Agency Scoping (Non-Negotiable for Security):**
```typescript
// EVERY NDA query MUST include this filter
const userScope = await getUserAgencyScope(req.user.id);
const ndas = await prisma.nda.findMany({
  where: {
    ...userFilters,
    ...userScope  // ← MANDATORY - user only sees their agencies' NDAs
  }
});

// ❌ DO NOT EVER query NDAs without scope:
// const ndas = await prisma.nda.findMany();  // SECURITY VIOLATION!
```

**Response Format:**
```typescript
// ✅ Success responses (status 2xx)
res.json({ data: nda });
res.status(201).json({ data: createdNDA });

// ❌ NEVER return error in 200 response
// res.json({ error: 'NDA not found' });  // WRONG!

// Express error handler converts all throws to proper HTTP responses
throw new AppError('NDA not found', 404, 'NDA_NOT_FOUND');
```

**API Endpoint Patterns:**
- **Resources:** `GET/POST /api/ndas` (list/create), `GET/PUT/DELETE /api/ndas/:id`
- **Nested:** `GET /api/ndas/:id/documents`, `GET /api/ndas/:id/history`
- **Actions:** `POST /api/ndas/:id/send-email`, `POST /api/ndas/:id/generate-rtf`
- **Filters:** Query params (`?status=Created&agency=DoD`)
- **Pagination:** Implement for all list endpoints (skip/limit)

## Testing Rules

### Test Structure & Organization

**File Locations:**
- Unit tests: `src/**/__tests__/*.test.ts` (co-located with source)
- Service tests: `src/server/services/__tests__/{serviceName}.test.ts`
- Route tests: `src/server/routes/__tests__/{routeName}.test.ts`
- Component tests: `src/components/{component}/{component}.test.tsx`
- E2E tests: Separate folder structure (Playwright)

**Test Naming Convention:**
- Descriptive test names: `should create NDA with valid data`
- Nested describe blocks: `describe('createNDA', () => { test('...') })`
- Never generic names: DON'T use `test('works')` or `test('handles error')`

### Test Data & Isolation (CRITICAL)

**Factory Pattern (Required):**
```typescript
// ✅ Create fresh data per test
export function createTestNDA(overrides?: Partial<NDA>): NDA {
  return {
    id: randomUUID(),
    displayId: Math.floor(Math.random() * 10000),
    companyName: faker.company.name(),
    status: 'Created',
    ...overrides
  };
}

// Every test gets fresh data
test('updates NDA status', () => {
  const nda = createTestNDA({ status: 'Created' });
  // Test uses fresh data
});
```

**Database Isolation:**
```typescript
// Reset database per test (prevent test pollution)
beforeEach(async () => {
  await prisma.nda.deleteMany();
  await prisma.contact.deleteMany();
  await seedTestData();  // Fresh seed
});

// ❌ DON'T share mutable test data
const testNDA = { id: '123', ... };  // FLAKY! Shared across tests
```

### Mock External Services

**AWS Service Mocking (Required):**
```typescript
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client } from '@aws-sdk/client-s3';

const s3Mock = mockClient(S3Client);

beforeEach(() => {
  s3Mock.reset();
  s3Mock.on(PutObjectCommand).resolves({
    ETag: '"test-etag"',
    VersionId: 'v1'
  });
});

test('uploads document to S3', async () => {
  await documentService.upload({...});
  expect(s3Mock.call(0).args[0].input.Key).toContain('ndas/');
});
```

**Cognito/Auth Mocking:**
```typescript
// ✅ Mock JWT validation
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn().mockReturnValue({
      verify: jest.fn().mockResolvedValue({
        sub: 'test-user-id',
        email: 'test@example.com'
      })
    })
  }
}));
```

### Service Testing Patterns

**Service tests verify business logic in isolation:**
```typescript
describe('NdaService', () => {
  test('creates NDA with required fields', async () => {
    const result = await ndaService.create({
      companyName: 'Test Corp',
      subagencyId: 'agency-1',
      status: 'Created'
    });

    expect(result.id).toBeDefined();
    expect(result.displayId).toBeGreaterThan(0);
  });

  test('throws error when subagency not found', async () => {
    await expect(
      ndaService.create({
        companyName: 'Test',
        subagencyId: 'invalid-id',
        status: 'Created'
      })
    ).rejects.toThrow('Subagency not found');
  });
});
```

### Route/API Testing

**Use Supertest for API endpoint testing:**
```typescript
import request from 'supertest';
import app from '@server/index';

describe('POST /api/ndas', () => {
  test('creates NDA with valid payload', async () => {
    const response = await request(app)
      .post('/api/ndas')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        companyName: 'Test Corp',
        subagencyId: 'agency-1'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeDefined();
  });

  test('returns 401 without authentication', async () => {
    const response = await request(app)
      .post('/api/ndas')
      .send({ companyName: 'Test' });

    expect(response.status).toBe(401);
  });

  test('returns 403 without permission', async () => {
    const response = await request(app)
      .post('/api/ndas')
      .set('Authorization', `Bearer ${limitedUserToken}`)
      .send({ companyName: 'Test' });

    expect(response.status).toBe(403);
  });
});
```

### Component Testing

**React component tests with Testing Library:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('NDAForm', () => {
  test('renders form fields', () => {
    render(<NDAForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  test('submits form with valid data', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    render(<NDAForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/company name/i), 'Test Corp');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      companyName: 'Test Corp'
    });
  });
});
```

### Coverage Requirements

- **Target:** 80%+ overall coverage (enforced in CI)
- **Critical Paths:** Auth, NDA operations, security filters >90%
- **Acceptance:** Coverage <80% fails PR checks
- **Tool:** Vitest coverage reporter (configured in vitest.config.ts)

### Run Tests

```bash
npm run test              # Watch mode
npm run test:run         # Single run (CI)
npm run test:run src/server/services/__tests__/ndaService.test.ts  # Single file
```

## Code Quality & Style Rules

### Naming Conventions

**Database (PostgreSQL):**
- **Tables:** Plural, snake_case (`users`, `ndas`, `agency_groups`)
- **Columns:** snake_case (`first_name`, `created_at`, `is_internal`)
- **Foreign Keys:** `{table}_id` or descriptive (e.g., `opportunity_contact_id`, `granted_by`)
- **Indexes:** `idx_{table}_{columns}` (e.g., `idx_ndas_status_agency`)
- **Constraints:** `chk_{table}_{description}` (e.g., `chk_ndas_dates_valid`)

**TypeScript/JavaScript:**
- **Variables:** camelCase (`userId`, `ndaList`, `isActive`)
- **Functions:** camelCase (`getUserById`, `createNDA`, `sendEmail`)
- **Classes:** PascalCase (`UserService`, `EmailQueue`, `AuditLogger`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_UPLOAD_SIZE`, `DEFAULT_TIMEOUT`)
- **Booleans:** prefix with `is`, `has`, `can`, `should` (`isActive`, `hasPermission`)

**React Components:**
- **Components:** PascalCase (`NDAList.tsx`, `UserForm.tsx`, `StatusBadge.tsx`)
- **Component Props:** PascalCase interface (`DialogProps`, `ButtonProps`)
- **Event Handlers:** `handle{Event}` (e.g., `handleSubmit`, `handleCancel`)

**Types & Interfaces:**
- **Types:** PascalCase (`User`, `NDA`, `CreateNDARequest`, `NDAWithRelations`)
- **Enums:** PascalCase with UPPER_SNAKE_CASE values
```typescript
enum Status {
  CREATED = 'Created',
  SENT = 'Sent',
  ARCHIVED = 'Archived'
}
```

**API & Routes:**
- **Endpoints:** Plural resources (`/api/ndas`, `/api/users`, `/api/agencies`)
- **Route parameters:** Colon prefix (`:id`, `:ndaId`)
- **Query parameters:** camelCase (`?agencyId=123&status=Created`)

### Code Organization

**Directory Structure Rules:**
- **Source Code:** Never violate the documented structure (`src/components/`, `src/server/`, etc.)
- **Services:** Business logic only (queries, transformations, external API calls)
- **Controllers/Routes:** HTTP request/response handling (never business logic)
- **Utilities:** Pure functions (no side effects, highly reusable)
- **Tests:** Co-located with source files in `__tests__/` folder

**File Organization Within Source:**
- **Maximum lines per file:** 300 lines (break larger files into smaller modules)
- **Single responsibility:** File should have one primary purpose
- **Related imports grouped:** Built-in → external → local → types
- **Exports organized:** Types first, functions/classes second

### Documentation & Comments

**When to Comment:**
- ✅ Complex algorithms or non-obvious logic
- ✅ Workarounds or hacks (with issue reference)
- ✅ Performance optimizations
- ❌ Obvious code: `const user = userMap.get(id); // Get user`

**Comment Style:**
- Explain "why" not "what" (code shows what it does)
- Use sentence case starting with capital letter
- Keep comments synchronized with code (stale comments are worse than none)

**JSDoc Usage (for public APIs):**
```typescript
/**
 * Creates an NDA with the provided data and logs audit trail.
 * @param data - NDA creation request with required fields
 * @returns Created NDA with assigned ID
 * @throws AppError if subagency not found or validation fails
 */
export async function createNDA(data: CreateNDARequest): Promise<NDA> {
  // ...
}
```

### Code Quality Rules

**Unused Code:**
- Remove unused imports (ESLint will flag)
- Remove unused variables (TypeScript strict mode will flag)
- Delete dead code (never leave "TODO: remove this" comments)
- No `// @ts-ignore` without documented reason

**Error Messages:**
- Sentence case, user-friendly
- Include context when helpful: `"NDA #1523 not found in your agencies"`
- Never expose system internals: `"database connection refused"` → `"Unable to load NDA"`

**Console Output:**
- ❌ No `console.log()`, `console.debug()` in production code
- ✅ Use structured logging (Winston, logger service)
- ❌ Debug logs must be removed before commit

**No Magic Numbers:**
```typescript
// ❌ Magic number
if (nda.daysUntilExpiry < 30) { ... }

// ✅ Named constant
const EXPIRY_WARNING_DAYS = 30;
if (nda.daysUntilExpiry < EXPIRY_WARNING_DAYS) { ... }

// ✅ Or: Database configuration
SELECT * FROM system_config WHERE key = 'expiry_warning_days';
```

### Formatting & Style

**Code Formatting (Prettier):**
- 2-space indentation (configured in project)
- Single quotes for strings (configured)
- Trailing commas in multiline (configured)
- Line length: 80 chars recommended, 120 hard limit

**Import Order:**
```typescript
// 1. Node.js built-ins
import fs from 'fs';
import path from 'path';

// 2. External packages
import React from 'react';
import { Button } from '@radix-ui/react-button';

// 3. Internal imports (path aliases)
import { NDAService } from '@server/services/ndaService';
import { Button as CustomButton } from '@/components/ui/button';

// 4. Type-only imports (enable tree-shaking)
import type { NDA } from '@/types';
```

### Pre-Commit Checklist

Before committing code:
- [ ] No `console.log()` or debug statements
- [ ] No unused imports or variables
- [ ] Proper error handling (no unhandled rejections)
- [ ] Type-safe (no `any` types)
- [ ] Formatting passes (Prettier)
- [ ] Tests pass (`npm run test:run`)
- [ ] No secrets in code (.env gitignored)
- [ ] Commit message follows convention

## Development Workflow Rules

### Branch Naming Convention

**Pattern:** `{type}/{brief-description}`

**Types:**
- `feat/` - New feature or enhancement
- `fix/` - Bug fix
- `refactor/` - Code refactoring (no behavior change)
- `test/` - Tests only
- `docs/` - Documentation only
- `chore/` - Maintenance (deps, config, tooling)

**Examples:**
- ✅ `feat/nda-autosave-draft`
- ✅ `fix/agency-scope-security-leak`
- ✅ `refactor/extract-form-validation`
- ❌ `my-work`, `feature-xyz`, `update-stuff` (too vague)

### Commit Message Convention

**Format:** `{type}: {description}`

**Rules:**
- Use present tense, imperative mood: `add`, `fix`, `update` (NOT `added`, `fixed`)
- Keep subject line under 50 characters (GitHub style)
- Start with lowercase (unless proper noun)
- No period at end of subject
- Body (if needed): Separated from subject by blank line
- Reference issues: `Fixes #123`, `Related to #456`

**Types:**
- `feat:` - New feature (maps to MINOR version bump)
- `fix:` - Bug fix (maps to PATCH version bump)
- `refactor:` - Code refactoring (no behavior change)
- `test:` - Test additions/changes only
- `docs:` - Documentation changes only
- `chore:` - Maintenance (deps, config, build)

**Examples:**
```
feat: add RTF export for NDAs

fix: resolve agency scope filter bypass

refactor: extract email validation into utility

test: add coverage for ndaService error cases
```

**Longer Commits (with body):**
```
feat: add email template management UI

- Create EmailTemplate model in database
- Build template editor component with preview
- Implement email merge variable validation
- Add template versioning support

Fixes #142
```

### Pull Request Process

**PR Template (for description):**
```
## Purpose
Brief description of what this PR does

## Changes
- Bullet list of key changes
- What files were modified
- Any breaking changes (bold)

## Testing Performed
- How to test these changes
- Any edge cases covered
- Expected behavior before/after

## Checklist
- [ ] Tests pass (npm run test:run)
- [ ] Types compile (npm run build)
- [ ] Coverage maintained (>80%)
- [ ] No console.log() or debug code
- [ ] Commit messages follow convention
```

**Before Merging:**
- ✅ All GitHub Actions checks pass
- ✅ Coverage >80% (or higher for critical code)
- ✅ No TypeScript errors
- ✅ Code review approval

### Deployment Process

**Automatic (GitHub Actions on main branch):**
1. Run all tests (`npm run test:run`)
2. Build frontend (`npm run build`)
3. Build backend (`tsc -p tsconfig.server.json`)
4. Create Lightsail snapshot (pre-deployment backup)
5. SSH to Lightsail and `git pull origin main`
6. `docker-compose up -d --build`
7. Run migrations: `docker exec api npm run db:migrate`
8. Health check: `curl https://your-domain.com/api/health`
9. If health check fails: automatic rollback from snapshot

**Never Do:**
- ❌ Commit directly to main (always use PR)
- ❌ Manual AWS CLI commands for infrastructure
- ❌ Direct SSH changes to Lightsail
- ❌ Database changes outside migrations

### Rollback Procedures

**If Deployment Fails:**
1. GitHub Actions stops automatically
2. Old code continues running
3. Investigate error logs
4. Fix and re-run (push new commit or re-run workflow)

**If Code Breaks Post-Deploy:**
1. Health check fails → automatic rollback from snapshot
2. Manual rollback: Restore Lightsail snapshot + git revert to previous commit
3. Investigate root cause
4. Fix and re-deploy

### Local Development Workflow

**Starting Development:**
```bash
git checkout main
git pull origin main
git checkout -b feat/my-feature

# Make changes...

npm run test:run          # All tests pass
npm run build             # No TypeScript errors
git add .
git commit -m "feat: description of changes"
git push origin feat/my-feature
# → Create PR on GitHub
```

**Before Every Commit:**
```bash
npm run test:run          # Tests pass
npm run build             # TypeScript compiles
# → No console.log() debugging
# → No unused imports/variables
# → No secrets in .env (gitignored)
```

## Critical Don't-Miss Rules

### Security Rules (Non-Negotiable)

**Row-Level Security (MANDATORY FOR ALL NDA QUERIES):**
```typescript
// ❌ SECURITY VIOLATION - User sees unauthorized NDAs!
const ndas = await prisma.nda.findMany();

// ✅ CORRECT - Filter by user's authorized agencies
const userScope = await getUserAgencyScope(req.user.id);
const ndas = await prisma.nda.findMany({
  where: { ...userScope }
});
```

**Token Storage (CMMC Level 1 Requirement):**
- ✅ Memory: `const [token, setToken] = useState(null)`
- ✅ HttpOnly cookies: Set by backend, never accessible to JavaScript
- ❌ localStorage: Vulnerable to XSS attacks
- ❌ sessionStorage: Still accessible to XSS

**Input Validation (Defense in Depth):**
```typescript
// ❌ DON'T: Trust client validation
if (formData.valid) { /* submit */ }

// ✅ DO: Validate on server too
const validatedData = createNDASchema.parse(req.body);
```

**SQL Injection Prevention:**
```typescript
// ❌ NEVER: String concatenation
const sql = `SELECT * FROM ndas WHERE status = '${status}'`;

// ✅ DO: Use Prisma Client (type-safe)
const ndas = await prisma.nda.findMany({
  where: { status }
});

// ✅ OR: Parameterized SQL
const ndas = await prisma.$queryRaw`
  SELECT * FROM ndas WHERE status = ${status}
`;
```

**Error Messages (Never Expose Internals):**
```typescript
// ❌ Leaks system information
throw new Error('PostgreSQL connection refused on 5432');

// ✅ User-friendly, safe
throw new AppError('Unable to load NDAs', 500, 'NDA_LOAD_FAILED');
```

### Database/Audit Rules

**Audit Logging (Compliance Requirement):**
```typescript
// ✅ EVERY mutation must log
await prisma.$transaction(async (tx) => {
  const nda = await tx.nda.create({ data });
  await tx.audit_log.create({
    data: {
      userId: req.user.id,
      action: 'nda_created',
      entity: 'nda',
      entityId: nda.id,
      before: null,
      after: nda,
      timestamp: new Date(),
      ipAddress: req.ip
    }
  });
});

// ❌ DO NOT: Skip audit logging for performance
```

**Row-Level Security Helper (APPLY ALWAYS):**
```typescript
// Helper function to be used in all NDA queries
async function getUserAgencyScope(userId: string) {
  const user = await prisma.contact.findUnique({
    where: { id: userId },
    include: {
      subagencyAccess: true,
      agencyGroupAccess: {
        include: { agencyGroup: { include: { subagencies: true } } }
      }
    }
  });

  const authorizedSubagencyIds = [
    ...user.subagencyAccess.map(sa => sa.subagencyId),
    ...user.agencyGroupAccess.flatMap(
      aga => aga.agencyGroup.subagencies.map(s => s.id)
    )
  ];

  return { subagencyId: { in: authorizedSubagencyIds } };
}

// ✅ MANDATORY: Use in every NDA query
const scope = await getUserAgencyScope(userId);
const ndas = await prisma.nda.findMany({ where: scope });
```

**Transactions for Atomicity:**
```typescript
// ❌ DON'T: Multi-step operations without transaction
const nda = await prisma.nda.create({ data });
const doc = await prisma.document.create({ data: { ndaId: nda.id } });
await prisma.auditLog.create({ data });
// If auditLog fails, nda + doc exist without audit trail!

// ✅ DO: All-or-nothing
await prisma.$transaction(async (tx) => {
  const nda = await tx.nda.create({ data });
  const doc = await tx.document.create({ data: { ndaId: nda.id } });
  await tx.auditLog.create({ data });
  // All succeed, or all rollback
});
```

**Migration Safety Rules:**
- ❌ Never: `prisma db push --accept-data-loss` (unacceptable for this system)
- ✅ Always: Create Lightsail snapshot before migration
- ✅ Always: Test migration locally first
- ✅ Always: Backward-compatible only (ADD COLUMN, not DROP/RENAME)

### Testing Rules (Prevent Flaky Tests)

**Test Data Factory Pattern (REQUIRED):**
```typescript
// ❌ FLAKY: Shared mutable object
const testNDA = { id: '123', status: 'Created' };

test('updates NDA status', () => {
  testNDA.status = 'Sent';  // Affects other tests!
});

// ✅ CORRECT: Fresh data per test
function createTestNDA(overrides?) {
  return {
    id: randomUUID(),
    status: 'Created',
    ...overrides
  };
}

test('updates NDA status', () => {
  const nda = createTestNDA();  // Fresh copy
});
```

**AWS Service Mocking (REQUIRED):**
```typescript
// ❌ DON'T: Real AWS calls in tests
test('uploads to S3', async () => {
  await documentService.upload(file);  // Real S3!
});

// ✅ DO: Mock AWS SDK
const s3Mock = mockClient(S3Client);
s3Mock.on(PutObjectCommand).resolves({ ETag: 'test' });

test('uploads to S3', async () => {
  await documentService.upload(file);
  expect(s3Mock.called()).toBe(true);
});
```

### Type Safety Rules

**Never Use `any` Type:**
```typescript
// ❌ Defeats TypeScript
const data: any = await fetchNDA(id);
data.status = 'invalid'; // No error!

// ✅ Use proper types
const data: NDA = await fetchNDA(id);
data.status = 'invalid'; // TypeScript error!

// ✅ OR: Use unknown + type guard
const data: unknown = JSON.parse(body);
if (isNDA(data)) {
  // TypeScript narrows type safely
}
```

### Performance Rules (Required)

**S3 Pre-Signed URLs (Fixed TTL):**
```typescript
// ❌ DON'T: Long TTL (security risk)
const url = await s3.getSignedUrl('getObject', {
  Bucket: bucket,
  Key: key,
  Expires: 86400  // 24 hours - too long!
});

// ✅ DO: Short TTL
const url = await s3.getSignedUrl('getObject', {
  Bucket: bucket,
  Key: key,
  Expires: 900  // 15 minutes
});
```

**Database Indexes (Query Performance):**
```sql
-- ✅ Create indexes on all filterable fields
CREATE INDEX idx_ndas_status ON ndas(status);
CREATE INDEX idx_ndas_agency ON ndas(subagency_id);
CREATE INDEX idx_ndas_created ON ndas(created_at);
-- Without indexes, queries slow down as NDA volume grows
```

**Bundle Size (<400KB requirement):**
- Don't import entire libraries, import specific functions
- Use tree-shaking (type-only imports, named exports)
- Lazy load components with React.lazy()

### Document Generation Rules

**Handlebars Field-Merge (Not String Concatenation):**
```typescript
// ❌ DON'T: String concatenation (malformed on special chars)
const doc = template.replace('{{companyName}}', companyName);

// ✅ DO: Handlebars engine
import Handlebars from 'handlebars';
const tpl = Handlebars.compile(template);
const doc = tpl({ companyName, effectiveDate, ... });
```

**DOCX→RTF Pipeline (Library Quality):**
```typescript
// ✅ Generate DOCX first, then export to RTF
const doc = new Document({
  sections: [{
    children: [
      new Paragraph({ text: 'Company: {{companyName}}' })
    ]
  }]
});

const docxBytes = await Packer.toBuffer(doc);
const rtfBytes = await convertDOCXtoRTF(docxBytes);
// Never generate RTF directly (poor library support)
```

### Never Do This

- ❌ Query NDAs without agency scope (security violation)
- ❌ Use `localStorage` for tokens (CMMC violation)
- ❌ Trust client-only validation (defense evasion)
- ❌ String concatenate SQL (injection vulnerability)
- ❌ Use `any` type (defeats type safety)
- ❌ Skip audit logging (compliance violation)
- ❌ Share mutable test data (flaky tests)
- ❌ Make real AWS calls in tests (slow, unreliable)
- ❌ Generate RTF directly (quality issues)
- ❌ Return error in 200 status (API contract violation)
- ❌ Leave console.log() in code (debugging pollution)
- ❌ Commit .env with secrets (exposure risk)
- ❌ Run migrations without snapshots (data loss risk)

### Always Do This

- ✅ Apply `getUserAgencyScope()` to ALL NDA queries
- ✅ Validate input on server (defense in depth)
- ✅ Use Prisma Client for queries (SQL injection safe)
- ✅ Log all mutations to audit_log (compliance)
- ✅ Use transactions for multi-step operations (atomicity)
- ✅ Mock AWS services in tests (no real calls)
- ✅ Create test data with factories (prevent flakiness)
- ✅ Use Handlebars for document generation (correctness)
- ✅ Expire S3 URLs in 15 minutes (security)
- ✅ Index all filterable database fields (performance)
- ✅ Return proper HTTP status codes (API contract)
- ✅ Create pre-deployment snapshots (disaster recovery)

---

## Usage Guidelines

### For AI Agents

Before implementing any code in this project:

1. **Read this file in its entirety** - Understand all critical rules and patterns
2. **Follow ALL rules exactly as documented** - No exceptions without documented reason
3. **When in doubt, prefer the more restrictive option** - Security and compliance first
4. **Reference specific sections** when implementing similar features
5. **Update this file if new patterns emerge** - Keep it current as the project evolves

**Key sections to review by task type:**

- **Adding new API endpoint?** → Framework-Specific Rules (Express API Patterns)
- **Writing tests?** → Testing Rules (structure, mocking, isolation)
- **Creating React component?** → Framework-Specific Rules (React patterns) + Code Quality
- **Querying NDAs?** → Critical Don't-Miss Rules (Row-Level Security is MANDATORY)
- **Writing a service?** → Language-Specific Rules (error handling, types)
- **Making git commit?** → Development Workflow Rules (branch naming, commit messages)

### For Humans (Maintenance)

Keep this project context lean and effective:

1. **Update technology versions** when upgrading dependencies
2. **Add new patterns** as they emerge from development
3. **Remove outdated rules** that become obvious or no longer apply
4. **Review quarterly** to ensure alignment with current codebase
5. **Enforce with code reviews** - Reference this document in PR comments
6. **Keep it scanning-friendly** - Use clear headers and actionable language

**When to update:**

- After major framework upgrades (React, Express, TypeScript)
- When introducing new testing patterns or tools
- If a recurring code review comment suggests a missing rule
- When architectural decisions change
- Quarterly review for optimization

**Format rules:**

- Use markdown for consistency
- Keep rules specific and actionable
- Include examples for complex patterns
- Use ✅ and ❌ for clarity
- Organize by domain (language, framework, testing, etc.)

---

**Last Updated:** 2026-01-02
**Status:** Ready for AI Agent Integration
**Context Optimized:** Yes (lean, actionable, LLM-efficient)

# Story 1.2: JWT Middleware & User Context

Status: done

## Story

As a **developer**,
I want **every API call to validate JWT tokens and load user context**,
so that **all endpoints are protected and have access to user permissions**.

## Acceptance Criteria

### AC1: Valid JWT Token Processing
**Given** A user makes an API request with valid JWT
**When** The request reaches Express middleware
**Then** JWT signature is validated against Cognito public keys
**And** User ID is extracted from token
**And** User's permissions are loaded from database
**And** User's agency access grants are loaded
**And** req.user is populated with {id, email, permissions, authorizedAgencies}

### AC2: Missing JWT Token
**Given** A user makes an API request without JWT
**When** The request reaches authenticateJWT middleware
**Then** 401 Unauthorized is returned with message "Authentication required"
**And** Response includes code: "NO_TOKEN"

### AC3: Expired JWT Token
**Given** A user makes an API request with expired JWT
**When** The token validation occurs
**Then** 401 Unauthorized is returned with message "Token expired, please login again"
**And** Response includes code: "TOKEN_EXPIRED"

### AC4: User Context Loading
**Given** A valid JWT is processed
**When** User context is loaded from database
**Then** Contact record is fetched by Cognito user ID
**And** User's roles are loaded via contact_roles junction table
**And** User's permissions are aggregated from role_permissions
**And** User's agency_group_grants are loaded
**And** User's subagency_grants are loaded (more specific than agency groups)

## Tasks / Subtasks

- [x] **Task 1: Database Schema for Authorization** (AC: 1, 4)
  - [x] 1.1: Create `roles` table with default roles (Admin, NDA User, Limited User, Read-Only)
  - [x] 1.2: Create `permissions` table with 11 permissions (7 NDA + 4 admin)
  - [x] 1.3: Create `role_permissions` junction table
  - [x] 1.4: Create `contact_roles` junction table (contacts ↔ roles)
  - [x] 1.5: Create `agency_group_grants` table (user → agency group access)
  - [x] 1.6: Create `subagency_grants` table (user → specific subagency access)
  - [x] 1.7: Create Prisma schema and migration
  - [x] 1.8: Create seed data for default roles and permissions

- [x] **Task 2: User Context Service** (AC: 1, 4)
  - [x] 2.1: Create `src/server/services/userContextService.ts`
  - [x] 2.2: Implement `loadUserById(userId)` - fetches contact + roles + permissions
  - [x] 2.3: Implement `loadUserPermissions(userId)` - aggregates permissions from roles
  - [x] 2.4: Implement `loadUserAgencyAccess(userId)` - returns authorized agency groups and subagencies
  - [x] 2.5: Cache user context with TTL (5 minutes recommended)
  - [x] 2.6: Add cache invalidation on role/permission changes

- [x] **Task 3: Attach User Context Middleware** (AC: 1, 4)
  - [x] 3.1: Create `src/server/middleware/attachUserContext.ts`
  - [x] 3.2: Load full user context after JWT validation
  - [x] 3.3: Populate `req.user` with complete context:
    - `id`: Cognito sub (user ID)
    - `email`: User's email
    - `contactId`: Database contact ID
    - `permissions`: Set<string> of permission codes
    - `roles`: Array of role names
    - `authorizedAgencyGroups`: Array of agency group IDs
    - `authorizedSubagencies`: Array of subagency IDs
  - [x] 3.4: Handle case where user exists in Cognito but not in database (first login)

- [x] **Task 4: Update JWT Middleware for Real Tokens** (AC: 1, 2, 3)
  - [x] 4.1: Update `authenticateJWT.ts` to use `aws-jwt-verify` with real Cognito when `USE_MOCK_AUTH=false`
  - [x] 4.2: Configure CognitoJwtVerifier with User Pool ID and Client ID
  - [x] 4.3: Implement JWKS caching (aws-jwt-verify handles automatically)
  - [x] 4.4: Extract user ID (`sub` claim) and email from validated token
  - [x] 4.5: Ensure mock mode still works for development

- [x] **Task 5: Middleware Pipeline Integration** (AC: All)
  - [x] 5.1: Update `src/server/index.ts` with proper middleware order:
    1. authenticateJWT
    2. attachUserContext
    3. (Future: checkPermissions, scopeToAgencies)
  - [x] 5.2: Create TypeScript types for extended Request object
  - [x] 5.3: Update Express Request type declaration with `user` property

- [x] **Task 6: Testing** (AC: All)
  - [x] 6.1: Unit tests for userContextService
  - [x] 6.2: Unit tests for attachUserContext middleware
  - [x] 6.3: Integration tests for full middleware pipeline
  - [x] 6.4: Test cache invalidation behavior
  - [x] 6.5: Test first-login scenario (Cognito user, no DB contact)

## Dev Notes

### Technical Requirements

**Middleware Pipeline (from architecture.md):**
```
Request → authenticateJWT → attachUserContext → checkPermissions → scopeToAgencies → Route Handler
```

This story implements steps 1-2. Stories 1.3 and 1.4 implement steps 3-4.

### Database Schema

**From architecture.md - 6 tables for authorization:**

```sql
-- 1. roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false, -- Can't delete system roles
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Default roles (seed data)
-- Admin: Full access
-- NDA User: Can create, edit, email NDAs
-- Limited User: Can view and upload documents only
-- Read-Only: Can only view NDAs

-- 2. permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'nda:create'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL -- 'nda' or 'admin'
);

-- Permissions (11 total):
-- NDA: nda:create, nda:update, nda:upload_document, nda:send_email, nda:mark_status, nda:view, nda:delete
-- Admin: admin:manage_users, admin:manage_agencies, admin:manage_templates, admin:view_audit_logs

-- 3. role_permissions junction
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 4. contact_roles junction (user-role assignment)
CREATE TABLE contact_roles (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES contacts(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (contact_id, role_id)
);

-- 5. agency_group_grants (user → agency group)
CREATE TABLE agency_group_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  agency_group_id UUID REFERENCES agency_groups(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES contacts(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(contact_id, agency_group_id)
);

-- 6. subagency_grants (user → specific subagency, overrides agency group)
CREATE TABLE subagency_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  subagency_id UUID REFERENCES subagencies(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES contacts(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(contact_id, subagency_id)
);
```

### UserContext Type

```typescript
// src/server/types/auth.ts
export interface UserContext {
  id: string;                      // Cognito sub
  email: string;                   // From token
  contactId: string;               // Database contact ID
  permissions: Set<string>;        // Aggregated from roles
  roles: string[];                 // Role names
  authorizedAgencyGroups: string[]; // Agency group IDs
  authorizedSubagencies: string[];  // Subagency IDs (more specific)
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}
```

### First Login Handling

When a user authenticates via Cognito but doesn't exist in the contacts table:
1. Create a new contact record with Cognito sub and email
2. Assign default "Read-Only" role
3. Admin must later grant specific roles and agency access
4. Log this as audit event: "user_auto_provisioned"

### Caching Strategy

```typescript
// Simple in-memory cache with TTL
const userContextCache = new Map<string, { context: UserContext; expires: number }>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedUserContext(userId: string): UserContext | null {
  const cached = userContextCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return cached.context;
  }
  return null;
}

function setCachedUserContext(userId: string, context: UserContext): void {
  userContextCache.set(userId, {
    context,
    expires: Date.now() + CACHE_TTL_MS,
  });
}

function invalidateUserContext(userId: string): void {
  userContextCache.delete(userId);
}
```

### Dependencies on Story 1.1

This story builds on Story 1.1:
- Uses existing `authenticateJWT` middleware
- Uses existing mock token system for development
- Uses existing Express server setup
- Uses existing Cognito service

### References

- [Source: docs/architecture.md#Authentication-Flow]
- [Source: docs/architecture.md#Middleware-Pipeline]
- [Source: docs/architecture.md#Database-Schema-roles-permissions]
- [Source: docs/epics.md#Story-1.2-JWT-Middleware-User-Context]
- [Source: docs/PRD.md#FR33-Granular-RBAC]

## Dev Agent Record

### Context Reference
- Epic 1: Foundation & Authentication
- FRs Covered: FR33 (Granular RBAC), FR39-40 (User context)
- Dependencies: Story 1.1 (completed)

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20250929)

### Debug Log References
N/A

### Completion Notes List
- This story provides the foundation for RBAC (Story 1.3) and Row-Level Security (Story 1.4)
- The `req.user.permissions` set will be used by `checkPermissions` middleware in Story 1.3
- The `req.user.authorizedAgencyGroups/authorizedSubagencies` will be used by `scopeToAgencies` middleware in Story 1.4
- Middleware now merges full user context into `req.user` and blocks inactive users
- Added unit and integration tests for user context service/middleware and cache invalidation

### File List
Files created:
- `src/server/middleware/__tests__/attachUserContext.test.ts`
- `src/server/middleware/__tests__/middlewarePipeline.test.ts`
- `src/server/services/__tests__/userContextService.test.ts`

Files modified:
- `prisma/schema.prisma` updates (roles, permissions tables)
- `prisma/migrations/` - Migration for auth tables
- `prisma/seed.ts` - Seed data for roles/permissions
- `src/server/services/userContextService.ts`
- `src/server/middleware/attachUserContext.ts`
- `src/server/types/auth.ts` - TypeScript types
- `src/server/middleware/authenticateJWT.ts` - Add real Cognito support
- `src/server/index.ts` - Update middleware pipeline
- `src/server/services/__tests__/companySuggestionsService.test.ts` - Fix UserContext type import
- `src/server/services/__tests__/agencySuggestionsService.test.ts` - Fix UserContext type import
- `src/server/services/__tests__/documentGenerationService.test.ts` - Fix UserContext type import

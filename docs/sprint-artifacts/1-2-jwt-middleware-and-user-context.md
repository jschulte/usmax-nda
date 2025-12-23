# Story 1.2: JWT Middleware & User Context

Status: ready-for-dev

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

### AC3: Expired JWT Token
**Given** A user makes an API request with expired JWT
**When** The token validation occurs
**Then** 401 Unauthorized is returned with message "Token expired, please login again"

## Tasks / Subtasks

- [ ] **Task 1: Database Schema for Authorization** (AC: 1)
  - [ ] 1.1: Create roles table (Admin, NDA User, Limited User, Read-Only)
  - [ ] 1.2: Create permissions table (7 NDA + 4 admin permissions)
  - [ ] 1.3: Create role_permissions junction table
  - [ ] 1.4: Create contact_roles junction table (users ↔ roles)
  - [ ] 1.5: Create agency_group_grants table (user → agency group access)
  - [ ] 1.6: Create subagency_grants table (user → specific subagency access)
  - [ ] 1.7: Run Prisma migration

- [ ] **Task 2: Seed Default Roles and Permissions** (AC: 1)
  - [ ] 2.1: Seed 4 default roles with descriptions
  - [ ] 2.2: Seed 11 permissions (codes and descriptions)
  - [ ] 2.3: Map permissions to roles (role-permission matrix)
  - [ ] 2.4: Create seed script in prisma/seed.ts

- [ ] **Task 3: User Context Service** (AC: 1)
  - [ ] 3.1: Create src/server/services/userContextService.ts
  - [ ] 3.2: Implement loadUserById(userId) - fetch contact + roles
  - [ ] 3.3: Implement loadUserPermissions(userId) - aggregate from roles
  - [ ] 3.4: Implement loadUserAgencyAccess(userId) - get authorized agencies/subagencies
  - [ ] 3.5: Return complete UserContext object
  - [ ] 3.6: Implement caching with 5-minute TTL

- [ ] **Task 4: Attach User Context Middleware** (AC: 1)
  - [ ] 4.1: Create src/server/middleware/attachUserContext.ts
  - [ ] 4.2: Load user context after JWT validation
  - [ ] 4.3: Populate req.user with permissions and agency access
  - [ ] 4.4: Handle first-login scenario (Cognito user, no DB record)
  - [ ] 4.5: Return 401 if user not found or inactive

- [ ] **Task 5: TypeScript Types** (AC: 1)
  - [ ] 5.1: Create src/server/types/auth.ts
  - [ ] 5.2: Define UserContext interface
  - [ ] 5.3: Extend Express Request type globally
  - [ ] 5.4: Export types for use in routes and services

- [ ] **Task 6: Middleware Pipeline Integration** (AC: 1, 2, 3)
  - [ ] 6.1: Update Express app to use middleware in order:
    - authenticateJWT (from Story 1.1)
    - attachUserContext (this story)
  - [ ] 6.2: Apply to all protected routes
  - [ ] 6.3: Keep public routes (login, MFA) without middleware

- [ ] **Task 7: Testing** (AC: All)
  - [ ] 7.1: Unit tests for userContextService
  - [ ] 7.2: Unit tests for attachUserContext middleware
  - [ ] 7.3: Integration tests for full middleware pipeline
  - [ ] 7.4: Test cache invalidation
  - [ ] 7.5: Test first-login auto-provisioning

## Dev Notes

### Middleware Pipeline Architecture

From architecture.md, the complete pipeline is:
```
Request → authenticateJWT → attachUserContext → checkPermissions → scopeToAgencies → Route Handler
          └── Story 1.1    └── THIS STORY      └── Story 1.3      └── Story 1.4
```

This story implements step 2: loading complete user context.

### UserContext Type Definition

```typescript
export interface UserContext {
  id: string;                        // Cognito sub
  email: string;                     // From JWT token
  contactId: string;                 // Database contact ID
  permissions: Set<string>;          // Aggregated permission codes
  roles: string[];                   // Role names
  authorizedAgencyGroups: string[];  // Agency group IDs
  authorizedSubagencies: string[];   // Subagency IDs (more specific)
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

### User Context Loading Logic

```typescript
async function loadUserContext(cognitoUserId: string, email: string): Promise<UserContext> {
  // Find contact by Cognito ID
  let contact = await prisma.contact.findUnique({
    where: { cognitoUserId },
    include: {
      contactRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true }
              }
            }
          }
        }
      },
      agencyGroupGrants: true,
      subagencyGrants: true
    }
  });

  // First login - auto-provision
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        cognitoUserId,
        email,
        isInternal: true,
        // Assign Read-Only role by default
        contactRoles: {
          create: {
            roleId: await getReadOnlyRoleId()
          }
        }
      }
    });
  }

  // Aggregate permissions from all roles
  const permissions = new Set<string>();
  contact.contactRoles.forEach(cr => {
    cr.role.rolePermissions.forEach(rp => {
      permissions.add(rp.permission.code);
    });
  });

  // Get agency access
  const agencyGroupIds = contact.agencyGroupGrants.map(agg => agg.agencyGroupId);
  const subagencyIds = contact.subagencyGrants.map(sg => sg.subagencyId);

  return {
    id: cognitoUserId,
    email,
    contactId: contact.id,
    permissions,
    roles: contact.contactRoles.map(cr => cr.role.name),
    authorizedAgencyGroups: agencyGroupIds,
    authorizedSubagencies: subagencyIds
  };
}
```

### Database Tables (6 Authorization Tables)

From architecture.md:
1. **roles** - Role definitions (Admin, NDA User, Limited User, Read-Only)
2. **permissions** - 11 permissions (nda:create, nda:view, admin:manage_users, etc.)
3. **role_permissions** - Junction (roles ↔ permissions)
4. **contact_roles** - Junction (contacts ↔ roles)
5. **agency_group_grants** - User access to entire agency groups
6. **subagency_grants** - User access to specific subagencies

### Caching Strategy

```typescript
import NodeCache from 'node-cache';

const userContextCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

export function getCachedContext(userId: string): UserContext | null {
  return userContextCache.get(userId) || null;
}

export function setCachedContext(userId: string, context: UserContext): void {
  userContextCache.set(userId, context);
}

export function invalidateContext(userId: string): void {
  userContextCache.del(userId);
}
```

### First Login Auto-Provisioning

**Business Rule:**
- User exists in Cognito (authenticated successfully)
- No contact record in database yet
- Auto-create contact with Read-Only role
- Admin must later grant proper roles and agency access

### Integration with Story 1.1

**Builds on:**
- authenticateJWT middleware (extracts basic user ID/email)
- JWT token validation
- Cookie handling

**Extends:**
- req.user now includes permissions and agency access (not just ID/email)

### Project Structure Notes

**New Files:**
- `src/server/services/userContextService.ts` - User context loading
- `src/server/middleware/attachUserContext.ts` - Middleware
- `src/server/types/auth.ts` - TypeScript types
- `prisma/schema.prisma` - MODIFY (add 6 auth tables)
- `prisma/seed.ts` - Seed roles and permissions
- Migration files for auth tables

**Files to Modify:**
- `src/server/index.ts` - Add attachUserContext to pipeline
- `src/server/middleware/authenticateJWT.ts` - Ensure it works with real Cognito

**Follows established patterns:**
- Service layer for business logic
- Middleware for cross-cutting concerns
- Caching for performance
- Mock mode for development

### References

- [Source: docs/epics.md#Epic 1: Foundation & Authentication - Story 1.2]
- [Source: docs/architecture.md#Middleware Pipeline]
- [Source: docs/architecture.md#Database Schema - Authorization tables]
- [Source: Story 1.1 - Authentication foundation]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Builds on Story 1.1 JWT validation
- Establishes user context pattern for all future stories
- 6 authorization tables specified
- Caching strategy defined
- First-login auto-provisioning logic

### File List

Files to be created/modified during implementation:
- `prisma/schema.prisma` - ADD 6 authorization tables
- `prisma/seed.ts` - ADD roles and permissions seed data
- `src/server/services/userContextService.ts` - NEW
- `src/server/middleware/attachUserContext.ts` - NEW
- `src/server/types/auth.ts` - NEW
- `src/server/index.ts` - MODIFY (add middleware to pipeline)
- Migration files for authorization schema
- `src/server/services/__tests__/userContextService.test.ts` - NEW
- `src/server/middleware/__tests__/attachUserContext.test.ts` - NEW

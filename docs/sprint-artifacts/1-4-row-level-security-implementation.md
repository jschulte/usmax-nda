# Story 1.4: Row-Level Security Implementation

Status: review

## Story

As a **user**,
I want **to only see NDAs for my authorized agencies**,
so that **I don't access NDAs outside my scope (compliance requirement)**.

## Acceptance Criteria

### AC1: Agency Group Access Filtering
**Given** User has access to Agency Group "DoD"
**When** User queries GET /api/ndas
**Then** scopeToAgencies middleware applies WHERE filter
**And** Only NDAs where subagency.agencyGroup = "DoD" are returned
**And** NDAs from other agencies (Commercial, Fed Civ) are NOT visible

### AC2: Subagency-Specific Access Filtering
**Given** User has access to specific Subagency "Air Force" (not entire DoD group)
**When** User queries NDAs
**Then** Only NDAs where subagency = "Air Force" are returned
**And** Other DoD subagencies (Army, Navy) are NOT visible

### AC3: Unauthorized NDA Access Returns 404
**Given** A user tries to access GET /api/ndas/{id} for unauthorized NDA
**When** NDA belongs to agency user doesn't have access to
**Then** 404 Not Found is returned (not 403 - don't reveal NDA exists)

### AC4: Scope Helper Function
**Given** Row-level security helper function scopeNDAsToUser(userId)
**When** Called with user ID
**Then** Returns Prisma where clause filtering by authorized subagencies
**And** This helper is used on EVERY prisma.nda.findMany/findFirst/count call

### AC5: Combined Agency Group and Subagency Access
**Given** User has agency group "DoD" access AND specific subagency "Commercial Company A"
**When** User queries NDAs
**Then** User sees all DoD subagency NDAs + Commercial Company A NDAs
**And** Other Commercial subagencies are NOT visible

## Tasks / Subtasks

- [ ] **Task 1: scopeToAgencies Middleware** (AC: 1, 2, 3)
  - [ ] 1.1: Create `src/server/middleware/scopeToAgencies.ts`
  - [ ] 1.2: Read user's authorizedAgencyGroups and authorizedSubagencies from req.user
  - [ ] 1.3: Compute complete list of authorized subagency IDs
  - [ ] 1.4: Attach `req.agencyScope` with Prisma where clause
  - [ ] 1.5: Handle case where user has no agency access (return empty results)

- [ ] **Task 2: getUserAgencyScope Helper** (AC: 4, 5)
  - [ ] 2.1: Create `src/server/services/agencyScopeService.ts`
  - [ ] 2.2: Implement `getUserAgencyScope(userId)` function
  - [ ] 2.3: Query subagency_grants for direct subagency access
  - [ ] 2.4: Query agency_group_grants and expand to all subagencies in each group
  - [ ] 2.5: Return `{ subagencyId: { in: [...authorizedIds] } }` Prisma clause
  - [ ] 2.6: Cache authorized IDs with TTL (reuse from userContextService)

- [ ] **Task 3: Scope Helper Integration** (AC: 1, 2, 4)
  - [ ] 3.1: Create `applyAgencyScope(baseWhere, req.user)` wrapper function
  - [ ] 3.2: Document mandatory usage pattern in code comments
  - [ ] 3.3: Create ESLint rule or code review checklist for scope enforcement

- [ ] **Task 4: 404 Not Found Pattern** (AC: 3)
  - [ ] 4.1: Create `withAgencyScope` wrapper for findUnique/findFirst
  - [ ] 4.2: Return null when NDA exists but user not authorized (becomes 404)
  - [ ] 4.3: Ensure no information leakage in error responses
  - [ ] 4.4: Log unauthorized access attempts to audit log (silently)

- [ ] **Task 5: Apply to NDA Routes** (AC: All)
  - [ ] 5.1: Update `GET /api/ndas` to use agency scope
  - [ ] 5.2: Update `GET /api/ndas/:id` to use agency scope with 404 pattern
  - [ ] 5.3: Update `GET /api/ndas/:id/documents` to scope by NDA
  - [ ] 5.4: Update `GET /api/ndas/:id/history` to scope by NDA
  - [ ] 5.5: Update any count/aggregation queries

- [ ] **Task 6: Testing** (AC: All)
  - [ ] 6.1: Unit tests for getUserAgencyScope helper
  - [ ] 6.2: Test agency group access (all subagencies visible)
  - [ ] 6.3: Test specific subagency access (only that subagency visible)
  - [ ] 6.4: Test combined access (union of both)
  - [ ] 6.5: Test 404 response for unauthorized NDA access
  - [ ] 6.6: Test no agency access returns empty results
  - [ ] 6.7: Integration tests for scoped NDA endpoints

## Dev Notes

### Row-Level Security SQL Pattern

From architecture.md:

```sql
-- User can see NDA if:
SELECT * FROM ndas
WHERE subagency_id IN (
  -- Has direct subagency access
  SELECT subagency_id FROM subagency_grants WHERE contact_id = $userId
  UNION
  -- Has agency group access (sees all subagencies in group)
  SELECT s.id FROM subagencies s
  INNER JOIN agency_group_grants aga ON s.agency_group_id = aga.agency_group_id
  WHERE aga.contact_id = $userId
);
```

### Prisma Helper Implementation

```typescript
// src/server/services/agencyScopeService.ts
import { prisma } from '../db';

/**
 * Get Prisma where clause for user's authorized subagencies.
 * This MUST be applied to all NDA queries for row-level security.
 */
export async function getUserAgencyScope(userId: string): Promise<{ subagencyId: { in: string[] } }> {
  const user = await prisma.contact.findUnique({
    where: { id: userId },
    include: {
      agencyGroupGrants: {
        include: {
          agencyGroup: {
            include: { subagencies: true }
          }
        }
      },
      subagencyGrants: true
    }
  });

  if (!user) {
    return { subagencyId: { in: [] } }; // No access
  }

  // Direct subagency access
  const directSubagencyIds = user.subagencyGrants.map(sg => sg.subagencyId);

  // Agency group access (expands to all subagencies in group)
  const groupSubagencyIds = user.agencyGroupGrants.flatMap(
    agg => agg.agencyGroup.subagencies.map(s => s.id)
  );

  // Union of both (deduplicated)
  const authorizedSubagencyIds = [...new Set([...directSubagencyIds, ...groupSubagencyIds])];

  return { subagencyId: { in: authorizedSubagencyIds } };
}
```

### Middleware Implementation

```typescript
// src/server/middleware/scopeToAgencies.ts
import type { Request, Response, NextFunction } from 'express';
import { getUserAgencyScope } from '../services/agencyScopeService';

/**
 * Middleware that computes and attaches agency scope to request.
 * Use req.agencyScope in route handlers for NDA queries.
 */
export async function scopeToAgencies(req: Request, res: Response, next: NextFunction) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED',
    });
  }

  try {
    // Compute authorized subagencies (from user context or fresh query)
    const scope = await getUserAgencyScope(user.contactId);
    req.agencyScope = scope;
    next();
  } catch (error) {
    console.error('Error computing agency scope:', error);
    return res.status(500).json({
      error: 'Failed to determine access scope',
      code: 'SCOPE_ERROR',
    });
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      agencyScope?: { subagencyId: { in: string[] } };
    }
  }
}
```

### Route Handler Pattern

```typescript
// ✅ CORRECT: Always apply agency scope
router.get('/api/ndas', authenticateJWT, attachUserContext, scopeToAgencies, async (req, res) => {
  const { status, search } = req.query;

  const ndas = await prisma.nda.findMany({
    where: {
      ...(status && { status }),
      ...(search && {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { pocName: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...req.agencyScope, // MANDATORY - applies row-level security
    },
    include: {
      subagency: { include: { agencyGroup: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(ndas);
});

// ❌ WRONG: Missing agency scope (security vulnerability!)
router.get('/api/ndas', async (req, res) => {
  const ndas = await prisma.nda.findMany(); // User sees ALL NDAs!
});
```

### 404 Pattern for Single NDA Access

```typescript
// src/server/utils/scopedQuery.ts
export async function findNdaWithScope(
  ndaId: string,
  userId: string
): Promise<NDA | null> {
  const scope = await getUserAgencyScope(userId);

  // Query with both ID and agency scope
  const nda = await prisma.nda.findFirst({
    where: {
      id: ndaId,
      ...scope, // Filters to authorized subagencies
    },
    include: {
      subagency: true,
      documents: true,
    },
  });

  // Returns null if NDA doesn't exist OR user not authorized
  // Caller returns 404 in both cases (no information leakage)
  return nda;
}

// Usage in route handler
router.get('/api/ndas/:id', async (req, res) => {
  const nda = await findNdaWithScope(req.params.id, req.user.contactId);

  if (!nda) {
    // Could be: doesn't exist OR unauthorized - same response
    return res.status(404).json({
      error: 'NDA not found',
      code: 'NOT_FOUND',
    });
  }

  res.json(nda);
});
```

### Audit Logging for Unauthorized Access

```typescript
// When user attempts to access NDA outside their scope
// Log silently for security monitoring, but return 404 to user
if (!nda) {
  // Check if NDA actually exists (for audit only)
  const exists = await prisma.nda.findUnique({
    where: { id: ndaId },
    select: { id: true, subagencyId: true },
  });

  if (exists) {
    // NDA exists but user not authorized - log for security review
    await auditService.log({
      action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
      entityType: 'nda',
      entityId: ndaId,
      userId: req.user.contactId,
      details: {
        attemptedSubagency: exists.subagencyId,
        userScope: req.agencyScope,
      },
    });
  }

  return res.status(404).json({ error: 'NDA not found', code: 'NOT_FOUND' });
}
```

### Middleware Pipeline Order

```
Request → authenticateJWT → attachUserContext → checkPermissions → scopeToAgencies → Route Handler
          └── Story 1.1    └── Story 1.2       └── Story 1.3      └── THIS STORY
```

Note: scopeToAgencies runs AFTER checkPermissions. User must have the required permission (e.g., nda:view) before agency scope is applied.

### Performance Considerations

1. **Caching**: User's authorized subagency IDs should be cached in userContextService (Story 1.2)
2. **Index**: Ensure `ndas.subagency_id` is indexed for fast filtering
3. **Pre-computation**: Consider materializing authorized subagencies during login/context load

### Dependencies

- Story 1.1: Authentication (completed)
- Story 1.2: User context with authorizedAgencyGroups/authorizedSubagencies
- Story 1.3: Permission checks (runs before agency scope)

### References

- [Source: docs/architecture.md#Row-Level-Security-Pattern]
- [Source: docs/architecture.md#Middleware-Pipeline]
- [Source: docs/epics.md#Story-1.4-Row-Level-Security]
- [Source: docs/PRD.md#FR37-Agency-Based-Filtering]
- [Source: docs/PRD.md#FR38-Subagency-Scoping]

## Dev Agent Record

### Context Reference
- Epic 1: Foundation & Authentication
- FRs Covered: FR37, FR38, FR39
- Dependencies: Story 1.1 (completed), Story 1.2 (user context), Story 1.3 (permissions)

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20250929)

### Debug Log References
N/A

### Completion Notes List
- This is the final layer of authorization (after permissions)
- All NDA queries MUST use agency scope - no exceptions
- 404 pattern prevents information leakage about unauthorized NDAs
- Audit logging captures unauthorized access attempts silently

### File List
Files to create:
- `src/server/middleware/scopeToAgencies.ts`
- `src/server/services/agencyScopeService.ts`
- `src/server/utils/scopedQuery.ts`
- Test files for middleware and services

Files to modify:
- `src/server/index.ts` - Add scopeToAgencies to middleware pipeline
- `src/server/types/auth.ts` - Extend Request type with agencyScope
- `src/server/services/auditService.ts` - Add UNAUTHORIZED_ACCESS_ATTEMPT action

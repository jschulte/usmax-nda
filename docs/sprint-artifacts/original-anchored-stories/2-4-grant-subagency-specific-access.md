# Story 2.4: Grant Subagency-Specific Access

Status: done

## Story

As an **admin**,
I want **to grant users access to specific subagencies only**,
so that **I can provide granular access control (not entire group)**.

## Acceptance Criteria

### AC1: Grant Subagency Access
**Given** User "John Smith" and Subagency "Air Force" (within DoD) exist
**When** I open Air Force subagency access management
**And** Search for John (auto-complete)
**And** Click "Grant Subagency Access"
**Then** John added to "users having access to this subagency" list
**And** subagency_grants table records grant
**And** John can see ONLY Air Force NDAs (not Army, Navy, or other DoD subagencies)

### AC2: Combined Group and Subagency Access
**Given** User has both group access (DoD) and specific subagency access (NIH in Fed Civ)
**When** User queries NDAs
**Then** User sees: All DoD subagencies + NIH
**And** Query uses UNION of group access + subagency access

### AC3: View Users with Subagency Access
**Given** I view subagency access management
**When** Displaying Air Force access list
**Then** I see users with direct subagency access
**And** Also shows users with parent group access (DoD) as "inherited"

### AC4: Revoke Subagency Access
**Given** I revoke John's subagency access
**When** I click "Revoke Access"
**Then** John removed from access list
**And** John can no longer see Air Force NDAs
**And** audit_log records "access_revoked"

## Tasks / Subtasks

- [x] **Task 1: Subagency Access API** (AC: 1, 3, 4)
  - [x] 1.1: Implement `GET /api/subagencies/:id/access` - List users with subagency access
  - [x] 1.2: Include users with inherited group access (marked as "inherited")
  - [x] 1.3: Implement `POST /api/subagencies/:id/access` - Grant subagency access
  - [x] 1.4: Implement `DELETE /api/subagencies/:id/access/:contactId` - Revoke access
  - [x] 1.5: Add audit logging for all operations
  - [x] 1.6: Protect routes with `requirePermission(ADMIN_MANAGE_AGENCIES)`

- [x] **Task 2: Subagency Access Service** (AC: 1, 2, 3, 4)
  - [x] 2.1: Create subagency access service functions
  - [x] 2.2: Query for direct and inherited access
  - [x] 2.3: Update user context cache on access changes
  - [x] 2.4: Validate access doesn't already exist

- [x] **Task 3: Frontend Subagency Access UI** (AC: 1, 3, 4)
  - [x] 3.1: Add "Manage Access" to subagency list items
  - [x] 3.2: Create subagency access modal/panel
  - [x] 3.3: Show direct vs inherited access with visual distinction
  - [x] 3.4: Only allow revoke on direct access (not inherited)

- [x] **Task 4: Testing** (AC: All)
  - [x] 4.1: Test subagency access grant/revoke
  - [x] 4.2: Test combined group + subagency access filtering
  - [x] 4.3: Test inherited access display
  - [x] 4.4: Test audit logging

### Review Follow-ups (AI)
- [x] [AI-Review][CRITICAL] Story status/tasks were still “ready-for-dev” despite subagency access API/service already present; updated status/tasks to match implementation. [docs/sprint-artifacts/2-4-grant-subagency-specific-access.md:5]
- [x] [AI-Review][HIGH] Subagency access UI (manage access + inherited display) was missing; added subagency access modal with direct/inherited labeling and revoke restriction. [src/components/screens/admin/AgencyGroups.tsx:520]
- [x] [AI-Review][HIGH] No DB-backed tests for subagency access endpoints/inherited access display; added integration coverage in agency access tests. [src/server/routes/__tests__/agencyAccess.integration.test.ts:60]
- [x] [AI-Review][MEDIUM] File list incomplete/outdated; reconciled to reflect actual modified files. [docs/sprint-artifacts/2-4-grant-subagency-specific-access.md:150]

## Dev Notes

### API Endpoints

```typescript
// GET /api/subagencies/:id/access
{
  users: [
    {
      contactId, name, email,
      accessType: "direct" | "inherited",
      inheritedFrom?: { agencyGroupId, agencyGroupName },
      grantedBy?: { id, name },
      grantedAt?
    }
  ]
}

// POST /api/subagencies/:id/access
// Body: { contactId }
// Returns: Grant record

// DELETE /api/subagencies/:id/access/:contactId
// Returns: 204 on success
```

### Access Query Logic

```typescript
// Get users with access to a subagency (direct OR inherited)
async function getSubagencyAccessUsers(subagencyId: string) {
  const subagency = await prisma.subagency.findUnique({
    where: { id: subagencyId },
    include: { agencyGroup: true }
  });

  // Direct subagency access
  const directAccess = await prisma.subagencyGrant.findMany({
    where: { subagencyId },
    include: { contact: true, grantedByUser: true }
  });

  // Inherited from agency group
  const inheritedAccess = await prisma.agencyGroupGrant.findMany({
    where: { agencyGroupId: subagency.agencyGroupId },
    include: { contact: true, grantedByUser: true }
  });

  // Combine and mark access type
  return [...directAccess.map(d => ({ ...d, accessType: 'direct' })),
          ...inheritedAccess.map(i => ({ ...i, accessType: 'inherited' }))];
}
```

### Dependencies

- Story 2.2: Subagencies CRUD
- Story 2.3: Agency group access (for inherited access display)

### References

- [Source: docs/epics.md#Story-2.4-Grant-Subagency-Specific-Access]
- [Source: docs/PRD.md#FR45-46]

## Dev Agent Record

### Context Reference
- Epic 2: Agency & User Management
- FRs Covered: FR45-46
- Dependencies: Story 2.2, Story 2.3

### Agent Model Used
Claude Opus 4.5

### Debug Log References
N/A

### Completion Notes List
- Subagency-level access is more granular than group access
- Added subagency access modal with direct vs inherited access display
- Added DB-backed integration tests for subagency access endpoints

### File List
Files to modify:
- `src/server/routes/agencyAccess.ts` - Add subagency access endpoints
- `src/server/services/agencyAccessService.ts` - Add subagency access logic
- `src/components/screens/admin/AgencyGroups.tsx` - Add subagency access UI
- `src/client/components/UserAutocomplete.tsx` - Reused for access grants
- `src/client/services/agencyAccessService.ts` - Subagency access client helpers
- `src/server/routes/__tests__/agencyAccess.integration.test.ts` - Subagency access integration tests

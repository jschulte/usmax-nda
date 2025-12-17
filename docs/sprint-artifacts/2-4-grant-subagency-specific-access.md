# Story 2.4: Grant Subagency-Specific Access

Status: ready-for-dev

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

- [ ] **Task 1: Subagency Access API** (AC: 1, 3, 4)
  - [ ] 1.1: Implement `GET /api/subagencies/:id/access` - List users with subagency access
  - [ ] 1.2: Include users with inherited group access (marked as "inherited")
  - [ ] 1.3: Implement `POST /api/subagencies/:id/access` - Grant subagency access
  - [ ] 1.4: Implement `DELETE /api/subagencies/:id/access/:contactId` - Revoke access
  - [ ] 1.5: Add audit logging for all operations
  - [ ] 1.6: Protect routes with `requirePermission(ADMIN_MANAGE_AGENCIES)`

- [ ] **Task 2: Subagency Access Service** (AC: 1, 2, 3, 4)
  - [ ] 2.1: Create subagency access service functions
  - [ ] 2.2: Query for direct and inherited access
  - [ ] 2.3: Update user context cache on access changes
  - [ ] 2.4: Validate access doesn't already exist

- [ ] **Task 3: Frontend Subagency Access UI** (AC: 1, 3, 4)
  - [ ] 3.1: Add "Manage Access" to subagency list items
  - [ ] 3.2: Create subagency access modal/panel
  - [ ] 3.3: Show direct vs inherited access with visual distinction
  - [ ] 3.4: Only allow revoke on direct access (not inherited)

- [ ] **Task 4: Testing** (AC: All)
  - [ ] 4.1: Test subagency access grant/revoke
  - [ ] 4.2: Test combined group + subagency access filtering
  - [ ] 4.3: Test inherited access display
  - [ ] 4.4: Test audit logging

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
- Must show inherited access from parent group

### File List
Files to modify:
- `src/server/routes/agencyAccess.ts` - Add subagency access endpoints
- `src/server/services/agencyAccessService.ts` - Add subagency access logic
- `src/client/pages/admin/AgencyGroupsPage.tsx` - Add subagency access UI
- Test files

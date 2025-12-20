# Story 2.3: Grant Agency Group Access to Users

Status: done

## Story

As an **admin**,
I want **to grant users access to entire agency groups**,
so that **they can see all NDAs across all subagencies in that group**.

## Acceptance Criteria

### AC1: Grant Group Access
**Given** User "Kelly Davidson" and Agency Group "DoD" exist
**When** I open DoD access management
**And** Search for "Kelly" (auto-complete shows matches)
**And** Click "Grant Group Access"
**Then** Kelly is added to "users having access to DoD" list
**And** agency_group_grants table records: contact_id=Kelly, agency_group_id=DoD, granted_by=me
**And** audit_log records "access_granted" action
**And** Kelly can now see ALL NDAs in DoD subagencies

### AC2: View Users with Group Access
**Given** I view "Users having access to Agency Group"
**When** Displaying DoD access
**Then** I see list of all users with group-level access
**And** For each user, shows: name, email, granted_by, granted_at

### AC3: Revoke Group Access
**Given** I revoke Kelly's group access
**When** I click "Revoke Access"
**Then** Kelly removed from access list
**And** Kelly can no longer see ANY DoD NDAs
**And** audit_log records "access_revoked"

### AC4: User Autocomplete Search
**Given** I type in the user search box
**When** I enter at least 3 characters (e.g., "Kel")
**Then** Auto-complete shows matching users with context
**And** Results show: name, email, current roles

## Tasks / Subtasks

- [x] **Task 1: Agency Group Access API** (AC: 1, 2, 3)
  - [x] 1.1: Create `src/server/routes/agencyAccess.ts`
  - [x] 1.2: Implement `GET /api/agency-groups/:id/access` - List users with group access
  - [x] 1.3: Implement `POST /api/agency-groups/:id/access` - Grant group access
  - [x] 1.4: Implement `DELETE /api/agency-groups/:id/access/:contactId` - Revoke access
  - [x] 1.5: Add audit logging for all grant/revoke operations
  - [x] 1.6: Protect routes with `requirePermission(ADMIN_MANAGE_AGENCIES)`

- [x] **Task 2: User Search Autocomplete API** (AC: 4)
  - [x] 2.1: Implement `GET /api/contacts/search?q=` - User autocomplete
  - [x] 2.2: Return matches with name, email, roles, job title
  - [x] 2.3: Minimum 3 characters before search
  - [x] 2.4: Limit results to 10 for performance

- [x] **Task 3: Agency Group Access Service** (AC: 1, 2, 3)
  - [x] 3.1: Create `src/server/services/agencyAccessService.ts`
  - [x] 3.2: Implement grant/revoke operations
  - [x] 3.3: Update user context cache when access changes
  - [x] 3.4: Validate user doesn't already have access before granting

- [x] **Task 4: Frontend Access Management UI** (AC: 1, 2, 3, 4)
  - [x] 4.1: Add "Manage Access" button to agency group list
  - [x] 4.2: Create access management modal/panel
  - [x] 4.3: Implement user search autocomplete component
  - [x] 4.4: Display current users with access (table)
  - [x] 4.5: Implement grant/revoke with confirmation

- [x] **Task 5: Testing** (AC: All)
  - [x] 5.1: Unit tests for agencyAccessService
  - [x] 5.2: Test user autocomplete search
  - [x] 5.3: Test grant/revoke flow
  - [x] 5.4: Test audit logging

### Review Follow-ups (AI)
- [x] [AI-Review][CRITICAL] Story status/tasks were still “ready-for-dev” with unchecked items despite existing API/service work; updated status/tasks to match implementation. [docs/sprint-artifacts/2-3-grant-agency-group-access-to-users.md:5]
- [x] [AI-Review][HIGH] Access management UI and user autocomplete were missing from Agency Groups screen; added Manage Access modal + UserAutocomplete component. [src/components/screens/admin/AgencyGroups.tsx:250]
- [x] [AI-Review][HIGH] No DB-backed route tests for agency access endpoints or contact search; added integration tests. [src/server/routes/__tests__/agencyAccess.integration.test.ts:1]
- [x] [AI-Review][MEDIUM] Autocomplete results omitted job title/department context; added jobTitle to API + UI display. [src/server/services/agencyAccessService.ts:27]
- [x] [AI-Review][MEDIUM] File list incomplete for new services/components/tests; reconciled file list. [docs/sprint-artifacts/2-3-grant-agency-group-access-to-users.md:120]

## Dev Notes

### API Endpoints

```typescript
// GET /api/agency-groups/:id/access
// Returns users with access to this group
{
  users: [
    {
      contactId, name, email,
      grantedBy: { id, name },
      grantedAt
    }
  ]
}

// POST /api/agency-groups/:id/access
// Body: { contactId }
// Returns: Grant record

// DELETE /api/agency-groups/:id/access/:contactId
// Returns: 204 on success

// GET /api/contacts/search?q=kel
// Returns users matching search
{
  contacts: [
    { id, firstName, lastName, email, roles: ["NDA User"] }
  ]
}
```

### User Context Cache Invalidation

When granting or revoking access, invalidate the user's cached context:
```typescript
import { invalidateUserContext } from '../services/userContextService';
// After grant/revoke:
const contact = await prisma.contact.findUnique({ where: { id: contactId } });
if (contact?.cognitoId) {
  invalidateUserContext(contact.cognitoId);
}
```

### Dependencies

- Story 2.1: Agency Groups CRUD
- Story 1.2: User context service (for cache invalidation)

### References

- [Source: docs/epics.md#Story-2.3-Grant-Agency-Group-Access]
- [Source: docs/PRD.md#FR45-46]

## Dev Agent Record

### Context Reference
- Epic 2: Agency & User Management
- FRs Covered: FR45-46, FR80
- Dependencies: Story 2.1, Story 1.2

### Agent Model Used
Claude Opus 4.5

### Debug Log References
N/A

### Completion Notes List
- Implements agency group-level access control
- Added Manage Access modal with user autocomplete on Agency Groups screen
- Added job title context to autocomplete results
- Added DB-backed integration tests for agency access + contact search

### File List
Files to create:
- `src/server/routes/agencyAccess.ts`
- `src/server/services/agencyAccessService.ts`
- `src/client/components/UserAutocomplete.tsx`
- `src/client/services/agencyAccessService.ts`
- `src/server/services/__tests__/agencyAccessService.test.ts`
- `src/server/routes/__tests__/agencyAccess.integration.test.ts`

Files to modify:
- `src/server/index.ts` - Register routes
- `src/components/screens/admin/AgencyGroups.tsx` - Add access management UI
- `docs/permission-mapping.md` - Document agency access permissions

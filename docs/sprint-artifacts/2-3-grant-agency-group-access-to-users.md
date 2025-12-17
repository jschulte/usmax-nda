# Story 2.3: Grant Agency Group Access to Users

Status: ready-for-dev

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

- [ ] **Task 1: Agency Group Access API** (AC: 1, 2, 3)
  - [ ] 1.1: Create `src/server/routes/agencyAccess.ts`
  - [ ] 1.2: Implement `GET /api/agency-groups/:id/access` - List users with group access
  - [ ] 1.3: Implement `POST /api/agency-groups/:id/access` - Grant group access
  - [ ] 1.4: Implement `DELETE /api/agency-groups/:id/access/:contactId` - Revoke access
  - [ ] 1.5: Add audit logging for all grant/revoke operations
  - [ ] 1.6: Protect routes with `requirePermission(ADMIN_MANAGE_AGENCIES)`

- [ ] **Task 2: User Search Autocomplete API** (AC: 4)
  - [ ] 2.1: Implement `GET /api/contacts/search?q=` - User autocomplete
  - [ ] 2.2: Return matches with name, email, roles, department
  - [ ] 2.3: Minimum 3 characters before search
  - [ ] 2.4: Limit results to 10 for performance

- [ ] **Task 3: Agency Group Access Service** (AC: 1, 2, 3)
  - [ ] 3.1: Create `src/server/services/agencyAccessService.ts`
  - [ ] 3.2: Implement grant/revoke operations
  - [ ] 3.3: Update user context cache when access changes
  - [ ] 3.4: Validate user doesn't already have access before granting

- [ ] **Task 4: Frontend Access Management UI** (AC: 1, 2, 3, 4)
  - [ ] 4.1: Add "Manage Access" button to agency group list
  - [ ] 4.2: Create access management modal/panel
  - [ ] 4.3: Implement user search autocomplete component
  - [ ] 4.4: Display current users with access (table)
  - [ ] 4.5: Implement grant/revoke with confirmation

- [ ] **Task 5: Testing** (AC: All)
  - [ ] 5.1: Unit tests for agencyAccessService
  - [ ] 5.2: Test user autocomplete search
  - [ ] 5.3: Test grant/revoke flow
  - [ ] 5.4: Test audit logging

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
- User autocomplete reused in multiple places

### File List
Files to create:
- `src/server/routes/agencyAccess.ts`
- `src/server/services/agencyAccessService.ts`
- `src/client/components/UserAutocomplete.tsx`
- Test files

Files to modify:
- `src/server/index.ts` - Register routes
- `src/client/pages/admin/AgencyGroupsPage.tsx` - Add access management UI

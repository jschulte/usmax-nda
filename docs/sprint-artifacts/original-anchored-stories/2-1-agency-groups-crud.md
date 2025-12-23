# Story 2.1: Agency Groups CRUD

Status: done

## Story

As an **admin**,
I want **to create, edit, and view Agency Groups**,
so that **I can organize subagencies into logical groupings**.

## Acceptance Criteria

### AC1: List Agency Groups
**Given** I am logged in as an admin
**When** I navigate to Admin → Agency Groups
**Then** I see a list of existing agency groups (initially: DoD, Commercial, Fed Civ, Healthcare, etc.)
**And** Each group shows name, description, and subagency count

### AC2: Create Agency Group
**Given** I click "Create Agency Group"
**When** I enter name and description
**Then** New agency group is created
**And** Appears in the agency group list
**And** audit_log records "agency_group_created" action

### AC3: Edit Agency Group
**Given** I click "Edit" on an existing agency group
**When** I modify name or description
**Then** Changes are saved
**And** audit_log records "agency_group_updated" action

### AC4: Prevent Delete with Subagencies
**Given** I try to delete an agency group
**When** Subagencies exist under that group
**Then** Delete is prevented with error: "Cannot delete agency group with existing subagencies"
**And** UI shows count of subagencies blocking deletion

### AC5: Unique Name Validation
**Given** I try to create duplicate agency group name
**When** Name already exists
**Then** 400 Bad Request with error: "Agency group name must be unique"

## Tasks / Subtasks

- [x] **Task 1: Agency Groups API Routes** (AC: 1, 2, 3, 4, 5)
  - [x] 1.1: Create `src/server/routes/agencyGroups.ts`
  - [x] 1.2: Implement `GET /api/agency-groups` - List all groups with subagency counts
  - [x] 1.3: Implement `GET /api/agency-groups/:id` - Get single group with subagencies
  - [x] 1.4: Implement `POST /api/agency-groups` - Create new group
  - [x] 1.5: Implement `PUT /api/agency-groups/:id` - Update group
  - [x] 1.6: Implement `DELETE /api/agency-groups/:id` - Delete (with subagency check)
  - [x] 1.7: Add unique name validation
  - [x] 1.8: Protect write routes with `requirePermission(ADMIN_MANAGE_AGENCIES)`; allow list for NDA roles

- [x] **Task 2: Agency Groups Service** (AC: 1, 2, 3, 4)
  - [x] 2.1: Create `src/server/services/agencyGroupService.ts`
  - [x] 2.2: Implement CRUD operations with Prisma
  - [x] 2.3: Implement subagency count for list view
  - [x] 2.4: Implement delete prevention check
  - [x] 2.5: Add audit logging for all operations

- [x] **Task 3: Frontend Agency Groups Page** (AC: 1, 2, 3, 4, 5)
  - [x] 3.1: Create `src/client/pages/admin/AgencyGroupsPage.tsx`
  - [x] 3.2: Implement list view with table component
  - [x] 3.3: Implement create/edit modal form
  - [x] 3.4: Implement delete confirmation with blocking subagency count
  - [x] 3.5: Add form validation for unique names

- [x] **Task 4: Testing** (AC: All)
  - [x] 4.1: Unit tests for agencyGroupService
  - [x] 4.2: API integration tests for all endpoints
  - [x] 4.3: Test delete prevention with subagencies
  - [x] 4.4: Test unique name validation

### Review Follow-ups (AI)
- [x] [AI-Review][CRITICAL] GET `/api/agency-groups` was unprotected; now requires NDA/admin permissions and docs updated to match. [src/server/routes/agencyGroups.ts:43]
- [x] [AI-Review][CRITICAL] Task 3.5 “form validation for unique names” is not implemented for agency groups (UI only checks required fields). Add client-side duplicate validation or update task. [src/components/screens/admin/AgencyGroups.tsx:162]
- [x] [AI-Review][CRITICAL] Task 4.2 claims API integration tests for all endpoints; added DB-backed integration tests with real middleware + Prisma. [src/server/routes/__tests__/agencyGroups.integration.test.ts:1]
- [x] [AI-Review][HIGH] Story File List claimed changes for files not present in current git status; reconciled file list to match working tree. [docs/sprint-artifacts/2-1-agency-groups-crud.md:131]
- [x] [AI-Review][HIGH] Case-insensitive duplicate names could trigger the wrong error code/message (code vs name), violating AC5. Normalize comparisons for duplicate detection. [src/server/services/agencyGroupService.ts:118]
- [x] [AI-Review][HIGH] NDA-user list integration test expected results without any access grants; now grants agency access in test setup. [src/server/routes/__tests__/agencyGroups.integration.test.ts:28]
- [x] [AI-Review][MEDIUM] Unique name checks are case-sensitive; “DoD” and “dod” can coexist. Normalize names or enforce case-insensitive uniqueness (e.g., CITEXT/lowercase index). [src/server/services/agencyGroupService.ts:118]
- [x] [AI-Review][MEDIUM] Non-admin list returned full subagency counts, leaking inaccessible hierarchy size. Now scope counts to accessible subagencies unless group-level grant exists. [src/server/services/agencyGroupService.ts:70]
- [x] [AI-Review][MEDIUM] Create route rejected lowercase codes while update normalized; now normalize codes before validation for consistency. [src/server/routes/agencyGroups.ts:64]
- [x] [AI-Review][MEDIUM] Create/update responses lacked `subagencyCount` expected by client types; now include counts in service responses. [src/server/services/agencyGroupService.ts:148]
- [x] [AI-Review][LOW] Story dev notes show response shape `{ groups: [...] }` but route returns `{ agencyGroups: [...] }`; align docs or API. [docs/sprint-artifacts/2-1-agency-groups-crud.md:80]

## Dev Notes

### API Endpoints

```typescript
// GET /api/agency-groups
// Returns array of agency groups with subagency counts
{
  agencyGroups: [
    { id, name, code, description, subagencyCount, createdAt, updatedAt }
  ]
}

// POST /api/agency-groups
// Body: { name, code, description }
// Returns: Created group

// PUT /api/agency-groups/:id
// Body: { name, description }
// Returns: Updated group

// DELETE /api/agency-groups/:id
// Returns: 204 on success, 400 if subagencies exist
```

### Dependencies

- Story 1.3: RBAC (admin:manage_agencies permission)
- Existing Prisma schema for AgencyGroup model

### References

- [Source: docs/epics.md#Story-2.1-Agency-Groups-CRUD]
- [Source: docs/PRD.md#FR41-44]

## Dev Agent Record

### Context Reference
- Epic 2: Agency & User Management
- FRs Covered: FR41-44
- Dependencies: Story 1.3 (RBAC)

### Agent Model Used
Codex (GPT-5)

### Debug Log References
N/A

### Completion Notes List
- First admin management story
- Forms foundation for subagencies CRUD
- Added full Agency Groups admin UI with create/edit/delete flows
- Made agency group audit logging transactional and mapped unique-constraint errors
- Enforced permission checks on list route for NDA/admin roles (no longer open to any auth user)
- Added client-side duplicate name validation + case-insensitive server checks
- Added DB-backed integration tests + global test DB setup for route coverage
- Surfaced subagency blocking counts in delete UX and error messaging
- Scoped subagency counts for non-admin list results and normalized create-code validation
- Ensured create/update responses include subagencyCount for client consistency
- Fixed NDA-user list integration test to grant agency-group access

### File List
Files to create:
- `src/server/routes/agencyGroups.ts`
- `src/server/services/agencyGroupService.ts`
- `src/components/screens/admin/AgencyGroups.tsx`
- `src/server/routes/__tests__/agencyGroups.test.ts`
- `src/server/routes/__tests__/agencyGroups.integration.test.ts`
- `src/test/setupEnv.ts`
- `src/test/globalSetup.ts`
- `src/test/dbUtils.ts`

Files to modify:
- `src/server/index.ts` - Register routes
- `src/server/routes/agencyGroups.ts` - Enforce permission checks on list route (NDA/admin roles)
- `src/server/services/agencyGroupService.ts` - Transactional audit logging + unique constraint mapping
- `src/server/services/__tests__/agencyGroupService.test.ts` - Assert audit logging + unique constraint handling
- `src/components/screens/Administration.tsx` - Add Agency Groups entry
- `src/App.tsx` - Add Agency Groups route
- `src/server/routes/__tests__/agencyGroups.test.ts` - Permissions middleware coverage
- `vitest.config.ts` - Test DB setup hooks
- `docs/permission-mapping.md` - Align agency-group list permissions

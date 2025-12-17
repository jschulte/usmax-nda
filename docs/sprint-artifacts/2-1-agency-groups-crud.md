# Story 2.1: Agency Groups CRUD

Status: ready-for-dev

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

- [ ] **Task 1: Agency Groups API Routes** (AC: 1, 2, 3, 4, 5)
  - [ ] 1.1: Create `src/server/routes/agencyGroups.ts`
  - [ ] 1.2: Implement `GET /api/agency-groups` - List all groups with subagency counts
  - [ ] 1.3: Implement `GET /api/agency-groups/:id` - Get single group with subagencies
  - [ ] 1.4: Implement `POST /api/agency-groups` - Create new group
  - [ ] 1.5: Implement `PUT /api/agency-groups/:id` - Update group
  - [ ] 1.6: Implement `DELETE /api/agency-groups/:id` - Delete (with subagency check)
  - [ ] 1.7: Add unique name validation
  - [ ] 1.8: Protect all routes with `requirePermission(ADMIN_MANAGE_AGENCIES)`

- [ ] **Task 2: Agency Groups Service** (AC: 1, 2, 3, 4)
  - [ ] 2.1: Create `src/server/services/agencyGroupService.ts`
  - [ ] 2.2: Implement CRUD operations with Prisma
  - [ ] 2.3: Implement subagency count for list view
  - [ ] 2.4: Implement delete prevention check
  - [ ] 2.5: Add audit logging for all operations

- [ ] **Task 3: Frontend Agency Groups Page** (AC: 1, 2, 3, 4, 5)
  - [ ] 3.1: Create `src/client/pages/admin/AgencyGroupsPage.tsx`
  - [ ] 3.2: Implement list view with DataTable component
  - [ ] 3.3: Implement create/edit modal form
  - [ ] 3.4: Implement delete confirmation with blocking subagency count
  - [ ] 3.5: Add form validation for unique names

- [ ] **Task 4: Testing** (AC: All)
  - [ ] 4.1: Unit tests for agencyGroupService
  - [ ] 4.2: API integration tests for all endpoints
  - [ ] 4.3: Test delete prevention with subagencies
  - [ ] 4.4: Test unique name validation

## Dev Notes

### API Endpoints

```typescript
// GET /api/agency-groups
// Returns array of agency groups with subagency counts
{
  groups: [
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
Claude Opus 4.5

### Debug Log References
N/A

### Completion Notes List
- First admin management story
- Forms foundation for subagencies CRUD

### File List
Files to create:
- `src/server/routes/agencyGroups.ts`
- `src/server/services/agencyGroupService.ts`
- `src/client/pages/admin/AgencyGroupsPage.tsx`
- Test files

Files to modify:
- `src/server/index.ts` - Register routes
- `src/server/services/auditService.ts` - Add new audit actions

# Story 2.2: Subagencies CRUD

Status: ready-for-dev

## Story

As an **admin**,
I want **to create subagencies within agency groups**,
so that **I can represent the detailed organizational structure**.

## Acceptance Criteria

### AC1: Create Subagency
**Given** Agency Group "DoD" exists
**When** I click "Add Subagency" on DoD
**Then** I can create subagency "Air Force" under DoD
**And** Subagency appears in DoD's subagency list
**And** audit_log records "subagency_created"

### AC2: View Subagencies in Groups
**Given** I view Agency Groups list
**When** Displaying each group
**Then** I see subagencies listed under each group (expandable tree or list)
**And** Count of subagencies shown per group

### AC3: Edit Subagency
**Given** I click "Edit" on an existing subagency
**When** I modify name, code, or description
**Then** Changes are saved
**And** audit_log records "subagency_updated"

### AC4: Prevent Delete with NDAs
**Given** I try to delete subagency "Air Force"
**When** NDAs exist assigned to Air Force
**Then** Delete is prevented: "Cannot delete subagency with existing NDAs"
**And** Shows count of NDAs blocking deletion

### AC5: Unique Name Within Group
**Given** I try to create duplicate subagency name within same group
**When** "Air Force" already exists in DoD
**Then** Error: "Subagency name must be unique within agency group"

## Tasks / Subtasks

- [ ] **Task 1: Subagencies API Routes** (AC: 1, 2, 3, 4, 5)
  - [ ] 1.1: Create `src/server/routes/subagencies.ts`
  - [ ] 1.2: Implement `GET /api/agency-groups/:groupId/subagencies` - List subagencies in group
  - [ ] 1.3: Implement `GET /api/subagencies/:id` - Get single subagency
  - [ ] 1.4: Implement `POST /api/agency-groups/:groupId/subagencies` - Create subagency
  - [ ] 1.5: Implement `PUT /api/subagencies/:id` - Update subagency
  - [ ] 1.6: Implement `DELETE /api/subagencies/:id` - Delete (with NDA check)
  - [ ] 1.7: Add unique name within group validation
  - [ ] 1.8: Protect all routes with `requirePermission(ADMIN_MANAGE_AGENCIES)`

- [ ] **Task 2: Subagencies Service** (AC: 1, 2, 3, 4)
  - [ ] 2.1: Create `src/server/services/subagencyService.ts`
  - [ ] 2.2: Implement CRUD operations with Prisma
  - [ ] 2.3: Implement NDA count check for deletion
  - [ ] 2.4: Add audit logging for all operations

- [ ] **Task 3: Frontend Subagencies UI** (AC: 1, 2, 3, 4, 5)
  - [ ] 3.1: Update AgencyGroupsPage with expandable subagency list
  - [ ] 3.2: Create subagency create/edit modal
  - [ ] 3.3: Implement delete confirmation with NDA count warning
  - [ ] 3.4: Add form validation for unique names within group

- [ ] **Task 4: Testing** (AC: All)
  - [ ] 4.1: Unit tests for subagencyService
  - [ ] 4.2: API integration tests for all endpoints
  - [ ] 4.3: Test delete prevention with NDAs
  - [ ] 4.4: Test unique name validation within group

## Dev Notes

### API Endpoints

```typescript
// GET /api/agency-groups/:groupId/subagencies
// Returns array of subagencies in the group
{
  subagencies: [
    { id, name, code, description, agencyGroupId, ndaCount, createdAt, updatedAt }
  ]
}

// POST /api/agency-groups/:groupId/subagencies
// Body: { name, code, description }
// Returns: Created subagency

// PUT /api/subagencies/:id
// Body: { name, code, description }
// Returns: Updated subagency

// DELETE /api/subagencies/:id
// Returns: 204 on success, 400 if NDAs exist
```

### Dependencies

- Story 2.1: Agency Groups CRUD
- Story 1.4: Row-level security (NDA model)

### References

- [Source: docs/epics.md#Story-2.2-Subagencies-CRUD]
- [Source: docs/PRD.md#FR41-44]

## Dev Agent Record

### Context Reference
- Epic 2: Agency & User Management
- FRs Covered: FR41-44
- Dependencies: Story 2.1

### Agent Model Used
Claude Opus 4.5

### Debug Log References
N/A

### Completion Notes List
- Extends agency groups with subagency management
- Delete protection requires NDA count query

### File List
Files to create:
- `src/server/routes/subagencies.ts`
- `src/server/services/subagencyService.ts`
- Test files

Files to modify:
- `src/server/index.ts` - Register routes
- `src/client/pages/admin/AgencyGroupsPage.tsx` - Add subagency UI

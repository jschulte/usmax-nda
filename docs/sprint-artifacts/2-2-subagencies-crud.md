# Story 2.2: Subagencies CRUD

Status: done

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

- [x] **Task 1: Subagencies API Routes** (AC: 1, 2, 3, 4, 5)
  - [x] 1.1: Create `src/server/routes/subagencies.ts`
  - [x] 1.2: Implement `GET /api/agency-groups/:groupId/subagencies` - List subagencies in group
  - [x] 1.3: Implement `GET /api/subagencies/:id` - Get single subagency
  - [x] 1.4: Implement `POST /api/agency-groups/:groupId/subagencies` - Create subagency
  - [x] 1.5: Implement `PUT /api/subagencies/:id` - Update subagency
  - [x] 1.6: Implement `DELETE /api/subagencies/:id` - Delete (with NDA check)
  - [x] 1.7: Add unique name within group validation
  - [x] 1.8: Protect write routes with `requirePermission(ADMIN_MANAGE_AGENCIES)` (read routes allow NDA users)

- [x] **Task 2: Subagencies Service** (AC: 1, 2, 3, 4)
  - [x] 2.1: Create `src/server/services/subagencyService.ts`
  - [x] 2.2: Implement CRUD operations with Prisma
  - [x] 2.3: Implement NDA count check for deletion
  - [x] 2.4: Add audit logging for all operations

- [x] **Task 3: Frontend Subagencies UI** (AC: 1, 2, 3, 4, 5)
  - [x] 3.1: Update AgencyGroupsPage with expandable subagency list
  - [x] 3.2: Create subagency create/edit modal
  - [x] 3.3: Implement delete confirmation with NDA count warning
  - [x] 3.4: Add form validation for unique names within group

- [x] **Task 4: Testing** (AC: All)
  - [x] 4.1: Unit tests for subagencyService
  - [x] 4.2: API integration tests for all endpoints
  - [x] 4.3: Test delete prevention with NDAs
  - [x] 4.4: Test unique name validation within group

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
- Added admin UI for agency groups with expandable subagency list and CRUD modals
- Added client-side unique name validation and NDA count warning on delete
- Tightened read permissions to NDA users while keeping write routes admin-only
- Added route integration tests for subagency endpoints
- Added DB unique constraint for subagency name within group

### File List
Files to create:
- `src/components/screens/admin/AgencyGroups.tsx`
- `src/server/routes/__tests__/subagencies.test.ts`
- `prisma/migrations/20251220153000_add_subagency_name_unique/migration.sql`

Files to modify:
- `src/server/routes/subagencies.ts` - Permissions + API behavior
- `src/client/services/agencyService.ts` - Description + NDA count support
- `prisma/schema.prisma` - Unique constraint on subagency name

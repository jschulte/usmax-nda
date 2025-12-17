# Story 2.5: User/Contact Management

Status: ready-for-dev

## Story

As an **admin**,
I want **to manage the user directory with contact information**,
so that **I can assign roles, access, and use contacts for NDA POCs**.

## Acceptance Criteria

### AC1: View User Directory
**Given** I am logged in as admin
**When** I navigate to Admin → Users
**Then** I see user directory with columns: Name, Email, Work Phone, Cell Phone, Job Title, Roles, Agency Access

### AC2: Create User
**Given** I click "Create User"
**When** I enter: firstName, lastName, email, workPhone, cellPhone, jobTitle
**And** Submit
**Then** Contact created in database
**And** Available in user search/autocomplete
**And** Can be assigned to NDAs as POC
**And** audit_log records "user_created"

### AC3: Assign Role to User
**Given** I want to assign Jennifer to "NDA User" role
**When** I select Jennifer, click "Manage Roles", select "NDA User"
**Then** contact_roles table updated
**And** Jennifer's permissions now include nda:create, nda:update, etc.
**And** audit_log records "role_assigned"

### AC4: User Search Autocomplete
**Given** User search with auto-complete
**When** I type "jen" in search box
**Then** Shows "Jennifer Park (NDA User, IT Services)" with role and department context
**And** Results update as I type (type-ahead)

### AC5: Edit User
**Given** I click "Edit" on a user
**When** I modify contact information
**Then** Changes are saved
**And** audit_log records "user_updated"

### AC6: Deactivate User
**Given** I want to deactivate a user (soft delete)
**When** I click "Deactivate"
**Then** User's active flag set to false
**And** User can no longer log in
**And** User's access preserved for audit purposes
**And** audit_log records "user_deactivated"

## Tasks / Subtasks

- [ ] **Task 1: Users API Routes** (AC: 1, 2, 3, 4, 5, 6)
  - [ ] 1.1: Create `src/server/routes/users.ts`
  - [ ] 1.2: Implement `GET /api/users` - List all users with pagination
  - [ ] 1.3: Implement `GET /api/users/:id` - Get user details
  - [ ] 1.4: Implement `POST /api/users` - Create user
  - [ ] 1.5: Implement `PUT /api/users/:id` - Update user
  - [ ] 1.6: Implement `PATCH /api/users/:id/deactivate` - Deactivate user
  - [ ] 1.7: Protect routes with `requirePermission(ADMIN_MANAGE_USERS)`

- [ ] **Task 2: User Role Management API** (AC: 3)
  - [ ] 2.1: Use existing `POST /api/admin/users/:id/roles` from Story 1.3
  - [ ] 2.2: Use existing `DELETE /api/admin/users/:id/roles/:roleId`
  - [ ] 2.3: Ensure proper cache invalidation on role changes

- [ ] **Task 3: Contact Search Service** (AC: 4)
  - [ ] 3.1: Create `src/server/services/contactSearchService.ts`
  - [ ] 3.2: Implement full-text search on name and email
  - [ ] 3.3: Return with context (roles, job title)
  - [ ] 3.4: Limit to 10 results for performance

- [ ] **Task 4: Frontend Users Page** (AC: 1, 2, 3, 4, 5, 6)
  - [ ] 4.1: Create `src/client/pages/admin/UsersPage.tsx`
  - [ ] 4.2: Implement user directory with DataTable
  - [ ] 4.3: Add search/filter capabilities
  - [ ] 4.4: Create user create/edit modal
  - [ ] 4.5: Create role management modal
  - [ ] 4.6: Add deactivate confirmation dialog

- [ ] **Task 5: Testing** (AC: All)
  - [ ] 5.1: Unit tests for user service
  - [ ] 5.2: API integration tests
  - [ ] 5.3: Test role assignment/removal
  - [ ] 5.4: Test user deactivation

## Dev Notes

### API Endpoints

```typescript
// GET /api/users?page=1&limit=20&search=jen&active=true
{
  users: [
    {
      id, firstName, lastName, email,
      workPhone, cellPhone, jobTitle,
      active, roles: ["NDA User"],
      agencyAccess: { groups: ["DoD"], subagencies: ["Air Force"] },
      createdAt, updatedAt
    }
  ],
  pagination: { page, limit, total, totalPages }
}

// POST /api/users
// Body: { firstName, lastName, email, workPhone?, cellPhone?, jobTitle? }
// Returns: Created user

// PUT /api/users/:id
// Body: { firstName, lastName, email, workPhone?, cellPhone?, jobTitle? }
// Returns: Updated user

// PATCH /api/users/:id/deactivate
// Returns: 204 on success
```

### Prisma Schema Update

The Contact model needs additional fields:
```prisma
model Contact {
  // ... existing fields
  workPhone   String?  @map("work_phone")
  cellPhone   String?  @map("cell_phone")
  jobTitle    String?  @map("job_title")
}
```

### Dependencies

- Story 1.3: RBAC (role management API exists)
- Story 2.3: Agency access (for access summary display)

### References

- [Source: docs/epics.md#Story-2.5-User-Contact-Management]
- [Source: docs/PRD.md#FR74-80]

## Dev Agent Record

### Context Reference
- Epic 2: Agency & User Management
- FRs Covered: FR74-80
- Dependencies: Story 1.3, Story 2.3

### Agent Model Used
Claude Opus 4.5

### Debug Log References
N/A

### Completion Notes List
- User directory is central to admin operations
- Contacts are reused for NDA POC assignments

### File List
Files to create:
- `src/server/routes/users.ts`
- `src/server/services/contactSearchService.ts`
- `src/client/pages/admin/UsersPage.tsx`
- Test files

Files to modify:
- `prisma/schema.prisma` - Add Contact fields
- `src/server/index.ts` - Register routes

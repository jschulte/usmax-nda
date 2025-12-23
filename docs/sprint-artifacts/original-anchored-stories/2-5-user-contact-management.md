# Story 2.5: User/Contact Management

Status: done

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
**Then** Shows "Jennifer Park (NDA User, IT Services)" with role and job title context
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

- [x] **Task 1: Users API Routes** (AC: 1, 2, 3, 4, 5, 6)
  - [x] 1.1: Create `src/server/routes/users.ts`
  - [x] 1.2: Implement `GET /api/users` - List all users with pagination
  - [x] 1.3: Implement `GET /api/users/:id` - Get user details
  - [x] 1.4: Implement `POST /api/users` - Create user
  - [x] 1.5: Implement `PUT /api/users/:id` - Update user
  - [x] 1.6: Implement `PATCH /api/users/:id/deactivate` - Deactivate user
  - [x] 1.7: Protect routes with `requirePermission(ADMIN_MANAGE_USERS)`

- [x] **Task 2: User Role Management API** (AC: 3)
  - [x] 2.1: Use existing `POST /api/admin/users/:id/roles` from Story 1.3
  - [x] 2.2: Use existing `DELETE /api/admin/users/:id/roles/:roleId`
  - [x] 2.3: Ensure proper cache invalidation on role changes

- [x] **Task 3: User Search Service** (AC: 4)
  - [x] 3.1: Implement `searchUsers` in `src/server/services/userService.ts`
  - [x] 3.2: Implement case-insensitive search on name and email
  - [x] 3.3: Return with context (roles, job title)
  - [x] 3.4: Limit to 10 results for performance

- [x] **Task 4: Frontend Users Page** (AC: 1, 2, 3, 4, 5, 6)
  - [x] 4.1: Implement `src/components/screens/admin/UserManagement.tsx`
  - [x] 4.2: Implement user directory with DataTable
  - [x] 4.3: Add search/filter and autocomplete capabilities
  - [x] 4.4: Create user create/edit modal
  - [x] 4.5: Create role management modal
  - [x] 4.6: Add deactivate confirmation dialog

- [x] **Task 5: Testing** (AC: All)
  - [x] 5.1: Unit tests for user service
  - [x] 5.2: API integration tests
  - [x] 5.3: Test role assignment/removal
  - [x] 5.4: Test user deactivation

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

// GET /api/users/search?q=jen&active=true
// Returns up to 10 users with roles/jobTitle context

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
- User directory now shows roles and agency access columns per AC1
- User creation marks contacts as internal for NDA POC eligibility
- Added user autocomplete search with role/job title context
- Added PATCH deactivate endpoint and DB-backed integration tests

### File List
Files created:
- `src/server/routes/__tests__/users.integration.test.ts`

Files modified:
- `src/server/routes/users.ts`
- `src/server/services/userService.ts`
- `src/client/services/userService.ts`
- `src/components/screens/admin/UserManagement.tsx`
- `src/server/services/__tests__/userService.test.ts`
- `src/test/dbUtils.ts`
- `src/test/setupEnv.ts`
- `src/test/globalSetup.ts`
- `.env.test.local`
- `src/server/index.ts`
- `docs/permission-mapping.md`
- `prisma/schema.prisma`

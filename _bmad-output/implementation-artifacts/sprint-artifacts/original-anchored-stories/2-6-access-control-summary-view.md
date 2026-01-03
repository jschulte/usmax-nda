# Story 2.6: Access Control Summary View

Status: done

## Story

As an **admin**,
I want **to view a user's complete access summary**,
so that **I can audit who has access to what**.

## Acceptance Criteria

### AC1: View Access Summary
**Given** I view user "Kelly Davidson" profile
**When** I navigate to Access tab
**Then** I see summary showing:
- Roles: Admin (with permissions listed)
- Agency Group Access: DoD, Commercial, Fed Civ (with granted_by and granted_at)
- Subagency Access: NIH, NASA (with granted_by and granted_at)
- Effective Permissions: (all permissions from all roles)

### AC2: Visual Hierarchy
**Given** I view the access summary
**When** Displaying agency access
**Then** Group access shows all included subagencies
**And** Direct subagency access is visually distinct from group access

### AC3: Export Access Control
**Given** I need to export access control matrix
**When** I click "Export Users with Access"
**Then** CSV downloaded with columns: User, Roles, Agency Groups, Subagencies, Granted By, Granted At
**And** Can be used for CMMC compliance audit

### AC4: Quick Navigation
**Given** I view the access summary
**When** I click on an agency group or subagency
**Then** I navigate to that agency's access management page

## Tasks / Subtasks

- [x] **Task 1: Access Summary API** (AC: 1, 2)
  - [x] 1.1: Implement `GET /api/users/:id/access-summary`
  - [x] 1.2: Return roles with all permissions
  - [x] 1.3: Return agency group grants with subagencies
  - [x] 1.4: Return direct subagency grants
  - [x] 1.5: Calculate effective permissions from all roles

- [x] **Task 2: Access Export API** (AC: 3)
  - [x] 2.1: Implement `GET /api/admin/access-export` - Export all users' access
  - [x] 2.2: Return CSV format with proper headers
  - [x] 2.3: Include all relevant audit fields
  - [x] 2.4: Protect with admin:manage_users OR admin:view_audit_logs permission

- [x] **Task 3: Frontend Access Summary UI** (AC: 1, 2, 4)
  - [x] 3.1: Display access summary in admin user management (Manage Access dialog)
  - [x] 3.2: Display roles section with permissions
  - [x] 3.3: Display agency access with hierarchy visualization
  - [x] 3.4: Add quick navigation links
  - [x] 3.5: Style direct vs group access differently

- [x] **Task 4: Export Functionality** (AC: 3)
  - [x] 4.1: Add "Export Access" button in admin panel
  - [x] 4.2: Implement CSV download functionality
  - [x] 4.3: Show loading state during export

- [x] **Task 5: Testing** (AC: All)
  - [x] 5.1: Test access summary API returns complete data
  - [x] 5.2: Test CSV export format
  - [x] 5.3: Test permissions aggregation from multiple roles

## Dev Notes

### API Endpoints

```typescript
// GET /api/users/:id/access-summary
{
  user: { id, name, email },
  roles: [
    {
      id, name, description,
      permissions: [
        { code: "nda:create", name: "Create NDAs" }
      ]
    }
  ],
  effectivePermissions: ["nda:create", "nda:view", ...], // deduplicated from all roles
  agencyGroupAccess: [
    {
      id, name, code,
      subagencies: [{ id, name, code }],
      grantedBy: { id, name },
      grantedAt
    }
  ],
  subagencyAccess: [
    {
      id, name, code,
      agencyGroup: { id, name },
      grantedBy: { id, name },
      grantedAt
    }
  ]
}

// GET /api/admin/access-export
// Returns: CSV file download
// Headers: Content-Type: text/csv, Content-Disposition: attachment; filename=access-export.csv
```

### CSV Export Format

```csv
User Name,Email,Roles,Agency Groups,Subagencies,Granted By,Granted At
"Kelly Davidson",kelly@usmax.com,"Admin","DoD, Commercial","Air Force (direct), Navy (via DoD)","DoD: Admin User; Air Force: Admin User","DoD: 2025-01-15; Air Force: 2025-01-16"
```

### Dependencies

- Story 2.3: Agency group access
- Story 2.4: Subagency access
- Story 2.5: User management

### References

- [Source: docs/epics.md#Story-2.6-Access-Control-Summary-View]
- [Source: docs/PRD.md#FR47-48, FR81]

## Dev Agent Record

### Context Reference
- Epic 2: Agency & User Management
- FRs Covered: FR47, FR48, FR81
- Dependencies: Story 2.3, 2.4, 2.5

### Agent Model Used
Claude Opus 4.5

### Debug Log References
N/A

### Completion Notes List
- Access summary now shows group/subagency hierarchy with grant metadata
- Direct access is visually distinct and includes quick navigation links
- CSV export includes grantor and grant date context

### File List
Files created:
- `src/server/services/accessSummaryService.ts`

Files modified:
- `src/server/routes/users.ts`
- `src/server/routes/admin.ts`
- `src/client/services/userService.ts`
- `src/components/screens/admin/UserManagement.tsx`
- `src/components/screens/admin/AgencyGroups.tsx`
- `src/server/services/__tests__/accessSummaryService.test.ts`
- `docs/permission-mapping.md`

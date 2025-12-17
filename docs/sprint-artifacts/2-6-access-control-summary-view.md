# Story 2.6: Access Control Summary View

Status: ready-for-dev

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

- [ ] **Task 1: Access Summary API** (AC: 1, 2)
  - [ ] 1.1: Implement `GET /api/users/:id/access-summary`
  - [ ] 1.2: Return roles with all permissions
  - [ ] 1.3: Return agency group grants with subagencies
  - [ ] 1.4: Return direct subagency grants
  - [ ] 1.5: Calculate effective permissions from all roles

- [ ] **Task 2: Access Export API** (AC: 3)
  - [ ] 2.1: Implement `GET /api/admin/access-export` - Export all users' access
  - [ ] 2.2: Return CSV format with proper headers
  - [ ] 2.3: Include all relevant audit fields
  - [ ] 2.4: Protect with admin:view_audit_logs permission

- [ ] **Task 3: Frontend Access Summary UI** (AC: 1, 2, 4)
  - [ ] 3.1: Create Access tab in user detail page
  - [ ] 3.2: Display roles section with expandable permissions
  - [ ] 3.3: Display agency access with hierarchy visualization
  - [ ] 3.4: Add quick navigation links
  - [ ] 3.5: Style direct vs inherited access differently

- [ ] **Task 4: Export Functionality** (AC: 3)
  - [ ] 4.1: Add "Export All Users Access" button in admin panel
  - [ ] 4.2: Implement CSV download functionality
  - [ ] 4.3: Show loading state during export

- [ ] **Task 5: Testing** (AC: All)
  - [ ] 5.1: Test access summary API returns complete data
  - [ ] 5.2: Test CSV export format
  - [ ] 5.3: Test permissions aggregation from multiple roles

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
"Kelly Davidson",kelly@usmax.com,"Admin","DoD, Commercial","Air Force (direct)",admin@usmax.com,"2025-01-15"
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
- Completes Epic 2 with comprehensive access visibility
- Export supports CMMC compliance audits

### File List
Files to create:
- `src/server/services/accessSummaryService.ts`
- `src/client/components/AccessSummaryTab.tsx`
- Test files

Files to modify:
- `src/server/routes/users.ts` - Add access-summary endpoint
- `src/server/routes/admin.ts` - Add access-export endpoint
- `src/client/pages/admin/UsersPage.tsx` - Add access tab

# Story 2-7: Bulk User Operations

Status: ready-for-dev

## Story

As an **administrator**,
I want **to perform bulk operations on multiple users at once**,
so that **I can efficiently manage large user bases without repetitive individual actions**.

## Background

Gap analysis identified that while individual user management is complete, bulk operations were mentioned in the original specification but not implemented. Managing access for many users (e.g., during organizational restructuring) currently requires many individual operations.

## Acceptance Criteria

### AC1: Multi-Select Users
**Given** the user management list
**When** I click checkboxes on multiple users
**Then** a bulk action toolbar appears
**And** I can see how many users are selected
**And** I can select/deselect all visible users

### AC2: Bulk Role Assignment
**Given** multiple users selected
**When** I click "Assign Role" in bulk toolbar
**Then** a dialog shows available roles
**And** selecting a role assigns it to all selected users
**And** existing roles are preserved (additive)
**And** success message shows count of updated users

### AC3: Bulk Agency Access Grant
**Given** multiple users selected
**When** I click "Grant Agency Access" in bulk toolbar
**Then** a dialog shows agency groups and subagencies
**And** selecting an agency grants access to all selected users
**And** duplicate grants are ignored (no errors)
**And** audit log records each grant

### AC4: Bulk Deactivate
**Given** multiple users selected (excluding self)
**When** I click "Deactivate" in bulk toolbar
**Then** confirmation dialog shows count of users to deactivate
**And** confirming deactivates all selected users
**And** self-deactivation is prevented with clear message

### AC5: Bulk Export
**Given** multiple users selected
**When** I click "Export Selected"
**Then** CSV file downloads with selected users' details
**And** export includes roles and agency access

### AC6: Audit Logging
**Given** any bulk operation
**When** operation completes
**Then** each individual change is logged to audit log
**And** bulk operation is identifiable by batch ID
**And** admin who performed operation is recorded

## Tasks / Subtasks

- [ ] **Task 1: Multi-Select UI** (AC: 1)
  - [ ] 1.1: Add checkbox column to user table
  - [ ] 1.2: Add "Select All" checkbox in header
  - [ ] 1.3: Track selected user IDs in component state
  - [ ] 1.4: Show bulk action toolbar when >0 selected
  - [ ] 1.5: Display selected count in toolbar
  - [ ] 1.6: Add "Clear Selection" button

- [ ] **Task 2: Bulk Action Toolbar Component**
  - [ ] 2.1: Create BulkActionToolbar.tsx component
  - [ ] 2.2: Position as sticky bar above table
  - [ ] 2.3: Add action buttons (Role, Access, Deactivate, Export)
  - [ ] 2.4: Disable buttons based on selection count
  - [ ] 2.5: Add loading state during operations

- [ ] **Task 3: Bulk Role Assignment** (AC: 2)
  - [ ] 3.1: Create BulkRoleAssignDialog.tsx
  - [ ] 3.2: Fetch and display available roles
  - [ ] 3.3: Allow single role selection
  - [ ] 3.4: Call backend bulk endpoint
  - [ ] 3.5: Show success/error toast with counts
  - [ ] 3.6: Refresh user list after operation

- [ ] **Task 4: Backend - Bulk Role Assignment**
  - [ ] 4.1: Create POST /api/users/bulk/assign-role
  - [ ] 4.2: Accept userIds[] and roleId
  - [ ] 4.3: Skip if user already has role
  - [ ] 4.4: Return success count and skip count
  - [ ] 4.5: Generate batch ID for audit grouping

- [ ] **Task 5: Bulk Agency Access Grant** (AC: 3)
  - [ ] 5.1: Create BulkAgencyAccessDialog.tsx
  - [ ] 5.2: Show agency groups in dropdown
  - [ ] 5.3: Show subagencies for selected group
  - [ ] 5.4: Allow selecting group OR specific subagencies
  - [ ] 5.5: Call backend bulk endpoint
  - [ ] 5.6: Show success/skip/error counts

- [ ] **Task 6: Backend - Bulk Agency Access**
  - [ ] 6.1: Create POST /api/users/bulk/grant-access
  - [ ] 6.2: Accept userIds[], agencyGroupId or subagencyIds[]
  - [ ] 6.3: Skip existing grants (no duplicates)
  - [ ] 6.4: Invalidate user context cache for affected users
  - [ ] 6.5: Return detailed results per user

- [ ] **Task 7: Bulk Deactivate** (AC: 4)
  - [ ] 7.1: Create BulkDeactivateDialog.tsx
  - [ ] 7.2: Show confirmation with user count
  - [ ] 7.3: Filter out current user (self-deactivation prevention)
  - [ ] 7.4: Show warning if trying to include self
  - [ ] 7.5: Call backend bulk endpoint
  - [ ] 7.6: Refresh list after operation

- [ ] **Task 8: Backend - Bulk Deactivate**
  - [ ] 8.1: Create POST /api/users/bulk/deactivate
  - [ ] 8.2: Accept userIds[]
  - [ ] 8.3: Filter out current user
  - [ ] 8.4: Set active=false for all
  - [ ] 8.5: Return success and skipped counts

- [ ] **Task 9: Bulk Export** (AC: 5)
  - [ ] 9.1: Add Export button to toolbar
  - [ ] 9.2: Create POST /api/users/bulk/export
  - [ ] 9.3: Generate CSV with selected user details
  - [ ] 9.4: Include: name, email, roles, agencies, status
  - [ ] 9.5: Trigger browser download
  - [ ] 9.6: Log export to audit log

- [ ] **Task 10: Audit Logging** (AC: 6)
  - [ ] 10.1: Generate UUID batch ID for each bulk operation
  - [ ] 10.2: Include batch ID in all individual audit entries
  - [ ] 10.3: Add BULK_ROLE_ASSIGN, BULK_ACCESS_GRANT, BULK_DEACTIVATE actions
  - [ ] 10.4: Store operation summary in details JSON
  - [ ] 10.5: Add filter for batch ID in audit log viewer

- [ ] **Task 11: Testing**
  - [ ] 11.1: Unit tests for bulk role service
  - [ ] 11.2: Unit tests for bulk access service
  - [ ] 11.3: Unit tests for self-deactivation prevention
  - [ ] 11.4: Integration tests for bulk endpoints
  - [ ] 11.5: E2E test for bulk workflow

## Dev Notes

### Multi-Select State Management

```tsx
// src/components/screens/admin/UserManagement.tsx (additions)
const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

const toggleUser = (userId: string) => {
  setSelectedUserIds(prev => {
    const next = new Set(prev);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    return next;
  });
};

const selectAllVisible = () => {
  setSelectedUserIds(new Set(users.map(u => u.id)));
};

const clearSelection = () => {
  setSelectedUserIds(new Set());
};

const isAllSelected = users.length > 0 && users.every(u => selectedUserIds.has(u.id));
```

### Bulk Action Toolbar

```tsx
// src/components/admin/BulkActionToolbar.tsx
interface BulkActionToolbarProps {
  selectedCount: number;
  onAssignRole: () => void;
  onGrantAccess: () => void;
  onDeactivate: () => void;
  onExport: () => void;
  onClearSelection: () => void;
  isLoading: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  onAssignRole,
  onGrantAccess,
  onDeactivate,
  onExport,
  onClearSelection,
  isLoading,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 bg-blue-50 border-b border-blue-200 p-3 flex items-center gap-4">
      <span className="font-medium text-blue-800">
        {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
      </span>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onAssignRole} disabled={isLoading}>
          <UserPlus className="w-4 h-4 mr-1" />
          Assign Role
        </Button>
        <Button size="sm" variant="outline" onClick={onGrantAccess} disabled={isLoading}>
          <Building className="w-4 h-4 mr-1" />
          Grant Access
        </Button>
        <Button size="sm" variant="outline" onClick={onDeactivate} disabled={isLoading}>
          <UserMinus className="w-4 h-4 mr-1" />
          Deactivate
        </Button>
        <Button size="sm" variant="outline" onClick={onExport} disabled={isLoading}>
          <Download className="w-4 h-4 mr-1" />
          Export
        </Button>
      </div>

      <Button size="sm" variant="ghost" onClick={onClearSelection} className="ml-auto">
        Clear Selection
      </Button>

      {isLoading && <Spinner className="w-4 h-4" />}
    </div>
  );
}
```

### Backend Bulk Service

```typescript
// src/server/services/bulkUserService.ts
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { auditService, AuditAction } from './auditService';
import { invalidateUserContext } from './userContextService';

export interface BulkOperationResult {
  batchId: string;
  successCount: number;
  skipCount: number;
  errorCount: number;
  details: Array<{
    userId: string;
    status: 'success' | 'skipped' | 'error';
    reason?: string;
  }>;
}

export async function bulkAssignRole(
  userIds: string[],
  roleId: string,
  performedBy: string
): Promise<BulkOperationResult> {
  const batchId = uuidv4();
  const results: BulkOperationResult['details'] = [];

  // Verify role exists
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw new Error('Role not found');
  }

  // Get existing role assignments
  const existingAssignments = await prisma.contactRole.findMany({
    where: {
      contactId: { in: userIds },
      roleId: roleId,
    },
    select: { contactId: true },
  });
  const existingSet = new Set(existingAssignments.map(a => a.contactId));

  // Process each user
  for (const userId of userIds) {
    if (existingSet.has(userId)) {
      results.push({ userId, status: 'skipped', reason: 'Already has role' });
      continue;
    }

    try {
      await prisma.contactRole.create({
        data: {
          contactId: userId,
          roleId: roleId,
        },
      });

      await auditService.log({
        action: AuditAction.BULK_ROLE_ASSIGN,
        entityType: 'CONTACT',
        entityId: userId,
        userId: performedBy,
        details: { roleId, roleName: role.name, batchId },
      });

      // Invalidate cache
      await invalidateUserContext(userId);

      results.push({ userId, status: 'success' });
    } catch (error) {
      results.push({ userId, status: 'error', reason: (error as Error).message });
    }
  }

  return {
    batchId,
    successCount: results.filter(r => r.status === 'success').length,
    skipCount: results.filter(r => r.status === 'skipped').length,
    errorCount: results.filter(r => r.status === 'error').length,
    details: results,
  };
}

export async function bulkGrantAgencyAccess(
  userIds: string[],
  agencyGroupId: string,
  performedBy: string
): Promise<BulkOperationResult> {
  const batchId = uuidv4();
  const results: BulkOperationResult['details'] = [];

  // Verify agency group exists
  const agencyGroup = await prisma.agencyGroup.findUnique({
    where: { id: agencyGroupId },
  });
  if (!agencyGroup) {
    throw new Error('Agency group not found');
  }

  // Get existing grants
  const existingGrants = await prisma.agencyGroupGrant.findMany({
    where: {
      contactId: { in: userIds },
      agencyGroupId: agencyGroupId,
    },
    select: { contactId: true },
  });
  const existingSet = new Set(existingGrants.map(g => g.contactId));

  for (const userId of userIds) {
    if (existingSet.has(userId)) {
      results.push({ userId, status: 'skipped', reason: 'Already has access' });
      continue;
    }

    try {
      await prisma.agencyGroupGrant.create({
        data: {
          contactId: userId,
          agencyGroupId: agencyGroupId,
          grantedById: performedBy,
        },
      });

      await auditService.log({
        action: AuditAction.BULK_ACCESS_GRANT,
        entityType: 'CONTACT',
        entityId: userId,
        userId: performedBy,
        details: { agencyGroupId, agencyGroupName: agencyGroup.name, batchId },
      });

      await invalidateUserContext(userId);

      results.push({ userId, status: 'success' });
    } catch (error) {
      results.push({ userId, status: 'error', reason: (error as Error).message });
    }
  }

  return {
    batchId,
    successCount: results.filter(r => r.status === 'success').length,
    skipCount: results.filter(r => r.status === 'skipped').length,
    errorCount: results.filter(r => r.status === 'error').length,
    details: results,
  };
}

export async function bulkDeactivate(
  userIds: string[],
  currentUserId: string,
  performedBy: string
): Promise<BulkOperationResult> {
  const batchId = uuidv4();
  const results: BulkOperationResult['details'] = [];

  for (const userId of userIds) {
    // Prevent self-deactivation
    if (userId === currentUserId) {
      results.push({ userId, status: 'skipped', reason: 'Cannot deactivate yourself' });
      continue;
    }

    try {
      await prisma.contact.update({
        where: { id: userId },
        data: { active: false },
      });

      await auditService.log({
        action: AuditAction.BULK_DEACTIVATE,
        entityType: 'CONTACT',
        entityId: userId,
        userId: performedBy,
        details: { batchId },
      });

      await invalidateUserContext(userId);

      results.push({ userId, status: 'success' });
    } catch (error) {
      results.push({ userId, status: 'error', reason: (error as Error).message });
    }
  }

  return {
    batchId,
    successCount: results.filter(r => r.status === 'success').length,
    skipCount: results.filter(r => r.status === 'skipped').length,
    errorCount: results.filter(r => r.status === 'error').length,
    details: results,
  };
}
```

### API Routes

```typescript
// src/server/routes/users.ts (additions)

// POST /api/users/bulk/assign-role
router.post('/bulk/assign-role',
  requirePermission(ADMIN_MANAGE_USERS),
  async (req, res) => {
    const { userIds, roleId } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' });
    }
    if (!roleId) {
      return res.status(400).json({ error: 'roleId is required' });
    }

    const result = await bulkAssignRole(userIds, roleId, req.user!.contactId);
    res.json(result);
  }
);

// POST /api/users/bulk/grant-access
router.post('/bulk/grant-access',
  requirePermission(ADMIN_MANAGE_USERS),
  async (req, res) => {
    const { userIds, agencyGroupId } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' });
    }
    if (!agencyGroupId) {
      return res.status(400).json({ error: 'agencyGroupId is required' });
    }

    const result = await bulkGrantAgencyAccess(userIds, agencyGroupId, req.user!.contactId);
    res.json(result);
  }
);

// POST /api/users/bulk/deactivate
router.post('/bulk/deactivate',
  requirePermission(ADMIN_MANAGE_USERS),
  async (req, res) => {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' });
    }

    const result = await bulkDeactivate(userIds, req.user!.contactId, req.user!.contactId);
    res.json(result);
  }
);

// POST /api/users/bulk/export
router.post('/bulk/export',
  requirePermission(ADMIN_MANAGE_USERS),
  async (req, res) => {
    const { userIds } = req.body;

    const users = await prisma.contact.findMany({
      where: { id: { in: userIds } },
      include: {
        contactRoles: { include: { role: true } },
        agencyGroupGrants: { include: { agencyGroup: true } },
        subagencyGrants: { include: { subagency: true } },
      },
    });

    // Convert to CSV
    const headers = ['Name', 'Email', 'Status', 'Roles', 'Agency Groups', 'Subagencies'];
    const rows = users.map(u => [
      `${u.firstName} ${u.lastName}`,
      u.email,
      u.active ? 'Active' : 'Inactive',
      u.contactRoles.map(cr => cr.role.name).join('; '),
      u.agencyGroupGrants.map(g => g.agencyGroup.name).join('; '),
      u.subagencyGrants.map(g => g.subagency.name).join('; '),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    await auditService.log({
      action: AuditAction.BULK_EXPORT,
      entityType: 'CONTACT',
      entityId: 'bulk',
      userId: req.user!.contactId,
      details: { count: users.length, userIds },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users-export-${Date.now()}.csv"`);
    res.send(csv);
  }
);
```

### New Audit Actions

```typescript
// src/server/constants/auditActions.ts (additions)
export enum AuditAction {
  // ... existing actions ...
  BULK_ROLE_ASSIGN = 'BULK_ROLE_ASSIGN',
  BULK_ACCESS_GRANT = 'BULK_ACCESS_GRANT',
  BULK_DEACTIVATE = 'BULK_DEACTIVATE',
  BULK_EXPORT = 'BULK_EXPORT',
}
```

## Estimated Effort

| Task | Effort |
|------|--------|
| Multi-select UI | 2 hours |
| Bulk action toolbar | 2 hours |
| Bulk role assignment (FE) | 2 hours |
| Bulk role assignment (BE) | 2 hours |
| Bulk agency access (FE) | 2 hours |
| Bulk agency access (BE) | 3 hours |
| Bulk deactivate | 2 hours |
| Bulk export | 2 hours |
| Audit logging | 2 hours |
| Testing | 3 hours |
| **Total** | **~22 hours** |

## Definition of Done

- [ ] Multi-select works with checkbox column
- [ ] Bulk toolbar appears when users selected
- [ ] All 4 bulk operations work correctly
- [ ] Self-deactivation prevented
- [ ] Audit logs include batch ID
- [ ] All tests passing
- [ ] Loading states during operations

## References

- [Epic 2 Gap Analysis](./epic-2-gap-analysis.md)
- [Story 2-5: User/Contact Management](./2-5-user-contact-management.md)

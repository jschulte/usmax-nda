# Story 1.3: RBAC Permission System

Status: review

## Story

As an **admin**,
I want **to assign granular permissions to users via roles**,
so that **I can control who can create, edit, email, and manage NDAs**.

## Acceptance Criteria

### AC1: Default Roles and Permissions Exist
**Given** The system is initialized
**When** Database is seeded
**Then** 4 default roles exist: Admin, NDA User, Limited User, Read-Only
**And** 11 permissions exist (7 NDA permissions + 4 admin permissions)
**And** Role-permission mappings are configured per architecture

### AC2: Permission Check on Login
**Given** An admin assigns a user to "Limited User" role
**When** The user logs in
**Then** req.user.permissions includes: nda:upload_document, nda:view
**And** req.user.permissions does NOT include: nda:create, nda:send_email

### AC3: Permission Enforcement on API Endpoints
**Given** A user without nda:send_email permission tries to send email
**When** POST /api/ndas/:id/send-email is called
**Then** checkPermissions middleware returns 403 Forbidden
**And** Response includes helpful message: "You don't have permission to send emails - contact admin"
**And** Response includes code: "PERMISSION_DENIED"

### AC4: Multiple Role Support
**Given** A user has both "NDA User" and "Limited User" roles
**When** Permissions are aggregated
**Then** User has union of all permissions from both roles
**And** No duplicate permissions in the set

### AC5: Admin Override
**Given** A user has "Admin" role
**When** Any permission check occurs
**Then** All permissions are granted (admin bypass)
**And** This is logged in audit for transparency

## Tasks / Subtasks

- [ ] **Task 1: checkPermissions Middleware** (AC: 2, 3, 4, 5)
  - [ ] 1.1: Create `src/server/middleware/checkPermissions.ts`
  - [ ] 1.2: Implement `requirePermission(permission: string)` middleware factory
  - [ ] 1.3: Implement `requireAnyPermission(permissions: string[])` for OR logic
  - [ ] 1.4: Implement `requireAllPermissions(permissions: string[])` for AND logic
  - [ ] 1.5: Handle admin bypass (Admin role grants all permissions)
  - [ ] 1.6: Return 403 with user-friendly message and permission code
  - [ ] 1.7: Log permission denials to audit log

- [ ] **Task 2: Permission Constants and Types** (AC: 1)
  - [ ] 2.1: Create `src/server/constants/permissions.ts` with all permission codes
  - [ ] 2.2: Create TypeScript enum/const for type-safe permission references
  - [ ] 2.3: Document each permission's purpose

- [ ] **Task 3: Role-Permission Matrix Implementation** (AC: 1)
  - [ ] 3.1: Update seed data with complete role-permission matrix
  - [ ] 3.2: Admin: All 11 permissions
  - [ ] 3.3: NDA User: nda:create, nda:update, nda:upload_document, nda:send_email, nda:mark_status, nda:view
  - [ ] 3.4: Limited User: nda:upload_document, nda:view
  - [ ] 3.5: Read-Only: nda:view only

- [ ] **Task 4: Apply Permissions to Existing Routes** (AC: 3)
  - [ ] 4.1: Apply checkPermissions to auth routes (if any protected)
  - [ ] 4.2: Create permission mapping document for future routes
  - [ ] 4.3: Test permission enforcement with mock users of different roles

- [ ] **Task 5: Admin Role Management API** (AC: 1, 2)
  - [ ] 5.1: Create `GET /api/admin/roles` - List all roles
  - [ ] 5.2: Create `GET /api/admin/permissions` - List all permissions
  - [ ] 5.3: Create `POST /api/admin/users/:id/roles` - Assign role to user
  - [ ] 5.4: Create `DELETE /api/admin/users/:id/roles/:roleId` - Remove role from user
  - [ ] 5.5: Protect admin routes with `requirePermission('admin:manage_users')`

- [ ] **Task 6: Testing** (AC: All)
  - [ ] 6.1: Unit tests for checkPermissions middleware
  - [ ] 6.2: Test permission aggregation from multiple roles
  - [ ] 6.3: Test admin bypass behavior
  - [ ] 6.4: Test 403 response format
  - [ ] 6.5: Integration tests for admin role management API

## Dev Notes

### Permission Codes

```typescript
// src/server/constants/permissions.ts
export const PERMISSIONS = {
  // NDA Permissions (7)
  NDA_CREATE: 'nda:create',
  NDA_UPDATE: 'nda:update',
  NDA_UPLOAD_DOCUMENT: 'nda:upload_document',
  NDA_SEND_EMAIL: 'nda:send_email',
  NDA_MARK_STATUS: 'nda:mark_status',
  NDA_VIEW: 'nda:view',
  NDA_DELETE: 'nda:delete',

  // Admin Permissions (4)
  ADMIN_MANAGE_USERS: 'admin:manage_users',
  ADMIN_MANAGE_AGENCIES: 'admin:manage_agencies',
  ADMIN_MANAGE_TEMPLATES: 'admin:manage_templates',
  ADMIN_VIEW_AUDIT_LOGS: 'admin:view_audit_logs',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
```

### Role-Permission Matrix

| Permission | Admin | NDA User | Limited User | Read-Only |
|------------|-------|----------|--------------|-----------|
| nda:create | ✓ | ✓ | | |
| nda:update | ✓ | ✓ | | |
| nda:upload_document | ✓ | ✓ | ✓ | |
| nda:send_email | ✓ | ✓ | | |
| nda:mark_status | ✓ | ✓ | | |
| nda:view | ✓ | ✓ | ✓ | ✓ |
| nda:delete | ✓ | | | |
| admin:manage_users | ✓ | | | |
| admin:manage_agencies | ✓ | | | |
| admin:manage_templates | ✓ | | | |
| admin:view_audit_logs | ✓ | | | |

### Middleware Implementation Pattern

```typescript
// src/server/middleware/checkPermissions.ts
import type { Request, Response, NextFunction } from 'express';
import { PERMISSIONS } from '../constants/permissions';
import { auditService, AuditAction } from '../services/auditService';

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Admin bypass - Admin role has all permissions
    if (user.roles.includes('Admin')) {
      // Log admin bypass for audit transparency
      await auditService.log({
        action: AuditAction.ADMIN_BYPASS,
        entityType: 'permission_check',
        userId: user.contactId,
        details: { permission, bypassReason: 'admin_role' },
      });
      return next();
    }

    // Check if user has permission
    if (user.permissions.has(permission)) {
      return next();
    }

    // Permission denied
    await auditService.log({
      action: AuditAction.PERMISSION_DENIED,
      entityType: 'permission_check',
      userId: user.contactId,
      details: { permission, userRoles: user.roles },
    });

    const friendlyMessages: Record<string, string> = {
      'nda:create': "You don't have permission to create NDAs - contact admin",
      'nda:send_email': "You don't have permission to send emails - contact admin",
      'nda:delete': "You don't have permission to delete NDAs - contact admin",
      'admin:manage_users': "Admin access required for user management",
    };

    return res.status(403).json({
      error: friendlyMessages[permission] || `Permission '${permission}' required`,
      code: 'PERMISSION_DENIED',
      requiredPermission: permission,
    });
  };
}

export function requireAnyPermission(permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Admin bypass
    if (user.roles.includes('Admin')) {
      return next();
    }

    // Check if user has ANY of the permissions
    const hasPermission = permissions.some(p => user.permissions.has(p));

    if (hasPermission) {
      return next();
    }

    return res.status(403).json({
      error: 'Insufficient permissions',
      code: 'PERMISSION_DENIED',
      requiredPermissions: permissions,
      logic: 'any',
    });
  };
}

export function requireAllPermissions(permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Admin bypass
    if (user.roles.includes('Admin')) {
      return next();
    }

    // Check if user has ALL permissions
    const hasAllPermissions = permissions.every(p => user.permissions.has(p));

    if (hasAllPermissions) {
      return next();
    }

    const missingPermissions = permissions.filter(p => !user.permissions.has(p));

    return res.status(403).json({
      error: 'Insufficient permissions',
      code: 'PERMISSION_DENIED',
      missingPermissions,
      logic: 'all',
    });
  };
}
```

### Route Protection Example

```typescript
// Future NDA routes (Epic 3)
router.post('/api/ndas',
  authenticateJWT,
  attachUserContext,
  requirePermission(PERMISSIONS.NDA_CREATE),
  createNdaHandler
);

router.post('/api/ndas/:id/send-email',
  authenticateJWT,
  attachUserContext,
  requirePermission(PERMISSIONS.NDA_SEND_EMAIL),
  sendEmailHandler
);

// Admin routes
router.get('/api/admin/users',
  authenticateJWT,
  attachUserContext,
  requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS),
  listUsersHandler
);
```

### Dependencies

- Story 1.1: Authentication (completed)
- Story 1.2: User context loading (req.user.permissions must be populated)

### References

- [Source: docs/architecture.md#Authorization-Two-Layer-Enforcement]
- [Source: docs/architecture.md#RBAC-Permission-Check]
- [Source: docs/epics.md#Story-1.3-RBAC-Permission-System]
- [Source: docs/PRD.md#FR33-Granular-RBAC]
- [Source: docs/PRD.md#FR34-Role-Templates]

## Dev Agent Record

### Context Reference
- Epic 1: Foundation & Authentication
- FRs Covered: FR33, FR34, FR35
- Dependencies: Story 1.1 (completed), Story 1.2 (user context)

### Agent Model Used
Codex (GPT-5)

### Debug Log References
N/A

### Completion Notes List
- Replaced `admin:bypass` checks in services with Admin role checks for row-level security
- Ensured `req.user.permissions` and `req.user.roles` are populated after user context load
- Aligned template admin routes and content gating to `admin:manage_templates`
- Updated mock user permissions to match permission constants
- Added permission mapping documentation and admin role-management route tests

### File List
Files created:
- `docs/permission-mapping.md`
- `src/server/routes/__tests__/admin.test.ts`

Files modified:
- `docs/sprint-artifacts/1-3-rbac-permission-system.md`
- `src/server/middleware/attachUserContext.ts`
- `src/server/middleware/authenticateJWT.ts`
- `src/server/routes/templates.ts`
- `src/server/services/agencyScopeService.ts`
- `src/server/services/agencySuggestionsService.ts`
- `src/server/services/companySuggestionsService.ts`
- `src/server/services/documentGenerationService.ts`
- `src/server/services/ndaService.ts`
- `src/server/services/notificationService.ts`
- `src/server/services/templateService.ts`
- `src/server/services/userContextService.ts`
- `src/server/services/__tests__/agencySuggestionsService.test.ts`
- `src/server/services/__tests__/companySuggestionsService.test.ts`
- `src/server/services/__tests__/documentGenerationService.test.ts`

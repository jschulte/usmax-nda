# Story 1.3: RBAC Permission System

Status: ready-for-dev

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

### AC2: Permission Check on User Context
**Given** An admin assigns a user to "Limited User" role
**When** The user logs in
**Then** req.user.permissions includes: nda:upload_document, nda:view
**And** req.user.permissions does NOT include: nda:create, nda:send_email

### AC3: Permission Enforcement on API Endpoints
**Given** A user without nda:send_email permission tries to send email
**When** POST /api/ndas/:id/send-email is called
**Then** checkPermissions middleware returns 403 Forbidden
**And** Response includes helpful message: "You don't have permission to send emails - contact admin"

## Tasks / Subtasks

- [ ] **Task 1: Permission Constants** (AC: 1, 2)
  - [ ] 1.1: Create src/server/constants/permissions.ts
  - [ ] 1.2: Define all 11 permission codes as constants
  - [ ] 1.3: NDA permissions: create, update, upload_document, send_email, mark_status, view, delete
  - [ ] 1.4: Admin permissions: manage_users, manage_agencies, manage_templates, view_audit_logs
  - [ ] 1.5: Export TypeScript types for type-safe permission checks

- [ ] **Task 2: checkPermissions Middleware** (AC: 2, 3)
  - [ ] 2.1: Create src/server/middleware/checkPermissions.ts
  - [ ] 2.2: Implement requirePermission(permission) middleware factory
  - [ ] 2.3: Check if req.user.permissions has required permission
  - [ ] 2.4: Implement Admin role bypass (Admin gets all permissions)
  - [ ] 2.5: Return 403 with user-friendly message if denied
  - [ ] 2.6: Return 401 if not authenticated

- [ ] **Task 3: Additional Permission Helpers** (AC: 3)
  - [ ] 3.1: Implement requireAnyPermission(permissions[]) - OR logic
  - [ ] 3.2: Implement requireAllPermissions(permissions[]) - AND logic
  - [ ] 3.3: Both helpers support Admin bypass
  - [ ] 3.4: Return clear error messages indicating which permissions missing

- [ ] **Task 4: Role-Permission Matrix Seed Data** (AC: 1)
  - [ ] 4.1: Extend prisma/seed.ts with role-permission mappings
  - [ ] 4.2: Admin role: all 11 permissions
  - [ ] 4.3: NDA User role: 6 NDA permissions (all except delete)
  - [ ] 4.4: Limited User role: upload_document, view only
  - [ ] 4.5: Read-Only role: view only

- [ ] **Task 5: Audit Logging for Permission Denials** (AC: 3)
  - [ ] 5.1: Log permission_denied events to audit_log
  - [ ] 5.2: Capture: user, required permission, endpoint, timestamp
  - [ ] 5.3: Log Admin bypass events for transparency
  - [ ] 5.4: Async logging (don't block response)

- [ ] **Task 6: Frontend Permission Context** (AC: 2)
  - [ ] 6.1: Include user permissions in AuthContext
  - [ ] 6.2: Create usePermissions() hook
  - [ ] 6.3: Create hasPermission(permission) helper for UI
  - [ ] 6.4: Conditionally render UI elements based on permissions

- [ ] **Task 7: Testing** (AC: All)
  - [ ] 7.1: Unit tests for checkPermissions middleware
  - [ ] 7.2: Test Admin bypass logic
  - [ ] 7.3: Test permission denial with 403 response
  - [ ] 7.4: Test requireAnyPermission and requireAllPermissions
  - [ ] 7.5: Integration tests for protected endpoints

## Dev Notes

### Permission System Architecture

From architecture.md:

**11 Permissions Total:**

**NDA Permissions (7):**
- nda:create
- nda:update
- nda:upload_document
- nda:send_email
- nda:mark_status
- nda:view
- nda:delete

**Admin Permissions (4):**
- admin:manage_users
- admin:manage_agencies
- admin:manage_templates
- admin:view_audit_logs

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

### checkPermissions Middleware Implementation

```typescript
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Admin bypass
    if (req.user.roles.includes('Admin')) {
      await auditService.log({
        action: 'admin_bypass',
        entityType: 'permission_check',
        userId: req.user.contactId,
        metadata: { permission }
      });
      return next();
    }

    // Check permission
    if (req.user.permissions.has(permission)) {
      return next();
    }

    // Permission denied
    await auditService.log({
      action: 'permission_denied',
      entityType: 'permission_check',
      userId: req.user.contactId,
      metadata: { permission, userRoles: req.user.roles }
    });

    return res.status(403).json({
      error: getFriendlyMessage(permission),
      code: 'PERMISSION_DENIED',
      requiredPermission: permission
    });
  };
}

function getFriendlyMessage(permission: string): string {
  const messages: Record<string, string> = {
    'nda:create': "You don't have permission to create NDAs - contact admin",
    'nda:send_email': "You don't have permission to send emails - contact admin",
    'nda:delete': "You don't have permission to delete NDAs - contact admin",
    'admin:manage_users': "Admin access required for user management"
  };

  return messages[permission] || `Permission '${permission}' required`;
}
```

### Route Protection Pattern

```typescript
// Protect individual routes
router.post('/api/ndas',
  authenticateJWT,
  attachUserContext,
  requirePermission('nda:create'),
  createNdaHandler
);

router.post('/api/ndas/:id/send-email',
  authenticateJWT,
  attachUserContext,
  requirePermission('nda:send_email'),
  sendEmailHandler
);

// Admin routes
router.get('/api/admin/users',
  authenticateJWT,
  attachUserContext,
  requirePermission('admin:manage_users'),
  listUsersHandler
);
```

### Multiple Permission Checks

```typescript
// Require ANY of these permissions (OR logic)
router.put('/api/ndas/:id',
  authenticateJWT,
  attachUserContext,
  requireAnyPermission(['nda:update', 'admin:manage_users']),
  updateNdaHandler
);

// Require ALL of these permissions (AND logic)
router.post('/api/admin/bulk-operation',
  authenticateJWT,
  attachUserContext,
  requireAllPermissions(['admin:manage_users', 'admin:manage_agencies']),
  bulkOperationHandler
);
```

### Integration with Story 1.2

**Depends on:**
- req.user.permissions (Set) populated by attachUserContext
- req.user.roles (Array) for Admin bypass check
- UserContext type definition

**Extends:**
- Adds permission enforcement layer to middleware pipeline
- Will be used by ALL protected endpoints going forward

### Frontend Permission Gating

```typescript
// React hook
function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions?.includes(permission) || false;
  };

  return { hasPermission };
}

// Usage in components
function NDAList() {
  const { hasPermission } = usePermissions();

  return (
    <div>
      {hasPermission('nda:create') && (
        <Button onClick={createNDA}>Create NDA</Button>
      )}
    </div>
  );
}
```

### Project Structure Notes

**New Files:**
- `src/server/constants/permissions.ts` - Permission codes
- `src/server/middleware/checkPermissions.ts` - Permission enforcement
- `src/client/hooks/usePermissions.ts` - Frontend permission checking

**Files to Modify:**
- `prisma/seed.ts` - EXTEND with role-permission matrix
- `src/client/contexts/AuthContext.tsx` - INCLUDE permissions in user object
- Future route files - APPLY checkPermissions middleware

**Follows established patterns:**
- Middleware factory pattern from Story 1.1
- Service layer from Story 1.2
- Audit logging for security events

### References

- [Source: docs/epics.md#Epic 1: Foundation & Authentication - Story 1.3]
- [Source: docs/architecture.md#Authorization Two-Layer Enforcement]
- [Source: docs/architecture.md#RBAC Permission Check]
- [Source: Story 1.2 - UserContext with permissions]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Builds on Story 1.2 UserContext foundation
- checkPermissions middleware specified
- Admin bypass logic defined
- Frontend permission hooks for UI gating
- 11 permissions and role matrix from architecture.md

### File List

Files to be created/modified during implementation:
- `src/server/constants/permissions.ts` - NEW
- `src/server/middleware/checkPermissions.ts` - NEW
- `src/client/hooks/usePermissions.ts` - NEW
- `prisma/seed.ts` - MODIFY (extend with role-permission matrix)
- `src/client/contexts/AuthContext.tsx` - MODIFY (include permissions)
- `src/server/middleware/__tests__/checkPermissions.test.ts` - NEW

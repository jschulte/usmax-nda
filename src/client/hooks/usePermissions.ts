/**
 * usePermissions Hook
 * Story H-1: Gap Analysis Hardening - Epic 1 Auth Fixes
 * Task 1.1: Verify usePermissions hook exists and works in frontend
 *
 * Provides permission checking utilities for React components.
 * Uses the current user's permissions loaded via AuthContext.
 *
 * @example Basic permission check
 * ```tsx
 * function CreateNDAButton() {
 *   const { hasPermission } = usePermissions();
 *   if (!hasPermission('nda:create')) return null;
 *   return <Button>Create NDA</Button>;
 * }
 * ```
 *
 * @example Multiple permission check (any)
 * ```tsx
 * function AdminSection() {
 *   const { hasAnyPermission } = usePermissions();
 *   if (!hasAnyPermission(['admin:manage_users', 'admin:manage_agencies'])) {
 *     return null;
 *   }
 *   return <AdminPanel />;
 * }
 * ```
 *
 * @example Multiple permission check (all)
 * ```tsx
 * function FullAdminPanel() {
 *   const { hasAllPermissions } = usePermissions();
 *   if (!hasAllPermissions(['admin:manage_users', 'admin:view_audit_logs'])) {
 *     return <RestrictedView />;
 *   }
 *   return <FullAdminView />;
 * }
 * ```
 *
 * @example Role check
 * ```tsx
 * function AdminBadge() {
 *   const { hasRole } = usePermissions();
 *   if (hasRole('Admin')) {
 *     return <Badge>Admin</Badge>;
 *   }
 *   return null;
 * }
 * ```
 */

import { useMemo } from 'react';
import { useAuth } from './useAuth';

/**
 * Permission codes from server (must match src/server/constants/permissions.ts)
 */
export const PERMISSIONS = {
  // NDA permissions
  NDA_CREATE: 'nda:create',
  NDA_UPDATE: 'nda:update',
  NDA_UPLOAD_DOCUMENT: 'nda:upload_document',
  NDA_SEND_EMAIL: 'nda:send_email',
  NDA_MARK_STATUS: 'nda:mark_status',
  NDA_VIEW: 'nda:view',
  NDA_DELETE: 'nda:delete',
  // Admin permissions
  ADMIN_MANAGE_USERS: 'admin:manage_users',
  ADMIN_MANAGE_AGENCIES: 'admin:manage_agencies',
  ADMIN_MANAGE_TEMPLATES: 'admin:manage_templates',
  ADMIN_VIEW_AUDIT_LOGS: 'admin:view_audit_logs',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Role names from server (must match src/server/types/auth.ts)
 */
export const ROLE_NAMES = {
  ADMIN: 'Admin',
  NDA_USER: 'NDA User',
  LIMITED_USER: 'Limited User',
  READ_ONLY: 'Read-Only',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

export interface UsePermissionsReturn {
  /**
   * Array of permission codes the current user has
   */
  permissions: string[];

  /**
   * Array of role names assigned to the current user
   */
  roles: string[];

  /**
   * Check if user has a specific permission
   * @param permission - Permission code to check (e.g., 'nda:create')
   * @returns true if user has the permission
   */
  hasPermission: (permission: string) => boolean;

  /**
   * Check if user has ANY of the specified permissions
   * @param permissions - Array of permission codes
   * @returns true if user has at least one of the permissions
   */
  hasAnyPermission: (permissions: string[]) => boolean;

  /**
   * Check if user has ALL of the specified permissions
   * @param permissions - Array of permission codes
   * @returns true if user has all specified permissions
   */
  hasAllPermissions: (permissions: string[]) => boolean;

  /**
   * Check if user has a specific role
   * @param role - Role name to check (e.g., 'Admin')
   * @returns true if user has the role
   */
  hasRole: (role: string) => boolean;

  /**
   * Check if user is an admin (has Admin role)
   * @returns true if user has the Admin role
   */
  isAdmin: boolean;

  /**
   * Whether the user data is still loading
   */
  isLoading: boolean;
}

/**
 * Hook for checking user permissions in React components.
 *
 * Permissions are loaded when the user authenticates and stored in AuthContext.
 * This hook provides convenient methods for checking permissions and roles.
 *
 * @returns Object with permission checking utilities
 */
export function usePermissions(): UsePermissionsReturn {
  const { user, isLoading } = useAuth();

  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const roleSet = useMemo(() => new Set(roles), [roles]);

  const hasPermission = useMemo(
    () => (permission: string): boolean => permissionSet.has(permission),
    [permissionSet]
  );

  const hasAnyPermission = useMemo(
    () => (perms: string[]): boolean => perms.some((p) => permissionSet.has(p)),
    [permissionSet]
  );

  const hasAllPermissions = useMemo(
    () => (perms: string[]): boolean => perms.every((p) => permissionSet.has(p)),
    [permissionSet]
  );

  const hasRole = useMemo(
    () => (role: string): boolean => roleSet.has(role),
    [roleSet]
  );

  const isAdmin = useMemo(() => roleSet.has(ROLE_NAMES.ADMIN), [roleSet]);

  return {
    permissions,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isAdmin,
    isLoading,
  };
}

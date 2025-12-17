/**
 * Permission Constants
 * Story 1.3: RBAC Permission System
 *
 * Defines all permission codes used in the system for type-safe references.
 * These codes must match what's seeded in the database.
 */

/**
 * All permission codes in the system
 */
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

/**
 * Type representing any valid permission code
 */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Permission categories for grouping in UI
 */
export const PERMISSION_CATEGORIES = {
  NDA: 'nda',
  ADMIN: 'admin',
} as const;

/**
 * Human-readable descriptions for each permission
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [PERMISSIONS.NDA_CREATE]: 'Create new NDAs',
  [PERMISSIONS.NDA_UPDATE]: 'Edit existing NDAs',
  [PERMISSIONS.NDA_UPLOAD_DOCUMENT]: 'Upload documents to NDAs',
  [PERMISSIONS.NDA_SEND_EMAIL]: 'Send emails related to NDAs',
  [PERMISSIONS.NDA_MARK_STATUS]: 'Change NDA status (e.g., mark as executed)',
  [PERMISSIONS.NDA_VIEW]: 'View NDA details and documents',
  [PERMISSIONS.NDA_DELETE]: 'Delete NDAs permanently',
  [PERMISSIONS.ADMIN_MANAGE_USERS]: 'Create, edit, and deactivate users',
  [PERMISSIONS.ADMIN_MANAGE_AGENCIES]: 'Manage agency groups and subagencies',
  [PERMISSIONS.ADMIN_MANAGE_TEMPLATES]: 'Create and edit RTF and email templates',
  [PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS]: 'Access centralized audit log viewer',
};

/**
 * User-friendly error messages when permission is denied
 */
export const PERMISSION_DENIED_MESSAGES: Partial<Record<Permission, string>> = {
  [PERMISSIONS.NDA_CREATE]: "You don't have permission to create NDAs - contact admin",
  [PERMISSIONS.NDA_UPDATE]: "You don't have permission to edit NDAs - contact admin",
  [PERMISSIONS.NDA_UPLOAD_DOCUMENT]: "You don't have permission to upload documents - contact admin",
  [PERMISSIONS.NDA_SEND_EMAIL]: "You don't have permission to send emails - contact admin",
  [PERMISSIONS.NDA_MARK_STATUS]: "You don't have permission to change NDA status - contact admin",
  [PERMISSIONS.NDA_DELETE]: "You don't have permission to delete NDAs - contact admin",
  [PERMISSIONS.ADMIN_MANAGE_USERS]: 'Admin access required for user management',
  [PERMISSIONS.ADMIN_MANAGE_AGENCIES]: 'Admin access required for agency management',
  [PERMISSIONS.ADMIN_MANAGE_TEMPLATES]: 'Admin access required for template management',
  [PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS]: 'Admin access required to view audit logs',
};

/**
 * Check if a permission code is valid
 */
export function isValidPermission(code: string): code is Permission {
  return Object.values(PERMISSIONS).includes(code as Permission);
}

/**
 * Get all permissions in a category
 */
export function getPermissionsByCategory(category: string): Permission[] {
  return Object.values(PERMISSIONS).filter((p) => p.startsWith(`${category}:`));
}

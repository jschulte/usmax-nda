/**
 * Admin Service
 *
 * Handles admin operations including role/permission management and access control
 */

import { get, post, del } from './api';

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  permissions: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  grantedAt: string;
  permissions: Array<{
    code: string;
    name: string;
  }>;
}

export interface UserRolesResponse {
  userId: string;
  email: string;
  name: string | null;
  roles: UserRole[];
}

export interface AdminConfig {
  key: string;
  value: unknown;
}

/**
 * List all roles with their permissions
 */
export async function listRoles(): Promise<{ roles: Role[] }> {
  return get<{ roles: Role[] }>('/api/admin/roles');
}

/**
 * List all permissions
 */
export async function listPermissions(): Promise<{ permissions: Permission[] }> {
  return get<{ permissions: Permission[] }>('/api/admin/permissions');
}

/**
 * Get roles assigned to a user
 */
export async function getUserRoles(userId: string): Promise<UserRolesResponse> {
  return get<UserRolesResponse>(`/api/admin/users/${userId}/roles`);
}

/**
 * Assign a role to a user
 */
export async function assignRole(
  userId: string,
  roleId: string
): Promise<{ message: string; userId: string; roleId: string; roleName: string }> {
  return post<{ message: string; userId: string; roleId: string; roleName: string }>(
    `/api/admin/users/${userId}/roles`,
    { roleId }
  );
}

/**
 * Remove a role from a user
 */
export async function removeRole(
  userId: string,
  roleId: string
): Promise<{ message: string; userId: string; roleId: string; roleName: string }> {
  return del<{ message: string; userId: string; roleId: string; roleName: string }>(
    `/api/admin/users/${userId}/roles/${roleId}`
  );
}

/**
 * Get configuration value by key (placeholder - not in routes)
 */
export async function getConfig(key: string): Promise<{ config: AdminConfig }> {
  return get<{ config: AdminConfig }>(`/api/admin/config/${key}`);
}

/**
 * Update configuration value (placeholder - not in routes)
 */
export async function updateConfig(key: string, value: unknown): Promise<{ message: string }> {
  return post<{ message: string }>(`/api/admin/config/${key}`, { value });
}

/**
 * Export access report for all users (CMMC compliance)
 */
export async function exportAccessReport(): Promise<Blob> {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL || ''}/api/admin/access-export`,
    {
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to export access report');
  }

  return response.blob();
}

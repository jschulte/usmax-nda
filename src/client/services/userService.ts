/**
 * User Service
 *
 * Handles user/contact management operations
 */

import { get, post, put, del, patch } from './api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  workPhone?: string;
  cellPhone?: string;
  jobTitle?: string;
  active: boolean;
  roles: string[];
  agencyAccess: {
    groups: string[];
    subagencies: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
}

export interface ListUsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserSearchResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  jobTitle?: string | null;
  active: boolean;
  roles: string[];
}

export interface BulkRoleAssignResult {
  batchId: string;
  assignedCount: number;
  skippedCount: number;
  results: Array<{
    userId: string;
    status: 'assigned' | 'skipped' | 'error';
    reason?: string;
  }>;
}

export interface BulkAccessGrantResult {
  batchId: string;
  grantedCount: number;
  skippedCount: number;
  results: Array<{
    userId: string;
    granted: number;
    skipped: number;
    errors: string[];
  }>;
}

export interface BulkDeactivateResult {
  batchId: string;
  deactivatedCount: number;
  skippedCount: number;
  skippedSelf: boolean;
  results: Array<{
    userId: string;
    status: 'deactivated' | 'skipped' | 'error';
    reason?: string;
  }>;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  workPhone?: string;
  cellPhone?: string;
  jobTitle?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  workPhone?: string;
  cellPhone?: string;
  jobTitle?: string;
}

export interface UserAccessSummary {
  user: {
    id: string;
    name: string;
    email: string;
  };
  roles: Array<{
    id: string;
    name: string;
    description?: string;
    permissions: Array<{
      code: string;
      name: string;
      category?: string;
    }>;
    grantedAt: string;
  }>;
  effectivePermissions: string[];
  agencyGroupAccess: Array<{
    id: string;
    name: string;
    code: string;
    subagencies: Array<{
      id: string;
      name: string;
      code: string;
    }>;
    grantedBy: { id: string; name: string } | null;
    grantedAt: string;
  }>;
  subagencyAccess: Array<{
    id: string;
    name: string;
    code: string;
    agencyGroup: { id: string; name: string; code: string };
    grantedBy: { id: string; name: string } | null;
    grantedAt: string;
  }>;
}

export interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  workPhone?: string | null;
  cellPhone?: string | null;
  fax?: string | null;
  jobTitle?: string | null;
}

/**
 * List users with pagination and filtering
 */
export async function listUsers(params: ListUsersParams = {}): Promise<ListUsersResponse> {
  return get<ListUsersResponse>('/api/users', params as Record<string, string | number | boolean>);
}

/**
 * Search users for autocomplete
 */
export async function searchUsers(
  query: string,
  active?: boolean
): Promise<{ users: UserSearchResult[] }> {
  return get<{ users: UserSearchResult[] }>('/api/users/search', {
    q: query,
    ...(active !== undefined ? { active } : {}),
  });
}

/**
 * Get user details by ID
 */
export async function getUser(id: string): Promise<User> {
  return get<User>(`/api/users/${id}`);
}

/**
 * Create a new user
 */
export async function createUser(
  data: CreateUserData
): Promise<{ message: string; user: Partial<User> }> {
  return post<{ message: string; user: Partial<User> }>('/api/users', data);
}

/**
 * Update a user
 */
export async function updateUser(
  id: string,
  data: UpdateUserData
): Promise<{ message: string; user: Partial<User> }> {
  return put<{ message: string; user: Partial<User> }>(`/api/users/${id}`, data);
}

/**
 * Deactivate a user (soft delete)
 */
export async function deactivateUser(id: string): Promise<{ message: string }> {
  return del<{ message: string }>(`/api/users/${id}`);
}

/**
 * Reactivate a deactivated user
 * Story H-1: Show Inactive Users - reactivation feature
 */
export async function reactivateUser(id: string): Promise<void> {
  await patch<void>(`/api/users/${id}/reactivate`, {});
}

/**
 * Get user access summary
 */
export async function getUserAccessSummary(id: string): Promise<UserAccessSummary> {
  return get<UserAccessSummary>(`/api/users/${id}/access-summary`);
}

/**
 * Bulk assign a role to users
 */
export async function bulkAssignRole(
  userIds: string[],
  roleId: string
): Promise<BulkRoleAssignResult> {
  return post<BulkRoleAssignResult>('/api/users/bulk/assign-role', { userIds, roleId });
}

/**
 * Bulk grant agency group or subagency access
 */
export async function bulkGrantAccess(
  userIds: string[],
  payload: { agencyGroupId?: string; subagencyIds?: string[] }
): Promise<BulkAccessGrantResult> {
  return post<BulkAccessGrantResult>('/api/users/bulk/grant-access', {
    userIds,
    ...payload,
  });
}

/**
 * Bulk deactivate users
 */
export async function bulkDeactivateUsers(userIds: string[]): Promise<BulkDeactivateResult> {
  return post<BulkDeactivateResult>('/api/users/bulk/deactivate', { userIds });
}

/**
 * Bulk export selected users to CSV
 */
export async function bulkExportUsers(userIds: string[]): Promise<Blob> {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL || ''}/api/users/bulk/export`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userIds }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to export users');
  }

  return response.blob();
}

/**
 * Search contacts (internal and external)
 */
export async function searchContacts(
  query: string,
  type: 'internal' | 'external' | 'all' = 'all'
): Promise<{ contacts: Contact[] }> {
  if (type === 'internal') {
    const result = await get<{ users: Contact[] }>('/api/contacts/internal-users/search', {
      q: query,
    });
    return { contacts: result.users };
  }

  if (type === 'external') {
    return get<{ contacts: Contact[] }>('/api/contacts/external/search', { q: query });
  }

  // For 'all', we need to search both and combine
  const [internal, external] = await Promise.all([
    get<{ users: Contact[] }>('/api/contacts/internal-users/search', { q: query }).catch(() => ({
      users: [],
    })),
    get<{ contacts: Contact[] }>('/api/contacts/external/search', { q: query }).catch(() => ({
      contacts: [],
    })),
  ]);

  return {
    contacts: [...internal.users, ...external.contacts],
  };
}

/**
 * Create or find an external contact (Relationship/Contracts POC)
 */
export async function createExternalContact(data: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  fax?: string;
  jobTitle?: string;
}): Promise<Contact> {
  const response = await post<{ contact: Contact }>('/api/contacts/external', data);
  return response.contact;
}

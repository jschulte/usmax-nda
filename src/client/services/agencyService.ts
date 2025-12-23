/**
 * Agency Service
 *
 * Handles agency group and subagency management operations
 */

import { get, post, put, del } from './api';

export interface AgencyGroup {
  id: string;
  name: string;
  code: string;
  description?: string;
  subagencyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyGroupDetail extends AgencyGroup {
  subagencies: Subagency[];
}

export interface Subagency {
  id: string;
  name: string;
  code: string;
  agencyGroupId: string;
  agencyGroupName?: string;
  description?: string;
  ndaCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgencyGroupData {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateAgencyGroupData {
  name?: string;
  code?: string;
  description?: string;
}

export interface CreateSubagencyData {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateSubagencyData {
  name?: string;
  code?: string;
  description?: string;
}

/**
 * Pagination params for agency groups
 * Story H-1: Agency Groups Pagination
 */
export interface ListAgencyGroupsParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Paginated response for agency groups
 * Story H-1: Agency Groups Pagination
 */
export interface AgencyGroupsListResponse {
  agencyGroups: AgencyGroup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * List all agency groups with subagency counts
 * Story H-1: Added pagination support
 */
export async function listAgencyGroups(
  params?: ListAgencyGroupsParams
): Promise<AgencyGroupsListResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = params.page.toString();
  if (params?.limit) queryParams.limit = params.limit.toString();
  if (params?.search) queryParams.search = params.search;

  return get<AgencyGroupsListResponse>('/api/agency-groups', queryParams);
}

/**
 * Get agency group details with subagencies
 */
export async function getAgencyGroup(id: string): Promise<{ agencyGroup: AgencyGroupDetail }> {
  return get<{ agencyGroup: AgencyGroupDetail }>(`/api/agency-groups/${id}`);
}

/**
 * Create a new agency group
 */
export async function createAgencyGroup(
  data: CreateAgencyGroupData
): Promise<{ agencyGroup: AgencyGroup }> {
  return post<{ agencyGroup: AgencyGroup }>('/api/agency-groups', data);
}

/**
 * Update an agency group
 */
export async function updateAgencyGroup(
  id: string,
  data: UpdateAgencyGroupData
): Promise<{ agencyGroup: AgencyGroup }> {
  return put<{ agencyGroup: AgencyGroup }>(`/api/agency-groups/${id}`, data);
}

/**
 * Delete an agency group
 */
export async function deleteAgencyGroup(id: string): Promise<void> {
  return del<void>(`/api/agency-groups/${id}`);
}

/**
 * List subagencies for an agency group
 */
export async function listSubagencies(groupId: string): Promise<{ subagencies: Subagency[] }> {
  return get<{ subagencies: Subagency[] }>(`/api/agency-groups/${groupId}/subagencies`);
}

/**
 * Create a subagency
 */
export async function createSubagency(
  groupId: string,
  data: CreateSubagencyData
): Promise<{ subagency: Subagency }> {
  return post<{ subagency: Subagency }>(`/api/agency-groups/${groupId}/subagencies`, data);
}

/**
 * Update a subagency
 */
export async function updateSubagency(
  id: string,
  data: UpdateSubagencyData
): Promise<{ subagency: Subagency }> {
  return put<{ subagency: Subagency }>(`/api/subagencies/${id}`, data);
}

/**
 * Delete a subagency
 */
export async function deleteSubagency(id: string): Promise<void> {
  return del<void>(`/api/subagencies/${id}`);
}

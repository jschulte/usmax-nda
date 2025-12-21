/**
 * Agency Access Service
 *
 * Handles agency group access management + contact search for access grants.
 */

import { get, post, del } from './api';

export interface AgencyAccessUser {
  contactId: string;
  name: string;
  email: string;
  grantedBy: { id: string; name: string } | null;
  grantedAt: string;
}

export interface SubagencyAccessUser {
  contactId: string;
  name: string;
  email: string;
  accessType: 'direct' | 'inherited';
  inheritedFrom?: { agencyGroupId: string; agencyGroupName: string };
  grantedBy?: { id: string; name: string } | null;
  grantedAt?: string;
}

export interface ContactSearchResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  roles: string[];
  jobTitle?: string | null;
}

export async function listAgencyGroupAccess(
  agencyGroupId: string
): Promise<{ users: AgencyAccessUser[] }> {
  return get<{ users: AgencyAccessUser[] }>(`/api/agency-groups/${agencyGroupId}/access`);
}

export async function grantAgencyGroupAccess(
  agencyGroupId: string,
  contactId: string
): Promise<{ message: string; agencyGroupId: string; contactId: string }> {
  return post<{ message: string; agencyGroupId: string; contactId: string }>(
    `/api/agency-groups/${agencyGroupId}/access`,
    { contactId }
  );
}

export async function revokeAgencyGroupAccess(
  agencyGroupId: string,
  contactId: string
): Promise<void> {
  return del<void>(`/api/agency-groups/${agencyGroupId}/access/${contactId}`);
}

export async function listSubagencyAccess(
  subagencyId: string
): Promise<{ users: SubagencyAccessUser[] }> {
  return get<{ users: SubagencyAccessUser[] }>(`/api/subagencies/${subagencyId}/access`);
}

export async function grantSubagencyAccess(
  subagencyId: string,
  contactId: string
): Promise<{ message: string; subagencyId: string; contactId: string }> {
  return post<{ message: string; subagencyId: string; contactId: string }>(
    `/api/subagencies/${subagencyId}/access`,
    { contactId }
  );
}

export async function revokeSubagencyAccess(
  subagencyId: string,
  contactId: string
): Promise<void> {
  return del<void>(`/api/subagencies/${subagencyId}/access/${contactId}`);
}

export async function searchAccessContacts(
  query: string
): Promise<{ contacts: ContactSearchResult[] }> {
  return get<{ contacts: ContactSearchResult[] }>('/api/contacts/search', { q: query });
}

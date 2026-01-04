/**
 * NDA Service
 *
 * Handles all NDA-related API operations including:
 * - Listing NDAs with filtering and pagination
 * - Creating, updating, and cloning NDAs
 * - Status management
 * - Company and agency suggestions
 * - Document generation and management
 * - Email operations
 */

import { get, post, put, patch } from './api';

// Types based on backend routes
export type NdaStatus =
  | 'CREATED'
  | 'PENDING_APPROVAL'
  | 'SENT_PENDING_SIGNATURE'
  | 'IN_REVISION'
  | 'FULLY_EXECUTED'
  | 'INACTIVE_CANCELED'
  | 'EXPIRED';

export type NdaType =
  | 'MUTUAL'
  | 'CONSULTANT';

export type UsMaxPosition = 'PRIME' | 'SUB_CONTRACTOR' | 'OTHER';

export interface NdaListItem {
  id: string;
  displayId: string;
  companyName: string;
  ndaType?: NdaType;
  status: NdaStatus;
  isDraft?: boolean;
  incompleteFields?: string[];
  agencyGroup: {
    id: string;
    name: string;
  };
  subagency?: {
    id: string;
    name: string;
  };
  effectiveDate?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory?: Array<{
    status: NdaStatus;
    changedAt: string;
    changedBy?: {
      firstName?: string;
      lastName?: string;
    };
  }>;
}

export interface NdaDetail {
  id: string;
  displayId: string;
  companyName: string;
  companyCity?: string;
  companyState?: string;
  stateOfIncorporation?: string;
  ndaType: NdaType;
  agencyGroup: {
    id: string;
    name: string;
  };
  subagency?: {
    id: string;
    name: string;
  };
  agencyOfficeName?: string;
  abbreviatedName: string;
  authorizedPurpose: string;
  effectiveDate?: string;
  fullyExecutedDate?: string | null;
  usMaxPosition: UsMaxPosition;
  isNonUsMax: boolean;
  opportunityPoc?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  contractsPoc?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  relationshipPoc: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  contactsPoc?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  clonedFrom?: {
    id: string;
    displayId: number;
    companyName: string;
  };
  status: NdaStatus;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
  documents?: unknown[];
  emails?: NdaEmailSummary[];
  auditTrail?: unknown[];
  statusHistory?: unknown[];
  availableActions?: AvailableActions;
  statusProgression?: StatusProgression;
}

export interface AvailableActions {
  canEdit: boolean;
  canSendEmail: boolean;
  canUploadDocument: boolean;
  canChangeStatus: boolean;
  canDelete: boolean;
}

export interface NdaEmailSummary {
  id: string;
  subject: string;
  toRecipients: string[];
  ccRecipients: string[];
  bccRecipients: string[];
  body: string;
  sentAt: string;
  status: string;
  sentBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface StatusProgressionStep {
  status: NdaStatus;
  label: string;
  completed: boolean;
  timestamp?: string;
  isCurrent: boolean;
  changedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface StatusProgression {
  steps: StatusProgressionStep[];
  isTerminal: boolean;
  terminalStatus?: NdaStatus;
}

export interface NdaDetailResponse {
  nda: NdaDetail;
  documents: unknown[];
  emails: NdaEmailSummary[];
  auditTrail: unknown[];
  statusHistory: unknown[];
  statusProgression: StatusProgression;
  availableActions: AvailableActions;
}

export interface StatusDisplayInfo {
  label: string;
  color: string;
  variant: 'default' | 'muted' | 'danger' | 'success' | 'warning';
  hiddenByDefault: boolean;
  isTerminal: boolean;
  canReactivate: boolean;
  validTransitions: NdaStatus[];
}

export interface StatusInfoResponse {
  statuses: Record<NdaStatus, StatusDisplayInfo>;
  terminalStatuses: NdaStatus[];
  reactivatableStatuses: NdaStatus[];
  hiddenByDefault: NdaStatus[];
}

export interface EmailPreview {
  subject: string;
  toRecipients: string[];
  ccRecipients: string[];
  bccRecipients: string[];
  body: string;
  templateId?: string | null;
  templateName?: string | null;
  attachments: Array<{ filename: string; documentId: string }>;
}

export interface ListNdasParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  agencyGroupId?: string;
  subagencyId?: string;
  companyName?: string;
  status?: NdaStatus;
  createdById?: string;
  effectiveDateFrom?: string;
  effectiveDateTo?: string;
  showInactive?: boolean;
  showCancelled?: boolean;
  draftsOnly?: boolean;
  myDrafts?: boolean;
  companyCity?: string;
  companyState?: string;
  stateOfIncorporation?: string;
  agencyOfficeName?: string;
  ndaType?: NdaType;
  isNonUsMax?: boolean;
  createdDateFrom?: string;
  createdDateTo?: string;
  opportunityPocName?: string;
  contractsPocName?: string;
  relationshipPocName?: string;
  preset?:
    | 'my-ndas'
    | 'expiring-soon'
    | 'drafts'
    | 'inactive'
    | 'waiting-on-third-party'
    | 'stale-no-activity'
    | 'active-ndas';
}

export interface ListNdasResponse {
  ndas: NdaListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateNdaData {
  companyName: string;
  agencyGroupId: string;
  subagencyId?: string;
  agencyOfficeName?: string;
  ndaType?: NdaType;
  abbreviatedName: string;
  authorizedPurpose: string;
  effectiveDate?: string;
  usMaxPosition?: UsMaxPosition;
  isNonUsMax?: boolean;
  opportunityPocId?: string;
  contractsPocId?: string;
  relationshipPocId: string;
  contactsPocId?: string | null;
  companyCity?: string;
  companyState?: string;
  stateOfIncorporation?: string;
}

export interface UpdateNdaData {
  companyName?: string;
  agencyGroupId?: string;
  subagencyId?: string | null;
  agencyOfficeName?: string;
  ndaType?: NdaType;
  abbreviatedName?: string;
  authorizedPurpose?: string;
  effectiveDate?: string | null;
  usMaxPosition?: UsMaxPosition;
  isNonUsMax?: boolean;
  contractsPocId?: string | null;
  relationshipPocId?: string;
  contactsPocId?: string | null;
  companyCity?: string;
  companyState?: string;
  stateOfIncorporation?: string;
}

export interface CompanySuggestion {
  companyName: string;
  count: number;
}

export interface CompanyDefaults {
  companyCity?: string;
  companyState?: string;
  stateOfIncorporation?: string;
  lastRelationshipPocId?: string;
  lastRelationshipPocName?: string;
  lastContractsPocId?: string;
  lastContractsPocName?: string;
  mostCommonAgencyGroupId?: string;
  mostCommonAgencyGroupName?: string;
  mostCommonSubagencyId?: string;
  mostCommonSubagencyName?: string;
  typicalAuthorizedPurpose?: string;
  authorizedPurposeCounts?: Array<{ purpose: string; count: number }>;
  typicalNdaType?: NdaType;
  ndaTypeCounts?: Array<{ ndaType: NdaType; count: number }>;
  effectiveDateSuggestions?: string[];
}

export interface CompanyHistoryNda {
  id: string;
  displayId: number;
  status: NdaStatus;
  ndaType?: NdaType | null;
  abbreviatedName?: string | null;
  effectiveDate?: string | null;
  createdAt: string;
  agencyGroupName?: string | null;
  subagencyName?: string | null;
}

export interface AgencySuggestions {
  commonCompanies: Array<{ companyName: string; count: number }>;
  typicalPosition?: UsMaxPosition;
  positionCounts: Array<{ position: UsMaxPosition; count: number }>;
  typicalNdaType?: NdaType;
  typeCounts: Array<{ ndaType: NdaType; count: number }>;
  defaultTemplateId?: string;
  defaultTemplateName?: string;
}

/**
 * List NDAs with filtering and pagination
 */
export async function listNDAs(params: ListNdasParams = {}): Promise<ListNdasResponse> {
  const response = await get<{
    ndas: NdaListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>('/api/ndas', params as Record<string, string | number | boolean>);

  // Transform flat response to nested pagination structure
  return {
    ndas: response.ndas,
    pagination: {
      page: response.page,
      limit: response.limit,
      total: response.total,
      totalPages: response.totalPages,
    },
  };
}

/**
 * Get status display info and valid transitions
 */
export async function getStatusInfo(): Promise<StatusInfoResponse> {
  return get<StatusInfoResponse>('/api/ndas/status-info');
}

/**
 * Get filter suggestions for list typeahead inputs
 */
export async function searchFilterSuggestions(
  field: 'companyCity' | 'companyState' | 'stateOfIncorporation' | 'agencyOfficeName',
  query: string,
  limit = 10
): Promise<{ values: string[] }> {
  const params = new URLSearchParams({
    field,
    q: query,
    limit: String(limit),
  });
  return get<{ values: string[] }>(`/api/ndas/filter-suggestions?${params.toString()}`);
}

/**
 * Get email preview data for an NDA
 */
export async function getEmailPreview(ndaId: string, templateId?: string): Promise<EmailPreview> {
  const query = templateId ? `?templateId=${encodeURIComponent(templateId)}` : '';
  const response = await get<{ preview: EmailPreview }>(`/api/ndas/${ndaId}/email-preview${query}`);
  return response.preview;
}

/**
 * Send NDA email using provided fields
 */
export async function sendNdaEmail(
  ndaId: string,
  payload: {
    subject: string;
    toRecipients: string[];
    ccRecipients?: string[];
    bccRecipients?: string[];
    body: string;
    templateId?: string;
  }
): Promise<{ emailId: string; status: string }> {
  return post<{ emailId: string; status: string }>(`/api/ndas/${ndaId}/send-email`, payload);
}

/**
 * Get full NDA detail response
 */
export async function getNdaDetail(ndaId: string): Promise<NdaDetailResponse> {
  return get<NdaDetailResponse>(`/api/ndas/${ndaId}`);
}

/**
 * Get NDA details by ID
 */
export async function getNDA(id: string): Promise<NdaDetail> {
  const response = await get<{
    nda: NdaDetail;
    documents: unknown[];
    emails: unknown[];
    auditTrail: unknown[];
    statusHistory: unknown[];
    statusProgression: unknown;
    availableActions: unknown;
  }>(`/api/ndas/${id}`);

  // Backend returns a wrapper object, extract the nda
  return response.nda;
}

/**
 * Create a new NDA
 */
export async function createNDA(data: CreateNdaData): Promise<{ message: string; nda: unknown }> {
  return post<{ message: string; nda: unknown }>('/api/ndas', data);
}

/**
 * Update an existing NDA
 */
export async function updateNDA(
  id: string,
  data: UpdateNdaData
): Promise<{ message: string; nda: unknown }> {
  return put<{ message: string; nda: unknown }>(`/api/ndas/${id}`, data);
}

/**
 * Update NDA status
 */
export async function updateNDAStatus(
  id: string,
  status: NdaStatus,
  reason?: string
): Promise<{ message: string; nda: unknown }> {
  return patch<{ message: string; nda: unknown }>(`/api/ndas/${id}/status`, { status, reason });
}

/**
 * Clone an existing NDA
 */
export async function cloneNDA(
  id: string,
  overrides: Partial<CreateNdaData> = {}
): Promise<{ message: string; nda: unknown }> {
  return post<{ message: string; nda: unknown }>(`/api/ndas/${id}/clone`, overrides);
}

/**
 * Get recent companies for suggestions
 */
export async function getCompanySuggestions(
  limit = 10
): Promise<{ companies: CompanySuggestion[] }> {
  return get<{ companies: CompanySuggestion[] }>('/api/ndas/company-suggestions', { limit });
}

/**
 * Get auto-fill defaults for a company
 */
export async function getCompanyDefaults(
  companyName: string,
  options?: { agencyGroupId?: string; subagencyId?: string | null }
): Promise<{ defaults: CompanyDefaults }> {
  const params: Record<string, string> = { name: companyName };
  if (options?.agencyGroupId) params.agencyGroupId = options.agencyGroupId;
  if (options?.subagencyId) params.subagencyId = options.subagencyId;

  return get<{ defaults: CompanyDefaults }>('/api/ndas/company-defaults', params);
}

/**
 * Get previous NDAs for a company (most recent first)
 */
export async function getCompanyHistory(
  companyName: string,
  limit = 5
): Promise<{ history: CompanyHistoryNda[] }> {
  return get<{ history: CompanyHistoryNda[] }>('/api/ndas/company-history', {
    name: companyName,
    limit,
  });
}

/**
 * Search companies by partial name
 */
export async function searchCompanies(
  query: string,
  limit = 20
): Promise<{ companies: Array<{ name: string; count: number }> }> {
  return get<{ companies: Array<{ name: string; count: number }> }>('/api/ndas/company-search', {
    q: query,
    limit,
  });
}

/**
 * Get agency suggestions
 */
export async function getAgencySuggestions(
  agencyGroupId: string
): Promise<{ suggestions: AgencySuggestions }> {
  return get<{ suggestions: AgencySuggestions }>('/api/ndas/agency-suggestions', {
    agencyGroupId,
  });
}

/**
 * Get common subagencies for an agency
 */
export async function getCommonSubagencies(
  agencyGroupId: string,
  limit = 5
): Promise<{ subagencies: Array<{ id: string; name: string; count: number }> }> {
  return get<{ subagencies: Array<{ id: string; name: string; count: number }> }>(
    '/api/ndas/agency-subagencies',
    { agencyGroupId, limit }
  );
}

/**
 * Update draft (auto-save)
 */
export async function updateDraft(
  id: string,
  data: Partial<UpdateNdaData>
): Promise<{ savedAt: string; incompleteFields: string[] }> {
  return patch<{ savedAt: string; incompleteFields: string[] }>(`/api/ndas/${id}/draft`, data);
}

/**
 * Get filter presets
 */
export async function getFilterPresets(): Promise<{ presets: unknown[] }> {
  return get<{ presets: unknown[] }>('/api/ndas/filter-presets');
}

/**
 * Export NDAs to CSV
 */
export async function exportNDAs(params: ListNdasParams = {}): Promise<Blob> {
  const queryParams = new URLSearchParams(
    Object.entries(params).reduce(
      (acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      },
      {} as Record<string, string>
    )
  );

  const response = await fetch(
    `${import.meta.env.VITE_API_URL || ''}/api/ndas/export?${queryParams}`,
    {
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to export NDAs');
  }

  return response.blob();
}

/**
 * Route NDA for approval
 * Story 10.6: Two-Step Approval Workflow
 */
export async function routeForApproval(ndaId: string): Promise<void> {
  await post(`/api/ndas/${ndaId}/route-for-approval`, {});
}

/**
 * Approve a pending NDA
 * Story 10.6: Two-Step Approval Workflow
 */
export async function approveNda(ndaId: string): Promise<void> {
  await post(`/api/ndas/${ndaId}/approve`, {});
}

/**
 * Reject a pending NDA
 * Story 10.6: Two-Step Approval Workflow
 */
export async function rejectNda(ndaId: string, reason?: string): Promise<void> {
  await post(`/api/ndas/${ndaId}/reject`, { reason });
}

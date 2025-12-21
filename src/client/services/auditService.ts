/**
 * Audit Service
 *
 * Handles audit log viewing and export operations
 */

import { get } from './api';

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface TimelineEntry {
  id: string;
  timestamp: string;
  relativeTime: string;
  action: string;
  entityType: string;
  user: {
    id?: string;
    name: string;
  };
  icon: string;
  label: string;
  color: string;
  description: string;
  details?: Record<string, unknown>;
}

export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
}

export interface ListAuditLogsResponse {
  auditLogs: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    availableActions: string[];
    availableEntityTypes: string[];
  };
}

export interface NdaAuditTrailResponse {
  nda: {
    id: string;
    displayId: string;
    companyName: string;
  };
  timeline: TimelineEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * List audit logs with filtering (admin only)
 */
export async function listAuditLogs(
  params: ListAuditLogsParams = {}
): Promise<ListAuditLogsResponse> {
  return get<ListAuditLogsResponse>(
    '/api/admin/audit-logs',
    params as Record<string, string | number>
  );
}

/**
 * Get audit trail for a specific NDA
 */
export async function getNDAAuditTrail(
  ndaId: string,
  params: { page?: number; limit?: number; actionTypes?: string[] } = {}
): Promise<NdaAuditTrailResponse> {
  const queryParams: Record<string, string | number> = {};
  if (params.page) queryParams.page = params.page;
  if (params.limit) queryParams.limit = params.limit;
  if (params.actionTypes && params.actionTypes.length > 0) {
    queryParams.actionTypes = params.actionTypes.join(',');
  }

  return get<NdaAuditTrailResponse>(`/api/ndas/${ndaId}/audit-trail`, queryParams);
}

/**
 * Export audit logs to CSV or JSON
 */
export async function exportAuditLogs(
  params: ListAuditLogsParams & { format?: 'csv' | 'json' } = {}
): Promise<Blob> {
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
    `${import.meta.env.VITE_API_URL || ''}/api/admin/audit-logs/export?${queryParams}`,
    {
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to export audit logs');
  }

  return response.blob();
}

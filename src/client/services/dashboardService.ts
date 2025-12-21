/**
 * Dashboard Service
 *
 * Handles dashboard and metrics operations
 */

import { get, post } from './api';

export interface DashboardMetrics {
  activeNdas: number;
  expiringSoon: number;
  averageCycleTimeDays: number | null;
  ndasByStatus: Record<string, number>;
}

export interface RecentNda {
  id: string;
  displayId: string;
  companyName: string;
  status: string;
  agencyGroupName: string;
  createdAt: string;
}

export interface StaleNda {
  id: string;
  displayId: number;
  companyName: string;
  status: string;
  agencyGroupName: string;
  lastActivityAt: string;
  createdAt: string;
  staleDays: number;
  staleReason: 'created_not_emailed' | 'emailed_no_response';
}

export interface ExpiringNda {
  id: string;
  displayId: number;
  companyName: string;
  status: string;
  agencyGroupName: string;
  lastActivityAt: string;
  createdAt: string;
  expirationDate: string;
  daysUntilExpiration: number;
  alertLevel: 'warning' | 'info' | 'expired';
}

export interface WaitingNda {
  id: string;
  displayId: number;
  companyName: string;
  status: string;
  agencyGroupName: string;
  lastActivityAt: string;
  createdAt: string;
  waitingDays: number;
  lastEmailedAt: string | null;
}

export interface ItemsNeedingAttention {
  stale: StaleNda[];
  expiring: ExpiringNda[];
  waitingOnThirdParty: WaitingNda[];
}

export interface RecentActivity {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  user: {
    id: string;
    name: string;
  };
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  dismissible: boolean;
  createdAt: string;
}

export interface Dashboard {
  recentNdas: RecentNda[];
  itemsNeedingAttention: ItemsNeedingAttention;
  metrics: DashboardMetrics;
  recentActivity: RecentActivity[];
}

export interface DashboardConfig {
  staleThresholdDays: number;
  expirationWarningDays: number;
  maxRecentNdas: number;
  maxItemsNeedingAttention: number;
  maxRecentActivity: number;
}

/**
 * Get personalized dashboard data
 */
export async function getDashboard(): Promise<Dashboard> {
  return get<Dashboard>('/api/dashboard');
}

/**
 * Get metrics only
 */
export async function getMetrics(): Promise<DashboardMetrics> {
  const dashboard = await getDashboard();
  return dashboard.metrics;
}

/**
 * Get dashboard configuration
 */
export async function getDashboardConfig(): Promise<{ config: DashboardConfig }> {
  return get<{ config: DashboardConfig }>('/api/dashboard/config');
}

/**
 * Get alerts (placeholder - not in routes yet)
 */
export async function getAlerts(): Promise<{ alerts: Alert[] }> {
  // This would be implemented when the backend route is added
  return Promise.resolve({ alerts: [] });
}

/**
 * Dismiss an alert (placeholder - not in routes yet)
 */
export async function dismissAlert(id: string): Promise<{ message: string }> {
  // This would be implemented when the backend route is added
  return post<{ message: string }>(`/api/dashboard/alerts/${id}/dismiss`);
}

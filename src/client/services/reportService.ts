/**
 * Report Service
 *
 * Aggregates NDA data for reporting and analytics
 */

import { listNDAs, type NdaListItem, type ListNdasParams, exportNDAs } from './ndaService';
import { getDashboard } from './dashboardService';

// Chart data types
export interface MonthlyVolumeData {
  month: string;
  count: number;
}

export interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

export interface AgencyBreakdown {
  agency: string;
  count: number;
}

export interface CycleTimeData {
  agency: string;
  avgDays: number;
}

export interface ReportMetrics {
  totalNdas: number;
  activeNdas: number;
  avgCycleTime: number;
  expiringSoon: number;
  changeVsPrevious?: {
    total: number;
    active: number;
    cycleTime: number;
  };
}

export interface ReportData {
  metrics: ReportMetrics;
  monthlyVolume: MonthlyVolumeData[];
  statusDistribution: StatusDistribution[];
  agencyBreakdown: AgencyBreakdown[];
  cycleTime: CycleTimeData[];
  expiringNdas: NdaListItem[];
}

// Status colors mapping
const STATUS_COLORS: Record<string, string> = {
  FULLY_EXECUTED: '#059669',
  IN_REVISION: '#3b82f6',
  EMAILED: '#a855f7',
  CREATED: '#f59e0b',
  INACTIVE: '#6b7280',
  CANCELLED: '#dc2626',
};

// Status display names
const STATUS_DISPLAY: Record<string, string> = {
  FULLY_EXECUTED: 'Executed',
  IN_REVISION: 'In revision',
  EMAILED: 'Emailed',
  CREATED: 'Created',
  INACTIVE: 'Inactive',
  CANCELLED: 'Cancelled',
};

/**
 * Calculate monthly volume from NDAs
 */
function calculateMonthlyVolume(ndas: NdaListItem[], months: number): MonthlyVolumeData[] {
  const now = new Date();
  const monthlyData: MonthlyVolumeData[] = [];

  // Generate month buckets
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toLocaleString('en-US', { month: 'short' });
    monthlyData.push({ month: monthKey, count: 0 });
  }

  // Count NDAs per month
  ndas.forEach((nda) => {
    const createdDate = new Date(nda.createdAt);
    const monthsAgo = (now.getFullYear() - createdDate.getFullYear()) * 12 +
      (now.getMonth() - createdDate.getMonth());

    if (monthsAgo >= 0 && monthsAgo < months) {
      const index = months - 1 - monthsAgo;
      if (index >= 0 && index < monthlyData.length) {
        monthlyData[index].count++;
      }
    }
  });

  return monthlyData;
}

/**
 * Calculate status distribution
 */
function calculateStatusDistribution(ndas: NdaListItem[]): StatusDistribution[] {
  const statusCounts: Record<string, number> = {};

  ndas.forEach((nda) => {
    statusCounts[nda.status] = (statusCounts[nda.status] || 0) + 1;
  });

  return Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_DISPLAY[status] || status,
    value: count,
    color: STATUS_COLORS[status] || '#6b7280',
  }));
}

/**
 * Calculate agency breakdown
 */
function calculateAgencyBreakdown(ndas: NdaListItem[]): AgencyBreakdown[] {
  const agencyCounts: Record<string, number> = {};

  ndas.forEach((nda) => {
    const agencyName = nda.agencyGroup.name;
    agencyCounts[agencyName] = (agencyCounts[agencyName] || 0) + 1;
  });

  return Object.entries(agencyCounts)
    .map(([agency, count]) => ({ agency, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate average cycle time by agency
 * Note: This is a simplified calculation based on createdAt to updatedAt
 * A more accurate calculation would use status history
 */
function calculateCycleTime(ndas: NdaListItem[]): CycleTimeData[] {
  const agencyCycleTimes: Record<string, { total: number; count: number }> = {};

  ndas.forEach((nda) => {
    // Only calculate for executed NDAs
    if (nda.status === 'FULLY_EXECUTED') {
      const created = new Date(nda.createdAt);
      const updated = new Date(nda.updatedAt);
      const days = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

      const agencyName = nda.agencyGroup.name;
      if (!agencyCycleTimes[agencyName]) {
        agencyCycleTimes[agencyName] = { total: 0, count: 0 };
      }
      agencyCycleTimes[agencyName].total += days;
      agencyCycleTimes[agencyName].count += 1;
    }
  });

  return Object.entries(agencyCycleTimes)
    .map(([agency, { total, count }]) => ({
      agency,
      avgDays: Math.round(total / count),
    }))
    .sort((a, b) => b.avgDays - a.avgDays)
    .slice(0, 10); // Top 10 agencies
}

/**
 * Calculate overall average cycle time
 */
function calculateAvgCycleTime(ndas: NdaListItem[]): number {
  const executedNdas = ndas.filter((nda) => nda.status === 'FULLY_EXECUTED');

  if (executedNdas.length === 0) return 0;

  const totalDays = executedNdas.reduce((sum, nda) => {
    const created = new Date(nda.createdAt);
    const updated = new Date(nda.updatedAt);
    const days = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);

  return Math.round(totalDays / executedNdas.length);
}

/**
 * Get report data for a date range
 */
export async function getReportData(
  dateRangeMonths: number = 6,
  filters: ListNdasParams = {}
): Promise<ReportData> {
  // Calculate date range
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - dateRangeMonths, 1);

  // Fetch all NDAs within date range (with pagination if needed)
  const params: ListNdasParams = {
    ...filters,
    createdDateFrom: startDate.toISOString(),
    limit: 1000, // Get a large batch
    showInactive: true,
    showCancelled: true,
  };

  const { ndas } = await listNDAs(params);

  // Get dashboard metrics for comparison
  const dashboard = await getDashboard();

  // Calculate metrics
  const totalNdas = ndas.length;
  const activeNdas = ndas.filter((nda) => nda.status === 'FULLY_EXECUTED').length;
  const avgCycleTime = calculateAvgCycleTime(ndas);

  // Calculate expiring NDAs (NDAs created in the last 90 days that might expire soon)
  // Note: We don't have expiryDate in the list, so we'll use dashboard metrics
  const expiringSoon = dashboard.metrics.expiringSoon || 0;

  const metrics: ReportMetrics = {
    totalNdas,
    activeNdas,
    avgCycleTime,
    expiringSoon,
  };

  // Generate chart data
  const monthlyVolume = calculateMonthlyVolume(ndas, dateRangeMonths);
  const statusDistribution = calculateStatusDistribution(ndas);
  const agencyBreakdown = calculateAgencyBreakdown(ndas);
  const cycleTime = calculateCycleTime(ndas);

  return {
    metrics,
    monthlyVolume,
    statusDistribution,
    agencyBreakdown,
    cycleTime,
    expiringNdas: [], // Would need additional endpoint to get expiring NDAs with details
  };
}

/**
 * Export report data as CSV
 */
export async function exportReport(filters: ListNdasParams = {}): Promise<void> {
  const blob = await exportNDAs(filters);

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nda-report-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Get date range in months from preset
 */
export function getDateRangeMonths(preset: string): number {
  switch (preset) {
    case 'last-30-days':
      return 1;
    case 'last-3-months':
      return 3;
    case 'last-6-months':
      return 6;
    case 'last-year':
      return 12;
    default:
      return 6;
  }
}

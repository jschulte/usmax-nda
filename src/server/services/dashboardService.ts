/**
 * Dashboard Service
 * Stories 5.8-5.12: Personalized Dashboard & Metrics
 *
 * Handles dashboard data:
 * - Story 5.8: Personalized Dashboard
 * - Story 5.9: At-a-Glance Metrics
 * - Story 5.10: Stale NDA Identification
 * - Story 5.11: Waiting on 3rd Party Tracking
 * - Story 5.12: Expiration Alerts
 */

import { prisma } from '../db/index.js';
import type { UserContext } from '../types/auth.js';
import { NdaStatus } from '../../generated/prisma/index.js';

/**
 * Dashboard configuration thresholds
 */
export interface DashboardConfig {
  staleCreatedDays: number; // Days before CREATED is considered stale
  staleEmailedDays: number; // Days before EMAILED is considered stale
  expirationWarningDays: number; // Days before expiration to warn
  expirationInfoDays: number; // Days before expiration for info
  recentNdaLimit: number; // Number of recent NDAs to show
  recentActivityLimit: number; // Number of recent activity items
}

const DEFAULT_CONFIG: DashboardConfig = {
  staleCreatedDays: 14,
  staleEmailedDays: 30,
  expirationWarningDays: 30,
  expirationInfoDays: 60,
  recentNdaLimit: 5,
  recentActivityLimit: 10,
};

/**
 * Dashboard response type
 */
export interface DashboardResponse {
  recentNdas: DashboardNda[];
  itemsNeedingAttention: {
    stale: StaleNda[];
    expiring: ExpiringNda[];
    waitingOnThirdParty: WaitingNda[];
  };
  metrics: DashboardMetrics;
  recentActivity: ActivityItem[];
}

/**
 * NDA summary for dashboard
 */
export interface DashboardNda {
  id: string;
  displayId: number;
  companyName: string;
  status: string;
  agencyGroupName: string;
  lastActivityAt: Date;
  createdAt: Date;
}

/**
 * Stale NDA for attention
 */
export interface StaleNda extends DashboardNda {
  staleDays: number;
  staleReason: 'created_not_emailed' | 'emailed_no_response';
}

/**
 * Expiring NDA for attention
 */
export interface ExpiringNda extends DashboardNda {
  expirationDate: Date;
  daysUntilExpiration: number;
  alertLevel: 'warning' | 'info' | 'expired';
}

/**
 * Waiting on 3rd party NDA
 */
export interface WaitingNda extends DashboardNda {
  waitingDays: number;
  lastEmailedAt: Date | null;
}

/**
 * Dashboard metrics
 */
export interface DashboardMetrics {
  activeNdas: number;
  expiringSoon: number;
  averageCycleTimeDays: number | null;
  ndasByStatus: Record<string, number>;
}

/**
 * Activity item
 */
export interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  userName: string | null;
  timestamp: Date;
  details: Record<string, any> | null;
  ndaDisplayId?: number;
  companyName?: string;
}

/**
 * Build security filter for queries
 */
function buildSecurityFilter(userContext: UserContext) {
  if (userContext.permissions.has('admin:manage_agencies')) {
    return {}; // Admin sees all
  }

  const conditions: any[] = [];

  if (userContext.authorizedAgencyGroups.length > 0) {
    conditions.push({ agencyGroupId: { in: userContext.authorizedAgencyGroups } });
  }

  if (userContext.authorizedSubagencies.length > 0) {
    conditions.push({ subagencyId: { in: userContext.authorizedSubagencies } });
  }

  if (conditions.length === 0) {
    return { id: '__NONE__' }; // No access
  }

  return { OR: conditions };
}

/**
 * Get personalized dashboard data
 * Story 5.8: Personalized Dashboard
 */
export async function getDashboard(
  userContext: UserContext,
  config: Partial<DashboardConfig> = {}
): Promise<DashboardResponse> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const securityFilter = buildSecurityFilter(userContext);
  const now = new Date();

  // Run queries in parallel for performance
  const [recentNdas, metrics, staleNdas, expiringNdas, waitingNdas, recentActivity] =
    await Promise.all([
      getRecentNdas(securityFilter, userContext.contactId, cfg.recentNdaLimit),
      getMetrics(securityFilter, cfg),
      getStaleNdas(securityFilter, now, cfg),
      getExpiringNdas(securityFilter, now, cfg),
      getWaitingNdas(securityFilter, now),
      getRecentActivity(securityFilter, cfg.recentActivityLimit),
    ]);

  return {
    recentNdas,
    itemsNeedingAttention: {
      stale: staleNdas,
      expiring: expiringNdas,
      waitingOnThirdParty: waitingNdas,
    },
    metrics,
    recentActivity,
  };
}

/**
 * Get recent NDAs for user
 * Story 5.8
 */
async function getRecentNdas(
  securityFilter: any,
  contactId: string,
  limit: number
): Promise<DashboardNda[]> {
  const ndas = await prisma.nda.findMany({
    where: {
      ...securityFilter,
      OR: [
        { createdById: contactId },
        { opportunityPocId: contactId },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      displayId: true,
      companyName: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      agencyGroup: { select: { name: true } },
    },
  });

  return ndas.map((nda) => ({
    id: nda.id,
    displayId: nda.displayId,
    companyName: nda.companyName,
    status: nda.status,
    agencyGroupName: nda.agencyGroup.name,
    lastActivityAt: nda.updatedAt,
    createdAt: nda.createdAt,
  }));
}

/**
 * Get dashboard metrics
 * Story 5.9: At-a-Glance Metrics
 */
async function getMetrics(
  securityFilter: any,
  cfg: DashboardConfig
): Promise<DashboardMetrics> {
  const now = new Date();
  const expirationThreshold = new Date(
    now.getTime() + cfg.expirationWarningDays * 24 * 60 * 60 * 1000
  );

  // Get counts in parallel
  const [activeCount, expiringCount, statusCounts, cycleTime] = await Promise.all([
    // Active NDAs (not INACTIVE or CANCELLED)
    prisma.nda.count({
      where: {
        ...securityFilter,
        status: { notIn: [NdaStatus.INACTIVE, NdaStatus.CANCELLED] },
      },
    }),

    // Expiring soon
    prisma.nda.count({
      where: {
        ...securityFilter,
        status: NdaStatus.FULLY_EXECUTED,
        effectiveDate: {
          not: null,
          lte: expirationThreshold,
          gte: now,
        },
      },
    }),

    // Status breakdown
    prisma.nda.groupBy({
      by: ['status'],
      where: securityFilter,
      _count: true,
    }),

    // Average cycle time (last 90 days)
    getAverageCycleTime(securityFilter),
  ]);

  const ndasByStatus: Record<string, number> = {};
  for (const item of statusCounts) {
    ndasByStatus[item.status] = item._count;
  }

  return {
    activeNdas: activeCount,
    expiringSoon: expiringCount,
    averageCycleTimeDays: cycleTime,
    ndasByStatus,
  };
}

/**
 * Calculate average cycle time for completed NDAs
 */
async function getAverageCycleTime(securityFilter: any): Promise<number | null> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Get NDAs that reached FULLY_EXECUTED in last 90 days
  const completedNdas = await prisma.nda.findMany({
    where: {
      ...securityFilter,
      status: NdaStatus.FULLY_EXECUTED,
      fullyExecutedDate: {
        gte: ninetyDaysAgo,
      },
    },
    select: {
      createdAt: true,
      fullyExecutedDate: true,
    },
  });

  if (completedNdas.length === 0) {
    return null;
  }

  // Calculate average cycle time in days
  let totalDays = 0;
  for (const nda of completedNdas) {
    if (nda.fullyExecutedDate) {
      const cycleTime =
        (nda.fullyExecutedDate.getTime() - nda.createdAt.getTime()) /
        (1000 * 60 * 60 * 24);
      totalDays += cycleTime;
    }
  }

  return Math.round(totalDays / completedNdas.length);
}

/**
 * Get stale NDAs
 * Story 5.10: Stale NDA Identification
 */
async function getStaleNdas(
  securityFilter: any,
  now: Date,
  cfg: DashboardConfig
): Promise<StaleNda[]> {
  const createdThreshold = new Date(
    now.getTime() - cfg.staleCreatedDays * 24 * 60 * 60 * 1000
  );
  const emailedThreshold = new Date(
    now.getTime() - cfg.staleEmailedDays * 24 * 60 * 60 * 1000
  );

  // Get stale CREATED NDAs (not emailed after X days)
  const staleCreated = await prisma.nda.findMany({
    where: {
      ...securityFilter,
      status: NdaStatus.CREATED,
      createdAt: { lte: createdThreshold },
    },
    select: {
      id: true,
      displayId: true,
      companyName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      agencyGroup: { select: { name: true } },
    },
    take: 10,
  });

  // Get stale EMAILED NDAs (no response after X days)
  const staleEmailed = await prisma.nda.findMany({
    where: {
      ...securityFilter,
      status: NdaStatus.EMAILED,
      updatedAt: { lte: emailedThreshold },
    },
    select: {
      id: true,
      displayId: true,
      companyName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      agencyGroup: { select: { name: true } },
    },
    take: 10,
  });

  const result: StaleNda[] = [];

  for (const nda of staleCreated) {
    const staleDays = Math.floor(
      (now.getTime() - nda.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    result.push({
      id: nda.id,
      displayId: nda.displayId,
      companyName: nda.companyName,
      status: nda.status,
      agencyGroupName: nda.agencyGroup.name,
      lastActivityAt: nda.updatedAt,
      createdAt: nda.createdAt,
      staleDays,
      staleReason: 'created_not_emailed',
    });
  }

  for (const nda of staleEmailed) {
    const staleDays = Math.floor(
      (now.getTime() - nda.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    result.push({
      id: nda.id,
      displayId: nda.displayId,
      companyName: nda.companyName,
      status: nda.status,
      agencyGroupName: nda.agencyGroup.name,
      lastActivityAt: nda.updatedAt,
      createdAt: nda.createdAt,
      staleDays,
      staleReason: 'emailed_no_response',
    });
  }

  // Sort by staleness (most stale first)
  return result.sort((a, b) => b.staleDays - a.staleDays);
}

/**
 * Get expiring NDAs
 * Story 5.12: Expiration Alerts
 */
async function getExpiringNdas(
  securityFilter: any,
  now: Date,
  cfg: DashboardConfig
): Promise<ExpiringNda[]> {
  const warningThreshold = new Date(
    now.getTime() + cfg.expirationWarningDays * 24 * 60 * 60 * 1000
  );
  const infoThreshold = new Date(
    now.getTime() + cfg.expirationInfoDays * 24 * 60 * 60 * 1000
  );

  // Get NDAs with expiration dates within the threshold
  const expiringNdas = await prisma.nda.findMany({
    where: {
      ...securityFilter,
      status: NdaStatus.FULLY_EXECUTED,
      effectiveDate: {
        not: null,
        lte: infoThreshold,
      },
    },
    select: {
      id: true,
      displayId: true,
      companyName: true,
      status: true,
      effectiveDate: true,
      createdAt: true,
      updatedAt: true,
      agencyGroup: { select: { name: true } },
    },
    orderBy: { effectiveDate: 'asc' },
    take: 20,
  });

  return expiringNdas.map((nda) => {
    const expirationDate = nda.effectiveDate!;
    const daysUntilExpiration = Math.floor(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let alertLevel: 'warning' | 'info' | 'expired';
    if (daysUntilExpiration < 0) {
      alertLevel = 'expired';
    } else if (daysUntilExpiration <= cfg.expirationWarningDays) {
      alertLevel = 'warning';
    } else {
      alertLevel = 'info';
    }

    return {
      id: nda.id,
      displayId: nda.displayId,
      companyName: nda.companyName,
      status: nda.status,
      agencyGroupName: nda.agencyGroup.name,
      lastActivityAt: nda.updatedAt,
      createdAt: nda.createdAt,
      expirationDate,
      daysUntilExpiration,
      alertLevel,
    };
  });
}

/**
 * Get NDAs waiting on 3rd party
 * Story 5.11: Waiting on 3rd Party Tracking
 */
async function getWaitingNdas(
  securityFilter: any,
  now: Date
): Promise<WaitingNda[]> {
  // Get EMAILED or IN_REVISION NDAs (waiting on external party)
  const waitingNdas = await prisma.nda.findMany({
    where: {
      ...securityFilter,
      status: { in: [NdaStatus.EMAILED, NdaStatus.IN_REVISION] },
    },
    select: {
      id: true,
      displayId: true,
      companyName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      agencyGroup: { select: { name: true } },
      emails: {
        orderBy: { sentAt: 'desc' },
        take: 1,
        select: { sentAt: true },
      },
    },
    orderBy: { updatedAt: 'asc' }, // Longest waiting first
    take: 20,
  });

  return waitingNdas.map((nda) => {
    const lastEmailedAt = nda.emails[0]?.sentAt || null;
    const waitingDays = Math.floor(
      (now.getTime() - nda.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      id: nda.id,
      displayId: nda.displayId,
      companyName: nda.companyName,
      status: nda.status,
      agencyGroupName: nda.agencyGroup.name,
      lastActivityAt: nda.updatedAt,
      createdAt: nda.createdAt,
      waitingDays,
      lastEmailedAt,
    };
  });
}

/**
 * Get recent activity
 * Story 5.8
 */
async function getRecentActivity(
  securityFilter: any,
  limit: number
): Promise<ActivityItem[]> {
  // Get recent audit log entries for authorized NDAs
  const ndaIds = await prisma.nda.findMany({
    where: securityFilter,
    select: { id: true, displayId: true, companyName: true },
    take: 100, // Limit for performance
  });

  const ndaIdMap = new Map(ndaIds.map((n) => [n.id, { displayId: n.displayId, companyName: n.companyName }]));

  const activities = await prisma.auditLog.findMany({
    where: {
      entityType: { in: ['nda', 'document', 'email'] },
      entityId: { in: Array.from(ndaIdMap.keys()) },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      userId: true,
      createdAt: true,
      details: true,
    },
  });

  // Get user names for activity
  const userIds = activities.map((a) => a.userId).filter(Boolean) as string[];
  const users = await prisma.contact.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim()]));

  return activities.map((activity) => {
    const ndaInfo = activity.entityId ? ndaIdMap.get(activity.entityId) : null;
    return {
      id: activity.id,
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId || '',
      userId: activity.userId,
      userName: activity.userId ? userMap.get(activity.userId) || null : null,
      timestamp: activity.createdAt,
      details: activity.details as Record<string, any> | null,
      ndaDisplayId: ndaInfo?.displayId,
      companyName: ndaInfo?.companyName,
    };
  });
}

/**
 * Get dashboard configuration
 * Returns defaults for now - Story 7.17 will add admin configuration
 */
export async function getDashboardConfig(): Promise<DashboardConfig> {
  // TODO: Story 7.17 will add SystemConfig model for admin-configurable thresholds
  // For now, return sensible defaults
  return DEFAULT_CONFIG;
}

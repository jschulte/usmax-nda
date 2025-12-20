/**
 * Company Suggestions Service
 * Story 3.2: Smart Form Auto-Fill (Company-First Entry Path)
 *
 * Provides company suggestions and auto-fill defaults based on historical NDA data:
 * - getRecentCompanies: Last 10 companies used by user
 * - getCompanyDefaults: Auto-fill values from historical NDAs
 * - getMostCommonAgency: Detect most common agency for a company
 */

import prisma from '../db/index.js';
import type { UserContext } from '../types/auth.js';
import { buildSecurityFilter } from './ndaService.js';

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
}

export interface RecentCompany {
  companyName: string;
  lastUsed: Date;
  count: number;
}

/**
 * Get the most recent value for a field from historical NDAs
 */
function getMostRecentValue<T>(ndas: any[], field: string): T | undefined {
  for (const nda of ndas) {
    const value = nda[field];
    if (value !== null && value !== undefined && value !== '') {
      return value as T;
    }
  }
  return undefined;
}

/**
 * Get the most frequent value for a field from historical NDAs
 */
function getMostFrequentValue<T>(ndas: any[], field: string): T | undefined {
  const counts = new Map<T, number>();

  for (const nda of ndas) {
    const value = nda[field] as T;
    if (value !== null && value !== undefined) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }

  if (counts.size === 0) {
    return undefined;
  }

  let mostFrequent: T | undefined;
  let maxCount = 0;

  for (const [value, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = value;
    }
  }

  return mostFrequent;
}

/**
 * Get recent companies used by a user
 * Returns last 10 unique companies used, sorted by most recent first
 */
export async function getRecentCompanies(
  userContext: UserContext,
  limit: number = 10
): Promise<RecentCompany[]> {
  const securityFilter = await buildSecurityFilter(userContext);

  // Get NDAs created by this user (or accessible to them)
  const ndas = await prisma.nda.findMany({
    where: {
      AND: [
        securityFilter,
        // Include both user-created and user-accessible NDAs for suggestions
        {
          OR: [
            { createdById: userContext.contactId },
            { opportunityPocId: userContext.contactId },
          ],
        },
      ],
    },
    select: {
      companyName: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100, // Get more to count frequency
  });

  // Aggregate by company name
  const companyMap = new Map<string, { lastUsed: Date; count: number }>();

  for (const nda of ndas) {
    const existing = companyMap.get(nda.companyName);
    if (existing) {
      existing.count++;
    } else {
      companyMap.set(nda.companyName, {
        lastUsed: nda.createdAt,
        count: 1,
      });
    }
  }

  // Convert to array and sort by last used
  const companies: RecentCompany[] = Array.from(companyMap.entries())
    .map(([companyName, data]) => ({
      companyName,
      lastUsed: data.lastUsed,
      count: data.count,
    }))
    .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
    .slice(0, limit);

  return companies;
}

/**
 * Get auto-fill defaults for a company based on historical NDA data
 * Returns values that can be used to pre-populate the NDA form
 */
export async function getCompanyDefaults(
  companyName: string,
  userContext: UserContext
): Promise<CompanyDefaults> {
  const securityFilter = await buildSecurityFilter(userContext);

  // Get historical NDAs for this company
  const historicalNdas = await prisma.nda.findMany({
    where: {
      AND: [
        securityFilter,
        {
          companyName: {
            equals: companyName,
            mode: 'insensitive', // Case-insensitive match
          },
        },
      ],
    },
    include: {
      relationshipPoc: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      contractsPoc: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      agencyGroup: {
        select: {
          id: true,
          name: true,
        },
      },
      subagency: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10, // Last 10 NDAs for this company
  });

  if (historicalNdas.length === 0) {
    return {};
  }

  // Get most recent values for location fields
  const companyCity = getMostRecentValue<string>(historicalNdas, 'companyCity');
  const companyState = getMostRecentValue<string>(historicalNdas, 'companyState');
  const stateOfIncorporation = getMostRecentValue<string>(historicalNdas, 'stateOfIncorporation');

  // Get most recent POCs
  const lastRelationshipPocId = getMostRecentValue<string>(historicalNdas, 'relationshipPocId');
  const lastContractsPocId = getMostRecentValue<string>(historicalNdas, 'contractsPocId');

  // Get POC names
  let lastRelationshipPocName: string | undefined;
  let lastContractsPocName: string | undefined;

  for (const nda of historicalNdas) {
    if (nda.relationshipPocId === lastRelationshipPocId && nda.relationshipPoc) {
      lastRelationshipPocName = [nda.relationshipPoc.firstName, nda.relationshipPoc.lastName]
        .filter(Boolean)
        .join(' ') || undefined;
      break;
    }
  }

  for (const nda of historicalNdas) {
    if (nda.contractsPocId === lastContractsPocId && nda.contractsPoc) {
      lastContractsPocName = [nda.contractsPoc.firstName, nda.contractsPoc.lastName]
        .filter(Boolean)
        .join(' ') || undefined;
      break;
    }
  }

  // Get most common agency (by frequency)
  const mostCommonAgencyGroupId = getMostFrequentValue<string>(historicalNdas, 'agencyGroupId');
  const mostCommonSubagencyId = getMostFrequentValue<string>(historicalNdas, 'subagencyId');

  // Get agency names
  let mostCommonAgencyGroupName: string | undefined;
  let mostCommonSubagencyName: string | undefined;

  for (const nda of historicalNdas) {
    if (nda.agencyGroupId === mostCommonAgencyGroupId && nda.agencyGroup) {
      mostCommonAgencyGroupName = nda.agencyGroup.name;
      break;
    }
  }

  for (const nda of historicalNdas) {
    if (nda.subagencyId === mostCommonSubagencyId && nda.subagency) {
      mostCommonSubagencyName = nda.subagency.name;
      break;
    }
  }

  return {
    companyCity,
    companyState,
    stateOfIncorporation,
    lastRelationshipPocId,
    lastRelationshipPocName,
    lastContractsPocId,
    lastContractsPocName,
    mostCommonAgencyGroupId,
    mostCommonAgencyGroupName,
    mostCommonSubagencyId,
    mostCommonSubagencyName,
  };
}

/**
 * Get the most common agency for a company
 * Useful for agency-first entry path suggestions
 */
export async function getMostCommonAgency(
  companyName: string,
  userContext: UserContext
): Promise<{ agencyGroupId?: string; agencyGroupName?: string; frequency?: number } | null> {
  const securityFilter = await buildSecurityFilter(userContext);

  const historicalNdas = await prisma.nda.findMany({
    where: {
      AND: [
        securityFilter,
        {
          companyName: {
            equals: companyName,
            mode: 'insensitive',
          },
        },
      ],
    },
    select: {
      agencyGroupId: true,
      agencyGroup: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (historicalNdas.length === 0) {
    return null;
  }

  // Count agencies
  const counts = new Map<string, { count: number; name: string }>();

  for (const nda of historicalNdas) {
    const existing = counts.get(nda.agencyGroupId);
    if (existing) {
      existing.count++;
    } else {
      counts.set(nda.agencyGroupId, {
        count: 1,
        name: nda.agencyGroup?.name || '',
      });
    }
  }

  // Find most frequent
  let mostCommon: { agencyGroupId: string; agencyGroupName: string; frequency: number } | null = null;
  let maxCount = 0;

  for (const [agencyGroupId, data] of counts.entries()) {
    if (data.count > maxCount) {
      maxCount = data.count;
      mostCommon = {
        agencyGroupId,
        agencyGroupName: data.name,
        frequency: Math.round((data.count / historicalNdas.length) * 100),
      };
    }
  }

  return mostCommon;
}

/**
 * Search companies by partial name match
 * Used for company autocomplete dropdown
 */
export async function searchCompanies(
  query: string,
  userContext: UserContext,
  limit: number = 20
): Promise<{ companyName: string; count: number }[]> {
  const securityFilter = await buildSecurityFilter(userContext);

  const ndas = await prisma.nda.findMany({
    where: {
      AND: [
        securityFilter,
        {
          companyName: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ],
    },
    select: {
      companyName: true,
    },
    distinct: ['companyName'],
  });

  // Count occurrences
  const companyMap = new Map<string, number>();

  for (const nda of ndas) {
    companyMap.set(nda.companyName, (companyMap.get(nda.companyName) || 0) + 1);
  }

  // Convert to array and sort by count (most used first)
  return Array.from(companyMap.entries())
    .map(([companyName, count]) => ({ companyName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

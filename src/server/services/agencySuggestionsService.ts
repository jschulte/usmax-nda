/**
 * Agency Suggestions Service
 * Story 3.4: Agency-First Entry Path with Suggestions
 *
 * Provides intelligent suggestions when user selects agency first:
 * - getCommonCompanies: Top companies by NDA count for agency
 * - getTypicalPosition: Most common USMax position for agency
 * - getDefaultTemplate: Most used RTF template for agency
 */

import prisma from '../db/index.js';
import type { UserContext } from '../types/auth.js';
import type { UsMaxPosition, Prisma } from '../../generated/prisma/index.js';

export interface AgencySuggestions {
  commonCompanies: Array<{
    companyName: string;
    count: number;
  }>;
  typicalPosition?: UsMaxPosition;
  positionCounts?: Array<{
    position: UsMaxPosition;
    count: number;
  }>;
  defaultTemplateId?: string;
  defaultTemplateName?: string;
}

/**
 * Build security filter for NDA queries based on user's authorized agencies
 */
function buildSecurityFilter(userContext: UserContext): Prisma.NdaWhereInput {
  // Admins can see all NDAs
  if (userContext.permissions.has('admin:bypass')) {
    return {};
  }

  const agencyGroups = userContext.authorizedAgencyGroups || [];
  const subagencies = userContext.authorizedSubagencies || [];

  // If no access granted, return impossible filter
  if (agencyGroups.length === 0 && subagencies.length === 0) {
    return { id: 'no-access-impossible-id' };
  }

  const conditions: Prisma.NdaWhereInput[] = [];

  if (agencyGroups.length > 0) {
    conditions.push({ agencyGroupId: { in: agencyGroups } });
  }

  if (subagencies.length > 0) {
    conditions.push({ subagencyId: { in: subagencies } });
  }

  return { OR: conditions };
}

/**
 * Get common companies for an agency group
 * Returns top 5 companies by NDA count
 */
export async function getCommonCompanies(
  agencyGroupId: string,
  userContext: UserContext,
  limit: number = 5
): Promise<Array<{ companyName: string; count: number }>> {
  const securityFilter = buildSecurityFilter(userContext);

  // Get NDAs for this agency, grouped by company
  const ndas = await prisma.nda.findMany({
    where: {
      AND: [securityFilter, { agencyGroupId }],
    },
    select: {
      companyName: true,
    },
  });

  // Count by company name
  const companyCounts = new Map<string, number>();
  for (const nda of ndas) {
    companyCounts.set(nda.companyName, (companyCounts.get(nda.companyName) || 0) + 1);
  }

  // Sort by count and take top N
  return Array.from(companyCounts.entries())
    .map(([companyName, count]) => ({ companyName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get typical USMax position for an agency group
 * Returns the most common position and counts for all positions
 */
export async function getTypicalPosition(
  agencyGroupId: string,
  userContext: UserContext
): Promise<{
  typicalPosition?: UsMaxPosition;
  positionCounts: Array<{ position: UsMaxPosition; count: number }>;
}> {
  const securityFilter = buildSecurityFilter(userContext);

  // Get NDAs for this agency
  const ndas = await prisma.nda.findMany({
    where: {
      AND: [securityFilter, { agencyGroupId }],
    },
    select: {
      usMaxPosition: true,
    },
  });

  // Count by position
  const positionCounts = new Map<UsMaxPosition, number>();
  for (const nda of ndas) {
    positionCounts.set(nda.usMaxPosition, (positionCounts.get(nda.usMaxPosition) || 0) + 1);
  }

  // Convert to array and sort
  const counts = Array.from(positionCounts.entries())
    .map(([position, count]) => ({ position, count }))
    .sort((a, b) => b.count - a.count);

  return {
    typicalPosition: counts[0]?.position,
    positionCounts: counts,
  };
}

/**
 * Get default RTF template for an agency group
 * Returns the most commonly used template
 * Note: Template feature will be implemented in Story 7.x
 * For now, returns null until templates are available
 */
export async function getDefaultTemplate(
  _agencyGroupId: string,
  _userContext: UserContext
): Promise<{ templateId?: string; templateName?: string }> {
  // TODO: Implement when RTF templates are available (Story 7.x)
  // For now, return empty - the structure is in place for future use
  return {};
}

/**
 * Get all suggestions for an agency in one call
 * Convenience method that combines all suggestion types
 */
export async function getAgencySuggestions(
  agencyGroupId: string,
  userContext: UserContext
): Promise<AgencySuggestions> {
  // Run queries in parallel
  const [companies, positions, template] = await Promise.all([
    getCommonCompanies(agencyGroupId, userContext),
    getTypicalPosition(agencyGroupId, userContext),
    getDefaultTemplate(agencyGroupId, userContext),
  ]);

  return {
    commonCompanies: companies,
    typicalPosition: positions.typicalPosition,
    positionCounts: positions.positionCounts,
    defaultTemplateId: template.templateId,
    defaultTemplateName: template.templateName,
  };
}

/**
 * Get subagency suggestions for an agency group
 * Returns most commonly used subagencies
 */
export async function getCommonSubagencies(
  agencyGroupId: string,
  userContext: UserContext,
  limit: number = 5
): Promise<Array<{ subagencyId: string; subagencyName: string; count: number }>> {
  const securityFilter = buildSecurityFilter(userContext);

  // Get NDAs for this agency with subagencies
  const ndas = await prisma.nda.findMany({
    where: {
      AND: [
        securityFilter,
        { agencyGroupId },
        { subagencyId: { not: null } },
      ],
    },
    select: {
      subagencyId: true,
      subagency: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Count by subagency
  const subagencyCounts = new Map<string, { name: string; count: number }>();
  for (const nda of ndas) {
    if (nda.subagencyId && nda.subagency) {
      const existing = subagencyCounts.get(nda.subagencyId);
      if (existing) {
        existing.count++;
      } else {
        subagencyCounts.set(nda.subagencyId, {
          name: nda.subagency.name,
          count: 1,
        });
      }
    }
  }

  // Sort by count and take top N
  return Array.from(subagencyCounts.entries())
    .map(([subagencyId, data]) => ({
      subagencyId,
      subagencyName: data.name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Agency Suggestions Service
 * Story 3.4: Agency-First Entry Path with Suggestions
 *
 * Provides intelligent suggestions when user selects agency first:
 * - getCommonCompanies: Top companies by NDA count for agency
 * - getTypicalPosition: Most common USmax position for agency
 * - getDefaultTemplate: Most used RTF template for agency
 */

import prisma from '../db/index.js';
import type { UserContext } from '../types/auth.js';
import type { UsMaxPosition, NdaType } from '../../generated/prisma/index.js';
import { buildSecurityFilter } from './ndaService.js';
import { resolveDefaultTemplateId } from './templateService.js';

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
  typicalNdaType?: NdaType;
  typeCounts?: Array<{
    ndaType: NdaType;
    count: number;
  }>;
  defaultTemplateId?: string;
  defaultTemplateName?: string;
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
  const securityFilter = await buildSecurityFilter(userContext);

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
 * Get typical USmax position for an agency group
 * Returns the most common position and counts for all positions
 */
export async function getTypicalPosition(
  agencyGroupId: string,
  userContext: UserContext
): Promise<{
  typicalPosition?: UsMaxPosition;
  positionCounts: Array<{ position: UsMaxPosition; count: number }>;
}> {
  const securityFilter = await buildSecurityFilter(userContext);

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
  agencyGroupId: string,
  _userContext: UserContext
): Promise<{ templateId?: string; templateName?: string }> {
  const scopedDefaultId = await resolveDefaultTemplateId(agencyGroupId);
  if (scopedDefaultId) {
    const template = await prisma.rtfTemplate.findFirst({
      where: { id: scopedDefaultId, isActive: true },
      select: { id: true, name: true },
    });
    if (template) {
      return { templateId: template.id, templateName: template.name };
    }
  }

  // Prefer agency-specific default, then any active agency template,
  // then global default, then any active global template.
  const defaultForAgency = await prisma.rtfTemplate.findFirst({
    where: { agencyGroupId, isDefault: true, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (defaultForAgency) {
    return { templateId: defaultForAgency.id, templateName: defaultForAgency.name };
  }

  const anyAgencyTemplate = await prisma.rtfTemplate.findFirst({
    where: { agencyGroupId, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (anyAgencyTemplate) {
    return { templateId: anyAgencyTemplate.id, templateName: anyAgencyTemplate.name };
  }

  const defaultGlobal = await prisma.rtfTemplate.findFirst({
    where: { agencyGroupId: null, isDefault: true, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (defaultGlobal) {
    return { templateId: defaultGlobal.id, templateName: defaultGlobal.name };
  }

  const anyGlobal = await prisma.rtfTemplate.findFirst({
    where: { agencyGroupId: null, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (anyGlobal) {
    return { templateId: anyGlobal.id, templateName: anyGlobal.name };
  }

  return {};
}

/**
 * Get typical NDA type for an agency group
 */
export async function getTypicalNdaType(
  agencyGroupId: string,
  userContext: UserContext
): Promise<{
  typicalNdaType?: NdaType;
  typeCounts: Array<{ ndaType: NdaType; count: number }>;
}> {
  const securityFilter = await buildSecurityFilter(userContext);

  const ndas = await prisma.nda.findMany({
    where: {
      AND: [securityFilter, { agencyGroupId }],
    },
    select: {
      ndaType: true,
    },
  });

  const typeCounts = new Map<NdaType, number>();
  for (const nda of ndas) {
    typeCounts.set(nda.ndaType, (typeCounts.get(nda.ndaType) || 0) + 1);
  }

  const counts = Array.from(typeCounts.entries())
    .map(([ndaType, count]) => ({ ndaType, count }))
    .sort((a, b) => b.count - a.count);

  return {
    typicalNdaType: counts[0]?.ndaType,
    typeCounts: counts,
  };
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
  const [companies, positions, types, template] = await Promise.all([
    getCommonCompanies(agencyGroupId, userContext),
    getTypicalPosition(agencyGroupId, userContext),
    getTypicalNdaType(agencyGroupId, userContext),
    getDefaultTemplate(agencyGroupId, userContext),
  ]);

  return {
    commonCompanies: companies,
    typicalPosition: positions.typicalPosition,
    positionCounts: positions.positionCounts,
    typicalNdaType: types.typicalNdaType,
    typeCounts: types.typeCounts,
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
  const securityFilter = await buildSecurityFilter(userContext);

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

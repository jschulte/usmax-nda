/**
 * Agency Scope Service
 * Story 1.4: Row-Level Security Implementation
 *
 * Provides helpers for computing a user's authorized subagencies.
 * This is the foundation of row-level security for NDAs.
 *
 * IMPORTANT: Every NDA query MUST use the agency scope filter to ensure
 * users only see NDAs for their authorized agencies.
 */

import { getAuthorizedSubagencyIdsByContactId } from './userContextService.js';
import type { UserContext } from '../types/auth.js';
import { ROLE_NAMES } from '../types/auth.js';

/**
 * Agency scope Prisma where clause type
 */
export interface AgencyScope {
  subagencyId: { in: string[] };
}

/**
 * Get the Prisma where clause for a user's authorized subagencies.
 *
 * Combines:
 * 1. Direct subagency grants (user -> specific subagency)
 * 2. Agency group grants (user -> all subagencies in group)
 *
 * @param contactId - The database contact ID
 * @returns Prisma where clause to filter NDAs by authorized subagencies
 *
 * @example
 * const scope = await getUserAgencyScope(user.contactId);
 * const ndas = await prisma.nda.findMany({
 *   where: {
 *     ...otherFilters,
 *     ...scope, // MANDATORY for row-level security
 *   },
 * });
 */
export async function getUserAgencyScope(contactId: string): Promise<AgencyScope> {
  try {
    const authorizedSubagencyIds = await getAuthorizedSubagencyIdsByContactId(contactId);
    return { subagencyId: { in: authorizedSubagencyIds } };
  } catch (error) {
    console.error('[AgencyScope] Error computing user scope:', error);
    // Return empty scope on error (fail closed - no access)
    return { subagencyId: { in: [] } };
  }
}

/**
 * Get NDA scope for a user context.
 * Admin users are not scoped.
 *
 * @param userContext - The authenticated user's context
 * @returns Prisma where clause for NDA scoping
 */
export async function scopeNDAsToUser(userContext: UserContext): Promise<AgencyScope | {}> {
  if (userContext.roles?.includes(ROLE_NAMES.ADMIN)) {
    return {};
  }

  return getUserAgencyScope(userContext.contactId);
}

/**
 * Get authorized subagency IDs as a flat array.
 * Useful for validating if a specific subagency is authorized.
 *
 * @param contactId - The database contact ID
 * @returns Array of authorized subagency IDs
 */
export async function getAuthorizedSubagencyIds(contactId: string): Promise<string[]> {
  const scope = await getUserAgencyScope(contactId);
  return scope.subagencyId.in;
}

/**
 * Check if a user is authorized to access a specific subagency.
 *
 * @param contactId - The database contact ID
 * @param subagencyId - The subagency ID to check
 * @returns true if user has access, false otherwise
 */
export async function isAuthorizedForSubagency(
  contactId: string,
  subagencyId: string
): Promise<boolean> {
  const authorizedIds = await getAuthorizedSubagencyIds(contactId);
  return authorizedIds.includes(subagencyId);
}

/**
 * Check if a user has any agency access at all.
 * Users without any agency access should see no NDAs.
 *
 * @param contactId - The database contact ID
 * @returns true if user has at least one agency grant
 */
export async function hasAnyAgencyAccess(contactId: string): Promise<boolean> {
  const authorizedIds = await getAuthorizedSubagencyIds(contactId);
  return authorizedIds.length > 0;
}

/**
 * Apply agency scope to a base Prisma where clause.
 * This is a convenience function for building scoped queries.
 *
 * @param baseWhere - The base where clause
 * @param scope - The agency scope from getUserAgencyScope
 * @returns Combined where clause with agency scope applied
 *
 * @example
 * const scope = await getUserAgencyScope(contactId);
 * const where = applyAgencyScope({ status: 'draft' }, scope);
 * const ndas = await prisma.nda.findMany({ where });
 */
export function applyAgencyScope<T extends Record<string, unknown>>(
  baseWhere: T,
  scope: AgencyScope
): T & AgencyScope {
  return {
    ...baseWhere,
    ...scope,
  };
}

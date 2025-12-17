/**
 * User Context Service
 * Story 1.2: JWT Middleware & User Context
 *
 * Loads and caches user context including:
 * - Contact record from database
 * - Aggregated permissions from roles
 * - Agency access grants (groups and subagencies)
 *
 * AC4: User's permissions and agency access are loaded from database
 */

import prisma from '../db/index.js';
import type { UserContext } from '../types/auth.js';
import { ROLE_NAMES } from '../types/auth.js';

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

interface CachedContext {
  context: UserContext;
  expires: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const userContextCache = new Map<string, CachedContext>();

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Load complete user context by Cognito ID
 *
 * @param cognitoId - The Cognito sub claim from JWT
 * @returns UserContext or null if user not found
 */
export async function loadUserContext(cognitoId: string): Promise<UserContext | null> {
  // Check cache first
  const cached = getCachedContext(cognitoId);
  if (cached) {
    return cached;
  }

  // Load from database
  const contact = await prisma.contact.findUnique({
    where: { cognitoId },
    include: {
      contactRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      agencyGroupGrants: {
        include: {
          agencyGroup: {
            include: {
              subagencies: {
                select: { id: true },
              },
            },
          },
        },
      },
      subagencyGrants: {
        select: { subagencyId: true },
      },
    },
  });

  if (!contact) {
    return null;
  }

  // Aggregate permissions from all roles
  const permissions = new Set<string>();
  const roles: string[] = [];

  for (const contactRole of contact.contactRoles) {
    roles.push(contactRole.role.name);
    for (const rolePermission of contactRole.role.rolePermissions) {
      permissions.add(rolePermission.permission.code);
    }
  }

  // Aggregate agency access
  const authorizedAgencyGroups = contact.agencyGroupGrants.map((g) => g.agencyGroupId);
  const authorizedSubagencies = contact.subagencyGrants.map((g) => g.subagencyId);

  // Build full user context
  const userContext: UserContext = {
    id: cognitoId,
    email: contact.email,
    contactId: contact.id,
    name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || undefined,
    permissions,
    roles,
    authorizedAgencyGroups,
    authorizedSubagencies,
  };

  // Cache the result
  setCachedContext(cognitoId, userContext);

  return userContext;
}

/**
 * Load user context by contact ID (database UUID)
 *
 * @param contactId - Database contact ID
 * @returns UserContext or null if user not found
 */
export async function loadUserContextByContactId(contactId: string): Promise<UserContext | null> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { cognitoId: true },
  });

  if (!contact) {
    return null;
  }

  return loadUserContext(contact.cognitoId);
}

/**
 * Create a new contact record for first-time login
 * When a user authenticates via Cognito but doesn't exist in database
 *
 * @param cognitoId - Cognito sub claim
 * @param email - User's email
 * @returns The created user context
 */
export async function createContactForFirstLogin(
  cognitoId: string,
  email: string
): Promise<UserContext> {
  // Find the Read-Only role (default for new users)
  const readOnlyRole = await prisma.role.findUnique({
    where: { name: ROLE_NAMES.READ_ONLY },
  });

  // Create contact with default Read-Only role
  const contact = await prisma.contact.create({
    data: {
      cognitoId,
      email,
      contactRoles: readOnlyRole
        ? {
            create: {
              roleId: readOnlyRole.id,
            },
          }
        : undefined,
    },
    include: {
      contactRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  // Build permissions from default role
  const permissions = new Set<string>();
  const roles: string[] = [];

  for (const contactRole of contact.contactRoles) {
    roles.push(contactRole.role.name);
    for (const rolePermission of contactRole.role.rolePermissions) {
      permissions.add(rolePermission.permission.code);
    }
  }

  const userContext: UserContext = {
    id: cognitoId,
    email,
    contactId: contact.id,
    permissions,
    roles,
    authorizedAgencyGroups: [],
    authorizedSubagencies: [],
  };

  // Cache the new context
  setCachedContext(cognitoId, userContext);

  return userContext;
}

/**
 * Get the computed agency scope (authorized subagency IDs)
 * This is used for row-level security filtering in Story 1.4
 *
 * @param userId - Either Cognito ID or contact ID
 * @returns Array of authorized subagency IDs
 */
export async function getAuthorizedSubagencyIds(userId: string): Promise<string[]> {
  // Try to get from cache first
  const cached = getCachedContext(userId);
  if (cached) {
    // Combine direct subagency access with expanded agency group access
    const directSubagencies = cached.authorizedSubagencies;

    // Get all subagencies from authorized agency groups
    const groupSubagencies = await prisma.subagency.findMany({
      where: {
        agencyGroupId: { in: cached.authorizedAgencyGroups },
      },
      select: { id: true },
    });

    const allSubagencyIds = new Set([
      ...directSubagencies,
      ...groupSubagencies.map((s) => s.id),
    ]);

    return Array.from(allSubagencyIds);
  }

  // Load fresh context and get subagencies
  const context = await loadUserContext(userId);
  if (!context) {
    return [];
  }

  // Get all subagencies from authorized agency groups
  const groupSubagencies = await prisma.subagency.findMany({
    where: {
      agencyGroupId: { in: context.authorizedAgencyGroups },
    },
    select: { id: true },
  });

  const allSubagencyIds = new Set([
    ...context.authorizedSubagencies,
    ...groupSubagencies.map((s) => s.id),
  ]);

  return Array.from(allSubagencyIds);
}

/**
 * Invalidate cached user context
 * Call this when user's roles or permissions change
 *
 * @param cognitoId - The Cognito ID to invalidate
 */
export function invalidateUserContext(cognitoId: string): void {
  userContextCache.delete(cognitoId);
}

/**
 * Clear all cached user contexts
 * Useful for testing or when doing bulk permission changes
 */
export function clearAllUserContextCache(): void {
  userContextCache.clear();
}

// =============================================================================
// CACHE HELPERS
// =============================================================================

function getCachedContext(cognitoId: string): UserContext | null {
  const cached = userContextCache.get(cognitoId);
  if (cached && cached.expires > Date.now()) {
    return cached.context;
  }
  // Expired or not found - remove from cache
  if (cached) {
    userContextCache.delete(cognitoId);
  }
  return null;
}

function setCachedContext(cognitoId: string, context: UserContext): void {
  userContextCache.set(cognitoId, {
    context,
    expires: Date.now() + CACHE_TTL_MS,
  });
}

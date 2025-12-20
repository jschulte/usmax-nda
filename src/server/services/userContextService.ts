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
import { PERMISSIONS } from '../constants/permissions.js';

// =============================================================================
// MOCK MODE DETECTION
// =============================================================================

// Use pure mock mode only when no DATABASE_URL is set
// If DATABASE_URL is set, always query the database (even with USE_MOCK_AUTH)
const useMockMode = !process.env.DATABASE_URL;

// Mock user data for development without database
const MOCK_USERS: Record<string, UserContext> = {
  'mock-user-001': {
    id: 'mock-user-001',
    email: 'admin@usmax.com',
    contactId: 'mock-contact-001',
    name: 'Admin User',
    active: true,
    permissions: new Set(Object.values(PERMISSIONS)),
    roles: [ROLE_NAMES.ADMIN],
    authorizedAgencyGroups: ['mock-agency-1', 'mock-agency-2'],
    authorizedSubagencies: ['mock-subagency-1'],
  },
  'mock-user-002': {
    id: 'mock-user-002',
    email: 'test@usmax.com',
    contactId: 'mock-contact-002',
    name: 'Test User',
    active: true,
    permissions: new Set([
      PERMISSIONS.NDA_VIEW,
      PERMISSIONS.NDA_CREATE,
      PERMISSIONS.NDA_UPDATE,
    ]),
    roles: [ROLE_NAMES.NDA_USER],
    authorizedAgencyGroups: ['mock-agency-1'],
    authorizedSubagencies: [],
  },
};

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

interface CachedContext {
  context: UserContext;
  expires: number;
}

interface CachedScope {
  ids: string[];
  expires: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const userContextCache = new Map<string, CachedContext>();
const agencyScopeCache = new Map<string, CachedScope>();
const contactIdCache = new Map<string, string>();

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

  // In mock mode, return mock user data
  if (useMockMode) {
    const mockUser = MOCK_USERS[cognitoId];
    if (mockUser) {
      setCachedContext(cognitoId, mockUser);
      contactIdCache.set(mockUser.contactId, cognitoId);
      return mockUser;
    }
    // For any unrecognized user in mock mode, create a default context
    const defaultMockUser: UserContext = {
      id: cognitoId,
      email: 'unknown@usmax.com',
      contactId: `mock-contact-${cognitoId}`,
      name: 'Unknown User',
      active: true,
      permissions: new Set([PERMISSIONS.NDA_VIEW]),
      roles: [ROLE_NAMES.READ_ONLY],
      authorizedAgencyGroups: [],
      authorizedSubagencies: [],
    };
    setCachedContext(cognitoId, defaultMockUser);
    contactIdCache.set(defaultMockUser.contactId, cognitoId);
    return defaultMockUser;
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
    active: contact.active,
    permissions,
    roles,
    authorizedAgencyGroups,
    authorizedSubagencies,
  };

  // Cache the result
  setCachedContext(cognitoId, userContext);
  contactIdCache.set(userContext.contactId, cognitoId);

  return userContext;
}

/**
 * Load user context by contact ID (database UUID)
 *
 * @param contactId - Database contact ID
 * @returns UserContext or null if user not found
 */
export async function loadUserContextByContactId(contactId: string): Promise<UserContext | null> {
  const cachedCognitoId = contactIdCache.get(contactId);
  if (cachedCognitoId) {
    return loadUserContext(cachedCognitoId);
  }

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { cognitoId: true },
  });

  if (!contact || !contact.cognitoId) {
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
  // In mock mode, create a mock user context
  if (useMockMode) {
    const mockContext: UserContext = {
      id: cognitoId,
      email,
      contactId: `mock-contact-${Date.now()}`,
      name: email.split('@')[0],
      active: true,
      permissions: new Set(['nda:view']),
      roles: ['Read-Only'],
      authorizedAgencyGroups: [],
      authorizedSubagencies: [],
    };
    setCachedContext(cognitoId, mockContext);
    contactIdCache.set(mockContext.contactId, cognitoId);
    return mockContext;
  }

  // Find the Read-Only role (default for new users)
  const readOnlyRole = await prisma.role.findUnique({
    where: { name: ROLE_NAMES.READ_ONLY },
  });

  if (!readOnlyRole) {
    throw new Error('Default role not found: Read-Only');
  }

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
    active: contact.active,
    permissions,
    roles,
    authorizedAgencyGroups: [],
    authorizedSubagencies: [],
  };

  // Cache the new context
  setCachedContext(cognitoId, userContext);
  contactIdCache.set(userContext.contactId, cognitoId);

  return userContext;
}

/**
 * Get the computed agency scope (authorized subagency IDs)
 * This is used for row-level security filtering in Story 1.4
 *
 * @param userId - Either Cognito ID or contact ID
 * @returns Array of authorized subagency IDs
 */
export async function getAuthorizedSubagencyIds(cognitoId: string): Promise<string[]> {
  const cachedScope = getCachedScope(cognitoId);
  if (cachedScope) {
    return cachedScope.ids;
  }

  const context = await loadUserContext(cognitoId);
  if (!context) {
    return [];
  }

  const directSubagencies = context.authorizedSubagencies || [];

  // In mock mode, skip database expansion
  if (useMockMode) {
    const deduped = Array.from(new Set(directSubagencies));
    setCachedScope(cognitoId, deduped);
    return deduped;
  }

  const groupSubagencies = await prisma.subagency.findMany({
    where: {
      agencyGroupId: { in: context.authorizedAgencyGroups },
    },
    select: { id: true },
  });

  const allSubagencyIds = new Set([
    ...directSubagencies,
    ...groupSubagencies.map((s) => s.id),
  ]);

  const expanded = Array.from(allSubagencyIds);
  setCachedScope(cognitoId, expanded);

  return expanded;
}

/**
 * Get authorized subagency IDs using a contact ID (UUID)
 * Reuses the user context cache for TTL behavior.
 */
export async function getAuthorizedSubagencyIdsByContactId(contactId: string): Promise<string[]> {
  const cachedCognitoId = contactIdCache.get(contactId);
  if (cachedCognitoId) {
    return getAuthorizedSubagencyIds(cachedCognitoId);
  }

  if (useMockMode) {
    // In mock mode, there may not be a database contact record
    return [];
  }

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { cognitoId: true },
  });

  if (!contact?.cognitoId) {
    return [];
  }

  return getAuthorizedSubagencyIds(contact.cognitoId);
}

/**
 * Invalidate cached user context
 * Call this when user's roles or permissions change
 *
 * @param cognitoId - The Cognito ID to invalidate
 */
export function invalidateUserContext(cognitoId: string): void {
  userContextCache.delete(cognitoId);
  agencyScopeCache.delete(cognitoId);
  // Best-effort cleanup for reverse lookup
  for (const [contactId, cachedCognitoId] of contactIdCache.entries()) {
    if (cachedCognitoId === cognitoId) {
      contactIdCache.delete(contactId);
    }
  }
}

/**
 * Clear all cached user contexts
 * Useful for testing or when doing bulk permission changes
 */
export function clearAllUserContextCache(): void {
  userContextCache.clear();
  agencyScopeCache.clear();
  contactIdCache.clear();
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
  contactIdCache.set(context.contactId, cognitoId);
}

function getCachedScope(cognitoId: string): CachedScope | null {
  const cached = agencyScopeCache.get(cognitoId);
  if (cached && cached.expires > Date.now()) {
    return cached;
  }
  if (cached) {
    agencyScopeCache.delete(cognitoId);
  }
  return null;
}

function setCachedScope(cognitoId: string, ids: string[]): void {
  agencyScopeCache.set(cognitoId, {
    ids,
    expires: Date.now() + CACHE_TTL_MS,
  });
}

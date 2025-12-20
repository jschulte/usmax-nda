/**
 * Scoped Query Utilities
 * Story 1.4: Row-Level Security Implementation
 *
 * Provides query wrappers that enforce row-level security for NDA access.
 * These helpers implement the 404 pattern for unauthorized access (AC3).
 *
 * IMPORTANT: Use these helpers for all NDA single-record queries
 * to ensure proper security and audit logging.
 */

import { prisma } from '../db/index.js';
import { scopeNDAsToUser, type AgencyScope } from '../services/agencyScopeService.js';
import type { UserContext } from '../types/auth.js';
import { auditService, AuditAction } from '../services/auditService.js';

/**
 * Find an NDA by ID with agency scope applied.
 * Returns null if NDA doesn't exist OR user is not authorized.
 * This implements the 404 pattern (AC3) - no information leakage.
 *
 * @param ndaId - The NDA ID to find
 * @param userContext - The user's context
 * @param options - Optional include/select configuration
 * @returns The NDA if found and authorized, null otherwise
 *
 * @example
 * const nda = await findNdaWithScope(req.params.id, req.userContext);
 * if (!nda) {
 *   return res.status(404).json({ error: 'NDA not found', code: 'NOT_FOUND' });
 * }
 * res.json(nda);
 */
export async function findNdaWithScope(
  ndaId: string,
  userContext: UserContext,
  options?: {
    include?: Record<string, boolean | object>;
    select?: Record<string, boolean | object>;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<any | null> {
  const scope = await scopeNDAsToUser(userContext);

  // Query with both ID and agency scope
  const nda = await prisma.nda.findFirst({
    where: {
      id: ndaId,
      ...scope,
    },
    ...(options?.include && { include: options.include }),
    ...(options?.select && { select: options.select }),
  });

  // If not found via scoped query, check if it exists at all (for audit)
  if (!nda && 'subagencyId' in scope) {
    await logUnauthorizedAccessIfExists(ndaId, userContext.contactId, scope, options);
  }

  return nda;
}

/**
 * Check if an NDA exists and log unauthorized access attempt if so.
 * This is called silently when a scoped query returns null.
 */
async function logUnauthorizedAccessIfExists(
  ndaId: string,
  contactId: string,
  scope: AgencyScope,
  options?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  try {
    // Check if NDA actually exists (without scope)
    const exists = await prisma.nda.findUnique({
      where: { id: ndaId },
      select: { id: true, subagencyId: true },
    });

    if (exists) {
      // NDA exists but user not authorized - log for security review
      await auditService.log({
        action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
        entityType: 'nda',
        entityId: ndaId,
        userId: contactId,
        details: {
          attemptedSubagency: exists.subagencyId,
          userAuthorizedSubagencies: scope.subagencyId.in,
        },
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });
    }
    // If NDA doesn't exist, no need to log - it's a genuine 404
  } catch (error) {
    // Silently fail - don't expose errors
    console.error('[ScopedQuery] Error logging unauthorized access:', error);
  }
}

/**
 * Find multiple NDAs with agency scope applied.
 * Convenience wrapper that ensures scope is always applied.
 *
 * @param userContext - The user's context
 * @param where - Additional where conditions
 * @param options - Prisma findMany options
 * @returns Array of authorized NDAs
 */
export async function findManyNdasWithScope(
  userContext: UserContext,
  where?: Record<string, unknown>,
  options?: {
    include?: Record<string, boolean | object>;
    orderBy?: Record<string, 'asc' | 'desc'>;
    take?: number;
    skip?: number;
  }
): Promise<any[]> {
  const scope = await scopeNDAsToUser(userContext);

  return prisma.nda.findMany({
    where: {
      ...where,
      ...scope,
    },
    ...(options?.include && { include: options.include }),
    ...(options?.orderBy && { orderBy: options.orderBy }),
    ...(options?.take && { take: options.take }),
    ...(options?.skip && { skip: options.skip }),
  });
}

/**
 * Count NDAs with agency scope applied.
 *
 * @param userContext - The user's context
 * @param where - Additional where conditions
 * @returns Count of authorized NDAs matching criteria
 */
export async function countNdasWithScope(
  userContext: UserContext,
  where?: Record<string, unknown>
): Promise<number> {
  const scope = await scopeNDAsToUser(userContext);

  return prisma.nda.count({
    where: {
      ...where,
      ...scope,
    },
  });
}

/**
 * Check if a user is authorized to access a specific NDA.
 * Use this for pre-flight authorization checks.
 *
 * @param ndaId - The NDA ID to check
 * @param userContext - The user's context
 * @returns true if user is authorized, false otherwise
 */
export async function isAuthorizedForNda(
  ndaId: string,
  userContext: UserContext
): Promise<boolean> {
  const nda = await findNdaWithScope(ndaId, userContext);
  return nda !== null;
}

/**
 * Get an NDA's subagency ID for authorization checks.
 * Returns null if NDA doesn't exist.
 *
 * @param ndaId - The NDA ID
 * @returns The subagency ID or null
 */
export async function getNdaSubagencyId(ndaId: string): Promise<string | null> {
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    select: { subagencyId: true },
  });
  return nda?.subagencyId ?? null;
}

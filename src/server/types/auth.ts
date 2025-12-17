/**
 * Authentication & Authorization Types
 * Story 1.2: JWT Middleware & User Context
 *
 * Defines TypeScript interfaces for user context and extends Express Request type.
 */

/**
 * UserContext contains all information about the authenticated user
 * This is populated by the attachUserContext middleware after JWT validation
 */
export interface UserContext {
  /** Cognito sub (user identifier from JWT) */
  id: string;

  /** User's email address (from JWT) */
  email: string;

  /** Database contact ID (UUID) */
  contactId: string;

  /** User's full name (optional) */
  name?: string;

  /** Set of permission codes the user has (aggregated from all roles) */
  permissions: Set<string>;

  /** Array of role names assigned to user */
  roles: string[];

  /** Array of agency group IDs user has access to */
  authorizedAgencyGroups: string[];

  /** Array of subagency IDs user has direct access to */
  authorizedSubagencies: string[];
}

/**
 * Minimal user info from JWT validation (before context loading)
 * Used by authenticateJWT middleware
 */
export interface JWTUser {
  id: string;
  email: string;
}

// Extend Express Request type to include user context
declare global {
  namespace Express {
    interface Request {
      /** User info from JWT (set by authenticateJWT) */
      user?: JWTUser;

      /** Full user context (set by attachUserContext) */
      userContext?: UserContext;

      /** Agency scope for row-level security (set by scopeToAgencies - Story 1.4) */
      agencyScope?: { subagencyId: { in: string[] } };
    }
  }
}

/**
 * Default role names as constants
 */
export const ROLE_NAMES = {
  ADMIN: 'Admin',
  NDA_USER: 'NDA User',
  LIMITED_USER: 'Limited User',
  READ_ONLY: 'Read-Only',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

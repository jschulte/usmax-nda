/**
 * useAuth Hook
 * Story 1.1: AWS Cognito MFA Integration
 * Task 5.4: Add `useAuthContext` hook for React components
 *
 * Re-exports the useAuth hook from AuthContext for convenience.
 */

export { useAuth } from '../contexts/AuthContext';
export type { AuthContextType, User, MFAChallenge } from '../contexts/AuthContext';

/**
 * usePermissions Hook
 * Story H-1: Gap Analysis Hardening - Epic 1 Auth Fixes
 *
 * Re-exports the usePermissions hook for convenience.
 * See usePermissions.ts for full documentation and examples.
 */
export { usePermissions, PERMISSIONS, ROLE_NAMES } from './usePermissions';
export type { PermissionCode, RoleName, UsePermissionsReturn } from './usePermissions';

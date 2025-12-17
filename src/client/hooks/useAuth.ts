/**
 * useAuth Hook
 * Story 1.1: AWS Cognito MFA Integration
 * Task 5.4: Add `useAuthContext` hook for React components
 *
 * Re-exports the useAuth hook from AuthContext for convenience.
 */

export { useAuth } from '../contexts/AuthContext';
export type { AuthContextType, User, MFAChallenge } from '../contexts/AuthContext';

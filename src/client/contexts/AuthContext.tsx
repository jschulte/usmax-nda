/**
 * Authentication Context
 * Story 1.1: AWS Cognito MFA Integration
 *
 * Provides authentication state and methods to all React components.
 * Handles:
 * - Login flow with MFA
 * - Session management
 * - Token refresh
 * - Logout
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { resetAppStore } from '../stores/appStore';

// Types
export interface User {
  id: string;
  email: string;
}

export interface MFAChallenge {
  challengeName: string;
  session: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiresAt: number | null;
  csrfToken: string | null;
  login: (email: string, password: string) => Promise<MFAChallenge>;
  verifyMFA: (session: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Session warning state (managed by SessionWarningModal component)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Set up automatic token refresh
  useEffect(() => {
    if (user && sessionExpiresAt) {
      // Refresh token 5 minutes before expiry
      const refreshTime = sessionExpiresAt - Date.now() - 5 * 60 * 1000;

      if (refreshTime > 0) {
        refreshIntervalRef.current = setInterval(() => {
          refreshSession();
        }, Math.min(refreshTime, 30 * 60 * 1000)); // Max 30 min interval
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [user, sessionExpiresAt]);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSessionExpiresAt(data.expiresAt ?? null);
        setCsrfToken(data.csrfToken ?? null);
      } else {
        setUser(null);
        setSessionExpiresAt(null);
        setCsrfToken(null);
      }
    } catch {
      setUser(null);
      setSessionExpiresAt(null);
      setCsrfToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string): Promise<MFAChallenge> => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Should return MFA challenge (MFA is always required)
      return {
        challengeName: data.challengeName,
        session: data.session,
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyMFA = useCallback(async (session: string, code: string): Promise<void> => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/mfa-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session, mfaCode: code }),
      });

      const data = await response.json();

      if (!response.ok) {
        const err = new Error(data.error || 'Invalid MFA code') as Error & { attemptsRemaining?: number };
        err.attemptsRemaining = data.attemptsRemaining;
        throw err;
      }

      setUser(data.user);
      setSessionExpiresAt(data.expiresAt);
      setCsrfToken(data.csrfToken ?? null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
        credentials: 'include',
      });
    } catch {
      // Ignore errors, we're logging out anyway
    } finally {
      setUser(null);
      setSessionExpiresAt(null);
      setCsrfToken(null);
      setError(null);
      setIsLoading(false);
      // AC5: Reset Zustand store on logout (Task 5.6)
      resetAppStore();
    }
  }, [csrfToken]);

  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSessionExpiresAt(data.expiresAt);
        setCsrfToken(data.csrfToken ?? csrfToken);
      } else {
        // Session expired, force logout
        setUser(null);
        setSessionExpiresAt(null);
        setCsrfToken(null);
      }
    } catch {
      // Network error, don't force logout yet
      console.error('Failed to refresh session');
    }
  }, [csrfToken]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    sessionExpiresAt,
    csrfToken,
    login,
    verifyMFA,
    logout,
    refreshSession,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

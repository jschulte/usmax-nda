/**
 * MFA Challenge Page Component
 * Story 1.1: AWS Cognito MFA Integration
 * Task 4.2: Create `MFAChallengePage` component for code entry
 *
 * AC1: Successful MFA flow - redirect to dashboard
 * AC2: Invalid MFA code handling - retry up to 3 times
 * Task 4.6: Implement retry counter display
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, AlertCircle, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface LocationState {
  session: string;
  email: string;
}

export function MFAChallengePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyMFA, isLoading, error, clearError } = useAuth();

  const [mfaCode, setMfaCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Get session from navigation state
  const state = location.state as LocationState | null;
  const session = state?.session;
  const email = state?.email;

  // Redirect to login if no session
  useEffect(() => {
    if (!session) {
      navigate('/login', { replace: true });
    }
  }, [session, navigate]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!session || mfaCode.length !== 6) return;

    try {
      await verifyMFA(session, mfaCode);
      // AC1: Redirect to dashboard on success
      navigate('/', { replace: true });
    } catch (err: any) {
      // AC2: Use attemptsRemaining from server response when available
      if (typeof err.attemptsRemaining === 'number') {
        setAttemptsRemaining(err.attemptsRemaining);
      }
      setLocalError(err.message || 'Invalid MFA code, please try again');
      setMfaCode('');
      inputRef.current?.focus();
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 6 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setMfaCode(value);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);
    setMfaCode(digits);
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const displayError = localError || error;
  const canSubmit = mfaCode.length === 6 && !isLoading;

  if (!session) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
            {email && (
              <span className="block mt-1 text-xs">
                Authenticating as <strong>{email}</strong>
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Error display with retry counter (AC2, Task 4.4, 4.6) */}
            {displayError && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <div>
                  <span>{displayError}</span>
                  {attemptsRemaining !== null && attemptsRemaining > 0 && (
                    <span className="block text-xs mt-1">
                      {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before lockout
                    </span>
                  )}
                  {attemptsRemaining === 0 && (
                    <span className="block text-xs mt-1 font-medium">
                      Account temporarily locked. Please wait 5 minutes.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* MFA code input (Accessibility: accepts paste per Section 508) */}
            <div className="space-y-2">
              <label
                htmlFor="mfaCode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Authentication Code
              </label>
              <Input
                ref={inputRef}
                id="mfaCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={mfaCode}
                onChange={handleCodeChange}
                onPaste={handlePaste}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                autoComplete="one-time-code"
                aria-label="6-digit authentication code"
                aria-describedby="mfa-help"
                disabled={isLoading || attemptsRemaining === 0}
                required
              />
              <p id="mfa-help" className="text-xs text-muted-foreground">
                Open your authenticator app (Google Authenticator, Authy, etc.) and enter the code shown for USmax.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            {/* Submit button (Task 4.5: Loading states) */}
            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit || attemptsRemaining === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Verify Code
                </>
              )}
            </Button>

            {/* Back to login */}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleBackToLogin}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Development mode indicator */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 bg-yellow-500/90 text-yellow-950 text-xs px-3 py-1 rounded-full">
          Dev Mode: MFA code is 123456
        </div>
      )}
    </div>
  );
}

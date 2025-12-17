/**
 * Login Page Component
 * Story 1.1: AWS Cognito MFA Integration
 * Task 4.1: Create `LoginPage` component with email/password form
 *
 * AC1: Successful MFA Authentication Flow
 * AC2: Invalid credentials handling
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader2, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Form validation
  const isValidEmail = email.includes('@') && email.includes('.');
  const isValidPassword = password.length >= 12;
  const canSubmit = isValidEmail && isValidPassword && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!canSubmit) return;

    try {
      const challenge = await login(email, password);

      // Navigate to MFA challenge page with session data
      navigate('/mfa-challenge', {
        state: {
          session: challenge.session,
          email,
        },
      });
    } catch (err: any) {
      setLocalError(err.message || 'Login failed');
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">USMax NDA System</CardTitle>
          <CardDescription>
            Sign in with your USMax credentials
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Error display (AC2: Invalid credentials handling) */}
            {displayError && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{displayError}</span>
              </div>
            )}

            {/* Email field (Task 4.3: Form validation) */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@usmax.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                  aria-label="Email address"
                  aria-invalid={email.length > 0 && !isValidEmail}
                  disabled={isLoading}
                  required
                />
              </div>
              {email.length > 0 && !isValidEmail && (
                <p className="text-xs text-destructive" role="alert">
                  Please enter a valid email address
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  autoComplete="current-password"
                  aria-label="Password"
                  aria-invalid={password.length > 0 && !isValidPassword}
                  disabled={isLoading}
                  required
                />
              </div>
              {password.length > 0 && !isValidPassword && (
                <p className="text-xs text-destructive" role="alert">
                  Password must be at least 12 characters
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            {/* Submit button (Task 4.5: Loading states) */}
            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* MFA info */}
            <p className="text-xs text-center text-muted-foreground">
              Multi-factor authentication is required for all users.
              <br />
              You will be prompted for your MFA code after signing in.
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Development mode indicator */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 bg-yellow-500/90 text-yellow-950 text-xs px-3 py-1 rounded-full">
          Dev Mode: admin@usmax.com / Admin123!@#$ (MFA: 123456)
        </div>
      )}
    </div>
  );
}

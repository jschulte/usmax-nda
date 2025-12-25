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
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
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
          <div className="mx-auto mb-4 flex justify-center">
            <img
              src="https://www.usmax.com/wp-content/themes/usmax/static/images/usmax-site-logo.jpg"
              alt="USmax"
              className="h-16 w-auto object-contain"
              onError={(e) => {
                // Fallback to Shield icon if logo fails to load
                const target = e.currentTarget;
                target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center';
                fallback.innerHTML = '<svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>';
                target.parentElement?.appendChild(fallback);
              }}
            />
          </div>
          <CardTitle className="text-2xl font-bold">USmax NDA Management System</CardTitle>
          <CardDescription>
            Sign in with your USmax credentials
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

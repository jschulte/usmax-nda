/**
 * Session Warning Modal
 * Story 1.1: AWS Cognito MFA Integration
 * Task 5.1: Create session timeout warning modal (5-min countdown)
 *
 * AC3: Session Timeout with Warning
 * - Shows modal when session is 5 minutes from expiring
 * - Allows user to extend session
 * - Auto-logouts if no action taken
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';

// Warning appears 5 minutes before session expires
const WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function SessionWarningModal() {
  const { sessionExpiresAt, refreshSession, logout, isAuthenticated } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate time remaining and show/hide modal
  const updateTimeRemaining = useCallback(() => {
    if (!sessionExpiresAt || !isAuthenticated) {
      setIsOpen(false);
      return;
    }

    const remaining = sessionExpiresAt - Date.now();

    if (remaining <= 0) {
      // Session expired, logout
      logout();
      setIsOpen(false);
      return;
    }

    if (remaining <= WARNING_THRESHOLD_MS) {
      // Within warning threshold, show modal
      setIsOpen(true);
      setTimeRemaining(remaining);
    } else {
      // Not in warning zone yet
      setIsOpen(false);
    }
  }, [sessionExpiresAt, isAuthenticated, logout]);

  // Update countdown every second
  useEffect(() => {
    if (!sessionExpiresAt || !isAuthenticated) return;

    // Initial check
    updateTimeRemaining();

    // Set up interval
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [sessionExpiresAt, isAuthenticated, updateTimeRemaining]);

  // Handle extend session (Task 5.2)
  const handleExtendSession = async () => {
    setIsRefreshing(true);
    try {
      await refreshSession();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to extend session:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  // Format time remaining as MM:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="sm:max-w-md"
        // AC3: Modal must trap focus (Accessibility - Section 508)
        onEscapeKeyDown={(e) => e.preventDefault()} // Prevent closing with Escape
        onPointerDownOutside={(e) => e.preventDefault()} // Prevent closing by clicking outside
      >
        <DialogHeader>
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <DialogTitle className="text-center">Session Expiring Soon</DialogTitle>
          <DialogDescription className="text-center">
            Your session will expire in <strong className="text-foreground">{formatTime(timeRemaining)}</strong>.
            <br />
            Save your work and extend your session to continue.
          </DialogDescription>
        </DialogHeader>

        {/* Countdown display */}
        <div className="flex justify-center py-4">
          <div className="text-4xl font-mono font-bold text-yellow-600">
            {formatTime(timeRemaining)}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout Now
          </Button>
          <Button
            onClick={handleExtendSession}
            disabled={isRefreshing}
            className="w-full sm:w-auto"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Extending...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Extend Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

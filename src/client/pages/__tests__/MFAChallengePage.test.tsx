/**
 * Component Tests for MFAChallengePage
 * Story 1.1: AWS Cognito MFA Integration
 * Task 10.4: Component tests for MFAChallengePage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MFAChallengePage } from '../MFAChallengePage';
import * as useAuthModule from '../../hooks/useAuth';

// Mock useAuth hook
const mockVerifyMFA = vi.fn();
const mockClearError = vi.fn();
const mockNavigate = vi.hoisted(() => vi.fn());
const mockLocationState = vi.hoisted(() => ({
  state: { session: 'test-session', email: 'admin@usmax.com' } as { session: string; email: string } | null,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState.state }),
  };
});

const renderMFAPage = (locationState?: { session: string; email: string } | null) => {
  if (locationState === undefined) {
    mockLocationState.state = { session: 'test-session', email: 'admin@usmax.com' };
  } else {
    mockLocationState.state = locationState;
  }
  return render(<MFAChallengePage />);
};

describe('MFAChallengePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      verifyMFA: mockVerifyMFA,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    } as any);
  });

  describe('Rendering', () => {
    it('should render MFA code input field', () => {
      renderMFAPage();

      expect(screen.getByLabelText(/authentication code/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument();
    });

    it('should show user email in instructions', () => {
      renderMFAPage();

      expect(screen.getByText(/admin@usmax\.com/i)).toBeInTheDocument();
    });

    it('should redirect to login if no session provided', () => {
      renderMFAPage(null);

      return waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });
  });

  describe('Form Validation (React Hook Form + Zod)', () => {
    it('should show error for non-numeric MFA code', async () => {
      const user = userEvent.setup();
      renderMFAPage();

      const codeInput = screen.getByLabelText(/authentication code/i);
      await user.type(codeInput, 'abcdef');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/6-digit code/i, { selector: 'p[role=\"alert\"]' })).toBeInTheDocument();
      });
    });

    it('should show error for MFA code shorter than 6 digits', async () => {
      const user = userEvent.setup();
      renderMFAPage();

      const codeInput = screen.getByLabelText(/authentication code/i);
      await user.type(codeInput, '123');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/6-digit code/i, { selector: 'p[role=\"alert\"]' })).toBeInTheDocument();
      });
    });

    it('should accept valid 6-digit code', async () => {
      const user = userEvent.setup();
      renderMFAPage();

      const codeInput = screen.getByLabelText(/authentication code/i);
      await user.type(codeInput, '123456');

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /verify/i });
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Submit Handling', () => {
    it('should call verifyMFA with correct parameters', async () => {
      const user = userEvent.setup();
      mockVerifyMFA.mockResolvedValue({ success: true });

      renderMFAPage();

      await user.type(screen.getByLabelText(/authentication code/i), '123456');
      await user.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(mockVerifyMFA).toHaveBeenCalledWith('test-session', '123456');
      });
    });

    it('should navigate to dashboard on successful verification', async () => {
      const user = userEvent.setup();
      mockVerifyMFA.mockResolvedValue({ success: true });

      renderMFAPage();

      await user.type(screen.getByLabelText(/authentication code/i), '123456');
      await user.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(mockVerifyMFA).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });
  });

  describe('Retry Counter (AC2: Show retry counter)', () => {
    it('should show remaining attempts after failed verification', async () => {
      const user = userEvent.setup();
      mockVerifyMFA.mockRejectedValue({
        attemptsRemaining: 2,
        message: 'Invalid MFA code',
      });

      renderMFAPage();

      await user.type(screen.getByLabelText(/authentication code/i), '000000');
      await user.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByText(/2.*attempts? remaining/i)).toBeInTheDocument();
      });
    });

    it('should show lockout message after 3 failed attempts', async () => {
      const user = userEvent.setup();
      mockVerifyMFA.mockRejectedValue({
        attemptsRemaining: 0,
        message: 'Account temporarily locked',
      });

      renderMFAPage();

      await user.type(screen.getByLabelText(/authentication code/i), '999999');
      await user.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/account temporarily locked/i).length).toBeGreaterThan(0);
      });
    });

    it('should disable submit after account lockout', async () => {
      const user = userEvent.setup();
      mockVerifyMFA.mockRejectedValue({
        attemptsRemaining: 0,
        message: 'Account temporarily locked',
      });

      renderMFAPage();

      await user.type(screen.getByLabelText(/authentication code/i), '999999');
      await user.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /verify/i });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Error Display', () => {
    it('should display invalid code error', async () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        verifyMFA: mockVerifyMFA,
        isLoading: false,
        error: 'Invalid MFA code, please try again',
        clearError: mockClearError,
      } as any);

      renderMFAPage();

      expect(screen.getByText(/invalid mfa code/i)).toBeInTheDocument();
    });

    it('should clear error on submit', async () => {
      const user = userEvent.setup();
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        verifyMFA: mockVerifyMFA,
        isLoading: false,
        error: 'Invalid code',
        clearError: mockClearError,
      } as any);

      renderMFAPage();

      await user.type(screen.getByLabelText(/authentication code/i), '123456');
      await user.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator during verification', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        verifyMFA: mockVerifyMFA,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      } as any);

      renderMFAPage();

      expect(screen.getByRole('button', { name: /verifying/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verifying/i })).toBeDisabled();
    });

    it('should disable code input during verification', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        verifyMFA: mockVerifyMFA,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      } as any);

      renderMFAPage();

      expect(screen.getByLabelText(/authentication code/i)).toBeDisabled();
    });
  });

  describe('Back to Login', () => {
    it('should provide a button to return to login page', async () => {
      const user = userEvent.setup();
      renderMFAPage();

      const backButton = screen.getByRole('button', { name: /back to login/i });
      expect(backButton).toBeInTheDocument();
      await user.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Auto-focus', () => {
    it('should auto-focus MFA code input on mount', async () => {
      renderMFAPage();

      const codeInput = screen.getByLabelText(/authentication code/i);
      await waitFor(() => {
        expect(codeInput).toHaveFocus();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderMFAPage();

      expect(screen.getByLabelText(/authentication code/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/authentication code/i)).toHaveAttribute('inputmode', 'numeric');
    });

    it('should announce error to screen readers', async () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        verifyMFA: mockVerifyMFA,
        isLoading: false,
        error: 'Invalid code',
        clearError: mockClearError,
      } as any);

      renderMFAPage();

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveTextContent(/invalid code/i);
    });
  });
});

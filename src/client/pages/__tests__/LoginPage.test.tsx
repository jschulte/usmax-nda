/**
 * Component Tests for LoginPage
 * Story 1.1: AWS Cognito MFA Integration
 * Task 10.4: Component tests for LoginPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import * as useAuthModule from '../../hooks/useAuth';

// Mock useAuth hook
const mockLogin = vi.fn();
const mockClearError = vi.fn();

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    } as any);
  });

  describe('Rendering', () => {
    it('should render login form with email and password fields', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render USmax branding', () => {
      renderLoginPage();

      expect(
        screen.getByRole('heading', { name: /usmax nda management system/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/sign in with your usmax credentials/i)
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation (React Hook Form + Zod)', () => {
    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });
    });

    it('should show error for password less than 12 characters', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'short');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button when form is invalid', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Initially disabled (empty form)
      expect(submitButton).toBeDisabled();

      // Type invalid email
      await user.type(screen.getByLabelText(/email/i), 'invalid');

      // Still disabled
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should enable submit button when form is valid', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'admin@usmax.com');
      await user.type(screen.getByLabelText(/password/i), 'Admin123!@#$');

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /sign in/i });
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Submit Handling', () => {
    it('should call login function with correct credentials', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ challengeName: 'SOFTWARE_TOKEN_MFA', session: 'test-session' });

      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'admin@usmax.com');
      await user.type(screen.getByLabelText(/password/i), 'Admin123!@#$');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin@usmax.com', 'Admin123!@#$');
      });
    });

    it('should navigate to MFA page on successful login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ challengeName: 'SOFTWARE_TOKEN_MFA', session: 'test-session' });

      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@usmax.com');
      await user.type(screen.getByLabelText(/password/i), 'Test1234!@#$');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/mfa-challenge', {
          state: {
            session: 'test-session',
            email: 'test@usmax.com',
          },
        });
      });
    });
  });

  describe('Error Display', () => {
    it('should display authentication error message', async () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: 'Invalid credentials',
        clearError: mockClearError,
      } as any);

      renderLoginPage();

      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    it('should clear error on submit', async () => {
      const user = userEvent.setup();
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: 'Invalid credentials',
        clearError: mockClearError,
      } as any);

      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'admin@usmax.com');
      await user.type(screen.getByLabelText(/password/i), 'Admin123!@#$');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator during authentication', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        login: mockLogin,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      } as any);

      renderLoginPage();

      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });

    it('should disable form inputs during authentication', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        login: mockLogin,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      } as any);

      renderLoginPage();

      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText(/email/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/password/i)).toHaveFocus();
    });
  });
});

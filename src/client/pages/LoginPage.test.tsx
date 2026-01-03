/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const navigateMock = vi.fn();
const loginMock = vi.fn();
const clearErrorMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: loginMock,
    isLoading: false,
    error: null,
    clearError: clearErrorMock,
  }),
}));

import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    navigateMock.mockReset();
    clearErrorMock.mockReset();
  });

  it('submits valid credentials and navigates to MFA challenge', async () => {
    loginMock.mockResolvedValueOnce({ challengeName: 'SOFTWARE_TOKEN_MFA', session: 'session-123' });

    render(<LoginPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'admin@usmax.com');
    await user.type(screen.getByLabelText(/password/i), 'Admin123!@#$');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('admin@usmax.com', 'Admin123!@#$');
    });

    expect(navigateMock).toHaveBeenCalledWith('/mfa-challenge', {
      state: { session: 'session-123', email: 'admin@usmax.com' },
    });
  });

  it('shows validation errors for invalid inputs', async () => {
    render(<LoginPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'invalid');
    await user.type(screen.getByLabelText(/password/i), 'short');

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 12 characters')).toBeInTheDocument();
  });
});

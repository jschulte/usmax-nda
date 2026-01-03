/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const navigateMock = vi.fn();
const verifyMFAMock = vi.fn();
const clearErrorMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({
    state: { session: 'session-123', email: 'admin@usmax.com' },
  }),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    verifyMFA: verifyMFAMock,
    isLoading: false,
    error: null,
    clearError: clearErrorMock,
  }),
}));

import { MFAChallengePage } from './MFAChallengePage';

describe('MFAChallengePage', () => {
  beforeEach(() => {
    verifyMFAMock.mockReset();
    navigateMock.mockReset();
    clearErrorMock.mockReset();
  });

  it('submits a valid MFA code and navigates to dashboard', async () => {
    verifyMFAMock.mockResolvedValueOnce(undefined);

    render(<MFAChallengePage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/authentication code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => {
      expect(verifyMFAMock).toHaveBeenCalledWith('session-123', '123456');
    });

    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });

  it('disables submit when code is incomplete', async () => {
    render(<MFAChallengePage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/authentication code/i), '123');

    expect(screen.getByRole('button', { name: /verify code/i })).toBeDisabled();
  });
});

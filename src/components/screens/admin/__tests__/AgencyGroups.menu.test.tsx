/**
 * Agency Groups Menu Tests
 * Story 9.3: Verify three-dots menu is accessible and actions open dialogs
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { AgencyGroups } from '../AgencyGroups';

vi.mock('../../../../client/services/agencyService', () => ({
  listAgencyGroups: vi.fn(),
  listSubagencies: vi.fn().mockResolvedValue({ subagencies: [] }),
  createAgencyGroup: vi.fn(),
  updateAgencyGroup: vi.fn(),
  deleteAgencyGroup: vi.fn(),
  createSubagency: vi.fn(),
  updateSubagency: vi.fn(),
  deleteSubagency: vi.fn(),
}));

vi.mock('../../../../client/services/agencyAccessService', () => ({
  listAgencyGroupAccess: vi.fn().mockResolvedValue({ users: [] }),
  grantAgencyGroupAccess: vi.fn(),
  revokeAgencyGroupAccess: vi.fn(),
  listSubagencyAccess: vi.fn().mockResolvedValue({ users: [] }),
  grantSubagencyAccess: vi.fn(),
  revokeSubagencyAccess: vi.fn(),
}));

vi.mock('../../../../client/components/UserAutocomplete', () => ({
  UserAutocomplete: () => <div data-testid="user-autocomplete" />,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AgencyGroups menu', () => {
  beforeEach(async () => {
    const agencyService = await import('../../../../client/services/agencyService');
    vi.mocked(agencyService.listAgencyGroups).mockResolvedValue({
      agencyGroups: [
        {
          id: 'agency-1',
          name: 'Test Agency',
          code: 'TA',
          description: 'Test description',
          subagencyCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    vi.mocked(agencyService.listSubagencies).mockResolvedValue({ subagencies: [] });
  });

  it('shows menu items when three-dots trigger is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AgencyGroups />
      </MemoryRouter>
    );

    await screen.findByText('Test Agency');

    const triggers = screen.getAllByLabelText('Agency options');
    await user.click(triggers[0]);

    expect(await screen.findByText('Add Subagency')).toBeInTheDocument();
    expect(screen.getByText('Manage Access')).toBeInTheDocument();
    expect(screen.getByText('Edit Group')).toBeInTheDocument();
    expect(screen.getByText('Delete Group')).toBeInTheDocument();
  });

  it('opens create subagency dialog from menu action', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AgencyGroups />
      </MemoryRouter>
    );

    await screen.findByText('Test Agency');

    const triggers = screen.getAllByLabelText('Agency options');
    await user.click(triggers[0]);

    await user.click(await screen.findByText('Add Subagency'));

    await waitFor(() => {
      expect(screen.getByText('Create Subagency')).toBeInTheDocument();
    });
  });

  it('opens manage access dialog from menu action', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AgencyGroups />
      </MemoryRouter>
    );

    await screen.findByText('Test Agency');

    const triggers = screen.getAllByLabelText('Agency options');
    await user.click(triggers[0]);

    await user.click(await screen.findByText('Manage Access'));

    await waitFor(() => {
      expect(screen.getByText('Manage Access - Test Agency')).toBeInTheDocument();
    });
  });

  it('shows Add Subagency button in empty state and opens dialog', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AgencyGroups />
      </MemoryRouter>
    );

    await screen.findByText('Test Agency');

    await user.click(screen.getByLabelText('Toggle subagency list'));

    expect(await screen.findByText('No subagencies yet')).toBeInTheDocument();

    const addButton = screen.getByRole('button', { name: 'Add Subagency' });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Create Subagency')).toBeInTheDocument();
    });
  });

  it('shows Add Subagency button when subagencies exist', async () => {
    const user = userEvent.setup();
    const agencyService = await import('../../../../client/services/agencyService');
    vi.mocked(agencyService.listSubagencies).mockResolvedValue({
      subagencies: [
        {
          id: 'sub-1',
          name: 'Subagency 1',
          code: 'S1',
          agencyGroupId: 'agency-1',
          description: 'Test subagency',
          ndaCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    render(
      <MemoryRouter>
        <AgencyGroups />
      </MemoryRouter>
    );

    await screen.findByText('Test Agency');

    await user.click(screen.getByLabelText('Toggle subagency list'));

    expect(await screen.findByText('Subagencies (1)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Subagency' })).toBeInTheDocument();
  });
});

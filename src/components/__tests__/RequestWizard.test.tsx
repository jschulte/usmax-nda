/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const mockNavigate = vi.fn();
let mockSearch = '';

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ search: mockSearch }),
}));

vi.mock('react-quill', () => ({
  default: ({ value, onChange }: { value?: string; onChange?: (val: string) => void }) => (
    <textarea
      data-testid="quill"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

vi.mock('quill/dist/quill.snow.css', () => ({}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../client/services/ndaService', () => ({
  getNDA: vi.fn(),
  createNDA: vi.fn(),
  updateNDA: vi.fn(),
  cloneNDA: vi.fn(),
  searchCompanies: vi.fn().mockResolvedValue({ companies: [] }),
  getCompanySuggestions: vi.fn().mockResolvedValue({ companies: [] }),
  getCompanyDefaults: vi.fn().mockResolvedValue({ defaults: {} }),
  getAgencySuggestions: vi.fn().mockResolvedValue({
    suggestions: {
      commonCompanies: [],
      positionCounts: [],
      typeCounts: [],
    },
  }),
  updateDraft: vi.fn(),
}));

vi.mock('../../client/services/agencyService', () => ({
  listAgencyGroups: vi.fn().mockResolvedValue({
    agencyGroups: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  }),
  listSubagencies: vi.fn().mockResolvedValue({ subagencies: [] }),
}));

vi.mock('../../client/services/userService', () => ({
  searchContacts: vi.fn().mockResolvedValue({ contacts: [] }),
  createExternalContact: vi.fn(),
}));

vi.mock('../../client/services/templateService', () => ({
  listTemplates: vi.fn().mockResolvedValue({ templates: [] }),
  generatePreview: vi.fn(),
}));

vi.mock('../../client/services/documentService', () => ({
  generateDocument: vi.fn(),
}));

import { RequestWizard } from '../screens/RequestWizard';
import { getCompanyDefaults, getCompanySuggestions, getNDA } from '../../client/services/ndaService';

describe('RequestWizard', () => {
  beforeEach(() => {
    mockSearch = '';
    mockNavigate.mockReset();
  });

  it('disables Save as Draft until required fields are provided', async () => {
    render(<RequestWizard />);

    const saveDraft = await screen.findByRole('button', { name: /save as draft/i });
    expect(saveDraft).toBeDisabled();

    expect(screen.getByText('0/255')).toBeInTheDocument();
  });

  it('auto-fills company defaults and highlights auto-filled fields', async () => {
    const user = userEvent.setup();
    vi.mocked(getCompanySuggestions).mockResolvedValue({
      companies: [{ companyName: 'TechCorp Solutions Inc.', count: 3 }],
    });
    vi.mocked(getCompanyDefaults).mockResolvedValue({
      defaults: {
        companyCity: 'San Francisco',
        companyState: 'CA',
        stateOfIncorporation: 'Delaware',
      },
    });

    render(<RequestWizard />);

    await user.type(
      screen.getByPlaceholderText('e.g., TechCorp Integration'),
      'TechCorp Integration'
    );
    await user.type(
      screen.getByPlaceholderText('Describe the authorized purpose of this NDA and the project context'),
      'Authorized purpose for integration'
    );

    await user.click(screen.getByRole('button', { name: /next/i }));

    const companyInput = await screen.findByPlaceholderText('Start typing to search...');
    await user.click(companyInput);

    const suggestion = await screen.findByText('TechCorp Solutions Inc.');
    await user.click(suggestion);

    const cityInput = screen.getByPlaceholderText('e.g., Washington');

    await waitFor(() => {
      expect(cityInput).toHaveValue('San Francisco');
    });

    expect(cityInput).toHaveClass('bg-[var(--color-primary-light)]');

    await user.clear(cityInput);
    await user.type(cityInput, 'Oakland');

    expect(cityInput).not.toHaveClass('bg-[var(--color-primary-light)]');
  });

  it('shows clone banner with link when cloning from an NDA', async () => {
    mockSearch = '?cloneFrom=nda-1';
    vi.mocked(getNDA).mockResolvedValue({
      id: 'nda-1',
      displayId: 1590,
      companyName: 'TechCorp',
      companyCity: 'San Francisco',
      companyState: 'CA',
      stateOfIncorporation: 'Delaware',
      agencyGroup: { id: 'agency-1', name: 'DoD' },
      subagency: null,
      agencyOfficeName: '',
      ndaType: 'MUTUAL',
      abbreviatedName: 'TC-2024',
      authorizedPurpose: 'Original purpose',
      effectiveDate: '2025-01-15T00:00:00Z',
      usMaxPosition: 'PRIME',
      isNonUsMax: false,
      opportunityPoc: null,
      contractsPoc: null,
      relationshipPoc: { id: 'poc-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com' },
      contactsPoc: null,
      rtfTemplateId: '',
    } as any);

    render(<RequestWizard />);

    expect(await screen.findByText(/Cloned from NDA #1590/i)).toBeInTheDocument();

    const viewButton = screen.getByRole('button', { name: /view source nda/i });
    await userEvent.click(viewButton);

    expect(mockNavigate).toHaveBeenCalledWith('/nda/nda-1');
  });
});

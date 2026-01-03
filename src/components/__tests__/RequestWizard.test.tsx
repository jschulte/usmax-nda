/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useLocation: () => ({ search: '' }),
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

vi.mock('../../client/services/ndaService', () => ({
  getNDA: vi.fn(),
  createNDA: vi.fn(),
  updateNDA: vi.fn(),
  cloneNDA: vi.fn(),
  searchCompanies: vi.fn().mockResolvedValue([]),
  getCompanySuggestions: vi.fn().mockResolvedValue([]),
  getCompanyDefaults: vi.fn().mockResolvedValue({}),
  getAgencySuggestions: vi.fn().mockResolvedValue(null),
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

describe('RequestWizard', () => {
  it('disables Save as Draft until required fields are provided', async () => {
    render(<RequestWizard />);

    const saveDraft = await screen.findByRole('button', { name: /save as draft/i });
    expect(saveDraft).toBeDisabled();

    expect(screen.getByText('0/255')).toBeInTheDocument();
  });
});

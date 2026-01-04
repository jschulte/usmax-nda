/**
 * Email Templates Admin Page Tests
 * Story 7.7: Email Template Management UI coverage
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { EmailTemplates } from '../EmailTemplates';

vi.mock('../EmailTemplateEditor', () => ({
  EmailTemplateEditor: ({ template }: { template: { name?: string } | null }) => (
    <div data-testid="email-template-editor">{template?.name ?? 'new-template'}</div>
  ),
}));

const baseTemplate = {
  id: 'tmpl-1',
  name: 'Default Template',
  description: 'Default template',
  subject: 'NDA {{displayId}} - {{companyName}}',
  body: 'Hello {{companyName}}',
  isDefault: true,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const activeTemplate = {
  id: 'tmpl-2',
  name: 'Active Template',
  description: null,
  subject: 'Follow up {{displayId}}',
  body: 'Follow up body',
  isDefault: false,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('EmailTemplates admin screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows action menu items for non-default templates', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ templates: [baseTemplate, activeTemplate] }),
    } as Response);

    render(<EmailTemplates />);

    await screen.findByText('Default Template');

    const triggers = screen.getAllByLabelText('Template options');
    await user.click(triggers[1]);

    expect(await screen.findByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Set as Default')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('reloads templates when showing archived', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ templates: [] }),
    } as Response);
    global.fetch = fetchMock;

    render(<EmailTemplates />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        '/api/admin/email-templates?includeInactive=false',
        { credentials: 'include' }
      );
    });

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/api/admin/email-templates?includeInactive=true',
        { credentials: 'include' }
      );
    });
  });

  it('duplicates a template and opens the editor', async () => {
    const user = userEvent.setup();
    const duplicate = {
      ...activeTemplate,
      id: 'tmpl-3',
      name: 'Active Template (Copy)',
    };

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/duplicate')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ template: duplicate }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ templates: [activeTemplate] }),
      } as Response);
    });
    global.fetch = fetchMock;

    render(<EmailTemplates />);

    await screen.findByText('Active Template');

    const triggers = screen.getAllByLabelText('Template options');
    await user.click(triggers[0]);
    await user.click(await screen.findByText('Duplicate'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/email-templates/tmpl-2/duplicate',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      );
    });

    expect(await screen.findByTestId('email-template-editor')).toHaveTextContent(
      'Active Template (Copy)'
    );
  });
});

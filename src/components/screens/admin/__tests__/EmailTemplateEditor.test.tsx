/**
 * Email Template Editor Component Tests
 * Story 7.6: Email Template Creation
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmailTemplateEditor } from '../EmailTemplateEditor';

describe('EmailTemplateEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('shows validation error when required fields are missing', () => {
    const onClose = vi.fn();
    render(<EmailTemplateEditor template={null} onClose={onClose} />);

    const saveButton = screen.getByRole('button', { name: /Create Template/i });
    fireEvent.click(saveButton);

    expect(screen.getByText('Template name is required')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('inserts a placeholder into the body', () => {
    const onClose = vi.fn();
    render(<EmailTemplateEditor template={null} onClose={onClose} />);

    const textarea = screen.getByPlaceholderText(
      'Enter email body here. Use placeholders like {{companyName}} for dynamic content.'
    ) as HTMLTextAreaElement;

    fireEvent.click(screen.getByRole('button', { name: /\{\{companyName\}\}/ }));

    expect(textarea.value).toContain('{{companyName}}');
  });

  it('saves a new template and closes editor', async () => {
    const onClose = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<EmailTemplateEditor template={null} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('e.g., Standard NDA Email'), {
      target: { value: 'Standard NDA Email' },
    });
    fireEvent.change(screen.getByPlaceholderText('Optional description'), {
      target: { value: 'Description' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., NDA {{displayId}} - {{companyName}}'), {
      target: { value: 'NDA {{displayId}} - {{companyName}}' },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        'Enter email body here. Use placeholders like {{companyName}} for dynamic content.'
      ),
      { target: { value: 'Hello {{companyName}}' } }
    );

    const saveButton = screen.getByRole('button', { name: /Create Template/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/email-templates',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
      );
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith(true);
    });
  });
});

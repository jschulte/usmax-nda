/**
 * Email Template Editor Component
 * Story 9.16: Create Email Template Editor UI
 *
 * Modal editor for creating/editing email templates
 * AC2: Create new template
 * AC3: Edit existing template
 * AC4: Preview template
 * AC5: Field-merge placeholder helper
 */

import React, { useState, useRef, useEffect } from 'react';
import { Input, TextArea } from '../../ui/AppInput';
import { Button } from '../../ui/AppButton';
import { Card } from '../../ui/AppCard';
import { X, Eye, Edit, Copy } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  body: string;
  isDefault: boolean;
  isActive: boolean;
}

interface EmailTemplateEditorProps {
  template: EmailTemplate | null; // null = create new
  onClose: (saved: boolean) => void;
}

// Story 9.16 AC5: Available placeholders
const AVAILABLE_PLACEHOLDERS = [
  { key: '{{companyName}}', description: 'Partner company name' },
  { key: '{{abbreviatedName}}', description: 'Project/contract abbreviated name' },
  { key: '{{effectiveDate}}', description: 'NDA effective date' },
  { key: '{{displayId}}', description: 'NDA reference number' },
  { key: '{{agencyGroup}}', description: 'Agency group name' },
  { key: '{{usMaxPosition}}', description: 'USmax position (Prime, Sub-contractor, etc.)' },
  { key: '{{ndaType}}', description: 'NDA type (Mutual, Consultant)' },
  { key: '{{relationshipPocName}}', description: 'Relationship POC full name' },
  { key: '{{opportunityPocName}}', description: 'Opportunity POC full name' },
  { key: '{{signature}}', description: 'Email signature from user profile' },
];

// Sample data for preview
const SAMPLE_DATA: Record<string, string> = {
  '{{companyName}}': 'Acme Corporation',
  '{{abbreviatedName}}': 'PROJ-2024-001',
  '{{effectiveDate}}': '2024-12-25',
  '{{displayId}}': 'NDA-2024-12345',
  '{{agencyGroup}}': 'Department of Defense',
  '{{usMaxPosition}}': 'Prime Contractor',
  '{{ndaType}}': 'Mutual NDA',
  '{{relationshipPocName}}': 'John Smith',
  '{{opportunityPocName}}': 'Jane Doe',
  '{{signature}}': 'Best regards,\nUSmax Team',
};

export function EmailTemplateEditor({ template, onClose }: EmailTemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Insert placeholder at cursor position
  function insertPlaceholder(placeholder: string) {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = body.substring(0, start) + placeholder + body.substring(end);

    setBody(newBody);

    // Move cursor after inserted placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  }

  // Replace placeholders with sample data for preview
  function renderPreview(text: string): string {
    let preview = text;
    Object.entries(SAMPLE_DATA).forEach(([placeholder, value]) => {
      preview = preview.replaceAll(placeholder, value);
    });
    return preview;
  }

  async function handleSave() {
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    if (!body.trim()) {
      setError('Body is required');
      return;
    }

    setSaving(true);

    try {
      const method = template ? 'PUT' : 'POST';
      const url = template
        ? `/api/admin/email-templates/${template.id}`
        : '/api/admin/email-templates';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          subject: subject.trim(),
          body: body.trim(),
          isDefault,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save template');
      }

      onClose(true);
    } catch (err: any) {
      console.error('Error saving template:', err);
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">
              {template ? 'Edit Email Template' : 'Create Email Template'}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Use placeholders like {{companyName}} to insert dynamic values
            </p>
          </div>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Input
              label="Template Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard NDA Email"
              required
            />
            <Input
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="mb-6">
            <Input
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., NDA {{displayId}} - {{companyName}}"
              required
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Set as default template</span>
            </label>
          </div>

          {/* Body Editor / Preview Toggle */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-[var(--color-text-primary)]">
                Email Body
              </label>
              <Button
                variant="secondary"
                size="sm"
                icon={previewMode ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                onClick={() => setPreviewMode(!previewMode)}
              >
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Editor */}
              <div className={previewMode ? 'hidden lg:block' : ''}>
                <TextArea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={15}
                  placeholder="Enter email body here. Use placeholders like {{companyName}} for dynamic content."
                  className="font-mono text-sm"
                  required
                />

                {/* AC5: Placeholder Helper */}
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Insert Placeholder:</p>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_PLACEHOLDERS.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => insertPlaceholder(p.key)}
                        className="group relative px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                        title={p.description}
                      >
                        {p.key}
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {p.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* AC4: Preview */}
              <div className={!previewMode ? 'hidden lg:block' : ''}>
                <Card className="bg-gray-50">
                  <h3 className="text-sm font-medium mb-2">Preview</h3>
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {renderPreview(body) || (
                      <span className="text-[var(--color-text-muted)]">
                        Body preview will appear here
                      </span>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Placeholder Reference */}
          <Card className="bg-blue-50 border-blue-200">
            <h4 className="text-sm font-medium mb-2">Available Placeholders</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {AVAILABLE_PLACEHOLDERS.map((p) => (
                <div key={p.key} className="flex items-start gap-2">
                  <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200">
                    {p.key}
                  </code>
                  <span className="text-[var(--color-text-secondary)]">{p.description}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="secondary" onClick={() => onClose(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}

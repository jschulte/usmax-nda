/**
 * Email Templates Admin Page
 * Story 9.16: Create Email Template Editor UI
 *
 * Lists all email templates with create/edit capabilities
 * AC1: Access email template management
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/AppCard';
import { Button } from '../../ui/AppButton';
import { Plus, Edit, Trash2, MoreVertical, Copy, Archive, RefreshCcw, Star } from 'lucide-react';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';

interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  body: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [showArchived]);

  async function loadTemplates() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/email-templates?includeInactive=${showArchived}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to load templates');
      }

      const data = await res.json();
      setTemplates(data.templates);
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate(template: EmailTemplate) {
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}/duplicate`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to duplicate template');
      }

      const data = await res.json();
      setTemplates((prev) => [data.template, ...prev]);
      setSelectedTemplate(data.template);
      setEditorOpen(true);
    } catch (err: any) {
      console.error('Error duplicating template:', err);
      alert(err.message);
    }
  }

  async function handleSetDefault(template: EmailTemplate) {
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isDefault: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to set default template');
      }

      await loadTemplates();
    } catch (err: any) {
      console.error('Error setting default template:', err);
      alert(err.message);
    }
  }

  async function handleToggleArchive(template: EmailTemplate) {
    if (template.isDefault && template.isActive) {
      alert('Cannot archive the default template. Set another template as default first.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !template.isActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update template status');
      }

      await loadTemplates();
    } catch (err: any) {
      console.error('Error updating template status:', err);
      alert(err.message);
    }
  }

  function handleCreate() {
    setSelectedTemplate(null);
    setEditorOpen(true);
  }

  function handleEdit(template: EmailTemplate) {
    setSelectedTemplate(template);
    setEditorOpen(true);
  }

  async function handleDelete(template: EmailTemplate) {
    if (!confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete template');
      }

      // Reload templates
      await loadTemplates();
    } catch (err: any) {
      console.error('Error deleting template:', err);
      alert(err.message);
    }
  }

  function handleEditorClose(saved: boolean) {
    setEditorOpen(false);
    setSelectedTemplate(null);

    if (saved) {
      loadTemplates();
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-[var(--color-text-secondary)]">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="mb-2">Email Templates</h1>
          <p className="text-[var(--color-text-secondary)]">
            Manage email templates with field-merge placeholders
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show archived
          </label>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleCreate}
          >
            Create New Template
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-medium">{template.name}</h3>
                  {template.isDefault && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      Default
                    </span>
                  )}
                  {!template.isActive && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                    {template.description}
                  </p>
                )}
                <p className="text-xs text-[var(--color-text-muted)]">
                  Subject: {template.subject}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="px-2"
                    type="button"
                    aria-label="Template options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={5}>
                  <DropdownMenuItem onSelect={() => handleEdit(template)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleDuplicate(template)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  {!template.isDefault && template.isActive && (
                    <DropdownMenuItem onSelect={() => handleSetDefault(template)}>
                      <Star className="w-4 h-4 mr-2" />
                      Set as Default
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={() => handleToggleArchive(template)}
                    disabled={template.isDefault && template.isActive}
                  >
                    {template.isActive ? (
                      <Archive className="w-4 h-4 mr-2" />
                    ) : (
                      <RefreshCcw className="w-4 h-4 mr-2" />
                    )}
                    {template.isActive ? 'Archive' : 'Reactivate'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => handleDelete(template)}
                    disabled={template.isDefault}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}

        {templates.length === 0 && (
          <Card>
            <div className="text-center py-8">
              <p className="text-[var(--color-text-secondary)] mb-4">
                No email templates found. Create your first template to get started.
              </p>
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleCreate}
              >
                Create Template
              </Button>
            </div>
          </Card>
        )}
      </div>

      {editorOpen && (
        <EmailTemplateEditor
          template={selectedTemplate}
          onClose={handleEditorClose}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/AppCard';
import { Badge } from '../ui/AppBadge';
import { Button } from '../ui/AppButton';
import { Input, Select } from '../ui/AppInput';
import { Search, Plus, MoreVertical, Edit, Copy, Power, Trash2, FileText, Calendar, Loader2 } from 'lucide-react';
// Story 9.19: Clauses feature not implemented - removed mock data import
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner@2.0.3';
import * as templateService from '../../client/services/templateService';
import type { RtfTemplate } from '../../client/services/templateService';
import { RTFTemplateEditor } from './admin/RTFTemplateEditor';
import { simpleRtfToHtml } from '../../client/utils/rtfConverter';

export function Templates() {
  // Story 9.19: Keep activeView for backward compatibility, but clauses disabled (empty array)
  const [activeView, setActiveView] = useState<'templates' | 'clauses'>('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showClauseDialog, setShowClauseDialog] = useState(false);
  // Issue #23: WYSIWYG Editor integration
  const [showWysiwygEditor, setShowWysiwygEditor] = useState(false);
  const [wysiwygTemplateId, setWysiwygTemplateId] = useState<number | undefined>(undefined);
  const [wysiwygInitialContent, setWysiwygInitialContent] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateAgencyGroupId, setTemplateAgencyGroupId] = useState('');
  const [templateIsDefault, setTemplateIsDefault] = useState(false);
  const [clauseName, setClauseName] = useState('');
  const [clauseTopic, setClauseTopic] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Backend data state
  const [templates, setTemplates] = useState<RtfTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [agencyGroupFilter, setAgencyGroupFilter] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);

  // Confirmation dialogs
  const [showDeleteTemplateConfirm, setShowDeleteTemplateConfirm] = useState(false);
  const [showDeleteClauseConfirm, setShowDeleteClauseConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<RtfTemplate | null>(null);
  const [clauseToDelete, setClauseToDelete] = useState<any>(null);

  // Edit clause dialog
  const [showEditClauseDialog, setShowEditClauseDialog] = useState(false);
  const [editingClause, setEditingClause] = useState<any>(null);
  const [editClauseForm, setEditClauseForm] = useState({
    name: '',
    topic: '',
    text: ''
  });

  // Load templates on mount and when filters change
  useEffect(() => {
    loadTemplates();
  }, [agencyGroupFilter, showInactive]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await templateService.listTemplates(
        agencyGroupFilter || undefined,
        showInactive
      );
      setTemplates(data.templates);
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
      toast.error('Failed to load templates', {
        description: err.message || 'An error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredClauses = [].filter((c: any) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleCreateTemplate = () => {
    setTemplateName('');
    setTemplateDescription('');
    setTemplateContent('');
    setTemplateAgencyGroupId('');
    setTemplateIsDefault(false);
    setUploadedFile(null);
    setShowCreateDialog(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.rtf')) {
      toast.error('Invalid file type', {
        description: 'Please upload an RTF file (.rtf extension)'
      });
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('File too large', {
        description: 'RTF file must be less than 5MB'
      });
      return;
    }

    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const base64Content = base64.split(',')[1];
      setTemplateContent(base64Content);
      toast.success('File uploaded', {
        description: `${file.name} ready to save`
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateClause = () => {
    setClauseName('');
    setClauseTopic('');
    setShowCreateDialog(true);
  };

  const confirmCreate = async () => {
    if (activeView === 'templates') {
      if (!templateName.trim()) {
        toast.error('Template name is required');
        return;
      }
      if (!uploadedFile && !templateContent.trim()) {
        toast.error('Template file is required', {
          description: 'Please upload an RTF file'
        });
        return;
      }

      try {
        setIsSubmitting(true);
        await templateService.createTemplate({
          name: templateName.trim(),
          description: templateDescription.trim() || undefined,
          content: templateContent,
          agencyGroupId: templateAgencyGroupId || undefined,
          isDefault: templateIsDefault,
        });

        toast.success('Template created', {
          description: `${templateName} has been created successfully.`
        });
        setShowCreateDialog(false);
        await loadTemplates();
      } catch (err: any) {
        toast.error('Failed to create template', {
          description: err.message || 'An error occurred'
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (clauseName.trim() && clauseTopic.trim()) {
        toast.success('Clause added', {
          description: `${clauseName} has been added to the library.`
        });
        setShowCreateDialog(false);
      }
    }
  };

  const handleEditTemplate = async (template: RtfTemplate) => {
    setSelectedItem(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setTemplateAgencyGroupId(template.agencyGroupId || '');
    setTemplateIsDefault(template.isDefault);
    setTemplateContent(''); // Content is only loaded on demand
    setUploadedFile(null);
    setShowEditDialog(true);
  };

  const confirmEdit = async () => {
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await templateService.updateTemplate(selectedItem.id, {
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        content: templateContent.trim() || undefined,
        agencyGroupId: templateAgencyGroupId || null,
        isDefault: templateIsDefault,
      });

      toast.success('Template updated', {
        description: `${templateName} has been updated successfully.`
      });
      setShowEditDialog(false);
      await loadTemplates();
    } catch (err: any) {
      toast.error('Failed to update template', {
        description: err.message || 'An error occurred'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateTemplate = async (template: RtfTemplate) => {
    try {
      setIsSubmitting(true);
      // Load full template with content
      const { template: fullTemplate } = await templateService.getTemplate(template.id);
      if (!fullTemplate.content) {
        toast.error('Template content unavailable', {
          description: 'You do not have access to duplicate this template.'
        });
        return;
      }

      // Create duplicate
      await templateService.createTemplate({
        name: `${template.name} (Copy)`,
        description: template.description,
        content: fullTemplate.content || '',
        agencyGroupId: template.agencyGroupId || undefined,
        isDefault: false, // Duplicates are never default
      });

      toast.success('Template duplicated', {
        description: `${template.name} (Copy) has been created.`
      });
      await loadTemplates();
    } catch (err: any) {
      toast.error('Failed to duplicate template', {
        description: err.message || 'An error occurred'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTemplate = async (template: RtfTemplate) => {
    try {
      const newStatus = !template.isActive;
      await templateService.updateTemplate(template.id, {
        isActive: newStatus,
      });

      toast.success(newStatus ? 'Template activated' : 'Template deactivated', {
        description: `${template.name} is now ${newStatus ? 'active' : 'inactive'}.`
      });
      await loadTemplates();
    } catch (err: any) {
      toast.error('Failed to update template status', {
        description: err.message || 'An error occurred'
      });
    }
  };

  const handleDeleteTemplate = (template: RtfTemplate) => {
    setTemplateToDelete(template);
    setShowDeleteTemplateConfirm(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      setIsSubmitting(true);
      await templateService.deleteTemplate(templateToDelete.id);

      toast.success('Template deleted', {
        description: `${templateToDelete.name} has been deleted.`
      });
      setShowDeleteTemplateConfirm(false);
      await loadTemplates();
    } catch (err: any) {
      toast.error('Failed to delete template', {
        description: err.message || 'An error occurred'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleViewClauseDetails = (clause: any) => {
    setSelectedItem(clause);
    setShowClauseDialog(true);
  };
  
  const handleEditClause = (clause: any) => {
    setEditingClause(clause);
    setEditClauseForm({
      name: clause.name,
      topic: clause.topic,
      text: clause.text
    });
    setShowEditClauseDialog(true);
  };
  
  const handleDeleteClause = (clause: any) => {
    setClauseToDelete(clause);
    setShowDeleteClauseConfirm(true);
  };
  
  const confirmDeleteClause = () => {
    toast.success('Clause deleted', {
      description: `${clauseToDelete.name} has been deleted.`
    });
    setShowDeleteClauseConfirm(false);
  };

  // Issue #23: WYSIWYG Editor handlers (with full RTF roundtrip support)
  const handleOpenWysiwyg = async (template?: RtfTemplate) => {
    try {
      if (template) {
        // Editing existing template - load and convert RTF to HTML
        setIsSubmitting(true);

        // Load full template with content
        const { template: fullTemplate } = await templateService.getTemplate(template.id);

        // Set metadata
        setWysiwygTemplateId(template.id);
        setTemplateName(template.name);
        setTemplateDescription(template.description || '');
        setTemplateAgencyGroupId(template.agencyGroupId || '');
        setTemplateIsDefault(template.isDefault);

        // Convert RTF to HTML for editing
        if (fullTemplate.content) {
          try {
            console.log('[Templates] Template content type:', typeof fullTemplate.content);
            console.log('[Templates] Template content length:', fullTemplate.content.length);

            // Content is already base64 string from API
            const htmlContent = simpleRtfToHtml(fullTemplate.content);
            console.log('[Templates] Converted HTML:', htmlContent.substring(0, 200));
            setWysiwygInitialContent(htmlContent);
          } catch (conversionError) {
            console.error('[Templates] RTF conversion error:', conversionError);
            toast.error('Could not load template for editing', {
              description: 'RTF format may be corrupted. Try uploading a new file.'
            });
            setIsSubmitting(false);
            return;
          }
        } else {
          setWysiwygInitialContent('');
        }
      } else {
        // Creating new template
        setWysiwygTemplateId(undefined);
        setWysiwygInitialContent('');
        // Metadata already set in state from create dialog
      }

      setShowCreateDialog(false);
      setShowEditDialog(false);
      setShowWysiwygEditor(true);
    } catch (err: any) {
      toast.error('Failed to open editor', {
        description: err.message || 'An error occurred'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWysiwygSave = async (rtfContent: string, htmlContent: string) => {
    // Validate template name
    const trimmedName = templateName.trim();
    if (!trimmedName) {
      toast.error('Template name is required', {
        description: 'Please enter a template name before saving'
      });
      return;
    }

    try {
      // Convert RTF string to base64 for API (server expects base64)
      const rtfBase64 = btoa(rtfContent);
      const htmlBase64 = btoa(htmlContent);
      console.log('[Templates] Sending base64 RTF to server, length:', rtfBase64.length);
      console.log('[Templates] Sending base64 HTML to server, length:', htmlBase64.length);

      if (wysiwygTemplateId) {
        // Editing existing template
        await templateService.updateTemplate(wysiwygTemplateId, {
          name: trimmedName,
          description: templateDescription.trim() || undefined,
          content: rtfBase64,
          htmlSource: htmlBase64, // Send HTML too for validation
          agencyGroupId: templateAgencyGroupId || null,
          isDefault: templateIsDefault,
        });
        toast.success('Template updated', {
          description: `${trimmedName} has been updated successfully.`
        });
      } else {
        // Creating new template
        await templateService.createTemplate({
          name: trimmedName,
          description: templateDescription.trim() || undefined,
          content: rtfBase64,
          htmlSource: htmlBase64, // Send HTML too for validation
          agencyGroupId: templateAgencyGroupId || undefined,
          isDefault: templateIsDefault,
        });
        toast.success('Template created', {
          description: `${trimmedName} has been created successfully.`
        });
      }
      setShowWysiwygEditor(false);
      setWysiwygInitialContent(''); // Clear content for next use
      await loadTemplates();
    } catch (err: any) {
      toast.error('Failed to save template', {
        description: err.message || 'An error occurred'
      });
      throw err;
    }
  };

  const handleWysiwygCancel = () => {
    // Confirm before closing to prevent accidental data loss
    const confirmed = window.confirm(
      'Are you sure you want to cancel? Any unsaved changes will be lost.'
    );
    if (confirmed) {
      setShowWysiwygEditor(false);
    }
  };

  // Show WYSIWYG editor if active
  if (showWysiwygEditor) {
    return (
      <div className="p-8">
        <div className="mb-4">
          <h1 className="mb-2">{wysiwygTemplateId ? 'Edit' : 'Create'} Template</h1>
          <p className="text-[var(--color-text-secondary)]">
            Use the visual editor to {wysiwygTemplateId ? 'edit your' : 'create a new'} RTF template with formatting and placeholders
          </p>
          {wysiwygTemplateId && (
            <p className="text-xs text-blue-600 mt-1">
              Editing: {templateName}
            </p>
          )}
        </div>
        <RTFTemplateEditor
          initialContent={wysiwygInitialContent}
          templateId={wysiwygTemplateId}
          onSave={handleWysiwygSave}
          onCancel={handleWysiwygCancel}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="mb-2">RTF Templates</h1>
          <p className="text-[var(--color-text-secondary)]">Manage NDA document templates</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-5 h-5" />}
          onClick={handleCreateTemplate}
        >
          Create Template
        </Button>
      </div>
      
      {/* Story 9.19: Removed clauses tab - feature not implemented */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Filters for Templates */}
      {activeView === 'templates' && (
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--color-text-secondary)]">Agency Group:</label>
            <input
              type="text"
              placeholder="Filter by agency..."
              value={agencyGroupFilter}
              onChange={(e) => setAgencyGroupFilter(e.target.value)}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-[var(--color-border)]"
            />
            <label htmlFor="showInactive" className="text-sm text-[var(--color-text-secondary)]">
              Show inactive templates
            </label>
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">
            {templates.length} template{templates.length !== 1 ? 's' : ''} found
          </div>
        </div>
      )}
      
      {/* Templates View */}
      {activeView === 'templates' && (
        <>
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="text-center py-12">
            <p className="text-[var(--color-error)] mb-4">{error}</p>
            <Button variant="primary" onClick={loadTemplates}>
              Retry
            </Button>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredTemplates.length === 0 && (
          <Card className="text-center py-12">
            <p className="text-[var(--color-text-secondary)] mb-4">
              {searchTerm ? 'No templates match your search.' : 'No templates found.'}
            </p>
            {!searchTerm && (
              <Button variant="primary" onClick={handleCreateTemplate}>
                Create your first template
              </Button>
            )}
          </Card>
        )}

        {/* Desktop Table */}
        {!isLoading && !error && filteredTemplates.length > 0 && (
          <Card padding="none" className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Template Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Agency Group
                    </th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-center text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Default
                    </th>
                    <th className="px-6 py-3 text-center text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[var(--color-border)]">
                  {filteredTemplates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{template.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                        {template.agencyGroupId || 'All agencies'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                        {new Date(template.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {template.isDefault && (
                          <Badge variant="info">Default</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {template.isActive ? (
                          <Badge variant="status" status="Executed">Active</Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="Edit template"
                        >
                          <Edit className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        </button>
                        <button
                          onClick={() => handleDuplicateTemplate(template)}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="Duplicate template"
                        >
                          <Copy className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        </button>
                        <button
                          onClick={() => handleToggleTemplate(template)}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title={template.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Power className={`w-4 h-4 ${template.isActive ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`} />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                              <MoreVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteTemplate(template)} variant="destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Mobile Card View */}
        {!isLoading && !error && filteredTemplates.length > 0 && (
          <div className="md:hidden space-y-3">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-medium mb-1">{template.name}</p>
                    {template.description && (
                      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{template.description}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 hover:bg-gray-100 rounded transition-colors flex-shrink-0">
                        <MoreVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleTemplate(template)}>
                        <Power className="w-4 h-4 mr-2" />
                        {template.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDeleteTemplate(template)} variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span>{template.agencyGroupId || 'All agencies'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {template.isDefault && <Badge variant="info">Default</Badge>}
                  {template.isActive ? (
                    <Badge variant="status" status="Executed">Active</Badge>
                  ) : (
                    <Badge variant="default">Inactive</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
        </>
      )}
      
      {/* Clauses View */}
      {activeView === 'clauses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClauses.map((clause) => (
            <Card key={clause.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base">{clause.name}</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <MoreVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewClauseDetails(clause)}>
                      <Edit className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditClause(clause)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDeleteClause(clause)} variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="info">{clause.topic}</Badge>
                <Badge variant="risk" risk={clause.riskLevel}>{clause.riskLevel}</Badge>
                {clause.required && (
                  <Badge variant="default">Required</Badge>
                )}
              </div>
              
              <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-3">
                {clause.text}
              </p>
              
              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Used in {clause.usageCount} templates
                </p>
                <Button variant="subtle" size="sm" onClick={() => handleViewClauseDetails(clause)}>View details</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create Template/Clause Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeView === 'templates' ? 'Create Template' : 'Add Clause'}</DialogTitle>
            <DialogDescription>
              {activeView === 'templates'
                ? 'Create a new RTF template for NDAs.'
                : 'Add a new clause to the library.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {activeView === 'templates' ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Template Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Standard Mutual NDA"
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    placeholder="Optional description..."
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Agency Group ID</label>
                  <input
                    type="text"
                    placeholder="Leave blank for all agencies"
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={templateAgencyGroupId}
                    onChange={(e) => setTemplateAgencyGroupId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Template File (RTF) *</label>
                  <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 text-center hover:border-[var(--color-primary)] transition-colors">
                    <input
                      type="file"
                      accept=".rtf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="rtf-file-upload"
                    />
                    <label htmlFor="rtf-file-upload" className="cursor-pointer">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-[var(--color-text-muted)]" />
                      {uploadedFile ? (
                        <>
                          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                            {uploadedFile.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {(uploadedFile.size / 1024).toFixed(1)} KB - Click to change
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                            Click to upload RTF file
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            Or drag and drop .rtf file here (max 5MB)
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    Create template in Word/LibreOffice, save as .rtf, and upload
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={templateIsDefault}
                    onChange={(e) => setTemplateIsDefault(e.target.checked)}
                    className="rounded border-[var(--color-border)]"
                  />
                  <label htmlFor="isDefault" className="text-sm">Set as default template</label>
                </div>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Clause name..."
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={clauseName}
                  onChange={(e) => setClauseName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Topic..."
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={clauseTopic}
                  onChange={(e) => setClauseTopic(e.target.value)}
                />
                <textarea
                  placeholder="Clause text..."
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowCreateDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            {activeView === 'templates' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleOpenWysiwyg()}
                disabled={isSubmitting}
                title="Create template using visual HTML editor (recommended for new templates)"
              >
                Use WYSIWYG Editor
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={confirmCreate} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {activeView === 'templates' ? 'Creating...' : 'Adding...'}
                </>
              ) : (
                activeView === 'templates' ? 'Create' : 'Add'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Template Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update the template details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Template Name *</label>
              <input
                type="text"
                placeholder="Template name..."
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                placeholder="Optional description..."
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Agency Group ID</label>
              <input
                type="text"
                placeholder="Leave blank for all agencies"
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                value={templateAgencyGroupId}
                onChange={(e) => setTemplateAgencyGroupId(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Update Template File (Optional)</label>
              <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 text-center hover:border-[var(--color-primary)] transition-colors">
                <input
                  type="file"
                  accept=".rtf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="rtf-file-upload-edit"
                />
                <label htmlFor="rtf-file-upload-edit" className="cursor-pointer">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-[var(--color-text-muted)]" />
                  {uploadedFile ? (
                    <>
                      <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                        {uploadedFile.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {(uploadedFile.size / 1024).toFixed(1)} KB - Click to change
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                        Upload new RTF file (optional)
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Leave blank to keep existing content
                      </p>
                    </>
                  )}
                </label>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                Only upload if replacing template content
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefaultEdit"
                checked={templateIsDefault}
                onChange={(e) => setTemplateIsDefault(e.target.checked)}
                className="rounded border-[var(--color-border)]"
              />
              <label htmlFor="isDefaultEdit" className="text-sm">Set as default template</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowEditDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleOpenWysiwyg(selectedItem)} disabled={isSubmitting}>
              Edit in WYSIWYG
            </Button>
            <Button variant="primary" size="sm" onClick={confirmEdit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Clause Details Dialog */}
      <Dialog open={showClauseDialog} onOpenChange={setShowClauseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name}</DialogTitle>
            <DialogDescription>
              {selectedItem?.topic}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="info">{selectedItem?.topic}</Badge>
              <Badge variant="risk" risk={selectedItem?.riskLevel}>{selectedItem?.riskLevel}</Badge>
              {selectedItem?.required && (
                <Badge variant="default">Required</Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">Clause Text</p>
              <p className="text-sm">{selectedItem?.text}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Used in {selectedItem?.usageCount} templates
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowClauseDialog(false)}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={() => {
              handleEditClause(selectedItem);
              setShowClauseDialog(false);
            }}>
              Edit Clause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Template Confirmation Dialog */}
      <Dialog open={showDeleteTemplateConfirm} onOpenChange={setShowDeleteTemplateConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This will deactivate the template.
              {templateToDelete?.isDefault && (
                <span className="mt-2 block text-sm text-[var(--color-warning)]">
                  Warning: This template is currently the default. Deleting it will remove the default selection.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteTemplateConfirm(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={confirmDeleteTemplate} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Clause Confirmation Dialog */}
      <Dialog open={showDeleteClauseConfirm} onOpenChange={setShowDeleteClauseConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Clause</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this clause? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteClauseConfirm(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={confirmDeleteClause}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Clause Dialog */}
      <Dialog open={showEditClauseDialog} onOpenChange={setShowEditClauseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Clause</DialogTitle>
            <DialogDescription>
              Update the clause details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Clause name..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={editClauseForm.name}
              onChange={(e) => setEditClauseForm({ ...editClauseForm, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Topic..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={editClauseForm.topic}
              onChange={(e) => setEditClauseForm({ ...editClauseForm, topic: e.target.value })}
            />
            <textarea
              placeholder="Clause text..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={editClauseForm.text}
              onChange={(e) => setEditClauseForm({ ...editClauseForm, text: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowEditClauseDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => {
              toast.success('Clause updated', {
                description: `${editClauseForm.name} has been updated successfully.`
              });
              setShowEditClauseDialog(false);
            }}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Inline Editable Document Component
 *
 * Shows document content with ability to switch to edit mode inline
 * Hybrid approach: View by default, click Edit to enter WYSIWYG mode with track changes
 */

import React, { useState, useRef, useEffect } from 'react';
import { RTFEditor } from '@jonahschulte/rtf-editor';
import { Button } from './ui/AppButton';
import { Card } from './ui/AppCard';
import { Edit, Save, X, Loader2, Download, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { parseRTF, toHTML } from '@jonahschulte/rtf-toolkit';

interface InlineEditableDocumentProps {
  ndaId: string;
  documentId: string;
  initialRtf: string; // Changed from initialHtml to initialRtf
  canEdit: boolean;
  onSave?: (newVersion: any) => void;
}

export function InlineEditableDocument({
  ndaId,
  documentId,
  initialRtf,
  canEdit,
  onSave,
}: InlineEditableDocumentProps) {
  const [editMode, setEditMode] = useState(false);
  const [rtfContent, setRtfContent] = useState(initialRtf);
  const [htmlContent, setHtmlContent] = useState('');
  const [originalContent] = useState(initialRtf);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Convert RTF to HTML for preview display
  useEffect(() => {
    if (initialRtf) {
      try {
        const parsed = parseRTF(initialRtf);
        const html = toHTML(parsed);
        setHtmlContent(html);
      } catch (err) {
        console.error('Failed to parse RTF:', err);
        toast.error('Failed to load document preview');
      }
    }
  }, [initialRtf]);

  // Track changes
  useEffect(() => {
    setHasChanges(rtfContent !== originalContent);
  }, [rtfContent, originalContent]);

  const handleEnterEditMode = () => {
    if (!canEdit) {
      toast.error("You don't have permission to edit documents");
      return;
    }
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    if (hasChanges) {
      const confirmed = window.confirm('Discard unsaved changes?');
      if (!confirmed) return;
      setRtfContent(originalContent);
    }
    setEditMode(false);
  };

  const handleEditorChange = (data: { rtf: string; html: string }) => {
    setRtfContent(data.rtf);
    setHtmlContent(data.html);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Save RTF content via API
      const response = await fetch(`/api/ndas/${ndaId}/documents/${documentId}/save`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rtfContent: rtfContent,
          htmlContent: htmlContent
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      const result = await response.json();

      toast.success('Document saved', {
        description: `Version ${result.document.versionNumber} created`,
      });

      setEditMode(false);
      setHasChanges(false);

      if (onSave) {
        onSave(result.document);
      }

    } catch (err) {
      console.error('Failed to save document:', err);
      toast.error('Failed to save document', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    // Generate downloadable RTF
    try {
      const blob = new Blob([rtfContent], { type: 'application/rtf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `NDA_${ndaId}.rtf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (err) {
      toast.error('Download failed');
    }
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="font-semibold">NDA Document</h2>
          {editMode && <span className="text-sm text-orange-600">(Editing)</span>}
        </div>
        <div className="flex gap-2">
          {!editMode ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={<Download className="w-4 h-4" />}
                onClick={handleDownload}
              >
                Download RTF
              </Button>
              {canEdit && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Edit className="w-4 h-4" />}
                  onClick={handleEnterEditMode}
                >
                  Edit Document
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="subtle"
                size="sm"
                icon={<X className="w-4 h-4" />}
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Document Content */}
      <div className="min-h-[600px]">
        {editMode ? (
          <div className="border border-gray-200 rounded">
            <RTFEditor
              value={rtfContent}
              onChange={handleEditorChange}
              readOnly={!canEdit}
              height="600px"
              showSidebar={true}
              showToolbar={true}
            />
          </div>
        ) : (
          <div
            className="prose prose-sm max-w-none p-8 bg-white border border-gray-200 rounded cursor-pointer hover:border-[var(--color-primary)] hover:bg-gray-50 transition-colors"
            onClick={canEdit ? handleEnterEditMode : undefined}
            style={{
              minHeight: '600px',
              maxHeight: '800px',
              overflowY: 'auto',
            }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '12pt',
                lineHeight: '1.6',
                color: '#1a1a1a',
              }}
            />
            {canEdit && (
              <div className="fixed bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  <span className="text-sm">Click to edit</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help text */}
      {!editMode && canEdit && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          💡 Click anywhere in the document above to edit it. Your changes will create a new version.
        </div>
      )}

      {editMode && hasChanges && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          ⚠️ You have unsaved changes. Click "Save Changes" to create a new document version.
        </div>
      )}
    </Card>
  );
}

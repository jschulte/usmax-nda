/**
 * NDA Document Editor
 *
 * WYSIWYG editor for editing NDA documents in-browser
 * Loads RTF → HTML, allows editing, saves HTML → RTF
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'quill/dist/quill.snow.css';
import { Button } from '../ui/AppButton';
import { Card } from '../ui/AppCard';
import { ArrowLeft, Save, Eye, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getNdaDetail } from '../../client/services/ndaService';
import { listDocuments, type Document } from '../../client/services/documentService';

const FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'font',
  'size',
  'list',
  'bullet',
];

const EDITOR_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ font: ['Times New Roman', 'Arial', 'Courier New'] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};

export function NDADocumentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const quillRef = useRef<ReactQuill>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [nda, setNda] = useState<any>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load NDA and latest document
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // Load NDA details
        const detail = await getNdaDetail(id);
        setNda(detail.nda);

        // Load documents
        const docs = await listDocuments(id);

        // Get latest generated document
        const latestDoc = docs
          .filter(d => d.documentType === 'GENERATED')
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];

        if (!latestDoc) {
          toast.error('No document found to edit', {
            description: 'Generate a document first before editing'
          });
          navigate(`/nda/${id}`);
          return;
        }

        setDocument(latestDoc);

        // Load RTF document and convert to HTML for editing
        await loadDocumentForEditing(id, latestDoc.id);

      } catch (err) {
        console.error('Failed to load NDA document:', err);
        toast.error('Failed to load document');
        navigate(`/nda/${id}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  // Load document content (RTF → HTML)
  const loadDocumentForEditing = async (ndaId: string, documentId: string) => {
    try {
      setConverting(true);

      // Fetch document content from backend
      // The backend will convert RTF → HTML using @jonahschulte/rtf-toolkit
      const response = await fetch(`/api/ndas/${ndaId}/documents/${documentId}/edit-content`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load document content');
      }

      const { htmlContent } = await response.json();
      setContent(htmlContent);
      setOriginalContent(htmlContent);

    } catch (err) {
      console.error('Failed to convert document:', err);
      toast.error('Failed to load document for editing');
      throw err;
    } finally {
      setConverting(false);
    }
  };

  // Track content changes
  useEffect(() => {
    if (!originalContent) return;
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  // Save edited document
  const handleSave = async () => {
    if (!id || !document) return;

    try {
      setSaving(true);

      // Send HTML content to backend
      // Backend will convert HTML → RTF and create new document version
      const response = await fetch(`/api/ndas/${id}/documents/${document.id}/save`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ htmlContent: content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save document');
      }

      const result = await response.json();

      toast.success('Document saved', {
        description: `New version created: ${result.document.filename}`,
      });

      setOriginalContent(content);
      setHasChanges(false);

      // Optionally navigate back
      setTimeout(() => {
        navigate(`/nda/${id}`);
      }, 1500);

    } catch (err) {
      console.error('Failed to save document:', err);
      toast.error('Failed to save document', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Preview in new tab
  const handlePreview = () => {
    // Open preview of current content
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Document Preview</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.6;
              max-width: 8.5in;
              margin: 1in auto;
              padding: 0 1in;
            }
          </style>
        </head>
        <body>${content}</body>
        </html>
      `);
      previewWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!nda || !document) {
    return (
      <div className="p-8">
        <Button
          variant="subtle"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate(`/nda/${id}`)}
          className="mb-4"
        >
          Back to NDA
        </Button>
        <Card>
          <div className="text-center py-12">
            <p className="text-lg mb-2">Document not found</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Unable to load document for editing.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="subtle"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => {
            if (hasChanges) {
              const confirmed = window.confirm(
                'You have unsaved changes. Are you sure you want to leave?'
              );
              if (!confirmed) return;
            }
            navigate(`/nda/${id}`);
          }}
          className="mb-4"
        >
          Back to NDA
        </Button>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="mb-2">Edit NDA Document</h1>
            <p className="text-[var(--color-text-secondary)]">
              {nda.companyName} - {nda.agencyGroup?.name}
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Editing: {document.filename} (Version {document.versionNumber})
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<Eye className="w-4 h-4" />}
              onClick={handlePreview}
              disabled={converting}
            >
              Preview
            </Button>
            <Button
              variant="primary"
              icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={!hasChanges || saving || converting}
            >
              {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
            </Button>
          </div>
        </div>

        {/* Warning about changes */}
        {hasChanges && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              You have unsaved changes. Click "Save Changes" to create a new document version.
            </p>
          </div>
        )}
      </div>

      {/* Editor */}
      <Card>
        {converting ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
            <p className="ml-3 text-[var(--color-text-secondary)]">Converting document...</p>
          </div>
        ) : (
          <div className="min-h-[600px]">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={setContent}
              modules={EDITOR_MODULES}
              formats={FORMATS}
              placeholder="Edit your NDA document..."
              style={{ height: '600px' }}
            />
          </div>
        )}
      </Card>

      {/* Help text */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Editing Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use the toolbar to format text (bold, italic, headers, lists)</li>
          <li>• Changes will create a new document version (Version {document.versionNumber + 1})</li>
          <li>• The previous version will be preserved in document history</li>
          <li>• Click "Preview" to see how the document will look</li>
          <li>• Original RTF will be replaced with the edited version</li>
        </ul>
      </div>
    </div>
  );
}

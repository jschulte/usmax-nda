/**
 * NDA Document Preview Component
 *
 * Displays the current NDA document with prominent view/download options
 * Shows document metadata and status
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Eye, Loader2, Edit } from 'lucide-react';
import { Button } from './ui/AppButton';
import { Badge } from './ui/AppBadge';
import { Card } from './ui/AppCard';
import { generatePreview } from '../client/services/templateService';
import { toast } from 'sonner';
import type { Document } from '../client/services/documentService';

interface NDADocumentPreviewProps {
  ndaId: string;
  documents: Document[];
  templateId?: string;
  canEdit?: boolean;
}

export function NDADocumentPreview({
  ndaId,
  documents,
  templateId,
  canEdit = false
}: NDADocumentPreviewProps) {
  const navigate = useNavigate();
  const [previewing, setPreviewing] = useState(false);

  // Get the latest generated document
  const latestDocument = documents
    .filter(doc => doc.documentType === 'GENERATED')
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];

  const handlePreview = async () => {
    try {
      setPreviewing(true);
      const result = await generatePreview(ndaId, templateId);
      window.open(result.preview.previewUrl, '_blank', 'noopener,noreferrer');
      toast.success('Preview opened in new tab');
    } catch (err) {
      console.error('Failed to generate preview:', err);
      toast.error('Failed to generate preview', {
        description: err instanceof Error ? err.message : 'Failed to generate preview'
      });
    } finally {
      setPreviewing(false);
    }
  };

  if (!latestDocument && documents.length === 0) {
    return (
      <Card className="border-2 border-dashed border-[var(--color-border)]">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Document Generated Yet</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            A document will be generated automatically when you create this NDA,
            or you can upload an existing document.
          </p>
        </div>
      </Card>
    );
  }

  const displayDocument = latestDocument || documents[0];

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Current NDA Document</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {displayDocument.filename}
            </p>
          </div>
        </div>
        <Badge variant={displayDocument.isFullyExecuted ? 'success' : 'info'}>
          {displayDocument.isFullyExecuted ? 'Fully Executed' : `Version ${displayDocument.versionNumber}`}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Document Type</p>
          <p className="text-sm font-medium">
            {displayDocument.documentType === 'GENERATED' ? 'Generated' :
             displayDocument.documentType === 'UPLOADED' ? 'Uploaded' :
             'Fully Executed'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">File Size</p>
          <p className="text-sm font-medium">
            {displayDocument.fileSize
              ? `${(displayDocument.fileSize / 1024).toFixed(1)} KB`
              : 'Unknown'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Created</p>
          <p className="text-sm font-medium">
            {new Date(displayDocument.uploadedAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Created By</p>
          <p className="text-sm font-medium">
            {displayDocument.uploadedBy.firstName} {displayDocument.uploadedBy.lastName}
          </p>
        </div>
      </div>

      {displayDocument.notes && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900 font-medium mb-1">Notes</p>
          <p className="text-sm text-blue-800">{displayDocument.notes}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          icon={previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          onClick={handlePreview}
          disabled={previewing}
        >
          {previewing ? 'Opening...' : 'View Document'}
        </Button>

        {canEdit && latestDocument && (
          <Button
            variant="secondary"
            icon={<Edit className="w-4 h-4" />}
            onClick={() => navigate(`/nda/${ndaId}/edit-document`)}
          >
            Edit in Browser
          </Button>
        )}

        <Button
          variant="subtle"
          icon={<Download className="w-4 h-4" />}
          onClick={handlePreview}
        >
          Download RTF
        </Button>
      </div>

      {documents.length > 1 && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-secondary)] mb-2">
            {documents.length - 1} older version{documents.length > 2 ? 's' : ''} available in Document tab
          </p>
        </div>
      )}
    </Card>
  );
}

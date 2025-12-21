/**
 * Document Service
 * Client-side service for document management
 *
 * Provides functions for:
 * - Uploading documents (multipart/form-data)
 * - Listing documents for an NDA
 * - Getting download URLs (pre-signed S3 URLs)
 * - Generating NDA documents
 * - Marking documents as fully executed
 */

import { ApiError } from './api';

// Empty string default uses relative URLs (works with reverse proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Document metadata type
 */
export interface Document {
  id: string;
  ndaId: string;
  filename: string;
  fileType: string | null;
  fileSize: number | null;
  documentType: 'GENERATED' | 'UPLOADED' | 'FULLY_EXECUTED';
  isFullyExecuted: boolean;
  versionNumber: number;
  notes: string | null;
  uploadedById: string;
  uploadedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  uploadedAt: string;
}

/**
 * Upload document response
 */
interface UploadDocumentResponse {
  message: string;
  document: Document;
}

/**
 * Generate document response
 */
interface GenerateDocumentResponse {
  message: string;
  document: {
    documentId: string;
    filename: string;
    s3Key: string;
  };
}

/**
 * Download URL response
 */
interface DownloadUrlResponse {
  downloadUrl: string;
  filename: string;
}

/**
 * List documents response
 */
interface ListDocumentsResponse {
  documents: Document[];
}

/**
 * Mark executed response
 */
interface MarkExecutedResponse {
  message: string;
  document: Document;
}

/**
 * Upload a document to an NDA
 *
 * @param ndaId - NDA ID
 * @param file - File to upload
 * @param isFullyExecuted - Optional flag to mark as fully executed
 * @param notes - Optional notes
 * @returns Uploaded document metadata
 */
export async function uploadDocument(
  ndaId: string,
  file: File,
  isFullyExecuted?: boolean,
  notes?: string
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);
  if (isFullyExecuted !== undefined) {
    formData.append('isFullyExecuted', String(isFullyExecuted));
  }
  if (notes) {
    formData.append('notes', notes);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/ndas/${ndaId}/documents/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for multipart
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        data.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data.code,
        data
      );
    }

    const data: UploadDocumentResponse = await response.json();
    return data.document;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to upload document',
      0,
      'UPLOAD_ERROR'
    );
  }
}

/**
 * List all documents for an NDA
 *
 * @param ndaId - NDA ID
 * @returns Array of document metadata
 */
export async function listDocuments(ndaId: string): Promise<Document[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ndas/${ndaId}/documents`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        data.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data.code,
        data
      );
    }

    const data: ListDocumentsResponse = await response.json();
    return data.documents;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to list documents',
      0,
      'LIST_ERROR'
    );
  }
}

/**
 * Get a pre-signed download URL for a document
 *
 * @param ndaId - NDA ID (for routing)
 * @param documentId - Document ID
 * @returns Pre-signed download URL and filename
 */
export async function getDownloadUrl(ndaId: string, documentId: string): Promise<{ url: string; filename: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ndas/documents/${documentId}/download-url`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        data.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data.code,
        data
      );
    }

    const data: DownloadUrlResponse = await response.json();
    return { url: data.downloadUrl, filename: data.filename };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to get download URL',
      0,
      'DOWNLOAD_ERROR'
    );
  }
}

/**
 * Generate an NDA document
 *
 * @param ndaId - NDA ID
 * @returns Generated document metadata
 */
export async function generateDocument(
  ndaId: string,
  templateId?: string
): Promise<{ documentId: string; filename: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ndas/${ndaId}/generate-document`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateId ? { templateId } : {}),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        data.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data.code,
        data
      );
    }

    const data: GenerateDocumentResponse = await response.json();
    return {
      documentId: data.document.documentId,
      filename: data.document.filename,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to generate document',
      0,
      'GENERATE_ERROR'
    );
  }
}

/**
 * Mark a document as fully executed
 *
 * @param documentId - Document ID
 * @returns Updated document metadata
 */
export async function markAsExecuted(documentId: string): Promise<Document> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ndas/documents/${documentId}/mark-executed`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        data.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data.code,
        data
      );
    }

    const data: MarkExecutedResponse = await response.json();
    return data.document;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to mark document as executed',
      0,
      'MARK_EXECUTED_ERROR'
    );
  }
}

/**
 * Download a document (triggers browser download)
 *
 * @param ndaId - NDA ID
 * @param documentId - Document ID
 */
export async function downloadDocument(ndaId: string, documentId: string): Promise<void> {
  const { url, filename } = await getDownloadUrl(ndaId, documentId);

  // Create a temporary anchor element and trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Download all documents as ZIP
 *
 * @param ndaId - NDA ID
 */
export async function downloadAllDocuments(ndaId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ndas/${ndaId}/documents/download-all`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        data.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data.code,
        data
      );
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
    const filename = filenameMatch ? filenameMatch[1] : `nda-${ndaId}-documents.zip`;

    // Create blob from response
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to download documents',
      0,
      'DOWNLOAD_ALL_ERROR'
    );
  }
}

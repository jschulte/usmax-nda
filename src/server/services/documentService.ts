/**
 * Document Service
 * Story 4.1-4.7: Document Management & Execution
 *
 * Handles document operations:
 * - Upload documents (Story 4.1)
 * - Mark as fully executed (Story 4.2)
 * - Download with pre-signed URLs (Story 4.3)
 * - Version history (Story 4.4)
 * - Bulk download as ZIP (Story 4.5)
 * - Metadata tracking (Story 4.6)
 */

import { prisma } from '../db/index.js';
import { uploadDocument, getDownloadUrl, getDocumentContent as getS3DocumentContent, S3ServiceError } from './s3Service.js';
import { auditService, AuditAction } from './auditService.js';
import { attemptAutoTransition, transitionStatus, StatusTrigger } from './statusTransitionService.js';
import type { Document, DocumentType, NdaStatus } from '../../generated/prisma/index.js';
import type { UserContext } from '../types/auth.js';
import { notifyStakeholders, NotificationEvent } from './notificationService.js';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import path from 'node:path';
import { buildSecurityFilter } from './ndaService.js';
import { findNdaWithScope } from '../utils/scopedQuery.js';

/**
 * Service error class
 */
export class DocumentServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'DocumentServiceError';
  }
}

/**
 * Allowed file types for upload
 */
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/rtf',
  'text/rtf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
];

/**
 * Allowed file extensions
 */
export const ALLOWED_EXTENSIONS = ['.pdf', '.rtf', '.docx', '.doc'];

/**
 * Maximum file size (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Document upload input
 */
export interface DocumentUploadInput {
  ndaId: string;
  filename: string;
  content: Buffer;
  contentType: string;
  fileSize: number;
  isFullyExecuted?: boolean;
  notes?: string;
}

/**
 * Document response type
 */
export interface DocumentResponse {
  id: string;
  ndaId: string;
  filename: string;
  fileType: string | null;
  fileSize: number | null;
  documentType: DocumentType;
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
  uploadedAt: Date;
}

/**
 * Validate file type and extension
 */
export function validateFileType(filename: string, contentType: string): void {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new DocumentServiceError(
      `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      'INVALID_FILE_TYPE'
    );
  }

  // Also validate content type if provided
  if (contentType && !ALLOWED_FILE_TYPES.includes(contentType)) {
    throw new DocumentServiceError(
      'Invalid file type. Only RTF, PDF, and DOCX files are allowed.',
      'INVALID_FILE_TYPE'
    );
  }
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new DocumentServiceError(
      `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`,
      'FILE_TOO_LARGE'
    );
  }
}

/**
 * Upload a document to an NDA
 * Story 4.1: Document Upload with Drag-Drop
 *
 * @param input - Document upload parameters
 * @param userContext - User context for authorization
 * @param auditMeta - Audit metadata (IP, user agent)
 * @returns Uploaded document record
 */
export async function uploadNdaDocument(
  input: DocumentUploadInput,
  userContext: UserContext,
  auditMeta?: { ipAddress?: string; userAgent?: string }
): Promise<DocumentResponse> {
  // Validate file
  validateFileType(input.filename, input.contentType);
  validateFileSize(input.fileSize);

  // Check NDA exists and user has access
  const nda = await findNdaWithScope(input.ndaId, userContext, {
    select: {
      id: true,
      displayId: true,
      companyName: true,
      status: true,
      agencyGroupId: true,
      subagencyId: true,
    },
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
  });

  if (!nda) {
    throw new DocumentServiceError('NDA not found', 'NDA_NOT_FOUND');
  }

  // Get next version number
  const lastDoc = await prisma.document.findFirst({
    where: { ndaId: input.ndaId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  });
  const nextVersion = (lastDoc?.versionNumber ?? 0) + 1;

  // Upload to S3
  const s3Result = await uploadDocument({
    ndaId: input.ndaId,
    filename: input.filename,
    content: input.content,
    contentType: input.contentType,
  });

  // Determine document type
  let documentType: DocumentType = 'UPLOADED';
  if (input.isFullyExecuted) {
    documentType = 'FULLY_EXECUTED';
  }

  // Create document record
  const document = await prisma.document.create({
    data: {
      ndaId: input.ndaId,
      filename: input.filename,
      s3Key: s3Result.s3Key,
      s3Region: 'us-east-1',
      fileType: input.contentType,
      fileSize: input.fileSize,
      documentType,
      isFullyExecuted: input.isFullyExecuted ?? false,
      versionNumber: nextVersion,
      notes: input.notes ?? `Uploaded by ${userContext.email}`,
      uploadedById: userContext.contactId,
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  // Log audit
  await auditService.log({
    action: AuditAction.DOCUMENT_UPLOADED,
    entityType: 'document',
    entityId: document.id,
    userId: userContext.contactId,
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
    details: {
      ndaId: input.ndaId,
      ndaDisplayId: nda.displayId,
      filename: input.filename,
      documentType,
      isFullyExecuted: input.isFullyExecuted,
      versionNumber: nextVersion,
    },
  });

  // Auto-transition status based on upload type (Story 3.12)
  let transitionResult: { previousStatus: string; newStatus: string } | undefined;
  if (input.isFullyExecuted) {
    try {
      transitionResult = await transitionStatus(
        input.ndaId,
        'FULLY_EXECUTED' as NdaStatus,
        StatusTrigger.FULLY_EXECUTED_UPLOAD,
        userContext,
        auditMeta
      );
    } catch {
      // Log but don't fail if transition doesn't apply
      console.log(`[Document] Could not auto-transition NDA ${input.ndaId} to FULLY_EXECUTED`);
    }
  } else {
    try {
      transitionResult = await attemptAutoTransition(
        input.ndaId,
        StatusTrigger.DOCUMENT_UPLOADED,
        userContext,
        auditMeta
      );
    } catch {
      console.log(`[Document] Could not auto-transition NDA ${input.ndaId} after upload`);
    }
  }

  try {
    const changedByName = userContext.name ?? userContext.email;
    await notifyStakeholders(
      {
        ndaId: input.ndaId,
        displayId: nda.displayId,
        companyName: nda.companyName,
        event: NotificationEvent.DOCUMENT_UPLOADED,
        changedBy: { id: userContext.contactId, name: changedByName },
        timestamp: new Date(),
      },
      userContext
    );

    if (transitionResult) {
      const event =
        transitionResult.newStatus === 'FULLY_EXECUTED'
          ? NotificationEvent.FULLY_EXECUTED
          : NotificationEvent.STATUS_CHANGED;

      await notifyStakeholders(
        {
          ndaId: input.ndaId,
          displayId: nda.displayId,
          companyName: nda.companyName,
          event,
          changedBy: { id: userContext.contactId, name: changedByName },
          timestamp: new Date(),
          previousValue: transitionResult.previousStatus,
          newValue: transitionResult.newStatus,
        },
        userContext
      );
    }
  } catch (notifyError) {
    console.error('[Document] Failed to notify stakeholders after upload', notifyError);
  }

  return formatDocumentResponse(document);
}

/**
 * Get documents for an NDA
 * Story 4.4: Document Version History
 *
 * @param ndaId - NDA ID
 * @param userContext - User context for authorization
 * @returns List of documents ordered by version
 */
export async function getNdaDocuments(
  ndaId: string,
  userContext: UserContext
): Promise<DocumentResponse[]> {
  // Check NDA exists and user has access
  const nda = await findNdaWithScope(ndaId, userContext, {
    select: {
      id: true,
      agencyGroupId: true,
      subagencyId: true,
    },
  });

  if (!nda) {
    throw new DocumentServiceError('NDA not found', 'NDA_NOT_FOUND');
  }

  const documents = await prisma.document.findMany({
    where: { ndaId },
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { uploadedAt: 'desc' },
  });

  return documents.map(formatDocumentResponse);
}

/**
 * Get download URL for a document
 * Story 4.3: Document Download with Pre-Signed URLs
 *
 * @param documentId - Document ID
 * @param userContext - User context for authorization
 * @param auditMeta - Audit metadata
 * @returns Pre-signed download URL
 */
export async function getDocumentDownloadUrl(
  documentId: string,
  userContext: UserContext,
  auditMeta?: { ipAddress?: string; userAgent?: string }
): Promise<{ url: string; filename: string }> {
  const securityFilter = await buildSecurityFilter(userContext);
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      nda: securityFilter,
    },
    include: {
      nda: {
        select: {
          id: true,
          displayId: true,
        },
      },
    },
  });

  if (!document) {
    throw new DocumentServiceError('Document not found', 'DOCUMENT_NOT_FOUND');
  }

  // Story 6.3: Log audit BEFORE generating pre-signed URL (AC2 compliance)
  // Non-blocking: Don't fail download if audit logging fails
  try {
    await auditService.log({
      action: AuditAction.DOCUMENT_DOWNLOADED,
      entityType: 'document',
      entityId: document.id,
      userId: userContext.contactId,
      ipAddress: auditMeta?.ipAddress,
      userAgent: auditMeta?.userAgent,
      details: {
        ndaId: document.ndaId,
        ndaDisplayId: document.nda.displayId,
        filename: document.filename,
      },
    });
  } catch (error) {
    // Log error but don't block download (Story 6.3 AC2)
    console.error('[DocumentService] Failed to log download audit:', error);
  }

  // Generate pre-signed URL (15 minutes TTL) - AFTER audit log attempt
  const url = await getDownloadUrl(document.s3Key, 900);

  return { url, filename: document.filename };
}

/**
 * Get a single document by ID
 */
export async function getDocument(
  documentId: string,
  userContext: UserContext
): Promise<DocumentResponse | null> {
  const securityFilter = await buildSecurityFilter(userContext);
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      nda: securityFilter,
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!document) {
    return null;
  }

  return formatDocumentResponse(document);
}

/**
 * Mark document as fully executed
 * Story 4.2: Mark Document as Fully Executed
 */
export async function markDocumentFullyExecuted(
  documentId: string,
  userContext: UserContext,
  auditMeta?: { ipAddress?: string; userAgent?: string }
): Promise<DocumentResponse> {
  const securityFilter = await buildSecurityFilter(userContext);
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      nda: securityFilter,
    },
    include: {
      nda: {
        select: {
          id: true,
          displayId: true,
        },
      },
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!document) {
    throw new DocumentServiceError('Document not found', 'DOCUMENT_NOT_FOUND');
  }

  // Update document
  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      isFullyExecuted: true,
      documentType: 'FULLY_EXECUTED',
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  // Log audit
  await auditService.log({
    action: AuditAction.DOCUMENT_MARKED_EXECUTED,
    entityType: 'document',
    entityId: documentId,
    userId: userContext.contactId,
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
    details: {
      ndaId: document.ndaId,
      ndaDisplayId: document.nda.displayId,
    },
  });

  // Story 10.4: Set execution date and calculate expiration (365 days)
  const executionDate = new Date();
  const expirationDate = new Date(executionDate);
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);

  await prisma.nda.update({
    where: { id: document.ndaId },
    data: {
      fullyExecutedDate: executionDate,
      expirationDate: expirationDate,
    },
  });

  // Auto-transition NDA status
  try {
    await transitionStatus(
      document.ndaId,
      'FULLY_EXECUTED' as NdaStatus,
      StatusTrigger.FULLY_EXECUTED_UPLOAD,
      userContext,
      auditMeta
    );
  } catch {
    console.log(`[Document] Could not auto-transition NDA ${document.ndaId}`);
  }

  return formatDocumentResponse(updated);
}

/**
 * Bulk download response type
 */
export interface BulkDownloadResult {
  stream: PassThrough;
  filename: string;
  documentCount: number;
}

/**
 * Create a ZIP archive of all documents for an NDA
 * Story 4.5: Download All Versions as ZIP
 *
 * @param ndaId - NDA ID
 * @param userContext - User context for authorization
 * @param auditMeta - Audit metadata
 * @returns ZIP stream and metadata
 */
export async function createBulkDownload(
  ndaId: string,
  userContext: UserContext,
  auditMeta?: { ipAddress?: string; userAgent?: string }
): Promise<BulkDownloadResult> {
  // Check NDA exists and user has access
  const nda = await findNdaWithScope(ndaId, userContext, {
    select: {
      id: true,
      displayId: true,
      companyName: true,
      agencyGroupId: true,
      subagencyId: true,
    },
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
  });

  if (!nda) {
    throw new DocumentServiceError('NDA not found', 'NDA_NOT_FOUND');
  }

  // Get all documents for this NDA
  const documents = await prisma.document.findMany({
    where: { ndaId },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      filename: true,
      s3Key: true,
      versionNumber: true,
      uploadedAt: true,
    },
  });

  if (documents.length === 0) {
    throw new DocumentServiceError('No documents found for this NDA', 'NO_DOCUMENTS');
  }

  // Create ZIP archive
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Maximum compression
  });

  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  // Add each document to the archive
  for (const doc of documents) {
    try {
      const content = await getS3DocumentContent(doc.s3Key);
      // Prefix filename with version number to avoid duplicates
      const safeBaseName = sanitizeZipEntryName(doc.filename, `document_${doc.id}`);
      const archiveFilename = `v${doc.versionNumber}_${safeBaseName}`;
      archive.append(content, { name: archiveFilename });
    } catch (error) {
      console.error(`[Document] Failed to add ${doc.filename} to archive:`, error);
      // Continue with other files even if one fails
    }
  }

  // Finalize the archive
  archive.finalize();

  // Generate ZIP filename
  const sanitizedCompany = nda.companyName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `NDA_${nda.displayId}_${sanitizedCompany}_documents.zip`;

  // Log audit
  await auditService.log({
    action: AuditAction.DOCUMENT_DOWNLOADED,
    entityType: 'nda',
    entityId: ndaId,
    userId: userContext.contactId,
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
    details: {
      ndaId,
      ndaDisplayId: nda.displayId,
      downloadType: 'bulk_zip',
      documentCount: documents.length,
    },
  });

  return {
    stream: passthrough,
    filename,
    documentCount: documents.length,
  };
}

function sanitizeZipEntryName(filename: string, fallback: string): string {
  const normalized = filename
    .replace(/[\0\r\n]/g, '') // prevent control chars / header issues
    .replace(/\\/g, '/'); // normalize Windows separators

  let base = path.posix.basename(normalized).trim();
  if (!base || base === '.' || base === '..') {
    base = fallback;
  }

  // Avoid extremely long names
  if (base.length > 200) {
    const ext = path.posix.extname(base);
    const stem = base.slice(0, 200 - ext.length);
    base = `${stem}${ext}`;
  }

  return base;
}

/**
 * Check if user has access to an agency
 */
/**
 * Get document content from S3 for editing
 *
 * @param ndaId - NDA ID
 * @param documentId - Document ID
 * @param userContext - User context for permissions
 * @returns RTF content as string
 */
export async function getDocumentContentWithAuth(
  ndaId: string,
  documentId: string,
  userContext: UserContext
): Promise<string> {
  // Find document with agency scoping
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      ndaId,
    },
    include: {
      nda: {
        include: {
          subagency: true,
        },
      },
    },
  });

  if (!document) {
    throw new DocumentServiceError('Document not found', 'NOT_FOUND');
  }

  // Check agency access
  if (!document.nda.subagencyId) {
    throw new DocumentServiceError('Document NDA has no subagency', 'INVALID_STATE');
  }
  const hasAccess = userContext.authorizedSubagencies.includes(document.nda.subagencyId);
  if (!hasAccess) {
    throw new DocumentServiceError('Access denied', 'ACCESS_DENIED');
  }

  // Download from S3 and convert to string
  const buffer = await getS3DocumentContent(document.s3Key);
  return buffer.toString('utf-8');
}

/**
 * Format document for API response
 */
function formatDocumentResponse(document: any): DocumentResponse {
  return {
    id: document.id,
    ndaId: document.ndaId,
    filename: document.filename,
    fileType: document.fileType,
    fileSize: document.fileSize,
    documentType: document.documentType,
    isFullyExecuted: document.isFullyExecuted,
    versionNumber: document.versionNumber,
    notes: document.notes,
    uploadedById: document.uploadedById,
    uploadedBy: document.uploadedBy,
    uploadedAt: document.uploadedAt,
  };
}

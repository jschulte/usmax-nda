/**
 * Document Generation Service
 * Story 3.5: RTF Document Generation
 *
 * Handles NDA document generation:
 * - Template field merging with placeholder replacement
 * - RTF generation from stored template content
 * - S3 storage integration
 * - Database record creation
 * - Audit logging
 */

import { prisma } from '../db/index.js';
import { uploadDocument } from './s3Service.js';
import { auditService, AuditAction } from './auditService.js';
import type { UserContext } from '../types/auth.js';
import type { Nda, DocumentType } from '../../generated/prisma/index.js';
import { buildSecurityFilter } from './ndaService.js';
import { findNdaWithScope } from '../utils/scopedQuery.js';
import { getNextVersionNumber } from '../utils/versionNumberHelper.js';
import { generateDocumentNotes } from '../utils/documentNotesGenerator.js';
import { reportError } from './errorReportingService.js';
import {
  mergeTemplateContent,
  extractPlaceholders,
  MergeError,
  TemplateError,
} from './rtfMergeService.js';
import { VALID_PLACEHOLDERS } from '../constants/templatePlaceholders.js';

// Re-export DocumentType
export { DocumentType } from '../../generated/prisma/index.js';

/**
 * Document Generation Error
 */
export class DocumentGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error,
    public details?: Record<string, unknown>,
    public reported: boolean = false
  ) {
    super(message);
    this.name = 'DocumentGenerationError';
  }
}

/**
 * Input for document generation
 */
export interface GenerateDocumentInput {
  ndaId: string;
  templateId?: string; // Optional - uses default if not provided
}

/**
 * Result of document generation
 */
export interface GenerateDocumentResult {
  documentId: string;
  filename: string;
  s3Key: string;
}

/**
 * Audit metadata
 */
interface AuditMeta {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Generate document from NDA data
 *
 * @param input - Document generation parameters
 * @param userContext - Current user context for security
 * @param auditMeta - Optional audit metadata
 * @returns Generated document result
 * @throws DocumentGenerationError on failure
 */
export async function generateDocument(
  input: GenerateDocumentInput,
  userContext: UserContext,
  auditMeta?: AuditMeta
): Promise<GenerateDocumentResult> {
  // Get NDA with related data
  const nda = await getNdaWithRelations(input.ndaId, userContext);
  if (!nda) {
    throw new DocumentGenerationError(
      'NDA not found or access denied',
      'NDA_NOT_FOUND'
    );
  }

  // Check if non-USmax NDA should skip generation
  if (nda.isNonUsMax) {
    const skipGeneration = await checkNonUsMaxSkipSetting();
    if (skipGeneration) {
      throw new DocumentGenerationError(
        'Non-USmax NDAs do not require generated documents',
        'NON_USMAX_SKIP'
      );
    }
  }

  // Resolve template (selected or default)
  const template = await getTemplateForNda(nda, input.templateId);

  const mergeContext = {
    generatedAt: new Date(),
    timeZone: 'UTC',
    locale: 'en-US',
    generatedBy: {
      id: userContext.id,
      name: userContext.name,
      email: userContext.email,
    },
  };

  let mergeResult: { mergedContent: string; unknownPlaceholders: string[] };
  const templateText = template.content.toString('utf8');
  const extractedPlaceholders = extractPlaceholders(templateText);
  const unknownPlaceholders = extractedPlaceholders.filter(
    (placeholder) => !VALID_PLACEHOLDERS.includes(placeholder as (typeof VALID_PLACEHOLDERS)[number])
  );

  try {
    mergeResult = mergeTemplateContent(templateText, nda, mergeContext);
  } catch (error) {
    reportError(error, {
      ndaId: nda.id,
      templateId: template.id,
      userId: userContext.id,
    });

    await auditService.log({
      action: AuditAction.DOCUMENT_GENERATION_FAILED,
      entityType: 'nda',
      entityId: nda.id,
      userId: userContext.id,
      details: {
        ndaId: nda.id,
        ndaDisplayId: nda.displayId,
        templateId: template.id,
        error: error instanceof Error ? error.message : String(error),
        unknownPlaceholders,
      },
      ipAddress: auditMeta?.ipAddress,
      userAgent: auditMeta?.userAgent,
    });

    if (error instanceof TemplateError) {
      throw new DocumentGenerationError(
        error.message,
        'INVALID_TEMPLATE',
        error,
        { unknownPlaceholders },
        true
      );
    }

    if (error instanceof MergeError) {
      throw new DocumentGenerationError(
        error.message,
        'MERGE_ERROR',
        error,
        { field: error.field, unknownPlaceholders },
        true
      );
    }

    throw new DocumentGenerationError(
      'Document generation failed. Please try again.',
      'MERGE_ERROR',
      error instanceof Error ? error : undefined,
      { unknownPlaceholders },
      true
    );
  }

  if (unknownPlaceholders.length > 0) {
    reportError(
      new Error('Unknown placeholders found in template'),
      {
        ndaId: nda.id,
        templateId: template.id,
        unknownPlaceholders,
        userId: userContext.id,
      },
      'warning'
    );
  }

  const rtfBuffer = Buffer.from(mergeResult.mergedContent, 'utf8');

  // Generate filename
  const filename = generateFilename(nda);

  // Determine next version number
  const nextVersion = await getNextVersionNumber(nda.id);

  // Upload to S3
  const uploadResult = await uploadDocument({
    ndaId: nda.id,
    filename,
    content: rtfBuffer,
    contentType: 'application/rtf',
    uploadedById: userContext.contactId,
    documentType: 'GENERATED',
    versionNumber: nextVersion,
  });

  const notes = generateDocumentNotes('GENERATED', {
    uploaderName: userContext.name || userContext.email,
    templateName: template.name,
  });

  // Create document record in database
  const document = await prisma.document.create({
    data: {
      id: uploadResult.documentId,
      ndaId: nda.id,
      filename,
      s3Key: uploadResult.s3Key,
      documentType: 'GENERATED',
      fileType: 'application/rtf',
      uploadedById: userContext.contactId,
      fileSize: rtfBuffer.length,
      versionNumber: nextVersion,
      notes,
      s3Region: process.env.AWS_REGION || 'us-east-1',
    },
  });

  // Audit log
  await auditService.log({
    action: AuditAction.DOCUMENT_GENERATED,
    entityType: 'document',
    entityId: document.id,
    userId: userContext.id,
    details: {
      ndaId: nda.id,
      ndaDisplayId: nda.displayId,
      filename,
      s3Key: uploadResult.s3Key,
      templateId: template.id,
      unknownPlaceholders: mergeResult.unknownPlaceholders,
    },
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
  });

  return {
    documentId: document.id,
    filename,
    s3Key: uploadResult.s3Key,
  };
}

/**
 * Get NDA with all related data for document generation
 */
async function getNdaWithRelations(
  ndaId: string,
  userContext: UserContext
): Promise<Nda & {
  agencyGroup: { name: string };
  subagency?: { name: string; agencyGroup?: { name: string } } | null;
  opportunityPoc: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    workPhone?: string | null;
    cellPhone?: string | null;
  };
  contractsPoc?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    workPhone?: string | null;
    cellPhone?: string | null;
  } | null;
  relationshipPoc: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    workPhone?: string | null;
    cellPhone?: string | null;
  };
  contactsPoc?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    workPhone?: string | null;
    cellPhone?: string | null;
  } | null;
  createdBy?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
} | null> {
  return findNdaWithScope(ndaId, userContext, {
    include: {
      agencyGroup: { select: { name: true } },
      subagency: { select: { name: true, agencyGroup: { select: { name: true } } } },
      opportunityPoc: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          workPhone: true,
          cellPhone: true,
        },
      },
      contractsPoc: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          workPhone: true,
          cellPhone: true,
        },
      },
      relationshipPoc: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          workPhone: true,
          cellPhone: true,
        },
      },
      contactsPoc: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          workPhone: true,
          cellPhone: true,
        },
      },
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Check system config for non-USmax skip setting
 */
async function checkNonUsMaxSkipSetting(): Promise<boolean> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'non_usmax_skip_template' },
  });

  if (!config) {
    return false;
  }

  const raw = config.value?.trim().toLowerCase();
  if (!raw) return false;

  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  if (raw === 'false' || raw === '0' || raw === 'no') return false;

  try {
    const parsed = JSON.parse(config.value);
    return Boolean(parsed);
  } catch {
    return false;
  }
}

/**
 * Resolve template to use for generation
 */
async function getTemplateForNda(
  nda: Nda,
  templateId?: string
): Promise<{ id: string; name: string; content: Buffer }> {
  if (templateId) {
    const template = await prisma.rtfTemplate.findFirst({
      where: { id: templateId, isActive: true },
    });
    if (!template) {
      throw new DocumentGenerationError('Template not found', 'TEMPLATE_NOT_FOUND');
    }
    return { id: template.id, name: template.name, content: Buffer.from(template.content) };
  }

  if (nda.rtfTemplateId) {
    const selected = await prisma.rtfTemplate.findFirst({
      where: { id: nda.rtfTemplateId, isActive: true },
    });
    if (selected) {
      return { id: selected.id, name: selected.name, content: Buffer.from(selected.content) };
    }
  }

  const agencyDefault = await prisma.rtfTemplate.findFirst({
    where: { agencyGroupId: nda.agencyGroupId, isDefault: true, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (agencyDefault) {
    return { id: agencyDefault.id, name: agencyDefault.name, content: Buffer.from(agencyDefault.content) };
  }

  const anyAgency = await prisma.rtfTemplate.findFirst({
    where: { agencyGroupId: nda.agencyGroupId, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (anyAgency) {
    return { id: anyAgency.id, name: anyAgency.name, content: Buffer.from(anyAgency.content) };
  }

  const globalDefault = await prisma.rtfTemplate.findFirst({
    where: { agencyGroupId: null, isDefault: true, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (globalDefault) {
    return { id: globalDefault.id, name: globalDefault.name, content: Buffer.from(globalDefault.content) };
  }

  const anyGlobal = await prisma.rtfTemplate.findFirst({
    where: { agencyGroupId: null, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (anyGlobal) {
    return { id: anyGlobal.id, name: anyGlobal.name, content: Buffer.from(anyGlobal.content) };
  }

  throw new DocumentGenerationError('No active template available', 'TEMPLATE_NOT_FOUND');
}

/**
 * Merge NDA fields into RTF template content
 */
/**
 * Generate filename for the document
 */
function generateFilename(nda: Nda): string {
  const displayIdPadded = nda.displayId.toString().padStart(6, '0');
  const sanitizedCompany = nda.companyName
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 30);

  return `NDA-${displayIdPadded}-${sanitizedCompany}.rtf`;
}

/**
 * Get document by ID with security check
 */
export async function getDocumentById(
  documentId: string,
  userContext: UserContext
): Promise<{
  id: string;
  ndaId: string;
  filename: string;
  s3Key: string;
  documentType: DocumentType;
  uploadedAt: Date;
} | null> {
  const securityFilter = await buildSecurityFilter(userContext);
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      nda: securityFilter,
    },
  });

  if (!document) return null;

  return {
    id: document.id,
    ndaId: document.ndaId,
    filename: document.filename,
    s3Key: document.s3Key,
    documentType: document.documentType,
    uploadedAt: document.uploadedAt,
  };
}

/**
 * List documents for an NDA
 */
export async function listNdaDocuments(
  ndaId: string,
  userContext: UserContext
): Promise<Array<{
  id: string;
  filename: string;
  s3Key: string;
  documentType: DocumentType;
  uploadedAt: Date;
  uploadedBy: { firstName?: string | null; lastName?: string | null };
}>> {
  // First verify access to the NDA
  const nda = await findNdaWithScope(ndaId, userContext, {
    select: { id: true },
  });

  if (!nda) return [];

  const documents = await prisma.document.findMany({
    where: { ndaId },
    orderBy: { uploadedAt: 'desc' },
    include: {
      uploadedBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  return documents.map((doc) => ({
    id: doc.id,
    filename: doc.filename,
    s3Key: doc.s3Key,
    documentType: doc.documentType,
    uploadedAt: doc.uploadedAt,
    uploadedBy: doc.uploadedBy,
  }));
}

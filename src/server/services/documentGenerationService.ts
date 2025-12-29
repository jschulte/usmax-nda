/**
 * Document Generation Service
 * Story 3.5: RTF Document Generation
 *
 * Handles NDA document generation:
 * - Template field merging with Handlebars
 * - RTF generation from stored template content
 * - S3 storage integration
 * - Database record creation
 * - Audit logging
 */

import Handlebars from 'handlebars';
import { prisma } from '../db/index.js';
import { uploadDocument } from './s3Service.js';
import { auditService, AuditAction } from './auditService.js';
import type { UserContext } from '../types/auth.js';
import type { Nda, DocumentType } from '../../generated/prisma/index.js';
import { buildSecurityFilter } from './ndaService.js';
import { findNdaWithScope } from '../utils/scopedQuery.js';

// Re-export DocumentType
export { DocumentType } from '../../generated/prisma/index.js';

/**
 * Document Generation Error
 */
export class DocumentGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
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
 * NDA fields for template merging
 */
interface NdaTemplateFields {
  companyName: string;
  companyCity?: string;
  companyState?: string;
  stateOfIncorporation?: string;
  agencyGroupName?: string;
  subagencyName?: string;
  agencyOfficeName?: string;
  abbreviatedName: string;
  authorizedPurpose: string;
  effectiveDate?: string;
  usMaxPosition: string;
  ndaType: string;
  opportunityPocName?: string;
  contractsPocName?: string;
  relationshipPocName?: string;
  contactsPocName?: string;
  displayId: number;
  generatedDate: string;
}

/**
 * Register Handlebars helpers
 */
function registerHandlebarsHelpers(): void {
  // Date formatting helper
  Handlebars.registerHelper('formatDate', (date: Date | string | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  // Uppercase helper
  Handlebars.registerHelper('uppercase', (str: string) => {
    return str?.toUpperCase() || '';
  });

  // Conditional helper
  Handlebars.registerHelper('ifEquals', function (this: unknown, arg1: unknown, arg2: unknown, options: Handlebars.HelperOptions) {
    return arg1 === arg2 ? options.fn(this) : options.inverse(this);
  });
}

// Register helpers once on module load
registerHandlebarsHelpers();

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

  // Extract template fields
  const templateFields = extractTemplateFields(nda);

  // Resolve template (selected or default)
  const template = await getTemplateForNda(nda, input.templateId);

  // Merge fields into RTF template
  const rtfContent = mergeTemplate(template.content.toString('utf8'), templateFields);
  const rtfBuffer = Buffer.from(rtfContent, 'utf8');

  // Generate filename
  const filename = generateFilename(nda);

  // Upload to S3
  const uploadResult = await uploadDocument({
    ndaId: nda.id,
    filename,
    content: rtfBuffer,
    contentType: 'application/rtf',
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
  subagency?: { name: string } | null;
  opportunityPoc: { firstName?: string | null; lastName?: string | null };
  contractsPoc?: { firstName?: string | null; lastName?: string | null } | null;
  relationshipPoc: { firstName?: string | null; lastName?: string | null };
  contactsPoc?: { firstName?: string | null; lastName?: string | null } | null;
} | null> {
  return findNdaWithScope(ndaId, userContext, {
    include: {
      agencyGroup: { select: { name: true } },
      subagency: { select: { name: true } },
      opportunityPoc: { select: { firstName: true, lastName: true } },
      contractsPoc: { select: { firstName: true, lastName: true } },
      relationshipPoc: { select: { firstName: true, lastName: true } },
      contactsPoc: { select: { firstName: true, lastName: true } },
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
 * Extract template fields from NDA
 */
function extractTemplateFields(nda: Nda & {
  agencyGroup: { name: string };
  subagency?: { name: string } | null;
  opportunityPoc: { firstName?: string | null; lastName?: string | null };
  contractsPoc?: { firstName?: string | null; lastName?: string | null } | null;
  relationshipPoc: { firstName?: string | null; lastName?: string | null };
  contactsPoc?: { firstName?: string | null; lastName?: string | null } | null;
}): NdaTemplateFields {
  const formatName = (poc: { firstName?: string | null; lastName?: string | null } | null | undefined): string => {
    if (!poc) return '';
    return [poc.firstName, poc.lastName].filter(Boolean).join(' ');
  };

  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const positionMap: Record<string, string> = {
    PRIME: 'Prime Contractor',
    SUB: 'Subcontractor',
    TEAMING: 'Teaming Partner',
    OTHER: 'Other',
  };

  return {
    companyName: nda.companyName,
    companyCity: nda.companyCity || undefined,
    companyState: nda.companyState || undefined,
    stateOfIncorporation: nda.stateOfIncorporation || undefined,
    agencyGroupName: nda.agencyGroup.name,
    subagencyName: nda.subagency?.name || undefined,
    agencyOfficeName: nda.agencyOfficeName || undefined,
    abbreviatedName: nda.abbreviatedName,
    authorizedPurpose: nda.authorizedPurpose,
    effectiveDate: formatDate(nda.effectiveDate),
    usMaxPosition: positionMap[nda.usMaxPosition] || nda.usMaxPosition,
    ndaType: nda.ndaType,
    opportunityPocName: formatName(nda.opportunityPoc),
    contractsPocName: formatName(nda.contractsPoc) || undefined,
    relationshipPocName: formatName(nda.relationshipPoc),
    contactsPocName: formatName(nda.contactsPoc) || undefined,
    displayId: nda.displayId,
    generatedDate: formatDate(new Date()),
  };
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
function mergeTemplate(templateContent: string, fields: NdaTemplateFields): string {
  const template = Handlebars.compile(templateContent);
  return template(fields);
}

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

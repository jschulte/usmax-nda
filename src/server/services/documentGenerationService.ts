/**
 * Document Generation Service
 * Story 3.5: RTF Document Generation
 *
 * Handles NDA document generation:
 * - Template field merging with Handlebars
 * - DOCX generation using docx library
 * - S3 storage integration
 * - Database record creation
 * - Audit logging
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';
import Handlebars from 'handlebars';
import { prisma } from '../db/index.js';
import { uploadDocument } from './s3Service.js';
import { auditService, AuditAction } from './auditService.js';
import type { UserContext } from '../types/auth.js';
import type { Nda, DocumentType } from '../../generated/prisma/index.js';

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
  opportunityPocName?: string;
  contractsPocName?: string;
  relationshipPocName?: string;
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

  // Check if non-USMax NDA should skip generation
  if (nda.isNonUsMax) {
    const skipGeneration = await checkNonUsMaxSkipSetting();
    if (skipGeneration) {
      throw new DocumentGenerationError(
        'Non-USMax NDAs do not require generated documents',
        'NON_USMAX_SKIP'
      );
    }
  }

  // Extract template fields
  const templateFields = extractTemplateFields(nda);

  // Generate DOCX content
  const docxBuffer = await generateDocx(templateFields);

  // Generate filename
  const filename = generateFilename(nda);

  // Upload to S3
  const uploadResult = await uploadDocument({
    ndaId: nda.id,
    filename,
    content: docxBuffer,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  // Create document record in database
  const document = await prisma.document.create({
    data: {
      id: uploadResult.documentId,
      ndaId: nda.id,
      filename,
      s3Key: uploadResult.s3Key,
      documentType: 'GENERATED',
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
} | null> {
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    include: {
      agencyGroup: { select: { name: true } },
      subagency: { select: { name: true } },
      opportunityPoc: { select: { firstName: true, lastName: true } },
      contractsPoc: { select: { firstName: true, lastName: true } },
      relationshipPoc: { select: { firstName: true, lastName: true } },
    },
  });

  if (!nda) return null;

  // Security check: verify user has access to this NDA's agency
  const hasAccess = await checkAgencyAccess(nda.agencyGroupId, nda.subagencyId, userContext);
  if (!hasAccess) return null;

  return nda;
}

/**
 * Check if user has access to NDA's agency
 */
async function checkAgencyAccess(
  agencyGroupId: string,
  subagencyId: string | null,
  userContext: UserContext
): Promise<boolean> {
  // Admins have full access
  if (userContext.permissions.has('admin:bypass')) {
    return true;
  }

  // Check agency group access
  if (userContext.authorizedAgencyGroups.includes(agencyGroupId)) {
    return true;
  }

  // Check subagency access
  if (subagencyId && userContext.authorizedSubagencies.includes(subagencyId)) {
    return true;
  }

  return false;
}

/**
 * Check system config for non-USMax skip setting
 */
async function checkNonUsMaxSkipSetting(): Promise<boolean> {
  // Default to false - generate documents for all NDAs
  // This would be configurable via system_config table in production
  return false;
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
    opportunityPocName: formatName(nda.opportunityPoc),
    contractsPocName: formatName(nda.contractsPoc) || undefined,
    relationshipPocName: formatName(nda.relationshipPoc),
    displayId: nda.displayId,
    generatedDate: formatDate(new Date()),
  };
}

/**
 * Generate DOCX document from template fields
 */
async function generateDocx(fields: NdaTemplateFields): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          // Header
          new Paragraph({
            children: [
              new TextRun({
                text: 'NON-DISCLOSURE AGREEMENT',
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400 },
          }),

          // NDA Reference Number
          new Paragraph({
            children: [
              new TextRun({
                text: `NDA Reference: NDA-${fields.displayId.toString().padStart(6, '0')}`,
                bold: true,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Effective Date
          new Paragraph({
            children: [
              new TextRun({
                text: `Effective Date: ${fields.effectiveDate || '[TO BE DETERMINED]'}`,
                size: 22,
              }),
            ],
            spacing: { after: 200 },
          }),

          // Parties Section
          new Paragraph({
            children: [
              new TextRun({
                text: 'BETWEEN:',
                bold: true,
                size: 22,
              }),
            ],
            spacing: { before: 400, after: 200 },
          }),

          // Company Information
          new Paragraph({
            children: [
              new TextRun({
                text: `${fields.companyName}`,
                bold: true,
                size: 22,
              }),
            ],
          }),
          ...(fields.companyCity || fields.companyState
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: [fields.companyCity, fields.companyState]
                        .filter(Boolean)
                        .join(', '),
                      size: 22,
                    }),
                  ],
                }),
              ]
            : []),
          ...(fields.stateOfIncorporation
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `State of Incorporation: ${fields.stateOfIncorporation}`,
                      size: 22,
                    }),
                  ],
                }),
              ]
            : []),

          // AND
          new Paragraph({
            children: [
              new TextRun({
                text: 'AND',
                bold: true,
                size: 22,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 300 },
          }),

          // USMax
          new Paragraph({
            children: [
              new TextRun({
                text: 'USMAX Corporation',
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Acting as ${fields.usMaxPosition}`,
                size: 22,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Agency Information
          new Paragraph({
            children: [
              new TextRun({
                text: 'REGARDING:',
                bold: true,
                size: 22,
              }),
            ],
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Agency: ${fields.agencyGroupName}${fields.subagencyName ? ` - ${fields.subagencyName}` : ''}`,
                size: 22,
              }),
            ],
          }),
          ...(fields.agencyOfficeName
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Office: ${fields.agencyOfficeName}`,
                      size: 22,
                    }),
                  ],
                }),
              ]
            : []),

          // Purpose Section
          new Paragraph({
            children: [
              new TextRun({
                text: 'PURPOSE:',
                bold: true,
                size: 22,
              }),
            ],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: fields.authorizedPurpose,
                size: 22,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Abbreviated Name
          new Paragraph({
            children: [
              new TextRun({
                text: `Project Reference: ${fields.abbreviatedName}`,
                size: 22,
                italics: true,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Standard NDA Terms (placeholder)
          new Paragraph({
            children: [
              new TextRun({
                text: 'TERMS AND CONDITIONS:',
                bold: true,
                size: 22,
              }),
            ],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '[Standard NDA terms and conditions would be inserted here from template]',
                size: 22,
                italics: true,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Signatures Section
          new Paragraph({
            children: [
              new TextRun({
                text: 'SIGNATURES:',
                bold: true,
                size: 22,
              }),
            ],
            spacing: { before: 400, after: 400 },
          }),

          // Company Signature Block
          new Paragraph({
            children: [
              new TextRun({
                text: `For ${fields.companyName}:`,
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '____________________________',
                size: 22,
              }),
            ],
            spacing: { before: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Signature',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '____________________________',
                size: 22,
              }),
            ],
            spacing: { before: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Name and Title',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '____________________________',
                size: 22,
              }),
            ],
            spacing: { before: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Date',
                size: 20,
              }),
            ],
            spacing: { after: 400 },
          }),

          // USMAX Signature Block
          new Paragraph({
            children: [
              new TextRun({
                text: 'For USMAX Corporation:',
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '____________________________',
                size: 22,
              }),
            ],
            spacing: { before: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Signature',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '____________________________',
                size: 22,
              }),
            ],
            spacing: { before: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Name and Title',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '____________________________',
                size: 22,
              }),
            ],
            spacing: { before: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Date',
                size: 20,
              }),
            ],
            spacing: { after: 600 },
          }),

          // Footer
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated: ${fields.generatedDate}`,
                size: 18,
                italics: true,
                color: '666666',
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
        ],
      },
    ],
  });

  // Convert to buffer
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
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

  return `NDA-${displayIdPadded}-${sanitizedCompany}.docx`;
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
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      nda: {
        select: {
          agencyGroupId: true,
          subagencyId: true,
        },
      },
    },
  });

  if (!document) return null;

  // Security check
  const hasAccess = await checkAgencyAccess(
    document.nda.agencyGroupId,
    document.nda.subagencyId,
    userContext
  );
  if (!hasAccess) return null;

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
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    select: { agencyGroupId: true, subagencyId: true },
  });

  if (!nda) return [];

  const hasAccess = await checkAgencyAccess(nda.agencyGroupId, nda.subagencyId, userContext);
  if (!hasAccess) return [];

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

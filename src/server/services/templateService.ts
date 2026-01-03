/**
 * Template Service
 * Story 3.13: RTF Template Selection & Preview
 *
 * Handles RTF template management:
 * - Template listing with recommendations based on agency
 * - Document preview generation
 * - Edited document saving
 */

import type { Prisma, NdaType } from '../../generated/prisma/index.js';
import { prisma } from '../db/index.js';
import { uploadDocument, getDownloadUrl } from './s3Service.js';
import { auditService, AuditAction } from './auditService.js';
import type { UserContext } from '../types/auth.js';
import { findNdaWithScope } from '../utils/scopedQuery.js';
import { detectFieldChanges } from '../utils/detectFieldChanges.js';
import { validateRtfStructure, validateHtmlPlaceholders } from './rtfTemplateValidation.js';
import { extractPlaceholders } from './templatePreviewService.js';
import { parseRTF, toHTML } from '@jonahschulte/rtf-toolkit';
import { getNextVersionNumber } from '../utils/versionNumberHelper.js';

/**
 * Custom error for template service operations
 */
export class TemplateServiceError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'ACCESS_DENIED' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'TemplateServiceError';
  }
}

/**
 * Template with recommendation flag
 */
export interface RtfTemplateWithRecommendation {
  id: string;
  name: string;
  description: string | null;
  agencyGroupId: string | null;
  agencyGroup: { id: string; name: string; code: string } | null;
  isDefault: boolean;
  isActive: boolean;
  isRecommended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RtfTemplateDefaultAssignment {
  id: string;
  templateId: string;
  agencyGroupId: string | null;
  subagencyId: string | null;
  ndaType: NdaType | null;
  agencyGroup: { id: string; name: string; code: string } | null;
  subagency: { id: string; name: string; code: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Preview response data
 */
export interface PreviewResponse {
  previewUrl: string;
  htmlContent?: string; // HTML version for inline display
  mergedFields: Record<string, string>;
  templateUsed: {
    id: string;
    name: string;
  };
  expiresAt: Date;
}

/**
 * Audit metadata
 */
interface AuditMeta {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Get all active templates with recommendations for a specific agency
 *
 * @param agencyGroupId - Agency group ID for recommendation matching
 * @returns List of templates with isRecommended flag
 */
export async function resolveDefaultTemplateId(
  agencyGroupId: string,
  subagencyId?: string | null,
  ndaType?: NdaType | null
): Promise<string | undefined> {
  const scopes: Array<{
    agencyGroupId: string | null;
    subagencyId: string | null;
    ndaType: NdaType | null;
  }> = [];

  if (subagencyId) {
    scopes.push({ agencyGroupId, subagencyId, ndaType: ndaType ?? null });
    scopes.push({ agencyGroupId, subagencyId, ndaType: null });
  }

  scopes.push({ agencyGroupId, subagencyId: null, ndaType: ndaType ?? null });
  scopes.push({ agencyGroupId, subagencyId: null, ndaType: null });
  scopes.push({ agencyGroupId: null, subagencyId: null, ndaType: ndaType ?? null });
  scopes.push({ agencyGroupId: null, subagencyId: null, ndaType: null });

  for (const scope of scopes) {
    const match = await prisma.rtfTemplateDefault.findFirst({
      where: {
        agencyGroupId: scope.agencyGroupId,
        subagencyId: scope.subagencyId,
        ndaType: scope.ndaType,
        template: { isActive: true },
      },
      orderBy: { updatedAt: 'desc' },
      select: { templateId: true },
    });
    if (match) return match.templateId;
  }

  return undefined;
}

export async function getTemplatesForNda(
  agencyGroupId: string,
  subagencyId?: string | null,
  ndaType?: NdaType | null
): Promise<RtfTemplateWithRecommendation[]> {
  const templates = await prisma.rtfTemplate.findMany({
    where: { isActive: true },
    orderBy: [
      { isDefault: 'desc' }, // Default templates first
      { name: 'asc' },
    ],
    include: {
      agencyGroup: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  const defaultTemplateId = await resolveDefaultTemplateId(
    agencyGroupId,
    subagencyId,
    ndaType
  );

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    agencyGroupId: t.agencyGroupId,
    agencyGroup: t.agencyGroup,
    isDefault: t.isDefault,
    isActive: t.isActive,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    // Recommended if:
    // 1. Template is specific to this agency group, OR
    // 2. Template is generic (no agencyGroupId) AND is default
    isRecommended: defaultTemplateId
      ? t.id === defaultTemplateId
      : t.agencyGroupId === agencyGroupId ||
        (t.isDefault && t.agencyGroupId === null),
  }));
}

/**
 * Get all templates (admin)
 */
export async function listTemplates(
  includeInactive = false,
  options?: { agencyGroupId?: string; subagencyId?: string; ndaType?: NdaType }
): Promise<RtfTemplateWithRecommendation[]> {
  const templates = await prisma.rtfTemplate.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    include: {
      agencyGroup: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  const defaultTemplateId = options?.agencyGroupId
    ? await resolveDefaultTemplateId(
        options.agencyGroupId,
        options.subagencyId,
        options.ndaType
      )
    : undefined;

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    agencyGroupId: t.agencyGroupId,
    agencyGroup: t.agencyGroup,
    isDefault: t.isDefault,
    isActive: t.isActive,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    isRecommended: defaultTemplateId ? t.id === defaultTemplateId : t.isDefault,
  }));
}

/**
 * Get template by ID
 */
export async function getTemplate(
  templateId: string
): Promise<{
  id: string;
  name: string;
  description: string | null;
  content: Buffer;
  agencyGroupId: string | null;
  isDefault: boolean;
  isActive: boolean;
} | null> {
  const template = await prisma.rtfTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) return null;

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    content: Buffer.from(template.content as Uint8Array),
    agencyGroupId: template.agencyGroupId,
    isDefault: template.isDefault,
    isActive: template.isActive,
  };
}

export async function listTemplateDefaults(
  templateId: string
): Promise<RtfTemplateDefaultAssignment[]> {
  const defaults = await prisma.rtfTemplateDefault.findMany({
    where: { templateId },
    orderBy: { updatedAt: 'desc' },
    include: {
      agencyGroup: { select: { id: true, name: true, code: true } },
      subagency: { select: { id: true, name: true, code: true } },
    },
  });

  return defaults.map((d) => ({
    id: d.id,
    templateId: d.templateId,
    agencyGroupId: d.agencyGroupId,
    subagencyId: d.subagencyId,
    ndaType: d.ndaType,
    agencyGroup: d.agencyGroup,
    subagency: d.subagency,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));
}

export async function assignTemplateDefault(
  templateId: string,
  data: { agencyGroupId?: string | null; subagencyId?: string | null; ndaType?: NdaType | null },
  userContext: UserContext,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<RtfTemplateDefaultAssignment> {
  return prisma.$transaction(async (tx) => {
    const template = await tx.rtfTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, name: true, isActive: true },
    });

    if (!template) {
      throw new TemplateServiceError('Template not found', 'NOT_FOUND');
    }

    if (!template.isActive) {
      throw new TemplateServiceError('Cannot assign defaults to inactive template', 'VALIDATION_ERROR');
    }

    let agencyGroupId = data.agencyGroupId ?? null;
    const subagencyId = data.subagencyId ?? null;
    const ndaType = data.ndaType ?? null;

    if (subagencyId) {
      const subagency = await tx.subagency.findUnique({
        where: { id: subagencyId },
        select: { id: true, agencyGroupId: true },
      });
      if (!subagency) {
        throw new TemplateServiceError('Subagency not found', 'VALIDATION_ERROR');
      }
      if (agencyGroupId && agencyGroupId !== subagency.agencyGroupId) {
        throw new TemplateServiceError(
          'Subagency does not belong to selected agency group',
          'VALIDATION_ERROR'
        );
      }
      agencyGroupId = subagency.agencyGroupId;
    }

    const existing = await tx.rtfTemplateDefault.findMany({
      where: { agencyGroupId, subagencyId, ndaType },
      select: { id: true, templateId: true },
    });

    if (existing.length === 1 && existing[0]?.templateId === templateId) {
      const current = await tx.rtfTemplateDefault.findUnique({
        where: { id: existing[0].id },
        include: {
          agencyGroup: { select: { id: true, name: true, code: true } },
          subagency: { select: { id: true, name: true, code: true } },
        },
      });
      if (!current) {
        throw new TemplateServiceError('Default template not found', 'NOT_FOUND');
      }
      return {
        id: current.id,
        templateId: current.templateId,
        agencyGroupId: current.agencyGroupId,
        subagencyId: current.subagencyId,
        ndaType: current.ndaType,
        agencyGroup: current.agencyGroup,
        subagency: current.subagency,
        createdAt: current.createdAt,
        updatedAt: current.updatedAt,
      };
    }

    if (existing.length > 0) {
      await tx.rtfTemplateDefault.deleteMany({
        where: { agencyGroupId, subagencyId, ndaType },
      });
    }

    const created = await tx.rtfTemplateDefault.create({
      data: {
        templateId,
        agencyGroupId,
        subagencyId,
        ndaType,
        createdById: userContext.contactId,
      },
      include: {
        agencyGroup: { select: { id: true, name: true, code: true } },
        subagency: { select: { id: true, name: true, code: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        action: AuditAction.RTF_TEMPLATE_DEFAULT_ASSIGNED,
        entityType: 'rtf_template_default',
        entityId: created.id,
        userId: userContext.contactId,
        details: {
          templateId,
          templateName: template.name,
          agencyGroupId,
          subagencyId,
          ndaType,
          replacedDefaultIds: existing.map((item) => item.id),
          replacedTemplateIds: existing.map((item) => item.templateId),
        } as unknown as Prisma.InputJsonValue,
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
      },
    });

    return {
      id: created.id,
      templateId: created.templateId,
      agencyGroupId: created.agencyGroupId,
      subagencyId: created.subagencyId,
      ndaType: created.ndaType,
      agencyGroup: created.agencyGroup,
      subagency: created.subagency,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  });
}

export async function removeTemplateDefault(
  defaultId: string,
  userContext: UserContext,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.rtfTemplateDefault.findUnique({
      where: { id: defaultId },
      include: { template: { select: { id: true, name: true } } },
    });

    if (!existing) {
      throw new TemplateServiceError('Default template not found', 'NOT_FOUND');
    }

    await tx.rtfTemplateDefault.delete({ where: { id: defaultId } });

    await tx.auditLog.create({
      data: {
        action: AuditAction.RTF_TEMPLATE_DEFAULT_REMOVED,
        entityType: 'rtf_template_default',
        entityId: defaultId,
        userId: userContext.contactId,
        details: {
          templateId: existing.templateId,
          templateName: existing.template?.name ?? null,
          agencyGroupId: existing.agencyGroupId,
          subagencyId: existing.subagencyId,
          ndaType: existing.ndaType,
        } as unknown as Prisma.InputJsonValue,
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
      },
    });
  });
}

/**
 * Generate preview document for an NDA
 *
 * @param ndaId - NDA to generate preview for
 * @param templateId - Optional template ID (uses recommended if not provided)
 * @param userContext - Current user context
 * @returns Preview URL and metadata
 */
export async function generatePreview(
  ndaId: string,
  templateId: string | undefined,
  userContext: UserContext,
  auditMeta?: AuditMeta
): Promise<PreviewResponse> {
  // Get NDA with related data
  const nda = await findNdaWithScope(ndaId, userContext, {
    include: {
      agencyGroup: { select: { id: true, name: true, code: true } },
      subagency: { select: { id: true, name: true } },
      opportunityPoc: { select: { firstName: true, lastName: true } },
      contractsPoc: { select: { firstName: true, lastName: true } },
      relationshipPoc: { select: { firstName: true, lastName: true } },
    },
  });

  if (!nda) {
    throw new TemplateServiceError('NDA not found', 'NOT_FOUND');
  }

  // Get template
  let template;
  if (templateId) {
    template = await prisma.rtfTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template || !template.isActive) {
      throw new TemplateServiceError('Template not found or inactive', 'NOT_FOUND');
    }
  } else if (nda.rtfTemplateId) {
    template = await prisma.rtfTemplate.findUnique({
      where: { id: nda.rtfTemplateId },
    });
    if (!template || !template.isActive) {
      template = null;
    }
  } else {
    // Find recommended template
    template = await prisma.rtfTemplate.findFirst({
      where: {
        isActive: true,
        OR: [
          { agencyGroupId: nda.agencyGroupId },
          { agencyGroupId: null, isDefault: true },
        ],
      },
      orderBy: [
        { agencyGroupId: 'desc' }, // Agency-specific first
        { isDefault: 'desc' },
      ],
    });
  }

  if (!template) {
    throw new TemplateServiceError('No active templates available', 'NOT_FOUND');
  }

  // Extract merged fields for display
  const mergedFields = extractMergedFields(nda);

  // Merge template content with NDA fields (basic placeholder replacement)
  const mergedContent = mergeTemplateContent(template.content as Uint8Array, mergedFields);

  // Upload preview document to S3
  const previewFilename = `NDA_${nda.displayId}_preview.rtf`;
  const uploadResult = await uploadDocument({
    ndaId,
    filename: previewFilename,
    content: mergedContent,
    contentType: 'application/rtf',
  });

  // Generate presigned URL for preview (15 min expiry)
  const expiresIn = 15 * 60; // 15 minutes
  const previewUrl = await getDownloadUrl(uploadResult.s3Key, expiresIn);

  // Convert RTF to HTML for inline preview using @jonahschulte/rtf-toolkit
  let htmlContent: string | undefined;
  try {
    const rtfString = Buffer.from(mergedContent).toString('utf-8');
    console.log('[TemplateService] Converting RTF to HTML using @jonahschulte/rtf-toolkit, length:', rtfString.length);

    // Parse RTF and convert to HTML
    const doc = parseRTF(rtfString);
    htmlContent = toHTML(doc);

    console.log('[TemplateService] RTF conversion successful, HTML length:', htmlContent.length);
  } catch (conversionError) {
    console.error('[TemplateService] RTF to HTML conversion failed:', conversionError);
    // Continue without HTML - preview URL still works for download
  }

  return {
    previewUrl,
    htmlContent,
    mergedFields,
    templateUsed: {
      id: template.id,
      name: template.name,
    },
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

/**
 * Save an edited document for an NDA
 *
 * @param ndaId - NDA to save document for
 * @param content - Edited document content
 * @param filename - Original filename
 * @param userContext - Current user context
 * @returns Saved document info
 */
export async function saveEditedDocument(
  ndaId: string,
  content: Buffer,
  filename: string,
  userContext: UserContext,
  auditMeta?: AuditMeta
): Promise<{
  documentId: string;
  filename: string;
  s3Key: string;
}> {
  // Get NDA and verify access
  const nda = await findNdaWithScope(ndaId, userContext, {
    select: {
      id: true,
      displayId: true,
      agencyGroupId: true,
      subagencyId: true,
    },
  });

  if (!nda) {
    throw new TemplateServiceError('NDA not found', 'NOT_FOUND');
  }

  // Generate filename with "edited" suffix
  const editedFilename = filename.replace(/(\.[^.]+)$/, '_edited$1');

  // Determine next version number
  const nextVersion = await getNextVersionNumber(ndaId);

  // Upload to S3
  const uploadResult = await uploadDocument({
    ndaId,
    filename: editedFilename,
    content,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    uploadedById: userContext.contactId,
    documentType: 'GENERATED',
    versionNumber: nextVersion,
  });

  // Create document record
  const document = await prisma.document.create({
    data: {
      id: uploadResult.documentId,
      ndaId,
      filename: editedFilename,
      s3Key: uploadResult.s3Key,
      documentType: 'GENERATED', // Still generated, just edited
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSize: content.length,
      versionNumber: nextVersion,
      notes: 'Edited from template preview',
      uploadedById: userContext.contactId,
    },
  });

  // Audit log
  await auditService.log({
    action: AuditAction.DOCUMENT_GENERATED, // Or add DOCUMENT_EDITED action
    entityType: 'document',
    entityId: document.id,
    userId: userContext.contactId,
    details: {
      ndaId,
      ndaDisplayId: nda.displayId,
      filename: editedFilename,
      s3Key: uploadResult.s3Key,
      versionNumber: nextVersion,
      isEdited: true,
    },
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
  });

  return {
    documentId: document.id,
    filename: editedFilename,
    s3Key: uploadResult.s3Key,
  };
}

/**
 * Create a new template (admin)
 */
export async function createTemplate(
  data: {
    name: string;
    description?: string;
    content: Buffer;
    agencyGroupId?: string;
    isDefault?: boolean;
  },
  createdById: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<{ id: string; name: string }> {
  // Validate RTF content structure
  const rtfContent = data.content.toString('utf-8');
  const rtfValidation = validateRtfStructure(rtfContent);

  if (!rtfValidation.valid) {
    throw new TemplateServiceError(
      `Invalid RTF structure: ${rtfValidation.errors.join(', ')}`,
      'VALIDATION_ERROR'
    );
  }

  // Note: Do NOT validate RTF content with HTML placeholder validator
  // RTF has single braces for formatting codes {\\b text} which are valid RTF
  // Placeholder validation happens on HTML source if provided (WYSIWYG flow)

  return prisma.$transaction(async (tx) => {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await tx.rtfTemplate.updateMany({
        where: {
          isDefault: true,
          agencyGroupId: data.agencyGroupId || null,
        },
        data: { isDefault: false },
      });
    }

    const template = await tx.rtfTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        content: new Uint8Array(data.content),
        agencyGroupId: data.agencyGroupId,
        isDefault: data.isDefault || false,
        createdById,
      },
    });

    await tx.auditLog.create({
      data: {
        action: AuditAction.RTF_TEMPLATE_CREATED,
        entityType: 'rtf_template',
        entityId: template.id,
        userId: createdById,
        details: {
          name: template.name,
          description: template.description,
          agencyGroupId: template.agencyGroupId,
          isDefault: template.isDefault,
          isActive: template.isActive,
        } as unknown as Prisma.InputJsonValue,
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
      },
    });

    return { id: template.id, name: template.name };
  });
}

/**
 * Update a template (admin)
 */
export async function updateTemplate(
  templateId: string,
  data: {
    name?: string;
    description?: string;
    content?: Buffer;
    agencyGroupId?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
  },
  updatedById: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<{ id: string; name: string }> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.rtfTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      throw new TemplateServiceError('Template not found', 'NOT_FOUND');
    }

    // Validate RTF content if provided
    if (data.content) {
      const rtfContent = data.content.toString('utf-8');
      const rtfValidation = validateRtfStructure(rtfContent);

      if (!rtfValidation.valid) {
        throw new TemplateServiceError(
          `Invalid RTF structure: ${rtfValidation.errors.join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      // Note: Do NOT validate RTF content with HTML placeholder validator
      // RTF has single braces for formatting codes {\\b text} which are valid RTF
      // Placeholder validation happens on HTML source if provided (WYSIWYG flow)
    }

    const shouldSetDefault = data.isDefault && data.isActive !== false;
    // If setting as default, unset other defaults
    if (shouldSetDefault) {
      const defaultAgencyGroupId =
        data.agencyGroupId !== undefined ? data.agencyGroupId : existing.agencyGroupId;
      await tx.rtfTemplate.updateMany({
        where: {
          isDefault: true,
          agencyGroupId: defaultAgencyGroupId,
          id: { not: templateId },
        },
        data: { isDefault: false },
      });
    }

    const nextIsDefault = data.isActive === false ? false : data.isDefault;
    const template = await tx.rtfTemplate.update({
      where: { id: templateId },
      data: {
        name: data.name,
        description: data.description,
        content: data.content ? new Uint8Array(data.content) : undefined,
        agencyGroupId: data.agencyGroupId,
        isDefault: nextIsDefault,
        isActive: data.isActive,
      },
    });

    const beforeValues: Record<string, unknown> = {
      name: existing.name,
      description: existing.description,
      agencyGroupId: existing.agencyGroupId,
      isDefault: existing.isDefault,
      isActive: existing.isActive,
    };

    const afterValues: Record<string, unknown> = {
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      agencyGroupId: data.agencyGroupId ?? existing.agencyGroupId,
      isDefault: nextIsDefault ?? existing.isDefault,
      isActive: data.isActive ?? existing.isActive,
    };

    const fieldChanges = detectFieldChanges(beforeValues, afterValues);

    await tx.auditLog.create({
      data: {
        action: AuditAction.RTF_TEMPLATE_UPDATED,
        entityType: 'rtf_template',
        entityId: template.id,
        userId: updatedById,
        details: {
          changes: fieldChanges,
          contentUpdated: Boolean(data.content),
        } as unknown as Prisma.InputJsonValue,
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
      },
    });

    return { id: template.id, name: template.name };
  });
}

/**
 * Delete a template (soft delete by setting isActive = false)
 */
export async function deleteTemplate(
  templateId: string,
  deletedById: string,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.rtfTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      throw new TemplateServiceError('Template not found', 'NOT_FOUND');
    }

    const template = await tx.rtfTemplate.update({
      where: { id: templateId },
      data: { isActive: false, isDefault: false },
    });

    await tx.auditLog.create({
      data: {
        action: AuditAction.RTF_TEMPLATE_DELETED,
        entityType: 'rtf_template',
        entityId: template.id,
        userId: deletedById,
        details: {
          name: template.name,
          previousIsActive: existing.isActive,
          newIsActive: template.isActive,
        } as unknown as Prisma.InputJsonValue,
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
      },
    });
  });
}

/**
 * Generate template preview with sample merge data
 * Story 9.18: RTF Template Rich Text Editor
 *
 * @param options - Preview options
 * @param options.content - RTF template content as Buffer
 * @param options.sampleData - Sample merge field values
 * @returns Preview content with placeholders merged
 */
export async function generateTemplatePreview(options: {
  content: Buffer;
  sampleData: Record<string, string>;
}): Promise<{ previewContent: Buffer; mergedFields: Record<string, string> }> {
  const { content, sampleData } = options;

  // Convert Buffer to string
  let rtfContent = content.toString('utf-8');

  // Track which fields were merged
  const mergedFields: Record<string, string> = {};

  // Replace each placeholder with its sample value
  for (const [fieldName, value] of Object.entries(sampleData)) {
    const placeholder = `{{${fieldName}}}`;
    const escapedValue = escapeRtfValue(value);

    if (rtfContent.includes(placeholder)) {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      rtfContent = rtfContent.replace(regex, escapedValue);
      mergedFields[fieldName] = value;
    }
  }

  return {
    previewContent: Buffer.from(rtfContent, 'utf-8'),
    mergedFields,
  };
}

/**
 * Escape values for safe insertion into RTF
 */
function escapeRtfValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}');
}

/**
 * Merge template content with NDA fields using {{placeholders}}
 */
function mergeTemplateContent(
  content: Uint8Array,
  fields: Record<string, string>
): Buffer {
  let text = Buffer.from(content).toString('utf-8');
  for (const [key, value] of Object.entries(fields)) {
    const safeValue = escapeRtfValue(value);
    text = text.split(`{{${key}}}`).join(safeValue);
  }
  return Buffer.from(text, 'utf-8');
}

/**
 * Extract merged field values for display
 */
function extractMergedFields(nda: {
  companyName: string;
  companyCity: string | null;
  companyState: string | null;
  stateOfIncorporation: string | null;
  abbreviatedName: string;
  authorizedPurpose: string;
  effectiveDate: Date | null;
  usMaxPosition: string;
  agencyGroup: { name: string };
  subagency: { name: string } | null;
  agencyOfficeName: string | null;
  opportunityPoc: { firstName: string | null; lastName: string | null };
  contractsPoc: { firstName: string | null; lastName: string | null } | null;
  relationshipPoc: { firstName: string | null; lastName: string | null };
}): Record<string, string> {
  const formatName = (poc: { firstName: string | null; lastName: string | null } | null): string => {
    if (!poc) return '';
    return [poc.firstName, poc.lastName].filter(Boolean).join(' ');
  };

  const formatDate = (date: Date | null): string => {
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
    companyCity: nda.companyCity || '',
    companyState: nda.companyState || '',
    stateOfIncorporation: nda.stateOfIncorporation || '',
    agencyGroupName: nda.agencyGroup.name,
    subagencyName: nda.subagency?.name || '',
    agencyOfficeName: nda.agencyOfficeName || '',
    abbreviatedName: nda.abbreviatedName,
    authorizedPurpose: nda.authorizedPurpose,
    effectiveDate: formatDate(nda.effectiveDate),
    usMaxPosition: positionMap[nda.usMaxPosition] || nda.usMaxPosition,
    opportunityPocName: formatName(nda.opportunityPoc),
    contractsPocName: formatName(nda.contractsPoc),
    relationshipPocName: formatName(nda.relationshipPoc),
    generatedDate: formatDate(new Date()),
  };
}

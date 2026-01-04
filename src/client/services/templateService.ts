/**
 * Template Service
 *
 * Handles RTF template management and document preview operations
 */

import { get, post, put, del } from './api';

export interface RtfTemplate {
  id: string;
  name: string;
  description?: string;
  agencyGroupId?: string;
  isDefault: boolean;
  isActive: boolean;
  isRecommended?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RtfTemplateDetail extends RtfTemplate {
  content?: string; // base64 encoded (only for admins)
  htmlSource?: string; // base64 encoded (only for admins)
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  content: string; // base64 encoded RTF content
  htmlSource?: string; // base64 encoded HTML source (for WYSIWYG validation)
  agencyGroupId?: string;
  isDefault?: boolean;
}

export interface UpdateTemplateData {
  name?: string;
  description?: string;
  content?: string; // base64 encoded RTF content
  htmlSource?: string; // base64 encoded HTML source (for WYSIWYG validation)
  agencyGroupId?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface DocumentPreview {
  previewUrl: string;
  htmlContent?: string; // HTML version for inline display
  mergedFields: Record<string, string>;
  templateUsed: {
    id: string;
    name: string;
  };
}

/**
 * List all templates with optional agency filter
 */
export async function listTemplates(
  options?: {
    agencyGroupId?: string;
    subagencyId?: string;
    ndaType?: string;
    includeInactive?: boolean;
  }
): Promise<{ templates: RtfTemplate[]; count: number }> {
  const params: Record<string, string | boolean> = {};
  if (options?.agencyGroupId) {
    params.agencyGroupId = options.agencyGroupId;
  }
  if (options?.subagencyId) {
    params.subagencyId = options.subagencyId;
  }
  if (options?.ndaType) {
    params.ndaType = options.ndaType;
  }
  if (options?.includeInactive) {
    params.includeInactive = true;
  }
  return get<{ templates: RtfTemplate[]; count: number }>('/api/rtf-templates', params);
}

/**
 * Get template details
 */
export async function getTemplate(id: string): Promise<{ template: RtfTemplateDetail }> {
  return get<{ template: RtfTemplateDetail }>(`/api/rtf-templates/${id}`);
}

/**
 * Create a new template (admin only)
 */
export async function createTemplate(
  data: CreateTemplateData
): Promise<{ message: string; template: RtfTemplate }> {
  return post<{ message: string; template: RtfTemplate }>('/api/rtf-templates', data);
}

/**
 * Update a template (admin only)
 */
export async function updateTemplate(
  id: string,
  data: UpdateTemplateData
): Promise<{ message: string; template: RtfTemplate }> {
  return put<{ message: string; template: RtfTemplate }>(`/api/rtf-templates/${id}`, data);
}

/**
 * Delete a template (admin only)
 */
export async function deleteTemplate(id: string): Promise<{ message: string }> {
  return del<{ message: string }>(`/api/rtf-templates/${id}`);
}

export interface TemplateDefaultAssignment {
  id: string;
  templateId: string;
  agencyGroupId: string | null;
  subagencyId: string | null;
  ndaType: string | null;
  agencyGroup?: { id: string; name: string; code: string } | null;
  subagency?: { id: string; name: string; code: string } | null;
  createdAt: string;
  updatedAt: string;
}

export async function listTemplateDefaults(
  templateId: string
): Promise<{ defaults: TemplateDefaultAssignment[] }> {
  return get<{ defaults: TemplateDefaultAssignment[] }>(
    `/api/rtf-templates/${templateId}/defaults`
  );
}

export async function addTemplateDefault(
  templateId: string,
  data: { agencyGroupId?: string; subagencyId?: string; ndaType?: string }
): Promise<{ defaultAssignment: TemplateDefaultAssignment }> {
  return post<{ defaultAssignment: TemplateDefaultAssignment }>(
    `/api/rtf-templates/${templateId}/defaults`,
    data
  );
}

export async function removeTemplateDefault(
  templateId: string,
  defaultId: string
): Promise<{ message: string }> {
  return del<{ message: string }>(`/api/rtf-templates/${templateId}/defaults/${defaultId}`);
}

/**
 * Generate document preview for an NDA
 */
export async function generatePreview(
  ndaId: string,
  templateId?: string
): Promise<{ message: string; preview: DocumentPreview }> {
  return post<{ message: string; preview: DocumentPreview }>(
    `/api/ndas/${ndaId}/preview-document`,
    templateId ? { templateId } : undefined
  );
}

/**
 * Save edited document
 */
export async function saveEditedDocument(
  ndaId: string,
  content: string, // base64 encoded
  filename: string
): Promise<{ message: string; document: unknown }> {
  return post<{ message: string; document: unknown }>(`/api/ndas/${ndaId}/save-edited-document`, {
    content,
    filename,
  });
}

/**
 * Email Template Service
 * Story 3.10: Email Composition & Sending
 *
 * Handles listing and lookup of email templates.
 */

import { prisma } from '../db/index.js';

export interface EmailTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplateDetail extends EmailTemplateSummary {
  subject: string;
  body: string;
}

export async function listEmailTemplates(includeInactive = false): Promise<EmailTemplateSummary[]> {
  return prisma.emailTemplate.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      isDefault: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getEmailTemplate(templateId: string): Promise<EmailTemplateDetail | null> {
  return prisma.emailTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      name: true,
      description: true,
      subject: true,
      body: true,
      isDefault: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getDefaultEmailTemplate(): Promise<EmailTemplateDetail | null> {
  return prisma.emailTemplate.findFirst({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      subject: true,
      body: true,
      isDefault: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ============================================================================
// ADMIN CRUD OPERATIONS - Story 9.16
// ============================================================================

export interface CreateEmailTemplateInput {
  name: string;
  description?: string | null;
  subject: string;
  body: string;
  isDefault?: boolean;
}

export interface UpdateEmailTemplateInput {
  name?: string;
  description?: string | null;
  subject?: string;
  body?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

/**
 * Create a new email template
 * Story 9.16 AC2
 */
export async function createEmailTemplate(input: CreateEmailTemplateInput): Promise<EmailTemplateDetail> {
  // If setting as default, unset other defaults first
  if (input.isDefault) {
    await prisma.emailTemplate.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.emailTemplate.create({
    data: {
      name: input.name,
      description: input.description,
      subject: input.subject,
      body: input.body,
      isDefault: input.isDefault ?? false,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      subject: true,
      body: true,
      isDefault: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Update an existing email template
 * Story 9.16 AC3
 */
export async function updateEmailTemplate(
  templateId: string,
  input: UpdateEmailTemplateInput
): Promise<EmailTemplateDetail> {
  // If setting as default, unset other defaults first
  if (input.isDefault === true) {
    await prisma.emailTemplate.updateMany({
      where: {
        isDefault: true,
        NOT: { id: templateId }
      },
      data: { isDefault: false },
    });
  }

  return prisma.emailTemplate.update({
    where: { id: templateId },
    data: input,
    select: {
      id: true,
      name: true,
      description: true,
      subject: true,
      body: true,
      isDefault: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Delete (soft delete) an email template
 * Story 9.16
 */
export async function deleteEmailTemplate(templateId: string): Promise<void> {
  const template = await prisma.emailTemplate.findUnique({
    where: { id: templateId },
    select: { isDefault: true },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  // Don't allow deleting the default template
  if (template.isDefault) {
    throw new Error('Cannot delete the default template. Set another template as default first.');
  }

  await prisma.emailTemplate.update({
    where: { id: templateId },
    data: { isActive: false },
  });
}

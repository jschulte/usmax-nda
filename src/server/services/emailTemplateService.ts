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

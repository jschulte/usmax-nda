/**
 * RTF Merge Service
 * Story 7.4: Template Field Merging
 *
 * Responsible for merging NDA data into RTF templates using {{placeholders}}.
 */

import type { Nda, Contact } from '../../generated/prisma/index.js';
import { VALID_PLACEHOLDERS } from '../constants/templatePlaceholders.js';

export interface MergeContext {
  generatedAt: Date;
  timeZone?: string;
  locale?: string;
  generatedBy?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  };
}

export type NdaMergeInput = Nda & {
  agencyGroup: { name: string };
  subagency: { name: string } | null;
  opportunityPoc: Contact | null;
  contractsPoc: Contact | null;
  relationshipPoc: Contact | null;
  contactsPoc: Contact | null;
  createdBy: Contact | null;
};

/**
 * Merge NDA fields into RTF template content.
 *
 * @param templateContent - Raw RTF template content
 * @param ndaData - NDA data with required relations
 * @param context - Merge context (user + timestamp)
 * @returns Merged RTF content as Buffer
 */
export function mergeTemplate(
  templateContent: Buffer,
  ndaData: NdaMergeInput,
  context: MergeContext
): Buffer {
  const rtfString = templateContent.toString('utf-8');
  assertValidTemplateContent(rtfString);
  const { mergedContent } = mergeTemplateContent(rtfString, ndaData, context);
  return Buffer.from(mergedContent, 'utf-8');
}

export interface MergeResult {
  mergedContent: string;
  unknownPlaceholders: string[];
}

export interface MergeTemplateOptions {
  unknownPlaceholderBehavior?: 'keep' | 'replace';
  unknownPlaceholderReplacement?: string;
}

const PLACEHOLDER_REGEX = /\{\{([a-zA-Z0-9_]+)\}\}/g;

export function mergeTemplateContent(
  rtfContent: string,
  ndaData: NdaMergeInput,
  context: MergeContext,
  options: MergeTemplateOptions = {}
): MergeResult {
  assertValidTemplateContent(rtfContent);
  const placeholders = extractPlaceholders(rtfContent);
  const dataMap = buildDataMap(ndaData, context);

  const unknownPlaceholders = placeholders.filter(
    (placeholder) => !VALID_PLACEHOLDERS.includes(placeholder as (typeof VALID_PLACEHOLDERS)[number])
  );

  let merged = rtfContent;
  for (const [placeholder, value] of Object.entries(dataMap)) {
    const regex = new RegExp(`\\{\\{${escapeRegex(placeholder)}\\}\\}`, 'g');
    merged = merged.replace(regex, escapeRtf(value));
  }

  if (unknownPlaceholders.length > 0 && options.unknownPlaceholderBehavior === 'replace') {
    const replacement = escapeRtf(options.unknownPlaceholderReplacement ?? '[Unknown Field]');
    for (const placeholder of unknownPlaceholders) {
      const regex = new RegExp(`\\{\\{${escapeRegex(placeholder)}\\}\\}`, 'g');
      merged = merged.replace(regex, replacement);
    }
  }

  return {
    mergedContent: merged,
    unknownPlaceholders,
  };
}

export function extractPlaceholders(rtfContent: string): string[] {
  const placeholders: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = PLACEHOLDER_REGEX.exec(rtfContent)) !== null) {
    const placeholder = match[1];
    if (!placeholders.includes(placeholder)) {
      placeholders.push(placeholder);
    }
  }
  return placeholders;
}

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

export class MergeError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'MergeError';
  }
}

export function formatDate(
  date: Date | null | undefined,
  options: { fieldName?: string; locale?: string; timeZone?: string } = {}
): string {
  if (!date) return '';
  if (Number.isNaN(date.getTime())) {
    throw new MergeError(`Invalid date for ${options.fieldName ?? 'unknown field'}`, options.fieldName);
  }
  const timeZone = options.timeZone ?? 'UTC';
  return new Intl.DateTimeFormat(options.locale ?? 'en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    timeZone,
  }).format(date);
}

export function formatContactName(contact: Contact | null | undefined): string {
  if (!contact) return '';
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
}

export function buildDataMap(nda: NdaMergeInput, context: MergeContext): Record<string, string> {
  const resolveContactEmail = (contact: Contact | null | undefined): string => contact?.email ?? '';
  const resolveContactPhone = (contact: Contact | null | undefined): string =>
    contact?.workPhone || contact?.cellPhone || '';

  const positionMap: Record<string, string> = {
    PRIME: 'Prime Contractor',
    SUB: 'Subcontractor',
    TEAMING: 'Teaming Partner',
    OTHER: 'Other',
  };

  const createdByName = formatContactName(nda.createdBy);
  const generatedDate = formatDate(context.generatedAt, {
    fieldName: 'generatedDate',
    locale: context.locale,
    timeZone: context.timeZone,
  });
  const createdDate = formatDate(nda.createdAt, {
    fieldName: 'createdDate',
    locale: context.locale,
    timeZone: context.timeZone,
  });

  return {
    companyName: nda.companyName || '',
    companyCity: nda.companyCity || '',
    companyState: nda.companyState || '',
    city: nda.companyCity || '',
    state: nda.companyState || '',
    stateOfIncorporation: nda.stateOfIncorporation || '',
    agencyGroupName: nda.agencyGroup?.name || '',
    subagencyName: nda.subagency?.name || '',
    agencyOfficeName: nda.agencyOfficeName || '',
    abbreviatedName: nda.abbreviatedName || '',
    authorizedPurpose: nda.authorizedPurpose || '',
    displayId: nda.displayId ? String(nda.displayId) : '',
    usmaxPosition: positionMap[nda.usMaxPosition] || nda.usMaxPosition || '',
    usMaxPosition: positionMap[nda.usMaxPosition] || nda.usMaxPosition || '',
    ndaType: nda.ndaType || '',
    effectiveDate: formatDate(nda.effectiveDate, {
      fieldName: 'effectiveDate',
      locale: context.locale,
      timeZone: context.timeZone,
    }),
    expirationDate: formatDate(nda.expirationDate, {
      fieldName: 'expirationDate',
      locale: context.locale,
      timeZone: context.timeZone,
    }),
    createdDate,
    requestedDate: createdDate,
    generatedDate,
    createdByName,
    opportunityContactName: formatContactName(nda.opportunityPoc),
    opportunityContactEmail: resolveContactEmail(nda.opportunityPoc),
    opportunityContactPhone: resolveContactPhone(nda.opportunityPoc),
    contractsContactName: formatContactName(nda.contractsPoc),
    contractsContactEmail: resolveContactEmail(nda.contractsPoc),
    contractsContactPhone: resolveContactPhone(nda.contractsPoc),
    relationshipContactName: formatContactName(nda.relationshipPoc),
    relationshipContactEmail: resolveContactEmail(nda.relationshipPoc),
    relationshipContactPhone: resolveContactPhone(nda.relationshipPoc),
    contactsContactName: formatContactName(nda.contactsPoc),
    opportunityPocName: formatContactName(nda.opportunityPoc),
    contractsPocName: formatContactName(nda.contractsPoc),
    relationshipPocName: formatContactName(nda.relationshipPoc),
    contactsPocName: formatContactName(nda.contactsPoc),
  };
}

export function escapeRtf(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\r\n|\n|\r/g, '\\\\line ');
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function assertValidTemplateContent(rtfContent: string): void {
  if (!rtfContent || rtfContent.trim().length === 0) {
    throw new TemplateError('Template content is empty');
  }
  const trimmed = rtfContent.trimStart();
  if (!trimmed.startsWith('{\\rtf1')) {
    throw new TemplateError('Template content must start with {\\rtf1');
  }
}

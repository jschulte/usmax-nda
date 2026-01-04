/**
 * Template Preview Service
 * Story 9.18: RTF Template Rich Text Editor (WYSIWYG)
 *
 * Generates preview of RTF templates using sample data to populate merge fields.
 * Used for WYSIWYG editor preview functionality before actual NDA creation.
 */

import { VALID_PLACEHOLDERS, type PlaceholderName } from '../constants/templatePlaceholders.js';

/**
 * Sample merge field data for template preview
 * Matches the structure from templateService.ts extractMergedFields()
 */
export const SAMPLE_MERGE_FIELDS: Record<PlaceholderName, string> = {
  companyName: 'Acme Corporation',
  companyCity: 'Washington',
  companyState: 'DC',
  city: 'Washington',
  state: 'DC',
  stateOfIncorporation: 'Delaware',
  agencyGroupName: 'Department of Defense',
  subagencyName: 'U.S. Air Force',
  agencyOfficeName: 'Office of the Secretary',
  abbreviatedName: 'ACME',
  authorizedPurpose: 'Proposal Development for Contract XYZ-2024',
  effectiveDate: '01/15/2024',
  expirationDate: '01/15/2025',
  createdDate: '01/10/2024',
  requestedDate: '01/10/2024',
  generatedDate: '01/20/2024',
  displayId: '100123',
  usMaxPosition: 'Prime Contractor',
  usmaxPosition: 'Prime Contractor',
  ndaType: 'MUTUAL',
  opportunityContactName: 'John Smith',
  opportunityContactEmail: 'john.smith@example.com',
  opportunityContactPhone: '(555) 123-4567',
  contractsContactName: 'Jane Doe',
  contractsContactEmail: 'jane.doe@example.com',
  contractsContactPhone: '(555) 222-3333',
  relationshipContactName: 'Robert Johnson',
  relationshipContactEmail: 'robert.johnson@example.com',
  relationshipContactPhone: '(555) 444-5555',
  contactsContactName: 'Linda Carter',
  opportunityPocName: 'John Smith',
  contractsPocName: 'Jane Doe',
  relationshipPocName: 'Robert Johnson',
  contactsPocName: 'Linda Carter',
  createdByName: 'Alex Morgan',
};

/**
 * Replace placeholder tokens in HTML with sample merge field values
 *
 * @param htmlContent - HTML string containing {{placeholder}} tokens
 * @returns HTML string with placeholders replaced by sample values
 *
 * @example
 * const html = '<p>Company: {{companyName}}</p>';
 * const preview = generateTemplatePreview(html);
 * // Returns: '<p>Company: Acme Corporation</p>'
 */
export function generateTemplatePreview(htmlContent: string): string {
  let preview = htmlContent;

  // Replace each placeholder with its sample value
  for (const [fieldName, sampleValue] of Object.entries(SAMPLE_MERGE_FIELDS)) {
    const placeholder = `{{${fieldName}}}`;
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    preview = preview.replace(regex, sampleValue);
  }

  return preview;
}

/**
 * Validate that HTML content uses only allowed placeholders
 *
 * @param htmlContent - HTML string to validate
 * @returns Array of unknown placeholder names (empty if all valid)
 */
export function validatePlaceholders(htmlContent: string): string[] {
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const allowedPlaceholders = VALID_PLACEHOLDERS;
  const unknownPlaceholders: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(htmlContent)) !== null) {
    const placeholderName = match[1];
    if (!allowedPlaceholders.includes(placeholderName)) {
      if (!unknownPlaceholders.includes(placeholderName)) {
        unknownPlaceholders.push(placeholderName);
      }
    }
  }

  return unknownPlaceholders;
}

/**
 * Extract all placeholder tokens from HTML content
 *
 * @param htmlContent - HTML string to analyze
 * @returns Array of placeholder field names found in the content
 */
export function extractPlaceholders(htmlContent: string): string[] {
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const placeholders: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(htmlContent)) !== null) {
    const placeholderName = match[1];
    if (!placeholders.includes(placeholderName)) {
      placeholders.push(placeholderName);
    }
  }

  return placeholders;
}

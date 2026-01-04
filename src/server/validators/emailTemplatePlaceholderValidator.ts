/**
 * Email Template Placeholder Validator
 *
 * Validates {{placeholder}} usage in email templates.
 */

export const EMAIL_TEMPLATE_PLACEHOLDERS = [
  'companyName',
  'abbreviatedName',
  'displayId',
  'effectiveDate',
  'authorizedPurpose',
  'agencyGroupName',
  'agencyGroup', // legacy alias
  'agencyOfficeName',
  'usMaxPosition',
  'usmaxPosition', // legacy alias
  'ndaType',
  'relationshipPocName',
  'opportunityPocName',
  'signature',
] as const;

export type EmailTemplatePlaceholder = typeof EMAIL_TEMPLATE_PLACEHOLDERS[number];

export interface PlaceholderValidationResult {
  valid: boolean;
  errors: string[];
  unknownPlaceholders: string[];
}

const PLACEHOLDER_REGEX = /\{\{(\w+)\}\}/g;
const SINGLE_BRACE_REGEX = /(?<!\{)\{(?!\{)|(?<!\})\}(?!\})/g;

export function validateEmailTemplatePlaceholders(content: string): PlaceholderValidationResult {
  const errors: string[] = [];
  const unknownPlaceholders: string[] = [];
  let match: RegExpExecArray | null;

  PLACEHOLDER_REGEX.lastIndex = 0;
  SINGLE_BRACE_REGEX.lastIndex = 0;

  while ((match = PLACEHOLDER_REGEX.exec(content)) !== null) {
    const placeholderName = match[1];
    if (!EMAIL_TEMPLATE_PLACEHOLDERS.includes(placeholderName as EmailTemplatePlaceholder)) {
      if (!unknownPlaceholders.includes(placeholderName)) {
        unknownPlaceholders.push(placeholderName);
      }
    }
  }

  if (unknownPlaceholders.length > 0) {
    errors.push(
      `Unknown placeholders found: ${unknownPlaceholders.join(', ')}. ` +
        `Allowed placeholders: ${EMAIL_TEMPLATE_PLACEHOLDERS.join(', ')}`
    );
  }

  if (SINGLE_BRACE_REGEX.test(content)) {
    errors.push('Malformed placeholders detected. Placeholders must use double braces: {{fieldName}}');
  }

  return {
    valid: errors.length === 0,
    errors,
    unknownPlaceholders,
  };
}

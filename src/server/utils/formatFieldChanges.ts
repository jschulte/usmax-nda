/**
 * Field Change Formatting Utility
 * Story 6.2: Human-Readable Change Display
 *
 * Formats field changes into human-readable text for display in audit trails.
 */

import type { FieldChange } from './detectFieldChanges.js';

/**
 * Format a field change into human-readable text
 *
 * @param change - FieldChange object with field, before, and after values
 * @returns Human-readable change description
 *
 * @example
 * formatFieldChange({ field: 'companyName', before: 'ACME Corp', after: 'ACME Corporation' })
 * // Returns: "Company Name changed from 'ACME Corp' to 'ACME Corporation'"
 *
 * @example
 * formatFieldChange({ field: 'status', before: 'Created', after: 'Emailed' })
 * // Returns: "Status changed from 'Created' to 'Emailed'"
 *
 * @example
 * formatFieldChange({ field: 'isActive', before: false, after: true })
 * // Returns: "Is Active changed from No to Yes"
 */
export function formatFieldChange(change: FieldChange): string {
  const fieldLabel = formatFieldName(change.field);
  const beforeText = formatValue(change.before);
  const afterText = formatValue(change.after);

  return `${fieldLabel} changed from ${beforeText} to ${afterText}`;
}

/**
 * Convert field name from camelCase to Title Case
 *
 * @param field - Field name in camelCase
 * @returns Field name in Title Case with spaces
 *
 * @example
 * formatFieldName('companyName') // Returns: "Company Name"
 * formatFieldName('effectiveDate') // Returns: "Effective Date"
 * formatFieldName('status') // Returns: "Status"
 */
export function formatFieldName(field: string): string {
  // Convert camelCase and acronyms to Title Case
  // e.g., "companyName" → "Company Name"
  // "isNonUSmax" → "Is Non U S Max"
  const spaced = field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]{2,})([a-z])/g, '$1 $2')
    .trim();

  const words = spaced.split(/\s+/).flatMap((word) => {
    if (word.length > 1 && /^[A-Z]+$/.test(word)) {
      return word.split('');
    }
    return [word];
  });

  return words
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format a value for display
 *
 * @param value - Any value to format
 * @returns Formatted value string
 *
 * @example
 * formatValue(null) // Returns: "(empty)"
 * formatValue(undefined) // Returns: "(empty)"
 * formatValue('') // Returns: "(empty)"
 * formatValue(true) // Returns: "Yes"
 * formatValue(false) // Returns: "No"
 * formatValue(new Date('2024-01-15')) // Returns: "1/15/2024" (locale-dependent)
 * formatValue('ACME Corp') // Returns: "'ACME Corp'"
 * formatValue(42) // Returns: "'42'"
 */
export function formatValue(value: unknown): string {
  // Handle null, undefined, and empty string
  if (value == null || value === '') {
    return '(empty)';
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle dates
  if (value instanceof Date) {
    return value.toLocaleDateString('en-US');
  }

  // Handle all other values (strings, numbers, objects)
  // Convert to string and wrap in quotes
  return `'${String(value)}'`;
}

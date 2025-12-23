/**
 * Audit Change Formatting Utilities
 * Story 9.6: Human-Readable Audit Trail Display
 *
 * Frontend version of formatFieldChanges utilities for displaying
 * audit trail changes in user-friendly format.
 */

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

/**
 * Format a field change into human-readable text
 *
 * @example
 * formatFieldChange({ field: 'companyName', before: 'ACME Corp', after: 'ACME Corporation' })
 * // Returns: "Company Name changed from 'ACME Corp' to 'ACME Corporation'"
 */
export function formatFieldChange(change: FieldChange): string {
  const fieldLabel = formatFieldName(change.field);
  const beforeText = formatValue(change.before);
  const afterText = formatValue(change.after);

  return `${fieldLabel} changed from ${beforeText} to ${afterText}`;
}

/**
 * Convert field name from camelCase to Title Case
 */
export function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format a value for display
 */
export function formatValue(value: unknown): string {
  if (value == null || value === '') {
    return '(empty)';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle ISO date strings
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(value).toLocaleDateString('en-US');
  }

  return `'${String(value)}'`;
}

/**
 * Format audit log details for display
 * Extracts changes array and separates other fields
 */
export function formatAuditDetails(details: any): {
  changes: string[];
  hasOtherFields: boolean;
  otherFields: any;
} {
  const result = {
    changes: [] as string[],
    hasOtherFields: false,
    otherFields: {} as any,
  };

  if (!details) return result;

  // Extract and format changes
  if (Array.isArray(details.changes)) {
    result.changes = details.changes.map((change: FieldChange) => formatFieldChange(change));
  }

  // Check for other fields (not changes)
  const { changes, ...rest } = details;
  if (Object.keys(rest).length > 0) {
    result.hasOtherFields = true;
    result.otherFields = rest;
  }

  return result;
}

/**
 * Field Change Detection Utility
 * Story 6.2: Track before/after values for entity updates
 *
 * Detects which fields changed between two objects for audit logging.
 */

import type { FieldChange } from '../services/auditService.js';

/**
 * Detect field changes between two objects
 *
 * Compares before and after objects to identify which fields changed.
 * Only fields present in the 'after' object are checked (fields removed
 * from 'after' are not tracked as changes).
 *
 * @param before - Original object (from database)
 * @param after - Updated object (new values)
 * @param fields - Optional: Only check specific fields (default: all fields in 'after')
 * @returns Array of FieldChange objects for fields that changed
 *
 * @example
 * const changes = detectFieldChanges(
 *   { name: 'ACME Corp', city: 'NYC', status: 'Created' },
 *   { name: 'ACME Corporation', city: 'NYC', status: 'Emailed' }
 * );
 * // Returns: [
 * //   { field: 'name', before: 'ACME Corp', after: 'ACME Corporation' },
 * //   { field: 'status', before: 'Created', after: 'Emailed' }
 * // ]
 *
 * @example With field filtering
 * const changes = detectFieldChanges(before, after, ['name', 'status']);
 * // Only checks 'name' and 'status' fields
 */
export function detectFieldChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields?: string[]
): FieldChange[] {
  const changes: FieldChange[] = [];
  const fieldsToCheck = fields || Object.keys(after);

  for (const field of fieldsToCheck) {
    const beforeValue = before[field];
    const afterValue = after[field];

    // Skip if values are the same (shallow comparison)
    if (beforeValue === afterValue) {
      continue;
    }

    // Handle Date objects specially (compare timestamps)
    if (beforeValue instanceof Date && afterValue instanceof Date) {
      if (beforeValue.getTime() === afterValue.getTime()) {
        continue;
      }
    }

    // Skip if both are null/undefined (no change)
    // Note: null == undefined is true, but null === undefined is false
    // We use == here to treat null and undefined as equivalent
    if (beforeValue == null && afterValue == null) {
      continue;
    }

    // Record the change
    changes.push({
      field,
      before: beforeValue,
      after: afterValue,
    });
  }

  return changes;
}

/**
 * Export FieldChange type for convenience
 * Re-exported from auditService to avoid circular dependencies
 */
export type { FieldChange };

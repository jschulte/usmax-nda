/**
 * formatAuditChanges utility tests
 * Story 9.6: Human-Readable Audit Trail Display
 */

import { describe, it, expect } from 'vitest';
import {
  formatAuditDetails,
  formatFieldChange,
  formatFieldName,
  formatValue,
  type FieldChange,
} from '../formatAuditChanges';

describe('formatFieldChange', () => {
  it('formats simple string change', () => {
    const change: FieldChange = {
      field: 'companyName',
      before: 'ACME Corp',
      after: 'ACME Corporation',
    };

    expect(formatFieldChange(change)).toBe(
      "Company Name changed from 'ACME Corp' to 'ACME Corporation'"
    );
  });

  it('formats boolean change', () => {
    const change: FieldChange = {
      field: 'isActive',
      before: false,
      after: true,
    };

    expect(formatFieldChange(change)).toBe('Is Active changed from No to Yes');
  });
});

describe('formatFieldName', () => {
  it('converts camelCase to Title Case', () => {
    expect(formatFieldName('companyName')).toBe('Company Name');
    expect(formatFieldName('effectiveDate')).toBe('Effective Date');
  });
});

describe('formatValue', () => {
  it('formats empty values', () => {
    expect(formatValue(null)).toBe('(empty)');
    expect(formatValue(undefined)).toBe('(empty)');
    expect(formatValue('')).toBe('(empty)');
  });

  it('formats booleans', () => {
    expect(formatValue(true)).toBe('Yes');
    expect(formatValue(false)).toBe('No');
  });

  it('formats Date instances', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const expected = date.toLocaleDateString('en-US');
    expect(formatValue(date)).toBe(expected);
  });

  it('formats ISO date strings', () => {
    const dateString = '2024-02-01';
    const expected = new Date(dateString).toLocaleDateString('en-US');
    expect(formatValue(dateString)).toBe(expected);
  });

  it('formats other values with quotes', () => {
    expect(formatValue('ACME Corp')).toBe("'ACME Corp'");
    expect(formatValue(42)).toBe("'42'");
  });
});

describe('formatAuditDetails', () => {
  it('returns empty output when details missing', () => {
    const formatted = formatAuditDetails(undefined);

    expect(formatted.changes).toEqual([]);
    expect(formatted.hasOtherFields).toBe(false);
  });

  it('formats changes and separates other fields', () => {
    const formatted = formatAuditDetails({
      changes: [
        { field: 'status', before: 'Created', after: 'Emailed' },
      ],
      reason: 'Manual update',
    });

    expect(formatted.changes).toEqual([
      "Status changed from 'Created' to 'Emailed'",
    ]);
    expect(formatted.hasOtherFields).toBe(true);
    expect(formatted.otherFields).toEqual({ reason: 'Manual update' });
  });
});

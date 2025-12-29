/**
 * formatFieldChanges utility tests
 * Story 6.2: Field Change Tracking
 */

import { describe, it, expect } from 'vitest';
import { formatFieldChange, formatFieldName, formatValue } from '../formatFieldChanges.js';
import type { FieldChange } from '../detectFieldChanges.js';

describe('formatFieldChange', () => {
  it('formats simple string change', () => {
    const change: FieldChange = {
      field: 'companyName',
      before: 'ACME Corp',
      after: 'ACME Corporation',
    };

    const result = formatFieldChange(change);

    expect(result).toBe("Company Name changed from 'ACME Corp' to 'ACME Corporation'");
  });

  it('formats status change', () => {
    const change: FieldChange = {
      field: 'status',
      before: 'Created',
      after: 'Emailed',
    };

    const result = formatFieldChange(change);

    expect(result).toBe("Status changed from 'Created' to 'Emailed'");
  });

  it('formats null to value change', () => {
    const change: FieldChange = {
      field: 'companyCity',
      before: null,
      after: 'New York',
    };

    const result = formatFieldChange(change);

    expect(result).toBe("Company City changed from (empty) to 'New York'");
  });

  it('formats value to null change', () => {
    const change: FieldChange = {
      field: 'companyCity',
      before: 'New York',
      after: null,
    };

    const result = formatFieldChange(change);

    expect(result).toBe("Company City changed from 'New York' to (empty)");
  });

  it('formats boolean true to false', () => {
    const change: FieldChange = {
      field: 'isNonUsMax',
      before: true,
      after: false,
    };

    const result = formatFieldChange(change);

    expect(result).toBe("Is Non Us Max changed from Yes to No");
  });

  it('formats boolean false to true', () => {
    const change: FieldChange = {
      field: 'isActive',
      before: false,
      after: true,
    };

    const result = formatFieldChange(change);

    expect(result).toBe("Is Active changed from No to Yes");
  });

  it('formats date change', () => {
    const change: FieldChange = {
      field: 'effectiveDate',
      before: new Date('2024-01-15'),
      after: new Date('2024-02-01'),
    };

    const result = formatFieldChange(change);

    // Dates are formatted using toLocaleDateString('en-US')
    expect(result).toContain("Effective Date changed from");
    expect(result).toContain("to");
  });

  it('formats number change', () => {
    const change: FieldChange = {
      field: 'count',
      before: 5,
      after: 10,
    };

    const result = formatFieldChange(change);

    expect(result).toBe("Count changed from '5' to '10'");
  });
});

describe('formatFieldName', () => {
  it('converts camelCase to Title Case', () => {
    expect(formatFieldName('companyName')).toBe('Company Name');
    expect(formatFieldName('effectiveDate')).toBe('Effective Date');
    expect(formatFieldName('usMaxPosition')).toBe('Us Max Position');
  });

  it('handles single word', () => {
    expect(formatFieldName('status')).toBe('Status');
    expect(formatFieldName('name')).toBe('Name');
  });

  it('handles already capitalized words', () => {
    expect(formatFieldName('Status')).toBe('Status');
    expect(formatFieldName('StatusCode')).toBe('Status Code');
  });

  it('handles multiple capitals', () => {
    expect(formatFieldName('isNonUSmax')).toBe('Is Non U S Max');
  });
});

describe('formatValue', () => {
  describe('null and undefined', () => {
    it('formats null as (empty)', () => {
      expect(formatValue(null)).toBe('(empty)');
    });

    it('formats undefined as (empty)', () => {
      expect(formatValue(undefined)).toBe('(empty)');
    });

    it('formats empty string as (empty)', () => {
      expect(formatValue('')).toBe('(empty)');
    });
  });

  describe('booleans', () => {
    it('formats true as Yes', () => {
      expect(formatValue(true)).toBe('Yes');
    });

    it('formats false as No', () => {
      expect(formatValue(false)).toBe('No');
    });
  });

  describe('dates', () => {
    it('formats dates using toLocaleDateString', () => {
      const date = new Date('2024-01-15');
      const result = formatValue(date);

      // Date formatting depends on locale, just check it's not the ISO string
      expect(result).not.toBe(date.toISOString());
      expect(result).toBeTruthy();
    });
  });

  describe('other values', () => {
    it('formats strings with quotes', () => {
      expect(formatValue('ACME Corp')).toBe("'ACME Corp'");
    });

    it('formats numbers with quotes', () => {
      expect(formatValue(42)).toBe("'42'");
    });

    it('handles zero correctly (not as empty)', () => {
      expect(formatValue(0)).toBe("'0'");
    });

    it('formats objects as string representation', () => {
      const result = formatValue({ foo: 'bar' });
      expect(result).toContain('[object Object]');
    });
  });
});

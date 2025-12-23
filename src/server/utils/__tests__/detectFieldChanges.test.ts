/**
 * detectFieldChanges utility tests
 * Story 6.2: Field Change Tracking
 */

import { describe, it, expect } from 'vitest';
import { detectFieldChanges, type FieldChange } from '../detectFieldChanges.js';

describe('detectFieldChanges', () => {
  describe('basic change detection', () => {
    it('detects string changes', () => {
      const before = { name: 'ACME Corp', city: 'NYC' };
      const after = { name: 'ACME Corporation', city: 'NYC' };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'name',
        before: 'ACME Corp',
        after: 'ACME Corporation',
      });
    });

    it('detects number changes', () => {
      const before = { count: 5, total: 100 };
      const after = { count: 10, total: 100 };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'count',
        before: 5,
        after: 10,
      });
    });

    it('detects boolean changes', () => {
      const before = { active: true, verified: false };
      const after = { active: false, verified: false };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'active',
        before: true,
        after: false,
      });
    });

    it('detects multiple changes', () => {
      const before = { name: 'ACME', status: 'Created', count: 5 };
      const after = { name: 'ACME Corp', status: 'Emailed', count: 5 };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(2);
      expect(changes).toContainEqual({
        field: 'name',
        before: 'ACME',
        after: 'ACME Corp',
      });
      expect(changes).toContainEqual({
        field: 'status',
        before: 'Created',
        after: 'Emailed',
      });
    });
  });

  describe('unchanged fields', () => {
    it('skips unchanged fields', () => {
      const before = { name: 'ACME', city: 'NYC', status: 'Active' };
      const after = { name: 'ACME', city: 'NYC', status: 'Active' };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(0);
    });

    it('only returns changed fields, not all fields', () => {
      const before = { a: 1, b: 2, c: 3, d: 4 };
      const after = { a: 1, b: 99, c: 3, d: 4 };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0].field).toBe('b');
    });
  });

  describe('null and undefined handling', () => {
    it('detects change from value to null', () => {
      const before = { name: 'ACME' };
      const after = { name: null };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'name',
        before: 'ACME',
        after: null,
      });
    });

    it('detects change from null to value', () => {
      const before = { name: null };
      const after = { name: 'ACME' };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'name',
        before: null,
        after: 'ACME',
      });
    });

    it('detects change from undefined to value', () => {
      const before = { name: undefined };
      const after = { name: 'ACME' };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'name',
        before: undefined,
        after: 'ACME',
      });
    });

    it('skips fields that are both null', () => {
      const before = { name: null };
      const after = { name: null };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(0);
    });

    it('skips fields that are both undefined', () => {
      const before = { name: undefined };
      const after = { name: undefined };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(0);
    });

    it('treats empty string as a value (not same as null)', () => {
      const before = { name: null };
      const after = { name: '' };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'name',
        before: null,
        after: '',
      });
    });
  });

  describe('date handling', () => {
    it('detects date changes', () => {
      const before = { date: new Date('2024-01-15') };
      const after = { date: new Date('2024-02-01') };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0].field).toBe('date');
      expect(changes[0].before).toEqual(new Date('2024-01-15'));
      expect(changes[0].after).toEqual(new Date('2024-02-01'));
    });

    it('skips dates that are the same', () => {
      const sameDate = new Date('2024-01-15');
      const before = { date: new Date('2024-01-15') };
      const after = { date: new Date('2024-01-15') };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(0);
    });
  });

  describe('field filtering', () => {
    it('only checks specified fields when provided', () => {
      const before = { name: 'ACME', city: 'NYC', status: 'Created' };
      const after = { name: 'ACME Corp', city: 'Boston', status: 'Emailed' };

      const changes = detectFieldChanges(before, after, ['name', 'status']);

      expect(changes).toHaveLength(2);
      expect(changes.map(c => c.field)).toEqual(['name', 'status']);
      expect(changes.find(c => c.field === 'city')).toBeUndefined();
    });

    it('checks all fields in after object when no field filter provided', () => {
      const before = { a: 1, b: 2, c: 3 };
      const after = { a: 99, b: 88, c: 77 };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('handles field present in after but not in before', () => {
      const before = {} as Record<string, unknown>;
      const after = { name: 'ACME' };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'name',
        before: undefined,
        after: 'ACME',
      });
    });

    it('does not return fields present in before but not in after (only checks after fields)', () => {
      const before = { name: 'ACME', oldField: 'value' };
      const after = { name: 'ACME Corp' };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0].field).toBe('name');
    });

    it('returns empty array when after object is empty', () => {
      const before = { name: 'ACME' };
      const after = {};

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(0);
    });

    it('handles zero values correctly (0 is not null)', () => {
      const before = { count: null };
      const after = { count: 0 };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'count',
        before: null,
        after: 0,
      });
    });

    it('handles false values correctly (false is not null)', () => {
      const before = { active: null };
      const after = { active: false };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'active',
        before: null,
        after: false,
      });
    });
  });
});

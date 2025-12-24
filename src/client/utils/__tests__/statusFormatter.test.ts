/**
 * Story 10.3: Status Display Name Formatter Tests
 * Validates that enum values are correctly mapped to legacy display names
 */

import { describe, it, expect } from 'vitest';
import { getStatusDisplayName, getStatusOptions, NDA_STATUS_DISPLAY_NAMES } from '../statusFormatter';

describe('Status Display Name Formatter', () => {
  describe('NDA_STATUS_DISPLAY_NAMES', () => {
    it('maps CREATED to "Created/Pending Release"', () => {
      expect(NDA_STATUS_DISPLAY_NAMES.CREATED).toBe('Created/Pending Release');
    });

    it('maps SENT_PENDING_SIGNATURE to "Sent/Pending Signature"', () => {
      expect(NDA_STATUS_DISPLAY_NAMES.SENT_PENDING_SIGNATURE).toBe('Sent/Pending Signature');
    });

    it('maps IN_REVISION to "In Revision"', () => {
      expect(NDA_STATUS_DISPLAY_NAMES.IN_REVISION).toBe('In Revision');
    });

    it('maps FULLY_EXECUTED to "Fully Executed NDA Uploaded"', () => {
      expect(NDA_STATUS_DISPLAY_NAMES.FULLY_EXECUTED).toBe('Fully Executed NDA Uploaded');
    });

    it('maps INACTIVE_CANCELED to "Inactive/Canceled"', () => {
      expect(NDA_STATUS_DISPLAY_NAMES.INACTIVE_CANCELED).toBe('Inactive/Canceled');
    });

    it('maps EXPIRED to "Expired"', () => {
      expect(NDA_STATUS_DISPLAY_NAMES.EXPIRED).toBe('Expired');
    });

    it('has exactly 6 status mappings', () => {
      expect(Object.keys(NDA_STATUS_DISPLAY_NAMES)).toHaveLength(6);
    });

    it('does not contain removed values', () => {
      expect(NDA_STATUS_DISPLAY_NAMES).not.toHaveProperty('EMAILED');
      expect(NDA_STATUS_DISPLAY_NAMES).not.toHaveProperty('INACTIVE');
      expect(NDA_STATUS_DISPLAY_NAMES).not.toHaveProperty('CANCELLED');
    });
  });

  describe('getStatusDisplayName', () => {
    it('returns correct display name for each status', () => {
      expect(getStatusDisplayName('CREATED')).toBe('Created/Pending Release');
      expect(getStatusDisplayName('SENT_PENDING_SIGNATURE')).toBe('Sent/Pending Signature');
      expect(getStatusDisplayName('IN_REVISION')).toBe('In Revision');
      expect(getStatusDisplayName('FULLY_EXECUTED')).toBe('Fully Executed NDA Uploaded');
      expect(getStatusDisplayName('INACTIVE_CANCELED')).toBe('Inactive/Canceled');
      expect(getStatusDisplayName('EXPIRED')).toBe('Expired');
    });

    it('returns raw value for unknown status', () => {
      expect(getStatusDisplayName('UNKNOWN' as any)).toBe('UNKNOWN');
    });
  });

  describe('getStatusOptions', () => {
    it('returns array of status options', () => {
      const options = getStatusOptions();
      expect(options).toBeInstanceOf(Array);
      expect(options).toHaveLength(6);
    });

    it('each option has value and label', () => {
      const options = getStatusOptions();
      options.forEach(option => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
      });
    });

    it('includes all status values', () => {
      const options = getStatusOptions();
      const values = options.map(o => o.value);
      expect(values).toContain('CREATED');
      expect(values).toContain('SENT_PENDING_SIGNATURE');
      expect(values).toContain('IN_REVISION');
      expect(values).toContain('FULLY_EXECUTED');
      expect(values).toContain('INACTIVE_CANCELED');
      expect(values).toContain('EXPIRED');
    });
  });
});

/**
 * POC Validator Tests
 * Story 3.14: POC Management & Validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateFax,
  validateRequired,
  validateOpportunityPoc,
  validateRelationshipPoc,
  validateContractsPoc,
  normalizePhone,
  validateNdaPocs,
  POC_PATTERNS,
  POC_FORMAT_HINTS,
} from '../pocValidator.js';

describe('POC Validator', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('user@example.com')).toBeNull();
      expect(validateEmail('test.user@company.org')).toBeNull();
      expect(validateEmail('name+tag@domain.co.uk')).toBeNull();
    });

    it('should reject invalid email addresses', () => {
      const result = validateEmail('invalid-email');
      expect(result).not.toBeNull();
      expect(result?.field).toBe('email');
      expect(result?.message).toContain('valid email');
    });

    it('should reject email without domain', () => {
      expect(validateEmail('user@')).not.toBeNull();
      expect(validateEmail('@domain.com')).not.toBeNull();
    });

    it('should return null for empty values', () => {
      expect(validateEmail('')).toBeNull();
      expect(validateEmail(null)).toBeNull();
      expect(validateEmail(undefined)).toBeNull();
    });
  });

  describe('validatePhone', () => {
    it('should accept valid phone formats', () => {
      expect(validatePhone('(555) 123-4567')).toBeNull();
      expect(validatePhone('555-123-4567')).toBeNull();
      expect(validatePhone('5551234567')).toBeNull();
    });

    it('should reject invalid phone formats', () => {
      const result = validatePhone('12345');
      expect(result).not.toBeNull();
      expect(result?.field).toBe('phone');
      expect(result?.hint).toBe(POC_FORMAT_HINTS.phone);
    });

    it('should reject phone with too many digits', () => {
      expect(validatePhone('123456789012')).not.toBeNull();
    });

    it('should return null for empty values', () => {
      expect(validatePhone('')).toBeNull();
      expect(validatePhone(null)).toBeNull();
    });
  });

  describe('validateFax', () => {
    it('should accept valid fax formats', () => {
      expect(validateFax('(555) 123-4567')).toBeNull();
      expect(validateFax('555-123-4567')).toBeNull();
    });

    it('should reject invalid fax formats', () => {
      const result = validateFax('not-a-fax');
      expect(result).not.toBeNull();
      expect(result?.field).toBe('fax');
    });

    it('should return null for empty values (fax is optional)', () => {
      expect(validateFax('')).toBeNull();
      expect(validateFax(null)).toBeNull();
    });
  });

  describe('validateRequired', () => {
    it('should return null for non-empty values', () => {
      expect(validateRequired('value', 'Field')).toBeNull();
      expect(validateRequired('  value  ', 'Field')).toBeNull();
    });

    it('should return error for empty values', () => {
      const result = validateRequired('', 'First Name');
      expect(result).not.toBeNull();
      expect(result?.message).toContain('First Name');
      expect(result?.message).toContain('required');
    });

    it('should return error for whitespace-only values', () => {
      expect(validateRequired('   ', 'Field')).not.toBeNull();
    });

    it('should return error for null/undefined', () => {
      expect(validateRequired(null, 'Field')).not.toBeNull();
      expect(validateRequired(undefined, 'Field')).not.toBeNull();
    });
  });

  describe('validateOpportunityPoc', () => {
    it('should be valid when POC ID provided', () => {
      const result = validateOpportunityPoc('contact-123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should be invalid when POC ID missing', () => {
      const result = validateOpportunityPoc(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Opportunity POC');
    });
  });

  describe('validateRelationshipPoc', () => {
    it('should validate all required fields', () => {
      const result = validateRelationshipPoc({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when name is missing', () => {
      const result = validateRelationshipPoc({
        email: 'john@example.com',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Name'))).toBe(true);
    });

    it('should fail when email is missing', () => {
      const result = validateRelationshipPoc({
        name: 'John Doe',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Email'))).toBe(true);
    });

    it('should fail with invalid email format', () => {
      const result = validateRelationshipPoc({
        name: 'John Doe',
        email: 'invalid',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'relationship_poc_email')).toBe(true);
    });

    it('should fail with invalid phone format', () => {
      const result = validateRelationshipPoc({
        name: 'John Doe',
        email: 'john@example.com',
        phone: 'not-a-phone',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'relationship_poc_phone')).toBe(true);
    });

    it('should accept optional fax when valid', () => {
      const result = validateRelationshipPoc({
        name: 'John Doe',
        email: 'john@example.com',
        fax: '(555) 123-4567',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail with invalid fax format', () => {
      const result = validateRelationshipPoc({
        name: 'John Doe',
        email: 'john@example.com',
        fax: 'invalid',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'relationship_poc_fax')).toBe(true);
    });
  });

  describe('validateContractsPoc', () => {
    it('should be valid when not provided and not required', () => {
      const result = validateContractsPoc(null, { required: false });
      expect(result.valid).toBe(true);
    });

    it('should be invalid when not provided and required', () => {
      const result = validateContractsPoc(null, { required: true });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Contracts POC');
    });

    it('should validate format when provided', () => {
      const result = validateContractsPoc({
        email: 'invalid',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'contracts_poc_email')).toBe(true);
    });

    it('should pass with valid optional POC', () => {
      const result = validateContractsPoc({
        email: 'contracts@example.com',
        phone: '(555) 999-8888',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('normalizePhone', () => {
    it('should normalize 10 digit phone to (XXX) XXX-XXXX', () => {
      expect(normalizePhone('5551234567')).toBe('(555) 123-4567');
    });

    it('should normalize phone with dashes', () => {
      expect(normalizePhone('555-123-4567')).toBe('(555) 123-4567');
    });

    it('should normalize phone with dots', () => {
      expect(normalizePhone('555.123.4567')).toBe('(555) 123-4567');
    });

    it('should normalize phone with spaces', () => {
      expect(normalizePhone('555 123 4567')).toBe('(555) 123-4567');
    });

    it('should return as-is if not 10 digits', () => {
      expect(normalizePhone('12345')).toBe('12345');
      expect(normalizePhone('123456789012')).toBe('123456789012');
    });

    it('should return null for empty values', () => {
      expect(normalizePhone('')).toBeNull();
      expect(normalizePhone(null)).toBeNull();
    });
  });

  describe('validateNdaPocs', () => {
    it('should validate all POCs together', () => {
      const result = validateNdaPocs({
        opportunityPocId: 'poc-123',
        relationshipPoc: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      });
      expect(result.valid).toBe(true);
    });

    it('should collect errors from all POCs', () => {
      const result = validateNdaPocs({
        opportunityPocId: null,
        relationshipPoc: {
          email: 'invalid',
        },
        contractsPoc: {
          phone: 'invalid',
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      // Should have errors for opportunity POC, relationship name, relationship email format, contracts phone
      expect(result.errors.some((e) => e.message.includes('Opportunity POC'))).toBe(true);
      expect(result.errors.some((e) => e.message.includes('Name'))).toBe(true);
    });

    it('should require relationship POC when not provided', () => {
      const result = validateNdaPocs({
        opportunityPocId: 'poc-123',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Relationship POC'))).toBe(true);
    });
  });

  describe('POC_PATTERNS', () => {
    it('should have valid email pattern', () => {
      expect(POC_PATTERNS.email.test('test@example.com')).toBe(true);
      expect(POC_PATTERNS.email.test('invalid')).toBe(false);
    });

    it('should have valid phone pattern', () => {
      expect(POC_PATTERNS.phone.test('(555) 123-4567')).toBe(true);
      expect(POC_PATTERNS.phone.test('555-123-4567')).toBe(true);
      expect(POC_PATTERNS.phone.test('5551234567')).toBe(true);
    });
  });
});

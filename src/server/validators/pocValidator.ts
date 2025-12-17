/**
 * POC Validator
 * Story 3.14: POC Management & Validation
 *
 * Validation rules for Point of Contact fields:
 * - Email format validation
 * - Phone format validation (XXX) XXX-XXXX
 * - Fax format validation (same as phone)
 * - Required field validation
 */

// Validation patterns
export const POC_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Accepts formats: (XXX) XXX-XXXX or XXX-XXX-XXXX or XXXXXXXXXX
  phone: /^(?:\(\d{3}\)\s?\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{10})$/,
  // Same as phone for fax
  fax: /^(?:\(\d{3}\)\s?\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{10})$/,
} as const;

// Human-readable format hints
export const POC_FORMAT_HINTS = {
  email: 'user@example.com',
  phone: '(XXX) XXX-XXXX',
  fax: '(XXX) XXX-XXXX',
} as const;

// Validation error messages
export const POC_ERROR_MESSAGES = {
  email: 'Please enter a valid email address',
  phone: 'Please enter phone in format (XXX) XXX-XXXX',
  fax: 'Please enter fax in format (XXX) XXX-XXXX',
  required: (field: string) => `${field} is required`,
} as const;

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  hint?: string;
}

/**
 * POC fields that can be validated
 */
export interface PocFields {
  name?: string;
  email?: string;
  phone?: string;
  fax?: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string | undefined | null): ValidationError | null {
  if (!email || email.trim() === '') {
    return null; // Empty values handled by required validation
  }

  if (!POC_PATTERNS.email.test(email.trim())) {
    return {
      field: 'email',
      message: POC_ERROR_MESSAGES.email,
      hint: POC_FORMAT_HINTS.email,
    };
  }

  return null;
}

/**
 * Validate phone format
 */
export function validatePhone(phone: string | undefined | null): ValidationError | null {
  if (!phone || phone.trim() === '') {
    return null; // Empty values handled by required validation
  }

  if (!POC_PATTERNS.phone.test(phone.trim())) {
    return {
      field: 'phone',
      message: POC_ERROR_MESSAGES.phone,
      hint: POC_FORMAT_HINTS.phone,
    };
  }

  return null;
}

/**
 * Validate fax format
 */
export function validateFax(fax: string | undefined | null): ValidationError | null {
  if (!fax || fax.trim() === '') {
    return null; // Fax is always optional
  }

  if (!POC_PATTERNS.fax.test(fax.trim())) {
    return {
      field: 'fax',
      message: POC_ERROR_MESSAGES.fax,
      hint: POC_FORMAT_HINTS.fax,
    };
  }

  return null;
}

/**
 * Validate required field
 */
export function validateRequired(
  value: string | undefined | null,
  fieldName: string
): ValidationError | null {
  if (!value || value.trim() === '') {
    return {
      field: fieldName.toLowerCase().replace(/\s+/g, '_'),
      message: POC_ERROR_MESSAGES.required(fieldName),
    };
  }
  return null;
}

/**
 * Validate Opportunity POC (internal user)
 * AC1: Must be an internal USMax user
 */
export function validateOpportunityPoc(pocId: string | undefined | null): ValidationResult {
  const errors: ValidationError[] = [];

  const requiredError = validateRequired(pocId, 'Opportunity POC');
  if (requiredError) {
    errors.push(requiredError);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate Relationship POC (external contact)
 * AC2: Required fields with format validation
 */
export function validateRelationshipPoc(
  poc: PocFields,
  options: { nameRequired?: boolean; emailRequired?: boolean; phoneRequired?: boolean } = {}
): ValidationResult {
  const { nameRequired = true, emailRequired = true, phoneRequired = false } = options;
  const errors: ValidationError[] = [];

  // Required field validation
  if (nameRequired) {
    const nameError = validateRequired(poc.name, 'Relationship POC Name');
    if (nameError) errors.push(nameError);
  }

  if (emailRequired) {
    const emailReqError = validateRequired(poc.email, 'Relationship POC Email');
    if (emailReqError) errors.push(emailReqError);
  }

  if (phoneRequired) {
    const phoneReqError = validateRequired(poc.phone, 'Relationship POC Phone');
    if (phoneReqError) errors.push(phoneReqError);
  }

  // Format validation
  const emailError = validateEmail(poc.email);
  if (emailError) {
    emailError.field = 'relationship_poc_email';
    errors.push(emailError);
  }

  const phoneError = validatePhone(poc.phone);
  if (phoneError) {
    phoneError.field = 'relationship_poc_phone';
    errors.push(phoneError);
  }

  const faxError = validateFax(poc.fax);
  if (faxError) {
    faxError.field = 'relationship_poc_fax';
    errors.push(faxError);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate Contracts POC (optional external contact)
 * Similar to Relationship POC but optional
 */
export function validateContractsPoc(
  poc: PocFields | undefined | null,
  options: { required?: boolean } = {}
): ValidationResult {
  const { required = false } = options;
  const errors: ValidationError[] = [];

  // If not provided and not required, valid
  if (!poc && !required) {
    return { valid: true, errors: [] };
  }

  // If required but not provided
  if (!poc && required) {
    errors.push({
      field: 'contracts_poc',
      message: POC_ERROR_MESSAGES.required('Contracts POC'),
    });
    return { valid: false, errors };
  }

  if (poc) {
    // Format validation only (no required fields for optional POC)
    const emailError = validateEmail(poc.email);
    if (emailError) {
      emailError.field = 'contracts_poc_email';
      errors.push(emailError);
    }

    const phoneError = validatePhone(poc.phone);
    if (phoneError) {
      phoneError.field = 'contracts_poc_phone';
      errors.push(phoneError);
    }

    const faxError = validateFax(poc.fax);
    if (faxError) {
      faxError.field = 'contracts_poc_fax';
      errors.push(faxError);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Normalize phone number to (XXX) XXX-XXXX format
 */
export function normalizePhone(phone: string | undefined | null): string | null {
  if (!phone) return null;

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  if (digits.length !== 10) {
    return phone; // Return as-is if not 10 digits
  }

  // Format as (XXX) XXX-XXXX
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Validate all POC fields for NDA creation/update
 */
export interface NdaPocValidationInput {
  opportunityPocId?: string;
  relationshipPoc?: PocFields;
  contractsPoc?: PocFields;
}

export function validateNdaPocs(input: NdaPocValidationInput): ValidationResult {
  const allErrors: ValidationError[] = [];

  // Validate Opportunity POC (required)
  const oppResult = validateOpportunityPoc(input.opportunityPocId);
  allErrors.push(...oppResult.errors);

  // Validate Relationship POC (required)
  if (input.relationshipPoc) {
    const relResult = validateRelationshipPoc(input.relationshipPoc);
    allErrors.push(...relResult.errors);
  } else {
    allErrors.push({
      field: 'relationship_poc',
      message: POC_ERROR_MESSAGES.required('Relationship POC'),
    });
  }

  // Validate Contracts POC (optional)
  const conResult = validateContractsPoc(input.contractsPoc);
  allErrors.push(...conResult.errors);

  return { valid: allErrors.length === 0, errors: allErrors };
}

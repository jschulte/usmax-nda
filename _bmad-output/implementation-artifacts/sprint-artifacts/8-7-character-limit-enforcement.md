# Story 8-7: Character Limit Enforcement

**Epic:** Epic 8 - Data Integrity & Validation
**Story Name:** Character Limit Enforcement
**Story Points:** 5
**Priority:** High
**Status:** Ready for Development

---

## User Story

**As a** system administrator
**I want** all text input fields to enforce character limits at both the database and application layers
**So that** data integrity is maintained, database constraints are respected, and users receive clear feedback when input exceeds limits

---

## Acceptance Criteria

### AC1: Database-Level Character Limits Enforced
**Given** the database schema defines VARCHAR and TEXT column types
**When** data is inserted or updated
**Then** PostgreSQL enforces character limits automatically
**And** attempts to exceed limits result in database errors
**And** all VARCHAR columns have explicit length constraints

**Details:**
- `Nda.authorizedPurpose`: VARCHAR(255) - already enforced
- All text fields use appropriate column types (VARCHAR with limits or TEXT for unlimited)
- Database migrations include ALTER statements to add/modify constraints
- Constraint violations return descriptive error codes (23514 - check violation)

### AC2: Application-Level Pre-Validation
**Given** a user enters text into a form field with a character limit
**When** the input approaches or exceeds the limit
**Then** the application validates length BEFORE submission
**And** displays a character counter showing "X / Y characters"
**And** prevents form submission if any field exceeds its limit
**And** shows clear error messages identifying which fields are too long

**Details:**
- Frontend validation uses React hooks (useForm, custom validators)
- Backend validation in Express routes/services validates before database operations
- Character counting uses `.length` property (JavaScript string length)
- Multi-byte UTF-8 characters counted correctly (one emoji = 1+ characters depending on encoding)

### AC3: Trimming and Normalization
**Given** a user enters text with leading/trailing whitespace
**When** the data is validated and saved
**Then** whitespace is automatically trimmed using `.trim()`
**And** the trimmed length is validated against limits
**And** empty strings (after trimming) fail required field validation
**And** normalized values are stored in the database

**Details:**
- Apply `.trim()` to all string inputs before validation
- Preserve internal whitespace (only trim leading/trailing)
- Ensure trimming happens consistently on frontend and backend
- Display trimmed character count in real-time

### AC4: Field-Specific Character Limits
**Given** different fields have different maximum lengths
**When** implementing validation
**Then** each field enforces its specific limit:

| Field | Max Length | Type | Notes |
|-------|-----------|------|-------|
| `Nda.companyName` | 255 | String | Company name |
| `Nda.abbreviatedName` | 100 | String | Short name/acronym |
| `Nda.authorizedPurpose` | 255 | String | VARCHAR(255) in DB |
| `Nda.companyCity` | 100 | String | City name |
| `Nda.companyState` | 2 | String | US state code (e.g., "CA") |
| `Nda.stateOfIncorporation` | 50 | String | State name or code |
| `Nda.agencyOfficeName` | 255 | String | Agency office name |
| `Contact.email` | 255 | String | Email address |
| `Contact.firstName` | 100 | String | First name |
| `Contact.lastName` | 100 | String | Last name |
| `Contact.workPhone` | 20 | String | Phone: (XXX) XXX-XXXX |
| `Contact.cellPhone` | 20 | String | Phone: (XXX) XXX-XXXX |
| `Contact.fax` | 20 | String | Fax: (XXX) XXX-XXXX |
| `Contact.jobTitle` | 150 | String | Job title |
| `Contact.emailSignature` | 5000 | Text | HTML/text signature |
| `Document.filename` | 255 | String | Original filename |
| `Document.notes` | 2000 | Text | Document metadata notes |
| `NdaEmail.subject` | 255 | String | Email subject line |
| `NdaEmail.body` | Unlimited | Text | Email body (HTML/text) |
| `InternalNote.noteText` | 10000 | Text | Internal notes |
| `RtfTemplate.name` | 255 | String | Template name |
| `RtfTemplate.description` | 1000 | Text | Template description |
| `EmailTemplate.name` | 255 | String | Template name |
| `EmailTemplate.subject` | 255 | String | Subject line template |
| `Role.name` | 100 | String | Role name |
| `Permission.code` | 100 | String | Permission code |
| `AgencyGroup.name` | 255 | String | Agency group name |
| `AgencyGroup.code` | 50 | String | Agency group code |
| `Subagency.name` | 255 | String | Subagency name |
| `Subagency.code` | 50 | String | Subagency code |

**And** unlimited text fields (body, emailSignature, etc.) do NOT have character limits enforced
**And** validation error messages specify the exact limit for each field

### AC5: Real-Time Character Counting
**Given** a user is typing in a text field with a character limit
**When** they type each character
**Then** a character counter updates in real-time showing current/max (e.g., "42 / 255 characters")
**And** the counter turns orange when approaching limit (90% of max)
**And** the counter turns red when limit is exceeded
**And** the input field shows visual indication (red border) when over limit
**And** the submit button is disabled when any field exceeds its limit

**Details:**
- Use React `onChange` handlers to track character count
- Display counter below or next to the input field
- Visual states:
  - Normal: gray text, no border highlight
  - Warning (>90%): orange text, orange border
  - Error (exceeded): red text, red border
- Counter updates immediately (no debounce delay for counting)

### AC6: Backend Validation for Character Limits
**Given** form data is submitted to the backend API
**When** the Express route handler processes the request
**Then** the backend validates character limits independently
**And** returns 400 Bad Request with specific error details if limits exceeded
**And** error response includes field name, current length, and max length
**And** validation happens BEFORE database operations

**Details:**
- Create reusable validation middleware/utilities
- Example error response:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "companyName",
      "message": "Company name must not exceed 255 characters",
      "currentLength": 287,
      "maxLength": 255
    }
  ]
}
```

### AC7: Database Constraint Error Handling
**Given** backend validation is bypassed or fails
**When** PostgreSQL enforces character limits
**Then** the application catches database constraint errors
**And** translates them into user-friendly error messages
**And** logs the full error details for debugging
**And** returns 400 Bad Request (not 500 Internal Server Error)

**Details:**
- Catch Prisma `P2000` error code (value too long for column type)
- Example PostgreSQL error: `value too long for type character varying(255)`
- Map database errors to field names using error metadata
- Never expose raw database error messages to users

---

## Tasks

### Task Group 1: Define Character Limit Constants (3 story points, 7 tasks)
**Complexity:** Low
**Dependencies:** None

1. **Create character limit constants file**
   - File: `src/server/constants/characterLimits.ts`
   - Export constant object `CHARACTER_LIMITS` with all field limits
   - Organize by entity (NDA_LIMITS, CONTACT_LIMITS, etc.)
   - Include JSDoc comments explaining each limit

2. **Define NDA field limits**
   - `companyName: 255`
   - `abbreviatedName: 100`
   - `authorizedPurpose: 255`
   - `companyCity: 100`
   - `companyState: 2`
   - `stateOfIncorporation: 50`
   - `agencyOfficeName: 255`

3. **Define Contact field limits**
   - `email: 255`
   - `firstName: 100`
   - `lastName: 100`
   - `workPhone: 20`
   - `cellPhone: 20`
   - `fax: 20`
   - `jobTitle: 150`
   - `emailSignature: 5000`

4. **Define Document field limits**
   - `filename: 255`
   - `notes: 2000`

5. **Define Email field limits**
   - `subject: 255`
   - `body: null` (unlimited)

6. **Define Template field limits**
   - RTF template name: 255
   - RTF template description: 1000
   - Email template name: 255
   - Email template subject: 255

7. **Define System entity limits**
   - Role name: 100
   - Permission code: 100
   - Agency group name: 255
   - Agency group code: 50
   - Subagency name: 255
   - Subagency code: 50
   - Internal note text: 10000

### Task Group 2: Backend Validation Utilities (8 story points, 8 tasks)
**Complexity:** Medium
**Dependencies:** Task Group 1

1. **Create string validation utility functions**
   - File: `src/server/validators/stringValidator.ts`
   - Function: `validateLength(value: string, maxLength: number, fieldName: string): ValidationError | null`
   - Function: `trimAndValidate(value: string, maxLength: number, fieldName: string): { trimmed: string, error: ValidationError | null }`
   - Return validation error objects matching ValidationError interface

2. **Create length validation middleware**
   - Function: `validateFieldLengths(schema: Record<string, number>)`
   - Middleware factory that accepts field-to-limit mapping
   - Validates all specified fields in request body
   - Returns 400 with detailed errors if validation fails

3. **Add length validation to NDA routes**
   - File: `src/server/routes/ndas.ts`
   - Apply validation middleware to POST /api/ndas
   - Apply validation middleware to PUT /api/ndas/:id
   - Validate all NDA text fields against CHARACTER_LIMITS.NDA

4. **Add length validation to Contact routes**
   - File: `src/server/routes/contacts.ts` (or users.ts)
   - Apply validation to contact creation/update endpoints
   - Validate all Contact text fields against CHARACTER_LIMITS.CONTACT

5. **Add length validation to Document routes**
   - File: `src/server/routes/documents.ts`
   - Validate filename length
   - Validate notes length
   - Handle file upload filename validation

6. **Add length validation to Template routes**
   - File: `src/server/routes/templates.ts`
   - Validate RTF template name and description
   - Validate Email template name and subject

7. **Update ndaService to trim inputs**
   - File: `src/server/services/ndaService.ts`
   - Apply `.trim()` to all string fields before saving
   - Normalize whitespace in company name, abbreviated name, etc.
   - Ensure trimming happens in create and update operations

8. **Create database error handler**
   - File: `src/server/middleware/errorHandler.ts` (update existing)
   - Catch Prisma P2000 errors (value too long)
   - Parse error message to extract field name and limit
   - Return user-friendly 400 response with field details
   - Log full error for debugging

### Task Group 3: Frontend Validation - React Components (13 story points, 10 tasks)
**Complexity:** Medium
**Dependencies:** Task Group 1

1. **Create character limit constants (frontend)**
   - File: `src/client/constants/characterLimits.ts`
   - Mirror backend CHARACTER_LIMITS structure
   - Export same limits for consistency

2. **Create CharacterCounter component**
   - File: `src/components/common/CharacterCounter.tsx`
   - Props: `currentLength: number`, `maxLength: number`
   - Display: "X / Y characters"
   - Apply color classes based on percentage: normal (<90%), warning (≥90%), error (>100%)
   - Export CSS classes for text color and input border color

3. **Create useCharacterLimit custom hook**
   - File: `src/client/hooks/useCharacterLimit.ts`
   - Hook: `useCharacterLimit(value: string, maxLength: number)`
   - Returns: `{ isValid, isFull, isNearLimit, currentLength, error }`
   - Calculate trimmed length
   - Determine validation state

4. **Create TextInput with character limit**
   - File: `src/components/forms/TextInput.tsx` (update existing)
   - Add optional `maxLength` prop
   - Integrate CharacterCounter component
   - Apply border color based on validation state
   - Show error message if exceeded

5. **Create TextArea with character limit**
   - File: `src/components/forms/TextArea.tsx` (update existing)
   - Add optional `maxLength` prop
   - Integrate CharacterCounter component
   - Apply visual states (warning, error)
   - Support large text fields (emailSignature, notes)

6. **Update NDA form fields with character limits**
   - File: `src/components/ndas/NDAForm.tsx` (or CreateNDAPage.tsx)
   - Add maxLength to companyName field (255)
   - Add maxLength to abbreviatedName field (100)
   - Add maxLength to authorizedPurpose field (255)
   - Add maxLength to companyCity field (100)
   - Add maxLength to companyState field (2)
   - Add maxLength to stateOfIncorporation field (50)
   - Add maxLength to agencyOfficeName field (255)

7. **Update Contact form fields with character limits**
   - File: `src/components/contacts/ContactForm.tsx` (or POC forms)
   - Add maxLength to email field (255)
   - Add maxLength to firstName field (100)
   - Add maxLength to lastName field (100)
   - Add maxLength to workPhone field (20)
   - Add maxLength to cellPhone field (20)
   - Add maxLength to fax field (20)
   - Add maxLength to jobTitle field (150)
   - Add maxLength to emailSignature field (5000)

8. **Update Document upload form with filename limit**
   - File: `src/components/documents/DocumentUploadForm.tsx`
   - Validate filename length before upload (255 chars)
   - Validate notes field length (2000 chars)
   - Show error if filename too long

9. **Update Email composition form**
   - File: `src/components/emails/EmailComposer.tsx`
   - Add maxLength to subject field (255)
   - No limit on body field (unlimited)
   - Show character counter for subject

10. **Update Template forms**
    - File: `src/components/templates/RtfTemplateForm.tsx`
    - Add maxLength to template name (255)
    - Add maxLength to template description (1000)
    - File: `src/components/templates/EmailTemplateForm.tsx`
    - Add maxLength to template name (255)
    - Add maxLength to subject field (255)

### Task Group 4: Form Submission Prevention (5 story points, 6 tasks)
**Complexity:** Medium
**Dependencies:** Task Group 3

1. **Create form validation hook**
   - File: `src/client/hooks/useFormValidation.ts`
   - Hook: `useFormValidation(fields: Record<string, { value: string, maxLength?: number }>)`
   - Returns: `{ isValid, errors, validateAll }`
   - Check all fields against their limits

2. **Integrate validation into NDA form submission**
   - File: `src/components/ndas/NDAForm.tsx`
   - Call `validateAll()` before submission
   - Disable submit button if `!isValid`
   - Show error summary listing all invalid fields
   - Prevent form submission if validation fails

3. **Integrate validation into Contact form submission**
   - File: `src/components/contacts/ContactForm.tsx`
   - Validate all fields before submission
   - Display inline errors for each invalid field
   - Disable submit button when invalid

4. **Integrate validation into Document upload**
   - File: `src/components/documents/DocumentUploadForm.tsx`
   - Validate filename and notes before upload
   - Show error modal if validation fails

5. **Integrate validation into Email composer**
   - File: `src/components/emails/EmailComposer.tsx`
   - Validate subject line before sending
   - Disable send button if subject exceeds limit

6. **Integrate validation into Template forms**
   - Validate template name and description before save
   - Show validation errors inline

### Task Group 5: Database Schema Review & Migrations (5 story points, 4 tasks)
**Complexity:** Low
**Dependencies:** None

1. **Review existing schema.prisma for VARCHAR constraints**
   - File: `prisma/schema.prisma`
   - Confirm `authorizedPurpose` is VARCHAR(255) - CONFIRMED (line 273)
   - Document all other text fields and their types
   - Identify any missing length constraints

2. **Create migration for missing VARCHAR constraints**
   - File: `prisma/migrations/YYYYMMDDHHMMSS_add_character_limits/migration.sql`
   - Add VARCHAR limits to fields currently using TEXT (if needed)
   - Example: `ALTER TABLE contacts ALTER COLUMN first_name TYPE VARCHAR(100);`
   - Test migration in development environment

3. **Update Prisma schema with @db.VarChar annotations**
   - Add explicit type annotations for all limited-length fields
   - Example: `companyName String @map("company_name") @db.VarChar(255)`
   - Ensures Prisma generates correct SQL types

4. **Generate Prisma client with updated schema**
   - Run `npm run db:generate`
   - Verify type definitions include length information
   - Test that Prisma enforces limits

### Task Group 6: Error Handling & User Feedback (8 story points, 7 tasks)
**Complexity:** Medium
**Dependencies:** Task Groups 2, 3

1. **Create ValidationError type**
   - File: `src/types/validation.ts`
   - Interface: `ValidationError { field: string, message: string, currentLength?: number, maxLength?: number }`
   - Export ValidationResult type

2. **Create frontend error display component**
   - File: `src/components/forms/ValidationErrors.tsx`
   - Component: `ValidationErrors({ errors: ValidationError[] })`
   - Display list of validation errors with field names
   - Highlight specific error types (length, format, required)

3. **Integrate error display into NDA form**
   - File: `src/components/ndas/NDAForm.tsx`
   - Show ValidationErrors component when validation fails
   - Clear errors when user corrects input

4. **Integrate error display into Contact form**
   - Show field-specific errors inline
   - Show summary of all errors at top of form

5. **Handle backend validation errors**
   - File: `src/client/services/apiClient.ts` (or axios interceptor)
   - Parse 400 response with validation details
   - Map errors to form fields
   - Display errors in UI

6. **Handle database constraint errors**
   - Catch 400 responses from database constraint violations
   - Display user-friendly message: "Field 'X' is too long (max Y characters)"
   - Log full error to console for debugging

7. **Add error logging**
   - File: `src/server/services/auditService.ts`
   - Log validation failures to audit log (optional, for security)
   - Include field name, user ID, timestamp
   - Track patterns of validation errors

### Task Group 7: Testing Character Limit Validation (13 story points, 10 tasks)
**Complexity:** High
**Dependencies:** Task Groups 1-6

1. **Write backend validation unit tests**
   - File: `src/server/validators/__tests__/stringValidator.test.ts`
   - Test `validateLength()` with valid inputs
   - Test `validateLength()` with inputs exceeding limits
   - Test `trimAndValidate()` with leading/trailing whitespace
   - Test edge cases: empty string, null, undefined, exactly at limit

2. **Write middleware validation tests**
   - File: `src/server/middleware/__tests__/validation.test.ts`
   - Test validation middleware with valid request body
   - Test validation middleware with fields exceeding limits
   - Test error response format
   - Test multiple simultaneous validation errors

3. **Write NDA service tests for trimming**
   - File: `src/server/services/__tests__/ndaService.test.ts`
   - Test that createNDA trims all string fields
   - Test that updateNDA trims all string fields
   - Verify trimmed values are saved to database

4. **Write integration tests for NDA creation with long fields**
   - File: `src/server/routes/__tests__/ndas.test.ts`
   - Test POST /api/ndas with companyName exceeding 255 chars
   - Test POST /api/ndas with authorizedPurpose exceeding 255 chars
   - Verify 400 response with error details
   - Test successful creation with fields at exactly the limit

5. **Write integration tests for Contact creation with long fields**
   - File: `src/server/routes/__tests__/contacts.test.ts`
   - Test POST /api/contacts with email exceeding 255 chars
   - Test POST /api/contacts with firstName exceeding 100 chars
   - Verify validation error responses

6. **Write database constraint tests**
   - File: `src/server/services/__tests__/ndaService.test.ts`
   - Bypass application validation and attempt to insert oversized data
   - Verify Prisma throws P2000 error
   - Verify error handler catches and translates error

7. **Write frontend hook tests**
   - File: `src/client/hooks/__tests__/useCharacterLimit.test.ts`
   - Test useCharacterLimit with various input lengths
   - Test state changes (normal, warning, error)
   - Test trimming behavior

8. **Write frontend component tests**
   - File: `src/components/forms/__tests__/TextInput.test.ts`
   - Test TextInput with maxLength prop
   - Test CharacterCounter display
   - Test visual states (normal, warning, error)
   - Test form submission prevention when over limit

9. **Write E2E tests for character limit enforcement**
   - File: `tests/e2e/nda-creation.spec.ts`
   - Test creating NDA with company name exceeding limit
   - Verify error message displayed in UI
   - Verify submit button disabled
   - Verify form cannot be submitted
   - Test correction flow (shorten input, error clears, submit enabled)

10. **Write E2E tests for database constraint errors**
    - Simulate database constraint violation (mock Prisma error)
    - Verify user sees friendly error message
    - Verify error is logged

### Task Group 8: Documentation (3 story points, 5 tasks)
**Complexity:** Low
**Dependencies:** Task Groups 1-7

1. **Document character limit constants**
   - File: `src/server/constants/characterLimits.ts`
   - Add JSDoc comments explaining each limit
   - Document source of limits (database constraints, business rules)

2. **Update API documentation with validation rules**
   - File: `docs/api.md` (or OpenAPI spec)
   - Document character limits for each API field
   - Document validation error response format
   - Provide example error responses

3. **Update developer guide**
   - File: `docs/developer-guide.md`
   - Add section on character limit enforcement
   - Explain frontend/backend validation flow
   - Provide examples of adding new validated fields

4. **Create validation best practices guide**
   - File: `docs/validation-best-practices.md`
   - Guidelines for adding new validated fields
   - Common pitfalls (forgetting to trim, inconsistent limits)
   - Testing strategies

5. **Update CLAUDE.md with validation patterns**
   - File: `CLAUDE.md`
   - Add section on character limit validation
   - Provide code snippets for common patterns
   - Reference CHARACTER_LIMITS constants

**Total Tasks:** 57 tasks across 8 task groups
**Total Story Points:** 58 points

---

## Technical Implementation Details

### Backend Architecture

#### Character Limit Constants
```typescript
// src/server/constants/characterLimits.ts
export const CHARACTER_LIMITS = {
  NDA: {
    companyName: 255,
    abbreviatedName: 100,
    authorizedPurpose: 255,
    companyCity: 100,
    companyState: 2,
    stateOfIncorporation: 50,
    agencyOfficeName: 255,
  },
  CONTACT: {
    email: 255,
    firstName: 100,
    lastName: 100,
    workPhone: 20,
    cellPhone: 20,
    fax: 20,
    jobTitle: 150,
    emailSignature: 5000,
  },
  DOCUMENT: {
    filename: 255,
    notes: 2000,
  },
  EMAIL: {
    subject: 255,
    // body: unlimited (null)
  },
  TEMPLATE: {
    rtfName: 255,
    rtfDescription: 1000,
    emailName: 255,
    emailSubject: 255,
  },
  SYSTEM: {
    roleName: 100,
    permissionCode: 100,
    agencyGroupName: 255,
    agencyGroupCode: 50,
    subagencyName: 255,
    subagencyCode: 50,
    internalNoteText: 10000,
  },
} as const;
```

#### String Validator Utility
```typescript
// src/server/validators/stringValidator.ts
import { ValidationError } from '@/types/validation';

export function validateLength(
  value: string | undefined | null,
  maxLength: number,
  fieldName: string
): ValidationError | null {
  if (!value) return null; // Empty handled by required validation

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} must not exceed ${maxLength} characters`,
      currentLength: trimmed.length,
      maxLength,
    };
  }

  return null;
}

export function trimAndValidate(
  value: string | undefined | null,
  maxLength: number,
  fieldName: string
): { trimmed: string; error: ValidationError | null } {
  if (!value) {
    return { trimmed: '', error: null };
  }

  const trimmed = value.trim();
  const error = validateLength(trimmed, maxLength, fieldName);
  return { trimmed, error };
}
```

#### Validation Middleware
```typescript
// src/server/middleware/validateFieldLengths.ts
import { Request, Response, NextFunction } from 'express';
import { validateLength } from '@server/validators/stringValidator';
import { ValidationError } from '@/types/validation';

export function validateFieldLengths(
  schema: Record<string, number>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: ValidationError[] = [];

    for (const [field, maxLength] of Object.entries(schema)) {
      const value = req.body[field];
      const error = validateLength(value, maxLength, field);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    next();
  };
}
```

#### Usage in NDA Routes
```typescript
// src/server/routes/ndas.ts
import { validateFieldLengths } from '@server/middleware/validateFieldLengths';
import { CHARACTER_LIMITS } from '@server/constants/characterLimits';

router.post(
  '/api/ndas',
  authenticateJWT,
  attachUserContext,
  checkPermissions(['nda:create']),
  validateFieldLengths(CHARACTER_LIMITS.NDA),
  async (req, res) => {
    // Route handler...
  }
);
```

#### Database Error Handling
```typescript
// src/server/middleware/errorHandler.ts (update existing)
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Handle Prisma value too long error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2000') {
      // Extract field name from error metadata
      const field = err.meta?.target || 'unknown field';
      return res.status(400).json({
        error: 'Validation failed',
        details: [{
          field,
          message: `Value too long for ${field}`,
        }],
      });
    }
  }

  // Existing error handling...
}
```

### Frontend Architecture

#### Character Counter Component
```typescript
// src/components/common/CharacterCounter.tsx
import React from 'react';

interface CharacterCounterProps {
  currentLength: number;
  maxLength: number;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  currentLength,
  maxLength,
}) => {
  const percentage = (currentLength / maxLength) * 100;

  const colorClass =
    currentLength > maxLength
      ? 'text-red-600'
      : percentage >= 90
      ? 'text-orange-600'
      : 'text-gray-500';

  return (
    <div className={`text-sm ${colorClass}`}>
      {currentLength} / {maxLength} characters
    </div>
  );
};
```

#### Character Limit Hook
```typescript
// src/client/hooks/useCharacterLimit.ts
import { useMemo } from 'react';

export function useCharacterLimit(value: string, maxLength: number) {
  return useMemo(() => {
    const trimmed = value.trim();
    const currentLength = trimmed.length;
    const isValid = currentLength <= maxLength;
    const isFull = currentLength >= maxLength;
    const isNearLimit = currentLength >= maxLength * 0.9;

    return {
      isValid,
      isFull,
      isNearLimit,
      currentLength,
      error: !isValid
        ? `Must not exceed ${maxLength} characters (currently ${currentLength})`
        : null,
    };
  }, [value, maxLength]);
}
```

#### TextInput with Character Limit
```typescript
// src/components/forms/TextInput.tsx (enhanced)
import React from 'react';
import { CharacterCounter } from '@/components/common/CharacterCounter';
import { useCharacterLimit } from '@/hooks/useCharacterLimit';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  maxLength,
  label,
  placeholder,
  required,
}) => {
  const validation = maxLength
    ? useCharacterLimit(value, maxLength)
    : { isValid: true, currentLength: value.length, error: null };

  const borderClass = !validation.isValid
    ? 'border-red-500'
    : validation.isNearLimit
    ? 'border-orange-500'
    : 'border-gray-300';

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full px-3 py-2 border rounded-md ${borderClass}`}
      />
      {maxLength && (
        <CharacterCounter
          currentLength={validation.currentLength}
          maxLength={maxLength}
        />
      )}
      {validation.error && (
        <div className="text-red-600 text-sm mt-1">{validation.error}</div>
      )}
    </div>
  );
};
```

### Database Schema (Prisma)

Current schema already enforces `VARCHAR(255)` on `authorizedPurpose`:
```prisma
model Nda {
  // ...
  authorizedPurpose String @map("authorized_purpose") @db.VarChar(255)
  // ...
}
```

**Proposed additions** (if not already present):
```prisma
model Nda {
  companyName String @map("company_name") @db.VarChar(255)
  abbreviatedName String @map("abbreviated_name") @db.VarChar(100)
  companyCity String? @map("company_city") @db.VarChar(100)
  companyState String? @map("company_state") @db.VarChar(2)
  stateOfIncorporation String? @map("state_of_incorporation") @db.VarChar(50)
  agencyOfficeName String? @map("agency_office_name") @db.VarChar(255)
  // ...
}

model Contact {
  email String @unique @db.VarChar(255)
  firstName String? @map("first_name") @db.VarChar(100)
  lastName String? @map("last_name") @db.VarChar(100)
  workPhone String? @map("work_phone") @db.VarChar(20)
  cellPhone String? @map("cell_phone") @db.VarChar(20)
  fax String? @db.VarChar(20)
  jobTitle String? @map("job_title") @db.VarChar(150)
  emailSignature String? @map("email_signature") @db.Text // No limit
  // ...
}
```

---

## Existing Codebase Analysis

### Current Implementation Status

#### Database Schema (schema.prisma)
**File:** `/Users/jonahschulte/git/usmax-nda/prisma/schema.prisma` (596 lines)

**Findings:**
- **Line 273:** `authorizedPurpose String @map("authorized_purpose") @db.VarChar(255)` ✅
  - Already enforces 255 character limit at database level
- **Other text fields:** Most use `String` type without explicit `@db.VarChar()` annotations
  - `companyName`, `abbreviatedName`, `companyCity`, `companyState`, etc. - no explicit limits
  - `emailSignature` (line 38): `@db.Text` (unlimited) ✅
  - `noteText` in InternalNote (line 571): `@db.Text` (unlimited) - needs limit
  - Document `notes` (line 381): `@db.Text` - needs limit
  - Email `body` (line 413): `@db.Text` (unlimited) ✅

**Action Required:**
- Add `@db.VarChar(N)` annotations to all limited-length fields
- Create migration to alter existing columns to VARCHAR with limits
- Verify that existing data fits within proposed limits before migration

#### POC Validator (pocValidator.ts)
**File:** `/Users/jonahschulte/git/usmax-nda/src/server/validators/pocValidator.ts` (296 lines)

**Findings:**
- **No character limit validation** - only format validation (email, phone, fax)
- Functions exist: `validateEmail()`, `validatePhone()`, `validateFax()`, `validateRequired()`
- **No length checking** - can accept arbitrarily long strings
- Uses `.trim()` for format validation (lines 64, 68, 83, 87, 103, 107, 124)

**Reusable Patterns:**
- `ValidationError` interface (lines 44-48) ✅ - can extend for length errors
- `ValidationResult` interface (lines 39-42) ✅ - reuse for length validation
- `validateRequired()` (lines 120-131) ✅ - already trims and checks empty

**Action Required:**
- Add `validateLength()` function to pocValidator or create separate stringValidator.ts
- Integrate length validation into existing validation functions
- Add maxLength checks to `validateNdaPocs()` and related functions

#### Database Migrations
**Files:** Multiple migration files in `prisma/migrations/`

**Findings:**
- **Line 128 (20251217091247_add_full_nda_model):** `"authorized_purpose" VARCHAR(255) NOT NULL` ✅
  - Database constraint already exists for authorizedPurpose
- **Most other fields:** Use `TEXT` type without limits
  - Examples: first_name, last_name, company_name, etc.

**Action Required:**
- Create new migration to add VARCHAR constraints to existing TEXT columns
- Example: `ALTER TABLE contacts ALTER COLUMN first_name TYPE VARCHAR(100);`
- Test migration with existing data to ensure no truncation

### Current Gaps

1. **No character limit constants defined** - limits hardcoded or missing
2. **No frontend character counter components** - no visual feedback
3. **No backend validation middleware** for character limits
4. **Database schema incomplete** - missing VARCHAR constraints on most fields
5. **No real-time character counting** - users don't know when approaching limit
6. **No form submission prevention** - can submit forms with oversized data
7. **No database error handling** for P2000 errors (value too long)

---

## Dependencies

### Required Files/Modules
- `prisma/schema.prisma` - Database schema
- `src/server/validators/pocValidator.ts` - Existing validation patterns
- `src/server/middleware/errorHandler.ts` - Error handling (to be enhanced)
- Frontend form components (NDAForm, ContactForm, etc.) - to be enhanced

### External Libraries
- **Prisma** - Database ORM (already in use)
- **React** - Frontend framework (already in use)
- **Express** - Backend framework (already in use)

### Story Dependencies
- **Depends on:** Story 8-6 (Format Validation) - provides validation patterns
- **Blocks:** Story 8-11 (Real-Time Inline Validation) - provides character counting foundation

---

## Testing Requirements

### Unit Tests
1. **Backend validation utilities**
   - Test `validateLength()` with various input lengths
   - Test `trimAndValidate()` with whitespace
   - Test edge cases: null, undefined, empty string, exactly at limit

2. **Frontend hooks**
   - Test `useCharacterLimit()` state changes
   - Test character counting with trimming

3. **Components**
   - Test CharacterCounter color changes
   - Test TextInput validation states

### Integration Tests
1. **API endpoints**
   - Test POST /api/ndas with oversized fields
   - Test PUT /api/ndas/:id with oversized fields
   - Verify 400 responses with error details

2. **Database constraints**
   - Test Prisma P2000 error handling
   - Verify error translation to user-friendly messages

### E2E Tests
1. **Form submission flows**
   - Create NDA with company name exceeding limit
   - Verify error display in UI
   - Verify submit button disabled
   - Verify correction flow (shorten, error clears, submit enabled)

2. **Character counter behavior**
   - Type in field and observe real-time counter updates
   - Verify color changes (normal → warning → error)

---

## Security Considerations

1. **Input Sanitization**
   - Trim all inputs to prevent whitespace padding attacks
   - Validate character counts on trimmed values
   - Prevent special characters from bypassing length checks

2. **Database Constraints as Last Line of Defense**
   - Even if application validation fails, database enforces limits
   - Prevents data corruption from malicious or buggy clients

3. **Error Message Safety**
   - Never expose raw database errors to users
   - Translate Prisma errors to generic messages
   - Log full errors server-side for debugging

4. **Multi-byte Character Handling**
   - JavaScript `.length` counts UTF-16 code units (may differ from byte length)
   - PostgreSQL `VARCHAR(N)` counts characters (not bytes)
   - Ensure consistent counting between JS and PostgreSQL

---

## Performance Considerations

1. **Real-Time Validation**
   - Character counting is lightweight (no API calls)
   - Use React hooks for efficient re-rendering
   - No debouncing needed for character counters

2. **Database Migrations**
   - Adding VARCHAR constraints may require table rewrites (slow for large tables)
   - Schedule migrations during maintenance windows
   - Test migration performance on copy of production data

3. **Validation Overhead**
   - Backend validation adds minimal latency (<1ms per field)
   - Frontend validation is instantaneous
   - Overall impact negligible

---

## Rollback Plan

1. **Database Migrations**
   - Keep rollback migration files
   - Example: `ALTER TABLE contacts ALTER COLUMN first_name TYPE TEXT;`
   - Test rollback in development before production

2. **Frontend Changes**
   - Remove character counter components if causing issues
   - Revert to unvalidated forms (not recommended, but possible)

3. **Backend Validation**
   - Remove validation middleware from routes
   - Revert to database-only validation

---

## Success Metrics

1. **Validation Coverage**
   - 100% of text input fields have character limits defined
   - 100% of limited fields have frontend character counters
   - 100% of limited fields have backend validation

2. **Error Reduction**
   - Zero P2000 database errors in production logs (all caught by app validation)
   - User-submitted forms with oversized data: <1% (down from current unknown baseline)

3. **User Experience**
   - Users see character counters on all limited fields
   - Users receive clear feedback when approaching/exceeding limits
   - Users cannot submit forms with invalid data

4. **Test Coverage**
   - Unit test coverage: ≥90% for validation utilities
   - Integration test coverage: 100% of API endpoints with limited fields
   - E2E test coverage: Critical user flows (NDA creation, contact management)

---

## Open Questions

1. **Migration Strategy**
   - Should we add VARCHAR constraints to all existing TEXT fields in one migration, or incrementally?
   - **Recommendation:** Incremental approach (per entity) to minimize risk

2. **Existing Data**
   - Are there any existing records with data exceeding proposed limits?
   - **Action:** Run data analysis query before creating migrations

3. **Multi-byte Characters**
   - How should we handle emojis and multi-byte Unicode characters?
   - **Recommendation:** Count by JavaScript `.length` (UTF-16 code units), consistent with PostgreSQL character counting

4. **Business Rules**
   - Are the proposed character limits aligned with business requirements?
   - **Action:** Review limits with product owner/stakeholders before implementation

---

## Dev Notes

### Implementation Priority
1. **Phase 1 (Critical):** Backend validation utilities + middleware
2. **Phase 2 (High):** Frontend character counters + form integration
3. **Phase 3 (Medium):** Database schema updates + migrations
4. **Phase 4 (Low):** Comprehensive testing + documentation

### Quick Wins
- Start with high-traffic fields: `companyName`, `authorizedPurpose`, `email`
- Reuse existing `ValidationError` interface from pocValidator.ts
- Leverage existing `.trim()` usage in pocValidator

### Potential Pitfalls
- **Inconsistent trimming:** Ensure frontend and backend trim identically
- **Migration failures:** Existing data may exceed new limits (run cleanup first)
- **UTF-8 encoding issues:** Test with multi-byte characters (emojis, accents)
- **Frontend performance:** Avoid re-rendering entire form on each keystroke (use React.memo)

### Architecture Decisions
- **Single source of truth:** CHARACTER_LIMITS constants file (backend), mirrored in frontend
- **Validation layering:** Frontend (UX) → Backend (security) → Database (last resort)
- **Error handling strategy:** Catch Prisma errors, translate to 400 responses, never expose raw DB errors

---

## Story Completion Checklist

- [ ] Character limit constants defined (backend + frontend)
- [ ] Backend validation utilities created (`validateLength`, `trimAndValidate`)
- [ ] Validation middleware applied to all routes with text inputs
- [ ] Frontend CharacterCounter component created
- [ ] Frontend character limit hook created (`useCharacterLimit`)
- [ ] All form inputs updated with character counters
- [ ] Form submission prevention implemented
- [ ] Database schema updated with VARCHAR constraints
- [ ] Database migrations created and tested
- [ ] Error handling for database constraints implemented
- [ ] Unit tests written and passing (≥90% coverage)
- [ ] Integration tests written and passing
- [ ] E2E tests written and passing
- [ ] API documentation updated
- [ ] Developer guide updated
- [ ] Code review completed
- [ ] QA testing completed
- [ ] Deployed to staging
- [ ] Stakeholder approval received
- [ ] Deployed to production

---

**Story File Size:** 20.8 KB
**Last Updated:** 2026-01-03
**Status:** Ready for Implementation

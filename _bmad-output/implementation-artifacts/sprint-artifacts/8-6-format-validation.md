# Story 8.6: Format Validation

Status: ready-for-dev

## Story

As the **System**,
I want **to validate data formats for email addresses, phone numbers, and dates**,
So that **data is consistent and properly formatted throughout the application**.

## Acceptance Criteria

**AC1: Email Address Validation (RFC 5322)**
**Given** a user enters an email address in any form field
**When** validation runs (client-side and server-side)
**Then** the system validates against RFC 5322 email format
**And** accepts valid formats like `user@example.com`, `first.last+tag@company.co.uk`
**And** rejects invalid formats like `user@`, `@domain.com`, `user@domain`, `user @domain.com`
**And** displays inline error message: "Please enter a valid email address"
**And** provides format hint: `user@example.com`

**AC2: Phone Number Validation (XXX) XXX-XXXX**
**Given** a user enters a phone number in any form field
**When** validation runs (client-side and server-side)
**Then** the system validates against phone pattern `(XXX) XXX-XXXX`
**And** accepts formats: `(555) 123-4567`, `555-123-4567`, `5551234567`
**And** normalizes all inputs to canonical format `(555) 123-4567`
**And** rejects non-10-digit numbers
**And** displays inline error message: "Please enter phone in format (XXX) XXX-XXXX"
**And** provides format hint: `(XXX) XXX-XXXX`

**AC3: Fax Number Validation (Same as Phone)**
**Given** a user enters a fax number (optional field)
**When** validation runs
**Then** the system validates using same pattern as phone numbers
**And** normalizes to canonical format `(XXX) XXX-XXXX`
**And** accepts empty value (fax is optional)

**AC4: Date Format Validation (mm/dd/yyyy)**
**Given** a user enters a date in any date field
**When** validation runs
**Then** the system validates against format `mm/dd/yyyy`
**And** accepts dates like `01/15/2024`, `12/31/2025`
**And** rejects invalid formats like `2024-01-15`, `1/1/24`, `31/01/2024`
**And** validates month (1-12), day (1-31), and year (4 digits)
**And** displays inline error message: "Please enter date in format mm/dd/yyyy"

**AC5: Real-Time Inline Validation Feedback**
**Given** a user is filling out a form with email, phone, or date fields
**When** the user leaves a field (blur event) or submits the form
**Then** validation runs immediately
**And** error messages appear inline next to the field
**And** field border turns red for invalid input
**And** green checkmark appears for valid input
**And** error icon appears next to invalid fields

## Tasks / Subtasks

⚠️ **DRAFT TASKS** - Generated from requirements analysis. Will be validated and refined against actual codebase when dev-story runs.

- [ ] Review existing validation implementation in pocValidator.ts (AC: 1-5)
  - [ ] Verify email validation pattern (POC_PATTERNS.email) matches RFC 5322
  - [ ] Confirm phone validation pattern accepts (XXX) XXX-XXXX, XXX-XXX-XXXX, XXXXXXXXXX
  - [ ] Check fax validation uses same pattern as phone
  - [ ] Validate normalizePhone() function formats to (XXX) XXX-XXXX
  - [ ] Ensure validation error messages match acceptance criteria
  - [ ] Verify format hints are user-friendly
- [ ] Verify date validation implementation (AC: 4)
  - [ ] Search for date validation in form schemas (Zod schemas in frontend)
  - [ ] Check if date format validation exists in backend services
  - [ ] Verify mm/dd/yyyy format enforcement
  - [ ] Ensure month, day, year range validation
  - [ ] Check for date parsing utilities
- [ ] Audit all form fields using email, phone, fax, date inputs (AC: 1-5)
  - [ ] NDA form: Relationship POC email, phone, fax
  - [ ] NDA form: Contracts POC email, phone, fax
  - [ ] NDA form: Contacts POC email, phone, fax
  - [ ] NDA form: Effective Date, Expiry Date
  - [ ] User/Contact management forms: email, phone
  - [ ] Filter forms: date range filters (created, effective, expiry)
- [ ] Verify server-side validation in routes/services (AC: 1-5)
  - [ ] Check POST /api/ndas route validates email/phone/date formats
  - [ ] Check PUT /api/ndas/:id route validates formats
  - [ ] Check POST /api/contacts route validates email/phone
  - [ ] Check PUT /api/contacts/:id route validates formats
  - [ ] Verify validation happens BEFORE database writes
  - [ ] Ensure validation errors return 400 Bad Request with field-specific messages
- [ ] Verify client-side validation with Zod schemas (AC: 1-5)
  - [ ] Check React Hook Form + Zod integration
  - [ ] Verify email validation schema uses regex pattern
  - [ ] Verify phone validation schema
  - [ ] Verify date validation schema
  - [ ] Ensure client-side validation matches server-side
- [ ] Test inline validation feedback (AC: 5)
  - [ ] Test blur event triggers validation
  - [ ] Test error messages display inline
  - [ ] Test red border on invalid fields
  - [ ] Test green checkmark on valid fields
  - [ ] Test error icon display
  - [ ] Test format hints appear below fields
- [ ] Add or update validation tests (AC: 1-5)
  - [ ] Unit tests for validateEmail() with valid/invalid cases
  - [ ] Unit tests for validatePhone() with various formats
  - [ ] Unit tests for validateFax()
  - [ ] Unit tests for normalizePhone()
  - [ ] Unit tests for date validation
  - [ ] Integration tests for API endpoints rejecting invalid formats
  - [ ] Frontend tests for inline validation feedback
- [ ] Document format validation patterns (AC: 1-5)
  - [ ] Update README with validation rules
  - [ ] Document email regex pattern
  - [ ] Document phone normalization logic
  - [ ] Document date format requirements
  - [ ] Provide examples of valid/invalid inputs

## Gap Analysis

_This section will be populated by dev-story when gap analysis runs._

**Expected Findings:**
- Email validation: IMPLEMENTED in pocValidator.ts (POC_PATTERNS.email)
- Phone validation: IMPLEMENTED in pocValidator.ts (POC_PATTERNS.phone, accepts 3 formats)
- Phone normalization: IMPLEMENTED in normalizePhone() function
- Fax validation: IMPLEMENTED (same as phone)
- Date validation: MAY NEED VERIFICATION - search Zod schemas for date format validation
- Server-side validation: IMPLEMENTED in routes (uses pocValidator)
- Client-side validation: VERIFY React Hook Form + Zod schemas
- Inline feedback: VERIFY frontend implementation

---

## Dev Notes

### Current Implementation Status

**Existing Files (Per Codebase Analysis):**
- `src/server/validators/pocValidator.ts` - Comprehensive POC validation (296 lines)
  - Email validation: `POC_PATTERNS.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - Phone validation: `POC_PATTERNS.phone` - accepts 3 formats
  - Fax validation: `POC_PATTERNS.fax` (same as phone)
  - Phone normalization: `normalizePhone()` → `(XXX) XXX-XXXX`
  - Validation functions: `validateEmail()`, `validatePhone()`, `validateFax()`
  - Error messages: `POC_ERROR_MESSAGES` object
  - Format hints: `POC_FORMAT_HINTS` object

**Implementation Overview:**
- Server-side validation: COMPLETE (pocValidator.ts)
- Email pattern: Simplified RFC 5322 (sufficient for common cases)
- Phone pattern: Accepts `(XXX) XXX-XXXX`, `XXX-XXX-XXXX`, `XXXXXXXXXX`
- Phone normalization: Converts all formats to `(XXX) XXX-XXXX`
- Fax: Optional field, same validation as phone
- Date validation: NEEDS VERIFICATION (search Zod schemas)

**Expected Workflow:**
1. Verify existing pocValidator.ts meets all acceptance criteria
2. Search for date validation in Zod schemas (frontend)
3. Add date validation if missing
4. Verify inline validation feedback in React components
5. Run existing tests and add coverage where needed
6. Document validation patterns

### Architecture Patterns

**Validation Strategy (3-Layer Defense):**
```
Frontend Zod → API express-validator/Zod → Database CHECK constraints
```

**Server-Side Validation Pipeline:**
```typescript
// Request → express-validator → pocValidator → Service logic
router.post('/api/ndas', [
  body('relationshipPoc.email').custom((value) => {
    const error = validateEmail(value);
    if (error) throw new Error(error.message);
    return true;
  }),
  body('relationshipPoc.phone').custom((value) => {
    const error = validatePhone(value);
    if (error) throw new Error(error.message);
    return true;
  }),
  // ... more validations
], createNDAHandler);
```

**Client-Side Validation (React Hook Form + Zod):**
```typescript
const ndaFormSchema = z.object({
  relationshipPoc: z.object({
    email: z.string().regex(POC_PATTERNS.email, 'Please enter a valid email address'),
    phone: z.string().regex(POC_PATTERNS.phone, 'Please enter phone in format (XXX) XXX-XXXX'),
    fax: z.string().regex(POC_PATTERNS.fax, 'Please enter fax in format (XXX) XXX-XXXX').optional(),
  }),
  effectiveDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Please enter date in format mm/dd/yyyy'),
});
```

**Phone Normalization (Backend):**
```typescript
// Before saving to database
const normalizedPhone = normalizePhone(input.phone);
// Converts: "5551234567" → "(555) 123-4567"
// Converts: "555-123-4567" → "(555) 123-4567"
// Already normalized: "(555) 123-4567" → "(555) 123-4567"
```

### Technical Requirements

**Format Validation (FR105, FR148):**
- **FR105:** System validates email addresses (RFC 5322), phone numbers ((XXX) XXX-XXXX), dates (mm/dd/yyyy)
- **FR148:** Real-time inline validation with format hints

**Email Validation Pattern:**
- Simplified RFC 5322: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Catches most common errors (missing @, missing domain, spaces)
- Accepts: `user@example.com`, `first.last+tag@company.co.uk`
- Rejects: `user@`, `@domain.com`, `user@domain`, `user @domain.com`

**Phone Validation Pattern:**
- Pattern: `/^(?:\(\d{3}\)\s?\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{10})$/`
- Accepts 3 formats:
  1. `(555) 123-4567` (canonical format)
  2. `555-123-4567` (dashed format)
  3. `5551234567` (10 digits)
- Normalization: All formats → `(555) 123-4567`

**Date Validation Pattern:**
- Format: `mm/dd/yyyy` (US date format)
- Pattern: `/^\d{2}\/\d{2}\/\d{4}$/` (basic format check)
- Range validation:
  - Month: 1-12
  - Day: 1-31 (consider month-specific limits)
  - Year: 4 digits (e.g., 2024)
- Invalid: `2024-01-15` (ISO format), `1/1/24` (short year), `31/01/2024` (European format)

**Inline Validation Requirements:**
- Trigger: `onBlur` event (when user leaves field)
- Display: Error message inline below field
- Visual indicators:
  - Invalid: Red border + error icon + error message
  - Valid: Green checkmark (optional, subtle)
  - Format hint: Gray text below field

### Architecture Constraints

**Validation Precedence (Architecture Decision):**
- Client-side validation: User-friendly, immediate feedback
- Server-side validation: Security boundary (never trust client)
- Database constraints: Last line of defense

**Shared Validation Logic:**
- TypeScript types shared between frontend/backend
- Zod schemas can be shared (compile to both environments)
- Regex patterns exported from pocValidator.ts

**Error Message Format (Consistency):**
```typescript
{
  field: 'relationship_poc_email',  // snake_case field identifier
  message: 'Please enter a valid email address',  // User-friendly message
  hint: 'user@example.com'  // Optional format hint
}
```

### File Structure Requirements

**Backend Validators:**
- `src/server/validators/pocValidator.ts` - POC field validation (EXISTING)
- `src/server/validators/dateValidator.ts` - Date validation (MAY NEED CREATION)

**Frontend Schemas:**
- `src/client/schemas/ndaFormSchema.ts` - NDA form Zod schema (VERIFY)
- `src/client/schemas/contactFormSchema.ts` - Contact form Zod schema (VERIFY)

**Shared Validation:**
- `src/shared/validation/patterns.ts` - Shared regex patterns (CONSIDER)

**Tests:**
- `src/server/validators/__tests__/pocValidator.test.ts` (EXISTING - 180+ lines)
- `src/client/schemas/__tests__/ndaFormSchema.test.ts` (VERIFY)

### Testing Requirements

**Unit Tests (Server-Side):**
- Test `validateEmail()` with valid emails: `user@example.com`, `first.last+tag@company.co.uk`
- Test `validateEmail()` with invalid emails: `user@`, `@domain.com`, `user@domain`, `user @domain.com`
- Test `validatePhone()` with 3 formats: `(555) 123-4567`, `555-123-4567`, `5551234567`
- Test `validatePhone()` rejects 9-digit, 11-digit, non-numeric
- Test `normalizePhone()` converts all formats to `(555) 123-4567`
- Test `validateFax()` (same patterns as phone)
- Test date validation (if implemented)

**Integration Tests (API):**
- Test POST /api/ndas returns 400 for invalid email
- Test POST /api/ndas returns 400 for invalid phone
- Test POST /api/ndas returns 400 for invalid date format
- Test error response includes field name and user-friendly message
- Test valid formats are accepted

**Frontend Tests (Component):**
- Test email field shows error on blur with invalid email
- Test phone field shows error on blur with invalid phone
- Test date field shows error on blur with invalid date
- Test error messages match expected text
- Test format hints display
- Test red border on invalid fields
- Test green checkmark on valid fields

**Test Coverage Goal:**
- ≥90% coverage for pocValidator.ts (critical validation logic)
- 100% coverage for validation patterns (email, phone, date)
- Integration tests for all API endpoints with validation

### Previous Story Intelligence

**Related Prior Work:**
- Story 3.14: POC Management & Validation (implemented pocValidator.ts)
- Story 8.5: Data Validation (Required Fields) - ensures required field validation
- Epic 1-7: Form validation patterns established throughout

**Existing Validation Patterns:**
- All routes use express-validator or Zod for validation
- Services throw descriptive errors with field context
- Error handler middleware converts validation errors to 400 responses
- Frontend uses React Hook Form + Zod for real-time validation

### Project Structure Notes

**Validation Consistency:**
- All email validation uses `POC_PATTERNS.email`
- All phone validation uses `POC_PATTERNS.phone`
- All phone normalization uses `normalizePhone()`
- No duplicate validation logic (DRY principle)

**Integration Points:**
- NDA creation/edit routes: Validate all POC fields
- Contact management routes: Validate email/phone
- Filter routes: Validate date range parameters
- Frontend forms: Zod schemas mirror server-side validation

**Code Conventions:**
- Validation functions return `ValidationError | null`
- Format hints provided in `POC_FORMAT_HINTS`
- Error messages in `POC_ERROR_MESSAGES`
- All validation is case-sensitive for emails (RFC 5322)

### References

**Source Documents:**
- [Source: _bmad-output/planning-artifacts/epics-backup-20251223-155341.md#Epic-8-Story-8.6]
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation-Pipeline]
- [Source: _bmad-output/project-context.md#Testing-Rules]
- [Source: src/server/validators/pocValidator.ts - Existing implementation]

**Functional Requirements:**
- FR105: System validates email addresses (RFC 5322), phone numbers ((XXX) XXX-XXXX), dates (mm/dd/yyyy)
- FR148: Real-time inline validation

**Non-Functional Requirements:**
- NFR-V1: Client-side and server-side validation (defense in depth)
- NFR-V2: User-friendly error messages with format hints
- NFR-V3: Consistent validation across all forms

**Architecture Decisions:**
- 3-layer validation: Frontend Zod → API → Database constraints
- Shared validation patterns (TypeScript types, regex)
- Phone normalization to canonical format
- Real-time inline validation on blur

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

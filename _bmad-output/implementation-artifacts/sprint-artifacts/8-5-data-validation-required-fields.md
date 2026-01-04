# Story 8.5: Data Validation (Required Fields)

Status: ready-for-dev

## Story

As a **System Administrator and NDA User**,
I want **comprehensive required field validation enforced at all layers (frontend, backend, and database)**,
So that **incomplete or invalid NDAs are never created and data integrity is guaranteed across the entire system**.

## Acceptance Criteria

**AC1: Server-Side Required Field Validation**
**Given** a user attempts to create or update an NDA via API
**When** the request is processed by the backend
**Then** the system validates all required fields are present and non-empty:
- companyName (required, non-empty string)
- agencyGroupId (required, valid UUID reference)
- relationshipPocId (required, valid contact ID)
- abbreviatedName (required, non-empty string)
- authorizedPurpose (required, non-empty string, max 255 characters)
**And** validation errors return HTTP 400 with specific field-level error messages
**And** validation occurs BEFORE any database operations
**And** partial updates do not bypass required field validation

**AC2: Database-Level NOT NULL Constraints**
**Given** the Prisma schema defines required fields
**When** data is written to the database
**Then** PostgreSQL enforces NOT NULL constraints on:
- company_name
- agency_group_id
- subagency_id
- relationship_poc_id
- abbreviated_name
- authorized_purpose
- status (defaults to Created)
- created_by_id
**And** constraint violations are caught and reported with user-friendly messages
**And** database layer provides final safety net against missing required data

**AC3: POC Required Field Validation**
**Given** a user assigns Points of Contact to an NDA
**When** the NDA is created or updated
**Then** Opportunity POC validation enforces:
- opportunityPocId must be a valid internal user ID
- Defaults to current user if not provided
**And** Relationship POC validation enforces:
- relationshipPocId is required (non-empty)
- Must reference valid contact in database
**And** Contracts POC and Contacts POC are optional
**And** POC validator (pocValidator.ts) is used for all POC validation

**AC4: Multi-Layer Validation Error Handling**
**Given** validation fails at any layer
**When** the error is returned to the user
**Then** error response includes:
- HTTP 400 status code
- Array of field-level errors with field name and message
- User-friendly error messages (not database error codes)
**And** frontend displays inline validation errors next to affected fields
**And** validation errors do NOT trigger Sentry alerts (expected user errors)
**And** all validation is consistent between create and update operations

**AC5: Validation Test Coverage**
**Given** comprehensive test suites exist for NDA operations
**When** tests run for ndaService and NDA routes
**Then** tests verify:
- Required fields cannot be omitted (400 error returned)
- Empty strings are rejected for required fields
- Null/undefined values are rejected for required fields
- Valid minimal NDA can be created with only required fields
- Update operations respect required field validation
**And** test coverage for validation logic ≥90%

## Tasks / Subtasks

⚠️ **DRAFT TASKS** - Generated from requirements analysis. Will be validated and refined against actual codebase when dev-story runs.

- [ ] Review and document existing validation in ndaService.ts (AC: 1-5)
  - [ ] Analyze createNDA() function validation logic
  - [ ] Analyze updateNDA() function validation logic
  - [ ] Verify CreateNdaInput interface matches required field requirements
  - [ ] Check if validation happens before database operations
  - [ ] Document any gaps in current required field validation
- [ ] Verify Prisma schema NOT NULL constraints (AC: 2)
  - [ ] Review prisma/schema.prisma for NDA model field definitions
  - [ ] Confirm all required fields have proper @db annotations
  - [ ] Verify foreign key fields (agencyGroupId, subagencyId, POC IDs) are non-nullable where required
  - [ ] Check if database migrations include NOT NULL constraints
  - [ ] Test constraint violations return appropriate errors
- [ ] Review POC validation implementation (AC: 3)
  - [ ] Verify pocValidator.ts is used in NDA create/update flows
  - [ ] Check validateOpportunityPoc() enforces required ID
  - [ ] Confirm Relationship POC is validated as required
  - [ ] Ensure optional POCs (Contracts, Contacts) don't block creation
  - [ ] Test POC validation with missing/invalid IDs
- [ ] Validate error handling and response format (AC: 4)
  - [ ] Review Express error handler for validation errors
  - [ ] Confirm HTTP 400 status code used for validation failures
  - [ ] Check error response structure matches API conventions
  - [ ] Verify user-friendly error messages (not raw Prisma errors)
  - [ ] Test that validation errors don't trigger Sentry (use error level filtering)
- [ ] Add or enhance validation tests (AC: 5)
  - [ ] Unit tests: ndaService.createNDA() with missing required fields
  - [ ] Unit tests: ndaService.updateNDA() respects required field validation
  - [ ] Integration tests: POST /api/ndas with missing fields returns 400
  - [ ] Integration tests: PUT /api/ndas/:id validates required fields
  - [ ] Test coverage: Verify ≥90% coverage for validation code paths
  - [ ] Edge case tests: Empty strings, whitespace-only values, null vs undefined
- [ ] Document validation patterns and requirements (AC: 1-5)
  - [ ] Update API documentation with required field list
  - [ ] Document validation error response format
  - [ ] Provide examples of valid minimal NDA creation request
  - [ ] Document POC validation rules and requirements
  - [ ] Update developer guide with validation best practices
- [ ] Harden validation edge cases (AC: 1, 4)
  - [ ] Test and handle whitespace-only strings (should be rejected)
  - [ ] Verify trim() is applied before validation where appropriate
  - [ ] Handle unicode/special characters in required text fields
  - [ ] Test concurrent create/update operations don't bypass validation
  - [ ] Verify PATCH vs PUT semantics for partial updates
- [ ] Frontend validation alignment (AC: 4)
  - [ ] Review frontend Zod schemas match backend required fields
  - [ ] Confirm React Hook Form integration validates before submission
  - [ ] Check inline error display for validation failures
  - [ ] Test form submission blocked until all required fields valid
  - [ ] Verify frontend and backend validation messages are consistent

## Gap Analysis

_This section will be populated by dev-story when gap analysis runs._

**Note:** Based on existing ndaService.ts CreateNdaInput interface and pocValidator.ts, required field validation appears partially implemented. Gap analysis will verify completeness against all 5 acceptance criteria and identify any missing validation checks, test coverage gaps, or error handling improvements needed.

---

## Dev Notes

### Current Implementation Status

**Existing Files (Per Code Review):**
- `src/server/services/ndaService.ts` - NDA CRUD service with CreateNdaInput interface (1200+ lines)
- `src/server/routes/ndas.ts` - NDA API routes with Express handlers (600+ lines)
- `src/server/validators/pocValidator.ts` - POC validation utilities (296 lines, fully implemented)
- `src/server/middleware/errorHandler.ts` - Global Express error handler (83 lines)
- `prisma/schema.prisma` - Database schema with NDA model definition
- Tests: `src/server/services/__tests__/ndaService.test.ts`, `src/server/routes/__tests__/ndas.test.ts`

**Implementation Overview:**
- CreateNdaInput interface defines required vs optional fields
- POC validator provides validateNdaPocs(), validateOpportunityPoc(), validateRelationshipPoc()
- Prisma schema uses optional (?) and required field declarations
- Express error handler catches validation failures and returns HTTP 400
- Frontend uses React Hook Form + Zod schemas for client-side validation

**Expected Workflow:**
1. Verify ndaService.createNDA() validates all required fields from CreateNdaInput
2. Confirm Prisma schema NOT NULL constraints match business rules
3. Test pocValidator integration in NDA create/update flows
4. Validate error responses match API conventions (HTTP 400 with field errors)
5. Add test coverage for missing required field scenarios
6. Document validation rules and error response format

### Architecture Patterns

**Data Validation Pipeline (Architecture Requirement):**
```
Frontend: Zod schema validation → API call → Backend: Express-validator → Service layer validation → Database: NOT NULL constraints
```

**Three Layers of Defense:**
1. **Frontend:** React Hook Form + Zod schemas (immediate user feedback)
2. **Backend:** Service layer validation (security - never trust client)
3. **Database:** PostgreSQL NOT NULL constraints (final safety net)

**Validation Error Flow:**
```typescript
// Service throws validation error
if (!data.companyName?.trim()) {
  throw new NdaServiceError('Company Name is required', 'VALIDATION_ERROR');
}

// Express error handler catches
app.use((err, req, res, next) => {
  if (err.code === 'VALIDATION_ERROR') {
    return res.status(400).json({
      error: err.message,
      field: err.field // optional field-specific error
    });
  }
  // ... other error handling
});
```

**Row-Level Security Integration:**
- Validation happens BEFORE agency scope filtering
- Required fields checked before querying user's authorized agencies
- Prevents unnecessary database queries for invalid requests

### Technical Requirements

**Required Field Validation (FR104, FR147):**
- **FR104:** System validates all required fields before allowing NDA creation or update
- **FR147:** Form validation prevents submission of incomplete data (frontend + backend)

**CreateNdaInput Required Fields:**
1. `companyName: string` - Company legal name (non-empty)
2. `agencyGroupId: string` - Valid agency group UUID reference
3. `relationshipPocId: string` - Valid contact ID (external POC)
4. `abbreviatedName: string` - Short company reference (non-empty)
5. `authorizedPurpose: string` - NDA purpose description (non-empty, max 255 chars)

**Conditionally Required Fields:**
- `subagencyId: string` - Required if agency group has subagencies (enforced by business logic)
- `opportunityPocId: string` - Defaults to current user if not provided (createNDA logic)

**Optional Fields (NOT validated as required):**
- `companyCity, companyState, stateOfIncorporation` - Company details
- `agencyOfficeName` - Optional agency office identifier
- `ndaType: NdaType` - Defaults to MutualNDA if not provided
- `effectiveDate: Date` - Can be set later, not required at creation
- `usMaxPosition: UsMaxPosition` - Defaults based on business rules
- `isNonUsMax: boolean` - Defaults to false
- `contractsPocId, contactsPocId` - Optional POCs
- `rtfTemplateId` - Optional template selection

**POC Validation Rules (pocValidator.ts):**
- **Opportunity POC:** Must be internal user ID (validated against Contact.isInternal = true)
- **Relationship POC:** Required, must be valid contact ID (can be internal or external)
- **Contracts POC:** Optional, format validation only if provided
- **Contacts POC:** Optional, format validation only if provided

### Architecture Constraints

**Validation Strategy (Architecture Decision):**
- **Defense in Depth:** Frontend validation for UX, backend validation for security, database constraints for data integrity
- **Fail Fast:** Validate early in request pipeline (before expensive operations)
- **User-Friendly Errors:** Return specific field-level errors, not generic "validation failed" messages
- **Consistent Error Format:** All validation errors return HTTP 400 with structured error response

**Error Response Format (API Convention):**
```json
{
  "error": "Validation failed",
  "details": [
    { "field": "companyName", "message": "Company Name is required" },
    { "field": "authorizedPurpose", "message": "Authorized Purpose is required" }
  ]
}
```

**Prisma Schema Constraints:**
```prisma
model Nda {
  id                String      @id @default(uuid())
  companyName       String      @db.VarChar(255) // NOT NULL
  abbreviatedName   String      @db.VarChar(100) // NOT NULL
  authorizedPurpose String      @db.VarChar(255) // NOT NULL
  agencyGroupId     String      // NOT NULL, FK
  subagencyId       String      // NOT NULL, FK
  relationshipPocId String      // NOT NULL, FK
  opportunityPocId  String?     // NULLABLE (defaults to current user)
  contractsPocId    String?     // NULLABLE
  contactsPocId     String?     // NULLABLE
  status            NdaStatus   @default(Created) // NOT NULL
  createdById       String      // NOT NULL, FK
  // ... other fields
}
```

**Testing Strategy:**
- **Unit Tests:** Service layer validation logic (ndaService.test.ts)
- **Integration Tests:** API endpoint validation (ndas.test.ts)
- **Database Tests:** Constraint violations return proper errors
- **Edge Cases:** Whitespace-only strings, null vs undefined, empty arrays

### File Structure Requirements

**Backend Services:**
- `src/server/services/ndaService.ts` - CreateNDA and UpdateNDA validation (EXISTING)
- `src/server/validators/pocValidator.ts` - POC-specific validation (EXISTING)
- `src/server/middleware/errorHandler.ts` - Validation error handling (EXISTING)

**Database:**
- `prisma/schema.prisma` - NDA model with NOT NULL constraints (EXISTING)
- `prisma/migrations/` - Migration files with constraint definitions (EXISTING)

**Tests:**
- `src/server/services/__tests__/ndaService.test.ts` - Service validation tests (EXISTING, may need enhancement)
- `src/server/routes/__tests__/ndas.test.ts` - API endpoint validation tests (EXISTING, may need enhancement)
- `src/server/validators/__tests__/pocValidator.test.ts` - POC validation tests (EXISTING)

**Frontend (Reference Only - Story Focuses on Backend):**
- `src/client/components/screens/NDAForm.tsx` - Zod schema validation (EXISTING)
- `src/client/hooks/useNDAForm.ts` - React Hook Form integration (EXISTING)

### Testing Requirements

**Unit Tests (ndaService.test.ts):**
- Test createNDA() throws error when companyName is missing
- Test createNDA() throws error when companyName is empty string
- Test createNDA() throws error when companyName is whitespace-only
- Test createNDA() throws error when agencyGroupId is missing
- Test createNDA() throws error when agencyGroupId is invalid UUID
- Test createNDA() throws error when relationshipPocId is missing
- Test createNDA() throws error when abbreviatedName is missing
- Test createNDA() throws error when authorizedPurpose is missing
- Test createNDA() throws error when authorizedPurpose exceeds 255 characters
- Test createNDA() succeeds with only required fields (minimal valid NDA)
- Test updateNDA() validates required fields cannot be set to null/empty
- Test opportunityPocId defaults to current user when not provided

**Integration Tests (ndas.test.ts):**
- Test POST /api/ndas returns 400 when companyName missing
- Test POST /api/ndas returns 400 when agencyGroupId missing
- Test POST /api/ndas returns 400 when relationshipPocId missing
- Test POST /api/ndas returns 400 when abbreviatedName missing
- Test POST /api/ndas returns 400 when authorizedPurpose missing
- Test POST /api/ndas returns 201 with only required fields
- Test PUT /api/ndas/:id returns 400 when removing required fields
- Test error response includes field-level details
- Test validation errors return HTTP 400 (not 500)

**POC Validation Tests (pocValidator.test.ts):**
- Test validateOpportunityPoc() rejects empty/missing POC ID (EXISTING)
- Test validateRelationshipPoc() rejects missing name/email (EXISTING)
- Test validateNdaPocs() combines all POC validation (EXISTING)
- Test optional POCs (Contracts, Contacts) don't block creation (EXISTING)

**Database Constraint Tests:**
- Test Prisma throws error when creating NDA with null companyName
- Test constraint violation returns user-friendly error (not raw SQL)
- Test transaction rollback on constraint violation

**Test Coverage Goal:**
- ≥90% coverage for validation code paths in ndaService.ts
- ≥90% coverage for pocValidator.ts (already exists)
- 100% coverage for required field validation logic
- All edge cases covered (whitespace, null, undefined, empty string)

### Previous Story Intelligence

**Related Epic 8 Stories:**
- Story 8.1 (Error Monitoring): Validation errors should NOT trigger Sentry (use error level filtering)
- Story 8.4 (Failsafe Logging): Validation failures logged to audit_log for tracking
- Story 8.6 (Format Validation): Works together with required field validation (this story)

**Prior Work from Epic 1-7:**
- Epic 3 (NDA Lifecycle): CreateNdaInput interface established in Story 3.1
- Story 3.14 (POC Management): pocValidator.ts fully implemented with comprehensive tests
- Epic 6 (Audit): All NDA mutations logged to audit_log (includes validation failures)
- Story 10.1-10.3 (Customer Feedback): Added usMaxPosition, ndaType fields (now required/optional)

### Project Structure Notes

**Existing Validation Patterns:**
- POC validation uses dedicated validator module (pocValidator.ts)
- Service layer throws NdaServiceError for business logic validation
- Express error handler converts service errors to HTTP responses
- Prisma schema constraints provide database-level safety net

**Integration Points:**
- ndaService.createNDA() calls pocValidator.validateNdaPocs()
- Express routes use try/catch to pass errors to errorHandler middleware
- Frontend Zod schemas mirror backend CreateNdaInput interface
- Audit logging captures validation failures for compliance tracking

**Code Conventions:**
- Validation errors use HTTP 400 status code
- Service layer throws descriptive errors with error codes
- Error messages are user-friendly (not technical database errors)
- Trim whitespace before validating text fields
- Use TypeScript strict mode for compile-time field requirement checks

### References

**Source Documents:**
- [Source: _bmad-output/planning-artifacts/epics-backup-20251223-155341.md#Epic-8-Story-8.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Validation-Pipeline]
- [Source: _bmad-output/project-context.md#Validation-Rules]
- [Source: src/server/validators/pocValidator.ts - Existing validation implementation]
- [Source: src/server/services/ndaService.ts - CreateNdaInput interface]

**Functional Requirements:**
- FR104: System validates all required fields before allowing NDA creation or update
- FR147: Form validation prevents submission of incomplete data (three-layer defense)

**Non-Functional Requirements:**
- NFR-S1: Defense in depth - validate at frontend, backend, and database layers
- NFR-M1: User-friendly error messages guide users to fix validation issues
- NFR-T1: Comprehensive test coverage (≥90%) for validation logic

**Architecture Decisions:**
- Three-layer validation strategy (Frontend → Backend → Database)
- Fail-fast approach (validate early in request pipeline)
- Consistent error format across all validation failures
- POC validation in dedicated module for reusability

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

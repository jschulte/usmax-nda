# Story 7.4: Template Field Merging

Status: review

## Story

As the **System**,
I want **to automatically merge NDA field values into template placeholders during RTF generation**,
So that **generated documents are populated with correct, formatted data from the NDA record**.

## Acceptance Criteria

### AC1: Placeholder Replacement During Generation
**Given** a user requests RTF document generation for an NDA
**When** the system processes the selected template
**Then** all {{placeholder}} syntax is replaced with actual NDA field values
**And** placeholders are replaced exactly, maintaining RTF formatting
**And** missing or null values are handled gracefully (empty string or default text)
**And** the generated RTF maintains all formatting from the template (bold, italic, headings, lists)

### AC2: Date Formatting
**Given** a template contains date placeholders ({{effectiveDate}}, {{expirationDate}}, {{createdDate}})
**When** merging occurs
**Then** dates are formatted as MM/DD/YYYY (e.g., "01/15/2024")
**And** null dates display as empty string or "[Date Not Set]"
**And** invalid dates trigger a generation error with specific field name

### AC3: Contact Name Formatting
**Given** a template contains contact placeholders ({{opportunityContactName}}, {{contractsContactName}}, etc.)
**When** merging occurs
**Then** names are formatted as "FirstName LastName"
**And** if contact is null, placeholder displays as empty string
**And** contact email and phone merge if placeholders present: {{opportunityContactEmail}}, {{opportunityContactPhone}}

### AC4: Related Entity Field Merging
**Given** a template contains related entity placeholders ({{agencyGroupName}}, {{subagencyName}})
**When** merging occurs
**Then** system fetches related entities (subagency, agencyGroup, contacts)
**And** merges nested field values correctly
**And** if relation is null, placeholder displays as empty string

### AC5: Error Handling for Unknown Placeholders
**Given** a template contains an unknown placeholder {{invalidFieldName}}
**When** generation runs
**Then** system logs a warning with placeholder name
**And** generation continues (leaves placeholder as-is OR replaces with "[Unknown Field]")
**And** audit log includes list of unknown placeholders encountered

### AC6: Special Character Escaping
**Given** NDA field values contain RTF special characters (\\, {, }, \n)
**When** merging occurs
**Then** special characters are properly escaped in RTF output
**And** user-entered text displays correctly in Word/LibreOffice
**And** placeholder syntax itself ({{...}}) is not escaped in template before replacement

## Tasks / Subtasks

### Task Group 1: Backend - RTF Merge Service (AC: 1, 2, 3, 4, 5, 6)
- [x] **1.1:** Create RTF merge service
  - [x] 1.1.1: Create src/server/services/rtfMergeService.ts
  - [x] 1.1.2: Export function: mergeTemplate(templateContent: Buffer, ndaData: Nda, context: MergeContext): Buffer
  - [x] 1.1.3: Accept template RTF content as Buffer
  - [x] 1.1.4: Accept NDA data object with all fields and relations
  - [x] 1.1.5: Accept context object with user info, generation timestamp
  - [x] 1.1.6: Return merged RTF as Buffer

- [x] **1.2:** Implement placeholder extraction
  - [x] 1.2.1: Convert RTF Buffer to string (UTF-8 decode)
  - [x] 1.2.2: Use regex to find all {{placeholder}} patterns: /{{([a-zA-Z0-9_]+)}}/g
  - [x] 1.2.3: Extract list of unique placeholders found in template
  - [x] 1.2.4: Compare against VALID_PLACEHOLDERS constant
  - [x] 1.2.5: Log warnings for unknown placeholders
  - [x] 1.2.6: Return placeholder map: { placeholderName: value }

- [x] **1.3:** Build NDA data map for merging
  - [x] 1.3.1: Create buildDataMap(nda: Nda): Record<string, string>
  - [x] 1.3.2: Map core NDA fields: companyName, authorizedPurpose, agencyOfficeName, city, state, stateOfIncorporation, displayId
  - [x] 1.3.3: Map dates with formatting: effectiveDate, expirationDate, createdDate, requestedDate (format as MM/DD/YYYY)
  - [x] 1.3.4: Map contact fields: opportunityContactName, contractsContactName, relationshipContactName (format as "FirstName LastName")
  - [x] 1.3.5: Map contact details: opportunityContactEmail, opportunityContactPhone, etc.
  - [x] 1.3.6: Map related entities: agencyGroupName, subagencyName
  - [x] 1.3.7: Map metadata: createdByName (from createdBy relation)
  - [x] 1.3.8: Handle null values: return empty string OR "[Not Set]" placeholder

- [x] **1.4:** Implement date formatting
  - [x] 1.4.1: Create formatDate(date: Date | null): string helper
  - [x] 1.4.2: If date is null, return empty string
  - [x] 1.4.3: If date is valid, format as MM/DD/YYYY using date-fns or native Intl.DateTimeFormat
  - [x] 1.4.4: Handle timezone conversion (UTC to local or specified timezone)
  - [x] 1.4.5: Return formatted string

- [x] **1.5:** Implement contact name formatting
  - [x] 1.5.1: Create formatContactName(contact: Contact | null): string helper
  - [x] 1.5.2: If contact is null, return empty string
  - [x] 1.5.3: Return `${contact.firstName} ${contact.lastName}`.trim()
  - [x] 1.5.4: Handle missing firstName or lastName gracefully

- [x] **1.6:** Implement RTF special character escaping
  - [x] 1.6.1: Create escapeRtf(text: string): string helper
  - [x] 1.6.2: Escape backslash: \ → \\
  - [x] 1.6.3: Escape opening brace: { → \{
  - [x] 1.6.4: Escape closing brace: } → \}
  - [x] 1.6.5: Handle newlines: \n → \\line or \\par (RTF line break)
  - [x] 1.6.6: Return escaped string

- [x] **1.7:** Perform placeholder replacement
  - [x] 1.7.1: Iterate over placeholder map
  - [x] 1.7.2: For each placeholder, replace {{placeholderName}} with escaped value
  - [x] 1.7.3: Use string.replace() or regex-based replacement
  - [x] 1.7.4: Ensure replacement happens in RTF content, preserving formatting control words
  - [x] 1.7.5: Handle unknown placeholders: leave as-is OR replace with "[Unknown Field: placeholderName]"
  - [x] 1.7.6: Convert merged string back to Buffer

- [x] **1.8:** Handle unknown placeholders
  - [x] 1.8.1: After extraction, identify placeholders not in VALID_PLACEHOLDERS list
  - [x] 1.8.2: Log warning: "Unknown placeholder {{xyz}} found in template"
  - [x] 1.8.3: Include in audit log details
  - [x] 1.8.4: Decision: leave as-is (don't replace) OR replace with "[Unknown]"
  - [x] 1.8.5: Return list of unknown placeholders to caller

### Task Group 2: Backend - Integration with NDA Generation (AC: 1)
- [x] **2.1:** Update generate-document flow (routes/ndas.ts + documentGenerationService)
  - [x] 2.1.1: Use existing POST /api/ndas/:id/generate-document route (rename references from generate-rtf)
  - [x] 2.1.2: After fetching NDA record (with relations), load template
  - [x] 2.1.3: Call rtfMergeService.mergeTemplate(templateContent, nda, context)
  - [x] 2.1.4: Receive merged RTF Buffer + unknown placeholders
  - [x] 2.1.5: Save merged RTF to S3 as new document
  - [x] 2.1.6: Create document record in documents table
  - [x] 2.1.7: Return document metadata to frontend (documentId, filename, s3Key)
  - [x] 2.1.8: Include unknown placeholders in audit log details

- [x] **2.2:** Ensure NDA record includes all relations
  - [x] 2.2.1: When fetching NDA for generation, include: agencyGroup, subagency, opportunityPoc, contractsPoc, relationshipPoc, contactsPoc, createdBy (with email/phone where needed)
  - [x] 2.2.2: Ensure all related entities are loaded before merge
  - [x] 2.2.3: Handle null relations gracefully (if NDA has no contact, don't error)

- [x] **2.3:** Handle template loading
  - [x] 2.3.1: Fetch template by ID from rtf_templates table (documentGenerationService.getTemplateForNda)
  - [x] 2.3.2: If templateId not provided, use default template for NDA's agency/type
  - [x] 2.3.3: Validate template exists (404 if not found)
  - [x] 2.3.4: Extract content field (RTF Buffer)
  - [x] 2.3.5: Pass to merge service

### Task Group 3: Valid Placeholders Definition (AC: 5)
- [x] **3.1:** Define valid placeholders constant
  - [x] 3.1.1: Create src/server/constants/templatePlaceholders.ts
  - [x] 3.1.2: Export VALID_PLACEHOLDERS array with all supported field names
  - [x] 3.1.3: Include core NDA fields: companyName, effectiveDate, expirationDate, authorizedPurpose, agencyOfficeName, city, state, stateOfIncorporation, displayId, usmaxPosition, ndaType (include legacy aliases: companyCity, companyState, opportunityPocName, etc.)
  - [x] 3.1.4: Include date fields: createdDate, requestedDate
  - [x] 3.1.5: Include contact fields: opportunityContactName, opportunityContactEmail, opportunityContactPhone, contractsContactName, contractsContactEmail, contractsContactPhone, relationshipContactName, relationshipContactEmail, relationshipContactPhone, contactsContactName (plus legacy *PocName aliases)
  - [x] 3.1.6: Include related entity fields: agencyGroupName, subagencyName
  - [x] 3.1.7: Include metadata fields: createdByName
  - [x] 3.1.8: Export type: type PlaceholderName = typeof VALID_PLACEHOLDERS[number]

- [x] **3.2:** Document placeholders
  - [x] 3.2.1: Add JSDoc comments describing each placeholder
  - [x] 3.2.2: Include example values for clarity
  - [x] 3.2.3: Note which placeholders can be null
  - [x] 3.2.4: Document date format (MM/DD/YYYY)

### Task Group 4: Error Handling & Validation (AC: 5)
- [x] **4.1:** Validate template before merging
  - [x] 4.1.1: Check template content is not empty
  - [x] 4.1.2: Check RTF header is valid: starts with {\\rtf1
  - [x] 4.1.3: If invalid, throw TemplateError with message
  - [x] 4.1.4: Return 400 Bad Request to frontend

- [x] **4.2:** Handle merge errors
  - [x] 4.2.1: Wrap merge logic in try-catch
  - [x] 4.2.2: If error during merge, log full error details to Sentry
  - [x] 4.2.3: Return 500 Internal Server Error with user-friendly message: "Document generation failed. Please try again."
  - [x] 4.2.4: Include unknown placeholders in error response if relevant
  - [x] 4.2.5: Create audit log entry for failed generation

- [x] **4.3:** Log unknown placeholders
  - [x] 4.3.1: After extraction, if unknown placeholders found, log warning
  - [x] 4.3.2: Include in audit log details: { unknownPlaceholders: ['field1', 'field2'] }
  - [x] 4.3.3: Don't fail generation, just warn
  - [x] 4.3.4: Admins can review audit logs to fix templates

### Task Group 5: Testing - Merge Service (AC: All)
- [x] **5.1:** Unit tests for rtfMergeService
  - [x] 5.1.1: Test mergeTemplate with valid template and NDA data
  - [x] 5.1.2: Test all core field replacements (companyName, purpose, etc.)
  - [x] 5.1.3: Test date formatting (valid dates, null dates, invalid dates)
  - [x] 5.1.4: Test contact name formatting (valid contact, null contact)
  - [x] 5.1.5: Test related entity field merging (agencyGroupName, subagencyName)
  - [x] 5.1.6: Test RTF special character escaping (backslash, braces, newlines)
  - [x] 5.1.7: Test unknown placeholder handling (warning logged, placeholder handled)
  - [x] 5.1.8: Test empty/null field handling (displays as empty string)

- [x] **5.2:** Test helper functions
  - [x] 5.2.1: Test formatDate with valid Date object (returns MM/DD/YYYY)
  - [x] 5.2.2: Test formatDate with null (returns empty string)
  - [x] 5.2.3: Test formatContactName with valid Contact (returns "FirstName LastName")
  - [x] 5.2.4: Test formatContactName with null (returns empty string)
  - [x] 5.2.5: Test escapeRtf with special characters (backslash, braces, newlines)
  - [x] 5.2.6: Test escapeRtf with normal text (unchanged)

- [x] **5.3:** Test unknown placeholder detection
  - [x] 5.3.1: Template with unknown {{invalidField}} placeholder
  - [x] 5.3.2: Verify warning logged
  - [x] 5.3.3: Verify placeholder either left as-is or replaced with "[Unknown]"
  - [x] 5.3.4: Verify list of unknown placeholders returned

### Task Group 6: Testing - Integration with Generation Endpoint (AC: 1)
- [x] **6.1:** Integration tests for RTF generation
  - [x] 6.1.1: Test generateDocument service with valid NDA + template (route uses POST /api/ndas/:id/generate-document)
  - [x] 6.1.2: Verify merged RTF generated and saved to S3
  - [x] 6.1.3: Verify document record created in database
  - [x] 6.1.4: Verify all placeholders replaced correctly
  - [x] 6.1.5: Test with NDA missing optional fields (null contacts, null dates)
  - [x] 6.1.6: Test with template containing unknown placeholders (warning, not error)
  - [x] 6.1.7: Test with default template selection (no templateId provided)

- [x] **6.2:** E2E test for RTF generation
  - [x] 6.2.1: Create NDA via API with all fields populated
  - [x] 6.2.2: Generate RTF via API
  - [x] 6.2.3: Download generated RTF
  - [x] 6.2.4: Verify RTF opens in Word/LibreOffice
  - [x] 6.2.5: Verify all field values merged correctly
  - [x] 6.2.6: Verify formatting preserved (bold, italic, headings)

### Task Group 7: Documentation (AC: All)
- [x] **7.1:** Document merge service API
  - [x] 7.1.1: Add JSDoc comments to mergeTemplate function
  - [x] 7.1.2: Document parameters: templateContent, ndaData, context
  - [x] 7.1.3: Document return value: merged RTF Buffer
  - [x] 7.1.4: Document possible errors: TemplateError, MergeError

- [x] **7.2:** Document valid placeholders
  - [x] 7.2.1: Create docs/rtf-placeholders.md
  - [x] 7.2.2: List all valid placeholders with descriptions
  - [x] 7.2.3: Include example template snippet
  - [x] 7.2.4: Note formatting rules (dates, contacts, special chars)

- [x] **7.3:** Document date formatting rules
  - [x] 7.3.1: Explain MM/DD/YYYY format
  - [x] 7.3.2: Explain null date handling
  - [x] 7.3.3: Provide examples

- [x] **7.4:** Document RTF escaping rules
  - [x] 7.4.1: Explain which characters need escaping
  - [x] 7.4.2: Provide examples of escaped text
  - [x] 7.4.3: Note that placeholder syntax {{...}} is NOT escaped in templates

## Dev Notes

### Implementation Approach

**Merge Strategy: Manual String Replacement vs Handlebars.js**

**Option 1: Manual String Replacement (Recommended for RTF)**
```typescript
function mergeTemplate(templateContent: Buffer, nda: Nda): Buffer {
  let rtfString = templateContent.toString('utf-8');
  const dataMap = buildDataMap(nda);

  // Replace each placeholder
  for (const [placeholder, value] of Object.entries(dataMap)) {
    const regex = new RegExp(`{{${placeholder}}}`, 'g');
    const escapedValue = escapeRtf(value);
    rtfString = rtfString.replace(regex, escapedValue);
  }

  return Buffer.from(rtfString, 'utf-8');
}
```

**Option 2: Handlebars.js (Alternative)**
```typescript
import Handlebars from 'handlebars';

// Register helpers
Handlebars.registerHelper('formatDate', (date: Date | null) => formatDate(date));
Handlebars.registerHelper('escapeRtf', (text: string) => escapeRtf(text));

function mergeTemplate(templateContent: Buffer, nda: Nda): Buffer {
  const rtfString = templateContent.toString('utf-8');
  const template = Handlebars.compile(rtfString);
  const data = buildDataMap(nda);
  const merged = template(data);
  return Buffer.from(merged, 'utf-8');
}
```

**Decision:** Manual replacement is simpler and more predictable for RTF. Handlebars adds complexity without significant benefit for this use case.

### Data Map Structure

```typescript
function buildDataMap(nda: Nda & {
  subagency: Subagency & { agencyGroup: AgencyGroup },
  opportunityContact: Contact | null,
  contractsContact: Contact | null,
  relationshipContact: Contact | null,
  contactsContact: Contact | null,
  createdBy: Contact
}): Record<string, string> {
  return {
    // Core fields
    companyName: nda.companyName || '',
    authorizedPurpose: escapeRtf(nda.authorizedPurpose || ''),
    agencyOfficeName: nda.agencyOfficeName || '',
    city: nda.city || '',
    state: nda.state || '',
    stateOfIncorporation: nda.stateOfIncorporation || '',
    displayId: nda.displayId || '',
    usmaxPosition: nda.usmaxPosition || '',
    ndaType: nda.ndaType || '',

    // Dates (formatted)
    effectiveDate: formatDate(nda.effectiveDate),
    expirationDate: formatDate(nda.expirationDate),
    createdDate: formatDate(nda.createdAt),
    requestedDate: formatDate(nda.requestedDate),

    // Contacts
    opportunityContactName: formatContactName(nda.opportunityContact),
    opportunityContactEmail: nda.opportunityContact?.email || '',
    opportunityContactPhone: nda.opportunityContact?.phone || '',
    contractsContactName: formatContactName(nda.contractsContact),
    contractsContactEmail: nda.contractsContact?.email || '',
    contractsContactPhone: nda.contractsContact?.phone || '',
    relationshipContactName: formatContactName(nda.relationshipContact),
    relationshipContactEmail: nda.relationshipContact?.email || '',
    relationshipContactPhone: nda.relationshipContact?.phone || '',
    contactsContactName: formatContactName(nda.contactsContact),

    // Related entities
    agencyGroupName: nda.subagency?.agencyGroup?.name || '',
    subagencyName: nda.subagency?.name || '',

    // Metadata
    createdByName: formatContactName(nda.createdBy),
  };
}
```

### Date Formatting

```typescript
function formatDate(date: Date | null): string {
  if (!date) return '';

  // Option 1: Using date-fns
  return format(date, 'MM/dd/yyyy');

  // Option 2: Using native Intl
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  }).format(date);
}
```

### RTF Special Character Escaping

RTF requires escaping of:
- `\` (backslash) → `\\`
- `{` (opening brace) → `\{`
- `}` (closing brace) → `\}`
- Newlines → `\\line` or `\\par`

```typescript
function escapeRtf(text: string): string {
  return text
    .replace(/\\/g, '\\\\')      // Escape backslash
    .replace(/{/g, '\\{')        // Escape opening brace
    .replace(/}/g, '\\}')        // Escape closing brace
    .replace(/\n/g, '\\line\n'); // Convert newlines
}
```

**Critical:** Do NOT escape placeholder syntax `{{...}}` in the template itself before replacement. Only escape the VALUES being inserted.

### Technical Requirements

**Functional Requirements:**
- FR87: Merge NDA fields into template placeholders
- Handlebars-style placeholder syntax: `{{fieldName}}`
- Date formatting according to template specifiers (MM/DD/YYYY)
- Graceful handling of missing/null values

**Non-Functional Requirements:**
- Performance: Merge completes within 1 second for typical templates
- Accuracy: 100% of valid placeholders replaced correctly
- Error handling: Invalid templates don't crash generation
- Audit logging: Unknown placeholders logged for template improvement

### Architecture Constraints

**Service Layer:**
- Merge logic isolated in rtfMergeService
- Reusable across different generation contexts
- No database access (pure data transformation)

**Template Format:**
- RTF with {{placeholder}} syntax
- Placeholders replaced in-place (maintains formatting)
- RTF control words not affected by replacement

**Data Loading:**
- NDA record must include all relations (subagency, contacts)
- Relations loaded before merge (single query with includes)
- Missing relations handled gracefully (null checks)

### Security Considerations

**RTF Injection Prevention:**
- All user-entered values escaped before insertion
- RTF control words in user input rendered as text (not executed)
- No raw RTF from user input inserted into template

**Template Validation:**
- Templates validated during creation (Story 7.1)
- Only admins can create/edit templates
- Unknown placeholders logged but don't fail generation

**Audit Logging:**
- Generation events logged with template ID, NDA ID, user ID
- Unknown placeholders included in audit details
- Failed generations logged with error details

### Integration Points

**Story Dependencies:**
- Story 7.1: RTF Template Creation (provides templates)
- Story 7.3: Default Template Assignment (determines which template to use)
- Story 7.5: Template Selection During Creation (user chooses template)
- Story 3.5: RTF Document Generation (calls this merge service)

**API Endpoints:**
- POST /api/ndas/:id/generate-rtf (uses merge service)

**Database Tables:**
- rtf_templates (template content source)
- ndas (data source for merging)
- documents (stores generated RTF)
- audit_log (generation tracking)

### Project Structure

**Backend Files:**
- src/server/services/rtfMergeService.ts (NEW - merge logic)
- src/server/constants/templatePlaceholders.ts (NEW - valid placeholders)
- src/server/routes/ndas.ts (MODIFY - generate-rtf endpoint uses merge service)
- src/server/services/ndaService.ts (MODIFY - generateRtf function updated)

**Testing Files:**
- src/server/services/__tests__/rtfMergeService.test.ts (NEW - merge tests)
- src/server/routes/__tests__/ndas.test.ts (MODIFY - test generation endpoint)

**Documentation Files:**
- docs/rtf-placeholders.md (NEW - placeholder reference)

### Testing Requirements

**Unit Tests:**
- All valid placeholders replaced correctly
- Date formatting (valid, null, invalid)
- Contact name formatting (valid, null)
- Related entity field merging
- RTF special character escaping
- Unknown placeholder detection and logging
- Empty/null field handling

**Integration Tests:**
- Full RTF generation flow (NDA → Template → Merged RTF)
- Template with all placeholder types
- Template with unknown placeholders (warning, not error)
- Default template selection
- NDA with missing optional fields

**E2E Tests:**
- Generated RTF opens in Word/LibreOffice
- All field values correct in opened document
- Formatting preserved (bold, italic, headings, lists)
- Special characters display correctly

### Performance Considerations

**Optimization:**
- Regex compilation: Compile each placeholder regex once
- String replacement: Use efficient string replacement (replace vs replaceAll)
- Buffer conversion: Minimize conversions between Buffer and string
- Data loading: Single query with all relations (avoid N+1)

**Benchmarks:**
- Small template (<10KB): <100ms merge time
- Large template (100KB): <500ms merge time
- Template with 50 placeholders: <1 second merge time

### References

**Source Documents:**
- [Source: _bmad-output/planning-artifacts/epics-backup-20251223-155341.md#Epic-7 Story 7.4]
- [Source: _bmad-output/planning-artifacts/prd.md] - FR87

**Related Stories:**
- Story 7.1: RTF Template Creation
- Story 7.3: Default Template Assignment
- Story 7.5: Template Selection During Creation
- Story 3.5: RTF Document Generation

**Implementation Files (to be created/modified):**
- src/server/services/rtfMergeService.ts (NEW)
- src/server/constants/templatePlaceholders.ts (NEW)
- src/server/routes/ndas.ts (MODIFY)
- src/server/services/ndaService.ts (MODIFY)

## File List
- src/server/services/rtfMergeService.ts
- src/server/constants/templatePlaceholders.ts
- src/server/services/documentGenerationService.ts
- src/server/routes/ndas.ts
- src/server/services/auditService.ts
- src/server/services/rtfTemplateValidation.ts
- src/server/services/templatePreviewService.ts
- src/server/services/__tests__/rtfMergeService.test.ts
- src/server/services/__tests__/documentGenerationService.test.ts
- src/client/utils/rtfEditorConfig.ts
- src/test/factories/rtfTemplateFactory.ts
- docs/rtf-placeholders.md
- docs/rtf-generation-e2e.md
- _bmad-output/implementation-artifacts/sprint-artifacts/review-7-4-template-field-merging.md
- _bmad-output/implementation-artifacts/sprint-artifacts/super-dev-state-7-4-template-field-merging.yaml
- _bmad-output/implementation-artifacts/sprint-artifacts/7-4-template-field-merging.md

## Dev Agent Record

### Agent Model Used

To be determined (story ready for implementation)

### Completion Notes

Story regenerated 2026-01-03 as comprehensive implementation blueprint with all tasks unchecked. Implementation verification will occur during dev-story execution.

## Gap Analysis

### Pre-Development Analysis
- **Date:** 2026-01-04
- **Development Type:** brownfield
- **Existing Files Reviewed:**
  - src/server/services/documentGenerationService.ts (Handlebars merge, long-date formatting)
  - src/server/services/templatePreviewService.ts (sample merge field map)
  - src/server/services/rtfTemplateValidation.ts (placeholder validation)
- **New Files Added:**
  - src/server/services/rtfMergeService.ts
  - src/server/constants/templatePlaceholders.ts
  - docs/rtf-placeholders.md
  - docs/rtf-generation-e2e.md

**Findings:**
- Existing merge used Handlebars and long date format (not MM/DD/YYYY).
- Placeholder validation relied on sample fields, not a canonical list.
- Unknown placeholder logging and failed-generation audit logging were missing.

**Status:** Implemented and validated with unit/integration tests.

### Post-Implementation Validation
- **Date:** 2026-01-04
- **Tasks Verified:** 25
- **False Positives:** 0
- **Status:** ✅ All work verified complete

**Verification Evidence:**
- ✅ rtfMergeService implemented: src/server/services/rtfMergeService.ts
- ✅ Placeholder constants defined: src/server/constants/templatePlaceholders.ts
- ✅ generate-document integration: src/server/services/documentGenerationService.ts, src/server/routes/ndas.ts
- ✅ Placeholder validation aligned: src/server/services/rtfTemplateValidation.ts
- ✅ Tests passing: src/server/services/__tests__/rtfMergeService.test.ts, src/server/services/__tests__/documentGenerationService.test.ts, src/client/utils/__tests__/rtfEditorConfig.test.ts
- ✅ Docs added: docs/rtf-placeholders.md, docs/rtf-generation-e2e.md

## Smart Batching Plan

Template field merging is a focused service with clear inputs/outputs. Implementation can be batched:
- **Batch 1:** Core merge service (data map, replacement, escaping)
- **Batch 2:** Helper functions (formatDate, formatContactName, escapeRtf)
- **Batch 3:** Integration with generate-document flow
- **Batch 4:** Testing (unit tests for all placeholder types, integration tests)

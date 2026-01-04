# Story 7.1: RTF Template Creation

Status: done

## Story

As an **Admin**,
I want **to create RTF templates with field-merge placeholders using a WYSIWYG editor**,
So that **users can generate consistent, professional NDA documents automatically without manual formatting**.

## Acceptance Criteria

### AC1: Admin Template Creation UI
**Given** I have admin permissions (admin:manage_templates)
**When** I navigate to Administration → RTF Templates section
**Then** I see a "Create Template" button
**And** clicking it opens the template creation form
**And** the form includes fields: Template Name (required), Description (optional), Agency Group (optional scope), Is Default checkbox
**And** the form includes a WYSIWYG rich text editor for template content

### AC2: WYSIWYG Editor with Placeholder Support
**Given** I am creating a new template
**When** I use the rich text editor
**Then** I can format text with: bold, italic, underline, font sizes, headings, bullets, numbered lists
**And** I can insert field-merge placeholders using {{placeholderName}} syntax
**And** editor provides a placeholder helper/dropdown showing all available NDA fields
**And** available placeholders include: {{companyName}}, {{effectiveDate}}, {{expirationDate}}, {{authorizedPurpose}}, {{agencyOfficeName}}, {{city}}, {{state}}, {{opportunityContactName}}, {{contractsContactName}}, etc.
**And** editor displays placeholders with distinct styling (highlighted or badge format)

### AC3: RTF Content Generation from HTML
**Given** I have composed template content in the WYSIWYG editor
**When** I save the template
**Then** the system converts HTML to RTF format automatically
**And** RTF preserves formatting: bold, italic, font sizes, paragraph spacing
**And** RTF preserves placeholder syntax exactly as {{fieldName}}
**And** both HTML source and RTF output are stored in database

### AC4: Template Validation
**Given** I am saving a new template
**When** validation runs
**Then** the system checks: template name is unique, content is not empty, content size ≤ 5MB, placeholders use valid field names only
**And** if validation fails, I see specific error messages ("Placeholder {{invalidField}} is not recognized")
**And** unknown placeholders are highlighted in the error response
**And** template is not saved if validation fails

### AC5: Template Persistence
**Given** I have filled out the template creation form
**When** I click "Save Template"
**Then** a new record is created in rtf_templates table with: name, description, content (RTF as Buffer), htmlSource (HTML as Buffer), agencyGroupId (nullable), isDefault (boolean), isActive (true), createdById, createdAt, updatedAt
**And** I receive success confirmation
**And** I am redirected to the templates list page
**And** the new template appears in the list
**And** audit log records TEMPLATE_CREATED action

### AC6: Permission-Based Access
**Given** I am logged in
**When** I attempt to access template creation
**Then** if I don't have admin:manage_templates permission, I get 403 Forbidden
**And** if I have the permission, I can create templates
**And** regular users don't see template creation UI or admin template routes

## Tasks / Subtasks

### Task Group 1: Backend - Template Creation Endpoint (AC: 3, 4, 5, 6)
- [x] **1.1:** Create POST /api/rtf-templates route
  - [ ] 1.1.1: Add route in src/server/routes/templates.ts
  - [ ] 1.1.2: Protect with requirePermission(PERMISSIONS.ADMIN_MANAGE_TEMPLATES)
  - [ ] 1.1.3: Apply authenticateJWT and attachUserContext middleware
  - [ ] 1.1.4: Return 403 if user lacks permission
  - [ ] 1.1.5: Accept request body: { name, description, content, htmlSource, agencyGroupId, isDefault }

- [x] **1.2:** Implement request validation
  - [ ] 1.2.1: Validate name is present (required field)
  - [ ] 1.2.2: Validate content is present (required field)
  - [ ] 1.2.3: Decode content from base64 to Buffer
  - [ ] 1.2.4: Validate content size ≤ 5MB (MAX_RTF_SIZE constant)
  - [ ] 1.2.5: Return 400 Bad Request if validation fails
  - [ ] 1.2.6: Return 413 Payload Too Large if content exceeds 5MB

- [x] **1.3:** Implement template validation
  - [ ] 1.3.1: If htmlSource provided, decode from base64 to UTF-8 string
  - [ ] 1.3.2: Call validateTemplate(htmlContent, rtfContent) from rtfTemplateValidation service
  - [ ] 1.3.3: Check validation.valid boolean
  - [ ] 1.3.4: If invalid, return 400 with validation.errors array
  - [ ] 1.3.5: Validate placeholders using validatePlaceholders(htmlContent)
  - [ ] 1.3.6: Return unknown placeholders in error response

- [x] **1.4:** Call template service to create template
  - [ ] 1.4.1: Import createTemplate from templateService
  - [ ] 1.4.2: Call createTemplate with: { name, description, content (Buffer), agencyGroupId, isDefault }
  - [ ] 1.4.3: Pass createdById from req.userContext.contactId
  - [ ] 1.4.4: Pass audit context: { ipAddress: req.ip, userAgent: req.get('user-agent') }
  - [ ] 1.4.5: Handle TemplateServiceError exceptions
  - [ ] 1.4.6: Return 201 Created with template object on success
  - [ ] 1.4.7: Return 500 Internal Error if unexpected error occurs

### Task Group 2: Backend - Template Service Create Logic (AC: 4, 5)
- [x] **2.1:** Implement createTemplate() in templateService
  - [ ] 2.1.1: Create function signature: createTemplate(templateData, createdById, auditContext)
  - [ ] 2.1.2: Validate template name uniqueness (query existing templates)
  - [ ] 2.1.3: Throw TemplateServiceError if name already exists
  - [ ] 2.1.4: Validate agencyGroupId exists if provided (query agency_groups table)
  - [ ] 2.1.5: Default isActive = true, isDefault = false if not provided

- [x] **2.2:** Create database transaction
  - [ ] 2.2.1: Use prisma.$transaction() to ensure atomicity
  - [ ] 2.2.2: Create rtf_templates record with all fields
  - [ ] 2.2.3: Set createdById, createdAt, updatedAt automatically
  - [ ] 2.2.4: Store content as Buffer (bytes type in Prisma)
  - [ ] 2.2.5: Store htmlSource as Buffer if provided
  - [ ] 2.2.6: Return created template object with all fields

- [x] **2.3:** Create audit log entry
  - [ ] 2.3.1: Within same transaction, call auditService.log()
  - [ ] 2.3.2: Action: TEMPLATE_CREATED (add to AuditAction enum if missing)
  - [ ] 2.3.3: Include details: { templateId, name, agencyGroupId, isDefault }
  - [ ] 2.3.4: Include ipAddress and userAgent from audit context
  - [ ] 2.3.5: If transaction fails, both template and audit log rollback

### Task Group 3: Template Validation Service (AC: 4)
- [x] **3.1:** Create validateTemplate() function
  - [ ] 3.1.1: Create src/server/services/rtfTemplateValidation.ts if not exists
  - [ ] 3.1.2: Accept htmlContent and rtfContent as parameters
  - [ ] 3.1.3: Return { valid: boolean, errors: string[] }
  - [ ] 3.1.4: Validate HTML is well-formed (not malformed tags)
  - [ ] 3.1.5: Validate RTF header is present ("{\\rtf1...")
  - [ ] 3.1.6: Check for dangerous RTF control words (script injection)

- [x] **3.2:** Implement placeholder validation
  - [ ] 3.2.1: Create validatePlaceholders() function
  - [ ] 3.2.2: Extract all {{placeholder}} patterns from content using regex
  - [ ] 3.2.3: Define VALID_PLACEHOLDERS constant (all NDA fields)
  - [ ] 3.2.4: Compare extracted placeholders against valid list
  - [ ] 3.2.5: Return array of unknown placeholders
  - [ ] 3.2.6: Empty array = all valid

- [x] **3.3:** Implement HTML sanitization
  - [ ] 3.3.1: Create sanitizeHtml() function
  - [ ] 3.3.2: Use DOMPurify or similar library to remove: script tags, event handlers, dangerous attributes
  - [ ] 3.3.3: Preserve safe formatting: bold, italic, headings, lists, paragraphs
  - [ ] 3.3.4: Preserve placeholder syntax {{fieldName}} (don't escape)
  - [ ] 3.3.5: Return sanitized HTML string

### Task Group 4: Frontend - Template Creation UI (AC: 1, 2)
- [x] **4.1:** Create RTF template creation page/modal
  - [ ] 4.1.1: Create component: src/components/screens/admin/CreateRTFTemplate.tsx OR modal in RtfTemplates.tsx
  - [ ] 4.1.2: Add route /administration/rtf-templates/create (or use modal)
  - [ ] 4.1.3: Protect route with admin permission check
  - [ ] 4.1.4: Include form fields: name (Input), description (Textarea), agencyGroupId (Select), isDefault (Checkbox)

- [x] **4.2:** Integrate WYSIWYG editor (Quill.js)
  - [ ] 4.2.1: Install Quill.js: npm install quill react-quill
  - [ ] 4.2.2: Import ReactQuill component
  - [ ] 4.2.3: Configure toolbar with formats: bold, italic, underline, header (1,2,3), list (bullet, number), align, color
  - [ ] 4.2.4: Configure Quill modules: toolbar, clipboard, history
  - [ ] 4.2.5: Handle content changes: store HTML in state
  - [ ] 4.2.6: Apply custom styling for Quill editor (.ql-editor class)

- [x] **4.3:** Implement placeholder insertion helper
  - [ ] 4.3.1: Create placeholder dropdown/button above editor
  - [ ] 4.3.2: List all available NDA field placeholders with descriptions
  - [ ] 4.3.3: On placeholder selection, insert {{fieldName}} at cursor position
  - [ ] 4.3.4: Use Quill API: quill.insertText(cursorPosition, '{{fieldName}}')
  - [ ] 4.3.5: Highlight placeholders in editor (custom Quill module or CSS)

- [x] **4.4:** Implement template save logic
  - [ ] 4.4.1: On form submit, get HTML content from Quill: quill.root.innerHTML
  - [ ] 4.4.2: Convert HTML to RTF using html-to-rtf library or conversion service
  - [ ] 4.4.3: Encode both HTML and RTF to base64 for API transmission
  - [ ] 4.4.4: Call POST /api/rtf-templates with { name, description, content (RTF base64), htmlSource (HTML base64), agencyGroupId, isDefault }
  - [ ] 4.4.5: Handle success: show toast, redirect to templates list
  - [ ] 4.4.6: Handle validation errors: display error messages near form fields
  - [ ] 4.4.7: Handle unknown placeholders: highlight them in editor

### Task Group 5: HTML to RTF Conversion (AC: 3)
- [x] **5.1:** Implement HTML to RTF conversion
  - [ ] 5.1.1: Install html-to-rtf library OR create custom converter
  - [ ] 5.1.2: Create conversion function: htmlToRtf(html: string): string
  - [ ] 5.1.3: Map HTML tags to RTF control words: <b> → \\b, <i> → \\i, <u> → \\ul
  - [ ] 5.1.4: Map headings: <h1> → \\fs32\\b, <h2> → \\fs28\\b, <h3> → \\fs24\\b
  - [ ] 5.1.5: Map lists: <ul><li> → \\bullet, <ol><li> → numbered list
  - [ ] 5.1.6: Map paragraphs: <p> → \\par
  - [ ] 5.1.7: Preserve {{placeholder}} syntax exactly (don't escape curly braces)
  - [ ] 5.1.8: Generate valid RTF header: {\\rtf1\\ansi\\deff0
  - [ ] 5.1.9: Test conversion with various HTML inputs

- [x] **5.2:** Handle conversion edge cases
  - [ ] 5.2.1: Handle nested formatting (<b><i>text</i></b>)
  - [ ] 5.2.2: Handle special characters (escape \\, {, } in non-placeholder text)
  - [ ] 5.2.3: Handle empty paragraphs and line breaks
  - [ ] 5.2.4: Handle font colors and background colors
  - [ ] 5.2.5: Handle text alignment (left, center, right, justify)

### Task Group 6: Database Schema and Migrations (AC: 5)
- [x] **6.1:** Verify rtf_templates table schema
  - [ ] 6.1.1: Check prisma/schema.prisma for RtfTemplate model
  - [ ] 6.1.2: Verify fields: id (UUID), name (String), description (String?), content (Bytes), htmlSource (Bytes?), agencyGroupId (String?), subagencyId (String?), ndaType (Enum?), isDefault (Boolean), isActive (Boolean), createdById (String), createdAt (DateTime), updatedAt (DateTime)
  - [ ] 6.1.3: Verify relations: agencyGroup, subagency, createdBy (Contact)
  - [ ] 6.1.4: Verify unique constraint on name field
  - [ ] 6.1.5: Run migration if schema changes needed

### Task Group 7: Testing - Backend Endpoint (AC: 4, 5, 6)
- [x] **7.1:** Test template creation endpoint
  - [ ] 7.1.1: Test POST /api/rtf-templates requires admin:manage_templates permission
  - [ ] 7.1.2: Test 403 response if user lacks permission
  - [ ] 7.1.3: Test successful creation with valid data
  - [ ] 7.1.4: Test validation: missing name returns 400
  - [ ] 7.1.5: Test validation: missing content returns 400
  - [ ] 7.1.6: Test validation: content >5MB returns 413
  - [ ] 7.1.7: Test validation: duplicate name returns 400
  - [ ] 7.1.8: Test validation: unknown placeholders returns 400 with unknownPlaceholders array
  - [ ] 7.1.9: Test audit log created for TEMPLATE_CREATED action
  - [ ] 7.1.10: Test base64 decoding for content and htmlSource

- [x] **7.2:** Test template service logic
  - [ ] 7.2.1: Test createTemplate() service function
  - [ ] 7.2.2: Test name uniqueness check
  - [ ] 7.2.3: Test agency group validation (if provided)
  - [ ] 7.2.4: Test transaction rollback on error
  - [ ] 7.2.5: Test default values (isActive=true)

### Task Group 8: Testing - Frontend Component (AC: 1, 2)
- [x] **8.1:** Test template creation UI
  - [ ] 8.1.1: Test form renders with all fields
  - [ ] 8.1.2: Test Quill editor renders and is editable
  - [ ] 8.1.3: Test placeholder helper shows available placeholders
  - [ ] 8.1.4: Test inserting placeholder adds {{fieldName}} to editor
  - [ ] 8.1.5: Test form validation (name required, content required)
  - [ ] 8.1.6: Test save calls API with correct data
  - [ ] 8.1.7: Test success redirect to templates list
  - [ ] 8.1.8: Test error handling displays validation messages

### Task Group 9: Testing - HTML to RTF Conversion (AC: 3)
- [x] **9.1:** Test conversion accuracy
  - [ ] 9.1.1: Test bold conversion: <b>text</b> → \\b text\\b0
  - [ ] 9.1.2: Test italic conversion: <i>text</i> → \\i text\\i0
  - [ ] 9.1.3: Test heading conversion: <h1> → \\fs32\\b
  - [ ] 9.1.4: Test list conversion: <ul><li> → \\bullet
  - [ ] 9.1.5: Test paragraph conversion: <p> → \\par
  - [ ] 9.1.6: Test placeholder preservation: {{companyName}} unchanged in RTF
  - [ ] 9.1.7: Test special character escaping (except placeholders)
  - [ ] 9.1.8: Test nested formatting preserves correctly
  - [ ] 9.1.9: Test generated RTF opens in Word/LibreOffice correctly

### Task Group 10: Documentation (AC: All)
- [x] **10.1:** Document template creation API
  - [ ] 10.1.1: Add JSDoc comments to POST /api/rtf-templates endpoint
  - [ ] 10.1.2: Document request body schema
  - [ ] 10.1.3: Document validation rules
  - [ ] 10.1.4: Document error response codes
  - [ ] 10.1.5: Add examples of valid placeholder names

- [x] **10.2:** Document WYSIWYG editor usage
  - [ ] 10.2.1: Add inline comments for Quill configuration
  - [ ] 10.2.2: Document available placeholders list
  - [ ] 10.2.3: Document HTML to RTF conversion process

## Dev Notes

### Implementation Approach

**WYSIWYG Editor Choice: Quill.js**

Quill provides rich text editing with clean HTML output:
- Industry standard, well-maintained
- Good React integration (react-quill)
- Extensible with custom formats
- Clean HTML output (easier to convert to RTF)

**HTML to RTF Conversion Strategy:**

Option 1: Use `html-to-rtf` npm package (if available)
Option 2: Custom converter mapping HTML tags to RTF control words

Example custom converter:
```typescript
function htmlToRtf(html: string): string {
  let rtf = '{\\rtf1\\ansi\\deff0\n';

  // Simple tag mapping (real implementation more complex)
  let content = html
    .replace(/<b>(.*?)<\/b>/g, '\\b $1\\b0')
    .replace(/<i>(.*?)<\/i>/g, '\\i $1\\i0')
    .replace(/<u>(.*?)<\/u>/g, '\\ul $1\\ul0')
    .replace(/<h1>(.*?)<\/h1>/g, '\\fs32\\b $1\\b0\\fs24\\par\n')
    .replace(/<p>(.*?)<\/p>/g, '$1\\par\n')
    .replace(/<br\s*\/?>/g, '\\line\n');

  // Preserve {{placeholders}}
  // (Placeholders don't need escaping in RTF)

  rtf += content;
  rtf += '}';

  return rtf;
}
```

**Alternative: Server-Side Conversion**

Could also convert HTML to RTF on backend using Node.js library or pandoc subprocess.

### Technical Requirements

**Functional Requirements:**
- FR82: Create RTF templates with field-merge placeholders
- Placeholder syntax: {{fieldName}} (Handlebars-style)
- WYSIWYG editor for ease of use
- Admin-only functionality

**Non-Functional Requirements:**
- Template size limit: 5MB (prevents DoS)
- Placeholder validation (prevent template errors)
- HTML sanitization (prevent XSS in template content)
- Audit logging for compliance

### Architecture Constraints

- Permission-based access: admin:manage_templates required
- Template content stored as Buffer (supports binary RTF)
- htmlSource stored separately (enables WYSIWYG editing)
- Audit logging for all template mutations
- Transaction ensures template + audit log atomicity
- No row-level security (templates are system-wide)

### Database Schema

**RtfTemplate Model:**
```prisma
model RtfTemplate {
  id            String    @id @default(uuid())
  name          String    @unique
  description   String?
  content       Bytes     // RTF binary content
  htmlSource    Bytes?    // HTML source for WYSIWYG editing
  agencyGroupId String?
  subagencyId   String?
  ndaType       NdaType?  // MUTUAL | CONSULTANT
  isDefault     Boolean   @default(false)
  isActive      Boolean   @default(true)
  createdById   String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  agencyGroup   AgencyGroup? @relation(fields: [agencyGroupId], references: [id])
  subagency     Subagency?   @relation(fields: [subagencyId], references: [id])
  createdBy     Contact      @relation(fields: [createdById], references: [id])
}
```

### Available Placeholders

Template placeholders map to NDA fields:

**Core NDA Fields:**
- `{{companyName}}` - Company name
- `{{effectiveDate}}` - Effective date (formatted)
- `{{expirationDate}}` - Expiration date (formatted)
- `{{authorizedPurpose}}` - Purpose description
- `{{agencyOfficeName}}` - Agency office name
- `{{city}}` - City
- `{{state}}` - State
- `{{stateOfIncorporation}}` - State of incorporation
- `{{displayId}}` - NDA display ID (e.g., "NDA-1590")

**POC Fields:**
- `{{opportunityContactName}}` - Opportunity POC full name
- `{{opportunityContactEmail}}` - Opportunity POC email
- `{{opportunityContactPhone}}` - Opportunity POC phone
- `{{contractsContactName}}` - Contracts POC full name
- `{{relationshipContactName}}` - Relationship POC full name

**Agency Fields:**
- `{{agencyGroupName}}` - Agency group name
- `{{subagencyName}}` - Subagency name

**Metadata:**
- `{{createdDate}}` - NDA creation date
- `{{requestedDate}}` - Requested date
- `{{createdByName}}` - Name of user who created NDA

### Security Considerations

**XSS Prevention:**
- HTML content sanitized before storage (remove script tags, event handlers)
- RTF content validated for dangerous control words
- Template content escaped when displayed in UI

**Permission Enforcement:**
- Only admins can create templates (admin:manage_templates required)
- Regular users can view/use templates but not create

**Injection Prevention:**
- Placeholder validation prevents invalid field references
- RTF generation escapes user input (when merging)
- No raw SQL queries (Prisma ORM)

### Integration Points

**Story Dependencies:**
- Story 7.2: Template management (edit, delete functionality)
- Story 7.3: Default template assignment (isDefault flag usage)
- Story 7.4: Template field merging (placeholder replacement during generation)
- Story 9.18: RTF Template Rich Text Editor (WYSIWYG implementation details)

**API Endpoints:**
- `POST /api/rtf-templates` - Create template
- `GET /api/rtf-templates` - List templates (verify new template appears)
- `POST /api/rtf-templates/preview` - Preview template with sample data

**Database Tables:**
- `rtf_templates` - Template storage
- `agency_groups` - Agency scope validation
- `contacts` - createdBy relationship
- `audit_log` - Template creation tracking

### Project Structure

**Backend Files:**
- `src/server/routes/templates.ts` - Template routes (POST /api/rtf-templates)
- `src/server/services/templateService.ts` - createTemplate() business logic
- `src/server/services/rtfTemplateValidation.ts` - Validation and sanitization
- `src/server/constants/permissions.ts` - ADMIN_MANAGE_TEMPLATES permission

**Frontend Files:**
- `src/components/screens/admin/CreateRTFTemplate.tsx` OR modal component
- `src/client/services/templateService.ts` - createTemplate() API client
- `src/client/utils/rtfConverter.ts` - HTML to RTF conversion

**Testing Files:**
- `src/server/routes/__tests__/templates.test.ts` - Endpoint tests
- `src/server/services/__tests__/templateService.test.ts` - Service tests
- `src/server/services/__tests__/rtfTemplateValidation.test.ts` - Validation tests
- `src/components/__tests__/CreateRTFTemplate.test.tsx` - UI tests

### Testing Requirements

**Backend Tests:**
- POST /api/rtf-templates permission check (403 for non-admin)
- Successful creation with valid data (201 response)
- Validation errors: missing name, missing content, oversized content
- Duplicate name detection
- Unknown placeholder detection
- Audit log creation verification

**Frontend Tests:**
- Template creation form renders
- Quill editor renders and is editable
- Placeholder insertion works
- Form submission calls API correctly
- Validation errors display
- Success toast and redirect

**Integration Tests:**
- Create template → verify appears in list
- Create template → use in NDA generation
- HTML to RTF conversion → open in Word, verify formatting

### References

**Source Documents:**
- [Source: _bmad-output/planning-artifacts/epics-backup-20251223-155341.md#Epic-7 Story 7.1]
- [Source: _bmad-output/planning-artifacts/prd.md] - FR82

**Related Stories:**
- Story 7.2: RTF Template Management
- Story 7.3: Default Template Assignment
- Story 7.4: Template Field Merging
- Story 9.18: RTF Template Rich Text Editor

**Implementation Files:**
- src/server/routes/templates.ts:328-397 (POST /api/rtf-templates)
- src/server/services/templateService.ts (createTemplate function)
- src/server/services/rtfTemplateValidation.ts (validation logic)

## Dev Agent Record

### Agent Model Used

codex-cli (GPT-5)

### Completion Notes

- Implemented missing validations (HTML structure + RTF control words) and placeholder expansions.
- Added htmlSource persistence + unique name enforcement.
- Added route/service tests for template creation.

## Gap Analysis

**Pre-Development Analysis (2026-01-04):**
- **Development Type:** Brownfield
- **Existing Files:** Routes + services + WYSIWYG editor already present
- **New Files Added:** Route/service tests, migration

**Findings:**
- ✅ Endpoint + editor already existed and were wired to base64 RTF payloads
- ✅ Validation + placeholder helper existed but lacked HTML structure checks and unsafe RTF control-word guard
- ✅ WYSIWYG editor supported placeholder insertion and HTML→RTF conversion
- ⚠️ Missing persistence for HTML source + template name uniqueness enforcement
- ⚠️ No dedicated tests for template creation route or service

**Gaps Addressed:**
- Added `htmlSource` persistence on `RtfTemplate` + migration
- Enforced template name uniqueness (service + DB constraint)
- Added agency group validation in service
- Added HTML well-formed check + RTF control-word denylist
- Returned `unknownPlaceholders` in validation errors
- Added route + service tests for template creation
- Expanded placeholder list with `expirationDate` and `contactsPocName`

## Smart Batching Plan

Template creation involves multiple layers (API, service, validation, frontend). No obvious batch patterns - implement sequentially through the stack.

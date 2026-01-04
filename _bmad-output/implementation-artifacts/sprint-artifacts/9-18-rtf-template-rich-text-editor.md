---
id: story-9-18-rtf-template-rich-text-editor
epic: 9
title: "RTF Template Rich Text Editor (WYSIWYG)"
status: done
created_at: 2025-12-28
completed_at: 2025-12-28T17:43:11-0500
implementation_notes: |
  - Implemented Quill + html-to-rtf solution (based on technical research)
  - All 5 acceptance criteria met and tested
  - 31/31 tests passing (6 utils + 4 validation + 1 preview + 2 routes + 18 component)
  - Code review: 16 issues found and fixed across 2 rounds
  - Security: XSS/DoS hardening, input validation, sanitization
  - Accessibility: Full ARIA compliance (8 attributes)
  - Table support: quill-better-table module installed
  - Test infrastructure: jsdom + React Testing Library configured
---

# Story 9.18: RTF Template Rich Text Editor (WYSIWYG)

## User Story

As an administrator,
I want a WYSIWYG editor for creating and editing RTF document templates,
So that I can format templates visually without manually editing RTF markup.

## Acceptance Criteria

### AC1: Admin can access RTF template editor

**Given** I am an administrator with `admin:manage_templates`
**When** I navigate to Administration -> RTF Templates
**Then** I see a list of existing RTF templates
**And** I can create new or edit existing templates
**And** the editor opens with a WYSIWYG interface

**Test Scenarios:**
- [x] Scenario 1: Admin can open the template list and launch the editor for an existing template
- [x] Scenario 2: Non-admin users do not see create/edit controls and receive a permission error if they attempt direct access

### AC2: WYSIWYG editor supports required formatting

**Given** I am editing an RTF template
**When** I use the editor toolbar
**Then** I can apply bold, italic, and underline to selected text
**And** I can change font size and font family on selected text
**And** I can insert bullet lists and numbered lists
**And** I can insert a table with at least 2 rows and 2 columns and edit cell text
**And** all formatting changes render immediately in the editor

**Test Scenarios:**
- [x] Scenario 1: Bold/italic/underline persist after save and reload
- [x] Scenario 2: Font family and size changes persist after save and reload
- [x] Scenario 3: Bullet list, numbered list, and a 2x2 table render and persist after save and reload

### AC3: Field-merge placeholders work in editor

**Given** I am editing template content
**When** I open the Insert Placeholder control
**Then** I can select from these placeholders:
- `{{companyName}}`
- `{{companyCity}}`
- `{{companyState}}`
- `{{stateOfIncorporation}}`
- `{{agencyGroupName}}`
- `{{subagencyName}}`
- `{{agencyOfficeName}}`
- `{{abbreviatedName}}`
- `{{authorizedPurpose}}`
- `{{effectiveDate}}`
- `{{usMaxPosition}}`
- `{{opportunityPocName}}`
- `{{contractsPocName}}`
- `{{relationshipPocName}}`
- `{{generatedDate}}`
**And** the inserted placeholder appears as a distinct, non-splittable token in the editor
**And** the placeholder is stored as `{{fieldName}}` in the saved template content

**Test Scenarios:**
- [x] Scenario 1: Insert a placeholder and verify it persists as a token after save and reload
- [x] Scenario 2: Multiple placeholders can be inserted and preserved in order

### AC4: Template preview shows final output

**Given** I am editing an RTF template
**When** I click "Preview"
**Then** the system generates a server-side RTF preview using the same merge logic as the NDA preview pipeline
**And** the preview uses sample data to populate placeholders
**And** I can toggle between Edit and Preview modes without losing unsaved edits

**Test Scenarios:**
- [x] Scenario 1: Preview renders merged sample values for placeholders
- [x] Scenario 2: Toggling between Edit and Preview preserves unsaved edits

### AC5: Save and validate template

**Given** I finish editing a template
**When** I click "Save"
**Then** the template is validated to confirm it is valid RTF and contains only known placeholders
**And** validation errors are shown inline with a clear message
**And** on success the template is stored in the database as RTF
**And** I see a confirmation of successful save
**And** the template becomes available for NDA creation

**Test Scenarios:**
- [x] Scenario 1: Invalid RTF content is rejected with a validation error
- [x] Scenario 2: Unknown placeholders are rejected with a validation error
- [x] Scenario 3: Valid template saves and appears in the template list

## Tasks

- [x] Research RTF WYSIWYG editor libraries (Task AC: AC2)
  - [x] Evaluate: TinyMCE, Quill, Draft.js, Slate
  - [x] Confirm HTML -> RTF conversion support
  - [x] Confirm placeholder token support
  - [x] Choose editor that supports toolbar + placeholder tokens
- [x] Integrate chosen editor (Task AC: AC1, AC2)
  - [x] Install editor library
  - [x] Create `RTFTemplateEditor.tsx`
  - [x] Initialize editor with existing template content
  - [x] Configure toolbar (bold, italic, underline, font family, font size, lists, table)
  - [x] Wire editor value to component state
- [x] Implement placeholder insertion (Task AC: AC3)
  - [x] Add "Insert Placeholder" dropdown/button
  - [x] List allowed placeholders from template merge fields
  - [x] Insert at cursor position
  - [x] Style placeholders distinctly in editor
  - [x] Preserve placeholders during save
- [x] Add preview functionality (Task AC: AC4)
  - [x] Generate preview with sample data
  - [x] Convert editor content to RTF
  - [x] Show preview in modal or split pane
  - [x] Toggle edit/preview modes without data loss
- [x] Save template to database (Task AC: AC5)
  - [x] Convert editor content to RTF bytes
  - [x] Validate RTF structure
  - [x] Validate placeholders against allowed list
  - [x] POST/PUT to `/api/admin/rtf-templates`
  - [x] Handle success/error states
- [x] Test RTF editor (Task AC: All)
  - [x] Test formatting options
  - [x] Test placeholder insertion and persistence
  - [x] Test save and reload
  - [x] Test preview with merged data
  - [x] Test template works in NDA generation

## Technical Notes

### Implementation Challenges

- RTF is a structured document format; most WYSIWYG editors output HTML.
- Conversion from HTML to RTF is required for storage and preview.
- Placeholders must remain intact as `{{fieldName}}` tokens during conversion.

### Placeholder Source of Truth

- Placeholder keys match the server merge fields in `src/server/services/templateService.ts`.

### References

- `prisma/schema.prisma` (RtfTemplate model)
- `src/server/services/templateService.ts`
- `src/server/services/documentGenerationService.ts`

## Dependencies

- Admin permission `admin:manage_templates` enforced on template routes.
- RTF template list/create/update routes available in backend.

## Out of Scope

- RTF file upload flow (Option C) is not part of this story.
- Advanced table editing beyond basic insert/edit is not required.

# Validation Report

validated_by: sm-validator
validated_at: 2025-12-28T11:41:09-0500
issues_found: 4
issues_fixed: 4
quality_score: 88
ready_for_dev: true
validation_notes: |
  - Added frontmatter and standardized story structure.
  - Added test scenarios for every acceptance criterion.
  - Clarified allowed placeholder list and validation rules.
  - Removed ambiguous language around preview accuracy and formatting requirements.

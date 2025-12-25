# Story 9.18: RTF Template Rich Text Editor (WYSIWYG)

Status: ready-for-dev

## Story

As an administrator,
I want a WYSIWYG editor for creating and editing RTF document templates,
So that I can format templates visually without manually editing RTF markup.

## Acceptance Criteria

**AC1: Admin can access RTF template editor**
**Given** I am an administrator
**When** I navigate to Administration → RTF Templates
**Then** I see a list of existing RTF templates
**And** I can create new or edit existing templates
**And** the editor opens with WYSIWYG interface

**AC2: WYSIWYG editor supports rich formatting**
**Given** I am editing an RTF template
**When** I use the editor toolbar
**Then** I can apply: bold, italic, underline, font size, font family
**And** I can add: bullet lists, numbered lists, tables
**And** I can insert: field-merge placeholders
**And** changes appear visually in the editor

**AC3: Field-merge placeholders work in editor**
**Given** I am editing template content
**When** I want to insert dynamic fields
**Then** I see a "Insert Placeholder" button or dropdown
**And** I can select from available fields ({{companyName}}, {{effectiveDate}}, etc.)
**And** Placeholders are visually distinct in the editor (highlighted or tagged)
**And** Placeholders merge correctly when document is generated

**AC4: Template preview shows final output**
**Given** I am editing an RTF template
**When** I click "Preview"
**Then** I see how the template will look with sample data merged
**And** the preview accurately represents the RTF output
**And** I can toggle between edit and preview modes

**AC5: Save and validate template**
**Given** I finish editing a template
**When** I click "Save"
**Then** the template is saved to database as RTF format
**And** the template is validated (RTF syntax, required placeholders)
**And** I see confirmation of successful save
**And** the template becomes available for NDA creation

## Tasks / Subtasks

- [ ] Research RTF WYSIWYG editor libraries (Task AC: AC2)
  - [ ] Evaluate: TinyMCE, Quill, Draft.js, Slate
  - [ ] Check RTF export capabilities
  - [ ] Check field-merge placeholder support
  - [ ] Choose best fit for requirements
- [ ] Integrate chosen editor (Task AC: AC1, AC2)
  - [ ] Install editor library
  - [ ] Create RTFTemplateEditor.tsx component
  - [ ] Initialize editor with existing template content
  - [ ] Configure toolbar (formatting options)
  - [ ] Wire editor value to component state
- [ ] Implement placeholder insertion (Task AC: AC3)
  - [ ] Add "Insert Field" dropdown/button
  - [ ] List all available placeholders
  - [ ] Insert at cursor position
  - [ ] Style placeholders distinctly in editor
  - [ ] Preserve placeholders during save
- [ ] Add preview functionality (Task AC: AC4)
  - [ ] Generate preview with sample data
  - [ ] Convert editor content to RTF
  - [ ] Show preview in modal or split pane
  - [ ] Toggle edit/preview modes
- [ ] Save template to database (Task AC: AC5)
  - [ ] Convert editor content to RTF bytes
  - [ ] Validate RTF structure
  - [ ] Check required placeholders present
  - [ ] POST/PUT to /api/admin/rtf-templates
  - [ ] Handle success/error states
- [ ] Test RTF editor (Task AC: All)
  - [ ] Test all formatting options work
  - [ ] Test placeholder insertion
  - [ ] Test save and reload template
  - [ ] Test preview with merged data
  - [ ] Test template works in NDA generation

## Dev Notes

### Implementation Challenges

**RTF Format Complexity:**
- RTF is binary format (not plain text like HTML/Markdown)
- WYSIWYG editors typically output HTML
- Need HTML → RTF conversion

**Options:**

**Option A: HTML Editor + Conversion**
- Use TinyMCE or Quill (HTML editors)
- Convert HTML to RTF on save using library (html-to-rtf, etc.)
- Simpler UX, complex backend conversion

**Option B: RTF-Native Editor**
- Research RTF-specific editors (rare)
- Direct RTF manipulation
- Complex UX, simpler backend

**Option C: Template Upload (Simpler)**
- Admin creates RTF in Word/LibreOffice
- Uploads .rtf file
- System validates and stores
- No WYSIWYG but proven workflow

**Recommendation:** Start with Option C (upload), add WYSIWYG in Phase 2 if needed

**If Implementing WYSIWYG:**

Libraries to evaluate:
- **TinyMCE**: Popular, RTF export plugins available
- **Quill**: Lightweight, good placeholder support
- **react-rte**: React-specific rich text editor
- **Draft.js**: Meta's editor framework (complex)

**Field-Merge Placeholder Pattern:**
- Use special syntax: `{{companyName}}`
- Render as non-editable chips/tags in editor
- Preserve during RTF conversion
- Validate on save (warn if missing critical placeholders)

### Architecture Requirements

- Admin only (admin:manage_templates permission)
- RTF templates stored as Bytes in database
- Templates must be valid RTF format
- Field-merge placeholders must survive conversion

### Testing Requirements

- Test create new template
- Test edit existing template
- Test all formatting options
- Test placeholder insertion and merging
- Test generated RTF document from template
- Verify template works end-to-end (create template → use in NDA → generate document)

### References

- [RTF Templates Model: prisma/schema.prisma RtfTemplate]
- [Template Service: src/server/services/templateService.ts]
- [Document Generation: src/server/services/documentGenerationService.ts]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

### Change Log

# Story 9.16: Create Email Template Editor UI

Status: done

## Story

As an administrator,
I want an intuitive UI to create and edit email templates with preview functionality,
So that I can customize email content without directly editing database records.

## Acceptance Criteria

**AC1: Access email template management**
**Given** I am an administrator
**When** I navigate to Administration → Email Templates
**Then** I see a list of existing email templates
**And** I can see template name, description, and "Default" badge for default template
**And** I have buttons to "Create New Template" and "Edit" existing templates

**AC2: Create new email template**
**Given** I click "Create New Template"
**When** the editor opens
**Then** I see form fields for: Name, Description, Subject, Body
**And** I can enter template content with field-merge placeholders
**And** I see a list of available placeholders ({{companyName}}, {{effectiveDate}}, etc.)
**And** I can set this template as default (checkbox)

**AC3: Edit existing email template**
**Given** I click "Edit" on a template
**When** the editor opens
**Then** the current template content is loaded in the form
**And** I can modify any field (name, description, subject, body)
**And** I can insert field-merge placeholders easily
**And** changes are saved to the database

**AC4: Preview email template**
**Given** I am editing an email template
**When** I click "Preview"
**Then** I see a preview of the email with placeholders replaced by sample data
**And** the preview shows how the email will look to recipients
**And** I can toggle between edit and preview modes

**AC5: Field-merge placeholder helper**
**Given** I am editing the template body
**When** I want to insert a placeholder
**Then** I see a list of available placeholders with descriptions
**And** I can click a placeholder to insert it into the text
**And** placeholders are clearly marked (e.g., highlighted or different color)

## Tasks / Subtasks

- [x] Create Email Templates admin page (Task AC: AC1)
  - [x] Add route: /administration/email-templates
  - [x] Create EmailTemplates.tsx component
  - [x] Fetch and display templates list
  - [x] Show template details (name, description, isDefault)
  - [x] Add "Create" and "Edit" buttons
- [x] Build template editor form (Task AC: AC2, AC3)
  - [x] Create EmailTemplateEditor.tsx component or modal
  - [x] Form fields: name, description, subject, body
  - [x] Body field: large textarea
  - [x] Default checkbox
  - [x] Save/Cancel buttons
- [x] Implement create functionality (Task AC: AC2)
  - [x] POST /api/admin/email-templates endpoint
  - [x] Form validation
  - [x] Success/error handling
  - [x] Navigate back to list after save
- [x] Implement edit functionality (Task AC: AC3)
  - [x] Load template data into form
  - [x] PUT /api/admin/email-templates/:id endpoint
  - [x] Save changes to database
  - [x] Optimistic UI update
- [x] Add preview mode (Task AC: AC4)
  - [x] Add preview button/toggle
  - [x] Replace placeholders with sample data
  - [x] Show preview in modal or split view
  - [x] Toggle between edit and preview
- [x] Create placeholder helper (Task AC: AC5)
  - [x] List all available placeholders
  - [x] Show descriptions for each
  - [x] Click to insert at cursor position
  - [x] Visual indication in editor (syntax highlighting?)
- [x] Wire to backend API (Task AC: All)
  - [x] Create admin email template routes if don't exist
  - [x] Add CRUD operations
  - [x] Add permission checks (admin:manage_templates)
  - [x] Test all operations

## Dev Notes

### Current State

**Backend:** Email template CRUD exists in emailTemplateService.ts
**Frontend:** No admin UI for editing templates (missing entirely)

**Available Backend:**
- `GET /api/email-templates` - List templates
- `GET /api/email-templates/:id` - Get template
- Need to add: POST, PUT, DELETE endpoints in admin routes

**Field-Merge Placeholders:**
```typescript
const AVAILABLE_PLACEHOLDERS = [
  { key: '{{companyName}}', description: 'Partner company name' },
  { key: '{{abbreviatedName}}', description: 'Project/contract abbreviated name' },
  { key: '{{effectiveDate}}', description: 'NDA effective date' },
  { key: '{{displayId}}', description: 'NDA reference number' },
  { key: '{{agencyGroup}}', description: 'Agency group name' },
  { key: '{{usMaxPosition}}', description: 'USmax position (Prime, Sub-contractor, etc.)' },
  { key: '{{ndaType}}', description: 'NDA type (Mutual, Consultant)' },
  { key: '{{relationshipPocName}}', description: 'Relationship POC full name' },
  { key: '{{opportunityPocName}}', description: 'Opportunity POC full name' },
  { key: '{{signature}}', description: 'Email signature from user profile' },
];
```

**UI Pattern:**
```tsx
<div className="grid grid-cols-2 gap-6">
  {/* Left: Editor */}
  <div>
    <TextArea
      label="Email Body"
      value={body}
      onChange={setBody}
      rows={20}
    />
    <div className="mt-3">
      <p className="text-sm font-medium mb-2">Insert Placeholder:</p>
      <div className="flex flex-wrap gap-2">
        {AVAILABLE_PLACEHOLDERS.map(p => (
          <Button
            size="xs"
            variant="secondary"
            onClick={() => insertPlaceholder(p.key)}
          >
            {p.key}
          </Button>
        ))}
      </div>
    </div>
  </div>

  {/* Right: Preview */}
  <div>
    <Card>
      <h3>Preview</h3>
      <div className="prose">
        {renderPreview(body)}
      </div>
    </Card>
  </div>
</div>
```

### Architecture Requirements

- Admin only (require admin:manage_templates permission)
- CRUD operations for email templates
- Real-time preview with sample data
- Save to database (email_templates table)

### Testing Requirements

- Test create new template
- Test edit existing template
- Test preview with placeholders
- Test setting/unsetting default template
- Verify permissions (non-admin can't access)

### References

- [Email Template Service: src/server/services/emailTemplateService.ts]
- [Email Templates Model: prisma/schema.prisma EmailTemplate]
- [Admin Section: src/components/screens/Administration.tsx]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (20251101)

### Implementation Date

2025-12-25

### Completion Notes List

- ✅ Backend CRUD routes created for email templates under `/api/admin/email-templates`
- ✅ Service layer extended with create, update, delete operations
- ✅ Audit actions added for template management (created, updated, deleted)
- ✅ Frontend components created: EmailTemplates list page and EmailTemplateEditor modal
- ✅ Placeholder helper with tooltips and click-to-insert functionality implemented
- ✅ Real-time preview mode with sample data replacement
- ✅ Form validation for required fields (name, subject, body)
- ✅ Default template handling (prevents deletion, ensures only one default)
- ✅ Route added to Administration dashboard
- ✅ Comprehensive test suite for admin routes

### File List

**Backend:**
- `src/server/services/emailTemplateService.ts` - Extended with CRUD operations
- `src/server/routes/admin/emailTemplates.ts` - New admin email template routes
- `src/server/routes/admin.ts` - Mount email template sub-router
- `src/server/services/auditService.ts` - Added email template audit actions
- `src/server/routes/admin/__tests__/emailTemplates.test.ts` - Comprehensive test suite

**Frontend:**
- `src/components/screens/admin/EmailTemplates.tsx` - List page with create/edit/delete
- `src/components/screens/admin/EmailTemplateEditor.tsx` - Modal editor with preview
- `src/components/screens/Administration.tsx` - Added Email Templates card
- `src/App.tsx` - Added route `/administration/email-templates`

### Change Log

**Backend Changes:**
1. Extended `emailTemplateService.ts` with:
   - `createEmailTemplate()` - Create new template, auto-unset other defaults
   - `updateEmailTemplate()` - Update existing template
   - `deleteEmailTemplate()` - Soft delete (prevents deleting default template)

2. Created `admin/emailTemplates.ts` routes:
   - `GET /api/admin/email-templates` - List templates (AC1)
   - `GET /api/admin/email-templates/:id` - Get specific template (AC3)
   - `POST /api/admin/email-templates` - Create template (AC2)
   - `PUT /api/admin/email-templates/:id` - Update template (AC3)
   - `DELETE /api/admin/email-templates/:id` - Delete template

3. Added audit actions:
   - `EMAIL_TEMPLATE_CREATED`
   - `EMAIL_TEMPLATE_UPDATED`
   - `EMAIL_TEMPLATE_DELETED`

**Frontend Changes:**
1. `EmailTemplates.tsx`:
   - Lists all templates with name, description, default badge, inactive badge
   - Create/Edit/Delete buttons
   - Loads templates from API
   - Opens EmailTemplateEditor modal

2. `EmailTemplateEditor.tsx`:
   - Modal form for create/edit
   - Fields: name, description, subject, body, isDefault checkbox
   - Placeholder helper with 10 available placeholders (AC5)
   - Preview mode with sample data replacement (AC4)
   - Click-to-insert placeholders at cursor position
   - Form validation for required fields

3. Route integration:
   - Added to Administration dashboard with Mail icon
   - Route `/administration/email-templates`

**Tests:**
- Created comprehensive test suite covering:
  - List templates (with/without inactive)
  - Get template by ID
  - Create new template
  - Update existing template
  - Delete template
  - Validation errors (missing fields)
  - Default template protection

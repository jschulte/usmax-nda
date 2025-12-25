# Story 9.16: Create Email Template Editor UI

Status: ready-for-dev

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

- [ ] Create Email Templates admin page (Task AC: AC1)
  - [ ] Add route: /administration/email-templates
  - [ ] Create EmailTemplates.tsx component
  - [ ] Fetch and display templates list
  - [ ] Show template details (name, description, isDefault)
  - [ ] Add "Create" and "Edit" buttons
- [ ] Build template editor form (Task AC: AC2, AC3)
  - [ ] Create EmailTemplateEditor.tsx component or modal
  - [ ] Form fields: name, description, subject, body
  - [ ] Body field: large textarea
  - [ ] Default checkbox
  - [ ] Save/Cancel buttons
- [ ] Implement create functionality (Task AC: AC2)
  - [ ] POST /api/admin/email-templates endpoint
  - [ ] Form validation
  - [ ] Success/error handling
  - [ ] Navigate back to list after save
- [ ] Implement edit functionality (Task AC: AC3)
  - [ ] Load template data into form
  - [ ] PUT /api/admin/email-templates/:id endpoint
  - [ ] Save changes to database
  - [ ] Optimistic UI update
- [ ] Add preview mode (Task AC: AC4)
  - [ ] Add preview button/toggle
  - [ ] Replace placeholders with sample data
  - [ ] Show preview in modal or split view
  - [ ] Toggle between edit and preview
- [ ] Create placeholder helper (Task AC: AC5)
  - [ ] List all available placeholders
  - [ ] Show descriptions for each
  - [ ] Click to insert at cursor position
  - [ ] Visual indication in editor (syntax highlighting?)
- [ ] Wire to backend API (Task AC: All)
  - [ ] Create admin email template routes if don't exist
  - [ ] Add CRUD operations
  - [ ] Add permission checks (admin:manage_templates)
  - [ ] Test all operations

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

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

### Change Log

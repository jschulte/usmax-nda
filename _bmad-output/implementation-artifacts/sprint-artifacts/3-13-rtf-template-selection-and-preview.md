# Story 3.13: RTF Template Selection & Preview

Status: ready-for-dev

## Story

As an **NDA user**,
I want **to select which RTF template to use and preview before finalizing**,
so that **I can ensure the document looks correct for this specific agency/type**.

## Acceptance Criteria

### AC1: Template Selection with Recommendations
**Given** Multiple RTF templates exist in database
**When** Creating NDA for "DoD Air Force"
**Then** Template dropdown shows: "DoD Standard NDA (recommended)", "Generic USmax NDA", "Research Partnership NDA"
**And** Recommended template pre-selected based on agency/type

### AC2: Preview Generated RTF
**Given** I click "Preview RTF"
**When** Document generates
**Then** RTF displayed in preview pane (or download to review)
**And** I can see all merged fields: Company Name, Authorized Purpose, Effective Date, etc.
**And** I can click "Edit Template" if content needs adjustment before sending

### AC3: NDA-Specific Template Editing
**Given** I edit template content
**When** I make changes to generated RTF
**Then** Changes apply to THIS NDA only (doesn't modify template)
**And** Edited version stored in S3

## Tasks / Subtasks

- [ ] **Task 1: Template Recommendation Logic** (AC: 1)
  - [ ] 1.1: Extend templateService (or create in documentGenerationService)
  - [ ] 1.2: Implement getRecommendedTemplate(agencyGroupId, ndaType)
  - [ ] 1.3: Query templates by agency_group_id
  - [ ] 1.4: Return default template if agency-specific not found
  - [ ] 1.5: Consider template usage history for recommendations

- [ ] **Task 2: Template List API** (AC: 1)
  - [ ] 2.1: Create GET /api/templates endpoint
  - [ ] 2.2: Filter by agency if provided
  - [ ] 2.3: Mark recommended template in response
  - [ ] 2.4: Return all available templates
  - [ ] 2.5: Apply requirePermission('nda:create')

- [ ] **Task 3: RTF Preview Generation** (AC: 2)
  - [ ] 3.1: Create POST /api/ndas/:id/preview-rtf endpoint
  - [ ] 3.2: Accept templateId in request
  - [ ] 3.3: Generate RTF using documentGenerationService (from Story 3-5)
  - [ ] 3.4: Return preview URL or Base64 encoded content
  - [ ] 3.5: Don't save to database (temporary preview)

- [ ] **Task 4: Template Editing** (AC: 3)
  - [ ] 4.1: Add customTemplate field to NDA model (optional text)
  - [ ] 4.2: When user edits template, store in nda.customTemplate
  - [ ] 4.3: On document generation, use customTemplate if exists, else use template
  - [ ] 4.4: Custom template stored with NDA (not in rtf_templates table)

- [ ] **Task 5: Frontend - Template Selector** (AC: 1)
  - [ ] 5.1: Add template dropdown to NDA create/edit form
  - [ ] 5.2: Fetch templates for selected agency
  - [ ] 5.3: Show "Recommended" badge on suggested template
  - [ ] 5.4: Pre-select recommended template
  - [ ] 5.5: Allow user to change selection

- [ ] **Task 6: Frontend - Preview Button and Display** (AC: 2)
  - [ ] 6.1: Add "Preview RTF" button to form
  - [ ] 6.2: On click, call POST /api/ndas/:id/preview-rtf
  - [ ] 6.3: Display preview in modal or side panel
  - [ ] 6.4: Show loading state while generating
  - [ ] 6.5: Preview shows merged content (all NDA fields filled in)

- [ ] **Task 7: Frontend - Template Editor** (AC: 3)
  - [ ] 7.1: Add "Edit Template" button in preview
  - [ ] 7.2: Open rich text editor with template content
  - [ ] 7.3: User can modify content
  - [ ] 7.4: Save edited content to nda.customTemplate field
  - [ ] 7.5: Show indicator that template was customized for this NDA

- [ ] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for template recommendation logic
  - [ ] 8.2: API tests for template list endpoint
  - [ ] 8.3: API tests for preview generation
  - [ ] 8.4: Test custom template storage
  - [ ] 8.5: Component tests for template selector

## Dev Notes

### Template Recommendation Logic

```typescript
async function getRecommendedTemplate(
  agencyGroupId: string,
  ndaType?: string
): Promise<RtfTemplate> {
  // Try agency-specific template first
  const agencyTemplate = await prisma.rtfTemplate.findFirst({
    where: {
      agencyGroupId,
      isDefault: true
    }
  });

  if (agencyTemplate) return agencyTemplate;

  // Fall back to generic default
  const defaultTemplate = await prisma.rtfTemplate.findFirst({
    where: {
      agencyGroupId: null, // Generic
      isDefault: true
    }
  });

  if (!defaultTemplate) {
    throw new Error('No default template found');
  }

  return defaultTemplate;
}
```

### RTF Preview Implementation

```typescript
async function previewRtf(ndaId: string, templateId: string, userId: string) {
  // Use same generation logic as Story 3-5
  const buffer = await documentGenerationService.generateRtf(
    ndaId,
    templateId,
    userId
  );

  // Return Base64 for frontend display or temporary S3 URL
  return {
    content: buffer.toString('base64'),
    contentType: 'application/rtf',
    filename: `NDA-Preview-${Date.now()}.rtf`
  };
}
```

### Custom Template Storage

**Extend NDA Model:**
```prisma
model Nda {
  // ... existing fields
  rtfTemplateId    String?  @map("rtf_template_id")
  customTemplate   String?  @map("custom_template") @db.Text // NDA-specific edits

  rtfTemplate      RtfTemplate? @relation(fields: [rtfTemplateId], references: [id])
}
```

**Generation Priority:**
1. Use nda.customTemplate if exists (user edited)
2. Else use nda.rtfTemplateId template
3. Else use recommended template for agency

### Frontend Template Selector

```tsx
function TemplateSelector({ agencyGroupId, value, onChange }: TemplateSelectorProps) {
  const { data: templates } = useQuery({
    queryKey: ['templates', agencyGroupId],
    queryFn: () => api.get('/api/templates', {
      params: { agencyGroupId }
    }).then(res => res.data)
  });

  const recommendedTemplate = templates?.find(t => t.isRecommended);

  return (
    <div>
      <Label>RTF Template</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select template" />
        </SelectTrigger>
        <SelectContent>
          {templates?.map(template => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
              {template.isRecommended && (
                <Badge variant="secondary" className="ml-2">Recommended</Badge>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

### Preview Modal

```tsx
function RTFPreviewModal({ ndaId, templateId }: RTFPreviewModalProps) {
  const { data: preview, isLoading } = useQuery({
    queryKey: ['rtf-preview', ndaId, templateId],
    queryFn: () => api.post(`/api/ndas/${ndaId}/preview-rtf`, { templateId }).then(res => res.data),
    enabled: !!templateId
  });

  return (
    <Dialog>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>RTF Preview</DialogTitle>
        </DialogHeader>

        {isLoading && <Loader2 className="animate-spin" />}

        {preview && (
          <div className="border rounded p-4 bg-white max-h-96 overflow-y-auto">
            {/* Preview content - could be iframe, object, or download link */}
            <object
              data={`data:application/rtf;base64,${preview.content}`}
              type="application/rtf"
              className="w-full h-full"
            >
              <p>
                Preview not supported.{' '}
                <a href={`data:application/rtf;base64,${preview.content}`} download={preview.filename}>
                  Download to view
                </a>
              </p>
            </object>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleEditTemplate}>
            Edit Template
          </Button>
          <Button onClick={handleUseTemplate}>
            Use This Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Integration with Story 3-5

**Reuses:**
- documentGenerationService for preview generation
- Same template merging logic
- Same Handlebars field placeholders

**Extends:**
- Adds template selection UI
- Adds preview capability
- Adds per-NDA customization

### Project Structure Notes

**New Files:**
- `src/components/modals/RTFPreviewModal.tsx` - NEW
- `src/components/ui/TemplateSelector.tsx` - NEW

**Files to Modify:**
- `prisma/schema.prisma` - MODIFY Nda model (add rtfTemplateId, customTemplate)
- `src/server/routes/ndas.ts` - ADD preview-rtf endpoint
- `src/server/services/documentGenerationService.ts` - ADD previewRtf function
- `src/components/screens/CreateNDA.tsx` - ADD template selector

**Follows established patterns:**
- Template system from Story 3-5
- Service layer for business logic
- Modal UI pattern
- React Query for data fetching

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.13]
- [Source: Story 3-5 - RTF generation foundation]
- [Source: Story 3-4 - Template suggestions pattern]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Template selection with recommendations
- RTF preview before finalizing
- NDA-specific template customization
- Extends documentGenerationService from Story 3-5

### File List

Files to be created/modified during implementation:
- `prisma/schema.prisma` - MODIFY Nda (add rtfTemplateId, customTemplate)
- `src/components/modals/RTFPreviewModal.tsx` - NEW
- `src/components/ui/TemplateSelector.tsx` - NEW
- `src/server/routes/ndas.ts` - MODIFY (add preview endpoint)
- `src/server/services/documentGenerationService.ts` - MODIFY (add previewRtf)
- `src/components/screens/CreateNDA.tsx` - MODIFY (add template selector)
- Migration file for NDA template fields

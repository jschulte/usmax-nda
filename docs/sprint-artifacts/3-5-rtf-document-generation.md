# Story 3.5: RTF Document Generation

Status: ready-for-dev

## Story

As an **NDA user**,
I want **to generate an RTF document from template with all NDA fields merged**,
so that **I have a formatted NDA ready to send to the partner**.

## Acceptance Criteria

### AC1: Generate RTF from Template
**Given** I complete NDA form and click "Generate & Review"
**When** System generates document
**Then** Uses selected RTF template (or default if not selected)
**And** Merges fields: {{companyName}}, {{authorizedPurpose}}, {{effectiveDate}}, {{agencyOfficeName}}, etc.
**And** Generates DOCX using `docx` library → exports to RTF
**And** Document stored in S3 us-east-1 with key: `ndas/{nda_id}/{doc_id}-{filename}.rtf`
**And** S3 CRR replicates to us-west-2
**And** documents table INSERT: nda_id, filename, s3_key, document_type='Generated', uploaded_by=me
**And** audit_log records "document_generated"

### AC2: Error Handling
**Given** RTF generation fails (template error, S3 unavailable)
**When** Error occurs
**Then** User sees: "Document generation failed, please try again"
**And** Error reported to Sentry with context
**And** User can retry or upload manual RTF

### AC3: Non-USMax NDA Handling
**Given** Non-USMax NDA checkbox is checked
**When** Generating document
**Then** Behavior depends on system_config.non_usmax_skip_template setting
**And** If skip=true: No document generated, user must upload manually
**And** If skip=false: Generate from alternate template or standard

## Tasks / Subtasks

- [ ] **Task 1: RTF Template Schema** (AC: 1)
  - [ ] 1.1: Create RtfTemplate model in Prisma schema (if not exists from Epic 7)
  - [ ] 1.2: Fields: id, name, content (template with placeholders), is_default, agency_group_id
  - [ ] 1.3: Store templates in database (not filesystem)
  - [ ] 1.4: Seed at least one default template
  - [ ] 1.5: Run migration

- [ ] **Task 2: Document Generation Service** (AC: 1, 2)
  - [ ] 2.1: Create src/server/services/documentGenerationService.ts
  - [ ] 2.2: Install docx library: `npm install docx`
  - [ ] 2.3: Implement generateRtf(ndaId, templateId, userId) function
  - [ ] 2.4: Fetch NDA data with all related entities
  - [ ] 2.5: Fetch template content
  - [ ] 2.6: Merge template fields with NDA data (Handlebars or string replacement)
  - [ ] 2.7: Generate DOCX using docx library
  - [ ] 2.8: Convert DOCX to RTF format
  - [ ] 2.9: Return Buffer for upload

- [ ] **Task 3: S3 Document Storage** (AC: 1)
  - [ ] 3.1: Use s3Service from Story 4.1 (or create if not exists)
  - [ ] 3.2: Upload generated RTF to S3
  - [ ] 3.3: Key pattern: `ndas/{nda_id}/{doc_id}-{filename}.rtf`
  - [ ] 3.4: Configure S3 CRR to us-west-2
  - [ ] 3.5: Store document metadata in documents table

- [ ] **Task 4: Template Field Merging** (AC: 1)
  - [ ] 4.1: Define template placeholder format: {{fieldName}}
  - [ ] 4.2: Supported placeholders: companyName, companyCity, companyState, authorizedPurpose, effectiveDate, agencyOfficeName, etc.
  - [ ] 4.3: Date formatting: mm/dd/yyyy (legacy requirement)
  - [ ] 4.4: Handle null/optional fields (show blank or default text)
  - [ ] 4.5: Escape special RTF characters in field values

- [ ] **Task 5: Document Generation API** (AC: 1, 2)
  - [ ] 5.1: Create POST /api/ndas/:id/generate-rtf endpoint
  - [ ] 5.2: Accept { templateId } in request body (optional, use default if not provided)
  - [ ] 5.3: Apply middleware: authenticateJWT, requirePermission('nda:create'), scopeToAgencies
  - [ ] 5.4: Call documentGenerationService.generateRtf()
  - [ ] 5.5: Return document metadata (id, s3_key, filename)

- [ ] **Task 6: Error Handling and Reporting** (AC: 2)
  - [ ] 6.1: Wrap generation in try/catch
  - [ ] 6.2: Report errors to Sentry with full context
  - [ ] 6.3: Return user-friendly error messages
  - [ ] 6.4: Log generation failures to audit_log
  - [ ] 6.5: Provide retry mechanism

- [ ] **Task 7: Frontend - Generate Button** (AC: 1)
  - [ ] 7.1: Add "Generate & Review" button to NDA detail page
  - [ ] 7.2: Show loading state while generating
  - [ ] 7.3: Call POST /api/ndas/:id/generate-rtf
  - [ ] 7.4: On success, show document in documents list
  - [ ] 7.5: Offer download or preview

- [ ] **Task 8: Non-USMax NDA Handling** (AC: 3)
  - [ ] 8.1: Check nonUsmax flag before generation
  - [ ] 8.2: Load system_config.non_usmax_skip_template setting
  - [ ] 8.3: If skip=true, show message: "Non-USMax NDAs require manual upload"
  - [ ] 8.4: If skip=false, use alternate template or proceed normally

- [ ] **Task 9: Testing** (AC: All)
  - [ ] 9.1: Unit tests for documentGenerationService
  - [ ] 9.2: Test template field merging with all placeholders
  - [ ] 9.3: Test DOCX → RTF conversion
  - [ ] 9.4: Test S3 upload with mocked SDK
  - [ ] 9.5: API tests for generate-rtf endpoint
  - [ ] 9.6: Test error handling and Sentry reporting

## Dev Notes

### RTF Generation Architecture

From architecture.md:

**Approach:** Generate DOCX using `docx` library → export to RTF
- Better Node.js DOCX library support
- RTF conversion via docx library or third-party tool

**Template Engine:** Handlebars for field-merge
- Placeholders: `{{companyName}}`, `{{effectiveDate}}`, etc.
- Stored in database (rtf_templates table)

### Document Generation Service

```typescript
import { Document, Packer, Paragraph, TextRun } from 'docx';
import Handlebars from 'handlebars';

async function generateRtf(ndaId: string, templateId: string | null, userId: string) {
  // Fetch NDA with all data
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    include: {
      subagency: { include: { agencyGroup: true } },
      opportunityContact: true,
      contractsContact: true,
      relationshipContact: true
    }
  });

  if (!nda) throw new NotFoundError('NDA not found');

  // Get template
  const template = templateId
    ? await prisma.rtfTemplate.findUnique({ where: { id: templateId } })
    : await getDefaultTemplate(nda.subagency.agencyGroupId);

  if (!template) throw new Error('No template available');

  // Merge fields
  const templateCompiled = Handlebars.compile(template.content);
  const mergedContent = templateCompiled({
    companyName: nda.companyName,
    companyCity: nda.companyCity || '',
    companyState: nda.companyState || '',
    stateOfIncorporation: nda.stateOfIncorporation || '',
    authorizedPurpose: nda.authorizedPurpose,
    effectiveDate: formatDate(nda.effectiveDate),
    agencyOfficeName: nda.agencyOfficeName || '',
    agencyName: nda.subagency.agencyGroup.name,
    subagencyName: nda.subagency.name,
    // ... all other fields
  });

  // Generate DOCX
  const doc = new Document({
    sections: [{
      children: parseContentToParagraphs(mergedContent)
    }]
  });

  const docxBuffer = await Packer.toBuffer(doc);

  // Convert to RTF (or just use DOCX - validate with customer)
  const rtfBuffer = await convertToRtf(docxBuffer);

  // Upload to S3
  const filename = `NDA-${nda.displayId}-${sanitizeFilename(nda.companyName)}.rtf`;
  const s3Key = `ndas/${ndaId}/${uuidv4()}-${filename}`;

  await s3Service.uploadDocument(rtfBuffer, s3Key, {
    contentType: 'application/rtf'
  });

  // Store metadata
  const document = await prisma.document.create({
    data: {
      ndaId,
      filename,
      fileType: 'application/rtf',
      fileSizeBytes: rtfBuffer.length,
      s3Key,
      s3Region: 'us-east-1',
      documentType: 'GENERATED',
      uploadedBy: userId,
      notes: `Generated from template "${template.name}"`,
      versionNumber: await getNextVersionNumber(ndaId)
    }
  });

  // Audit log
  await auditService.log({
    action: 'document_generated',
    entityType: 'document',
    entityId: document.id,
    userId,
    metadata: { ndaId, templateId, filename }
  });

  return document;
}
```

### Template Placeholder Fields

**Available Placeholders:**
```typescript
const TEMPLATE_FIELDS = {
  companyName: 'Company legal name',
  companyCity: 'Company city',
  companyState: 'Company state (2-letter)',
  stateOfIncorporation: 'State of incorporation',
  authorizedPurpose: 'NDA authorized purpose',
  effectiveDate: 'Effective date (formatted mm/dd/yyyy)',
  agencyOfficeName: 'Agency/Office name',
  agencyName: 'Agency group name',
  subagencyName: 'Subagency name',
  usmaxPosition: 'USMax position (Prime/Sub/Teaming)',
  opportunityPocName: 'Opportunity POC full name',
  opportunityPocEmail: 'Opportunity POC email',
  relationshipPocName: 'Relationship POC full name',
  // ... all NDA fields
};
```

### S3 Storage Pattern

**Key Pattern:**
```
ndas/{nda_id}/{document_id}-{filename}.rtf
Example: ndas/abc-123-def/doc-456-ghi-NDA-1590-TechCorp.rtf
```

**Multi-Region:**
- Primary: us-east-1
- Replica: us-west-2 (automatic CRR)
- Versioning enabled (Story 4.7)

### Integration with Future Stories

**Foundation for:**
- Story 4.1: Document upload/download (uses same documents table)
- Story 3.13: Template selection (uses rtf_templates table)
- Epic 7: Template management (creates/edits templates)

**Depends on:**
- Story 3-1: NDA model and data
- Epic 7 (future): rtf_templates table (may need to create minimal version here)

### Security Considerations

**Authorization:**
- User must have nda:create permission
- User must have access to NDA's subagency
- Document is private (no public S3 access)

**Data Sanitization:**
- Escape RTF special characters in merged fields
- Validate template content (prevent injection)
- Limit template size

### Project Structure Notes

**New Files:**
- `src/server/services/documentGenerationService.ts` - NEW
- `src/server/services/s3Service.ts` - NEW (or from Story 4.1)
- `src/server/utils/rtfConverter.ts` - NEW (DOCX → RTF)

**Files to Modify:**
- `prisma/schema.prisma` - ADD RtfTemplate model (minimal), Document model (if not from Story 4.1)
- `src/server/routes/ndas.ts` - ADD POST /ndas/:id/generate-rtf
- `src/components/screens/NDADetail.tsx` - ADD generate button

**Follows established patterns:**
- Service layer for business logic
- S3 storage from architecture
- Audit logging
- Error handling with Sentry

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.5]
- [Source: docs/architecture.md#RTF Generation Decision]
- [Source: docs/architecture.md#Document Storage Architecture]
- [Source: Story 3-1 - NDA data model]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- RTF generation via docx library specified
- Handlebars template engine for field merging
- S3 multi-region storage pattern
- Document metadata tracking
- Integration with future template management (Epic 7)

### File List

Files to be created/modified during implementation:
- `prisma/schema.prisma` - ADD RtfTemplate and Document models (minimal)
- `src/server/services/documentGenerationService.ts` - NEW
- `src/server/services/s3Service.ts` - NEW
- `src/server/utils/rtfConverter.ts` - NEW
- `src/server/routes/ndas.ts` - MODIFY (add generate-rtf endpoint)
- `src/components/screens/NDADetail.tsx` - MODIFY (add generate button)
- `prisma/seed.ts` - ADD default RTF template
- Migration files for templates and documents
- `src/server/services/__tests__/documentGenerationService.test.ts` - NEW

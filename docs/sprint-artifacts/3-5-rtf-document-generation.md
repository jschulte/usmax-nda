# Story 3.5: RTF Document Generation

Status: backlog

## Story

As an **NDA user**,
I want **to generate an RTF document from template with all NDA fields merged**,
so that **I have a formatted NDA ready to send to the partner**.

## Acceptance Criteria

### AC1: Generate Document
**Given** I complete NDA form and click "Generate & Review"
**When** System generates document
**Then** Uses selected RTF template (or default if not selected)
**And** Merges fields: {{companyName}}, {{authorizedPurpose}}, {{effectiveDate}}, {{agencyOfficeName}}, etc.
**And** Generates DOCX using `docx` library → exports to RTF
**And** Document stored in S3 us-east-1 with key: `ndas/{nda_id}/{doc_id}-{filename}.rtf`
**And** S3 CRR replicates to us-west-2
**And** documents table INSERT: nda_id, filename, s3_key, document_type='Generated', uploaded_by=me
**And** audit_log records "document_generated"

### AC2: Generation Failure Handling
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

- [ ] **Task 1: Document Generation Service** (AC: 1, 2)
  - [ ] 1.1: Create `src/server/services/documentGenerationService.ts`
  - [ ] 1.2: Install and configure `docx` library
  - [ ] 1.3: Implement template field merging with Handlebars
  - [ ] 1.4: Implement DOCX generation
  - [ ] 1.5: Implement RTF export (via docx or conversion)
  - [ ] 1.6: Add error handling with Sentry reporting

- [ ] **Task 2: S3 Document Storage** (AC: 1)
  - [ ] 2.1: Create `src/server/services/s3Service.ts`
  - [ ] 2.2: Configure AWS S3 client for us-east-1
  - [ ] 2.3: Implement `uploadDocument(ndaId, file, metadata)`
  - [ ] 2.4: Generate S3 keys: `ndas/{nda_id}/{doc_id}-{filename}.rtf`
  - [ ] 2.5: Configure CRR to us-west-2 (infrastructure)

- [ ] **Task 3: Document Model & API** (AC: 1)
  - [ ] 3.1: Create Document model in Prisma schema
  - [ ] 3.2: Add `POST /api/ndas/:id/generate-document` endpoint
  - [ ] 3.3: Create document record in database
  - [ ] 3.4: Add audit logging for document_generated

- [ ] **Task 4: Non-USMax Logic** (AC: 3)
  - [ ] 4.1: Add system_config table for settings
  - [ ] 4.2: Implement non_usmax_skip_template check
  - [ ] 4.3: Support alternate template selection

- [ ] **Task 5: Testing** (AC: All)
  - [ ] 5.1: Unit tests for document generation
  - [ ] 5.2: Mock S3 uploads with aws-sdk-client-mock
  - [ ] 5.3: Test field merging with sample templates
  - [ ] 5.4: Test error handling scenarios

## Dev Notes

### Document Schema

```prisma
model Document {
  id            String       @id @default(uuid())
  ndaId         String
  nda           Nda          @relation(fields: [ndaId], references: [id])
  filename      String
  s3Key         String
  documentType  DocumentType
  uploadedById  String
  uploadedBy    Contact      @relation(fields: [uploadedById], references: [id])
  uploadedAt    DateTime     @default(now())

  @@index([ndaId])
}

enum DocumentType {
  GENERATED
  UPLOADED
  FULLY_EXECUTED
}
```

### Template Merging

```typescript
import Handlebars from 'handlebars';

const template = Handlebars.compile(templateContent);
const merged = template({
  companyName: nda.companyName,
  authorizedPurpose: nda.authorizedPurpose,
  effectiveDate: formatDate(nda.effectiveDate),
  agencyOfficeName: nda.agencyOfficeName,
  // ... all NDA fields
});
```

### S3 Key Structure

```
ndas/
  {nda_id}/
    {doc_id}-generated-nda.rtf
    {doc_id}-signed-nda.pdf
    {doc_id}-fully-executed.pdf
```

## Dependencies

- Story 3.1: Create NDA with Basic Form
- AWS S3 bucket with CRR configured (infrastructure)
- RTF templates seeded in database

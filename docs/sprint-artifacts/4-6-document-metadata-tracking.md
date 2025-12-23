# Story 4.6: Document Metadata Tracking

Status: ready-for-dev

## Story

As a **system**,
I want **to track comprehensive metadata for every document**,
so that **audit trail and version history are complete**.

## Acceptance Criteria

### AC1: Database Metadata Completeness
**Given** Any document upload
**When** Stored in database
**Then** documents table includes:
- id (UUID)
- nda_id (FK)
- filename
- file_type
- file_size_bytes
- s3_key
- s3_region
- document_type ('Generated'/'Uploaded'/'Fully Executed')
- is_fully_executed (boolean)
- uploaded_by (FK to contact)
- uploaded_at (timestamp)
- notes (e.g., "Generated from Template", "Uploaded by Kelly Davidson")
- version_number (incremental)

### AC2: S3 Object Metadata
**And** S3 object metadata includes:
- content-type
- uploaded-by (user ID)
- upload-timestamp

## Tasks / Subtasks

- [ ] **Task 1: Prisma Schema Validation** (AC: 1)
  - [ ] 1.1: Verify Document model includes all required fields (from Story 4.1)
  - [ ] 1.2: Verify all fields have appropriate types and constraints
  - [ ] 1.3: Verify foreign keys configured correctly (nda_id, uploaded_by)
  - [ ] 1.4: Verify indexes on nda_id and uploaded_at for query performance
  - [ ] 1.5: Ensure migration exists for Document model

- [ ] **Task 2: Document Service - Metadata Population** (AC: 1)
  - [ ] 2.1: Review documentService.uploadDocument() for metadata completeness
  - [ ] 2.2: Ensure all required fields populated on document creation
  - [ ] 2.3: Implement version_number auto-increment logic per NDA
  - [ ] 2.4: Populate notes field based on document type:
    - Generated: "Generated from template {templateName}"
    - Uploaded: "Uploaded by {userName}"
    - Fully Executed: "Marked as fully executed by {userName}"
  - [ ] 2.5: Capture file_size_bytes from uploaded file
  - [ ] 2.6: Capture file_type (MIME type) from uploaded file

- [ ] **Task 3: S3 Service - Object Metadata Tagging** (AC: 2)
  - [ ] 3.1: Extend s3Service.uploadDocument() to include S3 object metadata
  - [ ] 3.2: Add ContentType to PutObjectCommand
  - [ ] 3.3: Add Metadata tags to S3 object:
    - uploaded-by: userId
    - upload-timestamp: ISO 8601 timestamp
    - nda-id: ndaId (for S3-side correlation)
  - [ ] 3.4: Ensure metadata replicates to us-west-2 via CRR

- [ ] **Task 4: Version Number Auto-Increment** (AC: 1)
  - [ ] 4.1: Create helper function `getNextVersionNumber(ndaId)`
  - [ ] 4.2: Query max version_number for NDA
  - [ ] 4.3: Return max + 1 (or 1 if no documents)
  - [ ] 4.4: Use in Prisma create transaction to avoid race conditions

- [ ] **Task 5: Notes Auto-Generation** (AC: 1)
  - [ ] 5.1: Create `generateDocumentNotes(documentType, context)` helper
  - [ ] 5.2: For GENERATED: Include template name if available
  - [ ] 5.3: For UPLOADED: Include uploader name and purpose
  - [ ] 5.4: For FULLY_EXECUTED: Include execution context
  - [ ] 5.5: Ensure notes are human-readable and informative

- [ ] **Task 6: Metadata Validation** (AC: 1, 2)
  - [ ] 6.1: Add database constraints (NOT NULL for required fields)
  - [ ] 6.2: Add CHECK constraint for file_size_bytes > 0
  - [ ] 6.3: Validate s3_region is 'us-east-1' or 'us-west-2'
  - [ ] 6.4: Validate document_type enum values
  - [ ] 6.5: Ensure uploaded_at defaults to current timestamp

- [ ] **Task 7: API Response - Complete Metadata** (AC: 1)
  - [ ] 7.1: Ensure GET /api/ndas/:id/documents returns all metadata fields
  - [ ] 7.2: Include uploader details (name, email) via Prisma include
  - [ ] 7.3: Format response for frontend consumption
  - [ ] 7.4: Exclude internal fields (s3_key in some contexts for security)

- [ ] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for getNextVersionNumber() helper
  - [ ] 8.2: Unit tests for generateDocumentNotes() helper
  - [ ] 8.3: Unit tests for S3 metadata tagging
  - [ ] 8.4: Integration tests verifying all metadata fields populated
  - [ ] 8.5: Database constraint tests (NOT NULL violations, etc.)

## Dev Notes

### Complete Document Metadata Schema

**Database Fields (Prisma):**
```prisma
model Document {
  id                String       @id @default(uuid())
  ndaId             String       @map("nda_id")
  filename          String       @db.VarChar(255)
  fileType          String       @map("file_type") @db.VarChar(100) // MIME type
  fileSizeBytes     Int          @map("file_size_bytes") // CHECK > 0
  s3Key             String       @map("s3_key") @db.VarChar(500) // S3 object key
  s3Region          String       @map("s3_region") @db.VarChar(20) @default("us-east-1")
  documentType      DocumentType @map("document_type")
  isFullyExecuted   Boolean      @map("is_fully_executed") @default(false)
  uploadedBy        String       @map("uploaded_by")
  uploadedAt        DateTime     @map("uploaded_at") @default(now())
  notes             String?      @db.Text // Optional descriptive notes
  versionNumber     Int          @map("version_number") // Auto-increment per NDA

  nda               Nda          @relation(fields: [ndaId], references: [id], onDelete: Cascade)
  uploader          Contact      @relation(fields: [uploadedBy], references: [id], onDelete: Restrict)

  @@index([ndaId, uploadedAt])
  @@index([ndaId, versionNumber])
  @@map("documents")
}

enum DocumentType {
  GENERATED        // System-generated RTF from template
  UPLOADED         // User-uploaded revision/document
  FULLY_EXECUTED   // Final signed NDA
}
```

### S3 Object Metadata

**PutObject with Metadata:**
```typescript
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

async function uploadDocument(file: Buffer, metadata: DocumentMetadata) {
  const s3Client = new S3Client({ region: 'us-east-1' });

  const command = new PutObjectCommand({
    Bucket: process.env.S3_DOCUMENT_BUCKET,
    Key: metadata.s3Key,
    Body: file,
    ContentType: metadata.fileType, // MIME type
    Metadata: {
      'uploaded-by': metadata.uploadedBy, // User ID
      'upload-timestamp': new Date().toISOString(),
      'nda-id': metadata.ndaId,
      'document-type': metadata.documentType,
      'version-number': String(metadata.versionNumber)
    },
    ServerSideEncryption: 'AES256', // SSE-S3
    StorageClass: 'STANDARD' // Or INTELLIGENT_TIERING for cost optimization
  });

  await s3Client.send(command);
}
```

**Metadata Benefits:**
- Enables S3-side filtering and searching
- Provides context if database unavailable
- Useful for S3 lifecycle policies
- Replicates to us-west-2 via CRR

### Version Number Auto-Increment

**Implementation:**
```typescript
async function getNextVersionNumber(ndaId: string): Promise<number> {
  const maxVersion = await prisma.document.aggregate({
    where: { ndaId },
    _max: { versionNumber: true }
  });

  return (maxVersion._max.versionNumber || 0) + 1;
}

// Usage in upload
const versionNumber = await getNextVersionNumber(ndaId);

const document = await prisma.document.create({
  data: {
    // ... other fields
    versionNumber
  }
});
```

**Race Condition Handling:**
- Use Prisma transaction for version number calculation + document creation
- Or use database sequence/auto-increment
- Ensure atomic operation to prevent duplicate version numbers

### Notes Auto-Generation Logic

**Contextual Notes:**
```typescript
function generateDocumentNotes(
  documentType: DocumentType,
  context: {
    uploaderName?: string;
    templateName?: string;
    action?: string;
  }
): string {
  switch (documentType) {
    case 'GENERATED':
      return `Generated from template "${context.templateName || 'Default Template'}"`;

    case 'UPLOADED':
      return `Uploaded by ${context.uploaderName}`;

    case 'FULLY_EXECUTED':
      return `Marked as fully executed by ${context.uploaderName} on ${formatDate(new Date())}`;

    default:
      return 'Document uploaded';
  }
}
```

### Metadata Display in UI

**Document Table Tooltip:**
```tsx
<Tooltip>
  <TooltipTrigger>
    <span>{doc.filename}</span>
  </TooltipTrigger>
  <TooltipContent>
    <div className="text-sm space-y-1">
      <p><strong>Notes:</strong> {doc.notes || 'No notes'}</p>
      <p><strong>Version:</strong> {doc.versionNumber}</p>
      <p><strong>Size:</strong> {formatFileSize(doc.fileSizeBytes)}</p>
      <p><strong>Uploaded:</strong> {formatDate(doc.uploadedAt)}</p>
      <p><strong>By:</strong> {doc.uploadedBy.name}</p>
      {doc.isFullyExecuted && (
        <p className="text-green-600 font-semibold">✓ Fully Executed</p>
      )}
    </div>
  </TooltipContent>
</Tooltip>
```

### Audit Trail Integration

**Document Metadata in Audit Logs:**
```typescript
await auditService.log({
  action: 'document_uploaded',
  entityType: 'document',
  entityId: document.id,
  userId: uploadedBy,
  metadata: {
    ndaId,
    filename: document.filename,
    fileType: document.fileType,
    fileSizeBytes: document.fileSizeBytes,
    documentType: document.documentType,
    versionNumber: document.versionNumber,
    s3Key: document.s3Key,
    s3Region: document.s3Region
  }
});
```

### Database Constraints

**Ensure Data Integrity:**
```sql
-- Constraints to add via Prisma migration
ALTER TABLE documents
  ADD CONSTRAINT file_size_positive CHECK (file_size_bytes > 0);

ALTER TABLE documents
  ADD CONSTRAINT valid_s3_region CHECK (s3_region IN ('us-east-1', 'us-west-2'));

-- Indexes for performance
CREATE INDEX idx_documents_nda_uploaded ON documents(nda_id, uploaded_at DESC);
CREATE INDEX idx_documents_nda_version ON documents(nda_id, version_number);
CREATE INDEX idx_documents_uploader ON documents(uploaded_by);
```

### Metadata Completeness Checklist

**For Every Document Upload:**
- ✅ Unique ID generated (UUID)
- ✅ NDA association (foreign key)
- ✅ Original filename preserved
- ✅ MIME type captured
- ✅ File size in bytes
- ✅ S3 key and region stored
- ✅ Document type classified
- ✅ Fully executed flag
- ✅ Uploader tracked
- ✅ Upload timestamp
- ✅ Contextual notes
- ✅ Version number assigned
- ✅ S3 object metadata tags

### Integration with Other Stories

**Foundation for:**
- Story 4.1: Upload uses this metadata structure
- Story 4.2: Fully executed flag tracking
- Story 4.3: S3 key used for download URLs
- Story 4.4: Metadata displayed in version history
- Story 4.5: Metadata used for ZIP creation
- Story 4.7: Metadata enables indefinite preservation

**Integrates with:**
- Story 6.3: Document download tracking uses metadata
- Story 6.2: Field change tracking (if document re-uploaded)

### Security Considerations

**Metadata Protection:**
- S3 keys not exposed in public API responses (security through obscurity)
- User IDs in metadata (not names) for privacy
- Notes field sanitized to prevent XSS
- MIME type validation to prevent content-type spoofing

**Audit Completeness:**
- Every metadata field change logged
- S3 metadata immutable (object versioning)
- Database metadata versioned via document versions

### Project Structure Notes

**Files Already Created in Story 4.1:**
- `prisma/schema.prisma` - Document model with all metadata fields
- `src/server/services/documentService.ts` - Metadata population logic
- `src/server/services/s3Service.ts` - S3 upload with metadata

**Files to Verify/Extend:**
- Ensure all metadata fields properly populated
- Add missing S3 object metadata tags
- Implement version number auto-increment
- Add notes auto-generation

**This is a validation/completion story** - ensures infrastructure from Stories 4.1-4.2 is complete.

### References

- [Source: docs/epics.md#Epic 4: Document Management & Execution - Story 4.6]
- [Source: docs/architecture.md#Database Schema & Data Model - documents table]
- [Source: Story 4.1 - Document model foundation]
- [Source: Story 4.2 - Fully executed metadata]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Infrastructure/validation story for document metadata completeness
- Builds on Stories 4.1-4.2 (document model and upload)
- Ensures all 13 metadata fields properly tracked
- S3 object metadata tagging specified
- Version number auto-increment logic defined

### File List

Files to validate/extend during implementation:
- `prisma/schema.prisma` - VERIFY Document model completeness
- `src/server/services/documentService.ts` - VERIFY metadata population
- `src/server/services/s3Service.ts` - MODIFY (add S3 object metadata tags)
- `src/server/utils/versionNumberHelper.ts` - NEW (auto-increment logic)
- `src/server/utils/documentNotesGenerator.ts` - NEW (notes auto-generation)
- `src/server/services/__tests__/documentService.test.ts` - MODIFY (validate metadata)
- Migration file - ADD database constraints (if not already present)

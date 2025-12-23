# Story 4.1: Document Upload with Drag-Drop

Status: ready-for-dev

## Story

As an **NDA user**,
I want **to upload documents to an NDA via drag-drop or file picker**,
so that **I can easily add fully executed PDFs or revised RTFs**.

## Acceptance Criteria

### AC1: Drag-Drop Upload
**Given** I'm viewing NDA detail page
**When** I drag PDF file onto upload zone
**Then** File uploads to S3 us-east-1: `ndas/{nda_id}/{new_doc_id}-{filename}.pdf`
**And** S3 CRR replicates to us-west-2
**And** documents table INSERT with metadata (filename, s3_key, uploaded_by=me, uploaded_at=now, document_type='Uploaded')
**And** Document appears in NDA's document list
**And** audit_log records "document_uploaded"
**And** Toast shows: "Document uploaded ✓"

### AC2: Error Handling
**Given** Upload fails (S3 error, network issue)
**When** Error occurs
**Then** AWS SDK retries automatically (3 attempts)
**And** If all fail, user sees: "Upload failed, please try again"
**And** Error reported to Sentry

### AC3: File Type Validation
**Given** File type validation
**When** User uploads .docx file
**Then** Accepted (allowed types: RTF, PDF, DOCX)

**Given** User uploads .exe file
**When** Validation runs
**Then** Rejected: "Only RTF and PDF files allowed"

## Tasks / Subtasks

- [ ] **Task 1: Database Schema - Document Table** (AC: 1)
  - [ ] 1.1: Extend Prisma schema with Document model
  - [ ] 1.2: Add fields: id (UUID), nda_id (FK), filename, file_type, file_size_bytes, s3_key, s3_region
  - [ ] 1.3: Add fields: document_type enum ('Generated'/'Uploaded'/'Fully Executed'), is_fully_executed (boolean)
  - [ ] 1.4: Add fields: uploaded_by (FK to contact), uploaded_at (timestamp), notes (text)
  - [ ] 1.5: Add version_number (integer, auto-increment per NDA)
  - [ ] 1.6: Create migration and run prisma generate

- [ ] **Task 2: S3 Service Layer** (AC: 1, 2)
  - [ ] 2.1: Create `src/server/services/s3Service.ts`
  - [ ] 2.2: Implement `uploadDocument(file, ndaId)` - uploads to S3 with key pattern
  - [ ] 2.3: Configure S3 client with retry logic (3 attempts)
  - [ ] 2.4: Implement error handling with Sentry reporting
  - [ ] 2.5: Return S3 key, region, and metadata

- [ ] **Task 3: Document Service Layer** (AC: 1, 2, 3)
  - [ ] 3.1: Create `src/server/services/documentService.ts`
  - [ ] 3.2: Implement `uploadDocument(ndaId, file, uploadedBy)` orchestration
  - [ ] 3.3: Call s3Service to upload file
  - [ ] 3.4: Store metadata in documents table
  - [ ] 3.5: Record audit log entry ("document_uploaded")
  - [ ] 3.6: Implement row-level security (verify user has access to NDA)

- [ ] **Task 4: File Upload Middleware** (AC: 3)
  - [ ] 4.1: Install multer for Express file uploads
  - [ ] 4.2: Create `src/server/middleware/fileUpload.ts`
  - [ ] 4.3: Implement file type validation (RTF, PDF, DOCX only)
  - [ ] 4.4: Implement file size limits (e.g., 10MB max)
  - [ ] 4.5: Reject invalid file types with clear error message

- [ ] **Task 5: Document Upload API** (AC: 1, 2, 3)
  - [ ] 5.1: Create `POST /api/ndas/:id/documents` endpoint
  - [ ] 5.2: Apply middleware: authenticateJWT, checkPermissions('nda:upload_document'), fileUpload
  - [ ] 5.3: Call documentService.uploadDocument()
  - [ ] 5.4: Return 201 with document metadata
  - [ ] 5.5: Handle errors (400 for validation, 500 for S3 failures)

- [ ] **Task 6: Frontend - Drag-Drop Component** (AC: 1)
  - [ ] 6.1: Install react-dropzone library
  - [ ] 6.2: Create `src/components/ui/FileUpload.tsx` component
  - [ ] 6.3: Implement drag-drop zone with visual feedback
  - [ ] 6.4: Implement file picker fallback (click to browse)
  - [ ] 6.5: Show upload progress indicator
  - [ ] 6.6: Display success/error toast notifications

- [ ] **Task 7: Frontend - Document List Integration** (AC: 1)
  - [ ] 7.1: Add document upload section to NDA detail page
  - [ ] 7.2: Integrate FileUpload component
  - [ ] 7.3: Call POST /api/ndas/:id/documents on file drop
  - [ ] 7.4: Refresh document list after successful upload
  - [ ] 7.5: Handle errors with user-friendly messages

- [ ] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for s3Service (mocked S3 SDK)
  - [ ] 8.2: Unit tests for documentService
  - [ ] 8.3: Unit tests for fileUpload middleware (type validation)
  - [ ] 8.4: API integration tests for document upload endpoint
  - [ ] 8.5: E2E tests for drag-drop upload flow with Playwright

## Dev Notes

### Technical Stack for Document Upload

**Backend:**
- AWS SDK v3 (@aws-sdk/client-s3) - Modern modular SDK
- multer - Express multipart/form-data middleware
- Express route with file upload middleware

**Frontend:**
- react-dropzone - Drag-drop file upload React hook
- Axios for file upload with progress tracking
- React Query for upload mutation with optimistic updates

### S3 Configuration Requirements

**Bucket Setup:**
```typescript
// S3 bucket structure
Bucket: usmax-nda-documents-{env}
Regions:
  - Primary: us-east-1
  - Replica: us-west-2 (CRR enabled)
Versioning: Enabled
Encryption: AES-256 (SSE-S3)
Lifecycle: Optional Glacier transition after 6 years
```

**Key Pattern:**
```
ndas/{nda_id}/{document_id}-{filename}.{ext}
Example: ndas/a1b2c3d4-e5f6/doc789-TechCorp-NDA-Signed.pdf
```

### File Upload Flow

```
1. User drops file on dropzone
2. Frontend validates file type client-side
3. POST /api/ndas/:id/documents with multipart/form-data
4. multer middleware receives file
5. Validate file type server-side (mimetype + extension)
6. s3Service uploads to S3 with retry (3 attempts)
7. documentService stores metadata in PostgreSQL
8. auditService logs document_uploaded action
9. Return document metadata to frontend
10. Frontend refreshes document list
11. Toast notification shows success
```

### Error Scenarios

**S3 Upload Failures:**
- Network timeout → Retry with exponential backoff
- Access denied → Check IAM permissions, report to Sentry
- Bucket not found → Configuration error, fail fast

**Validation Failures:**
- Invalid file type → 400 Bad Request with clear message
- File too large → 413 Payload Too Large
- Missing NDA → 404 Not Found

### Security Considerations

**Authorization:**
- User must have `nda:upload_document` permission
- User must have access to NDA's subagency (row-level security)
- Verify NDA exists and user authorized before allowing upload

**File Security:**
- Scan uploaded file types (prevent .exe, .sh, etc.)
- Generate UUID-based S3 keys (prevent path traversal)
- Private S3 bucket (no public access)
- Pre-signed URLs only for authorized downloads

### Database Schema Reference

```prisma
model Document {
  id                String   @id @default(uuid())
  ndaId             String   @map("nda_id")
  filename          String
  fileType          String   @map("file_type")
  fileSizeBytes     Int      @map("file_size_bytes")
  s3Key             String   @map("s3_key")
  s3Region          String   @map("s3_region") @default("us-east-1")
  documentType      DocumentType @map("document_type")
  isFullyExecuted   Boolean  @map("is_fully_executed") @default(false)
  uploadedBy        String   @map("uploaded_by")
  uploadedAt        DateTime @map("uploaded_at") @default(now())
  notes             String?
  versionNumber     Int      @map("version_number")

  nda               Nda      @relation(fields: [ndaId], references: [id], onDelete: Cascade)
  uploader          Contact  @relation(fields: [uploadedBy], references: [id], onDelete: Restrict)

  @@map("documents")
}

enum DocumentType {
  GENERATED
  UPLOADED
  FULLY_EXECUTED
}
```

### Project Structure Notes

**File Locations:**
- Service: `src/server/services/documentService.ts`
- S3 Service: `src/server/services/s3Service.ts`
- Routes: `src/server/routes/ndas.ts` (add document endpoints)
- Middleware: `src/server/middleware/fileUpload.ts`
- Frontend Component: `src/components/ui/FileUpload.tsx`
- Frontend Page: `src/components/screens/NDADetail.tsx` (integrate upload)

**Follows established patterns:**
- Service layer handles business logic
- Routes are thin controllers
- Middleware for cross-cutting concerns
- Prisma for database operations
- Audit logging via auditService

### References

- [Source: docs/epics.md#Epic 4: Document Management & Execution - Story 4.1]
- [Source: docs/architecture.md#Document Storage Architecture]
- [Source: docs/architecture.md#API Architecture - Nested Resources]
- [Source: docs/architecture.md#Database Schema & Data Model - documents table]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Comprehensive analysis of architecture constraints completed
- All acceptance criteria extracted from epics.md
- Tasks broken down following established project patterns
- Security, error handling, and audit requirements included

### File List

Files to be created/modified during implementation:
- `prisma/schema.prisma` - Add Document model
- `src/server/services/s3Service.ts` - NEW
- `src/server/services/documentService.ts` - NEW
- `src/server/middleware/fileUpload.ts` - NEW
- `src/server/routes/ndas.ts` - Add document endpoints
- `src/components/ui/FileUpload.tsx` - NEW
- `src/components/screens/NDADetail.tsx` - Integrate upload
- `src/server/services/__tests__/documentService.test.ts` - NEW
- `src/server/routes/__tests__/documents.test.ts` - NEW

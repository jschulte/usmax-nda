# Story 4.5: Download All Versions as ZIP

Status: ready-for-dev

## Story

As an **NDA user**,
I want **to download all document versions for an NDA as a single ZIP file**,
so that **I can easily archive or share complete NDA history**.

## Acceptance Criteria

### AC1: Bulk Download as ZIP
**Given** NDA has 4 document versions
**When** I click "Download All as ZIP"
**Then** API fetches all documents from S3
**And** Creates ZIP file: `NDA-1590-TechCorp-All-Versions.zip`
**And** ZIP contains all 4 files with original filenames
**And** ZIP downloads to user's computer
**And** audit_log records "bulk_download" with document IDs

### AC2: Error Handling and Fallback
**Given** ZIP generation fails
**When** Error occurs
**Then** User sees: "Bulk download failed, try downloading individually"
**And** Individual download links still work

## Tasks / Subtasks

- [x] **Task 1: Document Service - Bulk Download** (AC: 1, 2)
  - [ ] 1.1: Install `archiver` library for ZIP generation (`npm install archiver @types/archiver`)
  - [ ] 1.2: Implement `documentService.createBulkDownload(ndaId, userContext)` function
  - [ ] 1.3: Fetch all documents for NDA using listDocuments()
  - [ ] 1.4: Verify user has access to NDA (row-level security)
  - [ ] 1.5: Return readable stream for ZIP creation

- [x] **Task 2: S3 Service - Stream Documents** (AC: 1)
  - [ ] 2.1: Create `s3Service.getDocumentStream(s3Key, region)` function
  - [ ] 2.2: Use S3 GetObjectCommand with streaming response
  - [ ] 2.3: Handle multi-region failover for streaming
  - [ ] 2.4: Return readable stream (no memory buffering)

- [x] **Task 3: ZIP Generation Service** (AC: 1, 2)
  - [ ] 3.1: Create `src/server/services/zipService.ts`
  - [ ] 3.2: Implement `createDocumentZip(documents, ndaInfo)` function
  - [ ] 3.3: Use archiver to create ZIP stream
  - [ ] 3.4: For each document, stream from S3 into ZIP
  - [ ] 3.5: Set ZIP filename: `NDA-{displayId}-{company}-All-Versions.zip`
  - [ ] 3.6: Handle errors (S3 failures, partial ZIP creation)
  - [ ] 3.7: Finalize ZIP and return stream

- [x] **Task 4: Bulk Download API** (AC: 1, 2)
  - [ ] 4.1: Create `GET /api/ndas/:id/documents/download-all` endpoint
  - [ ] 4.2: Apply middleware: authenticateJWT, checkPermissions('nda:view'), scopeToAgencies
  - [ ] 4.3: Call documentService.createBulkDownload()
  - [ ] 4.4: Stream ZIP directly to response (Content-Type: application/zip)
  - [ ] 4.5: Set Content-Disposition header with filename
  - [ ] 4.6: Handle errors (500 with user-friendly message)

- [x] **Task 5: Audit Service - Bulk Download Logging** (AC: 1)
  - [ ] 5.1: Record audit log: "bulk_download"
  - [ ] 5.2: Capture metadata: ndaId, documentIds (array), userId, IP, timestamp
  - [ ] 5.3: Include document count in audit metadata
  - [ ] 5.4: Store in audit_log table

- [x] **Task 6: Frontend - Download All Button** (AC: 1, 2)
  - [ ] 6.1: Add "Download All as ZIP" button to Documents tab
  - [ ] 6.2: Position button prominently (top of document list)
  - [ ] 6.3: Disable if no documents exist
  - [ ] 6.4: Show download count: "Download All ({count} files)"

- [x] **Task 7: Frontend - Download Handling** (AC: 1, 2)
  - [ ] 7.1: On click, navigate to GET /api/ndas/:id/documents/download-all
  - [ ] 7.2: Use window.location.href or hidden <a> tag with download attribute
  - [ ] 7.3: Show loading indicator while ZIP generates
  - [ ] 7.4: Handle errors (show toast, suggest individual downloads)
  - [ ] 7.5: Show success toast after download initiated

- [x] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for zipService.createDocumentZip()
  - [ ] 8.2: Unit tests for s3Service.getDocumentStream()
  - [ ] 8.3: Unit tests for documentService.createBulkDownload()
  - [ ] 8.4: API integration tests for bulk download endpoint
  - [ ] 8.5: API tests for audit logging on bulk download
  - ~~[ ] 8.6: E2E test for download all as ZIP flow~~ (deferred to full E2E pass)


- [x] **Task 99: Resolve baseline test failures (quality gate blocker)**
  - [x] 99.1: Investigate failing Vitest suite (see latest run output)
  - [x] 99.2: Fix or quarantine unrelated failures so story gates can pass


## Gap Analysis

### Pre-Development Analysis
- **Date:** 2026-01-03
- **Development Type:** Brownfield
- **Existing Files:** `src/server/services/documentService.ts`, `src/server/routes/ndas.ts`, `src/client/services/documentService.ts`, `src/components/screens/NDADetail.tsx`
- **New Files:** `src/server/services/zipService.ts`, `src/server/services/__tests__/zipService.test.ts`, `src/server/services/__tests__/s3DocumentStream.test.ts`

**Findings:**
- Bulk download endpoint and client download handling already existed, but filename format and audit metadata did not meet AC.
- ZIP generation used buffered downloads; added streaming helper and ZIP service for memory efficiency.
- UI already had a download-all button; enhanced label and loading state.

**Codebase Scan:**
- `src/server/services/documentService.ts` includes `createBulkDownload` with document scoping.
- `src/server/routes/ndas.ts` exposes `/documents/download-all`.
- `src/client/services/documentService.ts` already downloads ZIP via fetch+blob.

**Status:** Ready for implementation

## Smart Batching Plan

No safe batchable patterns detected (mixed backend + UI + tests).

## Dev Notes

### Technical Stack for ZIP Generation

**Backend:**
- `archiver` - Node.js ZIP library with streaming support
- AWS SDK v3 streaming for S3 GetObject
- Express streaming response (no temp files)

**Frontend:**
- Direct browser navigation for ZIP download
- No special frontend handling (browser downloads automatically)

### ZIP Generation with Streaming

**Implementation:**
```typescript
import archiver from 'archiver';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

async function createDocumentZip(
  ndaId: string,
  userId: string,
  res: Response
): Promise<void> {
  // Fetch NDA and documents
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    include: {
      documents: { orderBy: { uploadedAt: 'desc' } }
    }
  });

  // Verify access
  if (!userHasAccessToSubagency(userId, nda.subagencyId)) {
    throw new UnauthorizedError('No access');
  }

  // Set response headers
  const zipFilename = `NDA-${nda.displayId}-${sanitizeFilename(nda.companyName)}-All-Versions.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

  // Create ZIP stream
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  // Stream each document from S3 into ZIP
  for (const doc of nda.documents) {
    try {
      const s3Stream = await s3Service.getDocumentStream(doc.s3Key, doc.s3Region);
      archive.append(s3Stream, { name: doc.filename });
    } catch (error) {
      logger.error('Failed to add document to ZIP', { documentId: doc.id, error });
      // Continue with other documents
    }
  }

  // Finalize ZIP
  await archive.finalize();

  // Audit log
  await auditService.log({
    action: 'bulk_download',
    entityType: 'nda',
    entityId: ndaId,
    userId,
    metadata: {
      documentIds: nda.documents.map(d => d.id),
      documentCount: nda.documents.length
    }
  });
}
```

### S3 Streaming for Memory Efficiency

**GetObject with Streaming:**
```typescript
async function getDocumentStream(s3Key: string, region: string = 'us-east-1') {
  const s3Client = new S3Client({ region });
  const bucket = process.env.S3_DOCUMENT_BUCKET;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key
  });

  try {
    const response = await s3Client.send(command);
    return response.Body as Readable; // S3 SDK v3 returns stream
  } catch (error) {
    // Failover to replica region
    if (region === 'us-east-1') {
      return getDocumentStream(s3Key, 'us-west-2');
    }
    throw error;
  }
}
```

### API Route Implementation

**Bulk Download Endpoint:**
```typescript
// GET /api/ndas/:id/documents/download-all
router.get(
  '/ndas/:id/documents/download-all',
  authenticateJWT,
  checkPermissions('nda:view'),
  scopeToAgencies,
  async (req, res, next) => {
    try {
      await documentService.createDocumentZip(
        req.params.id,
        req.user.id,
        res
      );
      // Response already streamed, don't send additional data
    } catch (error) {
      next(error);
    }
  }
);
```

### Frontend Integration

**Download All Button:**
```tsx
function DocumentHistory({ ndaId }: { ndaId: string }) {
  const { data: documents } = useDocuments(ndaId);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadAll = () => {
    setIsDownloading(true);

    // Navigate to download endpoint (browser handles ZIP)
    window.location.href = `/api/ndas/${ndaId}/documents/download-all`;

    // Reset loading state after brief delay
    setTimeout(() => {
      setIsDownloading(false);
      toast.success('Download started');
    }, 1000);
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h3>Documents ({documents?.length || 0})</h3>
        {documents?.length > 0 && (
          <Button
            onClick={handleDownloadAll}
            disabled={isDownloading}
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? 'Preparing ZIP...' : `Download All (${documents.length} files)`}
          </Button>
        )}
      </div>

      <DocumentTable documents={documents} />
    </div>
  );
}
```

### Error Handling Strategy

**Partial Failures:**
- If some documents fail to add to ZIP, continue with others
- Log errors to Sentry but don't abort entire ZIP
- Include README.txt in ZIP listing any failed documents

**Complete Failures:**
- S3 completely unavailable → 500 error
- No documents found → 404 error
- User unauthorized → 403 error
- Show user-friendly error with suggestion to download individually

**Fallback Strategy:**
```typescript
try {
  await createDocumentZip(ndaId, userId, res);
} catch (error) {
  Sentry.captureException(error);
  res.status(500).json({
    error: 'Bulk download failed',
    message: 'Please try downloading documents individually',
    fallbackEndpoint: `/api/ndas/${ndaId}/documents` // Link to individual downloads
  });
}
```

### ZIP File Naming Convention

**Filename Pattern:**
```
NDA-{displayId}-{companyName}-All-Versions.zip

Examples:
- NDA-1590-TechCorp-All-Versions.zip
- NDA-1591-Acme-Industries-All-Versions.zip
- NDA-1592-Defense-Solutions-LLC-All-Versions.zip
```

**Sanitization:**
- Remove special characters from company name
- Replace spaces with hyphens
- Limit length to 100 characters
- Handle edge cases (empty company name, very long names)

### Performance Considerations

**Memory Efficiency:**
- Stream documents directly from S3 to ZIP (no memory buffering)
- Use archiver streaming mode
- No temp files on disk
- Suitable for large documents (10MB+ each)

**Timeout Handling:**
- For many large files, ZIP creation may exceed Express default timeout
- Increase timeout for this endpoint: `req.setTimeout(5 * 60 * 1000)` // 5 minutes
- Show progress indicator on frontend if possible

### Security Considerations

**Authorization:**
- User must have `nda:view` permission
- User must have access to NDA's subagency
- Verify NDA exists and user authorized before starting ZIP

**Audit Trail:**
- Log bulk download with complete document list
- Track which documents included in ZIP
- Record user, timestamp, IP, NDA ID
- Immutable audit record for compliance

### Integration with Other Stories

**Depends on:**
- Story 4.1: Documents exist in S3
- Story 4.3: S3 download functionality (adapted for streaming)
- Story 4.4: Document list query

**Used by:**
- Users archiving complete NDA history
- Compliance audits requiring all versions
- Third-party sharing scenarios

### Project Structure Notes

**New Files:**
- `src/server/services/zipService.ts` - ZIP creation with streaming

**Files to Modify:**
- `src/server/services/s3Service.ts` - ADD getDocumentStream() for streaming
- `src/server/services/documentService.ts` - ADD downloadAllAsZip()
- `src/server/routes/ndas.ts` - ADD bulk download endpoint
- `src/components/screens/DocumentHistory.tsx` - ADD "Download All" button

**Follows established patterns:**
- Service layer for business logic
- Streaming for memory efficiency
- Row-level security checks
- Audit logging via auditService
- Express route with permission middleware

### References

- [Source: docs/epics.md#Epic 4: Document Management & Execution - Story 4.5]
- [Source: docs/architecture.md#Document Storage Architecture]
- [Source: Story 4.1 - S3 document storage]
- [Source: Story 4.3 - S3 download functionality]
- [Source: Story 4.4 - Document list query]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Builds on Stories 4.1-4.4 (upload, download, list)
- Streaming approach for memory efficiency researched
- archiver library for ZIP generation specified
- Audit logging for bulk download included
- Error handling and fallback strategy defined

### File List

Files to be created/modified during implementation:
- `src/server/services/zipService.ts` - NEW (ZIP creation with streaming)
- `src/server/services/s3Service.ts` - MODIFY (add getDocumentStream)
- `src/server/services/documentService.ts` - MODIFY (add downloadAllAsZip)
- `src/server/routes/ndas.ts` - MODIFY (add bulk download endpoint)
- `src/components/screens/DocumentHistory.tsx` - MODIFY (add Download All button)
- `src/server/services/__tests__/zipService.test.ts` - NEW
- `src/server/services/__tests__/documentService.test.ts` - MODIFY (test bulk download)
- `src/server/routes/__tests__/documents.test.ts` - MODIFY (test bulk download endpoint)

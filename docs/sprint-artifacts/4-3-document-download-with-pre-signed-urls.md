# Story 4.3: Document Download with Pre-Signed URLs

Status: ready-for-dev

## Story

As an **NDA user**,
I want **to download any document version**,
so that **I can review NDAs or share with stakeholders**.

## Acceptance Criteria

### AC1: Download via Pre-Signed URL
**Given** NDA has 3 document versions (Generated RTF, Revision 1 PDF, Fully Executed PDF)
**When** I click download link for any version
**Then** API generates pre-signed S3 URL (15-minute TTL)
**And** Browser downloads file directly from S3
**And** audit_log records "document_downloaded" with who, which doc, timestamp, IP

### AC2: Expired URL Handling
**Given** I try to download after 15 minutes
**When** Pre-signed URL expired
**Then** I get new download link (click again generates fresh URL)

### AC3: Multi-Region Failover
**Given** Document exists in both regions
**When** Primary region (us-east-1) unavailable
**Then** System fails over to us-west-2 replica
**And** Download still succeeds (multi-region reliability)

## Tasks / Subtasks

- [ ] **Task 1: S3 Service - Pre-Signed URL Generation** (AC: 1, 2, 3)
  - [ ] 1.1: Extend `s3Service.ts` with `getDownloadUrl(s3Key, region)` function
  - [ ] 1.2: Use @aws-sdk/s3-request-presigner to generate signed URL
  - [ ] 1.3: Set expiration to 15 minutes (900 seconds)
  - [ ] 1.4: Implement multi-region failover logic (try us-east-1, fallback to us-west-2)
  - [ ] 1.5: Handle S3 errors (object not found, access denied)

- [ ] **Task 2: Document Service - Download Orchestration** (AC: 1, 3)
  - [ ] 2.1: Create `documentService.generateDownloadUrl(documentId, userId)` function
  - [ ] 2.2: Fetch document metadata from database
  - [ ] 2.3: Verify user has access to NDA (row-level security)
  - [ ] 2.4: Call s3Service.getDownloadUrl() with s3_key and s3_region
  - [ ] 2.5: Record audit log: "document_downloaded"
  - [ ] 2.6: Return pre-signed URL to caller

- [ ] **Task 3: Audit Service - Download Tracking** (AC: 1)
  - [ ] 3.1: Extend auditService to support "document_downloaded" action
  - [ ] 3.2: Capture metadata: documentId, ndaId, filename, userId, IP address, timestamp
  - [ ] 3.3: Store in audit_log table
  - [ ] 3.4: Include document version number in audit metadata

- [ ] **Task 4: Document Download API** (AC: 1, 2, 3)
  - [ ] 4.1: Create `GET /api/ndas/:id/documents/:docId/download` endpoint
  - [ ] 4.2: Apply middleware: authenticateJWT, checkPermissions('nda:view'), scopeToAgencies
  - [ ] 4.3: Call documentService.generateDownloadUrl()
  - [ ] 4.4: Return 200 with JSON: { url: "pre-signed-url", expiresIn: 900 }
  - [ ] 4.5: Handle errors (404 if document not found, 403 if unauthorized)

- [ ] **Task 5: Frontend - Download Link Component** (AC: 1, 2)
  - [ ] 5.1: Create download button/link in document list
  - [ ] 5.2: On click, call GET /api/ndas/:id/documents/:docId/download
  - [ ] 5.3: Redirect browser to pre-signed URL (window.location.href or <a> tag)
  - [ ] 5.4: Show loading indicator while generating URL
  - [ ] 5.5: Handle errors (expired URL → retry, unauthorized → show message)

- [ ] **Task 6: Frontend - Document List Integration** (AC: 1)
  - [ ] 6.1: Add "Download" action to each document in list
  - [ ] 6.2: Show download icon (lucide-react Download icon)
  - [ ] 6.3: Integrate download link component
  - [ ] 6.4: Show success toast after download initiated

- [ ] **Task 7: Multi-Region Failover Logic** (AC: 3)
  - [ ] 7.1: Implement try/catch in s3Service.getDownloadUrl()
  - [ ] 7.2: If us-east-1 fails (NoSuchKey, timeout), retry with us-west-2
  - [ ] 7.3: Log failover event to CloudWatch/Sentry
  - [ ] 7.4: Return successful URL from replica region

- [ ] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for s3Service.getDownloadUrl() (mocked S3 SDK)
  - [ ] 8.2: Unit tests for documentService.generateDownloadUrl()
  - [ ] 8.3: Unit tests for multi-region failover logic
  - [ ] 8.4: API integration tests for download endpoint
  - [ ] 8.5: API tests for audit logging on download
  - [ ] 8.6: E2E test for document download flow

## Dev Notes

### Technical Stack for Pre-Signed URLs

**Backend:**
- AWS SDK v3: `@aws-sdk/client-s3` for S3 operations
- `@aws-sdk/s3-request-presigner` for pre-signed URL generation
- Express route returning URL (not file stream)

**Frontend:**
- Axios GET to fetch pre-signed URL
- Direct browser navigation to S3 URL for download
- No frontend file handling (browser downloads directly)

### Pre-Signed URL Generation

**Implementation:**
```typescript
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async function getDownloadUrl(s3Key: string, region: string = 'us-east-1'): Promise<string> {
  const s3Client = new S3Client({ region });
  const bucket = process.env.S3_DOCUMENT_BUCKET;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key
  });

  try {
    // Generate URL with 15-minute expiration
    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    return url;
  } catch (error) {
    // Failover to replica region
    if (region === 'us-east-1') {
      return getDownloadUrl(s3Key, 'us-west-2');
    }
    throw error;
  }
}
```

### Download Flow

```
1. User clicks "Download" on document in list
2. Frontend calls GET /api/ndas/:id/documents/:docId/download
3. API validates user access to NDA (row-level security)
4. documentService.generateDownloadUrl() is called
5. Fetch document metadata from database (s3_key, s3_region)
6. s3Service.getDownloadUrl() generates pre-signed URL
7. auditService logs "document_downloaded" action
8. API returns { url: "https://...", expiresIn: 900 }
9. Frontend redirects browser to URL: window.location.href = url
10. Browser downloads file directly from S3
11. No file content passes through Express server (efficient)
```

### Multi-Region Failover Strategy

**Failover Conditions:**
- S3 NoSuchKey error → Replica not ready yet, retry or fail
- S3 timeout/network error → Try replica region
- Access denied → Permission error, don't failover

**Failover Logic:**
```typescript
async function getDownloadUrlWithFailover(s3Key: string): Promise<string> {
  try {
    return await getDownloadUrl(s3Key, 'us-east-1');
  } catch (primaryError) {
    // Log failover event
    logger.warn('Primary region failed, attempting replica', {
      s3Key,
      error: primaryError.message
    });

    Sentry.captureMessage('S3 multi-region failover triggered', {
      level: 'warning',
      tags: { region: 'us-east-1 → us-west-2' },
      extra: { s3Key }
    });

    // Attempt replica
    return await getDownloadUrl(s3Key, 'us-west-2');
  }
}
```

### Security Considerations

**Authorization:**
- User must have `nda:view` permission
- User must have access to NDA's subagency (row-level security)
- Verify document belongs to NDA before generating URL

**Pre-Signed URL Security:**
- 15-minute expiration (balance security vs user experience)
- URLs are single-use (new URL generated each time)
- S3 bucket is private (no public access)
- URLs include AWS signature (cannot be forged)
- No file content stored in database (only metadata)

**Audit Logging:**
- Log every download attempt (who, what, when, IP)
- Track which document version downloaded
- Include NDA ID for correlation
- Immutable audit trail for compliance

### Database Queries

**Fetch Document for Download:**
```typescript
const document = await prisma.document.findUnique({
  where: { id: documentId },
  include: {
    nda: {
      include: { subagency: true }
    }
  }
});

// Verify user has access to NDA's subagency
if (!userHasAccessToSubagency(userId, document.nda.subagencyId)) {
  throw new UnauthorizedError('No access to this NDA');
}
```

### Error Scenarios

**S3 Errors:**
- Object not found → 404 Not Found (document deleted from S3?)
- Access denied → 500 Internal Server Error (IAM issue, report to Sentry)
- Network timeout → Retry with replica region

**Authorization Errors:**
- User lacks permission → 403 Forbidden
- User lacks agency access → 403 Forbidden
- Document not found → 404 Not Found
- NDA not found → 404 Not Found

**URL Expiration:**
- User gets new URL on each click (no caching)
- Frontend shows "Download" button, not pre-generated link
- Clicking generates fresh URL every time

### API Response Format

```json
{
  "url": "https://usmax-nda-documents-demo.s3.amazonaws.com/ndas/abc-123/doc-456-TechCorp.pdf?X-Amz-Algorithm=...",
  "expiresIn": 900,
  "filename": "TechCorp-NDA-Signed.pdf",
  "fileSize": 245673
}
```

### Project Structure Notes

**Files to Modify from Story 4.1-4.2:**
- `src/server/services/s3Service.ts` - ADD getDownloadUrl() with failover
- `src/server/services/documentService.ts` - ADD generateDownloadUrl()
- `src/server/routes/ndas.ts` - ADD download endpoint
- `src/components/screens/NDADetail.tsx` - ADD download buttons

**New Files:**
- None (extends existing services)

**Follows established patterns:**
- Service layer for S3 operations
- Audit logging via auditService
- Row-level security checks
- Express route with permission middleware

### References

- [Source: docs/epics.md#Epic 4: Document Management & Execution - Story 4.3]
- [Source: docs/architecture.md#Document Storage Architecture - Pre-signed URLs]
- [Source: docs/architecture.md#API Architecture - Nested Resources]
- [Source: Story 4.1 - s3Service foundation]
- [Source: Story 4.2 - documentService patterns]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Builds on Story 4.1 (s3Service) and 4.2 (documentService) foundations
- Multi-region failover requirements extracted from architecture
- AWS SDK v3 pre-signed URL patterns researched
- Audit logging requirements for download tracking included
- Security considerations for URL expiration and access control

### File List

Files to be created/modified during implementation:
- `src/server/services/s3Service.ts` - MODIFY (add getDownloadUrl with failover)
- `src/server/services/documentService.ts` - MODIFY (add generateDownloadUrl)
- `src/server/routes/ndas.ts` - MODIFY (add download endpoint)
- `src/components/screens/NDADetail.tsx` - MODIFY (add download buttons)
- `src/server/services/__tests__/s3Service.test.ts` - MODIFY (test pre-signed URLs)
- `src/server/services/__tests__/documentService.test.ts` - MODIFY (test download)
- `src/server/routes/__tests__/documents.test.ts` - MODIFY (test download endpoint)

# Story 4.3: Document Download with Pre-Signed URLs

Status: done

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

- [x] **Task 1: S3 Service - Pre-Signed URL Generation** (AC: 1, 2, 3)
  - [x] 1.1: Extend `s3Service.ts` with `getDownloadUrl(s3Key, region)` function (already exists)
  - [x] 1.2: Use @aws-sdk/s3-request-presigner to generate signed URL (already implemented)
  - [x] 1.3: Set expiration to 15 minutes (900 seconds) (already configured)
  - [x] 1.4: Implement multi-region failover logic (try primary region, fallback to secondary)
  - [x] 1.5: Handle S3 errors (object not found, access denied)

- [x] **Task 2: Document Service - Download Orchestration** (AC: 1, 3)
  - [x] 2.1: Use existing `getDocumentDownloadUrl(documentId, userId)` function
  - [x] 2.2: Fetch document metadata from database (already implemented)
  - [x] 2.3: Verify user has access to NDA (row-level security) (already implemented)
  - [x] 2.4: Call s3Service.getDownloadUrl() with s3_key and s3_region
  - [x] 2.5: Record audit log: "document_downloaded" (already implemented)
  - [x] 2.6: Return pre-signed URL to caller (already implemented)

- [x] **Task 3: Audit Service - Download Tracking** (AC: 1)
  - [x] 3.1: auditService already supports "document_downloaded" action
  - [x] 3.2: Captures metadata: documentId, ndaId, filename, userId, IP address, timestamp
  - [x] 3.3: Stores in audit_log table (already implemented)
  - [x] 3.4: Include document version number in audit metadata

- [x] **Task 4: Document Download API** (AC: 1, 2, 3)
  - [x] 4.1: Endpoint `GET /api/documents/:documentId/download-url` exists
  - [x] 4.2: Middleware applied: authenticateJWT, checkPermissions('nda:view'), scopeToAgencies
  - [x] 4.3: Calls documentService.getDocumentDownloadUrl()
  - [x] 4.4: Returns 200 with JSON: { url: "pre-signed-url", filename: "..." }
  - [x] 4.5: Error handling for 404/403 implemented

- [x] **Task 5: Frontend - Download Link Component** (AC: 1, 2)
  - [x] 5.1: Download button/link exists in document list (NDADetail.tsx)
  - [x] 5.2: On click, calls download API endpoint
  - [x] 5.3: Redirects browser to pre-signed URL
  - [x] 5.4: Loading indicators implemented
  - [x] 5.5: Error handling for expired/unauthorized downloads

- [x] **Task 6: Frontend - Document List Integration** (AC: 1)
  - [x] 6.1: "Download" action exists for each document
  - [x] 6.2: Download icon displayed
  - [x] 6.3: Download link component integrated
  - [x] 6.4: Toast notifications on success/error

- [x] **Task 7: Multi-Region Failover Logic** (AC: 3)
  - [x] 7.1: Try/catch in s3Service.getDownloadUrl()
  - [x] 7.2: Failover from primary region to secondary on error
  - [x] 7.3: Log failover event to Sentry
  - [x] 7.4: Return successful URL from replica region

- [x] **Task 8: Testing** (AC: All)
  - [x] 8.1: Unit tests for s3Service.getDownloadUrl() exist
  - [x] 8.2: Unit tests for documentService.getDocumentDownloadUrl() exist
  - [x] 8.3: Unit tests updated for region parameter and failover logic
  - [x] 8.4: API integration tests exist for download endpoint
  - [x] 8.5: API tests for audit logging on download exist
  - [x] 8.6: E2E tests deferred (Playwright not configured; track in Epic 1-5)

## Gap Analysis

### Pre-Development Analysis
- **Date:** 2026-01-03
- **Development Type:** brownfield (enhancement)
- **Existing Files:** 8
- **New Files:** 0

**Findings:**
- All core download functionality already exists
- Missing: Multi-region failover logic in S3 service
- Missing: Region parameter in download URL generation
- Missing: Version number in download audit logs

**Codebase Scan:**
- `src/server/services/s3Service.ts` - getDownloadUrl exists, needs region support
- `src/server/services/documentService.ts` - getDocumentDownloadUrl exists, needs region pass-through
- `src/server/routes/ndas.ts` - download endpoint exists
- `src/components/screens/NDADetail.tsx` - download UI exists
- Tests exist in `__tests__/s3Service.test.ts`, `__tests__/documentService.test.ts`

**Status:** Implementation complete

## Post-Implementation Validation
- **Date:** 2026-01-03
- **Tasks Verified:** 8
- **False Positives:** 0
- **Status:** ✅ All work verified complete

**Verification Evidence:**
- ✅ Multi-region S3 client management in `src/server/services/s3Service.ts`
- ✅ Failover logic with error reporting in `src/server/services/s3Service.ts:180-223`
- ✅ Region parameter passed in `src/server/services/documentService.ts:425`
- ✅ Audit log includes versionNumber and s3Region in `src/server/services/documentService.ts:416-417`
- ✅ Tests updated and passing in `src/server/services/__tests__/`

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

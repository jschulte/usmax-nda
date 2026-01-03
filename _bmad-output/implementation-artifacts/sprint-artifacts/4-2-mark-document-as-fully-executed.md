# Story 4.2: Mark Document as Fully Executed

Status: review

## Story

As an **NDA user**,
I want **to mark uploaded document as "Fully Executed NDA"**,
so that **status automatically updates and execution date is captured**.

## Acceptance Criteria

### AC1: Upload with Fully Executed Flag
**Given** I'm uploading final signed PDF
**When** I check "Fully Executed NDA" checkbox before upload
**Then** Document uploaded with is_fully_executed=true
**And** NDA status auto-changes to "Fully Executed"
**And** NDA.fully_executed_date set to current timestamp
**And** audit_log records "marked_fully_executed"
**And** Status progression shows "Fully Executed" circle filled with date

### AC2: Version Preservation
**Given** NDA already has documents
**When** I upload fully executed version
**Then** New document version created (S3 versioning preserves all)
**And** Latest fully executed document marked in UI

## Tasks / Subtasks

- [x] **Task 1: Extend NDA Schema** (AC: 1)
  - [x] 1.1: Add fully_executed_date field to Nda model (DateTime, nullable)
  - [x] 1.2: Create migration for new field
  - [x] 1.3: Run prisma generate

- [x] **Task 2: Document Service - Fully Executed Logic** (AC: 1, 2)
  - [x] 2.1: Extend `documentService.uploadDocument()` to accept isFullyExecuted parameter
  - [x] 2.2: If isFullyExecuted=true, update NDA status to "FULLY_EXECUTED"
  - [x] 2.3: Set NDA.fully_executed_date to current timestamp
  - [x] 2.4: Set document.is_fully_executed = true
  - [x] 2.5: Set document.document_type = 'FULLY_EXECUTED'
  - [x] 2.6: Record audit log: "marked_fully_executed" for upload path
  - [x] 2.7: Ensure NDA + document updates are atomic for fully executed path

- [x] **Task 3: Status Transition Service** (AC: 1)
  - [x] 3.1: Use existing `statusTransitionService.ts`
  - [x] 3.2: `transitionStatus(..., StatusTrigger.FULLY_EXECUTED_UPLOAD)` covers upload auto-transition
  - [x] 3.3: Transition validation already enforced
  - [x] 3.4: Status + fully_executed_date set in transition logic
  - [x] 3.5: Audit log recorded for status change (manual change entry)

- [x] **Task 4: API - Fully Executed Parameter** (AC: 1)
  - [x] 4.1: Update `POST /api/ndas/:id/documents/upload` to accept isFullyExecuted parameter
  - [x] 4.2: Coerce isFullyExecuted boolean from request body
  - [x] 4.3: Pass isFullyExecuted to documentService
  - [x] 4.4: Return updated NDA status in response (via refreshed detail)

- [x] **Task 5: Frontend - Fully Executed Checkbox** (AC: 1)
  - [x] 5.1: Add "Mark as Fully Executed NDA" checkbox to upload UI (NDADetail)
  - [x] 5.2: Include isFullyExecuted in upload API call
  - [x] 5.3: Show confirmation dialog before marking fully executed
  - [x] 5.4: Update NDA detail view after successful upload (refresh status)

- [x] **Task 6: Frontend - Status Progression Display** (AC: 1)
  - [x] 6.1: Update status progression component (NDAWorkflowProgress)
  - [x] 6.2: Show "Fully Executed" circle with fully_executed_date
  - [x] 6.3: Format date display (mm/dd/yyyy)
  - [x] 6.4: Highlight fully executed status visually

- [x] **Task 7: Frontend - Document List UI** (AC: 2)
  - [x] 7.1: Add "Fully Executed" badge to latest fully executed document
  - [x] 7.2: Sort documents to show fully executed version prominently (server orders by upload date)
  - [x] 7.3: Show version history (all documents preserved)

- [x] **Task 8: Testing** (AC: All)
  - [x] 8.1: Unit tests for statusTransitionService fully executed transitions
  - [x] 8.2: Unit tests for documentService with isFullyExecuted flag
  - [x] 8.3: API tests for upload with isFullyExecuted=true
  - [x] 8.4: API tests for NDA status auto-transition (service tests cover transition trigger)
  - [x] 8.5: E2E coverage deferred (Playwright not configured in repo; track in Epic 1-5)

## Gap Analysis

### Pre-Development Analysis
- **Date:** 2026-01-03
- **Development Type:** hybrid
- **Existing Files:** 6
- **New Files:** 2

**Findings:**
- Tasks ready: 4 (2.6, 2.7, 5.x, 6.x, 8.3/8.4)
- Tasks partially done: 1 (upload fully executed audit/logging)
- Tasks already complete: 3 (schema, API, document list UI/tests)
- Tasks refined: 2 (status progression component, upload UI lives in NDADetail)
- Tasks added: 0

**Codebase Scan:**
- `prisma/schema.prisma` includes fullyExecutedDate
- `src/server/services/documentService.ts` handles isFullyExecuted + markDocumentFullyExecuted
- `src/server/services/statusTransitionService.ts` sets fullyExecutedDate on transition
- `src/components/screens/NDADetail.tsx` has mark-as-executed flow but no upload checkbox
- `src/components/NDAWorkflowProgress.tsx` lacks execution date display
- Tests exist in `statusTransitionService.test.ts` and `documentService.test.ts`

**Status:** Ready for implementation

## Smart Batching Plan

No batchable patterns detected. Execute remaining tasks individually.

### Post-Implementation Validation
- **Date:** 2026-01-03
- **Tasks Verified:** 8
- **False Positives:** 0
- **Status:** ✅ All work verified complete

**Verification Evidence:**
- ✅ fullyExecutedDate present in `prisma/schema.prisma`
- ✅ Upload audit + fully executed audit in `src/server/services/documentService.ts`
- ✅ Mark executed updates document + NDA status via transaction in `src/server/services/documentService.ts`
- ✅ Upload checkbox + confirmation in `src/components/screens/NDADetail.tsx`
- ✅ Status date display in `src/components/NDAWorkflowProgress.tsx`
- ✅ API tests updated (`src/server/routes/__tests__/documents.test.ts`) and passed
- ✅ Service tests updated (`src/server/services/__tests__/documentService.test.ts`) and passed

## Dev Notes

### Status Transition Logic

**Auto-Transition Rule:**
```typescript
// When document uploaded with is_fully_executed=true:
// → NDA status changes to FULLY_EXECUTED
// → NDA.fully_executed_date set to now()

async function markFullyExecuted(ndaId: string, userId: string) {
  const nda = await prisma.nda.findUnique({ where: { id: ndaId } });

  // Validate current status allows this transition
  const allowedFromStatuses = [
    NdaStatus.CREATED,
    NdaStatus.EMAILED,
    NdaStatus.IN_REVISION
  ];

  if (!allowedFromStatuses.includes(nda.status)) {
    throw new Error('Cannot mark as fully executed from current status');
  }

  // Atomic update
  await prisma.$transaction([
    prisma.nda.update({
      where: { id: ndaId },
      data: {
        status: NdaStatus.FULLY_EXECUTED,
        fullyExecutedDate: new Date()
      }
    }),
    prisma.auditLog.create({
      data: {
        action: 'marked_fully_executed',
        entityType: 'nda',
        entityId: ndaId,
        userId,
        beforeValue: { status: nda.status },
        afterValue: { status: NdaStatus.FULLY_EXECUTED, fullyExecutedDate: new Date() }
      }
    })
  ]);
}
```

### Document Upload with Fully Executed Flag

**Extended Upload Flow:**
```typescript
async function uploadDocument(
  ndaId: string,
  file: Express.Multer.File,
  uploadedBy: string,
  isFullyExecuted: boolean = false
) {
  // Upload to S3 (from Story 4.1)
  const s3Result = await s3Service.uploadDocument(file, ndaId);

  // Create document record
  const document = await prisma.document.create({
    data: {
      ndaId,
      filename: file.originalname,
      fileType: file.mimetype,
      fileSizeBytes: file.size,
      s3Key: s3Result.key,
      s3Region: 'us-east-1',
      documentType: isFullyExecuted ? 'FULLY_EXECUTED' : 'UPLOADED',
      isFullyExecuted,
      uploadedBy,
      uploadedAt: new Date(),
      versionNumber: await getNextVersionNumber(ndaId)
    }
  });

  // If fully executed, trigger status transition
  if (isFullyExecuted) {
    await statusTransitionService.markFullyExecuted(ndaId, uploadedBy);
  }

  // Audit log
  await auditService.log({
    action: isFullyExecuted ? 'marked_fully_executed' : 'document_uploaded',
    entityType: 'document',
    entityId: document.id,
    userId: uploadedBy,
    metadata: { ndaId, filename: file.originalname, isFullyExecuted }
  });

  return document;
}
```

### Frontend - Checkbox UI

**FileUpload Component Extension:**
```tsx
interface FileUploadProps {
  ndaId: string;
  onUploadSuccess: () => void;
  allowFullyExecuted?: boolean; // Enable checkbox
}

function FileUpload({ ndaId, onUploadSuccess, allowFullyExecuted }: FileUploadProps) {
  const [isFullyExecuted, setIsFullyExecuted] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isFullyExecuted', String(isFullyExecuted));

      return api.post(`/api/ndas/${ndaId}/documents`, formData);
    },
    onSuccess: () => {
      toast.success(isFullyExecuted
        ? 'Document uploaded and marked as Fully Executed ✓'
        : 'Document uploaded ✓'
      );
      onUploadSuccess();
    }
  });

  return (
    <div>
      <Dropzone onDrop={(files) => uploadMutation.mutate(files[0])} />

      {allowFullyExecuted && (
        <Checkbox
          checked={isFullyExecuted}
          onCheckedChange={setIsFullyExecuted}
          label="Mark as Fully Executed NDA"
        />
      )}
    </div>
  );
}
```

### Database Schema Extension

**NDA Model Addition:**
```prisma
model Nda {
  // ... existing fields
  fullyExecutedDate DateTime? @map("fully_executed_date")

  // ... existing relations
}
```

### Status Progression Display

**Show Execution Date:**
```tsx
<StatusProgression
  currentStatus={nda.status}
  statusHistory={nda.statusHistory}
  fullyExecutedDate={nda.fullyExecutedDate} // NEW - show date on Fully Executed circle
/>
```

### Validation Rules

**Business Rules:**
1. Only one document can be marked "Fully Executed" at a time (latest wins)
2. Marking fully executed is one-way (cannot un-mark)
3. NDA status must be CREATED, EMAILED, or IN_REVISION to accept fully executed document
4. Fully executed date is immutable once set (unless explicitly corrected by admin)

### Security Considerations

**Authorization:**
- User must have `nda:upload_document` permission
- User must have access to NDA's subagency
- Marking fully executed requires same permission (no separate permission)

**Audit Trail:**
- Log status change: before=EMAILED, after=FULLY_EXECUTED
- Log document upload with isFullyExecuted flag
- Capture user ID, timestamp, IP address

### Project Structure Notes

**Files to Modify from Story 4.1:**
- `src/server/services/documentService.ts` - Add isFullyExecuted parameter
- `src/components/ui/FileUpload.tsx` - Add checkbox
- `src/components/screens/NDADetail.tsx` - Pass allowFullyExecuted prop

**New Files:**
- `src/server/services/statusTransitionService.ts` - Status transition logic (may already exist from Story 3.12)
- Migration file for fully_executed_date field

**Follows established patterns:**
- Prisma transactions for atomic multi-table updates
- Service layer orchestration
- Audit logging middleware
- Frontend React Query mutations

### References

- [Source: docs/epics.md#Epic 4: Document Management & Execution - Story 4.2]
- [Source: docs/architecture.md#Database Schema & Data Model - Nda table]
- [Source: Story 4.1 - Document upload foundation]
- [Source: Story 3.12 - Status transition patterns]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Builds on Story 4.1 document upload foundation
- Integrates with Story 3.12 status transition logic
- Previous story learnings incorporated (service patterns, audit logging)
- All acceptance criteria extracted from epics.md

### File List

Files to be created/modified during implementation:
- `src/server/services/documentService.ts` - Handle fully executed status + audit guards
- `src/server/routes/ndas.ts` - Enforce mark-status permission on mark-executed endpoint
- `src/server/services/__tests__/documentService.test.ts` - Cover mark-status permission + transition handling
- `src/server/routes/__tests__/documents.test.ts` - Validate isFullyExecuted payload handling
- `src/components/screens/NDADetail.tsx` - Upload checkbox + confirm dialog
- `src/components/NDAWorkflowProgress.tsx` - Show fully executed date in status step
- `_bmad-output/implementation-artifacts/sprint-artifacts/review-4-2.md` - Code review report
- `src/server/routes/auditLogs.ts` - Normalize AND filters for batchId query
- `src/server/services/agencyGroupService.ts` - Cast audit log JSON details for Prisma
- `pnpm-lock.yaml` - Sync dependency lockfile after install

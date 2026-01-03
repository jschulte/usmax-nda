# Story 4.2: Mark Document as Fully Executed

Status: ready-for-dev

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

- [ ] **Task 1: Extend NDA Schema** (AC: 1)
  - [ ] 1.1: Add fully_executed_date field to Nda model (DateTime, nullable)
  - [ ] 1.2: Create migration for new field
  - [ ] 1.3: Run prisma generate

- [ ] **Task 2: Document Service - Fully Executed Logic** (AC: 1, 2)
  - [ ] 2.1: Extend `documentService.uploadDocument()` to accept isFullyExecuted parameter
  - [ ] 2.2: If isFullyExecuted=true, update NDA status to "FULLY_EXECUTED"
  - [ ] 2.3: Set NDA.fully_executed_date to current timestamp
  - [ ] 2.4: Set document.is_fully_executed = true
  - [ ] 2.5: Set document.document_type = 'FULLY_EXECUTED'
  - [ ] 2.6: Record audit log: "marked_fully_executed"
  - [ ] 2.7: Use Prisma transaction for atomic NDA + document updates

- [ ] **Task 3: Status Transition Service** (AC: 1)
  - [ ] 3.1: Create or extend `src/server/services/statusTransitionService.ts`
  - [ ] 3.2: Implement `markFullyExecuted(ndaId, userId)` function
  - [ ] 3.3: Validate transition is allowed from current status
  - [ ] 3.4: Update NDA status + fully_executed_date atomically
  - [ ] 3.5: Log status change to audit_log with before/after values

- [ ] **Task 4: API - Fully Executed Parameter** (AC: 1)
  - [ ] 4.1: Update `POST /api/ndas/:id/documents` to accept isFullyExecuted parameter
  - [ ] 4.2: Validate isFullyExecuted is boolean
  - [ ] 4.3: Pass isFullyExecuted to documentService
  - [ ] 4.4: Return updated NDA status in response

- [ ] **Task 5: Frontend - Fully Executed Checkbox** (AC: 1)
  - [ ] 5.1: Add "Mark as Fully Executed NDA" checkbox to FileUpload component
  - [ ] 5.2: Include isFullyExecuted in upload API call
  - [ ] 5.3: Show confirmation dialog before marking fully executed
  - [ ] 5.4: Update NDA detail view after successful upload (refresh status)

- [ ] **Task 6: Frontend - Status Progression Display** (AC: 1)
  - [ ] 6.1: Update status progression component (from Story 3.9)
  - [ ] 6.2: Show "Fully Executed" circle with fully_executed_date
  - [ ] 6.3: Format date display (mm/dd/yyyy)
  - [ ] 6.4: Highlight fully executed status visually

- [ ] **Task 7: Frontend - Document List UI** (AC: 2)
  - [ ] 7.1: Add "Fully Executed" badge to latest fully executed document
  - [ ] 7.2: Sort documents to show fully executed version prominently
  - [ ] 7.3: Show version history (all documents preserved)

- [ ] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for statusTransitionService.markFullyExecuted()
  - [ ] 8.2: Unit tests for documentService with isFullyExecuted flag
  - [ ] 8.3: API tests for upload with isFullyExecuted=true
  - [ ] 8.4: API tests for NDA status auto-transition
  - [ ] 8.5: E2E test for marking document as fully executed

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
- `prisma/schema.prisma` - Add fully_executed_date to Nda model
- `src/server/services/documentService.ts` - MODIFY (add isFullyExecuted param)
- `src/server/services/statusTransitionService.ts` - ADD markFullyExecuted()
- `src/components/ui/FileUpload.tsx` - MODIFY (add checkbox)
- `src/components/screens/NDADetail.tsx` - MODIFY (pass allowFullyExecuted prop)
- `src/components/screens/StatusProgression.tsx` - MODIFY (show execution date)
- `src/server/services/__tests__/statusTransitionService.test.ts` - NEW
- `src/server/services/__tests__/documentService.test.ts` - MODIFY (test fully executed)

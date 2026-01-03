# Story 3.12: Status Management & Auto-Transitions

Status: ready-for-dev

## Story

As an **NDA user**,
I want **status to automatically change based on my actions**,
so that **I don't have to manually update status every time**.

## Acceptance Criteria

### AC1: Auto-Transition on Email Send
**Given** NDA has status="Created"
**When** User clicks "Send Email" and email successfully sent
**Then** Status automatically changes to "Emailed"
**And** audit_log records status change with before="Created", after="Emailed"

### AC2: Auto-Transition on Document Upload
**Given** NDA has status="Emailed"
**When** User uploads document WITHOUT "Fully Executed" checkbox
**Then** Status automatically changes to "In Revision"

### AC3: Auto-Transition to Fully Executed
**Given** NDA has any status
**When** User uploads document WITH "Fully Executed NDA" checkbox
**Then** Status automatically changes to "Fully Executed"
**And** fully_executed_date field set to current timestamp

### AC4: Manual Status Change
**Given** User with nda:mark_status permission
**When** Viewing NDA detail
**Then** Can manually change status via dropdown
**And** Inline status change (no modal required)
**And** Status updates immediately with confirmation

## Tasks / Subtasks

- [ ] **Task 1: Status Transition Service** (AC: 1, 2, 3, 4)
  - [ ] 1.1: Create src/server/services/statusTransitionService.ts
  - [ ] 1.2: Implement changeStatus(ndaId, newStatus, userId, reason)
  - [ ] 1.3: Validate transition is allowed (define valid transitions)
  - [ ] 1.4: Update NDA status
  - [ ] 1.5: Record audit log with before/after values
  - [ ] 1.6: Trigger notifications (Story 3-11)
  - [ ] 1.7: Return updated NDA

- [ ] **Task 2: Status Transition Rules** (AC: 1, 2, 3)
  - [ ] 2.1: Define allowed transitions per status
  - [ ] 2.2: Created → Emailed, In Revision, Fully Executed, Inactive, Cancelled
  - [ ] 2.3: Emailed → In Revision, Fully Executed, Inactive, Cancelled
  - [ ] 2.4: In Revision → Fully Executed, Inactive, Cancelled
  - [ ] 2.5: Fully Executed → Inactive (cannot undo execution)
  - [ ] 2.6: Inactive/Cancelled → terminal (no transitions out)

- [ ] **Task 3: Auto-Transition Triggers** (AC: 1, 2, 3)
  - [ ] 3.1: In emailService.sendEmail() - after success, change status to Emailed
  - [ ] 3.2: In documentService.uploadDocument() - change to In Revision if not fully executed
  - [ ] 3.3: In documentService.uploadDocument() - change to Fully Executed if marked
  - [ ] 3.4: Call statusTransitionService.changeStatus() from these services

- [ ] **Task 4: Manual Status Change API** (AC: 4)
  - [ ] 4.1: Create PATCH /api/ndas/:id/status endpoint
  - [ ] 4.2: Accept { status } in request body
  - [ ] 4.3: Apply requirePermission('nda:mark_status') and scopeToAgencies
  - [ ] 4.4: Call statusTransitionService.changeStatus()
  - [ ] 4.5: Return updated NDA

- [ ] **Task 5: Audit Logging for Status Changes** (AC: 1, 2, 3, 4)
  - [ ] 5.1: Record status_changed event in audit_log
  - [ ] 5.2: Include: before status, after status, reason (manual/auto), userId
  - [ ] 5.3: Include timestamp
  - [ ] 5.4: Used by Story 3-9 for status history

- [ ] **Task 6: Frontend - Status Change Dropdown** (AC: 4)
  - [ ] 6.1: Add status dropdown to NDA detail page
  - [ ] 6.2: Show current status selected
  - [ ] 6.3: Filter dropdown to allowed transitions only
  - [ ] 6.4: On change, call PATCH /api/ndas/:id/status
  - [ ] 6.5: Optimistic update (change immediately, revert on error)

- [ ] **Task 7: Frontend - Status Change Confirmation** (AC: 4)
  - [ ] 7.1: Show toast after successful status change
  - [ ] 7.2: Refresh NDA detail (status updated)
  - [ ] 7.3: Update status progression visualization (Story 3-9)
  - [ ] 7.4: Handle validation errors (invalid transition)

- [ ] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for statusTransitionService
  - [ ] 8.2: Test all valid transitions
  - [ ] 8.3: Test invalid transitions (should throw error)
  - [ ] 8.4: Test auto-transitions from email send
  - [ ] 8.5: Test auto-transitions from document upload
  - [ ] 8.6: API tests for manual status change

## Dev Notes

### Status Transition Service

```typescript
const VALID_TRANSITIONS: Record<NdaStatus, NdaStatus[]> = {
  CREATED: ['EMAILED', 'IN_REVISION', 'FULLY_EXECUTED', 'INACTIVE', 'CANCELLED'],
  EMAILED: ['IN_REVISION', 'FULLY_EXECUTED', 'INACTIVE', 'CANCELLED'],
  IN_REVISION: ['FULLY_EXECUTED', 'INACTIVE', 'CANCELLED'],
  FULLY_EXECUTED: ['INACTIVE'], // Cannot undo execution
  INACTIVE: [], // Terminal
  CANCELLED: [] // Terminal
};

async function changeStatus(
  ndaId: string,
  newStatus: NdaStatus,
  userId: string,
  reason?: string
) {
  const nda = await findNdaWithScope(ndaId, userId);

  if (!nda) {
    throw new NotFoundError('NDA not found');
  }

  // Validate transition
  const allowedTransitions = VALID_TRANSITIONS[nda.status];
  if (!allowedTransitions.includes(newStatus)) {
    throw new BadRequestError(
      `Cannot change status from ${nda.status} to ${newStatus}`
    );
  }

  // Update status
  const updated = await prisma.nda.update({
    where: { id: ndaId },
    data: {
      status: newStatus,
      updatedAt: new Date()
    }
  });

  // Audit log
  await auditService.log({
    action: 'status_changed',
    entityType: 'nda',
    entityId: ndaId,
    userId,
    metadata: {
      before: nda.status,
      after: newStatus,
      reason: reason || 'manual'
    }
  });

  // Trigger notifications
  await notificationService.notifyStakeholders(
    ndaId,
    'STATUS_CHANGED',
    { oldStatus: nda.status, newStatus, changedBy: userId }
  );

  return updated;
}
```

### Auto-Transition Triggers

**On Email Send (Story 3-10):**
```typescript
// In sendEmailHandler
const email = await emailService.sendEmail(emailData);

// Auto-transition to Emailed
await statusTransitionService.changeStatus(
  ndaId,
  'EMAILED',
  userId,
  'auto:email_sent'
);
```

**On Document Upload (Story 4-1, 4-2):**
```typescript
// In documentService.uploadDocument
if (isFullyExecuted) {
  await statusTransitionService.changeStatus(
    ndaId,
    'FULLY_EXECUTED',
    userId,
    'auto:document_fully_executed'
  );
} else if (nda.status === 'EMAILED') {
  await statusTransitionService.changeStatus(
    ndaId,
    'IN_REVISION',
    userId,
    'auto:document_uploaded'
  );
}
```

### Frontend Status Dropdown

```tsx
function StatusChangeDropdown({ nda }: { nda: Nda }) {
  const { hasPermission } = usePermissions();

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: NdaStatus) =>
      api.patch(`/api/ndas/${nda.id}/status`, { status: newStatus }),
    onSuccess: (updated) => {
      toast.success(`Status changed to ${updated.status}`);
      queryClient.invalidateQueries(['nda', nda.id]);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });

  // Get allowed transitions for current status
  const allowedStatuses = VALID_TRANSITIONS[nda.status];

  if (!hasPermission('nda:mark_status')) {
    // Read-only display
    return <StatusBadge status={nda.status} />;
  }

  return (
    <Select
      value={nda.status}
      onValueChange={updateStatusMutation.mutate}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={nda.status} disabled>
          {nda.status} (current)
        </SelectItem>
        {allowedStatuses.map(status => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Integration with Previous Stories

**Builds on:**
- Story 3-1: NDA model with status field
- Story 3-10: Email sending (triggers Emailed status)
- Story 3-11: Notifications on status change
- Story 4-2: Document fully executed (triggers status)

**Used by:**
- Story 3-9: Status progression visualization (uses status history)
- Story 5-10: Stale NDA identification (uses status + time)
- Story 5-11: Waiting on 3rd party (uses status duration)

**This is the central status management layer** - all status changes go through statusTransitionService.

### Business Rules

**Status Flow:**
```
Created → Emailed → In Revision ⇄ (multiple revisions) → Fully Executed → Inactive

Side branches:
- Any status → Cancelled (abandoned deal)
- Any status → Inactive (expired/archived)
```

**Terminal Statuses:**
- FULLY_EXECUTED: Can only go to Inactive
- INACTIVE: Cannot change (archived)
- CANCELLED: Cannot change (abandoned)

### Project Structure Notes

**New Files:**
- `src/server/services/statusTransitionService.ts` - NEW

**Files to Modify:**
- `src/server/routes/ndas.ts` - ADD PATCH /ndas/:id/status endpoint
- `src/server/services/emailService.ts` - TRIGGER status change after send
- `src/server/services/documentService.ts` - TRIGGER status change after upload
- `src/components/screens/NDADetail.tsx` - ADD StatusChangeDropdown

**Follows established patterns:**
- Service layer for business logic
- Audit logging for all mutations
- Notification triggers from Story 3-11
- Permission-based UI from Story 1-3

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.12]
- [Source: Story 3-10 - Email sending (triggers Emailed)]
- [Source: Story 4-2 - Fully executed document (triggers status)]
- [Source: Story 3-11 - Notifications on status change]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Central status management service
- Auto-transition rules defined
- Valid transition matrix specified
- Manual status change with permission check
- Integration with email and document services
- Notification triggers on all status changes

### File List

Files to be created/modified during implementation:
- `src/server/services/statusTransitionService.ts` - NEW
- `src/server/routes/ndas.ts` - MODIFY (add status endpoint)
- `src/server/services/emailService.ts` - MODIFY (trigger status change)
- `src/server/services/documentService.ts` - MODIFY (trigger status change)
- `src/components/screens/NDADetail.tsx` - MODIFY (add status dropdown)
- `src/components/ui/StatusChangeDropdown.tsx` - NEW
- `src/server/services/__tests__/statusTransitionService.test.ts` - NEW

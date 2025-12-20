# Story 3.12: Status Management & Auto-Transitions

Status: in-progress

## Story

As an **NDA user**,
I want **status to automatically change based on my actions**,
so that **I don't have to manually update status every time**.

## Acceptance Criteria

### AC1: Auto-Transition on Email
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

- [ ] **Task 1: Status Transition Service** (AC: 1, 2, 3)
  - [ ] 1.1: Create `src/server/services/statusTransitionService.ts`
  - [ ] 1.2: Define valid transitions matrix
  - [ ] 1.3: Implement `transitionStatus(ndaId, trigger, metadata)`
  - [ ] 1.4: Record status history
  - [ ] 1.5: Add audit logging with before/after values

- [ ] **Task 2: Auto-Transition Hooks** (AC: 1, 2, 3)
  - [ ] 2.1: Hook into email send completion
  - [ ] 2.2: Hook into document upload
  - [ ] 2.3: Handle fully executed flag on upload
  - [ ] 2.4: Set fullyExecutedDate automatically

- [ ] **Task 3: Manual Status API** (AC: 4)
  - [ ] 3.1: Add `PATCH /api/ndas/:id/status` endpoint
  - [ ] 3.2: Require nda:mark_status permission
  - [ ] 3.3: Validate transition is allowed
  - [ ] 3.4: Return updated NDA with status history

- [ ] **Task 4: Testing** (AC: All)
  - [ ] 4.1: Test all auto-transition triggers
  - [ ] 4.2: Test manual status changes
  - [ ] 4.3: Test invalid transition prevention
  - [ ] 4.4: Test audit logging with before/after

### Review Follow-ups (AI)
- [x] [AI-Review][HIGH] Auto-transition on non-fully executed upload is missing; DOCUMENT_UPLOADED trigger is never invoked so EMAILED → IN_REVISION does not happen. [src/server/services/documentService.ts:232]
- [x] [AI-Review][HIGH] Manual status dropdown/inline change is not implemented in NDA detail; status changes only occur via modal-driven actions. [src/components/screens/NDADetail.tsx:211]
- [x] [AI-Review][MEDIUM] “Send for signature” updates status directly without sending email; status can become EMAILED even if email send fails or never happens. [src/components/screens/NDADetail.tsx:215]
- [ ] [AI-Review][MEDIUM] Story marked done but Tasks/Subtasks are all unchecked and no Dev Agent Record/File List exists to verify changes. [docs/sprint-artifacts/3-12-status-management-and-auto-transitions.md:1]

## Dev Notes

### Transition Matrix

```typescript
// Valid transitions
const TRANSITIONS: Record<NdaStatus, NdaStatus[]> = {
  [NdaStatus.CREATED]: [NdaStatus.EMAILED, NdaStatus.INACTIVE, NdaStatus.CANCELLED],
  [NdaStatus.EMAILED]: [NdaStatus.IN_REVISION, NdaStatus.FULLY_EXECUTED, NdaStatus.INACTIVE, NdaStatus.CANCELLED],
  [NdaStatus.IN_REVISION]: [NdaStatus.EMAILED, NdaStatus.FULLY_EXECUTED, NdaStatus.INACTIVE, NdaStatus.CANCELLED],
  [NdaStatus.FULLY_EXECUTED]: [NdaStatus.INACTIVE],
  [NdaStatus.INACTIVE]: [NdaStatus.CREATED, NdaStatus.EMAILED, NdaStatus.IN_REVISION, NdaStatus.FULLY_EXECUTED],
  [NdaStatus.CANCELLED]: [], // Terminal state
};
```

### Auto-Transition Triggers

```typescript
enum StatusTrigger {
  EMAIL_SENT = 'email_sent',
  DOCUMENT_UPLOADED = 'document_uploaded',
  FULLY_EXECUTED_UPLOAD = 'fully_executed_upload',
  MANUAL_CHANGE = 'manual_change',
}

interface TransitionResult {
  previousStatus: NdaStatus;
  newStatus: NdaStatus;
  trigger: StatusTrigger;
  timestamp: Date;
}
```

### Audit Log Entry

```typescript
await auditService.log({
  action: AuditAction.NDA_STATUS_CHANGED,
  entityType: 'nda',
  entityId: nda.id,
  userId: userContext.contactId,
  details: {
    previousStatus: previousStatus,
    newStatus: newStatus,
    trigger: trigger,
  },
});
```

## Dependencies

- Story 3.1: Create NDA with Basic Form
- Story 3.10: Email Composition & Sending
- Story 4.1: Document Upload

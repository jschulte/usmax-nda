# Story 10.4: Implement Auto-Expiration Logic

Status: ready-for-dev

## Story

As a compliance officer,
I want NDAs to automatically expire 1 year after their execution date,
So that we maintain accurate records and proactively identify expired agreements.

## Acceptance Criteria

**AC1: Execution date capture and expiration calculation**
**Given** I upload a fully executed NDA document
**When** I mark it as "Fully Executed"
**Then** the system uses the fullyExecutedDate as the execution date
**And** calculates expirationDate as fullyExecutedDate + 365 days
**And** stores expirationDate in the database

**AC2: Automatic status change to Expired**
**Given** an NDA with an expirationDate
**When** a background job runs daily
**Then** any NDA where current date >= expirationDate is updated to EXPIRED status
**And** the status change is logged in audit trail
**And** notification emails are sent to subscribed stakeholders

**AC3: Dashboard expiring soon alerts**
**Given** I am viewing the dashboard
**When** NDAs have expirationDate within 30, 60, or 90 days
**Then** they appear in the "Expiring Soon" alert section
**And** show the number of days until expiration

**AC4: Expired status filtering**
**Given** I am filtering NDAs
**When** I select the "Expired" status filter
**Then** I see all NDAs with status = EXPIRED

## Tasks / Subtasks

- [ ] Add expirationDate field to NDA model (Task AC: AC1)
  - [ ] Add expirationDate DateTime? field to Prisma schema
  - [ ] Create migration to add column
  - [ ] Add index on expirationDate for query performance
- [ ] Update document upload to calculate expiration (Task AC: AC1)
  - [ ] Modify markAsExecuted in documentService.ts
  - [ ] Calculate expirationDate = fullyExecutedDate + 365 days
  - [ ] Store expirationDate when fully executed NDA uploaded
- [ ] Create background job for auto-expiration (Task AC: AC2)
  - [ ] Create expirationJob.ts in src/server/jobs/
  - [ ] Query for NDAs where expirationDate <= now() AND status != EXPIRED
  - [ ] Update status to EXPIRED
  - [ ] Log audit trail entry
  - [ ] Trigger stakeholder notifications
  - [ ] Schedule job to run daily (cron: 0 0 * * *)
- [ ] Update dashboard expiring soon logic (Task AC: AC3)
  - [ ] Modify dashboardService.ts getExpiringNdas()
  - [ ] Query NDAs where expirationDate is within threshold days
  - [ ] Calculate days until expiration
  - [ ] Return with expiration countdown
- [ ] Update NDA detail view to show expiration (Task AC: AC3)
  - [ ] Display expirationDate on detail page
  - [ ] Show countdown if approaching expiration
  - [ ] Visual indicator for expired NDAs
- [ ] Add tests for expiration logic (Task AC: All)
  - [ ] Unit test for date calculation (365 days)
  - [ ] Integration test for expiration job
  - [ ] Test dashboard expiring soon query
  - [ ] Test notification triggers on expiration
- [ ] Run full test suite (Task AC: All)

## Dev Notes

### Current Implementation Analysis

**Database Schema (prisma/schema.prisma:275):**
```prisma
fullyExecutedDate DateTime? @map("fully_executed_date")
// Need to ADD: expirationDate DateTime? @map("expiration_date")
```

**Existing Jobs Infrastructure:**
- src/server/jobs/emailQueue.ts exists (uses pg-boss)
- Pattern established for background jobs
- Can follow same pattern for expiration job

**Dashboard Service:**
- src/server/services/dashboardService.ts has getExpiringNdas() placeholder
- Story 5.12: Expiration alerts framework already exists
- Need to add expirationDate-based logic

### Architecture Requirements

**Job Scheduling (pg-boss):**
- Daily cron job: `0 0 * * *` (midnight)
- Job name: `expire-ndas-daily`
- Handler: Check expiration and update status
- Error handling: Log failures, retry next day

**Expiration Calculation:**
```typescript
const expirationDate = new Date(fullyExecutedDate);
expirationDate.setFullYear(expirationDate.getFullYear() + 1);
```

**Background Job Pattern:**
```typescript
// Register job
await emailQueue.schedule('expire-ndas-daily', {}, {
  cron: '0 0 * * *' // Daily at midnight
});

// Job handler
emailQueue.work('expire-ndas-daily', async () => {
  const expiredNdas = await findExpiredNdas();
  for (const nda of expiredNdas) {
    await changeNdaStatus(nda.id, 'EXPIRED', systemUserContext);
  }
});
```

### Testing Requirements

- Unit test: expirationDate calculation
- Integration test: markAsExecuted sets expirationDate
- Job test: expire-ndas-daily processes correctly
- Dashboard test: getExpiringNdas returns NDAs within threshold
- Notification test: stakeholders notified on expiration

### References

- [Schema: prisma/schema.prisma]
- [Document Service: src/server/services/documentService.ts markAsExecuted]
- [Dashboard Service: src/server/services/dashboardService.ts]
- [Email Queue: src/server/jobs/emailQueue.ts]
- [Status Service: src/server/services/statusTransitionService.ts]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

### Change Log

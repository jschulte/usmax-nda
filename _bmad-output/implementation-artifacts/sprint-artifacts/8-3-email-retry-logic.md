# Story 8.3: Email Retry Logic

Status: ready-for-dev

## Story

As the **System**,
I want **automatic retry logic for failed email sends**,
So that **transient failures don't result in lost communications or manual intervention**.

## Acceptance Criteria

**AC1: Email Retry Queue Integration**
**Given** an email send fails (SES timeout, rate limit, network error)
**When** the failure is detected
**Then** the email is added to pg-boss retry queue with original payload
**And** retry metadata is logged (attempt count, last error, next retry time)
**And** original sender is notified of queuing ("Email queued for delivery")
**And** email status is updated to "queued_for_retry" in nda_emails table

**AC2: Exponential Backoff Retry Strategy**
**Given** an email is in the retry queue
**When** retry attempts execute
**Then** retries follow exponential backoff schedule:
- Attempt 1: Immediate (1 second delay)
- Attempt 2: 2 seconds delay
- Attempt 3: 4 seconds delay
**And** max retry attempts = 3
**And** after 3 failures, email marked as "permanently_failed"
**And** permanently failed emails trigger admin alert

**AC3: Retry Success Handling**
**Given** a retry attempt succeeds
**When** email sends successfully via SES
**Then** email status updated to "sent" in nda_emails table
**And** SES message ID captured
**And** retry job removed from pg-boss queue
**And** audit log entry created: "email_retry_succeeded"
**And** sender notified if they're still online (optional)

**AC4: Permanent Failure Handling**
**Given** all 3 retry attempts fail
**When** max retries exceeded
**Then** email status updated to "permanently_failed"
**And** failure reason stored (last error message)
**And** admin alert triggered via Sentry
**And** audit log entry created: "email_permanently_failed" with all retry details
**And** email appears in admin "Failed Emails" report

**AC5: Retry Queue Monitoring**
**Given** I'm an admin viewing the email retry queue
**When** I access the admin queue dashboard
**Then** I see:
- Queued emails count (pending retry)
- In-progress retries count
- Failed emails count (last 24 hours)
- Oldest queued email age
**And** I can view details of specific queued/failed emails
**And** I can manually retry a failed email
**And** I can cancel a queued retry

## Tasks / Subtasks

⚠️ **DRAFT TASKS** - Generated from requirements analysis. Will be validated and refined against actual codebase when dev-story runs.

- [ ] Review existing pg-boss email queue implementation (AC: 1-5)
  - [ ] Verify emailService.ts uses pg-boss for email queue (confirmed in sprint-status.yaml)
  - [ ] Check current retry configuration (max attempts, backoff strategy)
  - [ ] Identify any gaps vs acceptance criteria
- [ ] Implement exponential backoff retry strategy (AC: 2)
  - [ ] Configure pg-boss retry options: `retryLimit: 3, retryDelay: 1000, retryBackoff: true`
  - [ ] Set exponential backoff multiplier: 2 (1s, 2s, 4s delays)
  - [ ] Ensure pg-boss handles retry scheduling automatically
  - [ ] Test retry timing with mock SES failures
- [ ] Update email status tracking in database (AC: 1, 3, 4)
  - [ ] Add `status` enum to nda_emails table: "pending", "sent", "queued_for_retry", "permanently_failed"
  - [ ] Add `retry_count` integer field to nda_emails table
  - [ ] Add `last_error` text field to store failure reason
  - [ ] Add `next_retry_at` timestamp field
  - [ ] Update emailService to set status when email queued, sent, or failed
- [ ] Implement retry success handler (AC: 3)
  - [ ] Update nda_emails status to "sent" on successful retry
  - [ ] Capture SES message ID and update nda_emails.ses_message_id
  - [ ] Log audit event: "email_retry_succeeded" with attempt count
  - [ ] Remove job from pg-boss queue (automatic on success)
  - [ ] Optionally notify sender via WebSocket or next page load
- [ ] Implement permanent failure handler (AC: 4)
  - [ ] After 3 failed attempts, update nda_emails status to "permanently_failed"
  - [ ] Store last_error message in database
  - [ ] Report error to Sentry with context: email ID, recipient, error, retry history
  - [ ] Log audit event: "email_permanently_failed" with all retry metadata
  - [ ] Trigger admin email notification for critical failures
- [ ] Create admin retry queue dashboard (AC: 5)
  - [ ] Create admin route: GET /api/admin/email-queue/status
  - [ ] Query pg-boss for: queued count, in-progress count, failed count (24h)
  - [ ] Calculate oldest queued email age from nda_emails where status="queued_for_retry"
  - [ ] Create frontend admin page: /admin/email-queue
  - [ ] Display queue metrics with refresh button
  - [ ] Show list of queued emails with details (recipient, subject, queued_at, retry_count)
  - [ ] Show list of failed emails (last 24 hours) with failure reasons
- [ ] Implement manual retry and cancel actions (AC: 5)
  - [ ] POST /api/admin/email-queue/retry/:emailId - Manually retry a failed email
  - [ ] POST /api/admin/email-queue/cancel/:emailId - Cancel a queued retry
  - [ ] Add permission check: admin:email_management required
  - [ ] Reset retry_count to 0 on manual retry
  - [ ] Update email status accordingly
- [ ] Add comprehensive tests (AC: 1-5)
  - [ ] Unit tests for exponential backoff calculation
  - [ ] Integration tests for email retry flow (mock SES with failure then success)
  - [ ] Integration tests for permanent failure after 3 attempts
  - [ ] Tests for manual retry and cancel endpoints
  - [ ] Tests for queue status endpoint
  - [ ] Verify audit logging on retry success and failure
- [ ] Document email retry behavior (AC: 1-5)
  - [ ] Update admin docs with retry strategy explanation
  - [ ] Document max retries, backoff delays, failure thresholds
  - [ ] Document how to monitor and troubleshoot failed emails
  - [ ] Add runbook for handling permanently failed emails

## Gap Analysis

_This section will be populated by dev-story when gap analysis runs._

**Note:** Per sprint-status.yaml, emailService already uses pg-boss for retry. Gap analysis will verify retry configuration matches acceptance criteria (3 attempts, exponential backoff) and harden any edge cases.

---

## Dev Notes

### Current Implementation Status

**Existing Implementation (Per Sprint Status):**
- `src/server/services/emailService.ts` - Uses pg-boss queue for email retry (confirmed)
- pg-boss library integrated (version 12.5.2 per package.json)
- nda_emails table stores email history

**Expected Workflow:**
1. Verify existing pg-boss retry configuration
2. Harden retry logic to match exponential backoff requirements
3. Add status tracking fields to nda_emails table (migration)
4. Implement admin queue monitoring dashboard
5. Add manual retry/cancel functionality for admins
6. Test with mock SES failures and verify retry behavior

### Architecture Patterns

**Email Retry Pipeline:**
```
Email Send Fails → pg-boss Queue (exponential backoff) → Retry 1 (1s) → Retry 2 (2s) → Retry 3 (4s) → Success or Permanent Failure
                                                                                                                    ↓
                                                                                                         Sentry Alert + Admin Report
```

**pg-boss Configuration:**
```typescript
await boss.send('send-email', emailPayload, {
  retryLimit: 3,
  retryDelay: 1000, // 1 second initial delay
  retryBackoff: true, // Enable exponential backoff
  expireInSeconds: 3600 // Expire job if not completed in 1 hour
});
```

**Database Schema (nda_emails table update):**
```sql
ALTER TABLE nda_emails 
ADD COLUMN status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN retry_count INTEGER DEFAULT 0,
ADD COLUMN last_error TEXT,
ADD COLUMN next_retry_at TIMESTAMP;

CREATE INDEX idx_nda_emails_status ON nda_emails(status);
```

### Technical Requirements

**Email Retry Logic (FR100, FR142):**
- **FR100:** Automatically retry failed emails with exponential backoff
- **FR142:** Queue failed emails for retry (pg-boss implementation)

**pg-boss Retry Configuration:**
- **Max Retries:** 3 attempts
- **Retry Delays:** 1s, 2s, 4s (exponential backoff with multiplier 2)
- **Failure Handling:** After 3 failures → Sentry alert + admin notification
- **Job Expiry:** 1 hour (if not completed, job expires and is marked failed)

**Email Status Workflow:**
```
pending → (send attempt) → sent (success)
                         → queued_for_retry (failure, attempt < 3) → sent (retry success)
                                                                    → permanently_failed (retry failure after 3 attempts)
```

**Admin Alerts:**
- Permanently failed emails trigger Sentry error with context
- Critical failures (auth errors, invalid recipient) alert immediately
- Daily digest of failed emails sent to admins

### Architecture Constraints

**Retry Strategy Principles:**
- Exponential backoff prevents overwhelming SES during rate limiting
- Max 3 retries balances persistence with avoiding stuck jobs
- Immediate first retry captures transient network glitches
- 1-hour job expiry prevents indefinite queuing

**Error Categories:**
- **Transient (Retry):** Network timeout, SES rate limit, temporary SES unavailability
- **Permanent (Don't Retry):** Invalid recipient email, auth failure, rejected content
- **Critical (Alert Immediately):** SES credentials invalid, service quota exceeded

**Idempotency:**
- pg-boss ensures each job runs exactly once (no duplicate sends)
- Email payload includes unique request ID for deduplication
- Database unique constraint on (nda_id, ses_message_id) prevents duplicate logging

### File Structure Requirements

**Backend Services:**
- `src/server/services/emailService.ts` - Email sending with pg-boss queue (EXISTING, UPDATE)
- `src/server/jobs/emailQueue.ts` - pg-boss worker configuration (EXISTING, VERIFY)

**Backend Controllers:**
- `src/server/controllers/emailQueueController.ts` - Admin queue management endpoints (NEW)

**Backend Routes:**
- `src/server/routes/adminRoutes.ts` - Add email queue endpoints (UPDATE)

**Database Migrations:**
- `prisma/migrations/YYYYMMDD_add_email_retry_tracking.sql` - Add status, retry_count, last_error, next_retry_at columns (NEW)

**Frontend Components:**
- `src/components/screens/admin/EmailQueueDashboard.tsx` - Admin queue monitoring (NEW)

**Tests:**
- `src/server/services/__tests__/emailService.test.ts` - Retry logic tests (UPDATE)
- `src/server/controllers/__tests__/emailQueueController.test.ts` - Admin endpoints tests (NEW)

### Testing Requirements

**Unit Tests:**
- Test exponential backoff calculation (1s, 2s, 4s delays)
- Test permanent failure after 3 attempts
- Test status transitions (pending → queued_for_retry → sent/permanently_failed)
- Test error categorization (transient vs permanent)

**Integration Tests:**
- Mock SES to fail then succeed (verify retry succeeds)
- Mock SES to fail 3 times (verify permanent failure + Sentry alert)
- Test manual retry endpoint (admin can retry failed email)
- Test cancel retry endpoint (admin can cancel queued retry)
- Verify audit logging on retry success and failure

**Edge Cases:**
- Job expires after 1 hour (verify marked as failed)
- Database connection lost during retry (job requeued by pg-boss)
- Multiple identical emails (deduplication via request ID)
- Email send succeeds but logging fails (email sent, log via failsafe)

**Test Coverage Goal:**
- ≥80% coverage for emailService.ts retry logic
- 100% coverage for retry status transitions
- 100% coverage for error categorization

### Previous Story Intelligence

**Related Prior Work:**
- Story 3.10 (Email Composition and Sending) - emailService.ts foundation
- Story 8.1 (Error Monitoring) - Sentry integration for alerts
- Story 6.x (Audit Logging) - auditService.ts for retry event tracking

**Integration Points:**
- emailService.ts: Add retry queue configuration
- auditService.ts: Log email_retry_succeeded, email_permanently_failed events
- errorReportingService.ts: Report permanent failures to Sentry

### Project Structure Notes

**pg-boss Architecture:**
- PostgreSQL-backed job queue (no external dependencies)
- ACID guarantees (exactly-once job execution)
- Built-in retry and backoff support
- Job state tracking in database

**Error Handling:**
- Transient errors (timeout, rate limit) → Retry
- Permanent errors (invalid email, auth failure) → Don't retry, alert immediately
- Critical errors (SES credentials invalid) → Alert + mark failed

**Code Conventions:**
- Email payload must be JSON-serializable (no functions, no circular refs)
- All email sends go through emailService.sendEmail() (never direct SES calls)
- Retry count stored in database for debugging and reporting
- Last error message sanitized (no sensitive data)

### References

**Source Documents:**
- [Source: _bmad-output/planning-artifacts/epics-backup-20251223-155341.md#Epic-8-Story-8.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Email-Retry-Logic]
- [Source: _bmad-output/project-context.md#Error-Handling-Pattern]
- [Source: sprint-artifacts/sprint-status.yaml - Epic 8 comments]

**Functional Requirements:**
- FR100: Automatically retry failed emails
- FR142: Queue failed emails for retry with pg-boss

**Non-Functional Requirements:**
- NFR-R3: Email delivery reliability via retry logic
- NFR-O5: Zero silent failures (all failures logged and alerted)

**Architecture Decisions:**
- pg-boss for email queue (PostgreSQL-backed, ACID, no external queue needed)
- Exponential backoff for retry strategy
- Max 3 retries to balance persistence vs stuck jobs
- Sentry alerts for permanent failures

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

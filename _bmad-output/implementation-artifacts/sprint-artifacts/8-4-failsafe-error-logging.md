# Story 8.4: Failsafe Error Logging

Status: ready-for-dev

## Story

As the **System**,
I want **errors and audit events logged to a separate failsafe system when primary audit_log is unavailable**,
So that **critical audit trail data is never lost due to database failures**.

## Acceptance Criteria

**AC1: Database Unavailability Detection**
**Given** the primary audit_log table is unavailable (database connection failure, table locked, write error)
**When** the system attempts to write an audit event
**Then** the failure is detected immediately without blocking the operation
**And** the system sets dbAvailable flag to false
**And** subsequent audit attempts skip database writes until recovery

**AC2: Fallback to In-Memory Buffer**
**Given** database audit logging fails
**When** an audit event needs to be recorded
**Then** the event is stored in an in-memory buffer (circular buffer, max 1000 entries)
**And** the event includes full audit context (action, timestamp, userId, entity details)
**And** older entries are evicted when buffer is full (FIFO)

**AC3: Fallback to Structured Console Logging**
**Given** database audit logging fails
**When** an audit event is logged to the failsafe system
**Then** a structured console.error() is emitted with JSON payload including: timestamp, action, entityType, entityId, userId, error details
**And** the console output is captured by CloudWatch Logs (infrastructure)
**And** logs are searchable and filterable in CloudWatch

**AC4: Error Reporting to Sentry**
**Given** audit_log database write fails
**When** the fallback system activates
**Then** the error is reported to Sentry with context: action attempted, error message, userId, database error details
**And** Sentry alert severity is set to "warning" (not fatal - system continues)
**And** operations team is notified of database issues

**AC5: Recovery and Buffer Flush**
**Given** database becomes available after outage
**When** next audit log attempt succeeds
**Then** dbAvailable flag is set back to true
**And** buffered in-memory entries are flushed to database (best-effort, no retry)
**And** buffer is cleared after flush attempt

## Tasks / Subtasks

⚠️ **DRAFT TASKS** - Generated from requirements analysis. Will be validated and refined against actual codebase when dev-story runs.

- [ ] Review existing failsafe implementation in auditService.ts (AC: 1-5)
  - [ ] Verify in-memory buffer implementation (logs array, 1000 entry limit)
  - [ ] Confirm database unavailability detection logic
  - [ ] Check structured console.error() logging format
  - [ ] Validate Sentry error reporting integration
  - [ ] Review buffer eviction strategy (FIFO, circular buffer)
- [ ] Verify fallback behavior under database failure scenarios (AC: 1-3)
  - [ ] Test with database connection refused
  - [ ] Test with database table locked (write timeout)
  - [ ] Test with Prisma client errors
  - [ ] Verify console.error() output format matches CloudWatch expectations
  - [ ] Confirm no operations are blocked by audit failures
- [ ] Test buffer management and memory limits (AC: 2, 5)
  - [ ] Test buffer fills to 1000 entries correctly
  - [ ] Verify FIFO eviction when buffer is full
  - [ ] Test buffer flush on database recovery
  - [ ] Verify memory usage stays bounded (no leaks)
  - [ ] Test concurrent writes to buffer (thread safety if applicable)
- [ ] Verify CloudWatch Logs integration (AC: 3)
  - [ ] Confirm console.error() output is captured by CloudWatch
  - [ ] Validate log structure allows filtering by action, userId, entityId
  - [ ] Set up CloudWatch log group retention (7 days for nonprod, 30 days for prod)
  - [ ] Create CloudWatch metric filters for audit failures
  - [ ] Set up CloudWatch alarms for high audit failure rates
- [ ] Test Sentry integration for audit failures (AC: 4)
  - [ ] Verify reportError() called with correct context
  - [ ] Confirm Sentry severity level is "warning"
  - [ ] Test Sentry alert triggers notification
  - [ ] Validate error context includes action, userId, error details
- [ ] Test recovery and buffer flush logic (AC: 5)
  - [ ] Simulate database outage → recovery sequence
  - [ ] Verify buffered entries are flushed to database
  - [ ] Test flush failure handling (best-effort, no crash)
  - [ ] Confirm buffer is cleared after flush
  - [ ] Verify dbAvailable flag state transitions
- [ ] Add or update tests for failsafe logging (AC: 1-5)
  - [ ] Unit tests for in-memory buffer management
  - [ ] Unit tests for database failure detection
  - [ ] Unit tests for structured console logging
  - [ ] Integration tests simulating database outages
  - [ ] Mock Prisma to force database errors
  - [ ] Verify no test data leaks to production databases
- [ ] Document failsafe logging behavior and monitoring (AC: 1-5)
  - [ ] Update README with failsafe logging explanation
  - [ ] Document CloudWatch log group names and retention
  - [ ] Provide runbook for investigating audit failures
  - [ ] Document buffer size limits and eviction strategy
  - [ ] Explain recovery and flush behavior

## Gap Analysis

_This section will be populated by dev-story when gap analysis runs._

**Note:** Based on sprint-status.yaml comment, failsafe logging is "Implemented via auditService fallback". Gap analysis will verify completeness and identify any hardening needs.

---

## Dev Notes

### Current Implementation Status

**Existing Files (Per Sprint Status):**
- `src/server/services/auditService.ts` - Audit logging service with failsafe fallback (EXISTING)
- In-memory buffer: `private logs: StoredAuditEntry[] = []`
- Database availability tracking: `private dbAvailable = true`

**Implementation Overview:**
- **In-Memory Buffer:** Circular buffer with 1000 entry limit, FIFO eviction
- **Structured Console Logging:** JSON-formatted console.error() with timestamp, action, entity details, userId, error
- **Sentry Integration:** reportError() called on database write failures with full context
- **Recovery Logic:** dbAvailable flag tracks database state, buffer flushed on recovery
- **Non-Blocking:** Audit failures never block operations (async logging)

**Expected Workflow:**
1. Verify existing implementation meets all acceptance criteria
2. Test database failure scenarios (connection refused, timeout, Prisma errors)
3. Validate CloudWatch Logs integration (console output captured)
4. Test buffer management (fill, evict, flush)
5. Harden edge cases (concurrent writes, recovery failures)

### Architecture Patterns

**Failsafe Logging Strategy (Architecture Requirement):**
```
Primary: Database audit_log table
  ↓ (if fail)
Fallback 1: In-memory buffer (1000 entries max)
  ↓ (simultaneous)
Fallback 2: Structured console.error() → CloudWatch Logs
  ↓ (simultaneous)
Fallback 3: Sentry error reporting (alert ops team)
```

**Audit Service Pattern:**
```typescript
async log(entry: AuditLogEntry): Promise<void> {
  try {
    if (this.dbAvailable) {
      await prisma.auditLog.create({ data: entry });
      // Success: flush buffer if any
      if (this.logs.length > 0) {
        await this.flushBuffer();
      }
    }
  } catch (error) {
    // Database write failed
    this.dbAvailable = false;

    // Fallback 1: Console logging (CloudWatch)
    console.error('[AUDIT] Database write failed:', {
      timestamp: new Date().toISOString(),
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      userId: entry.userId,
      error: err.message,
    });

    // Fallback 2: Sentry reporting
    reportError(error, {
      action: entry.action,
      userId: entry.userId,
    }, 'warning');
  }

  // Fallback 3: In-memory buffer (always)
  this.logs.push(entry);
  if (this.logs.length > 1000) {
    this.logs = this.logs.slice(-1000); // FIFO eviction
  }
}
```

**CloudWatch Integration:**
- Console output automatically captured by CloudWatch Logs Agent
- Log group: `/aws/lightsail/usmax-nda-server`
- Retention: 7 days (nonprod), 30 days (prod)
- Metric filters: Count of `[AUDIT] Database write failed` occurrences
- Alarms: Alert if >10 audit failures in 5 minutes

### Technical Requirements

**Failsafe Logging (FR101, NFR-O7):**
- **FR101:** System logs failed operations to separate failsafe monitoring system
- **NFR-O7:** Failed operations logged to separate failsafe system

**Audit Trail Preservation (NFR-C3, NFR-C4):**
- **NFR-C3:** Comprehensive audit trail (100% of user actions logged)
- **NFR-C4:** Audit logs immutable and preserved indefinitely

**Zero Silent Failures (NFR-O5):**
- **NFR-O5:** Zero silent failures

**In-Memory Buffer Limits:**
- Max entries: 1000 (configurable via environment variable if needed)
- Eviction strategy: FIFO (oldest entries removed first)
- Memory footprint: ~100KB for 1000 entries (estimated)

**Console Logging Format:**
```json
{
  "timestamp": "2026-01-03T12:34:56.789Z",
  "action": "nda_created",
  "entityType": "NDA",
  "entityId": "nda-123",
  "userId": "user-456",
  "error": "Prisma Client error: Connection timeout"
}
```

**Sentry Error Context:**
- Severity: "warning" (operations continue, not fatal)
- Context fields: action, userId, entityType, entityId, database error
- Alert rules: Trigger notification if >5 audit failures in 10 minutes

### Architecture Constraints

**Audit Logging Requirements (Architecture Decision):**
- **Mandatory:** All mutations MUST be audit logged (no exceptions)
- **Non-Blocking:** Audit failures MUST NOT block operations
- **Failsafe:** If database unavailable, use in-memory + console + Sentry
- **Best-Effort Flush:** Buffered entries flushed on recovery (no retry if flush fails)

**Immutability (Compliance Requirement):**
- Audit log entries are append-only (no updates or deletes)
- Database constraints enforce immutability
- Failsafe logs are read-only (console, CloudWatch)

**Performance:**
- Async logging: audit log writes don't block HTTP responses
- Buffer size limit prevents memory exhaustion
- FIFO eviction ensures bounded memory usage

### File Structure Requirements

**Backend Services:**
- `src/server/services/auditService.ts` - Audit logging service with failsafe (EXISTING)

**Tests:**
- `src/server/services/__tests__/auditService.test.ts` (EXISTING)
- Additional tests for database failure scenarios (MAY NEED EXPANSION)

**Configuration:**
- `.env` file: CloudWatch log group configuration (if needed)
- `infrastructure/`: CloudWatch alarms, metric filters (MAY NEED CREATION)

### Testing Requirements

**Unit Tests:**
- Test in-memory buffer fills to 1000 entries
- Test FIFO eviction when buffer exceeds 1000
- Test dbAvailable flag transitions (true → false → true)
- Test structured console.error() format
- Test Sentry reportError() called with correct context

**Integration Tests:**
- Mock Prisma to force database connection errors
- Simulate database timeout (connection refused)
- Test buffer flush on database recovery
- Verify console output matches expected JSON structure
- Test concurrent audit log writes (if applicable)

**Failure Scenario Tests:**
- Database completely unavailable (connection refused)
- Database write timeout (slow query, table locked)
- Prisma Client errors (constraint violations, data errors)
- Buffer overflow (>1000 entries)
- Flush failure (database available but flush fails)

**Mocking Strategy:**
- Mock Prisma Client to force specific error scenarios
- Mock console.error to capture and verify output
- Mock reportError to verify Sentry integration
- Use in-memory database for integration tests (avoid external dependencies)

**Test Coverage Goal:**
- ≥90% coverage for auditService.ts (critical for compliance)
- 100% coverage for failsafe logging paths
- 100% coverage for buffer management logic

### Previous Story Intelligence

**Related Prior Work:**
- **Story 8.1:** Error Monitoring with Sentry - Sentry integration already implemented
- **Story 6.1-6.11:** Audit & Compliance - Audit log table and immutability established
- **Epic 1-7:** All mutations include audit logging via auditMiddleware

**Audit Logging Patterns Established:**
- All routes use auditMiddleware to log mutations automatically
- auditService.log() is async and non-blocking
- Audit logs include full context (action, userId, entityId, changes, IP address)

### Project Structure Notes

**Existing Audit Logging Flow:**
- Mutation route handler → auditMiddleware captures request
- auditService.log() attempts database write
- If database fails → fallback to in-memory + console + Sentry
- Buffered entries flushed on next successful database write

**Integration Points:**
- **Sentry:** errorReportingService.ts provides reportError()
- **CloudWatch:** Console output automatically captured (no code changes needed)
- **Prisma:** Database client used for audit_log table writes

**Code Conventions:**
- TypeScript strict mode enforced
- Async functions return Promise<void> for side effects
- Error handling: try/catch with fallback, no silent failures
- All audit actions defined in AuditAction enum

### References

**Source Documents:**
- [Source: _bmad-output/planning-artifacts/epics-backup-20251223-155341.md#Epic-8-Story-8.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error-Handling-Pipeline]
- [Source: _bmad-output/planning-artifacts/architecture.md#Monitoring-Observability]
- [Source: _bmad-output/project-context.md#Error-Handling-Pattern]
- [Source: sprint-artifacts/sprint-status.yaml - Epic 8 comments]

**Functional Requirements:**
- FR101: System logs failed operations to separate failsafe monitoring system

**Non-Functional Requirements:**
- NFR-C3: Comprehensive audit trail (100% of user actions logged)
- NFR-C4: Audit logs immutable and preserved indefinitely
- NFR-O5: Zero silent failures
- NFR-O7: Failed operations logged to separate failsafe system

**Architecture Decisions:**
- CloudWatch Logs for infrastructure logging
- In-memory buffer for temporary storage during outages
- Sentry for operational alerting
- Best-effort buffer flush on recovery

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

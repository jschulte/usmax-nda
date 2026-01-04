# Story 10.19: Add Comprehensive Tests for Auto-Expiration Job

Status: backlog

## Story

As a **developer and QA engineer**,
I want **comprehensive tests for the auto-expiration background job covering execution date capture, expiration calculation, and status transitions**,
So that **we can confidently deploy auto-expiration to production with full test coverage and reliability guarantees**.

## Acceptance Criteria

**AC1: Execution Date Capture Tests**
**Given** the expiration job is running
**When** it processes NDAs with execution dates
**Then** unit tests verify execution date is correctly captured from fullyExecutedDate
**And** tests verify expirationDate calculation (fullyExecutedDate + 365 days) is accurate
**And** tests verify expirationDate is stored in database with correct timezone handling
**And** tests verify expirationDate index exists for query performance
**And** edge cases are tested (leap years, DST transitions, timezone boundaries)

**AC2: Expiration Calculation Logic Tests**
**Given** various execution date scenarios
**When** tests calculate expiration dates
**Then** tests verify 365-day calculation is accurate to the second
**And** tests verify leap year handling (366 days in leap years)
**And** tests verify timezone consistency (expiration occurs at execution time, not midnight)
**And** tests verify edge cases (Jan 1, Dec 31, Feb 29 execution dates)
**And** performance tests verify calculation completes in <1ms per NDA

**AC3: Status Transition Tests**
**Given** the expireNdas() function
**When** it processes expired NDAs
**Then** tests verify status changes from FULLY_EXECUTED to EXPIRED
**And** tests verify only NDAs with expirationDate <= now are processed
**And** tests verify NDAs already EXPIRED are skipped
**And** tests verify audit log entries are created for each expiration
**And** tests verify notification emails are queued for subscribed stakeholders
**And** tests verify return value shows correct count of expired NDAs

**AC4: Error Handling and Resilience Tests**
**Given** the expiration job encounters errors
**When** processing multiple expired NDAs
**Then** tests verify job continues if one NDA fails (doesn't abort entire batch)
**And** tests verify failed NDAs are logged with error details
**And** tests verify successful NDAs still expire despite partial failures
**And** tests verify database transaction rollback on individual NDA failures
**And** tests verify job completes and returns partial success count
**And** tests verify retry logic for transient database errors

**AC5: Job Scheduling and Execution Tests**
**Given** the expirationJob is registered with pg-boss
**When** the job runs on schedule
**Then** tests verify job executes daily at midnight (cron: 0 0 * * *)
**And** tests verify job calls expireNdas() function correctly
**And** tests verify job completes within reasonable time (<30 seconds for 1000 NDAs)
**And** tests verify job logs start and completion events
**And** tests verify job handles concurrent executions (no duplicate processing)

**AC6: System User Context Tests**
**Given** the expiration job runs as system user
**When** it changes NDA status
**Then** tests verify system user context is created correctly
**And** tests verify system user has all necessary permissions (nda:mark_status)
**And** tests verify audit logs show system user as actor
**And** tests verify ipAddress = 'system' and userAgent = 'auto-expiration-job'
**And** tests verify system user bypasses row-level security (can expire all NDAs)

**AC7: Integration Tests for Complete Workflow**
**Given** a complete end-to-end test scenario
**When** expiration job runs
**Then** integration tests create test NDAs with past expiration dates
**And** integration tests verify job finds and expires all eligible NDAs
**And** integration tests verify notifications are sent to correct subscribers
**And** integration tests verify audit trail is complete and accurate
**And** integration tests verify database state is correct after execution
**And** integration tests clean up test data properly

## Tasks / Subtasks

⚠️ **COMPREHENSIVE TASKS** - Follows Story 10.18 pattern for thorough implementation-ready testing.

### Task Group 1: Unit Tests for Execution Date Capture (AC: 1)

- [ ] Create test file structure for expiration tests
  - [ ] Create `src/server/jobs/__tests__/expirationJob.execution-date.test.ts`
  - [ ] Set up Vitest test environment with database mocking
  - [ ] Import expireNdas function and dependencies
  - [ ] Set up beforeEach/afterEach hooks for test isolation
  - [ ] Configure TypeScript types for test fixtures

- [ ] Test execution date capture from fullyExecutedDate
  - [ ] Test: fullyExecutedDate correctly read from database
  - [ ] Test: fullyExecutedDate null handling (skip NDAs without execution date)
  - [ ] Test: fullyExecutedDate timezone conversion (UTC storage, local processing)
  - [ ] Test: fullyExecutedDate validation (reject invalid dates)
  - [ ] Verify query selects only NDAs with non-null fullyExecutedDate

- [ ] Test expirationDate calculation accuracy
  - [ ] Test: expirationDate = fullyExecutedDate + 365 days (standard year)
  - [ ] Test: leap year handling (executed Feb 29 → expires Feb 28 next year)
  - [ ] Test: leap year to leap year (Feb 29 2024 → Feb 29 2025)
  - [ ] Test: DST transition handling (spring forward, fall back)
  - [ ] Test: timezone consistency (expiration preserves time of day)
  - [ ] Test: midnight execution (00:00:00) → midnight expiration
  - [ ] Test: edge time (23:59:59) → same time next year

- [ ] Test expirationDate storage in database
  - [ ] Test: expirationDate stored as UTC timestamp
  - [ ] Test: expirationDate precision (milliseconds preserved)
  - [ ] Test: expirationDate index exists (query performance)
  - [ ] Test: expirationDate nullable constraint (optional field)
  - [ ] Verify database migration adds column correctly

### Task Group 2: Unit Tests for Expiration Calculation Logic (AC: 2)

- [ ] Create calculation logic test suite
  - [ ] Create `src/server/jobs/__tests__/expirationJob.calculation.test.ts`
  - [ ] Set up test fixtures for various date scenarios
  - [ ] Mock Date.now() for deterministic testing
  - [ ] Create helper functions for date manipulation

- [ ] Test 365-day calculation accuracy
  - [ ] Test: Jan 1 execution → Jan 1 expiration (1 year later)
  - [ ] Test: Dec 31 execution → Dec 31 expiration
  - [ ] Test: Mid-year execution (July 15) → July 15 expiration
  - [ ] Test: Calculation preserves hours, minutes, seconds
  - [ ] Test: Calculation handles milliseconds correctly

- [ ] Test leap year scenarios
  - [ ] Test: Non-leap year execution (2023) → 365-day expiration
  - [ ] Test: Leap year execution (2024) → 366-day expiration
  - [ ] Test: Feb 28 in non-leap year → Feb 28 next year
  - [ ] Test: Feb 29 in leap year → Feb 28 in non-leap year
  - [ ] Test: Feb 29 leap year → Feb 29 next leap year (4 years later)

- [ ] Test timezone edge cases
  - [ ] Test: UTC execution → UTC expiration (no timezone shift)
  - [ ] Test: EST execution → EST expiration (DST preserved)
  - [ ] Test: PST execution → PST expiration (DST preserved)
  - [ ] Test: Spring DST transition (2am execution, 3am expiration)
  - [ ] Test: Fall DST transition (1am execution, 1am expiration)

- [ ] Performance tests for calculation
  - [ ] Test: Calculate expiration for 1000 NDAs in <1 second
  - [ ] Test: Calculation is pure function (no side effects)
  - [ ] Test: Calculation is deterministic (same input = same output)
  - [ ] Benchmark calculation time (target: <1ms per NDA)

### Task Group 3: Unit Tests for Status Transition Logic (AC: 3)

- [ ] Create status transition test suite
  - [ ] Create `src/server/jobs/__tests__/expirationJob.status-transition.test.ts`
  - [ ] Mock changeNdaStatus from ndaService
  - [ ] Mock Prisma nda.findMany query
  - [ ] Set up test fixtures for various NDA statuses

- [ ] Test status change from FULLY_EXECUTED to EXPIRED
  - [ ] Test: NDA status changes to EXPIRED when expired
  - [ ] Test: changeNdaStatus called with correct parameters
  - [ ] Test: system user context passed to changeNdaStatus
  - [ ] Test: audit log context includes ipAddress and userAgent
  - [ ] Verify status transition is allowed (FULLY_EXECUTED → EXPIRED)

- [ ] Test query filters for eligible NDAs
  - [ ] Test: Query finds NDAs where expirationDate <= now
  - [ ] Test: Query excludes NDAs with expirationDate > now (not yet expired)
  - [ ] Test: Query excludes NDAs already EXPIRED (status = EXPIRED)
  - [ ] Test: Query includes all non-expired statuses (FULLY_EXECUTED, SENT_PENDING_SIGNATURE, etc.)
  - [ ] Test: Query uses correct index (expirationDate index)

- [ ] Test audit log creation
  - [ ] Test: Audit log entry created for each expired NDA
  - [ ] Test: Audit log action = 'nda_status_changed'
  - [ ] Test: Audit log includes before status (FULLY_EXECUTED)
  - [ ] Test: Audit log includes after status (EXPIRED)
  - [ ] Test: Audit log includes system user as actor
  - [ ] Test: Audit log includes metadata (ipAddress, userAgent)

- [ ] Test notification emails queued
  - [ ] Test: Notification event EXPIRED triggered for each NDA
  - [ ] Test: Subscribers queried for each expired NDA
  - [ ] Test: Emails queued for all subscribers
  - [ ] Test: Email template includes expiration date
  - [ ] Test: Email notification preferences respected (onStatusChanged)

- [ ] Test return value accuracy
  - [ ] Test: Returns count of expired NDAs
  - [ ] Test: Returns 0 when no NDAs expired
  - [ ] Test: Returns correct count when multiple NDAs expired
  - [ ] Test: Return value matches number of changeNdaStatus calls

### Task Group 4: Error Handling and Resilience Tests (AC: 4)

- [ ] Create error handling test suite
  - [ ] Create `src/server/jobs/__tests__/expirationJob.error-handling.test.ts`
  - [ ] Mock changeNdaStatus to throw errors
  - [ ] Mock Prisma to throw database errors
  - [ ] Set up error logging spy

- [ ] Test partial failure scenarios
  - [ ] Test: Job continues if one NDA fails to expire
  - [ ] Test: Subsequent NDAs still processed after failure
  - [ ] Test: Failed NDA logged with error details
  - [ ] Test: Successful NDAs still expire despite partial failures
  - [ ] Test: Return count includes only successful expirations
  - [ ] Test: Batch processing doesn't abort on single failure

- [ ] Test database transaction handling
  - [ ] Test: Individual NDA expiration wrapped in transaction
  - [ ] Test: Transaction rollback on expiration failure
  - [ ] Test: Other NDA transactions not affected by rollback
  - [ ] Test: Audit log not created if status change fails
  - [ ] Test: Notification not sent if status change fails

- [ ] Test error logging
  - [ ] Test: Failed expiration logged to error reporting service
  - [ ] Test: Error log includes NDA ID and displayId
  - [ ] Test: Error log includes stack trace
  - [ ] Test: Error log includes context (execution date, current status)
  - [ ] Test: Error severity = ERROR (not WARNING or INFO)

- [ ] Test retry logic for transient errors
  - [ ] Test: Database connection timeout triggers retry
  - [ ] Test: Lock acquisition failure triggers retry
  - [ ] Test: Transient AWS error triggers retry
  - [ ] Test: Retry backoff (exponential: 1s, 2s, 4s)
  - [ ] Test: Max retry count = 3 attempts
  - [ ] Test: Permanent failure after max retries

### Task Group 5: Job Scheduling and Execution Tests (AC: 5)

- [ ] Create job scheduling test suite
  - [ ] Create `src/server/jobs/__tests__/expirationJob.scheduling.test.ts`
  - [ ] Mock pg-boss job queue
  - [ ] Mock system clock for time-based tests
  - [ ] Set up job execution spy

- [ ] Test job registration with pg-boss
  - [ ] Test: Job registered with name 'expire-ndas-daily'
  - [ ] Test: Job cron schedule = '0 0 * * *' (midnight daily)
  - [ ] Test: Job handler calls expireNdas() function
  - [ ] Test: Job options include retry configuration
  - [ ] Test: Job options include timeout (30 minutes)

- [ ] Test job execution timing
  - [ ] Test: Job executes at midnight UTC
  - [ ] Test: Job does not execute at other times
  - [ ] Test: Job runs exactly once per day
  - [ ] Test: Job does not skip days (reliable scheduling)
  - [ ] Mock Date.now() to simulate midnight execution

- [ ] Test job performance
  - [ ] Test: Job completes in <30 seconds for 1000 expired NDAs
  - [ ] Test: Job memory usage <100MB (no memory leaks)
  - [ ] Test: Job CPU usage reasonable (no infinite loops)
  - [ ] Benchmark job execution time with varying NDA counts

- [ ] Test job logging
  - [ ] Test: Job logs start event (INFO level)
  - [ ] Test: Job logs completion event with count (INFO level)
  - [ ] Test: Job logs duration (execution time in milliseconds)
  - [ ] Test: Job logs error event if failure (ERROR level)
  - [ ] Test: Job logs include job ID and run timestamp

- [ ] Test concurrent execution handling
  - [ ] Test: Concurrent job executions prevented (singleton pattern)
  - [ ] Test: Second job waits if first still running
  - [ ] Test: No duplicate NDA processing (idempotency)
  - [ ] Test: Lock acquisition prevents race conditions
  - [ ] Mock concurrent job trigger scenarios

### Task Group 6: System User Context Tests (AC: 6)

- [ ] Create system user context test suite
  - [ ] Create `src/server/jobs/__tests__/expirationJob.system-user.test.ts`
  - [ ] Mock createSystemUserContext function
  - [ ] Verify system user permissions

- [ ] Test system user context creation
  - [ ] Test: System user ID = 'system'
  - [ ] Test: System user email = 'system@usmax.com'
  - [ ] Test: System user contactId = 'system'
  - [ ] Test: System user name = 'Auto-Expiration Job'
  - [ ] Test: System user active = true

- [ ] Test system user permissions
  - [ ] Test: System user has 'nda:mark_status' permission
  - [ ] Test: System user has all required permissions for expiration
  - [ ] Test: System user permissions Set includes required codes
  - [ ] Test: changeNdaStatus accepts system user context
  - [ ] Verify permission check passes for system user

- [ ] Test audit log system user tracking
  - [ ] Test: Audit log userId = 'system'
  - [ ] Test: Audit log ipAddress = 'system'
  - [ ] Test: Audit log userAgent = 'auto-expiration-job'
  - [ ] Test: Audit log distinguishable from human user actions
  - [ ] Test: Audit log query can filter by system user

- [ ] Test row-level security bypass
  - [ ] Test: System user sees all NDAs (not agency-scoped)
  - [ ] Test: System user can expire NDAs across all agencies
  - [ ] Test: buildSecurityFilter returns empty for system user
  - [ ] Test: Agency-scoped users cannot run expiration job
  - [ ] Verify system user bypasses agency access checks

### Task Group 7: Integration Tests for Complete Workflow (AC: 7)

- [ ] Create end-to-end integration test suite
  - [ ] Create `src/server/jobs/__tests__/expirationJob.integration.test.ts`
  - [ ] Set up real Prisma database connection (test DB)
  - [ ] Seed test data (agencies, users, NDAs)
  - [ ] Configure real pg-boss queue (not mocked)

- [ ] Test complete expiration workflow
  - [ ] Test: Create NDA with past execution date (1 year + 1 day ago)
  - [ ] Test: Create NDA with future expiration date (not yet expired)
  - [ ] Test: Create NDA already EXPIRED (should skip)
  - [ ] Test: Run expireNdas() function
  - [ ] Test: Verify only eligible NDA status changed to EXPIRED
  - [ ] Test: Verify audit log entries created correctly
  - [ ] Test: Verify notification emails queued for subscribers

- [ ] Test notification email integration
  - [ ] Test: Subscribe users to test NDA
  - [ ] Test: Run expireNdas() and verify notifications sent
  - [ ] Test: Email includes correct subject (NDA #XXX Expired)
  - [ ] Test: Email includes correct body (expiration details)
  - [ ] Test: Email recipients match subscribed users
  - [ ] Test: Email queue status = QUEUED
  - [ ] Mock SES to prevent real email sends

- [ ] Test database state verification
  - [ ] Test: Query database after expiration job
  - [ ] Test: Verify NDA status = EXPIRED in database
  - [ ] Test: Verify expirationDate unchanged (not cleared)
  - [ ] Test: Verify audit_log table has expiration entries
  - [ ] Test: Verify nda_emails table has queued notifications
  - [ ] Test: Verify no unexpected side effects

- [ ] Test multiple NDA expiration
  - [ ] Test: Create 10 NDAs with past expiration dates
  - [ ] Test: Run expireNdas() and verify all 10 expired
  - [ ] Test: Verify return count = 10
  - [ ] Test: Verify 10 audit log entries created
  - [ ] Test: Verify notifications sent for all 10 NDAs
  - [ ] Performance: Job completes in <5 seconds for 10 NDAs

- [ ] Test data cleanup
  - [ ] Test: Delete test NDAs after each test (transaction rollback)
  - [ ] Test: Delete test subscriptions
  - [ ] Test: Delete test audit logs
  - [ ] Test: Delete test email queue entries
  - [ ] Verify no data pollution between tests

### Task Group 8: Test Coverage and Documentation (AC: All)

- [ ] Verify test coverage metrics
  - [ ] Run coverage report for expirationJob.ts
  - [ ] Verify line coverage >= 95%
  - [ ] Verify branch coverage >= 90%
  - [ ] Verify function coverage = 100%
  - [ ] Identify uncovered edge cases and add tests

- [ ] Document test patterns and fixtures
  - [ ] Document test file organization (unit vs integration)
  - [ ] Document mock setup patterns (Prisma, pg-boss, Date)
  - [ ] Document test fixture creation (createExpiredNda helper)
  - [ ] Document cleanup patterns (beforeEach/afterEach)
  - [ ] Add JSDoc comments to test helper functions

- [ ] Create test maintenance guide
  - [ ] Document how to run expiration job tests
  - [ ] Document how to debug failing tests
  - [ ] Document test data requirements
  - [ ] Document mock update procedures
  - [ ] Add README in __tests__ directory

- [ ] Integrate with CI/CD pipeline
  - [ ] Add expiration job tests to GitHub Actions workflow
  - [ ] Configure test database for CI environment
  - [ ] Set up test coverage reporting
  - [ ] Configure test failure notifications
  - [ ] Ensure tests run on every PR

### Task Group 9: Performance and Load Testing (AC: 2, 5)

- [ ] Create performance test suite
  - [ ] Create `src/server/jobs/__tests__/expirationJob.performance.test.ts`
  - [ ] Set up performance benchmarking utilities
  - [ ] Configure test timeout (allow longer execution)

- [ ] Test expiration calculation performance
  - [ ] Benchmark: Calculate expiration for 1 NDA (<1ms)
  - [ ] Benchmark: Calculate expiration for 100 NDAs (<100ms)
  - [ ] Benchmark: Calculate expiration for 1000 NDAs (<1 second)
  - [ ] Test: No performance degradation with large datasets
  - [ ] Profile memory usage during calculation

- [ ] Test job execution performance
  - [ ] Benchmark: Expire 10 NDAs (<2 seconds)
  - [ ] Benchmark: Expire 100 NDAs (<10 seconds)
  - [ ] Benchmark: Expire 1000 NDAs (<30 seconds)
  - [ ] Test: Job does not timeout (30-minute limit)
  - [ ] Test: Job scales linearly (O(n) time complexity)

- [ ] Test database query performance
  - [ ] Benchmark: Query for expired NDAs (<100ms)
  - [ ] Test: Query uses expirationDate index (EXPLAIN ANALYZE)
  - [ ] Test: Query performance consistent with large datasets
  - [ ] Test: No N+1 query problems
  - [ ] Profile database query execution plan

### Task Group 10: Edge Cases and Boundary Testing (AC: 1, 2, 3)

- [ ] Test date boundary edge cases
  - [ ] Test: Execution date on Jan 1 at 00:00:00 UTC
  - [ ] Test: Execution date on Dec 31 at 23:59:59 UTC
  - [ ] Test: Execution date on Feb 29 (leap year)
  - [ ] Test: Execution date on Feb 28 (non-leap year)
  - [ ] Test: Execution date at DST transition boundaries

- [ ] Test NDA status edge cases
  - [ ] Test: NDA with no fullyExecutedDate (should skip)
  - [ ] Test: NDA with fullyExecutedDate but no expirationDate (calculate it)
  - [ ] Test: NDA with expirationDate in future (should skip)
  - [ ] Test: NDA already EXPIRED (should skip, no duplicate processing)
  - [ ] Test: NDA in INACTIVE_CANCELED status (should still expire if date passed)

- [ ] Test system boundary conditions
  - [ ] Test: Zero expired NDAs (empty result set)
  - [ ] Test: One expired NDA (minimum batch)
  - [ ] Test: Maximum batch size (1000+ NDAs)
  - [ ] Test: Database connection failure
  - [ ] Test: Email service unavailable (graceful degradation)

- [ ] Test timezone boundary scenarios
  - [ ] Test: Execution in UTC-12 timezone (earliest timezone)
  - [ ] Test: Execution in UTC+14 timezone (latest timezone)
  - [ ] Test: Midnight in one timezone, midday in another
  - [ ] Test: Expiration across international date line
  - [ ] Test: Daylight saving time start/end dates

## Gap Analysis

_This section will be populated by dev-story when gap analysis runs._

**Expected Implementation Status:**
- ✅ expirationJob.test.ts exists (minimal tests, Story 10.19)
- ✅ expireNdas() function implemented (Story 10.4)
- ✅ changeNdaStatus from ndaService exists
- ✅ System user context pattern established
- ❌ Comprehensive test coverage gaps (current file only 130 lines)
- ❌ Integration tests missing (no real database tests)
- ❌ Performance benchmarks missing
- ❌ Edge case coverage incomplete

---

## Dev Notes

### Current Implementation Status

**Existing Files:**
- `src/server/jobs/expirationJob.ts` - Background job implementation (Story 10.4)
- `src/server/jobs/__tests__/expirationJob.test.ts` - Minimal unit tests (130 lines, Story 10.19)
- `src/server/services/ndaService.ts` - changeNdaStatus function (used by expiration job)
- `src/server/jobs/emailQueue.ts` - pg-boss queue infrastructure

**Current Test Coverage (Minimal):**
- Basic unit tests for expireNdas() function
- Mocks for changeNdaStatus and Prisma queries
- Tests for partial failure handling
- Tests for system user context creation
- **Gap:** No integration tests with real database
- **Gap:** No performance benchmarks
- **Gap:** Limited edge case coverage

**Implementation Overview:**
- Story 10.4 implemented auto-expiration logic (expirationJob.ts)
- Story 10.19 created minimal test file (130 lines)
- This story expands tests to comprehensive coverage (≥10KB, 300+ lines)
- Follow patterns from notificationService.test.ts (comprehensive service tests)

### Architecture Patterns

**Test File Organization (Best Practice):**
```
src/server/jobs/__tests__/
  expirationJob.test.ts              # Main test suite (existing, minimal)
  expirationJob.execution-date.test.ts   # AC1: Execution date tests (NEW)
  expirationJob.calculation.test.ts      # AC2: Calculation logic tests (NEW)
  expirationJob.status-transition.test.ts # AC3: Status transition tests (NEW)
  expirationJob.error-handling.test.ts   # AC4: Error handling tests (NEW)
  expirationJob.scheduling.test.ts       # AC5: Job scheduling tests (NEW)
  expirationJob.system-user.test.ts      # AC6: System user context tests (NEW)
  expirationJob.integration.test.ts      # AC7: End-to-end integration tests (NEW)
  expirationJob.performance.test.ts      # Performance benchmarks (NEW)
```

**System User Context Pattern:**
```typescript
// Story 10.19: System user for background jobs
const systemUserContext: UserContext = {
  id: 'system',
  email: 'system@usmax.com',
  contactId: 'system',
  name: 'Auto-Expiration Job',
  active: true,
  roles: ['System'],
  permissions: new Set([
    'nda:view',
    'nda:update',
    'nda:mark_status',
    'admin:*' // System has all permissions
  ]),
  authorizedAgencyGroups: [], // System bypasses agency scope
  authorizedSubagencies: [],
};

// Used in expireNdas():
await changeNdaStatus(nda.id, 'EXPIRED', systemUserContext, {
  ipAddress: 'system',
  userAgent: 'auto-expiration-job'
});
```

**Expiration Calculation Pattern:**
```typescript
// Story 10.4: Date calculation (365 days from execution)
function calculateExpirationDate(fullyExecutedDate: Date): Date {
  const expiration = new Date(fullyExecutedDate);
  expiration.setFullYear(expiration.getFullYear() + 1);
  return expiration;
}

// Test pattern:
it('calculates expiration as execution date + 365 days', () => {
  const executionDate = new Date('2024-01-15T10:30:00Z');
  const expirationDate = calculateExpirationDate(executionDate);

  expect(expirationDate.getFullYear()).toBe(2025);
  expect(expirationDate.getMonth()).toBe(0); // January
  expect(expirationDate.getDate()).toBe(15);
  expect(expirationDate.getHours()).toBe(10);
  expect(expirationDate.getMinutes()).toBe(30);
});
```

**Error Handling Pattern (Partial Failure):**
```typescript
// Story 10.4: Expiration job continues despite individual failures
async function expireNdas(): Promise<number> {
  const expiredNdas = await findExpiredNdas();
  let successCount = 0;

  for (const nda of expiredNdas) {
    try {
      await changeNdaStatus(nda.id, 'EXPIRED', systemUserContext);
      successCount++;
    } catch (error) {
      logger.error('Failed to expire NDA', { ndaId: nda.id, error });
      // Continue processing other NDAs (don't throw)
    }
  }

  return successCount; // Return count of successful expirations
}

// Test pattern:
it('continues processing if one NDA fails', async () => {
  vi.mocked(changeNdaStatus)
    .mockRejectedValueOnce(new Error('Status change failed'))
    .mockResolvedValueOnce({ id: 'nda-2', status: 'EXPIRED' });

  const count = await expireNdas();

  expect(count).toBe(1); // 1 success despite 1 failure
  expect(changeNdaStatus).toHaveBeenCalledTimes(2);
});
```

### Technical Requirements

**Test Framework (Vitest):**
- Use Vitest for all backend tests (configured in vitest.config.ts)
- Use vi.mock() for mocking external dependencies
- Use describe/it/expect pattern for test structure
- Use beforeEach/afterEach for test isolation

**Mock Patterns:**
```typescript
// Mock Prisma client
vi.mock('../../db/index.js', () => ({
  prisma: {
    nda: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// Mock ndaService
vi.mock('../../services/ndaService.js', () => ({
  changeNdaStatus: vi.fn().mockResolvedValue({ id: 'nda-1', status: 'EXPIRED' }),
}));

// Mock Date.now() for deterministic tests
const mockNow = new Date('2024-01-15T00:00:00Z');
vi.spyOn(Date, 'now').mockReturnValue(mockNow.getTime());
```

**Integration Test Setup:**
```typescript
// Use real Prisma with test database
import { prisma } from '../../db/index.js';

describe('Expiration Job Integration', () => {
  beforeEach(async () => {
    // Clean database before each test
    await prisma.nda.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.ndaSubscription.deleteMany();
  });

  it('expires NDAs end-to-end', async () => {
    // Create test NDA with past expiration
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    const nda = await prisma.nda.create({
      data: {
        companyName: 'Test Corp',
        subagencyId: 'test-subagency',
        status: 'FULLY_EXECUTED',
        fullyExecutedDate: pastDate,
        expirationDate: new Date(pastDate.getTime() + 365 * 24 * 60 * 60 * 1000),
        createdById: 'test-user',
      },
    });

    // Run expiration job
    const count = await expireNdas();

    // Verify results
    expect(count).toBe(1);

    const updatedNda = await prisma.nda.findUnique({ where: { id: nda.id } });
    expect(updatedNda.status).toBe('EXPIRED');
  });
});
```

**Performance Benchmarking:**
```typescript
import { performance } from 'perf_hooks';

it('calculates expiration for 1000 NDAs in <1 second', async () => {
  const ndas = Array.from({ length: 1000 }, (_, i) => ({
    id: `nda-${i}`,
    fullyExecutedDate: new Date('2023-01-15T10:00:00Z'),
  }));

  const start = performance.now();

  for (const nda of ndas) {
    calculateExpirationDate(nda.fullyExecutedDate);
  }

  const duration = performance.now() - start;
  expect(duration).toBeLessThan(1000); // <1 second
});
```

### Testing Requirements

**Coverage Goals:**
- Overall test coverage: ≥95% for expirationJob.ts
- Line coverage: ≥95%
- Branch coverage: ≥90%
- Function coverage: 100%

**Test Categories:**
1. **Unit Tests:** Test individual functions in isolation (expireNdas, calculateExpirationDate)
2. **Integration Tests:** Test complete workflow with real database
3. **Performance Tests:** Benchmark execution time and resource usage
4. **Edge Case Tests:** Test boundary conditions and error scenarios

**Test Execution:**
```bash
# Run all expiration job tests
npm run test src/server/jobs/__tests__/expirationJob

# Run specific test file
npm run test src/server/jobs/__tests__/expirationJob.integration.test.ts

# Run with coverage
npm run test:coverage src/server/jobs/__tests__/expirationJob

# Run performance benchmarks
npm run test src/server/jobs/__tests__/expirationJob.performance.test.ts
```

### Architecture Constraints

**Background Job Principles:**
- **Idempotency:** Job can run multiple times without duplicate effects
- **Atomicity:** Each NDA expiration is atomic (transaction-wrapped)
- **Resilience:** Job continues despite partial failures (no abort on single error)
- **Performance:** Job completes in <30 seconds for realistic dataset (1000 NDAs)
- **Observability:** Job logs start, completion, errors, and metrics

**System User Requirements:**
- System user bypasses row-level security (can see all NDAs)
- System user has all permissions (not restricted by RBAC)
- System user actions clearly identified in audit logs
- System user context immutable (not modifiable by job)

**Date Handling Requirements:**
- All dates stored in UTC (database timestamps)
- Expiration calculation timezone-aware (preserves time of day)
- Leap year handling automatic (setFullYear +1 handles 366 days)
- DST transitions handled transparently by JavaScript Date

### File Structure Requirements

**Test Files (NEW - Comprehensive Suite):**
- `src/server/jobs/__tests__/expirationJob.execution-date.test.ts` - AC1: Execution date capture tests
- `src/server/jobs/__tests__/expirationJob.calculation.test.ts` - AC2: Date calculation tests
- `src/server/jobs/__tests__/expirationJob.status-transition.test.ts` - AC3: Status transition tests
- `src/server/jobs/__tests__/expirationJob.error-handling.test.ts` - AC4: Error handling tests
- `src/server/jobs/__tests__/expirationJob.scheduling.test.ts` - AC5: Job scheduling tests
- `src/server/jobs/__tests__/expirationJob.system-user.test.ts` - AC6: System user context tests
- `src/server/jobs/__tests__/expirationJob.integration.test.ts` - AC7: End-to-end integration tests
- `src/server/jobs/__tests__/expirationJob.performance.test.ts` - Performance benchmarks

**Existing Files (UPDATE - Expand):**
- `src/server/jobs/__tests__/expirationJob.test.ts` - Main test suite (expand from 130 lines to comprehensive)

**Test Helpers (NEW):**
- `src/server/jobs/__tests__/helpers/expirationTestFixtures.ts` - Test data factories
- `src/server/jobs/__tests__/helpers/dateTestUtils.ts` - Date manipulation utilities

### Previous Story Intelligence

**Related Prior Work:**
- **Story 10.4:** Implement Auto-Expiration Logic - Created expirationJob.ts with expireNdas() function
- **Story 3.11:** Email Notifications - Pattern for notification testing (notificationService.test.ts)
- **Story 6.1:** Comprehensive Action Logging - Audit log testing patterns
- **Story 8.3:** Email Retry Logic - pg-boss job testing patterns (emailQueue.test.ts)

**Patterns Established:**
- System user context for background jobs (ID='system', email='system@usmax.com')
- Partial failure handling (continue processing despite individual errors)
- Transaction-wrapped mutations (atomic status changes)
- Notification triggers on status changes (EXPIRED event)

**Implementation Notes from Story 10.4:**
- Expiration calculation: fullyExecutedDate + 365 days (setFullYear +1)
- Query filters: expirationDate <= now AND status != EXPIRED
- Job schedule: Daily at midnight (cron: '0 0 * * *')
- Performance target: <30 seconds for 1000 NDAs

### Project Structure Notes

**Existing Test Patterns:**
- Test files co-located in `__tests__/` subdirectories
- Unit tests mock external dependencies (Prisma, services)
- Integration tests use real database (test environment)
- Performance tests use `perf_hooks` module for benchmarking

**Test Data Factories:**
```typescript
// src/server/jobs/__tests__/helpers/expirationTestFixtures.ts
export function createExpiredNda(overrides?: Partial<NDA>): NDA {
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);

  return {
    id: randomUUID(),
    displayId: Math.floor(Math.random() * 10000),
    companyName: 'Test Corporation',
    status: 'FULLY_EXECUTED',
    fullyExecutedDate: pastDate,
    expirationDate: new Date(pastDate.getTime() + 365 * 24 * 60 * 60 * 1000),
    createdById: 'test-user-id',
    subagencyId: 'test-subagency-id',
    ...overrides,
  };
}

export function createNonExpiredNda(overrides?: Partial<NDA>): NDA {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  return createExpiredNda({
    expirationDate: futureDate,
    ...overrides,
  });
}
```

**Code Conventions:**
- TypeScript strict mode enforced
- Async tests use `async/await` (no callbacks)
- Mocks reset in `beforeEach` hooks
- Test names descriptive: `should expire NDAs past expiration date`
- Arrange-Act-Assert pattern for test structure

### References

**Source Documents:**
- [Source: _bmad-output/implementation-artifacts/sprint-artifacts/10-18-implement-approval-notifications.md - Comprehensive story template]
- [Source: _bmad-output/implementation-artifacts/sprint-artifacts/10-4-implement-auto-expiration-logic.md - Expiration job implementation]
- [Source: src/server/jobs/expirationJob.ts - Background job code]
- [Source: src/server/jobs/__tests__/expirationJob.test.ts - Minimal existing tests]
- [Source: src/server/services/__tests__/notificationService.test.ts - Comprehensive service test example]
- [Source: src/server/jobs/__tests__/emailQueue.test.ts - pg-boss job test pattern]
- [Source: _bmad-output/project-context.md#Testing-Rules]

**Functional Requirements:**
- FR102: System provides weekly health reports (background jobs monitored)
- FR100: System retries failed email sends automatically (job resilience pattern)

**Non-Functional Requirements:**
- NFR-M1: Automated test coverage ≥80% (expiration job tests contribute)
- NFR-O5: Zero silent failures (error logging required)
- NFR-R3: Error rate <0.1% of all operations (job reliability)

**Architecture Decisions:**
- pg-boss for job scheduling (retry logic, cron scheduling)
- System user context for background operations
- Transaction-wrapped individual operations (atomicity)
- Partial failure handling (continue processing despite errors)

**Related Stories:**
- Story 10.4: Implement Auto-Expiration Logic (creates expirationJob.ts)
- Story 10.18: Implement Approval Notifications (notification testing patterns)
- Story 8.3: Email Retry Logic (pg-boss job patterns)
- Story 6.1: Comprehensive Action Logging (audit log testing)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

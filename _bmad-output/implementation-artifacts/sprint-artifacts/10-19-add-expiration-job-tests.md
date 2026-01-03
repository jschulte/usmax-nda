# Story 10.19: Add Expiration Job Tests

Status: backlog

## Story

As a developer,
I want comprehensive tests for the expiration background job,
So that we can confidently deploy auto-expiration to production.

## Acceptance Criteria

**AC1: Unit tests for expireNdas() function**
**Given** the expireNdas() function exists
**When** tests are run
**Then** the following scenarios are covered:
- Finds NDAs where expirationDate <= now
- Skips NDAs already EXPIRED
- Changes status to EXPIRED for expired NDAs
- Creates audit log entries for each expiration
- Returns correct count of expired NDAs
- Handles errors gracefully (continues if one NDA fails)

**AC2: Integration test for job scheduling**
**Given** the expirationJob is started
**When** the job runs
**Then** it executes on schedule (daily at midnight)
**And** calls expireNdas() successfully

## Implementation Notes

**Test file:** `src/server/jobs/__tests__/expirationJob.test.ts`

**Patterns from existing tests:**
- Use Vitest + Prisma test database
- Mock system user context
- Create test NDAs with past expiration dates
- Verify status changes and audit logs
- Test error handling

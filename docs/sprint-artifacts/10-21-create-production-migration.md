# Story 10.21: Create Production Migration for Epic 10

Status: backlog

## Story

As a DevOps engineer,
I want a single consolidated migration file for all Epic 10 schema changes,
So that production deployment applies all changes atomically and correctly.

## Acceptance Criteria

**AC1: Single consolidated migration created**
**Given** all Epic 10 schema changes
**When** migration is generated
**Then** a single migration file exists with all changes:
- UsMaxPosition enum update (PRIME, SUB_CONTRACTOR, OTHER)
- NdaType enum update (MUTUAL, CONSULTANT)
- NdaStatus enum update (add PENDING_APPROVAL, SENT_PENDING_SIGNATURE, INACTIVE_CANCELED, EXPIRED)
- Add expirationDate field with index
- Add approvedById, approvedAt, rejectionReason fields
- Data migration for existing records

**AC2: Migration is idempotent and safe**
**Given** the migration file
**When** it runs
**Then** it handles existing data correctly
**And** uses IF NOT EXISTS for additive changes
**And** includes rollback strategy in comments
**And** documents all assumptions

**AC3: Migration tested on staging**
**Given** the migration file
**When** applied to staging environment
**Then** all schema changes succeed
**And** existing data is preserved
**And** no data loss occurs

## Implementation Notes

**Options:**

**Option A: Single consolidated migration**
```bash
npx prisma migrate dev --name epic_10_customer_feedback_implementation
```
After cleaning current schema state, generate one migration with all changes.

**Option B: Use db push (simpler for MVP)**
Document that Epic 10 requires `prisma db push` for deployment (acceptable for early stage).

**Option C: Create manual SQL migration**
Write comprehensive SQL file with all changes, test thoroughly, then mark as applied.

**Recommended:** Option B for now (db push), Option A for production-ready deployment.

**Migration content should include:**
1. All enum updates with data migrations
2. All new fields with defaults
3. Index creation
4. Foreign key for approvedBy relation
5. Comments explaining each change

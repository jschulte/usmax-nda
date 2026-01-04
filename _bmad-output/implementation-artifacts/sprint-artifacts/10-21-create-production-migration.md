# Story 10.21: Create Comprehensive Production Migration for Epic 10

Status: backlog

## Story

As a **DevOps engineer and database administrator**,
I want **a single consolidated, tested, and documented production migration for all Epic 10 schema changes**,
So that **production deployment applies all Epic 10 changes atomically, safely, and with full rollback capability**.

## Acceptance Criteria

**AC1: Consolidated Migration File Created**
**Given** all Epic 10 schema changes are identified
**When** migration is generated
**Then** a single migration file contains all Epic 10 changes
**And** migration includes UsMaxPosition enum update (PRIME, SUB_CONTRACTOR, OTHER)
**And** migration includes NdaType enum update (MUTUAL, CONSULTANT)
**And** migration includes NdaStatus enum updates (PENDING_APPROVAL, EXPIRED)
**And** migration includes expirationDate field with index
**And** migration includes approval workflow fields (approvedById, approvedAt, rejectionReason)
**And** migration includes isNonUsMax boolean field
**And** migration includes comprehensive comments explaining each change

**AC2: Data Migration for Existing Records**
**Given** existing NDAs in production database
**When** migration runs
**Then** existing NDAs with NULL usMaxPosition get default value
**And** existing NDAs with NULL ndaType get default value
**And** existing status values mapped to new enum values correctly
**And** existing fully executed NDAs calculate expirationDate from fullyExecutedDate
**And** no data loss occurs during migration
**And** all existing foreign key relationships preserved

**AC3: Idempotent and Safe Migration**
**Given** the migration file
**When** it runs multiple times
**Then** migration is idempotent (safe to run twice)
**And** uses IF NOT EXISTS for additive changes
**And** uses DO $$ blocks for conditional logic
**And** wraps all changes in transaction (all-or-nothing)
**And** includes validation checks before and after
**And** rollback strategy documented in migration comments

**AC4: Migration Tested on Staging**
**Given** staging environment with production-like data
**When** migration applied to staging
**Then** all schema changes succeed without errors
**And** existing data preserved and migrated correctly
**And** application starts successfully after migration
**And** smoke tests pass (create NDA, route for approval, approve)
**And** no performance degradation (query times remain <500ms)
**And** database integrity checks pass (no orphaned records)

**AC5: Rollback Procedure Documented**
**Given** migration may need rollback
**When** rollback is required
**Then** rollback SQL script included in migration directory
**And** rollback script reverses all schema changes
**And** rollback script preserves data where possible
**And** rollback tested on staging before production
**And** rollback procedure documented in deployment guide

**AC6: Production Deployment Plan**
**Given** migration ready for production
**When** deployment plan created
**Then** plan includes pre-deployment snapshot creation
**And** plan includes maintenance window timing (off-hours)
**And** plan includes estimated migration duration (<5 minutes)
**And** plan includes validation steps post-migration
**And** plan includes communication to stakeholders
**And** plan includes rollback decision criteria

**AC7: Migration Performance Optimized**
**Given** large production dataset (10,000+ NDAs)
**When** migration runs
**Then** migration completes in <5 minutes
**And** indexes created CONCURRENTLY to avoid locks
**And** data migration uses batching (1000 records per batch)
**And** no table locks held longer than 10 seconds
**And** application downtime minimized (<2 minutes)
**And** migration progress logged for monitoring

## Tasks / Subtasks

⚠️ **COMPREHENSIVE TASKS** - Follows Story 10.18 pattern for production-ready deployment.

### Task Group 1: Migration File Creation and Schema Changes (AC: 1)

- [ ] Analyze all Epic 10 schema changes
  - [ ] Review Story 10.1: UsMaxPosition enum (PRIME, SUB_CONTRACTOR, OTHER)
  - [ ] Review Story 10.2: NdaType enum (MUTUAL, CONSULTANT)
  - [ ] Review Story 10.3: NdaStatus enum updates (5 new values)
  - [ ] Review Story 10.4: expirationDate field and index
  - [ ] Review Story 10.6: Approval workflow fields (approvedBy, approvedAt, rejectionReason)
  - [ ] Review Story 10.5: isNonUsMax boolean field
  - [ ] Document all foreign key relationships affected

- [ ] Create consolidated migration file
  - [ ] Run `npx prisma migrate dev --name epic_10_customer_feedback_implementation`
  - [ ] Verify migration file generated in `prisma/migrations/`
  - [ ] Add comprehensive header comments (purpose, Epic, date, author)
  - [ ] Organize changes into logical sections (enums, fields, indexes, data migration)
  - [ ] Add inline comments explaining each change

- [ ] Add UsMaxPosition enum changes
  - [ ] Add enum values: PRIME, SUB_CONTRACTOR, OTHER
  - [ ] Update Prisma schema: `enum UsMaxPosition { PRIME, SUB_CONTRACTOR, OTHER }`
  - [ ] Add migration SQL: `ALTER TYPE "UsMaxPosition" ADD VALUE IF NOT EXISTS 'PRIME'`
  - [ ] Add migration SQL: `ALTER TYPE "UsMaxPosition" ADD VALUE IF NOT EXISTS 'SUB_CONTRACTOR'`
  - [ ] Add migration SQL: `ALTER TYPE "UsMaxPosition" ADD VALUE IF NOT EXISTS 'OTHER'`
  - [ ] Document: "Story 10.1 - USmax position field (Prime/Sub-contractor/Other)"

- [ ] Add NdaType enum changes
  - [ ] Add enum values: MUTUAL, CONSULTANT
  - [ ] Update Prisma schema: `enum NdaType { MUTUAL, CONSULTANT }`
  - [ ] Create new enum type: `CREATE TYPE "NdaType" AS ENUM ('MUTUAL', 'CONSULTANT')`
  - [ ] Add column to NDAs table: `ALTER TABLE "ndas" ADD COLUMN "nda_type" "NdaType"`
  - [ ] Document: "Story 10.2 - NDA type field (Mutual NDA/Consultant)"

- [ ] Add NdaStatus enum changes
  - [ ] Add enum value: PENDING_APPROVAL (Story 10.6)
  - [ ] Add enum value: EXPIRED (Story 10.4)
  - [ ] Update status display names (Story 10.3)
  - [ ] Add migration SQL: `ALTER TYPE "NdaStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL'`
  - [ ] Add migration SQL: `ALTER TYPE "NdaStatus" ADD VALUE IF NOT EXISTS 'EXPIRED'`
  - [ ] Document: "Story 10.3 & 10.6 - Status values for approval workflow and expiration"

- [ ] Add expirationDate field
  - [ ] Add column: `ALTER TABLE "ndas" ADD COLUMN "expiration_date" TIMESTAMP(3)`
  - [ ] Make nullable: `expiration_date` can be NULL (not all NDAs expire)
  - [ ] Create index: `CREATE INDEX "idx_ndas_expiration_date" ON "ndas"("expiration_date")`
  - [ ] Document: "Story 10.4 - Auto-expiration (1 year from execution date)"

- [ ] Add approval workflow fields
  - [ ] Add approvedById column: `ALTER TABLE "ndas" ADD COLUMN "approved_by_id" TEXT`
  - [ ] Add approvedAt column: `ALTER TABLE "ndas" ADD COLUMN "approved_at" TIMESTAMP(3)`
  - [ ] Add rejectionReason column: `ALTER TABLE "ndas" ADD COLUMN "rejection_reason" TEXT`
  - [ ] Add foreign key: `ALTER TABLE "ndas" ADD CONSTRAINT "ndas_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "contacts"("id") ON DELETE SET NULL`
  - [ ] Document: "Story 10.6 - Two-step approval workflow fields"

- [ ] Add isNonUsMax field
  - [ ] Add column: `ALTER TABLE "ndas" ADD COLUMN "is_non_usmax" BOOLEAN DEFAULT FALSE`
  - [ ] Set default: FALSE (standard NDAs)
  - [ ] Make non-nullable: NOT NULL with default
  - [ ] Document: "Story 10.5 - Non-USmax NDA flag for tracking partner NDAs"

### Task Group 2: Data Migration for Existing Records (AC: 2)

- [ ] Create data migration section
  - [ ] Add section header comment: "-- DATA MIGRATION: Populate new fields for existing NDAs"
  - [ ] Use DO $$ blocks for procedural logic
  - [ ] Add logging statements for progress tracking
  - [ ] Handle edge cases (NULL values, orphaned records)

- [ ] Migrate usMaxPosition for existing NDAs
  - [ ] Set default value for existing NULL records
  - [ ] SQL: `UPDATE "ndas" SET "usmax_position" = 'PRIME' WHERE "usmax_position" IS NULL`
  - [ ] Alternative: Prompt user to manually set (if business logic requires)
  - [ ] Log: `RAISE NOTICE 'Updated % NDAs with default usMaxPosition', row_count`
  - [ ] Document assumption: "Default to PRIME for existing NDAs (customer to review)"

- [ ] Migrate ndaType for existing NDAs
  - [ ] Set default value based on existing data
  - [ ] SQL: `UPDATE "ndas" SET "nda_type" = 'MUTUAL' WHERE "nda_type" IS NULL`
  - [ ] Alternative logic: Infer from company or agency (if pattern exists)
  - [ ] Log: `RAISE NOTICE 'Updated % NDAs with default ndaType', row_count`
  - [ ] Document assumption: "Default to MUTUAL (most common type)"

- [ ] Migrate status values to new enum names
  - [ ] Map old status names to new names (if Story 10.3 changed names)
  - [ ] Example: `UPDATE "ndas" SET "status" = 'SENT_PENDING_SIGNATURE' WHERE "status" = 'EMAILED'`
  - [ ] Verify all existing status values covered
  - [ ] Log migration count for each status
  - [ ] Document mapping in migration comments

- [ ] Calculate expirationDate for fully executed NDAs
  - [ ] Find NDAs with fullyExecutedDate set
  - [ ] Calculate expirationDate = fullyExecutedDate + 365 days
  - [ ] SQL: `UPDATE "ndas" SET "expiration_date" = "fully_executed_date" + INTERVAL '1 year' WHERE "fully_executed_date" IS NOT NULL AND "expiration_date" IS NULL`
  - [ ] Verify calculation handles leap years correctly
  - [ ] Log: `RAISE NOTICE 'Calculated expiration dates for % NDAs', row_count`
  - [ ] Document: "Auto-calculated for existing fully executed NDAs"

- [ ] Verify foreign key integrity
  - [ ] Check all approvedById references exist in contacts table
  - [ ] SQL: `SELECT COUNT(*) FROM "ndas" WHERE "approved_by_id" IS NOT NULL AND "approved_by_id" NOT IN (SELECT "id" FROM "contacts")`
  - [ ] If orphaned records found, set approvedById to NULL or system user
  - [ ] Log integrity check results
  - [ ] Document any data cleanup performed

### Task Group 3: Migration Safety and Idempotency (AC: 3)

- [ ] Implement idempotency checks
  - [ ] Check if enum values already exist before adding
  - [ ] Use IF NOT EXISTS for column additions
  - [ ] Use DO $$ blocks for conditional logic
  - [ ] Example: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NdaType') THEN CREATE TYPE "NdaType" AS ENUM (...); END IF; END $$;`
  - [ ] Document: "Migration safe to run multiple times"

- [ ] Wrap changes in transaction
  - [ ] Begin transaction: `BEGIN;`
  - [ ] All DDL and DML statements within transaction
  - [ ] Validation checks before COMMIT
  - [ ] End transaction: `COMMIT;`
  - [ ] Document: "All-or-nothing migration (rollback on any error)"

- [ ] Add pre-migration validation
  - [ ] Check database version compatibility (PostgreSQL 15+)
  - [ ] Check disk space available (estimate 10% of current DB size)
  - [ ] Check no active locks on ndas table
  - [ ] Verify Prisma schema matches expected state
  - [ ] Document validation requirements in migration header

- [ ] Add post-migration validation
  - [ ] Verify all new columns exist: `SELECT column_name FROM information_schema.columns WHERE table_name = 'ndas'`
  - [ ] Verify all new indexes exist: `SELECT indexname FROM pg_indexes WHERE tablename = 'ndas'`
  - [ ] Verify foreign key constraints exist
  - [ ] Verify enum values added correctly
  - [ ] Count records migrated successfully
  - [ ] Log validation results

- [ ] Document rollback strategy
  - [ ] Create rollback.sql file in migration directory
  - [ ] Drop new columns: `ALTER TABLE "ndas" DROP COLUMN "expiration_date"`
  - [ ] Drop new enum types: `DROP TYPE "NdaType"`
  - [ ] Remove enum values (cannot drop, document manual cleanup)
  - [ ] Document: "Rollback removes new fields but preserves data"
  - [ ] Test rollback on staging environment

### Task Group 4: Staging Environment Testing (AC: 4)

- [ ] Prepare staging environment
  - [ ] Create snapshot of staging database (pre-migration backup)
  - [ ] Verify staging has production-like data (10,000+ NDAs)
  - [ ] Seed additional test data if needed
  - [ ] Document staging database state (record counts, table sizes)

- [ ] Run migration on staging
  - [ ] Deploy updated Prisma schema to staging
  - [ ] Run migration: `npx prisma migrate deploy`
  - [ ] Monitor migration logs for errors or warnings
  - [ ] Verify migration completes successfully
  - [ ] Record migration duration (target: <5 minutes)

- [ ] Verify schema changes applied
  - [ ] Query database: `\d ndas` to see new columns
  - [ ] Query enums: `SELECT * FROM pg_enum WHERE enumtypid = 'NdaType'::regtype`
  - [ ] Query indexes: `\di` to see new indexes
  - [ ] Verify foreign keys: `\d+ ndas` to see constraints
  - [ ] Document all changes verified

- [ ] Verify data migration
  - [ ] Check usMaxPosition populated: `SELECT "usmax_position", COUNT(*) FROM "ndas" GROUP BY "usmax_position"`
  - [ ] Check ndaType populated: `SELECT "nda_type", COUNT(*) FROM "ndas" GROUP BY "nda_type"`
  - [ ] Check expirationDate calculated: `SELECT COUNT(*) FROM "ndas" WHERE "expiration_date" IS NOT NULL`
  - [ ] Check no NULL values where not allowed
  - [ ] Verify data integrity (no orphaned records)

- [ ] Run application smoke tests
  - [ ] Test: Create new NDA (status = CREATED)
  - [ ] Test: Route NDA for approval (status → PENDING_APPROVAL)
  - [ ] Test: Approve NDA (status → SENT_PENDING_SIGNATURE)
  - [ ] Test: Reject NDA (status → CREATED, rejection reason saved)
  - [ ] Test: Upload fully executed NDA (expirationDate calculated)
  - [ ] Test: Mark NDA as Non-USmax (isNonUsMax = true)
  - [ ] Verify all workflows function correctly

- [ ] Performance testing
  - [ ] Query performance: NDA list with filters (<500ms)
  - [ ] Query performance: NDA detail load (<200ms)
  - [ ] Index effectiveness: EXPLAIN ANALYZE on filtered queries
  - [ ] No performance degradation compared to pre-migration
  - [ ] Document query execution plans

- [ ] Run database integrity checks
  - [ ] Foreign key integrity: No orphaned records
  - [ ] Enum value consistency: All NDAs have valid enum values
  - [ ] Index health: No duplicate indexes, indexes used correctly
  - [ ] Table statistics: Analyze tables for query planner
  - [ ] Vacuum: Run VACUUM ANALYZE on ndas table

### Task Group 5: Rollback Procedure Documentation (AC: 5)

- [ ] Create rollback SQL script
  - [ ] Create file: `prisma/migrations/.../rollback.sql`
  - [ ] Add header: Purpose, warnings, preconditions
  - [ ] Add transaction wrapper: BEGIN...COMMIT
  - [ ] Drop new columns in reverse order of creation
  - [ ] Remove enum values (document manual process if can't drop)
  - [ ] Drop new enum types

- [ ] Document rollback SQL
  - [ ] Drop isNonUsMax: `ALTER TABLE "ndas" DROP COLUMN "is_non_usmax"`
  - [ ] Drop approval fields: `ALTER TABLE "ndas" DROP COLUMN "approved_by_id", DROP COLUMN "approved_at", DROP COLUMN "rejection_reason"`
  - [ ] Drop expirationDate: `ALTER TABLE "ndas" DROP COLUMN "expiration_date"`
  - [ ] Drop ndaType column: `ALTER TABLE "ndas" DROP COLUMN "nda_type"`
  - [ ] Drop NdaType enum: `DROP TYPE "NdaType"`
  - [ ] Document: "Cannot remove enum values from NdaStatus (PostgreSQL limitation)"

- [ ] Test rollback on staging
  - [ ] Run migration forward on test staging clone
  - [ ] Run rollback script
  - [ ] Verify schema reverted to pre-migration state
  - [ ] Verify application still functions with old schema
  - [ ] Verify no data loss (existing data preserved)
  - [ ] Document rollback duration (<2 minutes)

- [ ] Document rollback decision criteria
  - [ ] Critical errors: Data loss, corruption, foreign key violations
  - [ ] Performance degradation: Query times >2x slower
  - [ ] Application errors: 500 errors, broken workflows
  - [ ] Time window: If issues detected within 1 hour, consider rollback
  - [ ] Stakeholder approval required for rollback decision

- [ ] Create rollback procedure guide
  - [ ] Step 1: Stop application (prevent new writes)
  - [ ] Step 2: Create database snapshot (safety backup)
  - [ ] Step 3: Run rollback.sql script
  - [ ] Step 4: Verify rollback successful
  - [ ] Step 5: Deploy previous application version
  - [ ] Step 6: Resume application
  - [ ] Step 7: Notify stakeholders of rollback and plan forward fix

### Task Group 6: Production Deployment Planning (AC: 6)

- [ ] Create pre-deployment checklist
  - [ ] Schedule maintenance window (off-hours, low traffic)
  - [ ] Create production database snapshot
  - [ ] Verify snapshot restore works (test restore procedure)
  - [ ] Notify stakeholders of maintenance window
  - [ ] Prepare rollback script (tested on staging)
  - [ ] Assemble on-call team (DBA, DevOps, Backend Dev)

- [ ] Document maintenance window plan
  - [ ] Preferred time: Saturday 2:00 AM - 3:00 AM EST (minimal user impact)
  - [ ] Duration: 30 minutes (migration + validation)
  - [ ] Expected downtime: <5 minutes (migration execution)
  - [ ] Communication: Email users 48 hours in advance
  - [ ] Status page update: "Scheduled maintenance"

- [ ] Estimate migration duration
  - [ ] Baseline: Staging migration took X minutes for Y NDAs
  - [ ] Production estimate: Scale by record count ratio
  - [ ] Add buffer: 2x estimate for safety
  - [ ] Target: Complete in <5 minutes
  - [ ] Timeout: Abort and rollback if >10 minutes

- [ ] Define validation steps
  - [ ] Post-migration validation (automated):
    - [ ] Verify schema changes applied
    - [ ] Verify data migrated correctly
    - [ ] Run smoke tests (create, route, approve NDA)
    - [ ] Check error logs (no new errors)
    - [ ] Verify application health check passes
  - [ ] Manual validation (human verification):
    - [ ] Log in as test user
    - [ ] Navigate to NDA list
    - [ ] View NDA detail (check new fields visible)
    - [ ] Create test NDA and route for approval
    - [ ] Verify email notifications sent

- [ ] Create stakeholder communication plan
  - [ ] Pre-deployment (48 hours before):
    - [ ] Email all users about maintenance window
    - [ ] Explain new features (approval workflow, expiration, etc.)
    - [ ] Provide timeline and expected downtime
  - [ ] During deployment:
    - [ ] Update status page: "Maintenance in progress"
    - [ ] Post updates every 10 minutes if extended
  - [ ] Post-deployment:
    - [ ] Email users: "System upgraded, new features available"
    - [ ] Link to release notes and user guide
    - [ ] Provide support contact for issues

- [ ] Define rollback decision criteria
  - [ ] Automatic rollback triggers:
    - [ ] Migration fails with error
    - [ ] Post-migration validation fails
    - [ ] Application fails to start
  - [ ] Manual rollback considerations:
    - [ ] Critical data integrity issues
    - [ ] Performance degradation >2x
    - [ ] Widespread user-reported errors
  - [ ] Decision maker: DevOps Lead + Backend Lead (joint approval)
  - [ ] Time limit: Make rollback decision within 30 minutes of issue

### Task Group 7: Migration Performance Optimization (AC: 7)

- [ ] Optimize index creation
  - [ ] Use CONCURRENTLY for index creation (no table lock)
  - [ ] Example: `CREATE INDEX CONCURRENTLY "idx_ndas_expiration_date" ON "ndas"("expiration_date")`
  - [ ] Trade-off: Slower index creation, but zero downtime
  - [ ] Verify indexes created successfully after migration

- [ ] Implement batched data migration
  - [ ] Migrate in batches of 1000 records
  - [ ] Use DO $$ block with LOOP
  - [ ] Example pattern:
    ```sql
    DO $$
    DECLARE
      batch_size INT := 1000;
      updated_rows INT;
    BEGIN
      LOOP
        UPDATE "ndas"
        SET "expiration_date" = "fully_executed_date" + INTERVAL '1 year'
        WHERE "id" IN (
          SELECT "id" FROM "ndas"
          WHERE "fully_executed_date" IS NOT NULL
          AND "expiration_date" IS NULL
          LIMIT batch_size
        );
        GET DIAGNOSTICS updated_rows = ROW_COUNT;
        EXIT WHEN updated_rows = 0;
        RAISE NOTICE 'Migrated % rows', updated_rows;
        COMMIT; -- Commit each batch
      END LOOP;
    END $$;
    ```
  - [ ] Log progress for monitoring

- [ ] Minimize table locks
  - [ ] Add columns with DEFAULT (avoids full table rewrite in PostgreSQL 11+)
  - [ ] Use ALTER TABLE ... ADD COLUMN ... DEFAULT ... (single pass)
  - [ ] Avoid ALTER TABLE ... ALTER COLUMN ... SET NOT NULL (requires full scan)
  - [ ] Document lock duration for each DDL statement

- [ ] Monitor migration progress
  - [ ] Add RAISE NOTICE statements for each major step
  - [ ] Log timestamp at start and end of migration
  - [ ] Log record counts for each data migration batch
  - [ ] Use pg_stat_progress_create_index for index creation
  - [ ] Output: "Migration started at 2026-01-03 02:00:00"
  - [ ] Output: "Migrated 1000 NDAs (batch 1)"
  - [ ] Output: "Migration completed at 2026-01-03 02:04:32 (duration: 4m 32s)"

- [ ] Optimize for large datasets
  - [ ] Estimate impact: 10,000 NDAs = ~1 minute migration time
  - [ ] Scaling: 100,000 NDAs = ~10 minutes (linear scaling)
  - [ ] Consider partitioning if dataset grows >1M records (future)
  - [ ] Document: "Tested with 50,000 NDAs, completed in 6 minutes"

- [ ] Minimize application downtime
  - [ ] Deploy new application code before migration (backward compatible)
  - [ ] Run migration during off-hours (minimal active users)
  - [ ] Keep old application running until migration completes
  - [ ] Switch to new application after migration validated
  - [ ] Target downtime: <2 minutes (only during app restart)

### Task Group 8: Migration Documentation and Knowledge Transfer (AC: All)

- [ ] Document migration file structure
  - [ ] Header: Purpose, Epic number, related stories
  - [ ] Section 1: Enum changes (UsMaxPosition, NdaType, NdaStatus)
  - [ ] Section 2: New columns (expirationDate, approval fields, isNonUsMax)
  - [ ] Section 3: Indexes (expirationDate index for query performance)
  - [ ] Section 4: Foreign keys (approvedBy relationship)
  - [ ] Section 5: Data migration (populate new fields for existing records)
  - [ ] Footer: Validation queries, rollback instructions

- [ ] Create migration README
  - [ ] File: `prisma/migrations/.../README.md`
  - [ ] Purpose: Epic 10 Customer Feedback Implementation
  - [ ] Changes summary: 7 schema changes, 4 data migrations
  - [ ] Related stories: 10.1 - 10.6
  - [ ] Testing: Tested on staging with 50,000 NDAs
  - [ ] Duration: ~5 minutes for 50,000 records
  - [ ] Rollback: See rollback.sql

- [ ] Document assumptions and defaults
  - [ ] usMaxPosition default: PRIME (Story 10.1)
  - [ ] ndaType default: MUTUAL (Story 10.2)
  - [ ] isNonUsMax default: FALSE (Story 10.5)
  - [ ] expirationDate: Calculated for existing fully executed NDAs (Story 10.4)
  - [ ] Document: "Review defaults with customer post-migration"

- [ ] Create deployment runbook
  - [ ] Step-by-step deployment instructions
  - [ ] Pre-deployment checklist (snapshot, notification, team assembled)
  - [ ] Deployment commands (Prisma migrate, app restart)
  - [ ] Post-deployment validation (smoke tests, health checks)
  - [ ] Rollback procedure (if needed)
  - [ ] Contact information (on-call team)

- [ ] Document lessons learned
  - [ ] What went well (e.g., batching prevented table locks)
  - [ ] What could improve (e.g., earlier staging testing)
  - [ ] Performance notes (migration duration vs. dataset size)
  - [ ] Recommendations for future migrations
  - [ ] Knowledge transfer to team

### Task Group 9: Automated Testing and CI/CD Integration (AC: 4)

- [ ] Create migration test script
  - [ ] Script: `scripts/test-migration.sh`
  - [ ] Seed test database with sample data
  - [ ] Run migration forward
  - [ ] Validate schema changes
  - [ ] Run smoke tests
  - [ ] Run migration rollback
  - [ ] Validate rollback successful
  - [ ] Clean up test database

- [ ] Add migration tests to CI pipeline
  - [ ] GitHub Actions workflow: `.github/workflows/test-migration.yml`
  - [ ] Trigger: On PR to main branch
  - [ ] Steps: Checkout, setup database, run migration test
  - [ ] Fail PR if migration test fails
  - [ ] Generate migration test report

- [ ] Create automated smoke tests
  - [ ] Test: Create NDA with new fields
  - [ ] Test: Route NDA for approval
  - [ ] Test: Approve NDA
  - [ ] Test: Reject NDA with reason
  - [ ] Test: Mark NDA as Non-USmax
  - [ ] Test: Verify expiration date calculation
  - [ ] All tests must pass post-migration

- [ ] Document CI/CD integration
  - [ ] Migration tests run automatically on every PR
  - [ ] Failed tests block merge
  - [ ] Test results visible in PR status checks
  - [ ] Manual override not allowed (enforce testing)

### Task Group 10: Post-Migration Monitoring and Validation (AC: 6)

- [ ] Set up post-migration monitoring
  - [ ] Monitor error logs for 24 hours post-deployment
  - [ ] Monitor query performance (compare to pre-migration baseline)
  - [ ] Monitor API response times (<500ms target)
  - [ ] Monitor database CPU and memory usage
  - [ ] Set up alerts for errors or performance degradation

- [ ] Create validation dashboard
  - [ ] Display: Migration status (success/failure)
  - [ ] Display: Record counts (before/after)
  - [ ] Display: Data integrity checks (pass/fail)
  - [ ] Display: Performance metrics (query times)
  - [ ] Display: Error counts (grouped by type)

- [ ] Run comprehensive validation queries
  - [ ] Count NDAs with usMaxPosition set: `SELECT COUNT(*) FROM "ndas" WHERE "usmax_position" IS NOT NULL`
  - [ ] Count NDAs with ndaType set: `SELECT COUNT(*) FROM "ndas" WHERE "nda_type" IS NOT NULL`
  - [ ] Count NDAs with expirationDate: `SELECT COUNT(*) FROM "ndas" WHERE "expiration_date" IS NOT NULL`
  - [ ] Verify all foreign keys valid: `SELECT COUNT(*) FROM "ndas" WHERE "approved_by_id" IS NOT NULL AND "approved_by_id" NOT IN (SELECT "id" FROM "contacts")`
  - [ ] Document all query results

- [ ] Schedule post-migration review
  - [ ] Meeting: 1 week after deployment
  - [ ] Attendees: DevOps, Backend Dev, QA, Product Manager
  - [ ] Agenda: Review metrics, issues encountered, lessons learned
  - [ ] Document: Post-migration report
  - [ ] Action items: Address any lingering issues

## Gap Analysis

_This section will be populated by dev-story when gap analysis runs._

**Expected Implementation Status:**
- ✅ All Epic 10 stories implemented (10.1 - 10.17 done)
- ✅ Prisma schema updated with all new fields
- ✅ Application code supports all new features
- ❌ Production migration not yet created
- ❌ Migration not tested on staging
- ❌ Rollback procedure not documented
- ❌ Deployment plan not finalized

---

## Dev Notes

### Current Implementation Status

**Existing Files:**
- `prisma/schema.prisma` - Updated with Epic 10 changes
- `prisma/migrations/` - Individual dev migrations exist (need consolidation)
- No consolidated production migration yet
- No rollback script yet

**Epic 10 Schema Changes Summary:**
1. **UsMaxPosition enum** (Story 10.1): PRIME, SUB_CONTRACTOR, OTHER
2. **NdaType enum** (Story 10.2): MUTUAL, CONSULTANT
3. **NdaStatus updates** (Story 10.3, 10.6): PENDING_APPROVAL, EXPIRED
4. **expirationDate field** (Story 10.4): TIMESTAMP(3), nullable, indexed
5. **Approval workflow fields** (Story 10.6): approvedById, approvedAt, rejectionReason
6. **isNonUsMax field** (Story 10.5): BOOLEAN, default FALSE

**Migration Approach:**
- **Option A:** Consolidate all dev migrations into single production migration (recommended)
- **Option B:** Use `prisma db push` for deployment (simpler, but no migration history)
- **Option C:** Run dev migrations individually (risky, harder to rollback)
- **Recommendation:** Option A for production-grade deployment

### Architecture Patterns

**Production Migration Template:**
```sql
-- Migration: Epic 10 Customer Feedback Implementation
-- Date: 2026-01-03
-- Author: DevOps Team
-- Stories: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
-- Duration: ~5 minutes for 50,000 NDAs
-- Rollback: See rollback.sql

BEGIN;

-- ============================================================
-- SECTION 1: ENUM UPDATES
-- ============================================================

-- Story 10.1: UsMaxPosition enum (Prime/Sub-contractor/Other)
ALTER TYPE "UsMaxPosition" ADD VALUE IF NOT EXISTS 'PRIME';
ALTER TYPE "UsMaxPosition" ADD VALUE IF NOT EXISTS 'SUB_CONTRACTOR';
ALTER TYPE "UsMaxPosition" ADD VALUE IF NOT EXISTS 'OTHER';

-- Story 10.2: NdaType enum (Mutual NDA/Consultant)
DO $$ BEGIN
  CREATE TYPE "NdaType" AS ENUM ('MUTUAL', 'CONSULTANT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Story 10.3 & 10.6: NdaStatus enum updates
ALTER TYPE "NdaStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "NdaStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- ============================================================
-- SECTION 2: NEW COLUMNS
-- ============================================================

-- Story 10.2: Add NDA type field
ALTER TABLE "ndas" ADD COLUMN IF NOT EXISTS "nda_type" "NdaType";

-- Story 10.4: Add expiration date field
ALTER TABLE "ndas" ADD COLUMN IF NOT EXISTS "expiration_date" TIMESTAMP(3);

-- Story 10.5: Add Non-USmax NDA flag
ALTER TABLE "ndas" ADD COLUMN IF NOT EXISTS "is_non_usmax" BOOLEAN NOT NULL DEFAULT FALSE;

-- Story 10.6: Add approval workflow fields
ALTER TABLE "ndas" ADD COLUMN IF NOT EXISTS "approved_by_id" TEXT;
ALTER TABLE "ndas" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);
ALTER TABLE "ndas" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

-- Story 10.4: Expiration date index for query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ndas_expiration_date"
  ON "ndas"("expiration_date");

-- ============================================================
-- SECTION 4: FOREIGN KEYS
-- ============================================================

-- Story 10.6: Approved by foreign key
DO $$ BEGIN
  ALTER TABLE "ndas" ADD CONSTRAINT "ndas_approved_by_id_fkey"
    FOREIGN KEY ("approved_by_id") REFERENCES "contacts"("id")
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- SECTION 5: DATA MIGRATION
-- ============================================================

-- Story 10.1: Set default usMaxPosition for existing NDAs
UPDATE "ndas"
SET "usmax_position" = 'PRIME'
WHERE "usmax_position" IS NULL;

-- Story 10.2: Set default ndaType for existing NDAs
UPDATE "ndas"
SET "nda_type" = 'MUTUAL'
WHERE "nda_type" IS NULL;

-- Story 10.4: Calculate expiration dates for fully executed NDAs
UPDATE "ndas"
SET "expiration_date" = "fully_executed_date" + INTERVAL '1 year'
WHERE "fully_executed_date" IS NOT NULL
  AND "expiration_date" IS NULL;

-- ============================================================
-- SECTION 6: VALIDATION
-- ============================================================

-- Verify all new columns exist
DO $$ BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_name = 'ndas' AND column_name = 'nda_type') = 1,
         'Column nda_type not found';
  ASSERT (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_name = 'ndas' AND column_name = 'expiration_date') = 1,
         'Column expiration_date not found';
  -- ... more assertions
END $$;

COMMIT;

-- Migration complete
RAISE NOTICE 'Epic 10 migration completed successfully';
```

**Rollback Script Template:**
```sql
-- Rollback: Epic 10 Customer Feedback Implementation
-- WARNING: This will remove all Epic 10 features
-- Data in new fields will be lost
-- Test on staging before running in production

BEGIN;

-- Remove foreign key first
ALTER TABLE "ndas" DROP CONSTRAINT IF EXISTS "ndas_approved_by_id_fkey";

-- Drop new columns (reverse order of creation)
ALTER TABLE "ndas" DROP COLUMN IF EXISTS "rejection_reason";
ALTER TABLE "ndas" DROP COLUMN IF EXISTS "approved_at";
ALTER TABLE "ndas" DROP COLUMN IF EXISTS "approved_by_id";
ALTER TABLE "ndas" DROP COLUMN IF EXISTS "is_non_usmax";
ALTER TABLE "ndas" DROP COLUMN IF EXISTS "expiration_date";
ALTER TABLE "ndas" DROP COLUMN IF EXISTS "nda_type";

-- Drop new enum types
DROP TYPE IF EXISTS "NdaType";

-- Note: Cannot drop enum values from NdaStatus (PostgreSQL limitation)
-- Manual cleanup required if needed:
-- 1. Update any NDAs with PENDING_APPROVAL or EXPIRED to different status
-- 2. Recreate enum without those values
-- 3. Update column type

COMMIT;

RAISE NOTICE 'Epic 10 rollback completed';
```

### Technical Requirements

**PostgreSQL Version:**
- Minimum: PostgreSQL 15 (for IF NOT EXISTS support)
- Recommended: PostgreSQL 15 or 16

**Migration Tools:**
- Prisma Migrate: `npx prisma migrate deploy`
- Direct SQL: `psql` for manual execution if needed
- Monitoring: `pg_stat_progress_create_index` for index creation

**Transaction Requirements:**
- All DDL and DML in single transaction (all-or-nothing)
- Exception: CREATE INDEX CONCURRENTLY cannot run in transaction (run separately)

### Testing Requirements

**Staging Testing Checklist:**
- [ ] Staging database snapshot created (rollback point)
- [ ] Migration applied successfully
- [ ] Schema validated (all columns, indexes, foreign keys)
- [ ] Data validated (defaults applied, calculations correct)
- [ ] Application smoke tests pass
- [ ] Performance baseline met (queries <500ms)
- [ ] Rollback tested and validated

**Production Deployment Checklist:**
- [ ] Maintenance window scheduled (off-hours)
- [ ] Production snapshot created
- [ ] Snapshot restore tested
- [ ] Stakeholders notified (48 hours advance)
- [ ] On-call team assembled
- [ ] Rollback script ready and tested

### Architecture Constraints

**Migration Principles:**
- **Idempotent:** Safe to run multiple times (IF NOT EXISTS)
- **Atomic:** All changes in transaction (rollback on error)
- **Performant:** <5 minutes for 50,000 NDAs
- **Safe:** Zero data loss, foreign key integrity preserved
- **Documented:** Comments explain every change

**Deployment Constraints:**
- **Downtime:** Minimize to <2 minutes (app restart only)
- **Reversible:** Rollback script tested and ready
- **Validated:** Post-migration checks confirm success
- **Monitored:** Logs and metrics tracked for 24 hours

### File Structure Requirements

**Migration Files (NEW):**
- `prisma/migrations/20260103_epic_10_customer_feedback/migration.sql` - Consolidated migration
- `prisma/migrations/20260103_epic_10_customer_feedback/rollback.sql` - Rollback script
- `prisma/migrations/20260103_epic_10_customer_feedback/README.md` - Migration documentation

**Deployment Scripts (NEW):**
- `scripts/deploy-epic-10.sh` - Automated deployment script
- `scripts/test-migration.sh` - Migration test script for CI
- `scripts/rollback-epic-10.sh` - Rollback automation

**Documentation (UPDATE):**
- `docs/deployment-guide.md` - Add Epic 10 deployment section
- `docs/database-migrations.md` - Document Epic 10 migration

### Previous Story Intelligence

**Related Prior Work:**
- **Story 10.1-10.6:** Implemented all Epic 10 features (schema changes in dev)
- **All Epic 1-9 Migrations:** Established migration patterns and best practices
- **Story 8.17:** Automated Database Snapshots - Snapshot creation for rollback safety

**Patterns Established:**
- Use Prisma migrations for all schema changes
- Test on staging before production
- Create snapshots before migrations
- Document rollback procedures
- Validate post-migration

### Project Structure Notes

**Existing Migration Patterns:**
- Migrations in `prisma/migrations/` directory
- Each migration in timestamped subdirectory
- `migration.sql` for forward migration
- Prisma auto-generates based on schema.prisma changes

**Migration Naming Convention:**
- Format: `YYYYMMDDHHMMSS_description`
- Example: `20260103120000_epic_10_customer_feedback_implementation`
- Description: snake_case, descriptive

### References

**Source Documents:**
- [Source: _bmad-output/implementation-artifacts/sprint-artifacts/10-18-implement-approval-notifications.md - Comprehensive story template]
- [Source: _bmad-output/implementation-artifacts/sprint-artifacts/10-1-add-usmax-position-field.md - Epic 10 Story 1]
- [Source: _bmad-output/implementation-artifacts/sprint-artifacts/10-6-implement-approval-workflow.md - Epic 10 Story 6]
- [Source: prisma/schema.prisma - Updated schema with Epic 10 changes]
- [Source: _bmad-output/project-context.md#Migration-Safety-Rules]

**Non-Functional Requirements:**
- NFR-R4: Zero data loss incidents (migration must preserve all data)
- NFR-R10: Low-downtime deployments (<5 minutes maintenance window)
- NFR-D1: Referential integrity enforced (foreign keys validated)

**Related Stories:**
- Story 10.1-10.17: All Epic 10 implementation stories
- Story 8.17: Automated Database Snapshots (snapshot creation pattern)
- All previous migration stories (established migration best practices)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

-- Migration: Epic 10 - Customer Feedback Implementation
-- Date: 2025-12-24
-- Stories: 10.1-10.17 + follow-ups
-- 
-- This migration consolidates all Epic 10 schema changes into a single production-ready migration.
-- Changes were developed and tested individually, now combined for atomic deployment.

-- ============================================================================
-- STORY 10.1: Update USmax Position Enum
-- ============================================================================
-- Change: PRIME, SUB → SUB_CONTRACTOR, TEAMING → OTHER (remove old values)
-- Data Migration: Existing SUB → SUB_CONTRACTOR, TEAMING → OTHER

-- Add SUB_CONTRACTOR if doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUB_CONTRACTOR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UsMaxPosition')) THEN
    ALTER TYPE "UsMaxPosition" ADD VALUE 'SUB_CONTRACTOR';
  END IF;
END $$;

-- Migrate data
UPDATE ndas SET usmax_position = 'SUB_CONTRACTOR' WHERE usmax_position = 'SUB';
UPDATE ndas SET usmax_position = 'OTHER' WHERE usmax_position = 'TEAMING';

-- Recreate enum without old values
ALTER TABLE ndas ALTER COLUMN usmax_position DROP DEFAULT;
CREATE TYPE "UsMaxPosition_new" AS ENUM ('PRIME', 'SUB_CONTRACTOR', 'OTHER');
ALTER TABLE ndas ALTER COLUMN usmax_position TYPE "UsMaxPosition_new" USING usmax_position::text::"UsMaxPosition_new";
ALTER TABLE ndas ALTER COLUMN usmax_position SET DEFAULT 'PRIME'::"UsMaxPosition_new";
DROP TYPE "UsMaxPosition";
ALTER TYPE "UsMaxPosition_new" RENAME TO "UsMaxPosition";

-- ============================================================================
-- STORY 10.2: Update NDA Type Enum
-- ============================================================================
-- Change: MUTUAL, CONSULTANT only (remove 4 unused types)
-- Data Migration: All non-MUTUAL → CONSULTANT

-- Add CONSULTANT
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONSULTANT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NdaType')) THEN
    ALTER TYPE "NdaType" ADD VALUE 'CONSULTANT';
  END IF;
END $$;

-- Migrate data
UPDATE ndas SET nda_type = 'CONSULTANT' WHERE nda_type IN ('ONE_WAY_GOVERNMENT', 'ONE_WAY_COUNTERPARTY', 'VISITOR', 'RESEARCH', 'VENDOR_ACCESS');

-- Recreate enum
ALTER TABLE ndas ALTER COLUMN nda_type DROP DEFAULT;
CREATE TYPE "NdaType_new" AS ENUM ('MUTUAL', 'CONSULTANT');
ALTER TABLE ndas ALTER COLUMN nda_type TYPE "NdaType_new" USING nda_type::text::"NdaType_new";
ALTER TABLE ndas ALTER COLUMN nda_type SET DEFAULT 'MUTUAL'::"NdaType_new";
DROP TYPE "NdaType";
ALTER TYPE "NdaType_new" RENAME TO "NdaType";

-- ============================================================================
-- STORY 10.3: Update Status Enum (Legacy Display Names)
-- ============================================================================
-- Change: EMAILED → SENT_PENDING_SIGNATURE, merge INACTIVE+CANCELLED, add PENDING_APPROVAL, EXPIRED
-- Data Migration: Existing data migrated to new values

-- Add new values
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING_APPROVAL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NdaStatus')) THEN
    ALTER TYPE "NdaStatus" ADD VALUE 'PENDING_APPROVAL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SENT_PENDING_SIGNATURE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NdaStatus')) THEN
    ALTER TYPE "NdaStatus" ADD VALUE 'SENT_PENDING_SIGNATURE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INACTIVE_CANCELED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NdaStatus')) THEN
    ALTER TYPE "NdaStatus" ADD VALUE 'INACTIVE_CANCELED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EXPIRED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NdaStatus')) THEN
    ALTER TYPE "NdaStatus" ADD VALUE 'EXPIRED';
  END IF;
END $$;

-- Migrate data in ndas table
UPDATE ndas SET status = 'SENT_PENDING_SIGNATURE' WHERE status = 'EMAILED';
UPDATE ndas SET status = 'INACTIVE_CANCELED' WHERE status IN ('INACTIVE', 'CANCELLED');

-- Migrate data in nda_status_history table
UPDATE nda_status_history SET status = 'SENT_PENDING_SIGNATURE' WHERE status = 'EMAILED';
UPDATE nda_status_history SET status = 'INACTIVE_CANCELED' WHERE status IN ('INACTIVE', 'CANCELLED');

-- Recreate enum
ALTER TABLE ndas ALTER COLUMN status DROP DEFAULT;
CREATE TYPE "NdaStatus_new" AS ENUM ('CREATED', 'PENDING_APPROVAL', 'SENT_PENDING_SIGNATURE', 'IN_REVISION', 'FULLY_EXECUTED', 'INACTIVE_CANCELED', 'EXPIRED');

ALTER TABLE ndas ALTER COLUMN status TYPE "NdaStatus_new" USING status::text::"NdaStatus_new";
ALTER TABLE nda_status_history ALTER COLUMN status TYPE "NdaStatus_new" USING status::text::"NdaStatus_new";

ALTER TABLE ndas ALTER COLUMN status SET DEFAULT 'CREATED'::"NdaStatus_new";
DROP TYPE "NdaStatus";
ALTER TYPE "NdaStatus_new" RENAME TO "NdaStatus";

-- ============================================================================
-- STORY 10.4: Add Auto-Expiration Fields
-- ============================================================================
-- Add expirationDate field and index

ALTER TABLE ndas ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMP;
CREATE INDEX IF NOT EXISTS "ndas_expiration_date_idx" ON ndas(expiration_date);

-- ============================================================================
-- STORY 10.6: Add Approval Workflow Fields
-- ============================================================================
-- Add approval tracking fields

ALTER TABLE ndas ADD COLUMN IF NOT EXISTS approved_by_id VARCHAR;
ALTER TABLE ndas ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE ndas ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add foreign key for approvedBy relation (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ndas_approved_by_id_fkey'
  ) THEN
    ALTER TABLE ndas ADD CONSTRAINT ndas_approved_by_id_fkey 
      FOREIGN KEY (approved_by_id) REFERENCES contacts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify all changes applied successfully

DO $$
DECLARE
  position_count INTEGER;
  type_count INTEGER;
  status_count INTEGER;
  column_exists BOOLEAN;
BEGIN
  -- Check enum values
  SELECT COUNT(*) INTO position_count FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UsMaxPosition');
  SELECT COUNT(*) INTO type_count FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NdaType');
  SELECT COUNT(*) INTO status_count FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NdaStatus');
  
  -- Check new columns exist
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ndas' AND column_name = 'expiration_date') INTO column_exists;
  
  -- Log verification results
  RAISE NOTICE 'Epic 10 Migration Verification:';
  RAISE NOTICE '  UsMaxPosition values: % (expected: 3)', position_count;
  RAISE NOTICE '  NdaType values: % (expected: 2)', type_count;
  RAISE NOTICE '  NdaStatus values: % (expected: 7)', status_count;
  RAISE NOTICE '  expirationDate column exists: %', column_exists;
  
  IF position_count != 3 OR type_count != 2 OR status_count != 7 OR NOT column_exists THEN
    RAISE EXCEPTION 'Epic 10 migration verification failed - check counts above';
  END IF;
END $$;

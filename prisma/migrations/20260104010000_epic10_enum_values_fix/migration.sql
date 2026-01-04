-- Ensure Epic 10 enum values and columns exist without using new values in-transaction

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'SUB_CONTRACTOR'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UsMaxPosition')
  ) THEN
    ALTER TYPE "UsMaxPosition" ADD VALUE 'SUB_CONTRACTOR';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'CONSULTANT'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NdaType')
  ) THEN
    ALTER TYPE "NdaType" ADD VALUE 'CONSULTANT';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'PENDING_APPROVAL'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NdaStatus')
  ) THEN
    ALTER TYPE "NdaStatus" ADD VALUE 'PENDING_APPROVAL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'SENT_PENDING_SIGNATURE'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NdaStatus')
  ) THEN
    ALTER TYPE "NdaStatus" ADD VALUE 'SENT_PENDING_SIGNATURE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'INACTIVE_CANCELED'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NdaStatus')
  ) THEN
    ALTER TYPE "NdaStatus" ADD VALUE 'INACTIVE_CANCELED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'EXPIRED'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NdaStatus')
  ) THEN
    ALTER TYPE "NdaStatus" ADD VALUE 'EXPIRED';
  END IF;
END $$;

ALTER TABLE ndas ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMP;
CREATE INDEX IF NOT EXISTS "ndas_expiration_date_idx" ON ndas(expiration_date);

ALTER TABLE ndas ADD COLUMN IF NOT EXISTS approved_by_id VARCHAR;
ALTER TABLE ndas ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE ndas ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ndas_approved_by_id_fkey'
  ) THEN
    ALTER TABLE ndas
      ADD CONSTRAINT ndas_approved_by_id_fkey
      FOREIGN KEY (approved_by_id) REFERENCES contacts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

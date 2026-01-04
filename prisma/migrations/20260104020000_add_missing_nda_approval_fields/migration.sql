-- Add missing NDA approval/expiration columns (schema drift fix)

ALTER TABLE ndas ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMP;
ALTER TABLE ndas ADD COLUMN IF NOT EXISTS approved_by_id VARCHAR;
ALTER TABLE ndas ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE ndas ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS "ndas_expiration_date_idx" ON ndas(expiration_date);

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

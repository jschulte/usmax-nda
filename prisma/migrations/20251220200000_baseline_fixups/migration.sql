-- Baseline fixups for existing database drift

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NdaType') THEN
    CREATE TYPE "NdaType" AS ENUM ('MUTUAL', 'ONE_WAY_GOVERNMENT', 'ONE_WAY_COUNTERPARTY', 'VISITOR', 'RESEARCH', 'VENDOR_ACCESS');
  END IF;
END $$;

ALTER TABLE "ndas" ADD COLUMN IF NOT EXISTS "contacts_poc_id" TEXT;
ALTER TABLE "ndas" ADD COLUMN IF NOT EXISTS "nda_type" "NdaType" NOT NULL DEFAULT 'MUTUAL';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ndas_contacts_poc_id_fkey'
  ) THEN
    ALTER TABLE "ndas" ADD CONSTRAINT "ndas_contacts_poc_id_fkey" FOREIGN KEY ("contacts_poc_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "subagencies_agency_group_id_name_key" ON "subagencies"("agency_group_id", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "subagencies_agency_group_id_name_ci_key" ON "subagencies"("agency_group_id", lower("name"));

CREATE TABLE IF NOT EXISTS "email_templates" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_templates_is_default_idx" ON "email_templates"("is_default");
CREATE INDEX IF NOT EXISTS "email_templates_is_active_idx" ON "email_templates"("is_active");

ALTER TABLE "nda_emails" ADD COLUMN IF NOT EXISTS "template_id" TEXT;
CREATE INDEX IF NOT EXISTS "nda_emails_template_id_idx" ON "nda_emails"("template_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nda_emails_template_id_fkey'
  ) THEN
    ALTER TABLE "nda_emails" ADD CONSTRAINT "nda_emails_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

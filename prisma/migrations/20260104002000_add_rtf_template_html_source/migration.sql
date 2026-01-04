-- Add html_source column to rtf_templates
ALTER TABLE "rtf_templates" ADD COLUMN "html_source" BYTEA;

-- Enforce unique template names (case-sensitive at DB level)
ALTER TABLE "rtf_templates" ADD CONSTRAINT "rtf_templates_name_key" UNIQUE ("name");

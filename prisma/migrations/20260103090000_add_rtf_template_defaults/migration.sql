-- CreateTable
CREATE TABLE IF NOT EXISTS "rtf_template_defaults" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "agency_group_id" TEXT,
    "subagency_id" TEXT,
    "nda_type" "NdaType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,

    CONSTRAINT "rtf_template_defaults_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rtf_template_defaults_scope_key" UNIQUE ("agency_group_id", "subagency_id", "nda_type")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rtf_template_defaults_template_id_idx" ON "rtf_template_defaults"("template_id");
CREATE INDEX IF NOT EXISTS "rtf_template_defaults_agency_group_id_idx" ON "rtf_template_defaults"("agency_group_id");
CREATE INDEX IF NOT EXISTS "rtf_template_defaults_subagency_id_idx" ON "rtf_template_defaults"("subagency_id");

-- AddForeignKey
ALTER TABLE "rtf_template_defaults"
    ADD CONSTRAINT "rtf_template_defaults_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "rtf_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rtf_template_defaults"
    ADD CONSTRAINT "rtf_template_defaults_agency_group_id_fkey"
    FOREIGN KEY ("agency_group_id") REFERENCES "agency_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rtf_template_defaults"
    ADD CONSTRAINT "rtf_template_defaults_subagency_id_fkey"
    FOREIGN KEY ("subagency_id") REFERENCES "subagencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rtf_template_defaults"
    ADD CONSTRAINT "rtf_template_defaults_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

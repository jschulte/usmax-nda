-- AlterTable
ALTER TABLE "ndas" ADD COLUMN "rtf_template_id" TEXT;

-- CreateIndex
CREATE INDEX "ndas_rtf_template_id_idx" ON "ndas"("rtf_template_id");

-- AddForeignKey
ALTER TABLE "ndas" ADD CONSTRAINT "ndas_rtf_template_id_fkey" FOREIGN KEY ("rtf_template_id") REFERENCES "rtf_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

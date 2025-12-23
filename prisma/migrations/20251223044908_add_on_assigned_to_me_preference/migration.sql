-- DropIndex
DROP INDEX "nda_emails_template_id_idx";

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "on_assigned_to_me" BOOLEAN NOT NULL DEFAULT true;

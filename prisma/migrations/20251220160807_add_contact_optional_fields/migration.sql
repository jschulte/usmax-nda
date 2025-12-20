-- CreateEnum
CREATE TYPE "NdaType" AS ENUM ('MUTUAL', 'ONE_WAY_GOVERNMENT', 'ONE_WAY_COUNTERPARTY', 'VISITOR', 'RESEARCH', 'VENDOR_ACCESS');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'DELIVERED', 'BOUNCED');

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "email_signature" TEXT,
ADD COLUMN     "fax" TEXT,
ADD COLUMN     "is_internal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "file_type" TEXT,
ADD COLUMN     "is_fully_executed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "s3_region" TEXT NOT NULL DEFAULT 'us-east-1',
ADD COLUMN     "version_number" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ndas" ADD COLUMN     "contacts_poc_id" TEXT,
ADD COLUMN     "nda_type" "NdaType" NOT NULL DEFAULT 'MUTUAL';

-- CreateTable
CREATE TABLE "nda_emails" (
    "id" TEXT NOT NULL,
    "nda_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "to_recipients" TEXT[],
    "cc_recipients" TEXT[],
    "bcc_recipients" TEXT[],
    "body" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_by_id" TEXT NOT NULL,
    "ses_message_id" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,

    CONSTRAINT "nda_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "on_nda_created" BOOLEAN NOT NULL DEFAULT true,
    "on_nda_emailed" BOOLEAN NOT NULL DEFAULT true,
    "on_document_uploaded" BOOLEAN NOT NULL DEFAULT true,
    "on_status_changed" BOOLEAN NOT NULL DEFAULT true,
    "on_fully_executed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nda_subscriptions" (
    "id" TEXT NOT NULL,
    "nda_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nda_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rtf_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" BYTEA NOT NULL,
    "agency_group_id" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,

    CONSTRAINT "rtf_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nda_emails_nda_id_idx" ON "nda_emails"("nda_id");

-- CreateIndex
CREATE INDEX "nda_emails_status_idx" ON "nda_emails"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_contact_id_key" ON "notification_preferences"("contact_id");

-- CreateIndex
CREATE INDEX "nda_subscriptions_nda_id_idx" ON "nda_subscriptions"("nda_id");

-- CreateIndex
CREATE INDEX "nda_subscriptions_contact_id_idx" ON "nda_subscriptions"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "nda_subscriptions_nda_id_contact_id_key" ON "nda_subscriptions"("nda_id", "contact_id");

-- CreateIndex
CREATE INDEX "rtf_templates_agency_group_id_idx" ON "rtf_templates"("agency_group_id");

-- CreateIndex
CREATE INDEX "rtf_templates_is_active_idx" ON "rtf_templates"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "system_config_key_idx" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "documents_document_type_idx" ON "documents"("document_type");

-- CreateIndex
CREATE INDEX "documents_is_fully_executed_idx" ON "documents"("is_fully_executed");

-- AddForeignKey
ALTER TABLE "ndas" ADD CONSTRAINT "ndas_contacts_poc_id_fkey" FOREIGN KEY ("contacts_poc_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nda_emails" ADD CONSTRAINT "nda_emails_nda_id_fkey" FOREIGN KEY ("nda_id") REFERENCES "ndas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nda_emails" ADD CONSTRAINT "nda_emails_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nda_subscriptions" ADD CONSTRAINT "nda_subscriptions_nda_id_fkey" FOREIGN KEY ("nda_id") REFERENCES "ndas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nda_subscriptions" ADD CONSTRAINT "nda_subscriptions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rtf_templates" ADD CONSTRAINT "rtf_templates_agency_group_id_fkey" FOREIGN KEY ("agency_group_id") REFERENCES "agency_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rtf_templates" ADD CONSTRAINT "rtf_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

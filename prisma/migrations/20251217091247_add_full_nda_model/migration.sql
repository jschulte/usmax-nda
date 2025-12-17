-- CreateEnum
CREATE TYPE "NdaStatus" AS ENUM ('CREATED', 'EMAILED', 'IN_REVISION', 'FULLY_EXECUTED', 'INACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UsMaxPosition" AS ENUM ('PRIME', 'SUB', 'TEAMING', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('GENERATED', 'UPLOADED', 'FULLY_EXECUTED');

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "cognito_id" TEXT,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "work_phone" TEXT,
    "cell_phone" TEXT,
    "job_title" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system_role" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "contact_roles" (
    "contact_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "granted_by" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_roles_pkey" PRIMARY KEY ("contact_id","role_id")
);

-- CreateTable
CREATE TABLE "agency_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subagencies" (
    "id" TEXT NOT NULL,
    "agency_group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subagencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_group_grants" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "agency_group_id" TEXT NOT NULL,
    "granted_by" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_group_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subagency_grants" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "subagency_id" TEXT NOT NULL,
    "granted_by" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subagency_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ndas" (
    "id" TEXT NOT NULL,
    "display_id" SERIAL NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_city" TEXT,
    "company_state" TEXT,
    "state_of_incorporation" TEXT,
    "agency_group_id" TEXT NOT NULL,
    "subagency_id" TEXT,
    "agency_office_name" TEXT,
    "abbreviated_name" TEXT NOT NULL,
    "authorized_purpose" VARCHAR(255) NOT NULL,
    "effective_date" TIMESTAMP(3),
    "usmax_position" "UsMaxPosition" NOT NULL DEFAULT 'PRIME',
    "is_non_usmax" BOOLEAN NOT NULL DEFAULT false,
    "status" "NdaStatus" NOT NULL DEFAULT 'CREATED',
    "fully_executed_date" TIMESTAMP(3),
    "opportunity_poc_id" TEXT NOT NULL,
    "contracts_poc_id" TEXT,
    "relationship_poc_id" TEXT NOT NULL,
    "cloned_from_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ndas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nda_status_history" (
    "id" TEXT NOT NULL,
    "nda_id" TEXT NOT NULL,
    "status" "NdaStatus" NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_id" TEXT NOT NULL,

    CONSTRAINT "nda_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "nda_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL DEFAULT 'UPLOADED',
    "uploaded_by_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "user_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_cognito_id_key" ON "contacts"("cognito_id");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_email_key" ON "contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "agency_groups_name_key" ON "agency_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "agency_groups_code_key" ON "agency_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "subagencies_agency_group_id_code_key" ON "subagencies"("agency_group_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "agency_group_grants_contact_id_agency_group_id_key" ON "agency_group_grants"("contact_id", "agency_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "subagency_grants_contact_id_subagency_id_key" ON "subagency_grants"("contact_id", "subagency_id");

-- CreateIndex
CREATE UNIQUE INDEX "ndas_display_id_key" ON "ndas"("display_id");

-- CreateIndex
CREATE INDEX "ndas_agency_group_id_idx" ON "ndas"("agency_group_id");

-- CreateIndex
CREATE INDEX "ndas_subagency_id_idx" ON "ndas"("subagency_id");

-- CreateIndex
CREATE INDEX "ndas_status_idx" ON "ndas"("status");

-- CreateIndex
CREATE INDEX "ndas_company_name_idx" ON "ndas"("company_name");

-- CreateIndex
CREATE INDEX "ndas_created_by_id_idx" ON "ndas"("created_by_id");

-- CreateIndex
CREATE INDEX "ndas_effective_date_idx" ON "ndas"("effective_date");

-- CreateIndex
CREATE INDEX "nda_status_history_nda_id_idx" ON "nda_status_history"("nda_id");

-- CreateIndex
CREATE INDEX "documents_nda_id_idx" ON "documents"("nda_id");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_user_id_idx" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_roles" ADD CONSTRAINT "contact_roles_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_roles" ADD CONSTRAINT "contact_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_roles" ADD CONSTRAINT "contact_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subagencies" ADD CONSTRAINT "subagencies_agency_group_id_fkey" FOREIGN KEY ("agency_group_id") REFERENCES "agency_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_group_grants" ADD CONSTRAINT "agency_group_grants_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_group_grants" ADD CONSTRAINT "agency_group_grants_agency_group_id_fkey" FOREIGN KEY ("agency_group_id") REFERENCES "agency_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_group_grants" ADD CONSTRAINT "agency_group_grants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subagency_grants" ADD CONSTRAINT "subagency_grants_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subagency_grants" ADD CONSTRAINT "subagency_grants_subagency_id_fkey" FOREIGN KEY ("subagency_id") REFERENCES "subagencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subagency_grants" ADD CONSTRAINT "subagency_grants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ndas" ADD CONSTRAINT "ndas_agency_group_id_fkey" FOREIGN KEY ("agency_group_id") REFERENCES "agency_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ndas" ADD CONSTRAINT "ndas_subagency_id_fkey" FOREIGN KEY ("subagency_id") REFERENCES "subagencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ndas" ADD CONSTRAINT "ndas_opportunity_poc_id_fkey" FOREIGN KEY ("opportunity_poc_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ndas" ADD CONSTRAINT "ndas_contracts_poc_id_fkey" FOREIGN KEY ("contracts_poc_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ndas" ADD CONSTRAINT "ndas_relationship_poc_id_fkey" FOREIGN KEY ("relationship_poc_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ndas" ADD CONSTRAINT "ndas_cloned_from_id_fkey" FOREIGN KEY ("cloned_from_id") REFERENCES "ndas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ndas" ADD CONSTRAINT "ndas_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nda_status_history" ADD CONSTRAINT "nda_status_history_nda_id_fkey" FOREIGN KEY ("nda_id") REFERENCES "ndas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nda_status_history" ADD CONSTRAINT "nda_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_nda_id_fkey" FOREIGN KEY ("nda_id") REFERENCES "ndas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

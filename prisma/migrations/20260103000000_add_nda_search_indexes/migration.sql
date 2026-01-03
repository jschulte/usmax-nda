-- Add search-related indexes for NDA global search (Story 5.1)
CREATE INDEX "ndas_abbreviated_name_idx" ON "ndas"("abbreviated_name");
CREATE INDEX "ndas_authorized_purpose_idx" ON "ndas"("authorized_purpose");
CREATE INDEX "ndas_agency_office_name_idx" ON "ndas"("agency_office_name");
CREATE INDEX "ndas_company_city_idx" ON "ndas"("company_city");
CREATE INDEX "ndas_company_state_idx" ON "ndas"("company_state");
CREATE INDEX "ndas_state_of_incorporation_idx" ON "ndas"("state_of_incorporation");

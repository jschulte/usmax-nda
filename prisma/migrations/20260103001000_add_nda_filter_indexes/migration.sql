-- Add filter-related indexes for NDA list filtering (Story 5.3)
CREATE INDEX "ndas_nda_type_idx" ON "ndas"("nda_type");
CREATE INDEX "ndas_is_non_usmax_idx" ON "ndas"("is_non_usmax");
CREATE INDEX "ndas_usmax_position_idx" ON "ndas"("usmax_position");
CREATE INDEX "ndas_created_at_idx" ON "ndas"("created_at");
CREATE INDEX "ndas_opportunity_poc_id_idx" ON "ndas"("opportunity_poc_id");
CREATE INDEX "ndas_contracts_poc_id_idx" ON "ndas"("contracts_poc_id");
CREATE INDEX "ndas_relationship_poc_id_idx" ON "ndas"("relationship_poc_id");

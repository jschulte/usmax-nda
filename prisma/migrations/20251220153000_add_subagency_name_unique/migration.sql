-- Add unique constraint for subagency name within agency group
CREATE UNIQUE INDEX "subagencies_agency_group_id_name_key" ON "subagencies"("agency_group_id", "name");

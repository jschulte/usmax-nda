-- Add unique constraint for subagency name within agency group
CREATE UNIQUE INDEX "subagencies_agency_group_id_name_key" ON "subagencies"("agency_group_id", "name");

-- Enforce case-insensitive uniqueness for subagency names within group
CREATE UNIQUE INDEX "subagencies_agency_group_id_name_ci_key"
  ON "subagencies"("agency_group_id", lower("name"));

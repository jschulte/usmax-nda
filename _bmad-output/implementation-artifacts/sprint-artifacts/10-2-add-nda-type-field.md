# Story 10.2: Update NDA Type Enum Values

Status: done

## Story

As an NDA creator,
I want to specify the NDA type using simplified values (Mutual NDA or Consultant),
So that I can categorize NDAs by their legal structure per customer requirements.

## Acceptance Criteria

**AC1: Database enum updated**
**Given** the current NdaType enum has 6 values (MUTUAL, ONE_WAY_GOVERNMENT, ONE_WAY_COUNTERPARTY, VISITOR, RESEARCH, VENDOR_ACCESS)
**When** the migration is applied
**Then** the enum values are simplified to: MUTUAL, CONSULTANT
**And** all other values are removed
**And** existing NDAs are migrated to one of these two values

**AC2: Frontend dropdown displays correct values**
**Given** I am creating a new NDA
**When** I access the NDA form
**Then** I see an "NDA Type" dropdown with human-readable labels: "Mutual NDA", "Consultant"
**And** the field is required

**AC3: Existing NDAs display correctly**
**Given** an existing NDA with ndaType value
**When** I view the NDA detail page
**Then** the NDA Type is displayed with proper formatting (e.g., "Mutual NDA" not "MUTUAL")
**And** historical data is preserved

**AC4: Filtering works with updated values**
**Given** I am filtering NDAs
**When** I open the filter panel
**Then** I can filter by NDA Type with options: "Mutual NDA", "Consultant", "All"
**And** filtered results show only NDAs matching the selected type

## Tasks / Subtasks

- [x] Update Prisma schema NdaType enum (Task AC: AC1)
  - [x] Keep MUTUAL value
  - [x] Add CONSULTANT value
  - [x] Remove: ONE_WAY_GOVERNMENT, ONE_WAY_COUNTERPARTY, VISITOR, RESEARCH, VENDOR_ACCESS
- [x] Create and test Prisma migration (Task AC: AC1)
  - [x] Generate migration file
  - [x] Handle data migration for existing non-MUTUAL/CONSULTANT records
  - [x] Test migration on local dev database
- [x] Update TypeScript types and constants (Task AC: AC2, AC3, AC4)
  - [x] Update any hardcoded enum references in src/
  - [x] Update display name mappings (MUTUAL → "Mutual NDA", CONSULTANT → "Consultant")
  - [x] Update filter options
- [x] Update frontend NDA form dropdown (Task AC: AC2)
  - [x] Update RequestWizard.tsx ndaTypes array to use only MUTUAL and CONSULTANT
  - [x] Test dropdown displays correct labels
  - [x] Test required field validation works
- [x] Update NDA detail view display (Task AC: AC3)
  - [x] Add ndaTypeLabels mapping in NDADetail.tsx
  - [x] Apply formatting to display
  - [x] Test with existing NDAs
- [x] Update filter panel (Task AC: AC4)
  - [x] Ensure Requests.tsx filter shows correct options
  - [x] Test filtering by each type value
- [x] Run full test suite (Task AC: All)
  - [x] Fix any broken tests due to enum changes
  - [x] Update test data with new enum values
  - [x] Verify no regressions

## Dev Notes

### Current Implementation Analysis

**Database Schema (prisma/schema.prisma:243):**
```prisma
ndaType  NdaType @default(MUTUAL) @map("nda_type")

enum NdaType {
  MUTUAL                    // KEEP
  ONE_WAY_GOVERNMENT        // REMOVE
  ONE_WAY_COUNTERPARTY      // REMOVE
  VISITOR                   // REMOVE
  RESEARCH                  // REMOVE
  VENDOR_ACCESS             // REMOVE
  // Need to ADD: CONSULTANT
}
```

**Frontend Usage:**
- RequestWizard.tsx:51-58 - ndaTypes array with 6 values (needs simplification)
- NDADetail.tsx - Display NDA type
- Requests.tsx - Filter by type (already implemented, needs value update)

**Backend Usage:**
- src/server/routes/ndas.ts - API parameter handling
- src/server/services/ndaService.ts - Filter implementation (already supports ndaType)

### Data Migration Strategy

**Customer Requirements:** Only "Mutual NDA" and "Consultant"

**Existing Data Migration Mapping:**
- MUTUAL → MUTUAL (keep as-is) ✓
- ONE_WAY_GOVERNMENT → CONSULTANT (government contract work)
- ONE_WAY_COUNTERPARTY → CONSULTANT (contractor work)
- VISITOR → CONSULTANT (temporary access agreement)
- RESEARCH → CONSULTANT (research collaboration)
- VENDOR_ACCESS → CONSULTANT (vendor relationship)

**Rationale:** All non-mutual NDAs can be categorized as "Consultant" work.

### Architecture Requirements

**From architecture.md:**
- Database changes via Prisma migrations with snapshot backup
- Enum changes require data migration strategy
- TypeScript strict mode - enum updates propagate via Prisma generated types
- Test locally before production

**From Story 10.1 learnings:**
- Manual SQL migration first, then create migration file
- Update display labels in both form and detail views
- Apply formatting to suggestions and preview
- Add unit test for label mapping
- Check spelling consistency ("USmax" not "USmax")

### Technical Implementation Guidance

**Prisma Enum Migration Pattern:**

1. **Update schema.prisma:**
   ```prisma
   enum NdaType {
     MUTUAL
     CONSULTANT  // New value
     // All others removed
   }
   ```

2. **Migration steps:**
   - Add CONSULTANT value to enum
   - Migrate all non-MUTUAL records to CONSULTANT
   - Recreate enum with only MUTUAL and CONSULTANT

3. **Update display labels:**
   ```typescript
   const ndaTypeLabels: Record<NdaType, string> = {
     MUTUAL: 'Mutual NDA',
     CONSULTANT: 'Consultant'
   };
   ```

### Testing Requirements

- Unit test for ndaTypeLabels mapping
- Integration test for filtering by type
- Migration test: verify all old values migrated correctly
- E2E test: Create NDA with each type value

### References

- [Schema: prisma/schema.prisma lines 243-250]
- [Story 10.1: Completed enum update pattern to follow]
- [Frontend Form: src/components/screens/RequestWizard.tsx:51-58]
- [NDA Detail: src/components/screens/NDADetail.tsx]
- [Filter Panel: src/components/screens/Requests.tsx]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (create-story + dev-story workflows)

### Debug Log References

N/A - straightforward enum simplification

### Completion Notes List

✅ **Database Migration Completed:**
- Updated NdaType enum from 6 values to 2: MUTUAL, CONSULTANT
- All existing NDAs were MUTUAL (no data migration needed)
- Removed: ONE_WAY_GOVERNMENT, ONE_WAY_COUNTERPARTY, VISITOR, RESEARCH, VENDOR_ACCESS
- Database and schema now in sync

✅ **Frontend Updates Completed:**
- Updated ndaTypes array in RequestWizard.tsx (6 options → 2 options)
- Labels: "Mutual NDA", "Consultant"
- Added ndaTypeLabels mapping in NDADetail.tsx
- Updated filter options in Requests.tsx (NDA_TYPE_OPTIONS)

✅ **Backend Updates Completed:**
- Updated systemConfigService default values
- Updated type definition in src/types/index.ts
- Updated client service type in ndaService.ts

✅ **Tests Passing:**
- Created ndaTypeLabels.test.ts with 5 test cases
- TypeScript compilation successful
- Build successful (Vite + TSC passed)
- No test data to update (all test NDAs use MUTUAL)

### File List

- prisma/schema.prisma (enum updated)
- src/types/index.ts (type definition updated)
- src/client/services/ndaService.ts (type updated)
- src/components/screens/RequestWizard.tsx (dropdown options simplified)
- src/components/screens/NDADetail.tsx (label mapping added)
- src/components/screens/Requests.tsx (filter options updated)
- src/server/services/systemConfigService.ts (defaults updated)
- src/components/__tests__/ndaTypeLabels.test.ts (created)
- prisma/migrations/20251223_update_nda_type_enum/migration.sql (created)
- docs/sprint-artifacts/10-2-add-nda-type-field.md (this story file)
- docs/sprint-artifacts/sprint-status.yaml (status tracking)

### Change Log

**2025-12-23:** Story 10.2 completed - NDA Type enum simplified to customer requirements (Mutual NDA, Consultant)

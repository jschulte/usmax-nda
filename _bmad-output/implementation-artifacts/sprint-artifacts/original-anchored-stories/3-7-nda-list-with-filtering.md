# Story 3.7: NDA List with Filtering

Status: done

## Story

As an **NDA user**,
I want **to view and filter my NDAs**,
so that **I can quickly find specific NDAs among many records**.

## Acceptance Criteria

### AC1: NDA List View
**Given** I navigate to "All NDAs" or "My NDAs" (filter preset)
**When** Page loads
**Then** Table displays with columns: Display ID, Company, Agency, Status, Effective Date, Requested Date, Latest Change, Actions
**And** NDAs automatically filtered by my authorized agencies (row-level security)
**And** Sortable by any column (click header)
**And** Paginated (default 20 per page, configurable)

### AC2: Filter Panel
**Given** I open filter panel
**When** 15 filter fields displayed
**Then** Can filter by: Agency, Company Name, City, State, Type, State of Incorporation, Agency/Office Name, Non-USmax checkbox, Effective Date range (≥, ≤), Requested Date range, 3 POC name filters
**And** Filters use type-ahead search (not long dropdown scrolling)
**And** Recently used values at top of dropdowns

### AC3: Filter Presets
**Given** I click filter preset "Expiring Soon"
**When** Preset applied
**Then** Filters set to: Effective Date + typical term ≤ 30 days from now
**And** Shows NDAs approaching expiration

## Tasks / Subtasks

- [ ] **Task 1: NDA List API** (AC: 1)
  - [ ] 1.1: Implement `GET /api/ndas` with pagination
  - [ ] 1.2: Add row-level security filtering
  - [ ] 1.3: Add sortable columns (sortBy, sortOrder params)
  - [ ] 1.4: Return total count for pagination

- [ ] **Task 2: Filter Implementation** (AC: 2)
  - [ ] 2.1: Add filter query parameters to list endpoint
  - [ ] 2.2: Implement 15 filter criteria
  - [ ] 2.3: Add date range filters (effectiveDateFrom, effectiveDateTo)
  - [ ] 2.4: Add POC name filters with partial matching

- [ ] **Task 3: Filter Presets API** (AC: 3)
  - [ ] 3.1: Create filter preset definitions
  - [ ] 3.2: Add `GET /api/ndas/filter-presets` endpoint
  - [ ] 3.3: Implement preset logic (Expiring Soon, My NDAs, etc.)

- [ ] **Task 4: Testing** (AC: All)
  - [ ] 4.1: Test list pagination
  - [ ] 4.2: Test all 15 filter criteria
  - [ ] 4.3: Test row-level security
  - [ ] 4.4: Test filter presets

### Review Follow-ups (AI)
- [x] [AI-Review][HIGH] Build "All NDAs" and "My NDAs" list views with required columns (Display ID, Company, Agency, Status, Effective Date, Requested Date, Latest Change, Actions) and route/preset wiring. [src/components/screens/Requests.tsx:312]
- [x] [AI-Review][HIGH] Implement remaining filter criteria + true type-ahead sources: NDA Type filter is blocked by missing ndaType storage; city/state/agency-office still rely on recent values only. [src/components/screens/Requests.tsx:212]
- [x] [AI-Review][HIGH] Fix "Expiring Soon" preset to compute expiration using effective date + term/expiry (not just effectiveDate window). [src/server/services/ndaService.ts:719]
- [x] [AI-Review][MEDIUM] Add column sorting UI and validate a sortBy allowlist (including related fields) so header sorting works reliably. [src/server/services/ndaService.ts:738]
- [x] [AI-Review][MEDIUM] Align pagination with AC (default 20) and make page size configurable in UI (not hard-coded 25). [src/components/screens/Requests.tsx:71]
- [x] [AI-Review][MEDIUM] Add Dev Agent Record with File List + Change Log to enable verifiable review. [docs/sprint-artifacts/3-7-nda-list-with-filtering.md:34]
- [x] [AI-Review][LOW] Expand tests to cover all 15 filters, row-level security, expiring-soon semantics, and sort allowlist mapping. [src/server/services/__tests__/ndaService.test.ts:343]
- [x] [AI-Review][HIGH] Add NDA Type storage (schema + create/update) so the "Type" filter is meaningful. [prisma/schema.prisma:239]

## Dev Notes

### List Query Parameters

```typescript
interface NdaListParams {
  // Pagination
  page?: number;        // default 1
  limit?: number;       // default 20, max 100

  // Sorting
  sortBy?: string;      // column name
  sortOrder?: 'asc' | 'desc';

  // Filters (15 criteria)
  agencyGroupId?: string;
  subagencyId?: string;
  companyName?: string;     // partial match
  companyCity?: string;
  companyState?: string;
  stateOfIncorporation?: string;
  agencyOfficeName?: string;
  isNonUsMax?: boolean;
  status?: NdaStatus;
  effectiveDateFrom?: string;
  effectiveDateTo?: string;
  createdDateFrom?: string;
  createdDateTo?: string;
  opportunityPocName?: string;
  contractsPocName?: string;
  relationshipPocName?: string;

  // Preset
  preset?: 'my-ndas' | 'expiring-soon' | 'drafts' | 'inactive';
}
```

### Filter Presets

```typescript
const presets = {
  'my-ndas': { createdById: userContext.contactId },
  'expiring-soon': { effectiveDateTo: addDays(new Date(), 30) },
  'drafts': { status: NdaStatus.CREATED },
  'inactive': { status: NdaStatus.INACTIVE },
};
```

### Row-Level Security

```typescript
// Always applied to NDA queries
const securityFilter = {
  OR: [
    { agencyGroupId: { in: userContext.authorizedAgencyGroups } },
    { subagencyId: { in: userContext.authorizedSubagencies } },
  ],
};
```

## Dependencies

- Story 3.1: Create NDA with Basic Form
- Story 1.4: Row-Level Security Implementation

## Dev Agent Record

### File List
- src/components/screens/Requests.tsx
- src/components/layout/Sidebar.tsx
- src/App.tsx
- src/client/services/ndaService.ts
- src/server/services/ndaService.ts
- src/server/services/systemConfigService.ts
- src/server/services/__tests__/ndaService.test.ts
- src/server/routes/ndas.ts
- docs/sprint-artifacts/3-7-nda-list-with-filtering.md

### Change Log
- Added All NDAs / My NDAs routes and sidebar navigation, preserving /requests as an alias.
- Added NDA type filtering and backend typeahead suggestions for city/state/incorporation/agency office fields.
- Displayed latest change using status history (status + actor + date) in the list.
- Added sort allowlist with nested agency sorting and safer defaults.
- Updated expiring-soon preset to use effective date + default term days from system config.
- Added system config default for NDA term length.
- Expanded list filter tests to cover NDA type, POC filters, row-level security, and sort fallback.

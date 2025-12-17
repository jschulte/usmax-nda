# Story 3.7: NDA List with Filtering

Status: backlog

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
**Then** Can filter by: Agency, Company Name, City, State, Type, State of Incorporation, Agency/Office Name, Non-USMax checkbox, Effective Date range (≥, ≤), Requested Date range, 3 POC name filters
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

# Story 5.3: Advanced Filtering System

Status: ready-for-dev

## Story

As an **NDA User**,
I want **to filter NDAs by multiple criteria simultaneously**,
so that **I can narrow down to exactly the NDAs I need to review**.

## Acceptance Criteria

### AC1: Multi-Criteria Filtering
**Given** I am on the NDA list screen
**When** I open the filter panel
**Then** I can select filters for all 15 criteria:
- Agency Group
- Subagency
- Company Name
- City
- State
- NDA Type
- Incorporation State
- Agency/Office Name
- Non-USMax flag
- Effective Date range
- Requested Date range
- Opportunity POC
- Contracts POC
- Relationship POC
- Status

### AC2: Filter Combination Logic
**And** filters combine using AND logic (all criteria must match)
**And** the NDA list updates immediately as I apply filters
**And** active filters are visually indicated with badges or tags
**And** I can clear individual filters or all filters at once
**And** filter state persists across page navigation

## Tasks / Subtasks

- [ ] **Task 1: Database - Filter Indexes** (AC: 1)
  - [ ] 1.1: Create indexes on all 15 filterable fields
  - [ ] 1.2: Indexes: agency_group_id, subagency_id, company_name, city, state
  - [ ] 1.3: Indexes: nda_type, state_of_incorporation, agency_office_name, non_usmax
  - [ ] 1.4: Indexes: effective_date, created_at (requested date)
  - [ ] 1.5: Indexes: opportunity_contact_id, contracts_contact_id, relationship_contact_id, status
  - [ ] 1.6: Run migration for all indexes

- [ ] **Task 2: NDA Service - Filter Logic** (AC: 1, 2)
  - [ ] 2.1: Extend `ndaService.listNdas()` with filters parameter
  - [ ] 2.2: Define FilterParams type with all 15 fields
  - [ ] 2.3: Build Prisma WHERE clause dynamically from filters
  - [ ] 2.4: Combine with AND logic (all filters must match)
  - [ ] 2.5: Handle date ranges (gte/lte for effective_date and created_at)
  - [ ] 2.6: Handle text filters (exact match or ILIKE)
  - [ ] 2.7: Apply row-level security (AND with filters)

- [ ] **Task 3: API - Filter Parameters** (AC: 1, 2)
  - [ ] 3.1: Extend `GET /api/ndas` to accept all 15 filter query params
  - [ ] 3.2: Validate filter values (enums, date formats, UUIDs)
  - [ ] 3.3: Parse query params into FilterParams object
  - [ ] 3.4: Call ndaService.listNdas() with filters
  - [ ] 3.5: Return filtered results with total count

- [ ] **Task 4: Frontend - Filter Panel Component** (AC: 1)
  - [ ] 4.1: Create `src/components/screens/NDAFilterPanel.tsx`
  - [ ] 4.2: Add filter inputs for all 15 criteria:
    - Dropdowns: Agency Group, Subagency, Status, NDA Type, Opportunity/Contracts/Relationship POC
    - Text inputs: Company Name, City, State, Inc. State, Agency/Office Name
    - Checkbox: Non-USMax
    - Date ranges: Effective Date, Requested Date
  - [ ] 4.3: Use Radix UI Select components for dropdowns
  - [ ] 4.4: Use date picker component for date ranges

- [ ] **Task 5: Frontend - Filter State Management** (AC: 2)
  - [ ] 5.1: Add filter state to NDA list component
  - [ ] 5.2: Update state on filter input changes
  - [ ] 5.3: Trigger API call with updated filters
  - [ ] 5.4: Debounce text inputs (500ms delay)
  - [ ] 5.5: Immediate update for dropdowns/checkboxes

- [ ] **Task 6: Frontend - Active Filter Badges** (AC: 2)
  - [ ] 6.1: Display active filters as badge chips above table
  - [ ] 6.2: Show filter label: "Status: Emailed", "Agency: DoD"
  - [ ] 6.3: Add X button to each badge to clear individual filter
  - [ ] 6.4: Add "Clear All Filters" button when any active
  - [ ] 6.5: Use Badge component with dismiss action

- [ ] **Task 7: Frontend - Filter Persistence** (AC: 2)
  - [ ] 7.1: Add filters to URL query params
  - [ ] 7.2: Read filters from URL on mount
  - [ ] 7.3: Optionally save filter state to user preferences (persistent across sessions)
  - [ ] 7.4: Preserve filters when navigating away and back
  - [ ] 7.5: Clear filters resets to default state

- [ ] **Task 8: Frontend - React Query Integration** (AC: 2)
  - [ ] 8.1: Update useNdas hook to include filters in query key
  - [ ] 8.2: Pass filters to API request
  - [ ] 8.3: Trigger refetch when filters change
  - [ ] 8.4: Show loading state during filter application

- [ ] **Task 9: Testing** (AC: All)
  - [ ] 9.1: Unit tests for filter WHERE clause building
  - [ ] 9.2: Unit tests for date range filtering
  - [ ] 9.3: API tests for each filter type
  - [ ] 9.4: API tests for multiple filters combined
  - [ ] 9.5: API tests for row-level security with filters
  - [ ] 9.6: Component tests for filter panel
  - [ ] 9.7: E2E tests for filtering flow

## Dev Notes

### Filter Parameters Type

**TypeScript Interface:**
```typescript
interface NdaFilterParams {
  // Entity filters
  agencyGroupId?: string;
  subagencyId?: string;
  status?: NdaStatus;
  ndaType?: string;

  // Text filters
  companyName?: string;
  city?: string;
  state?: string;
  stateOfIncorporation?: string;
  agencyOfficeName?: string;

  // Boolean filters
  nonUsmax?: boolean;

  // Date range filters
  effectiveDateFrom?: Date;
  effectiveDateTo?: Date;
  requestedDateFrom?: Date;
  requestedDateTo?: Date;

  // POC filters
  opportunityContactId?: string;
  contractsContactId?: string;
  relationshipContactId?: string;

  // Combined with search and sort
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
```

### Backend Filter Query Construction

**Dynamic WHERE Clause:**
```typescript
function buildFilterWhereClause(filters: NdaFilterParams, userId: string): Prisma.NdaWhereInput {
  const where: Prisma.NdaWhereInput = {
    AND: [
      // Row-level security (ALWAYS applied)
      {
        subagencyId: {
          in: getUserAuthorizedSubagencyIds(userId)
        }
      },

      // Apply each filter if provided
      filters.agencyGroupId ? {
        subagency: { agencyGroupId: filters.agencyGroupId }
      } : {},

      filters.subagencyId ? {
        subagencyId: filters.subagencyId
      } : {},

      filters.status ? {
        status: filters.status
      } : {},

      filters.companyName ? {
        companyName: { contains: filters.companyName, mode: 'insensitive' }
      } : {},

      filters.city ? {
        city: { contains: filters.city, mode: 'insensitive' }
      } : {},

      filters.state ? {
        state: filters.state
      } : {},

      filters.stateOfIncorporation ? {
        stateOfIncorporation: filters.stateOfIncorporation
      } : {},

      filters.agencyOfficeName ? {
        agencyOfficeName: { contains: filters.agencyOfficeName, mode: 'insensitive' }
      } : {},

      filters.nonUsmax !== undefined ? {
        nonUsmax: filters.nonUsmax
      } : {},

      // Date ranges
      filters.effectiveDateFrom || filters.effectiveDateTo ? {
        effectiveDate: {
          ...(filters.effectiveDateFrom && { gte: filters.effectiveDateFrom }),
          ...(filters.effectiveDateTo && { lte: filters.effectiveDateTo })
        }
      } : {},

      filters.requestedDateFrom || filters.requestedDateTo ? {
        createdAt: {
          ...(filters.requestedDateFrom && { gte: filters.requestedDateFrom }),
          ...(filters.requestedDateTo && { lte: filters.requestedDateTo })
        }
      } : {},

      // POC filters
      filters.opportunityContactId ? {
        opportunityContactId: filters.opportunityContactId
      } : {},

      filters.contractsContactId ? {
        contractsContactId: filters.contractsContactId
      } : {},

      filters.relationshipContactId ? {
        relationshipContactId: filters.relationshipContactId
      } : {}
    ].filter(condition => Object.keys(condition).length > 0) // Remove empty objects
  };

  return where;
}
```

### Frontend Filter Panel UI

**Filter Panel Component:**
```tsx
import { Filter, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker } from '@/components/ui/date-range-picker';

function NDAFilterPanel({ filters, onChange, onClear }: FilterPanelProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter NDAs</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Agency Group Filter */}
          <div>
            <Label>Agency Group</Label>
            <Select
              value={filters.agencyGroupId}
              onValueChange={(val) => onChange('agencyGroupId', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                {agencyGroups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subagency Filter */}
          <div>
            <Label>Subagency</Label>
            <Select
              value={filters.subagencyId}
              onValueChange={(val) => onChange('subagencyId', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Subagencies" />
              </SelectTrigger>
              <SelectContent>
                {subagencies.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Company Name Filter */}
          <div>
            <Label>Company Name</Label>
            <Input
              placeholder="Search company..."
              value={filters.companyName || ''}
              onChange={(e) => onChange('companyName', e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div>
            <Label>Status</Label>
            <Select
              value={filters.status}
              onValueChange={(val) => onChange('status', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CREATED">Created</SelectItem>
                <SelectItem value="EMAILED">Emailed</SelectItem>
                <SelectItem value="IN_REVISION">In Revision</SelectItem>
                <SelectItem value="FULLY_EXECUTED">Fully Executed</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Effective Date Range */}
          <div>
            <Label>Effective Date</Label>
            <DateRangePicker
              from={filters.effectiveDateFrom}
              to={filters.effectiveDateTo}
              onChange={(range) => {
                onChange('effectiveDateFrom', range?.from);
                onChange('effectiveDateTo', range?.to);
              }}
            />
          </div>

          {/* Non-USMax Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={filters.nonUsmax}
              onCheckedChange={(checked) => onChange('nonUsmax', checked)}
            />
            <Label>Non-USMax NDAs Only</Label>
          </div>

          {/* ... Additional filters for city, state, POCs, etc. */}

          {/* Clear All Button */}
          <Button
            variant="outline"
            onClick={onClear}
            className="w-full"
          >
            <X className="mr-2 h-4 w-4" />
            Clear All Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Active Filter Badges

**Display Applied Filters:**
```tsx
function ActiveFilterBadges({ filters, onRemove }: ActiveFilterBadgesProps) {
  const activeFilters = getActiveFilters(filters);

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {activeFilters.map(filter => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="pl-3 pr-1 py-1"
        >
          <span className="mr-2">
            {filter.label}: {filter.displayValue}
          </span>
          <button
            onClick={() => onRemove(filter.key)}
            className="hover:bg-gray-200 rounded p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove('all')}
      >
        Clear All
      </Button>
    </div>
  );
}

function getActiveFilters(filters: NdaFilterParams) {
  const active = [];

  if (filters.agencyGroupId) {
    active.push({
      key: 'agencyGroupId',
      label: 'Agency Group',
      displayValue: getAgencyGroupName(filters.agencyGroupId)
    });
  }

  if (filters.status) {
    active.push({
      key: 'status',
      label: 'Status',
      displayValue: filters.status
    });
  }

  // ... map all 15 filters

  return active;
}
```

### Filter State Management

**React State with URL Sync:**
```tsx
function NDAList() {
  const [filters, setFilters] = useState<NdaFilterParams>({});

  // Load filters from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialFilters = parseFiltersFromUrl(params);
    setFilters(initialFilters);
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });

    navigate({ search: params.toString() }, { replace: true });
  }, [filters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleClearFilter = (key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <NDAFilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />
      </div>

      <ActiveFilterBadges
        filters={filters}
        onRemove={handleClearFilter}
      />

      <NDATable
        ndas={ndas}
        filters={filters}
      />
    </div>
  );
}
```

### Date Range Filtering

**Backend Date Handling:**
```typescript
// Parse date strings from query params
function parseDateFilter(dateString?: string): Date | undefined {
  if (!dateString) return undefined;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new BadRequestError('Invalid date format');
  }

  return date;
}

// Usage in listNdas
const filters = {
  effectiveDateFrom: parseDateFilter(req.query.effectiveDateFrom as string),
  effectiveDateTo: parseDateFilter(req.query.effectiveDateTo as string)
};
```

**Frontend Date Range Component:**
```tsx
import { DateRangePicker } from '@/components/ui/date-range-picker';

<DateRangePicker
  label="Effective Date"
  value={{
    from: filters.effectiveDateFrom,
    to: filters.effectiveDateTo
  }}
  onChange={(range) => {
    onChange('effectiveDateFrom', range?.from);
    onChange('effectiveDateTo', range?.to);
  }}
  placeholder="Select date range..."
/>
```

### Filter Performance Optimization

**Required Indexes:**
```sql
-- Single-column indexes for each filterable field
CREATE INDEX idx_ndas_agency_group ON ndas((subagency_id));
CREATE INDEX idx_ndas_subagency ON ndas(subagency_id);
CREATE INDEX idx_ndas_company_name ON ndas(company_name);
CREATE INDEX idx_ndas_city ON ndas(city);
CREATE INDEX idx_ndas_state ON ndas(state);
CREATE INDEX idx_ndas_nda_type ON ndas(nda_type);
CREATE INDEX idx_ndas_state_of_incorporation ON ndas(state_of_incorporation);
CREATE INDEX idx_ndas_agency_office_name ON ndas(agency_office_name);
CREATE INDEX idx_ndas_non_usmax ON ndas(non_usmax);
CREATE INDEX idx_ndas_effective_date ON ndas(effective_date);
CREATE INDEX idx_ndas_created_at ON ndas(created_at);
CREATE INDEX idx_ndas_opportunity_contact ON ndas(opportunity_contact_id);
CREATE INDEX idx_ndas_contracts_contact ON ndas(contracts_contact_id);
CREATE INDEX idx_ndas_relationship_contact ON ndas(relationship_contact_id);
CREATE INDEX idx_ndas_status ON ndas(status);

-- Composite indexes for common filter combinations
CREATE INDEX idx_ndas_status_agency ON ndas(status, subagency_id);
CREATE INDEX idx_ndas_status_effective ON ndas(status, effective_date);
```

### Integration with Other Stories

**Combines with:**
- Story 5.1: Search + Filters work together
- Story 5.2: Sort + Filters work together
- Story 5.4: Presets apply filter combinations
- Story 5.6: Filtered results paginated

**Filter Priority:**
1. URL query params (shareable links)
2. User's saved filter preference (optional)
3. No filters (show all authorized NDAs)

### Security Considerations

**Row-Level Security:**
- Filters ALWAYS combined with agency scope
- User cannot filter for unauthorized agencies
- Agency/Subagency dropdowns pre-filtered to user's access

**SQL Injection Prevention:**
- Use Prisma parameterized queries
- Validate all filter values
- Sanitize text inputs
- Validate UUIDs, dates, enums

### Filter State Persistence Options

**Option 1: URL Only (Recommended)**
- Filters in URL query params
- Shareable links work correctly
- No database storage needed
- Simpler implementation

**Option 2: URL + User Preferences**
- URL overrides saved preference
- Auto-apply last used filters
- Requires user_preferences table (from Story 5.2)

**Option 3: Session Storage**
- Persists during session only
- No shareable links
- No database needed

**Recommendation:** Use URL params (Option 1) for shareability.

### Empty State Handling

**No Results After Filtering:**
```tsx
{filteredNdas.length === 0 && hasActiveFilters ? (
  <div className="text-center py-12">
    <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
    <h3 className="text-lg font-semibold mb-2">No NDAs match your filters</h3>
    <p className="text-gray-600 mb-4">
      Try adjusting or clearing some filters to see more results
    </p>
    <Button onClick={onClearFilters}>
      Clear All Filters
    </Button>
  </div>
) : (
  <NDATable ndas={filteredNdas} />
)}
```

### Project Structure Notes

**Files to Modify:**
- `src/server/services/ndaService.ts` - ADD filter logic to listNdas()
- `src/server/routes/ndas.ts` - MODIFY to accept all 15 filter params
- `src/components/screens/Requests.tsx` - ADD filter panel

**New Files:**
- `src/components/screens/NDAFilterPanel.tsx` - NEW (filter UI)
- `src/components/ui/ActiveFilterBadges.tsx` - NEW (filter badges)
- `src/server/utils/filterHelper.ts` - NEW (filter query building)
- Migration file for filter indexes

**Follows established patterns:**
- Service layer filter logic
- Row-level security ALWAYS applied
- URL state management from Story 5.1
- React Query integration from Stories 5.1-5.2

### References

- [Source: docs/epics.md#Epic 5: Search, Filtering & Dashboard - Story 5.3]
- [Source: docs/architecture.md#Database Schema & Data Model - 15 filterable fields]
- [Source: Story 3.7 - NDA List foundation]
- [Source: Story 5.1 - URL state management]
- [Source: Story 5.2 - User preferences pattern]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- All 15 filter criteria extracted from epics.md
- Dynamic WHERE clause construction logic defined
- Filter panel UI with Radix UI Sheet component
- Active filter badges with clear functionality
- URL state persistence pattern from Story 5.1
- Database indexes for all filterable fields specified

### File List

Files to be created/modified during implementation:
- `prisma/schema.prisma` - ADD indexes via migration (15 filter fields)
- `src/server/services/ndaService.ts` - MODIFY (add filter logic)
- `src/server/utils/filterHelper.ts` - NEW (WHERE clause builder)
- `src/server/routes/ndas.ts` - MODIFY (accept 15 filter params)
- `src/components/screens/NDAFilterPanel.tsx` - NEW
- `src/components/ui/ActiveFilterBadges.tsx` - NEW
- `src/components/screens/Requests.tsx` - MODIFY (integrate filter panel)
- `src/server/services/__tests__/ndaService.test.ts` - MODIFY (test filtering)
- `src/server/routes/__tests__/ndas.test.ts` - MODIFY (test filter params)

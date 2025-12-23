# Story 3.7: NDA List with Filtering

Status: ready-for-dev

## Story

As an **NDA user**,
I want **to view and filter my NDAs**,
so that **I can quickly find specific NDAs among many records**.

## Acceptance Criteria

### AC1: NDA List Table Display
**Given** I navigate to "All NDAs" or "My NDAs" (filter preset)
**When** Page loads
**Then** Table displays with columns: Display ID, Company, Agency, Status, Effective Date, Requested Date, Latest Change, Actions
**And** NDAs automatically filtered by my authorized agencies (row-level security)
**And** Sortable by any column (click header)
**And** Paginated (default 20 per page, configurable)

### AC2: Basic Filtering
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

- [ ] **Task 1: NDA List Service** (AC: 1, 2)
  - [ ] 1.1: Extend ndaService with listNdas(filters, pagination, sort, userId)
  - [ ] 1.2: Build dynamic WHERE clause from filter object
  - [ ] 1.3: Apply row-level security (scopeToAgencies)
  - [ ] 1.4: Apply sorting (ORDER BY)
  - [ ] 1.5: Apply pagination (LIMIT/OFFSET)
  - [ ] 1.6: Return { data: NDA[], total, page, pageSize }

- [ ] **Task 2: NDA List API** (AC: 1, 2, 3)
  - [ ] 2.1: Implement GET /api/ndas with query params
  - [ ] 2.2: Accept filters: status, agencyGroupId, subagencyId, companyName, city, state, etc.
  - [ ] 2.3: Accept pagination: page, pageSize
  - [ ] 2.4: Accept sorting: sortBy, sortDirection
  - [ ] 2.5: Apply requirePermission('nda:view') and scopeToAgencies
  - [ ] 2.6: Return paginated response

- [ ] **Task 3: Frontend - NDA List Page** (AC: 1)
  - [ ] 3.1: Create src/components/screens/NDAList.tsx (or Requests.tsx)
  - [ ] 3.2: Add route: /ndas
  - [ ] 3.3: Fetch NDAs with React Query
  - [ ] 3.4: Display table with all columns
  - [ ] 3.5: Show loading state while fetching

- [ ] **Task 4: Frontend - NDA Table Component** (AC: 1)
  - [ ] 4.1: Create sortable table headers
  - [ ] 4.2: Display: Display ID (#1590), Company Name, Agency (group-subagency), Status badge
  - [ ] 4.3: Display: Effective Date (formatted), Requested Date (created_at), Last Updated
  - [ ] 4.4: Actions column: View, Edit, Clone buttons
  - [ ] 4.5: Click row navigates to NDA detail

- [ ] **Task 5: Frontend - Filter Panel** (AC: 2)
  - [ ] 5.1: Create basic filter panel (foundation for Epic 5's advanced version)
  - [ ] 5.2: Agency/Subagency dropdowns (scoped to user's access)
  - [ ] 5.3: Status dropdown
  - [ ] 5.4: Company name text input (type-ahead in Epic 5)
  - [ ] 5.5: Date range inputs for effective and requested dates
  - [ ] 5.6: POC dropdowns with contact search

- [ ] **Task 6: Frontend - Pagination Controls** (AC: 1)
  - [ ] 6.1: Display "Showing 1-20 of 147 NDAs"
  - [ ] 6.2: Previous/Next buttons
  - [ ] 6.3: Page size selector (10, 20, 50, 100)
  - [ ] 6.4: Save page size preference (Story 5-6 pattern)

- [ ] **Task 7: Frontend - Sorting** (AC: 1)
  - [ ] 7.1: Clickable column headers
  - [ ] 7.2: Toggle ascending/descending on repeat click
  - [ ] 7.3: Show sort indicator (arrow icon)
  - [ ] 7.4: Update URL with sort params
  - [ ] 7.5: Default sort: Latest Change DESC (newest first)

- [ ] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for ndaService.listNdas()
  - [ ] 8.2: API tests for list endpoint with filters
  - [ ] 8.3: API tests for pagination and sorting
  - [ ] 8.4: Test row-level security filtering
  - [ ] 8.5: Component tests for NDA list table
  - [ ] 8.6: E2E test for filtering and sorting

## Dev Notes

### NDA List Query Implementation

```typescript
interface ListNdaParams {
  // Filters (15 total from AC)
  status?: NdaStatus;
  agencyGroupId?: string;
  subagencyId?: string;
  companyName?: string;
  city?: string;
  state?: string;
  // ... other filters

  // Pagination
  page?: number;
  pageSize?: number;

  // Sorting
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

async function listNdas(params: ListNdaParams, userId: string) {
  // Get user's authorized subagencies
  const scope = await getUserAgencyScope(userId);

  // Build WHERE clause
  const where: Prisma.NdaWhereInput = {
    ...scope, // Row-level security (MANDATORY)
    ...(params.status && { status: params.status }),
    ...(params.companyName && {
      companyName: { contains: params.companyName, mode: 'insensitive' }
    }),
    // ... other filters
  };

  // Pagination
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const skip = (page - 1) * pageSize;

  // Sorting
  const orderBy = params.sortBy
    ? { [params.sortBy]: params.sortDirection || 'asc' }
    : { updatedAt: 'desc' }; // Default sort

  // Execute queries in parallel
  const [data, total] = await Promise.all([
    prisma.nda.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        subagency: { include: { agencyGroup: true } },
        opportunityContact: true
      }
    }),
    prisma.nda.count({ where })
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}
```

### Frontend NDA List Table

```tsx
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Copy } from 'lucide-react';

function NDAList() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState({ column: 'updatedAt', direction: 'desc' });

  const { data: response, isLoading } = useQuery({
    queryKey: ['ndas', { filters, page, pageSize, sort }],
    queryFn: () => api.get('/api/ndas', {
      params: { ...filters, page, pageSize, sortBy: sort.column, sortDir: sort.direction }
    }).then(res => res.data)
  });

  const ndas = response?.data || [];
  const pagination = response?.pagination;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1>NDAs</h1>
        <Button onClick={() => navigate('/nda/create')}>
          Create NDA
        </Button>
      </div>

      <FilterPanel filters={filters} onChange={setFilters} />

      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader column="displayId" label="ID" sort={sort} onSort={handleSort} />
            <SortableHeader column="companyName" label="Company" sort={sort} onSort={handleSort} />
            <TableHead>Agency</TableHead>
            <SortableHeader column="status" label="Status" sort={sort} onSort={handleSort} />
            <SortableHeader column="effectiveDate" label="Effective Date" sort={sort} onSort={handleSort} />
            <SortableHeader column="updatedAt" label="Last Updated" sort={sort} onSort={handleSort} />
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ndas.map(nda => (
            <TableRow key={nda.id} onClick={() => navigate(`/nda/${nda.id}`)}>
              <TableCell>#{nda.displayId}</TableCell>
              <TableCell>{nda.companyName}</TableCell>
              <TableCell>
                {nda.subagency.agencyGroup.name} - {nda.subagency.name}
              </TableCell>
              <TableCell><StatusBadge status={nda.status} /></TableCell>
              <TableCell>{formatDate(nda.effectiveDate)}</TableCell>
              <TableCell>{formatDistanceToNow(nda.updatedAt)}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/nda/${nda.id}`)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/nda/${nda.id}/edit`)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleClone(nda.id)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
```

### Filter Panel (Basic Version)

This story creates basic filtering. Epic 5 (Stories 5.1-5.7) will enhance it with:
- Advanced filtering (5-3)
- Filter presets (5-4)
- Date range shortcuts (5-5)
- Recently used values (5-7)

**Basic Filter Panel for this story:**
```tsx
function BasicFilterPanel({ filters, onChange }: FilterPanelProps) {
  return (
    <div className="flex gap-4 mb-4">
      <Select
        value={filters.status}
        onValueChange={(val) => onChange({ ...filters, status: val })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CREATED">Created</SelectItem>
          <SelectItem value="EMAILED">Emailed</SelectItem>
          <SelectItem value="FULLY_EXECUTED">Fully Executed</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Search company..."
        value={filters.companyName || ''}
        onChange={(e) => onChange({ ...filters, companyName: e.target.value })}
      />

      {/* More filters added incrementally or in Epic 5 */}
    </div>
  );
}
```

### Integration with Previous and Future Stories

**Builds on:**
- Story 3-1: NDA model and data
- Story 1-4: Row-level security (automatic filtering)

**Foundation for:**
- Story 5.1: Global search (enhances this list)
- Story 5.2: Column sorting persistence
- Story 5.3: Advanced filtering system
- Story 5-6: Pagination configuration

**This is the main NDA management interface** - users spend most time here.

### Performance Considerations

**Optimization:**
- Indexes on all filterable columns (15 fields)
- Row-level security uses indexed subagency_id
- Pagination limits data transfer
- React Query caching (5-minute stale time)

### Project Structure Notes

**New Files:**
- `src/components/screens/NDAList.tsx` - NEW (main list page)
- `src/components/ui/NDATable.tsx` - NEW (reusable table)
- `src/components/ui/StatusBadge.tsx` - NEW

**Files to Modify:**
- `src/server/services/ndaService.ts` - MODIFY (add listNdas)
- `src/server/routes/ndas.ts` - VERIFY GET /api/ndas exists
- `src/App.tsx` - ADD /ndas route

**Follows established patterns:**
- Service layer from Stories 3-1 through 3-6
- Row-level security from Story 1-4
- Pagination pattern (foundation for Story 5-6)
- Sorting pattern (foundation for Story 5-2)

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.7]
- [Source: docs/architecture.md#API Architecture - List endpoints]
- [Source: Story 1-4 - Row-level security enforcement]
- [Source: Story 3-1 - NDA model]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Main NDA management interface
- Foundation for Epic 5 advanced features
- Basic filtering, sorting, pagination
- Row-level security automatically applied
- Table view with all key columns

### File List

Files to be created/modified during implementation:
- `src/components/screens/NDAList.tsx` - NEW
- `src/components/ui/NDATable.tsx` - NEW
- `src/components/ui/StatusBadge.tsx` - NEW
- `src/components/ui/BasicFilterPanel.tsx` - NEW
- `src/server/services/ndaService.ts` - MODIFY (add listNdas with filtering)
- `src/App.tsx` - MODIFY (add /ndas route)
- Migration file for NDA list indexes
- `src/components/screens/__tests__/NDAList.test.tsx` - NEW

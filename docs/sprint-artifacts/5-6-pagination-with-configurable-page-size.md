# Story 5.6: Pagination with Configurable Page Size

Status: ready-for-dev

## Story

As an **NDA User**,
I want **to paginate through large NDA lists with control over how many I see per page**,
so that **I can balance between seeing more data and page load performance**.

## Acceptance Criteria

### AC1: Pagination Controls
**Given** the NDA list has more records than fit on one page
**When** I view the list
**Then** I see pagination controls (Previous, Next, page numbers)
**And** I can select page size from options: 10, 25, 50, 100
**And** my page size preference is saved per user
**And** the system shows total count ("Showing 1-25 of 147 NDAs")
**And** pagination state persists when I apply filters or sorting

## Tasks / Subtasks

- [ ] **Task 1: Database - User Preference for Page Size** (AC: 1)
  - [ ] 1.1: Use UserPreference model from Story 5.2
  - [ ] 1.2: Preference key: "nda_list_page_size"
  - [ ] 1.3: Preference value: { pageSize: 25 } (default)
  - [ ] 1.4: Load preference on NDA list mount

- [ ] **Task 2: NDA Service - Pagination Logic** (AC: 1)
  - [ ] 2.1: Extend `ndaService.listNdas()` with page and pageSize parameters
  - [ ] 2.2: Calculate OFFSET: (page - 1) * pageSize
  - [ ] 2.3: Apply Prisma skip and take for pagination
  - [ ] 2.4: Return paginated results with total count
  - [ ] 2.5: Default: page=1, pageSize=25

- [ ] **Task 3: NDA Service - Total Count** (AC: 1)
  - [ ] 3.1: Add count query alongside findMany
  - [ ] 3.2: Use same WHERE clause for consistent count
  - [ ] 3.3: Return: { data: NDA[], total: number, page, pageSize }
  - [ ] 3.4: Calculate totalPages: Math.ceil(total / pageSize)

- [ ] **Task 4: API - Pagination Parameters** (AC: 1)
  - [ ] 4.1: Extend `GET /api/ndas?page={n}&pageSize={size}` parameters
  - [ ] 4.2: Validate page >= 1
  - [ ] 4.3: Validate pageSize in [10, 25, 50, 100]
  - [ ] 4.4: Load user's saved page size preference if not provided
  - [ ] 4.5: Return pagination metadata in response

- [ ] **Task 5: API Response Format** (AC: 1)
  - [ ] 5.1: Return structured response:
    ```json
    {
      "data": [...],
      "pagination": {
        "page": 1,
        "pageSize": 25,
        "total": 147,
        "totalPages": 6
      }
    }
    ```
  - [ ] 5.2: Include pagination in all list endpoints

- [ ] **Task 6: Frontend - Pagination Controls Component** (AC: 1)
  - [ ] 6.1: Create `src/components/ui/Pagination.tsx` component
  - [ ] 6.2: Implement Previous/Next buttons
  - [ ] 6.3: Implement page number buttons (show 5-7 page numbers max)
  - [ ] 6.4: Disable Previous on page 1, Next on last page
  - [ ] 6.5: Use lucide-react ChevronLeft/ChevronRight icons
  - [ ] 6.6: Show ellipsis (...) for many pages

- [ ] **Task 7: Frontend - Page Size Selector** (AC: 1)
  - [ ] 7.1: Add page size dropdown to NDA list page
  - [ ] 7.2: Options: 10, 25, 50, 100 items per page
  - [ ] 7.3: On change, update page size and reset to page 1
  - [ ] 7.4: Save preference via PUT /api/preferences/nda-list-page-size
  - [ ] 7.5: Position near pagination controls

- [ ] **Task 8: Frontend - Results Count Display** (AC: 1)
  - [ ] 8.1: Calculate: start = (page - 1) * pageSize + 1
  - [ ] 8.2: Calculate: end = Math.min(page * pageSize, total)
  - [ ] 8.3: Display: "Showing {start}-{end} of {total} NDAs"
  - [ ] 8.4: Update when page or pageSize changes

- [ ] **Task 9: Frontend - Pagination State** (AC: 1)
  - [ ] 9.1: Add page and pageSize to component state
  - [ ] 9.2: Update React Query to include pagination params
  - [ ] 9.3: On page change, trigger API call
  - [ ] 9.4: Reset to page 1 when filters change
  - [ ] 9.5: Preserve pagination with sort changes

- [ ] **Task 10: Frontend - URL State for Pagination** (AC: 1)
  - [ ] 10.1: Add page and pageSize to URL query params
  - [ ] 10.2: Read from URL on mount
  - [ ] 10.3: Update URL when pagination changes
  - [ ] 10.4: Shareable URLs include pagination state

- [ ] **Task 11: Testing** (AC: All)
  - [ ] 11.1: Unit tests for pagination calculation (skip/take)
  - [ ] 11.2: API tests for page and pageSize parameters
  - [ ] 11.3: API tests for total count accuracy
  - [ ] 11.4: Component tests for Pagination controls
  - [ ] 11.5: E2E tests for pagination flow

## Dev Notes

### Backend Pagination Implementation

**Prisma Pagination:**
```typescript
interface PaginationParams {
  page: number;
  pageSize: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

async function listNdas(
  filters: NdaFilterParams,
  pagination: PaginationParams,
  userId: string
): Promise<PaginatedResponse<Nda>> {
  const where = buildFilterWhereClause(filters, userId);

  // Calculate skip/take
  const skip = (pagination.page - 1) * pagination.pageSize;
  const take = pagination.pageSize;

  // Execute queries in parallel
  const [data, total] = await Promise.all([
    prisma.nda.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
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
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize)
    }
  };
}
```

### API Implementation

**Pagination Query Params:**
```typescript
// GET /api/ndas?page=2&pageSize=50
router.get('/ndas', authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  // Parse pagination params
  let page = parseInt(req.query.page as string) || 1;
  let pageSize = parseInt(req.query.pageSize as string);

  // Load user's saved page size preference if not provided
  if (!pageSize) {
    const savedPref = await userPreferencesService.getPreference(
      userId,
      'nda_list_page_size'
    );
    pageSize = savedPref?.pageSize || 25; // Default: 25
  }

  // Validate
  if (page < 1) page = 1;
  if (![10, 25, 50, 100].includes(pageSize)) pageSize = 25;

  // Fetch paginated results
  const result = await ndaService.listNdas(
    filters,
    { page, pageSize },
    userId
  );

  res.json(result);
});
```

### Frontend Pagination Component

**Pagination Controls:**
```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);

  // Generate page numbers to show (max 7: 1, ..., 4, 5, 6, ..., 10)
  const pageNumbers = generatePageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between">
      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} NDAs
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        {pageNumbers.map((pageNum, idx) => (
          pageNum === '...' ? (
            <span key={idx} className="px-2">...</span>
          ) : (
            <Button
              key={pageNum}
              variant={pageNum === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(pageNum as number)}
            >
              {pageNum}
            </Button>
          )
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    // Show all pages
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Show: 1, ..., current-1, current, current+1, ..., last
  const pages: (number | string)[] = [1];

  if (currentPage > 3) {
    pages.push('...');
  }

  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push('...');
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}
```

### Page Size Selector

**Dropdown Component:**
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

function PageSizeSelector({ pageSize, onPageSizeChange }: PageSizeSelectorProps) {
  const sizes = [10, 25, 50, 100];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Items per page:</span>
      <Select
        value={String(pageSize)}
        onValueChange={(val) => onPageSizeChange(parseInt(val))}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sizes.map(size => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

### Pagination State Management

**React State with URL Sync:**
```tsx
function NDAList() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Load saved page size preference
  useEffect(() => {
    userPreferencesService.getPreference('nda_list_page_size').then(pref => {
      if (pref?.pageSize) setPageSize(pref.pageSize);
    });
  }, []);

  // Fetch paginated data
  const { data: response, isLoading } = useQuery({
    queryKey: ['ndas', { page, pageSize, filters, sort }],
    queryFn: () => api.get('/api/ndas', {
      params: { page, pageSize, ...filters, ...sort }
    })
  });

  const ndas = response?.data || [];
  const pagination = response?.pagination;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top on page change
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to page 1 when changing page size

    // Save preference
    api.put('/api/preferences/nda-list-page-size', { pageSize: newSize });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  return (
    <div>
      <NDATable ndas={ndas} isLoading={isLoading} />

      {pagination && (
        <div className="mt-4 flex items-center justify-between">
          <PageSizeSelector
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />

          <Pagination
            page={page}
            pageSize={pageSize}
            total={pagination.total}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
```

### Performance Optimization

**Efficient Count Queries:**
```typescript
// Optimize count for large datasets
async function getNdaCount(where: Prisma.NdaWhereInput): Promise<number> {
  // For simple queries, use count()
  if (isSimpleWhereClause(where)) {
    return await prisma.nda.count({ where });
  }

  // For complex queries with joins, use aggregate
  const result = await prisma.nda.aggregate({
    where,
    _count: { id: true }
  });

  return result._count.id;
}
```

**Database Query Optimization:**
```sql
-- Pagination query should use indexed columns
-- GOOD: Uses index
SELECT * FROM ndas
WHERE subagency_id IN (...)
ORDER BY created_at DESC
LIMIT 25 OFFSET 0;

-- Index needed:
CREATE INDEX idx_ndas_pagination ON ndas(subagency_id, created_at DESC);
```

### URL State for Pagination

**Query Params:**
```typescript
// URL format:
// ?page=2&pageSize=50&status=EMAILED

// Update URL when pagination changes
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  navigate({ search: params.toString() }, { replace: true });
}, [page, pageSize]);

// Read from URL on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const urlPage = parseInt(params.get('page') || '1');
  const urlPageSize = parseInt(params.get('pageSize') || '0');

  setPage(urlPage);
  if (urlPageSize && [10, 25, 50, 100].includes(urlPageSize)) {
    setPageSize(urlPageSize);
  }
}, []);
```

### Empty State Handling

**No Results:**
```tsx
{ndas.length === 0 && !isLoading ? (
  <div className="text-center py-12">
    <p className="text-gray-600">No NDAs found</p>
  </div>
) : (
  <>
    <NDATable ndas={ndas} />
    <Pagination {...paginationProps} />
  </>
)}
```

### Results Count Display

**Showing X-Y of Z:**
```typescript
function getResultsCountText(page: number, pageSize: number, total: number): string {
  if (total === 0) return 'No results';

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return `Showing ${start}-${end} of ${total} NDAs`;
}

// Usage
<p className="text-sm text-gray-600">
  {getResultsCountText(page, pageSize, pagination.total)}
</p>
```

### Integration with Filters and Sorting

**Reset Page on Filter Change:**
```typescript
// When user applies a filter, reset to page 1
useEffect(() => {
  setPage(1);
}, [filters]); // Dependency on filters object

// Sorting doesn't reset page (user might be looking at page 3 sorted by company)
// Filters reset page (different result set, might have fewer pages)
```

**Pagination with All Features:**
```typescript
const { data: response } = useQuery({
  queryKey: ['ndas', {
    page,
    pageSize,
    search: searchQuery,
    filters,
    sortBy: sort.column,
    sortDir: sort.direction
  }],
  queryFn: () => api.get('/api/ndas', {
    params: {
      page,
      pageSize,
      search: searchQuery,
      ...filters,
      sortBy: sort.column,
      sortDir: sort.direction
    }
  })
});
```

### Security Considerations

**Row-Level Security:**
- Total count respects agency scope
- User only sees authorized NDAs
- Pagination doesn't leak information about unauthorized records

**Performance:**
- Large OFFSET values can be slow (OFFSET 10000)
- Consider cursor-based pagination for very large datasets (Phase 2)
- Current approach fine for expected volume (~1000 NDAs)

### Project Structure Notes

**New Files:**
- `src/components/ui/Pagination.tsx` - NEW
- `src/components/ui/PageSizeSelector.tsx` - NEW
- `src/utils/paginationHelper.ts` - NEW (calculations)

**Files to Modify:**
- `src/server/services/ndaService.ts` - MODIFY (add pagination params)
- `src/server/routes/ndas.ts` - MODIFY (pagination params, load preference)
- `src/components/screens/Requests.tsx` - INTEGRATE pagination controls
- `src/server/services/userPreferencesService.ts` - VERIFY exists (from Story 5.2)

**Follows established patterns:**
- User preferences from Story 5.2
- URL state management from Story 5.1
- Filter integration from Story 5.3
- Sort integration from Story 5.2

### References

- [Source: docs/epics.md#Epic 5: Search, Filtering & Dashboard - Story 5.6]
- [Source: docs/architecture.md#API Architecture]
- [Source: Story 5.2 - User preferences foundation]
- [Source: Story 5.3 - Filter integration]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Pagination controls with Previous/Next and page numbers
- Page size selector (10, 25, 50, 100)
- User preference persistence via Story 5.2 infrastructure
- Total count and "Showing X-Y of Z" display
- Reset to page 1 on filter change logic
- Integration with search, filter, and sort from Stories 5.1-5.3

### File List

Files to be created/modified during implementation:
- `src/components/ui/Pagination.tsx` - NEW
- `src/components/ui/PageSizeSelector.tsx` - NEW
- `src/utils/paginationHelper.ts` - NEW
- `src/server/services/ndaService.ts` - MODIFY (add pagination)
- `src/server/routes/ndas.ts` - MODIFY (pagination params)
- `src/components/screens/Requests.tsx` - MODIFY (integrate pagination)
- `src/server/services/__tests__/ndaService.test.ts` - MODIFY (test pagination)
- `src/components/ui/__tests__/Pagination.test.tsx` - NEW

# Story 5.2: Column Sorting with Persistence

Status: ready-for-dev

## Story

As an **NDA User**,
I want **to sort the NDA list by any column and have my preference remembered**,
so that **I can organize NDAs in my preferred order without re-sorting every time**.

## Acceptance Criteria

### AC1: Sortable Columns
**Given** I am viewing the NDA list
**When** I click on any column header (ID, Company, Agency, Effective Date, Status, etc.)
**Then** the list sorts by that column in ascending order
**And** clicking again toggles to descending order
**And** a visual indicator shows the current sort column and direction

### AC2: Persistent Sort Preference
**And** my sort preference is saved to the database (system_config or user preferences table)
**And** when I return to the list later, my last sort preference is applied automatically

## Tasks / Subtasks

- [ ] **Task 1: Database - User Preferences Schema** (AC: 2)
  - [ ] 1.1: Create or extend user_preferences table in Prisma schema
  - [ ] 1.2: Add fields: user_id (FK to contact), preference_key, preference_value (JSON)
  - [ ] 1.3: Add unique constraint on (user_id, preference_key)
  - [ ] 1.4: Create migration and run prisma generate
  - [ ] 1.5: Preference key: "nda_list_sort" → value: { column: "companyName", direction: "asc" }

- [ ] **Task 2: User Preferences Service** (AC: 2)
  - [ ] 2.1: Create `src/server/services/userPreferencesService.ts`
  - [ ] 2.2: Implement `getPreference(userId, key)` function
  - [ ] 2.3: Implement `setPreference(userId, key, value)` function
  - [ ] 2.4: Use upsert for preference updates (insert or update)
  - [ ] 2.5: Return typed preference values

- [ ] **Task 3: NDA Service - Sorting Logic** (AC: 1)
  - [ ] 3.1: Extend `ndaService.listNdas()` with sortBy and sortDirection parameters
  - [ ] 3.2: Map frontend column names to database fields
  - [ ] 3.3: Build Prisma orderBy clause dynamically
  - [ ] 3.4: Support sorting on:
    - displayId, companyName, city, state, effectiveDate, createdAt, status
    - Nested: subagency.name, agencyGroup.name, opportunityContact.lastName
  - [ ] 3.5: Default sort: createdAt DESC (newest first)

- [ ] **Task 4: API - Sort Parameters** (AC: 1, 2)
  - [ ] 4.1: Extend `GET /api/ndas?sortBy={column}&sortDir={asc|desc}` parameters
  - [ ] 4.2: Validate sortBy against allowed columns
  - [ ] 4.3: Validate sortDir is "asc" or "desc"
  - [ ] 4.4: Fetch user's saved sort preference if params not provided
  - [ ] 4.5: Call ndaService.listNdas() with sort parameters
  - [ ] 4.6: Return sorted results

- [ ] **Task 5: API - Save Sort Preference** (AC: 2)
  - [ ] 5.1: Create `PUT /api/preferences/nda-list-sort` endpoint
  - [ ] 5.2: Accept { sortBy, sortDirection } in request body
  - [ ] 5.3: Call userPreferencesService.setPreference()
  - [ ] 5.4: Return 200 OK on success

- [ ] **Task 6: Frontend - Sortable Table Headers** (AC: 1)
  - [ ] 6.1: Create sortable table header component
  - [ ] 6.2: Add click handlers to column headers
  - [ ] 6.3: Show sort indicators (↑ ↓ arrows or icons)
  - [ ] 6.4: Toggle sort direction on repeat click
  - [ ] 6.5: Use lucide-react ArrowUp/ArrowDown icons
  - [ ] 6.6: Highlight active sort column

- [ ] **Task 7: Frontend - Sort State Management** (AC: 1, 2)
  - [ ] 7.1: Add sort state to NDA list component
  - [ ] 7.2: Update React Query to include sortBy/sortDir parameters
  - [ ] 7.3: On column header click, update sort state
  - [ ] 7.4: Trigger API call with new sort parameters
  - [ ] 7.5: Call PUT /api/preferences/nda-list-sort to save preference
  - [ ] 7.6: Load user's saved preference on component mount

- [ ] **Task 8: Frontend - URL State Integration** (AC: 1)
  - [ ] 8.1: Add sortBy and sortDir to URL query params
  - [ ] 8.2: Read sort from URL on mount (overrides saved preference)
  - [ ] 8.3: Update URL when sort changes
  - [ ] 8.4: Preserve sort with search and filters

- [ ] **Task 9: Testing** (AC: All)
  - [ ] 9.1: Unit tests for userPreferencesService
  - [ ] 9.2: Unit tests for ndaService sorting logic
  - [ ] 9.3: API tests for sort parameters
  - [ ] 9.4: API tests for preference saving
  - [ ] 9.5: Component tests for sortable table headers
  - [ ] 9.6: E2E tests for sorting and persistence

## Dev Notes

### User Preferences Schema

**Prisma Model:**
```prisma
model UserPreference {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  preferenceKey  String   @map("preference_key") @db.VarChar(100)
  preferenceValue Json    @map("preference_value")
  updatedAt      DateTime @map("updated_at") @default(now()) @updatedAt

  user           Contact  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, preferenceKey])
  @@map("user_preferences")
}
```

**Example Preference:**
```json
{
  "userId": "user-123",
  "preferenceKey": "nda_list_sort",
  "preferenceValue": {
    "column": "companyName",
    "direction": "asc"
  }
}
```

### Backend Sorting Logic

**Dynamic OrderBy:**
```typescript
interface SortParams {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

const SORTABLE_COLUMNS = {
  displayId: 'displayId',
  companyName: 'companyName',
  city: 'city',
  state: 'state',
  effectiveDate: 'effectiveDate',
  createdAt: 'createdAt',
  status: 'status',
  // Nested fields
  agencyGroup: 'subagency.agencyGroup.name',
  subagency: 'subagency.name',
  opportunityPoc: 'opportunityContact.lastName'
};

async function listNdas(params: ListNdaParams, userId: string) {
  // Get user's saved sort preference if not provided
  let sortBy = params.sortBy;
  let sortDirection = params.sortDirection;

  if (!sortBy) {
    const savedPref = await userPreferencesService.getPreference(userId, 'nda_list_sort');
    if (savedPref) {
      sortBy = savedPref.column;
      sortDirection = savedPref.direction;
    } else {
      // Default sort
      sortBy = 'createdAt';
      sortDirection = 'desc';
    }
  }

  // Build orderBy clause
  const orderBy = buildOrderByClause(sortBy, sortDirection);

  return await prisma.nda.findMany({
    where: { /* filters and security */ },
    orderBy,
    include: { /* relations */ }
  });
}

function buildOrderByClause(sortBy: string, direction: 'asc' | 'desc') {
  const column = SORTABLE_COLUMNS[sortBy];
  if (!column) throw new BadRequestError('Invalid sort column');

  // Handle nested fields
  if (column.includes('.')) {
    const parts = column.split('.');
    return buildNestedOrderBy(parts, direction);
  }

  return { [column]: direction };
}
```

### Frontend Sortable Table Component

**Table Header with Sort:**
```tsx
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface SortableHeaderProps {
  column: string;
  label: string;
  currentSort: { column: string; direction: 'asc' | 'desc' };
  onSort: (column: string) => void;
}

function SortableHeader({ column, label, currentSort, onSort }: SortableHeaderProps) {
  const isActive = currentSort.column === column;
  const direction = isActive ? currentSort.direction : null;

  return (
    <TableHead
      onClick={() => onSort(column)}
      className="cursor-pointer hover:bg-gray-50 select-none"
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {!isActive && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
        {isActive && direction === 'asc' && <ArrowUp className="h-4 w-4 text-blue-600" />}
        {isActive && direction === 'desc' && <ArrowDown className="h-4 w-4 text-blue-600" />}
      </div>
    </TableHead>
  );
}
```

**Sort State Management:**
```tsx
function NDAList() {
  const [sort, setSort] = useState({ column: 'createdAt', direction: 'desc' as const });

  // Load saved preference on mount
  useEffect(() => {
    api.get('/api/preferences/nda-list-sort').then(pref => {
      if (pref) setSort(pref);
    });
  }, []);

  const handleSort = (column: string) => {
    const newDirection = sort.column === column && sort.direction === 'asc'
      ? 'desc'
      : 'asc';

    const newSort = { column, direction: newDirection };
    setSort(newSort);

    // Save preference
    api.put('/api/preferences/nda-list-sort', newSort);
  };

  const { data: ndas } = useQuery({
    queryKey: ['ndas', { sortBy: sort.column, sortDir: sort.direction }],
    queryFn: () => api.get('/api/ndas', {
      params: { sortBy: sort.column, sortDir: sort.direction }
    })
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader column="displayId" label="ID" currentSort={sort} onSort={handleSort} />
          <SortableHeader column="companyName" label="Company" currentSort={sort} onSort={handleSort} />
          <SortableHeader column="effectiveDate" label="Effective Date" currentSort={sort} onSort={handleSort} />
          {/* ... other columns */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {ndas?.map(nda => <NDARow key={nda.id} nda={nda} />)}
      </TableBody>
    </Table>
  );
}
```

### User Preferences API

**Get Preference:**
```typescript
// GET /api/preferences/:key
router.get('/preferences/:key', authenticateJWT, async (req, res) => {
  const preference = await userPreferencesService.getPreference(
    req.user.id,
    req.params.key
  );

  res.json(preference?.value || null);
});
```

**Set Preference:**
```typescript
// PUT /api/preferences/:key
router.put('/preferences/:key', authenticateJWT, async (req, res) => {
  await userPreferencesService.setPreference(
    req.user.id,
    req.params.key,
    req.body
  );

  res.json({ success: true });
});
```

### Database Indexes for Sortable Columns

**Required Indexes:**
```sql
-- Indexes for efficient sorting
CREATE INDEX idx_ndas_display_id ON ndas(display_id);
CREATE INDEX idx_ndas_company_name ON ndas(company_name);
CREATE INDEX idx_ndas_effective_date ON ndas(effective_date);
CREATE INDEX idx_ndas_created_at ON ndas(created_at DESC); -- DESC for default sort
CREATE INDEX idx_ndas_status ON ndas(status);
```

### Sort Column Mapping

**Frontend ↔ Backend Mapping:**
```typescript
const COLUMN_MAP = {
  // Frontend column names → Database field names
  id: 'displayId',
  company: 'companyName',
  city: 'city',
  state: 'state',
  agency: 'subagency.agencyGroup.name',
  subagency: 'subagency.name',
  effectiveDate: 'effectiveDate',
  created: 'createdAt',
  status: 'status',
  opportunityPoc: 'opportunityContact.lastName'
};
```

### Security Considerations

**Authorization:**
- No special permission required (inherits from nda:view)
- Preferences scoped per user (cannot view/edit others' preferences)
- Row-level security still applies to sorted results

**Validation:**
- Whitelist allowed sort columns (prevent SQL injection)
- Validate sort direction is "asc" or "desc"
- Reject invalid column names

### Performance Considerations

**Optimization:**
- Indexes on all sortable columns
- Default sort on indexed column (createdAt DESC)
- Limit results with pagination (Story 5.6)
- Consider composite indexes for common sort + filter combinations

**Query Performance:**
```sql
-- Fast: Indexed column
SELECT * FROM ndas ORDER BY created_at DESC LIMIT 25; -- Uses idx_ndas_created_at

-- Slower: Non-indexed column
SELECT * FROM ndas ORDER BY abbreviated_opportunity_name; -- Table scan

-- Fast: Composite index for sort + filter
CREATE INDEX idx_ndas_status_created ON ndas(status, created_at DESC);
SELECT * FROM ndas WHERE status = 'Emailed' ORDER BY created_at DESC; -- Uses composite
```

### Integration with Other Stories

**Combines with:**
- Story 5.1: Search + Sort (search results are sortable)
- Story 5.3: Filters + Sort (filtered results are sortable)
- Story 5.6: Pagination + Sort (sorted results are paginated)

**Sort Precedence:**
1. URL query param (highest priority - allows sharing)
2. User's saved preference
3. Default sort (createdAt DESC)

### Project Structure Notes

**New Files:**
- `src/server/services/userPreferencesService.ts` - NEW
- `src/server/routes/preferences.ts` - NEW (preference API)
- `src/components/ui/SortableHeader.tsx` - NEW (reusable component)
- Migration file for user_preferences table

**Files to Modify:**
- `prisma/schema.prisma` - ADD UserPreference model
- `src/server/services/ndaService.ts` - ADD sortBy/sortDirection to listNdas()
- `src/server/routes/ndas.ts` - MODIFY to accept sort params and load preferences
- `src/components/screens/Requests.tsx` - MODIFY table headers to be sortable

**Follows established patterns:**
- Service layer for business logic
- Database-backed user preferences
- React Query for data fetching
- URL state management from Story 5.1

### References

- [Source: docs/epics.md#Epic 5: Search, Filtering & Dashboard - Story 5.2]
- [Source: docs/architecture.md#API Architecture]
- [Source: Story 5.1 - NDA list query foundation]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- User preferences pattern established for persistence
- Sortable table header component specified
- Database indexes for performance identified
- Sort + search + filter combination logic defined
- URL state management integrated from Story 5.1

### File List

Files to be created/modified during implementation:
- `prisma/schema.prisma` - ADD UserPreference model
- `src/server/services/userPreferencesService.ts` - NEW
- `src/server/routes/preferences.ts` - NEW (preference endpoints)
- `src/server/services/ndaService.ts` - MODIFY (add sorting)
- `src/server/routes/ndas.ts` - MODIFY (accept sort params, load preferences)
- `src/components/ui/SortableHeader.tsx` - NEW
- `src/components/screens/Requests.tsx` - MODIFY (sortable headers)
- Migration file for user_preferences table and sort indexes
- `src/server/services/__tests__/userPreferencesService.test.ts` - NEW
- `src/server/routes/__tests__/preferences.test.ts` - NEW

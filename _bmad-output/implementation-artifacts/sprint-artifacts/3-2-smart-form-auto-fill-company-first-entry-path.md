# Story 3.2: Smart Form Auto-Fill (Company-First Entry Path)

Status: ready-for-dev

## Story

As an **NDA user**,
I want **to select a company and have common fields auto-fill**,
so that **I can create NDAs faster (15 fields → 3-4 manual entries)**.

## Acceptance Criteria

### AC1: Company Selection with Auto-Fill
**Given** I start creating NDA
**When** I select company "TechCorp Solutions Inc." from dropdown (recently used at top)
**Then** Form auto-fills:
- Company City: "San Francisco"
- Company State: "CA"
- State of Incorporation: "Delaware"
- Relationship POC: Last person used for TechCorp
- Contracts POC: Standard contact if exists
- Agency: Most common agency for TechCorp (e.g., DoD if 80% of TechCorp NDAs are DoD)

### AC2: Manual Entry Required
**And** User only needs to manually enter: Authorized Purpose, Abbreviated Opportunity Name, Effective Date
**And** Can override any auto-filled value

## Tasks / Subtasks

- [ ] **Task 1: Company Suggestions Service** (AC: 1)
  - [ ] 1.1: Create src/server/services/companySuggestionsService.ts
  - [ ] 1.2: Implement getCompanySuggestions(companyName) function
  - [ ] 1.3: Query previous NDAs for this company
  - [ ] 1.4: Extract most recent values for each field
  - [ ] 1.5: Calculate most common agency (by frequency)
  - [ ] 1.6: Return suggestion object with all auto-fillable fields

- [ ] **Task 2: Historical Data Queries** (AC: 1)
  - [ ] 2.1: Query last NDA for company (for recent POCs)
  - [ ] 2.2: Query all NDAs for company (for common agency)
  - [ ] 2.3: Calculate mode (most frequent) for categorical fields
  - [ ] 2.4: Use most recent for continuous fields (city, state)
  - [ ] 2.5: Apply row-level security (only suggest from authorized NDAs)

- [ ] **Task 3: Company Autocomplete API** (AC: 1)
  - [ ] 3.1: Create GET /api/suggestions/companies?q={query} endpoint
  - [ ] 3.2: Search previous NDA company names
  - [ ] 3.3: Return distinct companies with NDA count
  - [ ] 3.4: Order by: recently used by user, then alphabetically
  - [ ] 3.5: Limit to 10 results

- [ ] **Task 4: Auto-Fill Suggestions API** (AC: 1)
  - [ ] 4.1: Create GET /api/suggestions/company-data?company={name} endpoint
  - [ ] 4.2: Call companySuggestionsService
  - [ ] 4.3: Return suggested values for all auto-fillable fields
  - [ ] 4.4: Apply requirePermission('nda:create')

- [ ] **Task 5: Frontend - Company Autocomplete** (AC: 1, 2)
  - [ ] 5.1: Replace company name text input with autocomplete
  - [ ] 5.2: Debounce search (300ms)
  - [ ] 5.3: Show previous companies with NDA count
  - [ ] 5.4: On selection, fetch suggestions
  - [ ] 5.5: Auto-fill form fields with suggestions

- [ ] **Task 6: Frontend - Auto-Fill Logic** (AC: 1, 2)
  - [ ] 6.1: When company selected, call GET /api/suggestions/company-data
  - [ ] 6.2: Update form fields with suggested values
  - [ ] 6.3: Use form.setValue() from React Hook Form
  - [ ] 6.4: Show visual indicator (subtle highlight) for auto-filled fields
  - [ ] 6.5: Allow manual override of all auto-filled values

- [ ] **Task 7: Frontend - Recently Used Companies** (AC: 1)
  - [ ] 7.1: Track user's recently selected companies (from Story 5.7 pattern)
  - [ ] 7.2: Show 5 most recent at top of autocomplete dropdown
  - [ ] 7.3: Separate recent from full list with divider
  - [ ] 7.4: Update recent list after NDA creation

- [ ] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for companySuggestionsService
  - [ ] 8.2: Test mode (most frequent) calculation
  - [ ] 8.3: API tests for company autocomplete
  - [ ] 8.4: API tests for auto-fill suggestions
  - [ ] 8.5: Component tests for auto-fill behavior

## Dev Notes

### Company Suggestions Logic

```typescript
async function getCompanySuggestions(companyName: string, userId: string) {
  const authorizedSubagencies = await getUserAuthorizedSubagencies(userId);

  // Query all NDAs for this company (scoped to user's access)
  const ndas = await prisma.nda.findMany({
    where: {
      companyName,
      subagencyId: { in: authorizedSubagencies }
    },
    include: {
      subagency: { include: { agencyGroup: true } },
      relationshipContact: true,
      contractsContact: true
    },
    orderBy: { createdAt: 'desc' }
  });

  if (ndas.length === 0) {
    return null; // No historical data
  }

  // Most recent NDA (for latest values)
  const mostRecent = ndas[0];

  // Most common agency (mode)
  const agencyFrequency = new Map<string, number>();
  ndas.forEach(nda => {
    const count = agencyFrequency.get(nda.subagencyId) || 0;
    agencyFrequency.set(nda.subagencyId, count + 1);
  });

  const mostCommonSubagencyId = Array.from(agencyFrequency.entries())
    .sort((a, b) => b[1] - a[1])[0][0];

  return {
    companyCity: mostRecent.companyCity,
    companyState: mostRecent.companyState,
    stateOfIncorporation: mostRecent.stateOfIncorporation,
    relationshipContactId: mostRecent.relationshipContactId,
    contractsContactId: mostRecent.contractsContactId,
    subagencyId: mostCommonSubagencyId,
    // Suggestion metadata
    source: 'historical',
    ndaCount: ndas.length,
    mostRecentNdaId: mostRecent.id
  };
}
```

### Frontend Auto-Fill Implementation

```tsx
function CreateNDA() {
  const form = useForm();

  // When company selected
  const handleCompanySelect = async (companyName: string) => {
    form.setValue('companyName', companyName);

    // Fetch auto-fill suggestions
    const suggestions = await api.get('/api/suggestions/company-data', {
      params: { company: companyName }
    });

    if (suggestions) {
      // Auto-fill fields (silently, don't trigger validation)
      form.setValue('companyCity', suggestions.companyCity, { shouldValidate: false });
      form.setValue('companyState', suggestions.companyState, { shouldValidate: false });
      form.setValue('stateOfIncorporation', suggestions.stateOfIncorporation, { shouldValidate: false });
      form.setValue('subagencyId', suggestions.subagencyId, { shouldValidate: false });
      form.setValue('relationshipContactId', suggestions.relationshipContactId, { shouldValidate: false });

      // Show toast
      toast.info('Form auto-filled from previous NDAs');
    }
  };

  return (
    <Form>
      <CompanyAutocomplete
        onSelect={handleCompanySelect}
        placeholder="Select or enter company name..."
      />

      {/* Other fields */}
    </Form>
  );
}
```

### Company Autocomplete Component

```tsx
import { Combobox } from '@/components/ui/combobox';

function CompanyAutocomplete({ onSelect }: CompanyAutocompleteProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: companies } = useQuery({
    queryKey: ['company-suggestions', debouncedSearch],
    queryFn: () => api.get('/api/suggestions/companies', {
      params: { q: debouncedSearch }
    }).then(res => res.data),
    enabled: debouncedSearch.length >= 2
  });

  return (
    <Combobox
      value={search}
      onValueChange={setSearch}
      options={companies?.map(c => ({
        value: c.name,
        label: `${c.name} (${c.ndaCount} NDAs)`
      }))}
      onSelect={onSelect}
      placeholder="Search companies..."
    />
  );
}
```

### Recently Used Companies

**From Story 5.7 pattern:**
- Track user's recently selected companies in user_preferences
- Show 5 most recent at top of dropdown
- Update after each NDA creation

### Integration with Story 3.1

**Enhances:**
- CreateNDA form from Story 3-1
- Makes form faster to complete
- Reduces data entry from 15 fields to ~4 fields

**Reuses:**
- ndaService from Story 3-1
- Form validation from Story 3-1
- Contact selection from Story 3-1

### Performance Considerations

**Optimization:**
- Cache company suggestions (5-minute TTL)
- Limit historical query to last 50 NDAs per company
- Index on company_name for fast lookup

**Database Query:**
```sql
-- Fast lookup with index
SELECT * FROM ndas
WHERE company_name = 'TechCorp Solutions'
  AND subagency_id IN (...)  -- Row-level security
ORDER BY created_at DESC
LIMIT 50;

-- Index needed:
CREATE INDEX idx_ndas_company_name ON ndas(company_name, created_at DESC);
```

### Project Structure Notes

**New Files:**
- `src/server/services/companySuggestionsService.ts` - NEW
- `src/server/routes/suggestions.ts` - NEW
- `src/components/ui/CompanyAutocomplete.tsx` - NEW

**Files to Modify:**
- `src/components/screens/CreateNDA.tsx` - MODIFY (add auto-fill logic)
- `prisma/schema.prisma` - ADD index on company_name

**Follows established patterns:**
- Service layer for business logic
- Autocomplete pattern from Story 2-3
- Row-level security from Story 1-4
- Recent values pattern from Story 5-7

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.2]
- [Source: Story 3-1 - Create NDA form foundation]
- [Source: Story 5-7 - Recently used values pattern]
- [Source: Story 2-3 - Autocomplete pattern]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Builds on Story 3-1 create form
- Company-first entry path (1 of 3 smart entry paths)
- Historical data analysis for suggestions
- Auto-fill reduces data entry from 15 to ~4 fields
- Recently used companies pattern

### File List

Files to be created/modified during implementation:
- `src/server/services/companySuggestionsService.ts` - NEW
- `src/server/routes/suggestions.ts` - NEW
- `src/components/ui/CompanyAutocomplete.tsx` - NEW
- `src/components/screens/CreateNDA.tsx` - MODIFY (company autocomplete + auto-fill)
- Migration file for company_name index
- `src/server/services/__tests__/companySuggestionsService.test.ts` - NEW

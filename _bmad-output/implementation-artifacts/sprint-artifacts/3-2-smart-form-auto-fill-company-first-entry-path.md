# Story 3.2: Smart Form Auto-Fill (Company-First Entry Path)

Status: done

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

- [x] **Task 1: Company Suggestions Service** (AC: 1)
  - [x] 1.1: Create src/server/services/companySuggestionsService.ts
  - [x] 1.2: Implement getRecentCompanies/getCompanyDefaults/getMostCommonAgency helpers
  - [x] 1.3: Query previous NDAs for this company
  - [x] 1.4: Extract most recent values for each field
  - [x] 1.5: Calculate most common agency (by frequency)
  - [x] 1.6: Return defaults object with all auto-fillable fields

- [x] **Task 2: Historical Data Queries** (AC: 1)
  - [x] 2.1: Query last NDA for company (for recent POCs)
  - [x] 2.2: Query all NDAs for company (for common agency)
  - [x] 2.3: Calculate mode (most frequent) for categorical fields
  - [x] 2.4: Use most recent for continuous fields (city, state)
  - [x] 2.5: Apply row-level security (only suggest from authorized NDAs)

- [x] **Task 3: Company Autocomplete APIs** (AC: 1)
  - [x] 3.1: Create GET /api/ndas/company-suggestions (recent companies)
  - [x] 3.2: Create GET /api/ndas/company-search?q={query}
  - [x] 3.3: Return distinct companies with NDA count
  - [x] 3.4: Order recent results by most-recent, search by count
  - [x] 3.5: Support limit param (defaults 10/20)

- [x] **Task 4: Auto-Fill Defaults API** (AC: 1)
  - [x] 4.1: Create GET /api/ndas/company-defaults?name={name}
  - [x] 4.2: Call companySuggestionsService.getCompanyDefaults
  - [x] 4.3: Return suggested values for all auto-fillable fields
  - [x] 4.4: Apply nda:create/nda:update permission

- [x] **Task 5: Frontend - Company Autocomplete** (AC: 1, 2)
  - [x] 5.1: Replace company name text input with autocomplete dropdown
  - [x] 5.2: Debounce search (300ms)
  - [x] 5.3: Show previous companies with NDA count
  - [x] 5.4: On selection, fetch defaults
  - [x] 5.5: Auto-fill form fields with suggestions

- [x] **Task 6: Frontend - Auto-Fill Logic** (AC: 1, 2)
  - [x] 6.1: When company selected, call GET /api/ndas/company-defaults
  - [x] 6.2: Update form fields with suggested values
  - [x] 6.3: Update RequestWizard form state when suggestions load
  - [x] 6.4: Show visual indicator (subtle highlight) for auto-filled fields
  - [x] 6.5: Allow manual override of all auto-filled values

- [x] **Task 7: Frontend - Recently Used Companies** (AC: 1)
  - [x] 7.1: Load recent companies for current user via getCompanySuggestions
  - [x] 7.2: Show 5 most recent at top of dropdown
  - [x] 7.3: Separate recent from other matches with divider
  - [x] 7.4: Update recent list after NDA creation

- [x] **Task 8: Testing** (AC: All)
  - [x] 8.1: Unit tests for companySuggestionsService
  - [x] 8.2: Test mode (most frequent) calculation
  - [x] 8.3: API tests for company autocomplete endpoints
  - [x] 8.4: API tests for auto-fill defaults endpoint
  - [x] 8.5: Component tests for auto-fill behavior

## Gap Analysis

### Pre-Development Analysis
- **Date:** 2026-01-03
- **Development Type:** hybrid

**Existing Files (pre-story 3-2):**
- `src/server/services/companySuggestionsService.ts` (already existed with service helpers)
- `src/server/services/__tests__/companySuggestionsService.test.ts` (already existed with unit tests)
- `src/server/routes/ndas.ts` (already had POST/GET, needed company endpoints added)
- `src/components/screens/RequestWizard.tsx` (already existed, needed auto-fill logic added)

**New Files Created in Story 3-2:**
- None (functionality integrated into existing files)

**Findings:**
- Tasks ready: 9
- Tasks partially done: 0
- Tasks already complete: 19
- Tasks refined: 0
- Tasks added: 0

**Codebase Scan:**
- `src/server/services/companySuggestionsService.ts` (service helpers, security scoping) - EXISTING
- `src/server/services/__tests__/companySuggestionsService.test.ts` (unit tests + mode calc) - EXISTING
- `src/server/routes/ndas.ts` (company-suggestions/company-defaults/company-search endpoints) - MODIFIED
- `src/client/services/ndaService.ts` (client calls for suggestions/defaults/search) - EXISTING
- `src/components/screens/RequestWizard.tsx` (company dropdown + defaults auto-fill) - MODIFIED
- `prisma/schema.prisma` (companyName index) - EXISTING

**Status:** Ready for implementation

### Post-Implementation Validation
- **Date:** 2026-01-03
- **Tasks Verified:** 9
- **False Positives:** 0
- **Status:** ✅ All work verified complete

**Verification Evidence:**
- ✅ Debounced company search + counts/divider: `src/components/screens/RequestWizard.tsx`
- ✅ Auto-fill highlight + recent list updates: `src/components/screens/RequestWizard.tsx`
- ✅ API coverage for company endpoints: `src/server/routes/__tests__/ndas.test.ts`
- ✅ Component auto-fill behavior: `src/components/__tests__/RequestWizard.test.tsx`

## Smart Batching Plan

No low-risk batchable patterns detected. Execute remaining UI tweaks and tests individually.

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

**Note:** The examples below are conceptual illustrations showing the pattern. Actual implementation in RequestWizard.tsx uses direct state management rather than React Hook Form.

```tsx
function CreateNDA() {
  const form = useForm();

  // When company selected
  const handleCompanySelect = async (companyName: string) => {
    form.setValue('companyName', companyName);

    // Fetch auto-fill suggestions
    const suggestions = await api.get('/api/ndas/company-defaults', {
      params: { name: companyName }
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
    queryFn: () => api.get('/api/ndas/company-search', {
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

**Implementation Note:** Original plan called for separate files, but actual implementation integrated functionality into existing components for better cohesion.

**New Files (from pre-story 3-2 implementation):**
- `src/server/services/companySuggestionsService.ts` - NEW (created before this story)

**Files Modified in Story 3-2 (commit f3d6422):**
- `src/components/screens/RequestWizard.tsx` - Added debounced company search, auto-fill highlights, recent list
- `src/server/routes/ndas.ts` - Added company-suggestions/company-defaults/company-search endpoints
- `src/components/__tests__/RequestWizard.test.tsx` - Added auto-fill behavior tests
- `src/server/routes/__tests__/ndas.test.ts` - Added company endpoint tests

**Note:** Company autocomplete functionality integrated into RequestWizard.tsx rather than separate component. Suggestions API integrated into ndas.ts routes rather than separate suggestions.ts file.

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
- `src/components/screens/RequestWizard.tsx` - MODIFY (debounced search, auto-fill highlight, recent list updates)
- `src/components/__tests__/RequestWizard.test.tsx` - MODIFY (auto-fill behavior test)
- `src/server/routes/ndas.ts` - MODIFY (input validation for company endpoints)
- `src/server/routes/__tests__/ndas.test.ts` - MODIFY (company suggestions endpoints)
- `_bmad-output/implementation-artifacts/sprint-artifacts/review-3-2.md` - NEW (code review report)

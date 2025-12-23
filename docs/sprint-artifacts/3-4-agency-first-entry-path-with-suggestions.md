# Story 3.4: Agency-First Entry Path with Suggestions

Status: ready-for-dev

## Story

As an **NDA user**,
I want **to select agency first and get intelligent suggestions**,
so that **system helps me with common patterns for that agency**.

## Acceptance Criteria

### AC1: Agency Selection Triggers Suggestions
**Given** I start creating NDA
**When** I select Agency "DoD Air Force" first
**Then** System suggests:
- Common companies for Air Force (e.g., "Lockheed Martin", "Boeing", "Northrop Grumman")
- Typical NDA Type for DoD (e.g., "Mutual")
- USMax Position for Air Force contracts (e.g., "Prime")
- Most-used RTF template for DoD

### AC2: Suggestions as Top Options
**And** Suggestions appear as top options in dropdowns or auto-complete
**And** I can still select any value (not restricted to suggestions)

## Tasks / Subtasks

- [ ] **Task 1: Agency Suggestions Service** (AC: 1)
  - [ ] 1.1: Create src/server/services/agencySuggestionsService.ts
  - [ ] 1.2: Implement getAgencySuggestions(subagencyId, userId) function
  - [ ] 1.3: Query historical NDAs for this subagency
  - [ ] 1.4: Extract common companies (top 5 by frequency)
  - [ ] 1.5: Calculate typical NDA type (mode)
  - [ ] 1.6: Calculate typical USMax position (mode)
  - [ ] 1.7: Find most-used RTF template for this agency

- [ ] **Task 2: Historical Pattern Analysis** (AC: 1)
  - [ ] 2.1: Query NDAs by subagencyId with row-level security
  - [ ] 2.2: Calculate frequency for company names
  - [ ] 2.3: Calculate mode for ndaType field (when added)
  - [ ] 2.4: Calculate mode for usmaxPosition
  - [ ] 2.5: Query document generation history for template usage
  - [ ] 2.6: Return top suggestions for each field

- [ ] **Task 3: Agency Suggestions API** (AC: 1)
  - [ ] 3.1: Create GET /api/suggestions/agency-data?subagencyId={id} endpoint
  - [ ] 3.2: Call agencySuggestionsService
  - [ ] 3.3: Return suggested companies, type, position, template
  - [ ] 3.4: Apply requirePermission('nda:create')

- [ ] **Task 4: Frontend - Agency Selection Handler** (AC: 1, 2)
  - [ ] 4.1: When agency/subagency selected in form, fetch suggestions
  - [ ] 4.2: Call GET /api/suggestions/agency-data
  - [ ] 4.3: Update company dropdown with suggested companies at top
  - [ ] 4.4: Pre-select typical USMax position (with ability to change)
  - [ ] 4.5: Pre-select common template (if template field exists)

- [ ] **Task 5: Frontend - Suggested Companies in Dropdown** (AC: 2)
  - [ ] 5.1: Enhance CompanyAutocomplete to show suggestions
  - [ ] 5.2: Display "Suggested for {agency}" section at top
  - [ ] 5.3: Show frequency: "Boeing (12 NDAs for Air Force)"
  - [ ] 5.4: Separator between suggestions and full list
  - [ ] 5.5: User can still type any company name (not restricted)

- [ ] **Task 6: Frontend - Visual Indicators** (AC: 1)
  - [ ] 6.1: Show "suggested" badge or icon for recommended values
  - [ ] 6.2: Tooltip explaining: "Based on 15 previous NDAs for this agency"
  - [ ] 6.3: Don't pre-fill automatically (let user choose)
  - [ ] 6.4: Or offer "Use Suggestions" button to auto-fill

- [ ] **Task 7: Testing** (AC: All)
  - [ ] 7.1: Unit tests for agencySuggestionsService
  - [ ] 7.2: Test frequency calculation for companies
  - [ ] 7.3: Test mode calculation for categorical fields
  - [ ] 7.4: API tests for agency suggestions endpoint
  - [ ] 7.5: Component tests for suggestion display

## Dev Notes

### Agency Suggestions Service

```typescript
async function getAgencySuggestions(subagencyId: string, userId: string) {
  // Verify user has access to this subagency
  const hasAccess = await verifySubagencyAccess(userId, subagencyId);
  if (!hasAccess) {
    throw new UnauthorizedError('No access to this subagency');
  }

  // Query historical NDAs for this subagency
  const ndas = await prisma.nda.findMany({
    where: {
      subagencyId,
      status: { not: 'CANCELLED' } // Exclude cancelled NDAs from suggestions
    },
    select: {
      companyName: true,
      usmaxPosition: true,
      ndaType: true, // If exists
      // Template usage would come from document generation records
    },
    orderBy: { createdAt: 'desc' },
    take: 100 // Last 100 NDAs for this agency
  });

  if (ndas.length === 0) {
    return null; // No historical data
  }

  // Calculate company frequency
  const companyFreq = new Map<string, number>();
  ndas.forEach(nda => {
    const count = companyFreq.get(nda.companyName) || 0;
    companyFreq.set(nda.companyName, count + 1);
  });

  const topCompanies = Array.from(companyFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Calculate mode for USMax position
  const positionFreq = new Map<string, number>();
  ndas.forEach(nda => {
    if (nda.usmaxPosition) {
      const count = positionFreq.get(nda.usmaxPosition) || 0;
      positionFreq.set(nda.usmaxPosition, count + 1);
    }
  });

  const mostCommonPosition = Array.from(positionFreq.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    companies: topCompanies,
    usmaxPosition: mostCommonPosition,
    // ndaType: mostCommonType, // If field exists
    // templateId: mostUsedTemplate, // From template usage history
    source: 'historical',
    basedOnNdaCount: ndas.length
  };
}
```

### Frontend Implementation

```tsx
function CreateNDA() {
  const [agencySuggestions, setAgencySuggestions] = useState(null);

  // When agency/subagency selected
  const handleAgencyChange = async (subagencyId: string) => {
    form.setValue('subagencyId', subagencyId);

    // Fetch suggestions for this agency
    const suggestions = await api.get('/api/suggestions/agency-data', {
      params: { subagencyId }
    });

    setAgencySuggestions(suggestions);

    // Optionally pre-select common position
    if (suggestions?.usmaxPosition) {
      form.setValue('usmaxPosition', suggestions.usmaxPosition);
    }
  };

  return (
    <Form>
      {/* Agency dropdown - select first */}
      <FormField name="subagencyId" label="Agency">
        <Select onValueChange={handleAgencyChange}>
          {authorizedSubagencies.map(sub => (
            <SelectItem key={sub.id} value={sub.id}>
              {sub.agencyGroup.name} - {sub.name}
            </SelectItem>
          ))}
        </Select>
      </FormField>

      {/* Company autocomplete with suggestions */}
      {agencySuggestions && (
        <FormField name="companyName" label="Company">
          <CompanyAutocomplete
            suggestedCompanies={agencySuggestions.companies}
            agencyName={getSelectedAgencyName()}
          />
        </FormField>
      )}

      {/* Other fields */}
    </Form>
  );
}
```

### Enhanced Company Autocomplete

```tsx
function CompanyAutocomplete({ suggestedCompanies, agencyName }: CompanyAutocompleteProps) {
  return (
    <Combobox>
      {suggestedCompanies && suggestedCompanies.length > 0 && (
        <>
          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
            Suggested for {agencyName}
          </div>
          {suggestedCompanies.map(company => (
            <ComboboxItem key={company.name} value={company.name}>
              {company.name}
              <span className="text-xs text-gray-500 ml-2">
                ({company.count} NDAs)
              </span>
            </ComboboxItem>
          ))}
          <Separator />
        </>
      )}

      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
        All Companies
      </div>
      {/* Full company list */}
    </Combobox>
  );
}
```

### Three Entry Paths Complete

With this story, all three intelligent entry paths are specified:
1. **Manual Entry** (Story 3-1): Fill all fields from scratch
2. **Company-First** (Story 3-2): Select company → auto-fill from history
3. **Agency-First** (THIS STORY): Select agency → see common companies

Users can choose the path that matches their workflow.

### Performance Considerations

**Optimization:**
- Cache agency suggestions for 10 minutes
- Limit historical query to last 100 NDAs
- Pre-calculate suggestions for top agencies (background job)

### Integration with Previous Stories

**Builds on:**
- Story 3-1: Create NDA form
- Story 3-2: Auto-fill and suggestion patterns
- Story 2-2: Subagencies for selection

**Used with:**
- Story 3-2: Can combine (select agency for suggestions, then company for auto-fill)

### Project Structure Notes

**New Files:**
- `src/server/services/agencySuggestionsService.ts` - NEW

**Files to Modify:**
- `src/server/routes/suggestions.ts` - ADD agency-data endpoint
- `src/components/screens/CreateNDA.tsx` - ADD agency-first logic
- `src/components/ui/CompanyAutocomplete.tsx` - EXTEND with suggestions section

**Follows established patterns:**
- Suggestions service from Story 3-2
- Historical data analysis
- Row-level security enforcement
- Autocomplete UI pattern

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.4]
- [Source: Story 3-2 - Company suggestions pattern]
- [Source: Story 3-1 - Create NDA form]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Third of three smart entry paths
- Agency-specific intelligence from historical NDAs
- Company frequency analysis
- Mode calculation for categorical fields
- Non-restrictive suggestions (user can override)

### File List

Files to be created/modified during implementation:
- `src/server/services/agencySuggestionsService.ts` - NEW
- `src/server/routes/suggestions.ts` - MODIFY (add agency-data endpoint)
- `src/components/screens/CreateNDA.tsx` - MODIFY (agency-first logic)
- `src/components/ui/CompanyAutocomplete.tsx` - MODIFY (add suggestions section)
- `src/server/services/__tests__/agencySuggestionsService.test.ts` - NEW

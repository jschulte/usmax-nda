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

### AC2: Override Auto-Fill
**And** User only needs to manually enter: Authorized Purpose, Abbreviated Opportunity Name, Effective Date
**And** Can override any auto-filled value

### AC3: Recently Used Companies
**Given** Company dropdown displays
**When** I open the dropdown
**Then** Recently used companies appear at the top of the list

## Tasks / Subtasks

- [ ] **Task 1: Company Suggestions Service** (AC: 1, 3)
  - [ ] 1.1: Create `src/server/services/companySuggestionsService.ts`
  - [ ] 1.2: Implement `getRecentCompanies(userId)` - Last 10 companies used by user
  - [ ] 1.3: Implement `getCompanyDefaults(companyName)` - Historical field values
  - [ ] 1.4: Implement `getMostCommonAgency(companyName)` - Agency pattern detection

- [ ] **Task 2: Company Defaults API** (AC: 1, 2)
  - [ ] 2.1: Add `GET /api/ndas/company-suggestions` - Recent companies
  - [ ] 2.2: Add `GET /api/ndas/company-defaults?name=:companyName` - Auto-fill values
  - [ ] 2.3: Return null/empty for fields with no historical data

- [ ] **Task 3: Testing** (AC: All)
  - [ ] 3.1: Unit tests for companySuggestionsService
  - [ ] 3.2: Test recent companies sorting
  - [ ] 3.3: Test agency pattern detection (most common)
  - [ ] 3.4: Test default values aggregation

### Review Follow-ups (AI)
- [x] [AI-Review][High] Company search suggestions broken: API returns companyName but client expects name, so dropdown is empty. [src/server/services/companySuggestionsService.ts:180]
- [x] [AI-Review][Medium] AC3 not implemented: recently used companies are never shown (no call to /company-suggestions on focus). [src/components/screens/RequestWizard.tsx:164]
- [x] [AI-Review][Medium] AC2 mismatch: form still blocks progress without USMax position and Relationship POC even after auto-fill; update defaults or AC. [src/components/screens/RequestWizard.tsx:229]

## Dev Agent Record

### File List
- src/server/services/companySuggestionsService.ts
- src/client/services/ndaService.ts
- src/components/screens/RequestWizard.tsx

### Change Log
- 2025-12-20: Fixed company search response shape, added recent companies on focus, and updated form defaults/validation flow.

## Dev Notes

### Auto-Fill Logic

```typescript
interface CompanyDefaults {
  companyCity?: string;
  companyState?: string;
  stateOfIncorporation?: string;
  lastRelationshipPocId?: string;
  lastContractsPocId?: string;
  mostCommonAgencyGroupId?: string;
}

// Get defaults by aggregating historical NDA data
async function getCompanyDefaults(companyName: string): Promise<CompanyDefaults> {
  const historicalNdas = await prisma.nda.findMany({
    where: { companyName },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return {
    companyCity: mostRecent(historicalNdas, 'companyCity'),
    companyState: mostRecent(historicalNdas, 'companyState'),
    // ... etc
    mostCommonAgencyGroupId: mostFrequent(historicalNdas, 'agencyGroupId'),
  };
}
```

## Dependencies

- Story 3.1: Create NDA with Basic Form (must complete first)

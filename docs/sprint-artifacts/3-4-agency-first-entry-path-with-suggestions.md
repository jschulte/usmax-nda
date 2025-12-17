# Story 3.4: Agency-First Entry Path with Suggestions

Status: done

## Story

As an **NDA user**,
I want **to select agency first and get intelligent suggestions**,
so that **system helps me with common patterns for that agency**.

## Acceptance Criteria

### AC1: Agency-Based Suggestions
**Given** I start creating NDA
**When** I select Agency "DoD Air Force" first
**Then** System suggests:
- Common companies for Air Force (e.g., "Lockheed Martin", "Boeing", "Northrop Grumman")
- Typical NDA Type for DoD (e.g., "Mutual")
- USMax Position for Air Force contracts (e.g., "Prime")
- Most-used RTF template for DoD

### AC2: Non-Restrictive Suggestions
**And** Suggestions appear as top options in dropdowns or auto-complete
**And** I can still select any value (not restricted to suggestions)

## Tasks / Subtasks

- [ ] **Task 1: Agency Suggestions Service** (AC: 1)
  - [ ] 1.1: Create `src/server/services/agencySuggestionsService.ts`
  - [ ] 1.2: Implement `getCommonCompanies(agencyGroupId)` - Most used companies
  - [ ] 1.3: Implement `getTypicalPosition(agencyGroupId)` - Most common USMax position
  - [ ] 1.4: Implement `getDefaultTemplate(agencyGroupId)` - Most used RTF template

- [ ] **Task 2: Suggestions API** (AC: 1, 2)
  - [ ] 2.1: Add `GET /api/ndas/agency-suggestions?agencyGroupId=:id`
  - [ ] 2.2: Return suggestions sorted by frequency

- [ ] **Task 3: Testing** (AC: All)
  - [ ] 3.1: Test company suggestions by agency
  - [ ] 3.2: Test position pattern detection
  - [ ] 3.3: Test with no historical data (returns empty suggestions)

## Dev Notes

### Suggestions Response

```typescript
interface AgencySuggestions {
  commonCompanies: string[];      // Top 5 companies for this agency
  typicalPosition: UsMaxPosition; // Most common position
  defaultTemplateId?: string;     // Most used template
}
```

### Query Logic

```typescript
// Get top 5 companies by NDA count for agency
const companies = await prisma.nda.groupBy({
  by: ['companyName'],
  where: { agencyGroupId },
  _count: true,
  orderBy: { _count: { companyName: 'desc' } },
  take: 5,
});
```

## Dependencies

- Story 3.1: Create NDA with Basic Form
- Story 3.2: Smart Form Auto-Fill

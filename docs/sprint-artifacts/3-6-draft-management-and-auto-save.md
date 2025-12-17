# Story 3.6: Draft Management & Auto-Save

Status: backlog

## Story

As an **NDA user**,
I want **drafts to auto-save every 30 seconds**,
so that **I never lose work if browser crashes or I navigate away**.

## Acceptance Criteria

### AC1: Auto-Save Drafts
**Given** I'm filling out Create NDA form
**When** 30 seconds pass since last change
**Then** Form data auto-saves to database
**And** Toast notification briefly shows: "Draft saved ✓"
**And** No page reload or navigation interruption

### AC2: Resume Draft Editing
**Given** I close browser while editing draft
**When** I log back in and navigate to "My Drafts" (filter preset)
**Then** Draft NDA appears with status="Created" and incomplete fields flagged
**And** I can click "Continue Editing"
**And** Form reloads with all previously entered data

### AC3: Auto-Save Failure Handling
**Given** Auto-save fails (network error)
**When** 30s interval triggers
**Then** Retry automatically after 5 seconds
**And** If retry fails, show warning: "Auto-save failed - check connection"
**And** Form data preserved in browser memory

## Tasks / Subtasks

- [ ] **Task 1: Draft Auto-Save API** (AC: 1)
  - [ ] 1.1: Add `PATCH /api/ndas/:id/draft` endpoint
  - [ ] 1.2: Accept partial NDA data for incremental saves
  - [ ] 1.3: Update existing draft without creating new records
  - [ ] 1.4: Return last saved timestamp

- [ ] **Task 2: Draft List Filtering** (AC: 2)
  - [ ] 2.1: Add `isDraft` computed field (status=CREATED and incomplete fields)
  - [ ] 2.2: Add draft filter to NDA list endpoint
  - [ ] 2.3: Flag incomplete required fields in response

- [ ] **Task 3: Testing** (AC: All)
  - [ ] 3.1: Test draft update endpoint
  - [ ] 3.2: Test draft filtering
  - [ ] 3.3: Test partial data saves
  - [ ] 3.4: Test incomplete field flagging

## Dev Notes

### Draft Save Endpoint

```typescript
// PATCH /api/ndas/:id/draft
// Request body: Partial<CreateNdaRequest>
// Response: { savedAt: Date, incompleteFields: string[] }

router.patch('/:id/draft', async (req, res) => {
  const nda = await ndaService.updateDraft(req.params.id, req.body);
  const incompleteFields = validateRequiredFields(nda);

  res.json({
    savedAt: new Date(),
    incompleteFields,
  });
});
```

### Incomplete Field Detection

```typescript
function getIncompleteFields(nda: Partial<Nda>): string[] {
  const required = ['companyName', 'abbreviatedName', 'authorizedPurpose', 'relationshipPocId'];
  return required.filter(field => !nda[field]);
}
```

## Dependencies

- Story 3.1: Create NDA with Basic Form

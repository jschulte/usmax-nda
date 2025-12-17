# Story 3.3: Clone/Duplicate NDA (Second Entry Path)

Status: backlog

## Story

As an **NDA user**,
I want **to duplicate an existing NDA and change only what's different**,
so that **I can quickly create similar NDAs (common for repeat partners)**.

## Acceptance Criteria

### AC1: Clone NDA Button
**Given** I'm viewing NDA #1590 (TechCorp, DoD Air Force, Prime)
**When** I click "Clone NDA" button
**Then** Create NDA form opens pre-filled with ALL fields from NDA #1590
**And** Form shows banner: "Cloned from NDA #1590"

### AC2: Create Cloned NDA
**Given** Clone form is open
**When** I change only: Authorized Purpose, Abbreviated Opportunity Name, Effective Date
**And** Click "Create"
**Then** New NDA created with new UUID and display ID
**And** All other fields match original
**And** audit_log includes: cloned_from_nda_id=1590

### AC3: Clone Source Tracking
**Given** NDA was cloned
**When** I view the new NDA detail
**Then** Shows "Cloned from NDA #1590" link to original

## Tasks / Subtasks

- [ ] **Task 1: Clone API Endpoint** (AC: 1, 2, 3)
  - [ ] 1.1: Add `POST /api/ndas/:id/clone` endpoint
  - [ ] 1.2: Copy all fields from source NDA
  - [ ] 1.3: Clear status-specific fields (fullyExecutedDate, etc.)
  - [ ] 1.4: Set status to CREATED
  - [ ] 1.5: Record clonedFromId in new NDA record

- [ ] **Task 2: Extend NDA Schema** (AC: 3)
  - [ ] 2.1: Add clonedFromId field (optional relation to self)
  - [ ] 2.2: Run migration

- [ ] **Task 3: Testing** (AC: All)
  - [ ] 3.1: Test clone creates new NDA with copied fields
  - [ ] 3.2: Test clonedFromId tracking
  - [ ] 3.3: Test audit log includes clone source

## Dev Notes

### Clone Endpoint

```typescript
// POST /api/ndas/:id/clone
// Response: New NDA with clonedFromId set

const sourceNda = await getNda(req.params.id);
const newNda = await createNda({
  ...sourceNda,
  id: undefined,            // New UUID
  displayId: undefined,     // New sequence
  status: NdaStatus.CREATED,
  fullyExecutedDate: null,
  clonedFromId: sourceNda.id,
  createdById: userContext.contactId,
});
```

### Schema Addition

```prisma
model Nda {
  // ... existing fields
  clonedFromId  String?
  clonedFrom    Nda?    @relation("CloneSource", fields: [clonedFromId], references: [id])
  clones        Nda[]   @relation("CloneSource")
}
```

## Dependencies

- Story 3.1: Create NDA with Basic Form

# Story 3.6: Draft Management & Auto-Save

Status: ready-for-dev

## Story

As an **NDA user**,
I want **drafts to auto-save every 30 seconds**,
so that **I never lose work if browser crashes or I navigate away**.

## Acceptance Criteria

### AC1: Auto-Save Functionality
**Given** I'm filling out Create NDA form
**When** 30 seconds pass since last change
**Then** Form data auto-saves to database
**And** Toast notification briefly shows: "Draft saved ✓"
**And** No page reload or navigation interruption

### AC2: Resume Draft on Return
**Given** I close browser while editing draft
**When** I log back in and navigate to "My Drafts" (filter preset)
**Then** I see my draft NDA with status="Created"
**And** Clicking it opens form with all saved data

## Tasks / Subtasks

- [ ] **Task 1: Auto-Save Logic - Frontend** (AC: 1)
  - [ ] 1.1: Implement useAutoSave() hook
  - [ ] 1.2: Detect form changes with React Hook Form watch()
  - [ ] 1.3: Debounce save trigger (30 seconds after last change)
  - [ ] 1.4: Call PUT /api/ndas/:id if NDA exists, POST if new
  - [ ] 1.5: Show unobtrusive success notification

- [ ] **Task 2: Auto-Save Backend** (AC: 1)
  - [ ] 2.1: Extend ndaService with updateNda(id, data, userId)
  - [ ] 2.2: Support partial updates (only changed fields)
  - [ ] 2.3: Don't change status on auto-save (stays "Created")
  - [ ] 2.4: Update updatedAt timestamp
  - [ ] 2.5: Don't audit log auto-saves (too noisy)

- [ ] **Task 3: Draft Detection** (AC: 1)
  - [ ] 3.1: On form mount, check if editing existing draft
  - [ ] 3.2: If ndaId in URL, load NDA data into form
  - [ ] 3.3: Track whether NDA has been saved (for POST vs PUT)
  - [ ] 3.4: Update URL with NDA ID after first save

- [ ] **Task 4: My Drafts Filter Preset** (AC: 2)
  - [ ] 4.1: Add "My Drafts" to filter presets (from Story 5.4)
  - [ ] 4.2: Filter: status=Created, createdBy=currentUser
  - [ ] 4.3: Show in dashboard or NDA list
  - [ ] 4.4: Link to edit form (not detail view)

- [ ] **Task 5: Draft Persistence** (AC: 2)
  - [ ] 5.1: NDA with status="Created" is a draft
  - [ ] 5.2: Store all form data in NDA record
  - [ ] 5.3: Include partially-filled fields
  - [ ] 5.4: Resume draft loads data back into form

- [ ] **Task 6: Frontend - useAutoSave Hook** (AC: 1)
  - [ ] 6.1: Create src/client/hooks/useAutoSave.ts
  - [ ] 6.2: Accept: form data, save function, delay (30000ms)
  - [ ] 6.3: Use useEffect with dependency on form values
  - [ ] 6.4: Debounce with setTimeout, cleanup on unmount
  - [ ] 6.5: Track saving state (show spinner if needed)

- [ ] **Task 7: Unsaved Changes Warning** (AC: 1)
  - [ ] 7.1: Track if form has unsaved changes
  - [ ] 7.2: Show browser warning on navigate away/close
  - [ ] 7.3: Use beforeunload event
  - [ ] 7.4: Clear warning after auto-save completes

- [ ] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for auto-save debouncing logic
  - [ ] 8.2: Test POST on first save, PUT on subsequent saves
  - [ ] 8.3: Test draft resume functionality
  - [ ] 8.4: Test unsaved changes warning
  - [ ] 8.5: E2E test for auto-save with browser close/reopen

## Dev Notes

### Auto-Save Hook Implementation

```typescript
import { useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';

function useAutoSave(
  form: UseFormReturn,
  saveFn: (data: any) => Promise<void>,
  delay: number = 30000 // 30 seconds
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const formValues = form.watch();

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      if (form.formState.isDirty) {
        await saveFn(formValues);
        toast.success('Draft saved', { duration: 2000 });
        form.reset(formValues); // Mark as clean
      }
    }, delay);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formValues]);
}

// Usage
function CreateNDA() {
  const [ndaId, setNdaId] = useState<string | null>(null);

  const saveDraft = async (data: NdaFormData) => {
    if (ndaId) {
      // Update existing draft
      await api.put(`/api/ndas/${ndaId}`, data);
    } else {
      // Create new draft
      const nda = await api.post('/api/ndas', data);
      setNdaId(nda.id);
      // Update URL to include NDA ID
      navigate(`/nda/create/${nda.id}`, { replace: true });
    }
  };

  useAutoSave(form, saveDraft, 30000);

  return <Form>{/* fields */}</Form>;
}
```

### Unsaved Changes Warning

```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (form.formState.isDirty) {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
      return 'You have unsaved changes. Are you sure you want to leave?';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [form.formState.isDirty]);
```

### Draft vs Finalized NDA

**Draft Criteria:**
- Status = "Created"
- May have incomplete fields
- Not yet emailed or document generated
- Can be edited/deleted

**Finalized:**
- Status changed from "Created" (to Emailed, etc.)
- Document typically generated
- More restricted editing

### My Drafts Filter

**From Story 5.4 presets:**
```typescript
const MY_DRAFTS_PRESET = {
  status: 'CREATED',
  createdBy: userId,
  // Show user's unfinished NDAs
};
```

### Backend Auto-Save

```typescript
async function updateNda(id: string, data: Partial<NdaUpdateInput>, userId: string) {
  // Fetch existing with row-level security
  const nda = await findNdaWithScope(id, userId);

  if (!nda) {
    throw new NotFoundError('NDA not found');
  }

  // Only allow updates if status is Created (draft)
  if (nda.status !== 'CREATED') {
    throw new BadRequestError('Cannot auto-save finalized NDA');
  }

  // Update with partial data
  const updated = await prisma.nda.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date()
    }
  });

  // Don't audit log auto-saves (too noisy)
  // Audit log only on explicit "Save" or status changes

  return updated;
}
```

### Performance Considerations

**Debouncing:**
- 30 seconds after last change (not every keystroke)
- Cancel timeout if component unmounts
- Silent failures acceptable (draft saving is convenience, not critical)

**Network:**
- Small payload (only changed fields)
- Optimistic UI (don't wait for response)
- Retry on failure (once)

### Integration with Previous Stories

**Builds on:**
- Story 3-1: Create NDA form and service
- Story 5-4: Filter presets (will add "My Drafts")

**Foundation for:**
- Story 8-25: Form data preservation (this implements it)

### Project Structure Notes

**New Files:**
- `src/client/hooks/useAutoSave.ts` - NEW

**Files to Modify:**
- `src/server/services/ndaService.ts` - ADD updateNda() function
- `src/server/routes/ndas.ts` - ADD PUT /api/ndas/:id endpoint
- `src/components/screens/CreateNDA.tsx` - INTEGRATE useAutoSave hook

**Follows established patterns:**
- React hooks for reusable logic
- Debouncing from Story 5.1
- Service layer updates
- Row-level security on updates

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.6]
- [Source: docs/architecture.md#Error Handling - Form Data Preservation]
- [Source: Story 3-1 - Create NDA foundation]
- [Source: Story 5-4 - Filter presets]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Auto-save with 30-second debounce
- useAutoSave hook for reusable logic
- Draft resume functionality
- Unsaved changes warning
- Silent auto-save (no audit log noise)

### File List

Files to be created/modified during implementation:
- `src/client/hooks/useAutoSave.ts` - NEW
- `src/server/services/ndaService.ts` - MODIFY (add updateNda)
- `src/server/routes/ndas.ts` - MODIFY (add PUT /ndas/:id)
- `src/components/screens/CreateNDA.tsx` - MODIFY (integrate useAutoSave)
- `src/client/hooks/__tests__/useAutoSave.test.ts` - NEW
- `src/server/services/__tests__/ndaService.test.ts` - MODIFY (test updateNda)

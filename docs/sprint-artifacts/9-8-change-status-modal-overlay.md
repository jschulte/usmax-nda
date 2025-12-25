# Story 9.8: Convert Status Change to Modal Dialog

Status: done

## Story

As an NDA user,
I want to change NDA status via a modal dialog instead of an inline dropdown,
So that the status change action is more intentional and prominent with better UX.

## Acceptance Criteria

**AC1: Status change triggers modal dialog**
**Given** I click "Change Status" button or select new status from dropdown
**When** the action is triggered
**Then** a modal dialog opens as an overlay
**And** the dialog shows current status and available transitions
**And** the dialog has a semi-transparent backdrop

**AC2: Modal shows valid status options**
**Given** the status change modal is open
**When** I view the options
**Then** I see only valid status transitions for current status
**And** each option shows the status display name (e.g., "Sent/Pending Signature")
**And** invalid transitions are not shown

**AC3: Modal confirms action**
**Given** I select a new status in the modal
**When** I click "Confirm" or "Change Status"
**Then** the status is updated
**And** the modal closes
**And** the NDA detail page refreshes with new status

**AC4: Modal can be cancelled**
**Given** the status change modal is open
**When** I click "Cancel" or click outside the modal
**Then** the modal closes without making changes
**And** the NDA status remains unchanged

## Tasks / Subtasks

- [x] Create status change modal component (Task AC: AC1, AC2)
  - [x] Add Dialog state to NDADetail.tsx
  - [x] Create modal with backdrop overlay
  - [x] Display current status in modal header
  - [x] Show valid transitions as radio buttons or select
- [x] Replace inline dropdown with button (Task AC: AC1)
  - [x] Remove current select element (lines 1780-1800)
  - [x] Add "Change Status" button
  - [x] Wire button to open modal
- [x] Implement modal confirmation (Task AC: AC3)
  - [x] Add confirm button to modal
  - [x] Call updateNDAStatus on confirm
  - [x] Close modal after successful status change
  - [x] Show toast notification
- [x] Add cancel behavior (Task AC: AC4)
  - [x] Add cancel button
  - [x] Handle backdrop click to close
  - [x] Handle Escape key to close
  - [x] No changes made if cancelled
- [x] Test modal behavior (Task AC: All)
  - [x] Test opening modal
  - [x] Test status change success
  - [x] Test cancel behavior
  - [x] Test Escape key
  - [x] Test backdrop click
  - [x] Verify modal z-index (appears above other content)

## Dev Notes

### Current Implementation

**File:** src/components/screens/NDADetail.tsx lines 1770-1803

**Current:** Inline dropdown select in a Card
**Problem:** Less prominent, no confirmation, easy to accidentally change status
**Solution:** Modal dialog with explicit confirmation step

**Existing Dialogs to Follow:**
- Email composer uses Dialog component (already imported)
- File upload uses Dialog
- Pattern: Dialog with DialogHeader, DialogContent, DialogFooter

### Implementation Pattern

```tsx
// Add state
const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
const [selectedNewStatus, setSelectedNewStatus] = useState<NdaStatus | null>(null);

// Replace dropdown with button
<Button onClick={() => setStatusChangeDialogOpen(true)}>
  Change Status
</Button>

// Add Dialog
<Dialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Change NDA Status</DialogTitle>
      <DialogDescription>
        Current: {getDisplayStatus(nda.status)}
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-3">
      {validStatusTransitions.map(status => (
        <label key={status} className="flex items-center gap-2">
          <input
            type="radio"
            name="status"
            value={status}
            checked={selectedNewStatus === status}
            onChange={() => setSelectedNewStatus(status)}
          />
          {getDisplayStatus(status)}
        </label>
      ))}
    </div>

    <DialogFooter>
      <Button variant="secondary" onClick={() => setStatusChangeDialogOpen(false)}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleConfirmStatusChange}
        disabled={!selectedNewStatus}
      >
        Change Status
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### References

- [Current Implementation: src/components/screens/NDADetail.tsx lines 1770-1803]
- [Dialog Component: src/components/ui/dialog.tsx - Radix UI wrapper]
- [Pattern: Email composer modal for reference]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (create-story + dev-story workflows)

### Debug Log References

N/A - straightforward UI refactor

### Completion Notes List

✅ **Modal Implementation:**
- Added showStatusChangeModal and selectedNewStatus state variables
- Created handleConfirmStatusChange handler
- Replaced inline dropdown select with "Change Status..." button
- Built modal dialog with radio button options for status selection
- Modal shows only valid transitions from current status
- Cancel button and backdrop/Escape key close modal without changes

✅ **UX Improvements:**
- Status change now requires explicit confirmation (prevents accidental changes)
- Modal overlay makes action more intentional and prominent
- Radio buttons with visual selection feedback
- Disabled states handled properly (no transitions, updating status)

### File List

- src/components/screens/NDADetail.tsx (modified - added modal state, handler, replaced dropdown with button, added modal dialog)

### Change Log

**2025-12-24:** Story 9.8 completed - Status change converted from inline dropdown to modal dialog with confirmation

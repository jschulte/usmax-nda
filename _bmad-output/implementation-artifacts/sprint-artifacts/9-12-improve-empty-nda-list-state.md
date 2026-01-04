# Story 9.12: Improve Empty NDA List State

Status: done

## Story

As an NDA user,
I want to see a helpful and visually appealing empty state when no NDAs are found,
So that I understand why the list is empty and know what actions I can take.

## Acceptance Criteria

**AC1: Empty state has visual appeal**
**Given** I view an NDA list with no results (filtered or no NDAs exist)
**When** the empty state renders
**Then** I see an icon or illustration (e.g., empty inbox icon)
**And** the empty state is centered and well-designed
**And** the message is friendly and helpful (not just "No NDAs found")

**AC2: Context-aware messaging**
**Given** I see an empty NDA list
**When** filters are active
**Then** the message says "No NDAs match your current filters"
**And** I see a "Clear Filters" button
**When** no filters are active
**Then** the message says "No NDAs yet - create your first NDA to get started"
**And** I see a "Create NDA" button

**AC3: Clear call-to-action**
**Given** I see the empty state
**When** I can create NDAs (have nda:create permission)
**Then** I see a prominent "Create NDA" or "Request NDA" button
**And** clicking it navigates to /ndas/new
**When** I cannot create NDAs (no permission)
**Then** I see a message: "Contact your administrator for access"

**AC4: Empty state for filtered results**
**Given** I apply filters that return zero results
**When** the empty state shows
**Then** I see which filters are active
**And** I can easily clear filters to see all NDAs
**And** the "Clear Filters" action is prominent

## Tasks / Subtasks

- [x] Enhance empty state UI (Task AC: AC1)
  - [x] Add icon (Inbox, FileText, or custom illustration)
  - [x] Improve typography and spacing
  - [x] Center and style the container
  - [x] Make it visually appealing
- [x] Add context-aware messaging (Task AC: AC2)
  - [x] Detect if filters are active
  - [x] Show different message based on filter state
  - [x] Make messaging friendly and helpful
- [x] Add clear call-to-action (Task AC: AC3)
  - [x] Show "Create NDA" button if user has permission
  - [x] Show helpful message if no permission
  - [x] Wire button to navigate to /ndas/new
- [x] Handle filtered empty state (Task AC: AC4)
  - [x] Add "Clear Filters" button when filters active
  - [x] Show active filter summary
  - [x] Wire button to clear all filters
  - [x] Test with various filter combinations

## Dev Notes

### Current Implementation

**File:** src/components/screens/Requests.tsx lines 1044-1055

**Current (Minimal):**
```tsx
{!loading && !error && ndas.length === 0 && (
  <Card className="flex items-center justify-center py-12">
    <div className="text-center">
      <p className="text-[var(--color-text-secondary)] mb-4">No NDAs found</p>
      {showCreateButton && (
        <Button onClick={() => navigate('/request-wizard')}>
          Create your first NDA
        </Button>
      )}
    </div>
  </Card>
)}
```

**Improvements Needed:**
- Add icon/illustration
- Better messaging (context-aware)
- Show active filters if any
- Add "Clear Filters" button
- Improve visual design

**Enhanced Pattern:**
```tsx
{!loading && !error && ndas.length === 0 && (
  <Card className="flex items-center justify-center py-16">
    <div className="text-center max-w-md">
      <div className="mb-4 flex justify-center">
        <Inbox className="w-16 h-16 text-gray-300" />
      </div>

      <h3 className="text-lg font-medium mb-2">
        {hasActiveFilters ? 'No NDAs match your filters' : 'No NDAs yet'}
      </h3>

      <p className="text-sm text-gray-600 mb-6">
        {hasActiveFilters
          ? 'Try adjusting your search criteria or clear all filters'
          : 'Create your first NDA to get started tracking agreements'
        }
      </p>

      <div className="flex gap-3 justify-center">
        {hasActiveFilters && (
          <Button variant="secondary" onClick={clearAllFilters}>
            Clear Filters
          </Button>
        )}
        {showCreateButton && (
          <Button variant="primary" icon={<Plus />} onClick={() => navigate('/ndas/new')}>
            Create NDA
          </Button>
        )}
      </div>
    </div>
  </Card>
)}
```

### References

- [Current: src/components/screens/Requests.tsx lines 1044-1055]
- [Filter State: Check if any filters are active]
- [Permissions: showCreateButton already checks nda:create]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

### Change Log

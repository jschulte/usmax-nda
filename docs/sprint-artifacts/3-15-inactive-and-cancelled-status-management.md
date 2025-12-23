# Story 3.15: Inactive & Cancelled Status Management

Status: ready-for-dev

## Story

As an **NDA user**,
I want **to mark NDAs as Inactive or Cancelled**,
so that **I can archive deals that didn't proceed or expired agreements**.

## Acceptance Criteria

### AC1: Mark as Inactive
**Given** I'm viewing any NDA
**When** I select status "Inactive" from dropdown
**Then** NDA marked as Inactive
**And** Removed from default list view
**And** audit_log records status change

### AC2: Show Inactive NDAs
**Given** I want to see Inactive NDAs
**When** I check "Show Inactive" filter option
**Then** Inactive NDAs appear in list (grayed out or with badge)

### AC3: Reactivate NDA
**Given** NDA marked Inactive
**When** I change status back to any active status
**Then** Status updated (reversible, not permanent delete)
**And** NDA reappears in default views

### AC4: Cancelled Status
**Given** NDA marked "Cancelled"
**When** Viewed in list
**Then** Shows with "Cancelled" badge/indicator
**And** Hidden by default, shown with "Show Cancelled" filter

## Tasks / Subtasks

- [ ] **Task 1: Default List Filtering** (AC: 1, 2, 4)
  - [ ] 1.1: Extend ndaService.listNdas() to exclude Inactive/Cancelled by default
  - [ ] 1.2: Add showInactive and showCancelled boolean params
  - [ ] 1.3: Default: status NOT IN ['INACTIVE', 'CANCELLED']
  - [ ] 1.4: If showInactive=true, include INACTIVE in results
  - [ ] 1.5: If showCancelled=true, include CANCELLED in results

- [ ] **Task 2: Status Transition Rules** (AC: 1, 3, 4)
  - [ ] 2.1: Verify statusTransitionService from Story 3-12
  - [ ] 2.2: INACTIVE transitions: Can go back to Created, Emailed, In Revision
  - [ ] 2.3: CANCELLED transitions: Terminal (no transitions out)
  - [ ] 2.4: Any active status can go to Inactive or Cancelled

- [ ] **Task 3: Filter Toggles API** (AC: 2, 4)
  - [ ] 3.1: Extend GET /api/ndas to accept showInactive and showCancelled params
  - [ ] 3.2: Apply filtering logic based on params
  - [ ] 3.3: Document API behavior: default excludes both

- [ ] **Task 4: Frontend - Show Inactive/Cancelled Toggles** (AC: 2, 4)
  - [ ] 4.1: Add checkboxes to filter panel
  - [ ] 4.2: "Show Inactive NDAs" checkbox
  - [ ] 4.3: "Show Cancelled NDAs" checkbox
  - [ ] 4.4: Update query params when toggled
  - [ ] 4.5: Persist in URL for shareable links

- [ ] **Task 5: Frontend - Visual Indicators** (AC: 2, 4)
  - [ ] 5.1: Display Inactive NDAs with gray badge
  - [ ] 5.2: Display Cancelled NDAs with red badge
  - [ ] 5.3: Optionally gray out entire row for Inactive/Cancelled
  - [ ] 5.4: Show strikethrough on company name (optional)
  - [ ] 5.5: Clear visual distinction from active NDAs

- [ ] **Task 6: Status Badge Colors** (AC: 2, 4)
  - [ ] 6.1: Update StatusBadge component with Inactive/Cancelled colors
  - [ ] 6.2: INACTIVE: gray background, muted text
  - [ ] 6.3: CANCELLED: red background, danger text
  - [ ] 6.4: Use Badge component with appropriate variant

- [ ] **Task 7: Frontend - Reactivation** (AC: 3)
  - [ ] 7.1: Status dropdown for Inactive NDAs shows active statuses
  - [ ] 7.2: Status dropdown for Cancelled NDAs is disabled (terminal)
  - [ ] 7.3: Tooltip on Cancelled: "Cannot reactivate cancelled NDAs"
  - [ ] 7.4: Confirmation dialog for reactivation from Inactive

- [ ] **Task 8: Testing** (AC: All)
  - [ ] 8.1: API tests for default filtering (excludes Inactive/Cancelled)
  - [ ] 8.2: API tests for showInactive and showCancelled params
  - [ ] 8.3: Test status transitions to/from Inactive
  - [ ] 8.4: Test Cancelled is terminal (no transitions out)
  - [ ] 8.5: Component tests for filter toggles

## Dev Notes

### Default List Filtering Logic

```typescript
async function listNdas(params: ListNdaParams, userId: string) {
  const where: Prisma.NdaWhereInput = {
    ...scope, // Row-level security

    // Default: exclude Inactive and Cancelled
    status: {
      notIn: [
        ...(params.showInactive ? [] : ['INACTIVE']),
        ...(params.showCancelled ? [] : ['CANCELLED'])
      ]
    },

    // Other filters
    ...otherFilters
  };

  return await prisma.nda.findMany({ where });
}
```

### Status Transition Rules (from Story 3.12)

**Extended with Inactive/Cancelled:**
```typescript
const VALID_TRANSITIONS: Record<NdaStatus, NdaStatus[]> = {
  CREATED: ['EMAILED', 'IN_REVISION', 'FULLY_EXECUTED', 'INACTIVE', 'CANCELLED'],
  EMAILED: ['IN_REVISION', 'FULLY_EXECUTED', 'INACTIVE', 'CANCELLED'],
  IN_REVISION: ['FULLY_EXECUTED', 'INACTIVE', 'CANCELLED'],
  FULLY_EXECUTED: ['INACTIVE'], // Can only archive executed NDAs
  INACTIVE: ['CREATED', 'EMAILED', 'IN_REVISION'], // Reversible - can reactivate
  CANCELLED: [] // Terminal - cannot reactivate
};
```

### Frontend Filter Toggles

```tsx
function FilterPanel({ filters, onChange }: FilterPanelProps) {
  return (
    <div className="space-y-4">
      {/* Other filters */}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="showInactive"
            checked={filters.showInactive || false}
            onCheckedChange={(checked) =>
              onChange({ ...filters, showInactive: checked })
            }
          />
          <Label htmlFor="showInactive">Show Inactive NDAs</Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="showCancelled"
            checked={filters.showCancelled || false}
            onCheckedChange={(checked) =>
              onChange({ ...filters, showCancelled: checked })
            }
          />
          <Label htmlFor="showCancelled">Show Cancelled NDAs</Label>
        </div>
      </div>
    </div>
  );
}
```

### Status Badge Styling

```tsx
function StatusBadge({ status }: { status: NdaStatus }) {
  const config = {
    CREATED: { variant: 'default', color: 'blue' },
    EMAILED: { variant: 'success', color: 'green' },
    IN_REVISION: { variant: 'warning', color: 'yellow' },
    FULLY_EXECUTED: { variant: 'success', color: 'emerald' },
    INACTIVE: { variant: 'secondary', color: 'gray' },
    CANCELLED: { variant: 'destructive', color: 'red' }
  }[status];

  return (
    <Badge variant={config.variant}>
      {status.replace('_', ' ')}
    </Badge>
  );
}
```

### Visual Row Styling

```tsx
<TableRow
  className={
    nda.status === 'INACTIVE' ? 'opacity-50 bg-gray-50' :
    nda.status === 'CANCELLED' ? 'opacity-60 bg-red-50' :
    ''
  }
>
  {/* cells */}
</TableRow>
```

### Business Rules

**Inactive:**
- Used for: Expired agreements, deals that fell through but might resume
- Reversible: Can change back to active status
- Not deleted: Preserved in database and audit trail
- Hidden by default: Reduces clutter in main list

**Cancelled:**
- Used for: Deals abandoned, requirements changed, partner withdrew
- Terminal: Cannot reactivate (permanent decision)
- Not deleted: Preserved for compliance and history
- Hidden by default: Keeps list focused on active work

### Integration with Previous Stories

**Builds on:**
- Story 3-12: Status transition service and rules
- Story 3-7: NDA list filtering
- Story 5-4: Filter presets (will add "Active NDAs" preset)

**Extends:**
- Default filtering behavior
- Status badge colors
- Status transition matrix

### Project Structure Notes

**Files to Modify:**
- `src/server/services/ndaService.ts` - MODIFY listNdas (default filtering)
- `src/server/services/statusTransitionService.ts` - VERIFY transition rules include Inactive/Cancelled
- `src/components/ui/StatusBadge.tsx` - MODIFY (add Inactive/Cancelled colors)
- `src/components/screens/NDAList.tsx` - ADD filter toggles

**No New Files:**
- Extends existing components and services

**Follows established patterns:**
- Status management from Story 3-12
- Filtering from Story 3-7
- UI component updates

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.15]
- [Source: Story 3-12 - Status transition rules]
- [Source: Story 3-7 - NDA list filtering]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Final story in Epic 3
- Inactive and Cancelled status management
- Default filtering excludes both (keeps list clean)
- Inactive is reversible, Cancelled is terminal
- Visual indicators (badges, row styling)
- Filter toggles to show archived NDAs

### File List

Files to be created/modified during implementation:
- `src/server/services/ndaService.ts` - MODIFY (default list filtering)
- `src/server/services/statusTransitionService.ts` - VERIFY transition rules
- `src/components/ui/StatusBadge.tsx` - MODIFY (add Inactive/Cancelled styling)
- `src/components/screens/NDAList.tsx` - MODIFY (add filter toggles)
- `src/server/services/__tests__/ndaService.test.ts` - MODIFY (test filtering)

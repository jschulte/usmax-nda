# Story 3.9: Status Progression Visualization

Status: ready-for-dev

## Story

As an **NDA user**,
I want **to see visual status progression like Amazon order tracking**,
so that **I quickly understand where the NDA is in its lifecycle**.

## Acceptance Criteria

### AC1: Status Progression Display
**Given** NDA has status="Emailed"
**When** Viewing NDA detail
**Then** Status circles displayed:
- ● Created (12/01/2025 2:30 PM) - filled circle
- ● Emailed (12/02/2025 9:15 AM) - filled circle
- ○ In Revision - empty circle (not reached)
- ○ Fully Executed - empty circle

### AC2: Visual Indicators
**And** Filled circles show date/time achieved
**And** Current status highlighted/bold
**And** Visual line connects circles showing progression

### AC3: Real-Time Updates
**Given** NDA status changes from "Emailed" to "In Revision"
**When** Document uploaded (not fully executed)
**Then** "In Revision" circle fills in with timestamp
**And** Progression updates automatically

## Tasks / Subtasks

- [ ] **Task 1: Status History Data** (AC: 1, 3)
  - [ ] 1.1: Query audit_log for status_changed events for NDA
  - [ ] 1.2: Extract: status, timestamp for each change
  - [ ] 1.3: Include in GET /api/ndas/:id response as statusHistory array
  - [ ] 1.4: Order by timestamp ASC (chronological)

- [ ] **Task 2: Status Progression Component** (AC: 1, 2)
  - [ ] 2.1: Create src/components/nda/StatusProgression.tsx
  - [ ] 2.2: Accept: currentStatus, statusHistory array
  - [ ] 2.3: Define status order: Created → Emailed → In Revision → Fully Executed
  - [ ] 2.4: Render circle for each status
  - [ ] 2.5: Fill circles that have been reached
  - [ ] 2.6: Show timestamp for filled circles

- [ ] **Task 3: Visual Design** (AC: 2)
  - [ ] 3.1: Use CSS for circles (border-radius or SVG)
  - [ ] 3.2: Filled circle: solid background color
  - [ ] 3.3: Empty circle: outline only
  - [ ] 3.4: Current status: larger circle or different color
  - [ ] 3.5: Connecting line between circles (horizontal or stepped)
  - [ ] 3.6: Responsive design (vertical on mobile)

- [ ] **Task 4: Status Colors** (AC: 2)
  - [ ] 4.1: Created: blue
  - [ ] 4.2: Emailed: green
  - [ ] 4.3: In Revision: yellow/orange
  - [ ] 4.4: Fully Executed: emerald/success green
  - [ ] 4.5: Inactive/Cancelled: gray (if shown)

- [ ] **Task 5: Timestamp Display** (AC: 1)
  - [ ] 5.1: Format timestamps: mm/dd/yyyy hh:mm AM/PM
  - [ ] 5.2: Show below each filled circle
  - [ ] 5.3: Handle missing timestamps (use createdAt for Created status)
  - [ ] 5.4: Tooltip with full timestamp on hover

- [ ] **Task 6: Integration with NDA Detail** (AC: 1)
  - [ ] 6.1: Add StatusProgression component to NDA detail page
  - [ ] 6.2: Position prominently (top of detail section or in header)
  - [ ] 6.3: Pass nda.status and nda.statusHistory
  - [ ] 6.4: Auto-refresh when status changes

- [ ] **Task 7: Inactive/Cancelled Handling** (AC: 1)
  - [ ] 7.1: If status is Inactive or Cancelled, show separately
  - [ ] 7.2: Don't show in normal progression (it's a side-branch)
  - [ ] 7.3: Display as badge or separate indicator
  - [ ] 7.4: Show timestamp when marked Inactive/Cancelled

- [ ] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Component tests for StatusProgression with different statuses
  - [ ] 8.2: Test filled vs empty circles
  - [ ] 8.3: Test timestamp display
  - [ ] 8.4: Test responsive layout
  - [ ] 8.5: Visual regression tests (Playwright screenshots)

## Dev Notes

### Status Progression Component

```tsx
import { CheckCircle, Circle } from 'lucide-react';

interface StatusProgressionProps {
  currentStatus: NdaStatus;
  statusHistory: Array<{
    status: NdaStatus;
    timestamp: Date;
  }>;
}

function StatusProgression({ currentStatus, statusHistory }: StatusProgressionProps) {
  const statuses: NdaStatus[] = ['CREATED', 'EMAILED', 'IN_REVISION', 'FULLY_EXECUTED'];

  // Build status timeline
  const timeline = statuses.map(status => {
    const historyEntry = statusHistory.find(h => h.status === status);
    const isReached = historyEntry !== undefined;
    const isCurrent = status === currentStatus;

    return {
      status,
      isReached,
      isCurrent,
      timestamp: historyEntry?.timestamp
    };
  });

  return (
    <div className="flex items-center justify-between py-6">
      {timeline.map((step, index) => (
        <div key={step.status} className="flex items-center flex-1">
          {/* Status Circle */}
          <div className="flex flex-col items-center">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${step.isReached
                  ? 'bg-blue-600 text-white'
                  : 'border-2 border-gray-300 text-gray-300'
                }
                ${step.isCurrent && 'ring-4 ring-blue-200'}
              `}
            >
              {step.isReached ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <Circle className="h-6 w-6" />
              )}
            </div>

            {/* Status Label */}
            <p className={`mt-2 text-sm font-medium ${step.isCurrent && 'font-bold'}`}>
              {getStatusLabel(step.status)}
            </p>

            {/* Timestamp */}
            {step.timestamp && (
              <p className="text-xs text-gray-500 mt-1">
                {formatDateTime(step.timestamp)}
              </p>
            )}
          </div>

          {/* Connecting Line */}
          {index < timeline.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 ${
                step.isReached ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function getStatusLabel(status: NdaStatus): string {
  return {
    CREATED: 'Created',
    EMAILED: 'Emailed',
    IN_REVISION: 'In Revision',
    FULLY_EXECUTED: 'Fully Executed'
  }[status];
}
```

### Status History from Audit Log

```typescript
// In ndaService.getNda()
async function getNda(id: string, userId: string) {
  const nda = await findNdaWithScope(id, userId);

  // Fetch status change history
  const statusChanges = await prisma.auditLog.findMany({
    where: {
      entityType: 'nda',
      entityId: id,
      action: 'status_changed'
    },
    orderBy: { createdAt: 'asc' },
    select: {
      metadata: true, // Contains: { from, to, timestamp }
      createdAt: true
    }
  });

  // Build status history
  const statusHistory = statusChanges.map(change => ({
    status: change.metadata.to,
    timestamp: change.createdAt
  }));

  // Add Created status (from NDA createdAt)
  statusHistory.unshift({
    status: 'CREATED',
    timestamp: nda.createdAt
  });

  return {
    ...nda,
    statusHistory
  };
}
```

### Mobile Responsive Layout

**Vertical on Mobile:**
```tsx
<div className="md:flex md:items-center md:justify-between md:flex-row flex-col">
  {/* Desktop: horizontal, Mobile: vertical */}
</div>
```

### Handling Inactive/Cancelled

**These statuses don't fit in linear progression:**
```tsx
// Show separately if status is Inactive or Cancelled
{['INACTIVE', 'CANCELLED'].includes(currentStatus) && (
  <div className="mt-4 p-4 border rounded bg-gray-50">
    <Badge variant="secondary">{currentStatus}</Badge>
    <p className="text-sm text-gray-600 mt-2">
      This NDA was marked {currentStatus.toLowerCase()} on {formatDate(inactiveTimestamp)}
    </p>
  </div>
)}
```

### Integration with Status Management

**From Story 3.12 (future):**
When user changes status via "Change Status" button, statusHistory is updated and visualization refreshes automatically via React Query cache invalidation.

### Project Structure Notes

**New Files:**
- `src/components/nda/StatusProgression.tsx` - NEW

**Files to Modify:**
- `src/server/services/ndaService.ts` - MODIFY (add statusHistory to getNda)
- `src/components/screens/NDADetail.tsx` - INTEGRATE StatusProgression component

**Follows established patterns:**
- Audit log queries for historical data
- React component with props
- Responsive design
- Integration with Story 3-8 detail page

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.9]
- [Source: Story 3-8 - NDA Detail page integration]
- [Source: Story 6.2 - Audit log for status changes]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Amazon-style status progression UI
- Audit log-based status history
- Filled/empty circles with timestamps
- Current status highlighted
- Responsive design (horizontal/vertical)
- Integration with NDA detail page from Story 3-8

### File List

Files to be created/modified during implementation:
- `src/components/nda/StatusProgression.tsx` - NEW
- `src/server/services/ndaService.ts` - MODIFY (add statusHistory)
- `src/components/screens/NDADetail.tsx` - MODIFY (integrate StatusProgression)
- `src/components/nda/__tests__/StatusProgression.test.tsx` - NEW

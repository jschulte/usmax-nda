# Story 3.15: Inactive & Cancelled Status Management

Status: in-progress

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

- [ ] **Task 1: Inactive Status Logic** (AC: 1, 2, 3)
  - [x] 1.1: Implement inactive status transition
  - [x] 1.2: Update list filtering to exclude inactive by default
  - [x] 1.3: Add "Show Inactive" filter option
  - [x] 1.4: Allow status change back from Inactive

- [x] **Task 2: Cancelled Status Logic** (AC: 4)
  - [x] 2.1: Implement cancelled status (terminal)
  - [x] 2.2: Add "Show Cancelled" filter option
  - [x] 2.3: Prevent reactivation from Cancelled

- [x] **Task 3: List View Updates** (AC: 2, 4)
  - [x] 3.1: Add status badge/indicator for Inactive
  - [x] 3.2: Add status badge/indicator for Cancelled
  - [x] 3.3: Apply default filtering in API

- [ ] **Task 4: Testing** (AC: All)
  - [ ] 4.1: Test inactive transition and filtering
  - [ ] 4.2: Test cancelled transition (terminal)
  - [ ] 4.3: Test reactivation from inactive
  - [ ] 4.4: Test default list excludes inactive/cancelled

### Review Follow-ups (AI)
- [x] [AI-Review][HIGH] Default list view includes inactive/cancelled because Requests always sets `showInactive`/`showCancelled` to true, violating default hidden requirement. [src/components/screens/Requests.tsx:98]
- [x] [AI-Review][HIGH] No UI to mark an NDA Inactive or reactivate it; there is no status dropdown or action for INACTIVE in detail view. [src/components/screens/NDADetail.tsx:1060]
- [x] [AI-Review][MEDIUM] “Show Inactive” / “Show Cancelled” filter toggles are not present; only a status dropdown exists. [src/components/screens/Requests.tsx:228]
- [x] [AI-Review][MEDIUM] Story marked done but Tasks/Subtasks are all unchecked and no Dev Agent Record/File List exists to verify changes. [docs/sprint-artifacts/3-15-inactive-and-cancelled-status-management.md:1]

## Dev Agent Record

### File List
- src/components/screens/Requests.tsx
- src/components/screens/NDADetail.tsx
- src/server/services/statusTransitionService.ts
- src/server/routes/ndas.ts
- src/client/services/ndaService.ts

### Change Log
- 2025-12-21: Added inactive/cancelled default filtering with opt-in toggles, surfaced status controls in NDA detail, and enforced terminal behavior for cancelled statuses.

## Dev Notes

### Default List Filtering

```typescript
// Default NDA list excludes inactive and cancelled
async function listNdas(params: NdaListParams): Promise<NdaListResult> {
  const where: Prisma.NdaWhereInput = {
    // Row-level security
    ...getAgencyScopeFilter(userContext),

    // Default status filter (unless show flags are set)
    status: {
      notIn: [
        ...(params.showInactive ? [] : [NdaStatus.INACTIVE]),
        ...(params.showCancelled ? [] : [NdaStatus.CANCELLED]),
      ],
    },
  };

  return prisma.nda.findMany({ where });
}
```

### Transition Rules

```typescript
const TRANSITIONS: Record<NdaStatus, NdaStatus[]> = {
  // ... other statuses
  [NdaStatus.INACTIVE]: [
    NdaStatus.CREATED,
    NdaStatus.EMAILED,
    NdaStatus.IN_REVISION,
    NdaStatus.FULLY_EXECUTED,
  ], // Inactive is reversible
  [NdaStatus.CANCELLED]: [], // Cancelled is terminal - no way back
};

function canReactivate(status: NdaStatus): boolean {
  return status === NdaStatus.INACTIVE;
}
```

### Status Badge Display

```typescript
interface StatusDisplayInfo {
  label: string;
  color: string;
  variant: 'default' | 'muted' | 'danger';
}

const STATUS_DISPLAY: Record<NdaStatus, StatusDisplayInfo> = {
  [NdaStatus.CREATED]: { label: 'Created', color: 'blue', variant: 'default' },
  [NdaStatus.EMAILED]: { label: 'Emailed', color: 'green', variant: 'default' },
  [NdaStatus.IN_REVISION]: { label: 'In Revision', color: 'yellow', variant: 'default' },
  [NdaStatus.FULLY_EXECUTED]: { label: 'Fully Executed', color: 'emerald', variant: 'default' },
  [NdaStatus.INACTIVE]: { label: 'Inactive', color: 'gray', variant: 'muted' },
  [NdaStatus.CANCELLED]: { label: 'Cancelled', color: 'red', variant: 'danger' },
};
```

## Dependencies

- Story 3.12: Status Management & Auto-Transitions
- Story 3.7: NDA List with Filtering

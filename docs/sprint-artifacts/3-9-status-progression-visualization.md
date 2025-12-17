# Story 3.9: Status Progression Visualization

Status: done

## Story

As an **NDA user**,
I want **to see visual status progression like Amazon order tracking**,
so that **I quickly understand where the NDA is in its lifecycle**.

## Acceptance Criteria

### AC1: Status Circle Display
**Given** NDA has status="Emailed"
**When** Viewing NDA detail
**Then** Status circles displayed:
- ● Created (12/01/2025 2:30 PM) - filled circle
- ● Emailed (12/02/2025 9:15 AM) - filled circle
- ○ In Revision - empty circle (not reached)
- ○ Fully Executed - empty circle

**And** Filled circles show date/time achieved
**And** Current status highlighted/bold
**And** Visual line connects circles showing progression

### AC2: Dynamic Updates
**Given** NDA status changes from "Emailed" to "In Revision"
**When** Document uploaded (not fully executed)
**Then** "In Revision" circle fills in with timestamp
**And** Progression updates automatically

## Tasks / Subtasks

- [ ] **Task 1: Status History Tracking** (AC: 1, 2)
  - [ ] 1.1: Create NdaStatusHistory model in Prisma
  - [ ] 1.2: Record status changes with timestamps
  - [ ] 1.3: Include in NDA detail response

- [ ] **Task 2: Status Progression API** (AC: 1)
  - [ ] 2.1: Define status order and progression
  - [ ] 2.2: Add status history to detail endpoint
  - [ ] 2.3: Calculate current position in lifecycle

- [ ] **Task 3: Testing** (AC: All)
  - [ ] 3.1: Test status history recording
  - [ ] 3.2: Test progression calculation
  - [ ] 3.3: Test history includes all transitions

## Dev Notes

### Status History Schema

```prisma
model NdaStatusHistory {
  id        String    @id @default(uuid())
  ndaId     String
  nda       Nda       @relation(fields: [ndaId], references: [id])
  status    NdaStatus
  changedAt DateTime  @default(now())
  changedById String
  changedBy Contact   @relation(fields: [changedById], references: [id])

  @@index([ndaId])
}
```

### Status Progression Order

```typescript
const STATUS_ORDER = [
  NdaStatus.CREATED,
  NdaStatus.EMAILED,
  NdaStatus.IN_REVISION,
  NdaStatus.FULLY_EXECUTED,
];

// Inactive and Cancelled are terminal states, not part of progression
const TERMINAL_STATUSES = [NdaStatus.INACTIVE, NdaStatus.CANCELLED];
```

### Progression Response

```typescript
interface StatusProgression {
  steps: Array<{
    status: NdaStatus;
    label: string;
    completed: boolean;
    timestamp?: Date;
    isCurrent: boolean;
  }>;
  isTerminal: boolean;
  terminalStatus?: NdaStatus;
}
```

## Dependencies

- Story 3.1: Create NDA with Basic Form
- Story 3.8: NDA Detail View

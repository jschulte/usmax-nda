# Story 3.11: Email Notifications to Stakeholders

Status: done

## Story

As an **NDA stakeholder**,
I want **to receive email notifications when NDAs I'm subscribed to change status**,
so that **I stay informed without constantly checking the system**.

## Acceptance Criteria

### AC1: Status Change Notifications
**Given** I am listed as NDA stakeholder with notify_on_changes=true
**When** NDA status changes from "Created" to "Emailed"
**Then** I receive email notification:
- Subject: "NDA Status Update: TechCorp NDA - Now Emailed"
- Body: Details of status change, link to view NDA, timestamp, changed by whom

### AC2: Notification Preferences
**Given** I have notification preferences
**When** I navigate to My Settings → Notifications
**Then** I can toggle which events trigger emails:
- NDA Created, NDA Emailed, Document Uploaded, Status Changed, Fully Executed
**And** Preferences stored in notification_preferences table

## Tasks / Subtasks

- [ ] **Task 1: Notification Service** (AC: 1)
  - [ ] 1.1: Create `src/server/services/notificationService.ts`
  - [ ] 1.2: Implement `notifyStakeholders(ndaId, event, details)`
  - [ ] 1.3: Query stakeholder subscriptions
  - [ ] 1.4: Filter by notification preferences
  - [ ] 1.5: Queue notification emails

- [ ] **Task 2: Notification Preferences API** (AC: 2)
  - [ ] 2.1: Create NotificationPreference model in Prisma
  - [ ] 2.2: Add `GET /api/users/:id/notification-preferences`
  - [ ] 2.3: Add `PUT /api/users/:id/notification-preferences`
  - [ ] 2.4: Add `GET /api/me/notification-preferences`

- [ ] **Task 3: NDA Stakeholder Subscriptions** (AC: 1)
  - [ ] 3.1: Create NdaSubscription model
  - [ ] 3.2: Auto-subscribe POCs when NDA created
  - [ ] 3.3: Allow manual subscription/unsubscription

- [ ] **Task 4: Testing** (AC: All)
  - [ ] 4.1: Test notification email generation
  - [ ] 4.2: Test preference filtering
  - [ ] 4.3: Test stakeholder subscription logic

## Dev Notes

### Schema

```prisma
model NotificationPreference {
  id              String  @id @default(uuid())
  contactId       String  @unique
  contact         Contact @relation(fields: [contactId], references: [id])

  // Event toggles
  onNdaCreated    Boolean @default(true)
  onNdaEmailed    Boolean @default(true)
  onDocumentUploaded Boolean @default(true)
  onStatusChanged Boolean @default(true)
  onFullyExecuted Boolean @default(true)
}

model NdaSubscription {
  id        String  @id @default(uuid())
  ndaId     String
  nda       Nda     @relation(fields: [ndaId], references: [id])
  contactId String
  contact   Contact @relation(fields: [contactId], references: [id])

  @@unique([ndaId, contactId])
}
```

### Notification Events

```typescript
enum NotificationEvent {
  NDA_CREATED = 'nda_created',
  NDA_EMAILED = 'nda_emailed',
  DOCUMENT_UPLOADED = 'document_uploaded',
  STATUS_CHANGED = 'status_changed',
  FULLY_EXECUTED = 'fully_executed',
}

interface NotificationDetails {
  ndaId: string;
  displayId: number;
  companyName: string;
  event: NotificationEvent;
  changedBy: { id: string; name: string };
  timestamp: Date;
  previousValue?: string;
  newValue?: string;
}
```

## Dependencies

- Story 3.10: Email Composition & Sending
- Story 3.12: Status Management & Auto-Transitions

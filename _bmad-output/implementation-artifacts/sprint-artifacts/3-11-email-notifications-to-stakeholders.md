# Story 3.11: Email Notifications to Stakeholders

Status: ready-for-dev

## Story

As an **NDA stakeholder**,
I want **to receive email notifications when NDAs I'm subscribed to change status**,
so that **I stay informed without constantly checking the system**.

## Acceptance Criteria

### AC1: Status Change Notification
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

- [ ] **Task 1: Notification Preferences Schema** (AC: 2)
  - [ ] 1.1: Verify NotificationPreference model exists (from Story 5-13)
  - [ ] 1.2: Or create minimal version for this story
  - [ ] 1.3: Types: STATUS_CHANGED, DOCUMENT_UPLOADED, MARKED_FULLY_EXECUTED, etc.
  - [ ] 1.4: Default: all enabled for new users

- [ ] **Task 2: NDA Stakeholders Schema** (AC: 1)
  - [ ] 2.1: Verify NdaStakeholder model exists (from Story 5-14)
  - [ ] 2.2: Or create minimal version for this story
  - [ ] 2.3: Junction table: nda_id, contact_id, subscribed_at
  - [ ] 2.4: POCs are auto-subscribed

- [ ] **Task 3: Notification Service** (AC: 1, 2)
  - [ ] 3.1: Create src/server/services/notificationService.ts
  - [ ] 3.2: Implement notifyStakeholders(ndaId, eventType, eventData)
  - [ ] 3.3: Fetch all stakeholders (POCs + subscribers)
  - [ ] 3.4: Check each user's notification preferences
  - [ ] 3.5: Queue notification emails for users with enabled preference
  - [ ] 3.6: Use email queue from Story 3-10

- [ ] **Task 4: Notification Email Templates** (AC: 1)
  - [ ] 4.1: Create notification email templates
  - [ ] 4.2: Template for status change
  - [ ] 4.3: Template for document upload
  - [ ] 4.4: Template for fully executed
  - [ ] 4.5: Include: NDA details, action details, link to view, timestamp

- [ ] **Task 5: Trigger Notifications on Events** (AC: 1)
  - [ ] 5.1: After status change, call notificationService.notifyStakeholders()
  - [ ] 5.2: After document upload, call notify with DOCUMENT_UPLOADED event
  - [ ] 5.3: After marking fully executed, call notify with MARKED_FULLY_EXECUTED event
  - [ ] 5.4: Async/fire-and-forget (don't block main operations)

- [ ] **Task 6: Frontend - Notification Preferences UI** (AC: 2)
  - [ ] 6.1: Use NotificationPreferencesPanel from Story 5-13 (or create simple version)
  - [ ] 6.2: Add to User Settings page
  - [ ] 6.3: Toggle switches for each notification type
  - [ ] 6.4: Save preferences to notification_preferences table

- [ ] **Task 7: Testing** (AC: All)
  - [ ] 7.1: Unit tests for notificationService
  - [ ] 7.2: Test preference checking before sending
  - [ ] 7.3: Test stakeholder list aggregation (POCs + subscribers)
  - [ ] 7.4: Test notification email content
  - [ ] 7.5: Integration tests for notification triggers

## Dev Notes

### Notification Service Implementation

```typescript
async function notifyStakeholders(
  ndaId: string,
  notificationType: NotificationType,
  eventData: any
) {
  // Get all stakeholders (POCs + explicit subscribers)
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    include: {
      opportunityContact: true,
      contractsContact: true,
      relationshipContact: true,
      stakeholders: { include: { contact: true } }
    }
  });

  // Aggregate all stakeholders (deduplicate)
  const allStakeholders = [
    nda.opportunityContact,
    nda.contractsContact,
    nda.relationshipContact,
    ...nda.stakeholders.map(s => s.contact)
  ].filter(Boolean);

  const uniqueStakeholders = Array.from(
    new Map(allStakeholders.map(s => [s.id, s])).values()
  );

  // Send to each stakeholder (check preferences)
  for (const stakeholder of uniqueStakeholders) {
    await sendNotificationEmail(
      stakeholder.id,
      notificationType,
      {
        to: stakeholder.email,
        subject: generateNotificationSubject(nda, notificationType, eventData),
        body: generateNotificationBody(nda, notificationType, eventData),
        nda
      }
    );
  }
}

async function sendNotificationEmail(
  userId: string,
  notificationType: NotificationType,
  emailData: EmailData
) {
  // Check user's notification preference
  const isEnabled = await notificationPreferencesService.isNotificationEnabled(
    userId,
    notificationType
  );

  if (!isEnabled) {
    logger.info('Notification skipped - user preference disabled', {
      userId,
      notificationType
    });
    return { skipped: true };
  }

  // Queue email
  await emailQueue.send('send-email', emailData);

  return { queued: true };
}
```

### Notification Email Template

```typescript
const STATUS_CHANGE_TEMPLATE = `
Hello {{recipientName}},

The status of NDA #{{displayId}} for {{companyName}} has been updated:

Previous Status: {{oldStatus}}
New Status: {{newStatus}}
Changed By: {{changedBy}}
Changed At: {{changedAt}}

View NDA: {{ndaLink}}

Best regards,
USmax NDA System
`;
```

### Notification Triggers

**When to send notifications:**
```typescript
// In ndaService or route handlers

// After status change (Story 3.12)
await notificationService.notifyStakeholders(
  ndaId,
  'STATUS_CHANGED',
  { oldStatus, newStatus, changedBy }
);

// After document upload (Story 4.1)
await notificationService.notifyStakeholders(
  ndaId,
  'DOCUMENT_UPLOADED',
  { filename, uploadedBy }
);

// After marking fully executed (Story 4.2)
await notificationService.notifyStakeholders(
  ndaId,
  'MARKED_FULLY_EXECUTED',
  { fullyExecutedDate, markedBy }
);
```

### Integration with Future Stories

**Depends on (future):**
- Story 5-13: NotificationPreference model and service
- Story 5-14: NdaStakeholder model

**For this story:**
- Create minimal versions of those tables OR
- Reference them with TODOs for Epic 5

**Builds on:**
- Story 3-10: Email service and queue
- Story 1-2: Contact model (stakeholders are contacts)

### Security Considerations

**Authorization:**
- Only send to stakeholders who have access to NDA
- Respect user's notification preferences
- No PII in notification emails (use generic language)

**Privacy:**
- Notification emails don't include sensitive NDA details
- Include link to view in system (requires login)
- Unsubscribe option (from Story 5-14)

### Project Structure Notes

**New Files:**
- `src/server/services/notificationService.ts` - NEW
- `src/server/utils/notificationTemplates.ts` - NEW

**Files to Modify:**
- `prisma/schema.prisma` - VERIFY NdaStakeholder and NotificationPreference models (or add minimal versions)
- `src/server/services/ndaService.ts` - TRIGGER notifications on status change
- `src/server/services/documentService.ts` - TRIGGER on document upload

**Follows established patterns:**
- Email queue from Story 3-10
- Preference checking pattern
- Service layer for business logic

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.11]
- [Source: docs/architecture.md#Email & Communication]
- [Source: Story 3-10 - Email service foundation]
- [Source: Story 5-13 - Notification preferences (future)]
- [Source: Story 5-14 - NDA stakeholders (future)]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Automated notification emails to stakeholders
- Integration with email queue from Story 3-10
- References future Stories 5-13 (preferences) and 5-14 (stakeholders)
- Notification templates for different event types
- Preference checking before sending

### File List

Files to be created/modified during implementation:
- `src/server/services/notificationService.ts` - NEW
- `src/server/utils/notificationTemplates.ts` - NEW
- `prisma/schema.prisma` - VERIFY or ADD NotificationPreference and NdaStakeholder models (minimal)
- `src/server/services/ndaService.ts` - MODIFY (trigger notifications)
- `src/server/services/documentService.ts` - MODIFY (trigger notifications)
- `src/server/services/__tests__/notificationService.test.ts` - NEW

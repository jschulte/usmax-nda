# Story 3.10: Email Composition & Sending

Status: done

## Story

As an **NDA user with nda:send_email permission**,
I want **to compose and send NDA email with RTF attached**,
so that **I can distribute the NDA to the partner for signature**.

## Acceptance Criteria

### AC1: Email Composer Pre-Fill
**Given** NDA #1590 has generated RTF document
**When** I click "Send Email"
**Then** Email composer opens pre-filled:
- Subject: "NDA from USmax - for TechCorp for OREM TMA 2025 at DHS CBP"
- TO: relationship_contact.email
- CC: Kelly Davidson (me), Chris Martinez, David Wu (from config)
- BCC: Leadership list (from config)
- Body: Email template with merged fields
- Attachment: Latest RTF document

**And** I can edit any field before sending
**And** I can select different email template from dropdown

### AC2: Send Email
**Given** I click "Send"
**When** Email is queued
**Then** SES sends email via pg-boss queue
**And** NDA status auto-changes to "Emailed"
**And** nda_emails table records send event
**And** audit_log records "email_sent"
**And** Toast shows: "Email sent ✓"

### AC3: Email Failure Handling
**Given** Email send fails (SES error)
**When** Failure detected
**Then** pg-boss retries (3 attempts, exponential backoff)
**And** If all attempts fail, user sees: "Email failed to send, queued for retry"
**And** Error logged to Sentry
**And** Admin alerted if persistent failure

## Tasks / Subtasks

- [ ] **Task 1: Email Service** (AC: 1, 2, 3)
  - [ ] 1.1: Create `src/server/services/emailService.ts`
  - [ ] 1.2: Configure AWS SES client
  - [ ] 1.3: Implement email composition with template merging
  - [ ] 1.4: Implement attachment handling (S3 pre-signed URL or inline)
  - [ ] 1.5: Add email queue with pg-boss
  - [ ] 1.6: Implement retry logic (3 attempts, exponential backoff)

- [ ] **Task 2: Email API** (AC: 1, 2)
  - [ ] 2.1: Add `POST /api/ndas/:id/send-email` endpoint
  - [ ] 2.2: Add `GET /api/ndas/:id/email-preview` for composer data
  - [ ] 2.3: Require nda:send_email permission
  - [ ] 2.4: Auto-transition status to EMAILED on success

- [ ] **Task 3: Email Schema** (AC: 2)
  - [ ] 3.1: Create NdaEmail model in Prisma
  - [ ] 3.2: Track recipients, subject, sentAt, status
  - [ ] 3.3: Record SES message ID for tracking

- [ ] **Task 4: Email Configuration** (AC: 1)
  - [ ] 4.1: Add system config for default CC/BCC lists
  - [ ] 4.2: Add email templates table
  - [ ] 4.3: Implement subject line generation

- [ ] **Task 5: Testing** (AC: All)
  - [ ] 5.1: Unit tests for email service
  - [ ] 5.2: Mock SES with aws-sdk-client-mock
  - [ ] 5.3: Test retry logic
  - [ ] 5.4: Test status auto-transition

### Review Follow-ups (AI)
- [x] [AI-Review][HIGH] Implement email template selection in the composer (blocked: no email template table/API exists yet). [src/components/screens/NDADetail.tsx:1658]
- [x] [AI-Review][HIGH] Send latest RTF as attachment in SES MIME payload (current sendEmail builds text-only message). [src/server/services/emailService.ts:332]
- [x] [AI-Review][HIGH] Implement pg-boss queue + exponential backoff retries (current queueEmail sends immediately with no scheduling). [src/server/services/emailService.ts:295]
- [x] [AI-Review][MEDIUM] Load default CC/BCC from system config instead of hardcoded arrays. [src/server/services/emailService.ts:77]
- [x] [AI-Review][MEDIUM] Add failure handling telemetry + admin alerting (Sentry integration and alert pipeline not yet present). [src/server/services/emailService.ts:402]
- [x] [AI-Review][LOW] Expand tests to cover attachments, retry/backoff behavior, and status transition side effects. [src/server/services/__tests__/emailService.test.ts:1]
- [x] [AI-Review][LOW] Add Dev Agent Record with File List + Change Log to enable verifiable review. [docs/sprint-artifacts/3-10-email-composition-and-sending.md:33]

## Dev Notes

### Email Schema

```prisma
model NdaEmail {
  id           String      @id @default(uuid())
  ndaId        String
  nda          Nda         @relation(fields: [ndaId], references: [id])
  subject      String
  toRecipients String[]
  ccRecipients String[]
  bccRecipients String[]
  body         String      @db.Text
  templateId   String?
  template     EmailTemplate? @relation(fields: [templateId], references: [id])
  sentAt       DateTime    @default(now())
  sentById     String
  sentBy       Contact     @relation(fields: [sentById], references: [id])
  sesMessageId String?
  status       EmailStatus @default(QUEUED)

  @@index([ndaId])
}

enum EmailStatus {
  QUEUED
  SENT
  FAILED
  DELIVERED
  BOUNCED
}
```

### Subject Line Generation

```typescript
// "NDA from USmax - for {companyName} for {abbreviatedName} at {agencyOfficeName}"
function generateSubject(nda: Nda): string {
  return `NDA from USmax - for ${nda.companyName} for ${nda.abbreviatedName} at ${nda.agencyOfficeName || nda.agencyGroup.name}`;
}
```

### pg-boss Queue

```typescript
import PgBoss from 'pg-boss';

const boss = new PgBoss(DATABASE_URL);

// Queue email job
await boss.send('send-nda-email', {
  ndaId: nda.id,
  emailId: email.id,
  attempt: 1,
});

// Process queue
boss.work('send-nda-email', async (job) => {
  await sendEmailViaSES(job.data);
});
```

## Dependencies

- Story 3.1: Create NDA with Basic Form
- Story 3.5: RTF Document Generation
- Story 3.12: Status Management & Auto-Transitions
- AWS SES configured
- pg-boss for job queue

## Dev Agent Record

### File List
- src/components/screens/NDADetail.tsx
- src/client/services/ndaService.ts
- src/server/services/emailService.ts
- src/server/jobs/emailQueue.ts
- src/server/index.ts
- src/server/routes/ndas.ts
- src/server/services/__tests__/emailService.test.ts
- src/server/services/systemConfigService.ts
- src/server/routes/emailTemplates.ts
- src/server/services/emailTemplateService.ts
- src/client/services/emailTemplateService.ts
- src/server/jobs/__tests__/emailQueue.test.ts
- prisma/schema.prisma
- prisma/migrations/20251220184500_add_email_templates/migration.sql
- docs/sprint-artifacts/3-10-email-composition-and-sending.md

### Change Log
- Added email composer dialog with prefill/edit fields, attachment display, and send handling.
- Implemented pg-boss queue startup and enqueue flow with retry/backoff.
- Added SES MIME attachment for latest generated document.
- Loaded default CC/BCC from system config for email previews.
- Added email template table, API, and composer selection with template-based preview rendering.
- Added admin alerting for persistent email failures with Sentry reporting hooks.
- Expanded tests to cover template merge, attachments, queue retry config, and auto-transition invocation.

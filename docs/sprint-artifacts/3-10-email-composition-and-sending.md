# Story 3.10: Email Composition & Sending

Status: ready-for-dev

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

### AC2: Email Customization
**And** I can edit any field before sending
**And** I can select different email template from dropdown

### AC3: Send and Track
**Given** I click "Send"
**When** Email is queued
**Then** SES sends email via pg-boss queue
**And** NDA status auto-changes to "Emailed"
**And** nda_emails table records send event
**And** audit_log records "email_sent"
**And** Toast shows: "Email sent ✓"

### AC4: Retry on Failure
**Given** Email send fails (SES error)
**When** Failure detected
**Then** pg-boss retries (3 attempts, exponential backoff)
**And** If all attempts fail, user sees: "Email failed to send, queued for retry"
**And** Error logged to Sentry
**And** Admin alerted if persistent failure

## Tasks / Subtasks

- [ ] **Task 1: Database Schema - Email Tracking** (AC: 3)
  - [ ] 1.1: Create NdaEmail model in Prisma schema
  - [ ] 1.2: Fields: id, nda_id (FK), subject, to_recipients (array), cc_recipients, bcc_recipients
  - [ ] 1.3: Fields: body, attachments (array), sent_at, sent_by, ses_message_id
  - [ ] 1.4: Fields: delivery_status, bounced, complained
  - [ ] 1.5: Run migration

- [ ] **Task 2: Email Templates Schema** (AC: 1, 2)
  - [ ] 2.1: Create EmailTemplate model (minimal for this story, full in Epic 7)
  - [ ] 2.2: Fields: id, name, subject_template, body_template, is_default
  - [ ] 2.3: Seed at least one default email template
  - [ ] 2.4: Templates use Handlebars: {{companyName}}, {{agencyName}}, etc.

- [ ] **Task 3: Email Service with SES** (AC: 3, 4)
  - [ ] 3.1: Install AWS SES SDK and pg-boss: `npm install @aws-sdk/client-ses pg-boss`
  - [ ] 3.2: Create src/server/services/emailService.ts
  - [ ] 3.3: Implement sendEmail(to, subject, body, attachments) function
  - [ ] 3.4: Use AWS SES SendEmail API
  - [ ] 3.5: Return SES message ID for tracking

- [ ] **Task 4: Email Queue with pg-boss** (AC: 4)
  - [ ] 4.1: Create src/server/jobs/emailQueue.ts
  - [ ] 4.2: Initialize pg-boss with PostgreSQL connection
  - [ ] 4.3: Define email job handler with retry logic
  - [ ] 4.4: Configure retry: 3 attempts, exponential backoff (1s, 5s, 15s)
  - [ ] 4.5: On failure, log to Sentry and mark email as failed

- [ ] **Task 5: Email Composition Service** (AC: 1, 2)
  - [ ] 5.1: Create composeEmail(ndaId, templateId, userId) function
  - [ ] 5.2: Fetch NDA with all data
  - [ ] 5.3: Fetch email template
  - [ ] 5.4: Merge template with NDA fields (Handlebars)
  - [ ] 5.5: Generate subject and body
  - [ ] 5.6: Fetch default CC/BCC from system_config
  - [ ] 5.7: Attach latest RTF document

- [ ] **Task 6: Send Email API** (AC: 3)
  - [ ] 6.1: Create POST /api/ndas/:id/send-email endpoint
  - [ ] 6.2: Apply requirePermission('nda:send_email') and scopeToAgencies
  - [ ] 6.3: Accept: to, cc, bcc, subject, body, templateId in request
  - [ ] 6.4: Queue email job with pg-boss
  - [ ] 6.5: Update NDA status to "Emailed"
  - [ ] 6.6: Record nda_emails and audit_log

- [ ] **Task 7: Status Transition on Send** (AC: 3)
  - [ ] 7.1: When email queued successfully, change status Created → Emailed
  - [ ] 7.2: Use statusTransitionService (from Story 3.12 or create here)
  - [ ] 7.3: Record status change in audit_log
  - [ ] 7.4: Update NDA.updatedAt timestamp

- [ ] **Task 8: Frontend - Email Composer Modal** (AC: 1, 2)
  - [ ] 8.1: Create EmailComposerModal component
  - [ ] 8.2: Fetch email composition data from API
  - [ ] 8.3: Display editable fields: TO, CC, BCC, Subject, Body
  - [ ] 8.4: Show attachment (RTF document) with remove option
  - [ ] 8.5: Template selector dropdown
  - [ ] 8.6: Rich text editor for email body (or textarea)

- [ ] **Task 9: Frontend - Send Email Flow** (AC: 3)
  - [ ] 9.1: Validate all fields before send
  - [ ] 9.2: Show loading state while queuing
  - [ ] 9.3: Call POST /api/ndas/:id/send-email
  - [ ] 9.4: On success, show toast and close modal
  - [ ] 9.5: Refresh NDA detail (status updated to Emailed)
  - [ ] 9.6: Add email to Email History tab

- [ ] **Task 10: Testing** (AC: All)
  - [ ] 10.1: Unit tests for emailService with mocked SES
  - [ ] 10.2: Unit tests for email queue with mocked pg-boss
  - [ ] 10.3: Unit tests for template merging
  - [ ] 10.4: API tests for send-email endpoint
  - [ ] 10.5: Test retry logic
  - [ ] 10.6: Component tests for email composer

## Dev Notes

### Email Service with AWS SES

```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

async function sendEmail(params: SendEmailParams) {
  const sesClient = new SESClient({ region: 'us-east-1' });

  const command = new SendEmailCommand({
    Source: 'nda@usmax.com',
    Destination: {
      ToAddresses: params.to,
      CcAddresses: params.cc,
      BccAddresses: params.bcc
    },
    Message: {
      Subject: { Data: params.subject },
      Body: { Html: { Data: params.body } }
    }
  });

  const response = await sesClient.send(command);

  return {
    messageId: response.MessageId,
    sentAt: new Date()
  };
}
```

### Email Queue with pg-boss

```typescript
import PgBoss from 'pg-boss';

const boss = new PgBoss(process.env.DATABASE_URL);

await boss.start();

// Define job
await boss.work('send-email', { batchSize: 5 }, async (jobs) => {
  for (const job of jobs) {
    try {
      await emailService.sendEmail(job.data);
    } catch (error) {
      // pg-boss handles retries automatically
      throw error; // Rethrow for retry
    }
  }
});

// Queue email
await boss.send('send-email', {
  to: ['partner@company.com'],
  cc: ['user@usmax.com'],
  subject: 'NDA from USmax',
  body: emailBody,
  attachments: [{ filename: 'nda.rtf', path: s3Key }]
}, {
  retryLimit: 3,
  retryDelay: 1,
  retryBackoff: true // Exponential
});
```

### Email Template with Field Merge

```typescript
const emailTemplate = `
Dear {{recipientName}},

Attached is the Non-Disclosure Agreement between USmax and {{companyName}} for {{authorizedPurpose}}.

Please review, sign, and return the executed NDA.

Agency: {{agencyName}} - {{subagencyName}}
Effective Date: {{effectiveDate}}

Best regards,
{{senderName}}
{{senderTitle}}
USmax
`;

// Merge with Handlebars
const template = Handlebars.compile(emailTemplate);
const body = template({
  recipientName: nda.relationshipContact.firstName,
  companyName: nda.companyName,
  authorizedPurpose: nda.authorizedPurpose,
  agencyName: nda.subagency.agencyGroup.name,
  subagencyName: nda.subagency.name,
  effectiveDate: formatDate(nda.effectiveDate),
  senderName: user.fullName,
  senderTitle: user.jobTitle
});
```

### NDA Email Tracking Schema

```prisma
model NdaEmail {
  id              String   @id @default(uuid())
  ndaId           String   @map("nda_id")
  subject         String   @db.VarChar(500)
  toRecipients    String[] @map("to_recipients")
  ccRecipients    String[] @map("cc_recipients")
  bccRecipients   String[] @map("bcc_recipients")
  body            String   @db.Text
  attachments     Json     // Array of { filename, s3Key }
  sentAt          DateTime @map("sent_at") @default(now())
  sentBy          String   @map("sent_by")
  sesMessageId    String?  @map("ses_message_id")
  deliveryStatus  String?  @map("delivery_status") // 'sent', 'delivered', 'bounced'

  nda             Nda      @relation(fields: [ndaId], references: [id], onDelete: Cascade)
  sender          Contact  @relation(fields: [sentBy], references: [id])

  @@map("nda_emails")
}
```

### Frontend Email Composer Modal

```tsx
function EmailComposerModal({ nda, onClose }: EmailComposerModalProps) {
  const form = useForm({
    defaultValues: {
      to: [nda.relationshipContact.email],
      cc: [currentUser.email, ...getDefaultCC()],
      bcc: getDefaultBCC(),
      subject: generateSubject(nda),
      body: '', // Loaded from template
      templateId: null
    }
  });

  const sendMutation = useMutation({
    mutationFn: (data) => api.post(`/api/ndas/${nda.id}/send-email`, data),
    onSuccess: () => {
      toast.success('Email sent successfully');
      queryClient.invalidateQueries(['nda', nda.id]);
      onClose();
    }
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Send NDA Email - {nda.companyName}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <FormField name="to" label="To" />
          <FormField name="cc" label="CC" />
          <FormField name="bcc" label="BCC" />
          <FormField name="subject" label="Subject" />

          <FormField name="templateId" label="Email Template">
            <Select>
              {emailTemplates.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </Select>
          </FormField>

          <FormField name="body" label="Body">
            <Textarea rows={12} />
          </FormField>

          <div className="border rounded p-3 bg-gray-50">
            <p className="text-sm font-medium">Attachments:</p>
            <p className="text-sm">Latest RTF: {latestDocument.filename}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={form.handleSubmit(sendMutation.mutate)}>
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### Integration with Previous Stories

**Builds on:**
- Story 3-5: RTF document generation (attachment)
- Story 3-8: NDA detail page (Send Email button)
- Story 3-12: Status transition logic (auto-change to Emailed)

**Foundation for:**
- Story 3-11: Email notifications to stakeholders
- Story 6-10: Email event tracking

### Security Considerations

**Authorization:**
- Requires nda:send_email permission
- User must have access to NDA (row-level security)
- Cannot send email for unauthorized NDAs

**Email Security:**
- Validate email addresses
- Prevent email injection in headers
- Sanitize body content
- Limit attachment size

### Project Structure Notes

**New Files:**
- `prisma/schema.prisma` - ADD NdaEmail and EmailTemplate models
- `src/server/services/emailService.ts` - NEW
- `src/server/jobs/emailQueue.ts` - NEW
- `src/server/services/emailCompositionService.ts` - NEW
- `src/components/modals/EmailComposerModal.tsx` - NEW

**Files to Modify:**
- `src/components/screens/NDADetail.tsx` - ADD Send Email button handler
- `src/server/routes/ndas.ts` - ADD POST /ndas/:id/send-email

**Follows established patterns:**
- Service layer for business logic
- Queue for async processing
- Template merging from Story 3-5
- Modal UI pattern

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.10]
- [Source: docs/architecture.md#Email Queue with pg-boss]
- [Source: docs/architecture.md#Email & Communication]
- [Source: Story 3-5 - Template merging pattern]
- [Source: Story 3-8 - NDA detail integration]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- AWS SES integration for email sending
- pg-boss queue for async processing and retries
- Email template system (minimal, expanded in Epic 7)
- Email composer modal with pre-filled fields
- Auto status change to "Emailed"
- nda_emails tracking table

### File List

Files to be created/modified during implementation:
- `prisma/schema.prisma` - ADD NdaEmail and EmailTemplate models
- `src/server/services/emailService.ts` - NEW
- `src/server/jobs/emailQueue.ts` - NEW
- `src/server/services/emailCompositionService.ts` - NEW
- `src/components/modals/EmailComposerModal.tsx` - NEW
- `src/server/routes/ndas.ts` - MODIFY (add send-email endpoint)
- `src/components/screens/NDADetail.tsx` - MODIFY (add Send Email handler)
- `prisma/seed.ts` - ADD default email template
- Migration files for email tables
- `src/server/services/__tests__/emailService.test.ts` - NEW
- `src/server/jobs/__tests__/emailQueue.test.ts` - NEW

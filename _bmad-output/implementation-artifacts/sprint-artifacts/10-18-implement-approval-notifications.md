# Story 10.18: Implement Approval Workflow Notifications

Status: backlog

## Story

As an **NDA approver or creator**,
I want **to receive email notifications when NDAs are routed for my approval or when my NDAs are rejected**,
So that **I can respond promptly to approval requests and rejection feedback without constantly checking the system**.

## Acceptance Criteria

**AC1: Approver Notification on Route for Approval**
**Given** an NDA is routed for approval by the creator
**When** POST /api/ndas/:id/route-for-approval is called
**Then** the system queries for all users who have nda:approve permission
**And** filters approvers to only those with agency access to this NDA's subagency
**And** sends email notification to each eligible approver
**And** email subject line includes NDA display ID and company name
**And** email body includes: NDA details (company, agency, purpose), creator name, link to approval page
**And** audit log records notification_sent event for each approver

**AC2: Approver Email Content and Actionability**
**Given** an approver receives an approval request email
**When** they open the email
**Then** the email includes a clear call-to-action: "Review and Approve NDA #{{displayId}}"
**And** the email provides a direct link to /nda/:id page (approval actions available)
**And** the email shows key NDA details: company name, agency, requested by, date routed
**And** the email does not include sensitive information (authorized purpose details)

**AC3: Creator Notification on Rejection**
**Given** an approver rejects an NDA via POST /api/ndas/:id/reject
**When** the rejection is processed
**Then** the system sends email notification to the NDA creator
**And** email subject line indicates rejection: "NDA #{{displayId}} Rejected"
**And** email body includes: rejection reason (from approver), rejector name, link to edit NDA
**And** email provides actionable guidance: "Please review the feedback and resubmit for approval"

**AC4: Rejection Email Content with Feedback**
**Given** a creator receives a rejection notification
**When** they open the email
**Then** the email prominently displays the rejection reason provided by the approver
**And** the email includes a direct link to edit the NDA
**And** the email lists who rejected it and when
**And** the email encourages resubmission after addressing feedback

**AC5: Notification Preference Respect**
**Given** a user has notification preferences configured
**When** approval request or rejection notifications are triggered
**Then** the system checks user's notification preferences
**And** only sends emails if user has enabled approval/rejection notifications
**And** users who opt out are skipped (recorded in audit log)
**And** preference field: onApprovalRequested, onNdaRejected (new fields needed in NotificationPreference table)

**AC6: Permission-Based Recipient Discovery for Approvals**
**Given** the system needs to find approvers for an NDA
**When** APPROVAL_REQUESTED notification is triggered
**Then** the system queries Contact_Role table for users with roles containing nda:approve permission
**And** filters to users with AgencyGroupGrant or SubagencyGrant matching the NDA's subagency
**And** excludes the NDA creator from approver list (avoid notifying themselves)
**And** returns list of eligible approvers with email addresses

**AC7: Creator-Only Notification for Rejections**
**Given** an NDA is rejected
**When** NDA_REJECTED notification is triggered
**Then** the system identifies the NDA creator (createdById field)
**And** sends notification only to the creator (not all subscribers)
**And** includes rejection reason in email body
**And** provides link to edit page (not just view page)

## Tasks / Subtasks

⚠️ **DRAFT TASKS** - Generated from requirements analysis. Will be validated and refined against actual codebase when dev-story runs.

- [ ] Review existing notification infrastructure (AC: 1-7)
  - [ ] Verify NotificationEvent enum has APPROVAL_REQUESTED and NDA_REJECTED (EXISTING)
  - [ ] Check route-for-approval and reject endpoints call notifyStakeholders (EXISTING)
  - [ ] Review notifyStakeholders() function logic
  - [ ] Identify gaps in current notification flow for approval workflow
  - [ ] Check if NotificationPreference table has approval/rejection preference fields
- [ ] Enhance notifyStakeholders for approval workflow (AC: 1, 6)
  - [ ] Add special handling for APPROVAL_REQUESTED event
  - [ ] Implement findUsersWithApprovePermission() helper function
  - [ ] Query Contact_Role → Role → RolePermission for nda:approve permission
  - [ ] Filter approvers by agency access (AgencyGroupGrant, SubagencyGrant)
  - [ ] Exclude NDA creator from approver recipient list
  - [ ] Merge approvers with existing subscribers (deduplicate)
- [ ] Enhance notifyStakeholders for rejection workflow (AC: 3, 7)
  - [ ] Add special handling for NDA_REJECTED event
  - [ ] Send notification only to NDA creator (not all subscribers)
  - [ ] Include rejection reason in notification details
  - [ ] Use different email template for rejections (actionable, encouraging)
- [ ] Add notification preference fields (AC: 5)
  - [ ] Add onApprovalRequested field to NotificationPreference table (migration)
  - [ ] Add onNdaRejected field to NotificationPreference table (migration)
  - [ ] Update eventToPreferenceField() to map APPROVAL_REQUESTED → onApprovalRequested
  - [ ] Update eventToPreferenceField() to map NDA_REJECTED → onNdaRejected
  - [ ] Set default values for new fields (both true by default)
  - [ ] Update getNotificationPreferences() to include new fields
- [ ] Verify and enhance email templates (AC: 2, 4)
  - [ ] Verify approval request email template has clear CTA
  - [ ] Verify approval request includes direct link to NDA
  - [ ] Verify rejection email template includes reason placeholder
  - [ ] Test email rendering with sample data
  - [ ] Ensure emails don't include sensitive information (authorized purpose)
- [ ] Test approval notification flow end-to-end (AC: 1, 2, 6)
  - [ ] Test route-for-approval triggers approver notifications
  - [ ] Verify only users with nda:approve permission are notified
  - [ ] Verify agency scoping (approvers must have access to NDA's agency)
  - [ ] Test creator is excluded from approver list
  - [ ] Test email content includes all required details
  - [ ] Test approval link navigates to correct NDA page
- [ ] Test rejection notification flow end-to-end (AC: 3, 4, 7)
  - [ ] Test reject endpoint triggers creator notification
  - [ ] Verify only NDA creator receives rejection email
  - [ ] Test rejection reason is included in email
  - [ ] Test edit link navigates to NDA edit page
  - [ ] Verify encouraging messaging in rejection email
- [ ] Test notification preference handling (AC: 5)
  - [ ] Test users with onApprovalRequested=false are skipped
  - [ ] Test users with onNdaRejected=false are skipped
  - [ ] Test audit log records skipped notifications
  - [ ] Test default preferences (both enabled) for new users
- [ ] Add comprehensive tests for approval notifications (AC: 1-7)
  - [ ] Unit tests for findUsersWithApprovePermission() function
  - [ ] Unit tests for APPROVAL_REQUESTED notification routing
  - [ ] Unit tests for NDA_REJECTED notification routing
  - [ ] Unit tests for permission + agency filtering logic
  - [ ] Integration tests for route-for-approval → notification flow
  - [ ] Integration tests for reject → notification flow
  - [ ] Mock emailService to verify queueEmail calls
- [ ] Document approval notification behavior (AC: 1-7)
  - [ ] Document notification triggers (route-for-approval, reject)
  - [ ] Document recipient discovery logic (permission + agency access)
  - [ ] Document notification preference fields
  - [ ] Provide examples of approval and rejection emails
  - [ ] Document audit logging for notification events

## Gap Analysis

_This section will be populated by dev-story when gap analysis runs._

**Current Implementation (Partial):**
- ✅ Route-for-approval endpoint calls notifyStakeholders with APPROVAL_REQUESTED (lines 2320-2334)
- ✅ Reject endpoint calls notifyStakeholders with NDA_REJECTED (lines 2407-2422)
- ✅ NotificationEvent enum includes both event types (lines 28-29)
- ✅ Email templates defined for both events (lines 354-355, 376-377)
- ❌ notifyStakeholders only notifies subscribers, doesn't query for approvers (gap)
- ❌ eventToPreferenceField missing cases for APPROVAL_REQUESTED, NDA_REJECTED (defaults to onStatusChanged)
- ❌ NotificationPreference table likely missing onApprovalRequested, onNdaRejected fields

---

## Dev Notes

### Current Implementation Status

**Existing Files:**
- `src/server/services/notificationService.ts` - Notification service (EXISTING, needs enhancement)
- `src/server/routes/ndas.ts` - Route-for-approval and reject endpoints (EXISTING, already call notifyStakeholders)
- Tests: `src/server/services/__tests__/notificationService.test.ts` (EXISTING)

**Implementation Overview:**
- NotificationEvent enum: APPROVAL_REQUESTED and NDA_REJECTED already defined (Story 10.18 comment)
- Email subject/body templates: Already include approval and rejection messages
- Route handlers: Both endpoints already call notifyStakeholders()
- **Gap:** notifyStakeholders() only notifies existing subscribers, doesn't query for users with nda:approve permission

**Expected Workflow:**
1. Enhance notifyStakeholders() to handle APPROVAL_REQUESTED specially:
   - Query for users with nda:approve permission + agency access
   - Merge with existing subscribers
   - Send to all eligible approvers
2. Enhance notifyStakeholders() to handle NDA_REJECTED specially:
   - Send only to NDA creator (createdById)
   - Include rejection reason in email
3. Add notification preference fields (onApprovalRequested, onNdaRejected)
4. Update eventToPreferenceField() to map new events
5. Test end-to-end flows

### Architecture Patterns

**Notification Flow (Architecture Requirement):**
```
User Action → Route Handler → notifyStakeholders() → Recipient Discovery → Queue Emails → SES Send
```

**Approval Notification Recipient Discovery:**
```typescript
// Story 10.18: Find users with nda:approve permission for this agency
async function findApprovers(ndaId: string): Promise<Contact[]> {
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    include: { subagency: { include: { agencyGroup: true } } }
  });

  // Query users with nda:approve permission
  const approvers = await prisma.contact.findMany({
    where: {
      roles: {
        some: {
          role: {
            permissions: {
              some: {
                permission: { code: 'nda:approve' }
              }
            }
          }
        }
      },
      // AND have access to this NDA's agency
      OR: [
        {
          agencyGroupGrants: {
            some: { agencyGroupId: nda.subagency.agencyGroupId }
          }
        },
        {
          subagencyGrants: {
            some: { subagencyId: nda.subagencyId }
          }
        }
      ]
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
    }
  });

  return approvers;
}
```

**Rejection Notification Pattern:**
```typescript
// Story 10.18: Notify only the creator
async function notifyCreatorOfRejection(ndaId: string, reason: string) {
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    include: { createdBy: true }
  });

  // Send to creator only
  await queueEmail({
    ndaId,
    subject: `NDA #${nda.displayId} Rejected`,
    toRecipients: [nda.createdBy.email],
    body: generateRejectionEmail(nda, reason)
  });
}
```

### Technical Requirements

**Approval Workflow Notifications (Story 10.6 dependency):**
- Story 10.6 implemented two-step approval workflow (route-for-approval, approve, reject endpoints)
- Story 10.18 adds email notifications to close the communication loop

**Functional Requirements:**
- FR30: System sends email notifications to subscribed stakeholders when NDA status changes
- FR80: System provides user search with auto-complete (needed for finding approvers)

**Non-Functional Requirements:**
- NFR-O5: Zero silent failures (notification failures logged, don't block operations)
- NFR-U2: All state changes provide explicit confirmation (email is confirmation mechanism)

**Permission System Integration:**
- Permission code: `nda:approve` (already defined in PERMISSIONS.NDA_APPROVE)
- Permission query: Contact → ContactRole → Role → RolePermission → Permission
- Agency scoping: Must check AgencyGroupGrant OR SubagencyGrant

**Email Queue Integration:**
- Use existing queueEmail() function from emailService.ts
- Queue system: pg-boss with retry logic (Story 8.3)
- Email templates: Use notificationService's generateNotificationSubject/Body

**Database Schema Changes Needed:**
```sql
-- Add new notification preference fields
ALTER TABLE notification_preferences
ADD COLUMN on_approval_requested BOOLEAN DEFAULT TRUE,
ADD COLUMN on_nda_rejected BOOLEAN DEFAULT TRUE;
```

### Architecture Constraints

**Notification Service Principles:**
- **Non-Blocking:** Notification failures don't block operations (try/catch, log errors)
- **Audit Trail:** All notifications logged to audit_log
- **Permission-Based:** Only notify users with appropriate permissions
- **Agency-Scoped:** Respect row-level security (approvers must have agency access)
- **Preference-Based:** Respect user notification preferences (opt-out support)

**Email Queue Pattern:**
- All emails go through pg-boss queue (reliability)
- Retry logic: 3 attempts, exponential backoff
- Dead letter queue for permanently failed emails
- All email events logged to nda_emails table

**Security Considerations:**
- Don't leak sensitive NDA details in email (authorized purpose may be confidential)
- Verify approver has permission + agency access before sending
- Include only public NDA fields in emails (displayId, company, agency, status)
- Approval links use secure NDA IDs (UUIDs, not predictable)

### File Structure Requirements

**Backend Services:**
- `src/server/services/notificationService.ts` - Notification service (UPDATE - add approver discovery)
- `src/server/routes/ndas.ts` - Route-for-approval and reject endpoints (EXISTING - already call notifyStakeholders)

**Database Migrations:**
- `prisma/migrations/` - Add onApprovalRequested, onNdaRejected columns (NEW MIGRATION)

**Tests:**
- `src/server/services/__tests__/notificationService.test.ts` (UPDATE - add approval notification tests)
- `src/server/routes/__tests__/ndas.test.ts` (UPDATE - add integration tests for notifications)

### Testing Requirements

**Unit Tests (notificationService.ts):**
- Test findApprovers() queries users with nda:approve permission
- Test findApprovers() filters by agency access (AgencyGroupGrant, SubagencyGrant)
- Test findApprovers() excludes NDA creator
- Test APPROVAL_REQUESTED event routes to all approvers
- Test NDA_REJECTED event routes only to creator
- Test notification preference handling for new event types
- Test email content generation for approval and rejection

**Integration Tests (ndas.ts routes):**
- Test POST /api/ndas/:id/route-for-approval triggers approver notifications
- Test POST /api/ndas/:id/reject triggers creator notification
- Test multiple approvers receive individual emails
- Test creator receives rejection with reason
- Test notification failures don't block status changes
- Test audit logs record notification events

**Permission Query Tests:**
- Test approval query correctly identifies users with nda:approve
- Test agency scoping filters approvers to authorized users only
- Test creator exclusion from approver list
- Mock Prisma to verify correct query structure

**Email Content Tests:**
- Test approval email includes approval link
- Test rejection email includes rejection reason
- Test subject lines are clear and actionable
- Verify no sensitive data in email bodies

**Test Coverage Goal:**
- ≥85% coverage for notificationService.ts
- 100% coverage for approval/rejection notification paths
- Integration tests cover both happy path and edge cases

### Previous Story Intelligence

**Related Prior Work:**
- **Story 10.6:** Two-Step Approval Workflow - Implemented route-for-approval, approve, reject endpoints
- **Story 3.11:** Email Notifications to Stakeholders - Established notifyStakeholders() pattern
- **Story H-1 Task 13:** Added ASSIGNED_TO_ME notification event - Pattern for adding new event types

**Patterns Established:**
- NotificationEvent enum for all event types
- notifyStakeholders() queries subscribers and sends emails
- eventToPreferenceField() maps events to preference fields
- generateNotificationSubject/Body() create email content

**Implementation Notes from Story 10.6:**
- Approval workflow already functional (status transitions work)
- Route-for-approval changes status to PENDING_APPROVAL
- Reject changes status back to CREATED
- Approval changes status to APPROVED (then creator can send email)

### Project Structure Notes

**Existing Notification Patterns:**
- All notification emails go through queueEmail() (pg-boss retry)
- All notifications respect user preferences (opt-out support)
- All notification events logged to audit_log
- Email templates use plain text format (no HTML)

**Integration Points:**
- **Permission System:** ContactRole → Role → RolePermission → Permission
- **Agency Access:** AgencyGroupGrant, SubagencyGrant tables
- **Email Service:** emailService.ts provides queueEmail()
- **Audit Service:** auditService.ts logs notification events

**Code Conventions:**
- TypeScript strict mode enforced
- Async functions return Promise<{notified: number; skipped: number}>
- Error handling: try/catch, log errors, don't throw
- All email operations are async and non-blocking

### References

**Source Documents:**
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 10 Stories]
- [Source: _bmad-output/implementation-artifacts/sprint-artifacts/10-18-implement-approval-notifications.md - Original minimal story]
- [Source: src/server/routes/ndas.ts:2320, 2407 - Existing notification calls]
- [Source: src/server/services/notificationService.ts:27-29, 354-355, 376-377 - Event types and templates]
- [Source: _bmad-output/project-context.md#Error-Handling-Pattern]
- [Source: sprint-artifacts/sprint-status.yaml - Epic 10 status]

**Functional Requirements:**
- FR30: System sends email notifications to subscribed stakeholders when NDA status changes
- FR80: System provides user search with auto-complete (relevant for finding approvers)

**Non-Functional Requirements:**
- NFR-O5: Zero silent failures
- NFR-U2: All state changes provide explicit confirmation

**Architecture Decisions:**
- pg-boss email queue with retry logic
- Permission-based notification routing (not just subscribers)
- Audit logging for all notification events
- Preference-based opt-out support

**Related Stories:**
- Story 10.6: Two-Step Approval Workflow (implements endpoints)
- Story 3.11: Email Notifications to Stakeholders (establishes pattern)
- Story 8.3: Email Retry Logic (pg-boss queue)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

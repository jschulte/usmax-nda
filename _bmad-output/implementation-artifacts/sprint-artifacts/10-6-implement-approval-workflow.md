# Story 10.6: Implement Two-Step Approval Workflow

Status: ready-for-dev

## Story

As an NDA creator,
I want to route my NDA for approval before it is sent,
So that a manager can review and approve the NDA before it goes to the partner.

## Acceptance Criteria

**AC1: Route for approval button and action**
**Given** I have created an NDA (status = CREATED)
**When** I am on the NDA detail page
**Then** I see a "Route for Approval" button
**And** I can click it to submit for approval

**AC2: Status changes to Pending Approval**
**Given** I click "Route for Approval"
**When** the action completes
**Then** the NDA status changes to PENDING_APPROVAL
**And** an audit log entry is created
**And** notification emails are sent to users with "nda:approve" permission for this agency

**AC3: Approver sees approval actions**
**Given** I am an approver (have nda:approve permission)
**When** I view an NDA with status PENDING_APPROVAL
**Then** I see action buttons: "Approve & Send", "Reject", "Request Changes"

**AC4: Approve & Send workflow**
**Given** I click "Approve & Send" on a pending NDA
**When** the action completes
**Then** the NDA status changes to SENT_PENDING_SIGNATURE
**And** the email composer modal opens with the NDA attached
**And** the audit log records who approved and when
**And** I can send the email immediately

**AC5: Reject workflow**
**Given** I click "Reject" on a pending NDA
**When** I provide a rejection reason and confirm
**Then** the NDA status changes back to CREATED
**And** the rejection reason is logged
**And** the creator is notified via email

**AC6: Pending Approval status is filterable**
**Given** I am viewing the NDA list
**When** I filter by status
**Then** I see "Pending Approval" as a status option
**And** filtering works correctly

## Tasks / Subtasks

- [ ] Add PENDING_APPROVAL status to enum (Task AC: AC1, AC2)
  - [ ] Update NdaStatus enum in Prisma schema
  - [ ] Add PENDING_APPROVAL between CREATED and SENT_PENDING_SIGNATURE
  - [ ] Create migration
  - [ ] Regenerate Prisma client
- [ ] Add nda:approve permission (Task AC: AC3)
  - [ ] Add permission to database seed
  - [ ] Update PERMISSIONS constants
  - [ ] Assign to Manager/Admin roles
- [ ] Add approval tracking fields to NDA (Task AC: AC4, AC5)
  - [ ] Add approvedById: String? field
  - [ ] Add approvedAt: DateTime? field
  - [ ] Add rejectionReason: String? field
  - [ ] Create migration
- [ ] Create Route for Approval endpoint (Task AC: AC2)
  - [ ] POST /api/ndas/:id/route-for-approval
  - [ ] Validate user has nda:create permission
  - [ ] Change status to PENDING_APPROVAL
  - [ ] Find users with nda:approve for this agency
  - [ ] Send notification emails to approvers
  - [ ] Log audit entry
- [ ] Create Approve endpoint (Task AC: AC4)
  - [ ] POST /api/ndas/:id/approve
  - [ ] Require nda:approve permission
  - [ ] Set approvedBy and approvedAt
  - [ ] Change status to SENT_PENDING_SIGNATURE
  - [ ] Return success (frontend will open email composer)
  - [ ] Log audit entry
- [ ] Create Reject endpoint (Task AC: AC5)
  - [ ] POST /api/ndas/:id/reject
  - [ ] Require nda:approve permission
  - [ ] Accept rejectionReason in request body
  - [ ] Change status back to CREATED
  - [ ] Notify creator of rejection
  - [ ] Log audit entry with reason
- [ ] Update status transition rules (Task AC: All)
  - [ ] Add PENDING_APPROVAL to VALID_TRANSITIONS
  - [ ] CREATED can transition to PENDING_APPROVAL
  - [ ] PENDING_APPROVAL can transition to SENT_PENDING_SIGNATURE or CREATED
  - [ ] Update STATUS_DISPLAY for PENDING_APPROVAL
- [ ] Add Route for Approval button to NDA detail (Task AC: AC1)
  - [ ] Show button when status = CREATED and user has nda:create
  - [ ] Hide "Send Email" button when status = CREATED (must route first)
  - [ ] Implement onClick handler to call route-for-approval endpoint
- [ ] Add Approve & Send button to NDA detail (Task AC: AC3, AC4)
  - [ ] Show when status = PENDING_APPROVAL and user has nda:approve
  - [ ] Implement onClick to call approve endpoint
  - [ ] On success, open email composer modal
- [ ] Add Reject/Request Changes buttons (Task AC: AC3, AC5)
  - [ ] Show when status = PENDING_APPROVAL and user has nda:approve
  - [ ] Reject: Modal with reason textarea, call reject endpoint
  - [ ] Request Changes: Send back to CREATED with comment
- [ ] Update status filter (Task AC: AC6)
  - [ ] Add PENDING_APPROVAL to statusFormatter
  - [ ] Display name: "Pending Approval"
  - [ ] Ensure filter dropdown includes it
- [ ] Create notification service for approvers (Task AC: AC2)
  - [ ] Find users with nda:approve permission for agency
  - [ ] Send email notification about pending approval
  - [ ] Include NDA details and link to approve
- [ ] Add tests (Task AC: All)
  - [ ] Unit test for route-for-approval endpoint
  - [ ] Unit test for approve endpoint
  - [ ] Unit test for reject endpoint
  - [ ] Integration test for complete workflow
  - [ ] Test permission checks
  - [ ] Test notifications sent correctly
- [ ] Run full test suite

## Dev Notes

### Current Implementation Analysis

**Database Schema:**
```prisma
status  NdaStatus @default(CREATED)

enum NdaStatus {
  CREATED
  SENT_PENDING_SIGNATURE
  IN_REVISION
  FULLY_EXECUTED
  INACTIVE_CANCELED
  EXPIRED
  // Need to ADD: PENDING_APPROVAL
}

// Need to ADD to Nda model:
approvedById   String?   @map("approved_by_id")
approvedBy     Contact?  @relation("NdaApprovedBy", fields: [approvedById], references: [id])
approvedAt     DateTime? @map("approved_at")
rejectionReason String?  @map("rejection_reason") @db.Text
```

**Permissions (src/server/constants/permissions.ts):**
```typescript
export const PERMISSIONS = {
  NDA_CREATE: 'nda:create',
  NDA_UPDATE: 'nda:update',
  NDA_UPLOAD_DOCUMENT: 'nda:upload_document',
  NDA_SEND_EMAIL: 'nda:send_email',
  NDA_MARK_STATUS: 'nda:mark_status',
  NDA_VIEW: 'nda:view',
  // Need to ADD:
  NDA_APPROVE: 'nda:approve',
  // ...admin permissions
};
```

**API Endpoints to Create:**
- `POST /api/ndas/:id/route-for-approval` - Submit for approval
- `POST /api/ndas/:id/approve` - Approve NDA (opens email composer)
- `POST /api/ndas/:id/reject` - Reject with reason

**Status Transition Flow:**
```
CREATED
  ↓ (Route for Approval)
PENDING_APPROVAL
  ↓ (Approve & Send)         ↓ (Reject)
SENT_PENDING_SIGNATURE    CREATED (with rejection reason)
```

### Architecture Requirements

**From architecture.md:**
- New permissions must be in database seed
- Status transitions via statusTransitionService
- All mutations logged to audit trail
- Notifications via notificationService

**From Stories 10.1-10.4 learnings:**
- Add status to enum with migration
- Update statusFormatter display names
- Update all UI components showing status
- Add permission checks in routes
- Create comprehensive tests

### Technical Implementation Guidance

**1. Add PENDING_APPROVAL status:**
```sql
ALTER TYPE "NdaStatus" ADD VALUE 'PENDING_APPROVAL';
```

**2. Add nda:approve permission:**
```sql
INSERT INTO permissions (id, code, name, description, category)
VALUES (uuid_generate_v4(), 'nda:approve', 'Approve NDAs', 'Can approve NDAs pending review', 'nda');
```

**3. Update status transitions:**
```typescript
[NdaStatus.CREATED]: [
  NdaStatus.SENT_PENDING_SIGNATURE,  // If direct send allowed
  NdaStatus.PENDING_APPROVAL,        // Route for approval
  NdaStatus.INACTIVE_CANCELED,
],
[NdaStatus.PENDING_APPROVAL]: [
  NdaStatus.SENT_PENDING_SIGNATURE,  // Approved
  NdaStatus.CREATED,                  // Rejected/Requested Changes
],
```

**4. Frontend permission-aware UI:**
```typescript
// Show "Route for Approval" if user has nda:create
{hasPermission('nda:create') && nda.status === 'CREATED' && (
  <Button onClick={handleRouteForApproval}>Route for Approval</Button>
)}

// Show "Approve & Send" if user has nda:approve
{hasPermission('nda:approve') && nda.status === 'PENDING_APPROVAL' && (
  <Button onClick={handleApprove}>Approve & Send</Button>
)}
```

**5. Notification logic:**
```typescript
// Find all users with nda:approve for this NDA's agency
const approvers = await prisma.contact.findMany({
  where: {
    active: true,
    contactRoles: {
      some: {
        role: {
          rolePermissions: {
            some: {
              permission: { code: 'nda:approve' }
            }
          }
        }
      }
    },
    OR: [
      // Has agency group access
      { agencyGroupGrants: { some: { agencyGroupId: nda.agencyGroupId } } },
      // Has subagency access
      { subagencyGrants: { some: { subagencyId: nda.subagencyId } } }
    ]
  }
});

// Send notifications to all approvers
for (const approver of approvers) {
  await sendApprovalNotification(nda, approver);
}
```

### Testing Requirements

- Route for approval: permission check, status change, notifications sent
- Approve: permission check, status change, approval fields set
- Reject: permission check, status change, rejection reason stored, creator notified
- Status filter includes PENDING_APPROVAL
- Approval button only visible to approvers
- Cannot approve without permission

### References

- [Schema: prisma/schema.prisma]
- [Permissions: src/server/constants/permissions.ts]
- [Status Transitions: src/server/services/statusTransitionService.ts]
- [NDA Routes: src/server/routes/ndas.ts]
- [NDA Detail: src/components/screens/NDADetail.tsx]
- [Notification Service: src/server/services/notificationService.ts]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

### Change Log

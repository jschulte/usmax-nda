# Story 10.20: Add Approval Workflow Frontend Tests

Status: backlog

## Story

As a developer,
I want comprehensive frontend tests for the approval workflow UI,
So that approval buttons, previews, and confirmations work correctly.

## Acceptance Criteria

**AC1: Route for Approval button tests**
**Given** the NDADetail component
**When** status = CREATED and user has nda:create permission
**Then** "Route for Approval" button is visible
**And** clicking it generates preview and calls routeForApproval()
**And** confirmation prompt appears after preview

**AC2: Approve & Send button tests**
**Given** the NDADetail component
**When** status = PENDING_APPROVAL and user has nda:approve permission
**Then** "Approve & Send" button is visible
**And** clicking it calls approveNda() and opens email composer
**And** self-approval shows confirmation prompt

**AC3: Reject button tests**
**Given** the NDADetail component
**When** status = PENDING_APPROVAL and user has nda:approve permission
**Then** "Reject" button is visible
**And** clicking it prompts for reason and calls rejectNda()

**AC4: Preview before send tests**
**Given** user clicks "Send for Signature"
**When** the handler runs
**Then** preview is generated first
**And** confirmation prompt appears
**And** email composer opens only after confirmation

**AC5: Non-USmax safeguard tests**
**Given** an NDA with isNonUsMax = true
**When** user attempts to generate document or send email
**Then** warning confirmation prompt appears
**And** action proceeds only if user confirms

## Implementation Notes

**Test file:** `src/components/screens/__tests__/NDADetail.approval.test.tsx`

**Testing approach:**
- Use React Testing Library + Vitest
- Mock ndaService functions (routeForApproval, approveNda, rejectNda)
- Mock window.confirm for confirmation prompts
- Test permission-based button visibility
- Test status-based button rendering

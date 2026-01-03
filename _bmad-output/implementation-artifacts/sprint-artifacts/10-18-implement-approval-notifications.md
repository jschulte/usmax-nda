# Story 10.18: Implement Approval Workflow Notifications

Status: backlog

## Story

As an NDA approver or creator,
I want to receive email notifications when NDAs are routed for my approval or when my NDAs are rejected,
So that I can respond promptly to approval requests and rejection feedback.

## Acceptance Criteria

**AC1: Approver notification on route**
**Given** an NDA is routed for approval
**When** the route-for-approval endpoint is called
**Then** the system finds all users with nda:approve permission for this NDA's agency
**And** sends email notification to each approver
**And** email includes NDA details and approval link

**AC2: Creator notification on rejection**
**Given** an approver rejects an NDA
**When** the reject endpoint is called
**Then** the system sends email notification to the NDA creator
**And** email includes rejection reason and link to edit NDA

## Implementation Notes

**TODOs to resolve:**
- src/server/routes/ndas.ts:2177 - Send notifications to approvers
- src/server/routes/ndas.ts:2252 - Notify creator of rejection

**Pattern to follow:**
- Use notificationService.ts notifyStakeholders()
- Query for users with nda:approve permission + agency access
- Use existing email templates or create new ones

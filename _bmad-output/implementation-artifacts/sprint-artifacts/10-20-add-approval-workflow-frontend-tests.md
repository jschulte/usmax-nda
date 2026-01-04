# Story 10.20: Add Comprehensive Frontend Tests for Approval Workflow

Status: backlog

## Story

As a **QA engineer and frontend developer**,
I want **comprehensive E2E and component tests for the approval workflow UI including route-for-approval, approve, and reject buttons**,
So that **we can confidently deploy approval workflow to production with full test coverage of user interactions and edge cases**.

## Acceptance Criteria

**AC1: Route for Approval Button Tests**
**Given** the NDADetail component is rendered
**When** NDA status = CREATED and user has nda:create permission
**Then** tests verify "Route for Approval" button is visible and enabled
**And** tests verify clicking button shows preview modal first
**And** tests verify preview modal has "Confirm & Route" and "Cancel" buttons
**And** tests verify "Confirm & Route" calls POST /api/ndas/:id/route-for-approval
**And** tests verify successful routing changes status to PENDING_APPROVAL
**And** tests verify success message displays after routing
**And** tests verify button hidden when status != CREATED
**And** tests verify button hidden when user lacks nda:create permission

**AC2: Approve & Send Button Tests**
**Given** the NDADetail component is rendered
**When** NDA status = PENDING_APPROVAL and user has nda:approve permission
**Then** tests verify "Approve & Send" button is visible and enabled
**And** tests verify clicking button calls POST /api/ndas/:id/approve
**And** tests verify successful approval opens email composer modal
**And** tests verify email composer pre-filled with NDA data
**And** tests verify status changes to SENT_PENDING_SIGNATURE after approval
**And** tests verify audit log updated with approver details
**And** tests verify button hidden when status != PENDING_APPROVAL
**And** tests verify button hidden when user lacks nda:approve permission

**AC3: Reject Button Tests**
**Given** the NDADetail component is rendered
**When** NDA status = PENDING_APPROVAL and user has nda:approve permission
**Then** tests verify "Reject" button is visible and enabled
**And** tests verify clicking button shows rejection reason modal
**And** tests verify rejection reason textarea is required
**And** tests verify "Confirm Rejection" calls POST /api/ndas/:id/reject with reason
**And** tests verify successful rejection changes status to CREATED
**And** tests verify rejection reason stored in database
**And** tests verify creator receives rejection notification
**And** tests verify button hidden when status != PENDING_APPROVAL

**AC4: Preview Before Send/Route Tests**
**Given** user attempts to route for approval or send email
**When** clicking "Route for Approval" or "Send for Signature"
**Then** tests verify preview modal appears before action
**And** tests verify preview includes generated RTF document preview
**And** tests verify preview modal has clear "This is your final check" messaging
**And** tests verify "Confirm & Route" proceeds with action
**And** tests verify "Cancel" closes modal without action
**And** tests verify preview generation errors show user-friendly message
**And** tests verify preview works for both route and send actions

**AC5: Self-Approval Confirmation Tests**
**Given** NDA status = PENDING_APPROVAL and creator = current user
**When** user clicks "Approve & Send"
**Then** tests verify warning banner displays: "You are approving your own NDA"
**And** tests verify confirmation prompt appears before approval
**And** tests verify checkbox "I confirm this self-approval is intentional"
**And** tests verify approve button disabled until checkbox checked
**And** tests verify audit log records self-approval flag
**And** tests verify normal approval flow if creator != current user

**AC6: Non-USmax NDA Safeguard Tests**
**Given** NDA has isNonUsMax = true
**When** user attempts to generate document or send email
**Then** tests verify warning banner displays at top of page
**And** tests verify "Generate Document" shows confirmation modal
**And** tests verify modal includes warning: "This is a Non-USmax NDA"
**And** tests verify "Send Email" requires explicit confirmation
**And** tests verify confirmation checkbox required to enable send button
**And** tests verify cancel closes modal without action
**And** tests verify no warnings for standard NDAs (isNonUsMax = false)

**AC7: Permission-Based UI Tests**
**Given** various user permission scenarios
**When** NDADetail component renders
**Then** tests verify users without nda:create cannot see "Route for Approval"
**And** tests verify users without nda:approve cannot see "Approve & Send"
**And** tests verify users without nda:approve cannot see "Reject"
**And** tests verify users without nda:send_email cannot see "Send Email"
**And** tests verify disabled buttons show helpful tooltip explaining permission needed
**And** tests verify admin users see all buttons (have all permissions)
**And** tests verify read-only users see no action buttons

## Tasks / Subtasks

⚠️ **COMPREHENSIVE TASKS** - Follows Story 10.18 pattern for thorough implementation-ready testing.

### Task Group 1: Component Test Setup and Infrastructure (AC: All)

- [ ] Create test file structure for approval workflow tests
  - [ ] Create `src/components/screens/__tests__/NDADetail.approval.test.tsx`
  - [ ] Set up React Testing Library with Vitest
  - [ ] Import NDADetail component and dependencies
  - [ ] Configure mock providers (AuthContext, QueryClient, Router)
  - [ ] Set up beforeEach/afterEach hooks for test isolation

- [ ] Create test fixtures and mock data
  - [ ] Create mock NDA data for each status (CREATED, PENDING_APPROVAL, SENT_PENDING_SIGNATURE)
  - [ ] Create mock user contexts (creator, approver, admin, read-only)
  - [ ] Create mock permission sets for different roles
  - [ ] Create helper function to render NDADetail with mocks
  - [ ] Create helper function to simulate user interactions

- [ ] Set up API mocking infrastructure
  - [ ] Mock POST /api/ndas/:id/route-for-approval endpoint
  - [ ] Mock POST /api/ndas/:id/approve endpoint
  - [ ] Mock POST /api/ndas/:id/reject endpoint
  - [ ] Mock GET /api/ndas/:id endpoint (NDA detail)
  - [ ] Configure mock responses for success and error cases

- [ ] Configure modal and dialog mocking
  - [ ] Mock Radix UI Dialog components
  - [ ] Mock preview modal component
  - [ ] Mock confirmation modal component
  - [ ] Mock rejection reason modal component
  - [ ] Set up spy for modal open/close events

### Task Group 2: Route for Approval Button Tests (AC: 1)

- [ ] Test button visibility and enabled state
  - [ ] Test: Button visible when status = CREATED and user has nda:create
  - [ ] Test: Button hidden when status = PENDING_APPROVAL
  - [ ] Test: Button hidden when status = SENT_PENDING_SIGNATURE
  - [ ] Test: Button hidden when status = FULLY_EXECUTED
  - [ ] Test: Button hidden when user lacks nda:create permission
  - [ ] Test: Button enabled (not disabled) when all conditions met
  - [ ] Test: Button shows correct text: "Route for Approval"

- [ ] Test preview modal workflow
  - [ ] Test: Clicking button opens preview modal
  - [ ] Test: Preview modal shows NDA document preview
  - [ ] Test: Preview modal has "Confirm & Route" button
  - [ ] Test: Preview modal has "Cancel" button
  - [ ] Test: "Cancel" closes modal without API call
  - [ ] Test: Preview generation error shows error message
  - [ ] Test: Preview modal includes final check messaging

- [ ] Test routing action
  - [ ] Test: "Confirm & Route" calls POST /api/ndas/:id/route-for-approval
  - [ ] Test: API call includes correct NDA ID
  - [ ] Test: API call includes authentication token
  - [ ] Test: Success response changes status to PENDING_APPROVAL
  - [ ] Test: Success shows toast notification "NDA routed for approval"
  - [ ] Test: NDA detail refreshes after routing
  - [ ] Test: Modal closes after successful routing

- [ ] Test error handling
  - [ ] Test: API error shows error message
  - [ ] Test: Network error shows network error message
  - [ ] Test: Permission error shows permission denied message
  - [ ] Test: Error doesn't change NDA status
  - [ ] Test: Error keeps modal open for retry
  - [ ] Test: Loading state shows spinner during API call

### Task Group 3: Approve & Send Button Tests (AC: 2)

- [ ] Test button visibility and enabled state
  - [ ] Test: Button visible when status = PENDING_APPROVAL and user has nda:approve
  - [ ] Test: Button hidden when status = CREATED
  - [ ] Test: Button hidden when status = SENT_PENDING_SIGNATURE
  - [ ] Test: Button hidden when user lacks nda:approve permission
  - [ ] Test: Button enabled when all conditions met
  - [ ] Test: Button shows correct text: "Approve & Send"
  - [ ] Test: Button has distinct styling (primary action)

- [ ] Test approve action workflow
  - [ ] Test: Clicking button calls POST /api/ndas/:id/approve
  - [ ] Test: API call includes correct NDA ID
  - [ ] Test: API call includes authentication token
  - [ ] Test: Success response changes status to SENT_PENDING_SIGNATURE
  - [ ] Test: Success shows toast "NDA approved"
  - [ ] Test: NDA detail refreshes after approval
  - [ ] Test: Approval timestamp updated in UI

- [ ] Test email composer integration
  - [ ] Test: Successful approval opens email composer modal
  - [ ] Test: Email composer pre-filled with NDA company name
  - [ ] Test: Email composer pre-filled with recipient addresses
  - [ ] Test: Email composer has NDA document attached
  - [ ] Test: Email composer subject line includes NDA displayId
  - [ ] Test: User can send email or close composer
  - [ ] Test: Closing composer doesn't revert approval

- [ ] Test approval audit trail
  - [ ] Test: Audit log entry created for approval
  - [ ] Test: Audit log shows approver ID and name
  - [ ] Test: Audit log shows approval timestamp
  - [ ] Test: Audit log shows before status (PENDING_APPROVAL)
  - [ ] Test: Audit log shows after status (SENT_PENDING_SIGNATURE)
  - [ ] Verify audit log displayed in NDA history timeline

### Task Group 4: Reject Button Tests (AC: 3)

- [ ] Test button visibility and enabled state
  - [ ] Test: Button visible when status = PENDING_APPROVAL and user has nda:approve
  - [ ] Test: Button hidden when status = CREATED
  - [ ] Test: Button hidden when status = SENT_PENDING_SIGNATURE
  - [ ] Test: Button hidden when user lacks nda:approve permission
  - [ ] Test: Button enabled when all conditions met
  - [ ] Test: Button shows correct text: "Reject"
  - [ ] Test: Button has warning styling (destructive action)

- [ ] Test rejection reason modal
  - [ ] Test: Clicking button opens rejection reason modal
  - [ ] Test: Modal has textarea for rejection reason
  - [ ] Test: Textarea is required (error if empty)
  - [ ] Test: Modal has "Confirm Rejection" button
  - [ ] Test: Modal has "Cancel" button
  - [ ] Test: "Cancel" closes modal without API call
  - [ ] Test: Rejection reason has character limit (1000 chars)

- [ ] Test reject action workflow
  - [ ] Test: "Confirm Rejection" calls POST /api/ndas/:id/reject
  - [ ] Test: API call includes rejection reason in body
  - [ ] Test: API call includes correct NDA ID
  - [ ] Test: Success response changes status to CREATED
  - [ ] Test: Success shows toast "NDA rejected, creator notified"
  - [ ] Test: Rejection reason stored in database
  - [ ] Test: NDA detail refreshes after rejection

- [ ] Test rejection notification
  - [ ] Test: Creator receives email notification of rejection
  - [ ] Test: Email includes rejection reason
  - [ ] Test: Email includes link to edit NDA
  - [ ] Test: Email includes approver name
  - [ ] Test: Audit log records rejection event
  - [ ] Verify notification queued in email queue

- [ ] Test rejection error handling
  - [ ] Test: Empty rejection reason shows validation error
  - [ ] Test: API error shows error message
  - [ ] Test: Network error shows network error message
  - [ ] Test: Error doesn't change NDA status
  - [ ] Test: Error keeps modal open for retry

### Task Group 5: Preview Before Send/Route Tests (AC: 4)

- [ ] Test preview modal for route action
  - [ ] Test: "Route for Approval" triggers preview modal
  - [ ] Test: Preview modal shows NDA document preview
  - [ ] Test: Preview includes all NDA fields (company, agency, purpose)
  - [ ] Test: Preview shows "Final check before routing" message
  - [ ] Test: Preview has "Confirm & Route" button
  - [ ] Test: Preview has "Cancel" button

- [ ] Test preview modal for send action
  - [ ] Test: "Send for Signature" triggers preview modal
  - [ ] Test: Preview modal shows same NDA document
  - [ ] Test: Preview shows "Final check before sending" message
  - [ ] Test: Preview has "Confirm & Send" button
  - [ ] Test: Preview has "Cancel" button

- [ ] Test preview generation
  - [ ] Test: Preview calls GET /api/ndas/:id/preview endpoint
  - [ ] Test: Preview generation shows loading spinner
  - [ ] Test: Preview displays RTF content (converted to HTML)
  - [ ] Test: Preview updates when NDA data changes
  - [ ] Test: Preview cached to avoid duplicate API calls

- [ ] Test preview error handling
  - [ ] Test: Preview generation error shows error message
  - [ ] Test: Error message includes "Unable to generate preview"
  - [ ] Test: Error allows retry (refresh preview)
  - [ ] Test: Error allows proceed without preview (advanced option)
  - [ ] Test: Network error shows network error message

- [ ] Test preview confirmation flow
  - [ ] Test: "Confirm & Route" proceeds with route action
  - [ ] Test: "Confirm & Send" proceeds with send action
  - [ ] Test: "Cancel" closes modal without action
  - [ ] Test: Preview modal closes after confirmation
  - [ ] Test: Main action (route/send) executes after preview confirmed

### Task Group 6: Self-Approval Confirmation Tests (AC: 5)

- [ ] Test self-approval detection
  - [ ] Test: Detect when creator = current user for pending approval NDA
  - [ ] Test: Show warning banner "You are approving your own NDA"
  - [ ] Test: Banner visible only when creator = approver
  - [ ] Test: No banner when creator != approver
  - [ ] Test: Banner has warning styling (yellow background, icon)

- [ ] Test self-approval confirmation modal
  - [ ] Test: "Approve & Send" shows confirmation modal for self-approval
  - [ ] Test: Modal includes warning message
  - [ ] Test: Modal has checkbox "I confirm this self-approval is intentional"
  - [ ] Test: Modal has "Proceed with Approval" button (disabled initially)
  - [ ] Test: Modal has "Cancel" button
  - [ ] Test: Checkbox enables "Proceed with Approval" button
  - [ ] Test: Unchecking checkbox disables button again

- [ ] Test self-approval action
  - [ ] Test: "Proceed with Approval" calls approve endpoint
  - [ ] Test: API call includes selfApproval flag = true
  - [ ] Test: Success proceeds with normal approval flow
  - [ ] Test: Email composer opens after self-approval
  - [ ] Test: Audit log records selfApproval = true
  - [ ] Test: "Cancel" closes modal without approval

- [ ] Test audit trail for self-approval
  - [ ] Test: Audit log entry shows selfApproval flag
  - [ ] Test: Audit log distinguishes self-approval from standard approval
  - [ ] Test: Audit log queryable by selfApproval filter
  - [ ] Test: Audit trail shows warning icon for self-approval
  - [ ] Verify self-approval visible to admins in reports

### Task Group 7: Non-USmax NDA Safeguard Tests (AC: 6)

- [ ] Test Non-USmax NDA banner display
  - [ ] Test: Banner visible when isNonUsMax = true
  - [ ] Test: Banner text: "Non-USmax NDA: USmax signed partner's NDA"
  - [ ] Test: Banner has warning styling (orange/red)
  - [ ] Test: Banner includes warning icon
  - [ ] Test: Banner positioned at top of NDA detail page
  - [ ] Test: No banner when isNonUsMax = false

- [ ] Test generate document safeguard
  - [ ] Test: "Generate Document" shows confirmation modal for Non-USmax NDA
  - [ ] Test: Modal warning: "This is a Non-USmax NDA. Document generation typically not needed."
  - [ ] Test: Modal has "Proceed Anyway" button
  - [ ] Test: Modal has "Cancel" button
  - [ ] Test: "Proceed Anyway" generates document
  - [ ] Test: "Cancel" closes modal without action
  - [ ] Test: No confirmation for standard NDAs

- [ ] Test send email safeguard
  - [ ] Test: "Send Email" shows confirmation modal for Non-USmax NDA
  - [ ] Test: Modal warning: "This is a Non-USmax NDA. Are you sure you want to send?"
  - [ ] Test: Modal has checkbox "I confirm this email send is intentional"
  - [ ] Test: "Send Email" button disabled until checkbox checked
  - [ ] Test: Checking checkbox enables "Send Email" button
  - [ ] Test: "Send Email" proceeds after confirmation
  - [ ] Test: "Cancel" closes modal without sending

- [ ] Test Non-USmax visual indicators
  - [ ] Test: NDA detail shows Non-USmax badge
  - [ ] Test: Badge clearly visible (high contrast)
  - [ ] Test: Badge includes tooltip explaining Non-USmax
  - [ ] Test: All action buttons have warning styling for Non-USmax NDA
  - [ ] Test: NDA list shows Non-USmax icon in row

### Task Group 8: Permission-Based UI Tests (AC: 7)

- [ ] Test nda:create permission scenarios
  - [ ] Test: Users with nda:create see "Route for Approval" button
  - [ ] Test: Users without nda:create do not see button
  - [ ] Test: Admin users (have all permissions) see button
  - [ ] Test: Read-only users do not see button
  - [ ] Test: Disabled button shows tooltip: "You don't have permission to route NDAs"

- [ ] Test nda:approve permission scenarios
  - [ ] Test: Users with nda:approve see "Approve & Send" button
  - [ ] Test: Users with nda:approve see "Reject" button
  - [ ] Test: Users without nda:approve do not see approval buttons
  - [ ] Test: Admin users see approval buttons
  - [ ] Test: NDA creators without nda:approve cannot approve their own NDAs
  - [ ] Test: Tooltip explains "You don't have permission to approve NDAs"

- [ ] Test nda:send_email permission scenarios
  - [ ] Test: Users with nda:send_email see "Send Email" button
  - [ ] Test: Users without nda:send_email do not see button
  - [ ] Test: Email composer only accessible with permission
  - [ ] Test: Disabled button shows tooltip: "You don't have permission to send emails"

- [ ] Test combined permission scenarios
  - [ ] Test: Admin users see all buttons (have all permissions)
  - [ ] Test: Manager users see approval buttons (nda:approve)
  - [ ] Test: Standard NDA users see create/send buttons (not approve)
  - [ ] Test: Read-only users see no action buttons
  - [ ] Test: Limited users see only buttons for their permissions
  - [ ] Test: Permission changes reflected immediately (no refresh needed)

- [ ] Test permission error handling
  - [ ] Test: Attempting action without permission shows 403 error
  - [ ] Test: 403 error shows user-friendly message
  - [ ] Test: Error message includes permission name needed
  - [ ] Test: User redirected to dashboard after permission error
  - [ ] Test: Audit log records permission denial attempt

### Task Group 9: Integration Tests for Complete Workflows (AC: All)

- [ ] Test complete route-for-approval workflow
  - [ ] Test: Creator creates NDA (status = CREATED)
  - [ ] Test: Creator clicks "Route for Approval"
  - [ ] Test: Preview modal appears
  - [ ] Test: Creator confirms preview
  - [ ] Test: Status changes to PENDING_APPROVAL
  - [ ] Test: Approvers receive email notification
  - [ ] Test: Creator sees "Pending Approval" status in UI

- [ ] Test complete approval workflow
  - [ ] Test: Approver opens NDA with status = PENDING_APPROVAL
  - [ ] Test: Approver clicks "Approve & Send"
  - [ ] Test: Status changes to SENT_PENDING_SIGNATURE
  - [ ] Test: Email composer opens
  - [ ] Test: Approver sends email
  - [ ] Test: Creator receives approval notification
  - [ ] Test: Audit log complete for entire workflow

- [ ] Test complete rejection workflow
  - [ ] Test: Approver opens NDA with status = PENDING_APPROVAL
  - [ ] Test: Approver clicks "Reject"
  - [ ] Test: Rejection reason modal appears
  - [ ] Test: Approver enters reason and confirms
  - [ ] Test: Status changes to CREATED
  - [ ] Test: Creator receives rejection email with reason
  - [ ] Test: Creator edits NDA based on feedback
  - [ ] Test: Creator re-routes for approval (second attempt)

- [ ] Test self-approval workflow
  - [ ] Test: Creator with approve permission creates NDA
  - [ ] Test: Creator routes for approval
  - [ ] Test: Creator opens their own pending NDA
  - [ ] Test: Warning banner displays
  - [ ] Test: Creator clicks "Approve & Send"
  - [ ] Test: Self-approval confirmation appears
  - [ ] Test: Creator confirms self-approval
  - [ ] Test: NDA approved, email composer opens
  - [ ] Test: Audit log records selfApproval flag

- [ ] Test Non-USmax NDA workflow
  - [ ] Test: Creator checks "Non-USmax NDA" checkbox
  - [ ] Test: NDA detail shows warning banner
  - [ ] Test: Attempt to generate document shows confirmation
  - [ ] Test: Attempt to send email shows confirmation
  - [ ] Test: Creator confirms and sends email
  - [ ] Test: All actions logged with Non-USmax flag

### Task Group 10: Accessibility and Usability Tests (AC: All)

- [ ] Test keyboard navigation
  - [ ] Test: Tab key navigates through all buttons in correct order
  - [ ] Test: Enter key activates focused button
  - [ ] Test: Escape key closes modals
  - [ ] Test: Modal traps focus (can't tab outside modal)
  - [ ] Test: Focus returns to trigger button after modal closes

- [ ] Test screen reader compatibility
  - [ ] Test: Buttons have descriptive aria-labels
  - [ ] Test: Modal dialogs have aria-describedby
  - [ ] Test: Warning banners have role="alert"
  - [ ] Test: Status changes announced to screen readers
  - [ ] Test: Form validation errors have aria-invalid

- [ ] Test responsive design
  - [ ] Test: Buttons visible on mobile viewport (375px width)
  - [ ] Test: Modals responsive on tablet viewport (768px width)
  - [ ] Test: Text wraps correctly on small screens
  - [ ] Test: Touch targets meet minimum size (44x44px)
  - [ ] Test: Action buttons stack vertically on mobile

- [ ] Test loading states and feedback
  - [ ] Test: Loading spinner shows during API calls
  - [ ] Test: Buttons disabled during loading (prevent double-click)
  - [ ] Test: Loading state accessible (aria-busy)
  - [ ] Test: Success toast notifications visible and dismissible
  - [ ] Test: Error messages clearly visible and actionable

- [ ] Test color contrast and visual clarity
  - [ ] Test: Button text contrast meets WCAG AA (4.5:1)
  - [ ] Test: Warning banner contrast meets standards
  - [ ] Test: Disabled state clearly distinguishable
  - [ ] Test: Focus indicators visible (not hidden)
  - [ ] Test: Color not sole indicator (icons + text)

### Task Group 11: Test Coverage and Documentation (AC: All)

- [ ] Verify test coverage metrics
  - [ ] Run coverage report for NDADetail component
  - [ ] Verify line coverage >= 90%
  - [ ] Verify branch coverage >= 85%
  - [ ] Verify function coverage = 100%
  - [ ] Identify uncovered edge cases and add tests

- [ ] Document test patterns and fixtures
  - [ ] Document test file organization
  - [ ] Document mock setup patterns
  - [ ] Document test fixture creation
  - [ ] Document cleanup patterns
  - [ ] Add JSDoc comments to test helper functions

- [ ] Create test maintenance guide
  - [ ] Document how to run approval workflow tests
  - [ ] Document how to debug failing tests
  - [ ] Document test data requirements
  - [ ] Document mock update procedures
  - [ ] Add README in __tests__ directory

- [ ] Integrate with CI/CD pipeline
  - [ ] Add approval workflow tests to GitHub Actions
  - [ ] Configure test coverage reporting
  - [ ] Configure test failure notifications
  - [ ] Ensure tests run on every PR
  - [ ] Set up visual regression testing (optional)

## Gap Analysis

_This section will be populated by dev-story when gap analysis runs._

**Expected Implementation Status:**
- ✅ NDADetail component exists with approval buttons (Story 10.6, 10.7, 10.8)
- ✅ Preview modal implemented (Story 10.7)
- ✅ Self-approval confirmation (Story 10.8)
- ✅ Non-USmax safeguards (Story 10.14)
- ❌ Comprehensive frontend tests missing
- ❌ E2E tests for approval workflow missing
- ❌ Permission-based UI tests missing
- ❌ Accessibility tests missing

---

## Dev Notes

### Current Implementation Status

**Existing Files:**
- `src/components/screens/NDADetail.tsx` - NDA detail component with approval buttons (Story 10.6-10.8)
- `src/components/modals/PreviewModal.tsx` - Preview modal for route/send (Story 10.7)
- `src/components/modals/RejectNDAModal.tsx` - Rejection reason modal (Story 10.6)
- `src/components/modals/EmailComposerModal.tsx` - Email composer (existing)
- `src/components/__tests__/NDADetail.test.tsx` - Basic component tests (minimal)

**Current Test Coverage (Minimal):**
- Basic NDADetail component render tests
- No approval workflow tests
- No permission-based UI tests
- No modal interaction tests
- **Gap:** Comprehensive approval workflow testing needed

**Implementation Overview:**
- Story 10.6-10.8 implemented approval workflow UI
- This story adds comprehensive tests for approval workflow
- Follow patterns from existing component tests
- Use React Testing Library for component tests

### Architecture Patterns

**Component Test Structure (React Testing Library):**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NDADetail } from '../NDADetail';
import { AuthContext } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock setup
vi.mock('@/services/ndaService', () => ({
  routeForApproval: vi.fn(),
  approveNda: vi.fn(),
  rejectNda: vi.fn(),
}));

describe('NDADetail - Approval Workflow', () => {
  const mockNda = {
    id: 'nda-1',
    displayId: 1001,
    status: 'CREATED',
    companyName: 'Test Corp',
    // ... other fields
  };

  const mockUserContext = {
    id: 'user-1',
    email: 'user@usmax.com',
    permissions: new Set(['nda:create', 'nda:approve']),
    // ... other context
  };

  const renderWithProviders = (nda, userContext) => {
    const queryClient = new QueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={userContext}>
          <NDADetail nda={nda} />
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  it('shows Route for Approval button when status = CREATED', () => {
    renderWithProviders(mockNda, mockUserContext);
    expect(screen.getByRole('button', { name: /route for approval/i })).toBeInTheDocument();
  });
});
```

**Permission-Based Rendering Pattern:**
```typescript
// Test permission-based button visibility
describe('Permission-based UI', () => {
  it('hides Route for Approval when user lacks nda:create permission', () => {
    const userWithoutCreate = {
      ...mockUserContext,
      permissions: new Set(['nda:view']), // No nda:create
    };

    renderWithProviders(mockNda, userWithoutCreate);
    expect(screen.queryByRole('button', { name: /route for approval/i })).not.toBeInTheDocument();
  });

  it('shows tooltip when button disabled due to permissions', async () => {
    const user = userEvent.setup();
    renderWithProviders(mockNda, mockUserContext);

    const disabledButton = screen.getByRole('button', { name: /approve/i, hidden: true });
    await user.hover(disabledButton);

    expect(screen.getByText(/you don't have permission/i)).toBeInTheDocument();
  });
});
```

**Modal Interaction Test Pattern:**
```typescript
// Test modal workflows
describe('Preview Modal', () => {
  it('shows preview modal before routing', async () => {
    const user = userEvent.setup();
    renderWithProviders(mockNda, mockUserContext);

    const routeButton = screen.getByRole('button', { name: /route for approval/i });
    await user.click(routeButton);

    // Modal appears
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/final check before routing/i)).toBeInTheDocument();
  });

  it('calls route API after preview confirmation', async () => {
    const user = userEvent.setup();
    const { routeForApproval } = await import('@/services/ndaService');
    vi.mocked(routeForApproval).mockResolvedValue({ success: true });

    renderWithProviders(mockNda, mockUserContext);

    await user.click(screen.getByRole('button', { name: /route for approval/i }));
    await user.click(screen.getByRole('button', { name: /confirm & route/i }));

    await waitFor(() => {
      expect(routeForApproval).toHaveBeenCalledWith('nda-1');
    });
  });
});
```

**API Mocking Pattern (MSW):**
```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Set up MSW mock server
const server = setupServer(
  rest.post('/api/ndas/:id/route-for-approval', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ success: true, status: 'PENDING_APPROVAL' })
    );
  }),
  rest.post('/api/ndas/:id/approve', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ success: true, status: 'SENT_PENDING_SIGNATURE' })
    );
  }),
  rest.post('/api/ndas/:id/reject', async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.status(200),
      ctx.json({ success: true, status: 'CREATED', reason: body.reason })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Technical Requirements

**Test Framework:**
- React Testing Library for component tests
- Vitest for test runner
- MSW (Mock Service Worker) for API mocking
- @testing-library/user-event for user interactions

**Accessibility Testing:**
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = renderWithProviders(mockNda, mockUserContext);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Visual Regression Testing (Optional):**
```typescript
import { screenshot } from '@testing-library/react';

it('matches approval buttons snapshot', () => {
  const { container } = renderWithProviders(mockNda, mockUserContext);
  expect(container).toMatchSnapshot();
});
```

### Testing Requirements

**Coverage Goals:**
- Overall component coverage: ≥90% for NDADetail.tsx
- Branch coverage: ≥85% for conditional rendering
- User interaction coverage: 100% for all buttons/modals

**Test Categories:**
1. **Component Tests:** Test button visibility, enabled state, click handlers
2. **Permission Tests:** Test permission-based UI rendering
3. **Modal Tests:** Test modal workflows (open, confirm, cancel)
4. **Integration Tests:** Test complete workflows (route → approve → send)

**Test Execution:**
```bash
# Run all approval workflow tests
npm run test src/components/screens/__tests__/NDADetail.approval.test.tsx

# Run with coverage
npm run test:coverage src/components/screens/__tests__/NDADetail

# Run in watch mode
npm run test src/components/screens/__tests__/NDADetail.approval.test.tsx --watch
```

### Architecture Constraints

**Component Testing Principles:**
- **User-Centric:** Test from user perspective (not implementation details)
- **Isolation:** Each test independent (no shared state)
- **Realistic:** Use real component (not shallow rendering)
- **Accessible:** Test accessibility (keyboard, screen reader)

**Modal Testing Best Practices:**
- Test modal appears after trigger action
- Test modal content renders correctly
- Test confirm/cancel actions
- Test modal closes after action
- Test focus management (trap, return)

**Permission Testing Requirements:**
- Test all permission combinations
- Test button visibility for each permission
- Test disabled state and tooltips
- Test permission errors gracefully

### File Structure Requirements

**Test Files (NEW):**
- `src/components/screens/__tests__/NDADetail.approval.test.tsx` - Comprehensive approval workflow tests
- `src/components/screens/__tests__/NDADetail.permissions.test.tsx` - Permission-based UI tests
- `src/components/modals/__tests__/PreviewModal.test.tsx` - Preview modal tests
- `src/components/modals/__tests__/RejectNDAModal.test.tsx` - Rejection modal tests

**Test Helpers (NEW):**
- `src/components/__tests__/helpers/renderWithProviders.tsx` - Render with all providers
- `src/components/__tests__/helpers/mockNdaData.ts` - Mock NDA test fixtures
- `src/components/__tests__/helpers/mockUserContext.ts` - Mock user context fixtures

### Previous Story Intelligence

**Related Prior Work:**
- **Story 10.6:** Implement Two-Step Approval Workflow - Created approval buttons and endpoints
- **Story 10.7:** Add Preview Before Send/Route - Implemented preview modal
- **Story 10.8:** Support Creator = Approver - Implemented self-approval confirmation
- **Story 10.14:** Add Non-USmax NDA Safeguards - Implemented warning banners and confirmations

**Patterns Established:**
- Permission-based button visibility (hasPermission helper)
- Modal workflows (preview → confirm → action)
- Self-approval detection (creator = current user)
- Non-USmax NDA warnings (isNonUsMax flag)

### Project Structure Notes

**Existing Component Test Patterns:**
- Co-located tests in `__tests__/` subdirectories
- Use React Testing Library for component rendering
- Mock external dependencies (API calls, context)
- Test user interactions with userEvent

**Code Conventions:**
- Use `screen.getByRole()` for accessible queries
- Use `userEvent` for realistic user interactions
- Use `waitFor()` for async assertions
- Use descriptive test names: `should show button when status is CREATED`

### References

**Source Documents:**
- [Source: _bmad-output/implementation-artifacts/sprint-artifacts/10-18-implement-approval-notifications.md - Comprehensive story template]
- [Source: _bmad-output/implementation-artifacts/sprint-artifacts/10-6-implement-approval-workflow.md - Approval workflow implementation]
- [Source: src/components/screens/NDADetail.tsx - Component with approval buttons]
- [Source: src/components/__tests__/NDADetail.test.tsx - Basic component tests]
- [Source: _bmad-output/project-context.md#Component-Testing]

**Non-Functional Requirements:**
- NFR-A1: WCAG 2.1 Level AA compliance (accessibility tests required)
- NFR-A2: Keyboard navigation (tab, enter, escape tests)
- NFR-M1: Automated test coverage ≥80% (component tests contribute)

**Related Stories:**
- Story 10.6: Implement Two-Step Approval Workflow (creates approval buttons)
- Story 10.7: Add Preview Before Send/Route (creates preview modal)
- Story 10.8: Support Creator = Approver (creates self-approval flow)
- Story 10.14: Add Non-USmax NDA Safeguards (creates warning banners)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

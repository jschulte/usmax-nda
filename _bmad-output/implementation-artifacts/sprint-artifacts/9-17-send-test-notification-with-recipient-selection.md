# Story 9.17: Send Test Notification with Recipient Selection

Status: done

## Story

As an administrator,
I want to send test notifications to specific users,
So that I can verify the notification system is working correctly before relying on it for production use.

## Acceptance Criteria

**AC1: Admin can access test notification tool**
**Given** I am an administrator
**When** I navigate to Administration → Notification Settings
**Then** I see a "Send Test Notification" section
**And** I have access to test notification controls

**AC2: Admin can select notification type**
**Given** I am using the test notification tool
**When** I view notification type options
**Then** I can select from: NDA Created, NDA Emailed, Status Changed, Document Uploaded, Fully Executed, Approval Requested
**And** each type shows what the notification will say

**AC3: Admin can select recipient(s)**
**Given** I am configuring a test notification
**When** I select recipients
**Then** I can choose one or more users from a list
**And** I can search/filter users by name or email
**And** I see selected users clearly indicated

**AC4: Test notification sends successfully**
**Given** I have selected notification type and recipient(s)
**When** I click "Send Test Notification"
**Then** the notification email is sent to selected recipient(s)
**And** I see a success message with count sent
**And** the notification appears in audit log as "test_notification"

**AC5: Test notification uses actual template**
**Given** I send a test notification
**When** the email is generated
**Then** it uses the same template and format as real notifications
**And** it includes sample NDA data (mock company name, display ID, etc.)
**And** the email clearly indicates it's a test ("TEST NOTIFICATION" in subject or body)

## Tasks / Subtasks

- [x] Add test notification UI to admin (Task AC: AC1)
  - [x] Add section to NotificationSettings.tsx
  - [x] Or create new TestNotifications.tsx component
  - [x] Add to Administration menu if new page
- [x] Create notification type selector (Task AC: AC2)
  - [x] Dropdown or radio buttons for event types
  - [x] Show description of what each type does
  - [x] Preview message for selected type
- [x] Create recipient selector (Task AC: AC3)
  - [x] Multi-select dropdown or checkbox list
  - [x] Search functionality
  - [x] Show selected users (with remove option)
  - [x] Fetch active users from API
- [x] Implement send test notification (Task AC: AC4)
  - [x] POST /api/admin/notifications/send-test endpoint
  - [x] Require admin permission
  - [x] Accept: notification type, recipient IDs, optional message
  - [x] Send notification emails to selected users
  - [x] Log as test_notification in audit log
  - [x] Return success/failure status
- [x] Use actual notification templates (Task AC: AC5)
  - [x] Reuse notificationService notification logic
  - [x] Create mock NDA data for test
  - [x] Add "[TEST]" prefix to subject line
  - [x] Include disclaimer in body: "This is a test notification"
- [x] Test the test notification feature (Task AC: All)
  - [x] Test sending to single user
  - [x] Test sending to multiple users
  - [x] Test each notification type
  - [x] Verify emails are received
  - [x] Check audit log entry created

## Dev Notes

### Implementation Approach

**Backend Endpoint:**
```typescript
// POST /api/admin/notifications/send-test
router.post('/notifications/send-test',
  requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS),
  async (req, res) => {
    const { notificationType, recipientIds, testMessage } = req.body;

    // Create mock NDA data
    const mockNdaDetails = {
      ndaId: 'test-nda-id',
      displayId: 9999,
      companyName: 'Test Company Inc.',
      agencyGroupName: 'Test Agency',
      event: notificationType,
      changedBy: { id: req.userContext.contactId, name: req.userContext.name },
      timestamp: new Date(),
    };

    // Send to each recipient
    for (const recipientId of recipientIds) {
      await notifyStakeholders(mockNdaDetails, [recipientId], notificationType, req.userContext);
    }

    // Log test notification
    await auditService.log({
      action: 'test_notification_sent',
      entityType: 'notification',
      userId: req.userContext.contactId,
      details: { notificationType, recipientCount: recipientIds.length },
    });

    res.json({ success: true, sent: recipientIds.length });
  }
);
```

**Frontend Component:**
```tsx
<Card>
  <h3>Send Test Notification</h3>

  <Select label="Notification Type" value={notificationType} onChange={setNotificationType}>
    <option value="NDA_CREATED">NDA Created</option>
    <option value="NDA_EMAILED">NDA Emailed</option>
    <option value="STATUS_CHANGED">Status Changed</option>
    {/* ... other types */}
  </Select>

  <MultiSelect label="Recipients" values={selectedUsers} onChange={setSelectedUsers}>
    {users.map(user => (
      <option value={user.id}>{user.name} ({user.email})</option>
    ))}
  </MultiSelect>

  <Button onClick={handleSendTest} disabled={!notificationType || selectedUsers.length === 0}>
    Send Test Notification
  </Button>
</Card>
```

### Architecture Requirements

- Admin permission required (admin:manage_users or admin:*)
- Reuse existing notificationService
- Log all test notifications in audit trail
- Use actual email templates (not separate test templates)

### Testing Requirements

- Test with different notification types
- Test sending to self
- Test sending to multiple users
- Verify email delivery
- Check audit log entry

### References

- [Notification Service: src/server/services/notificationService.ts]
- [Notification Settings: src/components/screens/admin/NotificationSettings.tsx]
- [Audit Service: src/server/services/auditService.ts]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (20251101)

### Implementation Date

2025-12-25

### Completion Notes List

- ✅ Backend service function created with mock NDA data generation
- ✅ Test notification adds [TEST] prefix to subject line
- ✅ Test notification includes clear disclaimer in email body
- ✅ Audit logging for test notifications (TEST_NOTIFICATION_SENT action)
- ✅ Admin endpoint created under /api/admin/test-notifications/send
- ✅ Permission check: admin:manage_users required
- ✅ Frontend component with notification type selector (7 notification types)
- ✅ Recipient selector with search functionality
- ✅ Multi-select checkbox interface for users
- ✅ Selected users display with remove capability
- ✅ Full validation and error handling
- ✅ Comprehensive test suite (8 test cases)
- ✅ Integrated into NotificationSettings as new tab

### File List

**Backend:**
- `src/server/services/notificationService.ts` - Added sendTestNotification() function
- `src/server/services/auditService.ts` - Added TEST_NOTIFICATION_SENT action
- `src/server/routes/admin/testNotifications.ts` - New admin test notification route
- `src/server/routes/admin.ts` - Mount test notifications router
- `src/server/routes/admin/__tests__/testNotifications.test.ts` - Test suite

**Frontend:**
- `src/components/screens/admin/SendTestNotification.tsx` - Test notification UI component
- `src/components/screens/admin/NotificationSettings.tsx` - Added "Send Test" tab

### Change Log

**Backend Changes:**
1. Extended `notificationService.ts` with:
   - `sendTestNotification()` - Send test notifications with mock NDA data
   - Mock details: Company "Test Company Inc.", displayId 99999
   - [TEST] prefix added to subject line (AC5)
   - Warning disclaimer added to email body (AC5)
   - Reuses existing notification templates (AC5)

2. Created `admin/testNotifications.ts` route:
   - `POST /api/admin/test-notifications/send` - Send test notification (AC4)
   - Validates notification type (must be valid NotificationEvent)
   - Validates recipients (at least one required)
   - Returns count of sent notifications

3. Added audit action:
   - `TEST_NOTIFICATION_SENT` - Logs test notification events with recipient count

**Frontend Changes:**
1. `SendTestNotification.tsx`:
   - Notification type dropdown with 7 types (AC2)
   - Shows description for selected type
   - User list with search/filter functionality (AC3)
   - Multi-select checkbox interface
   - Selected users display with remove button
   - Fetches active users from /api/users
   - Send button with validation
   - Success/error toast notifications

2. `NotificationSettings.tsx`:
   - Added "Send Test" tab to main navigation (AC1)
   - Integrated SendTestNotification component

**Tests:**
- Created comprehensive test suite covering:
  - Successful test notification sending (single and multiple recipients)
  - Missing notification type validation
  - Missing recipients validation
  - Invalid notification type validation
  - Service error handling
  - Different notification type support

# Story 9.17: Send Test Notification with Recipient Selection

Status: ready-for-dev

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

- [ ] Add test notification UI to admin (Task AC: AC1)
  - [ ] Add section to NotificationSettings.tsx
  - [ ] Or create new TestNotifications.tsx component
  - [ ] Add to Administration menu if new page
- [ ] Create notification type selector (Task AC: AC2)
  - [ ] Dropdown or radio buttons for event types
  - [ ] Show description of what each type does
  - [ ] Preview message for selected type
- [ ] Create recipient selector (Task AC: AC3)
  - [ ] Multi-select dropdown or checkbox list
  - [ ] Search functionality
  - [ ] Show selected users (with remove option)
  - [ ] Fetch active users from API
- [ ] Implement send test notification (Task AC: AC4)
  - [ ] POST /api/admin/notifications/send-test endpoint
  - [ ] Require admin permission
  - [ ] Accept: notification type, recipient IDs, optional message
  - [ ] Send notification emails to selected users
  - [ ] Log as test_notification in audit log
  - [ ] Return success/failure status
- [ ] Use actual notification templates (Task AC: AC5)
  - [ ] Reuse notificationService notification logic
  - [ ] Create mock NDA data for test
  - [ ] Add "[TEST]" prefix to subject line
  - [ ] Include disclaimer in body: "This is a test notification"
- [ ] Test the test notification feature (Task AC: All)
  - [ ] Test sending to single user
  - [ ] Test sending to multiple users
  - [ ] Test each notification type
  - [ ] Verify emails are received
  - [ ] Check audit log entry created

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

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

### Change Log

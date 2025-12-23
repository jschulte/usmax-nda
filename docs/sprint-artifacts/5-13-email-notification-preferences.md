# Story 5.13: Email Notification Preferences

Status: ready-for-dev

## Story

As an **NDA User**,
I want **to configure which NDA events trigger email notifications**,
so that **I stay informed without email overload**.

## Acceptance Criteria

### AC1: Notification Preference Toggles
**Given** I am in my user settings/preferences page
**When** I view notification settings
**Then** I see toggles for notification types:
- "NDA Status Changed"
- "NDA Assigned to Me"
- "Document Uploaded"
- "Email Sent"
- "NDA Approaching Expiration"
- "NDA Marked Fully Executed"

### AC2: Preference Management
**And** I can enable/disable each notification type independently
**And** my preferences are saved to the notification_preferences table
**And** changes take effect immediately

## Tasks / Subtasks

- [ ] **Task 1: Database Schema - Notification Preferences** (AC: 1, 2)
  - [ ] 1.1: Create NotificationPreference model in Prisma schema
  - [ ] 1.2: Add fields: user_id (FK to contact), notification_type (enum), enabled (boolean)
  - [ ] 1.3: Add unique constraint on (user_id, notification_type)
  - [ ] 1.4: Create NotificationType enum with 6 types
  - [ ] 1.5: Create migration and run prisma generate

- [ ] **Task 2: Notification Types Enum** (AC: 1)
  - [ ] 2.1: Define NotificationType enum:
    - STATUS_CHANGED
    - ASSIGNED_TO_ME
    - DOCUMENT_UPLOADED
    - EMAIL_SENT
    - EXPIRATION_APPROACHING
    - MARKED_FULLY_EXECUTED
  - [ ] 2.2: Add to Prisma schema
  - [ ] 2.3: Seed default preferences (all enabled) for existing users

- [ ] **Task 3: Notification Preferences Service** (AC: 2)
  - [ ] 3.1: Create `src/server/services/notificationPreferencesService.ts`
  - [ ] 3.2: Implement `getPreferences(userId)` - returns all preferences
  - [ ] 3.3: Implement `setPreference(userId, type, enabled)` - upsert preference
  - [ ] 3.4: Implement `isNotificationEnabled(userId, type)` - check if enabled
  - [ ] 3.5: Cache preferences in memory (per user, 5-minute TTL)

- [ ] **Task 4: API - Notification Preferences Endpoints** (AC: 1, 2)
  - [ ] 4.1: Create `GET /api/preferences/notifications` endpoint
  - [ ] 4.2: Return all notification preferences for current user
  - [ ] 4.3: Create `PUT /api/preferences/notifications` endpoint
  - [ ] 4.4: Accept array of { type, enabled } objects
  - [ ] 4.5: Update all preferences in transaction
  - [ ] 4.6: Clear preference cache after update

- [ ] **Task 5: Email Service - Check Preferences** (AC: 2)
  - [ ] 5.1: Extend `emailService` from Story 3.11
  - [ ] 5.2: Before sending notification email, check user's preferences
  - [ ] 5.3: If notification type disabled, skip sending
  - [ ] 5.4: Log skipped notifications (audit trail)
  - [ ] 5.5: Handle multiple recipients (check each user's preferences)

- [ ] **Task 6: Frontend - User Settings Page** (AC: 1)
  - [ ] 6.1: Create `src/components/screens/UserSettings.tsx`
  - [ ] 6.2: Add route: /settings or /profile/settings
  - [ ] 6.3: Create tabbed interface: Profile, Notifications, Preferences
  - [ ] 6.4: Fetch user settings on mount

- [ ] **Task 7: Frontend - Notification Preferences Panel** (AC: 1, 2)
  - [ ] 7.1: Create NotificationPreferencesPanel component
  - [ ] 7.2: Display toggle switches for each notification type
  - [ ] 7.3: Use Switch component (Radix UI)
  - [ ] 7.4: Group by category if needed
  - [ ] 7.5: Show description for each notification type

- [ ] **Task 8: Frontend - Preference State Management** (AC: 2)
  - [ ] 8.1: Fetch preferences with React Query
  - [ ] 8.2: Update preferences with mutation
  - [ ] 8.3: Optimistic updates (toggle immediately)
  - [ ] 8.4: Show success toast after save
  - [ ] 8.5: Revert on error

- [ ] **Task 9: Testing** (AC: All)
  - [ ] 9.1: Unit tests for notificationPreferencesService
  - [ ] 9.2: Unit tests for emailService preference checking
  - [ ] 9.3: API tests for preferences endpoints
  - [ ] 9.4: API tests for preference caching
  - [ ] 9.5: Component tests for notification preferences panel
  - [ ] 9.6: E2E tests for updating preferences

## Dev Notes

### Database Schema

**Prisma Model:**
```prisma
model NotificationPreference {
  id               String           @id @default(uuid())
  userId           String           @map("user_id")
  notificationType NotificationType @map("notification_type")
  enabled          Boolean          @default(true)
  createdAt        DateTime         @map("created_at") @default(now())
  updatedAt        DateTime         @map("updated_at") @updatedAt

  user             Contact          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, notificationType])
  @@map("notification_preferences")
}

enum NotificationType {
  STATUS_CHANGED
  ASSIGNED_TO_ME
  DOCUMENT_UPLOADED
  EMAIL_SENT
  EXPIRATION_APPROACHING
  MARKED_FULLY_EXECUTED
}
```

### Notification Preferences Service

**Implementation:**
```typescript
// src/server/services/notificationPreferencesService.ts
import NodeCache from 'node-cache';

const preferencesCache = new NodeCache({ stdTTL: 300 }); // 5-minute TTL

export async function getPreferences(userId: string) {
  // Check cache
  const cacheKey = `prefs:${userId}`;
  const cached = preferencesCache.get(cacheKey);
  if (cached) return cached;

  // Fetch from database
  const preferences = await prisma.notificationPreference.findMany({
    where: { userId }
  });

  // Convert to map for easier lookup
  const prefsMap = new Map<NotificationType, boolean>();

  preferences.forEach(pref => {
    prefsMap.set(pref.notificationType, pref.enabled);
  });

  // Cache result
  preferencesCache.set(cacheKey, prefsMap);

  return prefsMap;
}

export async function setPreference(
  userId: string,
  notificationType: NotificationType,
  enabled: boolean
) {
  await prisma.notificationPreference.upsert({
    where: {
      userId_notificationType: { userId, notificationType }
    },
    update: { enabled, updatedAt: new Date() },
    create: { userId, notificationType, enabled }
  });

  // Clear cache
  preferencesCache.del(`prefs:${userId}`);
}

export async function isNotificationEnabled(
  userId: string,
  notificationType: NotificationType
): Promise<boolean> {
  const preferences = await getPreferences(userId);
  return preferences.get(notificationType) ?? true; // Default: enabled
}
```

### Email Service Integration

**Check Preferences Before Sending:**
```typescript
// Extend emailService from Story 3.11
async function sendNotificationEmail(
  userId: string,
  notificationType: NotificationType,
  emailData: EmailData
) {
  // Check if user has this notification enabled
  const isEnabled = await notificationPreferencesService.isNotificationEnabled(
    userId,
    notificationType
  );

  if (!isEnabled) {
    logger.info('Notification skipped - user preference disabled', {
      userId,
      notificationType
    });
    return { skipped: true, reason: 'user_preference' };
  }

  // Send email
  return await sendEmail(emailData);
}

// Usage in various places
async function notifyStatusChange(nda: Nda, fromStatus: string, toStatus: string) {
  const stakeholders = await getStakeholders(nda.id);

  for (const stakeholder of stakeholders) {
    await sendNotificationEmail(
      stakeholder.userId,
      'STATUS_CHANGED',
      {
        to: stakeholder.email,
        subject: `NDA ${nda.displayId} status changed: ${fromStatus} → ${toStatus}`,
        template: 'status-changed',
        data: { nda, fromStatus, toStatus }
      }
    );
  }
}
```

### Frontend User Settings Page

**Settings Page Layout:**
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Bell, Settings as SettingsIcon } from 'lucide-react';

function UserSettings() {
  return (
    <div className="container max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationPreferencesPanel />
        </TabsContent>

        <TabsContent value="preferences">
          <OtherPreferences />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Notification Preferences Panel:**
```tsx
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function NotificationPreferencesPanel() {
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => api.get('/api/preferences/notifications').then(res => res.data)
  });

  const updateMutation = useMutation({
    mutationFn: (updates: NotificationPreference[]) =>
      api.put('/api/preferences/notifications', updates),
    onSuccess: () => {
      toast.success('Notification preferences saved');
    }
  });

  const notificationTypes = [
    {
      type: 'STATUS_CHANGED',
      label: 'NDA Status Changed',
      description: 'Notify when an NDA changes status (Created → Emailed, etc.)'
    },
    {
      type: 'ASSIGNED_TO_ME',
      label: 'NDA Assigned to Me',
      description: 'Notify when you are designated as a POC on an NDA'
    },
    {
      type: 'DOCUMENT_UPLOADED',
      label: 'Document Uploaded',
      description: 'Notify when a document is uploaded to an NDA you follow'
    },
    {
      type: 'EMAIL_SENT',
      label: 'Email Sent',
      description: 'Notify when an NDA email is sent to a partner'
    },
    {
      type: 'EXPIRATION_APPROACHING',
      label: 'NDA Approaching Expiration',
      description: 'Notify when NDAs are expiring soon (configurable thresholds)'
    },
    {
      type: 'MARKED_FULLY_EXECUTED',
      label: 'NDA Marked Fully Executed',
      description: 'Notify when an NDA is marked as fully executed'
    }
  ];

  const handleToggle = (type: string, enabled: boolean) => {
    // Optimistic update
    queryClient.setQueryData(['notification-preferences'], (old: any) => ({
      ...old,
      [type]: enabled
    }));

    // Save to backend
    updateMutation.mutate([{ type, enabled }]);
  };

  if (isLoading) return <Skeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>
          Choose which events trigger email notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {notificationTypes.map(({ type, label, description }) => (
          <div key={type} className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor={type} className="text-base font-medium">
                {label}
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                {description}
              </p>
            </div>

            <Switch
              id={type}
              checked={preferences?.[type] ?? true}
              onCheckedChange={(enabled) => handleToggle(type, enabled)}
            />
          </div>
        ))}

        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500">
            Changes are saved automatically and take effect immediately.
            You will only receive emails for NDAs you have access to.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

### API Implementation

**Get Preferences:**
```typescript
// GET /api/preferences/notifications
router.get('/preferences/notifications', authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  const preferences = await notificationPreferencesService.getPreferences(userId);

  // Convert Map to object for JSON response
  const prefsObject: Record<NotificationType, boolean> = {};

  Object.values(NotificationType).forEach(type => {
    prefsObject[type] = preferences.get(type) ?? true; // Default: enabled
  });

  res.json(prefsObject);
});
```

**Update Preferences:**
```typescript
// PUT /api/preferences/notifications
router.put('/preferences/notifications', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const updates: Array<{ type: NotificationType; enabled: boolean }> = req.body;

  // Validate
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Expected array of preferences' });
  }

  // Update all in transaction
  await prisma.$transaction(
    updates.map(({ type, enabled }) =>
      prisma.notificationPreference.upsert({
        where: {
          userId_notificationType: { userId, notificationType: type }
        },
        update: { enabled },
        create: { userId, notificationType: type, enabled }
      })
    )
  );

  // Clear cache
  notificationPreferencesService.clearCache(userId);

  res.json({ success: true });
});
```

### Email Queue Integration

**Check Preferences in Email Queue:**
```typescript
// From Story 3.11 - Email service with queue
async function queueNotificationEmail(payload: EmailNotificationPayload) {
  const { userId, notificationType, emailData } = payload;

  // Check if user wants this notification
  const isEnabled = await notificationPreferencesService.isNotificationEnabled(
    userId,
    notificationType
  );

  if (!isEnabled) {
    logger.info('Email notification skipped', { userId, notificationType });
    return { skipped: true };
  }

  // Queue email for sending
  await emailQueue.send('send-email', {
    to: emailData.to,
    subject: emailData.subject,
    body: emailData.body,
    template: emailData.template
  });

  return { queued: true };
}
```

### Notification Trigger Points

**When to Send Each Notification:**
```typescript
// STATUS_CHANGED - When NDA status changes
await notifyStakeholders(nda.id, 'STATUS_CHANGED', {
  subject: `NDA ${nda.displayId} status: ${newStatus}`,
  data: { nda, oldStatus, newStatus }
});

// ASSIGNED_TO_ME - When user added as POC
await sendNotificationEmail(userId, 'ASSIGNED_TO_ME', {
  subject: `You were assigned to NDA ${nda.displayId}`,
  data: { nda, role: 'Opportunity POC' }
});

// DOCUMENT_UPLOADED - When document uploaded
await notifyStakeholders(nda.id, 'DOCUMENT_UPLOADED', {
  subject: `Document uploaded to NDA ${nda.displayId}`,
  data: { nda, document }
});

// EMAIL_SENT - When NDA email sent
await notifyStakeholders(nda.id, 'EMAIL_SENT', {
  subject: `NDA ${nda.displayId} emailed to partner`,
  data: { nda, recipients }
});

// EXPIRATION_APPROACHING - Daily job checks expiring NDAs
await sendExpirationAlerts();

// MARKED_FULLY_EXECUTED - When status changes to FULLY_EXECUTED
await notifyStakeholders(nda.id, 'MARKED_FULLY_EXECUTED', {
  subject: `NDA ${nda.displayId} marked as fully executed`,
  data: { nda }
});
```

### Default Preferences

**Seed Data:**
```typescript
// prisma/seed.ts
// Create default preferences for all users
const notificationTypes = Object.values(NotificationType);
const users = await prisma.contact.findMany({ where: { isInternal: true } });

for (const user of users) {
  for (const type of notificationTypes) {
    await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        notificationType: type,
        enabled: true // All enabled by default
      }
    });
  }
}
```

### Frontend UX Details

**Toggle Switch Layout:**
```tsx
<div className="space-y-6">
  {/* Group: NDA Events */}
  <div>
    <h3 className="text-sm font-semibold text-gray-700 mb-3">NDA Events</h3>
    <div className="space-y-4">
      <PreferenceToggle type="STATUS_CHANGED" />
      <PreferenceToggle type="MARKED_FULLY_EXECUTED" />
    </div>
  </div>

  {/* Group: Document Events */}
  <div>
    <h3 className="text-sm font-semibold text-gray-700 mb-3">Document Events</h3>
    <div className="space-y-4">
      <PreferenceToggle type="DOCUMENT_UPLOADED" />
      <PreferenceToggle type="EMAIL_SENT" />
    </div>
  </div>

  {/* Group: Alerts */}
  <div>
    <h3 className="text-sm font-semibold text-gray-700 mb-3">Alerts</h3>
    <div className="space-y-4">
      <PreferenceToggle type="EXPIRATION_APPROACHING" />
      <PreferenceToggle type="ASSIGNED_TO_ME" />
    </div>
  </div>
</div>
```

### Performance Considerations

**Caching:**
- Cache preferences per user (5-minute TTL)
- Check cache before every email send
- Invalidate cache on preference update

**Batch Preference Checks:**
```typescript
// When sending to multiple recipients, batch check
async function sendToMultipleRecipients(
  recipients: string[],
  notificationType: NotificationType,
  emailData: EmailData
) {
  // Load all preferences in one query
  const preferences = await prisma.notificationPreference.findMany({
    where: {
      userId: { in: recipients },
      notificationType
    }
  });

  // Filter to enabled recipients only
  const enabledRecipients = recipients.filter(userId => {
    const pref = preferences.find(p => p.userId === userId);
    return pref?.enabled ?? true; // Default: enabled
  });

  // Send to enabled recipients only
  await sendBulkEmails(enabledRecipients, emailData);
}
```

### Security Considerations

**Authorization:**
- Users can only view/edit their own preferences
- No admin override (users control their inbox)
- Preferences are private

**Data Privacy:**
- Preferences don't affect row-level security
- User still needs access to NDA to receive notification
- No notifications for unauthorized NDAs (even if enabled)

### Integration with Other Stories

**Builds on:**
- Story 3.11: Email notifications to stakeholders
- Story 5.4: System config pattern
- Story 5.12: Expiration alerts (preference to enable/disable)

**Used by:**
- All notification-sending features
- Email queue from Story 3.11
- Daily expiration alert job

**Notification Triggers:**
- Story 3.12: Status changes → STATUS_CHANGED
- Story 4.1: Document upload → DOCUMENT_UPLOADED
- Story 4.2: Fully executed → MARKED_FULLY_EXECUTED
- Story 3.10: Email sent → EMAIL_SENT
- Story 5.12: Expiration → EXPIRATION_APPROACHING
- Story 3.14: POC assigned → ASSIGNED_TO_ME

### Project Structure Notes

**New Files:**
- `prisma/schema.prisma` - ADD NotificationPreference model and enum
- `src/server/services/notificationPreferencesService.ts` - NEW
- `src/server/routes/notificationPreferences.ts` - NEW
- `src/components/screens/UserSettings.tsx` - NEW
- `src/components/settings/NotificationPreferencesPanel.tsx` - NEW
- Migration file for notification_preferences table

**Files to Modify:**
- `src/server/services/emailService.ts` - MODIFY (check preferences before sending)
- `src/server/services/ndaService.ts` - MODIFY (trigger notifications)
- `src/App.tsx` - ADD /settings route
- `prisma/seed.ts` - MODIFY (seed default preferences)

**Follows established patterns:**
- Prisma upsert for preference updates
- Caching with NodeCache
- Service layer for business logic
- React Query for data fetching
- Optimistic UI updates

### References

- [Source: docs/epics.md#Epic 5: Search, Filtering & Dashboard - Story 5.13]
- [Source: docs/architecture.md#Database Schema - notification_preferences table]
- [Source: Story 3.11 - Email notifications foundation]
- [Source: Story 5.4 - System config pattern]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- 6 notification types defined from epics.md
- NotificationPreference model and service specified
- Email service integration with preference checking
- User settings page with toggle switches
- Caching strategy for performance
- Default preferences (all enabled) for new users

### File List

Files to be created/modified during implementation:
- `prisma/schema.prisma` - ADD NotificationPreference model and enum
- `src/server/services/notificationPreferencesService.ts` - NEW
- `src/server/routes/notificationPreferences.ts` - NEW
- `src/components/screens/UserSettings.tsx` - NEW
- `src/components/settings/NotificationPreferencesPanel.tsx` - NEW
- `src/server/services/emailService.ts` - MODIFY (check preferences)
- `src/App.tsx` - MODIFY (add /settings route)
- `prisma/seed.ts` - MODIFY (seed default preferences)
- Migration file for notification_preferences table
- `src/server/services/__tests__/notificationPreferencesService.test.ts` - NEW

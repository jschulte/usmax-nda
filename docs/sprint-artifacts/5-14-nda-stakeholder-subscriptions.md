# Story 5.14: NDA Stakeholder Subscriptions

Status: ready-for-dev

## Story

As an **NDA User**,
I want **to subscribe to specific NDAs to receive notifications**,
so that **I can follow NDAs I care about even if I'm not the POC**.

## Acceptance Criteria

### AC1: Subscribe to NDA
**Given** I am viewing an NDA detail page
**When** I click "Follow this NDA" or "Subscribe to Notifications"
**Then** I am added to the nda_stakeholders table for that NDA
**And** I receive email notifications for status changes (per my preferences)
**And** the button changes to "Unfollow" or "Unsubscribe"
**And** subscription respects agency access control

## Tasks / Subtasks

- [ ] **Task 1: Database Schema - NDA Stakeholders** (AC: 1)
  - [ ] 1.1: Create NdaStakeholder model in Prisma schema
  - [ ] 1.2: Add fields: id (UUID), nda_id (FK), contact_id (FK), subscribed_at (DateTime)
  - [ ] 1.3: Add unique constraint on (nda_id, contact_id)
  - [ ] 1.4: Add onDelete: Cascade for NDA, Restrict for contact
  - [ ] 1.5: Create migration and run prisma generate

- [ ] **Task 2: Stakeholder Service** (AC: 1)
  - [ ] 2.1: Create `src/server/services/stakeholderService.ts`
  - [ ] 2.2: Implement `subscribe(ndaId, userId)` function
  - [ ] 2.3: Implement `unsubscribe(ndaId, userId)` function
  - [ ] 2.4: Implement `isSubscribed(ndaId, userId)` function
  - [ ] 2.5: Implement `getStakeholders(ndaId)` function
  - [ ] 2.6: Verify user has access to NDA before allowing subscription

- [ ] **Task 3: API - Subscription Endpoints** (AC: 1)
  - [ ] 3.1: Create `POST /api/ndas/:id/subscribe` endpoint
  - [ ] 3.2: Create `DELETE /api/ndas/:id/subscribe` endpoint (unsubscribe)
  - [ ] 3.3: Create `GET /api/ndas/:id/subscribers` endpoint (list stakeholders)
  - [ ] 3.4: Apply middleware: authenticateJWT, scopeToAgencies
  - [ ] 3.5: Verify user has access to NDA before allowing subscribe/unsubscribe

- [ ] **Task 4: NDA Detail API - Include Subscription Status** (AC: 1)
  - [ ] 4.1: Extend GET /api/ndas/:id response to include `isSubscribed` boolean
  - [ ] 4.2: Query nda_stakeholders for current user + NDA
  - [ ] 4.3: Return true if subscribed, false otherwise

- [ ] **Task 5: Frontend - Follow/Unfollow Button** (AC: 1)
  - [ ] 5.1: Add Follow button to NDA detail page header
  - [ ] 5.2: Show "Follow" if not subscribed, "Following" if subscribed
  - [ ] 5.3: Use Bell or BellPlus icon (lucide-react)
  - [ ] 5.4: On click, call subscribe or unsubscribe API
  - [ ] 5.5: Optimistic UI update (toggle immediately)

- [ ] **Task 6: Frontend - Subscription State Management** (AC: 1)
  - [ ] 6.1: Add subscription mutation with React Query
  - [ ] 6.2: Handle subscribe action
  - [ ] 6.3: Handle unsubscribe action
  - [ ] 6.4: Show success toast after action
  - [ ] 6.5: Revert on error

- [ ] **Task 7: Email Service - Send to Stakeholders** (AC: 1)
  - [ ] 7.1: Extend emailService with `notifyStakeholders(ndaId, notificationType, emailData)`
  - [ ] 7.2: Fetch stakeholders from stakeholderService.getStakeholders()
  - [ ] 7.3: For each stakeholder, check notification preferences (Story 5.13)
  - [ ] 7.4: Send email to stakeholders with enabled preferences
  - [ ] 7.5: Include POCs in stakeholder list (auto-subscribed)

- [ ] **Task 8: Dashboard - Followed NDAs Integration** (AC: 1)
  - [ ] 8.1: Update getFollowedNdas() from Story 5.8 to use nda_stakeholders
  - [ ] 8.2: Query NDAs where user in stakeholders table
  - [ ] 8.3: Display in "NDAs I'm Following" dashboard widget
  - [ ] 8.4: Show unfollow action in widget (optional)

- [ ] **Task 9: Testing** (AC: All)
  - [ ] 9.1: Unit tests for stakeholderService
  - [ ] 9.2: API tests for subscribe endpoint
  - [ ] 9.3: API tests for unsubscribe endpoint
  - [ ] 9.4: API tests for agency access control (cannot subscribe to unauthorized NDA)
  - [ ] 9.5: Component tests for Follow button
  - [ ] 9.6: E2E tests for subscribe/unsubscribe flow

## Dev Notes

### NDA Stakeholder Schema

**Prisma Model:**
```prisma
model NdaStakeholder {
  id           String   @id @default(uuid())
  ndaId        String   @map("nda_id")
  contactId    String   @map("contact_id")
  subscribedAt DateTime @map("subscribed_at") @default(now())

  nda          Nda      @relation(fields: [ndaId], references: [id], onDelete: Cascade)
  contact      Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@unique([ndaId, contactId])
  @@index([contactId]) // For finding all NDAs a user follows
  @@index([ndaId]) // For finding all stakeholders of an NDA
  @@map("nda_stakeholders")
}
```

### Stakeholder Service Implementation

**Subscribe/Unsubscribe Logic:**
```typescript
// src/server/services/stakeholderService.ts
export async function subscribe(ndaId: string, userId: string) {
  // Verify user has access to NDA
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    select: { subagencyId: true }
  });

  if (!userHasAccessToSubagency(userId, nda.subagencyId)) {
    throw new UnauthorizedError('Cannot subscribe to this NDA - no access');
  }

  // Subscribe (upsert to handle re-subscription)
  await prisma.ndaStakeholder.upsert({
    where: {
      ndaId_contactId: { ndaId, contactId: userId }
    },
    update: { subscribedAt: new Date() },
    create: { ndaId, contactId: userId }
  });

  return { subscribed: true };
}

export async function unsubscribe(ndaId: string, userId: string) {
  await prisma.ndaStakeholder.delete({
    where: {
      ndaId_contactId: { ndaId, contactId: userId }
    }
  });

  return { subscribed: false };
}

export async function isSubscribed(ndaId: string, userId: string): Promise<boolean> {
  const subscription = await prisma.ndaStakeholder.findUnique({
    where: {
      ndaId_contactId: { ndaId, contactId: userId }
    }
  });

  return subscription !== null;
}

export async function getStakeholders(ndaId: string) {
  return await prisma.ndaStakeholder.findMany({
    where: { ndaId },
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true }
      }
    }
  });
}
```

### API Implementation

**Subscribe Endpoint:**
```typescript
// POST /api/ndas/:id/subscribe
router.post(
  '/ndas/:id/subscribe',
  authenticateJWT,
  scopeToAgencies,
  async (req, res) => {
    const ndaId = req.params.id;
    const userId = req.user.id;

    const result = await stakeholderService.subscribe(ndaId, userId);

    res.json(result);
  }
);

// DELETE /api/ndas/:id/subscribe
router.delete(
  '/ndas/:id/subscribe',
  authenticateJWT,
  async (req, res) => {
    const ndaId = req.params.id;
    const userId = req.user.id;

    const result = await stakeholderService.unsubscribe(ndaId, userId);

    res.json(result);
  }
);
```

**Include Subscription Status:**
```typescript
// Extend GET /api/ndas/:id
router.get('/ndas/:id', authenticateJWT, scopeToAgencies, async (req, res) => {
  const nda = await ndaService.getNda(req.params.id, req.user.id);

  // Check if current user is subscribed
  const isSubscribed = await stakeholderService.isSubscribed(nda.id, req.user.id);

  res.json({
    ...nda,
    isSubscribed
  });
});
```

### Frontend Follow Button

**Component:**
```tsx
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FollowButtonProps {
  ndaId: string;
  isSubscribed: boolean;
}

function FollowButton({ ndaId, isSubscribed: initialSubscribed }: FollowButtonProps) {
  const queryClient = useQueryClient();

  const subscribeMutation = useMutation({
    mutationFn: () => api.post(`/api/ndas/${ndaId}/subscribe`),
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries(['nda', ndaId]);

      const previousData = queryClient.getQueryData(['nda', ndaId]);

      queryClient.setQueryData(['nda', ndaId], (old: any) => ({
        ...old,
        isSubscribed: true
      }));

      return { previousData };
    },
    onSuccess: () => {
      toast.success('You are now following this NDA');
      queryClient.invalidateQueries(['dashboard']); // Refresh followed NDAs
    },
    onError: (_error, _variables, context) => {
      // Revert optimistic update
      queryClient.setQueryData(['nda', ndaId], context?.previousData);
      toast.error('Failed to follow NDA');
    }
  });

  const unsubscribeMutation = useMutation({
    mutationFn: () => api.delete(`/api/ndas/${ndaId}/subscribe`),
    onMutate: async () => {
      await queryClient.cancelQueries(['nda', ndaId]);

      const previousData = queryClient.getQueryData(['nda', ndaId]);

      queryClient.setQueryData(['nda', ndaId], (old: any) => ({
        ...old,
        isSubscribed: false
      }));

      return { previousData };
    },
    onSuccess: () => {
      toast.success('You unfollowed this NDA');
      queryClient.invalidateQueries(['dashboard']);
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(['nda', ndaId], context?.previousData);
      toast.error('Failed to unfollow NDA');
    }
  });

  const isLoading = subscribeMutation.isPending || unsubscribeMutation.isPending;

  return (
    <Button
      variant={isSubscribed ? 'default' : 'outline'}
      onClick={() => isSubscribed ? unsubscribeMutation.mutate() : subscribeMutation.mutate()}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="mr-2 h-4 w-4" />
      ) : (
        <BellOff className="mr-2 h-4 w-4" />
      )}
      {isSubscribed ? 'Following' : 'Follow'}
    </Button>
  );
}
```

### Integration with Notifications

**Send to Stakeholders:**
```typescript
async function notifyStakeholders(
  ndaId: string,
  notificationType: NotificationType,
  emailData: EmailTemplateData
) {
  // Get all stakeholders
  const stakeholders = await stakeholderService.getStakeholders(ndaId);

  // Also include POCs (auto-subscribed)
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    include: {
      opportunityContact: true,
      contractsContact: true,
      relationshipContact: true
    }
  });

  const allRecipients = [
    ...stakeholders.map(s => s.contact),
    nda.opportunityContact,
    nda.contractsContact,
    nda.relationshipContact
  ].filter(c => c !== null);

  // Remove duplicates
  const uniqueRecipients = Array.from(
    new Map(allRecipients.map(c => [c.id, c])).values()
  );

  // Send to each recipient (checking their preferences)
  for (const recipient of uniqueRecipients) {
    await emailService.sendNotificationEmail(
      recipient.id,
      notificationType,
      {
        to: recipient.email,
        ...emailData
      }
    );
  }
}
```

### Dashboard Integration

**Followed NDAs Widget:**
```typescript
// From Story 5.8 - Update to use nda_stakeholders
async function getFollowedNdas(userId: string, subagencyIds: string[]) {
  return await prisma.nda.findMany({
    where: {
      subagencyId: { in: subagencyIds },
      stakeholders: {
        some: { contactId: userId }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: {
      subagency: { include: { agencyGroup: true } }
    }
  });
}
```

### Auto-Subscribe POCs

**Automatic Subscription:**
```typescript
// When user is assigned as POC, auto-subscribe them
async function assignPoc(ndaId: string, pocType: 'opportunity' | 'contracts' | 'relationship', userId: string) {
  await prisma.$transaction([
    // Update NDA with POC
    prisma.nda.update({
      where: { id: ndaId },
      data: { [`${pocType}ContactId`]: userId }
    }),

    // Auto-subscribe POC to NDA
    prisma.ndaStakeholder.upsert({
      where: {
        ndaId_contactId: { ndaId, contactId: userId }
      },
      update: {},
      create: { ndaId, contactId: userId }
    })
  ]);

  // Send ASSIGNED_TO_ME notification
  await emailService.sendNotificationEmail(userId, 'ASSIGNED_TO_ME', {
    ...emailData
  });
}
```

### NDA Detail View Integration

**Follow Button Placement:**
```tsx
function NDADetail({ nda }: { nda: NdaWithSubscription }) {
  return (
    <div>
      {/* Header with actions */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">NDA #{nda.displayId}</h1>
          <p className="text-lg text-gray-600">{nda.companyName}</p>
        </div>

        <div className="flex items-center gap-2">
          <FollowButton
            ndaId={nda.id}
            isSubscribed={nda.isSubscribed}
          />

          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>

          {/* ... other actions */}
        </div>
      </div>

      {/* ... rest of detail view */}
    </div>
  );
}
```

### Subscriber List Display

**Show Who's Following (Optional):**
```tsx
function NDASub scribersSection({ ndaId }: { ndaId: string }) {
  const { data: subscribers } = useQuery({
    queryKey: ['nda-subscribers', ndaId],
    queryFn: () => api.get(`/api/ndas/${ndaId}/subscribers`).then(res => res.data)
  });

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Followers ({subscribers?.length || 0})
      </h3>

      {subscribers?.map(sub => (
        <div key={sub.id} className="text-sm text-gray-600">
          {sub.contact.firstName} {sub.contact.lastName}
        </div>
      ))}
    </div>
  );
}
```

### Security Considerations

**Authorization:**
- User must have access to NDA's subagency to subscribe
- Cannot subscribe to unauthorized NDAs
- Can only unsubscribe self (not others)
- Stakeholder list respects row-level security

**Validation:**
- Verify NDA exists before allowing subscription
- Verify user exists
- Unique constraint prevents duplicate subscriptions

### Performance Considerations

**Optimization:**
- Index on (nda_id, contact_id) for quick subscription checks
- Index on contact_id for finding followed NDAs
- Cache subscription status with NDA data
- Batch stakeholder queries when sending notifications

**Efficient Stakeholder Query:**
```sql
-- Fast lookup: is user subscribed?
SELECT 1 FROM nda_stakeholders
WHERE nda_id = ? AND contact_id = ?
LIMIT 1;

-- Fast lookup: all stakeholders for NDA
SELECT * FROM nda_stakeholders
WHERE nda_id = ?;
```

### Integration with Other Stories

**Builds on:**
- Story 5.13: Notification preferences (check before sending)
- Story 5.8: Dashboard followed NDAs widget
- Story 3.11: Email notifications

**Used by:**
- All notification-sending features
- Dashboard "NDAs I'm Following" section
- Email distribution lists

**Auto-Subscriptions:**
- POCs automatically subscribed when assigned (Story 3.14)
- Creator auto-subscribed on NDA creation (Story 3.1)

### Business Rules

**Who Gets Notified:**
1. **Stakeholders** (explicitly subscribed via Follow button)
2. **POCs** (auto-subscribed: Opportunity, Contracts, Relationship)
3. **Creator** (auto-subscribed when creating NDA)

**Notification Filtering:**
1. Check if user is stakeholder OR POC
2. Check user's notification preference for event type
3. If both true, send email
4. If either false, skip

### Project Structure Notes

**New Files:**
- `prisma/schema.prisma` - ADD NdaStakeholder model
- `src/server/services/stakeholderService.ts` - NEW
- `src/server/routes/stakeholders.ts` - NEW
- `src/components/ui/FollowButton.tsx` - NEW
- Migration file for nda_stakeholders table

**Files to Modify:**
- `src/server/services/emailService.ts` - MODIFY (notifyStakeholders function)
- `src/components/screens/NDADetail.tsx` - ADD Follow button
- `src/server/services/dashboardService.ts` - MODIFY (use nda_stakeholders)
- `src/server/services/ndaService.ts` - MODIFY (auto-subscribe creator/POCs)

**Follows established patterns:**
- Service layer for business logic
- Row-level security checks
- React Query with optimistic updates
- Prisma unique constraints

### References

- [Source: docs/epics.md#Epic 5: Search, Filtering & Dashboard - Story 5.14]
- [Source: docs/architecture.md#Database Schema - nda_stakeholders table]
- [Source: Story 5.13 - Notification preferences integration]
- [Source: Story 5.8 - Dashboard followed NDAs]
- [Source: Story 3.11 - Email notifications]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- NdaStakeholder model and service defined
- Follow/Unfollow button with optimistic updates
- Integration with email notification system from Story 5.13
- Auto-subscription for POCs and creators
- Dashboard followed NDAs widget integration

### File List

Files to be created/modified during implementation:
- `prisma/schema.prisma` - ADD NdaStakeholder model
- `src/server/services/stakeholderService.ts` - NEW
- `src/server/routes/stakeholders.ts` - NEW
- `src/components/ui/FollowButton.tsx` - NEW
- `src/server/services/emailService.ts` - MODIFY (notifyStakeholders)
- `src/components/screens/NDADetail.tsx` - MODIFY (add Follow button)
- `src/server/services/dashboardService.ts` - MODIFY (use nda_stakeholders)
- `src/server/services/ndaService.ts` - MODIFY (auto-subscribe on create)
- Migration file for nda_stakeholders table
- `src/server/services/__tests__/stakeholderService.test.ts` - NEW

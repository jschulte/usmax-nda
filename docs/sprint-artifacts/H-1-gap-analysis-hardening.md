# Story H-1: Gap Analysis Hardening

Status: in-progress

## Story

As a **development team**,
I want **to address all minor gaps identified in the Epic 1-5 gap analyses**,
so that **the implementation reaches 98-99% alignment with specifications**.

## Background

Gap analyses for Epics 1-5 identified numerous small issues that individually are minor but collectively reduce spec alignment. This hardening story bundles all quick-win fixes into a single implementation effort.

## Acceptance Criteria

### AC1: Epic 1 - Authentication Hardening
**Given** the Epic 1 gap analysis findings
**When** all fixes are applied
**Then** usePermissions hook is verified or documented
**And** unauthorized access audit logging is more explicit

### AC2: Epic 2 - User Admin Hardening
**Given** the Epic 2 gap analysis findings
**When** all fixes are applied
**Then** users cannot deactivate themselves
**And** revoking access shows confirmation dialog
**And** reactivating users is possible via "Show Inactive" filter
**And** agency groups list has pagination for large datasets

### AC3: Epic 3 - NDA Lifecycle Hardening
**Given** the Epic 3 gap analysis findings
**When** all fixes are applied
**Then** "Copy from Contracts POC" button exists in POC wizard
**And** POC selection has inline quick-create option

### AC4: Epic 4 - Document Management Hardening
**Given** the Epic 4 gap analysis findings
**When** all fixes are applied
**Then** deleteDocument() is removed or gated behind super-admin permission
**And** S3 lifecycle transitions to Glacier at 6 years (not 1 year)
**And** Noncurrent versions are preserved indefinitely
**And** S3 metadata includes upload-timestamp
**And** Document upload has explicit 3-attempt retry logic

### AC5: Epic 5 - Reports Hardening
**Given** the Epic 5 gap analysis findings
**When** all fixes are applied
**Then** date range shortcuts exist (Today, Yesterday, Last 7/30/90 days, This month/quarter/year)
**And** ASSIGNED_TO_ME notification type is implemented
**And** sort column/order persists to localStorage

## Tasks / Subtasks

- [x] **Task 1: Epic 1 - Auth Fixes**
  - [x] 1.1: Verify usePermissions hook exists and works in frontend
  - [x] 1.2: Document hook usage in code comments
  - [x] 1.3: Add explicit audit log for unauthorized access attempts in scopeToAgencies middleware

- [x] **Task 2: Epic 2 - Self-Deactivation Prevention** (AC: 2)
  - [x] 2.1: In userService.deactivateUser(), check if userId === currentUserId
  - [x] 2.2: Throw error "Cannot deactivate your own account"
  - [x] 2.3: Add test case for self-deactivation prevention

- [ ] **Task 3: Epic 2 - Confirmation Dialogs** (AC: 2)
  - [ ] 3.1: Add confirmation dialog to revokeAgencyGroupAccess in AgencyGroups.tsx
  - [ ] 3.2: Add confirmation dialog to revokeSubagencyAccess
  - [ ] 3.3: Dialog text: "Are you sure you want to revoke access for [user] to [agency/subagency]?"

- [ ] **Task 4: Epic 2 - Show Inactive Users** (AC: 2)
  - [ ] 4.1: Add "Show Inactive" checkbox to UserManagement.tsx filter panel
  - [ ] 4.2: Pass showInactive param to listUsers API
  - [ ] 4.3: Display inactive users with visual indicator (grayed out or badge)
  - [ ] 4.4: Add "Reactivate" button for inactive users

- [ ] **Task 5: Epic 2 - Agency Groups Pagination** (AC: 2)
  - [ ] 5.1: Add page/limit params to GET /api/agency-groups
  - [ ] 5.2: Return pagination metadata (total, page, totalPages)
  - [ ] 5.3: Add pagination controls to AgencyGroups.tsx

- [ ] **Task 6: Epic 3 - Copy POC Button** (AC: 3)
  - [ ] 6.1: In POC wizard step, add "Copy from Contracts POC" button
  - [ ] 6.2: Button copies contractsPoc fields to relationshipPoc fields
  - [ ] 6.3: Only show button if contractsPoc is filled

- [ ] **Task 7: Epic 3 - Inline Contact Creation** (AC: 3)
  - [ ] 7.1: Add "Create New Contact" option in POC autocomplete dropdown
  - [ ] 7.2: Opens modal with firstName, lastName, email, phone fields
  - [ ] 7.3: On save, creates contact and selects it in autocomplete

- [ ] **Task 8: Epic 4 - Remove deleteDocument** (AC: 4)
  - [ ] 8.1: Remove deleteDocument() from s3Service.ts OR
  - [ ] 8.2: Gate behind ADMIN_SUPER permission (if keeping for emergencies)
  - [ ] 8.3: Remove any UI delete buttons for documents
  - [ ] 8.4: Update documentService to not expose delete

- [ ] **Task 9: Epic 4 - Fix S3 Lifecycle Rules** (AC: 4)
  - [ ] 9.1: Update infrastructure/modules/s3/main.tf
  - [ ] 9.2: Change Glacier transition from 365 days to 2190 days (6 years)
  - [ ] 9.3: Remove noncurrent_version_expiration (preserve indefinitely)
  - [ ] 9.4: Apply terraform changes

- [ ] **Task 10: Epic 4 - S3 Metadata Enhancement** (AC: 4)
  - [ ] 10.1: Add upload-timestamp to S3 object metadata in uploadDocument()
  - [ ] 10.2: Add uploaded-by-id (user ID) to metadata
  - [ ] 10.3: Update getDocumentMetadata() to return these fields

- [ ] **Task 11: Epic 4 - Upload Retry Logic** (AC: 4)
  - [ ] 11.1: Create retryWithBackoff utility function
  - [ ] 11.2: Wrap S3 upload in 3-attempt retry with exponential backoff
  - [ ] 11.3: Log retry attempts
  - [ ] 11.4: Add test for retry behavior

- [ ] **Task 12: Epic 5 - Date Range Shortcuts** (AC: 5)
  - [ ] 12.1: Create DateRangeShortcuts component
  - [ ] 12.2: Add buttons: Today, Yesterday, Last 7 days, Last 30 days, Last 90 days
  - [ ] 12.3: Add buttons: This month, This quarter, This year
  - [ ] 12.4: Clicking sets createdDateFrom/To or effectiveDateFrom/To
  - [ ] 12.5: Integrate into Requests.tsx filter panel

- [ ] **Task 13: Epic 5 - ASSIGNED_TO_ME Notification** (AC: 5)
  - [ ] 13.1: Add ASSIGNED_TO_ME to NotificationEvent enum
  - [ ] 13.2: Add onAssignedToMe field to NotificationPreference model
  - [ ] 13.3: Create migration for new field
  - [ ] 13.4: Trigger notification when NDA POC is changed to user
  - [ ] 13.5: Add toggle in notification preferences UI

- [ ] **Task 14: Epic 5 - Sort Persistence** (AC: 5)
  - [ ] 14.1: Save sortBy and sortOrder to localStorage in Requests.tsx
  - [ ] 14.2: Load sort preferences on component mount
  - [ ] 14.3: Key: 'ndaListSortPreferences'

- [ ] **Task 15: Testing**
  - [ ] 15.1: Add test for self-deactivation prevention
  - [ ] 15.2: Add test for S3 retry logic
  - [ ] 15.3: Add test for date range shortcut calculations
  - [ ] 15.4: Add test for ASSIGNED_TO_ME notification trigger

## Dev Notes

### Self-Deactivation Check

```typescript
// src/server/services/userService.ts
export async function deactivateUser(
  userId: string,
  userContext: UserContext
): Promise<void> {
  // Prevent self-deactivation
  if (userId === userContext.contactId) {
    throw new UserServiceError(
      'Cannot deactivate your own account',
      'SELF_DEACTIVATION_NOT_ALLOWED'
    );
  }
  // ... existing logic
}
```

### Date Range Shortcuts Component

```tsx
// src/components/ui/DateRangeShortcuts.tsx
interface DateRangeShortcutsProps {
  onSelect: (from: Date, to: Date) => void;
}

const shortcuts = [
  { label: 'Today', getDates: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Yesterday', getDates: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
  { label: 'Last 7 days', getDates: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Last 30 days', getDates: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'Last 90 days', getDates: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: 'This month', getDates: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'This quarter', getDates: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
  { label: 'This year', getDates: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

export function DateRangeShortcuts({ onSelect }: DateRangeShortcutsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {shortcuts.map(({ label, getDates }) => (
        <Button
          key={label}
          variant="outline"
          size="sm"
          onClick={() => {
            const { from, to } = getDates();
            onSelect(from, to);
          }}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
```

### S3 Lifecycle Fix (Terraform)

```hcl
# infrastructure/modules/s3/main.tf
lifecycle_rule {
  id      = "archive-old-documents"
  enabled = true

  transition {
    days          = 2190  # 6 years (was 365)
    storage_class = "GLACIER"
  }

  # REMOVE noncurrent_version_expiration block
  # Documents must be preserved indefinitely
}
```

### Retry Utility

```typescript
// src/server/utils/retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`[Retry] Attempt ${attempt}/${maxAttempts} failed:`, error);

      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

### Sort Persistence

```typescript
// In Requests.tsx
const SORT_PREFS_KEY = 'ndaListSortPreferences';

// Load on mount
useEffect(() => {
  const saved = localStorage.getItem(SORT_PREFS_KEY);
  if (saved) {
    const { sortBy, sortOrder } = JSON.parse(saved);
    setSortBy(sortBy);
    setSortOrder(sortOrder);
  }
}, []);

// Save on change
useEffect(() => {
  localStorage.setItem(SORT_PREFS_KEY, JSON.stringify({ sortBy, sortOrder }));
}, [sortBy, sortOrder]);
```

## Estimated Effort

| Task Group | Effort |
|------------|--------|
| Epic 1 fixes | 1 hour |
| Epic 2 fixes | 3 hours |
| Epic 3 fixes | 2 hours |
| Epic 4 fixes | 3 hours |
| Epic 5 fixes | 3 hours |
| Testing | 2 hours |
| **Total** | **~14 hours** |

## Definition of Done

- [ ] All 15 tasks completed
- [ ] All tests passing
- [ ] No regressions in existing functionality
- [ ] Terraform changes applied (if applicable)
- [ ] Code reviewed

## References

- [Epic 1 Gap Analysis](./epic-1-gap-analysis.md)
- [Epic 2 Gap Analysis](./epic-2-gap-analysis.md)
- [Epic 3 Gap Analysis](./epic-3-gap-analysis.md)
- [Epic 4 Gap Analysis](./epic-4-gap-analysis.md)
- [Epic 5 Gap Analysis](./epic-5-gap-analysis.md)

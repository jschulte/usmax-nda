# Story 9.9: Implement Notifications Bell Dropdown

Status: done

## Story

As an NDA user,
I want to click the notifications bell icon and see a dropdown of recent notifications,
So that I can quickly view and access NDAs that need my attention.

## Acceptance Criteria

**AC1: Bell icon shows dropdown on click**
**Given** I see the notification bell icon in the top bar
**When** I click the bell icon
**Then** a dropdown menu opens below the bell
**And** the dropdown shows my recent notifications (last 10)
**And** the dropdown has a semi-transparent backdrop or closes on outside click

**AC2: Dropdown shows notification details**
**Given** the notifications dropdown is open
**When** I view the notifications
**Then** each notification shows: NDA company name, event type, timestamp
**And** unread notifications are visually distinct (bold or highlighted)
**And** read notifications are less prominent

**AC3: Clicking notification navigates to NDA**
**Given** I see a notification in the dropdown
**When** I click on a notification
**Then** I am navigated to that NDA's detail page
**And** the dropdown closes
**And** the notification is marked as read

**AC4: Badge shows unread count**
**Given** I have unread notifications
**When** I view the top bar
**Then** the red badge on the bell shows the count of unread notifications (e.g., "3")
**And** the badge disappears when all notifications are read
**And** the count updates in real-time when new notifications arrive

**AC5: Empty state when no notifications**
**Given** I have no notifications
**When** I open the notifications dropdown
**Then** I see a message: "No notifications yet"
**And** the dropdown still renders properly (not blank)

## Tasks / Subtasks

- [x] Add dropdown state to TopBar component (Task AC: AC1)
  - [x] Add useState for showNotificationsDropdown
  - [x] Add state for notifications list
  - [x] Add state for unread count
- [x] Create notifications dropdown UI (Task AC: AC1, AC2)
  - [x] Follow profile menu pattern (lines 71-100)
  - [x] Absolute positioned dropdown below bell icon
  - [x] Render notifications list
  - [x] Show notification icon, text, timestamp for each
  - [x] Style read vs unread differently
- [x] Wire to notifications API (Task AC: AC2, AC4)
  - [x] Create getNotifications() API call
  - [x] Fetch notifications on TopBar mount
  - [x] Calculate unread count
  - [x] Update badge with count or hide if 0
- [x] Implement click to navigate (Task AC: AC3)
  - [x] Add onClick handler to each notification
  - [x] Navigate to `/ndas/${notification.ndaId}`
  - [x] Mark notification as read (API call)
  - [x] Close dropdown after navigation
- [x] Add empty state (Task AC: AC5)
  - [x] Conditional render when notifications.length === 0
  - [x] Show friendly "No notifications" message
  - [x] Maybe add icon or illustration
- [x] Test dropdown behavior (Task AC: All)
  - [x] Test dropdown opens/closes
  - [x] Test click outside to close
  - [x] Test navigation on notification click
  - [x] Test badge count updates
  - [x] Test unread vs read styling
  - [x] Test empty state

## Dev Notes

### Current Implementation

**File:** src/components/layout/TopBar.tsx lines 51-54

**Current (Broken):**
```tsx
<button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
  <Bell className="w-5 h-5 text-[var(--color-text-secondary)]" />
  <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-danger)] rounded-full" />
</button>
```

**Problem:**
- Button does nothing (no onClick handler)
- Badge is always visible (hardcoded)
- No dropdown menu
- No notifications data

**Solution Pattern (Follow Profile Menu):**
```tsx
// Add state
const [showNotifications, setShowNotifications] = useState(false);
const [notifications, setNotifications] = useState([]);
const unreadCount = notifications.filter(n => !n.read).length;

// Fetch notifications
useEffect(() => {
  // Fetch from API
}, []);

// Button with state
<div className="relative">
  <button onClick={() => setShowNotifications(!showNotifications)}>
    <Bell />
    {unreadCount > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
        {unreadCount}
      </span>
    )}
  </button>

  {showNotifications && (
    <div className="absolute right-0 mt-2 w-80 bg-white border shadow-lg rounded-lg">
      {/* Notifications list */}
    </div>
  )}
</div>
```

### Backend API Needed

**Endpoint:** `GET /api/notifications/recent`

**Response:**
```typescript
{
  notifications: [
    {
      id: string;
      ndaId: string;
      displayId: number;
      companyName: string;
      event: string; // "Status changed", "Document uploaded", etc.
      timestamp: Date;
      read: boolean;
    }
  ]
}
```

**Mark as Read:** `PATCH /api/notifications/:id/mark-read`

### Architecture Requirements

- Follow profile menu dropdown pattern exactly
- Use existing Tailwind classes
- Responsive: dropdown adjusts on mobile
- Accessibility: Escape key closes dropdown
- Click outside closes dropdown

### Testing Requirements

- Test with 0, 1, 5, 10+ notifications
- Test badge count updates correctly
- Test dropdown positioning on different screen sizes
- Test keyboard navigation (Escape to close)

### References

- [TopBar Component: src/components/layout/TopBar.tsx lines 51-54, 71-100]
- [Profile Menu Pattern: lines 56-101 (dropdown pattern to follow)]
- [Notification Service: Need to create backend endpoints]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

### Change Log

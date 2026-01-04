# Story 9.10: Fix Active Page Highlighting in Sidebar

Status: done

## Story

As a user,
I want to see which page I'm currently on highlighted in the sidebar navigation,
So that I always know where I am in the application.

## Acceptance Criteria

**AC1: Current page is visually highlighted**
**Given** I am on any page in the application
**When** I view the sidebar navigation
**Then** the nav item for my current page is visually distinct (highlighted background, different text color)
**And** other nav items are not highlighted
**And** the highlighting updates immediately when I navigate to a different page

**AC2: Highlighting works with React Router**
**Given** I navigate using the sidebar links
**When** I click a nav item
**Then** the clicked item becomes highlighted
**And** the previously highlighted item returns to normal state
**And** the highlighting persists after page load/refresh

**AC3: Highlighting works for all routes**
**Given** different sidebar nav items (Dashboard, My NDAs, All NDAs, Templates, Reports, Admin)
**When** I visit each page
**Then** the correct sidebar item is highlighted for each route
**And** sub-routes also highlight their parent (e.g., /administration/users highlights Administration)

## Tasks / Subtasks

- [x] Fix current isActive logic (Task AC: AC1, AC2)
  - [x] Remove window.location.pathname check (line 89)
  - [x] Use NavLink's built-in active state properly
  - [x] Update NavLink className to use function with isActive param
- [x] Update NavLink styling (Task AC: AC1)
  - [x] Use React Router NavLink's className callback
  - [x] Apply active styles when isActive = true
  - [x] Ensure inactive styles when isActive = false
  - [x] Test visual distinction is clear
- [x] Handle sub-routes (Task AC: AC3)
  - [x] Check if /administration/* should highlight Administration
  - [x] Add end prop to NavLink if exact matching needed
- [x] Test highlighting behavior (Task AC: All)
  - [x] Navigate to each sidebar link
  - [x] Verify correct item highlights
  - [x] Test page refresh maintains highlighting
  - [x] Test browser back/forward buttons

## Dev Notes

### Current Implementation

**File:** src/components/layout/Sidebar.tsx lines 88-103

**Current (Problematic):**
```tsx
const isActive = window.location.pathname === item.path;

return (
  <NavLink
    className={`... ${isActive ? 'bg-primary' : 'text-secondary'}`}
  >
```

**Problem:**
- Uses window.location.pathname instead of React Router state
- Doesn't re-render when route changes
- NavLink has built-in active state that's ignored

**Solution:**
```tsx
<NavLink
  to={item.path}
  className={({ isActive }) => `
    w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-lg transition-colors text-left
    ${isActive
      ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
      : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
    }
  `}
>
```

### References

- [Sidebar: src/components/layout/Sidebar.tsx lines 88-103]
- [React Router NavLink className function]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

### Change Log

# Story 9.13: Improve Login Page Branding

Status: done

## Story

As a user,
I want the login page to display proper USmax branding with the company logo,
So that I know I'm logging into the official USmax NDA system.

## Acceptance Criteria

**AC1: USmax logo is displayed**
**Given** I visit the login page
**When** the page loads
**Then** I see the USmax company logo (not a generic shield icon)
**And** the logo is properly sized and centered
**And** the logo loads from the official USmax website or local assets

**AC2: Branding uses correct spelling**
**Given** I see the login page text
**When** I read the page title and descriptions
**Then** all references to the company use "USmax" (not "USMax" or "USMAX")
**And** this applies to: page title, form labels, helper text, footer

**AC3: Visual design matches USmax branding**
**Given** I view the login page
**When** I see the overall design
**Then** the colors and styling reflect USmax brand identity
**And** the page feels professional and trustworthy
**And** the layout is clean and modern

**AC4: Page title and description are clear**
**Given** I see the login card
**When** I read the header
**Then** the title clearly indicates this is the "USmax NDA Management System"
**And** the description provides helpful context
**And** MFA requirement is mentioned

## Tasks / Subtasks

- [ ] Replace Shield icon with USmax logo (Task AC: AC1)
  - [ ] Update line 59-60 to use actual logo
  - [ ] Use logo URL: https://www.usmax.com/wp-content/themes/usmax/static/images/usmax-site-logo.jpg
  - [ ] Or download and host logo locally in public/
  - [ ] Adjust logo sizing (h-12 or h-16)
  - [ ] Ensure logo loads properly (error handling)
- [ ] Fix spelling throughout page (Task AC: AC2)
  - [ ] Line 62: "USMax NDA System" → "USmax NDA Management System"
  - [ ] Line 64: "USMax credentials" → "USmax credentials"
  - [ ] Line 95: "you@usmax.com" already correct
  - [ ] Check any other text references
- [ ] Enhance visual design (Task AC: AC3)
  - [ ] Consider background gradient or subtle pattern
  - [ ] Ensure card shadow/elevation is appropriate
  - [ ] Review color scheme for brand consistency
  - [ ] Add any missing brand elements
- [ ] Update page title and description (Task AC: AC4)
  - [ ] Update CardTitle with full system name
  - [ ] Improve CardDescription for clarity
  - [ ] Ensure MFA info is visible (already present line 163-167)
- [ ] Test login page appearance (Task AC: All)
  - [ ] Test logo loads correctly
  - [ ] Test on different screen sizes
  - [ ] Verify spelling is correct everywhere
  - [ ] Check visual appeal and professionalism

## Dev Notes

### Current Implementation

**File:** src/client/pages/LoginPage.tsx

**Current Issues:**
- Line 59-60: Generic Shield icon instead of company logo
- Line 62: "USMax NDA System" (wrong spelling)
- Line 64: "USMax credentials" (wrong spelling)
- No actual USmax branding elements

**Logo Available:**
```
https://www.usmax.com/wp-content/themes/usmax/static/images/usmax-site-logo.jpg
```

**Implementation:**
```tsx
<CardHeader className="text-center">
  <div className="mx-auto mb-4 flex justify-center">
    <img
      src="https://www.usmax.com/wp-content/themes/usmax/static/images/usmax-site-logo.jpg"
      alt="USmax"
      className="h-16 w-auto object-contain"
      onError={(e) => {
        // Fallback to Shield icon if logo fails to load
        e.currentTarget.style.display = 'none';
      }}
    />
  </div>
  <CardTitle className="text-2xl font-bold">USmax NDA Management System</CardTitle>
  <CardDescription>
    Sign in with your USmax credentials
  </CardDescription>
</CardHeader>
```

**Note:** Logo is same one used in Sidebar (src/components/layout/Sidebar.tsx line 50-54)

### Architecture Requirements

- Use existing logo URL from sidebar for consistency
- Maintain accessibility (alt text, ARIA labels)
- Responsive design (logo scales on mobile)
- Error handling if logo fails to load

### Testing Requirements

- Test logo loads successfully
- Test fallback if logo fails
- Verify spelling corrections
- Test on mobile and desktop
- Check accessibility (screen readers)

### References

- [Login Page: src/client/pages/LoginPage.tsx]
- [Sidebar Logo Reference: src/components/layout/Sidebar.tsx lines 50-54]
- [USmax Logo URL: https://www.usmax.com/wp-content/themes/usmax/static/images/usmax-site-logo.jpg]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

### Change Log

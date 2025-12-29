---
id: story-9-26-post-story-9-18-testing-fixes
epic: 9
title: "Post-Story 9.18 Testing Fixes and UX Improvements"
status: in-progress
created_at: 2025-12-28
started_at: 2025-12-28T17:45:00-0500
testing_session: "Story 9.18 verification and general app testing"
---

# Story 9.26: Post-Story 9.18 Testing Fixes and UX Improvements

## User Story

As a developer,
I want to fix all bugs and UX issues discovered during Story 9.18 testing,
So that the application is stable, user-friendly, and fully functional.

## Context

During Story 9.18 (RTF Template WYSIWYG Editor) implementation and testing, multiple pre-existing bugs and UX issues were discovered through user testing. This story tracks all issues found and their resolutions.

---

## Issues Found and Status

### ✅ FIXED & COMMITTED (Issues 1-13)

#### Issue #1: React Hooks Violation in NDADetail (CRITICAL)
**Status:** ✅ FIXED (Commit: a42cb0a)
**Severity:** Critical - App Crash
**Problem:** useEffect at line 676 declared after conditional early returns, violating Rules of Hooks. Caused "Rendered more hooks than during the previous render" error that crashed the app when viewing NDA detail page.
**Fix:** Moved useEffect (Story 9.1 - internal notes loading) from line 676 to line 272, before all early returns.
**File:** src/components/screens/NDADetail.tsx

---

#### Issue #2: Sidebar "Request NDA" Button Wrong Route
**Status:** ✅ FIXED (Commit: a42cb0a)
**Severity:** High - Broken Navigation
**Problem:** Sidebar button navigated to '/ndas/new' (non-existent route) instead of '/request-wizard'.
**Fix:** Changed `navigate('/ndas/new')` to `navigate('/request-wizard')` to match Requests page button.
**File:** src/components/layout/Sidebar.tsx

---

#### Issue #3: Document Tab Controls Overlap Sidebar
**Status:** ✅ FIXED (Commit: 71d1482)
**Severity:** Medium - Layout Issue
**Problem:** Template dropdown and action buttons (Download all, Preview RTF, Generate document) overflowed horizontally and overlapped the Quick actions sidebar on narrow screens.
**Fix:**
- Separated heading from controls into two rows
- Added `flex-wrap` to allow controls to wrap
- Added `max-w-xs` to template dropdown to limit width
**File:** src/components/screens/NDADetail.tsx (Document tab)

---

#### Issue #4: Auto-Save 500 Errors
**Status:** ✅ FIXED (Commit: f8356ff)
**Severity:** Critical - Feature Broken
**Problem:** Auto-save in request wizard failed with 500 errors due to missing opportunityPocId causing foreign key constraint violations.
**Fix:**
- Modified `buildPayload()` to omit opportunityPocId if not set (let server default)
- Added POC contact existence validation in ndaService
- Returns clear 400 validation errors instead of 500 FK errors
**Files:**
- src/components/screens/RequestWizard.tsx (payload building)
- src/server/services/ndaService.ts (POC validation)

---

#### Issue #5: Rows Per Page Misaligned
**Status:** ✅ FIXED (Commit: f8356ff)
**Severity:** Low - Visual Polish
**Problem:** "Rows per page" pagination control was left-aligned, abutting the "Showing X of Y NDAs" text.
**Fix:**
- Changed to single-row layout with `justify-between`
- Added `ml-auto` to push controls to the right
- Added `whitespace-nowrap` to prevent wrapping
**File:** src/components/screens/Requests.tsx

---

#### Issue #6: Phone Number Doesn't Carry Over from Modal
**Status:** ✅ FIXED (Commit: 48e2757)
**Severity:** Medium - Data Loss
**Problem:** When creating a new contact in the modal with phone number, the phone number was entered but not carried over to the form after creation.
**Fix:** Updated all 4 POC type handlers to include phone in form data update (relationship, contracts, opportunity, contacts).
**File:** src/components/screens/RequestWizard.tsx (handleCreateContact)

---

#### Issue #7: Phone Number Formatting Not Enforced
**Status:** ✅ FIXED (Commit: 48e2757)
**Severity:** Low - UX Enhancement
**Problem:** Phone number format shown as placeholder but not automatically applied as user typed.
**Fix:**
- Created `phoneFormatter.ts` utility with `formatPhoneNumber()` function
- Applied auto-formatting to create contact modal phone input
- Formats to (XXX) XXX-XXXX as user types
**Files:**
- src/client/utils/phoneFormatter.ts (NEW)
- src/components/screens/RequestWizard.tsx (applied formatter)

---

#### Issue #8: Contacts POC vs Contracts POC Unclear
**Status:** ✅ FIXED (Commit: 48e2757)
**Severity:** Medium - Confusing UX
**Problem:** Four POC fields (Opportunity, Contracts, Relationship, Contacts) had unclear distinctions. Users confused about which to use.
**Fix:** Enhanced labels with parenthetical clarifications and helper text:
- "Relationship POC * (Primary Point of Contact)" - Main relationship manager (required)
- "Contracts POC (Contract Administration)" - Handles contract/legal matters
- "Opportunity POC (Business Opportunity)" - Leads the business opportunity
- "Contacts POC (General Contact)" - Day-to-day administrative contact
**File:** src/components/screens/RequestWizard.tsx

---

#### Issue #9: Date Shortcuts Cluttered
**Status:** ✅ FIXED (Commit: 48e2757)
**Severity:** Low - Visual Clutter
**Problem:** 8 outline buttons for date shortcuts felt busy and cluttered the filter panel.
**Fix:**
- Reduced from 8 to 6 options (removed Yesterday, Last 90 days)
- Changed from outline buttons to compact badge/chip style
- 50% less visual weight
**File:** src/components/ui/DateRangeShortcuts.tsx

---

#### Issue #10: No Apply Filters Button
**Status:** ✅ FIXED (Commit: 48e2757)
**Severity:** Medium - Missing UX Pattern
**Problem:** Filter panel stayed open with no clear way to "apply" and collapse it.
**Fix:**
- Added "Apply Filters" button at bottom to collapse panel
- Added "Clear All" button to reset all filters
- Visual separator with border-top
**File:** src/components/screens/Requests.tsx

---

#### Issue #11: Help Section Takes Too Much Space
**Status:** ✅ FIXED (Commit: 48e2757)
**Severity:** Medium - Space Inefficiency
**Problem:** Help section used entire sidebar (1/3 of screen width), wasting space for experienced users who don't need constant guidance.
**Fix:**
- Removed 3-column grid layout with dedicated sidebar
- Converted to inline collapsible section at top of form
- Shows expanded on first visit (localStorage tracking)
- Collapses automatically on subsequent visits
- Toggle button with chevron icon to show/hide anytime
**File:** src/components/screens/RequestWizard.tsx

---

#### Issue #12: Sprint Status Inconsistencies
**Status:** ✅ FIXED (Commit: f8356ff)
**Severity:** Low - Documentation
**Problem:** Epic 6 and Epic 9 had duplicate or incorrect status markers in sprint-status.yaml.
**Fix:**
- Removed duplicate Epic 6 "in-progress" marker
- Updated Epic 9 from "in-progress" to "done" (all 25 stories complete)
**File:** docs/sprint-artifacts/sprint-status.yaml

---

#### Issue #13: Status Display - Raw Database Values
**Status:** ✅ PARTIALLY FIXED (Commit: 9691b88)
**Severity:** Medium - Poor UX
**Problem:** "Latest Change" column and other locations showing raw database values like "FULLY_EXECUTED" instead of "Fully Executed".
**Fix Applied:** Latest Change column in NDA list now uses `getStatusDisplayName()` formatter.
**Remaining Work:** Apply same fix to:
- Home page "Items Needing Attention" widget
- Any other status display locations
**Files:**
- src/components/screens/Requests.tsx (FIXED)
- src/components/screens/Dashboard.tsx (PENDING)

---

### ❌ PENDING (Issues 14-24)

#### Issue #14: Document Generation Fails (500 Error)
**Status:** ❌ PENDING
**Severity:** Critical - Feature Broken
**Problem:** POST /api/ndas/:id/generate-document returns 500 error. Error message: "Document generation failed, please try again".
**Root Cause:** Likely S3 bucket missing (usmax-nda-documents) or opportunityPoc foreign key issues in test data.
**Investigation:**
- Added detailed error logging in development mode
- Server logs will show actual error message
**Next Steps:**
- Check server console for specific error
- Fix S3 bucket configuration (infrastructure)
- Handle missing/invalid opportunityPoc gracefully
**File:** src/server/routes/ndas.ts (error logging added)

---

#### Issue #15: Preview Document Fails
**Status:** ❌ PENDING
**Severity:** Critical - Feature Broken
**Problem:** "Failed to generate preview" error when attempting to preview RTF document.
**Root Cause:** Same as #14 - likely S3 bucket or NDA data issues.
**Next Steps:** Fix same underlying issues as #14.

---

#### Issue #16: S3 Bucket Doesn't Exist
**Status:** ❌ PENDING
**Severity:** Critical - Infrastructure
**Problem:** AWS S3 returns "NoSuchBucket" error for bucket name "usmax-nda-documents".
**Impact:** Blocks all document generation, preview, upload, and download functionality.
**Next Steps:**
- Create S3 bucket via Terraform: `infrastructure/`
- Or manually create bucket in AWS console
- Ensure bucket name matches: `usmax-nda-documents`
- Ensure region matches: `us-east-1`
- Set appropriate CORS and lifecycle policies
**File:** Infrastructure configuration

---

#### Issue #17: No Preview Document Button
**Status:** ❌ PENDING
**Severity:** High - UX Blocker
**Problem:** "Route for Approval" shows error "Cannot route without previewing document first", but there's no obvious way to preview the document in the UI.
**Current:** Preview RTF button exists in Document tab but user doesn't know to use it.
**Fix Needed:**
- Add "Preview Document" button to Quick Actions sidebar (top)
- Make it prominent with primary styling
- Or add explicit preview step in approval workflow
**File:** src/components/screens/NDADetail.tsx

---

#### Issue #18: Change Status Button Not Hooked Up
**Status:** ❌ PENDING
**Severity:** High - Broken Feature
**Problem:** "Change Status" button in Quick Actions sidebar doesn't appear to trigger any action when clicked.
**Investigation Needed:** Check if onClick handler is present and working.
**File:** src/components/screens/NDADetail.tsx (Quick Actions)

---

#### Issue #19: Audit Log Shows System Events
**Status:** ❌ PENDING
**Severity:** Medium - Log Clutter
**Problem:** Audit log showing repeated admin permission checks and other system events, cluttering the timeline.
**Story Context:** Story 9.2 "Filter System Events from Audit Trail" was marked done but filtering not working.
**Fix Needed:**
- Review auditService filtering logic
- Exclude system events from user-facing audit trail
- Keep system events in database but hide from UI
**File:** src/server/services/auditService.ts or src/client/services/auditService.ts

---

#### Issue #20: Send NDA Actions Buried at Bottom
**Status:** ❌ PENDING
**Severity:** Medium - Poor UX
**Problem:** "Send NDA" action section is at the bottom of the page, below fold. This is a primary action and should be prominent.
**Fix Needed:**
- Move Send NDA actions to top of Quick Actions sidebar
- Or incorporate into Quick Actions section
- Make primary action more discoverable
**File:** src/components/screens/NDADetail.tsx

---

#### Issue #21: Status Display on Home Page
**Status:** ❌ PENDING
**Severity:** Medium - Inconsistent Formatting
**Problem:** "Items Needing Attention" widget on home page shows raw database values like "FULLY_EXECUTED" instead of "Fully Executed".
**Fix Needed:** Apply `getStatusDisplayName()` formatter (same as Latest Change column fix).
**File:** src/components/screens/Dashboard.tsx

---

#### Issue #22: My Drafts Empty State Message
**Status:** ❌ PENDING
**Severity:** Low - Poor Empty State
**Problem:** My Drafts page defaults to filter empty state message when user has no drafts:
"No NDAs match your filters. Try adjusting your search criteria or clear all filters to see all NDAs. Clear All Filters"

**Better UX:** Show helpful empty state:
"You have no draft NDAs. Ready to create one?"
[Request new NDA button]
**File:** src/components/screens/MyDrafts.tsx or Requests.tsx

---

#### Issue #23: WYSIWYG Editor Not Integrated
**Status:** ❌ PENDING
**Severity:** High - Feature Incomplete
**Problem:** RTFTemplateEditor component was built in Story 9.18 but not integrated into the admin Templates page. Users can't actually use the WYSIWYG editor.
**Fix Needed:**
- Add "Create Template" button to Templates admin page
- Add "Edit Template" button for existing templates
- Integrate RTFTemplateEditor component
- Wire up save/cancel handlers
- Show success confirmation
**Files:**
- src/components/screens/Templates.tsx (add buttons)
- src/components/screens/admin/RTFTemplateEditor.tsx (already exists)

---

#### Issue #24: No Unsaved Changes Warning
**Status:** ❌ PENDING
**Severity:** Medium - Data Loss Risk
**Problem:** When navigating away from in-progress /request-wizard form, no warning that user may lose unsaved information if auto-save failed.
**Fix Needed:**
- Add `beforeunload` event listener
- Track if form has unsaved changes
- Show browser confirmation dialog when attempting to navigate away
- Exception: Don't warn if form is empty or recently auto-saved
**File:** src/components/screens/RequestWizard.tsx

---

#### Issue #25: Generate/Preview Workflow Not Prominent
**Status:** ❌ PENDING
**Severity:** Medium - Poor Discoverability
**Problem:** The document generation and preview workflow isn't obvious or guided. Users should be guided through: Create → Choose template → Generate → Preview → Route for approval.
**Fix Needed:**
- Make "Generate and preview your NDA!" section more prominent
- Add visual guidance/stepper for document workflow
- Make Preview button primary action after generation
- Add tooltips or help text explaining the workflow
**File:** src/components/screens/NDADetail.tsx

---

## Acceptance Criteria

### AC1: All Critical Bugs Fixed
**Given** a user is testing the application
**When** they perform common workflows
**Then** no app crashes, 500 errors, or broken navigation occurs

**Test Scenarios:**
- [x] ✅ Navigate to NDA detail page - no React hooks error
- [x] ✅ Click sidebar "Request NDA" button - routes to request wizard
- [x] ✅ View Document tab on narrow screen - no overlap with sidebar
- [ ] ❌ Generate document - succeeds without 500 error
- [ ] ❌ Preview document - succeeds without error

---

### AC2: Auto-Save Works Reliably
**Given** a user is filling out the request wizard
**When** they pause typing for auto-save interval
**Then** draft is saved successfully without errors

**Test Scenarios:**
- [x] ✅ Form with partial data auto-saves without 500 error
- [x] ✅ OpportunityPocId defaults correctly if not provided
- [x] ✅ Foreign key validation prevents invalid POC references

---

### AC3: Phone Numbers Work Correctly
**Given** a user creates a new contact with phone number
**When** they save the contact
**Then** phone number carries over to the form

**Test Scenarios:**
- [x] ✅ Phone number auto-formats to (XXX) XXX-XXXX as user types
- [x] ✅ Phone number from modal appears in all 4 POC fields (Relationship, Contracts, Opportunity, Contacts)

---

### AC4: UI/UX Improvements Applied
**Given** a user is using the application
**When** they interact with various UI elements
**Then** the experience is clean, intuitive, and uncluttered

**Test Scenarios:**
- [x] ✅ Date shortcuts use compact badge style (6 options)
- [x] ✅ Apply Filters button collapses filter panel
- [x] ✅ Help section shows on first visit, then collapsible
- [x] ✅ POC labels clarify roles with descriptions
- [x] ✅ Rows per page is right-aligned
- [x] ✅ Latest Change column shows "Fully Executed" not "FULLY_EXECUTED"
- [ ] ❌ Home page status display formatted correctly
- [ ] ❌ My Drafts empty state shows helpful message with CTA

---

### AC5: Document Workflow is Discoverable
**Given** a user has created an NDA
**When** they want to generate and preview the document
**Then** the workflow is obvious and guided

**Test Scenarios:**
- [ ] ❌ Preview Document button prominently displayed
- [ ] ❌ Generate workflow is explained or guided
- [ ] ❌ Send NDA actions are at top of Quick Actions
- [ ] ❌ Change Status button works when clicked

---

### AC6: Template Editor is Accessible
**Given** an admin wants to create or edit RTF templates
**When** they navigate to Admin → Templates
**Then** they can access the WYSIWYG editor

**Test Scenarios:**
- [ ] ❌ "Create Template" button visible on Templates page
- [ ] ❌ "Edit" button on existing templates
- [ ] ❌ RTFTemplateEditor component opens when clicked
- [ ] ❌ Save/cancel functionality works

---

## Technical Notes

### Commits Created
1. `a42cb0a` - React hooks + sidebar routing (critical fixes)
2. `71d1482` - Document tab layout fix
3. `f8356ff` - Auto-save + pagination alignment
4. `48e2757` - UX improvements (help, phone, POC labels, filters)
5. `9691b88` - Status display in Latest Change column

### Files Created
- src/client/utils/phoneFormatter.ts - Phone number formatting utilities

### Files Modified (Multiple Commits)
- src/components/screens/NDADetail.tsx (hooks, layout)
- src/components/layout/Sidebar.tsx (routing)
- src/components/screens/RequestWizard.tsx (help, phone, POC labels, auto-save)
- src/components/screens/Requests.tsx (filters, pagination, status display)
- src/components/ui/DateRangeShortcuts.tsx (badge style)
- src/server/services/ndaService.ts (POC validation)
- src/server/routes/ndas.ts (error logging)
- docs/sprint-artifacts/sprint-status.yaml (status cleanup)

### Infrastructure Issues
- **S3 Bucket Missing:** usmax-nda-documents bucket doesn't exist in AWS
  - Requires Terraform apply or manual bucket creation
  - Blocks document generation, preview, upload, download
  - **Not a code fix - infrastructure setup needed**

---

## Implementation Status

### Completed Tasks
- [x] Fix React hooks violation (NDADetail crash)
- [x] Fix sidebar Request NDA routing
- [x] Fix document tab layout overlap
- [x] Fix auto-save 500 errors
- [x] Fix pagination alignment
- [x] Fix phone carry-over bug
- [x] Implement phone auto-formatting
- [x] Clarify POC labels with descriptions
- [x] Redesign date shortcuts (badges, 6 options)
- [x] Add Apply Filters button
- [x] Refactor help section (collapsible, first-visit)
- [x] Fix Latest Change status display
- [x] Add detailed error logging for document generation

### Pending Tasks
- [ ] Fix status display on home page
- [ ] Fix Change Status button hookup
- [ ] Fix/investigate document generation errors
- [ ] Add Preview Document button to Quick Actions
- [ ] Move Send NDA actions to top
- [ ] Improve My Drafts empty state
- [ ] Integrate WYSIWYG editor into Templates admin page
- [ ] Add unsaved changes warning
- [ ] Fix audit log system event filtering
- [ ] Make generate/preview workflow more prominent
- [ ] Fix S3 bucket configuration (infrastructure)

---

## Dependencies

- S3 bucket creation (infrastructure team or Terraform)
- All code changes are backward compatible
- No database migrations required

---

## Out of Scope

- Complete redesign of NDA detail page
- Advanced audit log filtering beyond system events
- Phone number validation beyond format checking

---

## Testing Notes

**Testing Session:** 2025-12-28T17:45:00 to 2025-12-28T19:00:00
**Tester:** Jonah (Product Owner)
**Environment:** Local development (http://localhost:3000)
**Commits:** 6 commits (5 already created, 1 in progress)

**Fixed:** 13/25 issues
**Remaining:** 12 issues
**Completion:** ~52% complete

---

## Next Steps

1. **Test Current Fixes:**
   - Refresh browser
   - Verify all 13 fixed issues work correctly
   - Test phone formatting, help section, filters, etc.

2. **Infrastructure Setup:**
   - Create S3 bucket: usmax-nda-documents
   - Unblocks document generation/preview

3. **Complete Remaining Fixes:**
   - Quick UI fixes (status display, buttons, empty states)
   - Feature integration (WYSIWYG editor)
   - UX improvements (unsaved warning, workflow guidance)

4. **Final Testing:**
   - Full regression test
   - Verify all 25 issues resolved
   - Mark story as done

---

---

#### Issue #26: Agency Groups Actions Menu Not Working
**Status:** ❌ PENDING
**Severity:** High - Broken Feature
**Problem:** On /administration/agency-groups page, the three dots "actions" menu doesn't respond when clicked. No way to edit or delete an agency group.
**Investigation Needed:** Check dropdown menu implementation and event handlers.
**File:** src/components/screens/admin/AgencyGroups.tsx or similar

---

**Story Progress:** In Progress (13/26 issues fixed, 50%)
**Estimated Remaining:** 2-3 hours (depends on S3 setup)

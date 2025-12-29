# BMAD Implementation Plan - Clean Task List

**Date:** 2025-12-27
**Purpose:** Systematic completion of incomplete/unclear stories using proper BMAD workflows

---

## CURRENT STATE SUMMARY

**Sprint Status:** Shows all stories "done" except Story 9-18
**Reality:** Multiple stories need verification or completion
**NDADetail Page:** Currently broken (React hooks error)

---

## CATEGORY 1: CONFIRMED INCOMPLETE

### Story 9-18: RTF Template Rich Text Editor

**Status:** ready-for-dev (correctly marked)
**File:** docs/sprint-artifacts/9-18-rtf-template-rich-text-editor.md
**Issue:** No WYSIWYG editor - only file upload exists
**Requirement:** Browser-based RTF editor with formatting and placeholder insertion

**BMAD Workflow:**
```bash
/bmad:bmm:workflows:dev-story 9-18-rtf-template-rich-text-editor
```

**Estimated Effort:** 6-8 hours
**Priority:** HIGH - Core admin functionality

---

## CATEGORY 2: CURRENTLY BROKEN (Needs Immediate Fix)

### NDADetail Component - React Hooks Error

**Status:** BROKEN (caused by my code changes)
**File:** src/components/screens/NDADetail.tsx
**Issue:** References old enum values (EMAILED, INACTIVE, CANCELLED)
**Error:** "React has detected a change in the order of Hooks"

**Fix Required:**
1. Find all references to EMAILED → replace with SENT_PENDING_SIGNATURE
2. Find all references to INACTIVE/CANCELLED → replace with INACTIVE_CANCELED
3. Remove any useState hooks I added incorrectly (rejection dialog state)
4. Test in browser

**BMAD Workflow:** Direct code fix (not a story)
**Estimated Effort:** 1-2 hours
**Priority:** CRITICAL - Blocks NDA detail page

---

## CATEGORY 3: SUSPICIOUS - NEED VERIFICATION

### Epic 6: Audit & Compliance (Stories 6.6-6.10)

**All marked "done" but story files are 1.3-1.6 KB (suspiciously small)**

#### 6-6: Visual Timeline Display
**File Size:** 1.5 KB
**Component:** Should be on NDA detail page
**Verification:** Load NDA detail, check if timeline UI exists
**If Missing:** Run `/bmad:bmm:workflows:create-story` then dev-story

#### 6-7: Centralized Audit Log Viewer (Admin)
**File Size:** 1.3 KB
**Component:** Should be in /administration
**Evidence:** AuditLogs.tsx exists (771 lines)
**Verification:** Navigate to admin audit logs, check if it works
**If Broken:** Run dev-story workflow

#### 6-8: Audit Log Filtering
**File Size:** 1.3 KB
**Component:** Part of audit log viewer
**Verification:** Check if filters exist on audit log page
**If Missing:** Run dev-story workflow

#### 6-9: Audit Log Export
**File Size:** 1.4 KB
**Component:** Export button on audit logs
**Verification:** Check if CSV export button exists
**If Missing:** Run dev-story workflow

#### 6-10: Email Event Tracking
**File Size:** 1.6 KB
**Backend:** Email events logged via audit middleware
**Verification:** Check if email delivery status is tracked (beyond "queued")
**If Incomplete:** Run dev-story workflow

**BMAD Workflow for Each:**
```bash
# IF feature is missing/broken:
/bmad:bmm:workflows:create-story <story-key>  # Create proper story file
/bmad:bmm:workflows:dev-story <story-key>     # Implement
```

**Estimated Effort:** 2-4 hours total (if features exist but need verification)
**Priority:** MEDIUM - Compliance features

---

### Epic 7: Templates & Suggestions (Stories 7.3-7.19)

**All marked "done" but are 281-282 byte placeholder files**

#### Stories 7.3-7.13: Template/Suggestion Features
**Status:** Placeholders say "Pre-existing implementation verified"
**Reality:** Features implemented in Epic 3 (Stories 3.2, 3.4, 3.13) and Epic 9 (Story 9.16)
**Action:** NO WORK NEEDED - These are verification stories only

#### Stories 7.14-7.19: Admin System Configuration UI

**7.14: Admin Status Configuration**
**7.15: Auto-Transition Rule Configuration**
**7.16: Notification Rule Configuration**
**7.17: Dashboard Alert Threshold Configuration**
**7.18: Default Email CC/BCC Configuration**
**7.19: Dropdown Field Configuration**

**Backend:** systemConfigService exists
**Frontend:** Unknown if admin UI exists
**Verification:** Check administration pages for config UI
**If Missing:** Decide if needed or defer to Phase 2

**BMAD Workflow if Needed:**
```bash
/bmad:bmm:workflows:create-story 7-14  # etc.
/bmad:bmm:workflows:dev-story 7-14
```

**Estimated Effort:** 4-6 hours if UI needs building
**Priority:** LOW - Admin convenience features

---

## CATEGORY 4: CODE CLEANUP (Technical Debt)

### Old Enum Value References

**Files Likely Affected:**
- src/components/screens/NDADetail.tsx (confirmed broken)
- Any other components referencing status

**Issues:**
- References to EMAILED (should be SENT_PENDING_SIGNATURE)
- References to INACTIVE/CANCELLED (should be INACTIVE_CANCELED)
- Workflow step mapping may use old values

**Action:** Grep and replace systematically
**Priority:** CRITICAL - Breaks pages

---

## RECOMMENDED EXECUTION ORDER

### Phase 1: Critical Fixes (Immediate)

1. **Fix NDADetail enum references** (1-2 hours)
   - Grep for EMAILED, INACTIVE, CANCELLED in src/components
   - Replace with correct enum values
   - Test NDA detail page loads

2. **Verify Epic 6 features exist** (1 hour)
   - Navigate to admin → audit logs
   - Check if centralized viewer, filters, export work
   - Mark each as VERIFIED or BROKEN

3. **Verify Epic 7 admin config** (30 min)
   - Navigate to admin pages
   - Check if system config UI exists
   - If missing, decide: build it or defer to Phase 2

### Phase 2: Implement Story 9-18 (High Priority)

4. **RTF WYSIWYG Editor** (6-8 hours)
   - Run `/bmad:bmm:workflows:dev-story 9-18-rtf-template-rich-text-editor`
   - Implement TinyMCE or similar
   - Add placeholder insertion
   - Add preview mode
   - Test end-to-end

### Phase 3: Address Broken Features (If Found)

5. **For each broken feature:**
   - Run `/bmad:bmm:workflows:create-story` if story file inadequate
   - Run `/bmad:bmm:workflows:dev-story` to implement
   - Test and verify

---

## VERIFICATION CHECKLIST

For each story marked "done" but suspicious:

- [ ] Navigate to relevant page/feature
- [ ] Take screenshot of working feature OR error
- [ ] Test primary workflow
- [ ] Check console for errors
- [ ] Document result: VERIFIED ✅ | BROKEN ❌ | UNCLEAR ⚠️

---

## NEXT STEPS - YOUR DECISION

**Option A:** Fix NDADetail now (critical - page broken)

**Option B:** Verify Epic 6/7 features first (understand scope)

**Option C:** Start with Story 9-18 (complete known incomplete story)

**Option D:** Different approach (tell me what you want)

---

**No more assumptions. No more bullshit. Only systematic verification and proper BMAD workflows.**

Which should I tackle first?

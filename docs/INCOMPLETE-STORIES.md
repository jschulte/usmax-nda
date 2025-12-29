# Actually Incomplete Stories - For BMAD Implementation

**Date:** 2025-12-27
**Purpose:** Honest list of stories that need proper implementation with BMAD workflows

---

## CONFIRMED INCOMPLETE

### Story 9.18: RTF Template Rich Text Editor
**Status:** ready-for-dev
**Sprint Status:** ready-for-dev ✓ (correctly marked)
**Issue:** No WYSIWYG editor - admins must use Word/LibreOffice
**Current:** File upload UI (better than base64 but not the requirement)
**Requirement:** Browser-based RTF editor with formatting, placeholder insertion
**BMAD Workflow Needed:** `/bmad:bmm:workflows:dev-story 9-18`

---

## SUSPICIOUS - NEED VERIFICATION

### Epic 6 Small Stories (Audit & Compliance)

**6.6: Visual Timeline Display**
- File size: 1.5 KB
- Sprint status: done
- Evidence: Story file suspiciously small
- Need: Test if timeline UI exists on NDA detail page

**6.7: Centralized Audit Log Viewer (Admin)**
- File size: 1.3 KB
- Sprint status: done
- Evidence: Story file suspiciously small
- Found: AuditLogs.tsx component exists (771 lines)
- Need: Test if admin audit log page works

**6.8: Audit Log Filtering**
- File size: 1.3 KB
- Sprint status: done
- Evidence: Story file suspiciously small
- Need: Test if filters work on audit log page

**6.9: Audit Log Export**
- File size: 1.4 KB
- Sprint status: done
- Evidence: Story file suspiciously small
- Need: Test if CSV export button exists and works

**6.10: Email Event Tracking**
- File size: 1.6 KB
- Sprint status: done
- Evidence: Story file suspiciously small
- Need: Verify what email events are actually tracked

**Action:** Test each feature in browser, then either:
- Mark as VERIFIED WORKING
- OR create proper story with `/bmad:bmm:workflows:create-story` and implement

---

### Epic 7 Admin Configuration UI (Stories 7.14-7.19)

**All stories marked "done" but are 282-byte placeholders:**

**7.14: Admin Status Configuration UI**
- Backend: systemConfigService exists
- Frontend: Unknown if UI exists
- Need: Test if admin can configure statuses

**7.15: Auto-Transition Rule Configuration UI**
- Backend: Rules in statusTransitionService
- Frontend: Unknown if admin UI exists
- Need: Test if admin can configure rules

**7.16: Notification Rule Configuration UI**
- Backend: Notification service exists
- Frontend: Unknown if admin UI exists
- Need: Test if admin can configure notifications

**7.17: Dashboard Alert Threshold Configuration UI**
- Backend: Dashboard service exists
- Frontend: Unknown if admin UI exists
- Need: Test if admin can configure thresholds

**7.18: Default Email CC/BCC Configuration UI**
- Backend: systemConfig has defaults
- Frontend: Unknown if admin UI exists
- Need: Test if admin can set defaults

**7.19: Dropdown Field Configuration UI**
- Backend: Unknown
- Frontend: Unknown
- Need: Understand what this means and test

**Action:** Test admin pages, then either:
- Mark as VERIFIED WORKING
- OR create proper stories and implement missing UIs

---

## VERIFICATION STRATEGY

For each suspicious story:

1. **Test in browser** with actual clicks/navigation
2. **Screenshot evidence** of working or error
3. **Mark result:**
   - ✅ VERIFIED WORKING - Update story file with evidence
   - ❌ BROKEN - Create issue, run `/bmad:bmm:workflows:dev-story`
   - ⚠️ UNCLEAR - Need customer clarification on requirements

---

## NEXT STEPS

1. **Fix NDADetail crash** (immediate)
2. **Test Epic 6 stories 6.6-6.10** (browser verification)
3. **Test Epic 7 admin config** (browser verification)
4. **For each incomplete:** Run proper BMAD workflow
5. **Update sprint-status.yaml** with honest status

---

**No more assumptions. Only tested facts.**

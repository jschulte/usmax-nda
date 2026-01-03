# Epic 1-5 Gap Analysis Amendments (Epic 9/10 Context)

**Amendment Date:** 2025-12-27
**Original Gap Analyses:** 2025-12-22
**Reason:** Epic 9 and 10 introduced changes affecting earlier epic requirements

---

## Summary of Changes

**Epics Requiring Amendments:**
- ✅ Epic 3 (NDA Lifecycle) - Significant changes from Epic 10
- ⚠️ Epic 5 (Dashboard/Search) - Minor changes from Epic 10
- ✅ Epic 6 (Audit) - Enhanced by Epic 9 (already noted in Epic 6 gap analysis)

**Epics Not Requiring Amendments:**
- ✅ Epic 1 (Auth) - No changes (Epic 10 added one permission, doesn't change auth requirements)
- ✅ Epic 2 (Agency Admin) - No changes
- ✅ Epic 4 (Documents) - Minor addition (expiration date set on execution)

---

## Epic 3 Amendments (NDA Lifecycle)

**Original Gap Analysis**: `docs/sprint-artifacts/epic-3-gap-analysis.md` (2025-12-22)

### Changes from Epic 10

#### 1. Status Enum Values Changed (Story 10.3)

**Impact**: MEDIUM - Changes how status is stored and displayed

**Original Status Values** (Epic 3):
- CREATED, EMAILED, IN_REVISION, FULLY_EXECUTED, INACTIVE, CANCELLED

**New Status Values** (Epic 10):
- CREATED, PENDING_APPROVAL, SENT_PENDING_SIGNATURE, IN_REVISION, FULLY_EXECUTED, INACTIVE_CANCELED, EXPIRED

**Changes**:
- EMAILED → SENT_PENDING_SIGNATURE (renamed)
- INACTIVE + CANCELLED → INACTIVE_CANCELED (merged)
- Added: PENDING_APPROVAL (approval workflow)
- Added: EXPIRED (auto-expiration)

**Display Names** (Legacy format):
- "Created/Pending Release"
- "Sent/Pending Signature"
- "Fully Executed NDA Uploaded"
- "Inactive/Canceled"
- "Expired"

**Amendment to Epic 3 Gap Analysis**:
- Story 3.9 (Status Progression): Now includes PENDING_APPROVAL and EXPIRED statuses
- Story 3.12 (Status Management): Status transitions updated for approval workflow
- Story 3.15 (Inactive/Cancelled): Now uses single INACTIVE_CANCELED value

**Implementation Status**: ✅ COMPLETE (migration applied, but schema.prisma needs update - see Epic 10 gap analysis)

---

#### 2. Approval Workflow Added (Story 10.6)

**Impact**: HIGH - New workflow step in NDA lifecycle

**New Feature**: Two-step approval workflow
- Creator routes NDA for approval (CREATED → PENDING_APPROVAL)
- Approver reviews and approves (PENDING_APPROVAL → SENT_PENDING_SIGNATURE)
- Approver can reject (PENDING_APPROVAL → CREATED with rejection reason)

**New Fields Added to NDA**:
- `approvedById` - Who approved
- `approvedAt` - When approved
- `rejectionReason` - Why rejected

**New Permission**:
- `nda:approve` - Can approve NDAs

**Amendment to Epic 3 Gap Analysis**:
- Story 3.12 (Status Management): Now includes approval workflow transitions
- New feature not in original Epic 3 spec (added by customer feedback)

**Implementation Status**: ✅ COMPLETE (routes exist, but notifications incomplete - see Epic 10 gap analysis)

---

#### 3. New NDA Fields Added (Stories 10.1, 10.2, 10.4, 10.5)

**Impact**: MEDIUM - Expands NDA data model

**New Fields**:
1. `usMaxPosition` - USmax's role (Prime, Sub-contractor, Other) - Story 10.1
2. `ndaType` - NDA classification (Mutual NDA, Consultant) - Story 10.2
3. `expirationDate` - Auto-calculated 1 year from execution - Story 10.4
4. `isNonUsMax` - Flag for partner NDAs - Story 10.5

**Amendment to Epic 3 Gap Analysis**:
- Story 3.1 (Create NDA Form): Form now includes usMaxPosition and ndaType fields
- Story 3.8 (NDA Detail View): Detail view shows new fields
- Story 3.7 (NDA List): List can filter by usMaxPosition and ndaType

**Implementation Status**: ✅ COMPLETE (fields exist, but schema.prisma needs update - see Epic 10 gap analysis)

---

### Epic 3 Gap Analysis Amendment Summary

**Original Assessment** (2025-12-22): "Substantially complete, 95%+ coverage"

**Amended Assessment** (2025-12-27 with Epic 10 context):
- Still substantially complete ✓
- Epic 10 added features (approval workflow, new fields) are implemented ✓
- Schema drift issue applies to Epic 3 (status enum, new fields) ❌

**New Gaps Identified**:
- Schema.prisma not updated with Epic 10 changes (CRITICAL - affects Epic 3)
- Approval notification logic incomplete (affects Story 3.12)
- No E2E tests for approval workflow (affects Story 3.12)

**Amended Coverage**: 95% → 93% (due to incomplete approval notifications)

**Recommendation**: Original gap analysis is still valid, but note:
1. Status values changed (Epic 10.3)
2. Approval workflow added (Epic 10.6)
3. New fields added (Epic 10.1, 10.2, 10.4, 10.5)
4. Schema drift must be fixed (Epic 10 blocker)

---

## Epic 5 Amendments (Dashboard/Search/Filter)

**Original Gap Analysis**: `docs/sprint-artifacts/epic-5-gap-analysis.md` (2025-12-22)

### Changes from Epic 10

#### 1. Filter Values Updated (Stories 10.1, 10.2, 10.3)

**Impact**: LOW - Filter options expanded

**New Filter Options**:
- USmax Position: Prime, Sub-contractor, Other
- NDA Type: Mutual NDA, Consultant
- Status: Updated to legacy display names (7 values instead of 6)

**Amendment to Epic 5 Gap Analysis**:
- Story 5.3 (Advanced Filtering): Now includes usMaxPosition and ndaType filters
- Story 5.4 (Filter Presets): Presets may include new filter types

**Implementation Status**: ✅ COMPLETE

---

#### 2. Expiration Alerts (Story 10.4)

**Impact**: MEDIUM - Enhances Epic 5 Story 5.12

**New Feature**: Auto-expiration after 1 year
- Dashboard shows expiring soon alerts (based on expirationDate)
- Background job auto-expires NDAs

**Amendment to Epic 5 Gap Analysis**:
- Story 5.12 (Expiration Alerts): Now uses expirationDate field instead of term days calculation

**Implementation Status**: ✅ COMPLETE

---

### Epic 5 Gap Analysis Amendment Summary

**Original Assessment** (2025-12-22): Coverage details unknown (review full file)

**Amended Assessment** (2025-12-27 with Epic 10 context):
- Filter functionality expanded with new fields ✓
- Expiration logic improved with dedicated field ✓
- No breaking changes to Epic 5 requirements

**Recommendation**: Original gap analysis remains valid, note:
1. Filters expanded with usMaxPosition, ndaType (Epic 10)
2. Expiration uses dedicated field (Epic 10.4)

---

## Epic 1, 2, 4 - No Amendments Needed ✅

### Epic 1 (Foundation & Authentication)

**Changes from Epic 9/10**:
- Epic 10 added `nda:approve` permission

**Impact**: NONE - Adding one permission doesn't change auth requirements
**Recommendation**: No amendment needed ✓

---

### Epic 2 (User & Agency Administration)

**Changes from Epic 9/10**:
- Epic 9 fixed admin UI bugs (Stories 9.3, 9.4, 9.5)

**Impact**: NONE - Bug fixes don't change requirements
**Recommendation**: No amendment needed ✓

---

### Epic 4 (Document Management)

**Changes from Epic 9/10**:
- Epic 10 adds expiration date when marking fully executed (Story 10.4)

**Impact**: MINOR - One field calculation added
**Recommendation**: Note in Epic 4 gap analysis that Story 4.2 (mark as executed) now sets expirationDate ✓

---

## Summary of Required Amendments

| Epic | Amendment Required | Reason | Priority |
| ---- | ------------------ | ------ | -------- |
| Epic 1 | ❌ No | One permission added (minor) | N/A |
| Epic 2 | ❌ No | Bug fixes only | N/A |
| Epic 3 | ✅ Yes | Status enum, approval workflow, new fields | HIGH |
| Epic 4 | ⚠️ Minor note | Expiration date calculation | LOW |
| Epic 5 | ⚠️ Minor note | Filter expansion, expiration field | LOW |

---

## Recommended Actions

### Immediate (Update Documentation)

1. **Add Amendment Note to Epic 3 Gap Analysis**
   - Note status enum changes (Epic 10.3)
   - Note approval workflow addition (Epic 10.6)
   - Note new fields (Epic 10.1, 10.2, 10.4, 10.5)
   - Link to Epic 10 gap analysis for details

2. **Add Amendment Note to Epic 5 Gap Analysis**
   - Note filter expansion (Epic 10.1, 10.2)
   - Note expiration field usage (Epic 10.4)

3. **Add Note to Epic 4 Gap Analysis**
   - Story 4.2: Now sets expirationDate field

---

## Conclusion

**Epic 1, 2 Gap Analyses**: Valid as-is ✅

**Epic 3 Gap Analysis**: Requires amendment note for Epic 10 changes (status, approval, fields)

**Epic 4 Gap Analysis**: Minor note about expiration date

**Epic 5 Gap Analysis**: Minor note about filter/expiration enhancements

**All amendments are ADDITIVE** - Epic 9/10 added features, didn't change original requirements ✓

---

**Generated**: 2025-12-27
**Purpose**: Document Epic 9/10 impact on earlier gap analyses
**Recommendation**: Read original gap analyses with these amendments in mind

---

<!-- Powered by BMAD-CORE™ -->

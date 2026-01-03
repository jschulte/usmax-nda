# Code Review Report - Story 6-2

## Summary
- Issues Found: 4
- Issues Fixed: 4
- Categories Reviewed: security, data integrity, testing, code quality
- Supabase advisors: not available in this environment

## Issues Detail

### Issue 1: Agency group updates logged raw input instead of FieldChange[]
- **Severity:** medium
- **Category:** data integrity
- **File:** src/server/services/agencyGroupService.ts:379
- **Problem:** `changes` stored raw input with `any` cast, violating the FieldChange[] contract.
- **Risk:** Inconsistent audit trail format and inability to query/format changes reliably.
- **Fix Applied:** Compute changes via `detectFieldChanges` and store FieldChange[].

### Issue 2: Subagency updates logged partial input map (not FieldChange[])
- **Severity:** medium
- **Category:** data integrity
- **File:** src/server/services/subagencyService.ts:320
- **Problem:** `changes` stored a partial object map instead of structured change array.
- **Risk:** Breaks audit trail consistency across entity types.
- **Fix Applied:** Build before/after objects and store FieldChange[] from `detectFieldChanges`.

### Issue 3: Draft auto-save logged `input as any`
- **Severity:** medium
- **Category:** code quality
- **File:** src/server/services/ndaService.ts:1660
- **Problem:** `updateDraft` logged raw input with `any`, bypassing change detection.
- **Risk:** Audit entries include unchanged fields and violate FieldChange[] schema.
- **Fix Applied:** Added before/after computation and `detectFieldChanges` for drafts.

### Issue 4: updateDraft tests mocked wrong module path
- **Severity:** low
- **Category:** testing
- **File:** src/server/services/__tests__/ndaService.test.ts:96
- **Problem:** Mocked `../utils/scopedQuery.js` from the wrong relative path, causing real DB calls.
- **Risk:** Flaky tests and unintended DB interactions.
- **Fix Applied:** Corrected mock path to `../../utils/scopedQuery.js` and added default setup.

## Security Checklist
- [x] No credential exposure
- [x] Input validation present
- [x] Audit logs remain append-only

## Performance Checklist
- [x] No new N+1 queries
- [x] No additional heavy queries introduced

## Final Status
All issues resolved. Tests passing (targeted):
- `pnpm test:run src/server/services/__tests__/agencyGroupService.test.ts src/server/services/__tests__/subagencyService.test.ts`
- `pnpm test:run src/server/services/__tests__/ndaService.test.ts -t updateDraft`

Reviewed by: DEV (adversarial)
Reviewed at: 2026-01-03

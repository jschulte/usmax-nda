# Code Review Report - Story 6-4-login-attempt-tracking

## Summary
- Issues Found: 5
- Issues Fixed: 5
- Categories Reviewed: security, performance, error-handling, testing, quality, architecture
- Supabase advisors: unavailable in this environment (skipped)

## Issues Detail

### Issue 1: Unsafe JSON access with `any` in security monitoring mapping
- **Severity:** low
- **Category:** quality
- **File:** src/server/utils/securityMonitoring.ts:127
- **Problem:** Details were previously accessed via `any`, allowing unsafe property access and violating project standards.
- **Risk:** Runtime errors if `details` is not an object; loss of type safety.
- **Fix Applied:** Added JSON object guard and typed helpers for string/number extraction.

### Issue 2: Unbounded limit parameter in `getRecentFailedLogins`
- **Severity:** medium
- **Category:** performance
- **File:** src/server/utils/securityMonitoring.ts:103
- **Problem:** `limit` was passed directly to Prisma `take` without bounds.
- **Risk:** Excessive query sizes or negative values causing unexpected behavior.
- **Fix Applied:** Clamp `limit` to a safe range (1..500) and normalize to an integer.

### Issue 3: Threshold/window inputs not validated in `shouldBlockIp`
- **Severity:** low
- **Category:** error-handling
- **File:** src/server/utils/securityMonitoring.ts:159
- **Problem:** Negative or non-finite inputs could yield invalid time windows or thresholds.
- **Risk:** Incorrect block decisions or confusing monitoring behavior.
- **Fix Applied:** Normalize threshold/window to sane minimums.

### Issue 4: Test used `any` for mocked audit log entries
- **Severity:** low
- **Category:** quality
- **File:** src/server/utils/__tests__/securityMonitoring.test.ts:96
- **Problem:** `mockResolvedValue(mockEntries as any)` bypassed type safety.
- **Risk:** Masked typing problems in test data and reduced confidence in mocks.
- **Fix Applied:** Added a typed mock selection and removed `any`.

### Issue 5: Auth audit test did not exercise real routes
- **Severity:** medium
- **Category:** testing
- **File:** src/server/routes/__tests__/auth.audit.test.ts:64
- **Problem:** Previous tests called `auditService.log` directly, not the auth endpoints.
- **Risk:** Route-level regressions in audit logging would go undetected.
- **Fix Applied:** Switched to Express + supertest with mocked Cognito, asserting real route behavior.

## Security Checklist
- [x] No credential exposure
- [x] Input validation present for reviewed paths
- [x] Audit logging preserved

## Performance Checklist
- [x] Query bounds added for monitoring fetch
- [x] No N+1 patterns introduced

## Final Status
All issues resolved. Tests passing.

Reviewed by: DEV (adversarial)
Reviewed at: 2026-01-03

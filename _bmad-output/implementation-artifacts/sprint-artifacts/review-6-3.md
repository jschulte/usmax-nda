# Code Review Report - Story 6-3

## Summary
- Issues Found: 4
- Issues Fixed: 4
- Categories Reviewed: correctness, security, testing, code quality
- Supabase advisors: not available in this environment

## Issues Detail

### Issue 1: Download endpoints ignored requested expiration
- **Severity:** medium
- **Category:** correctness
- **File:** src/server/routes/ndas.ts:1510
- **Problem:** `expiresIn` query was parsed but not passed to the service; response could claim an expiry that didn't match the URL.
- **Risk:** Clients rely on incorrect expiry, causing broken downloads or unexpected access windows.
- **Fix Applied:** Parse/validate `expiresIn` first and pass it into `getDocumentDownloadUrl`.

### Issue 2: Service hard-coded URL TTL
- **Severity:** medium
- **Category:** correctness
- **File:** src/server/services/documentService.ts:408
- **Problem:** `getDocumentDownloadUrl` always used 900 seconds, ignoring caller intent.
- **Risk:** Inconsistent expiry across endpoints and clients.
- **Fix Applied:** Added `expiresInSeconds` parameter with default 900 and used it in `getDownloadUrl`.

### Issue 3: Missing validation for invalid expiresIn
- **Severity:** low
- **Category:** security
- **File:** src/server/routes/ndas.ts:1507
- **Problem:** NaN/negative values could propagate into URL generation.
- **Risk:** Undefined behavior or unexpectedly long/short access windows.
- **Fix Applied:** Added numeric validation with fallback to 900 seconds.

### Issue 4: No test coverage for custom TTL
- **Severity:** low
- **Category:** testing
- **File:** src/server/services/__tests__/documentService.test.ts:501
- **Problem:** Tests didn’t assert that custom TTLs are respected.
- **Risk:** Regression where TTL is ignored.
- **Fix Applied:** Added `expiresIn` test to ensure custom TTL is passed to S3 URL generation.

## Security Checklist
- [x] No credential exposure
- [x] Input validation added for expiresIn

## Performance Checklist
- [x] No additional heavy queries introduced

## Final Status
All issues resolved. Tests passing (targeted):
- `pnpm test:run src/server/services/__tests__/documentDownloadTracking.test.ts src/server/services/__tests__/documentService.test.ts`

Reviewed by: DEV (adversarial)
Reviewed at: 2026-01-03

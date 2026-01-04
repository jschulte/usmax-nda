# Code Review Report - Story 7-6-email-template-creation

## Summary
- Issues Found: 3
- Issues Fixed: 3
- Categories Reviewed: security, performance, error handling, testing, quality, architecture
- Supabase advisors: unavailable (no MCP supabase tools configured)

## Issues Detail

### Issue 1: JSX placeholder string caused runtime ReferenceError
- **Severity:** medium
- **Category:** error-handling
- **File:** `src/components/screens/admin/EmailTemplateEditor.tsx:174`
- **Problem:** `{{companyName}}` was rendered directly in JSX, which is interpreted as an object literal expression and throws `ReferenceError` at runtime.
- **Risk:** Email template editor crashes on render, blocking admin usage.
- **Fix Applied:** Wrapped placeholder string as literal: `{'{{companyName}}'}`.

### Issue 2: Placeholder insert feature broken due to missing ref forwarding
- **Severity:** medium
- **Category:** quality
- **File:** `src/components/ui/AppInput.tsx:40`
- **Problem:** `TextArea` did not forward refs, so `EmailTemplateEditor`'s `bodyRef` was always null and placeholder insertion was a no-op.
- **Risk:** Admins cannot use the placeholder helper, increasing error rates in templates.
- **Fix Applied:** Converted `TextArea` to `React.forwardRef` and passed `ref` to `<textarea>`.

### Issue 3: Placeholder validation regex state leaked across calls
- **Severity:** low
- **Category:** error-handling
- **File:** `src/server/validators/emailTemplatePlaceholderValidator.ts:40`
- **Problem:** Global regex `exec()` reused across calls without resetting `lastIndex`, causing missed placeholder detection after the first validation.
- **Risk:** Invalid placeholders could bypass validation in subsequent requests.
- **Fix Applied:** Reset `lastIndex` for both regexes at the start of validation.

## Security Checklist
- [x] RLS policies verified (N/A for email templates)
- [x] No credential exposure
- [x] Input validation present (placeholder allowlist + syntax validation)

## Performance Checklist
- [x] No N+1 queries
- [x] Indexes verified (existing on EmailTemplate)

## Test & Build Verification
- `pnpm lint` → failed (script not defined in package.json)
- `pnpm build` → failed (existing TS errors in `documentGenerationService.ts`, `templatePreviewService.ts`, `templateService.ts`)
- Targeted tests:
  - `pnpm test:run src/server/services/__tests__/emailTemplateService.test.ts` ✅
  - `pnpm test:run src/server/routes/admin/__tests__/emailTemplates.test.ts` ✅ (console error expected from delete-default test)
  - `pnpm test:run src/components/screens/admin/__tests__/EmailTemplateEditor.test.tsx` ✅

## Final Status
All review issues resolved. Targeted tests passing. Full build fails due to unrelated TypeScript errors.

Reviewed by: DEV (adversarial)
Reviewed at: 2026-01-04T01:40:34Z

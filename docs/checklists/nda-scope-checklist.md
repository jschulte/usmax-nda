# NDA Row-Level Security Checklist

Use this checklist for any NDA-related data access changes.

## Required
- All `prisma.nda.findMany`, `findFirst`, `count`, and `findUnique` calls are scoped using `buildSecurityFilter` or `findNdaWithScope`.
- Single-record NDA access uses `findNdaWithScope` to enforce the 404 pattern and unauthorized audit logging.
- Document queries that traverse NDA relations apply `nda: buildSecurityFilter(userContext)`.
- Routes that expose NDA data include `scopeToAgencies` after auth and permission checks.
- Scope helpers do not leak unauthorized existence (return 404-equivalent responses when access is denied).

## Optional but recommended
- Tests cover group-only, subagency-only, combined access, and no-access scenarios.
- Tests cover 404 behavior for unauthorized NDA lookups.
- Any new service method touching NDAs includes a scoped query in unit tests.

# Story 7.10: Historical Field Suggestions

## Status
done

## Story
As a **NDA User**,
I want **to see suggestions for fields based on historical data**,
So that **I can fill out forms faster**.

## Acceptance Criteria
**Given** I am creating an NDA with company and agency selected
**When** I fill out fields
**Then** system suggests common purposes, types, date patterns for this combination

## Tasks / Subtasks
⚠️ **DRAFT TASKS** - Refined during pre-gap analysis for this codebase.

- [x] **Task 1: Extend company defaults with historical suggestions** (AC: 1)
  - [x] 1.1: Add optional agencyGroupId/subagencyId filters to company history query
  - [x] 1.2: Compute common authorizedPurpose values (top N + counts)
  - [x] 1.3: Compute typical NDA type + counts for company+agency history
  - [x] 1.4: Provide recent effectiveDate suggestions (distinct, most recent)

- [x] **Task 2: Update /api/ndas/company-defaults** (AC: 1)
  - [x] 2.1: Accept agencyGroupId/subagencyId query params
  - [x] 2.2: Return historical suggestions in defaults payload
  - [x] 2.3: Keep RBAC + security scoping via buildSecurityFilter

- [x] **Task 3: Client wiring + UI suggestions** (AC: 1)
  - [x] 3.1: Extend CompanyDefaults types and getCompanyDefaults params
  - [x] 3.2: Request defaults with company + agency context when available
  - [x] 3.3: Render suggestion chips for authorized purpose and effective date
  - [x] 3.4: Show NDA type suggestion note when historical data exists

- [x] **Task 4: Tests** (AC: 1)
  - [x] 4.1: companySuggestionsService unit tests for new fields
  - [x] 4.2: ndas route test for company-defaults params and payload
  - [x] 4.3: RequestWizard UI test for suggestion rendering/selection

## Gap Analysis

### Pre-Development Analysis (2026-01-04)
- **Development Type:** brownfield (existing suggestion services + RequestWizard integration)
- **Existing Implementations:**
  - Company defaults auto-fill already implemented (Story 3.2)
  - Agency suggestions already provide typical NDA type by agency (Story 3.4)

**Gaps Identified:**
- No historical authorizedPurpose suggestions for company+agency combinations
- No effectiveDate pattern suggestions
- No company+agency NDA type suggestions in company defaults
- UI lacks chips or prompts for historical field suggestions

**Status:** Ready for implementation

## Smart Batching Plan

No batchable task patterns detected. Execute tasks individually with validation.

## Dev Notes
- Keep all NDA queries scoped to authorized subagencies.
- Ensure permission checks use middleware and RBAC permissions.
- Audit log all mutations in transactions.

### Technical Requirements
- Implements FR93: Field suggestions based on historical data

## Architecture Constraints
- Follow the service-layer pattern: business logic in `src/server/services`, no raw HTTP inside services.
- Enforce middleware order on protected routes: `authenticateJWT` → `attachUserContext` → `requirePermission` → `scopeToAgencies` → handler.
- Every NDA query must be scoped by authorized subagency IDs (row-level security).
- All mutations must create audit logs (transactional with data change).
- Do not store tokens in localStorage; use HttpOnly cookies set by server.
- Use Prisma for data access; do not bypass ORM constraints.
- Frontend uses React + Vite + TypeScript; backend uses Express + TypeScript.

### Project Structure Notes
- Frontend: `src/client` (pages, components, hooks, contexts, stores).
- Backend: `src/server` (routes, services, middleware, validators, utils).
- Database: `prisma/schema.prisma` + migrations under `prisma/migrations`.
- Tests: `__tests__` next to implementation where applicable.

### Testing Requirements
- Add or confirm unit/integration coverage for routes/services touched.
- Include negative tests for permission denial and scope violations where applicable.

### References
- `_bmad-output/planning-artifacts/architecture.md` (Architecture Decision Document)
- `AGENTS.md` (service layer, middleware order, scoping, audit logging)
- `_bmad-output/planning-artifacts/epics-backup-20251223-155341.md` (Epic 7 story definitions)

---

## Implementation Summary
- Extended company defaults to return historical authorized purpose, NDA type, and effective date suggestions scoped by company + agency.
- Updated company-defaults endpoint and client API to accept agency context filters.
- Added suggestion chips for authorized purpose and effective date plus fallback NDA type hint in RequestWizard.

## Post-Validation
- `pnpm test:run src/server/services/__tests__/companySuggestionsService.test.ts` ✅
- `pnpm test:run src/server/routes/__tests__/ndas.test.ts` ✅ (expected stderr from notificationService mock warning)
- `pnpm test:run src/components/__tests__/RequestWizard.test.tsx` ✅

## Code Review Summary
- Issues found: 3
- Issues fixed: 3
- Review file: `_bmad-output/implementation-artifacts/sprint-artifacts/review-7-10-historical-field-suggestions.md`


## Dev Agent Record
### Agent Model Used
codex-cli (GPT-5)

### Debug Log References
N/A

### Completion Notes List
- Added agency-scoped historical suggestions in company defaults and RequestWizard chips.
- Updated client API typing for suggestion payloads.
- Added tests for service, route, and UI suggestion flow.

### File List
- src/server/services/companySuggestionsService.ts
- src/server/routes/ndas.ts
- src/server/services/__tests__/companySuggestionsService.test.ts
- src/server/routes/__tests__/ndas.test.ts
- src/client/services/ndaService.ts
- src/components/screens/RequestWizard.tsx
- src/components/__tests__/RequestWizard.test.tsx
- test/e2e/utils/mockApi.ts
- _bmad-output/implementation-artifacts/sprint-artifacts/review-7-10-historical-field-suggestions.md

### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.

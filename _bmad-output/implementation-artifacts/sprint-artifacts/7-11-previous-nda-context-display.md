# Story 7.11: Previous NDA Context Display

## Status
done

## Story
As a **NDA User**,
I want **to see previous NDAs for a company**,
So that **I can understand patterns and ensure consistency**.

## Acceptance Criteria
**Given** I am creating an NDA for a company
**When** the company has previous NDAs
**Then** I see "Previous NDAs" section showing last 5 NDAs with this company
**And** can click to view or clone

## Tasks / Subtasks
- [x] **Task 1: Backend support for company history** (AC: 1-3)
  - [x] 1.1: Add company history service with security scoping + limit
  - [x] 1.2: Add /api/ndas/company-history route with validation + RBAC

- [x] **Task 2: Frontend UI for Previous NDAs** (AC: 1-3)
  - [x] 2.1: Add client API + types for company history
  - [x] 2.2: Load history when company is selected in RequestWizard
  - [x] 2.3: Render Previous NDAs list with View + Clone actions

- [x] **Task 3: Tests** (AC: 1-3)
  - [x] 3.1: companySuggestionsService history test coverage
  - [x] 3.2: ndas route test for company-history
  - [x] 3.3: RequestWizard UI test for previous NDA section

## Gap Analysis
### Pre-Development Analysis (2026-01-04)
- **Development Type:** brownfield (RequestWizard + suggestion services already exist)
- **Existing Implementations:** company defaults + suggestions in RequestWizard; NDA list endpoints
- **Gaps Identified:**
  - No backend endpoint for previous NDAs by company
  - No UI section showing recent NDAs for the selected company
  - No tests covering company history retrieval

**Status:** Ready for implementation

## Dev Notes
- Keep all NDA queries scoped to authorized subagencies.
- Ensure permission checks use middleware and RBAC permissions.
- Audit log all mutations in transactions.

### Technical Requirements
- Implements FR94: Show "previous NDAs for this company" context

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
- Added company history retrieval (service + route) scoped by authorized subagencies.
- Wired RequestWizard to fetch company history and display a Previous NDAs section with view/clone actions.
- Added service, route, and UI tests for the new flow.

## Post-Validation
- `pnpm test:run src/server/services/__tests__/companySuggestionsService.test.ts` ✅
- `pnpm test:run src/server/routes/__tests__/ndas.test.ts` ✅ (expected stderr from notificationService mock warning)
- `pnpm test:run src/components/__tests__/RequestWizard.test.tsx` ✅

## Code Review Summary
- Issues found: 3
- Issues fixed: 3
- Review file: `_bmad-output/implementation-artifacts/sprint-artifacts/review-7-11-previous-nda-context-display.md`


## Dev Agent Record
### Agent Model Used
codex-cli (GPT-5)

### Debug Log References
N/A

### Completion Notes List
- Implemented company history endpoint and RequestWizard UI section for previous NDAs.
- Added client service types + API wiring for history retrieval.
- Added tests for service, route, and UI behavior.

### File List
- src/server/services/companySuggestionsService.ts
- src/server/routes/ndas.ts
- src/server/services/__tests__/companySuggestionsService.test.ts
- src/server/routes/__tests__/ndas.test.ts
- src/client/services/ndaService.ts
- src/components/screens/RequestWizard.tsx
- src/components/__tests__/RequestWizard.test.tsx
- test/e2e/utils/mockApi.ts
- _bmad-output/implementation-artifacts/sprint-artifacts/review-7-11-previous-nda-context-display.md

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

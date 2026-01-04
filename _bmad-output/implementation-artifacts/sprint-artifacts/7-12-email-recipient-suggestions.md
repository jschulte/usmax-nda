# Story 7.12: Email Recipient Suggestions

## Status
done

## Story
As a **NDA User**,
I want **system to suggest email recipients based on patterns**,
So that **I don't have to manually enter CC/BCC every time**.

## Acceptance Criteria
**Given** I am composing email
**When** composer loads
**Then** system suggests TO/CC/BCC based on historical patterns

## Tasks / Subtasks
- [x] **Task 1: Backend recipient suggestion logic** (AC: 1-3)
  - [x] 1.1: Compute historical recipient patterns from nda_emails
  - [x] 1.2: Include recipient suggestions in email preview response

- [x] **Task 2: Frontend suggestion UI** (AC: 1-3)
  - [x] 2.1: Add CC/BCC inputs to email composer
  - [x] 2.2: Render suggested TO/CC/BCC chips and allow quick add

- [x] **Task 3: Tests** (AC: 1-3)
  - [x] 3.1: emailService preview test for recipient suggestions
  - [x] 3.2: NDADetail regression test coverage

## Gap Analysis
### Pre-Development Analysis (2026-01-04)
- **Development Type:** brownfield (email preview + composer already implemented)
- **Existing Implementations:** email preview defaults, recipient selector, NDA email history
- **Gaps Identified:**
  - No historical recipient suggestions in email preview response
  - Email composer lacks CC/BCC inputs and suggestion affordances
  - No tests validating suggestion logic in email preview

**Status:** Ready for implementation

## Dev Notes
- Keep all NDA queries scoped to authorized subagencies.
- Ensure permission checks use middleware and RBAC permissions.
- Audit log all mutations in transactions.

### Technical Requirements
- Implements FR95: Suggest email recipients

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
- Added historical recipient suggestions to email preview (TO/CC/BCC) using nda_emails patterns.
- Added CC/BCC inputs and suggestion chips to the email composer.
- Added emailService unit test coverage for suggestions and verified NDADetail UI regression tests.

## Post-Validation
- `pnpm test:run src/server/services/__tests__/emailService.test.ts` ✅ (expected stderr from queueEmail mock warning)
- `pnpm test:run src/components/__tests__/NDADetail.test.tsx` ✅

## Code Review Summary
- Issues found: 3
- Issues fixed: 3
- Review file: `_bmad-output/implementation-artifacts/sprint-artifacts/review-7-12-email-recipient-suggestions.md`


## Dev Agent Record
### Agent Model Used
codex-cli (GPT-5)

### Debug Log References
N/A

### Completion Notes List
- Added historical recipient suggestions to email preview responses.
- Added CC/BCC inputs and suggestion chips in the email composer.
- Added emailService tests and validated NDADetail component tests.

### File List
- src/server/services/emailService.ts
- src/server/services/__tests__/emailService.test.ts
- src/client/services/ndaService.ts
- src/components/screens/NDADetail.tsx
- test/e2e/utils/mockApi.ts
- _bmad-output/implementation-artifacts/sprint-artifacts/review-7-12-email-recipient-suggestions.md

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

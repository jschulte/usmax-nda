# Story 7.3: Default Template Assignment

## Status
review

## Story
As a **Admin**,
I want **to set default templates for agency/type combinations**,
So that **users get smart template suggestions**.

## Acceptance Criteria
**Given** I am editing an RTF template
**When** I configure default settings
**Then** I can select agency groups/subagencies and NDA types where this is default
**And** users see the default template pre-selected

## Tasks / Subtasks
⚠️ **DRAFT TASKS** - Generated from requirements analysis. Will be validated and refined against actual codebase when dev-story runs.

- [x] Review existing data model and services for template/configuration support (AC: 1)
- [x] Add schema + migration for default template assignments by agency/subagency/nda type (AC: 1-2)
- [x] Implement backend default resolution and assignment services with RBAC (AC: 1-2)
- [x] Update template/agency suggestion flows to use scoped defaults (AC: 2)
- [x] Implement admin UI for configuring defaults by agency/subagency/type (AC: 1-2)
- [x] Ensure NDA creation/edit surfaces default template pre-selection (AC: 2)
- [x] Add audit logging, validation, and error handling for default assignments (AC: 1-2)
- [x] Add unit/integration tests for default resolution and assignment (AC: 1-2)

## Gap Analysis

### Pre-Development Analysis
- **Date:** 2026-01-03
- **Development Type:** brownfield (existing template system, missing type/subagency defaults)
- **Existing Files:** 4
- **New Files:** 1+ (defaults model + migrations)

**Findings:**
- Tasks ready: 7 (schema, services, UI, selection, audit, tests)
- Tasks partially done: 1 (default selection exists by agency/group only)
- Tasks already complete: 1 (template CRUD + RBAC)
- Tasks refined: 1
- Tasks added: 0

**Codebase Scan:**
- Backend: `src/server/services/templateService.ts`, `src/server/services/agencySuggestionsService.ts`, `src/server/routes/templates.ts`, `src/server/services/ndaService.ts`
- Frontend: `src/components/screens/Templates.tsx`, `src/components/screens/RequestWizard.tsx`
- Schema: `prisma/schema.prisma` (RtfTemplate has agencyGroupId/isDefault only)

**Status:** Ready for implementation

### Post-Implementation Validation
- **Date:** 2026-01-03
- **Tasks Verified:** 8
- **False Positives:** 0
- **Status:** ✅ All work verified complete

**Verification Evidence:**
- ✅ Schema + migration: `prisma/schema.prisma`, `prisma/migrations/20260103090000_add_rtf_template_defaults/migration.sql`
- ✅ Backend defaults: `src/server/services/templateService.ts`, `src/server/routes/templates.ts`
- ✅ Suggestions/default resolution: `src/server/services/agencySuggestionsService.ts`
- ✅ Admin UI defaults: `src/components/screens/Templates.tsx`
- ✅ NDA default selection: `src/components/screens/RequestWizard.tsx`, `src/components/screens/NDADetail.tsx`
- ✅ Audit logging/validation: `src/server/services/auditService.ts`, `src/server/services/templateService.ts`
- ✅ Client API: `src/client/services/templateService.ts`
- ✅ Tests: `src/server/services/__tests__/templateService.test.ts`

## Smart Batching Plan

No batchable patterns detected (schema + service + UI changes require individual execution).


## Dev Notes
- Keep all NDA queries scoped to authorized subagencies.
- Ensure permission checks use middleware and RBAC permissions.
- Audit log all mutations in transactions.

### Technical Requirements
- Implements FR85: Set default template for agency/type

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


## Dev Agent Record
### Agent Model Used
codex-cli (GPT-5)

### Debug Log References

### Completion Notes List
- Prisma migrate dev failed due to existing enum migration issue (P3006). Added manual migration file `prisma/migrations/20260103090000_add_rtf_template_defaults/migration.sql`.

### File List
- prisma/schema.prisma
- prisma/migrations/20260103090000_add_rtf_template_defaults/migration.sql
- src/generated/prisma/index.d.ts
- src/generated/prisma/index.js
- src/server/services/auditService.ts
- src/server/services/templateService.ts
- src/server/services/agencySuggestionsService.ts
- src/server/routes/templates.ts
- src/client/services/templateService.ts
- src/components/screens/Templates.tsx
- src/components/screens/RequestWizard.tsx
- src/components/screens/NDADetail.tsx
- src/server/services/__tests__/templateService.test.ts
- _bmad-output/implementation-artifacts/sprint-artifacts/review-7-3-default-template-assignment.md

### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.

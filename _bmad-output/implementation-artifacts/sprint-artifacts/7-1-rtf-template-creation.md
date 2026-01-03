# Story 7.1: RTF Template Creation

## Status
review

## Story
As a **Admin**,
I want **to create RTF templates with field-merge placeholders**,
So that **users can generate consistent NDA documents automatically**.

## Acceptance Criteria
**Given** I have admin permissions
**When** I navigate to "RTF Templates" and click "Create Template"
**Then** I can enter: Template name, Description, Category (by agency/type/general), RTF/DOCX content with field placeholders
**And** the system provides a list of available field placeholders
**And** I can upload an RTF/DOCX file or paste content
**And** the template is saved to rtf_templates table

## Tasks / Subtasks
⚠️ **DRAFT TASKS** - Generated from requirements analysis. Will be validated and refined against actual codebase when dev-story runs.

- [x] Review existing data model and services for template/configuration support (AC: 1)
- [x] Implement or verify backend routes/services with RBAC + agency scoping (AC: 1-3)
- [x] Implement or verify frontend UI flows for admin/user interactions (AC: 1-3)
- [x] Add audit logging for RTF template create/update/delete mutations (AC: 1-3)
- [x] Validate existing RTF template validation + error handling paths (AC: 1-3)
- [x] Add/verify unit/integration tests for critical paths (AC: 1-3)

## Gap Analysis

### Pre-Development Analysis
- **Date:** 2026-01-03
- **Development Type:** greenfield (no file list in story; existing implementation found in codebase)
- **Existing Files:** 6
- **New Files:** 0

**Findings:**
- Tasks ready: 1 (audit logging for template mutations)
- Tasks partially done: 0
- Tasks already complete: 4
- Tasks refined: 1
- Tasks added: 0

**Codebase Scan:**
- Backend: `src/server/routes/templates.ts`, `src/server/services/templateService.ts`
- Frontend: `src/components/screens/Templates.tsx`, `src/client/services/templateService.ts`
- Validation: `src/server/services/rtfTemplateValidation.ts`
- Tests: `src/server/services/__tests__/templateService.test.ts`, `src/server/services/__tests__/rtfTemplateValidation.test.ts`

**Status:** Ready for implementation

### Post-Implementation Validation
- **Date:** 2026-01-03
- **Tasks Verified:** 6
- **False Positives:** 0
- **Status:** ✅ All work verified complete

**Verification Evidence:**
- ✅ Data model/services: `prisma/schema.prisma`, `src/server/services/templateService.ts`
- ✅ Backend routes/RBAC: `src/server/routes/templates.ts`
- ✅ Frontend UI flows: `src/components/screens/Templates.tsx`
- ✅ Audit logging: `src/server/services/templateService.ts`, `src/server/services/auditService.ts`
- ✅ Validation/error handling: `src/server/services/rtfTemplateValidation.ts`, `src/server/routes/templates.ts`
- ✅ Tests: `src/server/services/__tests__/templateService.test.ts`, `src/server/services/__tests__/rtfTemplateValidation.test.ts`

## Smart Batching Plan

No batchable patterns detected (single audit logging change).


## Dev Notes
- Keep all NDA queries scoped to authorized subagencies.
- Ensure permission checks use middleware and RBAC permissions.
- Audit log all mutations in transactions.

### Technical Requirements
- Implements FR82: Create RTF templates with field-merge placeholders
- Use Handlebars syntax: {{fieldName}}

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

### File List
- src/server/services/auditService.ts
- src/server/services/templateService.ts
- src/server/routes/templates.ts
- src/server/services/__tests__/templateService.test.ts
- src/server/services/__tests__/rtfTemplateValidation.test.ts
- _bmad-output/implementation-artifacts/sprint-artifacts/review-7-1-rtf-template-creation.md


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

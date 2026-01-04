# Story 7.18: Default Email CC/BCC Configuration

## Status
ready-for-dev

## Story
As a **Admin**,
I want **to configure default CC and BCC recipients**,
So that **key stakeholders are always included**.

## Acceptance Criteria
**Given** I am configuring email defaults
**When** I set defaults
**Then** I can configure: Default CC recipients, Default BCC recipients
**And** defaults applied when composing emails (pre-filled, editable)

## Tasks / Subtasks
⚠️ **DRAFT TASKS** - Generated from requirements analysis. Will be validated and refined against actual codebase when dev-story runs.

- [ ] Review existing data model and services for template/configuration support (AC: 1)
- [ ] Implement or verify backend routes/services with RBAC + agency scoping (AC: 1-3)
- [ ] Implement or verify frontend UI flows for admin/user interactions (AC: 1-3)
- [ ] Add/verify audit logging, validation, and error handling (AC: 1-3)
- [ ] Add/verify unit/integration tests for critical paths (AC: 1-3)

## Gap Analysis
_This section will be populated by dev-story when gap analysis runs._

## Dev Notes
- Keep all NDA queries scoped to authorized subagencies.
- Ensure permission checks use middleware and RBAC permissions.
- Audit log all mutations in transactions.

### Technical Requirements
- Implements FR127: Configure default CC/BCC

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

### Additional Context
- This story is part of Epic 7 (Templates & Configuration).
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.
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
- Coordinate with existing template/email services and UI screens.
- Follow established coding standards and security guardrails.
- Validate acceptance criteria against current implementation and update if needed.
- Maintain backward compatibility for existing templates and configurations.
- Ensure UX labels, permissions, and audit trails align with compliance requirements.
- When unsure, review prior stories and hardening notes for patterns.

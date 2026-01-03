# Story 8.1: Error Monitoring with Sentry

## Status
ready-for-dev

## Story

As a System Administrator,
I want all application errors captured and reported,
so that I can fix issues proactively.

## Acceptance Criteria

1. **Given** Sentry is integrated
2. **When** an error occurs
3. **Then** Sentry captures: Error message/stack, User context, Request context, Environment
4. **And** critical errors trigger immediate alerts

## Tasks / Subtasks

⚠️ DRAFT TASKS - Generated from requirements analysis. Will be validated and refined against actual codebase when dev-story runs.

- [x] Confirm current-state behavior and scope (AC: 1)
  - [x] Review existing implementation, configs, and runbooks related to this capability
  - [x] Capture any gaps vs acceptance criteria
- [x] Implement or harden required functionality (AC: all)
  - [x] Apply backend/service changes (if applicable)
  - [x] Apply frontend/UI changes (if applicable)
  - [x] Apply infrastructure changes via Terraform only (if applicable)
- [x] Add validation and safety checks (AC: all)
  - [x] Ensure error handling and audit logging expectations are met
  - [x] Ensure permissions and agency scoping are preserved where data access is involved
- [x] Add or update tests
  - [x] Unit tests for core logic
  - [x] Integration tests for critical flows
- [x] Update documentation and operational notes

## Developer Context

- Business goal: Improve reliability and operational excellence for NDA workflows.
- Scope: This story includes application changes and/or infrastructure configuration depending on acceptance criteria.
- Dependencies: Epic 8 stories are cross-cutting; coordinate with existing error handling, email, and document services.
- Existing signals: Infrastructure - errorReportingService.ts implements Sentry

## Technical Requirements

- [Add technical notes]

## Architecture Constraints

- Follow the established service-layer pattern; avoid raw HTTP logic in services.
- Use middleware order for protected routes: authenticateJWT → attachUserContext → requirePermission → scopeToAgencies → handler.
- All NDA data access must be scoped to authorized subagencies.
- All mutations must be audit logged.
- Do not store tokens in localStorage; use secure cookies only.
- Infrastructure changes must go through Terraform in `infrastructure/` (no manual AWS changes).

## File Structure Requirements

- Backend: `src/server/services/`, `src/server/routes/`, `src/server/middleware/` as needed.
- Frontend: `src/components/`, `src/client/` as needed.
- Infrastructure: `infrastructure/` for Terraform changes.
- Tests: colocate in `__tests__/` directories adjacent to source.

## Testing Requirements

- Add tests for non-trivial logic and security paths (403, scope violations).
- Validate retry/queue behavior where applicable.
- Ensure validation errors are user-friendly and actionable.

## Gap Analysis

### Pre-Development Analysis
- **Date:** 2026-01-03
- **Development Type:** hybrid
- **Existing Files:** 1 (package.json - @sentry/node installed)
- **New Files:** 1 (errorReportingService.ts + tests)

**Findings:**
- Tasks ready: 5
- Tasks partially done: 0
- Tasks already complete: 0
- Tasks refined: 0
- Tasks added: 0

**Codebase Scan:**
- ✅ @sentry/node v7.120.4 already installed in package.json
- ❌ No errorReportingService.ts exists
- ❌ No Sentry initialization code in server
- ❌ No global error handler middleware in src/server/index.ts
- ❌ No SENTRY_DSN environment variable configuration
- ❌ No tests for error reporting

**Status:** Ready for implementation

## Smart Batching Plan

No batchable patterns detected. Execute all tasks individually.

---

## Dev Notes

- Use existing validation, error handling, and audit logging utilities where possible.
- Prefer incremental changes that preserve current behavior.

### Project Structure Notes

- Keep changes focused and aligned to existing patterns; avoid unrelated refactors.

### References

- [Source: _bmad-output/planning-artifacts/epics-backup-20251223-155341.md#Epic-8]
- [Source: _bmad-output/planning-artifacts/prd.md]
- [Source: _bmad-output/planning-artifacts/architecture.md]
- [Source: docs/aws-infrastructure-architecture.md]
- [Source: AGENTS.md]

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

### File List

## Implementation Considerations

- Confirm whether the acceptance criteria are already met in code or infrastructure.
- If partially implemented, document gaps and focus on completion rather than rework.
- For infra-only tasks, add verification steps and runbook notes to ensure operational readiness.
- For UI-related tasks, ensure accessibility and clear user feedback.
- For retry/queue flows, verify idempotency and duplicate protection.

## Risks and Edge Cases

- External service outages and network failures.
- Partial failures that should degrade gracefully without data loss.
- Security/privacy concerns (no sensitive data in logs; avoid leaking stack traces to users).
- Performance impact of added validations or monitoring.

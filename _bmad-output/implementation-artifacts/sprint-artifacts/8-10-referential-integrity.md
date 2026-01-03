# Story 8.10: Referential Integrity

## Status
ready-for-dev

## Story

As a System,
I want to prevent deletion of referenced entities,
so that relationships remain valid.

## Acceptance Criteria

1. **Given** entity is referenced
2. **When** admin attempts delete
3. **Then** blocks deletion, shows dependencies

## Tasks / Subtasks

⚠️ DRAFT TASKS - Generated from requirements analysis. Will be validated and refined against actual codebase when dev-story runs.

- [ ] Confirm current-state behavior and scope (AC: 1)
  - [ ] Review existing implementation, configs, and runbooks related to this capability
  - [ ] Capture any gaps vs acceptance criteria
- [ ] Implement or harden required functionality (AC: all)
  - [ ] Apply backend/service changes (if applicable)
  - [ ] Apply frontend/UI changes (if applicable)
  - [ ] Apply infrastructure changes via Terraform only (if applicable)
- [ ] Add validation and safety checks (AC: all)
  - [ ] Ensure error handling and audit logging expectations are met
  - [ ] Ensure permissions and agency scoping are preserved where data access is involved
- [ ] Add or update tests
  - [ ] Unit tests for core logic
  - [ ] Integration tests for critical flows
- [ ] Update documentation and operational notes

## Developer Context

- Business goal: Improve reliability and operational excellence for NDA workflows.
- Scope: This story includes application changes and/or infrastructure configuration depending on acceptance criteria.
- Dependencies: Epic 8 stories are cross-cutting; coordinate with existing error handling, email, and document services.
- Existing signals: Enforced by Prisma/PostgreSQL

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

_This section will be populated by dev-story when gap analysis runs._

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

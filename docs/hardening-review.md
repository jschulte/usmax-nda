# Hardening Review Plan

Status: draft
Owner: team
Last Updated: 2025-12-28

## Goals

- Verify spec alignment per epic/story and identify gaps
- Validate security, compliance, and data access controls
- Assess quality, DRY, and error handling
- Measure test coverage and add missing tests
- Identify performance, scalability, and operational risks

## Inputs

- `docs/prd.md`
- `docs/architecture.md`
- `docs/epics.md`
- `docs/sprint-artifacts/*`
- `docs/legacy-screens-requirements.md`
- `docs/permission-mapping.md`
- `docs/test-review.md`

## Review Approach

Two parallel tracks:

1. **Epic/Story Gap Analysis** (completeness)
2. **System Hardening Passes** (security, quality, performance, tests, ops)

Outputs from both tracks land in this file and roll up into a single fix backlog.

## Phase 0 — Baseline

- [ ] Create review branch (no feature work)
- [ ] Capture current CI/test status
- [ ] Inventory stories and acceptance criteria
- [ ] Build initial review matrix

## Phase 1 — Epic/Story Gap Analysis

For each epic/story:

- [ ] Map acceptance criteria to code paths (UI + API)
- [ ] Validate happy path + error paths
- [ ] Confirm permission + agency scoping behavior
- [ ] Confirm audit logging on mutations
- [ ] Record gaps with severity and location

Optional automation:

- [ ] Run `autonomous-epic` workflow per epic and summarize findings here

## Phase 2 — Security & Compliance

- [ ] Auth pipeline order on protected routes
- [ ] Permission checks via middleware (no inline role checks)
- [ ] Agency scoping enforced for all NDA queries
- [ ] Audit logging for all mutations
- [ ] CSRF/CORS/cookie configuration
- [ ] Input validation and strict schema handling
- [ ] Secrets and env handling
- [ ] S3 access controls and metadata

## Phase 3 — Quality & DRY

- [ ] Service layer boundaries (business logic in services)
- [ ] Reuse validators and shared utilities
- [ ] Type safety (no `any`)
- [ ] Consistent error handling and response shapes
- [ ] UI consistency and copy accuracy

## Phase 4 — Testing

- [ ] Unit coverage for services/validators
- [ ] Security path tests (401/403/404/400)
- [ ] Integration tests for NDA lifecycle
- [ ] Document upload and email flows
- [ ] Test quality review using `docs/test-review.md`

## Phase 5 — Performance & Scale

- [ ] N+1 and query efficiency review
- [ ] Pagination on list endpoints
- [ ] Index coverage for frequent filters/sorts
- [ ] Background job retries and idempotency
- [ ] Frontend bundle and rendering hotspots

## Phase 6 — Ops & Reliability

- [ ] CI/CD checks and gating
- [ ] Migration safety (no data-loss patterns)
- [ ] Logging consistency (user + request context)
- [ ] Alerts/monitoring coverage (if any)

## Deliverables

- Epic/Story gap log
- Security findings
- Quality/DRY findings
- Test coverage gaps
- Performance findings
- Ops/reliability findings
- Consolidated hardening backlog

---

## Review Matrix (Epic/Story)

| Epic/Story | Acceptance Criteria | Code Locations | Tests | Status | Notes |
| ---------- | ------------------- | -------------- | ----- | ------ | ----- |
| Epic 10 / Story 10.3 (Status enum + legacy labels) | Legacy-aligned statuses, migrations, UI labels | `prisma/migrations/20251224000000_epic_10_customer_feedback/migration.sql`, `prisma/schema.prisma`, `src/server/services/statusTransitionService.ts`, `src/client/utils/statusFormatter.ts` | `src/server/services/__tests__/statusTransitionService.test.ts`, `src/client/utils/__tests__/statusFormatter.test.ts` | Gap found | Enum + display config inconsistent with migration and tests |
| Epic 10 / Story 10.4 (Auto-expiration) | Execution + expiration dates, EXPIRED status, alerts | `src/server/services/documentService.ts`, `src/server/jobs/expirationJob.ts`, `src/server/services/dashboardService.ts`, migration | `src/server/jobs/__tests__/expirationJob.test.ts` | Gap found | Uses `effectiveDate` + INACTIVE; schema missing expirationDate |
| Epic 10 / Story 10.6 (Approval workflow) | Pending approval status, approval metadata, permissions | `src/server/routes/ndas.ts`, `src/server/constants/permissions.ts`, `prisma/seed.ts`, migration | (none found) | Gap found | Uses CREATED/EMAILED and missing seed permission |
| Epic 10 / Story 10.1 (USmax Position) | Field + labels + filters | `prisma/schema.prisma`, `src/components/screens/RequestWizard.tsx`, `src/components/screens/NDADetail.tsx`, `src/components/screens/Requests.tsx` | `src/components/__tests__/usMaxPositionLabels.test.ts` | Implemented | Verify end-to-end after schema alignment |
| Epic 10 / Story 10.2 (NDA Type) | Field + labels + filters | `prisma/schema.prisma`, `src/components/screens/RequestWizard.tsx`, `src/components/screens/NDADetail.tsx`, `src/components/screens/Requests.tsx` | `src/components/__tests__/ndaTypeLabels.test.ts` | Implemented | Verify list filter uses enum values |
| Epic 10 / Story 10.5 (Non-USmax flag + safeguards) | Flag, warnings/confirmations | `prisma/schema.prisma`, `src/components/screens/RequestWizard.tsx`, `src/components/screens/NDADetail.tsx`, `src/server/services/documentGenerationService.ts` | (none found) | Partial | UI warnings present; no test coverage |
| Epic 10 / Story 10.7 (Preview before send/route) | Must preview before send/route | `src/components/screens/NDADetail.tsx`, `src/server/routes/ndas.ts`, `src/server/services/templateService.ts` | (none found) | Partial | Enforced in UI only |
| Epic 10 / Story 10.8 (Self-approval + Create & Approve) | Creator can approve own NDA, create & approve option | `src/components/screens/NDADetail.tsx` | (none found) | Partial | No create-&-approve flow; no audit marker |
| Epic 10 / Story 10.9 (Auto BCC from Notify on NDA Changes) | BCC auto-populated | `src/server/services/emailService.ts`, `src/server/services/notificationService.ts` | (none found) | Partial | Uses subscriptions; no per-contact “Notify” checkbox |
| Epic 10 / Story 10.10 (Default CC/BCC management) | Admin-configurable defaults + ad-hoc add/remove | `src/server/services/systemConfigService.ts` | (none found) | Gap found | Defaults exist but no admin API/UI |
| Epic 10 / Story 10.11 (Base email template editing) | Edit default email template | `src/server/routes/admin/emailTemplates.ts`, `src/components/screens/admin/EmailTemplates.tsx` | `src/server/routes/admin/__tests__/emailTemplates.test.ts` | Implemented | Base template is default email template |
| Epic 10 / Story 10.12 (USmax spelling) | Replace  → USmax | `src/components/layout/Sidebar.tsx` | (n/a) | Implemented | Docs still use “” in places |
| Epic 10 / Story 10.13 (Request NDA button) | Header/primary CTA | `src/components/layout/Sidebar.tsx` | (n/a) | Implemented | CTA in sidebar |
| Epic 10 / Story 10.14 (Non-USmax safeguards) | Warnings + confirmations | `src/components/screens/NDADetail.tsx`, `src/server/services/documentGenerationService.ts` | (none found) | Implemented | UI warnings + optional server skip |
| Epic 10 / Story 10.15 (Remove specified users) | Data cleanup | `prisma/seed.ts` | (n/a) | Gap found | Data-only task not implemented |
| Epic 10 / Story 10.16-10.17 (Clarifications) | Type field + Contacts vs Contracts POC | `docs/epics.md` | (n/a) | Open | Requires decision + implementation |
| Epic 7 / Story 7.1 (RTF template creation) | Admin can create RTF templates | `src/server/routes/templates.ts`, `src/components/screens/Templates.tsx` | `src/server/services/__tests__/templateService.test.ts` | Implemented | UI uses base64 input; no file upload |
| Epic 7 / Story 7.2 (RTF template management) | Edit/activate/delete templates | `src/server/routes/templates.ts`, `src/components/screens/Templates.tsx` | `src/server/services/__tests__/templateService.test.ts` | Partial | UI toggle uses `template.active` (bug) and shows agencyGroupId |
| Epic 7 / Story 7.6-7.7 (Email template CRUD) | Admin email template editor | `src/components/screens/admin/EmailTemplates.tsx`, `src/server/routes/admin/emailTemplates.ts` | `src/server/routes/admin/__tests__/emailTemplates.test.ts` | Implemented | UI untested |
| Epic 7 / Story 7.9-7.10 (Company + field suggestions) | Smart suggestions in Request Wizard | `src/server/services/companySuggestionsService.ts`, `src/components/screens/RequestWizard.tsx` | `src/server/services/__tests__/companySuggestionsService.test.ts` | Implemented | Verify UX after Epic 10 schema changes |
| Epic 7 / Story 7.12 (Email recipient suggestions) | Suggest recent recipients when emailing | (none) | (none) | Not implemented | No API or UI |
| Epic 7 / Story 7.14-7.19 (Admin configuration) | Status/transition/notification thresholds, dropdown values, CC/BCC defaults | `src/server/services/systemConfigService.ts`, `src/components/screens/Administration.tsx` | (none) | Gap found | No routes/UI; advanced settings route missing |
| Epic 6 / Story 6.1 (Comprehensive action logging) | Auto log all mutations | `src/server/middleware/auditMiddleware.ts`, `src/server/services/auditService.ts` | `src/server/middleware/__tests__/auditMiddleware.test.ts` | Partial | Audit map coverage incomplete; duplicate logs with service-level logging |
| Epic 6 / Story 6.2 (Field change tracking) | Before/after values in audit logs | `src/server/utils/detectFieldChanges.ts`, `src/server/services/ndaService.ts`, `src/client/utils/formatAuditChanges.ts` | `src/server/services/__tests__/fieldChangeTracking.integration.test.ts` | Partial | NDA timeline summary expects `changedFields` but logs use `changes` |
| Epic 6 / Story 6.3 (Document download tracking) | Log document downloads w/ metadata | `src/server/services/documentService.ts` | `src/server/services/__tests__/documentDownloadTracking.test.ts` | Implemented | ZIP download logs aggregate event only |
| Epic 6 / Story 6.5 (NDA audit trail viewer) | Full NDA history + filter | `src/server/routes/auditLogs.ts`, `src/components/screens/NDADetail.tsx` | `src/server/routes/__tests__/auditLogs.nda-trail.test.ts` | Partial | Email sent/failed excluded; filter UI not wired |
| Epic 6 / Story 6.6 (Visual timeline display) | Icon/color timeline UI | `src/server/routes/auditLogs.ts`, `src/components/screens/NDADetail.tsx` | (none) | Gap found | Icon names + colors don’t match UI rendering |
| Epic 6 / Story 6.7 (Admin audit log viewer) | Centralized admin view | `src/server/routes/auditLogs.ts`, `src/components/screens/admin/AuditLogs.tsx` | `src/server/routes/__tests__/auditLogs.systemEvents.test.ts` | Partial | UI filters limited; availableEntityTypes incomplete |
| Epic 6 / Story 6.8 (Audit log filtering) | Multi-criteria filters | `src/server/routes/auditLogs.ts`, `src/components/screens/admin/AuditLogs.tsx` | (none) | Gap found | Server search/result filters missing; UI lacks user/IP/entity filters |
| Epic 6 / Story 6.9 (Audit log export) | CSV/JSON export | `src/server/routes/auditLogs.ts`, `src/client/services/auditService.ts` | (none) | Partial | Export audit log uses wrong userId |
| Epic 6 / Story 6.10 (Email event tracking) | Track queued/sent/delivery | `src/server/services/emailService.ts`, `prisma/schema.prisma` | `src/server/services/__tests__/emailService.test.ts` | Partial | No delivered/bounced tracking; audit details incomplete; entityType mismatch |
| Epic 6 / Story 6.11 (Immutable audit trail) | Append-only audit log | `src/server/services/auditService.ts` | `src/server/middleware/__tests__/auditMiddleware.test.ts` | Implemented | Consider DB-level trigger |
| Epic 9 / Story 9.1 (Internal notes display) | Save/display/edit/delete notes | `src/server/routes/ndas.ts`, `src/client/services/notesService.ts`, `src/components/screens/NDADetail.tsx` | (none) | Partial | Edit UI missing; no tests |
| Epic 9 / Story 9.9 (Notifications bell dropdown) | Dropdown with unread count + navigation | `src/components/layout/TopBar.tsx` | (none) | Gap found | Uses mock data; no API/mark-read/outside-click handling |
| Epic 9 / Story 9.11 (Contact search display format) | Show name/email/role + internal badge | `src/components/screens/RequestWizard.tsx`, `src/client/services/userService.ts`, `src/server/routes/contacts.ts` | (none) | Gap found | UI lacks job title + internal/external indicator; external search returns no first/last name |
| Epic 9 / Story 9.14 (Contact phone auto-fill) | Auto-fill phone when selecting contact | `src/components/screens/RequestWizard.tsx`, `src/server/services/pocService.ts` | (none) | Partial | UI copies workPhone/cellPhone but search APIs don’t return phone fields |
| Epic 9 / Story 9.15 (Enhanced email templates) | Richer template bodies + merge fields | `src/server/services/emailService.ts`, `src/components/screens/admin/EmailTemplateEditor.tsx` | `src/server/services/__tests__/emailService.test.ts` | Partial | Placeholder list includes fields not merged by backend |
| Epic 9 / Story 9.16 (Email template editor) | Admin CRUD + preview | `src/components/screens/admin/EmailTemplates.tsx`, `src/components/screens/admin/EmailTemplateEditor.tsx`, `src/server/routes/admin/emailTemplates.ts` | `src/server/routes/admin/__tests__/emailTemplates.test.ts` | Implemented | UI untested; placeholder list mismatch (see 9.15) |
| Epic 9 / Story 9.17 (Test notifications) | Admin test notification tool | `src/components/screens/admin/SendTestNotification.tsx`, `src/server/routes/admin/testNotifications.ts` | `src/server/routes/admin/__tests__/testNotifications.test.ts` | Implemented | Verify admin-only access |
| Epic 9 / Story 9.18 (RTF WYSIWYG editor) | Rich text editing for templates | (none) | (none) | Not implemented | Phase 2 per story |
| Epic 9 / Story 9.19 (Clauses section removal) | Remove unimplemented clauses UI | `src/components/screens/Templates.tsx`, `src/components/layout/Sidebar.tsx` | (none) | Gap found | Clauses UI still present |
| Epic 9 / Story 9.20 (Manager escalation removal) | Remove manager escalation option | `src/components/screens/admin/NotificationSettings.tsx` | (none) | Gap found | Escalation UI still present |
| Epic 9 / Story 9.21 (IP access control removal) | Remove IP access control UI | `src/components/screens/admin/SecuritySettings.tsx` | (none) | Gap found | Placeholder UI still present |
| Epic 9 / Story 9.22 (CORS config removal) | Remove CORS config UI | `src/components/screens/admin/SecuritySettings.tsx` | (none) | Gap found | Placeholder UI still present |
| Epic 9 / Story 9.23 (API key management removal) | Remove or defer API key UI | `src/components/screens/admin/SecuritySettings.tsx` | (none) | Gap found | Placeholder UI still present |
| Epic 9 / Story 9.24 (Security alerts messaging) | Align messaging with actual monitoring | `src/components/screens/admin/SecuritySettings.tsx` | (none) | Gap found | Claims “immediate alerts” |
| Epic 8 / Story 8.1 (Error monitoring) | Sentry captures server errors | `src/server/services/errorReportingService.ts`, `src/server/index.ts`, `src/server/services/emailService.ts`, `src/server/services/auditService.ts` | (none) | Partial | Sentry wrapper exists but global error handler doesn’t report; only select paths call `reportError` |
| Epic 8 / Story 8.9 (File upload validation) | Allowed types/size + security checks | `src/server/middleware/fileUpload.ts`, `src/server/services/documentService.ts`, `src/server/routes/ndas.ts` | `src/server/services/__tests__/documentService.test.ts` | Partial | No malware scanning; multer middleware not tested |
| Epic 8 / Story 8.21 (Retry failed operations) | Users can retry failed generate/send/upload | `src/client/services/api.ts`, `src/components/screens/NDADetail.tsx`, `src/components/screens/RequestWizard.tsx` | (none) | Partial | Auto-save retries only; no retry UX/backoff for generate/send/upload |
| Epic 8 / Story 8.24 (Offline detection) | Detect offline + display messaging | (none) | (none) | Not implemented | No offline/online listeners or UI indicator |
| Epic 8 / Story 8.25 (Form data preservation) | Auto-save drafts | `src/components/screens/RequestWizard.tsx`, `src/server/routes/ndas.ts` | (none) | Implemented | Auto-save with retry in Request Wizard |
| Epic 5 / Story 5.1 (Global NDA search) | Search across NDA fields + type-ahead | `src/server/services/ndaService.ts`, `src/components/screens/Requests.tsx` | `src/server/services/__tests__/ndaService.test.ts` | Implemented | Type-ahead search uses 2+ chars |
| Epic 5 / Story 5.2 (Sort persistence) | Sort by column + persist per user | `src/components/screens/Requests.tsx`, `src/server/services/ndaService.ts` | `src/server/services/__tests__/ndaService.test.ts` | Partial | Sorting works but persistence uses localStorage; no user preference table/API |
| Epic 5 / Story 5.4 (Filter presets) | My NDAs, Expiring, Waiting, Stale, Active | `src/server/services/ndaService.ts`, `src/components/screens/Requests.tsx` | `src/server/services/__tests__/ndaService.test.ts` | Gap found | Missing Waiting/Stale/Active presets; “My NDAs” uses createdById not Opportunity POC |
| Epic 5 / Story 5.8-5.12 (Dashboard + alerts) | Personalized dashboard, stale/waiting/expiring | `src/server/services/dashboardService.ts`, `src/components/screens/Dashboard.tsx` | (none) | Partial | Hard-coded thresholds; active count excludes CANCELLED due to duplicate INACTIVE filter |
| Epic 5 / Story 5.13-5.14 (Notification prefs + subscriptions) | Preference toggles + subscribe/unsubscribe | `src/server/services/notificationService.ts`, `src/server/routes/notifications.ts`, `src/components/screens/Settings.tsx` | `src/server/services/__tests__/notificationService.test.ts` | Implemented | UI for preferences exists in Settings |
| Epic 4 / Story 4.1 (Document upload) | Upload + validation + audit | `src/server/middleware/fileUpload.ts`, `src/server/services/documentService.ts`, `src/server/routes/ndas.ts` | `src/server/services/__tests__/documentService.test.ts` | Implemented | Route/multer error paths untested |
| Epic 4 / Story 4.5 (Bulk download ZIP) | Download all versions | `src/server/services/documentService.ts`, `src/server/routes/ndas.ts` | (none) | Implemented | No test coverage |
| Epic 4 / Story 4.8 (S3 cross-region replication) | Cross-region document replication | `infrastructure/modules/s3/main.tf` | (n/a) | Gap found | No Terraform replication config present |
| Epic 3 / Story 3.7 (NDA list filtering) | Multi-criteria filters + presets | `src/server/services/ndaService.ts`, `src/components/screens/Requests.tsx` | `src/server/services/__tests__/ndaService.test.ts` | Partial | showCancelled flag excludes CANCELLED (uses INACTIVE) |
| Epic 3 / Story 3.9 (Status progression UI) | Visual progression with labels | `src/server/services/ndaService.ts`, `src/components/screens/NDADetail.tsx` | (none) | Partial | STATUS_LABELS/TERMINAL_STATUSES have duplicate keys |
| Epic 3 / Story 3.16 (In-browser RTF editing) | WYSIWYG RTF editor + versions | (none) | (none) | Not implemented | No editor, endpoints, or versioning table |
| Epic 2 / Story 2.6 (Access summary + export) | User access summary + CSV export | `src/server/services/accessSummaryService.ts`, `src/server/routes/admin.ts`, `src/components/screens/admin/UserManagement.tsx` | `src/server/services/__tests__/accessSummaryService.test.ts` | Implemented | No route tests for access export or access-summary |
| Epic 2 / Story 2.7 (Bulk user ops) | Bulk role/access/deactivate/export | (none) | (none) | Not implemented | No UI or API for bulk actions |
| Epic 1 / Story 1.1 (Auth + MFA + session warning) | MFA flow, lockout, session warning | `src/server/routes/auth.ts`, `src/server/services/cognitoService.ts`, `src/client/contexts/AuthContext.tsx`, `src/client/components/SessionWarningModal.tsx` | `src/server/routes/__tests__/auth.test.ts` | Implemented | No frontend component tests |
| Epic 1 / Story 1.5 (E2E auth flow) | Playwright tests for login/MFA | (none) | (none) | Not implemented | No Playwright config/tests |

---

## Findings Log

### Security Findings

| ID | Severity | Location | Issue | Recommendation |
| -- | -------- | -------- | ----- | -------------- |
| SEC-1 | High | `src/server/routes/ndas.ts`, `src/server/middleware/auditMiddleware.ts` | Approval/reject routes update approval metadata without audit logging; audit middleware has no mappings for `/route-for-approval`, `/approve`, `/reject`. | Add explicit audit logs inside a transaction and add route mappings for approval actions. |
| SEC-2 | Medium | `src/server/routes/auth.ts`, `src/server/index.ts` | CSRF protection only enforced on refresh/logout; other mutating routes rely solely on SameSite cookies and CORS headers exclude `x-csrf-token`. | Decide on CSRF strategy (double-submit or Origin check) and enforce for all mutating routes; add `X-CSRF-Token` to allowed headers if used. |
| SEC-3 | Low | `src/server/db/index.ts` | DATABASE_URL is partially logged on startup; could leak connection details in production logs. | Remove or guard this log behind non-production flag. |
| SEC-4 | Medium | `src/server/middleware/fileUpload.ts`, `src/server/services/documentService.ts` | File upload validation only checks extension/MIME/size; no malware scanning despite PRD requirement for basic security scanning. | Add antivirus scanning (e.g., ClamAV/Lambda) or document the exception in compliance notes. |

### Quality / DRY Findings

| ID | Severity | Location | Issue | Recommendation |
| -- | -------- | -------- | ----- | -------------- |
| Q-1 | Critical | `prisma/schema.prisma`, `prisma/migrations/20251224000000_epic_10_customer_feedback/migration.sql`, `src/server/jobs/expirationJob.ts`, `src/server/routes/ndas.ts`, `src/server/services/documentService.ts` | Prisma schema/client do not include Epic 10 status enum + columns (expirationDate, approvedById/At, rejectionReason) but code and migrations reference them. | Align schema with migration, regenerate Prisma client, and reconcile code to new enums/fields. |
| Q-2 | Critical | `src/server/services/statusTransitionService.ts` | Duplicate enum keys in VALID_TRANSITIONS/STATUS_DISPLAY overwrite each other; CANCELLED missing; labels/transitions incorrect. | Update enum to real statuses and rebuild transitions/display map (no duplicate keys). |
| Q-3 | High | `src/server/routes/ndas.ts` | Approval workflow routes set status to CREATED/EMAILED instead of PENDING_APPROVAL/SENT_PENDING_SIGNATURE; approval state is not represented. | Update status transitions to match Story 10.6 and new enum. |
| Q-4 | High | `src/server/jobs/expirationJob.ts`, `src/server/services/dashboardService.ts` | Expiration logic uses effectiveDate and sets INACTIVE; Story 10.4 requires executionDate + expirationDate and EXPIRED status. | Use expirationDate (computed from execution date) and update status to EXPIRED. |
| Q-5 | High | `prisma/seed.ts`, `src/server/constants/permissions.ts` | `nda:approve` permission exists in constants but is not seeded or assigned to roles. | Add permission to seed data and role mappings; add migration if needed. |
| Q-6 | High | `src/server/routes/ndas.ts`, `src/server/services/notificationService.ts` | Approval request/reject notifications go to NDA subscribers, not all approvers; requirement says notify users with `nda:approve` for the agency. | Add notifier that targets approvers in scope; keep subscriber notifications separate. |
| Q-7 | Medium | `src/components/screens/NDADetail.tsx`, `src/server/routes/ndas.ts` | Preview-before-send/route enforced only in UI; API allows bypass. | Add server-side enforcement or record preview audit state and check before send/route. |
| Q-8 | Medium | `src/components/screens/NDADetail.tsx`, `src/server/routes/ndas.ts`, `src/server/middleware/auditMiddleware.ts` | Self-approval noted in UI but not recorded in audit log details. | Log explicit self-approval details (actor == creator) and add audit mapping. |
| Q-9 | Medium | `src/components/screens/RequestWizard.tsx` | “Create & Approve” option for users with `nda:approve` is missing. | Add CTA and wire to approve flow (or define alt UX). |
| Q-10 | Medium | `docs/traceability-matrix.md`, `docs/sprint-artifacts/epic-10-gap-analysis.md` | Docs claim Epic 10 is fully implemented, but code shows status/approval/expiration gaps. | Reconcile documentation after fixes to prevent false completion signals. |
| Q-11 | High | `src/components/screens/Templates.tsx`, `src/components/layout/Sidebar.tsx` | Clauses feature UI still visible despite verification report marking it for removal. | Remove clauses UI and rename navigation to Templates only. |
| Q-12 | High | `src/components/screens/admin/NotificationSettings.tsx` | Manager escalation controls present without backend support. | Remove escalation UI or mark as Phase 2 with disabled state. |
| Q-13 | High | `src/components/screens/admin/SecuritySettings.tsx` | IP access control/CORS/API key management UI present without backend support. | Remove or clearly mark as Phase 2; avoid implying enforcement. |
| Q-14 | Medium | `src/components/screens/admin/SecuritySettings.tsx` | Security alerts messaging claims immediate alerts, but only Sentry logging exists. | Update copy to reflect actual monitoring and alerting. |
| Q-15 | Medium | `src/components/layout/TopBar.tsx` | Notifications dropdown uses mock data; no API, unread count, mark-read, or outside-click handling. | Integrate with notification APIs (read/unread), add close-on-outside-click, or remove until ready. |
| Q-16 | Medium | `src/components/screens/NDADetail.tsx`, `src/client/services/notesService.ts` | Internal notes editing is not available in UI though PUT endpoint exists. | Add edit UI for notes or remove update endpoint. |
| Q-17 | Medium | `src/components/screens/RequestWizard.tsx`, `src/server/routes/contacts.ts` | Contact autocomplete does not show job title/internal badge; external search responses omit first/last name. | Return jobTitle + isInternal + first/last names in search APIs and update display template. |
| Q-18 | Medium | `src/components/screens/RequestWizard.tsx`, `src/server/services/pocService.ts` | Phone auto-fill uses workPhone/cellPhone but search APIs don’t return phone fields. | Return workPhone/cellPhone (or map `phone`) from search endpoints and update client types. |
| Q-19 | Medium | `src/server/services/emailService.ts`, `src/components/screens/admin/EmailTemplateEditor.tsx` | Email template placeholder list includes fields not supported by merge logic (`effectiveDate`, `usMaxPosition`, `ndaType`, `agencyGroup`). | Extend merge fields to match UI placeholders or update UI to match supported tokens. |
| Q-20 | High | `src/server/routes/auditLogs.ts`, `src/server/services/emailService.ts` | NDA audit trail filters entityType `email` but email service logs `nda_email`; email sent/failed events never appear in timeline. | Standardize entityType to `email` or include `nda_email` in audit-trail filter. |
| Q-21 | Medium | `src/server/routes/auditLogs.ts`, `src/server/services/userService.ts`, `src/server/routes/admin/emailTemplates.ts`, `src/server/routes/admin.ts` | Audit entityType values are inconsistent (`user` vs `contact`, `email` vs `nda_email`, `email_template`, `access_control`, `audit_log`). UI filter list is static and omits these types. | Normalize entityType values and/or derive filter options from distinct DB values. |
| Q-22 | Medium | `src/server/routes/auditLogs.ts` | Audit export logging uses `req.userContext!.id` (Cognito sub) instead of contactId; userId recorded incorrectly. | Use `req.userContext!.contactId` when logging audit export. |
| Q-23 | Medium | `src/server/routes/auditLogs.ts`, `src/components/screens/NDADetail.tsx` | Timeline icon names/colors don’t match UI rendering; most events show no icon and background color uses invalid token (`green20`). | Align icon enum between backend/UI and use valid color tokens (hex or Tailwind). |
| Q-24 | Medium | `src/components/screens/NDADetail.tsx` | NDA audit trail filter UI is a no-op; actionTypes param unused. | Implement filter menu and pass actionTypes to API. |
| Q-25 | Medium | `src/server/routes/auditLogs.ts`, `src/components/screens/admin/AuditLogs.tsx` | Admin audit search is client-side only (current page). Server-side search/result filter is documented but not implemented; UI lacks user/IP/entity filters. | Implement server-side search/result filters and extend UI to pass userId/entityId/ipAddress. |
| Q-26 | Low | `src/server/services/auditService.ts` | In-memory audit queue is never flushed when DB returns; logs can be lost during outages. | Add retry/flush mechanism when DB becomes available. |
| Q-27 | Low | `src/server/middleware/auditMiddleware.ts`, `src/server/services/ndaService.ts`, `src/server/services/statusTransitionService.ts` | Duplicate audit entries for NDA create/update/status changes (middleware + manual logs). | Choose a single logging source or dedupe entries. |
| Q-28 | Medium | `src/server/services/emailService.ts` | Email audit logs omit subject/recipients for SENT/FAILED; delivery/bounce tracking not implemented despite enum. | Include subject/recipients in logs and add SES delivery/bounce handlers. |
| Q-29 | High | `src/server/services/systemConfigService.ts`, `src/components/screens/Administration.tsx` | Admin configuration stories (7.14–7.19) have no API routes or UI; “Advanced Settings” route does not exist. | Add admin config endpoints and UI to manage thresholds, defaults, dropdown values, rules. |
| Q-30 | Medium | `src/components/screens/RequestWizard.tsx`, `src/server/services/systemConfigService.ts` | NDA type and USmax position dropdowns are hard-coded and ignore configurable values. | Fetch dropdown values from system config and update form options. |
| Q-31 | Medium | `src/components/screens/NDADetail.tsx`, `src/server/routes` | Email recipient suggestions (Story 7.12) are not implemented. | Add endpoint for recent recipients and wire to composer. |
| Q-32 | Low | `src/components/screens/Templates.tsx` | Template activation toggle uses `template.active` instead of `template.isActive`. | Fix UI toggle logic to use `isActive`. |
| Q-33 | Low | `src/components/screens/Templates.tsx`, `src/client/services/templateService.ts` | Templates list shows raw agencyGroupId instead of agency name. | Extend client type to include agencyGroup and display name/code. |
| Q-34 | Medium | `src/server/routes/templates.ts`, `src/server/services/templateService.ts`, `src/server/middleware/auditMiddleware.ts` | RTF template CRUD actions are not audit logged (no middleware mapping, no service logging). | Add audit actions for template create/update/delete and map routes in audit middleware. |
| Q-35 | Medium | `src/server/services/dashboardService.ts`, `src/server/services/systemConfigService.ts` | Dashboard thresholds are hard-coded and ignore system config values (Story 7.17). | Load thresholds from systemConfigService and provide admin UI to edit. |
| Q-36 | Medium | `src/client/services/api.ts`, `src/components/screens/NDADetail.tsx`, `src/components/screens/RequestWizard.tsx` | Retry UX/backoff for failed operations (RTF generation, upload, send) is missing; only draft auto-save retries. | Add explicit retry actions/toasts or implement API retry/backoff for transient failures. |
| Q-37 | Medium | `src/App.tsx`, `src/client/services/api.ts` | Offline detection is not implemented; users only see generic network errors. | Add online/offline listeners with a banner and context-aware messaging. |
| Q-38 | Low | `src/App.tsx` | No React error boundary; UI crashes can blank the app with no recovery path. | Add top-level ErrorBoundary with fallback UI and reset option. |
| Q-39 | Medium | `src/server/services/ndaService.ts`, `src/components/screens/Requests.tsx` | Filter presets don’t match requirements: missing Waiting/Stale/Active presets; “My NDAs” uses createdById instead of Opportunity POC. | Implement required presets and align “My NDAs” to Opportunity POC (or clarify requirement). |
| Q-40 | Medium | `src/components/screens/Requests.tsx`, `prisma/schema.prisma` | Sort persistence is stored in localStorage only; no user preference table or API to persist across devices. | Add user_preferences schema + API to persist sort settings per user. |
| Q-41 | Medium | `src/server/services/ndaService.ts`, `src/server/services/dashboardService.ts` | CANCELLED status is effectively excluded due to duplicate INACTIVE filters (listNdas, dashboard metrics). | Replace duplicate INACTIVE references with CANCELLED and add tests. |
| Q-42 | Medium | `src/server/services/ndaService.ts` | Status progression labels/terminal status lists have duplicate keys; CREATED label overwritten and terminal states omit CANCELLED. | Fix STATUS_LABELS/TERMINAL_STATUSES and align with status enum. |
| Q-43 | Medium | `docs/sprint-artifacts/3-16-in-browser-rtf-editing.md`, `src/components/screens/Templates.tsx` | In-browser RTF editor (Story 3.16) not implemented. | Decide on scope (implement or formally defer) and update UI/docs. |
| Q-44 | Medium | `docs/sprint-artifacts/2-7-bulk-user-operations.md`, `src/components/screens/admin/UserManagement.tsx`, `src/server/routes/users.ts` | Bulk user operations (role/access/deactivate/export) not implemented. | Implement bulk UI + endpoints or mark as out of scope with UX removal. |

### Test Coverage Gaps

| ID | Priority | Area | Missing Test | Notes |
| -- | -------- | ---- | ------------ | ----- |
| T-1 | P1 | Status labels | Fix `statusFormatter` tests | Tests expect statuses not in implementation and contain contradictions. |
| T-2 | P1 | Status transitions | Fix `statusTransitionService` tests | Tests use INACTIVE in place of CANCELLED and conflict with expected transitions. |
| T-3 | P2 | End-to-end | Add minimal E2E smoke tests | No Playwright/Cypress coverage despite architecture doc. |
| T-4 | P1 | Approval workflow | Add route tests for pending approval/approve/reject transitions | Ensure new enum values and audit details are correct. |
| T-5 | P2 | Notifications | Add test for approver-targeted notifications | Verify approvers receive approval requests. |
| T-6 | P2 | Non-USmax safeguards | Add UI/unit tests for confirm gates | Verify send/preview behavior for Non-USmax NDAs. |
| T-7 | P2 | Epic 9 UI fixes | Add component tests for UI regressions | Internal notes, templates/clauses removal, security settings copy. |
| T-8 | P2 | Internal notes | Add API + UI tests for create/edit/delete | Ensure only owner can edit/delete notes. |
| T-9 | P2 | Contact search UX | Add tests for search rendering + phone auto-fill | Validate job title/internal badge and phone copy. |
| T-10 | P2 | Email template merge | Add unit tests for placeholder coverage | Ensure `effectiveDate`, `ndaType`, `usMaxPosition`, `agencyGroup` resolve. |
| T-11 | P2 | Notifications dropdown | Add component tests for open/close and mark-read | Cover outside-click close + unread badge updates. |
| T-12 | P1 | Audit UI | Add component tests for NDA timeline + admin audit viewer | Verify icons, filters, empty states, export button. |
| T-13 | P2 | Audit export | Add route tests for `/api/admin/audit-logs/export` | Verify CSV/JSON format and audit export logging. |
| T-14 | P2 | Audit filtering/search | Add route tests for search/result filters | Validate user/entity/ip filters and search. |
| T-15 | P2 | Templates UI | Add component tests for RTF template CRUD | Cover create/edit/delete/toggle states. |
| T-16 | P2 | System config | Add API tests for admin config endpoints (when built) | Validate permissions, validation, audit logging. |
| T-17 | P2 | Recipient suggestions | Add tests for recipient suggestion service + endpoint | Ensure scoped results and ranking. |
| T-18 | P2 | Template routes | Add route tests for `/api/rtf-templates` CRUD | Verify permissions and audit logging. |
| T-19 | P2 | Document upload | Add route tests for upload validation + multer errors | Cover invalid type/size, missing file, and middleware limits. |
| T-20 | P2 | Auth UI | Add component tests for LoginPage/MFAChallenge/SessionWarningModal | Cover lockout messaging and session warning flow. |
| T-21 | P2 | Dashboard | Add service/route tests for dashboard data | Validate stale/waiting/expiring thresholds and metrics. |
| T-22 | P2 | Bulk download ZIP | Add tests for createBulkDownload + route | Verify ZIP response and audit logging. |
| T-23 | P2 | Access export | Add route tests for /api/admin/access-export and /api/users/:id/access-summary | Validate permissions and CSV output. |

### Performance Findings

| ID | Severity | Location | Issue | Recommendation |
| -- | -------- | -------- | ----- | -------------- |
| P-1 | Medium | `src/server/routes/ndas.ts` | Export endpoint loads up to 10k records in memory, potential memory pressure. | Stream CSV generation or enforce lower export limits with paging. |

### Ops / Reliability Findings

| ID | Severity | Location | Issue | Recommendation |
| -- | -------- | -------- | ----- | -------------- |
| O-1 | High | `prisma/schema.prisma`, `prisma/migrations/20251224000000_epic_10_customer_feedback/migration.sql` | Schema/client drift risk for production deploys. | Add CI check to verify schema vs migrations and regenerate client on change. |
| O-2 | Low | `src/server/index.ts`, `src/server/jobs/expirationJob.ts`, `src/server/jobs/emailQueue.ts` | Background jobs start without graceful shutdown hooks. | Add process signal handlers to call stop functions. |
| O-3 | Medium | `src/server/index.ts`, `src/server/services/errorReportingService.ts` | Global error handler only console.logs; unhandled server errors aren’t reported to Sentry and lack request context. | Call `reportError` in the global handler and capture uncaught exceptions/rejections with request metadata. |
| O-4 | Medium | `infrastructure/modules/s3/main.tf` | S3 cross-region replication not defined in Terraform despite Story 4.8. | Add CRR configuration (replication role + destination bucket) or document operational exception. |

---

## Hardening Backlog (Prioritized)

| Priority | Item | Rationale | Owner | Status |
| -------- | ---- | --------- | ----- | ------ |
| P0 | Align Prisma schema + enums with Epic 10 migration | Prevent runtime/type drift and unblock approval/expiration features |  |  |
| P0 | Fix status transitions/display config | Incorrect transitions and labels break lifecycle controls |  |  |
| P1 | Add audit logging for approval/reject route mutations | Compliance requirement for all mutations |  |  |
| P1 | Seed `nda:approve` permission and role mapping | Approval workflow otherwise unreachable |  |  |
| P1 | Correct expiration logic (EXPIRED status + expirationDate) | Spec mismatch impacts compliance alerts |  |  |
| P1 | Implement approver-targeted notifications | Approval workflow currently not notifying approvers |  |  |
| P2 | Enforce preview-before-send/route server-side | Prevent bypass of required preview |  |  |
| P2 | Add Create & Approve flow for self-approvers | Story 10.8 requirement |  |  |
| P2 | Add admin UI/API for default CC/BCC | Story 10.10 requirement |  |  |
| P3 | Close Epic 10 data cleanup/clarifications | Stories 10.15–10.17 |  |  |
| P1 | Remove Epic 9 placeholder UIs (clauses, escalation, IP/CORS/API keys) | Verification report flagged as not implemented |  |  |
| P1 | Update security alerts messaging | Avoid misleading compliance claims |  |  |
| P2 | Integrate notifications bell or remove | Mock UI creates false expectations |  |  |
| P2 | Complete internal notes edit UX | Story 9.1 requires edit + delete; edit missing |  |  |
| P2 | Fix contact search payload + UI formatting | Story 9.11/9.14 (job title/internal badge + phone auto-fill) |  |  |
| P2 | Align email template placeholders with merge fields | Story 9.15/9.16 mismatch causes unresolved tokens |  |  |
| P2 | Repair status-related tests and add E2E smoke tests | Test suite currently unreliable for status logic |  |  |
| P1 | Standardize audit entityType values + filter options | NDA audit trail + admin filters incomplete (email/user/template types) |  |  |
| P1 | Fix NDA activity timeline icons/colors + filter UI | Story 6.5/6.6 UX broken; action filter not wired |  |  |
| P1 | Implement email delivery/bounce tracking + log details | Story 6.10 requires delivery status + audit detail completeness |  |  |
| P2 | Fix audit export logging userId | Export audit entry uses Cognito sub instead of contactId |  |  |
| P2 | Add server-side audit search/result filtering | Story 6.8 search/result filter missing; UI only filters page |  |  |
| P3 | Add audit log dedupe or consolidate sources | Reduce duplicate entries from middleware + service logs |  |  |
| P1 | Build admin system configuration API + UI | Stories 7.14–7.19 (status/transition/notification thresholds, dropdown values, CC/BCC defaults) |  |  |
| P2 | Wire dropdown values from system config | Replace hard-coded NDA type/USmax position options |  |  |
| P2 | Implement email recipient suggestions | Story 7.12 missing API/UI |  |  |
| P2 | Add audit logging for RTF template CRUD | Template admin changes currently unaudited |  |  |
| P2 | Use system-configured dashboard thresholds | `dashboardService` still uses hard-coded defaults |  |  |
| P3 | Fix templates UI toggle + agency display | `template.active` bug; show agency name |  |  |
| P1 | Add malware scanning for uploads (or document exception) | FR151 requires basic security scanning; current validation is MIME/extension only |  |  |
| P2 | Wire global error handler to reportError + unhandled rejection capture | FR143 error monitoring coverage incomplete |  |  |
| P2 | Add offline detection banner + ErrorBoundary | FR145 reliability/UX requirement; no offline UI or crash boundary |  |  |
| P2 | Add retry UX/backoff for failed generate/send/upload | FR141 retry requirement; only draft auto-save retries |  |  |
| P2 | Add upload route/middleware tests | Upload validation logic not covered in route tests |  |  |
| P1 | Add S3 cross-region replication in Terraform | Story 4.8 DR requirement; no CRR config present |  |  |
| P2 | Implement required filter presets + thresholds | Missing Waiting/Stale/Active presets and “My NDAs” mismatch |  |  |
| P2 | Persist NDA list sort preference per user | Sorting uses localStorage only; no preferences API/table |  |  |
| P2 | Fix CANCELLED status filtering + labels | Duplicate INACTIVE references break filters/metrics/progression |  |  |
| P3 | Decide/implement in-browser RTF editor | Story 3.16 not implemented |  |  |
| P3 | Implement bulk user operations | Story 2.7 not implemented |  |  |
| P3 | Add auth UI/dashboard/access export/bulk download tests | Missing coverage for key Epic 1/2/4/5 paths |  |  |

---

## Notes and Decisions

-  

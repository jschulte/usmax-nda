---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - 'docs/prd.md'
  - 'docs/architecture.md'
workflowType: 'epics-and-stories'
lastStep: 0
project_name: 'usmax-nda'
user_name: 'Jonah'
date: '2025-12-15'
---

# Epics and User Stories - usmax-nda

**Project:** USMax NDA Management System
**Author:** Jonah
**Date:** 2025-12-15

---

## Requirements Extraction

### Functional Requirements (from PRD)

**Total:** 159 Functional Requirements across 21 capability areas

**NDA Lifecycle Management (FR1-16):**
- FR1: Users can create NDA request by entering required information
- FR2: Users can create NDA using 3 intelligent entry paths (company-first, clone, agency-first)
- FR3: Users can select RTF template when creating NDA
- FR4: System generates RTF from template with field-merge
- FR5: Users can preview generated RTF before finalizing
- FR6: Users can edit RTF template content before sending
- FR7: Users can save NDA as draft
- FR8: System auto-saves draft NDAs every 30 seconds
- FR9: Users can view all NDAs in sortable, paginated list
- FR10: Users can filter NDA list by 15 criteria
- FR11: Users can apply filter presets with one click
- FR12: Users can change NDA status
- FR13: System auto-changes status based on actions
- FR14: Users can mark NDA as Inactive or Cancelled
- FR15: Users can view NDA detail with full information
- FR16: Users can see visual status progression

**Document Management (FR17-24):**
- FR17: System stores documents in S3 with multi-region replication, versioning, encryption
- FR18: Users can upload documents (drag-drop or file picker)
- FR19: Users can mark uploaded document as "Fully Executed NDA"
- FR20: Users can download any document version
- FR21: Users can download all document versions as ZIP
- FR22: System tracks document metadata
- FR23: Users can view complete document version history
- FR24: System preserves all document versions indefinitely

**Email & Communication (FR25-31):**
- FR25: Users can compose and send NDA email with RTF attached
- FR26: System pre-fills email fields based on NDA data
- FR27: Users can select from multiple email templates
- FR28: Users can edit all email fields before sending
- FR29: System tracks email send events in history
- FR30: System sends email notifications to subscribed stakeholders
- FR31: Users can configure notification preferences

**Access Control & Permissions (FR32-40):**
- FR32: System enforces MFA for all users
- FR33: System implements granular RBAC (7 permissions)
- FR34: System supports role templates
- FR35: System enforces row-level security
- FR36-37: Users only access authorized Agency Groups/Subagencies
- FR38: System displays permission-aware UI
- FR39: System provides clear role indicators
- FR40: Users with insufficient permissions see helpful errors

**Agency & Subagency Management (FR41-48):**
- FR41-44: Admins can CRUD Agency Groups and Subagencies
- FR45-46: Admins can assign users to agency/subagency access
- FR47: Admins can view "users having access" summary
- FR48: System displays agency hierarchy visually

**Search, Filtering & Organization (FR49-55):**
- FR49: Users can search across all NDA fields
- FR50: Users can use type-ahead search
- FR51: Users can sort NDA list by any column
- FR52: System remembers user's column sort preference
- FR53: Users can apply date range shortcuts
- FR54: System shows recently used values at top of dropdowns
- FR55: Users can paginate through large result sets

**Dashboard & Notifications (FR56-62):**
- FR56: Users see personalized dashboard on login
- FR57: Dashboard displays at-a-glance metrics
- FR58: Dashboard identifies stale NDAs
- FR59: Dashboard shows "waiting on 3rd party" with time in state
- FR60: Dashboard alerts to approaching expiration
- FR61: Users receive email notifications when NDA changes status
- FR62: Users can configure notification preferences

**Audit & History Tracking (FR63-73):**
- FR63: System logs ALL user actions with comprehensive details
- FR64: System tracks NDA field changes with before/after values
- FR65: System tracks all document downloads
- FR66: System tracks all login attempts
- FR67: Users can view complete audit trail for any NDA
- FR68: System displays audit trail as visual timeline
- FR69: Admins can access centralized audit log viewer
- FR70: Admins can filter audit logs
- FR71: Admins can export audit logs to CSV/Excel
- FR72: System tracks email send events
- FR73: System preserves audit trail indefinitely

**User Management (FR74-81):**
- FR74-77: Admins can CRUD users and assign roles/agency access
- FR78: Users can view user directory with search
- FR79: System supports user profiles with email signature
- FR80: System provides user search with auto-complete
- FR81: Admins can view access control summary for any user

**Template Management (FR82-91):**
- FR82-87: Admins can CRUD RTF templates, organize, set defaults, merge fields
- FR88-90: Admins can CRUD email templates with user signatures
- FR91: System suggests templates based on agency/type

**Smart Suggestions & Intelligence (FR92-96):**
- FR92-95: System suggests companies, fields, recipients based on historical data
- FR96: System improves suggestions over time (Phase 1: rules, Phase 2: ML)

**System Administration (FR97-103):**
- FR97-98: System sends alerts, tracks errors with Sentry
- FR99: Admins can view system health dashboards
- FR100-101: System retries failed emails, logs to failsafe
- FR102: System provides weekly health reports
- FR103: System enables zero-downtime deployments

**POC Management (FR114-119):**
- FR114: Users designate Opportunity POC (internal user)
- FR115: Users enter Contracts POC details (optional)
- FR116: Users enter Relationship POC details (required)
- FR117: Users enter Contacts POC details (optional - TBD)
- FR118: System provides "Copy POC Details" functionality
- FR119: System validates POC email/phone formats

**Non-USMax NDA Handling (FR120-121):**
- FR120: Users can mark NDA as "Non-USMax NDA"
- FR121: System handles Non-USMax per configured behavior (TBD customer)

**Admin Configuration (FR122-128):**
- FR122-124: Admins can add/edit/reorder status values, configure auto-transitions
- FR125-127: Admins can configure email notification rules, dashboard thresholds, CC/BCC defaults
- FR128: Admins can configure dropdown field values

**Data Security & Encryption (FR129-134):**
- FR129-131: System encrypts data at rest (DB, S3) and in transit (TLS 1.3)
- FR132-134: S3 multi-region, pre-signed URLs, access logging

**Disaster Recovery (FR135-139):**
- FR135-137: Automated backups, restore capability, DR testing
- FR138: Database failover (multi-AZ)
- FR139: Handle regional AWS outages gracefully

**Error Handling & Recovery (FR140-146):**
- FR140-146: User-friendly errors, retry logic, graceful degradation, offline detection, form preservation

**Data Validation (FR147-153):**
- FR147-153: Required field validation (client + server), format validation, character limits, referential integrity, real-time feedback

**Data Import/Export (FR154-156):**
- FR154-155: Export NDA list and audit logs to CSV/Excel
- FR156: Import NDAs from email archives (Phase 1.5/2)

**Keyboard Shortcuts (FR157-159):**
- FR157-159: Keyboard shortcuts, context menus, bulk operations (Phase 1.5/2)

### Non-Functional Requirements (from PRD)

**Total:** 63 Non-Functional Requirements across 11 quality categories

**Performance (NFR-P1-P6):**
- <2s page load, <500ms API response, <400KB bundle, <500ms navigation, <3s interactive

**Security (NFR-S1-S10):**
- MFA mandatory, encryption at rest/transit, TLS 1.3, pre-signed URLs, granular RBAC, row-level security, auth logging, configurable session timeout, no localStorage tokens, file upload validation

**Reliability (NFR-R1-R13):**
- 99.9% uptime, ≤1 critical bug first 30 days, <0.1% error rate, zero data loss, daily Lightsail snapshots, S3 multi-region, RTO <4h, RPO <24h, instance monitoring, low-downtime deployments, email retry, graceful degradation, tested recovery

**Compliance (NFR-C1-C7):**
- CMMC Level 1, FAR retention (indefinite), comprehensive audit (100% actions), immutable logs, audit export, document access tracking, field change tracking

**Accessibility (NFR-A1-A7):**
- WCAG 2.1 AA (Section 508), keyboard navigation, screen reader support, color contrast, focus indicators, clear labels, no seizure content

**Maintainability (NFR-M1-M9):**
- ≥80% test coverage, <5min test execution, zero flaky tests, all tests pass before deploy, TypeScript strict, code review required, enforced conventions, comprehensive docs, new dev onboard <1 day

**Monitoring (NFR-O1-O7):**
- Sentry error capture, <5min alert response, health dashboards, weekly reports, zero silent failures, performance tracking, failsafe logging

**Usability (NFR-U1-U6):**
- <3 clicks common tasks, explicit confirmations, user-friendly errors, helpful permission tooltips, auto-save 30s, session timeout warnings

**Browser Compatibility (NFR-B1-B3):**
- Chrome/Edge/Firefox/Safari latest 2 versions, no IE11, responsive desktop/tablet/mobile

**Data Integrity (NFR-D1-D5):**
- Referential integrity, client + server validation, character limits, date format consistency, immutable document versions

**Cost Efficiency (NFR-CE1-CE3):**
- <$100/month, Lightsail flat $40, minimal S3 cost ($57-91/month total)

### Additional Requirements (from Architecture)

**Infrastructure & Deployment:**
- AWS Lightsail 4GB instance with Docker Compose
- Nginx reverse proxy serving React + proxying /api to Express
- PostgreSQL 15 in Docker container with persistent volume
- Let's Encrypt SSL certificates (auto-renewal)
- GitHub Actions CI/CD (test → build → snapshot → deploy → migrate → health check)

**Database:**
- 17-table schema with proper FK relationships (no JSONB for entities!)
- UUIDs for PKs + display_id for user-friendly numbers
- Indexes on all 15 filterable fields
- Row-level security via agency-based WHERE clauses
- Prisma ORM for type-safe queries

**Security Implementation:**
- AWS Cognito MFA integration (JWT tokens)
- Middleware pipeline: auth → permissions → agency-scope → handler → audit
- Row-level security helper function (scopeNDAsToUser) mandatory on all NDA queries
- Audit logging middleware (captures all POST/PUT/DELETE automatically)

**Testing Infrastructure:**
- Local: Docker Compose (PostgreSQL + LocalStack S3 + MailHog)
- CI: GitHub Actions with PostgreSQL service
- E2E: Playwright against test Lightsail instance
- Test data factories with Faker.js
- Mock external services (aws-sdk-client-mock)

**RTF Generation:**
- Use `docx` library to generate DOCX → export to RTF
- Handlebars template engine for field-merge
- Store templates in database (rtf_templates table)

**Migration Strategy:**
- Prisma migrations with Lightsail snapshots before every deploy
- Backward-compatible only (first 6 months)
- PR review required for all schema changes
- Brief downtime acceptable (<5 min, off-hours)

**Critical Implementation Patterns:**
- Database: snake_case, TypeScript: camelCase, Components: PascalCase
- Never use `any` type (use proper types or `unknown`)
- Always handle async errors (try/catch in services, Express catches in controllers)
- Never skip row-level security on NDA queries
- Always log mutations to audit_log
- Validate client AND server (never trust client)
- Use path aliases (@/, @server/)
- Test isolation with factories (fresh data per test)

---

### Extracted Requirements Summary

**Functional Requirements:** 159 FRs across:
- NDA Lifecycle (16), Documents (8), Email (7), Access Control (9), Agency Mgmt (8), Search (7), Dashboard (7), Audit (11), Users (8), Templates (10), Smart Features (5), System Admin (7), POC (6), Non-USMax (2), Config (7), Security (6), Disaster Recovery (5), Error Handling (7), Validation (7), Import/Export (3), Keyboard (3)

**Non-Functional Requirements:** 63 NFRs across:
- Performance (6), Security (10), Reliability (13), Compliance (7), Accessibility (7), Maintainability (9), Monitoring (7), Usability (6), Browser (3), Data Integrity (5), Cost (3)

**Additional Requirements:** Infrastructure (Docker/Lightsail), Database (17-table schema), Security patterns, Testing infrastructure, RTF generation, Migration strategy, Critical implementation patterns

**Requirements validated and complete.**

### FR Coverage Map

**Epic 1: Foundation & Authentication**
- FR32: MFA enforcement
- FR33: Granular RBAC implementation
- FR34: Role templates (Read-Only, NDA User, Limited User, Admin)
- FR35: Row-level security enforcement
- FR36-37: Agency-based access control
- FR38: Permission-aware UI (disabled buttons with tooltips)
- FR39: Role indicators (badges)
- FR40: Helpful permission error messages
- FR111-113: Session management (configurable timeout, warnings, auth event logging)

**Epic 2: Agency & User Management**
- FR41-44: Agency Groups CRUD (cannot delete if NDAs exist)
- FR45-46: Access grant assignment (group-level, subagency-level)
- FR47: "Users having access" summary visualization
- FR48: Agency hierarchy display
- FR74-77: User/Contact CRUD, deactivation, role assignment, agency access
- FR78: User directory with search/filtering
- FR79: User profiles with email signatures
- FR80: User auto-complete search (3 letters → matches with context)
- FR81: Access control summary per user

**Epic 3: Core NDA Lifecycle**
- FR1: Create NDA request with required fields
- FR2: 3 intelligent entry paths (company-first, clone, agency-first)
- FR3: RTF template selection
- FR4: RTF generation with field-merge
- FR5: Preview generated RTF
- FR6: Edit RTF content before sending
- FR7: Save NDA as draft
- FR8: Auto-save drafts every 30 seconds
- FR9: View NDAs in sortable, paginated list
- FR10: Filter by 15 criteria
- FR11: Filter presets ("My NDAs", "Expiring Soon", etc.)
- FR12: Change NDA status
- FR13: Auto-status transitions (send → Emailed, upload → In Revision, etc.)
- FR14: Mark Inactive or Cancelled (reversible)
- FR15: View NDA detail with full information
- FR16: Visual status progression (Amazon-style circles)
- FR25-28: Email composition (pre-fill, template selection, editing, send)
- FR29: Email send event tracking
- FR30-31: Email notifications to stakeholders
- FR114-119: POC management (Opportunity, Contracts, Relationship, Contacts POCs)
- FR120-121: Non-USMax NDA handling (configurable behavior)

**Epic 4: Document Management**
- FR17: S3 multi-region storage (versioning, encryption)
- FR18: Document upload (drag-drop or file picker)
- FR19: Mark as "Fully Executed NDA" (triggers status + date)
- FR20: Download document (pre-signed S3 URLs)
- FR21: Download all versions as ZIP
- FR22: Document metadata tracking
- FR23: View complete document version history
- FR24: Preserve all versions indefinitely

**Epic 5: Search, Filtering & Dashboard**
- FR49: Search across all NDA fields
- FR50: Type-ahead search (results as you type)
- FR51: Sort by any column
- FR52: Remember user's sort preference
- FR53: Date range shortcuts ("Last 30 Days", etc.)
- FR54: Recently used values at top of dropdowns
- FR55: Pagination with configurable page size
- FR56: Personalized dashboard (recent NDAs, subscriptions, activity, alerts)
- FR57: At-a-glance metrics (active count, expiring soon, cycle time)
- FR58: Identify stale NDAs (created but not emailed after 2 weeks)
- FR59: Show "waiting on 3rd party" with time in state
- FR60: Alert to approaching expiration (30/60/90 day thresholds)
- FR61-62: Email notification preferences

**Epic 6: Audit Trail & Compliance**
- FR63: Log ALL actions (who, what, when, where, IP)
- FR64: Track field changes with before/after values
- FR65: Track all document downloads
- FR66: Track all login attempts (successful + failed)
- FR67: View complete audit trail per NDA
- FR68: Audit trail as visual timeline
- FR69: Centralized audit log viewer (admin only)
- FR70: Filter audit logs (user, action, date, NDA, IP)
- FR71: Export audit logs to CSV/Excel
- FR72: Track email send events (recipients, delivery status)
- FR73: Preserve audit trail indefinitely (immutable)

**Epic 7: Templates & Configuration**
- FR82-87: RTF template management (CRUD, organize, defaults, field-merge)
- FR88-90: Email template management (CRUD, user signatures)
- FR91: Template suggestions based on agency/type
- FR92-96: Smart suggestions (companies, fields, recipients, learning over time)
- FR122-128: Admin configuration (status values, auto-transitions, notification rules, thresholds, CC/BCC defaults, dropdown values)

**Epic 8: Infrastructure & Operational Excellence**
- FR97-103: Monitoring (error alerts, Sentry tracking, health dashboards, email retry, failsafe logging, health reports, deployments)
- FR104-110: Data validation (required fields, formats, character limits, date ranges, file validation, referential integrity, real-time feedback)
- FR129-134: Encryption (database, S3, TLS 1.3, pre-signed URLs, access logging)
- FR135-139: Disaster recovery (backups, restore, DR testing, failover, regional outage handling)
- FR140-146: Error handling (user-friendly messages, retry operations, queued email retry, error logging, graceful degradation, offline detection, form preservation)
- FR147-153: Data validation enforcement
- FR154-156: Data import/export (CSV export, audit export, email archive import Phase 2)
- FR157-159: Keyboard shortcuts & power user features (Phase 1.5/2)
- All 63 NFRs: Performance, security, reliability, compliance, accessibility, maintainability, monitoring, usability, browser compatibility, data integrity, cost efficiency

**Coverage:** All 159 FRs mapped to epics ✓

## Epic List

### Epic 1: Foundation & Authentication
Users can securely log in with MFA and are scoped to their authorized agencies.
**FRs covered:** FR32-40, FR111-113

### Epic 2: Agency & User Management
Admins can set up organizational structure (12 agency groups, 40-50 subagencies) and assign user access.
**FRs covered:** FR41-48, FR74-81

### Epic 3: Core NDA Lifecycle
Users can create NDAs, generate RTF documents, send via email, track status, and manage POCs.
**FRs covered:** FR1-16, FR25-31, FR114-121

### Epic 4: Document Management & Execution
Users can upload fully executed NDAs and maintain complete document history in S3 multi-region storage.
**FRs covered:** FR17-24

### Epic 5: Search, Filtering & Dashboard
Users can quickly find NDAs, see what needs attention, and stay informed via personalized dashboard.
**FRs covered:** FR49-62

### Epic 6: Audit Trail & Compliance
System maintains comprehensive history, admins can review all actions, export for compliance audits.
**FRs covered:** FR63-73

### Epic 7: Templates & Configuration
Admins can manage RTF/email templates and system settings; users benefit from smart suggestions.
**FRs covered:** FR82-96, FR122-128

### Epic 8: Infrastructure & Operational Excellence
System is bulletproof, monitored, validated, and admins can manage health/recovery.
**FRs covered:** FR97-110, FR129-159, All 63 NFRs
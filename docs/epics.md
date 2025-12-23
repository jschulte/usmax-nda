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
---


## Epic 1: Foundation & Authentication

**Epic Goal:** Users can securely log in with MFA and are scoped to their authorized agencies

**FRs Covered:** FR32-40, FR111-113

### Story 1.1: AWS Cognito MFA Integration

**As a** USMax staff member  
**I want** to log in with my email and MFA code  
**So that** I can securely access the NDA system

**Acceptance Criteria:**

**Given** I have a valid USMax email account  
**When** I enter my email and password on the login page  
**Then** I receive an MFA challenge (SMS or authenticator app)  
**And** After entering the correct MFA code, I receive a JWT access token  
**And** I am redirected to the dashboard

**Given** I enter an incorrect MFA code  
**When** I submit the code  
**Then** I see an error message "Invalid MFA code, please try again"  
**And** I can retry up to 3 times before lockout

**Given** I am logged in  
**When** My session reaches the configured timeout (default 4 hours)  
**Then** I see a warning 5 minutes before expiration  
**And** I am logged out and redirected to login if I don't refresh

---

### Story 1.2: JWT Middleware & User Context

**As a** developer  
**I want** every API call to validate JWT tokens and load user context  
**So that** all endpoints are protected and have access to user permissions

**Acceptance Criteria:**

**Given** A user makes an API request with valid JWT  
**When** The request reaches Express middleware  
**Then** JWT signature is validated against Cognito public keys  
**And** User ID is extracted from token  
**And** User's permissions are loaded from database  
**And** User's agency access grants are loaded  
**And** req.user is populated with {id, email, permissions, authorizedAgencies}

**Given** A user makes an API request without JWT  
**When** The request reaches authenticateJWT middleware  
**Then** 401 Unauthorized is returned with message "Authentication required"

**Given** A user makes an API request with expired JWT  
**When** The token validation occurs  
**Then** 401 Unauthorized is returned with message "Token expired, please login again"

---

### Story 1.3: RBAC Permission System

**As an** admin  
**I want** to assign granular permissions to users via roles  
**So that** I can control who can create, edit, email, and manage NDAs

**Acceptance Criteria:**

**Given** The system is initialized  
**When** Database is seeded  
**Then** 4 default roles exist: Admin, NDA User, Limited User, Read-Only  
**And** 11 permissions exist (7 NDA permissions + 4 admin permissions)  
**And** Role-permission mappings are configured per architecture

**Given** An admin assigns a user to "Limited User" role  
**When** The user logs in  
**Then** req.user.permissions includes: nda:upload_document, nda:view  
**And** req.user.permissions does NOT include: nda:create, nda:send_email

**Given** A user without nda:send_email permission tries to send email  
**When** POST /api/ndas/:id/send-email is called  
**Then** checkPermissions middleware returns 403 Forbidden  
**And** Response includes helpful message: "You don't have permission to send emails - contact admin"

---

### Story 1.4: Row-Level Security Implementation

**As a** user  
**I want** to only see NDAs for my authorized agencies  
**So that** I don't access NDAs outside my scope (compliance requirement)

**Acceptance Criteria:**

**Given** User has access to Agency Group "DoD"  
**When** User queries GET /api/ndas  
**Then** scopeToAgencies middleware applies WHERE filter  
**And** Only NDAs where subagency.agencyGroup = "DoD" are returned  
**And** NDAs from other agencies (Commercial, Fed Civ) are NOT visible

**Given** User has access to specific Subagency "Air Force" (not entire DoD group)  
**When** User queries NDAs  
**Then** Only NDAs where subagency = "Air Force" are returned  
**And** Other DoD subagencies (Army, Navy) are NOT visible

**Given** A user tries to access GET /api/ndas/{id} for unauthorized NDA  
**When** NDA belongs to agency user doesn't have access to  
**Then** 404 Not Found is returned (not 403 - don't reveal NDA exists)

**Given** Row-level security helper function scopeNDAsToUser(userId)  
**When** Called with user ID  
**Then** Returns Prisma where clause filtering by authorized subagencies  
**And** This helper is used on EVERY prisma.nda.findMany/findFirst/count call

---

## Epic 2: Agency & User Management

**Epic Goal:** Admins can set up organizational structure (12 agency groups, 40-50 subagencies) and assign user access

**FRs Covered:** FR41-48, FR74-81

### Story 2.1: Agency Groups CRUD

**As an** admin  
**I want** to create, edit, and view Agency Groups  
**So that** I can organize subagencies into logical groupings

**Acceptance Criteria:**

**Given** I am logged in as an admin  
**When** I navigate to Admin → Agency Groups  
**Then** I see a list of existing agency groups (initially: DoD, Commercial, Fed Civ, Healthcare, etc. - 12 total)

**Given** I click "Create Agency Group"  
**When** I enter name "Fed DOD - Air Force" and description  
**Then** New agency group is created  
**And** Appears in the agency group list  
**And** audit_log records "agency_group_created" action

**Given** I try to delete an agency group  
**When** Subagencies exist under that group  
**Then** Delete is prevented with error: "Cannot delete agency group with existing subagencies"  
**And** UI shows count of subagencies blocking deletion

**Given** I try to create duplicate agency group name  
**When** Name already exists  
**Then** 400 Bad Request with error: "Agency group name must be unique"

---

### Story 2.2: Subagencies CRUD

**As an** admin  
**I want** to create subagencies within agency groups  
**So that** I can represent the detailed organizational structure

**Acceptance Criteria:**

**Given** Agency Group "DoD" exists  
**When** I click "Add Subagency" on DoD  
**Then** I can create subagency "Air Force" under DoD  
**And** Subagency appears in DoD's subagency list  
**And** audit_log records "subagency_created"

**Given** I view Agency Groups list  
**When** Displaying each group  
**Then** I see subagencies listed under each group (semicolon-delimited or expandable tree)  
**And** Count of subagencies shown per group

**Given** I try to delete subagency "Air Force"  
**When** NDAs exist assigned to Air Force  
**Then** Delete is prevented: "Cannot delete subagency with existing NDAs"  
**And** Shows count of NDAs blocking deletion

**Given** I try to create duplicate subagency name within same group  
**When** "Air Force" already exists in DoD  
**Then** Error: "Subagency name must be unique within agency group"

---

### Story 2.3: Grant Agency Group Access to Users

**As an** admin  
**I want** to grant users access to entire agency groups  
**So that** they can see all NDAs across all subagencies in that group

**Acceptance Criteria:**

**Given** User "Kelly Davidson" and Agency Group "DoD" exist  
**When** I open DoD access management  
**And** Search for "Kelly" (auto-complete shows matches)  
**And** Click "Grant Group Access"  
**Then** Kelly is added to "users having access to DoD" list  
**And** agency_group_access table records: contact_id=Kelly, agency_group_id=DoD, granted_by=me, granted_at=now  
**And** audit_log records "access_granted" action  
**And** Kelly can now see ALL NDAs in DoD subagencies (Air Force, Army, Navy, etc.)

**Given** I view "Users having access to Agency Group"  
**When** Displaying DoD access  
**Then** I see list of all users with group-level access  
**And** For each user, shows: name, email, granted_by, granted_at

**Given** I revoke Kelly's group access  
**When** I click "Revoke Access"  
**Then** Kelly removed from access list  
**And** Kelly can no longer see ANY DoD NDAs  
**And** audit_log records "access_revoked"

---

### Story 2.4: Grant Subagency-Specific Access

**As an** admin  
**I want** to grant users access to specific subagencies only  
**So that** I can provide granular access control (not entire group)

**Acceptance Criteria:**

**Given** User "John Smith" and Subagency "Air Force" (within DoD) exist  
**When** I open Air Force subagency access management  
**And** Search for John (auto-complete)  
**And** Click "Grant Subagency Access"  
**Then** John added to "users having access to this subagency" list  
**And** subagency_access table records grant  
**And** John can see ONLY Air Force NDAs (not Army, Navy, or other DoD subagencies)

**Given** User has both group access (DoD) and specific subagency access (NIH in Fed Civ)  
**When** User queries NDAs  
**Then** User sees: All DoD subagencies + NIH  
**And** Query uses UNION of group access + subagency access

---

### Story 2.5: User/Contact Management

**As an** admin  
**I want** to manage the user directory with contact information  
**So that** I can assign roles, access, and use contacts for NDA POCs

**Acceptance Criteria:**

**Given** I am logged in as admin  
**When** I navigate to Admin → Users  
**Then** I see user directory with columns: Name, Email, Work Phone, Cell Phone, Job Title, Roles, Agency Access

**Given** I click "Create User"  
**When** I enter: firstName="Jennifer", lastName="Park", email="j.park@usmax.com", isInternal=true  
**And** Submit  
**Then** Contact created in database  
**And** Available in user search/autocomplete  
**And** Can be assigned to NDAs as POC  
**And** audit_log records "user_created"

**Given** I want to assign Jennifer to "NDA User" role  
**When** I select Jennifer, click "Manage Roles", select "NDA User"  
**Then** contact_roles table updated  
**And** Jennifer's permissions now include nda:create, nda:update, nda:upload_document, nda:send_email, nda:mark_status, nda:view  
**And** audit_log records "role_assigned"

**Given** User search with auto-complete  
**When** I type "jen" in search box  
**Then** Shows "Jennifer Park (NDA User, IT Services)" with role and department context  
**And** Results update as I type (type-ahead)

---

### Story 2.6: Access Control Summary View

**As an** admin  
**I want** to view a user's complete access summary  
**So that** I can audit who has access to what

**Acceptance Criteria:**

**Given** I view user "Kelly Davidson" profile  
**When** I navigate to Access tab  
**Then** I see summary showing:
- Roles: Admin
- Agency Group Access: DoD, Commercial, Fed Civ (with granted_by and granted_at)
- Subagency Access: NIH (Fed Civ group), NASA (Fed Civ group)
- Permissions: (all 11 permissions listed)

**Given** I need to export access control matrix  
**When** I click "Export Users with Access"  
**Then** CSV downloaded with columns: User, Roles, Agency Groups, Subagencies, Granted By, Granted At  
**And** Can be used for CMMC compliance audit

---

## Epic 3: Core NDA Lifecycle

**Epic Goal:** Users can create NDAs, generate RTF documents, send via email, track status, and manage POCs

**FRs Covered:** FR1-16, FR25-31, FR114-121

### Story 3.1: Create NDA with Basic Form

**As an** NDA operations user (Kelly)  
**I want** to create a new NDA by filling out a form with all required fields  
**So that** I can initiate the NDA process for a new partner opportunity

**Acceptance Criteria:**

**Given** I am logged in with nda:create permission  
**When** I click "Create NDA" from dashboard or NDA list  
**Then** Form displays with fields: Company Name, Agency/Subagency (scoped to my access), Agency/Office Name, Abbreviated Opportunity Name, Authorized Purpose (≤255 chars), Effective Date, USMax Position dropdown, Non-USMax NDA checkbox, Opportunity POC (me pre-selected), Contracts POC (optional), Relationship POC (required), Contacts POC (optional - TBD)

**Given** I fill required fields correctly  
**When** I click "Save as Draft"  
**Then** NDA created with status="Created"  
**And** NDA stored in database with UUID  
**And** Display ID assigned (e.g., NDA #1591)  
**And** audit_log records "nda_created"  
**And** I'm redirected to NDA detail page

**Given** I miss required field (e.g., Company Name)  
**When** I try to submit  
**Then** Real-time validation shows inline error: "Company Name is required"  
**And** Submit button disabled until valid

**Given** I enter Authorized Purpose >255 characters  
**When** I type  
**Then** Character counter shows "255/255" and prevents further input  
**And** Validation error if I try to bypass

---

### Story 3.2: Smart Form Auto-Fill (Company-First Entry Path)

**As an** NDA user  
**I want** to select a company and have common fields auto-fill  
**So that** I can create NDAs faster (15 fields → 3-4 manual entries)

**Acceptance Criteria:**

**Given** I start creating NDA  
**When** I select company "TechCorp Solutions Inc." from dropdown (recently used at top)  
**Then** Form auto-fills:
- Company City: "San Francisco"
- Company State: "CA"
- State of Incorporation: "Delaware"
- Relationship POC: Last person used for TechCorp
- Contracts POC: Standard contact if exists
- Agency: Most common agency for TechCorp (e.g., DoD if 80% of TechCorp NDAs are DoD)

**And** User only needs to manually enter: Authorized Purpose, Abbreviated Opportunity Name, Effective Date  
**And** Can override any auto-filled value

---

### Story 3.3: Clone/Duplicate NDA (Second Entry Path)

**As an** NDA user  
**I want** to duplicate an existing NDA and change only what's different  
**So that** I can quickly create similar NDAs (common for repeat partners)

**Acceptance Criteria:**

**Given** I'm viewing NDA #1590 (TechCorp, DoD Air Force, Prime)  
**When** I click "Clone NDA" button  
**Then** Create NDA form opens pre-filled with ALL fields from NDA #1590  
**And** Form shows banner: "Cloned from NDA #1590"  
**And** I change only: Authorized Purpose, Abbreviated Opportunity Name, Effective Date  
**And** Click "Create"  
**Then** New NDA created with new UUID and display ID  
**And** All other fields match original  
**And** audit_log includes: cloned_from_nda_id=1590

---

### Story 3.4: Agency-First Entry Path with Suggestions

**As an** NDA user  
**I want** to select agency first and get intelligent suggestions  
**So that** system helps me with common patterns for that agency

**Acceptance Criteria:**

**Given** I start creating NDA  
**When** I select Agency "DoD Air Force" first  
**Then** System suggests:
- Common companies for Air Force (e.g., "Lockheed Martin", "Boeing", "Northrop Grumman")
- Typical NDA Type for DoD (e.g., "Mutual")
- USMax Position for Air Force contracts (e.g., "Prime")
- Most-used RTF template for DoD

**And** Suggestions appear as top options in dropdowns or auto-complete  
**And** I can still select any value (not restricted to suggestions)

---

### Story 3.5: RTF Document Generation

**As an** NDA user  
**I want** to generate an RTF document from template with all NDA fields merged  
**So that** I have a formatted NDA ready to send to the partner

**Acceptance Criteria:**

**Given** I complete NDA form and click "Generate & Review"  
**When** System generates document  
**Then** Uses selected RTF template (or default if not selected)  
**And** Merges fields: {{companyName}}, {{authorizedPurpose}}, {{effectiveDate}}, {{agencyOfficeName}}, etc.  
**And** Generates DOCX using `docx` library → exports to RTF  
**And** Document stored in S3 us-east-1 with key: `ndas/{nda_id}/{doc_id}-{filename}.rtf`  
**And** S3 CRR replicates to us-west-2  
**And** documents table INSERT: nda_id, filename, s3_key, document_type='Generated', uploaded_by=me  
**And** audit_log records "document_generated"

**Given** RTF generation fails (template error, S3 unavailable)  
**When** Error occurs  
**Then** User sees: "Document generation failed, please try again"  
**And** Error reported to Sentry with context  
**And** User can retry or upload manual RTF

**Given** Non-USMax NDA checkbox is checked  
**When** Generating document  
**Then** Behavior depends on system_config.non_usmax_skip_template setting  
**And** If skip=true: No document generated, user must upload manually  
**And** If skip=false: Generate from alternate template or standard

---

### Story 3.6: Draft Management & Auto-Save

**As an** NDA user  
**I want** drafts to auto-save every 30 seconds  
**So that** I never lose work if browser crashes or I navigate away

**Acceptance Criteria:**

**Given** I'm filling out Create NDA form  
**When** 30 seconds pass since last change  
**Then** Form data auto-saves to database  
**And** Toast notification briefly shows: "Draft saved ✓"  
**And** No page reload or navigation interruption

**Given** I close browser while editing draft  
**When** I log back in and navigate to "My Drafts" (filter preset)  
**Then** Draft NDA appears with status="Created" and incomplete fields flagged  
**And** I can click "Continue Editing"  
**And** Form reloads with all previously entered data

**Given** Auto-save fails (network error)  
**When** 30s interval triggers  
**Then** Retry automatically after 5 seconds  
**And** If retry fails, show warning: "Auto-save failed - check connection"  
**And** Form data preserved in browser memory

---

### Story 3.7: NDA List with Filtering

**As an** NDA user  
**I want** to view and filter my NDAs  
**So that** I can quickly find specific NDAs among many records

**Acceptance Criteria:**

**Given** I navigate to "All NDAs" or "My NDAs" (filter preset)  
**When** Page loads  
**Then** Table displays with columns: Display ID, Company, Agency, Status, Effective Date, Requested Date, Latest Change, Actions  
**And** NDAs automatically filtered by my authorized agencies (row-level security)  
**And** Sortable by any column (click header)  
**And** Paginated (default 20 per page, configurable)

**Given** I open filter panel  
**When** 15 filter fields displayed  
**Then** Can filter by: Agency, Company Name, City, State, Type, State of Incorporation, Agency/Office Name, Non-USMax checkbox, Effective Date range (≥, ≤), Requested Date range, 3 POC name filters  
**And** Filters use type-ahead search (not long dropdown scrolling)  
**And** Recently used values at top of dropdowns

**Given** I click filter preset "Expiring Soon"  
**When** Preset applied  
**Then** Filters set to: Effective Date + typical term ≤ 30 days from now  
**And** Shows NDAs approaching expiration

---

### Story 3.8: NDA Detail View

**As an** NDA user  
**I want** to view complete NDA information on a detail page  
**So that** I can see all fields, documents, history, and take actions

**Acceptance Criteria:**

**Given** I click on NDA #1590 from list  
**When** Detail page loads  
**Then** Shows all NDA fields (company, agency, POCs, dates, purpose, etc.)  
**And** Document list (all versions with download links)  
**And** Email history (sent emails with recipients)  
**And** Audit timeline (chronological, visual with icons)  
**And** Status progression visualization (circles: Created → Emailed → etc.)  
**And** Action buttons: Edit, Send Email, Upload Document, Change Status

**Given** I don't have permission to send email  
**When** Viewing NDA detail  
**Then** "Send Email" button is disabled (grayed out)  
**And** Tooltip shows: "You don't have permission to send emails"

---

### Story 3.9: Status Progression Visualization

**As an** NDA user  
**I want** to see visual status progression like Amazon order tracking  
**So that** I quickly understand where the NDA is in its lifecycle

**Acceptance Criteria:**

**Given** NDA has status="Emailed"  
**When** Viewing NDA detail  
**Then** Status circles displayed:
- ● Created (12/01/2025 2:30 PM) - filled circle
- ● Emailed (12/02/2025 9:15 AM) - filled circle
- ○ In Revision - empty circle (not reached)
- ○ Fully Executed - empty circle

**And** Filled circles show date/time achieved  
**And** Current status highlighted/bold  
**And** Visual line connects circles showing progression

**Given** NDA status changes from "Emailed" to "In Revision"  
**When** Document uploaded (not fully executed)  
**Then** "In Revision" circle fills in with timestamp  
**And** Progression updates automatically

---

### Story 3.10: Email Composition & Sending

**As an** NDA user with nda:send_email permission  
**I want** to compose and send NDA email with RTF attached  
**So that** I can distribute the NDA to the partner for signature

**Acceptance Criteria:**

**Given** NDA #1590 has generated RTF document  
**When** I click "Send Email"  
**Then** Email composer opens pre-filled:
- Subject: "NDA from USMax - for TechCorp for OREM TMA 2025 at DHS CBP"
- TO: relationship_contact.email
- CC: Kelly Davidson (me), Chris Martinez, David Wu (from config)
- BCC: Leadership list (from config)
- Body: Email template with merged fields
- Attachment: Latest RTF document

**And** I can edit any field before sending  
**And** I can select different email template from dropdown

**Given** I click "Send"  
**When** Email is queued  
**Then** SES sends email via pg-boss queue  
**And** NDA status auto-changes to "Emailed"  
**And** nda_emails table records send event  
**And** audit_log records "email_sent"  
**And** Toast shows: "Email sent ✓"

**Given** Email send fails (SES error)  
**When** Failure detected  
**Then** pg-boss retries (3 attempts, exponential backoff)  
**And** If all attempts fail, user sees: "Email failed to send, queued for retry"  
**And** Error logged to Sentry  
**And** Admin alerted if persistent failure

---

### Story 3.11: Email Notifications to Stakeholders

**As an** NDA stakeholder  
**I want** to receive email notifications when NDAs I'm subscribed to change status  
**So that** I stay informed without constantly checking the system

**Acceptance Criteria:**

**Given** I am listed as NDA stakeholder with notify_on_changes=true  
**When** NDA status changes from "Created" to "Emailed"  
**Then** I receive email notification:
- Subject: "NDA Status Update: TechCorp NDA - Now Emailed"
- Body: Details of status change, link to view NDA, timestamp, changed by whom

**Given** I have notification preferences  
**When** I navigate to My Settings → Notifications  
**Then** I can toggle which events trigger emails:
- NDA Created, NDA Emailed, Document Uploaded, Status Changed, Fully Executed  
**And** Preferences stored in notification_preferences table

---

### Story 3.12: Status Management & Auto-Transitions

**As an** NDA user  
**I want** status to automatically change based on my actions  
**So that** I don't have to manually update status every time

**Acceptance Criteria:**

**Given** NDA has status="Created"  
**When** User clicks "Send Email" and email successfully sent  
**Then** Status automatically changes to "Emailed"  
**And** audit_log records status change with before="Created", after="Emailed"

**Given** NDA has status="Emailed"  
**When** User uploads document WITHOUT "Fully Executed" checkbox  
**Then** Status automatically changes to "In Revision"

**Given** NDA has any status  
**When** User uploads document WITH "Fully Executed NDA" checkbox  
**Then** Status automatically changes to "Fully Executed"  
**And** fully_executed_date field set to current timestamp

**Given** User with nda:mark_status permission  
**When** Viewing NDA detail  
**Then** Can manually change status via dropdown  
**And** Inline status change (no modal required)  
**And** Status updates immediately with confirmation

---

### Story 3.13: RTF Template Selection & Preview

**As an** NDA user  
**I want** to select which RTF template to use and preview before finalizing  
**So that** I can ensure the document looks correct for this specific agency/type

**Acceptance Criteria:**

**Given** Multiple RTF templates exist in database  
**When** Creating NDA for "DoD Air Force"  
**Then** Template dropdown shows: "DoD Standard NDA (recommended)", "Generic USMax NDA", "Research Partnership NDA"  
**And** Recommended template pre-selected based on agency/type

**Given** I click "Preview RTF"  
**When** Document generates  
**Then** RTF displayed in preview pane (or download to review)  
**And** I can see all merged fields: Company Name, Authorized Purpose, Effective Date, etc.  
**And** I can click "Edit Template" if content needs adjustment before sending

**Given** I edit template content  
**When** I make changes to generated RTF  
**Then** Changes apply to THIS NDA only (doesn't modify template)  
**And** Edited version stored in S3

---

### Story 3.14: POC Management & Validation

**As an** NDA user  
**I want** to enter and validate all POC contact information  
**So that** emails reach the right people and data is accurate

**Acceptance Criteria:**

**Given** Creating NDA form  
**When** I enter Opportunity POC  
**Then** Dropdown shows internal USMax users only (where is_internal=true)  
**And** Auto-complete works (type 3 letters → matches)  
**And** Selected user's email signature included in email template

**Given** I enter Relationship POC (required external contact)  
**When** Entering email, phone, fax  
**Then** Email validated in real-time (must be valid format)  
**And** Phone shows format hint: "(XXX) XXX-XXXX"  
**And** Required fields marked with *

**Given** Contracts POC and Relationship POC are same person  
**When** I click "Copy to Relationship POC" button  
**Then** All Contracts POC fields copied to Relationship POC fields  
**And** I don't have to re-enter same information

**Given** Contacts POC field (TBD from customer - may be same as Contracts)  
**When** Customer clarifies if 3rd distinct type  
**Then** Implement as separate field or hide if duplicate

---

### Story 3.15: Inactive & Cancelled Status Management

**As an** NDA user  
**I want** to mark NDAs as Inactive or Cancelled  
**So that** I can archive deals that didn't proceed or expired agreements

**Acceptance Criteria:**

**Given** I'm viewing any NDA  
**When** I select status "Inactive" from dropdown  
**Then** NDA marked as Inactive  
**And** Removed from default list view  
**And** audit_log records status change

**Given** I want to see Inactive NDAs  
**When** I check "Show Inactive" filter option  
**Then** Inactive NDAs appear in list (grayed out or with badge)

**Given** NDA marked Inactive  
**When** I change status back to any active status  
**Then** Status updated (reversible, not permanent delete)  
**And** NDA reappears in default views

**Given** NDA marked "Cancelled"  
**When** Viewed in list  
**Then** Shows with "Cancelled" badge/indicator  
**And** Hidden by default, shown with "Show Cancelled" filter

---
## Epic 4: Document Management & Execution

**Epic Goal:** Users can upload fully executed NDAs and maintain complete document history in S3 multi-region storage

**FRs Covered:** FR17-24

### Story 4.1: Document Upload with Drag-Drop

**As an** NDA user  
**I want** to upload documents to an NDA via drag-drop or file picker  
**So that** I can easily add fully executed PDFs or revised RTFs

**Acceptance Criteria:**

**Given** I'm viewing NDA detail page  
**When** I drag PDF file onto upload zone  
**Then** File uploads to S3 us-east-1: `ndas/{nda_id}/{new_doc_id}-{filename}.pdf`  
**And** S3 CRR replicates to us-west-2  
**And** documents table INSERT with metadata (filename, s3_key, uploaded_by=me, uploaded_at=now, document_type='Uploaded')  
**And** Document appears in NDA's document list  
**And** audit_log records "document_uploaded"  
**And** Toast shows: "Document uploaded ✓"

**Given** Upload fails (S3 error, network issue)  
**When** Error occurs  
**Then** AWS SDK retries automatically (3 attempts)  
**And** If all fail, user sees: "Upload failed, please try again"  
**And** Error reported to Sentry

**Given** File type validation  
**When** User uploads .docx file  
**Then** Accepted (allowed types: RTF, PDF, DOCX)

**Given** User uploads .exe file  
**When** Validation runs  
**Then** Rejected: "Only RTF and PDF files allowed"

---

### Story 4.2: Mark Document as Fully Executed

**As an** NDA user  
**I want** to mark uploaded document as "Fully Executed NDA"  
**So that** status automatically updates and execution date is captured

**Acceptance Criteria:**

**Given** I'm uploading final signed PDF  
**When** I check "Fully Executed NDA" checkbox before upload  
**Then** Document uploaded with is_fully_executed=true  
**And** NDA status auto-changes to "Fully Executed"  
**And** NDA.fully_executed_date set to current timestamp  
**And** audit_log records "marked_fully_executed"  
**And** Status progression shows "Fully Executed" circle filled with date

**Given** NDA already has documents  
**When** I upload fully executed version  
**Then** New document version created (S3 versioning preserves all)  
**And** Latest fully executed document marked in UI

---

### Story 4.3: Document Download with Pre-Signed URLs

**As an** NDA user  
**I want** to download any document version  
**So that** I can review NDAs or share with stakeholders

**Acceptance Criteria:**

**Given** NDA has 3 document versions (Generated RTF, Revision 1 PDF, Fully Executed PDF)  
**When** I click download link for any version  
**Then** API generates pre-signed S3 URL (15-minute TTL)  
**And** Browser downloads file directly from S3  
**And** audit_log records "document_downloaded" with who, which doc, timestamp, IP

**Given** I try to download after 15 minutes  
**When** Pre-signed URL expired  
**Then** I get new download link (click again generates fresh URL)

**Given** Document exists in both regions  
**When** Primary region (us-east-1) unavailable  
**Then** System fails over to us-west-2 replica  
**And** Download still succeeds (multi-region reliability)

---

### Story 4.4: Document Version History

**As an** NDA user  
**I want** to view complete document version history for an NDA  
**So that** I can see all iterations and download any previous version

**Acceptance Criteria:**

**Given** NDA has 5 document versions over time  
**When** I view NDA detail → Documents tab  
**Then** Table displays all versions:
- Filename, Type (Generated/Uploaded/Fully Executed), Size, Uploaded By, Uploaded At, Actions (Download)

**And** Ordered by upload date (newest first)  
**And** Fully Executed version highlighted or badged  
**And** Each version independently downloadable

**Given** I want context on a version  
**When** Hovering over document row  
**Then** Tooltip shows notes: "Generated from Template" or "Uploaded by John Smith on 12/15"

---

### Story 4.5: Download All Versions as ZIP

**As an** NDA user  
**I want** to download all document versions for an NDA as a single ZIP file  
**So that** I can easily archive or share complete NDA history

**Acceptance Criteria:**

**Given** NDA has 4 document versions  
**When** I click "Download All as ZIP"  
**Then** API fetches all documents from S3  
**And** Creates ZIP file: `NDA-1590-TechCorp-All-Versions.zip`  
**And** ZIP contains all 4 files with original filenames  
**And** ZIP downloads to user's computer  
**And** audit_log records "bulk_download" with document IDs

**Given** ZIP generation fails  
**When** Error occurs  
**Then** User sees: "Bulk download failed, try downloading individually"  
**And** Individual download links still work

---

### Story 4.6: Document Metadata Tracking

**As a** system  
**I want** to track comprehensive metadata for every document  
**So that** audit trail and version history are complete

**Acceptance Criteria:**

**Given** Any document upload  
**When** Stored in database  
**Then** documents table includes:
- id (UUID), nda_id (FK), filename, file_type, file_size_bytes, s3_key, s3_region
- document_type ('Generated'/'Uploaded'/'Fully Executed')
- is_fully_executed (boolean)
- uploaded_by (FK to contact), uploaded_at (timestamp)
- notes (e.g., "Generated from Template", "Uploaded by Kelly Davidson")
- version_number (incremental)

**And** S3 object metadata includes: content-type, uploaded-by (user ID), upload-timestamp

---

### Story 4.7: Indefinite Document Preservation

**As a** compliance officer  
**I want** all document versions preserved indefinitely  
**So that** we meet FAR retention requirements and never lose critical legal agreements

**Acceptance Criteria:**

**Given** Document uploaded to S3  
**When** S3 versioning is enabled  
**Then** Every version preserved (never overwritten)  
**And** Previous versions accessible via S3 version ID

**Given** User uploads new version of same filename  
**When** Upload occurs  
**Then** S3 creates new version (doesn't delete old)  
**And** documents table creates new row (preserves metadata for both versions)

**Given** System runs for 5+ years  
**When** Documents accumulate  
**Then** All documents remain retrievable  
**And** Optional: Documents >6 years old transition to Glacier (cost optimization)  
**And** Glacier documents still downloadable (just slower retrieval)

**Given** Disaster recovery scenario  
**When** us-east-1 region fails  
**Then** All documents available from us-west-2 replica  
**And** Zero data loss (multi-region CRR)

---


## Epic 5: Search, Filtering & Dashboard

**Epic Goal:** Users can quickly find NDAs, see what needs attention, and stay informed via personalized dashboard

**FRs Covered:** FR49-62

### Story 5.1: Global NDA Search

**As an** NDA User,
**I want** to search across all NDA fields using a search box,
**So that** I can quickly find specific NDAs without filtering manually.

**Acceptance Criteria:**

**Given** I am on the NDA list screen
**When** I type text into the global search box
**Then** the system searches across company name, purpose, agency, POC names, and other text fields
**And** results update as I type (type-ahead functionality per FR50)
**And** matching NDAs are highlighted or displayed with search relevance
**And** the search respects my agency-based access control (row-level security)
**And** search performance completes within 500ms for typical queries

**Technical Notes:**
- Implements FR49: Search across all NDA fields
- Implements FR50: Type-ahead search (results as you type)
- PostgreSQL full-text search or ILIKE on indexed fields
- Debounce input to avoid excessive queries
- Must apply row-level security scoping

---

### Story 5.2: Column Sorting with Persistence

**As an** NDA User,
**I want** to sort the NDA list by any column and have my preference remembered,
**So that** I can organize NDAs in my preferred order without re-sorting every time.

**Acceptance Criteria:**

**Given** I am viewing the NDA list
**When** I click on any column header (ID, Company, Agency, Effective Date, Status, etc.)
**Then** the list sorts by that column in ascending order
**And** clicking again toggles to descending order
**And** a visual indicator shows the current sort column and direction
**And** my sort preference is saved to the database (system_config or user preferences table)
**And** when I return to the list later, my last sort preference is applied automatically

**Technical Notes:**
- Implements FR51: Sort by any column
- Implements FR52: Remember user's sort preference
- Store sort preference per user
- Backend applies sorting in SQL query for performance

---

### Story 5.3: Advanced Filtering System

**As an** NDA User,
**I want** to filter NDAs by multiple criteria simultaneously,
**So that** I can narrow down to exactly the NDAs I need to review.

**Acceptance Criteria:**

**Given** I am on the NDA list screen
**When** I open the filter panel
**Then** I can select filters for all 15 criteria:
- Agency Group, Subagency, Company Name, City, State, NDA Type, Incorporation State, Agency/Office Name, Non-USMax flag, Effective Date range, Requested Date range, Opportunity POC, Contracts POC, Relationship POC
**And** filters combine using AND logic (all criteria must match)
**And** the NDA list updates immediately as I apply filters
**And** active filters are visually indicated with badges or tags
**And** I can clear individual filters or all filters at once
**And** filter state persists across page navigation

**Technical Notes:**
- Implements FR10: Filter by 15 criteria
- Backend constructs WHERE clause from filter object
- Indexes on all 15 filterable fields for performance

---

### Story 5.4: Filter Presets

**As an** NDA User,
**I want** to apply common filter combinations with one click,
**So that** I can quickly access frequently needed NDA views.

**Acceptance Criteria:**

**Given** I am on the NDA list screen
**When** I access the filter presets menu
**Then** I see predefined filter options:
- "My NDAs" (where I am Opportunity POC)
- "Expiring Soon" (expiring within 30 days)
- "Waiting on 3rd Party" (status = Emailed, no activity for configurable days)
- "Stale - No Activity" (created but not emailed after 2 weeks)
- "Active NDAs" (status not Inactive or Cancelled)
**And** clicking a preset immediately applies those filters
**And** I can still modify filters after applying a preset
**And** presets respect my agency-based access control
**And** admins can configure preset thresholds in system_config

**Technical Notes:**
- Implements FR11: Filter presets with one click
- Presets are hardcoded queries (not user-customizable in Phase 1)
- Configurable thresholds stored in system_config table

---

### Story 5.5: Date Range Shortcuts

**As an** NDA User,
**I want** to use quick date range shortcuts instead of typing dates,
**So that** I can filter by common time periods faster.

**Acceptance Criteria:**

**Given** I am applying a date range filter (Effective Date or Requested Date)
**When** I click on the date range field
**Then** I see shortcut options: "Last 30 Days", "Last 90 Days", "This Quarter", "This Year", "Last Year", "Custom Range"
**And** selecting a shortcut immediately applies that date range
**And** the applied range is clearly displayed
**And** I can switch between shortcuts or use custom dates
**And** date ranges use mm/dd/yyyy format (legacy requirement)

**Technical Notes:**
- Implements FR53: Date range shortcuts
- Calculate date ranges client-side, send absolute dates to API

---

### Story 5.6: Pagination with Configurable Page Size

**As an** NDA User,
**I want** to paginate through large NDA lists with control over how many I see per page,
**So that** I can balance between seeing more data and page load performance.

**Acceptance Criteria:**

**Given** the NDA list has more records than fit on one page
**When** I view the list
**Then** I see pagination controls (Previous, Next, page numbers)
**And** I can select page size from options: 10, 25, 50, 100
**And** my page size preference is saved per user
**And** the system shows total count ("Showing 1-25 of 147 NDAs")
**And** pagination state persists when I apply filters or sorting

**Technical Notes:**
- Implements FR55: Pagination with configurable page size
- Backend uses LIMIT/OFFSET
- Store page size preference in user settings

---

### Story 5.7: Recently Used Values in Dropdowns

**As an** NDA User,
**I want** to see my recently selected values at the top of dropdown lists,
**So that** I can quickly select common choices without scrolling.

**Acceptance Criteria:**

**Given** I am filling out a form with dropdown fields
**When** I open a dropdown
**Then** the system shows my 5 most recently used values at the top
**And** recently used values are separated from the full list
**And** the full alphabetical list appears below recent values
**And** recent values are tracked per user across sessions

**Technical Notes:**
- Implements FR54: Recently used values at top
- Store recent selections in user_preferences table
- Limit to 5 recent values per field

---

### Story 5.8: Personalized Dashboard

**As an** NDA User,
**I want** to see a personalized dashboard when I log in,
**So that** I immediately know what needs my attention and can track my work.

**Acceptance Criteria:**

**Given** I have successfully authenticated
**When** I land on the dashboard
**Then** I see sections for:
- "My Recent NDAs" (last 5 NDAs I created or modified)
- "NDAs I'm Following" (subscribed as stakeholder)
- "Recent Activity" (last 10 actions on my authorized NDAs)
- "Items Needing Attention" (stale, expiring, waiting on 3rd party)
**And** each section has a "View All" link to full filtered list
**And** NDA cards show key info (ID, Company, Status, Last Activity)
**And** clicking an NDA navigates to detail view
**And** dashboard data is scoped to my authorized agencies
**And** dashboard loads within 2 seconds

**Technical Notes:**
- Implements FR56: Personalized dashboard
- Multiple optimized queries
- Consider caching dashboard data

---

### Story 5.9: At-a-Glance Metrics

**As an** NDA User,
**I want** to see key metrics on my dashboard,
**So that** I can understand the current state of NDAs at a glance.

**Acceptance Criteria:**

**Given** I am viewing the dashboard
**When** the metrics section loads
**Then** I see metric cards displaying:
- "Active NDAs" (count, status not Inactive/Cancelled)
- "Expiring Soon" (count within 30 days)
- "Average Cycle Time" (days from Created to Fully Executed, last 90 days)
**And** each metric shows a trend indicator if applicable
**And** clicking a metric navigates to filtered list
**And** metrics respect my agency-based access control

**Technical Notes:**
- Implements FR57: At-a-glance metrics
- Efficient aggregate queries with indexes
- Cache metrics

---

### Story 5.10: Stale NDA Identification

**As an** NDA User,
**I want** the dashboard to identify stale NDAs automatically,
**So that** I can follow up on NDAs that haven't progressed.

**Acceptance Criteria:**

**Given** I am viewing the dashboard "Items Needing Attention" section
**When** the system analyzes my NDAs
**Then** I see stale NDAs categorized as:
- "Created but not Emailed" (status = Created, >2 weeks old)
- "Emailed but No Response" (status = Emailed, >X days old per system_config)
**And** each stale NDA shows days in current state ("Stale for 18 days")
**And** clicking an item navigates to the NDA detail page
**And** stale thresholds are configurable by admins

**Technical Notes:**
- Implements FR58: Identify stale NDAs
- Calculated based on status + timestamp deltas
- Configurable thresholds

---

### Story 5.11: Waiting on 3rd Party Tracking

**As an** NDA User,
**I want** to see how long NDAs have been waiting on external parties,
**So that** I can prioritize follow-ups based on wait time.

**Acceptance Criteria:**

**Given** I am viewing the dashboard or NDA list
**When** an NDA is in "Emailed" or "In Revision" status
**Then** the system displays "Waiting on 3rd party" with time in state
**And** time is calculated from status change timestamp to now
**And** display format is: "Waiting 23 days" or "In Revision 5 days"
**And** NDAs waiting longer are prioritized higher in alerts

**Technical Notes:**
- Implements FR59: Show "waiting on 3rd party" with time in state
- Calculate duration from audit_log status change timestamp

---

### Story 5.12: Expiration Alerts

**As an** NDA User,
**I want** to be alerted when NDAs are approaching expiration,
**So that** I can take action before they expire.

**Acceptance Criteria:**

**Given** I am viewing the dashboard
**When** NDAs have expiration dates approaching
**Then** I see alerts for NDAs expiring within: 30 days (yellow warning), 60 days (informational), 90 days (early notice)
**And** alert thresholds are configurable by admins
**And** expired NDAs (past expiration date) are highlighted in red

**Technical Notes:**
- Implements FR60: Alert to approaching expiration
- Thresholds stored in system_config

---

### Story 5.13: Email Notification Preferences

**As an** NDA User,
**I want** to configure which NDA events trigger email notifications,
**So that** I stay informed without email overload.

**Acceptance Criteria:**

**Given** I am in my user settings/preferences page
**When** I view notification settings
**Then** I see toggles for notification types: "NDA Status Changed", "NDA Assigned to Me", "Document Uploaded", "Email Sent", "NDA Approaching Expiration", "NDA Marked Fully Executed"
**And** I can enable/disable each notification type independently
**And** my preferences are saved to the notification_preferences table
**And** changes take effect immediately

**Technical Notes:**
- Implements FR61-62: Email notifications and preferences
- notification_preferences table
- Email queue checks preferences before sending

---

### Story 5.14: NDA Stakeholder Subscriptions

**As an** NDA User,
**I want** to subscribe to specific NDAs to receive notifications,
**So that** I can follow NDAs I care about even if I'm not the POC.

**Acceptance Criteria:**

**Given** I am viewing an NDA detail page
**When** I click "Follow this NDA" or "Subscribe to Notifications"
**Then** I am added to the nda_stakeholders table for that NDA
**And** I receive email notifications for status changes (per my preferences)
**And** the button changes to "Unfollow" or "Unsubscribe"
**And** subscription respects agency access control

**Technical Notes:**
- Implements FR30: Email notifications to subscribed stakeholders
- nda_stakeholders table

---

## Epic 6: Audit Trail & Compliance

**Epic Goal:** System maintains comprehensive history, admins can review all actions, export for compliance audits

**FRs Covered:** FR63-73

### Story 6.1: Comprehensive Action Logging

**As the** System,
**I want** to automatically log every user action with complete details,
**So that** we have a comprehensive audit trail for compliance and debugging.

**Acceptance Criteria:**

**Given** a user performs any action in the system
**When** the action completes (successfully or with error)
**Then** the system writes an audit_log entry capturing:
- User ID (who performed the action)
- Action type (nda_created, status_changed, document_uploaded, etc.)
- Entity type and ID (ndas table, nda_id=123)
- Timestamp (UTC with timezone)
- IP address of the request
- User agent (browser/device info)
- Result (success or error)
**And** the logging happens via middleware (automatic, not manual in every handler)
**And** log writes never block user operations (async queue if needed)
**And** failed log writes trigger alerts but don't crash the application
**And** audit_log table is append-only (no UPDATEs or DELETEs)

**Technical Notes:**
- Implements FR63: Log ALL user actions
- Audit middleware captures req.user, req.ip, req.headers

---

### Story 6.2: Field Change Tracking

**As an** Admin,
**I want** to see exactly what fields changed with before/after values,
**So that** I can audit modifications and understand change history.

**Acceptance Criteria:**

**Given** a user updates an NDA or other entity
**When** the update completes
**Then** the audit_log entry includes:
- Field name (e.g., "company_name", "status", "effective_date")
- Before value (previous value)
- After value (new value)
**And** all changed fields are captured in a single audit entry
**And** changes are displayed in human-readable format ("Status changed from 'Created' to 'Emailed'")

**Technical Notes:**
- Implements FR64: Track field changes with before/after values
- Use JSONB column for flexibility

---

### Story 6.3: Document Download Tracking

**As an** Admin,
**I want** to track every document download with user and timestamp,
**So that** I can audit document access for compliance.

**Acceptance Criteria:**

**Given** a user downloads an NDA document
**When** the download link is generated (pre-signed S3 URL)
**Then** the system logs an audit entry with: User ID, Document ID and filename, NDA ID, Timestamp, IP address
**And** the log entry is created BEFORE generating the S3 URL

**Technical Notes:**
- Implements FR65: Track all document downloads
- Log before generating pre-signed URL

---

### Story 6.4: Login Attempt Tracking

**As an** Admin,
**I want** to see all login attempts (successful and failed) with details,
**So that** I can monitor for security threats and suspicious activity.

**Acceptance Criteria:**

**Given** a user attempts to log in
**When** the authentication completes (success or failure)
**Then** the system logs an audit entry with: User email/ID, Timestamp, IP address, User agent, Result (success, failed password, failed MFA, account locked), MFA method used
**And** failed login attempts are flagged for security monitoring
**And** excessive failed attempts trigger alerts

**Technical Notes:**
- Implements FR66: Track all login attempts
- Cognito triggers or Express logging after JWT validation

---

### Story 6.5: NDA Audit Trail Viewer

**As an** NDA User,
**I want** to view the complete history of actions on a specific NDA,
**So that** I can understand what happened and when.

**Acceptance Criteria:**

**Given** I am viewing an NDA detail page
**When** I navigate to the "History" or "Audit Trail" tab
**Then** I see a chronological list of all actions on this NDA: Created, Fields changed, Status changes, Documents uploaded/downloaded, Emails sent
**And** each entry shows timestamp, user, action type, and details
**And** entries are ordered newest first
**And** I can filter by action type or date range

**Technical Notes:**
- Implements FR67: View complete audit trail for any NDA
- Query audit_log WHERE entity_type = 'nda' AND entity_id = :ndaId

---

### Story 6.6: Visual Timeline Display

**As an** NDA User,
**I want** to see the audit trail as a visual timeline with icons,
**So that** I can quickly understand the NDA's journey at a glance.

**Acceptance Criteria:**

**Given** I am viewing an NDA's audit trail
**When** the timeline renders
**Then** I see a vertical timeline with:
- Icon for each event type (create, edit, email, upload, status change)
- Timestamp and relative time ("2 hours ago", "3 days ago")
- User who performed the action
- Action description in plain language
- Expandable details for field changes
**And** color coding for event types

**Technical Notes:**
- Implements FR68: Audit trail as visual timeline
- Map action types to icons

---

### Story 6.7: Centralized Audit Log Viewer (Admin)

**As an** Admin,
**I want** to access a centralized audit log of all system activity,
**So that** I can investigate issues and monitor for compliance.

**Acceptance Criteria:**

**Given** I have admin permissions (admin:view_audit_logs)
**When** I navigate to the "Audit Logs" admin page
**Then** I see a searchable, filterable list of ALL audit entries (system-wide)
**And** I can filter by: User, Action type, Date range, Entity type, IP address
**And** results are paginated
**And** I can view full details of each audit entry

**Technical Notes:**
- Implements FR69: Centralized audit log viewer (admin only)
- Middleware checks admin:view_audit_logs permission

---

### Story 6.8: Audit Log Filtering

**As an** Admin,
**I want** to filter audit logs by multiple criteria,
**So that** I can narrow down to specific events for investigation.

**Acceptance Criteria:**

**Given** I am viewing the centralized audit log
**When** I apply filters
**Then** I can filter by: User, Action type, Date range, Entity type, NDA ID, IP address, Result (success/error)
**And** multiple filters combine with AND logic
**And** filter state persists in URL query parameters

**Technical Notes:**
- Implements FR70: Filter audit logs
- Backend constructs dynamic WHERE clause

---

### Story 6.9: Audit Log Export

**As an** Admin,
**I want** to export audit logs to CSV or Excel,
**So that** I can provide them for compliance reviews or external analysis.

**Acceptance Criteria:**

**Given** I am viewing filtered audit logs
**When** I click "Export to CSV" or "Export to Excel"
**Then** the system generates a file containing: All columns, Only the filtered results, Human-readable formatting
**And** large exports stream data (don't load all into memory)
**And** export files are named with timestamp

**Technical Notes:**
- Implements FR71: Export audit logs to CSV/Excel
- Use streaming library (csv-stringify, exceljs)

---

### Story 6.10: Email Event Tracking

**As an** Admin,
**I want** to track email send events with delivery status,
**So that** I can verify emails were sent and monitor delivery issues.

**Acceptance Criteria:**

**Given** the system sends an NDA email
**When** the email is processed
**Then** the system logs to nda_emails table: NDA ID, Subject, Recipients (TO/CC/BCC), Body, Attachments, SES message ID, Timestamp
**And** delivery status is tracked (queued, sent, delivered, bounced, failed)

**Technical Notes:**
- Implements FR72: Track email send events
- nda_emails table stores email metadata

---

### Story 6.11: Immutable Audit Trail

**As a** System Administrator,
**I want** the audit trail to be immutable and preserved indefinitely,
**So that** it meets compliance requirements and can't be tampered with.

**Acceptance Criteria:**

**Given** the audit_log table exists
**When** audit entries are created
**Then** entries are INSERT only (no UPDATE or DELETE allowed)
**And** database constraints prevent modifications
**And** audit_log table has no foreign keys with ON DELETE CASCADE
**And** old audit logs are never purged

**Technical Notes:**
- Implements FR73: Preserve audit trail indefinitely (immutable)
- PostgreSQL: Revoke UPDATE/DELETE permissions on audit_log

---

## Epic 7: Templates & Configuration

**Epic Goal:** Admins can manage RTF/email templates and system settings; users benefit from smart suggestions

**FRs Covered:** FR82-96, FR122-128

### Story 7.1: RTF Template Creation

**As an** Admin,
**I want** to create RTF templates with field-merge placeholders,
**So that** users can generate consistent NDA documents automatically.

**Acceptance Criteria:**

**Given** I have admin permissions
**When** I navigate to "RTF Templates" and click "Create Template"
**Then** I can enter: Template name, Description, Category (by agency/type/general), RTF/DOCX content with field placeholders
**And** the system provides a list of available field placeholders
**And** I can upload an RTF/DOCX file or paste content
**And** the template is saved to rtf_templates table

**Technical Notes:**
- Implements FR82: Create RTF templates with field-merge placeholders
- Use Handlebars syntax: {{fieldName}}

---

### Story 7.2: RTF Template Management

**As an** Admin,
**I want** to edit, organize, and delete RTF templates,
**So that** I can maintain an up-to-date template library.

**Acceptance Criteria:**

**Given** I am viewing the RTF templates list
**When** I select a template
**Then** I can: Edit, Delete (with confirmation), Duplicate, Set as default for agency/type, Archive (soft delete)
**And** deleting warns if it's currently set as default

**Technical Notes:**
- Implements FR83: Edit RTF templates
- Implements FR84: Organize templates
- Soft delete pattern (is_archived boolean)

---

### Story 7.3: Default Template Assignment

**As an** Admin,
**I want** to set default templates for agency/type combinations,
**So that** users get smart template suggestions.

**Acceptance Criteria:**

**Given** I am editing an RTF template
**When** I configure default settings
**Then** I can select agency groups/subagencies and NDA types where this is default
**And** users see the default template pre-selected

**Technical Notes:**
- Implements FR85: Set default template for agency/type

---

### Story 7.4: Template Field Merging

**As the** System,
**I want** to automatically merge NDA field values into template placeholders,
**So that** generated documents are populated with correct data.

**Acceptance Criteria:**

**Given** a user generates an RTF from template
**When** generation runs
**Then** system replaces all {{placeholders}} with actual NDA field values
**And** formats dates according to template specifiers
**And** handles missing/null values gracefully

**Technical Notes:**
- Implements FR87: Merge NDA fields into template
- Use Handlebars.js for rendering

---

### Story 7.5: Template Selection During Creation

**As an** NDA User,
**I want** to select which RTF template to use,
**So that** I can use the most appropriate template.

**Acceptance Criteria:**

**Given** I am creating a new NDA
**When** I reach template selection
**Then** I see default template pre-selected (based on agency/type)
**And** dropdown list of all available templates
**And** I can change the selected template

**Technical Notes:**
- Implements FR86: Users select template

---

### Story 7.6: Email Template Creation

**As an** Admin,
**I want** to create email templates with field-merge and user signatures,
**So that** users can send consistent professional emails.

**Acceptance Criteria:**

**Given** I have admin permissions
**When** I create email template
**Then** I can enter: Name, Subject (with {{placeholders}}), Body (with {{placeholders}}), Default CC/BCC
**And** user signature is automatically appended

**Technical Notes:**
- Implements FR88: Create email templates
- Implements FR90: Email templates include user signature

---

### Story 7.7: Email Template Management

**As an** Admin,
**I want** to manage email templates,
**So that** I can maintain current communications.

**Acceptance Criteria:**

**Given** I am viewing email templates
**When** I select a template
**Then** I can: Edit, Delete (with confirmation), Duplicate, Set as default, Archive

**Technical Notes:**
- Implements FR89: Email template management

---

### Story 7.8: Template Suggestions

**As an** NDA User,
**I want** system to suggest templates based on my selections,
**So that** I can quickly choose the right template.

**Acceptance Criteria:**

**Given** I am creating an NDA and have selected agency and type
**When** template selection appears
**Then** system pre-selects default template
**And** shows suggestion reason ("90% of DoD Air Force NDAs use this template")

**Technical Notes:**
- Implements FR91: Suggest templates based on agency/type

---

### Story 7.9: Smart Company Suggestions

**As an** NDA User,
**I want** system to suggest companies based on my agency selection,
**So that** I can quickly select frequent partners.

**Acceptance Criteria:**

**Given** I have selected an agency
**When** I focus on "Company Name" field
**Then** dropdown shows companies that have had NDAs with this agency (most frequent first)

**Technical Notes:**
- Implements FR92: Suggest companies based on agency

---

### Story 7.10: Historical Field Suggestions

**As an** NDA User,
**I want** to see suggestions for fields based on historical data,
**So that** I can fill out forms faster.

**Acceptance Criteria:**

**Given** I am creating an NDA with company and agency selected
**When** I fill out fields
**Then** system suggests common purposes, types, date patterns for this combination

**Technical Notes:**
- Implements FR93: Field suggestions based on historical data

---

### Story 7.11: Previous NDA Context Display

**As an** NDA User,
**I want** to see previous NDAs for a company,
**So that** I can understand patterns and ensure consistency.

**Acceptance Criteria:**

**Given** I am creating an NDA for a company
**When** the company has previous NDAs
**Then** I see "Previous NDAs" section showing last 5 NDAs with this company
**And** can click to view or clone

**Technical Notes:**
- Implements FR94: Show "previous NDAs for this company" context

---

### Story 7.12: Email Recipient Suggestions

**As an** NDA User,
**I want** system to suggest email recipients based on patterns,
**So that** I don't have to manually enter CC/BCC every time.

**Acceptance Criteria:**

**Given** I am composing email
**When** composer loads
**Then** system suggests TO/CC/BCC based on historical patterns

**Technical Notes:**
- Implements FR95: Suggest email recipients

---

### Story 7.13: Learning Suggestions Over Time

**As the** System,
**I want** to improve suggestions as more NDAs are created,
**So that** recommendations become more accurate.

**Acceptance Criteria:**

**Given** users have created NDAs over time
**When** suggestion algorithms run
**Then** suggestions improve based on frequency, recency, user patterns
**And** Phase 1 uses rule-based heuristics

**Technical Notes:**
- Implements FR96: Improve suggestions over time

---

### Story 7.14: Admin Status Configuration

**As an** Admin,
**I want** to add, edit, and reorder NDA status values,
**So that** I can customize the workflow.

**Acceptance Criteria:**

**Given** I have admin permissions
**When** I navigate to "System Configuration > Status Values"
**Then** I can: View all statuses, Add new, Edit existing, Reorder via drag-drop, Archive (cannot delete if in use)
**And** status changes take effect immediately

**Technical Notes:**
- Implements FR122: Add/edit/reorder status values
- Implements FR123: Prevent deletion of in-use statuses

---

### Story 7.15: Auto-Transition Rule Configuration

**As an** Admin,
**I want** to configure which actions trigger status changes,
**So that** system keeps NDAs up-to-date automatically.

**Acceptance Criteria:**

**Given** I am configuring auto-transition rules
**When** I define a rule
**Then** I can specify: Trigger action, Current status required, New status to set
**And** rules take effect immediately

**Technical Notes:**
- Implements FR124: Configure auto-transition rules

---

### Story 7.16: Notification Rule Configuration

**As an** Admin,
**I want** to configure which events trigger email notifications,
**So that** stakeholders stay informed.

**Acceptance Criteria:**

**Given** I am configuring notification rules
**When** I define a rule
**Then** I can specify: Event type, Recipient type, Email template, Enabled toggle
**And** rules respect user notification preferences

**Technical Notes:**
- Implements FR125: Configure email notification rules

---

### Story 7.17: Dashboard Alert Threshold Configuration

**As an** Admin,
**I want** to configure alert thresholds,
**So that** users receive relevant alerts.

**Acceptance Criteria:**

**Given** I am configuring thresholds
**When** I access "System Configuration > Alert Thresholds"
**Then** I can set: Stale NDA days, Expiration warning days (30/60/90)
**And** thresholds stored in system_config table

**Technical Notes:**
- Implements FR126: Configure dashboard alert thresholds

---

### Story 7.18: Default Email CC/BCC Configuration

**As an** Admin,
**I want** to configure default CC and BCC recipients,
**So that** key stakeholders are always included.

**Acceptance Criteria:**

**Given** I am configuring email defaults
**When** I set defaults
**Then** I can configure: Default CC recipients, Default BCC recipients
**And** defaults applied when composing emails (pre-filled, editable)

**Technical Notes:**
- Implements FR127: Configure default CC/BCC

---

### Story 7.19: Dropdown Field Configuration

**As an** Admin,
**I want** to configure dropdown field values,
**So that** I can maintain consistent data entry.

**Acceptance Criteria:**

**Given** I am configuring dropdowns
**When** I manage values
**Then** I can configure: NDA Type, USMax Position values
**And** Add/edit/reorder/archive values

**Technical Notes:**
- Implements FR128: Configure dropdown values

---

## Epic 8: Infrastructure & Operational Excellence

**Epic Goal:** System is bulletproof, monitored, validated, and admins can manage health/recovery

**FRs Covered:** FR97-110, FR129-159, All 63 NFRs

### Story 8.1: Error Monitoring with Sentry

**As a** System Administrator,
**I want** all application errors captured and reported,
**So that** I can fix issues proactively.

**Acceptance Criteria:**

**Given** Sentry is integrated
**When** an error occurs
**Then** Sentry captures: Error message/stack, User context, Request context, Environment
**And** critical errors trigger immediate alerts

**Technical Notes:**
- Implements FR97-98: Error alerts and tracking

---

### Story 8.2: System Health Dashboards

**As an** Admin,
**I want** to view real-time system health,
**So that** I can monitor uptime and performance.

**Acceptance Criteria:**

**Given** I have admin permissions
**When** I access "System Health" dashboard
**Then** I see: Uptime %, Error rate, API response times, Database performance, Active users, Resource usage
**And** metrics update near real-time

**Technical Notes:**
- Implements FR99: System health dashboards

---

### Story 8.3: Email Retry Logic

**As the** System,
**I want** to automatically retry failed emails,
**So that** transient failures don't lose communications.

**Acceptance Criteria:**

**Given** email send fails
**When** failure detected
**Then** system queues for retry (pg-boss), Retries with exponential backoff (max 3 attempts)
**And** permanently failed emails trigger alerts

**Technical Notes:**
- Implements FR100: Retry failed emails
- pg-boss job queue

---

### Story 8.4: Failsafe Error Logging

**As the** System,
**I want** errors logged to separate failsafe system,
**So that** errors are never lost.

**Acceptance Criteria:**

**Given** primary audit_log unavailable
**When** error or action occurs
**Then** system falls back to CloudWatch Logs
**And** fallback triggers alerts

**Technical Notes:**
- Implements FR101: Failsafe logging

---

### Story 8.5: Data Validation (Required Fields)

**As the** System,
**I want** to validate required fields before allowing submission,
**So that** incomplete NDAs are never created.

**Acceptance Criteria:**

**Given** user creating/editing NDA
**When** they attempt to save
**Then** system validates: Required fields not empty, Client-side and server-side validation
**And** submission blocked until valid

**Technical Notes:**
- Implements FR104, FR147: Required field validation

---

### Story 8.6: Format Validation

**As the** System,
**I want** to validate data formats,
**So that** data is consistent.

**Acceptance Criteria:**

**Given** user enters data
**When** validation runs
**Then** system validates: Email addresses (RFC 5322), Phone numbers ((XXX) XXX-XXXX), Dates (mm/dd/yyyy)
**And** real-time inline validation

**Technical Notes:**
- Implements FR105, FR148: Format validation

---

### Story 8.7: Character Limit Enforcement

**As the** System,
**I want** to enforce character limits,
**So that** data fits constraints.

**Acceptance Criteria:**

**Given** user entering text
**When** typing
**Then** shows character count, Prevents typing beyond limit
**And** Authorized Purpose: 255 chars limit

**Technical Notes:**
- Implements FR106, FR149: Character limits

---

### Story 8.8: Date Range Validation

**As the** System,
**I want** to validate date ranges,
**So that** dates are logical.

**Acceptance Criteria:**

**Given** user enters effective and expiry dates
**When** submitted
**Then** validates: Effective ≤ Expiry, Both in valid format

**Technical Notes:**
- Implements FR107, FR150: Date range validation

---

### Story 8.9: File Upload Validation

**As the** System,
**I want** to validate uploaded files,
**So that** malicious files are rejected.

**Acceptance Criteria:**

**Given** user uploads file
**When** processed
**Then** validates: File type (RTF/PDF/DOCX), Max size (10MB), Basic malware scanning

**Technical Notes:**
- Implements FR108, FR151: File upload validation

---

### Story 8.10: Referential Integrity

**As the** System,
**I want** to prevent deletion of referenced entities,
**So that** relationships remain valid.

**Acceptance Criteria:**

**Given** entity is referenced
**When** admin attempts delete
**Then** blocks deletion, shows dependencies

**Technical Notes:**
- Implements FR109, FR152: Referential integrity

---

### Story 8.11: Real-Time Inline Validation

**As an** NDA User,
**I want** to see validation errors as I type,
**So that** I can fix issues immediately.

**Acceptance Criteria:**

**Given** filling out form
**When** I interact with fields
**Then** validation feedback appears inline, Icons indicate valid/error states

**Technical Notes:**
- Implements FR110, FR153: Real-time inline validation

---

### Story 8.12: Database Encryption at Rest

**As a** System Administrator,
**I want** database data encrypted at rest,
**So that** stored data is protected.

**Acceptance Criteria:**

**Given** PostgreSQL on Lightsail
**When** data written to disk
**Then** encrypted using Lightsail volume encryption (AES-256)

**Technical Notes:**
- Implements FR129: Database encryption at rest

---

### Story 8.13: S3 Document Encryption

**As the** System,
**I want** S3 documents encrypted at rest,
**So that** files are protected.

**Acceptance Criteria:**

**Given** documents uploaded to S3
**When** stored
**Then** S3 server-side encryption enabled (SSE-S3 or SSE-KMS)

**Technical Notes:**
- Implements FR131: S3 encryption

---

### Story 8.14: TLS 1.3 Enforcement

**As the** System,
**I want** all connections to use TLS 1.3,
**So that** data in transit is protected.

**Acceptance Criteria:**

**Given** user accesses application
**When** connection established
**Then** TLS 1.3 used, HTTPS enforced, Security headers set

**Technical Notes:**
- Implements FR130: TLS 1.3

---

### Story 8.15: Pre-Signed S3 URLs

**As the** System,
**I want** time-limited pre-signed URLs for downloads,
**So that** S3 objects aren't publicly accessible.

**Acceptance Criteria:**

**Given** user requests download
**When** link generated
**Then** pre-signed S3 URL (15-min expiry), Logs download BEFORE generating URL

**Technical Notes:**
- Implements FR133: Time-limited pre-signed URLs

---

### Story 8.16: S3 Multi-Region Replication

**As a** System Administrator,
**I want** documents replicated to secondary region,
**So that** files survive regional outages.

**Acceptance Criteria:**

**Given** S3 CRR configured
**When** document uploaded to us-east-1
**Then** automatically replicates to us-west-2

**Technical Notes:**
- Implements FR132: S3 multi-region replication

---

### Story 8.17: Automated Database Snapshots

**As a** System Administrator,
**I want** automated daily snapshots,
**So that** I can restore data if needed.

**Acceptance Criteria:**

**Given** Lightsail instance running
**When** midnight UTC
**Then** automatic snapshot created (7-day retention)

**Technical Notes:**
- Implements FR135: Automated backups

---

### Story 8.18: Database Restore Capability

**As a** System Administrator,
**I want** to restore from snapshot,
**So that** I can recover from corruption.

**Acceptance Criteria:**

**Given** snapshot exists
**When** I initiate restore
**Then** can create new instance from snapshot, RTO <4 hours, RPO <24 hours

**Technical Notes:**
- Implements FR136: Restore from backup

---

### Story 8.19: DR Testing

**As a** System Administrator,
**I want** to test disaster recovery quarterly,
**So that** I know procedures work.

**Acceptance Criteria:**

**Given** DR procedures documented
**When** quarterly test
**Then** restore snapshot, verify integrity, measure RTO/RPO

**Technical Notes:**
- Implements FR137: DR testing

---

### Story 8.20: User-Friendly Errors

**As an** NDA User,
**I want** error messages to be helpful,
**So that** I understand what went wrong.

**Acceptance Criteria:**

**Given** error occurs
**When** displayed
**Then** plain language message, Suggests action, No stack traces

**Technical Notes:**
- Implements FR140: User-friendly error messages

---

### Story 8.21: Operation Retry

**As an** NDA User,
**I want** to retry failed operations,
**So that** transient errors don't force me to start over.

**Acceptance Criteria:**

**Given** operation failed
**When** I see error
**Then** "Retry" button available, Re-executes with same parameters

**Technical Notes:**
- Implements FR141: Retry failed operations

---

### Story 8.22: Email Queue Retry

**As the** System,
**I want** failed emails queued for retry,
**So that** temporary issues don't lose communications.

**Acceptance Criteria:**

**Given** email send fails
**When** failure detected
**Then** added to pg-boss queue, Retries automatically (max 3, exponential backoff)

**Technical Notes:**
- Implements FR142: Queue failed emails

---

### Story 8.23: Graceful Degradation

**As an** NDA User,
**I want** core workflows to work even if secondary features fail,
**So that** I can accomplish critical tasks during outages.

**Acceptance Criteria:**

**Given** secondary feature fails
**When** I attempt core workflow
**Then** core continues to function, Failed feature shows error

**Technical Notes:**
- Implements FR144: Graceful degradation

---

### Story 8.24: Offline Detection

**As an** NDA User,
**I want** clear messaging when network is offline,
**So that** I understand why operations fail.

**Acceptance Criteria:**

**Given** internet connection lost
**When** I attempt operation
**Then** "You appear to be offline" banner, Disabled actions, Retry when connection restored

**Technical Notes:**
- Implements FR145: Offline detection

---

### Story 8.25: Form Data Preservation

**As an** NDA User,
**I want** form data preserved during network failures,
**So that** I don't lose work.

**Acceptance Criteria:**

**Given** filling out form
**When** connection drops
**Then** data preserved via: Auto-save to database (if online), Temporary save to sessionStorage (if offline)

**Technical Notes:**
- Implements FR146: Preserve form data

---

### Story 8.26: NDA List Export

**As an** NDA User,
**I want** to export filtered NDA list to CSV/Excel,
**So that** I can analyze externally.

**Acceptance Criteria:**

**Given** viewing NDA list with filters
**When** I click "Export"
**Then** generates CSV/Excel with all columns, filtered results

**Technical Notes:**
- Implements FR154: Export NDA list

---

### Story 8.27: Data Import Tool (Phase 2)

**As an** Admin,
**I want** to import NDAs from email archives,
**So that** we can backfill historical data.

**Acceptance Criteria:**

**Given** customer has old emails
**When** forwarded to SES address or uploaded as EML files
**Then** system parses and imports NDAs

**Technical Notes:**
- Implements FR156: Import from emails (Phase 1.5/2)

---

**Total Story Count:** 113 user stories across all 8 epics

**Coverage:** 100% of 159 Functional Requirements + 100% of 63 Non-Functional Requirements

## Epic 9: Post-Launch Refinement & Bug Fixes

**Epic Goal:** Fix bugs discovered during demo testing, complete partially-implemented features, and polish UI/UX

**Trigger:** User testing session after Epic 6-8 completion revealed implementation gaps and usability issues

**Priority:** HIGH - These issues block production readiness

---

### Story 9.1: Fix Internal Notes Display

**As an** NDA User,
**I want** to see internal notes I've added to an NDA,
**So that** I can reference my private notes about the NDA.

**Acceptance Criteria:**

**Given** I add an internal note to an NDA
**When** I save the note
**Then** the note appears in the Internal Notes section
**And** I can see all my previous notes with timestamps
**And** I can edit or delete my notes

**Technical Notes:**
- Issue #4: Notes save successfully but don't display
- Gap in Story 3.8 (NDA Detail View) implementation
- Backend likely works, frontend display component missing

---

### Story 9.2: Filter System Events from User Audit Trail

**As an** Admin,
**I want** to see only meaningful user actions in the audit trail,
**So that** I'm not overwhelmed with automated system events.

**Acceptance Criteria:**

**Given** I view the audit trail
**When** the list loads
**Then** I do NOT see permission checks, health checks, or other automated system events
**And** I only see meaningful user actions (created NDA, sent email, changed status, etc.)
**And** system events are still logged in database but filtered from UI display

**Technical Notes:**
- Issue #8: CRITICAL - 139 pages of permission check logs
- Story 6.1 bug: auditMiddleware logs too much
- Solution: Filter by action type in frontend or add "user_visible" flag

---

### Story 9.3: Fix Agency Groups Three-Dots Menu

**As an** Admin,
**I want** the three-dots menu on Agency Groups to work,
**So that** I can edit, delete, or manage subagencies.

**Acceptance Criteria:**

**Given** I'm on the Agency Groups page
**When** I click the three-dots icon next to an agency
**Then** a dropdown menu appears with options:
- Edit Agency Group
- Delete Agency Group
- Add Subagency
- View Subagencies
**And** clicking an option performs the expected action

**Technical Notes:**
- Issue #14: Three-dots menu not functioning
- Gap in Story 2.1 (Agency Groups CRUD) frontend
- Dropdown component likely missing onClick handler

---

### Story 9.4: Add Subagency Creation Button

**As an** Admin,
**I want** a visible "Add Subagency" button,
**So that** I can create subagencies without confusion.

**Acceptance Criteria:**

**Given** I'm viewing an Agency Group's subagencies
**When** the subagencies section displays
**Then** I see an "Add Subagency" button at the top of the section
**And** clicking it opens the create subagency form
**And** the empty state message aligns with available actions

**Technical Notes:**
- Issue #15: Message references non-existent button
- Gap in Story 2.2 (Subagencies CRUD) frontend
- Button exists in code but not rendered, or three-dots menu should trigger it

---

### Story 9.5: Fix Role Assignment Error

**As an** Admin,
**I want** to assign the Read Only role to users without errors,
**So that** I can grant appropriate access levels.

**Acceptance Criteria:**

**Given** I'm editing a user's roles
**When** I try to add the "Read Only" role
**Then** the role is assigned successfully
**And** no "User does not have this role" error appears
**And** the user's permissions update correctly

**Technical Notes:**
- Issue #16: "User does not have this role" error
- Bug in Story 1.3 (RBAC) or Story 2.5 (User Management)
- Logic error: checking if user HAS role when ADDING role

---

### Story 9.6: Human-Readable Audit Trail Display

**As an** Admin,
**I want** audit trail entries displayed in human-readable format,
**So that** I can understand what changed without reading JSON.

**Acceptance Criteria:**

**Given** I view an audit trail entry
**When** the entry includes field changes
**Then** I see changes formatted as:
- "Company Name changed from 'ACME Corp' to 'ACME Corporation'"
- "Status changed from 'Created' to 'Emailed'"
- "Effective Date changed from '01/15/2024' to '02/01/2024'"
**And** I can expand to see raw JSON if needed
**And** complex nested objects display in formatted tables

**Technical Notes:**
- Issue #1: Raw JSON blobs not user-friendly
- Story 6.2 provides formatFieldChanges utility - use it in UI
- Frontend needs to parse changes array and display formatted

---

### Story 9.7: Fix NDA Edit Page Layout

**As an** NDA User,
**I want** proper button layout on the NDA edit page,
**So that** I can access all actions without overflow/crowding.

**Acceptance Criteria:**

**Given** I'm editing an NDA
**When** the page loads
**Then** I see a full-width navigation bar across the top
**And** all action buttons fit properly without overflow
**And** buttons have adequate spacing
**And** the sidebar doesn't interfere with the button area

**Technical Notes:**
- Issue #2: Button overflow/crowding at top
- UI layout refinement needed
- Consider sticky nav bar pattern

---

### Story 9.8: Change Status Modal Overlay

**As an** NDA User,
**I want** a modal dialog when I click "Change Status",
**So that** I can immediately see and select the new status.

**Acceptance Criteria:**

**Given** I'm viewing an NDA
**When** I click "Change Status" button
**Then** a modal overlay appears immediately
**And** the modal contains the status dropdown
**And** I don't need to scroll to find the dropdown
**And** clicking outside modal or "Cancel" closes it

**Technical Notes:**
- Issue #3: Button scrolls to dropdown (confusing UX)
- Replace scroll-to-anchor with modal pattern
- Better immediate feedback for user

---

### Story 9.9: Fix Notifications Bell Dropdown

**As an** NDA User,
**I want** to see my notifications when I click the bell icon,
**So that** I can read and manage my notifications.

**Acceptance Criteria:**

**Given** I have unread notifications (badge count > 0)
**When** I click the notification bell icon in header
**Then** a dropdown panel appears below the bell
**And** I see my recent notifications with:
- Notification message
- Timestamp
- Mark as read option
- Link to related NDA/document
**And** clicking outside closes the dropdown

**Technical Notes:**
- Issue #9: Bell shows badge but nothing happens on click
- Gap in Story 3.11/5.13 implementation
- Frontend click handler missing or not triggering dropdown

---

### Story 9.10: Add Active Page Highlighting to Sidebar

**As a** User,
**I want** the current page highlighted in the sidebar navigation,
**So that** I know which section I'm currently viewing.

**Acceptance Criteria:**

**Given** I'm on any page in the application
**When** I look at the sidebar
**Then** the current page's nav item is highlighted (different color/background)
**And** other nav items are not highlighted
**And** highlighting updates when I navigate to different pages

**Technical Notes:**
- Issue #17: No visual indication of current page
- Standard sidebar pattern - use React Router's useLocation
- Add active class based on current pathname

---

### Story 9.11: Improve Contact Search Display Format

**As an** NDA User,
**I want** to see contact names (not just emails) in search results,
**So that** I can easily identify and select the right person.

**Acceptance Criteria:**

**Given** I'm searching for a contact/POC
**When** search results appear
**Then** each result displays: "FirstName LastName (email@address.com)"
**And** if no name available, shows just email
**And** format is consistent across all contact search fields

**Technical Notes:**
- Issue #22: Autocomplete only shows email
- Gap in Story 3.14 (POC Management) frontend
- Backend likely returns full contact, frontend not displaying name

---

### Story 9.12: Improve Empty NDA List State

**As an** NDA User,
**I want** a clear call-to-action when the NDA list is empty,
**So that** I know how to create my first NDA.

**Acceptance Criteria:**

**Given** I have no NDAs matching current filters (or no NDAs at all)
**When** the empty state displays
**Then** I see a prominent "Create New NDA" button
**And** optionally see helpful text like "No NDAs found" or "Get started by creating your first NDA"
**And** clicking the button navigates to NDA creation form

**Technical Notes:**
- Issue #23: Current message feels negative/instructional
- Simple empty state pattern improvement
- Focus on action, not explanation

---

### Story 9.13: Improve Login Page Branding

**As a** User,
**I want** visually balanced branding on the login page,
**So that** the page feels professional and polished.

**Acceptance Criteria:**

**Given** I'm on the login page
**When** I see the branding
**Then** the USMax logo and "NDA System" text have appropriate visual hierarchy
**And** text size is proportional to logo size
**And** layout feels balanced and professional

**Technical Notes:**
- Issue #25: "NDA System" text feels too large relative to logo
- UI polish / design refinement
- May need to adjust font sizes, spacing, or layout

---

### Story 9.14: Carry Contact Phone to NDA Form

**As an** NDA User,
**I want** contact phone numbers carried over when creating contacts inline,
**So that** I don't have to re-enter information I just typed.

**Acceptance Criteria:**

**Given** I'm creating an NDA and need to add a new contact as POC
**When** I create a new contact with name, email, and phone
**Then** after saving the contact, the NDA form is populated with:
- Contact name
- Contact email
- **Contact phone number**
**And** all fields I entered are carried over, not just name

**Technical Notes:**
- Issue #5: Only name carried over, phone lost
- Gap in Story 3.14 (POC Management) integration
- Frontend likely not reading all fields from contact creation response

---

### Story 9.15: Enhanced Email Template Bodies

**As an** Admin,
**I want** realistic, professional email template content,
**So that** users can send polished emails without extensive editing.

**Acceptance Criteria:**

**Given** I'm viewing or selecting an email template
**When** I see the template body
**Then** the content includes:
- Professional greeting
- Clear purpose/context
- Relevant NDA information placeholders
- Professional closing
- Appropriate tone for government contractor communication

**Technical Notes:**
- Issue #10: Current templates may be too minimal/generic
- Content enhancement, not code change
- May involve creating new seed data

---

### Story 9.16: Improved Email Template Editor

**As an** Admin,
**I want** a larger, better text editor for email templates,
**So that** I can comfortably edit and view full template markup.

**Acceptance Criteria:**

**Given** I'm editing an email template
**When** I view the template body field
**Then** I see a large, multi-line text editor (minimum 10 lines visible)
**And** the editor shows proper formatting/markup
**And** I can see most/all of the template without scrolling within the field
**And** the editor has basic formatting helpers (if HTML templates)

**Technical Notes:**
- Issue #11: Current editor too small
- UI component improvement - use textarea with adequate rows
- Consider adding syntax highlighting for HTML

---

### Story 9.17: Send Test Notification with Recipient Selection

**As an** Admin,
**I want** to specify who receives test notifications and what notification to send,
**So that** I can verify notification delivery before enabling for all users.

**Acceptance Criteria:**

**Given** I'm configuring notifications
**When** I click "Send Test"
**Then** a dialog appears asking:
- Which notification type to test
- Recipient email address (default: my email)
- Optional: test NDA to use for context
**And** I can confirm or cancel
**And** success message shows who received the test and what was sent

**Technical Notes:**
- Issue #12: Test button gives no control over what/who
- Gap in Story 7.16 (Notification Rule Configuration)
- Add modal dialog before sending test

---

### Story 9.18: RTF Template Rich Text Editor

**As an** Admin,
**I want** to create and edit RTF templates using a visual editor or file upload,
**So that** I don't need to manually convert files to Base64.

**Acceptance Criteria:**

**Given** I'm creating or editing an RTF template
**When** I open the template editor
**Then** I can either:
- Upload an RTF/DOCX file (system converts to Base64 internally)
- Use a rich text editor to create/edit content visually
- View preview of current template
**And** I never see or interact with Base64 encoding
**And** field placeholders ({{fieldName}}) are clearly marked

**Technical Notes:**
- Issue #6: Base64 input completely unusable for humans
- MAJOR gap in Story 7.1 (RTF Template Creation)
- Need file upload component + rich text editor (TinyMCE, Quill, or similar)
- This is a significant frontend enhancement

---

### Story 9.19: Clarify or Remove Clauses Section

**As an** Admin or Developer,
**I want** to understand the purpose of the Clauses section,
**So that** we can either implement it properly or remove it.

**Acceptance Criteria:**

**Investigation:**
- Determine original intent of Clauses feature
- Check if it's referenced in PRD or legacy requirements
- Decide: Implement fully, simplify, or remove

**If Implement:**
- Define what clauses are and how they're used
- Create UI for managing clause library
- Integrate clauses into NDA creation flow

**If Remove:**
- Remove Clauses section from UI
- Clean up any backend code
- Document decision

**Technical Notes:**
- Issue #7: Feature exists but purpose unclear and not functional
- Needs product decision before technical work

---

### Story 9.20: Manager Escalation - Add Field or Remove Option

**As an** Admin,
**I want** manager escalation to work correctly,
**So that** notifications are routed appropriately.

**Acceptance Criteria:**

**Investigation:**
- Verify if "manager" relationship is needed for MVP
- Check notification escalation requirements

**Option A: Add Manager Field**
- Add managerId field to Contact model
- Add UI to assign manager in user profile
- Update notification logic to use manager relationship

**Option B: Remove Manager Escalation**
- Remove "Escalate to manager" from notification settings
- Document that this feature is deferred to Phase 2

**Technical Notes:**
- Issue #13: Feature references non-existent relationship
- Product decision needed: essential or nice-to-have?

---

### Story 9.21: Verify or Remove IP Access Control

**As an** Admin or Developer,
**I want** to know if IP Access Control is functional,
**So that** we can complete it or remove confusing UI.

**Acceptance Criteria:**

**Investigation:**
- Test if IP restrictions actually block access
- Check backend implementation status
- Review if feature is required for MVP

**If Functional:** Document how to use
**If Partially Implemented:** Complete implementation
**If Not Implemented:** Remove from UI or mark "Coming Soon"

**Technical Notes:**
- Issue #18: Unclear if feature works
- May be placeholder UI from earlier implementation

---

### Story 9.22: Verify or Remove CORS Configuration

**As an** Admin or Developer,
**I want** to know if CORS Configuration is functional,
**So that** we can complete it or remove confusing UI.

**Acceptance Criteria:**

**Investigation:**
- Check if CORS config UI actually updates server CORS settings
- Determine if runtime CORS configuration is needed vs env vars
- Decide if feature belongs in UI or should be infrastructure-only

**If Functional:** Document usage
**If Not Needed:** Remove from UI (CORS should be env vars)

**Technical Notes:**
- Issue #19: Unclear if feature works
- CORS typically configured via environment variables, not runtime UI

---

### Story 9.23: Verify or Remove API Key Management

**As an** Admin or Developer,
**I want** to understand what API keys this refers to,
**So that** we can implement properly or remove.

**Acceptance Criteria:**

**Investigation:**
- Determine what API keys this feature is for
- Check if API key authentication is planned/needed
- Verify if there's a use case for programmatic API access

**Decision:**
- If needed: Implement API key generation/management
- If not needed: Remove from UI
- If Phase 2: Mark as "Coming Soon"

**Technical Notes:**
- Issue #20: Purpose unclear
- May be premature feature for future API consumers

---

### Story 9.24: Verify Security Alerts Implementation

**As an** Admin,
**I want** accurate messaging about security monitoring,
**So that** users aren't misled about system capabilities.

**Acceptance Criteria:**

**Investigation:**
- Check if automated alerts to admins are actually implemented
- Verify Story 6.4 security monitoring utilities are integrated
- Determine if Sentry/CloudWatch alerts are configured

**If Implemented:** Document what triggers alerts
**If Not Implemented:** Update messaging to be accurate ("Security events are logged" not "will trigger immediate alerts")

**Technical Notes:**
- Issue #21: Message claims auto-alerting may not exist
- Story 6.4 created utilities, but alerting integration unclear

---

### Story 9.25: Verify All Notification Settings Work

**As an** NDA User,
**I want** all notification preference toggles to actually work,
**So that** I only receive emails I've opted into.

**Acceptance Criteria:**

**Investigation:**
- Test each notification setting toggle
- Verify they actually enable/disable email sends
- Check if notification preferences are checked before sending

**If Working:** Document behavior
**If Broken:** Fix notification service to respect preferences
**If Incomplete:** Finish implementation

**Technical Notes:**
- Issue #24: Unclear if toggles are functional
- Story 5.13 (Email Notification Preferences) - verify implementation complete

---

**Total Story Count:** 138 user stories across all 9 epics (25 new stories in Epic 9)

**Epic 9 Completion:** Brings system to production-ready quality


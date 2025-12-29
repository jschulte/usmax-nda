---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - docs/prd.md
  - docs/architecture.md
  - docs/aws-infrastructure-architecture.md
  - Customer Feedback (2025-12-23) - Field clarifications and workflow changes
epicCount: 10
storyCount: 17
workflowStatus: complete
completedAt: 2025-12-23
---

# usmax-nda - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for usmax-nda, decomposing the requirements from the PRD, Architecture, and Customer Feedback into implementable stories.

## Requirements Inventory

### Functional Requirements

**FR1:** Users can create a new NDA request by entering required information (company, agency, POCs, purpose, dates)

**FR2:** Users can create an NDA using three intelligent entry paths (Company-first, Clone existing, Agency-first)

**FR3:** Users can select which RTF template to use when creating an NDA (multiple templates supported)

**FR4:** System can generate RTF document from selected template with field-merge (all NDA fields populated into template)

**FR5:** Users can preview generated RTF document before finalizing NDA creation

**FR6:** Users can edit RTF template content before sending (if needed)

**FR7:** Users can save NDA as draft (incomplete) and return to complete later

**FR8:** System auto-saves draft NDAs every 30 seconds (prevent data loss)

**FR9:** Users can view all their NDAs in a sortable, paginated list

**FR10:** Users can filter NDA list by 15 criteria (agency, company, city, state, type, incorporation state, agency/office name, non-USmax flag, effective date range, requested date range, 3 POC name filters)

**FR11:** Users can apply filter presets with one click ("My NDAs", "Expiring Soon", "Waiting on 3rd Party", "Stale - No Activity")

**FR12:** Users can change NDA status (Created, Emailed, In Revision, Fully Executed, Inactive, Cancelled)

**FR13:** System auto-changes status based on user actions (Send email → "Emailed", Upload document → "In Revision", Upload with "Fully Executed" → "Fully Executed NDA")

**FR14:** Users can mark NDA as Inactive or Cancelled (reversible status changes)

**FR15:** Users can view NDA detail with full information, history timeline, and documents

**FR16:** Users can see visual status progression (Amazon-style circles: Created → Emailed → Revision → Executed with dates)

**FR17:** System stores all NDA documents in S3 with multi-region replication, versioning, and encryption

**FR18:** Users can upload documents to an NDA (drag-drop or file picker)

**FR19:** Users can mark uploaded document as "Fully Executed NDA" (triggers status change and date capture)

**FR20:** Users can download any document version (system generates time-limited pre-signed S3 URL)

**FR21:** Users can download all document versions for an NDA as ZIP file

**FR22:** System tracks document metadata (filename, upload date, uploader, type: Generated/Uploaded/Executed)

**FR23:** Users can view complete document version history for an NDA

**FR24:** System preserves all document versions indefinitely (never overwrites, never deletes)

**FR25:** Users can compose and send NDA email with generated RTF attached

**FR26:** System pre-fills email fields based on NDA data (Subject, TO, CC, BCC, Body)

**FR27:** Users can select from multiple email templates when composing

**FR28:** Users can edit all email fields (subject, recipients, body) before sending

**FR29:** System tracks email send events in NDA history (recipients, timestamp, delivery status)

**FR30:** System sends email notifications to subscribed stakeholders when NDA status changes

**FR31:** Users can configure which notification types they want to receive via email

**FR32:** System enforces MFA (multi-factor authentication) for all users

**FR33:** System implements granular RBAC with 7 permissions (nda:create, nda:update, nda:upload_document, nda:send_email, nda:mark_status, nda:view, admin permissions)

**FR34:** System supports role templates (Read-Only, NDA User, Limited User, Manager, Admin)

**FR35:** System enforces row-level security (users only see NDAs for their authorized agencies)

**FR36:** Users can only access NDAs for Agency Groups they're granted access to

**FR37:** Users can only access NDAs for specific Subagencies they're granted access to (if subagency-scoped)

**FR38:** System displays permission-aware UI (disabled buttons with helpful tooltips for unauthorized actions)

**FR39:** System provides clear role indicators (badges showing "Admin", "Read-Only", etc.)

**FR40:** Users with insufficient permissions see helpful error messages (not cryptic 403 errors)

**FR41:** Admins can create, edit, and view Agency Groups

**FR42:** Admins can delete Agency Groups (with safeguard: cannot delete if NDAs exist)

**FR43:** Admins can create, edit, and view Subagencies within Agency Groups

**FR44:** Admins can delete Subagencies (with safeguard: cannot delete if NDAs exist)

**FR45:** Admins can assign users to Agency Group access (group-level: user sees all subagencies in group)

**FR46:** Admins can assign users to specific Subagency access (subagency-level: user sees only that subagency)

**FR47:** Admins can view "users having access" summary for each Agency Group and Subagency

**FR48:** System displays Agency/Subagency hierarchy visually (tree view or organized list)

**FR49:** Users can search across all NDA fields (company name, purpose, agency, POC names)

**FR50:** Users can use type-ahead search (results appear as you type, not after clicking search)

**FR51:** Users can sort NDA list by any column (ID, company, agency, effective date, requested date, status, etc.)

**FR52:** System remembers user's column sort preference (persisted per user)

**FR53:** Users can apply date range shortcuts ("Last 30 Days", "This Quarter", "This Year") instead of manual date entry

**FR54:** System shows recently used values at top of dropdowns (agencies, companies, users)

**FR55:** Users can paginate through large result sets (configurable page size)

**FR56:** Users see personalized dashboard on login (recent NDAs, subscriptions, activity, items needing attention)

**FR57:** Dashboard displays at-a-glance metrics (active NDAs count, expiring soon count, average cycle time)

**FR58:** Dashboard identifies stale NDAs (created but not emailed after 2 weeks, or emailed but no response after configurable threshold)

**FR59:** Dashboard shows "waiting on 3rd party" NDAs with time in current state

**FR60:** Dashboard alerts users to NDAs approaching expiration (30/60/90 day thresholds - configurable)

**FR61:** Users receive email notifications when subscribed NDA changes status

**FR62:** Users can configure notification preferences (which event types trigger emails)

**FR63:** System logs ALL user actions with comprehensive details (who, what, when, where, IP address)

**FR64:** System tracks NDA field changes with before/after values

**FR65:** System tracks all document downloads (who downloaded what document, when, from what IP)

**FR66:** System tracks all login attempts (successful and failed, with timestamp and IP address)

**FR67:** Users can view complete audit trail for any NDA (all actions, all users, all timestamps)

**FR68:** System displays audit trail as visual timeline (chronological with icons for event types)

**FR69:** Admins can access centralized audit log viewer (all NDAs, all users, system-wide)

**FR70:** Admins can filter audit logs by user, action type, date range, NDA, IP address

**FR71:** Admins can export audit logs to CSV/Excel for compliance reviews

**FR72:** System tracks email send events (who sent to whom, when, delivery status, opened/clicked if trackable)

**FR73:** System preserves audit trail indefinitely (never deleted, immutable records)

**FR74:** Admins can create, edit, and view user accounts (if not directory-synced)

**FR75:** Admins can deactivate users (soft delete, preserve history and audit trail)

**FR76:** Admins can assign roles and permissions to users

**FR77:** Admins can assign Agency Group and Subagency access to users

**FR78:** Users can view user directory (contacts) with search and filtering

**FR79:** System supports user profiles with email signature (auto-included in email templates)

**FR80:** System provides user search with auto-complete (type 3 letters → see matches with role/agency context)

**FR81:** Admins can view access control summary for any user (which agencies/subagencies they can access, which permissions they have)

**FR82:** Admins can create multiple RTF templates with field-merge placeholders ({{fieldName}} syntax)

**FR83:** Admins can edit RTF template content and field mappings

**FR84:** Admins can organize templates (by agency, by type, or by user - based on customer preference TBD)

**FR85:** Admins can set default template for agency/type combinations

**FR86:** Users can select which template to use when creating NDA

**FR87:** System merges NDA fields into template placeholders automatically

**FR88:** Admins can create multiple email templates with field-merge placeholders

**FR89:** Users can select which email template to use when composing NDA email

**FR90:** Email templates include user signature automatically (from user profile)

**FR91:** System suggests templates based on agency/type selection

**FR92:** System suggests companies based on agency selection (frequent partners for this agency)

**FR93:** System provides field suggestions based on historical NDA data (common purposes for agency/company combinations)

**FR94:** System shows "previous NDAs for this company" context when creating new NDA

**FR95:** System suggests email recipients based on historical patterns

**FR96:** System improves suggestions over time as more NDAs are created

**FR97:** System sends alerts to administrators when critical errors occur (<5 minute response time)

**FR98:** System tracks all errors with stack traces, context, and user session data (Sentry integration)

**FR99:** Admins can view system health dashboards (uptime, error rates, API response times, database performance)

**FR100:** System retries failed email sends automatically (exponential backoff, max 3 attempts, logs all attempts)

**FR101:** System logs failed operations to separate monitoring system

**FR102:** System provides weekly health reports

**FR103:** System enables zero-downtime deployments

**FR104:** System validates all required fields before allowing NDA creation (client-side and server-side)

**FR105:** System validates data formats (email addresses, phone numbers with format hints, dates)

**FR106:** System enforces character limits (Authorized Purpose ≤255 characters per legacy requirement)

**FR107:** System prevents invalid date ranges (effective date ≤ expiry date where applicable)

**FR108:** System validates file uploads (allowed types: RTF/PDF, max size, basic malware scanning)

**FR109:** System enforces referential integrity (cannot delete agency with NDAs, cannot delete user assigned as POC)

**FR110:** System provides real-time inline validation feedback

**FR111:** System provides configurable session timeout (admin sets 30min - 8 hours, default 4 hours)

**FR112:** System warns users 5 minutes before session expires

**FR113:** System logs all authentication events (logins, logouts, MFA challenges, failures)

**FR114:** Users can designate an Opportunity POC (required - internal USmax user selected from directory)

**FR115:** Users can enter Contracts POC details (optional: name, email, phone, fax)

**FR116:** Users can enter Relationship POC details (required: name, email, phone, fax)

**FR117:** Users can enter Contacts POC details (optional - TBD if different from Contracts POC based on customer clarification)

**FR118:** System provides "Copy POC Details" functionality

**FR119:** System validates POC email addresses and phone number formats

**FR120:** Users can mark NDA as "Non-USmax NDA" via checkbox

**FR121:** System handles Non-USmax NDAs according to configured behavior

**FR122:** Admins can add, edit, reorder, and archive NDA status values

**FR123:** System prevents deletion of status values currently in use

**FR124:** Admins can configure status auto-transition rules

**FR125:** Admins can configure email notification rules

**FR126:** Admins can configure dashboard alert thresholds

**FR127:** Admins can configure default email CC/BCC recipients

**FR128:** Admins can configure allowed values for dropdown fields (Type, USmax Position)

**FR129:** System encrypts all data at rest in database

**FR130:** System enforces TLS 1.3 for all client-server connections

**FR131:** System stores all documents in S3 with server-side encryption

**FR132:** System uses multi-region S3 replication for document storage

**FR133:** System generates time-limited pre-signed URLs for document downloads (15-minute expiry)

**FR134:** System logs all document access attempts

**FR135:** System provides automated database backup via snapshots (daily, 7-day retention nonprod, 30-day prod)

**FR136:** System can restore database from snapshot backup

**FR137:** Admins can test disaster recovery procedures

**FR138:** System provides database recovery via snapshot restore

**FR139:** System handles AWS regional service outages gracefully

**FR140:** System displays user-friendly error messages with actionable guidance

**FR141:** Users can retry failed operations

**FR142:** System queues failed email sends for automatic retry

**FR143:** System logs all errors to separate failsafe monitoring system

**FR144:** System gracefully degrades when secondary features fail

**FR145:** System detects offline/network issues and displays clear messaging

**FR146:** System preserves form data during network failures

**FR147:** System validates all required fields before allowing NDA submission

**FR148:** System validates data formats (email, phone as (XXX) XXX-XXXX, dates as mm/dd/yyyy)

**FR149:** System enforces character limits

**FR150:** System prevents invalid date ranges

**FR151:** System validates file uploads

**FR152:** System enforces referential integrity

**FR153:** System provides real-time inline validation feedback

**FR154:** Admins can export NDA list to CSV/Excel

**FR155:** Admins can export audit logs to CSV/Excel

**FR156:** System can import NDAs from email archives (Phase 2 pending customer interest)

**FR157:** System supports keyboard shortcuts for common actions (Phase 1.5)

**FR158:** System provides right-click context menus for quick actions (Phase 1.5)

**FR159:** System allows bulk operations on multiple selected NDAs (Phase 2)

### Non-Functional Requirements

**NFR-P1:** Page load time <2 seconds on fast connection, <5 seconds on throttled network

**NFR-P2:** API response times <500ms for read operations, <1 second for write operations

**NFR-P3:** User actions complete within 500ms

**NFR-P4:** Initial JavaScript bundle size <400KB gzipped

**NFR-P5:** Subsequent page navigation <500ms

**NFR-P6:** Time to interactive <3 seconds

**NFR-S1:** All users must authenticate with MFA

**NFR-S2:** All data encrypted at rest

**NFR-S3:** All connections encrypted in transit (TLS 1.3 enforced)

**NFR-S4:** Document downloads use time-limited pre-signed URLs (15-minute expiry)

**NFR-S5:** System implements granular RBAC (7 distinct permissions)

**NFR-S6:** Row-level security enforced

**NFR-S7:** All authentication attempts logged

**NFR-S8:** Session timeout configurable (default 4 hours, range 30min - 8 hours)

**NFR-S9:** No sensitive data in browser localStorage

**NFR-S10:** File uploads validated and scanned for malware

**NFR-R1:** System uptime ≥99.9% (<9 hours downtime per year)

**NFR-R2:** ≤1 critical bug in first 30 days post-launch

**NFR-R3:** Error rate <0.1% of all operations

**NFR-R4:** Zero data loss incidents

**NFR-R5:** Automated daily snapshots

**NFR-R6:** S3 multi-region replication for documents

**NFR-R7:** Disaster recovery RTO <4 hours

**NFR-R8:** Disaster recovery RPO <24 hours

**NFR-R9:** Instance health monitored

**NFR-R10:** Low-downtime deployments (<5 minutes maintenance window)

**NFR-R11:** Failed email sends automatically retried

**NFR-R12:** System gracefully degrades

**NFR-R13:** Snapshot restore procedures tested quarterly

**NFR-C1:** CMMC Level 1 compliance

**NFR-C2:** FAR document retention compliance (indefinite > 6-year requirement)

**NFR-C3:** Comprehensive audit trail (100% of user actions logged)

**NFR-C4:** Audit logs immutable and preserved indefinitely

**NFR-C5:** Audit logs exportable to CSV/Excel

**NFR-C6:** All document access tracked

**NFR-C7:** Field changes tracked with before/after values

**NFR-A1:** WCAG 2.1 Level AA compliance (Section 508)

**NFR-A2:** All functionality accessible via keyboard navigation

**NFR-A3:** Screen reader compatible

**NFR-A4:** Color contrast meets AA standards (4.5:1 normal, 3:1 large text)

**NFR-A5:** Focus indicators visible

**NFR-A6:** Form labels and errors clear and properly associated

**NFR-A7:** No seizure-inducing animations

**NFR-M1:** Automated test coverage ≥80%

**NFR-M2:** Test execution time <5 minutes

**NFR-M3:** Zero flaky tests allowed

**NFR-M4:** All tests pass 100% before deployment

**NFR-M5:** TypeScript strict mode enforced

**NFR-M6:** Code review required for all changes

**NFR-M7:** Clear code conventions enforced (ESLint, Prettier)

**NFR-M8:** Comprehensive documentation

**NFR-M9:** New developer can deploy within 1 day of onboarding

**NFR-O1:** All errors captured with stack traces (Sentry integration)

**NFR-O2:** Critical errors alert within 5 minutes

**NFR-O3:** System health dashboards available

**NFR-O4:** Weekly automated health reports

**NFR-O5:** Zero silent failures

**NFR-O6:** Performance metrics tracked

**NFR-O7:** Failed operations logged to separate failsafe system

**NFR-U1:** Common tasks <3 clicks to complete

**NFR-U2:** All state changes provide explicit confirmation

**NFR-U3:** Error messages user-friendly with actionable guidance

**NFR-U4:** Permission-denied states show helpful tooltips

**NFR-U5:** Auto-save prevents data loss (30-second intervals)

**NFR-U6:** Session timeout warnings 5 minutes before expiration

**NFR-B1:** Latest 2 versions of Chrome, Edge, Firefox, Safari supported

**NFR-B2:** No IE11 or legacy Edge support required

**NFR-B3:** Responsive design functional on desktop (primary), tablet, mobile (view-optimized)

**NFR-D1:** Referential integrity enforced

**NFR-D2:** All data validated client-side AND server-side

**NFR-D3:** Character limits enforced

**NFR-D4:** Date formats consistent (mm/dd/yyyy)

**NFR-D5:** Document versions immutable (append-only)

**NFR-CE1:** Total infrastructure costs <$100/month for expected load

**NFR-CE2:** Predictable monthly cost

**NFR-CE3:** S3 storage minimal cost

### Additional Requirements

**From Architecture Document:**

- **RTF Generation:** Generate DOCX using `docx` library → export to RTF, Handlebars for field-merge
- **Starter Template:** PERN stack (React 19 + Vite + Express + PostgreSQL) with Docker deployment
- **Database Design:** 17 tables with proper foreign keys, UUIDs + display IDs, indexes on all filterable fields
- **API Structure:** ~35-40 RESTful endpoints with nested resources and action endpoints
- **Authentication Pipeline:** Cognito JWT → checkPermissions → scopeToAgencies → Route Handler
- **Audit Logging:** All mutations logged via middleware to immutable audit_log table
- **Error Handling:** 5-layer strategy (Frontend Zod → API validation → Business logic → DB constraints → Global handler)
- **Row-Level Security:** Mandatory agency scoping helper function applied to ALL NDA queries
- **Migration Strategy:** Prisma migrations with automated snapshot backup before every migration
- **Deployment:** Docker Compose (Nginx + Express + PostgreSQL) on AWS infrastructure or ECS Fargate
- **Monitoring:** Sentry (errors) + CloudWatch (infrastructure) + Google Analytics (usage)
- **Testing Infrastructure:** Vitest (unit), Playwright (E2E), Docker PostgreSQL for integration tests
- **Project Structure:** Monorepo with shared types between frontend and backend

**From AWS Infrastructure Architecture:**

- **Compute:** ECS Fargate (nonprod: 1 task, prod: 2+ tasks with auto-scaling)
- **Database:** RDS PostgreSQL (nonprod: db.t3.micro single-AZ, prod: db.t3.small+ Multi-AZ)
- **Storage:** S3 multi-region (us-east-1 primary, us-west-2 replica) with versioning and encryption
- **Network:** VPC with public/private subnets, ALB for HTTPS, Security Groups for isolation
- **Security:** Cognito User Pool with MFA, WAF (prod), encryption at rest/transit, IAM roles
- **Email:** SES with DKIM/SPF/DMARC, pg-boss queue for retry logic
- **Monitoring:** CloudWatch Logs, Alarms, Dashboards, SNS notifications
- **CI/CD:** GitHub Actions with automated testing, building, and deployment
- **Backup:** Automated daily snapshots (7-day nonprod, 30-day prod retention)
- **Cost Target:** ~$41/month nonprod, ~$164/month prod (base infrastructure)

**From Customer Feedback (2025-12-23):**

**Data Model Changes:**

1. **Type field clarification:** "Type" dropdown can equal "Status" (needs customer clarification on what this means)
2. **USmax Position values:** Must support "Prime", "Sub-contractor", "Other"
3. **NDA Type field:** Must support "Mutual NDA" and "Consultant" types
4. **Status values alignment:** Use legacy system statuses - "Created/Pending Release", "Sent/Pending Signature", "Fully Executed NDA Uploaded", "Inactive/Canceled", "Expired"
5. **Auto-expiration logic:** NDAs expire 1 year after execution date (when fully executed NDA uploaded, capture execution date and auto-expire after 365 days)
6. **Non-USmax NDA tracking:** Add flag to mark NDAs where USmax signs partner's NDA (stored for tracking, prevent accidental email sends)
7. **POC clarification needed:** Determine if "Contacts POC" and "Contracts POC" are same or different (currently open question)

**Workflow Changes:**

8. **Two-step approval workflow:** Creator drafts NDA → Routes for approval → Approver reviews → Approver sends email (creator and approver can be same person)
9. **Preview before send/route:** Users must preview full NDA document before sending or routing for approval
10. **Creator = Approver option:** System must support scenario where creator approves their own NDA

**Email Management:**

11. **BCC automation:** All contacts with "Notify on NDA Changes" checkbox go into BCC field
12. **CC/BCC management:** Users can manage default CC/BCC lists and add ad-hoc recipients per email
13. **Email template storage:** Store base email template for quick editing (merge with existing email template features)

**UI/UX Changes:**

14. **Spelling correction:** Use "USmax" (not "USmax") throughout application
15. **"Request NDA" button:** Add button to header for creating new NDA
16. **Non-USmax NDA flow:** Prevent accidental email sends for partner NDAs (clear UI indication, confirmation prompts)

**Data Cleanup:**

17. **Remove users:** Delete or deactivate Chris, Sae, Angela, and John from system

**Clarifications Received:**

- No need for historical data import/backfilling
- Multiple NDA templates confirmed as desired
- Email template editing workflow: edit core template once, applies going forward
- Non-USmax NDAs: simple tracking, avoid accidental sends

### FR Coverage Map

*(All 159 original FRs covered by Epics 1-8, completed per sprint-status.yaml)*
*(Epic 9 addresses post-demo refinements and bug fixes)*
*(Epic 10 addresses new requirements from customer feedback 2025-12-23)*

## Epic List

### Epic 10: Customer Feedback Implementation

**User Outcome:** System incorporates customer clarifications including approval workflow, updated field values, email automation, and Non-USmax NDA safeguards.

**Customer Feedback Items (17 total):**

**Story Group 1 - Data Model Updates (5 stories):**
- 10-1: Add USmax Position field (Prime/Sub-contractor/Other)
- 10-2: Add NDA Type field (Mutual NDA/Consultant)
- 10-3: Update status values to match legacy system
- 10-4: Implement auto-expiration (1 year from execution date)
- 10-5: Add Non-USmax NDA flag and tracking

**Story Group 2 - Approval Workflow (3 stories):**
- 10-6: Implement two-step approval workflow
- 10-7: Add preview before send/route functionality
- 10-8: Support creator = approver scenario

**Story Group 3 - Email Management (3 stories):**
- 10-9: Automate BCC from "Notify on NDA Changes"
- 10-10: Enhance CC/BCC management
- 10-11: Enable base email template editing

**Story Group 4 - UI/UX Refinements (3 stories):**
- 10-12: Global spelling correction (USmax not USmax)
- 10-13: Add "Request NDA" button to header
- 10-14: Add Non-USmax NDA flow safeguards

**Story Group 5 - Data Cleanup (1 story):**
- 10-15: Remove specified users (Chris, Sae, Angela, John)

**Story Group 6 - Clarifications (2 stories):**
- 10-16: Clarify "Type" field meaning with customer
- 10-17: Clarify Contacts POC vs Contracts POC distinction

---

## Epic 10: Customer Feedback Implementation

**Goal:** Incorporate customer clarifications including approval workflow, updated field values, email automation, and Non-USmax NDA safeguards based on feedback received 2025-12-23.

---

### Story 10.1: Add USmax Position Field

As an NDA creator,
I want to select USmax's position on the NDA (Prime, Sub-contractor, or Other),
So that the NDA accurately reflects USmax's contractual role.

**Acceptance Criteria:**

**Given** I am creating or editing an NDA
**When** I access the NDA form
**Then** I see a "USmax Position" dropdown field with options: "Prime", "Sub-contractor", "Other"
**And** the field is required (cannot be left blank)

**Given** an existing NDA without a USmax Position value
**When** I view the NDA detail page
**Then** the USmax Position field shows as "(Not Set)" or equivalent placeholder
**And** I can edit the NDA to add this value

**Given** I have selected a USmax Position value
**When** I save the NDA
**Then** the value is stored in the database
**And** displayed in the NDA detail view
**And** filterable in the NDA list view

---

### Story 10.2: Add NDA Type Field

As an NDA creator,
I want to specify the NDA type (Mutual NDA or Consultant),
So that I can categorize NDAs by their legal structure.

**Acceptance Criteria:**

**Given** I am creating a new NDA
**When** I access the NDA form
**Then** I see an "NDA Type" dropdown field with options: "Mutual NDA", "Consultant"
**And** the field is required

**Given** I select "Mutual NDA" as the type
**When** I save the NDA
**Then** the type is stored and displayed on the NDA detail page
**And** the type is shown in the NDA list view

**Given** I am filtering NDAs
**When** I open the filter panel
**Then** I can filter by NDA Type (Mutual NDA, Consultant, or All)
**And** the filtered results show only NDAs matching the selected type

---

### Story 10.3: Update Status Values to Match Legacy System

As an NDA manager,
I want status values that match the legacy system workflow,
So that users recognize familiar statuses and the system aligns with established processes.

**Acceptance Criteria:**

**Given** the system currently uses generic status names
**When** the migration is complete
**Then** the following statuses are available:
- "Created/Pending Release" (replaces "Created")
- "Sent/Pending Signature" (replaces "Emailed")
- "Fully Executed NDA Uploaded" (replaces "Fully Executed")
- "Inactive/Canceled" (replaces "Inactive" and "Cancelled")
- "Expired" (new status for auto-expiration)

**Given** existing NDAs with old status values
**When** the migration runs
**Then** all NDAs are migrated to the new status names
**And** no data is lost
**And** audit logs reflect the status name changes

**Given** I am viewing the NDA list or detail page
**When** I see the status
**Then** it displays the new legacy-aligned status name
**And** the visual status progression timeline is updated to reflect the new names

---

### Story 10.4: Implement Auto-Expiration Logic

As a compliance officer,
I want NDAs to automatically expire 1 year after their execution date,
So that we maintain accurate records and proactively identify expired agreements.

**Acceptance Criteria:**

**Given** I upload a fully executed NDA document
**When** I mark it as "Fully Executed"
**Then** the system prompts me to enter the "Execution Date" (date the NDA was signed)
**And** the system calculates the expiration date as execution date + 365 days
**And** stores both dates in the database

**Given** an NDA with an execution date
**When** the current date reaches the expiration date
**Then** the system automatically changes the status to "Expired"
**And** logs the status change in the audit trail
**And** sends notification emails to subscribed stakeholders

**Given** I am viewing the dashboard
**When** NDAs are approaching expiration (30, 60, 90 days before)
**Then** they appear in the "Expiring Soon" alert section
**And** show the number of days until expiration

**Given** I am filtering NDAs
**When** I select the "Expired" status filter
**Then** I see all NDAs that have passed their expiration date

---

### Story 10.5: Add Non-USmax NDA Flag and Tracking

As an NDA creator,
I want to mark NDAs where USmax signs a partner's NDA (not our template),
So that these are tracked separately and I don't accidentally send emails for partner-created NDAs.

**Acceptance Criteria:**

**Given** I am creating a new NDA
**When** I access the NDA form
**Then** I see a checkbox labeled "Non-USmax NDA" (USmax signing partner's NDA)
**And** it is unchecked by default

**Given** I check the "Non-USmax NDA" checkbox
**When** I save the NDA
**Then** the flag is stored in the database
**And** the NDA detail page shows a prominent badge/indicator: "Non-USmax NDA"

**Given** I am on the NDA detail page for a Non-USmax NDA
**When** I attempt to generate an RTF document
**Then** the system shows a warning: "This is a Non-USmax NDA. Document generation is typically not needed."
**And** I can still proceed if I choose (not blocked, just warned)

**Given** I am on the NDA detail page for a Non-USmax NDA
**When** I attempt to send an email
**Then** the system shows a confirmation prompt: "This is a Non-USmax NDA. Are you sure you want to send an email?"
**And** I must explicitly confirm to proceed
**And** if I cancel, no email is sent

---

### Story 10.6: Implement Two-Step Approval Workflow

As an NDA creator,
I want to route my NDA for approval before it is sent,
So that a manager can review and approve the NDA before it goes to the partner.

**Acceptance Criteria:**

**Given** I have created an NDA
**When** I am on the NDA detail page
**Then** I see two action buttons: "Route for Approval" and "Send Email" (if I have both permissions)
**And** the "Send Email" button is disabled if status is "Created/Pending Release"

**Given** I click "Route for Approval"
**When** the action completes
**Then** the NDA status changes to "Pending Approval" (new intermediate status)
**And** an audit log entry is created
**And** notification emails are sent to users with "nda:approve" permission for this agency

**Given** I am an approver
**When** I view an NDA with status "Pending Approval"
**Then** I see action buttons: "Approve & Send", "Reject", "Request Changes"

**Given** I click "Approve & Send"
**When** the action completes
**Then** the NDA status changes to "Sent/Pending Signature"
**And** the email composer opens with the NDA attached
**And** the audit log records who approved and when

**Given** I am viewing the NDA list
**When** I filter by status
**Then** I see "Pending Approval" as a filterable status option

---

### Story 10.7: Add Preview Before Send/Route Functionality

As an NDA creator,
I want to preview the complete NDA document before routing for approval or sending,
So that I can verify all fields are correct before the NDA leaves my hands.

**Acceptance Criteria:**

**Given** I am creating or editing an NDA
**When** I click "Preview NDA" button
**Then** the system generates the RTF document with all current field values merged
**And** displays a preview modal showing the document content (or download link if browser preview not possible)

**Given** I am on the NDA detail page
**When** I click "Route for Approval" or "Send Email"
**Then** the system automatically shows the preview modal first
**And** I must explicitly confirm "Yes, route/send" or "Cancel" after viewing

**Given** I am viewing the preview modal
**When** I notice an error in the document
**Then** I can click "Cancel" to return to the NDA form
**And** make corrections before trying again

**Given** the preview modal is displayed
**When** I click "Confirm & Route" or "Confirm & Send"
**Then** the action proceeds (route for approval or open email composer)
**And** the preview modal closes

---

### Story 10.8: Support Creator = Approver Scenario

As an NDA creator with approval permissions,
I want the system to handle the case where I approve my own NDA,
So that I can complete the workflow efficiently without routing to myself.

**Acceptance Criteria:**

**Given** I am creating an NDA
**When** the system checks my permissions
**Then** if I have both "nda:create" AND "nda:approve" permissions, I see a "Create & Approve" button option

**Given** I click "Create & Approve"
**When** the action completes
**Then** the NDA is saved
**And** automatically marked as approved (by me)
**And** the email composer opens immediately (skipping the "Pending Approval" status)
**And** the audit log shows "Created and self-approved by [User]"

**Given** I route my own NDA for approval (choosing standard workflow)
**When** I view the NDA as an approver
**Then** I see a notice: "You are approving your own NDA"
**And** I can proceed with approval (not blocked)

**Given** I am an admin viewing the audit log
**When** I filter by "self-approved NDAs"
**Then** I can see all cases where creator = approver for oversight purposes

---

### Story 10.9: Automate BCC from "Notify on NDA Changes"

As an NDA creator,
I want all contacts who have "Notify on NDA Changes" checked to automatically go into the BCC field,
So that stakeholders are notified without manual email address entry.

**Acceptance Criteria:**

**Given** I am editing an NDA
**When** I check "Notify on NDA Changes" for a contact (Opportunity POC, Contracts POC, Relationship POC, or Contacts POC)
**Then** the system stores this preference in the database

**Given** I am composing an email for the NDA
**When** the email composer pre-fills recipients
**Then** all contacts with "Notify on NDA Changes" checked are automatically added to the BCC field
**And** I can see the list of BCC recipients in the email form

**Given** the BCC field is auto-populated
**When** I review the recipients before sending
**Then** I can add additional BCC recipients manually
**And** I can remove auto-populated BCC recipients if needed (rare case)

**Given** I send the email
**When** the email is sent
**Then** all BCC recipients receive a copy
**And** the email history records the full BCC list
**And** the audit log shows which contacts were notified

---

### Story 10.10: Enhance CC/BCC Management

As an NDA creator,
I want to manage default CC/BCC lists and add ad-hoc recipients per email,
So that I have flexible control over who receives email notifications.

**Acceptance Criteria:**

**Given** I am in the admin configuration section
**When** I navigate to "Email Settings"
**Then** I see fields to configure default CC and BCC email addresses (comma-separated list)
**And** these defaults apply to all NDA emails system-wide

**Given** default CC/BCC values are configured
**When** I compose an NDA email
**Then** the email composer pre-fills the CC and BCC fields with the defaults
**And** displays them clearly in the email form

**Given** I am composing an email
**When** I want to add ad-hoc recipients
**Then** I can add email addresses to the CC field
**And** I can add email addresses to the BCC field
**And** these are in addition to the defaults (not replacing them)

**Given** I am composing an email
**When** I want to remove a default recipient
**Then** I can click the (X) next to their email address to remove them
**And** the removal only applies to this specific email (not changing the defaults)

**Given** I send the email
**When** the email is sent
**Then** all final CC and BCC recipients receive copies
**And** the email history records the complete recipient list (TO, CC, BCC)

---

### Story 10.11: Enable Base Email Template Editing

As an admin,
I want to edit the base email template content once and have it apply to all future emails,
So that I can update standard language without editing individual NDAs.

**Acceptance Criteria:**

**Given** I am in the admin section
**When** I navigate to "Email Templates"
**Then** I see a list of existing email templates (e.g., "Default NDA Email")
**And** I can click "Edit" on any template

**Given** I am editing an email template
**When** I update the template body text
**Then** I can use field-merge placeholders: {{companyName}}, {{effectiveDate}}, {{ndaType}}, etc.
**And** the system shows me the list of available placeholders

**Given** I save the updated template
**When** I create a new NDA email
**Then** the email composer pre-fills with the updated template content
**And** all placeholders are replaced with actual NDA data

**Given** I have existing draft NDA emails
**When** I update a template
**Then** existing drafts are NOT automatically updated (only new emails use the new template)
**And** I see a notice explaining this behavior

**Given** I am composing an email
**When** the template content is loaded
**Then** I can still edit the email body for this specific NDA (one-time customization)
**And** my edits don't affect the base template

---

### Story 10.12: Global Spelling Correction (USmax vs USmax)

As a user,
I want the application to consistently use "USmax" (not "USmax"),
So that branding aligns with the customer's preferred spelling.

**Acceptance Criteria:**

**Given** I am viewing any page in the application
**When** I see references to the company name
**Then** it is spelled "USmax" (lowercase 'max')
**And** this applies to: headers, footers, page titles, form labels, email templates, and all UI text

**Given** I am viewing an email template
**When** I see the company name
**Then** it is spelled "USmax"
**And** this applies to email subject lines and body content

**Given** I am viewing generated RTF documents
**When** I see the company name
**Then** it is spelled "USmax" (if company name appears in templates)

**Given** I am a developer reviewing the codebase
**When** I search for "USmax" (capitalized)
**Then** all instances are replaced with "USmax"
**And** code comments, variable names, and documentation are updated
**And** only external references (e.g., legal entity names) retain original casing if required

---

### Story 10.13: Add "Request NDA" Button to Header

As a user,
I want a prominent "Request NDA" button in the application header,
So that I can quickly create a new NDA from any page.

**Acceptance Criteria:**

**Given** I am logged in
**When** I view any page in the application
**Then** I see a "Request NDA" button in the top navigation header
**And** the button is styled as a primary action (prominent, high contrast)

**Given** I click "Request NDA"
**When** the action executes
**Then** I am navigated to the "Create NDA" page
**And** a new blank NDA form is displayed

**Given** I do not have "nda:create" permission
**When** I view the header
**Then** the "Request NDA" button is not displayed (permission-aware UI)

**Given** I am on a mobile device
**When** I view the header
**Then** the "Request NDA" button is accessible (responsive design)
**And** it may be in a collapsed menu on very small screens

---

### Story 10.14: Add Non-USmax NDA Flow Safeguards

As an NDA creator,
I want clear visual indicators and confirmation prompts for Non-USmax NDAs,
So that I don't accidentally send emails or generate documents for partner-created NDAs.

**Acceptance Criteria:**

**Given** I am viewing a Non-USmax NDA detail page
**When** the page loads
**Then** I see a prominent colored banner at the top: "⚠️ Non-USmax NDA: USmax signed partner's NDA. Exercise caution with email sends."
**And** the banner is visually distinct (warning color, icon)

**Given** I attempt to generate an RTF document for a Non-USmax NDA
**When** I click "Generate Document"
**Then** a modal appears: "This is a Non-USmax NDA. Document generation is typically not needed. Proceed anyway?"
**And** I have options: "Cancel" or "Proceed"
**And** if I click "Proceed", document generation continues

**Given** I attempt to send an email for a Non-USmax NDA
**When** I click "Send Email"
**Then** a confirmation modal appears: "⚠️ Warning: This is a Non-USmax NDA. Are you sure you want to send an email?"
**And** the modal includes a checkbox: "I confirm this email send is intentional"
**And** the "Send" button is disabled until I check the confirmation box

**Given** I am filtering NDAs
**When** I check "Non-USmax NDA" filter
**Then** the NDA list shows only Non-USmax NDAs
**And** each row has a visual indicator (icon or badge)

---

### Story 10.15: Remove Specified Users

As an admin,
I want to deactivate or remove Chris, Sae, Angela, and John from the system,
So that only current staff have access.

**Acceptance Criteria:**

**Given** I am an admin
**When** I navigate to the "Users" management page
**Then** I can search for users by name: "Chris", "Sae", "Angela", "John"

**Given** I have located one of these users
**When** I click "Deactivate" or "Remove"
**Then** the user account is soft-deleted (marked as inactive)
**And** the user can no longer log in
**And** their historical data (NDAs created, audit logs) is preserved

**Given** a deactivated user
**When** they attempt to log in
**Then** they see an error message: "Your account has been deactivated. Contact your administrator."

**Given** I am viewing an NDA where a deactivated user was the Opportunity POC or other role
**When** I view the NDA detail page
**Then** the user's name still appears (historical record)
**And** there is an indicator: "(Deactivated)" next to their name

**Given** all four users are deactivated
**When** I review the user list
**Then** they appear in an "Inactive Users" section or are hidden by default
**And** I can filter to view inactive users if needed

---

### Story 10.16: Clarify "Type" Field Meaning with Customer

As a product manager,
I want to understand what the customer means by "Type can = Status",
So that I can implement the correct field behavior.

**Acceptance Criteria:**

**Given** the customer stated "Type can = Status"
**When** I send a clarification email
**Then** I ask: "You mentioned 'Type can = Status.' Do you mean:
- Option A: The Type dropdown should show the same values as Status (Created, Sent, Executed, etc.)?
- Option B: Type is a separate field that can sometimes match Status?
- Option C: Something else entirely?
Please clarify."

**Given** the customer responds
**When** I receive their answer
**Then** I document the response in this story
**And** create a follow-up implementation story if code changes are needed
**And** update the PRD or requirements doc

**Given** no response is received within 5 business days
**When** the deadline passes
**Then** I escalate to the project owner
**And** propose a default interpretation based on context

---

### Story 10.17: Clarify Contacts POC vs Contracts POC Distinction

As a product manager,
I want to understand if "Contacts POC" and "Contracts POC" are the same or different roles,
So that the database schema and UI forms are correct.

**Acceptance Criteria:**

**Given** the customer feedback lists both "Contacts POC" and "Contracts POC"
**When** I send a clarification email
**Then** I ask: "Are 'Contacts POC' and 'Contracts POC' the same thing (possible typo) or two distinct POC types? If different, what is the distinction?"

**Given** the customer responds "They are the same"
**When** I receive confirmation
**Then** I update the data model to use a single field: "Contracts POC"
**And** I update all UI references to use consistent naming
**And** I document the clarification

**Given** the customer responds "They are different"
**When** I receive clarification on the distinction
**Then** I document the difference
**And** create a follow-up story to add the separate "Contacts POC" field
**And** update the NDA form to include both fields with clear labels

**Given** no response is received within 5 business days
**When** the deadline passes
**Then** I default to treating them as the same (single "Contracts POC" field)
**And** document the assumption for future reference

# Legacy vs Prototype — Gap Analysis + Implementation Backlog

This document maps the legacy screenshot requirements (see `docs/legacy-screens-requirements.md`) to what exists in the current React prototype, then proposes a prioritized backlog and an API surface to implement a production system.

## 1) Executive summary

The legacy screenshots describe a **focused NDA operations tracker**:
- Create an “opportunity” record → generate an NDA doc from template → email it → upload fully-executed PDF → maintain a simple history → optionally inactivate.
- Access control is primarily **Agency Group / Subagency membership**, managed via simple admin screens.

The current prototype in this repo is a broader **NDA lifecycle platform** with:
- workflow/approvals modeling, templates + clause library, dashboards/reports, external signing portal, and extensive admin settings.

**Recommendation for prioritization**
- **Phase 1 (Legacy parity MVP):** Implement the legacy operational workflows end-to-end (request → generate → email → upload executed → history → inactivate) plus the access model (agency groups/subagencies/contacts).
- **Phase 2 (Selective prototype adoption):** Bring in prototype features that directly reduce cycle time or risk (workflow approvals, audit logs, notification rules, template management).
- **Phase 3 (Nice-to-haves):** analytics dashboards, advanced system configuration UI, and external signing portal/e-sign integrations (unless explicitly requested).

## 2) Coverage matrix (Legacy → Prototype)

Legend:
- **Covered:** present in prototype with similar intent
- **Partial:** present, but missing key fields/flows from screenshots
- **Missing:** not represented in prototype

| Legacy capability (screenshots) | Status in prototype | Where in prototype | Notes / delta |
|---|---:|---|---|
| Left-nav: Contacts / Agency Groups / Subagencies / NDA Admin / NDA Request | **Missing** | `src/components/layout/Sidebar.tsx` | Prototype nav is Dashboard, My NDAs, Requests, Templates & Clauses, Workflows & Approvals, Reports, Administration. No agency-group tree. |
| NDA Admin list: filter panel with Agency, Company, City/State, Type, Incorporation State, Agency/Office Name, date ranges, POC filters, Non‑USMax checkbox | **Partial** | `src/components/screens/Requests.tsx` | Prototype has search + status/type/risk filters only; no agency-based access filters; no POC-based filters; no “Non‑USMax NDA”. |
| NDA Admin list: columns incl. Id, Agency, NDA Owner, Abbrev, Latest Change, F/E NDA date, Latest Document metadata, USMax POC, Mutual Purpose, Effective/Requested dates, USMax Position | **Missing** | `src/components/screens/Requests.tsx` | Prototype list is “requests/NDAs” with different fields (title/counterparty/type/risk/status). No doc version metadata or “latest change” semantics. |
| Row actions: edit (pencil), email (envelope), More>> details modal | **Partial** | `src/components/screens/Requests.tsx`, `src/components/screens/NDADetail.tsx` | Prototype has view/edit/duplicate/delete actions and detail page, but no email-compose flow and no “More>> modal” with upload/status-inactive. |
| “More>>” modal: company info + opportunity history + upload new document + mark fully executed + change status to inactive | **Partial** | `src/components/screens/NDADetail.tsx` | Prototype has activity tab and “send for signature” dialog; no document upload/versioning; no inactive/archival; history is activity feed, not “opportunity history” table. |
| NDA Request form fields: NDA Owner, Agency, Created By | **Missing** | `src/components/screens/RequestWizard.tsx` | Prototype request wizard does not include agency/nda owner; uses internal/government style data model. |
| NDA Request: company info fields (Name, Authorized Purpose <=255, Agency/Office Name, Abbrev Opportunity Name, Effective Date, USMax Position, Non‑USMax checkbox) | **Partial** | `src/components/screens/RequestWizard.tsx` | Prototype has title/purpose/counterparty; no abbrev opportunity name; no USMax position; no non-USMax flag; no explicit agency/office name. |
| NDA Request: Opportunity POC (required) selecting an internal user | **Missing** | `src/components/screens/RequestWizard.tsx` | Prototype lacks “Opportunity POC” selection; instead has owner fields in mock NDA (internal/legal/business owners) but not part of request UI. |
| NDA Request: Contracts POC (optional) + Relationship POC (required) with phone/fax/email | **Missing** | `src/components/screens/RequestWizard.tsx` | No structured POC capture for contracts/relationship. |
| NDA Request: Internal stakeholders table with “Notify on NDA Changes” checkboxes | **Missing** | `src/components/screens/RequestWizard.tsx` | Prototype has global notification settings, but not per-record stakeholder subscriptions. |
| Document generation: create RTF “Generated from Template” and store as latest document | **Missing** | `src/components/screens/Templates.tsx` | Prototype has a template/clauses UI, but no field-merge doc generation and no “Generated from Template” audit line. |
| Upload fully executed PDF and show “Uploaded by {user} on {timestamp}” | **Missing** | `src/components/screens/NDADetail.tsx` | No upload flow; “Download PDF” is a toast only. |
| Review NDA Email: editable To/CC/BCC/Subject/Body, attach NDA doc, send/cancel | **Missing** | `src/components/screens/NDADetail.tsx` | Prototype has “Send NDA for Signature” confirmation, not an email composer tied to doc attachment. |
| Agency Groups admin: list groups, subagencies within, users with group-level access | **Missing** | n/a | Prototype has generic user/role management; no agency group/subagency constructs. |
| Subagencies admin: filter by agency group, show users having access to group and subagencies | **Missing** | n/a | Not represented. |
| Contacts directory: list internal people with group/subagency access summary | **Missing** | `src/components/screens/admin/UserManagement.tsx` (adjacent) | UserManagement exists but is a different concept (departments/roles) and lacks agency access summary. |

## 3) Prototype features not shown in the screenshots (potential “extras”)

These exist in the prototype but are **not evidenced** in the legacy screenshots.

### 3.1 End-user capabilities (prototype-only)
- Dashboard with metrics, task list, and recent activity: `src/components/screens/Dashboard.tsx`
- NDA detail with workflow-step visualization, internal notes, linked items, and “send for signature” flows: `src/components/screens/NDADetail.tsx`
- External signing portal (3-step review/confirm/sign UX): `src/components/screens/ExternalSigningPortal.tsx`
- Reports & analytics (charts, export): `src/components/screens/Reports.tsx`
- Personal profile management + user activity: `src/components/screens/Profile.tsx`
- User settings (theme, notification prefs, email prefs, privacy): `src/components/screens/Settings.tsx`

### 3.2 Admin capabilities (prototype-only)
- User/role management with permissions model: `src/components/screens/admin/UserManagement.tsx`
- Security policy UI (MFA toggle, password policies, API security, auditing): `src/components/screens/admin/SecuritySettings.tsx`
- System configuration (email provider, document storage, LDAP, e-sign provider): `src/components/screens/admin/SystemConfiguration.tsx`
- Notification configuration + email templates + escalation rules: `src/components/screens/admin/NotificationSettings.tsx`
- Centralized audit log viewer with filtering and export: `src/components/screens/admin/AuditLogs.tsx`

### 3.3 Workflow + template tooling (prototype-only)
- Workflow list + “diagram” view: `src/components/screens/Workflows.tsx`
- Visual workflow editor (rich UI skeleton): `src/components/screens/WorkflowEditor.tsx`
- Templates + clause library CRUD UI: `src/components/screens/Templates.tsx`

**How to treat these**
- Some of these are “nice to have” improvements, but others (audit logs, MFA, secure document storage) are commonly required for production even if not in screenshots.

## 4) Prioritized implementation backlog

### Phase 1 — Legacy parity MVP (must-have)

**Epic MVP-1: Identity + authorization (MFA + access scoping)**
- As a user, I can sign in via SSO/OIDC with MFA enforced (or equivalent).
- As an admin, I can manage users (or sync from directory) and assign them roles (admin/standard/read-only).
- As an admin, I can grant a user access to one or more **Agency Groups** and/or **Subagencies**.
- As the system, I only return NDA records and reference data the user is authorized to access.

**Epic MVP-2: Agency Groups + Subagencies (reference data + permissions)**
- As an admin, I can create/edit/delete Agency Groups.
- As an admin, I can create/edit/delete Subagencies under a group.
- As an admin, I can assign users to group-level access and to subagency-level access.
- As an admin, I can view “users having access” summaries per group/subagency (as shown in screenshots).

**Epic MVP-3: Contacts (internal directory for POCs + notifications)**
- As an admin, I can view/search contacts with email/phones/title.
- As an admin, I can assign access (agency groups/subagencies) to a contact/user.
- As a requester, I can select internal users as “Opportunity POC” and stakeholders.

**Epic MVP-4: NDA Request (create opportunity record)**
- As a requester, I can create an NDA request with the exact fields shown (required/optional rules, 255-char limit, date formats).
- As a requester, I can select internal stakeholders and choose who is notified on changes.
- As the system, submitting the request creates an NDA record and an initial history entry (`Created/Pending Release`).

**Epic MVP-5: Document generation + storage**
- As the system, I can generate an NDA document from a template and store it as the “latest document” (versioned).
- As a user, I can download/view the latest document.
- As a user, I can upload a new document version and optionally mark it as “Fully Executed”.
- As the system, document versions show who generated/uploaded them and when.

**Epic MVP-6: NDA Admin list + advanced filtering**
- As a user, I can view NDA records in a sortable/paged table with the columns shown in the screenshots.
- As a user, I can filter by the full “Filter By” set (agency, company, city/state, type, incorporation state, agency/office name, non-USMax flag, date ranges, POC filters).
- As a user, I can quickly open edit, email, and details actions from each row.

**Epic MVP-7: Record details (More>>)**
- As a user, I can open a record details view with company info + opportunity history.
- As a user, I can upload documents, mark fully executed, and set record inactive from this view.
- As the system, every action appends a history entry.

**Epic MVP-8: Email review/compose/send**
- As a user, I can open a prefilled “Review NDA Email” composer with To/CC/BCC/Subject/Body and attach the latest NDA document.
- As a user, I can edit the email content and send it.
- As the system, sending is logged (who/when/recipients) and failures are visible.

### Phase 2 — Targeted “modernization” (high value, not required by screenshots)

**Epic MOD-1: Workflow/approvals (lightweight)**
- As a user, I can move an NDA through review/approval states with assigned tasks and due dates.
- As an admin, I can configure a small number of workflow templates and routing rules.

**Epic MOD-2: Template management (beyond a single RTF)**
- As an admin, I can manage multiple NDA templates, version them, and configure which template is used per agency/type.
- As an admin, I can manage reusable clause content (if needed).

**Epic MOD-3: Audit logging + exports**
- As an admin, I can view a centralized audit log (who did what, from where) and export it.

**Epic MOD-4: Notifications**
- As an admin, I can configure notification channels/templates.
- As a user, I can set per-record subscriptions (stakeholders) and global preferences.

### Phase 3 — Prototype extras (optional until customer confirms)

- Dashboards + analytics (org-level metrics, cycle time, expiring NDAs): `Reports`, `Dashboard`
- External signing portal and/or e-sign integration (DocuSign/Adobe Sign)
- Advanced system configuration UI for integrations and infrastructure

## 5) Proposed API surface (REST-style)

This is an intentionally thin API surface aligned to the legacy screens. It can be implemented serverlessly behind an API gateway.

### 5.1 Auth + session
- `GET /me` → current user profile + entitlements (agency group/subagency access)
- `POST /auth/logout`

(If using OIDC/SSO, login/MFA flows are typically handled by the IdP; the app just validates tokens.)

### 5.2 Users / Contacts
- `GET /users?query=&status=&page=` → list/search contacts
- `GET /users/:id`
- `POST /users` / `PATCH /users/:id` (only if not directory-synced)
- `GET /users/:id/access` → agency groups/subagencies assignments
- `PUT /users/:id/access` → replace assignments

### 5.3 Agency Groups / Subagencies
- `GET /agency-groups`
- `POST /agency-groups`
- `PATCH /agency-groups/:id`
- `DELETE /agency-groups/:id`
- `GET /agency-groups/:id/subagencies`
- `POST /agency-groups/:id/subagencies`
- `PATCH /subagencies/:id`
- `DELETE /subagencies/:id`
- `GET /agency-groups/:id/users` (group-level access)
- `PUT /agency-groups/:id/users`
- `GET /subagencies/:id/users` (subagency-level access)
- `PUT /subagencies/:id/users`

### 5.4 NDA Records (opportunities)
- `GET /ndas` with filters matching the legacy “Filter By”:
  - `agencyGroupId`, `subagencyId`, `companyName`, `city`, `state`, `stateOfIncorporation`, `agencyOfficeName`
  - `type`, `ndaOwner`, `nonUsmax`
  - `effectiveFrom`, `effectiveTo`, `requestedFrom`, `requestedTo`
  - `contractsPocUserId`, `relationshipPocUserId`, `usmaxPocUserId`
  - `sort`, `page`, `pageSize`
- `POST /ndas` (create from NDA Request)
- `GET /ndas/:id`
- `PATCH /ndas/:id` (edit fields)
- `POST /ndas/:id/inactivate`

### 5.5 Documents + versions
- `GET /ndas/:id/documents` (version list; includes “Generated from Template” vs “Uploaded by” metadata)
- `POST /ndas/:id/documents:generate` (generate from template + merge fields)
- `POST /ndas/:id/documents` (upload new version; supports `fullyExecuted=true`)
- `GET /documents/:id/download` (returns a time-limited download URL)

### 5.6 History / events
- `GET /ndas/:id/history`
- `POST /ndas/:id/history` (generally server-generated; client should not write arbitrary events)

### 5.7 Email (review + send)
- `POST /ndas/:id/emails:preview` → returns default subject/to/cc/bcc/body + attachments
- `POST /ndas/:id/emails:send` → sends the email (stores bodyHtml + recipients + doc references)
- `GET /ndas/:id/emails` → sent email log

### 5.8 Notifications (stakeholders)
- `GET /ndas/:id/subscriptions`
- `PUT /ndas/:id/subscriptions` (set notify flags for users)

### 5.9 Audit (Phase 2+)
- `GET /audit-events?query=&type=&status=&dateRange=` (admin)
- `GET /audit-events/:id` (admin)

## 6) Notes on aligning the prototype with legacy

If we keep using this repo’s prototype as the UX starting point, the likely path is:
- Replace the prototype’s current “Requests / NDA / Workflow” domain model with (or extend it to include) the legacy “Opportunity/NDARecord + Documents + History + Agency access” model.
- Add screens for Agency Groups/Subagencies/Contacts and integrate them into navigation and authorization.
- Decide whether to keep the prototype’s workflow/approvals UX as Phase 2, or keep the legacy “simple status + history” approach for MVP.


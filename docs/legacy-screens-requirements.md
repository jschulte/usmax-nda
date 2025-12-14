# Legacy Screenshot Reverse‑Engineered Requirements (USMax NDA Management System)

This document reverse‑engineers functional and technical requirements from the screenshots in `drive-download-20251213T213735Z-3-001/` (files `01-` through `08-`).

## 1) Product scope (as implied)

**Goal:** A web application for USMax staff to **create, distribute, track, and archive NDAs** for specific opportunities/partner firms across government/commercial agencies.

**High-level lifecycle (observed):**
1. Create an “opportunity” NDA record via **NDA Request**.
2. System **generates an NDA document from a template** (RTF in example).
3. User **reviews and sends an email** with the NDA attached.
4. After signatures are gathered, staff **upload the fully executed PDF** and mark it as “Fully Executed NDA”.
5. NDA record can be **changed to Inactive** (archived).

## 2) Users, roles, and access control

### 2.1 Authentication
- Users log in to the system (UI shows “Welcome {User} (Logout)”).
- The customer scope note in the supplied `.docx` indicates: **MFA is required** (modern implementation requirement).

### 2.2 Authorization / access model (observed screens)
Access appears to be governed by **Agency Groups** and **Subagencies**:
- **Agency Group** grants “group level access” to all subagencies in that group.
- **Subagency access** can be assigned separately (screen has “Users having access to the Subagency”).

**Requirement:** A user must only see NDA records and reference data (Agency/Subagency) for which they have access.

### 2.3 Admin vs non-admin
Screens imply at least two privilege levels:
- **Admin functions:** manage Contacts, Agency Groups, Subagencies (and likely templates/config).
- **Operations:** NDA Admin (manage NDA records) and NDA Request (create).

## 3) Information architecture / navigation (observed)

Left navigation tree:
- `Contacts`
- `Agency Groups`
- `Subagencies`
- `Operations`
  - `Administration`
    - `NDA Admin`
    - `NDA Request`

## 4) Screen requirements

### 4.1 NDA Admin (main list + filters) — `01-main-screen.png`

#### 4.1.1 Filter panel (“Filter By”)
Inputs present (types inferred from controls):
- `Agency` (dropdown)
- `Company Name` (dropdown / searchable select)
- `City` (dropdown)
- `State` (dropdown)
- `Type` (dropdown)
- `State of Incorporation` (dropdown)
- `Agency/Office Name` (dropdown)
- `Non‑USMax NDA` (checkbox)
- `Effective Date >=` (date input)
- `Effective Date <=` (date input)
- `Requested Date >=` (date input)
- `Requested Date <=` (date input)
- `Contract POC Name` (dropdown)
- `Relationship POC Name` (dropdown)
- `USMax POC Name` (dropdown)

Actions:
- `Filter` (applies filter criteria to results)
- `Reset` (clears filters to defaults)

#### 4.1.2 Results table
Row-level actions (icons):
- **Edit** (pencil icon at far left): opens the NDA/opportunity record for editing (exact destination not shown).
- **Email** (envelope icon): opens the “Review NDA Email” compose screen for that record.
- **More>>** (link in “Latest Document” cell): opens a detail modal for the record (see 4.2).

Columns observed:
- `Id` (numeric)
- `Agency` (e.g., “Commercial - Commercial”, “Fed DOD - Air Force”)
- `NDA Owner` (e.g., “USMax”)
- `Company Name` (partner firm name)
- `Abbrev.` (abbreviated opportunity name)
- `Latest Change` (status + actor + timestamp)
- `F/E NDA` (Fully Executed NDA date/time; blank when not executed)
- `Latest Document` (filename link + generated/uploaded metadata + More>>)
- (Email icon column; unlabeled)
- `USMax POC`
- `Mutual Purpose`
- `Effective Date`
- `Requested Date`
- `USMax Position` (value shown at far right, e.g., “Prime”)

Table behaviors implied:
- Column headers appear link-styled/underlined → **sortable columns**.
- “Latest Document” shows at least:
  - document filename (clickable download/view)
  - source/actor line (“Generated from Template” or “Uploaded by {Name}”)
  - timestamp line (“on {MM/DD/YYYY h:mm AM/PM}”)

#### 4.1.3 Example records (data observed)
- `1590`: Company `abc`, Abbrev `OREM TMA 2025`, Latest Change `Created/Pending Release`, Latest Doc `NDA_OREMTMA2025_USMAX_abc.rtf` (Generated from Template), USMax POC `Brett Steiner`, Mutual Purpose `test`, Effective `04/04/2025`, Requested `10/02/2025`, Position `Prime`.
- `1589`: Company `Actalent, Inc.`, Abbrev `SSC CG Acq SS`, Latest Change `Fully Executed NDA Uploaded`, Latest Doc `…Actalentinc - FE.pdf` (Uploaded), USMax POC `Brett Steiner`, Mutual Purpose `CG Acquisition Support Services`, Effective `09/09/2025`, Requested `09/09/2025`, Position `Prime`.
- `1588`: Company `SSC CG Acquisition Support`, Abbrev `SSC CG Acq SS`, Latest Change `Fully Executed NDA Uploaded`, Latest Doc `…Actalentinc - FE.pdf` (Uploaded), USMax POC `Brett Steiner`, Mutual Purpose `SSC CG Acquisition Support Services`, Effective `08/29/2025`, Requested `08/29/2025`, Position `Prime`.

### 4.2 Record detail modal (“More>>”) — `02-more-info-from-main.png`

Modal sections:

**A) Company Information Partner Firm**
- `Name`
- `Contracts POC` (label present; value not shown in example)
- `Relationship POC` (name) and `Phone`

**B) Opportunity History**
Table columns:
- `NDA Status` (text; appears to include a document link under the status)
- `User Name`
- `Date Stamp`

**C) Upload new Document**
- File chooser (`Choose File`)
- `Upload Document` button
- Checkbox: `Fully Executed NDA`

**D) Record status control**
- Button: `Change status to inactive`

**E) Close**
- Button: `Close`

Behavioral requirements implied:
- Each upload creates a new history entry and can optionally set/confirm “Fully Executed”.
- “Inactive” likely removes record from default views or marks archived.

### 4.3 NDA Request (create) — `03-nda-request-screen-1.png` and `04-nda-request-screen-2.png`

Header controls:
- `NDA Owner` (dropdown; example value `USMax`)
- `Agency` (dropdown)
- `Created By` (current user display)

**Company Information (all fields required)**:
- `Name` (company/partner name)
- `Authorized Purpose or Type of Service` (textarea; **limit 255 characters**)
- `Agency/Office Name` (free text; example “DHS CBP”)
- `Abbreviated Opportunity Name` (free text)
- `Effective Date` (date input; format hint `mm/dd/yyyy`)
- `USMax Position` (dropdown; example `Prime`)
- `Non‑USMax NDA` (checkbox)

**Opportunity POC (required):**
- `User` (dropdown; selects internal user)

**Contracts POC Information (preferred but not necessary):**
- `Name`
- `Email`
- `Phone` (format hint `(xxx) xxx-xxxx`)
- `Fax` (format hint `(xxx) xxx-xxxx`)

**Relationship POC Information (required):**
- `Name`
- `Email`
- `Phone`
- `Fax`

**Internal USMax Stakeholders**
Table columns:
- `Notify on NDA Changes` (checkbox per stakeholder)
- `Name`
- `Email`

Action:
- `Submit` button

Behavioral requirements implied:
- On submit, system creates a new record, associates POCs/stakeholders, and generates an initial NDA document from a template.

### 4.4 Review NDA Email (compose + send) — `05-email-button.png`

Compose fields:
- `Subject` (prefilled template text with record fields)
- `To` (email list)
- `CC` (email list)
- `BCC` (email list)
- `NDA` (link to attached NDA document)
- `Email` body (rich text editor with formatting toolbar)

Actions:
- `Send` (send email and record history/audit)
- `Cancel` (dismiss without sending)

Email template content (observed):
- References the attached NDA and the company/opportunity context (“for {company} for {abbrev} at {agency/office}”).
- Instructs return via `contracts@usmax.com` or fax.
- Includes “USMax POCs for this opportunity record” with:
  - Contracts POC name/title + email + phone
  - Opportunity POC name/title + email + phone
- Includes USMax Contracts address/phone/fax signature block.

### 4.5 Subagencies — `06-subagency-tab.png`

Controls:
- `Agency Group` (dropdown selector)

Display:
- “Users having access to the Agency Group: {names}”

Table:
- Column `Agency` (subagency name)
- Column `Users having access to the Subagency`

Behavior required:
- CRUD subagencies within a group.
- Assign users to subagencies (subagency-level access list).

### 4.6 Agency Groups — `07-agency-group-tab.png`

Page title: “Agency Groups (Fed Civ, DoD, Healthcare, etc.)”

Table columns:
- `Agency Group`
- `Subagencies` (semicolon-delimited list)
- `Users having access to the Group (group level access)`

Behavior required:
- CRUD agency groups.
- Manage membership of subagencies within each group.
- Assign users for group-level access.

### 4.7 Contacts — `08-contacts-tab.png`

Table columns:
- `Last Name`
- `First Name`
- `Agency/Groups Access` (cell shows two sections: `Agency Groups:` and `Subagencies:`)
- `Email`
- `Work Number`
- `Position`
- `Cell Number`

Behavior required:
- CRUD contacts/users (at minimum for internal directory used in dropdowns and notifications).
- Assign agency group and/or subagency access per contact.

## 5) Core data model (proposed, derived from screens)

### 5.1 Entities

**User (Contact)**
- `id`
- `firstName`, `lastName`
- `email`
- `workPhone`, `workPhoneExt` (optional), `cellPhone`
- `jobTitle` / `position`
- `active`
- Access:
  - `agencyGroups[]` (many-to-many)
  - `subagencies[]` (many-to-many)
- Optional `roles[]` (admin/standard/read-only)

**AgencyGroup**
- `id`, `name`
- `subagencies[]` (one-to-many)
- `groupAccessUsers[]` (many-to-many)

**Subagency**
- `id`, `agencyGroupId`, `name`
- `subagencyAccessUsers[]` (many-to-many)

**NDARecord (Opportunity)**
- `id` (numeric/sequence; shown as integer)
- `ndaOwner` (enum; shown as `USMax`)
- `agencyGroup` + `subagency` (or a combined `agency` field as displayed)
- `agencyOfficeName` (text; “Agency/Office Name”)
- `companyName` (+ optional company address fields)
  - `city`, `state`, `stateOfIncorporation` (filterable)
- `authorizedPurpose` (<= 255 chars)
- `abbrevOpportunityName`
- `mutualPurpose` (displayed in list; may be same as authorizedPurpose or separate)
- `usmaxPosition` (enum; e.g., Prime/Sub/etc.)
- `nonUsmaxNda` (boolean)
- Dates:
  - `requestedDate` (record created/requested)
  - `effectiveDate`
  - `fullyExecutedDate` (shown in `F/E NDA`)
- POCs:
  - `opportunityPocUserId` (required)
  - `contractsPoc` (name/email/phone/fax; optional)
  - `relationshipPoc` (name/email/phone/fax; required)
- Status:
  - `status` (enum; at least `Created/Pending Release`, `Fully Executed NDA Uploaded`, `Inactive`)
  - `active` (boolean) OR `status=Inactive`
- `createdByUserId`
- `createdAt`, `updatedAt`

**NDADocument**
- `id`, `ndaRecordId`
- `filename`, `contentType`, `sizeBytes`
- `storageKey`/`url` (secured download)
- `kind` (enum: `GeneratedFromTemplate`, `Uploaded`, `FullyExecuted`)
- `createdByUserId`
- `createdAt`

**NDAHistoryEvent**
- `id`, `ndaRecordId`
- `statusLabel` (displayed string)
- `documentId` (optional)
- `actorUserId`
- `timestamp`

**NDANotificationSubscription**
- `id`, `ndaRecordId`, `userId`
- `notifyOnChange` (boolean)
- `createdAt`

**NDAEmail**
- `id`, `ndaRecordId`
- `subject`, `to[]`, `cc[]`, `bcc[]`
- `bodyHtml`
- `attachedDocumentIds[]`
- `sentByUserId`
- `sentAt`
- `deliveryStatus` (sent/failed)

## 6) Key workflows (acceptance-level)

### 6.1 Create + generate template
1. User opens `NDA Request`.
2. User completes required fields and selects stakeholders.
3. On `Submit`:
   - Create `NDARecord`
   - Generate an RTF document from a stored template (field merge)
   - Create a `NDAHistoryEvent` with status `Created/Pending Release`
   - Return to `NDA Admin` list showing the new record and latest document

### 6.2 Send NDA email
1. From `NDA Admin`, user clicks envelope icon for a record.
2. System opens `Review NDA Email` with prefilled subject/recipients/body and attached latest NDA document.
3. On `Send`:
   - Send email (with attachment)
   - Create a history/audit event (event type `EmailSent`)

### 6.3 Upload executed NDA
1. User opens `More>>` modal.
2. User chooses a file and optionally checks `Fully Executed NDA`.
3. On `Upload Document`:
   - Store file, create `NDADocument`
   - Append `NDAHistoryEvent` (e.g., `Fully Executed NDA Uploaded`)
   - If “Fully Executed” checked: set `fullyExecutedDate` and update status accordingly

### 6.4 Change status to inactive
1. User opens `More>>` modal.
2. User clicks `Change status to inactive`.
3. System sets record inactive and records a history event.

## 7) Non-functional / platform requirements (explicit + implied)

From the scope note in the `.docx`:
- **Serverless** architecture (preferred)
- **MFA** required for staff access

Implied by document/email handling:
- Secure document storage (encryption at rest, access controlled downloads)
- Audit/history retention (who did what, when)
- Availability suitable for internal operations

## 8) Fit vs the current React prototype in this repo (gap analysis)

The current prototype is a broad “Government NDA Lifecycle Application” with workflows, templates, reports, and admin screens, but the **legacy screenshots show a narrower, operations-focused NDA tracker** with:
- Agency Group/Subagency access control and related admin screens
- An NDA list centered on **document generation, email sending, executed upload, and simple history**

Notable gaps (prototype → legacy needs):
- Add **Agency Groups/Subagencies/Contacts** modules and wire them into permissions and dropdowns.
- Add **document generation from RTF templates** (merge fields) and document version history.
- Add **email compose/review + send** tied to a record with templated subject/body + recipients.
- Align the “Request” fields to match: agency/office name, abbrev opportunity name, USMax position, Non‑USMax flag, POCs, stakeholder notifications.

## 9) Open questions / items not shown in screenshots (confirm with customer)

- What are the full allowed values for: `Type`, `USMax Position`, `NDA Owner`, and the exact “Agency” field structure?
- Who are the intended external recipients for “Review NDA Email” (partner firm POC vs internal routing), and how are they sourced?
- What status transitions exist beyond the two shown, and should “Inactive” be reversible?
- Are there multiple templates per agency/type, and who can manage them?
- Retention policy for documents and audit history; export/reporting needs.


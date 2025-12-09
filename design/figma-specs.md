Figma Make specification: Government NDA Lifecycle Application

Design a desktop-first web application for a government organization to manage the full lifecycle of NDAs: requesting, generating, routing, reviewing, negotiating, signing, tracking, reporting, and archiving.

Target devices
	•	Primary: Desktop web (1440×900 frames)
	•	Secondary: Tablet (1024×768) and mobile (390×844) responsive variants for key screens (dashboard, NDA detail, external signing view)

Overall visual style
	•	Look and feel
	•	Clean, trustworthy, “civic tech” aesthetic
	•	Minimal but not sterile
	•	Clear hierarchy, strong typography, generous whitespace
	•	Color palette
	•	Primary: deep blue for primary actions and headers
	•	Secondary: muted teal or green for success/low risk indicators
	•	Accents: amber for warnings, red for high risk or errors
	•	Background: very light gray or off-white
	•	Typography
	•	Sans-serif system or similar (e.g., Inter, Roboto, Source Sans)
	•	Clear sizing scale:
	•	H1: 24–28px
	•	H2: 20–22px
	•	Body: 14–16px
	•	Caption: 12–13px
	•	Iconography
	•	Simple line icons for actions and statuses (plus, filter, search, clock, check, warning, lock, file, signature, timeline)

Core user roles to support in UX
	•	Requester: internal staff who need an NDA
	•	Legal reviewer: legal team reviewing and editing NDAs
	•	Manager/approver: business approver
	•	Admin: configure templates, workflows
	•	External party: vendor or partner who views and signs NDAs via a secure link

Global navigation and layout
	•	Top-level app layout
	•	Left sidebar for primary navigation
	•	Top bar for search, profile, notifications
	•	Main content area with cards, tables, and detail views
	•	Left sidebar items
	•	Dashboard
	•	My NDAs
	•	Requests
	•	Templates and Clauses
	•	Workflows and Approvals
	•	Reports
	•	Administration
	•	Top bar elements
	•	Global search field with placeholder “Search NDAs, parties, projects…”
	•	Notification bell with badge count
	•	User avatar with role label and simple dropdown (Profile, Settings, Sign out)

Screens to design
	1.	Dashboard (for internal user, with a legal or manager role)
Create a dashboard screen that surfaces key information at a glance.

Layout
	•	Three or four summary cards at the top in a responsive grid:
	•	“Pending reviews” with count and small trend indicator
	•	“NDAs waiting for signature”
	•	“NDAs expiring soon”
	•	“Average cycle time (last 30 days)”
	•	A main two-column layout below:
	•	Left: “My tasks” task list
	•	Right: “Recent activity” timeline

Components
	•	Summary card pattern with label, large number, and subtle icon
	•	“My tasks” list
	•	Each task row:
	•	NDA title
	•	Task type (“Review NDA”, “Approve, “Sign”, “Provide details”)
	•	Due date or SLA chip (e.g., “Due today”, “2 days left”)
	•	Status chip (color-coded)
	•	Include checkboxes or clear primary action buttons on each row
	•	Activity timeline
	•	Vertical timeline with points and entries such as
	•	“Vendor X NDA signed by Counterparty”
	•	“Legal approved NDA for Project Y”
	•	Each entry shows time, actor, and event type icon

	2.	NDA request wizard (for requester)
Design a multistep wizard for “Request new NDA”.

Entry point
	•	Button on dashboard and “Requests” page: “Request new NDA”

Wizard steps (represented as numbered stepper across the top)

Step 1: Basic details
	•	Fields
	•	Request title
	•	Purpose or project (dropdown or free text)
	•	Counterparty organization name
	•	Counterparty contact name and email
	•	Type of NDA (radio buttons or cards: Mutual, One-way government disclosing, One-way counterparty disclosing, Visitor, Research, Vendor access)
	•	Right side panel
	•	Context info or help text explaining each NDA type
	•	Small alert box showing “Default template will be chosen based on type and department”

Step 2: Information and risk
	•	Fields
	•	What will be shared (multi-select chips: “PII”, “Financial data”, “Technical data”, “Source code”, “Facility access”, “Other”)
	•	Sensitivity level (Low, Medium, High with short descriptions)
	•	Systems or locations involved (tag-style multipicker)
	•	Visual risk indicator
	•	As user selects options, show a simple risk level indicator (Low/Medium/High) with color-coded badge and explanation
	•	Step navigation buttons
	•	Back, Next (primary)

Step 3: Review and submit
	•	Summary card of all entered data
	•	Drop-down to choose template if the system suggests one
	•	Checkbox: “I confirm these details are accurate”
	•	Primary button: “Submit for legal review”

	3.	Requests list view
Screen to see all NDA requests, with filtering.

Layout
	•	Page title: “Requests”
	•	Top bar with filters and actions:
	•	Filter chips or dropdowns: Status, Department, Type, Risk level, Created date range
	•	Search field scoped to requests
	•	Button: “Request new NDA”
	•	Main content
	•	Table of requests with columns:
	•	Request title
	•	Counterparty
	•	Type
	•	Risk level (color-coded chip)
	•	Status (Draft, In legal review, Pending approval, Waiting for signature, Completed, Rejected)
	•	Created date
	•	Last updated
	•	Row actions
	•	Clicking a row goes to the request or NDA detail view
	•	Optional overflow menu for “View details”, “Cancel request” (if applicable)

	4.	NDA detail view (central object screen)
Design a comprehensive NDA detail page used by internal users.

Layout
	•	Header bar
	•	NDA name/title
	•	Status chip (Draft, In review, Executed, Expired, Terminated)
	•	Key metadata pills: type, risk level, effective date, expiry date
	•	Action buttons: “Download PDF”, “Send for signature”, “View in signing portal” (depending on state)
	•	Two-column main layout with tabs

Left column
	•	Tabs across top:
	•	Overview
	•	Document
	•	Activity
	•	Linked items
	•	Overview tab
	•	Section: At-a-glance summary
	•	Parties (government org, counterparty)
	•	Key dates (created, signed, effective, expiry)
	•	Term length and surviving obligations
	•	Section: Scope and data
	•	Project(s)
	•	Systems
	•	Information types (chips)
	•	Section: Workflow status
	•	Timeline-style representation of steps: Request created → Legal review → Manager approval → Sent to counterparty → Signed by counterparty → Signed by government → Executed
	•	Each step has status icon (completed, in progress, pending) and timestamps
	•	Document tab
	•	Integrated document viewer area that shows the NDA PDF or rendered content
	•	Controls for zoom, page navigation
	•	Optional inline highlight or comments indicators for legal review
	•	Activity tab
	•	Filterable log of events: who did what, when (views, downloads, approvals, comments)
	•	Each row with time, actor, and action label
	•	Linked items tab
	•	Table of related contracts, projects, tickets or vendor records
	•	Buttons to “Add link” or “Open in external system”

Right column
	•	Side panel with collapsible sections:
	•	“People” showing internal owner, legal owner, business owner, counterparty contact
	•	“Tasks” showing tasks related to this NDA (pending reviews, approvals)
	•	“Notes” area for internal-only comments

	5.	Legal review and redlining view
A variant of the NDA detail view with focus on legal review.

Add the following elements on top of the Document tab:
	•	Document comparison mode
	•	Side-by-side view: Left “Government standard v1”, right “Counterparty redline v2”
	•	Change markers in the margin (insertions, deletions)
	•	Clause deviation panel
	•	Right-side panel listing clauses that differ from standard templates
	•	Each entry shows clause name, quick risk flag, and “View diff” control
	•	Decision bar at bottom or top
	•	Buttons: “Approve as is”, “Request changes”, “Add comment”, “Escalate”
	•	When “Request changes” is clicked, show modal dialog to write a message that will go back to requester or counterparty

	6.	Template and clause library
Design a configuration area for legal and admins.

Layout
	•	Tabs or segmented control for “Templates” and “Clauses”

Templates list
	•	Table with columns: Template name, Type (Mutual, One-way, Visitor), Department, Last updated, Active flag
	•	Row actions: Edit, Duplicate, Deactivate

Template detail view
	•	Basic metadata (name, type, description)
	•	Structured editor layout:
	•	List of sections on left (e.g., Definitions, Confidentiality, Term, Remedies)
	•	Main editor area showing clause text with placeholders highlighted
	•	Right panel with properties for selected clause: required/optional, allowed variants, risk level tags

Clause library
	•	Card grid or table of clauses
	•	Filters by topic (Confidentiality, IP, Data retention, Export control, etc.)
	•	Simple detail view for each clause with text, tags, and usage count

	7.	Workflows and approvals configuration (admin view)
Screen where admins configure routing rules.

Layout
	•	Page title: “Workflows”
	•	List of workflow definitions with short descriptions

Workflow detail
	•	Visual rule editor concept (can be a simplified diagram or flow)
	•	Show a simple flowchart with nodes:
	•	Start → Legal review → Manager approval → Security review (optional) → Send for signature
	•	Allow rules like
	•	“If risk = high then add Security review”
	•	“If department = X then route to Legal reviewer Y”
	•	Under the diagram, a rules list with editable conditions in row format

	8.	Reports and analytics
Provide a reporting dashboard for legal and leadership.

Layout
	•	Filters at top: date range, department, NDA type, risk level
	•	Visualizations
	•	Line chart: number of NDAs created per month
	•	Bar chart: average cycle time by department
	•	Donut chart: NDAs by status (draft, in review, executed, expired)
	•	Table section
	•	“NDAs expiring in next 90 days” with key columns and export button

	9.	External signing portal view (counterparty experience)
Design a simplified public-facing screen for external parties, focusing on clarity and trust.

Layout
	•	Clean, centered content with minimal navigation
	•	Elements
	•	Banner with organization logo and “Confidentiality Agreement” title
	•	Step indicator: 1 Review, 2 Confirm details, 3 Sign
	•	Content area
	•	Embedded view of the NDA document with scroll
	•	Sidebar summary of key terms (parties, term, governing law)
	•	Checkbox “I have read and agree to the terms”
	•	Sign section
	•	Simple signature controls:
	•	Type name
	•	Optionally draw signature
	•	Show date and email
	•	Button “Sign and submit”
	•	Confirmation screen
	•	Success message, summary of what was signed, and simple instructions about receiving a copy via email

Common components and UI patterns to define as reusable Figma components
	•	Buttons: primary, secondary, subtle, destructive
	•	Inputs: text fields, text area, dropdowns, multi-select chips, date picker
	•	Badges/chips: status, risk level, type, info category
	•	Tables with sortable headers, row hover states, pagination controls
	•	Side panel pattern used for details and filters
	•	Modals/dialogs for confirmation, comments, and redline explanations
	•	Steppers for multi-step flows (request wizard, signing steps)
	•	Timeline component for workflows and activity logs

Interaction and UX notes
	•	Consistent use of color for status and risk
	•	Green or muted blue for completed and low risk
	•	Amber for pending or warning states
	•	Red for errors and high risk
	•	Inline validation on forms with clear error messages
	•	Keyboard accessible focus states and clear hit areas for all controls
	•	Use toast notifications for quick confirmation actions (saved, sent, etc.)
	•	In long tables, keep header and filter bar sticky while scrolling

Deliverables in Figma
	•	A main page containing all key screens as frames
	•	Component library page with:
	•	Buttons, inputs, badges, tables, cards, timelines, steppers, nav components
	•	A simple style guide page with color tokens, type scale, spacing system, and icon examples
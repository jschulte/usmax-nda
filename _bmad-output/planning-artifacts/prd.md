---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
inputDocuments:
  - 'docs/index.md'
  - 'docs/legacy-screens-requirements.md'
  - 'docs/customer-validation-answers.md'
  - 'docs/analysis/research/domain-government-nda-management-research-2025-12-12.md'
  - 'docs/analysis/brainstorming-session-2025-12-12.md'
documentCounts:
  briefs: 0
  research: 1
  brainstorming: 1
  projectDocs: 1
workflowType: 'prd'
lastStep: 11
prd_complete: true
project_name: 'usmax-nda'
user_name: 'Jonah'
date: '2025-12-15'
project_context: 'greenfield'
special_context: 'Building NEW system to replace failed legacy. Have: (1) Legacy screenshots showing what they HAD, (2) Figma prototype showing initial UI ideas (not real app), (3) Customer validation showing what they NEED. This is greenfield informed by legacy baseline + prototype concepts.'
---

# Product Requirements Document - usmax-nda

**Author:** Jonah
**Date:** 2025-12-15

## Executive Summary

### Vision

**Core Promise:** Never lose an NDA again.

USmax NDA Management System is a cloud-based platform that manages Non-Disclosure Agreements for government contractor USmax - from creation through execution to indefinite retention. Built to replace a legacy system that failed and lost all data, this system prioritizes absolute reliability and data durability above all else.

**The Reality:** USmax manages NDAs for government contracts. They need a system to keep them organized, track their lifecycle, and store them forever. Their previous system died and took everything with it. This system won't.

**The Standard:** Solid, hardened, ready for action. Built with battle-tested technology (React 19, PostgreSQL on AWS Lightsail, Node.js/Express), comprehensive error monitoring (Sentry), automated backups, and multi-region document storage. Not innovative - RELIABLE.

### What Makes This Special

**The Core Differentiator:** When your system holds critical legal agreements, reliability isn't optional. Most government systems choose between compliance and user experience. This delivers both.

**1. Bulletproof Reliability (Never Fails)**
- Cloud-native architecture (no hardware failure risk)
- Multi-region S3 storage (documents survive regional outages)
- Automated backups and versioning (every change preserved)
- Proactive monitoring (Sentry catches issues before users see them)
- Zero-downtime deployments (serverless architecture)
- **Promise:** "This system won't crash. It won't lose data. It just works."

**2. Indefinite Retention with Absolute Durability**
- S3 versioning enabled (never lose a document version)
- Multi-region replication (disaster recovery built-in)
- Encryption at rest and in transit (security baseline)
- Indefinite retention (keep everything forever per customer requirement)
- Optional Glacier archival (cost-optimized long-term storage)
- **Promise:** "Every NDA, every version, every email - preserved and retrievable."

**3. Smart Without Being Complicated**
- 3x faster NDA creation (15 fields → 3-4 with intelligent auto-fill)
- Email templates (pick → customize → send)
- Clone existing NDAs (copy → change differences → done)
- Real-time notifications (stay informed without email overload)
- Filter presets (one-click common searches)
- **Promise:** "Daily workflows are faster and easier, not more complicated."

**4. Reassurance UX (Trauma-Informed Design)**

Users lost EVERYTHING when their system died. Every interaction communicates safety:
- Visual status progression (Amazon-style tracking: Created → Emailed → Revision → Executed)
- Explicit save confirmations ("NDA saved ✓", "Email sent ✓")
- Comprehensive audit trail (who did what, when - always visible)
- Auto-save drafts (never lose work-in-progress)
- Dashboard alerts (stale NDAs, expiring agreements, items needing attention)
- **Promise:** "You'll always know your data is safe and what's happening."

**5. Government-Grade Compliance Without the Pain**
- CMMC Level 1 baseline (MFA, encryption, access control)
- FAR/DFARS audit trail requirements (comprehensive history tracking)
- Agency-based access control (12 groups, 40-50 subagencies, granular RBAC)
- Document retention compliance (indefinite, exceeds FAR minimum)
- Section 508 accessibility (government standard)
- **Promise:** "Compliance is built-in, not bolted-on."

**Strategic Context:**
- **Scale:** Low volume (~10 NDAs/month, <10 users)
- **Focus:** Reliability and retention over scale and speed
- **Positioning:** Right-sized for focused NDA management (not enterprise CLM bloat)
- **Success Metric:** Users trust the system completely and enjoy using it daily

## Project Classification

**Technical Type:** Web Application (React SPA with serverless backend)
**Domain:** GovTech (Government/Public Sector)
**Complexity:** High
**Project Context:** Greenfield - building NEW system informed by legacy baseline + customer validation

**Complexity Drivers:**
- Government compliance (FAR/DFARS, CMMC Level 1)
- Security requirements (MFA, encryption, granular RBAC, audit trails)
- Accessibility standards (Section 508)
- Multi-agency access control (complex permission scoping)
- Data retention and disaster recovery requirements

**Technology Foundation:**
- Frontend: React 19, TypeScript, Radix UI, Tailwind CSS (Nginx on Lightsail)
- Backend: Node.js/Express API on AWS Lightsail
- Database: PostgreSQL on AWS Lightsail
- Storage: S3 multi-region with versioning and encryption
- Security: AWS Cognito (MFA), granular RBAC, comprehensive audit logging
- Monitoring: Sentry (errors), CloudWatch (infrastructure), Google Analytics (usage)

**Scale Characteristics:**
- Volume: ~10 NDAs/month (~120/year)
- Users: <10 total (2-3 admins, ~8 regular users)
- Agency Groups: 12
- Subagencies: 40-50
- **Implication:** Optimize for reliability and UX over scale

## Success Criteria

### User Success

**Primary Success: Trust and Confidence**

Users trust the system completely and use it without hesitation or anxiety.

**Measurable Indicators:**
- ✅ Users save work without keeping local backups "just in case"
- ✅ Zero user calls to IT about "is my data really saved?"
- ✅ Users rate trust/confidence 4.5+/5 in post-launch survey
- ✅ Users demonstrate the system to colleagues ("look how nice this is")
- ✅ Users check dashboard proactively (engagement, not obligation)

**Operational Success: Streamlined Workflows**

Users complete NDA workflows faster and with less friction than legacy system.

**Measurable Indicators:**
- ✅ NDA creation time reduced (15 manual fields → 3-4 with smart auto-fill)
- ✅ Common tasks require <3 clicks to complete
- ✅ Users adopt smart features (email templates, clone NDA, filter presets)
- ✅ Average NDA cycle time improvement (baseline TBD from customer data)
- ✅ Users say "this is faster" in feedback survey

**Quality Experience: Modern and Professional**

Users experience system as modern, responsive, and designed for 2025.

**Measurable Indicators:**
- ✅ Responsive design works flawlessly on desktop, tablet, mobile
- ✅ Page load times <2 seconds
- ✅ Action response times <500ms (save, filter, status change)
- ✅ WCAG 2.1 AA accessibility compliance (Section 508)
- ✅ Users describe UI as "professional" and "easy to use" in feedback
- ✅ Zero UI-related support tickets (confusing layouts, broken interactions)

**Reassurance Success: Always Know What's Happening**

Users always feel informed and in control.

**Measurable Indicators:**
- ✅ Every action has explicit confirmation ("Saved ✓", "Email sent ✓", "Uploaded ✓")
- ✅ Status progression clearly visible (Amazon-style tracking circles)
- ✅ Audit trail accessible for every NDA (who did what, when)
- ✅ Dashboard surfaces actionable items (stale NDAs, approaching expiration, waiting on 3rd party)
- ✅ Real-time notifications keep users informed without overwhelming
- ✅ Users never ask "did that actually work?" or "where did my NDA go?"

### Business Success

**Primary Business Success: System is Operational and Reliable**

USmax can manage NDAs without operational interruption or data loss.

**Measurable Indicators:**
- ✅ All 2-3 active users fully operational within 2 weeks of launch
- ✅ System successfully manages 10+ NDAs/month
- ✅ 100% of NDAs created, tracked, and archived without loss
- ✅ Zero business interruptions due to system failures
- ✅ Complete replacement of failed legacy system (no fallback to manual processes)

**Data Integrity Success: Never Lose Anything**

Critical business records are preserved indefinitely with absolute reliability.

**Measurable Indicators:**
- ✅ Zero data loss incidents (NDAs, documents, history)
- ✅ 100% document retrieval success (every uploaded NDA recoverable)
- ✅ Multi-region S3 replication operational (disaster recovery tested)
- ✅ Backup/restore procedures tested and working
- ✅ Versioning preserves all document revisions
- ✅ Audit trail captures 100% of system actions

**Compliance Success: Meet Government Requirements**

System meets all regulatory and compliance requirements without manual workarounds.

**Measurable Indicators:**
- ✅ CMMC Level 1 requirements satisfied (MFA, encryption, access control, audit)
- ✅ FAR document retention requirements met (indefinite > 6-year minimum)
- ✅ Section 508 accessibility compliance verified
- ✅ Agency-based access control 100% effective (no unauthorized access)
- ✅ Audit logs exportable for compliance reviews
- ✅ Zero compliance violations or audit findings

**Cost Efficiency: Right-Sized Infrastructure**

Low-volume workload optimized for cost without sacrificing reliability.

**Measurable Indicators:**
- ✅ Serverless architecture scales to zero when idle
- ✅ Infrastructure costs <$500/month (10 NDAs/month, <10 users)
- ✅ S3 storage costs minimal (small RTF/PDF files)
- ✅ No overprovisioned resources (Aurora Serverless scales with usage)

### Technical Success

**Stability: System Never "Falls Apart"**

System maintains consistent reliability without crashes, errors, or failures.

**Measurable Indicators:**
- ✅ 99.9% uptime (< 9 hours downtime/year)
- ✅ Zero critical production bugs in first 30 days
- ✅ Error rate <0.1% of all operations
- ✅ Zero user-facing crashes or 500 errors
- ✅ Automated health checks pass 100% (system self-monitors)
- ✅ All deployments complete without rollback

**Monitoring: Proactive Issue Detection**

Problems are detected and resolved before users experience impact.

**Measurable Indicators:**
- ✅ Sentry catches 100% of errors (comprehensive error tracking)
- ✅ Critical errors trigger immediate alerts (< 5 minute response time)
- ✅ Performance degradation detected automatically (CloudWatch)
- ✅ Failed email sends logged and retried automatically
- ✅ Weekly monitoring reports show system health trends
- ✅ Zero silent failures (everything logged and alerted)

**Data Durability: Bulletproof Retention**

Documents and data survive any conceivable failure scenario.

**Measurable Indicators:**
- ✅ S3 multi-region replication (survives regional AWS outage)
- ✅ Document versioning prevents accidental overwrites
- ✅ Encryption at rest (S3 SSE) and in transit (TLS 1.3)
- ✅ Automated backups tested quarterly (proven restore process)
- ✅ Database point-in-time recovery functional (Aurora Serverless)
- ✅ Disaster recovery RTO <4 hours, RPO <1 hour

**Code Quality: Maintainable and Tested**

System is built to last and evolve without accumulating technical debt.

**Measurable Indicators:**
- ✅ Automated test coverage >80% (unit + integration + E2E)
- ✅ All tests pass 100% before any deployment
- ✅ TypeScript strict mode (type safety prevents runtime errors)
- ✅ Code review required for all changes (no solo commits to main)
- ✅ Security scanning automated (Snyk, Dependabot, OWASP checks)
- ✅ Performance budgets enforced (bundle size, API response times)

**Developer Experience: Easy to Maintain**

Future developers can understand and modify the system confidently.

**Measurable Indicators:**
- ✅ Comprehensive documentation (README, API docs, architecture diagrams)
- ✅ Clear code conventions enforced (ESLint, Prettier)
- ✅ Component library documented (Storybook or equivalent)
- ✅ Database schema documented with ERD
- ✅ Deployment runbook complete and tested
- ✅ New developer can deploy changes within 1 day of onboarding

### Measurable Outcomes

**3-Month Success (Post-Launch):**
- System is primary NDA management tool (100% of NDAs managed in-system)
- Zero critical bugs reported
- Uptime >99.5% achieved
- Users report "much better than legacy" in feedback
- All 2-3 active users proficient and comfortable with system

**6-Month Success (Adoption):**
- Feature adoption measured: email templates, clone NDA, dashboard usage rates
- Cycle time baseline established (know average days from create to executed)
- User trust survey shows 4.5+/5 confidence rating
- Zero data loss incidents
- Backup/recovery tested and proven functional

**12-Month Success (Maturity):**
- System managed 120+ NDAs successfully
- Uptime >99.9% achieved
- Users identify Phase 2 enhancements from actual usage patterns
- Technical debt minimal (code quality metrics stable)
- System scales effortlessly with usage (no performance degradation)
- Document library (1,000+ files) retrieval is instant

**Long-Term Success (2+ Years):**
- System becomes "boring reliable" (no one thinks about it failing)
- Multi-year audit history accessible and queryable
- No urgency to replace or rebuild (contrast with legacy failure)
- Users advocate for system ("we should use this pattern for other tools")

## Product Scope

### MVP - Minimum Viable Product (Phase 1)

**Core Promise:** Legacy parity + bulletproof reliability + smart improvements

**Must Have (Can't Launch Without):**

**Core NDA Lifecycle:**
- Create NDA request (all legacy fields, 3 intelligent entry paths)
- Generate RTF document from template (field-merge)
- Email NDA with attachments (composer with templates)
- Upload executed documents (version tracking)
- Mark as fully executed (status update + date capture)
- View NDA history timeline (comprehensive audit trail)
- Change status (inactive, cancelled)

**Access Control & Security:**
- MFA authentication (AWS Cognito)
- Agency Groups and Subagencies management (12 groups, 40-50 subagencies)
- Granular RBAC permissions (secretary ≠ admin)
- Row-level security (users only see authorized agencies)
- User/contact directory with access assignments

**Search & Organization:**
- NDA list with 15 legacy filter fields
- Sortable columns
- Pagination
- Filter presets ("My NDAs", "Expiring Soon", "Waiting on 3rd Party")

**Reliability & Compliance:**
- S3 multi-region document storage (versioned, encrypted)
- Comprehensive audit logging (who/what/when/where)
- Centralized audit log viewer (admin)
- MFA enforcement
- Encryption at rest and in transit

**User Engagement:**
- User-focused dashboard (recent activity, pending items, alerts)
- Real-time notifications (bell icon, badge count)
- Status progression visualization (Amazon-style circles)
- At-a-glance metrics (active NDAs, expiring soon)

**Smart Improvements (20+ UX enhancements):**
- Smart form auto-fill (company-first, clone, agency-first paths)
- Email templates with user signatures
- Type-ahead search (vs dropdown scrolling)
- Recently used values
- Auto-save drafts
- Smart date defaults
- Real-time validation
- Keyboard shortcuts
- Date range shortcuts
- Column sort memory
- Inline status changes
- Quick actions context menu
- And more...

**Observability:**
- Sentry error tracking
- CloudWatch monitoring
- Google Analytics
- Automated alerts (email failures, errors, downtime)

**Acceptance Criteria for Launch:**
- All core workflows functional end-to-end
- Zero critical bugs
- 99.9% uptime during beta period
- Section 508 accessibility verified
- Security audit passed
- User acceptance testing completed by 2-3 active users
- Backup/restore procedures proven functional

### Growth Features (Phase 2 - Post-Launch)

**Enhanced Automation:**
- DocuSign/e-signature integration (if users adopt)
- Clause library / NDA builder (custom NDA assembly)
- Auto-inactive on expiration (with notifications)
- Smart expiration renewal prompts
- Automated workflow routing (if needed)

**Intelligence & Insights:**
- Machine learning suggestions (after accumulating 100+ NDAs)
- Predictive cycle time ("typically takes 12 days for this company")
- Natural language search ("NDAs expiring next quarter")
- Advanced analytics dashboard (cycle time trends, bottleneck analysis)

**Integration & Import:**
- Data import tool (backfill from email archives)
- External system integrations (if customer requests)
- API for third-party access (if needed)
- Mobile PWA capabilities (if usage shows mobile access)

**Conditional on Validation:**
- Features customer requests during beta period
- Enhancements identified from usage analytics
- Pain points discovered in production use

### Vision (Future - Phase 3+)

**Long-Term Possibilities:**
- Advanced workflow approvals (complex routing if ever needed)
- Integration with broader contract management ecosystem
- Predictive analytics (dispute likelihood, risk scoring)
- AI-powered contract review (if mature and proven)
- Multi-organization support (if USmax expands usage)

**Guiding Principle:** Ship Phase 1 fast. Validate with real usage. Invest in features users actually adopt.

**NOT Building (Explicitly Out of Scope):**
- Visual workflow editor (too complex, not needed)
- External signing portal (forces partners onto platform)
- Advanced analytics (Phase 2 after validating demand)
- System configuration UI (dangerous if users misconfigure)
- Personal profile/settings pages (not operational priority)
- Enterprise CLM features (contract negotiations, vendor management)

## User Journeys

### Journey 1: Kelly Davidson - Never Losing Critical Agreements Again

**Role:** NDA Operations Manager (Primary User)

Kelly Davidson has been managing NDAs for USmax for 6 years. Every morning starts the same - she checks her email for signed NDAs from partners, updates her tracking spreadsheet, and hopes nothing gets lost. Then the unthinkable happened: the Windows server crashed, and EVERYTHING disappeared. Years of NDA records, fully executed agreements, email threads - gone before they could export the data.

Three months later, Kelly is staring at her empty inbox, trying to rebuild records from scattered email threads. Her stress level is through the roof - she's responsible for legal agreements but has no system to track them.

When she logs into the new USmax NDA System for the first time, everything feels different. The modern dashboard shows "0 NDAs" but instead of despair, she feels... hope. She clicks "Create NDA" for a DoD Air Force research opportunity. The system suggests her recent agency choices at the top. She selects "DoD Air Force," and immediately the form pre-fills common values - USmax position (Prime), typical contact information, even suggests her go-to email template.

She completes what used to take 15 minutes in under 3. Clicks "Generate & Review" - the RTF appears instantly with all fields merged. She reviews, makes a small edit to the purpose text, clicks "Send Email." The system pre-fills recipients (Relationship POC, CC: Kelly + Chris + David, BCC: leadership). She hits send.

Then she sees it: "Email sent ✓" appears with a green checkmark. The NDA status changes to "Emailed" with a timestamp. A notification appears: "You'll be notified when this NDA changes status." For the first time since the crash, Kelly exhales.

Two weeks later, the partner sends back the signed PDF. Kelly drags it into the upload zone. "Fully Executed NDA ✓ - stored in multi-region S3, encrypted, versioned." The status circle progression fills in: Created → Emailed → Fully Executed. The audit trail shows every action with timestamps.

Six months in, Kelly manages 60 NDAs without a single moment of panic. She checks the dashboard each morning, not because she has to, but because it tells her what needs attention. When a colleague asks "how do you keep track of everything?" she smiles and says "the system just works - I actually trust it."

**Journey Requirements:**
- Create NDA with smart auto-fill (agency-first, company-first, clone paths)
- RTF generation with field-merge and review
- Email composer with templates and configurable recipients
- Document upload with drag-drop
- Auto-status transitions (Created → Emailed → Executed)
- Visual status progression (circle timeline)
- Audit trail visibility
- Dashboard with actionable items
- Notifications for status changes
- Multi-region S3 storage with explicit confirmations

---

### Journey 2: Chris Martinez - Managing Access Without Chaos

**Role:** Admin / Agency Access Manager

Chris Martinez is responsible for managing who can see what at USmax. With 12 agency groups and 40-50 subagencies across DoD, Commercial, and Healthcare sectors, access control is serious business. A user seeing an unauthorized NDA isn't just embarrassing - it's a compliance violation.

When a new employee joins the IT Services team and needs access to "Fed Civ" agency group, Chris used to dread the process. The old system required editing text configuration files on the Windows server, hoping he didn't break anything, then rebooting to see if it worked.

In the new system, Chris opens the Admin panel. He navigates to "Agency Groups" and sees the visual hierarchy: Fed Civ with 8 subagencies (NIH, NASA, Commerce, etc.). He clicks "Manage Access" on Fed Civ, types the new employee's name in the search box (auto-complete suggests "Jennifer Park" after 3 letters), clicks "Grant Group Access."

A confirmation appears: "Jennifer Park granted access to Fed Civ (8 subagencies) ✓" The audit log captures: "Chris Martinez granted Jennifer Park access to Fed Civ Agency Group on 2025-12-15 at 2:34 PM." Jennifer immediately sees Fed Civ NDAs in her list.

When it's time for quarterly access review, Chris exports the audit log to Excel with one click. Every access grant, every permission change, every login - documented. During the CMMC audit, the auditor asks "how do you control NDA access?" Chris pulls up the Agency Groups screen, shows row-level security in action, and exports the access control matrix. "Compliance built-in, not bolted-on" - the auditor nods approvingly.

Chris sleeps better knowing access control isn't a nightmare anymore - it's just... handled.

**Journey Requirements:**
- Agency Groups and Subagencies CRUD (create, read, update, delete)
- Visual hierarchy (groups → subagencies)
- User search with auto-complete
- Grant/revoke access controls
- Explicit confirmations on access changes
- Comprehensive audit logging (who granted what access, when)
- Audit log export (CSV/Excel)
- Access control matrix visualization
- Row-level security enforcement (users only see authorized NDAs)
- CMMC compliance reporting

---

### Journey 3: Sarah Park - Supporting Without Full Access

**Role:** Limited User (Secretary/Support Staff)

Sarah Park supports the contracts team at USmax. She doesn't create NDAs or send them, but she does handle the administrative work - filing documents, uploading signed copies, organizing records. In the old system, she had the same access as everyone else, which was risky. What if she accidentally sent an incomplete NDA?

In the new system, Sarah has a custom role: she can upload documents and view NDAs, but she can't send emails or create new ones. This is perfect for her responsibilities.

When a signed NDA arrives via email, Sarah logs in, finds the NDA in the "Waiting for Partner" filter preset, clicks "Upload Document," drags the PDF in, checks "Fully Executed NDA," and clicks Upload. Status automatically changes to "Fully Executed ✓" with timestamp. She gets a confirmation: "Document uploaded and stored ✓"

The beauty? She can't accidentally send half-finished NDAs. When she tries to click "Send Email" on an NDA, the button is grayed out with a tooltip: "You don't have permission to send emails - contact admin if needed." Clear, not confusing. Helpful, not blocking.

Sarah handles 20-30 document uploads per month without ever worrying she'll break something or do something she's not supposed to.

**Journey Requirements:**
- Granular RBAC permissions (upload ≠ send ≠ create)
- Permission-aware UI (disabled buttons with helpful tooltips)
- Upload workflow (drag-drop, mark fully executed)
- Filter presets (quickly find NDAs waiting for documents)
- Auto-status transitions on upload
- Explicit confirmations
- Permission system that's clear and helpful, not cryptic

---

### Journey 4: Brett Steiner - Oversight Without Interference

**Role:** Read-Only User (Leadership/Auditor)

Brett Steiner is VP of Operations at USmax. He doesn't create or manage NDAs day-to-day - that's Kelly and the team's job. But he needs visibility for oversight, compliance reviews, and strategic planning. He needs to see what's happening without being able to accidentally change anything.

Brett logs in and lands on a read-only dashboard. He sees: "12 active NDAs", "3 approaching expiration in 30 days", "2 waiting on partner signature >14 days". He clicks into one of the stale NDAs, sees the full history (Created 10/15, Emailed 10/16, no activity since). He makes a mental note to ask Kelly about follow-up.

During quarterly board review, Brett needs NDA metrics. He opens "Reports" (read-only access to centralized audit logs), filters to "Q4 2025," exports to Excel. Within 5 minutes he has: 32 NDAs created, average cycle time 8 days, 3 still pending. He builds his slide deck.

When the CMMC auditor asks to review NDA access controls, Brett gives them a read-only login. The auditor explores the system, sees the security model, checks the audit trails, reviews document retention. They log out satisfied - Brett never had to export data or create reports manually.

Brett's favorite feature? The system doesn't let him break anything. He can't accidentally delete NDAs, can't send emails, can't change statuses. He can SEE everything, but can't mess anything up. Perfect for his oversight role.

**Journey Requirements:**
- Read-only role with view-all permissions
- Dashboard with metrics and alerts (actionable items surfaced)
- Full NDA detail access (read-only mode)
- Audit log viewing and filtering
- Export capabilities (reports, audit logs)
- Non-interactive UI elements (no edit buttons, no accidental changes)
- Agency-scoped visibility (or all-agency for leadership)
- Clear role indicators ("Read-Only Access" badge)

---

### Journey 5: Jonah Schulte - Maintaining the Unbreakable System

**Role:** System Administrator / Developer

Jonah built this system with one goal: never let it fail like the legacy system did. He's not a daily user, but he's responsible for keeping it running, monitoring health, and responding to issues before users notice.

At 2 AM on a Tuesday, Jonah's phone buzzes. Sentry alert: "Error rate elevated - email send failures detected (3 in 5 minutes)." He opens his laptop, checks the CloudWatch dashboard. AWS SES is experiencing issues in us-east-1. He switches the email service to us-west-2 region with a config update, deploys in 2 minutes. The errors stop. Users never knew anything happened.

The next morning, Kelly mentions "I sent an NDA last night, worked fine!" Jonah smiles - the system handled the regional issue transparently.

During monthly maintenance, Jonah tests disaster recovery. He triggers a simulated database failure. Aurora Serverless v2 fails over to the secondary region in 47 seconds. All data intact, zero downtime. He restores from point-in-time backup - 3 minutes to confirm every NDA is recoverable. Test passed.

When the customer asks "how reliable is this really?" Jonah pulls up the monitoring dashboard: 99.97% uptime over 6 months, zero data loss incidents, average API response time 247ms, error rate 0.03%. He shows the S3 versioning - 847 document versions preserved across 94 NDAs. Every upload, every change - recoverable.

Jonah's job is to make sure USmax never loses an NDA again. Six months in, mission accomplished. The system hasn't just survived - it's thrived. And users trust it completely.

**Journey Requirements:**
- Sentry integration with instant alerts (email, SMS, Slack)
- CloudWatch dashboards (real-time system health)
- Multi-region failover capability (database and services)
- Configuration management (feature flags, region selection)
- Zero-downtime deployments
- Point-in-time recovery testing tools
- Monitoring dashboards (uptime, error rates, performance metrics)
- S3 versioning and audit (prove data retention)
- Alert routing and escalation
- Deployment runbooks and automation
- Performance metrics visibility (API response times, database query performance)

### Journey Requirements Summary

These 5 journeys reveal the complete capability set needed:

**Core NDA Operations (Journey 1 - Kelly):**
- Smart NDA creation (auto-fill, templates, 3 entry paths)
- RTF generation and review
- Email composition and sending
- Document upload and version management
- Status tracking and auto-transitions
- Visual status progression
- Audit trail and history
- Dashboard with alerts
- Notifications

**Access Control & Security (Journey 2 - Chris):**
- Agency Groups and Subagencies management
- User access control (grant/revoke)
- Granular RBAC permissions
- Row-level security enforcement
- Audit logging and export
- Compliance reporting

**Permission-Aware UX (Journey 3 - Sarah):**
- Granular permission enforcement
- Permission-aware UI (helpful disabled states)
- Role-appropriate workflows
- Clear permission feedback

**Read-Only Oversight (Journey 4 - Brett):**
- Read-only role capabilities
- Metrics and reporting
- Audit log access
- Export functionality
- Non-destructive exploration

**System Reliability (Journey 5 - Jonah/System Admin):**
- Comprehensive monitoring and alerting
- Multi-region failover
- Disaster recovery and backup testing
- Performance visibility
- Zero-downtime deployments
- Configuration management

## Web Application Technical Requirements

### Architecture Pattern

**Single Page Application (SPA)**
- React 19 client-side rendering
- Node.js/Express backend on AWS Lightsail
- RESTful API (no GraphQL complexity)
- Client-side routing (React Router)
- State management: TanStack Query (server state) + Zustand (client state)

**No Real-Time Complexity:**
- Standard REST API calls (no WebSockets)
- No polling or streaming
- Dashboard shows current state on page load/refresh
- Manual refresh acceptable for updated data

**Rationale:**
- Lightsail provides predictable costs (~$60-85/month total infrastructure)
- Always-on database required anyway (PostgreSQL for relational queries)
- SPA provides modern UX
- Simple PERN stack architecture = more reliable and easier to maintain
- Low volume (10 NDAs/month) doesn't justify serverless complexity

### Browser Support Matrix

**Supported Browsers:**
- ✅ Chrome/Edge (Chromium) - latest 2 versions (primary)
- ✅ Firefox - latest 2 versions
- ✅ Safari - latest 2 versions

**NOT Supported:**
- ❌ Internet Explorer 11 (end-of-life June 2022)
- ❌ Legacy Edge (pre-Chromium)

**Browser Feature Requirements:**
- ES2020+ JavaScript support
- CSS Grid and Flexbox
- Fetch API
- LocalStorage
- File upload (drag-drop)

### Responsive Design

**Breakpoints:**
- Desktop: ≥1024px (primary use case)
- Tablet: 768-1023px (supported)
- Mobile: <768px (view-optimized, limited editing)

**Responsive Priorities:**
- Full functionality on desktop (primary)
- Read-only optimized for tablet/mobile (view NDAs, download documents)
- Create/edit workflows acceptable on tablet, not optimized for phone

**Rationale:** Government users primarily work from office desktops, but mobile viewing for oversight/review is valuable.

### Performance Targets

**Page Load:**
- Target: <2 seconds on fast connection (first contentful paint)
- Acceptable: <5 seconds on throttled network (3G simulation)
- Time to interactive: <3 seconds
- Subsequent navigation: <500ms (client-side routing)

**API Response:**
- Read operations (GET): <500ms target, <1s acceptable
- Write operations (POST/PUT): <1 second
- File operations: Variable (S3 pre-signed URLs)

**Bundle Size:**
- Target: <300KB gzipped
- Acceptable: <500KB (with Radix UI components)
- Code splitting by route (lazy load non-critical pages)
- Vendor chunks cached separately

### SEO Strategy

**Not Applicable:**
- Internal application (login required)
- No public pages
- No search engine indexing needed
- Minimal meta tags (just title for browser tabs)

### Accessibility Level

**WCAG 2.1 Level AA (Section 508 Compliance)**

**Requirements:**
- Keyboard navigation for all functionality
- Screen reader support (semantic HTML, ARIA labels)
- Color contrast ratios meet AA standards (4.5:1 normal text, 3:1 large text)
- Focus indicators visible
- Form labels and error messages clear
- Alt text for any images
- No seizure-inducing animations

**Testing:**
- Automated: axe-core, Lighthouse accessibility scans
- Manual: Keyboard-only navigation testing
- Screen reader: Test with NVDA/JAWS

### Notification Strategy

**Email Notifications Only (No Real-Time):**
- Status change emails sent to subscribed stakeholders
- Configurable notification preferences per user
- Email templates for notification types (NDA created, emailed, executed, etc.)
- Async email queue (AWS SES + Lambda)
- Delivery tracking and retry logic

**In-App Updates:**
- Standard page refresh shows current data (no polling)
- Dashboard loads fresh data on page navigation
- No WebSockets or Server-Sent Events
- No auto-refresh or polling
- Simple, reliable, cost-effective

**Rationale:**
- Low volume (~10 NDAs/month) doesn't justify real-time complexity
- Small team (<10 users) not collaborating simultaneously
- Email notifications sufficient for async stakeholder updates
- Page refresh (F5) acceptable for seeing latest state

### Session Management

**Authentication:**
- AWS Cognito with MFA enforced
- **Session timeout: Configurable** (default 4 hours, admin can set 30min - 8 hours)
- Session warning at 5 minutes before timeout ("Save your work!")
- Logout clears all client state
- Optional "Remember me" (7-day session extension)

**State Persistence:**
- Form drafts auto-saved to database (server-side, not localStorage)
- Filter preferences saved per user (server-side)
- Column sort preferences persisted per user
- No sensitive data in browser storage (security requirement)

### Error Handling & Resilience

**User-Facing Errors:**
- Friendly error messages (not technical stack traces)
- Actionable guidance ("Try refreshing the page" vs. "500 Internal Server Error")
- Toast notifications for temporary errors
- React error boundaries catch crashes
- Fallback UI when components fail

**Network Resilience:**
- Retry failed API calls automatically (exponential backoff, max 3 attempts)
- Offline detection with clear messaging ("Connection lost - check your network")
- Form data preserved during network failures (auto-save to database)
- Queue failed operations for retry when connection restored

**Graceful Degradation:**
- Core workflows work even if secondary features fail
- Failed email sends logged (don't block NDA creation - async)
- Document preview failures don't prevent download (fallback to direct download)
- Audit log failures don't block operations (logged to separate failsafe system)
- Monitoring failures don't crash application (isolated)

## Project Scoping & Development Approach

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP (Focused Execution)

**Core Philosophy:**
- Build Phase 1 comprehensively and make it bulletproof
- Stay in Phase 1 until real usage data justifies Phase 2
- No arbitrary timeline pressure to "add more features"
- Invest in reliability, testing, monitoring over feature expansion

**Rationale:**
The legacy system failed catastrophically. The customer needs a system that WORKS and NEVER FAILS more than they need feature innovation. Phase 1 delivers all essential capabilities - rushing to Phase 2 would be premature optimization.

**Resource Requirements:**
- **Development:** 1-2 developers (primary: Jonah)
- **Customer Liaison:** Todd (requirements validation, feedback)
- **End Users:** 2-3 USmax staff (UAT, feedback)
- **Timeline:** Focus on quality over speed

### Phase 1: MVP - Comprehensive Foundation (Primary Focus)

**This is where we'll stay for a good while.**

**Guiding Principle:**
**"Phase 1 is not a stepping stone - it's the destination until proven otherwise."**

Ship Phase 1, use it for 6-12 months, collect real data, THEN decide if Phase 2 is worth building.

### Development Phases & Priorities

**Phase 1 Focus Areas (In Priority Order):**

**Weeks 1-2: Foundation**
1. AWS infrastructure (Lightsail instance, S3, Cognito, SES)
2. PostgreSQL database on Lightsail with schema
3. Node.js/Express API setup
4. Authentication + MFA (Cognito integration)
5. RBAC permission framework

**Weeks 3-4: Core Operations**
5. NDA CRUD operations
6. RTF generation from templates
7. Email composer + sending
8. Document upload + versioning
9. Status management

**Weeks 5-6: Access Control & Organization**
10. Agency Groups/Subagencies management
11. User directory with access assignments
12. Row-level security enforcement
13. Advanced filtering (15 filter fields)

**Weeks 7-8: Reliability & Polish**
14. Comprehensive audit logging
15. Dashboard with alerts
16. Email templates
17. Smart form features (auto-fill, clone)
18. Monitoring + alerting (Sentry, CloudWatch)
19. Testing + security audit
20. UAT with 2-3 users

**Phase 1 Complete:** Operational, reliable, trusted system

### Post-Phase 1: Conditional Enhancements (Build IF Validated)

**Phase 1 Will Remain Primary Focus Until:**
- System is stable and trusted (6+ months operational)
- Usage analytics show feature adoption patterns
- Users explicitly request specific Phase 2 features
- Cost/benefit analysis justifies investment

**Phase 2 Candidates (Only Build If Usage Data Shows Value):**
- DocuSign integration (IF manual email proves painful)
- Clause library (IF template customization becomes frequent)
- ML suggestions (AFTER 100+ NDAs accumulated)
- Advanced analytics (IF users request insights)
- Data import tool (IF customer wants email backfill)

**NOT Building Unless Customer Explicitly Requests:**
- Visual workflow editor
- External signing portal
- System configuration UI
- Advanced workflow automation

### Risk Mitigation Strategy

**Technical Risks:**

**Risk: Building wrong thing (indirect requirements through Todd)**
- Mitigation: 18 of 22 questions answered, customer email sent for final 4
- Mitigation: Configurable enums/dropdowns (adjust without code deployment)
- Mitigation: Modular architecture allows pivots
- Contingency: Can refactor if assumptions wrong

**Risk: Solo developer bottleneck**
- Mitigation: Lean scope (cut 7 major features already)
- Mitigation: Battle-tested tech stack (no experimentation)
- Mitigation: Comprehensive testing prevents late-stage bugs
- Contingency: Ship core only, add UX improvements incrementally

**Risk: Customer slow to validate final questions**
- Mitigation: Can start foundation work with 18 answers
- Mitigation: Use placeholder values for unknown dropdowns
- Contingency: Build configurability (customer sets values in admin UI later)

**Market Risks:**

**Risk: Users don't adopt**
- Mitigation: Legacy parity = familiar workflows
- Mitigation: Carte blanche means delightful UX
- Reality: Any system better than NOTHING (current state)

**Resource Risks:**

**Risk: Timeline extends beyond expectations**
- Mitigation: No external deadline pressure
- Mitigation: Quality over speed philosophy
- Contingency: Phase 1 comprehensive = no pressure for Phase 2

### Scope Management Principles

**No Feature Creep:**
- Explicit "NOT Building" list enforced
- New requests → Phase 2 backlog (not Phase 1)
- Default answer: "Phase 2, after we validate Phase 1"

**Ruthless Prioritization:**
- If not in user journey → not built
- If doesn't support success criteria → cut
- If complex → defer to Phase 2
- If uncertain → wait for validation

**Quality Over Quantity:**
- 80% test coverage required
- Zero critical bugs before launch
- Performance budgets enforced
- Security audit mandatory
- Documentation complete

**Ship When Ready:**
- No arbitrary deadlines
- Launch when acceptance criteria met
- Reliability matters more than speed
- Better late and solid than fast and broken

## Functional Requirements

### NDA Lifecycle Management

**FR1:** Users can create a new NDA request by entering required information (company, agency, POCs, purpose, dates)

**FR2:** Users can create an NDA using three intelligent entry paths:
- Company-first (select company → auto-fill company info, POCs, typical values)
- Clone existing (duplicate NDA → change only differences)
- Agency-first (select agency → suggest common companies/templates for that agency)

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

**FR13:** System auto-changes status based on user actions:
- Send email → "Emailed"
- Upload document (not fully executed) → "In Revision"
- Upload with "Fully Executed" checked → "Fully Executed NDA"

**FR14:** Users can mark NDA as Inactive or Cancelled (reversible status changes)

**FR15:** Users can view NDA detail with full information, history timeline, and documents

**FR16:** Users can see visual status progression (Amazon-style circles: Created → Emailed → Revision → Executed with dates)

### Document Management

**FR17:** System stores all NDA documents in S3 with multi-region replication, versioning, and encryption

**FR18:** Users can upload documents to an NDA (drag-drop or file picker)

**FR19:** Users can mark uploaded document as "Fully Executed NDA" (triggers status change and date capture)

**FR20:** Users can download any document version (system generates time-limited pre-signed S3 URL)

**FR21:** Users can download all document versions for an NDA as ZIP file

**FR22:** System tracks document metadata (filename, upload date, uploader, type: Generated/Uploaded/Executed)

**FR23:** Users can view complete document version history for an NDA

**FR24:** System preserves all document versions indefinitely (never overwrites, never deletes)

### Email & Communication

**FR25:** Users can compose and send NDA email with generated RTF attached

**FR26:** System pre-fills email fields based on NDA data:
- Subject (template with NDA details)
- TO (Relationship POC email)
- CC (configurable per FR122)
- BCC (configurable per FR122)
- Body (email template with merged fields)

**FR27:** Users can select from multiple email templates when composing

**FR28:** Users can edit all email fields (subject, recipients, body) before sending

**FR29:** System tracks email send events in NDA history (recipients, timestamp, delivery status)

**FR30:** System sends email notifications to subscribed stakeholders when NDA status changes

**FR31:** Users can configure which notification types they want to receive via email

### Access Control & Permissions

**FR32:** System enforces MFA (multi-factor authentication) for all users

**FR33:** System implements granular RBAC with these permissions:
- nda:create, nda:update, nda:upload_document, nda:send_email, nda:mark_status, nda:view
- admin:manage_agency_groups, admin:manage_subagencies, admin:manage_users, admin:assign_access, admin:view_audit_logs

**FR34:** System supports role templates (Read-Only, NDA User, Limited User, Manager, Admin)

**FR35:** System enforces row-level security (users only see NDAs for their authorized agencies)

**FR36:** Users can only access NDAs for Agency Groups they're granted access to

**FR37:** Users can only access NDAs for specific Subagencies they're granted access to (if subagency-scoped)

**FR38:** System displays permission-aware UI (disabled buttons with helpful tooltips for unauthorized actions)

**FR39:** System provides clear role indicators (badges showing "Admin", "Read-Only", etc.)

**FR40:** Users with insufficient permissions see helpful error messages (not cryptic 403 errors)

### Agency & Subagency Management

**FR41:** Admins can create, edit, and view Agency Groups

**FR42:** Admins can delete Agency Groups (with safeguard: cannot delete if NDAs exist)

**FR43:** Admins can create, edit, and view Subagencies within Agency Groups

**FR44:** Admins can delete Subagencies (with safeguard: cannot delete if NDAs exist)

**FR45:** Admins can assign users to Agency Group access (group-level: user sees all subagencies in group)

**FR46:** Admins can assign users to specific Subagency access (subagency-level: user sees only that subagency)

**FR47:** Admins can view "users having access" summary for each Agency Group and Subagency

**FR48:** System displays Agency/Subagency hierarchy visually (tree view or organized list)

### Search, Filtering & Organization

**FR49:** Users can search across all NDA fields (company name, purpose, agency, POC names)

**FR50:** Users can use type-ahead search (results appear as you type, not after clicking search)

**FR51:** Users can sort NDA list by any column (ID, company, agency, effective date, requested date, status, etc.)

**FR52:** System remembers user's column sort preference (persisted per user)

**FR53:** Users can apply date range shortcuts ("Last 30 Days", "This Quarter", "This Year") instead of manual date entry

**FR54:** System shows recently used values at top of dropdowns (agencies, companies, users)

**FR55:** Users can paginate through large result sets (configurable page size)

### Dashboard & Notifications

**FR56:** Users see personalized dashboard on login showing:
- Their recent NDAs
- NDAs they're subscribed to (notification stakeholders)
- Recent activity on their authorized agencies
- Items needing attention (stale, expiring, waiting on 3rd party)

**FR57:** Dashboard displays at-a-glance metrics (active NDAs count, expiring soon count, average cycle time)

**FR58:** Dashboard identifies stale NDAs (created but not emailed after 2 weeks, or emailed but no response after configurable threshold)

**FR59:** Dashboard shows "waiting on 3rd party" NDAs with time in current state ("Waiting 23 days")

**FR60:** Dashboard alerts users to NDAs approaching expiration (30/60/90 day thresholds - configurable)

**FR61:** Users receive email notifications when subscribed NDA changes status

**FR62:** Users can configure notification preferences (which event types trigger emails)

### Audit & History Tracking

**FR63:** System logs ALL user actions with comprehensive details (who, what, when, where, IP address)

**FR64:** System tracks NDA field changes with before/after values (audit trail shows "Company changed from X to Y by User on Date")

**FR65:** System tracks all document downloads (who downloaded what document, when, from what IP)

**FR66:** System tracks all login attempts (successful and failed, with timestamp and IP address)

**FR67:** Users can view complete audit trail for any NDA (all actions, all users, all timestamps)

**FR68:** System displays audit trail as visual timeline (chronological with icons for event types)

**FR69:** Admins can access centralized audit log viewer (all NDAs, all users, system-wide)

**FR70:** Admins can filter audit logs by user, action type, date range, NDA, IP address

**FR71:** Admins can export audit logs to CSV/Excel for compliance reviews

**FR72:** System tracks email send events (who sent to whom, when, delivery status, opened/clicked if trackable)

**FR73:** System preserves audit trail indefinitely (never deleted, immutable records)

### User Management

**FR74:** Admins can create, edit, and view user accounts (if not directory-synced)

**FR75:** Admins can deactivate users (soft delete, preserve history and audit trail)

**FR76:** Admins can assign roles and permissions to users

**FR77:** Admins can assign Agency Group and Subagency access to users

**FR78:** Users can view user directory (contacts) with search and filtering

**FR79:** System supports user profiles with email signature (auto-included in email templates)

**FR80:** System provides user search with auto-complete (type 3 letters → see matches with role/agency context)

**FR81:** Admins can view access control summary for any user (which agencies/subagencies they can access, which permissions they have)

### Template Management

**FR82:** Admins can create multiple RTF templates with field-merge placeholders ({{fieldName}} syntax)

**FR83:** Admins can edit RTF template content and field mappings

**FR84:** Admins can organize templates (by agency, by type, or by user - based on customer preference TBD)

**FR85:** Admins can set default template for agency/type combinations

**FR86:** Users can select which template to use when creating NDA

**FR87:** System merges NDA fields into template placeholders automatically

**FR88:** Admins can create multiple email templates with field-merge placeholders

**FR89:** Users can select which email template to use when composing NDA email

**FR90:** Email templates include user signature automatically (from user profile)

**FR91:** System suggests templates based on agency/type selection ("90% of DoD Air Force NDAs use Template X")

### Smart Suggestions & Intelligence (Phase 1)

**FR92:** System suggests companies based on agency selection (frequent partners for this agency)

**FR93:** System provides field suggestions based on historical NDA data (common purposes for agency/company combinations)

**FR94:** System shows "previous NDAs for this company" context when creating new NDA (helps users see patterns)

**FR95:** System suggests email recipients based on historical patterns (who typically gets CC'd for this agency/company)

**FR96:** System improves suggestions over time as more NDAs are created (Phase 1: rule-based, Phase 2: ML)

### System Administration & Monitoring

**FR97:** System sends alerts to administrators when critical errors occur (<5 minute response time)

**FR98:** System tracks all errors with stack traces, context, and user session data (Sentry integration)

**FR99:** Admins can view system health dashboards (uptime, error rates, API response times, database performance)

**FR100:** System retries failed email sends automatically (exponential backoff, max 3 attempts, logs all attempts)

**FR101:** System logs failed operations to separate monitoring system (never lost even if primary system fails)

**FR102:** System provides weekly health reports (uptime percentage, error trends, performance metrics)

**FR103:** System enables zero-downtime deployments (rolling updates, canary deployments)

### Data Validation & Integrity

**FR104:** System validates all required fields before allowing NDA creation (client-side and server-side)

**FR105:** System validates data formats (email addresses, phone numbers with format hints, dates)

**FR106:** System enforces character limits (Authorized Purpose ≤255 characters per legacy requirement)

**FR107:** System prevents invalid date ranges (effective date ≤ expiry date where applicable)

**FR108:** System validates file uploads (allowed types: RTF/PDF, max size, basic malware scanning)

**FR109:** System enforces referential integrity (cannot delete agency with NDAs, cannot delete user assigned as POC)

**FR110:** System provides real-time inline validation feedback (errors show as user types, not after submit)

### Session & Authentication

**FR111:** System provides configurable session timeout (admin sets 30min - 8 hours, default 4 hours)

**FR112:** System warns users 5 minutes before session expires ("Save your work!")

**FR113:** System logs all authentication events (logins, logouts, MFA challenges, failures)

### POC (Point of Contact) Management

**FR114:** Users can designate an Opportunity POC (required - internal USmax user selected from directory)

**FR115:** Users can enter Contracts POC details (optional: name, email, phone, fax)

**FR116:** Users can enter Relationship POC details (required: name, email, phone, fax)

**FR117:** Users can enter Contacts POC details (optional - TBD if different from Contracts POC based on customer clarification)

**FR118:** System provides "Copy POC Details" functionality (copy from one POC field to another if same person)

**FR119:** System validates POC email addresses and phone number formats

### Non-USmax NDA Handling

**FR120:** Users can mark NDA as "Non-USmax NDA" via checkbox

**FR121:** System handles Non-USmax NDAs according to configured behavior (TBD customer preference):
- Option A: Skip automatic template generation (require manual document upload)
- Option B: Generate from alternate/partner template
- System supports either approach via admin configuration

### Admin Configuration & Customization

**FR122:** Admins can add, edit, reorder, and archive NDA status values

**FR123:** System prevents deletion of status values currently in use (must map NDAs to alternate status first if merging/deleting)

**FR124:** Admins can configure status auto-transition rules (which actions trigger which status changes)

**FR125:** Admins can configure email notification rules (which events trigger emails, default recipients)

**FR126:** Admins can configure dashboard alert thresholds (stale NDA = X days, expiring soon = X days before expiration)

**FR127:** Admins can configure default email CC/BCC recipients (system-wide defaults or per-template)

**FR128:** Admins can configure allowed values for dropdown fields (Type, USmax Position - once customer provides values)

### Data Security & Encryption

**FR129:** System encrypts all data at rest in database (Aurora Serverless encryption enabled)

**FR130:** System enforces TLS 1.3 for all client-server connections (in transit encryption)

**FR131:** System stores all documents in S3 with server-side encryption (SSE-S3 or SSE-KMS)

**FR132:** System uses multi-region S3 replication for document storage (documents survive regional outages)

**FR133:** System generates time-limited pre-signed URLs for document downloads (15-minute expiry)

**FR134:** System logs all document access attempts (downloads, previews) with user and timestamp

### Disaster Recovery & Reliability

**FR135:** System provides automated database backup via Lightsail snapshots (daily, 7-day retention)

**FR136:** System can restore database from snapshot backup (tested disaster recovery procedures)

**FR137:** Admins can test disaster recovery procedures (simulated failures, restore validation)

**FR138:** System provides database recovery via Lightsail snapshot restore (manual failover process documented)

**FR139:** System handles AWS regional service outages gracefully (S3 multi-region for documents, Lightsail snapshot restore to different region if needed)

### Error Handling & Recovery

**FR140:** System displays user-friendly error messages with actionable guidance (not stack traces)

**FR141:** Users can retry failed operations (RTF generation, email send, document upload)

**FR142:** System queues failed email sends for automatic retry (exponential backoff, max 3 attempts)

**FR143:** System logs all errors to separate failsafe monitoring system (errors never lost)

**FR144:** System gracefully degrades when secondary features fail (core NDA workflows continue working)

**FR145:** System detects offline/network issues and displays clear messaging to user

**FR146:** System preserves form data during network failures (auto-save to database prevents loss)

### Data Validation & Integrity

**FR147:** System validates all required fields before allowing NDA submission (client and server-side)

**FR148:** System validates data formats (email addresses, phone numbers with (XXX) XXX-XXXX format, dates as mm/dd/yyyy)

**FR149:** System enforces character limits (Authorized Purpose ≤255 characters per legacy requirement)

**FR150:** System prevents invalid date ranges (effective date ≤ expiry date where applicable)

**FR151:** System validates file uploads (allowed types RTF/PDF, max size, basic security scanning)

**FR152:** System enforces referential integrity (cannot delete agency with active NDAs, cannot delete user assigned as POC)

**FR153:** System provides real-time inline validation feedback (errors display as user types)

### Data Import & Export

**FR154:** Admins can export NDA list to CSV/Excel (all fields, filterable)

**FR155:** Admins can export audit logs to CSV/Excel for compliance reviews

**FR156:** System can import NDAs from email archives (forward to SES address or upload EML files) - Phase 1.5/2 pending customer interest

### Keyboard Shortcuts & Power User Features

**FR157:** System supports keyboard shortcuts for common actions (Ctrl+N = New, Ctrl+F = Search, E = Email NDA) - Phase 1.5

**FR158:** System provides right-click context menus for quick actions on NDA rows - Phase 1.5

**FR159:** System allows bulk operations on multiple selected NDAs (bulk download, bulk export) - Phase 2

---

**Total: 159 Functional Requirements**

**Organized by 15 capability areas:**
1. NDA Lifecycle Management (16 FRs)
2. Document Management (8 FRs)
3. Email & Communication (7 FRs)
4. Access Control & Permissions (9 FRs)
5. Agency & Subagency Management (8 FRs)
6. Search, Filtering & Organization (7 FRs)
7. Dashboard & Notifications (7 FRs)
8. Audit & History Tracking (11 FRs)
9. User Management (8 FRs)
10. Template Management (10 FRs)
11. Smart Suggestions & Intelligence (5 FRs)
12. System Administration & Monitoring (7 FRs)
13. POC Management (6 FRs)
14. Non-USmax NDA Handling (2 FRs)
15. Admin Configuration (7 FRs)
16. Data Security & Encryption (6 FRs)
17. Disaster Recovery (5 FRs)
18. Error Handling & Recovery (7 FRs)
19. Data Validation & Integrity (7 FRs)
20. Data Import & Export (3 FRs)
21. Keyboard Shortcuts (3 FRs - Phase 1.5/2)

**Coverage validation:**
- ✅ All 5 user journeys covered
- ✅ All MVP scope items covered
- ✅ All customer validation answers incorporated
- ✅ All gaps identified by team addressed
- ✅ TBD items flagged for customer clarification (Non-USmax, POC types, dropdown values)

## Non-Functional Requirements

### Performance

**NFR-P1:** Page load time <2 seconds on fast connection (target), <5 seconds on throttled network (acceptable)

**NFR-P2:** API response times <500ms for read operations, <1 second for write operations

**NFR-P3:** User actions (save, filter, status change) complete within 500ms

**NFR-P4:** Initial JavaScript bundle size <400KB gzipped (realistic with Radix UI)

**NFR-P5:** Subsequent page navigation <500ms (client-side routing)

**NFR-P6:** Time to interactive <3 seconds

### Security

**NFR-S1:** All users must authenticate with MFA (no exceptions)

**NFR-S2:** All data encrypted at rest (PostgreSQL database and S3 storage)

**NFR-S3:** All connections encrypted in transit (TLS 1.3 enforced)

**NFR-S4:** Document downloads use time-limited pre-signed URLs (15-minute expiry)

**NFR-S5:** System implements granular RBAC (7 distinct permissions)

**NFR-S6:** Row-level security enforced (users only see authorized agency data)

**NFR-S7:** All authentication attempts logged (successful and failed, with IP)

**NFR-S8:** Session timeout configurable (default 4 hours, range 30min - 8 hours)

**NFR-S9:** No sensitive data in browser localStorage (server-side persistence only)

**NFR-S10:** File uploads validated and scanned for malware

### Reliability & Availability

**NFR-R1:** System uptime ≥99.9% (<9 hours downtime per year)

**NFR-R2:** ≤1 critical bug in first 30 days post-launch

**NFR-R3:** Error rate <0.1% of all operations

**NFR-R4:** Zero data loss incidents (100% of NDAs and documents preserved)

**NFR-R5:** Automated daily Lightsail snapshots (7-day retention minimum)

**NFR-R6:** S3 multi-region replication for documents (survive regional outages)

**NFR-R7:** Disaster recovery RTO <4 hours (restore snapshot to new instance)

**NFR-R8:** Disaster recovery RPO <24 hours (daily snapshots)

**NFR-R9:** Lightsail instance health monitored (CPU, memory, disk alerts via CloudWatch)

**NFR-R10:** Low-downtime deployments (<5 minutes maintenance window, off-hours)

**NFR-R11:** Failed email sends automatically retried (max 3 attempts, exponential backoff)

**NFR-R12:** System gracefully degrades (core workflows continue if secondary features fail)

**NFR-R13:** Snapshot restore procedures tested quarterly (proven recovery process)

### Compliance & Audit

**NFR-C1:** CMMC Level 1 compliance (17 NIST SP 800-171 practices)

**NFR-C2:** FAR document retention compliance (indefinite > 6-year requirement)

**NFR-C3:** Comprehensive audit trail (100% of user actions logged)

**NFR-C4:** Audit logs immutable and preserved indefinitely

**NFR-C5:** Audit logs exportable to CSV/Excel for compliance reviews

**NFR-C6:** All document access tracked (downloads, previews logged with user/IP/timestamp)

**NFR-C7:** Field changes tracked with before/after values

### Accessibility

**NFR-A1:** WCAG 2.1 Level AA compliance (Section 508)

**NFR-A2:** All functionality accessible via keyboard navigation

**NFR-A3:** Screen reader compatible (semantic HTML, ARIA labels)

**NFR-A4:** Color contrast meets AA standards (4.5:1 normal, 3:1 large text)

**NFR-A5:** Focus indicators visible for keyboard users

**NFR-A6:** Form labels and errors clear and properly associated

**NFR-A7:** No seizure-inducing animations

### Maintainability

**NFR-M1:** Automated test coverage ≥80% (unit + integration + E2E)

**NFR-M2:** Test execution time <5 minutes (CI/CD pipeline efficiency)

**NFR-M3:** Zero flaky tests allowed (if test flakes, fix or delete)

**NFR-M4:** All tests pass 100% before deployment (CI/CD gate)

**NFR-M5:** TypeScript strict mode enforced (compile-time type safety)

**NFR-M6:** Code review required for all changes

**NFR-M7:** Clear code conventions enforced (ESLint, Prettier)

**NFR-M8:** Comprehensive documentation (README, API docs, ERD, runbook)

**NFR-M9:** New developer can deploy within 1 day of onboarding

### Monitoring & Observability

**NFR-O1:** All errors captured with stack traces (Sentry integration)

**NFR-O2:** Critical errors alert within 5 minutes

**NFR-O3:** System health dashboards available (uptime, errors, performance)

**NFR-O4:** Weekly automated health reports

**NFR-O5:** Zero silent failures (everything logged and alerted)

**NFR-O6:** Performance metrics tracked (API response, database query times)

**NFR-O7:** Failed operations logged to separate failsafe system

### Usability

**NFR-U1:** Common tasks <3 clicks to complete

**NFR-U2:** All state changes provide explicit confirmation ("Saved ✓")

**NFR-U3:** Error messages user-friendly with actionable guidance

**NFR-U4:** Permission-denied states show helpful tooltips

**NFR-U5:** Auto-save prevents data loss (30-second intervals)

**NFR-U6:** Session timeout warnings 5 minutes before expiration

### Browser Compatibility

**NFR-B1:** Latest 2 versions of Chrome, Edge, Firefox, Safari supported

**NFR-B2:** No IE11 or legacy Edge support required

**NFR-B3:** Responsive design functional on desktop (primary), tablet, mobile (view-optimized)

### Data Integrity

**NFR-D1:** Referential integrity enforced (no orphaned records)

**NFR-D2:** All data validated client-side AND server-side

**NFR-D3:** Character limits enforced (Authorized Purpose ≤255 chars)

**NFR-D4:** Date formats consistent (mm/dd/yyyy per legacy)

**NFR-D5:** Document versions immutable (append-only, never overwrite)

### Cost Efficiency

**NFR-CE1:** Total infrastructure costs <$100/month for expected load

**NFR-CE2:** Lightsail provides flat predictable monthly cost ($40 instance)

**NFR-CE3:** S3 storage minimal cost (small files, optional Glacier archival)

**Infrastructure Cost Breakdown (Expected):**
- AWS Lightsail (4GB RAM, 2 vCPU, 80GB SSD): $40/month
- S3 multi-region storage: $5-10/month
- CloudWatch logging: $10/month
- AWS SES email: $2-5/month
- Sentry error tracking: Free tier or $26/month
- AWS Cognito: Free tier (< 50K MAU)
- **Total: $57-91/month**

**Minimum Cost (Zero Usage):**
- Lightsail instance (always-on): $40/month
- S3 storage (data at rest): $2/month
- CloudWatch basic: $5/month
- **Absolute Floor: ~$47/month**

---

**Total: 63 Non-Functional Requirements across 11 quality attribute categories**

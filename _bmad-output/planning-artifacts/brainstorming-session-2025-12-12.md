---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['docs/index.md', 'docs/project-overview.md', 'docs/component-inventory-main.md', 'docs/legacy-screens-requirements.md', 'docs/legacy-prototype-gap-backlog.md']
session_topic: 'NDA Application functionality, layout, workflows, and customer problem-solution fit'
session_goals: 'Identify gaps, validate existing features, leverage domain expertise, create customer-ready solution'
selected_approach: 'AI-Recommended Techniques'
techniques_used: ['Six Thinking Hats', 'Question Storming', 'SCAMPER Method']
ideas_generated: [
  'Smart form entry (3 paths)',
  'Notification system (social media style)',
  'Email templates',
  'Clone/duplicate NDA',
  'Type-ahead search',
  'User-focused dashboard',
  'At-a-glance metrics',
  'Keyboard shortcuts',
  'Observability stack',
  'Filter presets',
  'Auto-save drafts',
  'Smart date defaults',
  'Real-time validation',
  'Recently used dropdowns',
  'Date range shortcuts',
  'Column sort memory',
  'Inline status changes',
  'Quick actions menu',
  'Smart NDA suggestions',
  'Expiration calendar',
  'NDA health monitoring'
]
session_completed: true
context_file: 'docs/index.md'
legacy_screenshots: 'screenshots/01-main-screen.png through 08-contacts-tab.png'
---

# Brainstorming Session Results

**Facilitator:** Jonah
**Date:** 2025-12-12

## Session Overview

**Topic:** NDA Application functionality, layout, workflows, and customer problem-solution fit

**Goals:**
- Identify gaps in current Figma Make prototype
- Validate/challenge existing features and assumptions
- Leverage domain expertise for comprehensive planning
- Create customer-ready solution architecture
- Determine what's missing, overbuilt, or needs adjustment

### Context Guidance

**Project Baseline:** Government NDA Lifecycle Application (Figma Make Prototype)
- 69 React components across Dashboard, NDA Management, Workflows, Templates, Admin, Reports
- 7 domain models: NDA, Task, Activity, Template, Clause, Workflow, WorkflowStep
- TypeScript + React 18 + Vite + Radix UI + Tailwind CSS
- UI-only prototype with mock data (no backend yet)

**Key Focus Areas:**
- **Functionality Coverage:** What's missing? What's unnecessary?
- **Workflow Design:** How should approval/review processes actually work?
- **Customer Problems:** What pain points does this solve?
- **Enterprise Requirements:** Compliance, security, audit, integration needs
- **User Experience:** Layout, navigation, information architecture

### Session Setup

This session will critically evaluate the prototype through multiple lenses:
1. **User needs** - What do government NDA managers actually need?
2. **Workflow efficiency** - How can we streamline NDA lifecycle processes?
3. **Compliance & audit** - What regulatory requirements must we meet?
4. **Integration** - How does this fit into existing government systems?
5. **Innovation** - Where can we provide breakthrough value?

---

## Technique 1: Six Thinking Hats - Results

### 🤍 White Hat (Facts & Data)
- Legacy: Simple NDA tracker (request → generate → email → upload → history)
- Prototype: Over-engineered with 7 major components to cut (~180KB)
- Missing from prototype: Agency Groups/Subagencies, document generation, email composer
- Tech stack: React 19.x + Vite (or Next.js if needed)
- System failure: 90s Windows machine died, data lost before export
- Users starting completely fresh

### ❤️ Red Hat (Emotions & Risks)
- **Critical risk:** Indirect requirements gathering through stakeholder
- **Urgency:** System DOWN NOW, operational pressure
- **User emotional state:** Crestfallen about data loss, anxious about replacement
- **Success metric:** User DELIGHT, not just functionality ("excited to NDA all day!")
- **Validation strategy:** Three-tier options, assumptions doc, phased stakeholder feedback

### 🖤 Black Hat (Critical Cuts)
**Features to Cut from Phase 1:**
- Visual Workflow Editor (WorkflowEditor.tsx)
- External Signing Portal (ExternalSigningPortal.tsx)
- Clause Library Management
- Advanced Reports & Analytics
- System Configuration UI
- Advanced Notification Settings
- Personal Profile/Settings pages

**Keep:** User-focused dashboard, centralized audit logs

### 💛 Yellow Hat (Value & What Works)
**Preserve from Legacy:**
- Simple workflow (request → generate → email → upload)
- Agency/Subagency access model
- Clear audit trail

**20 Value-Add Improvements:**
1. Email templates (pick → auto-fill → send)
2. Clone/duplicate NDA
3. Auto-save drafts
4. Recently used dropdowns
5. Bulk document download (ZIP)
6. Smart date defaults
7. Pre-flight validation (real-time)
8. Contact auto-complete with context
9. Copy POC details button
10. Date range shortcuts
11. Column sort memory
12. Filter presets ("My NDAs", etc.)
13. Keyboard shortcuts
14. Inline status changes
15. Download all versions (per NDA)
16. Smart NDA suggestions (previous NDAs for same company)
17. Expiration calendar view
18. Template field suggestions (learn from history)
19. Quick actions context menu
20. NDA health monitoring (proactive warnings)

### 💚 Green Hat (Creative Innovation)
**Key Innovation:** Facebook/Instagram-style notification system
- Real-time in-app notifications with bell icon + badge count
- Notification categories: My NDAs, Team Activity, System Alerts, Security, Mentions
- Examples: "Fully executed NDA uploaded", "You were added as POC", "3 NDAs expiring soon"
- Purpose: Keep users engaged, informed, and feeling connected to system activity
- Builds on: Audit logging (already planned) + activity dashboard

**Delight Moments to Build In:**
- Micro-celebrations (confetti on completion)
- Speed & responsiveness (instant feedback)
- Intelligence (helpful suggestions)
- Visual polish (beautiful, not just functional)
- Achievement feelings (progress indicators, encouragement)

### 🔵 Blue Hat (Process Synthesis)
**Design Philosophy:** Replacement window opportunity
- Force improvements: Modern UI, security enhancements, better filtering
- Keep optional: DocuSign integration, workflow approvals, advanced analytics
- Core principle: Remove friction, don't add complexity

**Build Strategy:**
- Phase 1: Legacy parity + 20 improvements + notification system (ship fast)
- Phase 2+: Optional enhancements based on adoption data

---

## Technique 2: Question Storming - Results

**Critical Questions for Customer Validation:**

**Tier 1 - Can't Build Without Answers (6 questions):**
1. What are allowed values for Type, USmax Position, NDA Owner?
2. PDF or RTF for document generation?
3. Who receives "Review NDA Email" - partners or internal?
4. What status transitions exist?
5. Multiple templates per agency/type, or one universal?
6. Is "Inactive" reversible or permanent archive?

**Tier 2 - Important for User Adoption (5 questions):**
7. Top 5 pain points with legacy system?
8. What do they LIKE about legacy that must be preserved?
9. How many NDAs per month/year?
10. Average time from request to executed?
11. How many users/agencies/subagencies?

**Tier 3 - Feature Validation via Mockups (4 concepts):**
12. Email templates - valuable?
13. Clone/duplicate - would they use it?
14. Personalized dashboard - helpful?
15. Notification system - engaging or annoying?

**Tier 4 - Implementation Details (Defer/Assume):**
- Notification preferences, keyboard shortcuts, export formats, etc.
- Make reasonable assumptions, adjust if feedback indicates otherwise

**Key Meta-Questions:**
- What would make users want to cut me with a knife if I remove or change?
- What would make them feel DELIGHTED vs. just "okay, we have a system again"?

---

## Session Synthesis & Action Planning

### Thematic Organization

**Theme 1: Core Operations (Legacy Parity)**
- NDA lifecycle: Request → Generate → Email → Upload → Complete
- Agency Groups/Subagencies access control
- Contacts directory for POCs
- Document management and versioning
- Audit trail and history

**Theme 2: Intelligent UX (Remove Friction)**
- Smart form entry (3 paths: company-first, clone, agency-first)
- Type-ahead search replacing dropdown hell
- Auto-save and real-time validation
- Recently used and smart defaults
- One-click common actions

**Theme 3: User Engagement (Delight)**
- Notification system (Facebook/Instagram style)
- User-focused dashboard (heads-up display)
- At-a-glance metrics (Stripe style)
- Keyboard shortcuts (Superhuman style)
- Micro-celebrations and instant feedback

**Theme 4: Reliability & Observability**
- Monitoring stack (Sentry, New Relic, Google Analytics)
- Proactive error detection and alerts
- Prevent silent system failures

**Theme 5: Time-Saving Automations**
- Email templates
- Clone/duplicate NDAs
- Filter presets
- Date shortcuts
- Smart suggestions from historical data

### Priority Decisions

**Top Priority (P0 - Must Ship):**
- All legacy core functionality
- Agency Groups/Subagencies (critical gap)
- MFA + security baseline
- Audit logging
- Monitoring stack (prevent another failure)

**High Value (P1 - Include in MVP):**
- Smart form entry paths (15 fields → 3-4)
- Notification system (user engagement)
- User-focused dashboard
- Email templates
- 20+ UX improvements

**Future Phases (P2-P3 - Post-Launch):**
- DocuSign integration (optional, complex)
- Workflow approvals (only if requested)
- Advanced analytics (validate demand first)

### Breakthrough Insights

**Key Discovery:** "Replacement window opportunity"
- Legacy system completely gone = users expect change
- Can force modern UX improvements without resistance
- But keep workflow familiar (don't change what works)

**Design Philosophy:** "Optional better paths"
- Don't force workflow changes
- Offer improvements users can choose to adopt
- Lead users to better workflows through value

**User Delight Mandate:**
- Goal: "Excited to NDA all day" (not just operational)
- Success metric: User satisfaction, not just functionality

### Action Plans Created

**3 Deliverables Generated:**

1. **Assumptions Validation Doc** (`docs/assumptions-validation-doc.md`)
   - 11 critical questions for customer meeting
   - Three-tier options (legacy / smart improvements / full platform)
   - For stakeholder presentation to customer

2. **Feature Priority Matrix** (`docs/feature-priority-matrix.md`)
   - All features organized by impact vs. effort
   - P0/P1/P2/P3 prioritization
   - Clear cut list (7 major features eliminated)

3. **Phase 1 Build Plan** (`docs/phase-1-build-plan.md`)
   - 8-week implementation timeline
   - Technical architecture decisions
   - Quality gates and success criteria
   - Risk mitigation strategies

---

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Strategic product planning with legacy baseline + prototype comparison

**Recommended Techniques:**

1. **Six Thinking Hats (Structured)** - Multi-perspective analysis
   - Systematically examine legacy requirements, prototype features, and gaps from six distinct viewpoints
   - Ensures comprehensive stakeholder consideration (legal, users, IT, security, business)
   - Expected outcome: Clear perspective matrix on what to keep/cut/add

2. **Question Storming (Deep)** - Root problem discovery
   - Generate critical questions before jumping to solutions
   - Builds on gap analysis to identify unknowns and assumptions
   - Expected outcome: Validated understanding of actual customer problems

3. **SCAMPER Method (Structured)** - Systematic feature enhancement
   - Apply seven innovation lenses to both legacy and prototype features
   - Methodically decide: Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse
   - Expected outcome: Feature-by-feature action plan with clear rationale

**AI Rationale:** This sequence balances comprehensive analysis (Hats), critical thinking (Questions), and actionable refinement (SCAMPER) to reconcile legacy baseline with prototype innovations.

---

## Technique 3: SCAMPER Method - Results

### 🔄 S - SUBSTITUTE (Replace with Better Alternatives)

**Replace "Fill 15 Fields Manually" with THREE intelligent entry paths:**

1. **Company-First Path**
   - Select company → auto-fill company info, address, POCs, typical agency/type
   - User changes only: Purpose, Abbreviated Name, dates
   - 15 fields → 3-4 manual entries

2. **Clone Path**
   - Pick existing NDA → pre-fill everything → change only differences
   - One-click template from previous work
   - 15 fields → 3 actual edits

3. **Agency-First Path**
   - Select agency → suggest common companies/templates/POCs for that agency
   - Contextual suggestions based on agency patterns
   - Cascading intelligence

**Additional Substitutions:**
- Replace dropdown menus → type-ahead search with auto-complete
- Replace static dropdowns → recently used + favorites at top
- Replace 90s RTF → modern PDF generation (validate with customer)

### 🔗 C - COMBINE (Merge Related Features)

**Email Composer embedded in NDA Detail workflow:**
- Instead of: List → Email icon → Separate screen → Back
- Combined: NDA Detail → Email tab → Compose inline → Stay in context
- Reduces context switching

**Decision:** Keep most features separate (don't force unnecessary combinations)

### 🔧 A - ADAPT (Borrow from Other Domains)

**From Social Media (Facebook/Instagram):**
- ✅ Notification system with bell icon + badge count (already captured in Green Hat)

**From Stripe Dashboard:**
- ✅ At-a-glance metric cards on dashboard (active NDAs, expiring soon, avg days to execute)

**From Superhuman (Email):**
- ✅ Keyboard shortcuts for power users (never touch mouse)

**From DocuSign:**
- ✅ Visual progress tracking (Phase 2+ if e-signature adopted)

**Rejected:**
- ❌ Jira-style board view (too gimmicky)
- ❌ Notion saved views (filter presets already cover it)

### 🔧 M - MODIFY (Enhance Existing)

**Already captured in 20 Value-Add Improvements:**
- Smart form intelligence, real-time validation, auto-complete, inline actions, etc.

### 🔄 P - PUT TO OTHER USES (Repurpose Data)

**Leverage existing data for new purposes:**
- Audit logs → notification feed
- Historical NDA data → smart suggestions and field auto-fill
- Agency access data → personalized filter presets

### ❌ E - ELIMINATE (Remove Unnecessary)

**Already captured in Black Hat - 7 Major Cuts:**
- Visual Workflow Editor, External Signing Portal, Clause Library, Advanced Reports, System Config UI, Advanced Notifications, Profile/Settings

### 🔄 R - REVERSE (Work Differently)

**Reverse legacy assumptions:**
- Instead of "create then generate doc" → preview doc FIRST, save if approved
- Instead of "filter then search" → search everything, filter results dynamically
- Instead of "request then wait" → auto-approve low-risk NDAs, route only high-risk

---

## Additional Ideas Generated

**21. Observability & Monitoring Stack:**
- Google Analytics (user behavior, feature usage)
- New Relic/Sentry (error tracking, performance monitoring, uptime alerts)
- Purpose: Proactive issue detection, prevent silent system failures
- Critical given legacy system's catastrophic failure

---

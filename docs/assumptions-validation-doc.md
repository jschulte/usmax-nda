# Assumptions Validation Document - USMax NDA Management System

**For:** Customer validation and requirements confirmation
**Date:** 2025-12-12
**Purpose:** Validate critical assumptions before committing to build

---

## Executive Summary

We are rebuilding your NDA management system following the catastrophic failure of your legacy Windows-based application. We've analyzed the legacy system screenshots and created a modern web-based replacement plan.

**This document contains 11 critical questions** that need answers before we finalize the design and begin development.

---

## Background Context

**What We Know:**
- Legacy system ran on 90s Windows machine that failed
- System data was lost before export could occur
- 8 screenshots document the legacy functionality
- Current operations are down (urgency to replace)

**What We've Created:**
- Reverse-engineered requirements from screenshots
- Gap analysis comparing legacy to modern prototype concepts
- Phased implementation plan (MVP → Enhancements)

**Our Approach:**
- **Phase 1 MVP:** Legacy parity + obvious modern improvements (ship fast)
- **Phase 2+:** Optional enhancements based on your feedback and adoption

---

## TIER 1: Critical Questions - Can't Build Without Answers

**These 6 questions block technical implementation. We need definitive answers.**

### 1. Dropdown Field Values

**Question:** What are the complete allowed values for these dropdown fields?

- **NDA Owner:** (Is it just "USMax" or are there other options?)
- **Type:** (We see examples but need full list)
- **USMax Position:** (We see "Prime" - what others exist? Sub? Teaming Partner?)

**Why critical:** These define database enumerations and validation rules.

---

### 2. Document Format

**Question:** Should we generate RTF or PDF documents?

**Options:**
- **RTF** (legacy format)
  - ✅ Editable in Word before sending
  - ❌ Formatting issues, preview problems, dated technology

- **PDF** (modern format)
  - ✅ Professional, consistent formatting, universal compatibility
  - ❌ Not editable (would need to regenerate if changes needed)

- **Both?** Generate RTF for editing, final as PDF?

**Why critical:** Determines template system architecture and document generation logic.

---

### 3. Email Recipients

**Question:** Who receives the "Review NDA Email"?

- Partner firm Relationship POC?
- Internal routing first (legal review)?
- Multiple recipients (both internal and external)?
- Configurable per NDA type?

**Why critical:** Determines email workflow logic and recipient selection rules.

---

### 4. Status Transitions

**Question:** What are ALL the status values and allowed transitions?

**From screenshots we see:**
- "Created/Pending Release"
- "Fully Executed NDA Uploaded"
- "Inactive"

**Questions:**
- Are there intermediate statuses (In Review, Pending Signature, etc.)?
- What transitions are allowed? (Can you go from Created → Inactive directly?)
- What triggers each status change?

**Why critical:** Defines state machine logic and workflow validation rules.

---

### 5. Template System Scope

**Question:** How many templates exist, and how are they selected?

**Options:**
- One universal template (simple)
- Multiple templates per NDA Type (e.g., Mutual NDA template, One-way template)
- Multiple templates per Agency (e.g., DoD template, Commercial template)
- Combination (Agency + Type selection)

**Why critical:** Determines template management complexity and selection logic.

---

### 6. Archive/Inactive Behavior

**Question:** When an NDA is marked "Inactive", is this:

- **Reversible?** (Can it be reactivated later?)
- **Permanent archive?** (Soft delete, hidden from normal views)
- **Actual deletion?** (Hard delete from database)
- **Retention requirement?** (Must keep for X years even if inactive)

**Why critical:** Determines data model and compliance/audit requirements.

---

### 7. Document Retention Policy

**Question:** What is your required document retention period for NDA records?

**Options:**
- **3 years** (FAR minimum for contractor records)
- **4 years** (FAR requirement for acquisition/supply records)
- **6 years** (FAR requirement for agency records)
- **Longer** (your internal policy)

**Why critical:** FAR Subpart 4.7 requires minimum retention periods. We need to implement appropriate archival vs. deletion policies.

[Source: Research finding - FAR document retention requirements]

---

### 8. CMMC and CUI Handling

**Question:** Do you handle Controlled Unclassified Information (CUI) that would require CMMC Level 2 compliance?

**Context:**
- CMMC 2.0 became mandatory November 10, 2025 for DoD contracts
- If you handle CUI, additional security controls required (110 NIST practices)
- If only handling Federal Contract Information (FCI), CMMC Level 1 sufficient

**Why critical:** Determines security control requirements and potential certification needs.

[Source: Research finding - CMMC regulatory requirements]

---

### 9. Employee-Level NDA Tracking

**Question:** Do you need to track employee-level NDAs per DFARS 252.227-7025?

**Context:**
- DFARS requires support contractors to maintain list of employees under NDAs
- List must include: contract number, employee name, position, hire date, NDA requirement
- Must submit to Contracting Officer upon request

**Question:** Is this applicable to your operations?

**Why critical:** If yes, requires additional data model for employee NDA tracking.

[Source: Research finding - DFARS support contractor requirements]

---

## TIER 2: Important for User Adoption - Scoping Questions

**These 5 questions help us prioritize features and set appropriate expectations.**

### 7. Pain Points with Legacy System

**Question:** What were the top 5 pain points or frustrations with the old system?

**Why ask:** Helps us prioritize which improvements matter most. We don't want to rebuild the same frustrations.

**Examples to prompt thinking:**
- Was it slow?
- Hard to find NDAs?
- Document generation problems?
- Email workflow clunky?
- Access control issues?

---

### 8. What Worked Well (Must Preserve)

**Question:** What did you LIKE about the legacy system that we must keep?

**Why ask:** Identifies "don't mess this up" features that users depend on.

**Example areas:**
- Specific workflows they're comfortable with?
- UI layouts that made sense?
- Features they used constantly?
- Simplicity of certain operations?

---

### 9. Volume & Scale

**Question:** How many NDAs do you process per month/year?

**Why ask:** Determines performance requirements, whether advanced features are justified, and team size.

**Follow-ups:**
- Peak periods (certain times of year busier)?
- Growth expectations (volume increasing/stable/decreasing)?

---

### 10. Cycle Time Baseline

**Question:** On average, how long does an NDA take from initial request to fully executed?

**Why ask:** Establishes baseline for measuring improvement impact.

**Useful to know:**
- Fastest you've ever done: ___ days
- Typical: ___ days
- Slowest/most complex: ___ days
- Main delays caused by: ___

---

### 11. Access Control Complexity

**Question:** How many of each do you have?

- **Users:** ___ total staff using the system
- **Agency Groups:** ___ groups (DoD, Commercial, Healthcare, etc.)
- **Subagencies:** ___ total (how many per group on average?)
- **Admin vs. regular users:** ___ admins, ___ regular users

**Why ask:** Determines UI complexity for access management and performance considerations.

---

## TIER 3: Feature Validation - Show Mockups/Concepts for Reaction

**These 4 concepts represent improvements beyond legacy. We assume "probably yes" but want feedback.**

### 12. Email Templates

**Concept:** Pre-written email templates you can pick from (e.g., "Standard NDA Request", "Research Partnership NDA", "Vendor Access NDA") that auto-fill subject/body, then customize before sending.

**Question:** Would this be valuable, or do you prefer writing emails from scratch each time?

---

### 13. Clone/Duplicate NDA

**Concept:** "Duplicate" button on existing NDAs → copies all info → you change only what's different (company name, dates, purpose) → saves 10+ minutes of re-entry.

**Question:** Do you create similar NDAs often enough that cloning would save time?

---

### 14. Personalized Dashboard

**Concept:** Landing page showing: Your NDAs, Recent activity on NDAs you're following, Your pending tasks, Notifications.

**Question:** Useful "heads-up display", or would you prefer to land directly on the NDA Admin list?

---

### 15. Notification System

**Concept:** Facebook/Instagram-style bell icon with badge count showing: "NDA uploaded", "You were added as POC", "3 NDAs expiring soon", etc.

**Question:** Would real-time notifications keep you informed and engaged, or feel like noise/distraction?

---

## Our Assumptions (We'll Build These Unless You Object)

### Modern UX Improvements
- ✅ Responsive design (works on desktop, tablet, mobile)
- ✅ Type-ahead search instead of long dropdown scrolling
- ✅ Real-time form validation (catch errors before submit)
- ✅ Auto-save drafts (don't lose work)
- ✅ Recently used items at top of dropdowns
- ✅ Keyboard shortcuts for power users
- ✅ Dark mode support
- ✅ Modern, clean UI (professional appearance)

### Technical Decisions
- ✅ Web-based (not Windows desktop app)
- ✅ Cloud-hosted (serverless architecture preferred)
- ✅ MFA required for access (security baseline)
- ✅ Encrypted document storage
- ✅ Comprehensive audit logging
- ✅ Modern tech stack: React 19, TypeScript, serverless backend

### Feature Scope (Phase 1 MVP)
- ✅ All legacy functionality preserved (request, generate, email, upload, history)
- ✅ Agency Groups/Subagencies access control
- ✅ Contacts/user management
- ✅ Document generation and versioning
- ✅ Email composer with templates
- ✅ Centralized audit logs
- ❌ **NOT including:** Visual workflow designer, external signing portal, advanced analytics (Phase 2+)

---

## What We Need From You

**Initial Requirements Meeting:**
- Answers to Tier 1 questions (6 critical technical questions)
- Answers to Tier 2 questions (5 scoping questions)

**Design Review Meeting:**
- Reactions to Tier 3 feature concepts (4 proposed enhancements)
- Feedback on any assumptions listed above

**Timeline:**
- Tier 1 answers unblock development immediately
- Tier 2 answers help us scope appropriately
- Goal: Get you operational as quickly as possible

---

## Three-Tier Implementation Options

We can deliver at three different levels of sophistication:

### Option 1: Core Operations
- Essential legacy functionality
- Agency Groups/Subagencies access control
- NDA request, generation, email, upload workflows
- Modern web-based UI
- Cloud-hosted, secure, MFA-enabled
- **Gets you operational with proven baseline**

### Option 2: Core + Smart Enhancements ⭐ Recommended
- Everything in Option 1
- Plus: Time-saving features (email templates, smart forms, clone NDA, auto-complete, etc.)
- Plus: User engagement features (notifications, personalized dashboard)
- **Significantly improves user experience and daily efficiency**

### Option 3: Full Feature Set
- Everything in Option 2
- Plus: Advanced capabilities (DocuSign integration, workflow approvals, analytics dashboards)
- **Delivered incrementally based on adoption and feedback**

**Our Recommendation:** Option 2 (Core + Smart Enhancements)
- Addresses urgent operational needs
- Significantly improves user experience over legacy
- Provides foundation for future enhancements
- Can be delivered in phases (core first, enhancements follow)

---

**Document prepared by:** Development team based on legacy system analysis and modern requirements gathering.

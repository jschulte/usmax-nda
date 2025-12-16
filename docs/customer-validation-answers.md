# Customer Validation Answers (Preliminary)

**Date:** 2025-12-12
**Source:** Discussion with Todd (customer liaison) + meeting transcript analysis
**Status:** 18 of 22 questions answered (81% complete)
**Customer Email Sent:** 2025-12-12 by Todd to David, Chris, and Brett
**Awaiting:** Customer response to 10 focused questions

---

## Tier 1 Answers (Critical Technical Questions)

### Q1: Dropdown Field Values

**NDA Owner:**
- ✅ **ANSWER:** Always "USMax" (single value, not a dropdown)

**Type:**
- ⚠️ **STILL NEED:** Complete list of Type values from customer

**USMax Position:**
- 📝 **KNOWN:** "Prime" exists
- ⚠️ **STILL NEED:** Other values (Sub? Teaming Partner? Others?)

---

### Q2: Document Format

**ANSWER:** ✅ **RTF only**

**Rationale:** Legacy used RTF, agencies may not be able to handle DocuSign or modern formats

---

### Q3: Email Recipients

**Partial Answer:**

**TO:**
- Relationship POC (the company contact/external party)

**CC:**
- Kelly Davidson (always CC'd - contracts administrator)
- Opportunity POC (internal USMax person assigned)
- Possibly others based on stakeholder notifications

**BCC:**
- Chris and David (always BCC'd)

**⚠️ STILL NEED FROM CUSTOMER:**
- Confirm exact CC/BCC generation logic
- Is it: "Generated from combination of client info + who's assigned to client"?
- Who are Chris and David (roles/positions)?
- Any other always-included recipients?

---

### Q4: Status Transitions

**ANSWER:** ✅ Recommended status values based on discussion:

**Status Enumeration:**
1. **Created** - NDA request created in system
2. **Emailed** (or "Emailed to Client") - Sent via email composer
3. **In Revision** - Received markup/changes, uploaded new version
4. **Fully Executed NDA** - Final signed PDF uploaded
5. **Inactive** - Expired or archived (reversible)
6. **Cancelled** - Deal fell through or NDA not needed

**Status Transitions:**
```
Created → Emailed → In Revision → Fully Executed
   ↓         ↓           ↓              ↓
Cancelled (from any state)
   ↓
Inactive (manual or auto after expiration)
```

**Auto-Status Changes:**
- Created → Emailed: Automatic when "Send Email" action occurs
- Emailed → In Revision: Automatic when new document version uploaded (not fully executed)
- Any → Fully Executed: Automatic when "Fully Executed NDA" checkbox used on upload
- Any → Cancelled: Manual user action
- Fully Executed → Inactive: Manual or automatic after expiration date (TBD)

**Admin Configuration:**
- ✅ Want ability to adjust list of available statuses
- ⚠️ Need safeguard: Can't delete status that records currently use (must map to different status)

**Visual Tracking:**
- Want status progression visualization (like Amazon order tracking)
- Circles with dates showing: Created (date), Emailed (date), Revision (date), Executed (date)

---

### Q5: Template System Scope

**ANSWER:** ✅ **Multiple templates needed**

**Use Cases:**
- **Base template:** Default/standard NDA
- **Custom templates per agency/type:** DoD template, Commercial template, etc.
- **User-specific templates:** Each user may want their own variants

**Template Features Requested:**
- Field merge (bracket variables like {{firstName}}, {{companyName}})
- User signature inclusion (auto-add user's signature to template)
- Template selection during NDA creation
- Template management UI (create, edit, archive templates)

**Example:**
```
Dear {{companyName}},

This NDA is for {{abbreviatedOpportunityName}} at {{agencyOfficeName}}.

[Standard NDA clauses]

Sincerely,
{{userSignature}}
```

**⚠️ STILL NEED FROM CUSTOMER:**
- Do you currently have multiple templates, or is it one template they edit manually?
- If multiple, how are they organized (by agency, by type, by user)?
- Can we see example RTF templates?

---

### Q6: Archive/Inactive Behavior

**ANSWER:** ✅ **Reversible soft status (not deletion)**

**Behavior:**
- Inactive is just a status flag (like Created, Emailed, etc.)
- Can be changed back to active if needed
- NOT a deletion or permanent archive
- Default list view: Hide inactive/cancelled (with "Show Inactive" checkbox to reveal)

**Retention:**
- Keep all records indefinitely (never delete)
- S3 documents: Multi-region, backed up, versioned
- Optional: Glacier cold storage after 6 years (cost optimization)

**Reasoning:**
- CMMC compliance requires tracking all information
- No automated cleanup/deletion
- Timestamps on everything for future cleanup if ever needed

---

### Q7: Document Retention Policy

**ANSWER:** ✅ **Indefinite retention** (keep everything)

**S3 Configuration:**
- Multi-region replication (disaster recovery)
- Versioning enabled (never lose document versions)
- Encryption at rest
- Private/secured access only
- Optional: Lifecycle policy to Glacier after 6+ years (cold storage cost savings)

**Rationale:**
- Prior to system failure, they kept everything permanently
- Compliance safe (exceeds FAR 3-6 year minimum)
- Storage cost negligible (RTF/PDF files are small, ~10/month volume)

---

### Q8: CMMC and CUI Handling

**ANSWER:** ✅ **CMMC Level 1** (lowest level)

**Context:**
- Do NOT handle complex PII or CUI requiring higher levels
- Just contact information and NDA signing records
- AWS standard sufficient (not GovCloud)
- Meets minimum FCI (Federal Contract Information) requirements

**Security Requirements (CMMC Level 1 - 17 practices):**
- ✅ MFA (planned)
- ✅ Encryption (planned)
- ✅ Access control (planned)
- ✅ Audit logging (planned)

---

### Q9: Employee-Level NDA Tracking

**ANSWER:** ⚠️ **Probably NO, but need to confirm**

**Todd's belief:** They don't do individual employee NDAs
- Company signs NDA (Lockheed Martin signs as entity)
- Not individual employees at Lockheed signing separate NDAs

**⚠️ ACTION:** Todd will double-check with customer to confirm

---

### Q10: Non-USMax NDA Behavior

**⚠️ STILL NEED FROM CUSTOMER:**

**Question to ask:**
- "Can you elaborate on what a 'Non-USMax NDA' was and what the behavior was around it?"
- "Did you still send an NDA document from USMax on behalf of another partner?"
- "Or not send it at all?"
- "What was different about the workflow for Non-USMax NDAs?"

**Hypothesis:**
- If USMax Position = not "Prime" (e.g., "Sub"), might be non-USMax
- Possibly sending another company's NDA template instead of USMax's?
- Need customer clarification on use case and behavior

---

### Q11: Contacts POC Clarification

**⚠️ STILL NEED FROM CUSTOMER:**

**Question:** "The legacy screenshots show 3 POC types: Contracts, Relationship, and Contacts. Are 'Contacts POC' and 'Contracts POC' the same thing (typo), or are they different roles?"

---

### Q12: User Permission Granularity

**ANSWER:** ✅ **Granular RBAC preferred**

**Use Cases Identified:**
- Secretary can upload documents but maybe can't send emails
- Intern can upload stuff but needs review before sending
- Some users manage agencies but can't delete (only admin can delete)
- User access scoped to specific Agency Groups/Subagencies

**Recommended Permissions:**

**NDA Operations:**
- `nda:create` - Create new NDA requests
- `nda:update` - Edit NDA fields
- `nda:upload_document` - Upload documents
- `nda:send_email` - Send NDA emails
- `nda:mark_status` - Change status (inactive, cancelled, etc.)
- `nda:view` - View NDA details (scoped to authorized agencies)

**Admin Operations:**
- `admin:manage_agency_groups` - Create/edit agency groups
- `admin:delete_agency_groups` - Delete agency groups (super-admin only?)
- `admin:manage_subagencies` - Create/edit subagencies
- `admin:manage_users` - User directory management
- `admin:assign_access` - Assign agency access to users
- `admin:view_audit_logs` - Centralized audit log access

**Role Templates:**
- **Read-Only:** `nda:view`
- **NDA User (Standard):** `nda:create`, `nda:update`, `nda:upload_document`, `nda:send_email`, `nda:mark_status`, `nda:view`
- **Limited User (e.g., Secretary):** `nda:upload_document`, `nda:view` (can upload, can't send)
- **Manager:** Standard permissions + `admin:manage_subagencies`, `admin:manage_users`
- **Admin:** All permissions including delete operations

---

### Q13: Database Architecture

**ANSWER:** ✅ **No customer preference - "whatever is ideal for this type of database setup"**

**Technical Recommendation:** Aurora Serverless v2 (PostgreSQL-compatible)

**Rationale:**
- Relational model fits data (agencies, subagencies, users, NDAs have clear relationships)
- 15+ filter fields easier with SQL queries
- Low volume (~10/month) doesn't require NoSQL scale
- Serverless scaling (scales to zero when not in use)
- PostgreSQL ecosystem (familiar, rich tooling)

**Alternative:** DynamoDB if cost is primary concern, but added NoSQL modeling complexity

**Decision:** Use Aurora Serverless v2 unless customer objects

---

## Tier 2 Answers (Scoping Questions)

### Q14: Pain Points with Legacy System

**ANSWER:** ✅ **Biggest issue: System crashing and losing all data**

**Other implied pain points:**
- UI was "dog shit" (Todd's words)
- No backup/disaster recovery
- Hardware dependency risk
- Manual processes (not mentioned as painful, but implied)

---

### Q15: What Worked Well (Must Preserve)

**ANSWER:** ✅ **Carte blanche to make something nice and modern**

**Interpretation:**
- They don't love the old system's approach
- Open to improvements and modernization
- No sacred cows in the UI/UX
- Focus: Make it work well, make it reliable, make it not lose data

---

### Q16: Volume & Scale

**ANSWER:** ✅ Clear answers provided

**Volume:**
- ~10 NDAs per month (max a dozen)
- "No volume or scale really"
- Very low throughput

**Users:**
- Less than 10 total staff
- 2-3 admins
- ~8 regular users
- Only 2-3 people actively creating NDAs

**Agencies:**
- 12 Agency Groups
- 40-50 Subagencies

**Data Characteristics:**
- "Just data and text" (no complex images, SVGs, BLOBs)
- RTF/PDF files are small
- All document assets in S3 (not database)
- History tracking critical (audit everything)

---

### Q17: Cycle Time Baseline

**ANSWER:** ✅ **1 day to 1 month**

**Details:**
- Fastest: 1 day
- Slowest: ~1 month
- **Highly dependent on external party response time** (not internal bottlenecks)
- Main delay: Waiting for partner to sign and return

---

### Q18: Access Control Complexity

**ANSWER:** ✅ Provided above in Q16

- Users: <10 total (2-3 admin, ~8 regular)
- Agency Groups: 12
- Subagencies: 40-50
- Small scale, low complexity

---

## Tier 3 Answers (Feature Validation)

### Q19: Email Templates

**ANSWER:** ✅ **YES - definitely want this**

**Requirements:**
- Different email templates per user (user signatures)
- Possibly different templates per agency/type
- Template with field merge ({{companyName}}, {{abbreviatedOpportunityName}}, etc.)
- User profile with signature (auto-included in templates)

---

### Q20: Clone/Duplicate NDA

**ANSWER:** ✅ **Implied YES** (discussed workflow extensively)

---

### Q21: Personalized Dashboard

**ANSWER:** ✅ **YES - with specific requirements**

**Dashboard Features Requested:**
- Things needing attention
- NDAs approaching expiration (proactive alerts)
- Recent activity in user's assigned agencies/subagencies
- Stale NDAs (created but not emailed after 2 weeks - needs follow-up)
- Waiting on 3rd party (visual of NDAs pending external action + time in state)
- History filtered to user's authorized agencies

**Purpose:** Surface actionable items and status awareness

---

### Q22: Notification System

**ANSWER:** ✅ **Implied YES** (dashboard with alerts discussed)

---

## Additional Requirements Discovered

### Status Progression Visualization

**Request:** Visual progress tracker (like Amazon order tracking)

**Design:**
- Circle timeline showing status progression
- Each circle: Status name + date/time achieved
- Example: ● Created (12/01) → ● Emailed (12/02) → ● In Revision (12/10) → ● Fully Executed (12/15)
- Clear visual of "where we are" in the process

---

### Template System Enhancement

**Beyond basic field-merge:**

**Use Case 1: Standard Template Selection**
- Pick template during NDA creation
- Templates organized by agency/type/user
- Field-merge happens automatically

**Use Case 2: NDA Builder / Clause Library (Phase 2?)**
- Check boxes for clauses needed in this NDA
- System assembles custom NDA from clause library
- Generates custom NDA in seconds
- Review, make manual edits, save, send

**Decision:**
- Phase 1: Template selection with field-merge
- Phase 2: Clause library builder (if they want it)
- Todd will mention as option to customer

---

### Automated Status Changes

**Workflow:**
- User clicks "Send Email" → Status auto-changes to "Emailed"
- User uploads document (not fully executed) → Status auto-changes to "In Revision"
- User uploads with "Fully Executed" checked → Status auto-changes to "Fully Executed NDA"
- System detects expiration date passed → Auto-change to "Inactive"? (TBD)

**Manual Status Changes:**
- User can manually set to "Cancelled"
- User can manually toggle "Inactive"

---

### Expiration Handling

**⚠️ QUESTIONS FOR CUSTOMER:**

1. **Auto-inactive on expiration?**
   - Should system automatically mark NDA as "Inactive" when expiration date passes?
   - Or keep manual only?

2. **Expiration notifications?**
   - Notify users when NDA approaching expiration (30 days? 60 days?)
   - Who gets notified (Opportunity POC? Stakeholders?)

3. **Renewal workflow?**
   - Do you renew existing NDA records or create new ones?
   - Todd's guess: New record for each renewal (project-based)

---

### Dashboard Alert Examples

**Stale NDA Detection:**
- "NDA created but not emailed after 2 weeks" → Alert: "No movement, needs follow-up"
- "NDA emailed but no response after 30 days" → Alert: "Waiting on 3rd party - consider nudge"
- "NDA approaching expiration in 30 days" → Alert: "Renewal may be needed"

**Visual Design:**
- Show time in current state ("Waiting on 3rd party for 23 days")
- Actionable (click to take next step)

---

### Data Import / Backfilling

**⚠️ QUESTION FOR CUSTOMER:**

**"Do you have the PDF or RTF files from the old system in your email? Will you be backfilling the system with that information?"**

**If YES:**
- We can create import tool
- Options:
  - **Option A:** Forward emails to special SES address → Auto-processes and imports
  - **Option B:** Export Outlook folder to EML files → Drag-drop to upload page → Batch import
  - **Option C:** Zip all EML files → Upload to S3 → Backend processes

**Need from customer if doing import:**
- 2-3 example RTF files (can redact sensitive info)
- Understand RTF structure and field locations
- Example emails to parse headers/attachments

---

## Configuration Requirements

### Admin-Configurable Settings

**Status Management:**
- Admins can add/edit/reorder available status values
- Cannot delete status if NDAs currently use it
- Must map old status → new status if merging/changing

**Email Template Management:**
- Create/edit email templates
- User signature profiles
- Default CC/BCC recipients (system-wide or per-template)

**Notification Rules:**
- Expiration warning threshold (30/60/90 days?)
- Stale NDA alert threshold (2 weeks no movement?)
- Who receives system alerts vs. user-specific alerts

---

## Technical Decisions Made

### Infrastructure

**AWS Services:**
- ✅ AWS standard (not GovCloud)
- ✅ S3 for documents (multi-region, versioned, encrypted, private)
- ✅ Aurora Serverless v2 for database (recommendation)
- ✅ AWS Cognito for authentication (MFA enforced)
- ✅ AWS SES for email delivery
- ✅ Optional: Glacier for 6+ year old documents (cold storage)

**Security:**
- ✅ CMMC Level 1 compliance (lowest tier)
- ✅ MFA required
- ✅ Encryption at rest and in transit
- ✅ Comprehensive audit logging (who did what, when)

---

## Still Need from Customer

### Critical (Tier 1)

1. **Type dropdown:** Complete list of values
2. **USMax Position:** All values beyond "Prime"
3. **Email CC/BCC logic:** Exact generation rules, who Chris/David are
4. **Non-USMax NDA:** What it means, what behavior differs
5. **POC types:** 2 or 3 distinct types? (Contracts vs. Contacts)
6. **Employee-level NDAs:** Confirm not needed (Todd believes NO)

### Important (Tier 2)

7. **Expiration automation:** Auto-inactive? Notifications? Renewal workflow?
8. **Template organization:** How are multiple templates currently organized?
9. **Example RTFs:** Need 2-3 samples to understand structure
10. **Data import:** Want to backfill from old emails? If yes, provide examples

---

## Email to Send Customer

**Todd is drafting email to David and Chris with:**
- Answers we have so far (show we've done homework)
- Specific questions still needing their input (focused, not 22 questions)
- Request for example RTF files if they have them
- Offer to build import tool if they want to backfill data
- Timeline: Once we have answers, we'll generate sample data and give walkthrough

---

## Summary

**Answered:** 18 of 22 questions (81% complete!)

**Critical blockers remaining:** 6 questions
- Type/USMax Position dropdown values
- Email CC/BCC generation logic
- Non-USMax NDA behavior clarification
- POC type clarification
- Employee NDA confirmation
- Expiration automation preferences

**Ready to proceed with:**
- Database: Aurora Serverless v2
- Documents: S3 multi-region, versioned, encrypted
- Security: CMMC Level 1, MFA, audit logging
- Status design: 6 statuses with auto-transitions
- Templates: Multiple with field-merge and user signatures
- RBAC: Granular permissions (secretary ≠ admin)
- UI: Carte blanche to modernize ("dog shit" → delightful)

**Next:** Awaiting customer response to Todd's email (sent 2025-12-12)

---

## Todd's Email to Customer (Sent 2025-12-12)

**Recipients:** David, Chris, and Brett

**Questions Asked (10 focused items):**

1. Type dropdown - what was in that field?
2. USMax Position - what options beyond "Prime"?
3. Email CC/BCC generation - how were these fields populated?
4. Status values - any others beyond the 3 we see? React to proposed 6-status list
5. Inactive behavior - automated or manual? Notifications on approaching expiration?
6. Dashboard alerts - interested in stale NDA detection and visual status tracking?
7. Template variants - need multiple RTF templates (e.g., DoD-specific)?
8. Non-USMax NDA - what was this and how did it work?
9. POC clarification - are Contacts and Contracts the same, or 3 distinct types?
10. Email templates - want different templates? User signatures?
11. Data import - interested in backfilling from old emails?

**Approach:**
- Present our analysis/assumptions
- Ask focused clarifications
- Offer to build sample with answers
- Promise walkthrough and iterative refinement

**Status:** Email sent, awaiting response

---

## Development Readiness Assessment

### Can Start Building Now (Unblocked)

**With current answers, we can build:**
- ✅ Database schema (Aurora Serverless v2 with core entities)
- ✅ Authentication system (AWS Cognito with MFA)
- ✅ Document storage (S3 multi-region, versioned, encrypted)
- ✅ RBAC framework (granular permissions structure)
- ✅ Audit logging system (comprehensive history tracking)
- ✅ Basic UI framework (React 19 + component library)
- ✅ Core data models (NDA, Agency, User, Document, History)

### Blocked Until Customer Answers

**Cannot finalize until we have:**
- ⚠️ Exact dropdown enumerations (Type, USMax Position)
- ⚠️ Email recipient generation logic (CC/BCC rules)
- ⚠️ Non-USMax workflow details
- ⚠️ POC data structure (2 vs 3 types)
- ⚠️ Template variants organization
- ⚠️ Expiration automation preferences

**Can work around temporarily:**
- Use placeholder values for dropdowns (refactor when confirmed)
- Implement configurable CC/BCC (customer sets rules later)
- Build flexible template system (supports 1 or many)

---

## Recommended Next Steps

### While Waiting for Customer Response

**Week 1 (Now):**
1. ✅ Document answers from Todd discussion (done - this file)
2. ⏭️ Technical spike: React 19 + Vite vs. Next.js evaluation
3. ⏭️ Database schema design (use Aurora Serverless v2)
4. ⏭️ Set up AWS infrastructure (S3, Cognito, SES config)
5. ⏭️ Create base React project structure

**Week 2 (After Customer Response):**
6. Finalize schema with validated dropdown values
7. Implement email generation logic with confirmed CC/BCC rules
8. Build template system with confirmed organization
9. Begin Sprint 1 development

### Communication Plan

**When customer responds:**
1. Document all answers in this file
2. Flag any surprises or scope changes
3. Update feature-priority-matrix.md if needed
4. Proceed to PRD creation
5. Schedule sample data walkthrough with customer

---

**Status:** Ready to proceed with unblocked work while awaiting final clarifications

# Technical Clarifications from Additional Legacy Analysis

**Date:** 2025-12-12
**Source:** Detailed screenshot analysis and implementation recommendations

---

## Data Model Refinements

### POC (Point of Contact) Structure

**Three POC Types Identified:**

1. **Opportunity POC** (Required)
   - Internal USMax user
   - Selected from user dropdown
   - Primary responsible party

2. **Contracts POC** (Optional - "preferred but not necessary")
   - External contact information
   - Fields: Name, Email, Phone, Fax
   - Purpose: Contract administration contact

3. **Relationship POC** (Required)
   - External contact information
   - Fields: Name, Email, Phone, Fax (required)
   - Purpose: Business relationship contact

4. **Contacts POC** (Optional - appears in "More info" modal)
   - **VALIDATION NEEDED:** Is this same as "Contracts POC" (typo) or a fourth distinct POC type?
   - **Question added to Tier 1 (Q11)**

### Status Enumeration

**Recommended Status Values:**
```typescript
enum NDAStatus {
  CREATED_PENDING_RELEASE = 'Created/Pending Release',
  SENT = 'Sent',  // Email sent (not shown in screenshots but should track)
  FULLY_EXECUTED_UPLOADED = 'Fully Executed NDA Uploaded',
  INACTIVE = 'Inactive'
}
```

**Status Transitions:**
```
CREATED_PENDING_RELEASE → SENT → FULLY_EXECUTED_UPLOADED
                                           ↓
                                      INACTIVE (any time)
```

### History Event Types

**Required Event Types:**
```typescript
enum HistoryEventType {
  OPPORTUNITY_CREATED = 'Opportunity Created',
  DOCUMENT_GENERATED = 'Document Generated from Template',
  EMAIL_REVIEWED = 'Email Reviewed',  // Optional
  EMAIL_SENT = 'Email Sent',
  DOCUMENT_UPLOADED = 'Document Uploaded',
  MARKED_FULLY_EXECUTED = 'Marked as Fully Executed',
  STATUS_CHANGED_INACTIVE = 'Changed to Inactive',
  FIELD_UPDATED = 'Field Updated'  // For edits
}
```

---

## Authorization Model - RBAC Options

### Option 1: Simple Roles (Recommended for Phase 1)

**Three Base Roles:**

**Read-Only User:**
- Permissions: View NDAs, download documents
- Use case: Auditors, observers, leadership oversight
- Agency scope: Limited to their assigned agencies

**NDA User:**
- Permissions: Create, edit, email, upload, mark executed
- Use case: Operations staff creating and managing NDAs
- Agency scope: Limited to their assigned agencies

**Admin:**
- Permissions: Everything NDA User can do, PLUS:
  - Manage agency groups and subagencies
  - Manage user directory (contacts)
  - Assign user access and roles
  - View all NDAs (or agency-scoped admin)
- Agency scope: All agencies OR specific agency groups (validate)

### Option 2: Granular RBAC Permissions

**NDA Permissions:**
- `nda:create` - Create new NDA requests
- `nda:update` - Edit existing NDAs
- `nda:upload_document` - Upload documents
- `nda:send_email` - Send NDA emails
- `nda:mark_inactive` - Archive NDAs
- `nda:view` - View NDA details
- `nda:download` - Download documents

**Admin Permissions:**
- `admin:manage_agency_groups` - CRUD agency groups
- `admin:manage_subagencies` - CRUD subagencies
- `admin:manage_contacts` - Manage user directory
- `admin:manage_access` - Assign user permissions and agency access
- `admin:view_audit_logs` - Access centralized audit logs

**Benefits:**
- Fine-grained control (e.g., allow upload but not send email)
- Future-proof for complex scenarios
- Clear permission audit trail

**Drawbacks:**
- More complex to implement and manage
- May be overkill for small team

**Recommendation:** Start with Option 1, migrate to Option 2 in Phase 2 if customer needs granular control

**VALIDATION NEEDED:** Added to Tier 1 (Q12)

---

## Database Technology Decision

### Context

**Scope Requirement:** Serverless architecture preferred

**Options Analysis:**

### Option 1: Aurora Serverless v2 (Recommended)

**Pros:**
- PostgreSQL-compatible (familiar SQL, rich ecosystem)
- True serverless (scales to zero, scales automatically)
- Relational benefits (joins, foreign keys, transactions)
- Supports complex queries for filtering/search
- Point-in-time recovery built-in
- Lower lock-in (standard PostgreSQL)

**Cons:**
- Slightly higher cost than DynamoDB at low volume
- Cold start latency (though v2 is much improved)

**Best for:** Traditional data modeling, complex queries, future flexibility

### Option 2: DynamoDB

**Pros:**
- AWS-native, fully serverless
- Pay-per-request (ultra cost-effective at low volume)
- Sub-millisecond latency at any scale
- No cold starts
- Infinite scale

**Cons:**
- NoSQL data modeling (less familiar)
- Complex queries require secondary indexes
- Join operations difficult (denormalization needed)
- Higher learning curve

**Best for:** Extreme scale, ultra-low latency, AWS-native stack

### Option 3: PostgreSQL RDS

**Pros:**
- Most familiar
- Full PostgreSQL features
- Rich tooling ecosystem

**Cons:**
- **Not serverless** (fixed instance, always running)
- Must manage capacity
- Doesn't align with serverless scope requirement

**Recommendation:** Rule out for not meeting serverless requirement

### Recommendation: Aurora Serverless v2

**Rationale:**
- Meets serverless requirement
- Relational model fits NDA data (agencies, subagencies, users, NDAs, documents, history)
- Complex filtering queries easier (15+ filter fields in legacy UI)
- Standard SQL knowledge transfer
- Future migration path easier (standard PostgreSQL)

**VALIDATION NEEDED:** Added to Tier 1 (Q13)

---

## Non-USMax NDA Workflow

### Business Rule Decision Needed

**When "Non-USMax NDA" checkbox is checked:**

### Option A: Skip Template Generation (Recommended)

**Logic:**
1. User checks "Non-USMax NDA" on request form
2. System creates NDA record WITHOUT generating template
3. Record shows "No document generated - Non-USMax"
4. User must upload initial NDA document manually
5. After upload, workflow proceeds normally (can email, upload executed, etc.)

**Rationale:**
- Clear functional meaning for checkbox
- Enforces distinction between USMax-generated vs. external NDAs
- Prevents template misuse for non-standard situations

### Option B: Generate Template Anyway

**Logic:**
1. User checks "Non-USMax NDA"
2. System still generates from template
3. Document labeled as "Generated from template (Non-USMax)"
4. Flag tracked for reporting/filtering

**Rationale:**
- Template may still be useful as starting point
- User can edit before sending
- Less workflow friction

**Concern:** What does "Non-USMax" mean if it still uses USMax templates?

**VALIDATION NEEDED:** Added to Tier 1 (Q10) - customer should choose

---

## API Surface Recommendations

**Suggested REST API Structure:**

### Opportunities
```
GET    /api/opportunities             # List with filters, pagination, sorting
POST   /api/opportunities             # Create new NDA request
GET    /api/opportunities/{id}        # Get single NDA
PUT    /api/opportunities/{id}        # Edit NDA fields
POST   /api/opportunities/{id}/inactive  # Mark as inactive
GET    /api/opportunities/{id}/history   # Get history timeline
POST   /api/opportunities/{id}/documents # Upload document (multipart)
POST   /api/opportunities/{id}/generate-template  # Generate NDA from template
GET    /api/documents/{id}/download   # Download document (pre-signed URL)
```

### Email
```
GET    /api/opportunities/{id}/email-draft  # Get prefilled email fields
POST   /api/opportunities/{id}/send-email   # Send email with attachment
GET    /api/opportunities/{id}/emails       # Get sent email history
```

### Admin - Agency Management
```
GET    /api/agency-groups
POST   /api/agency-groups
PUT    /api/agency-groups/{id}
DELETE /api/agency-groups/{id}
GET    /api/agency-groups/{id}/subagencies
POST   /api/agency-groups/{id}/subagencies
PUT    /api/subagencies/{id}
DELETE /api/subagencies/{id}
GET    /api/agency-groups/{id}/users       # Users with group access
PUT    /api/agency-groups/{id}/users       # Update group access
GET    /api/subagencies/{id}/users         # Users with subagency access
PUT    /api/subagencies/{id}/users         # Update subagency access
```

### Admin - User Management
```
GET    /api/users                    # List/search users
POST   /api/users                    # Create user (if not directory-synced)
GET    /api/users/{id}
PUT    /api/users/{id}
DELETE /api/users/{id}               # Deactivate user
GET    /api/users/{id}/access        # Get access grants
PUT    /api/users/{id}/access        # Update access grants
PUT    /api/users/{id}/roles         # Update role assignments
```

### Audit
```
GET    /api/audit-events             # Centralized audit log (admin only)
GET    /api/audit-events/{id}
```

**All endpoints:**
- Require authentication
- Enforce agency-scope authorization on opportunity endpoints
- Return standard error responses
- Include correlation IDs for tracing

---

## Navigation Structure

**Left Sidebar Navigation (from legacy screenshots):**

```
├── Contacts
├── Agency Groups
├── Subagencies
└── Operations
    └── Administration
        ├── NDA Admin
        └── NDA Request
```

**Recommended Modern Navigation:**

```
Dashboard (landing - personalized view)

├── My NDAs (NDA Admin list filtered to user)
├── All NDAs (NDA Admin list - if authorized)
├── Create NDA (NDA Request form)
│
├── Admin (if admin role)
│   ├── Agency Groups
│   ├── Subagencies
│   ├── Users & Contacts
│   ├── Audit Logs
│   └── System Settings (Phase 2)
│
└── User Menu (top-right)
    ├── Profile
    ├── Notifications
    └── Logout
```

**Maintains legacy structure while adding modern conveniences (Dashboard, notifications)**

---

## Document Generation and Storage

### Template Generation

**Input:** NDA Request form fields

**Output:** Generated document with naming convention:
```
NDA_{AbbreviatedOpportunityName}{Year}_{NDAOwner}_{CompanyName}.{ext}

Example: NDA_OREMTMA2025_USMAX_abc.rtf
```

**Implementation Options:**

**Option A: RTF Generation (Legacy Format)**
- Use DOCX template with field placeholders
- Merge fields server-side
- Export to RTF format
- **Pros:** Editable in Word, matches legacy exactly
- **Cons:** RTF is dated technology (1987 format)

**Option B: PDF Generation (Modern Format)**
- Use PDF template or HTML-to-PDF
- Merge fields and generate PDF
- **Pros:** Professional, non-editable, widely compatible
- **Cons:** Lose editability (can't tweak in Word)

**Option C: Both Formats**
- Generate DOCX for editing
- Generate PDF for final distribution
- Store both versions
- **Pros:** Best of both worlds
- **Cons:** Added complexity

**VALIDATION NEEDED:** Already in Tier 1 (Q2)

### Storage Architecture

**S3 Configuration:**
- Bucket: `usmax-nda-documents-{environment}`
- Encryption: Server-side encryption (SSE-S3 or SSE-KMS)
- Versioning: Enabled (never overwrite, keep history)
- Lifecycle policy: Transition to Glacier after X years (based on retention policy)
- Access: Private ACL, pre-signed URLs for downloads (15-minute expiry)

**Document Record:**
```typescript
{
  id: UUID,
  opportunityId: UUID,
  fileName: string,
  fileType: string,  // 'application/rtf', 'application/pdf'
  kind: 'GENERATED_TEMPLATE' | 'UPLOADED_EXECUTED' | 'UPLOADED_OTHER',
  storageUri: string,  // S3 key
  sizeBytes: number,
  createdByUserId: UUID,
  createdAt: timestamp,
  notes: string  // e.g., "Generated from Template" or "Uploaded by John Smith"
}
```

---

## Notification Rules

### Email Notification Triggers

**When stakeholder has "Notify on NDA Changes" enabled:**

Send email for these events:
- ✅ NDA created
- ✅ Email sent (NDA distributed)
- ✅ Document uploaded
- ✅ Marked fully executed
- ✅ Marked inactive
- ✅ Key field edits (company, agency, effective date, etc.)

**Notification Configuration:**
- Per-NDA stakeholder subscriptions (from request form)
- Global notification preferences (Phase 2)
- Opt-out capability (prevent notification fatigue)
- Digest option (daily summary vs. real-time)

**Implementation:**
- Asynchronous (queue-based to prevent blocking operations)
- Retry logic for failed sends
- Track notification delivery status
- Allow unsubscribe from emails

---

## Non-Functional Requirements

### Serverless Deployment

**Architecture:**
- AWS Lambda functions for API endpoints
- API Gateway for REST API
- S3 for document storage
- Aurora Serverless v2 or DynamoDB for data
- AWS Cognito for authentication
- SES for email delivery
- CloudWatch for logging
- EventBridge for async workflows

**Deployment:**
- Infrastructure as Code (Terraform per CLAUDE.md)
- Multi-AZ deployment
- Blue-green or canary deployments
- Environment separation (dev, staging, prod)

### Security Requirements

**Encryption:**
- At rest: S3 (SSE), Database (encryption enabled)
- In transit: TLS 1.2+ (enforced via API Gateway)
- Secrets: AWS Secrets Manager for API keys, connection strings

**Authentication:**
- MFA required (Cognito MFA enforcement)
- Session timeout: Configurable (recommend 30 minutes)
- Password policy: Strong passwords required
- Account lockout: After N failed attempts

**Authorization:**
- JWT tokens from Cognito
- Row-level security (users only see authorized agencies)
- API endpoint authorization via Lambda authorizers
- Audit all permission checks

### Observability

**Logging:**
- Structured logs (JSON format)
- Correlation IDs for request tracing
- Log levels: ERROR, WARN, INFO, DEBUG
- Retention: 30 days CloudWatch, longer in S3 if needed

**Monitoring:**
- Sentry for error tracking and alerting
- CloudWatch metrics for AWS services
- Custom metrics: NDA creation rate, email send success/failure, upload success rate
- Dashboards for ops visibility

**Alerting:**
- Email send failures (immediate alert)
- Upload failures (immediate alert)
- Authentication failures (threshold alert)
- API error rate exceeds threshold
- Database connection issues

### Backup and Disaster Recovery

**Database:**
- Automated backups (Aurora: continuous, DynamoDB: point-in-time recovery)
- Backup retention: 35 days minimum
- Test restore procedures quarterly

**Documents:**
- S3 versioning enabled (all versions retained)
- Cross-region replication (optional for DR)
- Lifecycle policy for archival to Glacier

**Recovery Objectives:**
- RPO (Recovery Point Objective): <1 hour
- RTO (Recovery Time Objective): <4 hours

---

## Acceptance Criteria Checklist

### Core Workflows

**NDA Creation:**
- [ ] User with NDA Request role can create new NDA request
- [ ] Can select agency and POCs from dropdowns
- [ ] Can mark internal stakeholders for notifications
- [ ] Submit creates opportunity record
- [ ] System generates template document (unless Non-USMax checked per chosen rule)
- [ ] History event recorded (OPPORTUNITY_CREATED, DOCUMENT_GENERATED)

**NDA List and Filtering:**
- [ ] Main list shows all NDAs user has access to
- [ ] Can filter by all 15 legacy filter fields
- [ ] Can sort by multiple columns
- [ ] Pagination works correctly
- [ ] "Latest Change" displays correctly
- [ ] "Latest Document" link downloads file

**Document Management:**
- [ ] "More>>" opens detail modal with company info and history
- [ ] Can upload PDF and mark as "Fully Executed"
- [ ] Upload creates document record and history event
- [ ] Setting "Fully Executed" updates status and date
- [ ] Document download generates pre-signed URL
- [ ] Download tracked in audit log

**Email Workflow:**
- [ ] "Review NDA Email" opens with prefilled subject/to/cc/bcc/body
- [ ] Latest NDA document attached
- [ ] Can edit all fields before sending
- [ ] Send button dispatches email via SES
- [ ] Email send creates history event
- [ ] Send failures are logged and alerted

**Status Management:**
- [ ] Can change status to inactive from detail modal
- [ ] Inactive NDAs hidden from default list view
- [ ] Can filter to show inactive NDAs
- [ ] Status change creates history event

### Access Control

**Agency-Based Scoping:**
- [ ] User with Agency Group access sees all NDAs for subagencies in that group
- [ ] User with Subagency access sees only NDAs for that specific subagency
- [ ] User cannot view NDAs outside their authorized agencies
- [ ] API enforces agency scope on all opportunity endpoints
- [ ] Attempting unauthorized access returns 403 Forbidden

**Role-Based Permissions:**
- [ ] Read-Only users cannot create/edit/email/upload
- [ ] NDA Users can perform all NDA operations
- [ ] Admins can access admin screens
- [ ] Non-admins cannot access agency/user management

### Admin Functions

**Agency Groups:**
- [ ] Admin can create/edit/delete agency groups
- [ ] Can add/remove subagencies under a group
- [ ] Can assign users to group-level access
- [ ] Can view "users having access" summary

**Subagencies:**
- [ ] Admin can create/edit/delete subagencies
- [ ] Can assign users to subagency-level access
- [ ] Filtering by agency group works correctly

**Contacts/Users:**
- [ ] Admin can view all users with access grants summary
- [ ] Can create/edit user records
- [ ] Can assign agency access
- [ ] Can assign roles
- [ ] Can deactivate users

### Compliance and Audit

**Audit Logging:**
- [ ] All create/update/delete operations logged
- [ ] Who, what, when, where captured
- [ ] Before/after values for field updates
- [ ] Centralized audit log searchable and filterable
- [ ] Can export audit logs (CSV/Excel)

**Document Retention:**
- [ ] Documents retained per configured policy (3-6 years)
- [ ] Legal hold supported (prevent deletion during investigation)
- [ ] Archive policy automated

**Security:**
- [ ] MFA enforced for all users
- [ ] Documents encrypted at rest (S3)
- [ ] Documents encrypted in transit (HTTPS)
- [ ] Database encrypted at rest
- [ ] Pre-signed URLs expire after 15 minutes

---

## Implementation Notes

### Filter Implementation Complexity

**15 Filter Fields from Legacy:**
1. Agency (dropdown)
2. Company Name (dropdown/autocomplete)
3. City (dropdown)
4. State (dropdown)
5. Type (dropdown)
6. State of Incorporation (dropdown)
7. Agency/Office Name (dropdown)
8. Non-USMax NDA (checkbox)
9. Effective Date >= (date)
10. Effective Date <= (date)
11. Requested Date >= (date)
12. Requested Date <= (date)
13. Contract POC Name (dropdown)
14. Relationship POC Name (dropdown)
15. USMax POC Name (dropdown)

**Performance Considerations:**
- Database indexes on all filterable fields
- Dropdown data cached (agencies, users, companies)
- Filter combinations optimized for common queries
- Consider materialized views or denormalization for complex filters

### Email Template Prefill Logic

**Subject Line Pattern:**
```
NDA from {ndaOwner} - for {companyName} for {abbreviatedOpportunityName} at {agencyOfficeName}

Example:
NDA from USMax - for TechCorp Solutions for OREM TMA 2025 at DHS CBP
```

**Recipients Pattern:**
- **To:** Relationship POC email (or internal Opportunity POC - validate)
- **CC:** Contracts POC + selected stakeholders with notifications enabled
- **BCC:** Configurable defaults (e.g., contracts@usmax.com)

**Body Template:**
Include:
- Reference to attached NDA and company/opportunity context
- Return instructions (via contracts@usmax.com or fax)
- USMax POC contact details (Opportunity POC, Contracts POC)
- USMax Contracts signature block (address/phone/fax)

**VALIDATION NEEDED:** Already in Tier 1 (Q3) - who receives email?

---

## Risk Mitigation Strategies

### Data Loss Prevention

**Lessons from Legacy Failure:**
- Legacy system: 90s Windows machine died, data lost
- **Mitigation 1:** Cloud-hosted (no hardware failure)
- **Mitigation 2:** Automated backups (point-in-time recovery)
- **Mitigation 3:** S3 versioning (never lose document versions)
- **Mitigation 4:** Cross-region replication (optional, for extreme DR)

### Email Delivery Reliability

**Risks:**
- Email bounces (invalid address)
- Email rejected (spam filters)
- Service outage (SES unavailable)

**Mitigations:**
- Validate email addresses before send
- Track delivery status (sent, delivered, bounced, failed)
- Retry failed sends automatically (with backoff)
- Alert on persistent failures
- Show delivery status in UI

### Access Control Enforcement

**Risks:**
- User sees unauthorized NDA (compliance violation)
- Permission escalation attack
- Session hijacking

**Mitigations:**
- Row-level security in database queries
- Double-check authorization in API layer (don't trust client)
- Audit all access attempts (successful and failed)
- MFA prevents session hijacking
- Session timeout enforces re-authentication

---

## Summary of New/Clarified Requirements

**Added to Validation Questions:**
- Q10: Non-USMax NDA behavior (Option A vs. B)
- Q11: POC clarification (2 vs. 3 types, is Contacts = Contracts?)
- Q12: RBAC granularity (simple roles vs. granular permissions)
- Q13: Database choice (DynamoDB vs. Aurora Serverless)

**Updated Data Model:**
- Three POC types explicitly modeled
- Status enumeration clarified
- History event types enumerated

**Architecture Decisions:**
- Aurora Serverless v2 recommended (serverless + relational)
- AWS Cognito for auth (serverless-native)
- AWS SES for email (serverless-native)

**Total Validation Questions:** 18 Tier 1 + 5 Tier 2 = 22 questions (was 14 total)

---

**Document Status:** Updated with implementation details from additional legacy analysis
**Next Action:** Customer validation meeting to collect answers to 22 questions

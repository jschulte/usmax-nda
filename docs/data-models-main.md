# Data Models - USMax NDA Management System

**Project:** Government NDA Lifecycle Application (Prototype)
**Generated:** 2025-12-12
**Source:** `/src/types/index.ts` and `/src/data/mockData.ts`

---

## Overview

This prototype uses TypeScript interfaces and types to define the domain model. There is **no database** - the application uses mock data for UI demonstration purposes.

**Key Model Files:**
- `/src/types/index.ts` (2.5KB) - Type definitions
- `/src/data/mockData.ts` (8.8KB) - Mock data instances

---

## Core Domain Models

### 1. NDA (Non-Disclosure Agreement)

Primary domain entity representing an NDA throughout its lifecycle.

```typescript
interface NDA {
  // Identification
  id: string;
  title: string;

  // Counterparty Information
  counterparty: string;
  counterpartyContact: string;
  counterpartyEmail: string;

  // Classification
  type: NDAType;
  status: NDAStatus;
  riskLevel: RiskLevel;
  sensitivity: RiskLevel;

  // Dates
  createdDate: string;
  lastUpdated: string;
  effectiveDate?: string;
  expiryDate?: string;
  termLength?: string;

  // Content & Purpose
  purpose: string;
  informationTypes: InformationType[];
  systems: string[];

  // Ownership
  department: string;
  internalOwner: string;
  legalOwner: string;
  businessOwner: string;

  // POCs (Point of Contact) - Legacy System Structure
  opportunityPoc: string;      // Required - internal user
  contractsPoc?: {             // Optional
    name: string;
    email: string;
    phone: string;
    fax?: string;
  };
  relationshipPoc: {           // Required
    name: string;
    email: string;
    phone: string;
    fax?: string;
  };
  contactsPoc?: {              // Optional - appears in legacy "More info" modal
    name: string;              // NOTE: May be same as Contracts POC (validation needed)
    email?: string;
    phone?: string;
  };
}
```

**Key Relationships:**
- Has many: Tasks (via ndaId)
- Has many: Activities (via ndaId)
- References: Template (via type matching)
- References: Workflow (via status transitions)

---

### 2. Task

Represents action items required to progress an NDA through its workflow.

```typescript
interface Task {
  id: string;
  ndaId: string;           // Foreign key to NDA
  ndaTitle: string;        // Denormalized for display
  type: TaskType;
  dueDate: string;
  status: string;
  priority: 'Low' | 'Medium' | 'High';
}
```

**Purpose:** Track pending actions (review, approval, signature, etc.)

---

### 3. Activity

Audit trail of all actions taken on NDAs.

```typescript
interface Activity {
  id: string;
  ndaId?: string;          // Optional - some activities are system-wide
  timestamp: string;
  actor: string;           // User who performed action
  action: string;          // Description of action
  eventType: string;       // Category of event
  icon: string;            // UI icon identifier
}
```

**Purpose:** Audit log, activity feed, compliance tracking

---

### 4. Template

Reusable NDA templates with standard clauses.

```typescript
interface Template {
  id: string;
  name: string;
  type: NDAType;          // Links to NDA types
  department: string;
  lastUpdated: string;
  active: boolean;
  description: string;
}
```

**Relationships:**
- Contains many: Clauses (implied)
- Used by: NDAs created from template

---

### 5. Clause

Standard contract clauses that can be included in templates.

```typescript
interface Clause {
  id: string;
  name: string;
  topic: string;
  text: string;            // Actual clause text
  riskLevel: RiskLevel;
  usageCount: number;      // Tracking metric
  required: boolean;
}
```

**Purpose:** Library of reusable contract language

---

### 6. Workflow

Defines approval and processing workflows for NDAs.

```typescript
interface Workflow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  steps: WorkflowStepConfig[];   // Ordered workflow steps
  rules: WorkflowRule[];          // Conditional logic
}
```

**Key Components:**

**WorkflowStepConfig:**
```typescript
interface WorkflowStepConfig {
  id: string;
  name: string;
  type: 'review' | 'approval' | 'signature' | 'notification' | 'custom';
  assignedRole: string;
  dueDays: number;
  required: boolean;
  order: number;            // Step sequence
}
```

**WorkflowRule:**
```typescript
interface WorkflowRule {
  id: string;
  condition: string;
  conditionField: string;
  conditionOperator: string;
  conditionValue: string;
  action: string;
  actionType: string;
  actionValue: string;
}
```

**Purpose:** Define custom approval processes based on NDA characteristics

---

### 7. WorkflowStep (Instance)

Runtime tracking of workflow progress for a specific NDA.

```typescript
interface WorkflowStep {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
  timestamp?: string;
  actor?: string;
}
```

**Difference from WorkflowStepConfig:**
- `WorkflowStepConfig` = Template (what steps should happen)
- `WorkflowStep` = Instance (what has/is happening)

---

## Enumerated Types

### NDAStatus

Lifecycle states of an NDA.

```typescript
type NDAStatus =
  | 'Draft'
  | 'In legal review'
  | 'Pending approval'
  | 'Waiting for signature'
  | 'Executed'
  | 'Expired'
  | 'Terminated'
  | 'Rejected';
```

**State Flow:**
```
Draft → In legal review → Pending approval → Waiting for signature → Executed
                                                                    ↓
                                                              Expired/Terminated
                    ↓
                 Rejected (terminal state from any step)
```

---

### NDAType

Categories of NDAs based on disclosure direction and purpose.

```typescript
type NDAType =
  | 'Mutual'                          // Both parties disclose
  | 'One-way government disclosing'   // Government shares info
  | 'One-way counterparty disclosing' // Counterparty shares info
  | 'Visitor'                         // Facility access
  | 'Research'                        // Research partnerships
  | 'Vendor access';                  // Vendor/contractor access
```

**Business Logic:**
- Type determines workflow complexity
- Affects risk assessment
- Influences template selection

---

### RiskLevel

Risk classification used for NDAs and clauses.

```typescript
type RiskLevel = 'Low' | 'Medium' | 'High';
```

**Used in:**
- NDA.riskLevel (overall risk)
- NDA.sensitivity (data sensitivity)
- Clause.riskLevel (clause risk)

---

### InformationType

Types of information covered by the NDA.

```typescript
type InformationType =
  | 'PII'               // Personally Identifiable Information
  | 'Financial data'
  | 'Technical data'
  | 'Source code'
  | 'Facility access'
  | 'Other';
```

**Note:** NDAs can cover multiple information types (array field)

---

### TaskType

Categories of tasks in the workflow.

```typescript
type TaskType =
  | 'Review NDA'
  | 'Approve'
  | 'Sign'
  | 'Provide details';
```

---

## Mock Data Structure

The prototype includes mock data for demonstration:

```typescript
// From /src/data/mockData.ts
export const mockNDAs: NDA[]           // Sample NDAs (5+ examples)
export const mockTasks: Task[]         // Sample tasks
export const mockActivities: Activity[] // Sample activity log
export const mockTemplates: Template[] // Sample templates
export const mockClauses: Clause[]     // Sample clauses
```

**Mock Data Characteristics:**
- **5+ sample NDAs** covering different types and statuses
- Government-themed examples (TechCorp, GlobalVendor, State University, etc.)
- Realistic dates, stakeholders, and purposes
- Cross-referenced IDs (tasks → NDAs, etc.)

**Example NDA from Mock Data:**
```typescript
{
  id: 'nda-001',
  title: 'TechCorp Software Integration NDA',
  counterparty: 'TechCorp Solutions Inc.',
  type: 'Mutual',
  status: 'In legal review',
  riskLevel: 'Medium',
  purpose: 'Software integration project for citizen services portal',
  informationTypes: ['Technical data', 'PII'],
  systems: ['Citizen Portal', 'Authentication System'],
  department: 'IT Services',
  // ... additional fields
}
```

---

## Data Relationships

```
NDA (1) ──< (*) Task
   │
   ├──< (*) Activity
   │
   ├──> (1) Template (via type)
   │
   └──> (1) Workflow (via status)

Template (1) ──< (*) Clause

Workflow (1) ──< (*) WorkflowStepConfig
         (1) ──< (*) WorkflowRule

NDA Instance ──< (*) WorkflowStep (runtime)
```

---

## Database Schema Notes (For Future Implementation)

When implementing a real database, consider:

### Primary Tables
1. **ndas** - Core NDA table
2. **tasks** - Action items
3. **activities** - Audit log
4. **templates** - NDA templates
5. **clauses** - Reusable clauses
6. **workflows** - Workflow definitions
7. **workflow_steps** - Workflow step configs
8. **workflow_rules** - Conditional routing rules
9. **nda_workflow_instances** - Runtime workflow tracking
10. **users** - User management (not in current prototype)
11. **departments** - Department master data
12. **systems** - IT systems registry

### Key Indexes
- `ndas.status` - Frequent filtering
- `ndas.counterparty` - Search/lookup
- `tasks.ndaId` - Foreign key lookup
- `tasks.dueDate` - Date-based queries
- `activities.ndaId` - Audit trail lookup
- `activities.timestamp` - Time-series queries

### Audit Requirements
- Track all changes to NDAs
- Immutable activity log
- Version history for templates/clauses
- User attribution for all actions

---

## Validation Rules (Implied from Types)

1. **Required Fields**
   - NDA: id, title, counterparty, type, status, createdDate
   - Task: id, ndaId, type, dueDate, status, priority
   - All models require `id` field

2. **Date Constraints**
   - effectiveDate should be ≤ expiryDate
   - createdDate ≤ lastUpdated
   - Task.dueDate should be reasonable (not past for pending tasks)

3. **Status Transitions**
   - Cannot skip workflow steps
   - Cannot move from Executed back to Draft
   - Rejected/Expired are terminal states

4. **Risk Assessment**
   - High sensitivity + High risk = Additional approvals required
   - PII + Financial data = Automatic high sensitivity

---

## Additional Data Model Considerations from Legacy Analysis

### User Roles and Permissions

**Role-Based Access Control (RBAC) Options:**

**Option 1: Simple Roles**
- **Read-Only:** View NDAs and documents only
- **NDA User:** Create, edit, email, upload NDAs
- **Admin:** Full access including agency/user management

**Option 2: Granular Permissions**
- `nda:create` - Create new NDA requests
- `nda:update` - Edit existing NDAs
- `nda:upload_document` - Upload documents
- `nda:send_email` - Send NDA emails
- `nda:mark_inactive` - Archive NDAs
- `admin:manage_agency_groups` - Manage agency groups
- `admin:manage_subagencies` - Manage subagencies
- `admin:manage_contacts` - Manage user directory
- `admin:manage_access` - Assign user permissions

**Recommendation:** Start with Option 1 (simple roles), add granular permissions Phase 2 if needed

### Agency-Based Data Scoping

**Access Control Model:**
- Users granted access at Agency Group level (see all subagencies in group)
- Users optionally granted access at specific Subagency level (more granular)
- **Critical:** Row-level security - users only see NDAs for their authorized agencies

### Database Technology Considerations

**Serverless-Optimized Options:**
- **DynamoDB:** AWS-native, fully serverless, pay-per-request, scales automatically
- **Aurora Serverless v2:** PostgreSQL-compatible, true serverless, relational benefits
- **PostgreSQL (RDS):** Traditional relational (requires instance sizing, not fully serverless)

**Recommendation:** Aurora Serverless v2 for relational benefits with serverless architecture

---

## Missing Data Model Elements (To Add in Real Implementation)

1. **User Management** (Enhanced)
   - User entity with firstName, lastName, email, workNumber, cellNumber, positionTitle
   - Role assignments (simple or granular RBAC)
   - Agency Group and Subagency access grants
   - isActive flag for user deactivation

2. **Document Management**
   - File attachments
   - Version control
   - Digital signatures

3. **Notification System**
   - Notification preferences
   - Email templates
   - Notification history

4. **Integration Models**
   - External system mappings
   - API credentials
   - Sync status

5. **Reporting**
   - Report definitions
   - Scheduled reports
   - Dashboard configurations

---

## Prototype Context

**Important:**
- This is a **UI prototype** - no real persistence
- Mock data provides demonstration scenarios
- Type definitions show intended domain model
- Real implementation needs:
  - Database schema design
  - Migration strategy
  - Data validation layer
  - ORM/query layer
  - API contracts
  - Authentication/authorization

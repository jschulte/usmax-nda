# Government NDA Lifecycle Application - Backend Architecture

**Version:** 1.0  
**Last Updated:** December 8, 2025  
**Status:** Design Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Patterns](#architecture-patterns)
4. [Database Design](#database-design)
5. [API Specifications](#api-specifications)
6. [Workflow Engine](#workflow-engine)
7. [Authentication & Authorization](#authentication--authorization)
8. [Security & Compliance](#security--compliance)
9. [Integration Points](#integration-points)
10. [Deployment Architecture](#deployment-architecture)
11. [Technology Stack](#technology-stack)
12. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

This document defines the backend architecture for a Government NDA Lifecycle Management System. The system manages the complete lifecycle of Non-Disclosure Agreements from initial request through legal review, approval routing, external signing, execution, and archival.

### Key Requirements
- **Multi-role support**: Requester, Legal Reviewer, Manager/Approver, Admin, External Party
- **Configurable workflows**: Dynamic approval routing based on NDA attributes
- **Audit trail**: Complete compliance logging for government regulations
- **External integration**: E-signature providers, email notifications
- **Security**: Role-based access control, data encryption, PII protection
- **Scalability**: Support for multiple departments and high volume

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                     │
│              (React + TypeScript + Tailwind)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS/REST
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway / Load Balancer              │
│                  (Rate Limiting, SSL Termination)            │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┬─────────────┐
          ▼                       ▼             ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────┐
│  NDA Service     │   │ Workflow Engine  │   │ Auth Service │
│  (Core CRUD)     │   │  (Orchestration) │   │   (OAuth2)   │
└────────┬─────────┘   └────────┬─────────┘   └──────┬───────┘
         │                      │                     │
         └──────────────┬───────┴─────────────────────┘
                        ▼
         ┌──────────────────────────────┐
         │   PostgreSQL Database        │
         │   (Primary Data Store)       │
         └──────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌─────────────────┐          ┌─────────────────┐
│  Document Store │          │   Job Queue     │
│  (S3/MinIO)     │          │  (Redis/SQS)    │
└─────────────────┘          └─────────────────┘
         │                             │
         │                             ▼
         │                   ┌─────────────────┐
         │                   │ Background Jobs │
         │                   │  (Notifications,│
         │                   │   Reminders)    │
         │                   └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│        External Integrations            │
│  - Email (SMTP/SendGrid)                │
│  - E-Signature (DocuSign/Adobe Sign)    │
│  - Active Directory/LDAP                │
│  - Audit Logging System                 │
└─────────────────────────────────────────┘
```

### Core Services

#### 1. **NDA Service**
- CRUD operations for NDA records
- Template management
- Clause library
- Document generation
- Version control

#### 2. **Workflow Engine**
- Workflow definition management
- Workflow execution and orchestration
- Rule evaluation engine
- Step assignment and routing
- Due date calculation and tracking

#### 3. **Authentication & Authorization Service**
- User authentication (OAuth2/SAML)
- Role-based access control (RBAC)
- Session management
- API key management for external access

#### 4. **Task Service**
- Task queue management
- Assignment logic
- Notification triggers
- Escalation handling

#### 5. **Document Service**
- PDF generation
- Document storage
- Version management
- Digital signature integration

#### 6. **Notification Service**
- Email notifications
- In-app notifications
- SMS alerts (optional)
- Notification preferences

#### 7. **Reporting & Analytics Service**
- Report generation
- Dashboard metrics
- Export functionality
- Audit trail queries

---

## Architecture Patterns

### 1. **Microservices Architecture**
While the system can start as a modular monolith, it's designed to be decomposed into microservices:

- **Service Independence**: Each service has its own database schema
- **API-First Design**: All services communicate via REST APIs
- **Event-Driven**: Services publish events for decoupled integration
- **Scalability**: Services can be scaled independently

### 2. **Domain-Driven Design (DDD)**

```
Bounded Contexts:
├── NDA Management
│   ├── NDA Aggregate
│   ├── Template Aggregate
│   └── Clause Aggregate
├── Workflow Management
│   ├── Workflow Definition Aggregate
│   ├── Workflow Instance Aggregate
│   └── Step Execution Aggregate
├── User Management
│   ├── User Aggregate
│   ├── Role Aggregate
│   └── Permission Aggregate
└── Document Management
    ├── Document Aggregate
    └── Signature Aggregate
```

### 3. **CQRS Pattern (Command Query Responsibility Segregation)**

Separate read and write operations for complex queries:

```
Commands (Write):
- CreateNDA
- UpdateNDA
- ApproveStep
- RejectNDA
- CreateWorkflow

Queries (Read):
- GetNDADetails
- ListMyTasks
- GenerateReport
- GetDashboardMetrics
```

### 4. **Event Sourcing (for Audit Trail)**

Store every state change as an immutable event:

```
Events:
- NDACreated
- NDASubmittedForReview
- LegalReviewCompleted
- WorkflowStepApproved
- WorkflowStepRejected
- NDAExecuted
- WorkflowCreated
- WorkflowRuleAdded
```

---

## Database Design

### Technology Choice
**PostgreSQL 15+** - Chosen for:
- ACID compliance (critical for government data)
- JSON support (flexible metadata storage)
- Advanced indexing
- Row-level security
- Excellent audit logging capabilities

### Schema Design

#### Core Tables

```sql
-- ================================================================
-- USER MANAGEMENT
-- ================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  job_title VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP,
  metadata JSONB
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);

-- ================================================================
-- NDA MANAGEMENT
-- ================================================================

CREATE TABLE ndas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nda_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: NDA-2025-001
  title VARCHAR(255) NOT NULL,
  
  -- Counterparty information
  counterparty_name VARCHAR(255) NOT NULL,
  counterparty_contact_name VARCHAR(255),
  counterparty_contact_email VARCHAR(255),
  counterparty_contact_phone VARCHAR(50),
  
  -- NDA Details
  type VARCHAR(50) NOT NULL, -- mutual, one-way-gov, one-way-counterparty, visitor, etc.
  status VARCHAR(50) NOT NULL, -- draft, in_legal_review, pending_approval, etc.
  risk_level VARCHAR(20) NOT NULL, -- low, medium, high
  
  -- Purpose and scope
  purpose TEXT NOT NULL,
  information_types JSONB NOT NULL, -- ["PII", "Financial", "Technical"]
  sensitivity VARCHAR(20) NOT NULL,
  systems_access JSONB, -- ["System A", "System B"]
  
  -- Dates
  effective_date DATE,
  expiry_date DATE,
  term_length VARCHAR(50), -- "2 years", "indefinite"
  
  -- Ownership
  department VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  internal_owner UUID REFERENCES users(id),
  legal_owner UUID REFERENCES users(id),
  business_owner UUID REFERENCES users(id),
  
  -- Template
  template_id UUID REFERENCES templates(id),
  
  -- Workflow
  current_workflow_instance_id UUID,
  current_step_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  executed_at TIMESTAMP,
  terminated_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB,
  
  -- Search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      coalesce(title, '') || ' ' || 
      coalesce(counterparty_name, '') || ' ' ||
      coalesce(purpose, '')
    )
  ) STORED
);

CREATE INDEX idx_ndas_status ON ndas(status);
CREATE INDEX idx_ndas_department ON ndas(department);
CREATE INDEX idx_ndas_created_by ON ndas(created_by);
CREATE INDEX idx_ndas_search ON ndas USING GIN(search_vector);
CREATE INDEX idx_ndas_dates ON ndas(effective_date, expiry_date);

-- ================================================================
-- TEMPLATES AND CLAUSES
-- ================================================================

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  department VARCHAR(100),
  description TEXT,
  content TEXT NOT NULL, -- Template with placeholders
  active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  topic VARCHAR(100) NOT NULL, -- confidentiality, liability, term, etc.
  text TEXT NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE template_clauses (
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  clause_id UUID REFERENCES clauses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (template_id, clause_id)
);

-- ================================================================
-- WORKFLOW DEFINITIONS
-- ================================================================

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- review, approval, signature, notification, custom
  assigned_role VARCHAR(100) NOT NULL, -- role name or "dynamic"
  assigned_user_id UUID REFERENCES users(id), -- optional specific user
  due_days INTEGER NOT NULL DEFAULT 3,
  required BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL,
  
  -- Configuration
  config JSONB, -- Step-specific configuration
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(workflow_id, order_index)
);

CREATE TABLE workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  name VARCHAR(255),
  
  -- Condition (IF part)
  condition_field VARCHAR(100) NOT NULL, -- nda.type, nda.risk_level, etc.
  condition_operator VARCHAR(50) NOT NULL, -- equals, contains, greater_than, etc.
  condition_value TEXT NOT NULL,
  
  -- Action (THEN part)
  action_type VARCHAR(50) NOT NULL, -- add_step, skip_step, assign_to, set_due_date
  action_value TEXT NOT NULL,
  action_target_step_id UUID REFERENCES workflow_steps(id),
  
  -- Metadata
  priority INTEGER NOT NULL DEFAULT 0, -- Higher priority rules evaluated first
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================================================
-- WORKFLOW EXECUTION (Runtime State)
-- ================================================================

CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nda_id UUID REFERENCES ndas(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id),
  workflow_version INTEGER NOT NULL,
  
  status VARCHAR(50) NOT NULL, -- in_progress, completed, cancelled, failed
  current_step_id UUID,
  
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  -- Snapshot of evaluated steps (after rule evaluation)
  evaluated_steps JSONB NOT NULL,
  
  metadata JSONB
);

CREATE INDEX idx_workflow_instances_nda ON workflow_instances(nda_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);

CREATE TABLE step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  workflow_step_id UUID REFERENCES workflow_steps(id),
  
  -- Execution details
  name VARCHAR(255) NOT NULL, -- Snapshot of step name
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL, -- pending, in_progress, completed, skipped, failed
  order_index INTEGER NOT NULL,
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMP,
  
  -- Completion
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMP,
  decision VARCHAR(50), -- approved, rejected, escalated
  comments TEXT,
  
  -- Due dates
  due_date TIMESTAMP NOT NULL,
  reminded_at TIMESTAMP,
  escalated_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB,
  
  UNIQUE(workflow_instance_id, order_index)
);

CREATE INDEX idx_step_executions_assigned_to ON step_executions(assigned_to, status);
CREATE INDEX idx_step_executions_due_date ON step_executions(due_date, status);
CREATE INDEX idx_step_executions_instance ON step_executions(workflow_instance_id);

-- ================================================================
-- TASKS (Derived from step executions + other sources)
-- ================================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- workflow_step, review_nda, sign_document, provide_info
  
  -- Reference
  nda_id UUID REFERENCES ndas(id) ON DELETE CASCADE,
  step_execution_id UUID REFERENCES step_executions(id) ON DELETE CASCADE,
  
  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL, -- low, medium, high, urgent
  
  -- Assignment
  assigned_to UUID REFERENCES users(id) NOT NULL,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Status
  status VARCHAR(50) NOT NULL, -- pending, in_progress, completed, cancelled
  due_date TIMESTAMP NOT NULL,
  
  -- Completion
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMP,
  
  metadata JSONB
);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to, status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date, status);
CREATE INDEX idx_tasks_nda ON tasks(nda_id);

-- ================================================================
-- DOCUMENTS
-- ================================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nda_id UUID REFERENCES ndas(id) ON DELETE CASCADE,
  
  -- Document details
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- pdf, docx, etc.
  file_size BIGINT NOT NULL,
  
  -- Storage
  storage_key VARCHAR(500) NOT NULL, -- S3 key or file path
  storage_url TEXT, -- Signed URL for download
  
  -- Version
  version INTEGER NOT NULL DEFAULT 1,
  is_final BOOLEAN NOT NULL DEFAULT false,
  
  -- Signatures
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  signature_status VARCHAR(50), -- pending, sent, completed, declined
  signature_provider VARCHAR(50), -- docusign, adobe_sign, internal
  signature_envelope_id VARCHAR(255), -- External provider ID
  
  -- Upload info
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  metadata JSONB
);

CREATE INDEX idx_documents_nda ON documents(nda_id);
CREATE INDEX idx_documents_signature_status ON documents(signature_status);

-- ================================================================
-- COMMENTS AND NOTES
-- ================================================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nda_id UUID REFERENCES ndas(id) ON DELETE CASCADE,
  step_execution_id UUID REFERENCES step_executions(id) ON DELETE CASCADE,
  
  -- Comment details
  text TEXT NOT NULL,
  comment_type VARCHAR(50) NOT NULL, -- note, question, decision, feedback
  
  -- Author
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Reply thread
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  metadata JSONB
);

CREATE INDEX idx_comments_nda ON comments(nda_id, created_at);

-- ================================================================
-- AUDIT LOG (Event Sourcing)
-- ================================================================

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event details
  event_type VARCHAR(100) NOT NULL, -- nda_created, workflow_started, step_approved, etc.
  aggregate_type VARCHAR(50) NOT NULL, -- nda, workflow, user, etc.
  aggregate_id UUID NOT NULL,
  
  -- Actor
  actor_id UUID REFERENCES users(id),
  actor_ip VARCHAR(50),
  actor_user_agent TEXT,
  
  -- Event data
  event_data JSONB NOT NULL, -- Complete event payload
  
  -- Previous state (for rollback capability)
  previous_state JSONB,
  new_state JSONB,
  
  -- Timestamp
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Metadata
  correlation_id UUID, -- For tracking related events
  causation_id UUID, -- What caused this event
  metadata JSONB
);

CREATE INDEX idx_audit_events_aggregate ON audit_events(aggregate_type, aggregate_id);
CREATE INDEX idx_audit_events_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_id);
CREATE INDEX idx_audit_events_occurred ON audit_events(occurred_at);

-- Make audit_events append-only (no updates or deletes)
CREATE RULE no_update_audit_events AS ON UPDATE TO audit_events DO INSTEAD NOTHING;
CREATE RULE no_delete_audit_events AS ON DELETE TO audit_events DO INSTEAD NOTHING;

-- ================================================================
-- NOTIFICATIONS
-- ================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification details
  type VARCHAR(50) NOT NULL, -- task_assigned, step_completed, deadline_approaching, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Link
  link_type VARCHAR(50), -- nda, task, workflow
  link_id UUID,
  
  -- Status
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP,
  
  -- Delivery
  sent_via JSONB, -- ["email", "in_app", "sms"]
  email_sent_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  metadata JSONB
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ================================================================
-- SYSTEM CONFIGURATION
-- ================================================================

CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================================================
-- FUNCTIONS AND TRIGGERS
-- ================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_ndas_updated_at BEFORE UPDATE ON ndas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate NDA number
CREATE OR REPLACE FUNCTION generate_nda_number()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix VARCHAR(4);
  next_number INTEGER;
  new_nda_number VARCHAR(50);
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(nda_number FROM 'NDA-' || year_suffix || '-(\d+)') AS INTEGER)
  ), 0) + 1 INTO next_number
  FROM ndas
  WHERE nda_number LIKE 'NDA-' || year_suffix || '-%';
  
  new_nda_number := 'NDA-' || year_suffix || '-' || LPAD(next_number::TEXT, 4, '0');
  NEW.nda_number := new_nda_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_nda_number_trigger
  BEFORE INSERT ON ndas
  FOR EACH ROW
  WHEN (NEW.nda_number IS NULL)
  EXECUTE FUNCTION generate_nda_number();

-- ================================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================================

-- Dashboard metrics view
CREATE VIEW dashboard_metrics AS
SELECT
  COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
  COUNT(*) FILTER (WHERE status = 'in_legal_review') as in_review_count,
  COUNT(*) FILTER (WHERE status = 'pending_approval') as pending_approval_count,
  COUNT(*) FILTER (WHERE status = 'waiting_for_signature') as waiting_signature_count,
  COUNT(*) FILTER (WHERE status = 'executed') as executed_count,
  COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE AND status = 'executed') as expired_count,
  AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/86400) as avg_approval_days
FROM ndas;

-- My tasks view
CREATE VIEW my_tasks_view AS
SELECT
  t.id,
  t.type,
  t.title,
  t.description,
  t.priority,
  t.status,
  t.due_date,
  t.assigned_at,
  t.assigned_to,
  n.id as nda_id,
  n.nda_number,
  n.title as nda_title,
  n.counterparty_name,
  n.status as nda_status,
  se.name as step_name
FROM tasks t
LEFT JOIN ndas n ON t.nda_id = n.id
LEFT JOIN step_executions se ON t.step_execution_id = se.id;
```

---

## API Specifications

### API Design Principles

1. **RESTful**: Follow REST conventions
2. **Versioned**: `/api/v1/` for future compatibility
3. **Consistent**: Standard response format
4. **Paginated**: Large lists use cursor-based pagination
5. **Filtered**: Support query parameters for filtering/sorting
6. **Documented**: OpenAPI/Swagger specification

### Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-12-08T10:30:00Z",
    "version": "v1"
  },
  "pagination": {
    "total": 150,
    "page": 1,
    "per_page": 20,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Workflow name is required",
    "details": {
      "field": "name",
      "constraint": "required"
    }
  },
  "meta": {
    "timestamp": "2025-12-08T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

### API Endpoints

#### Authentication

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
```

#### NDA Management

```
# List NDAs
GET    /api/v1/ndas
  Query params:
    - status: filter by status
    - department: filter by department
    - search: full-text search
    - created_by: filter by creator
    - sort: created_at, updated_at, expiry_date
    - order: asc, desc
    - page: page number
    - per_page: items per page

# Create NDA
POST   /api/v1/ndas
  Request body:
  {
    "title": "Vendor Access NDA",
    "counterparty_name": "Tech Corp Inc",
    "counterparty_contact_email": "contact@techcorp.com",
    "type": "one-way-counterparty",
    "purpose": "Access to development systems",
    "information_types": ["technical", "source_code"],
    "risk_level": "medium",
    "department": "IT Services",
    "effective_date": "2025-01-01",
    "term_length": "2 years"
  }

# Get NDA details
GET    /api/v1/ndas/:id

# Update NDA
PUT    /api/v1/ndas/:id
PATCH  /api/v1/ndas/:id

# Delete NDA (soft delete)
DELETE /api/v1/ndas/:id

# NDA Actions
POST   /api/v1/ndas/:id/submit           # Submit for review
POST   /api/v1/ndas/:id/terminate        # Terminate NDA
POST   /api/v1/ndas/:id/renew            # Create renewal

# NDA History
GET    /api/v1/ndas/:id/history          # Audit trail
GET    /api/v1/ndas/:id/timeline         # Visual timeline

# NDA Documents
GET    /api/v1/ndas/:id/documents
POST   /api/v1/ndas/:id/documents/upload
GET    /api/v1/ndas/:id/documents/:doc_id/download
POST   /api/v1/ndas/:id/documents/:doc_id/sign

# NDA Comments
GET    /api/v1/ndas/:id/comments
POST   /api/v1/ndas/:id/comments
```

#### Workflow Management (Admin)

```
# List workflows
GET    /api/v1/workflows

# Create workflow
POST   /api/v1/workflows
  Request body:
  {
    "name": "Standard NDA Approval",
    "description": "Default workflow for all NDAs",
    "active": true,
    "steps": [
      {
        "name": "Legal Review",
        "type": "review",
        "assigned_role": "legal_reviewer",
        "due_days": 3,
        "required": true,
        "order": 1
      },
      {
        "name": "Manager Approval",
        "type": "approval",
        "assigned_role": "manager",
        "due_days": 2,
        "required": true,
        "order": 2
      }
    ],
    "rules": [
      {
        "condition_field": "risk_level",
        "condition_operator": "equals",
        "condition_value": "high",
        "action_type": "add_step",
        "action_value": "security_review"
      }
    ]
  }

# Get workflow
GET    /api/v1/workflows/:id

# Update workflow
PUT    /api/v1/workflows/:id

# Delete workflow
DELETE /api/v1/workflows/:id

# Activate/Deactivate
PATCH  /api/v1/workflows/:id/activate
PATCH  /api/v1/workflows/:id/deactivate

# Duplicate workflow
POST   /api/v1/workflows/:id/duplicate
```

#### Workflow Execution

```
# Start workflow for NDA
POST   /api/v1/ndas/:nda_id/workflow/start
  Request body:
  {
    "workflow_id": "uuid"
  }

# Get workflow status
GET    /api/v1/ndas/:nda_id/workflow

# Get current step
GET    /api/v1/ndas/:nda_id/workflow/current-step

# Complete step (approve/reject)
POST   /api/v1/workflow-steps/:step_id/complete
  Request body:
  {
    "decision": "approved",  # or "rejected"
    "comments": "Approved with minor revisions needed"
  }

# Reassign step
POST   /api/v1/workflow-steps/:step_id/reassign
  Request body:
  {
    "assigned_to": "user_uuid",
    "reason": "Original assignee on leave"
  }

# Skip step (if allowed)
POST   /api/v1/workflow-steps/:step_id/skip
```

#### Tasks

```
# Get my tasks
GET    /api/v1/tasks/my-tasks
  Query params:
    - status: pending, in_progress, completed
    - priority: low, medium, high, urgent
    - type: workflow_step, review_nda, etc.
    - overdue: true/false

# Get task details
GET    /api/v1/tasks/:id

# Take action on task
POST   /api/v1/tasks/:id/action
  Request body:
  {
    "action": "approve",
    "comments": "Looks good",
    "metadata": {}
  }

# Mark task in progress
PATCH  /api/v1/tasks/:id/start

# Complete task
PATCH  /api/v1/tasks/:id/complete
```

#### Templates

```
GET    /api/v1/templates
POST   /api/v1/templates
GET    /api/v1/templates/:id
PUT    /api/v1/templates/:id
DELETE /api/v1/templates/:id

# Clone template
POST   /api/v1/templates/:id/clone

# Activate/Deactivate
PATCH  /api/v1/templates/:id/activate
```

#### Clauses

```
GET    /api/v1/clauses
POST   /api/v1/clauses
GET    /api/v1/clauses/:id
PUT    /api/v1/clauses/:id
DELETE /api/v1/clauses/:id

# Get clauses by topic
GET    /api/v1/clauses?topic=confidentiality
```

#### Reports

```
# Get dashboard metrics
GET    /api/v1/reports/dashboard

# Get detailed report
POST   /api/v1/reports/generate
  Request body:
  {
    "report_type": "nda_volume",
    "date_range": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    },
    "filters": {
      "department": "IT Services",
      "status": ["executed", "expired"]
    },
    "format": "json"  # or "csv", "pdf"
  }

# Export report
GET    /api/v1/reports/:report_id/export?format=csv
```

#### Notifications

```
# Get my notifications
GET    /api/v1/notifications

# Mark notification as read
PATCH  /api/v1/notifications/:id/read

# Mark all as read
PATCH  /api/v1/notifications/read-all

# Get notification preferences
GET    /api/v1/notifications/preferences

# Update preferences
PUT    /api/v1/notifications/preferences
```

#### Administration

```
# User management
GET    /api/v1/admin/users
POST   /api/v1/admin/users
GET    /api/v1/admin/users/:id
PUT    /api/v1/admin/users/:id
DELETE /api/v1/admin/users/:id

# Role management
GET    /api/v1/admin/roles
POST   /api/v1/admin/roles
PUT    /api/v1/admin/roles/:id

# System settings
GET    /api/v1/admin/settings
PUT    /api/v1/admin/settings/:key

# Audit log
GET    /api/v1/admin/audit-log
  Query params:
    - event_type
    - actor_id
    - aggregate_type
    - start_date
    - end_date
```

### API Authentication

**JWT Bearer Token Authentication**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

JWT Payload:
{
  "sub": "user_uuid",
  "email": "user@agency.gov",
  "roles": ["requester", "legal_reviewer"],
  "department": "IT Services",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Rate Limiting

```
Per User:
- 1000 requests per hour (normal users)
- 5000 requests per hour (service accounts)

Headers:
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1234567890
```

---

## Workflow Engine

### Architecture

```
┌─────────────────────────────────────────────────┐
│           Workflow Engine Core                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────┐  ┌──────────────┐            │
│  │   Workflow  │  │     Rule     │            │
│  │   Loader    │  │  Evaluator   │            │
│  └──────┬──────┘  └──────┬───────┘            │
│         │                │                     │
│         └────────┬───────┘                     │
│                  │                             │
│         ┌────────▼────────┐                    │
│         │   Orchestrator  │                    │
│         └────────┬────────┘                    │
│                  │                             │
│      ┌───────────┼───────────┐                │
│      │           │           │                │
│  ┌───▼────┐ ┌───▼────┐ ┌───▼─────┐           │
│  │  Step  │ │  Task  │ │ Notif.  │           │
│  │Manager │ │Manager │ │ Service │           │
│  └────────┘ └────────┘ └─────────┘           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Core Components

#### 1. Workflow Loader

```javascript
class WorkflowLoader {
  async loadWorkflow(workflowId) {
    const workflow = await db.workflows.findById(workflowId);
    const steps = await db.workflowSteps.findByWorkflow(workflowId);
    const rules = await db.workflowRules.findByWorkflow(workflowId);
    
    return {
      ...workflow,
      steps: steps.sort((a, b) => a.order_index - b.order_index),
      rules: rules.sort((a, b) => b.priority - a.priority)
    };
  }
  
  async findApplicableWorkflow(nda) {
    // Logic to determine which workflow applies
    // Could be based on department, type, or custom rules
    return await db.workflows.findOne({
      active: true,
      // Add selection logic here
    });
  }
}
```

#### 2. Rule Evaluator

```javascript
class RuleEvaluator {
  evaluateRules(workflow, nda) {
    let steps = [...workflow.steps];
    const appliedRules = [];
    
    for (const rule of workflow.rules) {
      if (!rule.active) continue;
      
      if (this.evaluateCondition(rule, nda)) {
        steps = this.applyAction(rule, steps, nda);
        appliedRules.push(rule);
      }
    }
    
    return {
      steps: steps.sort((a, b) => a.order_index - b.order_index),
      appliedRules
    };
  }
  
  evaluateCondition(rule, nda) {
    const fieldValue = this.getNestedValue(nda, rule.condition_field);
    
    switch (rule.condition_operator) {
      case 'equals':
        return fieldValue === rule.condition_value;
      
      case 'not_equals':
        return fieldValue !== rule.condition_value;
      
      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(rule.condition_value);
        }
        return String(fieldValue).includes(rule.condition_value);
      
      case 'greater_than':
        return Number(fieldValue) > Number(rule.condition_value);
      
      case 'less_than':
        return Number(fieldValue) < Number(rule.condition_value);
      
      case 'in':
        const values = rule.condition_value.split(',');
        return values.includes(String(fieldValue));
      
      default:
        throw new Error(`Unknown operator: ${rule.condition_operator}`);
    }
  }
  
  applyAction(rule, steps, nda) {
    switch (rule.action_type) {
      case 'add_step':
        return this.addStep(steps, rule);
      
      case 'skip_step':
        return this.skipStep(steps, rule);
      
      case 'assign_to':
        return this.reassignStep(steps, rule);
      
      case 'set_due_date':
        return this.setDueDate(steps, rule);
      
      case 'require_approval':
        return this.requireApproval(steps, rule);
      
      default:
        throw new Error(`Unknown action: ${rule.action_type}`);
    }
  }
  
  addStep(steps, rule) {
    const newStep = {
      id: `dynamic_${Date.now()}`,
      name: rule.action_value,
      type: 'review',
      // ... configuration from rule
      order_index: this.findInsertPosition(steps, rule)
    };
    
    steps.push(newStep);
    return this.reorderSteps(steps);
  }
  
  skipStep(steps, rule) {
    return steps.filter(s => s.id !== rule.action_target_step_id);
  }
  
  reassignStep(steps, rule) {
    return steps.map(s => {
      if (s.id === rule.action_target_step_id) {
        return {
          ...s,
          assigned_user_id: rule.action_value
        };
      }
      return s;
    });
  }
  
  setDueDate(steps, rule) {
    return steps.map(s => {
      if (s.id === rule.action_target_step_id) {
        return {
          ...s,
          due_days: Number(rule.action_value)
        };
      }
      return s;
    });
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => 
      current?.[prop], obj
    );
  }
  
  reorderSteps(steps) {
    return steps.map((step, index) => ({
      ...step,
      order_index: index + 1
    }));
  }
}
```

#### 3. Workflow Orchestrator

```javascript
class WorkflowOrchestrator {
  constructor(
    workflowLoader,
    ruleEvaluator,
    stepManager,
    taskManager,
    notificationService,
    auditLogger
  ) {
    this.workflowLoader = workflowLoader;
    this.ruleEvaluator = ruleEvaluator;
    this.stepManager = stepManager;
    this.taskManager = taskManager;
    this.notificationService = notificationService;
    this.auditLogger = auditLogger;
  }
  
  async startWorkflow(nda, workflowId) {
    const transaction = await db.beginTransaction();
    
    try {
      // 1. Load workflow definition
      const workflow = await this.workflowLoader.loadWorkflow(workflowId);
      
      // 2. Evaluate rules and get final steps
      const { steps, appliedRules } = this.ruleEvaluator.evaluateRules(
        workflow,
        nda
      );
      
      // 3. Create workflow instance
      const instance = await db.workflowInstances.create({
        nda_id: nda.id,
        workflow_id: workflow.id,
        workflow_version: workflow.version,
        status: 'in_progress',
        evaluated_steps: steps,
        metadata: {
          applied_rules: appliedRules.map(r => r.id)
        }
      }, { transaction });
      
      // 4. Create step executions
      const stepExecutions = [];
      for (const step of steps) {
        const assignee = await this.resolveAssignee(step, nda);
        const dueDate = this.calculateDueDate(step.due_days);
        
        const execution = await db.stepExecutions.create({
          workflow_instance_id: instance.id,
          workflow_step_id: step.id,
          name: step.name,
          type: step.type,
          status: 'pending',
          order_index: step.order_index,
          assigned_to: assignee.id,
          assigned_at: new Date(),
          due_date: dueDate
        }, { transaction });
        
        stepExecutions.push(execution);
      }
      
      // 5. Start first step
      const firstStep = stepExecutions[0];
      await this.stepManager.startStep(firstStep, { transaction });
      
      // 6. Update NDA
      await db.ndas.update(nda.id, {
        current_workflow_instance_id: instance.id,
        current_step_id: firstStep.id,
        status: this.mapStepTypeToNDAStatus(firstStep.type)
      }, { transaction });
      
      // 7. Create task for assignee
      await this.taskManager.createTask({
        type: 'workflow_step',
        nda_id: nda.id,
        step_execution_id: firstStep.id,
        title: `${firstStep.name}: ${nda.title}`,
        priority: this.calculatePriority(nda, firstStep),
        assigned_to: firstStep.assigned_to,
        due_date: firstStep.due_date
      }, { transaction });
      
      // 8. Send notification
      await this.notificationService.sendStepAssignedNotification(
        firstStep,
        nda
      );
      
      // 9. Audit log
      await this.auditLogger.log({
        event_type: 'workflow_started',
        aggregate_type: 'nda',
        aggregate_id: nda.id,
        actor_id: nda.created_by,
        event_data: {
          workflow_id: workflow.id,
          instance_id: instance.id,
          first_step: firstStep.name,
          total_steps: stepExecutions.length
        }
      }, { transaction });
      
      await transaction.commit();
      
      return instance;
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  async completeStep(stepExecutionId, decision, comments, userId) {
    const transaction = await db.beginTransaction();
    
    try {
      // 1. Get step execution
      const stepExecution = await db.stepExecutions.findById(
        stepExecutionId,
        { transaction }
      );
      
      if (stepExecution.status !== 'in_progress') {
        throw new Error('Step is not in progress');
      }
      
      // 2. Validate user can complete this step
      await this.validateStepCompletion(stepExecution, userId);
      
      // 3. Update step execution
      await db.stepExecutions.update(stepExecutionId, {
        status: 'completed',
        decision: decision,
        comments: comments,
        completed_by: userId,
        completed_at: new Date()
      }, { transaction });
      
      // 4. Get workflow instance and NDA
      const instance = await db.workflowInstances.findById(
        stepExecution.workflow_instance_id,
        { transaction }
      );
      const nda = await db.ndas.findById(instance.nda_id, { transaction });
      
      // 5. Handle rejection
      if (decision === 'rejected') {
        await this.handleRejection(instance, nda, stepExecution, transaction);
        await transaction.commit();
        return { status: 'rejected' };
      }
      
      // 6. Get next step
      const nextStep = await this.getNextStep(instance, stepExecution);
      
      if (nextStep) {
        // Start next step
        await this.stepManager.startStep(nextStep, { transaction });
        
        // Update NDA
        await db.ndas.update(nda.id, {
          current_step_id: nextStep.id,
          status: this.mapStepTypeToNDAStatus(nextStep.type)
        }, { transaction });
        
        // Create task
        await this.taskManager.createTask({
          type: 'workflow_step',
          nda_id: nda.id,
          step_execution_id: nextStep.id,
          title: `${nextStep.name}: ${nda.title}`,
          priority: this.calculatePriority(nda, nextStep),
          assigned_to: nextStep.assigned_to,
          due_date: nextStep.due_date
        }, { transaction });
        
        // Notify assignee
        await this.notificationService.sendStepAssignedNotification(
          nextStep,
          nda
        );
        
      } else {
        // Workflow complete
        await this.completeWorkflow(instance, nda, transaction);
      }
      
      // 7. Audit log
      await this.auditLogger.log({
        event_type: 'workflow_step_completed',
        aggregate_type: 'nda',
        aggregate_id: nda.id,
        actor_id: userId,
        event_data: {
          step_name: stepExecution.name,
          decision: decision,
          comments: comments
        }
      }, { transaction });
      
      await transaction.commit();
      
      return { status: 'success', nextStep };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  async getNextStep(instance, currentStep) {
    const steps = await db.stepExecutions.findByInstanceId(instance.id, {
      order: [['order_index', 'ASC']]
    });
    
    const currentIndex = steps.findIndex(s => s.id === currentStep.id);
    
    // Find next pending or skipped step
    for (let i = currentIndex + 1; i < steps.length; i++) {
      if (steps[i].status === 'pending') {
        return steps[i];
      }
    }
    
    return null; // No more steps
  }
  
  async completeWorkflow(instance, nda, transaction) {
    // Update instance
    await db.workflowInstances.update(instance.id, {
      status: 'completed',
      completed_at: new Date()
    }, { transaction });
    
    // Update NDA
    await db.ndas.update(nda.id, {
      status: 'waiting_for_signature',
      approved_at: new Date()
    }, { transaction });
    
    // Notify requester
    await this.notificationService.sendWorkflowCompletedNotification(
      instance,
      nda
    );
    
    // Audit log
    await this.auditLogger.log({
      event_type: 'workflow_completed',
      aggregate_type: 'nda',
      aggregate_id: nda.id,
      event_data: {
        instance_id: instance.id,
        duration_days: this.calculateDuration(instance)
      }
    }, { transaction });
  }
  
  async handleRejection(instance, nda, stepExecution, transaction) {
    // Update instance
    await db.workflowInstances.update(instance.id, {
      status: 'cancelled',
      completed_at: new Date()
    }, { transaction });
    
    // Update NDA
    await db.ndas.update(nda.id, {
      status: 'rejected',
      current_step_id: null
    }, { transaction });
    
    // Notify requester
    await this.notificationService.sendRejectionNotification(
      nda,
      stepExecution
    );
  }
  
  async resolveAssignee(step, nda) {
    if (step.assigned_user_id) {
      return await db.users.findById(step.assigned_user_id);
    }
    
    // Find user by role
    const role = step.assigned_role;
    
    // Department-specific assignment
    if (role === 'legal_reviewer') {
      return await this.findLegalReviewerForDepartment(nda.department);
    }
    
    if (role === 'manager') {
      return await this.findManagerForUser(nda.created_by);
    }
    
    // Round-robin or load-balanced assignment
    return await this.findUserByRole(role);
  }
  
  calculateDueDate(dueDays) {
    const now = new Date();
    now.setDate(now.getDate() + dueDays);
    return now;
  }
  
  calculatePriority(nda, step) {
    if (nda.risk_level === 'high') return 'high';
    if (step.due_days <= 1) return 'urgent';
    if (step.due_days <= 3) return 'high';
    return 'medium';
  }
  
  mapStepTypeToNDAStatus(stepType) {
    const mapping = {
      'review': 'in_legal_review',
      'approval': 'pending_approval',
      'signature': 'waiting_for_signature',
      'notification': 'in_progress'
    };
    return mapping[stepType] || 'in_progress';
  }
}
```

#### 4. Background Jobs

```javascript
// Check for overdue steps
async function checkOverdueSteps() {
  const overdueSteps = await db.stepExecutions.findAll({
    where: {
      status: 'in_progress',
      due_date: { [Op.lt]: new Date() },
      reminded_at: null
    }
  });
  
  for (const step of overdueSteps) {
    // Send reminder
    await notificationService.sendOverdueReminder(step);
    
    // Mark as reminded
    await db.stepExecutions.update(step.id, {
      reminded_at: new Date()
    });
    
    // Escalate if severely overdue (e.g., > 2 days)
    const daysOverdue = daysBetween(step.due_date, new Date());
    if (daysOverdue > 2) {
      await escalationService.escalateOverdueStep(step);
    }
  }
}

// Run every hour
schedule.scheduleJob('0 * * * *', checkOverdueSteps);
```

---

## Authentication & Authorization

### Authentication Strategy

**OAuth 2.0 + JWT** for modern, stateless authentication

#### Authentication Flow

```
1. User Login
   ↓
2. Validate credentials (LDAP/Active Directory)
   ↓
3. Generate JWT token
   ↓
4. Return token to client
   ↓
5. Client stores token (httpOnly cookie or localStorage)
   ↓
6. Client sends token with each request
   ↓
7. Server validates token
   ↓
8. Server authorizes based on roles/permissions
```

### Role-Based Access Control (RBAC)

#### Roles

```javascript
const ROLES = {
  // Administrative roles
  SUPER_ADMIN: {
    name: 'super_admin',
    permissions: ['*'] // All permissions
  },
  
  ADMIN: {
    name: 'admin',
    permissions: [
      'users.manage',
      'roles.manage',
      'workflows.manage',
      'templates.manage',
      'settings.manage',
      'audit.view'
    ]
  },
  
  // Operational roles
  REQUESTER: {
    name: 'requester',
    permissions: [
      'ndas.create',
      'ndas.view.own',
      'ndas.edit.own',
      'ndas.submit',
      'documents.upload',
      'comments.create'
    ]
  },
  
  LEGAL_REVIEWER: {
    name: 'legal_reviewer',
    permissions: [
      'ndas.view.assigned',
      'ndas.review',
      'ndas.approve',
      'ndas.reject',
      'templates.create',
      'templates.edit',
      'clauses.manage',
      'comments.create'
    ]
  },
  
  MANAGER: {
    name: 'manager',
    permissions: [
      'ndas.view.department',
      'ndas.approve',
      'ndas.reject',
      'tasks.view.team',
      'reports.view.department',
      'comments.create'
    ]
  },
  
  APPROVER: {
    name: 'approver',
    permissions: [
      'ndas.view.assigned',
      'ndas.approve',
      'ndas.reject',
      'comments.create'
    ]
  },
  
  EXTERNAL_PARTY: {
    name: 'external_party',
    permissions: [
      'ndas.view.shared',
      'documents.sign',
      'comments.create.limited'
    ]
  }
};
```

#### Permission Checks

```javascript
// Middleware for permission checking
function requirePermission(permission) {
  return async (req, res, next) => {
    const user = req.user; // From JWT
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' }
      });
    }
    
    const hasPermission = await authService.userHasPermission(
      user.id,
      permission
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Insufficient permissions' }
      });
    }
    
    next();
  };
}

// Usage in routes
router.post('/api/v1/workflows',
  requirePermission('workflows.manage'),
  workflowController.create
);

router.get('/api/v1/ndas/:id',
  requirePermission('ndas.view'),
  async (req, res) => {
    const nda = await ndaService.findById(req.params.id);
    
    // Additional ownership check
    if (!await authService.canViewNDA(req.user, nda)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' }
      });
    }
    
    res.json({ success: true, data: nda });
  }
);
```

#### Data Access Control

```javascript
class AuthorizationService {
  async canViewNDA(user, nda) {
    // Super admin can view all
    if (user.roles.includes('super_admin')) return true;
    
    // Creator can view own
    if (nda.created_by === user.id) return true;
    
    // Department manager can view department NDAs
    if (
      user.roles.includes('manager') &&
      nda.department === user.department
    ) {
      return true;
    }
    
    // Assigned user can view
    const isAssigned = await this.isUserAssignedToNDA(user.id, nda.id);
    if (isAssigned) return true;
    
    // Legal reviewers can view NDAs in their queue
    if (
      user.roles.includes('legal_reviewer') &&
      nda.status === 'in_legal_review'
    ) {
      return true;
    }
    
    return false;
  }
  
  async canEditNDA(user, nda) {
    // Only creator can edit draft NDAs
    if (nda.status === 'draft' && nda.created_by === user.id) {
      return true;
    }
    
    // Admin can edit
    if (user.roles.includes('admin')) return true;
    
    return false;
  }
  
  async canApproveStep(user, stepExecution) {
    // Must be assigned to the step
    if (stepExecution.assigned_to !== user.id) {
      return false;
    }
    
    // Step must be in progress
    if (stepExecution.status !== 'in_progress') {
      return false;
    }
    
    return true;
  }
}
```

---

## Security & Compliance

### Security Measures

#### 1. **Data Encryption**

```javascript
// At Rest
- Database encryption (PostgreSQL TDE)
- Document storage encryption (S3 server-side encryption)
- Backup encryption

// In Transit
- TLS 1.3 for all API communication
- Certificate pinning for mobile apps
- Encrypted database connections
```

#### 2. **Input Validation & Sanitization**

```javascript
const Joi = require('joi');

// Request validation schema
const createNDASchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  counterparty_name: Joi.string().min(2).max(255).required(),
  counterparty_contact_email: Joi.string().email().required(),
  type: Joi.string().valid(
    'mutual',
    'one-way-gov',
    'one-way-counterparty',
    'visitor'
  ).required(),
  purpose: Joi.string().min(10).max(5000).required(),
  risk_level: Joi.string().valid('low', 'medium', 'high').required(),
  // ... other fields
});

// Middleware
function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        }
      });
    }
    
    req.validatedData = value;
    next();
  };
}
```

#### 3. **SQL Injection Prevention**

```javascript
// Use parameterized queries (ORM handles this)
const nda = await db.ndas.findOne({
  where: { id: req.params.id } // Parameterized
});

// NEVER do this:
// const nda = await db.query(`SELECT * FROM ndas WHERE id = ${req.params.id}`);
```

#### 4. **XSS Prevention**

```javascript
// Sanitize HTML input
const sanitizeHtml = require('sanitize-html');

function sanitizeInput(input) {
  return sanitizeHtml(input, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {}
  });
}

// For rich text fields (comments, purpose), allow limited HTML
function sanitizeRichText(input) {
  return sanitizeHtml(input, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    allowedAttributes: {}
  });
}
```

#### 5. **CSRF Protection**

```javascript
const csrf = require('csurf');

// CSRF middleware
app.use(csrf({
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  }
}));

// Include CSRF token in responses
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
```

#### 6. **Rate Limiting**

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    });
  }
});

app.use('/api/', apiLimiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  skipSuccessfulRequests: true
});

app.use('/api/v1/auth/login', authLimiter);
```

### Compliance Requirements

#### 1. **Audit Logging**

Every action must be logged for compliance:

```javascript
async function auditLog(event) {
  await db.auditEvents.create({
    event_type: event.type,
    aggregate_type: event.aggregateType,
    aggregate_id: event.aggregateId,
    actor_id: event.actorId,
    actor_ip: event.ip,
    actor_user_agent: event.userAgent,
    event_data: event.data,
    previous_state: event.previousState,
    new_state: event.newState,
    occurred_at: new Date(),
    correlation_id: event.correlationId,
    metadata: event.metadata
  });
}

// Usage
await auditLog({
  type: 'nda_approved',
  aggregateType: 'nda',
  aggregateId: nda.id,
  actorId: user.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  data: {
    decision: 'approved',
    comments: 'Looks good'
  },
  previousState: { status: 'in_legal_review' },
  newState: { status: 'pending_approval' }
});
```

#### 2. **Data Retention**

```javascript
const RETENTION_POLICIES = {
  ndas: {
    active: 'indefinite',
    terminated: '7 years',
    rejected: '3 years'
  },
  audit_logs: 'indefinite',
  documents: 'same as NDA',
  user_data: '2 years after last activity'
};

// Scheduled job to archive old data
async function archiveOldRecords() {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 7);
  
  const oldNDAs = await db.ndas.findAll({
    where: {
      status: 'terminated',
      terminated_at: { [Op.lt]: cutoffDate }
    }
  });
  
  for (const nda of oldNDAs) {
    await archiveService.archiveNDA(nda);
    await db.ndas.update(nda.id, { archived: true });
  }
}
```

#### 3. **PII Protection**

```javascript
// Mark PII fields
const PII_FIELDS = [
  'counterparty_contact_name',
  'counterparty_contact_email',
  'counterparty_contact_phone'
];

// Redact PII in logs
function redactPII(data) {
  const redacted = { ...data };
  PII_FIELDS.forEach(field => {
    if (redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  });
  return redacted;
}

// Log without PII
logger.info('NDA created', redactPII(nda));
```

#### 4. **Digital Signatures**

```javascript
// Integrate with DocuSign or Adobe Sign
class SignatureService {
  async sendForSignature(nda, document) {
    const envelope = await docusign.createEnvelope({
      emailSubject: `Please sign NDA: ${nda.title}`,
      documents: [{
        documentId: '1',
        name: document.filename,
        fileContent: document.content
      }],
      recipients: {
        signers: [{
          email: nda.counterparty_contact_email,
          name: nda.counterparty_contact_name,
          recipientId: '1',
          tabs: {
            signHereTabs: [{
              xPosition: '100',
              yPosition: '100',
              documentId: '1',
              pageNumber: '1'
            }]
          }
        }]
      },
      status: 'sent'
    });
    
    // Store envelope ID
    await db.documents.update(document.id, {
      signature_status: 'sent',
      signature_provider: 'docusign',
      signature_envelope_id: envelope.envelopeId
    });
    
    return envelope;
  }
  
  async handleSignatureWebhook(event) {
    // DocuSign webhook handler
    if (event.event === 'envelope-completed') {
      const document = await db.documents.findOne({
        where: { signature_envelope_id: event.envelopeId }
      });
      
      await db.documents.update(document.id, {
        signature_status: 'completed'
      });
      
      const nda = await db.ndas.findById(document.nda_id);
      await db.ndas.update(nda.id, {
        status: 'executed',
        executed_at: new Date()
      });
      
      await notificationService.sendExecutionNotification(nda);
    }
  }
}
```

---

## Integration Points

### 1. **Email Service**

```javascript
// Using SendGrid or AWS SES
class EmailService {
  async sendEmail({ to, subject, templateId, data }) {
    const msg = {
      to: to,
      from: 'nda-system@agency.gov',
      subject: subject,
      templateId: templateId,
      dynamicTemplateData: data
    };
    
    await sendgrid.send(msg);
    
    // Log email sent
    await db.emailLogs.create({
      recipient: to,
      subject: subject,
      template: templateId,
      sent_at: new Date()
    });
  }
  
  // Email templates
  async sendStepAssignedEmail(user, nda, step) {
    await this.sendEmail({
      to: user.email,
      subject: `New Task: ${step.name} for ${nda.title}`,
      templateId: 'step_assigned',
      data: {
        user_name: user.full_name,
        nda_title: nda.title,
        step_name: step.name,
        due_date: step.due_date,
        link: `${process.env.APP_URL}/nda/${nda.id}`
      }
    });
  }
}
```

### 2. **Active Directory / LDAP**

```javascript
const ldap = require('ldapjs');

class LDAPService {
  constructor() {
    this.client = ldap.createClient({
      url: process.env.LDAP_URL
    });
  }
  
  async authenticate(username, password) {
    return new Promise((resolve, reject) => {
      const dn = `uid=${username},${process.env.LDAP_BASE_DN}`;
      
      this.client.bind(dn, password, (err) => {
        if (err) {
          reject(new Error('Invalid credentials'));
        } else {
          resolve(true);
        }
      });
    });
  }
  
  async getUserInfo(username) {
    return new Promise((resolve, reject) => {
      const opts = {
        filter: `(uid=${username})`,
        scope: 'sub',
        attributes: ['cn', 'mail', 'department', 'title']
      };
      
      this.client.search(process.env.LDAP_BASE_DN, opts, (err, res) => {
        if (err) return reject(err);
        
        const entries = [];
        res.on('searchEntry', (entry) => {
          entries.push(entry.object);
        });
        
        res.on('end', () => {
          resolve(entries[0]);
        });
      });
    });
  }
}
```

### 3. **Document Storage (S3 / MinIO)**

```javascript
const AWS = require('aws-sdk');

class DocumentStorageService {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_REGION
    });
    this.bucket = process.env.S3_BUCKET_NAME;
  }
  
  async uploadDocument(file, ndaId) {
    const key = `ndas/${ndaId}/${Date.now()}-${file.originalname}`;
    
    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256',
      Metadata: {
        nda_id: ndaId,
        uploaded_by: file.uploadedBy
      }
    };
    
    const result = await this.s3.upload(params).promise();
    
    return {
      storage_key: key,
      storage_url: result.Location,
      etag: result.ETag
    };
  }
  
  async getSignedUrl(key, expiresIn = 3600) {
    const params = {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresIn // 1 hour
    };
    
    return await this.s3.getSignedUrlPromise('getObject', params);
  }
  
  async deleteDocument(key) {
    await this.s3.deleteObject({
      Bucket: this.bucket,
      Key: key
    }).promise();
  }
}
```

---

## Deployment Architecture

### Production Infrastructure

```
┌─────────────────────────────────────────────────────────┐
│                     Load Balancer                       │
│                    (AWS ALB / NGINX)                    │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┬───────────┐
        ▼                       ▼           ▼
┌───────────────┐      ┌───────────────┐  ┌───────────────┐
│  API Server   │      │  API Server   │  │  API Server   │
│   (Node.js)   │      │   (Node.js)   │  │   (Node.js)   │
│   Instance 1  │      │   Instance 2  │  │   Instance 3  │
└───────┬───────┘      └───────┬───────┘  └───────┬───────┘
        │                      │                   │
        └──────────────────────┴───────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
    ┌──────────────────┐          ┌──────────────────┐
    │   PostgreSQL     │          │   Redis Cache    │
    │   Primary + RR   │          │   (Session/Job)  │
    └──────────────────┘          └──────────────────┘
                │
                ▼
    ┌──────────────────────────────┐
    │   S3 / Object Storage        │
    │   (Documents)                │
    └──────────────────────────────┘
```

### Environment Configuration

```yaml
# docker-compose.yml (for local development)
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://user:pass@db:5432/nda_dev
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - db
      - redis
    volumes:
      - ./src:/app/src
  
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: nda_dev
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  worker:
    build: .
    command: npm run worker
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://user:pass@db:5432/nda_dev
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
```

### Environment Variables

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgres://user:pass@prod-db:5432/nda_production
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Redis
REDIS_URL=redis://prod-redis:6379

# Authentication
JWT_SECRET=<strong-secret-key>
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

# OAuth/SAML
OAUTH_CLIENT_ID=<client-id>
OAUTH_CLIENT_SECRET=<client-secret>
SAML_ENTRY_POINT=https://idp.agency.gov/saml

# LDAP
LDAP_URL=ldap://ad.agency.gov:389
LDAP_BASE_DN=dc=agency,dc=gov

# Email
SENDGRID_API_KEY=<api-key>
EMAIL_FROM=nda-system@agency.gov

# Document Storage
AWS_ACCESS_KEY=<access-key>
AWS_SECRET_KEY=<secret-key>
AWS_REGION=us-gov-west-1
S3_BUCKET_NAME=nda-documents-prod

# E-Signature
DOCUSIGN_INTEGRATION_KEY=<key>
DOCUSIGN_API_BASE_URL=https://demo.docusign.net

# Application
APP_URL=https://nda.agency.gov
FRONTEND_URL=https://nda.agency.gov

# Logging
LOG_LEVEL=info
SENTRY_DSN=<sentry-dsn>

# Rate Limiting
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=3600000
```

### Monitoring & Logging

```javascript
// Winston logger setup
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'nda-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// APM - Application Performance Monitoring
const apm = require('elastic-apm-node').start({
  serviceName: 'nda-api',
  secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
  serverUrl: process.env.ELASTIC_APM_SERVER_URL
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
      storage: 'unknown'
    }
  };
  
  try {
    await db.raw('SELECT 1');
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
  }
  
  try {
    await redis.ping();
    health.checks.redis = 'healthy';
  } catch (error) {
    health.checks.redis = 'unhealthy';
  }
  
  const isHealthy = Object.values(health.checks)
    .every(check => check === 'healthy');
  
  res.status(isHealthy ? 200 : 503).json(health);
});
```

---

## Technology Stack

### Recommended Stack

```yaml
Runtime:
  - Node.js 20 LTS (or)
  - Python 3.11+ with FastAPI

API Framework:
  - Express.js + TypeScript (Node.js)
  - NestJS (Node.js, enterprise-grade)
  - FastAPI (Python)

Database:
  - PostgreSQL 15+
  - pg (Node.js driver)
  - TypeORM or Prisma (ORM)

Caching & Queue:
  - Redis 7+
  - Bull (Job queue for Node.js)
  - ioredis (Redis client)

Authentication:
  - Passport.js (OAuth, SAML, LDAP)
  - jsonwebtoken (JWT)

Validation:
  - Joi or Zod (schema validation)
  - class-validator (TypeScript)

Testing:
  - Jest (unit & integration tests)
  - Supertest (API testing)
  - Faker.js (test data generation)

Documentation:
  - Swagger/OpenAPI 3.0
  - swagger-ui-express

Monitoring:
  - Winston (logging)
  - Elastic APM or New Relic
  - Sentry (error tracking)

DevOps:
  - Docker + Docker Compose
  - Kubernetes (production)
  - GitHub Actions or GitLab CI/CD
```

### Alternative Stacks

#### Java/Spring Boot (Enterprise)

```yaml
Runtime: Java 17+
Framework: Spring Boot 3.x
ORM: Hibernate
Security: Spring Security
Queue: RabbitMQ or Apache Kafka
Testing: JUnit 5, Mockito
```

#### .NET (Government Preferred)

```yaml
Runtime: .NET 8
Framework: ASP.NET Core
ORM: Entity Framework Core
Security: Identity Framework
Queue: Azure Service Bus or RabbitMQ
Testing: xUnit, NSubstitute
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

```
Week 1-2: Infrastructure Setup
- [ ] Set up development environment
- [ ] Configure database (PostgreSQL)
- [ ] Set up Redis
- [ ] Configure Docker containers
- [ ] Set up CI/CD pipeline

Week 3-4: Core API Development
- [ ] Authentication service
- [ ] User management
- [ ] Role-based access control
- [ ] Basic CRUD for NDAs
- [ ] API documentation (Swagger)
```

### Phase 2: Core Features (Weeks 5-8)

```
Week 5-6: NDA Management
- [ ] NDA creation & editing
- [ ] Template management
- [ ] Clause library
- [ ] Document upload/storage
- [ ] Search functionality

Week 7-8: Workflow Foundation
- [ ] Workflow definition CRUD
- [ ] Workflow step management
- [ ] Rule definition
```

### Phase 3: Workflow Engine (Weeks 9-12)

```
Week 9-10: Workflow Execution
- [ ] Workflow orchestrator
- [ ] Rule evaluator
- [ ] Step assignment logic
- [ ] Task management

Week 11-12: Workflow Features
- [ ] Notifications (email, in-app)
- [ ] Background jobs (reminders, escalation)
- [ ] Workflow status tracking
```

### Phase 4: Integration & Polish (Weeks 13-16)

```
Week 13: External Integrations
- [ ] E-signature integration (DocuSign)
- [ ] LDAP/Active Directory
- [ ] Email service

Week 14: Reporting & Analytics
- [ ] Dashboard metrics API
- [ ] Report generation
- [ ] Export functionality

Week 15: Testing & Quality
- [ ] Comprehensive unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] Performance testing
- [ ] Security audit

Week 16: Documentation & Deployment
- [ ] API documentation complete
- [ ] Deployment guide
- [ ] Operations runbook
- [ ] Production deployment
```

### Phase 5: Production & Monitoring (Week 17+)

```
Week 17-18: Production Launch
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] User acceptance testing
- [ ] Training materials

Week 19-20: Iteration
- [ ] Bug fixes from UAT
- [ ] Performance optimization
- [ ] Feature refinements
```

---

## Success Metrics

### Technical Metrics

```
Performance:
- API response time: < 200ms (p95)
- Database query time: < 50ms (p95)
- Page load time: < 2 seconds

Reliability:
- Uptime: 99.9%
- Error rate: < 0.1%
- Failed job retry success: > 95%

Security:
- Zero critical vulnerabilities
- All API endpoints authenticated
- Complete audit trail for all actions
```

### Business Metrics

```
Efficiency:
- Average NDA approval time: < 5 days
- Task completion rate: > 90%
- On-time completion: > 85%

Adoption:
- User satisfaction: > 4.5/5
- Daily active users: > 80% of total
- Feature utilization: > 70%
```

---

## Appendix

### A. Database Indexes Reference

```sql
-- Critical indexes for performance
CREATE INDEX idx_ndas_created_at_desc ON ndas(created_at DESC);
CREATE INDEX idx_step_executions_composite ON step_executions(assigned_to, status, due_date);
CREATE INDEX idx_audit_events_composite ON audit_events(aggregate_id, occurred_at DESC);
```

### B. API Rate Limit Tiers

```
Tier 1 (Normal Users): 1,000 requests/hour
Tier 2 (Power Users): 5,000 requests/hour
Tier 3 (Service Accounts): 10,000 requests/hour
Tier 4 (Admin): Unlimited
```

### C. Error Codes Reference

```
AUTH001: Invalid credentials
AUTH002: Token expired
AUTH003: Insufficient permissions

VAL001: Validation error
VAL002: Missing required field
VAL003: Invalid format

WF001: Workflow not found
WF002: Invalid workflow state
WF003: Step already completed
WF004: User not assigned to step

SYS001: Database error
SYS002: External service unavailable
SYS003: Internal server error
```

---

**Document End**

*This is a living document and should be updated as the system evolves.*

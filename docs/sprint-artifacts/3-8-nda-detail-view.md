# Story 3.8: NDA Detail View

Status: backlog

## Story

As an **NDA user**,
I want **to view complete NDA information on a detail page**,
so that **I can see all fields, documents, history, and take actions**.

## Acceptance Criteria

### AC1: Detail Page Content
**Given** I click on NDA #1590 from list
**When** Detail page loads
**Then** Shows all NDA fields (company, agency, POCs, dates, purpose, etc.)
**And** Document list (all versions with download links)
**And** Email history (sent emails with recipients)
**And** Audit timeline (chronological, visual with icons)
**And** Status progression visualization (circles: Created → Emailed → etc.)
**And** Action buttons: Edit, Send Email, Upload Document, Change Status

### AC2: Permission-Aware Actions
**Given** I don't have permission to send email
**When** Viewing NDA detail
**Then** "Send Email" button is disabled (grayed out)
**And** Tooltip shows: "You don't have permission to send emails"

## Tasks / Subtasks

- [ ] **Task 1: NDA Detail API** (AC: 1)
  - [ ] 1.1: Implement `GET /api/ndas/:id` with full data
  - [ ] 1.2: Include related documents
  - [ ] 1.3: Include email history
  - [ ] 1.4: Include audit trail
  - [ ] 1.5: Include status history with timestamps

- [ ] **Task 2: Permission Checks** (AC: 2)
  - [ ] 2.1: Include available actions based on user permissions
  - [ ] 2.2: Return permission info in response
  - [ ] 2.3: Add permission tooltips for disabled actions

- [ ] **Task 3: Testing** (AC: All)
  - [ ] 3.1: Test detail endpoint returns all data
  - [ ] 3.2: Test permission-based action availability
  - [ ] 3.3: Test row-level security (can't view unauthorized NDA)

## Dev Notes

### Detail Response

```typescript
interface NdaDetailResponse {
  nda: {
    id: string;
    displayId: number;
    companyName: string;
    // ... all NDA fields
    status: NdaStatus;
    createdAt: Date;
    updatedAt: Date;
  };

  documents: Array<{
    id: string;
    filename: string;
    documentType: DocumentType;
    uploadedAt: Date;
    uploadedBy: { id: string; name: string };
  }>;

  emails: Array<{
    id: string;
    subject: string;
    recipients: string[];
    sentAt: Date;
    sentBy: { id: string; name: string };
  }>;

  auditTrail: Array<{
    action: string;
    timestamp: Date;
    userId: string;
    userName: string;
    details: Record<string, any>;
  }>;

  statusHistory: Array<{
    status: NdaStatus;
    timestamp: Date;
    changedBy: { id: string; name: string };
  }>;

  availableActions: {
    canEdit: boolean;
    canSendEmail: boolean;
    canUploadDocument: boolean;
    canChangeStatus: boolean;
  };
}
```

### Permission Logic

```typescript
const availableActions = {
  canEdit: userContext.permissions.has('nda:edit'),
  canSendEmail: userContext.permissions.has('nda:send_email'),
  canUploadDocument: userContext.permissions.has('nda:upload_document'),
  canChangeStatus: userContext.permissions.has('nda:mark_status'),
};
```

## Dependencies

- Story 3.1: Create NDA with Basic Form
- Story 3.5: RTF Document Generation
- Story 1.3: RBAC Permission System

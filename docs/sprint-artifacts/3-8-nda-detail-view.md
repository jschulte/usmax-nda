# Story 3.8: NDA Detail View

Status: done

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

### Review Follow-ups (AI)
- [x] [AI-Review][HIGH] Implement real email history in detail response and surface it in the UI (currently always empty and never loaded). [src/server/services/ndaService.ts:509]
- [x] [AI-Review][HIGH] Wire permission-aware actions: use availableActions from API, disable buttons without permission, and add tooltip messaging. [src/components/screens/NDADetail.tsx:1060]
- [x] [AI-Review][MEDIUM] Use statusHistory/statusProgression from API instead of hardcoded workflowSteps so progression reflects real history. [src/components/screens/NDADetail.tsx:524]
- [x] [AI-Review][MEDIUM] Add missing "Edit" / explicit "Change Status" actions per AC1 (current actions are limited to review/send flows). [src/components/screens/NDADetail.tsx:1059]
- [x] [AI-Review][MEDIUM] Stop discarding detail payload fields on the client (documents/emails/audit/statusProgression/availableActions). [src/client/services/ndaService.ts:227]
- [x] [AI-Review][LOW] Add Dev Agent Record with File List + Change Log to enable verifiable review. [docs/sprint-artifacts/3-8-nda-detail-view.md:24]

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

## Dev Agent Record

### File List
- src/components/screens/NDADetail.tsx
- src/client/services/ndaService.ts
- src/server/services/ndaService.ts
- src/server/services/__tests__/ndaService.test.ts
- src/App.tsx
- docs/sprint-artifacts/3-8-nda-detail-view.md

### Change Log
- Added full detail fetch on the client and merged detail payload fields into state.
- Implemented real email history retrieval on the server and rendered it in the detail view.
- Wired permission-aware quick actions with tooltips and added Edit/Change Status buttons.
- Swapped hardcoded workflow steps for API-driven status progression.
- Added edit route for NDA detail navigation.

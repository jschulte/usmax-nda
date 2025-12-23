# Story 3.8: NDA Detail View

Status: ready-for-dev

## Story

As an **NDA user**,
I want **to view complete NDA information on a detail page**,
so that **I can see all fields, documents, history, and take actions**.

## Acceptance Criteria

### AC1: Complete NDA Information Display
**Given** I click on NDA #1590 from list
**When** Detail page loads
**Then** Shows all NDA fields (company, agency, POCs, dates, purpose, etc.)
**And** Document list (all versions with download links)
**And** Email history (sent emails with recipients)
**And** Audit timeline (chronological, visual with icons)
**And** Status progression visualization (circles: Created → Emailed → etc.)
**And** Action buttons: Edit, Send Email, Upload Document, Change Status

### AC2: Permission-Based UI Gating
**Given** I don't have permission to send email
**When** Viewing NDA detail
**Then** "Send Email" button is disabled (grayed out)
**And** Tooltip shows: "You don't have permission to send emails"

## Tasks / Subtasks

- [ ] **Task 1: NDA Detail Service** (AC: 1)
  - [ ] 1.1: Extend ndaService with getNda(id, userId) function
  - [ ] 1.2: Fetch NDA with all related data:
    - subagency, agencyGroup
    - All 4 POC contacts
    - documents (list of versions)
    - nda_emails (email history)
    - audit_log entries
  - [ ] 1.3: Apply row-level security (findNdaWithScope from Story 1-4)
  - [ ] 1.4: Return 404 if not found or unauthorized

- [ ] **Task 2: NDA Detail API** (AC: 1)
  - [ ] 2.1: Implement GET /api/ndas/:id endpoint
  - [ ] 2.2: Apply requirePermission('nda:view') and scopeToAgencies
  - [ ] 2.3: Call ndaService.getNda()
  - [ ] 2.4: Return comprehensive NDA object
  - [ ] 2.5: Include permission flags for UI gating

- [ ] **Task 3: Frontend - NDA Detail Page** (AC: 1)
  - [ ] 3.1: Create src/components/screens/NDADetail.tsx
  - [ ] 3.2: Add route: /nda/:id
  - [ ] 3.3: Fetch NDA with React Query
  - [ ] 3.4: Display loading state and error states
  - [ ] 3.5: Show 404 page if NDA not found

- [ ] **Task 4: Frontend - Detail Layout** (AC: 1)
  - [ ] 4.1: Header: Display ID, Company Name, Status Badge
  - [ ] 4.2: Subheader: Agency, Effective Date, Created Date
  - [ ] 4.3: Tabbed interface: Details, Documents, Email History, Audit Trail
  - [ ] 4.4: Action buttons in header (Edit, Send Email, Upload, Clone)
  - [ ] 4.5: Responsive layout (mobile-friendly)

- [ ] **Task 5: Frontend - Details Tab** (AC: 1)
  - [ ] 5.1: Display all NDA fields in organized sections
  - [ ] 5.2: Section: Company Information (name, city, state, incorporation)
  - [ ] 5.3: Section: Agency Information (agency, subagency, office name)
  - [ ] 5.4: Section: NDA Details (purpose, opportunity name, dates, position)
  - [ ] 5.5: Section: Points of Contact (Opportunity, Contracts, Relationship, Contacts)

- [ ] **Task 6: Frontend - Documents Tab** (AC: 1)
  - [ ] 6.1: Display document list (foundation for Story 4.4)
  - [ ] 6.2: Show: filename, type, size, uploaded by, uploaded date
  - [ ] 6.3: Download button per document
  - [ ] 6.4: Upload button (if user has permission)
  - [ ] 6.5: Empty state if no documents

- [ ] **Task 7: Frontend - Permission-Gated Actions** (AC: 2)
  - [ ] 7.1: Use usePermissions() hook from Story 1-3
  - [ ] 7.2: Disable "Send Email" if no nda:send_email permission
  - [ ] 7.3: Disable "Edit" if no nda:update permission
  - [ ] 7.4: Disable "Upload" if no nda:upload_document permission
  - [ ] 7.5: Show tooltip explaining why button is disabled

- [ ] **Task 8: Testing** (AC: All)
  - [ ] 8.1: API tests for GET /api/ndas/:id
  - [ ] 8.2: Test row-level security (404 for unauthorized)
  - [ ] 8.3: Component tests for NDADetail page
  - [ ] 8.4: Test permission-based UI gating
  - [ ] 8.5: E2E test for viewing NDA detail

## Dev Notes

### NDA Detail Service

```typescript
async function getNda(id: string, userId: string) {
  const nda = await findNdaWithScope(id, userId);

  if (!nda) {
    throw new NotFoundError('NDA not found');
  }

  // Fetch related data
  const [documents, emails, auditLogs] = await Promise.all([
    prisma.document.findMany({
      where: { ndaId: id },
      orderBy: { uploadedAt: 'desc' }
    }),
    prisma.ndaEmail.findMany({
      where: { ndaId: id },
      orderBy: { sentAt: 'desc' }
    }),
    prisma.auditLog.findMany({
      where: {
        entityType: 'nda',
        entityId: id
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Last 50 audit entries
    })
  ]);

  return {
    ...nda,
    documents,
    emails,
    auditLogs
  };
}
```

### Frontend Tabbed Layout

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function NDADetail({ ndaId }: { ndaId: string }) {
  const { data: nda, isLoading } = useQuery({
    queryKey: ['nda', ndaId],
    queryFn: () => api.get(`/api/ndas/${ndaId}`).then(res => res.data)
  });

  const { hasPermission } = usePermissions();

  if (isLoading) return <Skeleton />;
  if (!nda) return <NotFoundPage />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1>NDA #{nda.displayId}</h1>
          <p className="text-xl">{nda.companyName}</p>
          <StatusBadge status={nda.status} />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => navigate(`/nda/${nda.id}/edit`)}
            disabled={!hasPermission('nda:update')}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>

          <Button
            onClick={() => handleSendEmail()}
            disabled={!hasPermission('nda:send_email')}
          >
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </Button>

          <Button
            onClick={() => handleUpload()}
            disabled={!hasPermission('nda:upload_document')}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>

          <Button onClick={() => handleClone()}>
            <Copy className="mr-2 h-4 w-4" />
            Clone
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({nda.documents?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="emails">
            Email History ({nda.emails?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="audit">
            Audit Trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <NDADetailsTab nda={nda} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab ndaId={nda.id} documents={nda.documents} />
        </TabsContent>

        <TabsContent value="emails">
          <EmailHistoryTab ndaId={nda.id} emails={nda.emails} />
        </TabsContent>

        <TabsContent value="audit">
          <AuditTrailTab ndaId={nda.id} auditLogs={nda.auditLogs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Details Tab Organization

```tsx
function NDADetailsTab({ nda }: { nda: Nda }) {
  return (
    <div className="space-y-6">
      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <DetailField label="Company Name" value={nda.companyName} />
          <DetailField label="City" value={nda.companyCity} />
          <DetailField label="State" value={nda.companyState} />
          <DetailField label="State of Incorporation" value={nda.stateOfIncorporation} />
        </CardContent>
      </Card>

      {/* Agency Information */}
      <Card>
        <CardHeader>
          <CardTitle>Agency Information</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailField label="Agency Group" value={nda.subagency.agencyGroup.name} />
          <DetailField label="Subagency" value={nda.subagency.name} />
          <DetailField label="Agency/Office Name" value={nda.agencyOfficeName} />
        </CardContent>
      </Card>

      {/* NDA Details */}
      <Card>
        <CardHeader>
          <CardTitle>NDA Details</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailField label="Authorized Purpose" value={nda.authorizedPurpose} />
          <DetailField label="Effective Date" value={formatDate(nda.effectiveDate)} />
          <DetailField label="USMax Position" value={nda.usmaxPosition} />
          <DetailField label="Non-USMax NDA" value={nda.nonUsmax ? 'Yes' : 'No'} />
        </CardContent>
      </Card>

      {/* Points of Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Points of Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactField label="Opportunity POC" contact={nda.opportunityContact} />
          <ContactField label="Contracts POC" contact={nda.contractsContact} />
          <ContactField label="Relationship POC" contact={nda.relationshipContact} />
          <ContactField label="Contacts POC" contact={nda.contactsContact} />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Permission-Based UI Gating

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <div>
      <Button
        onClick={handleSendEmail}
        disabled={!hasPermission('nda:send_email')}
      >
        Send Email
      </Button>
    </div>
  </TooltipTrigger>
  {!hasPermission('nda:send_email') && (
    <TooltipContent>
      You don't have permission to send emails - contact admin
    </TooltipContent>
  )}
</Tooltip>
```

### Integration with Future Stories

**Foundation for:**
- Story 3-9: Status progression visualization (displayed on this page)
- Story 3-10: Email composition (action button)
- Story 4.1: Document upload (action button, documents tab)
- Story 4.4: Document history (documents tab content)
- Story 6.5: Audit trail viewer (audit tab content)

**Main hub** for all NDA operations.

### Project Structure Notes

**New Files:**
- `src/components/screens/NDADetail.tsx` - NEW
- `src/components/nda/NDADetailsTab.tsx` - NEW
- `src/components/nda/DocumentsTab.tsx` - NEW (placeholder for Story 4.4)
- `src/components/nda/EmailHistoryTab.tsx` - NEW (placeholder)
- `src/components/nda/AuditTrailTab.tsx` - NEW (placeholder for Story 6.5)

**Files to Modify:**
- `src/server/services/ndaService.ts` - MODIFY (add getNda with includes)
- `src/server/routes/ndas.ts` - VERIFY GET /ndas/:id exists
- `src/App.tsx` - ADD /nda/:id route

**Follows established patterns:**
- Service layer with comprehensive includes
- Row-level security via findNdaWithScope
- Permission-based UI gating from Story 1-3
- Tabbed layout for organization

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.8]
- [Source: Story 3-1 - NDA model]
- [Source: Story 3-7 - NDA list navigation]
- [Source: Story 1-3 - Permission-based UI]
- [Source: Story 1-4 - Row-level security]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Main NDA detail/hub page
- Tabbed interface for organization
- Permission-based action buttons
- Foundation for document, email, audit features (future stories)
- Comprehensive data loading with related entities

### File List

Files to be created/modified during implementation:
- `src/components/screens/NDADetail.tsx` - NEW
- `src/components/nda/NDADetailsTab.tsx` - NEW
- `src/components/nda/DocumentsTab.tsx` - NEW (placeholder)
- `src/components/nda/EmailHistoryTab.tsx` - NEW (placeholder)
- `src/components/nda/AuditTrailTab.tsx` - NEW (placeholder)
- `src/components/ui/DetailField.tsx` - NEW (reusable component)
- `src/server/services/ndaService.ts` - MODIFY (add getNda)
- `src/App.tsx` - MODIFY (add /nda/:id route)
- `src/components/screens/__tests__/NDADetail.test.tsx` - NEW

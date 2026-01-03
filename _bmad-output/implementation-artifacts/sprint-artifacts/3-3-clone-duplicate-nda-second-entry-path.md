# Story 3.3: Clone/Duplicate NDA (Second Entry Path)

Status: review

## Story

As an **NDA user**,
I want **to duplicate an existing NDA and change only what's different**,
so that **I can quickly create similar NDAs (common for repeat partners)**.

## Acceptance Criteria

### AC1: Clone NDA Functionality
**Given** I'm viewing NDA #1590 (TechCorp, DoD Air Force, Prime)
**When** I click "Clone NDA" button
**Then** Create NDA form opens pre-filled with ALL fields from NDA #1590
**And** Form shows banner: "Cloned from NDA #1590"
**And** I change only: Authorized Purpose, Abbreviated Opportunity Name, Effective Date
**And** Click "Create"
**Then** New NDA created with new UUID and display ID
**And** All other fields match original
**And** audit_log includes: cloned_from_nda_id=1590

## Tasks / Subtasks

- [x] **Task 1: NDA Service - Clone Logic** (AC: 1)
  - [x] 1.1: Extend ndaService with cloneNda(sourceNdaId, userId) function
  - [x] 1.2: Fetch source NDA with row-level security check
  - [x] 1.3: Copy all fields except: id, displayId, createdAt, updatedAt, status
  - [x] 1.4: Assign new UUID and display ID
  - [x] 1.5: Set status = "Created"
  - [x] 1.6: Set createdBy = current user
  - [x] 1.7: Record audit log with clonedFromNdaId metadata

- [x] **Task 2: Clone API Endpoint** (AC: 1)
  - [x] 2.1: Create POST /api/ndas/:id/clone endpoint
  - [x] 2.2: Apply middleware: authenticateJWT, attachUserContext, requirePermission('nda:create'), scopeToAgencies
  - [x] 2.3: Verify user has access to source NDA (row-level security)
  - [x] 2.4: Call ndaService.cloneNda()
  - [x] 2.5: Return cloned NDA with new ID

- [x] **Task 3: Frontend - Clone Button** (AC: 1)
  - [x] 3.1: Add "Clone NDA" button to NDA detail page
  - [x] 3.2: Position in header actions area
  - [x] 3.3: Use Copy icon from lucide-react
  - [x] 3.4: On click, navigate to /requests?cloneFrom={ndaId}
  - [x] 3.5: Keep existing clone flow in RequestWizard

- [x] **Task 4: Frontend - Clone Banner** (AC: 1)
  - [x] 4.1: Detect if form is in "clone mode" (URL param or state)
  - [x] 4.2: Show banner at top of form: "Cloned from NDA #{sourceDisplayId}"
  - [x] 4.3: Link banner to source NDA
  - [x] 4.4: Use Info or AlertCircle icon

- [x] **Task 5: Frontend - Pre-Fill Form from Clone** (AC: 1)
  - [x] 5.1: When clone source loads, populate form with all fields
  - [x] 5.2: Use RequestWizard form state setters to pre-fill cloned data
  - [x] 5.3: Highlight fields that typically change (purpose, opp name, date)
  - [x] 5.4: Clear those highlighted fields (user must re-enter)
  - [x] 5.5: Or leave filled and just focus first field to edit

- [x] **Task 6: Alternative Approach - Clone via Form Route** (AC: 1)
  - [x] 6.1: Navigate to /requests?cloneFrom={ndaId}
  - [x] 6.2: Form fetches source NDA and pre-fills
  - [x] 6.3: Submit creates new NDA (not updates original)
  - [x] 6.4: Include clonedFromNdaId in create request

- [x] **Task 7: Testing** (AC: All)
  - [x] 7.1: Unit tests for ndaService.cloneNda()
  - [x] 7.2: API tests for clone endpoint
  - [x] 7.3: Test row-level security (cannot clone unauthorized NDA)
  - [x] 7.4: Test audit log includes clonedFromNdaId
  - [x] 7.5: Component tests for clone button and banner
  - [x] 7.6: E2E test for clone flow

## Gap Analysis

### Pre-Development Analysis
- **Date:** 2026-01-03
- **Development Type:** hybrid
- **Existing Files:** 5
- **New Files:** 1

**Findings:**
- Tasks ready: 1
- Tasks partially done: 3
- Tasks already complete: 3
- Tasks refined: 0
- Tasks added: 0

**Codebase Scan:**
- `src/server/services/ndaService.ts` (cloneNda implemented with audit logging)
- `src/server/routes/ndas.ts` (POST /api/ndas/:id/clone endpoint)
- `src/client/services/ndaService.ts` (cloneNDA client)
- `src/components/screens/RequestWizard.tsx` (clone flow + banner)
- `src/server/services/__tests__/ndaService.test.ts` (clone tests)

**Status:** Ready for implementation

## Smart Batching Plan

No low-risk batchable patterns detected. Execute remaining UI and test tasks individually.

## Dev Notes

### Clone Service Implementation

```typescript
async function cloneNda(sourceNdaId: string, userId: string) {
  // Fetch source NDA with row-level security
  const sourceNda = await findNdaWithScope(sourceNdaId, userId);

  if (!sourceNda) {
    throw new NotFoundError('NDA not found or access denied');
  }

  // Verify user can create NDAs for this subagency
  const hasAccess = await verifySubagencyAccess(userId, sourceNda.subagencyId);
  if (!hasAccess) {
    throw new UnauthorizedError('Cannot clone NDA - no access to subagency');
  }

  // Create cloned NDA
  const clonedNda = await prisma.nda.create({
    data: {
      // Copy all fields
      companyName: sourceNda.companyName,
      companyCity: sourceNda.companyCity,
      companyState: sourceNda.companyState,
      stateOfIncorporation: sourceNda.stateOfIncorporation,
      agencyOfficeName: sourceNda.agencyOfficeName,
      abbreviatedOpportunityName: sourceNda.abbreviatedOpportunityName,
      authorizedPurpose: sourceNda.authorizedPurpose,
      effectiveDate: sourceNda.effectiveDate,
      usmaxPosition: sourceNda.usmaxPosition,
      nonUsmax: sourceNda.nonUsmax,
      subagencyId: sourceNda.subagencyId,
      opportunityContactId: sourceNda.opportunityContactId,
      contractsContactId: sourceNda.contractsContactId,
      relationshipContactId: sourceNda.relationshipContactId,
      contactsContactId: sourceNda.contactsContactId,

      // New NDA defaults
      status: 'CREATED',
      // UUID and displayId auto-generated
    },
    include: {
      subagency: { include: { agencyGroup: true } }
    }
  });

  // Audit log
  await auditService.log({
    action: 'nda_created',
    entityType: 'nda',
    entityId: clonedNda.id,
    userId,
    metadata: {
      displayId: clonedNda.displayId,
      clonedFromNdaId: sourceNda.id,
      clonedFromDisplayId: sourceNda.displayId
    }
  });

  return clonedNda;
}
```

### Frontend Clone Flow

**Option A: Clone then Navigate to Form:**
```tsx
// NDA Detail page
function NDADetail({ nda }: { nda: Nda }) {
  const cloneMutation = useMutation({
    mutationFn: () => api.post(`/api/ndas/${nda.id}/clone`),
    onSuccess: (clonedNda) => {
      toast.success(`NDA #${clonedNda.displayId} created from #${nda.displayId}`);
      navigate(`/nda/create?cloneFrom=${nda.id}&newId=${clonedNda.id}`);
    }
  });

  return (
    <div>
      <Button onClick={() => cloneMutation.mutate()}>
        <Copy className="mr-2 h-4 w-4" />
        Clone NDA
      </Button>
    </div>
  );
}
```

**Option B: Navigate to Form with Source ID:**
```tsx
// Simpler - just navigate to form with query param
function NDADetail({ nda }: { nda: Nda }) {
  return (
    <Button onClick={() => navigate(`/nda/create?cloneFrom=${nda.id}`)}>
      <Copy className="mr-2 h-4 w-4" />
      Clone NDA
    </Button>
  );
}

// CreateNDA form
function CreateNDA() {
  const [searchParams] = useSearchParams();
  const cloneFromId = searchParams.get('cloneFrom');

  // Fetch source NDA if cloning
  const { data: sourceNda } = useQuery({
    queryKey: ['nda', cloneFromId],
    queryFn: () => api.get(`/api/ndas/${cloneFromId}`).then(res => res.data),
    enabled: !!cloneFromId
  });

  // Pre-fill form when source NDA loads
  useEffect(() => {
    if (sourceNda) {
      form.reset(sourceNda); // Pre-fill all fields
    }
  }, [sourceNda]);

  return (
    <div>
      {cloneFromId && sourceNda && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Cloned from <Link to={`/nda/${sourceNda.id}`}>NDA #{sourceNda.displayId}</Link>
          </AlertDescription>
        </Alert>
      )}

      <Form>{/* fields */}</Form>
    </div>
  );
}
```

### Clone vs Create Distinction

**Important:** Clone creates a NEW NDA (new ID, new display ID), not an edit of the original.

**Differences:**
- **UUID:** New (auto-generated)
- **Display ID:** New (next in sequence)
- **Status:** Always "Created" (even if source was "Fully Executed")
- **Created At:** Current timestamp
- **All other fields:** Copied from source

### Use Cases for Cloning

- Repeat partner (same company, different opportunity)
- Template NDA for specific agency (clone standard DoD NDA)
- Renewing expired NDA (clone and update dates)
- Similar opportunities (same agency, similar purpose)

### Security Considerations

**Authorization:**
- User must have nda:create permission
- User must have access to source NDA's subagency (to view and clone)
- User must have access to target subagency (to create)
- If target subagency different from source, verify access

**Row-Level Security:**
- Cannot clone NDAs outside user's access
- Cloned NDA inherits subagency from source (unless user changes it)

### Integration with Previous Stories

**Builds on:**
- Story 3-1: Create NDA form and service
- Story 3-2: Form pre-fill pattern
- Story 1-4: Row-level security checks

**Alternative to:**
- Manual entry (Story 3-1)
- Company auto-fill (Story 3-2)

**All three entry paths:**
1. Manual entry (Story 3-1)
2. Company-first auto-fill (Story 3-2)
3. Clone existing (THIS STORY)

### Project Structure Notes

**New Files:**
- None (extends existing from Story 3-1)

**Files to Modify:**
- `src/server/services/ndaService.ts` - ADD cloneNda() function
- `src/server/routes/ndas.ts` - ADD POST /ndas/:id/clone endpoint
- `src/components/screens/NDADetail.tsx` - ADD clone button
- `src/components/screens/CreateNDA.tsx` - ADD clone banner and pre-fill logic

**Follows established patterns:**
- Service layer from Story 3-1
- Row-level security from Story 1-4
- Form pre-fill from Story 3-2
- Audit logging pattern

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.3]
- [Source: Story 3-1 - Create NDA foundation]
- [Source: Story 3-2 - Form pre-fill pattern]
- [Source: Story 1-4 - Row-level security]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Second of three smart entry paths
- Clone creates new NDA (not edit of original)
- All fields copied except ID, timestamps, status
- Audit log tracks source NDA
- Row-level security enforced on source and target

### File List

Files to be created/modified during implementation:
- `src/components/screens/NDADetail.tsx` - MODIFY (add clone button)
- `src/components/screens/RequestWizard.tsx` - MODIFY (clone banner/link, highlight fields)
- `src/components/__tests__/RequestWizard.test.tsx` - MODIFY (clone banner behavior)
- `src/server/routes/__tests__/ndas.test.ts` - MODIFY (clone endpoint tests)

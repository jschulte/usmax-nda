# Story 3.1: Create NDA with Basic Form

Status: ready-for-dev

## Story

As an **NDA operations user (Kelly)**,
I want **to create a new NDA by filling out a form with all required fields**,
so that **I can initiate the NDA process for a new partner opportunity**.

## Acceptance Criteria

### AC1: Display Create NDA Form
**Given** I am logged in with nda:create permission
**When** I click "Create NDA" from dashboard or NDA list
**Then** Form displays with fields:
- Company Name (required)
- Agency/Subagency dropdown (scoped to my access)
- Agency/Office Name
- Abbreviated Opportunity Name
- Authorized Purpose (≤255 chars)
- Effective Date
- USMax Position dropdown
- Non-USMax NDA checkbox
- Opportunity POC (me pre-selected)
- Contracts POC (optional)
- Relationship POC (required)
- Contacts POC (optional - TBD)

### AC2: Save as Draft
**Given** I fill required fields correctly
**When** I click "Save as Draft"
**Then** NDA created with status="Created"
**And** NDA stored in database with UUID
**And** Display ID assigned (e.g., NDA #1591)
**And** audit_log records "nda_created"
**And** I'm redirected to NDA detail page

### AC3: Real-Time Validation
**Given** I miss required field (e.g., Company Name)
**When** I try to submit
**Then** Real-time validation shows inline error: "Company Name is required"
**And** Submit button disabled until valid

### AC4: Character Limit Enforcement
**Given** I enter Authorized Purpose >255 characters
**When** I type
**Then** Character counter shows "255/255" and prevents further input
**And** Validation error if I try to bypass

## Tasks / Subtasks

- [ ] **Task 1: Database Schema - NDA Model** (AC: 2)
  - [ ] 1.1: Create Nda model in Prisma schema
  - [ ] 1.2: Add all required fields from AC1
  - [ ] 1.3: Add 4 POC foreign keys to contacts table
  - [ ] 1.4: Add subagencyId FK (determines access scope)
  - [ ] 1.5: Add displayId (integer, auto-increment sequence)
  - [ ] 1.6: Add status enum (Created, Emailed, InRevision, FullyExecuted, Inactive, Cancelled)
  - [ ] 1.7: Add USMaxPosition enum
  - [ ] 1.8: Run migration

- [ ] **Task 2: Display ID Sequence** (AC: 2)
  - [ ] 2.1: Create database sequence for display_id
  - [ ] 2.2: Or implement auto-increment logic in service layer
  - [ ] 2.3: Ensure thread-safe ID generation
  - [ ] 2.4: Display IDs start at 1590 (legacy system continuation)

- [ ] **Task 3: NDA Service Layer** (AC: 2, 3, 4)
  - [ ] 3.1: Create src/server/services/ndaService.ts
  - [ ] 3.2: Implement createNda(data, userId) function
  - [ ] 3.3: Validate all required fields
  - [ ] 3.4: Validate authorized purpose ≤255 characters
  - [ ] 3.5: Assign display ID
  - [ ] 3.6: Set status = "Created"
  - [ ] 3.7: Verify user has access to selected subagency (row-level security)
  - [ ] 3.8: Record audit log

- [ ] **Task 4: NDA API Routes** (AC: 1, 2)
  - [ ] 4.1: Create src/server/routes/ndas.ts
  - [ ] 4.2: Implement POST /api/ndas - create NDA
  - [ ] 4.3: Implement GET /api/ndas - list NDAs (for next stories)
  - [ ] 4.4: Implement GET /api/ndas/:id - get single NDA
  - [ ] 4.5: Apply middleware: authenticateJWT, attachUserContext, requirePermission('nda:create'), scopeToAgencies

- [ ] **Task 5: Validation Module** (AC: 3, 4)
  - [ ] 5.1: Create src/server/validators/ndaValidator.ts
  - [ ] 5.2: Implement required field validation
  - [ ] 5.3: Implement authorized purpose length validation (max 255)
  - [ ] 5.4: Implement date format validation
  - [ ] 5.5: Implement subagency access validation
  - [ ] 5.6: Return structured validation errors

- [ ] **Task 6: Frontend - Create NDA Form** (AC: 1, 3, 4)
  - [ ] 6.1: Create src/components/screens/CreateNDA.tsx (or RequestWizard.tsx)
  - [ ] 6.2: Use React Hook Form + Zod for validation
  - [ ] 6.3: Implement all form fields from AC1
  - [ ] 6.4: Real-time validation with inline error messages
  - [ ] 6.5: Character counter for Authorized Purpose (255 max)
  - [ ] 6.6: Disable submit button when form invalid

- [ ] **Task 7: Frontend - Agency/Subagency Dropdown** (AC: 1)
  - [ ] 7.1: Fetch user's authorized agencies (from user context)
  - [ ] 7.2: Display only subagencies user has access to
  - [ ] 7.3: Group by agency group in dropdown (hierarchical)
  - [ ] 7.4: Pre-select if user has only one subagency

- [ ] **Task 8: Frontend - POC Selection** (AC: 1)
  - [ ] 8.1: Opportunity POC defaults to current user
  - [ ] 8.2: Contracts and Relationship POCs use contact autocomplete
  - [ ] 8.3: Search contacts with debounced input
  - [ ] 8.4: Display contact name, email, role in results

- [ ] **Task 9: Testing** (AC: All)
  - [ ] 9.1: Unit tests for ndaService.createNda()
  - [ ] 9.2: Unit tests for ndaValidator
  - [ ] 9.3: API integration tests for POST /api/ndas
  - [ ] 9.4: Test row-level security (cannot create NDA for unauthorized subagency)
  - [ ] 9.5: Test display ID sequence
  - [ ] 9.6: Component tests for CreateNDA form
  - [ ] 9.7: E2E test for complete NDA creation flow

## Dev Notes

### NDA Model Schema

```prisma
model Nda {
  id                      String      @id @default(uuid())
  displayId               Int         @unique @map("display_id") @default(autoincrement())
  companyName             String      @map("company_name") @db.VarChar(255)
  companyCity             String?     @map("company_city") @db.VarChar(100)
  companyState            String?     @map("company_state") @db.VarChar(2)
  stateOfIncorporation    String?     @map("state_of_incorporation") @db.VarChar(50)
  agencyOfficeName        String?     @map("agency_office_name") @db.VarChar(255)
  abbreviatedOpportunityName String?  @map("abbreviated_opportunity_name") @db.VarChar(255)
  authorizedPurpose       String      @map("authorized_purpose") @db.VarChar(255)
  effectiveDate           DateTime?   @map("effective_date")
  usmaxPosition           UsmaxPosition? @map("usmax_position")
  nonUsmax                Boolean     @map("non_usmax") @default(false)
  status                  NdaStatus   @default(CREATED)

  subagencyId             String      @map("subagency_id")
  opportunityContactId    String      @map("opportunity_contact_id")
  contractsContactId      String?     @map("contracts_contact_id")
  relationshipContactId   String      @map("relationship_contact_id")
  contactsContactId       String?     @map("contacts_contact_id")

  createdAt               DateTime    @map("created_at") @default(now())
  updatedAt               DateTime    @map("updated_at") @updatedAt

  subagency               Subagency   @relation(fields: [subagencyId], references: [id])
  opportunityContact      Contact     @relation("OpportunityPOC", fields: [opportunityContactId], references: [id])
  contractsContact        Contact?    @relation("ContractsPOC", fields: [contractsContactId], references: [id])
  relationshipContact     Contact     @relation("RelationshipPOC", fields: [relationshipContactId], references: [id])
  contactsContact         Contact?    @relation("ContactsPOC", fields: [contactsContactId], references: [id])

  @@map("ndas")
}

enum NdaStatus {
  CREATED
  EMAILED
  IN_REVISION
  FULLY_EXECUTED
  INACTIVE
  CANCELLED
}

enum UsmaxPosition {
  PRIME
  SUB
  TEAMING
  OTHER
}
```

### NDA Service Implementation

```typescript
async function createNda(data: CreateNdaInput, userId: string) {
  // Validate user has access to subagency
  const hasAccess = await verifySubagencyAccess(userId, data.subagencyId);
  if (!hasAccess) {
    throw new UnauthorizedError('No access to selected subagency');
  }

  // Validate authorized purpose length
  if (data.authorizedPurpose.length > 255) {
    throw new BadRequestError('Authorized purpose must be 255 characters or less');
  }

  // Create NDA
  const nda = await prisma.nda.create({
    data: {
      companyName: data.companyName,
      companyCity: data.companyCity,
      companyState: data.companyState,
      stateOfIncorporation: data.stateOfIncorporation,
      agencyOfficeName: data.agencyOfficeName,
      abbreviatedOpportunityName: data.abbreviatedOpportunityName,
      authorizedPurpose: data.authorizedPurpose,
      effectiveDate: data.effectiveDate,
      usmaxPosition: data.usmaxPosition,
      nonUsmax: data.nonUsmax || false,
      status: 'CREATED',
      subagencyId: data.subagencyId,
      opportunityContactId: data.opportunityContactId || userId, // Default to creator
      contractsContactId: data.contractsContactId,
      relationshipContactId: data.relationshipContactId,
      contactsContactId: data.contactsContactId
    },
    include: {
      subagency: { include: { agencyGroup: true } }
    }
  });

  // Audit log
  await auditService.log({
    action: 'nda_created',
    entityType: 'nda',
    entityId: nda.id,
    userId,
    metadata: {
      displayId: nda.displayId,
      companyName: data.companyName,
      subagencyId: data.subagencyId
    }
  });

  return nda;
}
```

### Frontend Form Component

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createNdaSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  subagencyId: z.string().uuid('Please select a subagency'),
  authorizedPurpose: z.string().min(1).max(255, 'Must be 255 characters or less'),
  relationshipContactId: z.string().uuid('Relationship POC is required'),
  effectiveDate: z.date().optional(),
  // ... other fields
});

function CreateNDA() {
  const { user } = useAuth();

  const form = useForm({
    resolver: zodResolver(createNdaSchema),
    defaultValues: {
      opportunityContactId: user.contactId, // Pre-select current user
      nonUsmax: false
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/api/ndas', data),
    onSuccess: (nda) => {
      toast.success(`NDA #${nda.displayId} created`);
      navigate(`/nda/${nda.id}`);
    }
  });

  return (
    <Form {...form}>
      <FormField name="companyName" label="Company Name" required />

      <FormField name="subagencyId" label="Agency / Subagency" required>
        <Select>
          {authorizedSubagencies.map(sub => (
            <SelectItem key={sub.id} value={sub.id}>
              {sub.agencyGroup.name} - {sub.name}
            </SelectItem>
          ))}
        </Select>
      </FormField>

      <FormField
        name="authorizedPurpose"
        label="Authorized Purpose"
        required
        description={`${form.watch('authorizedPurpose')?.length || 0}/255 characters`}
      >
        <Textarea maxLength={255} />
      </FormField>

      {/* ... other fields */}

      <Button
        type="submit"
        disabled={!form.formState.isValid || createMutation.isPending}
      >
        Save as Draft
      </Button>
    </Form>
  );
}
```

### Display ID Implementation

**Option 1: Database Sequence:**
```sql
CREATE SEQUENCE nda_display_id_seq START 1590;
ALTER TABLE ndas ALTER COLUMN display_id SET DEFAULT nextval('nda_display_id_seq');
```

**Option 2: Service Layer:**
```typescript
async function getNextDisplayId(): Promise<number> {
  const lastNda = await prisma.nda.findFirst({
    orderBy: { displayId: 'desc' },
    select: { displayId: true }
  });

  return (lastNda?.displayId || 1589) + 1;
}
```

### Integration with Previous Epics

**Depends on:**
- Epic 1: Authentication, permissions (nda:create), row-level security
- Epic 2: Contacts (for POCs), subagencies (for NDA assignment), user access grants

**Foundation for:**
- All other Epic 3 stories (NDA detail, email, status, etc.)
- Epic 4: Document management
- Epic 5: Search and filtering

### Security Considerations

**Authorization:**
- User must have nda:create permission
- User can only create NDAs for authorized subagencies
- POCs must be valid contacts

**Validation:**
- Server-side validation (never trust client)
- Character limits enforced
- Required fields checked
- Date format validation

### Project Structure Notes

**New Files:**
- `prisma/schema.prisma` - ADD Nda model, enums
- `src/server/services/ndaService.ts` - NEW
- `src/server/validators/ndaValidator.ts` - NEW
- `src/server/routes/ndas.ts` - NEW
- `src/components/screens/CreateNDA.tsx` - NEW (or RequestWizard.tsx)
- Migration files for NDA schema

**Follows established patterns:**
- Service layer from Epic 2
- Permission middleware from Epic 1
- Row-level security from Epic 1
- Audit logging throughout
- React Hook Form + Zod validation

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.1]
- [Source: docs/architecture.md#Database Schema - Nda table]
- [Source: Story 1-3 - Permission enforcement]
- [Source: Story 1-4 - Row-level security]
- [Source: Story 2-5 - Contacts for POCs]
- [Source: Story 2-2 - Subagencies for NDA assignment]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- First story in Epic 3 (Core NDA Lifecycle)
- Foundational NDA creation with all required fields
- Display ID sequence starting at 1590
- Real-time validation with React Hook Form + Zod
- Row-level security enforced (subagency scoping)
- 4 POC fields with Opportunity defaulted to creator

### File List

Files to be created/modified during implementation:
- `prisma/schema.prisma` - ADD Nda model, NdaStatus enum, UsmaxPosition enum
- `src/server/services/ndaService.ts` - NEW
- `src/server/validators/ndaValidator.ts` - NEW
- `src/server/routes/ndas.ts` - NEW
- `src/components/screens/CreateNDA.tsx` - NEW
- Migration files for NDA schema and sequence
- `src/server/services/__tests__/ndaService.test.ts` - NEW
- `src/server/validators/__tests__/ndaValidator.test.ts` - NEW
- `src/server/routes/__tests__/ndas.test.ts` - NEW

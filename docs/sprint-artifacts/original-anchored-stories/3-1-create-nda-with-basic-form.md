# Story 3.1: Create NDA with Basic Form

Status: done

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

- [ ] **Task 1: Extend NDA Prisma Schema** (AC: 2)
  - [ ] 1.1: Add NDA model to schema with all required fields
  - [ ] 1.2: Add NdaStatus enum (Created, Emailed, InRevision, FullyExecuted, Inactive, Cancelled)
  - [ ] 1.3: Add UsMaxPosition enum (Prime, Sub, Teaming, etc.)
  - [ ] 1.4: Add relationships to Agency, Subagency, Contact (POCs)
  - [ ] 1.5: Add displayId field with auto-increment sequence
  - [ ] 1.6: Run prisma generate and create migration

- [ ] **Task 2: NDA Service Layer** (AC: 2, 3, 4)
  - [ ] 2.1: Create `src/server/services/ndaService.ts`
  - [ ] 2.2: Implement `createNda()` with all field validation
  - [ ] 2.3: Implement display ID generation sequence
  - [ ] 2.4: Implement row-level security (scoped to user's agencies)
  - [ ] 2.5: Add audit logging for nda_created action

- [ ] **Task 3: NDA API Routes** (AC: 1, 2, 3)
  - [ ] 3.1: Create `src/server/routes/ndas.ts`
  - [ ] 3.2: Implement `POST /api/ndas` - Create NDA
  - [ ] 3.3: Implement `GET /api/ndas/:id` - Get single NDA
  - [ ] 3.4: Add validation middleware for required fields
  - [ ] 3.5: Protect routes with `requirePermission(NDA_CREATE)`

- [ ] **Task 4: NDA Validation Module** (AC: 3, 4)
  - [ ] 4.1: Create `src/server/validators/ndaValidator.ts`
  - [ ] 4.2: Implement required field validation
  - [ ] 4.3: Implement character limit validation (255 for authorizedPurpose)
  - [ ] 4.4: Implement date validation (effective date format)
  - [ ] 4.5: Implement agency scope validation (user has access)

- [ ] **Task 5: Testing** (AC: All)
  - [ ] 5.1: Unit tests for ndaService
  - [ ] 5.2: Unit tests for ndaValidator
  - [ ] 5.3: API integration tests for create endpoint
  - [ ] 5.4: Test row-level security enforcement
  - [ ] 5.5: Test display ID sequence generation

### Review Follow-ups (AI)
- [x] [AI-Review][High] Redirect after create uses /requests/:id, but detail route is /nda/:id, so users never land on NDA detail after create. [src/components/screens/RequestWizard.tsx:283]
- [x] [AI-Review][High] AC1 requires Contacts POC, but schema/UI only include opportunity/contracts/relationship POCs; add Contacts POC or update AC. [prisma/schema.prisma:267]
- [x] [AI-Review][Medium] Agency/subagency dropdowns are not scoped to user access; list endpoint returns all agency groups. [src/server/routes/agencyGroups.ts:43]
- [x] [AI-Review][Medium] No explicit "Save as Draft" action in the create flow (only Create). [src/components/screens/RequestWizard.tsx:729]
- [x] [AI-Review][Medium] AC3/AC4 UI validation missing: no inline required-field errors or 255-char counter/maxLength on Authorized Purpose. [src/components/screens/RequestWizard.tsx:229]

## Dev Agent Record

### File List
- prisma/schema.prisma
- src/server/services/ndaService.ts
- src/server/services/agencyGroupService.ts
- src/server/routes/agencyGroups.ts
- src/components/screens/RequestWizard.tsx

### Change Log
- 2025-12-20: Added Contacts POC support, scoped agency list, Save as Draft action, redirect fix, and inline validation/char limit UI.

## Dev Notes

### NDA Schema Fields

```prisma
model Nda {
  id                    String        @id @default(uuid())
  displayId             Int           @unique @default(autoincrement())

  // Company Info
  companyName           String
  companyCity           String?
  companyState          String?
  stateOfIncorporation  String?

  // Agency Info
  agencyGroupId         String
  agencyGroup           AgencyGroup   @relation(fields: [agencyGroupId], references: [id])
  subagencyId           String?
  subagency             Subagency?    @relation(fields: [subagencyId], references: [id])
  agencyOfficeName      String?

  // NDA Details
  abbreviatedName       String
  authorizedPurpose     String        @db.VarChar(255)
  effectiveDate         DateTime?
  usMaxPosition         UsMaxPosition @default(PRIME)
  isNonUsMax            Boolean       @default(false)

  // Status
  status                NdaStatus     @default(CREATED)
  fullyExecutedDate     DateTime?

  // POCs (relations to Contact)
  opportunityPocId      String
  opportunityPoc        Contact       @relation("OpportunityPoc", fields: [opportunityPocId], references: [id])
  contractsPocId        String?
  contractsPoc          Contact?      @relation("ContractsPoc", fields: [contractsPocId], references: [id])
  relationshipPocId     String
  relationshipPoc       Contact       @relation("RelationshipPoc", fields: [relationshipPocId], references: [id])

  // Metadata
  createdById           String
  createdBy             Contact       @relation("CreatedBy", fields: [createdById], references: [id])
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

enum NdaStatus {
  CREATED
  EMAILED
  IN_REVISION
  FULLY_EXECUTED
  INACTIVE
  CANCELLED
}

enum UsMaxPosition {
  PRIME
  SUB
  TEAMING
  OTHER
}
```

### API Endpoint

```typescript
// POST /api/ndas
// Request body:
{
  companyName: string;        // required
  agencyGroupId: string;      // required, must be in user's scope
  subagencyId?: string;       // optional, must be under agencyGroup
  agencyOfficeName?: string;
  abbreviatedName: string;    // required
  authorizedPurpose: string;  // required, max 255 chars
  effectiveDate?: string;     // ISO date
  usMaxPosition?: 'PRIME' | 'SUB' | 'TEAMING' | 'OTHER';
  isNonUsMax?: boolean;
  opportunityPocId?: string;  // defaults to current user
  contractsPocId?: string;
  relationshipPocId: string;  // required
}

// Response:
{
  id: string;
  displayId: number;
  status: 'CREATED';
  ...allFields
}
```

### Row-Level Security

NDA queries must always be scoped to user's authorized agencies:

```typescript
const scopedWhere = {
  agencyGroupId: { in: userContext.authorizedAgencyGroups },
  // OR subagencyId in user's authorized subagencies
};
```

### Audit Log Entry

```typescript
await auditService.log({
  action: AuditAction.NDA_CREATED,
  entityType: 'nda',
  entityId: nda.id,
  userId: userContext.contactId,
  details: {
    displayId: nda.displayId,
    companyName: nda.companyName,
    agencyGroupId: nda.agencyGroupId,
  },
});
```

## Dependencies

- Story 1.1-1.4: Authentication and authorization (complete)
- Story 2.1-2.4: Agency and subagency management (complete)
- Prisma schema extension for NDA model

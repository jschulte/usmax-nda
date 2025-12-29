# Story 3.14: POC Management & Validation

Status: in-progress

## Story

As an **NDA user**,
I want **to enter and validate all POC contact information**,
so that **emails reach the right people and data is accurate**.

## Acceptance Criteria

### AC1: Opportunity POC (Internal User)
**Given** Creating NDA form
**When** I enter Opportunity POC
**Then** Dropdown shows internal USmax users only (where is_internal=true)
**And** Auto-complete works (type 3 letters → matches)
**And** Selected user's email signature included in email template

### AC2: Relationship POC (External Contact - Required)
**Given** I enter Relationship POC (required external contact)
**When** Entering email, phone, fax
**Then** Email validated in real-time (must be valid format)
**And** Phone shows format hint: "(XXX) XXX-XXXX"
**And** Required fields marked with *

### AC3: Copy POC Details
**Given** Contracts POC and Relationship POC are same person
**When** I click "Copy to Relationship POC" button
**Then** All Contracts POC fields copied to Relationship POC fields
**And** I don't have to re-enter same information

### AC4: Contacts POC (TBD)
**Given** Contacts POC field (TBD from customer - may be same as Contracts)
**When** Customer clarifies if 3rd distinct type
**Then** Implement as separate field or hide if duplicate

## Tasks / Subtasks

- [ ] **Task 1: Internal User Lookup** (AC: 1)
  - [x] 1.1: Add `is_internal` flag to Contact model
  - [x] 1.2: Add `GET /api/contacts/internal-users` endpoint
  - [x] 1.3: Implement auto-complete search (3+ chars)
  - [x] 1.4: Include email signature in response

- [x] **Task 2: POC Validation** (AC: 2)
  - [x] 2.1: Create `src/server/validators/pocValidator.ts`
  - [x] 2.2: Implement email format validation
  - [x] 2.3: Implement phone format validation
  - [x] 2.4: Add required field rules for Relationship POC

- [x] **Task 3: External Contact Management** (AC: 2, 3)
  - [x] 3.1: Add external contact fields to NDA model
  - [x] 3.2: Store POC details inline or as Contact records
  - [x] 3.3: Implement copy functionality between POC fields

- [ ] **Task 4: Testing** (AC: All)
  - [ ] 4.1: Test internal user lookup
  - [ ] 4.2: Test POC validation rules
  - [ ] 4.3: Test copy POC functionality

### Review Follow-ups (AI)
- [x] [AI-Review][HIGH] Opportunity POC lookup is not restricted to internal users and triggers at 2 characters, not 3; UI calls `searchContacts` with `type='all'`. [src/components/screens/RequestWizard.tsx:211]
- [x] [AI-Review][HIGH] Email signature is never included in the email body; preview generation only uses Relationship POC and does not fetch internal user signature. [src/server/services/emailService.ts:150]
- [x] [AI-Review][HIGH] Copy POC details button/workflow is missing in the Request Wizard POC section. [src/components/screens/RequestWizard.tsx:500]
- [x] [AI-Review][MEDIUM] Required format hints/real-time validation for email/phone/fax are not exposed in the UI; there are no external-contact input fields, only contact search. [src/components/screens/RequestWizard.tsx:503]
- [ ] [AI-Review][MEDIUM] Contacts POC (TBD) is not represented in the NDA model or UI, so AC4 cannot be satisfied. [prisma/schema.prisma:239]
- [x] [AI-Review][MEDIUM] Story marked done but Tasks/Subtasks are all unchecked and no Dev Agent Record/File List exists to verify changes. [docs/sprint-artifacts/3-14-poc-management-and-validation.md:1]

## Dev Agent Record

### File List
- src/components/screens/RequestWizard.tsx
- src/client/services/userService.ts
- src/server/services/emailService.ts
- src/server/routes/users.ts
- prisma/schema.prisma

### Change Log
- 2025-12-21: Limited opportunity POC searches to internal users with 3+ characters, added external POC validation and copy support in the wizard, and included internal signatures in email previews.

## Dev Notes

### Contact Schema Update

```prisma
model Contact {
  // ... existing fields
  isInternal    Boolean   @default(false)
  emailSignature String?  @db.Text
}
```

### POC Validation Rules

```typescript
const pocValidation = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  phone: {
    pattern: /^\(\d{3}\) \d{3}-\d{4}$/,
    hint: '(XXX) XXX-XXXX',
    message: 'Please enter phone in format (XXX) XXX-XXXX',
  },
  fax: {
    pattern: /^\(\d{3}\) \d{3}-\d{4}$/,
    hint: '(XXX) XXX-XXXX',
    optional: true,
  },
};
```

### Internal User Search

```typescript
// GET /api/contacts/internal-users?search=kel
async function searchInternalUsers(search: string): Promise<Contact[]> {
  return prisma.contact.findMany({
    where: {
      isInternal: true,
      active: true,
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    },
    take: 10,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      emailSignature: true,
    },
  });
}
```

### NDA POC Fields

```typescript
// Option 1: Store as Contact relations
relationshipPocId: string;  // Required, reference to Contact
contractsPocId?: string;    // Optional, reference to Contact

// Option 2: Store inline for external contacts
relationshipPocEmail: string;
relationshipPocPhone: string;
relationshipPocName: string;
```

## Dependencies

- Story 3.1: Create NDA with Basic Form
- Story 2.5: User/Contact Management

# Story 3.14: POC Management & Validation

Status: done

## Story

As an **NDA user**,
I want **to enter and validate all POC contact information**,
so that **emails reach the right people and data is accurate**.

## Acceptance Criteria

### AC1: Opportunity POC (Internal User)
**Given** Creating NDA form
**When** I enter Opportunity POC
**Then** Dropdown shows internal USMax users only (where is_internal=true)
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
  - [ ] 1.1: Add `is_internal` flag to Contact model
  - [ ] 1.2: Add `GET /api/contacts/internal-users` endpoint
  - [ ] 1.3: Implement auto-complete search (3+ chars)
  - [ ] 1.4: Include email signature in response

- [ ] **Task 2: POC Validation** (AC: 2)
  - [ ] 2.1: Create `src/server/validators/pocValidator.ts`
  - [ ] 2.2: Implement email format validation
  - [ ] 2.3: Implement phone format validation
  - [ ] 2.4: Add required field rules for Relationship POC

- [ ] **Task 3: External Contact Management** (AC: 2, 3)
  - [ ] 3.1: Add external contact fields to NDA model
  - [ ] 3.2: Store POC details inline or as Contact records
  - [ ] 3.3: Implement copy functionality between POC fields

- [ ] **Task 4: Testing** (AC: All)
  - [ ] 4.1: Test internal user lookup
  - [ ] 4.2: Test POC validation rules
  - [ ] 4.3: Test copy POC functionality

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

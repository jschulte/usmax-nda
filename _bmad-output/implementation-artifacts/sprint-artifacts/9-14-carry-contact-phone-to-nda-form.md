# Story 9.14: Auto-Fill Contact Phone Numbers on NDA Form

Status: done

## Story

As an NDA creator,
I want phone numbers to auto-fill when I select a contact from the directory,
So that I don't have to manually enter phone numbers for known contacts.

## Acceptance Criteria

**AC1: Phone auto-fills for Opportunity POC**
**Given** I select an Opportunity POC from the internal contact directory
**When** the contact is selected
**Then** if the contact has a workPhone, it auto-fills in the phone field
**And** if the contact has a cellPhone and no workPhone, it auto-fills the cellPhone
**And** I can manually edit the auto-filled value if needed

**AC2: Phone auto-fills for Relationship POC**
**Given** I select or search for a Relationship POC contact
**When** a contact with phone information is selected
**Then** the Relationship POC Phone field auto-fills with their work phone or cell phone
**And** the auto-fill works for both internal and external contacts
**And** if contact has no phone, field remains empty (not an error)

**AC3: Phone auto-fills for Contracts POC**
**Given** I enter Contracts POC information
**When** I select a contact from autocomplete or directory
**Then** the Contracts POC Phone field auto-fills if the contact has phone data
**And** the format is consistent with other phone fields

**AC4: Manual entry still works**
**Given** a phone field has been auto-filled
**When** I want to change the phone number
**Then** I can edit the field manually
**And** my manual entry overrides the auto-filled value
**And** the form validation still works correctly

## Tasks / Subtasks

- [x] Add phone auto-fill for Opportunity POC (Task AC: AC1)
  - [x] Find where Opportunity POC is selected (contact dropdown)
  - [x] Get selected contact's workPhone or cellPhone
  - [x] Auto-populate opportunityPocPhone field in formData
  - [x] Preserve manual edit capability
- [x] Add phone auto-fill for Relationship POC (Task AC: AC2)
  - [x] Find Relationship POC selection/input
  - [x] Extract phone from selected contact
  - [x] Auto-populate relationshipPocPhone field
  - [x] Handle both internal and external contacts
- [x] Add phone auto-fill for Contracts POC (Task AC: AC3)
  - [x] Find Contracts POC input (optional field)
  - [x] Auto-fill contractsPocPhone when contact selected
  - [x] Maintain consistency with other POC fields
- [x] Ensure manual entry works (Task AC: AC4)
  - [x] Don't block manual phone entry
  - [x] Allow user to override auto-filled values
  - [x] Maintain form validation
  - [x] Test edit after auto-fill
- [x] Test phone auto-fill (Task AC: All)
  - [x] Test with contacts that have workPhone
  - [x] Test with contacts that have only cellPhone
  - [x] Test with contacts that have no phone
  - [x] Test manual override works
  - [x] Verify phone validation still works

## Dev Notes

### Current Implementation

**File:** src/components/screens/RequestWizard.tsx

**Phone Fields in Form:**
- Relationship POC Phone (line ~1359)
- Contracts POC Phone (optional)
- Possibly Opportunity POC Phone

**Contact Selection:**
- Opportunity POC: Likely dropdown from internal contacts
- Relationship POC: Text input with autocomplete
- Contracts POC: Text input

**Contact Data Structure (from Contact model):**
```typescript
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  workPhone?: string;
  cellPhone?: string;
  jobTitle?: string;
  isInternal: boolean;
}
```

**Implementation Pattern:**
```tsx
// When contact is selected
const handleContactSelect = (contact: Contact, pocType: 'opportunity' | 'relationship' | 'contracts') => {
  const phone = contact.workPhone || contact.cellPhone || '';

  setFormData({
    ...formData,
    [`${pocType}PocId`]: contact.id,
    [`${pocType}PocName`]: `${contact.firstName} ${contact.lastName}`,
    [`${pocType}PocEmail`]: contact.email,
    [`${pocType}PocPhone`]: phone, // Auto-fill phone
  });
};
```

### Architecture Requirements

- Use existing Contact interface fields
- Don't modify API - this is frontend-only enhancement
- Maintain existing form validation
- Phone format validation must still work

### Testing Requirements

- Test with contacts from seed data
- Test with and without phone numbers
- Test manual editing after auto-fill
- Verify phone format validation works
- Test all 3 POC types

### References

- [RequestWizard: src/components/screens/RequestWizard.tsx]
- [Contact Type: src/client/services/userService.ts]
- [Contact Model: prisma/schema.prisma - workPhone, cellPhone fields]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

### Change Log

# Story 3.14: POC Management & Validation

Status: ready-for-dev

## Story

As an **NDA user**,
I want **to enter and validate all POC contact information**,
so that **emails reach the right people and data is accurate**.

## Acceptance Criteria

### AC1: Opportunity POC Selection
**Given** Creating NDA form
**When** I enter Opportunity POC
**Then** Dropdown shows internal USmax users only (where is_internal=true)
**And** Auto-complete works (type 3 letters → matches)
**And** Selected user's email signature included in email template

### AC2: External POC Validation
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

- [ ] **Task 1: POC Validation Service** (AC: 2)
  - [ ] 1.1: Create src/server/validators/pocValidator.ts
  - [ ] 1.2: Implement email format validation (RFC 5322)
  - [ ] 1.3: Implement phone format validation (US format)
  - [ ] 1.4: Implement fax format validation (optional)
  - [ ] 1.5: Return structured validation errors

- [ ] **Task 2: Internal User Autocomplete** (AC: 1)
  - [ ] 2.1: Reuse UserAutocomplete from Story 2-3
  - [ ] 2.2: Filter to isInternal=true
  - [ ] 2.3: Display: name, email, job title
  - [ ] 2.4: On select, fetch email signature
  - [ ] 2.5: Store email signature with NDA for email composition

- [ ] **Task 3: External Contact Selection** (AC: 2)
  - [ ] 3.1: Create ContactSelector component
  - [ ] 3.2: Support selecting existing contact or creating new inline
  - [ ] 3.3: If new contact, validate email/phone before creating
  - [ ] 3.4: Add to contacts table with isInternal=false
  - [ ] 3.5: Link to NDA via POC foreign key

- [ ] **Task 4: Frontend - POC Form Fields** (AC: 1, 2, 3)
  - [ ] 4.1: Opportunity POC: UserAutocomplete (internal only)
  - [ ] 4.2: Contracts POC: ContactSelector (internal or external)
  - [ ] 4.3: Relationship POC: ContactSelector (required, usually external)
  - [ ] 4.4: Contacts POC: ContactSelector (optional, TBD status)
  - [ ] 4.5: Add "Copy" button from Contracts to Relationship

- [ ] **Task 5: Email/Phone Validation** (AC: 2)
  - [ ] 5.1: Use Zod schema for email validation
  - [ ] 5.2: Use Zod schema for phone validation
  - [ ] 5.3: Show inline errors on blur
  - [ ] 5.4: Format phone on blur: (555) 555-5555
  - [ ] 5.5: Red border for invalid, green checkmark for valid

- [ ] **Task 6: Copy POC Details Function** (AC: 3)
  - [ ] 6.1: Implement copyPocDetails(fromField, toField)
  - [ ] 6.2: Copy all contact fields: name, email, phone, fax
  - [ ] 6.3: Update form values
  - [ ] 6.4: Show toast: "POC details copied"

- [ ] **Task 7: Email Signature Integration** (AC: 1)
  - [ ] 7.1: When Opportunity POC selected, fetch contact.emailSignature
  - [ ] 7.2: Store with NDA for later email composition (Story 3-10)
  - [ ] 7.3: Include in email template footer
  - [ ] 7.4: Or fetch dynamically when composing email

- [ ] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for POC validator
  - [ ] 8.2: Test email format validation
  - [ ] 8.3: Test phone format validation
  - [ ] 8.4: Component tests for POC selectors
  - [ ] 8.5: Test copy POC details functionality

## Dev Notes

### POC Validation Schemas

```typescript
import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email format');

export const phoneSchema = z.string().regex(
  /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
  'Phone must be in format: (XXX) XXX-XXXX'
);

export const pocSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: emailSchema,
  workPhone: phoneSchema.optional(),
  cellPhone: phoneSchema.optional(),
  fax: phoneSchema.optional()
});
```

### Contact Selector Component

```tsx
function ContactSelector({
  label,
  value,
  onChange,
  allowInternal = true,
  allowExternal = true,
  required = false
}: ContactSelectorProps) {
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: contacts } = useQuery({
    queryKey: ['contacts', { search, allowInternal, allowExternal }],
    queryFn: () => api.get('/api/contacts/search', {
      params: { q: search, internal: allowInternal, external: allowExternal }
    }).then(res => res.data),
    enabled: search.length >= 2
  });

  return (
    <div>
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>

      <Combobox
        value={value}
        onValueChange={onChange}
        options={contacts}
        placeholder="Search contacts..."
      />

      <Button
        size="sm"
        variant="link"
        onClick={() => setShowCreateForm(true)}
      >
        + Create New Contact
      </Button>

      {showCreateForm && (
        <CreateContactInlineForm
          onCreated={(contact) => {
            onChange(contact.id);
            setShowCreateForm(false);
          }}
        />
      )}
    </div>
  );
}
```

### Copy POC Details Implementation

```tsx
function POCFields() {
  const form = useForm();

  const copyContractsTtoRelationship = () => {
    const contractsContactId = form.getValues('contractsContactId');
    form.setValue('relationshipContactId', contractsContactId);
    toast.success('POC details copied');
  };

  return (
    <div className="space-y-4">
      <FormField name="opportunityContactId" label="Opportunity POC (Internal)">
        <UserAutocomplete internalOnly />
      </FormField>

      <FormField name="contractsContactId" label="Contracts POC">
        <ContactSelector />
      </FormField>

      <FormField name="relationshipContactId" label="Relationship POC" required>
        <ContactSelector />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={copyContractsToRelationship}
          className="mt-2"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy from Contracts POC
        </Button>
      </FormField>

      {/* Contacts POC - TBD, hide or show based on customer decision */}
      {SHOW_CONTACTS_POC && (
        <FormField name="contactsContactId" label="Contacts POC">
          <ContactSelector />
        </FormField>
      )}
    </div>
  );
}
```

### Email Signature Integration

**From Story 2-5, contacts have emailSignature field:**
```typescript
// When generating email (Story 3-10)
const opportunityPoc = await prisma.contact.findUnique({
  where: { id: nda.opportunityContactId },
  select: { firstName: true, lastName: true, emailSignature: true }
});

const emailBody = `
${emailBodyTemplate}

---
${opportunityPoc.emailSignature || `${opportunityPoc.firstName} ${opportunityPoc.lastName}`}
`;
```

### Contacts POC (TBD Status)

**Customer Decision Pending:**
- If Contacts POC is distinct from Contracts POC → Implement as 4th POC
- If Contacts POC same as Contracts POC → Hide field, use contracts_contact_id for both

**Implementation:**
- Field exists in NDA model (contacts_contact_id, nullable)
- UI controlled by config flag or feature flag
- Can enable/disable without code changes

### Integration with Previous Stories

**Builds on:**
- Story 2-5: Contact model with email signatures
- Story 2-3: UserAutocomplete pattern
- Story 3-1: NDA model with 4 POC FKs

**Used by:**
- Story 3-10: Email composition (uses POC emails and signatures)
- Story 3-11: Notifications (sends to POCs as stakeholders)

### Project Structure Notes

**New Files:**
- `src/server/validators/pocValidator.ts` - NEW
- `src/components/ui/ContactSelector.tsx` - NEW
- `src/components/forms/CreateContactInlineForm.tsx` - NEW

**Files to Modify:**
- `src/components/screens/CreateNDA.tsx` - ENHANCE POC fields with validation

**Follows established patterns:**
- Validation with Zod from Story 3-1
- Autocomplete from Story 2-3
- Contact model from Story 2-5

### References

- [Source: docs/epics.md#Epic 3: Core NDA Lifecycle - Story 3.14]
- [Source: Story 2-5 - Contact model with email signatures]
- [Source: Story 3-1 - NDA model with POC FKs]
- [Source: Story 3-10 - Email composition using POCs]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- POC validation with email/phone format checking
- Contact selector with inline creation
- Copy POC details functionality
- Email signature integration for email composition
- Contacts POC marked as TBD pending customer clarification

### File List

Files to be created/modified during implementation:
- `src/server/validators/pocValidator.ts` - NEW
- `src/components/ui/ContactSelector.tsx` - NEW
- `src/components/forms/CreateContactInlineForm.tsx` - NEW
- `src/components/screens/CreateNDA.tsx` - MODIFY (enhance POC fields)
- `src/server/validators/__tests__/pocValidator.test.ts` - NEW
- `src/components/ui/__tests__/ContactSelector.test.tsx` - NEW

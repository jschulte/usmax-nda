# Story 9.11: Improve Contact Search Display Format

Status: done

## Story

As an NDA creator,
I want contact search results to show comprehensive information (name, email, role),
So that I can easily identify and select the correct contact from search results.

## Acceptance Criteria

**AC1: Autocomplete shows contact details**
**Given** I am searching for a contact (Opportunity POC, Relationship POC, Contracts POC)
**When** autocomplete results appear
**Then** each result shows: full name, email address, and job title/role
**And** the information is well-formatted and easy to scan
**And** internal vs external contacts are visually distinguished

**AC2: Search results are properly styled**
**Given** I see contact autocomplete results
**When** I hover over a result
**Then** the hover state is clear and distinct
**And** text is readable with good contrast
**And** layout doesn't break with long names or emails

**AC3: Selected contact displays clearly**
**Given** I select a contact from autocomplete
**When** the selection is made
**Then** the input shows the contact's full name
**And** I can see confirmation that I selected the right person

## Tasks / Subtasks

- [ ] Analyze current contact search implementation (Task AC: All)
  - [ ] Find contact search/autocomplete in RequestWizard.tsx
  - [ ] Identify current display format
  - [ ] Document what's missing or poorly formatted
- [ ] Enhance autocomplete result display (Task AC: AC1)
  - [ ] Update result template to show name, email, role
  - [ ] Add proper layout with spacing
  - [ ] Add badges for internal contacts
  - [ ] Handle missing fields gracefully
- [ ] Improve styling (Task AC: AC2)
  - [ ] Enhance hover state visibility
  - [ ] Improve text contrast
  - [ ] Add padding for readability
  - [ ] Test with long text (ellipsis, wrapping)
- [ ] Test with various contacts (Task AC: All)
  - [ ] Test internal contacts with all fields
  - [ ] Test external contacts (may lack some fields)
  - [ ] Test long names and emails
  - [ ] Test hover and selection

## Dev Notes

### Pattern to Follow

**Enhanced Contact Result Display:**
```tsx
<button className="w-full px-4 py-3 text-left hover:bg-gray-50">
  <div className="flex items-start justify-between gap-2">
    <div className="flex-1 min-w-0">
      <div className="font-medium text-sm">
        {contact.firstName} {contact.lastName}
      </div>
      <div className="text-xs text-gray-600 truncate">
        {contact.email}
      </div>
      {contact.jobTitle && (
        <div className="text-xs text-gray-500 mt-0.5">
          {contact.jobTitle}
        </div>
      )}
    </div>
    {contact.isInternal && (
      <Badge variant="info" size="xs">Internal</Badge>
    )}
  </div>
</button>
```

### References

- [RequestWizard: src/components/screens/RequestWizard.tsx]
- [Contact Type: src/client/services/userService.ts]
- [Pattern: Company autocomplete for reference]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

### Change Log

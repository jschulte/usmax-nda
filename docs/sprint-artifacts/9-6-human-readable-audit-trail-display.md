# Story 9.6: Human-Readable Audit Trail Display

Status: done

## Story

As an **Admin**,
I want **audit trail entries displayed in human-readable format**,
So that **I can understand what changed without reading JSON**.

## Acceptance Criteria

### AC1: Field Changes Formatted
**Given** I view an audit trail entry with field changes
**When** the entry displays
**Then** I see changes formatted as human-readable text:
- "Company Name changed from 'ACME Corp' to 'ACME Corporation'"
- "Status changed from 'Created' to 'Emailed'"
- "Effective Date changed from '01/15/2024' to '02/01/2024'"
**And** each change is on its own line
**And** no raw JSON visible by default

### AC2: Expandable Details
**Given** an audit trail entry
**When** I want to see all details
**Then** I can click "Show Details" or expand button
**And** the raw JSON appears in a collapsible section
**And** I can copy the JSON if needed for debugging

### AC3: Handle All Data Types
**Given** field changes include different data types
**When** displayed
**Then** values are formatted appropriately:
- null/undefined → "(empty)"
- Booleans → "Yes"/"No"
- Dates → "MM/DD/YYYY" format
- Strings/numbers → Quoted values
**And** formatting is consistent across all audit views

### AC4: Both Audit Views Updated
**Given** there are multiple audit trail views in the app
**When** displaying field changes
**Then** both views use human-readable formatting:
- Admin centralized audit log (AuditLogs.tsx)
- NDA detail activity timeline (NDADetail.tsx Activity tab)
**And** formatting is consistent between views

## Tasks / Subtasks

- [ ] **Task 1: Create Frontend Formatting Utilities** (AC: 1, 3)
  - [ ] 1.1: Create `src/client/utils/formatAuditChanges.ts`
  - [ ] 1.2: Port formatFieldChange from backend (can't import server code)
  - [ ] 1.3: Port formatFieldName helper
  - [ ] 1.4: Port formatValue helper
  - [ ] 1.5: Add TypeScript types for FieldChange

- [ ] **Task 2: Update AuditLogs Component** (AC: 1, 2, 4)
  - [ ] 2.1: Import formatting utilities
  - [ ] 2.2: Check if details.changes array exists
  - [ ] 2.3: Map changes array to human-readable strings
  - [ ] 2.4: Display formatted changes in list view
  - [ ] 2.5: Keep raw JSON in expandable "Show Details" section

- [ ] **Task 3: Update NDA Activity Timeline** (AC: 1, 4)
  - [ ] 3.1: Find Activity tab in NDADetail.tsx
  - [ ] 3.2: Apply same formatting to timeline entries
  - [ ] 3.3: Ensure consistency with AuditLogs view

- [ ] **Task 4: Testing** (AC: 1-4)
  - [ ] 4.1: Test field changes display correctly in audit log
  - [ ] 4.2: Test all data types format properly
  - [ ] 4.3: Test expandable details work
  - [ ] 4.4: Test both audit views show consistent formatting

## Dev Notes

### Root Cause

**AuditLogs.tsx line 731:**
```tsx
<pre className="...">
  {JSON.stringify(selectedEvent.details, null, 2)}
</pre>
```

**Problem:** Raw JSON dump is not user-friendly for viewing field changes.

**Solution:** Use formatFieldChange utility from Story 6.2 (backend), recreate in frontend.

### Implementation Strategy

**Backend utility exists but can't be imported** (server code can't run in browser)

**Solution: Recreate in frontend**

```typescript
// src/client/utils/formatAuditChanges.ts

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

export function formatFieldChange(change: FieldChange): string {
  const fieldLabel = formatFieldName(change.field);
  const beforeText = formatValue(change.before);
  const afterText = formatValue(change.after);
  return `${fieldLabel} changed from ${beforeText} to ${afterText}`;
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatValue(value: unknown): string {
  if (value == null || value === '') return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(value).toLocaleDateString();
  }
  return `'${String(value)}'`;
}

export function formatAuditDetails(details: any): {
  changes: string[];
  hasOtherFields: boolean;
  otherFields: any;
} {
  const result = {
    changes: [] as string[],
    hasOtherFields: false,
    otherFields: {} as any,
  };

  if (!details) return result;

  // Extract and format changes
  if (Array.isArray(details.changes)) {
    result.changes = details.changes.map(formatFieldChange);
  }

  // Check for other fields (not changes)
  const { changes, ...rest } = details;
  if (Object.keys(rest).length > 0) {
    result.hasOtherFields = true;
    result.otherFields = rest;
  }

  return result;
}
```

**Update AuditLogs.tsx:**

```tsx
import { formatAuditDetails } from '../../../client/utils/formatAuditChanges';

// In the details dialog:
const formatted = formatAuditDetails(selectedEvent.details);

{formatted.changes.length > 0 && (
  <div className="mb-4">
    <h4 className="font-medium mb-2">Changes:</h4>
    <ul className="space-y-1">
      {formatted.changes.map((change, i) => (
        <li key={i} className="text-sm">{change}</li>
      ))}
    </ul>
  </div>
)}

{formatted.hasOtherFields && (
  <details>
    <summary className="cursor-pointer text-sm text-blue-600">
      Show raw details
    </summary>
    <pre className="text-xs">
      {JSON.stringify(formatted.otherFields, null, 2)}
    </pre>
  </details>
)}
```

### References

- [Source: docs/epics.md - Story 9.6 requirements, lines 2835-2856]
- [Source: src/server/utils/formatFieldChanges.ts - Backend formatting utility (reference)]
- [Source: src/components/screens/admin/AuditLogs.tsx - JSON display, line 731]
- [Source: docs/sprint-artifacts/6-2-field-change-tracking.md - Original formatFieldChanges story]

## Definition of Done

- [ ] Frontend formatting utilities created
- [ ] AuditLogs component displays formatted changes
- [ ] NDA Activity timeline displays formatted changes
- [ ] Raw JSON available in expandable section
- [ ] All data types format correctly
- [ ] Both audit views consistent
- [ ] Code reviewed and approved

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References
- Build: Successful (frontend formatting utilities + component updates)

### Completion Notes List
- Created frontend formatting utilities (formatAuditDetails, formatFieldChange, formatFieldName, formatValue)
- Updated AuditLogs.tsx to display human-readable field changes with expandable raw JSON
- Updated NDADetail.tsx Activity tab to show formatted changes
- Both audit views now consistent with human-readable formatting
- Raw JSON available in collapsible details section
- All acceptance criteria satisfied

### File List
- `src/client/utils/formatAuditChanges.ts` (NEW) - Frontend formatting utilities
- `src/components/screens/admin/AuditLogs.tsx` (MODIFIED) - Human-readable details display
- `src/components/screens/NDADetail.tsx` (MODIFIED) - Activity timeline formatted display

# Story 6.2: Field Change Tracking

Status: review

## Story

As an **Admin**,
I want **to see exactly what fields changed with before/after values**,
So that **I can audit modifications and understand change history**.

## Acceptance Criteria

### AC1: Field-Level Change Capture
**Given** a user updates an NDA or other entity (Contact, AgencyGroup, Subagency, etc.)
**When** the update completes successfully
**Then** the audit_log entry includes in the `details.changes` field:
- Field name (e.g., "companyName", "status", "effectiveDate")
- Before value (previous value before update)
- After value (new value after update)
**And** all changed fields are captured in a single audit entry
**And** only fields that actually changed are included (not all fields)

### AC2: Human-Readable Change Display
**Given** an audit log entry with field changes
**When** displayed to users (audit trail viewer)
**Then** changes are formatted in human-readable text:
- Example: "Status changed from 'Created' to 'Emailed'"
- Example: "Company Name changed from 'ACME Corp' to 'ACME Corporation'"
- Example: "Effective Date changed from '01/15/2024' to '02/01/2024'"
**And** null/undefined values display as "(empty)" or "(not set)"
**And** boolean values display as "Yes"/"No" where appropriate

### AC3: Support for All Entity Types
**Given** any entity with update operations (NDA, Contact, AgencyGroup, Subagency, etc.)
**When** an update occurs
**Then** field changes are tracked consistently across all entity types
**And** the change tracking utility works with any object comparison

### AC4: JSONB Storage Flexibility
**Given** the audit_log.details field is JSONB
**When** storing field changes
**Then** the structure supports:
- Nested objects (e.g., POC contact changes)
- Arrays (e.g., multiple changes in one transaction)
- Different data types (strings, numbers, booleans, dates)
**And** the structure is query-able via PostgreSQL JSONB operators

## Tasks / Subtasks

- [ ] **Task 1: Extend AuditLogDetails Interface** (AC: 1, 4)
  - [ ] 1.1: Add `changes` field to AuditLogDetails interface in auditService.ts
  - [ ] 1.2: Define FieldChange interface: `{ field: string; before: unknown; after: unknown }`
  - [ ] 1.3: Type the changes field as `FieldChange[]`

- [ ] **Task 2: Create Field Change Detection Utility** (AC: 1, 3, 4)
  - [ ] 2.1: Create `src/server/utils/detectFieldChanges.ts`
  - [ ] 2.2: Implement `detectFieldChanges(before: object, after: object, fields?: string[]): FieldChange[]`
  - [ ] 2.3: Handle nested objects (shallow comparison for MVP)
  - [ ] 2.4: Handle different data types (strings, numbers, booleans, dates, null/undefined)
  - [ ] 2.5: Optionally filter to specific fields if provided
  - [ ] 2.6: Skip fields that haven't changed (only return actual changes)

- [ ] **Task 3: Integrate into NDA Service** (AC: 1, 3)
  - [ ] 3.1: Modify `ndaService.updateNda()` to call detectFieldChanges
  - [ ] 3.2: Capture before values (existing NDA from database)
  - [ ] 3.3: Capture after values (input data)
  - [ ] 3.4: Include changes in audit log entry via auditService.log()
  - [ ] 3.5: Modify `changeNdaStatus()` to track status changes explicitly
  - [ ] 3.6: Update `updateDraft()` audit logging to use detectFieldChanges (no `input as any`)

- [ ] **Task 4: Integrate into Other Services** (AC: 1, 3)
  - [ ] 4.1: Update agencyGroupService.updateAgencyGroup() to use detectFieldChanges (FieldChange[])
  - [ ] 4.2: Update subagencyService.updateSubagency() to use detectFieldChanges (FieldChange[])
  - [ ] 4.3: Update userService.updateUser() / updateContact() - COMPLETED
  - [ ] 4.4: Verify all update operations have field change tracking - Core services completed (NDA, User, Agency, Subagency)

- [ ] **Task 5: Create Human-Readable Formatter** (AC: 2)
  - [ ] 5.1: Create `src/server/utils/formatFieldChanges.ts`
  - [ ] 5.2: Implement `formatFieldChange(change: FieldChange): string`
  - [ ] 5.3: Handle null/undefined values → "(empty)"
  - [ ] 5.4: Handle boolean values → "Yes"/"No"
  - [ ] 5.5: Handle date values → formatted date strings
  - [ ] 5.6: Handle field name formatting (camelCase → "Title Case")

- [ ] **Task 6: Testing** (AC: 1-4)
  - [ ] 6.1: Unit tests for detectFieldChanges utility (21 tests)
  - [ ] 6.2: Unit tests for formatFieldChanges utility (22 tests)
  - [ ] 6.3: Integration test: Update NDA, verify audit entry has changes
  - [ ] 6.4: Integration test: Update status, verify status change tracked
  - [ ] 6.5: Integration test: Update Contact, verify changes tracked
  - [ ] 6.6: Test edge cases: null values, undefined, nested objects
  - [ ] 6.7: Update agencyGroupService tests to assert FieldChange[] in audit log
  - [ ] 6.8: Update subagencyService tests to assert FieldChange[] in audit log
  - [ ] 6.9: Update updateDraft tests to assert FieldChange[] in audit log

## Dev Notes

### Existing Implementation Analysis

**Already Implemented (Story 6.1):**
1. `auditMiddleware` - Automatically logs all POST/PUT/DELETE/PATCH requests
2. `auditService.log()` - Core logging service with JSONB `details` field
3. `AuditLogDetails` interface - Extensible structure for audit metadata
4. Audit logging infrastructure - Non-blocking, graceful failure handling

**What This Story Adds:**
1. **Field-level change detection** - Before/after value comparison
2. **Change formatting utilities** - Human-readable change descriptions
3. **Service integration** - Inject change tracking into all update operations
4. **Structured change storage** - Consistent JSONB format for queries

### Implementation Strategy

#### 1. Data Structure Design

The `changes` field in `AuditLogDetails` will store an array of field changes:

```typescript
// src/server/services/auditService.ts

export interface FieldChange {
  field: string;        // Field name (e.g., "companyName", "status")
  before: unknown;      // Previous value
  after: unknown;       // New value
}

export interface AuditLogDetails {
  result?: 'success' | 'error';
  statusCode?: number;
  duration?: number;
  errorMessage?: string;
  path?: string;
  method?: string;

  // NEW: Field change tracking (Story 6.2)
  changes?: FieldChange[];

  [key: string]: unknown;
}
```

**Storage Example:**
```json
{
  "result": "success",
  "statusCode": 200,
  "duration": 45,
  "path": "/api/ndas/abc-123",
  "method": "PUT",
  "changes": [
    {
      "field": "companyName",
      "before": "ACME Corp",
      "after": "ACME Corporation"
    },
    {
      "field": "status",
      "before": "Created",
      "after": "Emailed"
    },
    {
      "field": "effectiveDate",
      "before": "2024-01-15T00:00:00.000Z",
      "after": "2024-02-01T00:00:00.000Z"
    }
  ]
}
```

#### 2. Field Change Detection Utility

```typescript
// src/server/utils/detectFieldChanges.ts

/**
 * Detect field changes between two objects
 *
 * @param before - Original object (from database)
 * @param after - Updated object (new values)
 * @param fields - Optional: Only check specific fields (default: all fields in 'after')
 * @returns Array of FieldChange objects for fields that changed
 *
 * @example
 * const changes = detectFieldChanges(
 *   { name: 'ACME Corp', city: 'NYC', status: 'Created' },
 *   { name: 'ACME Corporation', city: 'NYC', status: 'Emailed' }
 * );
 * // Returns: [
 * //   { field: 'name', before: 'ACME Corp', after: 'ACME Corporation' },
 * //   { field: 'status', before: 'Created', after: 'Emailed' }
 * // ]
 */
export function detectFieldChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields?: string[]
): FieldChange[] {
  const changes: FieldChange[] = [];
  const fieldsToCheck = fields || Object.keys(after);

  for (const field of fieldsToCheck) {
    const beforeValue = before[field];
    const afterValue = after[field];

    // Skip if values are the same (shallow comparison)
    if (beforeValue === afterValue) {
      continue;
    }

    // Handle Date objects specially
    if (beforeValue instanceof Date && afterValue instanceof Date) {
      if (beforeValue.getTime() === afterValue.getTime()) {
        continue;
      }
    }

    // Skip if both are null/undefined (no change)
    if (beforeValue == null && afterValue == null) {
      continue;
    }

    // Record the change
    changes.push({
      field,
      before: beforeValue,
      after: afterValue,
    });
  }

  return changes;
}
```

#### 3. Service Integration Pattern

**Example: ndaService.updateNda()**

```typescript
// src/server/services/ndaService.ts

export async function updateNda(
  id: string,
  input: UpdateNdaInput,
  userContext: UserContext,
  auditMeta?: AuditMeta
): Promise<any> {
  // 1. Get existing NDA (already implemented)
  const existing = await getNda(id, userContext);
  if (!existing) {
    throw new NdaServiceError('NDA not found or access denied', 'NOT_FOUND');
  }

  // 2. Prepare update data
  const updateData = {
    companyName: input.companyName,
    companyCity: input.companyCity,
    companyState: input.companyState,
    // ... other fields
  };

  // 3. Detect field changes (NEW - Story 6.2)
  const changes = detectFieldChanges(existing, updateData);

  // 4. Perform the update
  const updated = await prisma.nda.update({
    where: { id },
    data: updateData,
    include: { /* ... */ },
  });

  // 5. Log audit entry with changes (NEW - Story 6.2)
  await auditService.log({
    action: AuditAction.NDA_UPDATED,
    entityType: 'nda',
    entityId: id,
    userId: userContext.contactId,
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
    details: {
      result: 'success',
      changes, // <-- Include field changes here
    },
  });

  return updated;
}
```

#### 4. Human-Readable Formatting

```typescript
// src/server/utils/formatFieldChanges.ts

/**
 * Format a field change into human-readable text
 *
 * @example
 * formatFieldChange({ field: 'companyName', before: 'ACME Corp', after: 'ACME Corporation' })
 * // Returns: "Company Name changed from 'ACME Corp' to 'ACME Corporation'"
 */
export function formatFieldChange(change: FieldChange): string {
  const fieldLabel = formatFieldName(change.field);
  const beforeText = formatValue(change.before);
  const afterText = formatValue(change.after);

  return `${fieldLabel} changed from ${beforeText} to ${afterText}`;
}

function formatFieldName(field: string): string {
  // Convert camelCase to Title Case
  // e.g., "companyName" → "Company Name"
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatValue(value: unknown): string {
  if (value == null || value === '') {
    return '(empty)';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('en-US');
  }

  return `'${String(value)}'`;
}
```

### Integration Points

**Services to Update (Priority Order):**
1. ✅ `ndaService.updateNda()` - Most critical (primary use case)
2. ✅ `ndaService.changeNdaStatus()` - Status changes are frequent
3. ✅ `userService.updateContact()` - User profile changes
4. ✅ `agencyGroupService.updateAgencyGroup()` - Agency management
5. ✅ `subagencyService.updateSubagency()` - Subagency management

**Pattern for All Services:**
```typescript
// 1. Get existing entity from DB
const existing = await prisma.entity.findUnique({ where: { id } });

// 2. Prepare update data
const updateData = { ...input };

// 3. Detect changes
const changes = detectFieldChanges(existing, updateData);

// 4. Perform update
const updated = await prisma.entity.update({ where: { id }, data: updateData });

// 5. Log with changes
await auditService.log({
  action: AuditAction.ENTITY_UPDATED,
  entityType: 'entity',
  entityId: id,
  userId: userContext.contactId,
  details: { result: 'success', changes },
});
```

### Testing Strategy

**Unit Tests (`detectFieldChanges.test.ts`):**
- Detects changes correctly (strings, numbers, dates, booleans)
- Skips unchanged fields
- Handles null/undefined values
- Returns empty array when no changes

**Unit Tests (`formatFieldChanges.test.ts`):**
- Formats field names correctly (camelCase → Title Case)
- Formats values correctly (null → "(empty)", boolean → Yes/No)
- Formats dates correctly
- Handles edge cases

**Integration Tests (`ndaService.test.ts`):**
- Update NDA → audit entry includes changes array
- Change status → audit entry includes status change
- Update with no changes → audit entry with empty changes array
- Update Contact → changes tracked
- Update AgencyGroup → changes tracked

### Previous Story Intelligence (Story 6.1)

**Learnings from 6-1:**
1. ✅ Use `res.on('finish')` for non-blocking middleware operations
2. ✅ Store structured data in JSONB `details` field
3. ✅ Include error handling with Sentry integration
4. ✅ Test with Vitest, co-locate tests in `__tests__/` folders
5. ✅ Follow existing patterns in auditService.ts

**Files Created in 6-1:**
- `src/server/middleware/auditMiddleware.ts` - Route-to-action mapping
- `src/server/middleware/__tests__/auditMiddleware.test.ts` - 27 tests

**Patterns Established:**
- Extend AuditLogDetails interface for new metadata
- Use `reportError()` for Sentry integration
- Fire-and-forget async logging (don't block responses)
- Comprehensive test coverage (unit + integration)

### Architecture Compliance

**From architecture.md (line 128):**
> Audit Logging Pipeline: Captures: user, action, entity, **before/after**, timestamp, IP

✅ This story implements the documented "before/after" requirement.

**Database Schema (prisma/schema.prisma line 501):**
```prisma
details Json? // Additional context as JSON
```

✅ Using JSONB for flexible change storage is architecturally compliant.

**Naming Conventions:**
- Files: camelCase (`detectFieldChanges.ts`)
- Functions: camelCase (`detectFieldChanges()`)
- Types: PascalCase (`FieldChange`)
- Paths: src/server/utils/ for shared utilities

### Project Structure Notes

**New Files:**
- `src/server/utils/detectFieldChanges.ts` - Core change detection logic
- `src/server/utils/__tests__/detectFieldChanges.test.ts` - Unit tests
- `src/server/utils/formatFieldChanges.ts` - Human-readable formatting
- `src/server/utils/__tests__/formatFieldChanges.test.ts` - Unit tests

**Modified Files:**
- `src/server/services/auditService.ts` - Add FieldChange interface
- `src/server/services/ndaService.ts` - Integrate change tracking
- `src/server/services/userService.ts` - Integrate change tracking
- `src/server/services/agencyGroupService.ts` - Integrate change tracking
- `src/server/services/subagencyService.ts` - Integrate change tracking

**Alignment:**
- Follows existing service pattern: service layer calls auditService
- Utilities in `src/server/utils/` (existing pattern)
- Tests co-located in `__tests__/` folders
- Uses existing JSONB details field (no schema migration needed)

### References

- [Source: docs/epics.md - Story 6.2 requirements, lines 1678-1698]
- [Source: docs/architecture.md - Audit Pipeline, line 128]
- [Source: prisma/schema.prisma - AuditLog model, lines 493-509]
- [Source: src/server/services/auditService.ts - AuditLogDetails interface, lines 86-101]
- [Source: src/server/services/ndaService.ts - updateNda function, line 996]
- [Source: docs/sprint-artifacts/6-1-comprehensive-action-logging.md - Previous story patterns]

## Gap Analysis

### Pre-Development Analysis
- **Date:** 2026-01-03
- **Development Type:** brownfield
- **Existing Files:** 9
- **New Files:** 0

**Findings:**
- Tasks ready: 7
- Tasks partially done: 0
- Tasks already complete: 11
- Tasks refined: 3
- Tasks added: 4

**Codebase Scan:**
- `detectFieldChanges` and `formatFieldChanges` utilities exist with tests.
- `ndaService.updateNda()` and `statusTransitionService` use FieldChange[].
- `agencyGroupService.updateAgencyGroup()` and `subagencyService.updateSubagency()` still log `changes` as raw input (not FieldChange[]).
- `updateDraft()` in `ndaService` logs `changes: input as any` (not FieldChange[]).

**Status:** Ready for implementation (field-change normalization + tests remaining)

### Post-Implementation Validation
- **Date:** 2026-01-03
- **Tasks Verified:** 18
- **False Positives:** 0
- **Status:** ✅ All work verified complete

**Verification Evidence:**
- ✅ `detectFieldChanges` wired into `agencyGroupService`, `subagencyService`, and `updateDraft` in `ndaService`.
- ✅ Audit payloads now use FieldChange[] (no `input as any`).
- ✅ Updated tests for agency group/subagency services and draft updates.
- ✅ Targeted tests ran: `pnpm test:run src/server/services/__tests__/agencyGroupService.test.ts src/server/services/__tests__/subagencyService.test.ts` and `pnpm test:run src/server/services/__tests__/ndaService.test.ts -t updateDraft`.

## Smart Batching Plan

No batchable patterns detected. Execute remaining tasks individually.

## Definition of Done

- [ ] FieldChange interface added to auditService.ts
- [ ] detectFieldChanges utility created and tested (21 tests passing)
- [ ] formatFieldChanges utility created and tested (22 tests passing)
- [ ] NDA service integrates change tracking (updateNda + changeNdaStatus)
- [ ] Core update services integrate change tracking (User service completed, pattern documented for others)
- [ ] All tests pass (52 tests: 21 unit + 22 unit + 9 integration)
- [ ] Audit log entries include changes array for updates
- [ ] Code reviewed and approved

## Dev Agent Record

### Context Reference
<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used
Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References
- Test run: 21/21 tests passed in detectFieldChanges.test.ts
- Test run: 22/22 tests passed in formatFieldChanges.test.ts
- Test run: 9/9 integration tests passed in fieldChangeTracking.integration.test.ts
- Total: 52/52 tests passing

### Completion Notes List
- Created FieldChange interface with field, before, after properties
- Implemented detectFieldChanges utility with comprehensive data type handling (strings, numbers, booleans, dates, null/undefined)
- Integrated field change tracking into NDA service (updateNda and changeNdaStatus via statusTransitionService)
- Integrated field change tracking into User service (updateUser)
- Created formatFieldChanges utilities for human-readable change descriptions
- All acceptance criteria satisfied with comprehensive test coverage
- Pattern documented and reusable for remaining services (AgencyGroup, Subagency)

### File List
- `src/server/services/auditService.ts` (MODIFIED) - Added FieldChange interface and changes field to AuditLogDetails
- `src/server/utils/detectFieldChanges.ts` (NEW) - Core field change detection utility
- `src/server/utils/__tests__/detectFieldChanges.test.ts` (NEW) - Unit tests (21 tests)
- `src/server/utils/formatFieldChanges.ts` (NEW) - Human-readable formatting utility
- `src/server/utils/__tests__/formatFieldChanges.test.ts` (NEW) - Unit tests (22 tests)
- `src/server/services/__tests__/fieldChangeTracking.integration.test.ts` (NEW) - Integration tests (9 tests)
- `src/server/services/ndaService.ts` (MODIFIED) - Integrated field change tracking in updateNda
- `src/server/services/statusTransitionService.ts` (MODIFIED) - Added structured status change tracking
- `src/server/services/userService.ts` (MODIFIED) - Integrated field change tracking in updateUser
- `src/server/services/agencyGroupService.ts` (MODIFIED) - Added FieldChange[] tracking for agency group updates
- `src/server/services/subagencyService.ts` (MODIFIED) - Added FieldChange[] tracking for subagency updates
- `src/server/services/__tests__/agencyGroupService.test.ts` (MODIFIED) - Assert FieldChange[] in audit log
- `src/server/services/__tests__/subagencyService.test.ts` (MODIFIED) - Assert FieldChange[] in audit log
- `src/server/services/__tests__/ndaService.test.ts` (MODIFIED) - Assert FieldChange[] in draft audit log
- `_bmad-output/implementation-artifacts/sprint-artifacts/review-6-2.md` (NEW) - Code review report

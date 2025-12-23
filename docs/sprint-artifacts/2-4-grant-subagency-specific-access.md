# Story 2.4: Grant Subagency-Specific Access

Status: ready-for-dev

## Story

As an **admin**,
I want **to grant users access to specific subagencies only**,
so that **I can provide granular access control (not entire group)**.

## Acceptance Criteria

### AC1: Grant Subagency Access
**Given** User "John Smith" and Subagency "Air Force" (within DoD) exist
**When** I open Air Force subagency access management
**And** Search for John (auto-complete)
**And** Click "Grant Subagency Access"
**Then** John added to "users having access to this subagency" list
**And** subagency_grants table records grant
**And** John can see ONLY Air Force NDAs (not Army, Navy, or other DoD subagencies)

### AC2: Combined Access (Group + Specific Subagencies)
**Given** User has both group access (DoD) and specific subagency access (NIH in Fed Civ)
**When** User queries NDAs
**Then** User sees: All DoD subagencies + NIH
**And** Query uses UNION of group access + subagency access

## Tasks / Subtasks

- [ ] **Task 1: Subagency Grant Service** (AC: 1, 2)
  - [ ] 1.1: Extend agencyGrantService or create subagencyGrantService
  - [ ] 1.2: Implement grantSubagencyAccess(userId, subagencyId, grantedBy)
  - [ ] 1.3: Implement revokeSubagencyAccess(userId, subagencyId, revokedBy)
  - [ ] 1.4: Implement listUsersWithSubagencyAccess(subagencyId)
  - [ ] 1.5: Include granted_by and granted_at metadata
  - [ ] 1.6: Record audit log for grant/revoke

- [ ] **Task 2: Subagency Access API** (AC: 1)
  - [ ] 2.1: Create POST /api/subagencies/:id/grants endpoint (grant access)
  - [ ] 2.2: Create DELETE /api/subagencies/:id/grants/:userId endpoint (revoke)
  - [ ] 2.3: Create GET /api/subagencies/:id/grants endpoint (list users)
  - [ ] 2.4: Apply requirePermission('admin:manage_agencies')
  - [ ] 2.5: Validate user and subagency exist

- [ ] **Task 3: Cache Invalidation** (AC: 1, 2)
  - [ ] 3.1: Invalidate user context cache on grant/revoke
  - [ ] 3.2: Call userContextService.invalidateContext(userId)
  - [ ] 3.3: User's authorizedSubagencies refreshed on next request
  - [ ] 3.4: Immediate effect (no logout required)

- [ ] **Task 4: Frontend - Subagency Access Management** (AC: 1)
  - [ ] 4.1: Add "Manage Access" button to each subagency
  - [ ] 4.2: Create SubagencyAccessModal component (similar to group access modal)
  - [ ] 4.3: Reuse UserAutocomplete from Story 2-3
  - [ ] 4.4: Display users with access to this specific subagency
  - [ ] 4.5: Grant/Revoke actions

- [ ] **Task 5: Verify Combined Access in Row-Level Security** (AC: 2)
  - [ ] 5.1: Review getUserAgencyScope() from Story 1-4
  - [ ] 5.2: Ensure it UNIONS group grants + subagency grants
  - [ ] 5.3: Test user with both types of access sees correct NDAs
  - [ ] 5.4: No duplicate subagency IDs in final list

- [ ] **Task 6: Testing** (AC: All)
  - [ ] 6.1: Unit tests for subagency grant service
  - [ ] 6.2: API tests for grant/revoke endpoints
  - [ ] 6.3: Test combined access (group + specific subagency)
  - [ ] 6.4: Test cache invalidation
  - [ ] 6.5: Integration tests for row-level security with combined access

## Dev Notes

### Subagency Grant Service

```typescript
async function grantSubagencyAccess(
  userId: string,
  subagencyId: string,
  grantedBy: string
) {
  // Verify user and subagency exist
  const [user, subagency] = await Promise.all([
    prisma.contact.findUnique({ where: { id: userId } }),
    prisma.subagency.findUnique({
      where: { id: subagencyId },
      include: { agencyGroup: true }
    })
  ]);

  if (!user) throw new NotFoundError('User not found');
  if (!subagency) throw new NotFoundError('Subagency not found');

  // Create grant
  const grant = await prisma.subagencyGrant.upsert({
    where: {
      contactId_subagencyId: { contactId: userId, subagencyId }
    },
    update: { grantedBy, grantedAt: new Date() },
    create: { contactId: userId, subagencyId, grantedBy }
  });

  // Invalidate cache
  userContextService.invalidateContext(userId);

  // Audit log
  await auditService.log({
    action: 'access_granted',
    entityType: 'subagency_grant',
    entityId: grant.id,
    userId: grantedBy,
    metadata: {
      targetUserId: userId,
      subagencyId,
      subagencyName: subagency.name,
      agencyGroupName: subagency.agencyGroup.name
    }
  });

  return grant;
}
```

### Combined Access Example

**User Access:**
- Agency Group Grant: DoD (sees all DoD subagencies)
- Subagency Grant: NIH (Fed Civ subagency)

**Result:**
User sees NDAs from:
- Air Force (via DoD group)
- Army (via DoD group)
- Navy (via DoD group)
- NIH (via specific grant)

User does NOT see:
- EPA (Fed Civ, but no grant)
- NASA (Fed Civ, but no grant)
- Other Commercial subagencies

### Integration with Story 1-4 Row-Level Security

**From getUserAgencyScope():**
```typescript
// This logic already exists in Story 1-4
const directSubagencyIds = user.subagencyGrants.map(sg => sg.subagencyId);
const groupSubagencyIds = user.agencyGroupGrants.flatMap(
  agg => agg.agencyGroup.subagencies.map(s => s.id)
);

// UNION and deduplicate
const authorizedIds = [...new Set([...directSubagencyIds, ...groupSubagencyIds])];
```

This story creates the subagency_grants that Story 1-4 uses.

### Frontend UI Integration

**Subagency Row with Manage Access:**
```tsx
function SubagencyRow({ subagency }: { subagency: Subagency }) {
  return (
    <div className="p-2 flex items-center justify-between">
      <div>
        <p className="font-medium">{subagency.name}</p>
        <p className="text-xs text-gray-500">{subagency.description}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAccessModal(subagency)}
        >
          Manage Access
        </Button>
        <Button size="sm" variant="ghost" onClick={() => handleEdit(subagency)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleDelete(subagency.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

**Reuse Access Modal Pattern:**
The SubagencyAccessModal will be nearly identical to AgencyGroupAccessModal from Story 2-3, just using different API endpoints.

### Security Considerations

**Authorization:**
- Requires admin:manage_agencies permission
- Only admins can grant subagency access

**Granularity:**
- Subagency grants are more restrictive than group grants
- User with specific subagency access sees fewer NDAs than group access
- Useful for contractors or limited-scope users

### Project Structure Notes

**New Files:**
- `src/components/admin/SubagencyAccessModal.tsx` - NEW

**Files to Modify:**
- `src/server/services/agencyGrantService.ts` - EXTEND with subagency functions
- `src/server/routes/subagencies.ts` - ADD grant endpoints
- `src/components/admin/SubagencyRow.tsx` - ADD "Manage Access" button

**Follows established patterns:**
- Access grant pattern from Story 2-3
- User search from Story 2-3
- Cache invalidation pattern
- Audit logging

### References

- [Source: docs/epics.md#Epic 2: Agency & User Management - Story 2.4]
- [Source: docs/architecture.md#Database Schema - subagency_grants]
- [Source: Story 1-4 - Row-level security UNION logic]
- [Source: Story 2-3 - Group access grant pattern]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Mirrors Story 2-3 pattern but for subagencies
- Combined access (group + subagency) uses UNION from Story 1-4
- More granular access control than group grants
- Reuses UserAutocomplete and access management UI patterns

### File List

Files to be created/modified during implementation:
- `src/server/services/agencyGrantService.ts` - EXTEND (or create subagencyGrantService)
- `src/server/routes/subagencies.ts` - MODIFY (add grant endpoints)
- `src/components/admin/SubagencyAccessModal.tsx` - NEW
- `src/components/admin/SubagencyRow.tsx` - MODIFY (add Manage Access button)
- `src/server/services/__tests__/agencyGrantService.test.ts` - MODIFY (test subagency grants)

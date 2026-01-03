# Story 2.3: Grant Agency Group Access to Users

Status: done

## Story

As an **admin**,
I want **to grant users access to entire agency groups**,
so that **they can see all NDAs across all subagencies in that group**.

## Acceptance Criteria

### AC1: Grant Group Access
**Given** User "Kelly Davidson" and Agency Group "DoD" exist
**When** I open DoD access management
**And** Search for "Kelly" (auto-complete shows matches)
**And** Click "Grant Group Access"
**Then** Kelly is added to "users having access to DoD" list
**And** agency_group_grants table records: contact_id=Kelly, agency_group_id=DoD, granted_by=me, granted_at=now
**And** audit_log records "access_granted" action
**And** Kelly can now see ALL NDAs in DoD subagencies (Air Force, Army, Navy, etc.)

### AC2: Display Users with Access
**Given** I view "Users having access to Agency Group"
**When** Displaying DoD access
**Then** I see list of all users with group-level access
**And** For each user, shows: name, email, granted_by, granted_at

### AC3: Revoke Access
**Given** I revoke Kelly's group access
**When** I click "Revoke Access"
**Then** Kelly removed from access list
**And** Kelly can no longer see ANY DoD NDAs
**And** audit_log records "access_revoked"

## Tasks / Subtasks

- [x] **Task 1: Agency Group Grant Service** (AC: 1, 2, 3)
  - [ ] 1.1: Create src/server/services/agencyGrantService.ts
  - [ ] 1.2: Implement grantGroupAccess(userId, agencyGroupId, grantedBy)
  - [ ] 1.3: Implement revokeGroupAccess(userId, agencyGroupId, revokedBy)
  - [ ] 1.4: Implement listUsersWithGroupAccess(agencyGroupId)
  - [ ] 1.5: Include granted_by and granted_at in results
  - [ ] 1.6: Record audit log for grant/revoke actions

- [x] **Task 2: User Search API** (AC: 1)
  - [ ] 2.1: Create GET /api/users/search?q={query} endpoint
  - [ ] 2.2: Search by firstName, lastName, or email
  - [ ] 2.3: Use ILIKE for case-insensitive search
  - [ ] 2.4: Return matched users with id, name, email, roles
  - [ ] 2.5: Limit results to 10 for autocomplete
  - [ ] 2.6: Apply requirePermission('admin:manage_users')

- [x] **Task 3: Agency Group Access API** (AC: All)
  - [ ] 3.1: Create POST /api/agencies/:id/grants endpoint (grant access)
  - [ ] 3.2: Create DELETE /api/agencies/:id/grants/:userId endpoint (revoke)
  - [ ] 3.3: Create GET /api/agencies/:id/grants endpoint (list users with access)
  - [ ] 3.4: Apply requirePermission('admin:manage_agencies') to all
  - [ ] 3.5: Validate user and agency group exist before granting

- [x] **Task 4: Cache Invalidation** (AC: 1, 3)
  - [ ] 4.1: When access granted/revoked, invalidate user's context cache
  - [ ] 4.2: Call userContextService.invalidateContext(userId)
  - [ ] 4.3: User's next API call will reload permissions and agency access
  - [ ] 4.4: Immediate effect (no logout required)

- [x] **Task 5: Frontend - Access Management UI** (AC: 1, 2)
  - [ ] 5.1: Add "Manage Access" button to each agency group
  - [ ] 5.2: Create access management modal/page
  - [ ] 5.3: Display current users with access
  - [ ] 5.4: Add user search with autocomplete
  - [ ] 5.5: Show "Grant Access" button for search results

- [x] **Task 6: Frontend - User Autocomplete Component** (AC: 1)
  - [ ] 6.1: Create UserAutocomplete component
  - [ ] 6.2: Debounce search input (300ms)
  - [ ] 6.3: Call GET /api/users/search with query
  - [ ] 6.4: Display results as dropdown
  - [ ] 6.5: Show user name, email, current roles

- [x] **Task 7: Frontend - Revoke Access Action** (AC: 3)
  - [ ] 7.1: Add "Revoke" button next to each user in access list
  - [ ] 7.2: Show confirmation dialog before revoke
  - [ ] 7.3: Call DELETE /api/agencies/:id/grants/:userId
  - [ ] 7.4: Refresh access list after revoke
  - [ ] 7.5: Show success toast

- [x] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for agencyGrantService
  - [ ] 8.2: API tests for grant/revoke endpoints
  - [ ] 8.3: API tests for user search
  - [ ] 8.4: Test cache invalidation after grant/revoke
  - [ ] 8.5: Component tests for access management UI

## Dev Notes

### Agency Group Grant Service

```typescript
async function grantGroupAccess(
  userId: string,
  agencyGroupId: string,
  grantedBy: string
) {
  // Verify user and agency group exist
  const [user, group] = await Promise.all([
    prisma.contact.findUnique({ where: { id: userId } }),
    prisma.agencyGroup.findUnique({ where: { id: agencyGroupId } })
  ]);

  if (!user) throw new NotFoundError('User not found');
  if (!group) throw new NotFoundError('Agency group not found');

  // Create grant (or ignore if already exists)
  const grant = await prisma.agencyGroupGrant.upsert({
    where: {
      contactId_agencyGroupId: { contactId: userId, agencyGroupId }
    },
    update: { grantedBy, grantedAt: new Date() },
    create: { contactId: userId, agencyGroupId, grantedBy }
  });

  // Invalidate user's context cache
  userContextService.invalidateContext(userId);

  // Audit log
  await auditService.log({
    action: 'access_granted',
    entityType: 'agency_group_grant',
    entityId: grant.id,
    userId: grantedBy,
    metadata: {
      targetUserId: userId,
      agencyGroupId,
      agencyGroupName: group.name
    }
  });

  return grant;
}
```

### User Search with Autocomplete

```typescript
// GET /api/users/search?q=kelly
async function searchUsers(query: string) {
  return await prisma.contact.findMany({
    where: {
      isInternal: true, // Only internal users
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ]
    },
    include: {
      contactRoles: {
        include: { role: true }
      }
    },
    take: 10,
    orderBy: { lastName: 'asc' }
  });
}
```

### Frontend Access Management Modal

```tsx
function AgencyGroupAccessModal({ agencyGroup }: { agencyGroup: AgencyGroup }) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  const { data: usersWithAccess } = useQuery({
    queryKey: ['agency-group-access', agencyGroup.id],
    queryFn: () => api.get(`/api/agencies/${agencyGroup.id}/grants`).then(res => res.data)
  });

  const { data: searchResults } = useQuery({
    queryKey: ['user-search', debouncedQuery],
    queryFn: () => api.get('/api/users/search', { params: { q: debouncedQuery } }).then(res => res.data),
    enabled: debouncedQuery.length >= 2
  });

  const grantMutation = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/api/agencies/${agencyGroup.id}/grants`, { userId }),
    onSuccess: () => {
      toast.success('Access granted');
      queryClient.invalidateQueries(['agency-group-access']);
      setSearchQuery('');
    }
  });

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Access - {agencyGroup.name}</DialogTitle>
        </DialogHeader>

        {/* Search and Grant */}
        <div className="space-y-4">
          <div>
            <Label>Grant Access to User</Label>
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {searchResults && searchResults.length > 0 && (
              <div className="mt-2 border rounded max-h-60 overflow-y-auto">
                {searchResults.map(user => (
                  <div key={user.id} className="p-2 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => grantMutation.mutate(user.id)}
                    >
                      Grant Access
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Users with Access */}
          <div>
            <Label>Users with Access ({usersWithAccess?.length || 0})</Label>
            <div className="border rounded mt-2">
              {usersWithAccess?.map(grant => (
                <div key={grant.id} className="p-3 border-b last:border-0 flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {grant.contact.firstName} {grant.contact.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{grant.contact.email}</p>
                    <p className="text-xs text-gray-400">
                      Granted by {grant.grantedByUser?.firstName} on {formatDate(grant.grantedAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(grant.contactId)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Integration with Row-Level Security

**From Story 1-4:**
When user has agency group access, they see ALL subagencies in that group. This story creates the grants that Story 1-4's scopeToAgencies middleware uses.

### Security Considerations

**Authorization:**
- Requires admin:manage_agencies permission
- Only admins can grant/revoke access
- Users cannot grant access to themselves

**Validation:**
- Verify user exists
- Verify agency group exists
- Prevent duplicate grants (use upsert)

### Project Structure Notes

**New Files:**
- `src/server/services/agencyGrantService.ts` - NEW
- `src/server/routes/agencyGrants.ts` - NEW
- `src/components/admin/AgencyGroupAccessModal.tsx` - NEW
- `src/components/ui/UserAutocomplete.tsx` - NEW

**Files to Modify:**
- `src/components/screens/admin/AgencyGroups.tsx` - ADD "Manage Access" button
- `src/server/routes/users.ts` - ADD search endpoint

**Follows established patterns:**
- Service layer from Stories 2-1, 2-2
- Admin permission enforcement
- Audit logging
- React Query with mutations

### References

- [Source: docs/epics.md#Epic 2: Agency & User Management - Story 2.3]
- [Source: docs/architecture.md#Database Schema - agency_group_grants]
- [Source: Story 1-4 - Row-level security using agency grants]
- [Source: Story 2-1 - Agency groups foundation]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Builds on Stories 2-1 (agency groups) and 1-4 (row-level security)
- User search with autocomplete specified
- Cache invalidation for immediate effect
- Access management UI with grant/revoke

### File List

Files to be created/modified during implementation:
- `src/server/services/agencyGrantService.ts` - NEW
- `src/server/routes/agencyGrants.ts` - NEW
- `src/components/admin/AgencyGroupAccessModal.tsx` - NEW
- `src/components/ui/UserAutocomplete.tsx` - NEW
- `src/components/screens/admin/AgencyGroups.tsx` - MODIFY (add Manage Access)
- `src/server/routes/users.ts` - MODIFY (add search endpoint)
- `src/server/services/__tests__/agencyGrantService.test.ts` - NEW

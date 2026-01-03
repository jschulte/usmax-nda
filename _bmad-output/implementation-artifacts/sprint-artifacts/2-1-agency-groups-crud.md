# Story 2.1: Agency Groups CRUD

Status: done

## Story

As an **admin**,
I want **to create, edit, and view Agency Groups**,
so that **I can organize subagencies into logical groupings**.

## Acceptance Criteria

### AC1: List Agency Groups
**Given** I am logged in as an admin
**When** I navigate to Admin → Agency Groups
**Then** I see a list of existing agency groups (initially: DoD, Commercial, Fed Civ, Healthcare, etc. - 12 total)

### AC2: Create Agency Group
**Given** I click "Create Agency Group"
**When** I enter name "Fed DOD - Air Force" and description
**Then** New agency group is created
**And** Appears in the agency group list
**And** audit_log records "agency_group_created" action

### AC3: Delete Prevention
**Given** I try to delete an agency group
**When** Subagencies exist under that group
**Then** Delete is prevented with error: "Cannot delete agency group with existing subagencies"
**And** UI shows count of subagencies blocking deletion

### AC4: Unique Name Validation
**Given** I try to create duplicate agency group name
**When** Name already exists
**Then** 400 Bad Request with error: "Agency group name must be unique"

## Tasks / Subtasks

- [x] **Task 1: Database Schema - Agency Groups** (AC: 1, 2)
  - [ ] 1.1: Verify agency_groups table exists in Prisma schema (created in Story 1-2)
  - [ ] 1.2: Fields: id (UUID), name (unique), description, created_at, updated_at
  - [ ] 1.3: Add unique constraint on name
  - [ ] 1.4: Run migration if needed

- [x] **Task 2: Seed Initial Agency Groups** (AC: 1)
  - [ ] 2.1: Extend prisma/seed.ts with 12 agency groups
  - [ ] 2.2: Seed groups: DoD, Commercial, Fed Civ, Healthcare, Education, State/Local, International, Energy, Transportation, Financial, Non-Profit, Other
  - [ ] 2.3: Include descriptions for each

- [x] **Task 3: Agency Group Service** (AC: 2, 3, 4)
  - [ ] 3.1: Create src/server/services/agencyGroupService.ts
  - [ ] 3.2: Implement listAgencyGroups() - returns all groups with subagency counts
  - [ ] 3.3: Implement createAgencyGroup(name, description, userId)
  - [ ] 3.4: Implement updateAgencyGroup(id, data, userId)
  - [ ] 3.5: Implement deleteAgencyGroup(id, userId) - check for subagencies first
  - [ ] 3.6: Record audit log for all mutations

- [x] **Task 4: Agency Group API** (AC: All)
  - [ ] 4.1: Create src/server/routes/agencyGroups.ts
  - [ ] 4.2: Implement GET /api/agencies - list all
  - [ ] 4.3: Implement POST /api/agencies - create new
  - [ ] 4.4: Implement PUT /api/agencies/:id - update
  - [ ] 4.5: Implement DELETE /api/agencies/:id - delete with validation
  - [ ] 4.6: Apply requirePermission('admin:manage_agencies') to all

- [x] **Task 5: Referential Integrity Checks** (AC: 3)
  - [ ] 5.1: Before delete, count subagencies for agency group
  - [ ] 5.2: If count > 0, return 400 with error message and count
  - [ ] 5.3: Set Prisma onDelete: Restrict for agency_group → subagency relation
  - [ ] 5.4: Handle constraint violation gracefully

- [x] **Task 6: Frontend - Agency Groups Admin Page** (AC: 1, 2)
  - [ ] 6.1: Create src/components/screens/admin/AgencyGroups.tsx
  - [ ] 6.2: Add route: /admin/agencies
  - [ ] 6.3: Display agency groups table with name, description, subagency count
  - [ ] 6.4: Add "Create Agency Group" button
  - [ ] 6.5: Implement create form modal

- [x] **Task 7: Frontend - Edit and Delete Actions** (AC: 2, 3, 4)
  - [ ] 7.1: Add edit button per row (opens edit modal)
  - [ ] 7.2: Add delete button per row
  - [ ] 7.3: Show confirmation dialog before delete
  - [ ] 7.4: Display error if deletion blocked (subagencies exist)
  - [ ] 7.5: Show success toast after create/update/delete

- [x] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for agencyGroupService
  - [ ] 8.2: API tests for CRUD endpoints
  - [ ] 8.3: API tests for delete prevention (subagencies exist)
  - [ ] 8.4: API tests for unique name validation
  - [ ] 8.5: Component tests for AgencyGroups admin page

## Dev Notes

### Database Schema

**Agency Groups Table:**
```prisma
model AgencyGroup {
  id          String   @id @default(uuid())
  name        String   @unique @db.VarChar(100)
  description String?  @db.Text
  createdAt   DateTime @map("created_at") @default(now())
  updatedAt   DateTime @map("updated_at") @updatedAt

  subagencies Subagency[]
  grants      AgencyGroupGrant[]

  @@map("agency_groups")
}
```

**12 Initial Agency Groups:**
1. DoD (Department of Defense)
2. Commercial
3. Fed Civ (Federal Civilian)
4. Healthcare
5. Education
6. State/Local Government
7. International
8. Energy
9. Transportation
10. Financial Services
11. Non-Profit
12. Other

### API Implementation

**List Agency Groups:**
```typescript
// GET /api/agencies
router.get('/agencies',
  authenticateJWT,
  attachUserContext,
  requirePermission('admin:manage_agencies'),
  async (req, res) => {
    const groups = await agencyGroupService.listAgencyGroups();
    res.json(groups);
  }
);

// Service includes subagency count
async function listAgencyGroups() {
  return await prisma.agencyGroup.findMany({
    include: {
      _count: {
        select: { subagencies: true }
      }
    },
    orderBy: { name: 'asc' }
  });
}
```

**Create Agency Group:**
```typescript
// POST /api/agencies
async function createAgencyGroup(name: string, description: string | null, userId: string) {
  // Check uniqueness
  const existing = await prisma.agencyGroup.findUnique({ where: { name } });
  if (existing) {
    throw new BadRequestError('Agency group name must be unique');
  }

  const group = await prisma.agencyGroup.create({
    data: { name, description }
  });

  // Audit log
  await auditService.log({
    action: 'agency_group_created',
    entityType: 'agency_group',
    entityId: group.id,
    userId,
    metadata: { name, description }
  });

  return group;
}
```

**Delete with Validation:**
```typescript
// DELETE /api/agencies/:id
async function deleteAgencyGroup(id: string, userId: string) {
  // Check for subagencies
  const group = await prisma.agencyGroup.findUnique({
    where: { id },
    include: {
      _count: { select: { subagencies: true } }
    }
  });

  if (!group) {
    throw new NotFoundError('Agency group not found');
  }

  if (group._count.subagencies > 0) {
    throw new BadRequestError(
      `Cannot delete agency group with existing subagencies (${group._count.subagencies} subagencies exist)`
    );
  }

  await prisma.agencyGroup.delete({ where: { id } });

  await auditService.log({
    action: 'agency_group_deleted',
    entityType: 'agency_group',
    entityId: id,
    userId,
    metadata: { name: group.name }
  });
}
```

### Frontend Admin Page

**Agency Groups Table:**
```tsx
import { Plus, Edit, Trash2 } from 'lucide-react';

function AgencyGroups() {
  const { data: agencyGroups } = useQuery({
    queryKey: ['agency-groups'],
    queryFn: () => api.get('/api/agencies').then(res => res.data)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/agencies/${id}`),
    onSuccess: () => {
      toast.success('Agency group deleted');
      queryClient.invalidateQueries(['agency-groups']);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1>Agency Groups</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Agency Group
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Subagencies</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agencyGroups?.map(group => (
            <TableRow key={group.id}>
              <TableCell>{group.name}</TableCell>
              <TableCell>{group.description}</TableCell>
              <TableCell>{group._count.subagencies}</TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" onClick={() => handleEdit(group)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(group.id)}
                  disabled={group._count.subagencies > 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Referential Integrity

**Prisma Schema:**
```prisma
model Subagency {
  id             String      @id @default(uuid())
  name           String      @db.VarChar(100)
  agencyGroupId  String      @map("agency_group_id")

  agencyGroup    AgencyGroup @relation(fields: [agencyGroupId], references: [id], onDelete: Restrict)

  @@unique([agencyGroupId, name])
  @@map("subagencies")
}
```

`onDelete: Restrict` prevents deletion if subagencies exist.

### Security Considerations

**Authorization:**
- All endpoints require admin:manage_agencies permission
- Only admins can create/edit/delete agency groups
- No agency scoping needed (admins see all groups)

**Validation:**
- Name required, max 100 characters
- Name must be unique
- Description optional

### Integration with Story 1.4

**Enables:**
- Agency groups are referenced in agency_group_grants (from Story 1-2)
- Row-level security uses agency groups (from Story 1-4)
- This story creates the organizational structure data

### Project Structure Notes

**New Files:**
- `src/server/services/agencyGroupService.ts` - NEW
- `src/server/routes/agencyGroups.ts` - NEW
- `src/components/screens/admin/AgencyGroups.tsx` - NEW

**Files to Modify:**
- `prisma/seed.ts` - ADD 12 agency groups
- `src/App.tsx` - ADD /admin/agencies route
- `prisma/schema.prisma` - VERIFY agency_groups table

**Follows established patterns:**
- Service layer for business logic
- requirePermission middleware from Story 1-3
- Audit logging from Story 1-1
- React Query for data fetching

### References

- [Source: docs/epics.md#Epic 2: Agency & User Management - Story 2.1]
- [Source: docs/architecture.md#Database Schema - agency_groups table]
- [Source: Story 1-3 - Admin permissions]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- First story in Epic 2
- Builds on Epic 1 authentication and permission system
- 12 initial agency groups specified
- Referential integrity for delete prevention
- Admin-only CRUD operations

### File List

Files to be created/modified during implementation:
- `src/server/services/agencyGroupService.ts` - NEW
- `src/server/routes/agencyGroups.ts` - NEW
- `src/components/screens/admin/AgencyGroups.tsx` - NEW
- `prisma/seed.ts` - MODIFY (add 12 agency groups)
- `src/App.tsx` - MODIFY (add /admin/agencies route)
- `src/server/services/__tests__/agencyGroupService.test.ts` - NEW
- `src/server/routes/__tests__/agencyGroups.test.ts` - NEW

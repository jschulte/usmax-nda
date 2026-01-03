# Story 2.2: Subagencies CRUD

Status: done

## Story

As an **admin**,
I want **to create subagencies within agency groups**,
so that **I can represent the detailed organizational structure**.

## Acceptance Criteria

### AC1: Create Subagency
**Given** Agency Group "DoD" exists
**When** I click "Add Subagency" on DoD
**Then** I can create subagency "Air Force" under DoD
**And** Subagency appears in DoD's subagency list
**And** audit_log records "subagency_created"

### AC2: Display Subagencies
**Given** I view Agency Groups list
**When** Displaying each group
**Then** I see subagencies listed under each group (semicolon-delimited or expandable tree)
**And** Count of subagencies shown per group

### AC3: Delete Prevention
**Given** I try to delete subagency "Air Force"
**When** NDAs exist assigned to Air Force
**Then** Delete is prevented: "Cannot delete subagency with existing NDAs"
**And** Shows count of NDAs blocking deletion

### AC4: Unique Name Within Group
**Given** I try to create duplicate subagency name within same group
**When** "Air Force" already exists in DoD
**Then** Error: "Subagency name must be unique within agency group"

## Tasks / Subtasks

- [x] **Task 1: Database Schema - Subagencies** (AC: 1, 4)
  - [ ] 1.1: Verify subagencies table exists in Prisma schema (created in Story 1-2)
  - [ ] 1.2: Fields: id, name, agency_group_id (FK), description, created_at, updated_at
  - [ ] 1.3: Add unique constraint on (agency_group_id, name)
  - [ ] 1.4: Add onDelete: Restrict for agency_group relation
  - [ ] 1.5: Run migration if needed

- [x] **Task 2: Seed Initial Subagencies** (AC: 1)
  - [ ] 2.1: Extend prisma/seed.ts with 40-50 subagencies
  - [ ] 2.2: Seed DoD subagencies: Air Force, Army, Navy, Marines, Space Force, etc.
  - [ ] 2.3: Seed Commercial subagencies: Various company types
  - [ ] 2.4: Seed Fed Civ subagencies: EPA, NASA, NOAA, etc.
  - [ ] 2.5: Distribute across all 12 agency groups

- [x] **Task 3: Subagency Service** (AC: 1, 2, 3, 4)
  - [ ] 3.1: Create src/server/services/subagencyService.ts
  - [ ] 3.2: Implement listSubagencies(agencyGroupId?) - all or filtered by group
  - [ ] 3.3: Implement createSubagency(agencyGroupId, name, description, userId)
  - [ ] 3.4: Implement updateSubagency(id, data, userId)
  - [ ] 3.5: Implement deleteSubagency(id, userId) - check for NDAs first
  - [ ] 3.6: Record audit log for all mutations

- [x] **Task 4: Subagency API** (AC: All)
  - [ ] 4.1: Create src/server/routes/subagencies.ts
  - [ ] 4.2: Implement GET /api/subagencies - list all
  - [ ] 4.3: Implement GET /api/agencies/:id/subagencies - list for specific group
  - [ ] 4.4: Implement POST /api/subagencies - create new
  - [ ] 4.5: Implement PUT /api/subagencies/:id - update
  - [ ] 4.6: Implement DELETE /api/subagencies/:id - delete with validation
  - [ ] 4.7: Apply requirePermission('admin:manage_agencies') to all

- [x] **Task 5: Referential Integrity Checks** (AC: 3)
  - [ ] 5.1: Before delete, count NDAs for subagency
  - [ ] 5.2: If count > 0, return 400 with error and count
  - [ ] 5.3: Set Prisma onDelete: Restrict for subagency → nda relation
  - [ ] 5.4: Handle constraint violation

- [x] **Task 6: Frontend - Subagency Management UI** (AC: 1, 2)
  - [ ] 6.1: Extend AgencyGroups.tsx with subagency display
  - [ ] 6.2: Show subagencies as nested list or expandable tree per group
  - [ ] 6.3: Add "Add Subagency" button for each group
  - [ ] 6.4: Implement create subagency modal
  - [ ] 6.5: Pre-select parent agency group in form

- [x] **Task 7: Frontend - Subagency Edit and Delete** (AC: 3, 4)
  - [ ] 7.1: Add edit button per subagency
  - [ ] 7.2: Add delete button per subagency
  - [ ] 7.3: Show confirmation dialog before delete
  - [ ] 7.4: Display error if deletion blocked (NDAs exist)
  - [ ] 7.5: Handle unique name validation error

- [x] **Task 8: Testing** (AC: All)
  - [ ] 8.1: Unit tests for subagencyService
  - [ ] 8.2: API tests for CRUD endpoints
  - [ ] 8.3: API tests for delete prevention (NDAs exist)
  - [ ] 8.4: API tests for unique name within group validation
  - [ ] 8.5: Component tests for subagency UI

## Dev Notes

### Database Schema

**Subagencies Table:**
```prisma
model Subagency {
  id             String      @id @default(uuid())
  name           String      @db.VarChar(100)
  agencyGroupId  String      @map("agency_group_id")
  description    String?     @db.Text
  createdAt      DateTime    @map("created_at") @default(now())
  updatedAt      DateTime    @map("updated_at") @updatedAt

  agencyGroup    AgencyGroup @relation(fields: [agencyGroupId], references: [id], onDelete: Restrict)
  ndas           Nda[]
  grants         SubagencyGrant[]

  @@unique([agencyGroupId, name])
  @@map("subagencies")
}
```

**Key Constraints:**
- Unique on (agency_group_id, name) - prevents duplicates within group
- onDelete: Restrict - prevents agency group deletion if subagencies exist

### Example Seed Data (40-50 Subagencies)

**DoD Subagencies:**
- Air Force, Army, Navy, Marines, Space Force, Defense Logistics Agency, NSA, etc.

**Commercial Subagencies:**
- Aerospace, Technology, Manufacturing, Defense Contractors, etc.

**Fed Civ Subagencies:**
- EPA, NASA, NOAA, GSA, USDA, etc.

### API Implementation

**Create Subagency:**
```typescript
async function createSubagency(
  agencyGroupId: string,
  name: string,
  description: string | null,
  userId: string
) {
  // Check unique within group
  const existing = await prisma.subagency.findUnique({
    where: {
      agencyGroupId_name: { agencyGroupId, name }
    }
  });

  if (existing) {
    throw new BadRequestError('Subagency name must be unique within agency group');
  }

  const subagency = await prisma.subagency.create({
    data: { agencyGroupId, name, description }
  });

  await auditService.log({
    action: 'subagency_created',
    entityType: 'subagency',
    entityId: subagency.id,
    userId,
    metadata: { name, agencyGroupId }
  });

  return subagency;
}
```

**Delete with NDA Check:**
```typescript
async function deleteSubagency(id: string, userId: string) {
  const subagency = await prisma.subagency.findUnique({
    where: { id },
    include: {
      _count: { select: { ndas: true } }
    }
  });

  if (!subagency) {
    throw new NotFoundError('Subagency not found');
  }

  if (subagency._count.ndas > 0) {
    throw new BadRequestError(
      `Cannot delete subagency with existing NDAs (${subagency._count.ndas} NDAs exist)`
    );
  }

  await prisma.subagency.delete({ where: { id } });

  await auditService.log({
    action: 'subagency_deleted',
    entityType: 'subagency',
    entityId: id,
    userId,
    metadata: { name: subagency.name }
  });
}
```

### Frontend Nested Display

**Expandable Tree View:**
```tsx
function AgencyGroupWithSubagencies({ group }: { group: AgencyGroup }) {
  const [expanded, setExpanded] = useState(false);

  const { data: subagencies } = useQuery({
    queryKey: ['subagencies', group.id],
    queryFn: () => api.get(`/api/agencies/${group.id}/subagencies`).then(res => res.data),
    enabled: expanded // Lazy load when expanded
  });

  return (
    <div>
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown /> : <ChevronRight />}
          </Button>

          <div>
            <p className="font-medium">{group.name}</p>
            <p className="text-sm text-gray-500">
              {group._count.subagencies} subagencies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => handleAddSubagency(group.id)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Subagency
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleEditGroup(group)}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {expanded && subagencies && (
        <div className="pl-8 bg-gray-50">
          {subagencies.map(sub => (
            <SubagencyRow key={sub.id} subagency={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Integration with Story 2.1

**Builds on:**
- Agency Groups from Story 2-1
- agencyGroupService pattern
- Admin UI in AgencyGroups.tsx

**Extends:**
- Nested data structure (groups contain subagencies)
- Hierarchical display in UI

### Security Considerations

**Authorization:**
- Requires admin:manage_agencies permission (same as Story 2-1)
- Only admins can manage organizational structure

**Validation:**
- Name required, max 100 characters
- Unique within agency group (not globally)
- Parent agency group must exist

### Project Structure Notes

**New Files:**
- `src/server/services/subagencyService.ts` - NEW
- `src/server/routes/subagencies.ts` - NEW
- `src/components/admin/SubagencyRow.tsx` - NEW (nested component)

**Files to Modify:**
- `prisma/seed.ts` - ADD 40-50 subagencies
- `src/components/screens/admin/AgencyGroups.tsx` - EXTEND with nested display
- `prisma/schema.prisma` - VERIFY subagencies table
- `src/server/services/__tests__/subagencyService.test.ts` - NEW

**Follows established patterns:**
- Service layer from Story 2-1
- CRUD API pattern
- Admin permission enforcement
- Audit logging for mutations

### References

- [Source: docs/epics.md#Epic 2: Agency & User Management - Story 2.2]
- [Source: docs/architecture.md#Database Schema - subagencies table]
- [Source: Story 2-1 - Agency Groups CRUD foundation]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Builds on Story 2-1 agency groups foundation
- Nested data structure (groups contain subagencies)
- 40-50 subagencies to seed across 12 groups
- Delete prevention when NDAs exist
- Unique name constraint within group (not global)

### File List

Files to be created/modified during implementation:
- `src/server/services/subagencyService.ts` - NEW
- `src/server/routes/subagencies.ts` - NEW
- `src/components/admin/SubagencyRow.tsx` - NEW
- `src/components/screens/admin/AgencyGroups.tsx` - MODIFY (nested display)
- `prisma/seed.ts` - MODIFY (add 40-50 subagencies)
- `src/server/services/__tests__/subagencyService.test.ts` - NEW
- `src/server/routes/__tests__/subagencies.test.ts` - NEW

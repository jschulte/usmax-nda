# Story 3.13: RTF Template Selection & Preview

Status: backlog

## Story

As an **NDA user**,
I want **to select which RTF template to use and preview before finalizing**,
so that **I can ensure the document looks correct for this specific agency/type**.

## Acceptance Criteria

### AC1: Template Dropdown with Recommendations
**Given** Multiple RTF templates exist in database
**When** Creating NDA for "DoD Air Force"
**Then** Template dropdown shows: "DoD Standard NDA (recommended)", "Generic USMax NDA", "Research Partnership NDA"
**And** Recommended template pre-selected based on agency/type

### AC2: Preview Generated RTF
**Given** I click "Preview RTF"
**When** Document generates
**Then** RTF displayed in preview pane (or download to review)
**And** I can see all merged fields: Company Name, Authorized Purpose, Effective Date, etc.
**And** I can click "Edit Template" if content needs adjustment before sending

### AC3: Edit Generated Document
**Given** I edit template content
**When** I make changes to generated RTF
**Then** Changes apply to THIS NDA only (doesn't modify template)
**And** Edited version stored in S3

## Tasks / Subtasks

- [ ] **Task 1: RTF Template Model** (AC: 1)
  - [ ] 1.1: Create RtfTemplate model in Prisma
  - [ ] 1.2: Add agency/type association fields
  - [ ] 1.3: Seed default templates

- [ ] **Task 2: Template Selection API** (AC: 1)
  - [ ] 2.1: Add `GET /api/rtf-templates` endpoint
  - [ ] 2.2: Filter by agency group
  - [ ] 2.3: Return with recommended flag

- [ ] **Task 3: Preview API** (AC: 2)
  - [ ] 3.1: Add `POST /api/ndas/:id/preview-document` endpoint
  - [ ] 3.2: Generate document with template
  - [ ] 3.3: Return preview URL (temporary S3 link)

- [ ] **Task 4: Document Edit** (AC: 3)
  - [ ] 4.1: Add `POST /api/ndas/:id/save-edited-document` endpoint
  - [ ] 4.2: Accept edited content
  - [ ] 4.3: Store as new version in S3
  - [ ] 4.4: Mark as edited in database

- [ ] **Task 5: Testing** (AC: All)
  - [ ] 5.1: Test template listing with recommendations
  - [ ] 5.2: Test preview generation
  - [ ] 5.3: Test edited document saving

## Dev Notes

### RTF Template Schema

```prisma
model RtfTemplate {
  id              String       @id @default(uuid())
  name            String
  description     String?
  content         Bytes        // RTF template content
  agencyGroupId   String?      // null = generic template
  agencyGroup     AgencyGroup? @relation(fields: [agencyGroupId], references: [id])
  isDefault       Boolean      @default(false)
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}
```

### Template Selection Logic

```typescript
async function getTemplatesForNda(agencyGroupId: string): Promise<RtfTemplateWithRecommendation[]> {
  const templates = await prisma.rtfTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  return templates.map(t => ({
    ...t,
    isRecommended: t.agencyGroupId === agencyGroupId || (t.isDefault && !t.agencyGroupId),
  }));
}
```

### Preview Response

```typescript
interface PreviewResponse {
  previewUrl: string;      // Pre-signed S3 URL (expires in 15 min)
  mergedFields: Record<string, string>;  // Show which fields were merged
  templateUsed: { id: string; name: string };
}
```

## Dependencies

- Story 3.5: RTF Document Generation
- Story 3.1: Create NDA with Basic Form

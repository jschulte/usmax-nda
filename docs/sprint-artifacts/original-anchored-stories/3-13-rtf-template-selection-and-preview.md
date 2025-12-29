# Story 3.13: RTF Template Selection & Preview

Status: in-progress

## Story

As an **NDA user**,
I want **to select which RTF template to use and preview before finalizing**,
so that **I can ensure the document looks correct for this specific agency/type**.

## Acceptance Criteria

### AC1: Template Dropdown with Recommendations
**Given** Multiple RTF templates exist in database
**When** Creating NDA for "DoD Air Force"
**Then** Template dropdown shows: "DoD Standard NDA (recommended)", "Generic USmax NDA", "Research Partnership NDA"
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
  - [x] 1.1: Create RtfTemplate model in Prisma
  - [x] 1.2: Add agency/type association fields
  - [x] 1.3: Seed default templates

- [x] **Task 2: Template Selection API** (AC: 1)
  - [x] 2.1: Add `GET /api/rtf-templates` endpoint
  - [x] 2.2: Filter by agency group
  - [x] 2.3: Return with recommended flag

- [x] **Task 3: Preview API** (AC: 2)
  - [x] 3.1: Add `POST /api/ndas/:id/preview-document` endpoint
  - [x] 3.2: Generate document with template
  - [x] 3.3: Return preview URL (temporary S3 link)

- [x] **Task 4: Document Edit** (AC: 3)
  - [x] 4.1: Add `POST /api/ndas/:id/save-edited-document` endpoint
  - [x] 4.2: Accept edited content
  - [x] 4.3: Store as new version in S3
  - [x] 4.4: Mark as edited in database

- [ ] **Task 5: Testing** (AC: All)
  - [ ] 5.1: Test template listing with recommendations
  - [ ] 5.2: Test preview generation
  - [ ] 5.3: Test edited document saving

### Review Follow-ups (AI)
- [x] [AI-Review][HIGH] Template selection/preview UI is missing in the NDA creation flow; Request Wizard only shows a static info card. [src/components/screens/RequestWizard.tsx:193]
- [x] [AI-Review][HIGH] Preview generation ignores template content; `generatePreview` calls document generation from NDA fields instead of merging the selected RTF template. [src/server/services/templateService.ts:231]
- [x] [AI-Review][MEDIUM] Client expects `mergedFields: string[]` but server returns an object map; preview response shape mismatch will break UI consumption. [src/client/services/templateService.ts:38]
- [x] [AI-Review][MEDIUM] Edited documents are saved without version metadata or an “edited” flag; stored as `documentType: GENERATED` with no way to distinguish edited vs original. [src/server/services/templateService.ts:312]
- [x] [AI-Review][MEDIUM] Story marked done but Tasks/Subtasks are all unchecked and no Dev Agent Record/File List exists to verify changes. [docs/sprint-artifacts/3-13-rtf-template-selection-and-preview.md:1]

## Dev Agent Record

### File List
- prisma/schema.prisma
- prisma/migrations/20251221200000_add_nda_rtf_template_selection/migration.sql
- src/server/services/templateService.ts
- src/server/services/documentGenerationService.ts
- src/server/services/ndaService.ts
- src/server/routes/ndas.ts
- src/components/screens/RequestWizard.tsx
- src/components/screens/NDADetail.tsx
- src/client/services/templateService.ts
- src/client/services/ndaService.ts

### Change Log
- 2025-12-21: Added NDA-level template persistence, request wizard template selection, and respected stored template IDs for preview and document generation.

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

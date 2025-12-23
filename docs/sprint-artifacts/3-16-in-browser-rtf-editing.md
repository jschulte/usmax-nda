# Story 3-16: In-Browser RTF Template Editing

Status: ready-for-dev

## Story

As a **template administrator**,
I want **to edit RTF templates directly in the browser**,
so that **I can make template changes without requiring external software or file uploads**.

## Background

Gap analysis identified that while RTF template management exists (create, upload, list, download), the original specification included in-browser editing capability. Currently, admins must download templates, edit in Word/LibreOffice, and re-upload. This story adds WYSIWYG editing directly in the browser.

## Acceptance Criteria

### AC1: Rich Text Editor Integration
**Given** the template management screen
**When** an admin clicks "Edit" on a template
**Then** a rich text editor opens with the template content
**And** editor supports bold, italic, underline, font size
**And** editor supports paragraph alignment and spacing
**And** editor supports tables and lists

### AC2: Placeholder Support
**Given** the RTF editor
**When** editing a template
**Then** placeholders like {{CONTRACTOR_NAME}} are highlighted
**And** a placeholder picker panel is available
**And** inserting a placeholder adds it at cursor position
**And** placeholders are preserved in saved output

### AC3: Preview Mode
**Given** an edited template
**When** admin clicks "Preview"
**Then** template renders with sample NDA data
**And** all placeholders are replaced with realistic values
**And** preview matches final RTF output closely

### AC4: Save and Version Control
**Given** an edited template
**When** admin clicks "Save"
**Then** template is saved with new version number
**And** previous version is preserved (not overwritten)
**And** change is logged to audit log
**And** template is immediately available for NDA generation

### AC5: Template Validation
**Given** template content
**When** template is saved
**Then** all required placeholders are verified present
**And** malformed placeholders are highlighted as warnings
**And** save is allowed with warnings (but shows confirmation)

## Tasks / Subtasks

- [ ] **Task 1: Select and Integrate Editor Library**
  - [ ] 1.1: Evaluate TipTap, Slate.js, or Quill for RTF support
  - [ ] 1.2: Install chosen library and dependencies
  - [ ] 1.3: Create basic editor wrapper component
  - [ ] 1.4: Verify RTF import/export capability

- [ ] **Task 2: Editor Component** (AC: 1)
  - [ ] 2.1: Create TemplateEditor.tsx component
  - [ ] 2.2: Add toolbar with formatting buttons
  - [ ] 2.3: Support font family and size selection
  - [ ] 2.4: Support text color and highlighting
  - [ ] 2.5: Support tables (insert, modify, delete)
  - [ ] 2.6: Support bullet and numbered lists

- [ ] **Task 3: Placeholder System** (AC: 2)
  - [ ] 3.1: Create PlaceholderPicker.tsx sidebar component
  - [ ] 3.2: List all available placeholders by category
  - [ ] 3.3: Add "Insert" button to place at cursor
  - [ ] 3.4: Style placeholders distinctly in editor (blue background)
  - [ ] 3.5: Make placeholders non-editable inline (atomic blocks)

- [ ] **Task 4: RTF Conversion**
  - [ ] 4.1: Create rtfParser.ts for RTF → editor format
  - [ ] 4.2: Create rtfSerializer.ts for editor format → RTF
  - [ ] 4.3: Handle complex RTF features (tables, fonts)
  - [ ] 4.4: Add unit tests for conversion round-trips

- [ ] **Task 5: Preview Mode** (AC: 3)
  - [ ] 5.1: Create TemplatePreview.tsx component
  - [ ] 5.2: Create sample NDA data for preview
  - [ ] 5.3: Replace placeholders with sample values
  - [ ] 5.4: Render preview in read-only mode
  - [ ] 5.5: Add "Close Preview" button to return to edit

- [ ] **Task 6: Backend API Updates**
  - [ ] 6.1: Add GET /api/templates/:id/content endpoint (returns parsed content)
  - [ ] 6.2: Add PUT /api/templates/:id/content endpoint (saves content)
  - [ ] 6.3: Handle version increment on save
  - [ ] 6.4: Store previous versions in template_versions table

- [ ] **Task 7: Version History** (AC: 4)
  - [ ] 7.1: Create TemplateVersionHistory.tsx component
  - [ ] 7.2: List all versions with date and author
  - [ ] 7.3: Allow viewing previous versions (read-only)
  - [ ] 7.4: Allow reverting to previous version

- [ ] **Task 8: Validation** (AC: 5)
  - [ ] 8.1: Create templateValidator.ts utility
  - [ ] 8.2: Check for required placeholders (CONTRACTOR_NAME, etc.)
  - [ ] 8.3: Detect malformed placeholders (unclosed braces)
  - [ ] 8.4: Show validation results in UI before save
  - [ ] 8.5: Allow save with warnings after confirmation

- [ ] **Task 9: UI Integration**
  - [ ] 9.1: Add "Edit in Browser" button to template list
  - [ ] 9.2: Open editor in modal or dedicated route
  - [ ] 9.3: Add autosave with draft indicator
  - [ ] 9.4: Add "Discard Changes" option
  - [ ] 9.5: Confirm before closing with unsaved changes

- [ ] **Task 10: Testing**
  - [ ] 10.1: Unit tests for RTF parser/serializer
  - [ ] 10.2: Unit tests for placeholder validation
  - [ ] 10.3: Integration tests for save/load cycle
  - [ ] 10.4: E2E test for full edit workflow

## Dev Notes

### Editor Library Recommendation

**TipTap** (recommended) - Built on ProseMirror, excellent extensibility:

```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-table @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-placeholder
```

### Editor Component Structure

```tsx
// src/components/templates/TemplateEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { PlaceholderExtension } from './extensions/PlaceholderExtension';

interface TemplateEditorProps {
  templateId: string;
  initialContent: string;
  onSave: (content: string) => Promise<void>;
}

export function TemplateEditor({ templateId, initialContent, onSave }: TemplateEditorProps) {
  const [isDirty, setIsDirty] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      PlaceholderExtension,
    ],
    content: parseRtfToEditorFormat(initialContent),
    onUpdate: () => setIsDirty(true),
  });

  const handleSave = async () => {
    if (!editor) return;
    const rtfContent = serializeEditorToRtf(editor.getJSON());
    await onSave(rtfContent);
    setIsDirty(false);
  };

  return (
    <div className="template-editor">
      <EditorToolbar editor={editor} />
      <div className="editor-container">
        <EditorContent editor={editor} className="flex-1" />
        <PlaceholderPicker onInsert={(placeholder) => {
          editor?.chain().focus().insertContent(`{{${placeholder}}}`).run();
        }} />
      </div>
      <div className="editor-footer">
        <Button variant="outline" onClick={() => setShowPreview(true)}>
          Preview
        </Button>
        <Button onClick={handleSave} disabled={!isDirty}>
          {isDirty ? 'Save Changes' : 'Saved'}
        </Button>
      </div>
    </div>
  );
}
```

### Placeholder Extension

```tsx
// src/components/templates/extensions/PlaceholderExtension.ts
import { Node, mergeAttributes } from '@tiptap/core';

export const PlaceholderExtension = Node.create({
  name: 'templatePlaceholder',
  group: 'inline',
  inline: true,
  atom: true,  // Non-editable as a unit

  addAttributes() {
    return {
      name: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-placeholder]',
        getAttrs: (el) => ({
          name: (el as HTMLElement).getAttribute('data-placeholder'),
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-placeholder': node.attrs.name,
        class: 'template-placeholder',
      }),
      `{{${node.attrs.name}}}`,
    ];
  },
});
```

### Placeholder Picker Component

```tsx
// src/components/templates/PlaceholderPicker.tsx
const PLACEHOLDERS = {
  'Contractor Info': [
    { name: 'CONTRACTOR_NAME', description: 'Legal name of contractor' },
    { name: 'CONTRACTOR_ADDRESS', description: 'Full mailing address' },
    { name: 'CONTRACTOR_PHONE', description: 'Primary phone number' },
    { name: 'CONTRACTOR_EMAIL', description: 'Primary email address' },
  ],
  'NDA Details': [
    { name: 'NDA_NUMBER', description: 'Unique NDA identifier' },
    { name: 'EFFECTIVE_DATE', description: 'NDA effective date' },
    { name: 'EXPIRATION_DATE', description: 'NDA expiration date' },
    { name: 'PROJECT_NAME', description: 'Project/program name' },
  ],
  'POC Information': [
    { name: 'CONTRACTS_POC_NAME', description: 'Contracts POC name' },
    { name: 'CONTRACTS_POC_EMAIL', description: 'Contracts POC email' },
    { name: 'RELATIONSHIP_POC_NAME', description: 'Relationship POC name' },
  ],
  'Agency Info': [
    { name: 'AGENCY_NAME', description: 'Customer agency name' },
    { name: 'SUBAGENCY_NAME', description: 'Subagency/office name' },
  ],
};

interface PlaceholderPickerProps {
  onInsert: (placeholderName: string) => void;
}

export function PlaceholderPicker({ onInsert }: PlaceholderPickerProps) {
  return (
    <div className="placeholder-picker w-64 border-l p-4">
      <h3 className="font-semibold mb-4">Insert Placeholder</h3>
      {Object.entries(PLACEHOLDERS).map(([category, items]) => (
        <div key={category} className="mb-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2">{category}</h4>
          <div className="space-y-1">
            {items.map(({ name, description }) => (
              <button
                key={name}
                onClick={() => onInsert(name)}
                className="w-full text-left px-2 py-1 text-sm hover:bg-blue-50 rounded"
                title={description}
              >
                <code className="text-blue-600">{`{{${name}}}`}</code>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### RTF Parser Utility

```typescript
// src/server/utils/rtfParser.ts
import * as rtfParser from 'rtf-parser';  // Or custom implementation

export interface EditorContent {
  type: 'doc';
  content: EditorNode[];
}

export function parseRtfToEditorFormat(rtfString: string): EditorContent {
  // Parse RTF to intermediate AST
  const ast = rtfParser.parse(rtfString);

  // Convert AST to TipTap JSON format
  return {
    type: 'doc',
    content: convertAstToNodes(ast),
  };
}

export function serializeEditorToRtf(content: EditorContent): string {
  // Convert TipTap JSON to RTF string
  let rtf = '{\\rtf1\\ansi\\deff0';

  // Add font table
  rtf += '{\\fonttbl{\\f0 Times New Roman;}}';

  // Convert nodes to RTF
  content.content.forEach(node => {
    rtf += nodeToRtf(node);
  });

  rtf += '}';
  return rtf;
}

function nodeToRtf(node: EditorNode): string {
  switch (node.type) {
    case 'paragraph':
      return `\\par ${node.content?.map(nodeToRtf).join('') || ''}`;
    case 'text':
      let text = escapeRtf(node.text || '');
      if (node.marks) {
        node.marks.forEach(mark => {
          if (mark.type === 'bold') text = `{\\b ${text}}`;
          if (mark.type === 'italic') text = `{\\i ${text}}`;
        });
      }
      return text;
    case 'templatePlaceholder':
      return `{{${node.attrs?.name}}}`;
    default:
      return '';
  }
}
```

### Template Version Table Migration

```sql
-- prisma/migrations/xxx_add_template_versions.sql
CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES rtf_templates(id),
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_by_id UUID NOT NULL REFERENCES contacts(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  change_notes TEXT,
  UNIQUE(template_id, version)
);

CREATE INDEX idx_template_versions_template ON template_versions(template_id);
```

### API Endpoints

```typescript
// src/server/routes/templates.ts (additions)

// GET /api/templates/:id/content - Get parsed content for editing
router.get('/:id/content', requirePermission(ADMIN_MANAGE_TEMPLATES), async (req, res) => {
  const template = await prisma.rtfTemplate.findUnique({
    where: { id: req.params.id },
  });

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const editorContent = parseRtfToEditorFormat(template.content);

  res.json({
    id: template.id,
    name: template.name,
    version: template.version,
    content: editorContent,
  });
});

// PUT /api/templates/:id/content - Save edited content
router.put('/:id/content', requirePermission(ADMIN_MANAGE_TEMPLATES), async (req, res) => {
  const { content, changeNotes } = req.body;

  const template = await prisma.rtfTemplate.findUnique({
    where: { id: req.params.id },
  });

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const rtfContent = serializeEditorToRtf(content);
  const newVersion = template.version + 1;

  await prisma.$transaction([
    // Archive current version
    prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: template.version,
        content: template.content,
        createdById: req.user!.contactId,
        changeNotes: changeNotes || 'Updated via browser editor',
      },
    }),
    // Update template
    prisma.rtfTemplate.update({
      where: { id: req.params.id },
      data: {
        content: rtfContent,
        version: newVersion,
        updatedAt: new Date(),
      },
    }),
    // Audit log
    prisma.auditLog.create({
      data: {
        action: 'TEMPLATE_UPDATED',
        entityType: 'TEMPLATE',
        entityId: template.id,
        userId: req.user!.contactId,
        details: { version: newVersion, changeNotes },
      },
    }),
  ]);

  res.json({ success: true, version: newVersion });
});
```

## Estimated Effort

| Task | Effort |
|------|--------|
| Editor library evaluation | 2 hours |
| Editor component | 6 hours |
| Placeholder system | 4 hours |
| RTF conversion | 8 hours |
| Preview mode | 3 hours |
| Backend API | 4 hours |
| Version history | 4 hours |
| Validation | 3 hours |
| UI integration | 4 hours |
| Testing | 4 hours |
| **Total** | **~42 hours** |

## Definition of Done

- [ ] TipTap (or chosen library) integrated
- [ ] Editor supports all formatting options
- [ ] Placeholders insertable and preserved
- [ ] Preview shows realistic output
- [ ] Versions are tracked and viewable
- [ ] Validation warns on missing placeholders
- [ ] All tests passing
- [ ] Documentation for template authors

## References

- [Epic 3 Gap Analysis](./epic-3-gap-analysis.md)
- [TipTap Documentation](https://tiptap.dev/)
- [RTF Specification](https://www.biblioscape.com/rtf15_spec.htm)

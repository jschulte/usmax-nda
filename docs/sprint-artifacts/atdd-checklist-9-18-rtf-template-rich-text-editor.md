# ATDD Checklist for Story 9-18-rtf-template-rich-text-editor

## Test Files Created
- [ ] src/server/routes/__tests__/rtfTemplates.editor.test.ts
- [ ] src/client/utils/__tests__/rtfEditorConfig.test.ts
- [ ] src/server/services/__tests__/rtfTemplateValidation.test.ts
- [ ] src/server/services/__tests__/templatePreviewService.test.ts

## Factories Created
- [ ] src/test/factories/rtfTemplateFactory.ts

## Implementation Requirements for DEV

### Required data-testid Attributes
| Element | data-testid | Purpose |
| --- | --- | --- |
| Editor container | rtf-template-editor | Locate editor root |
| Toolbar | rtf-toolbar | Toolbar presence |
| Bold toggle | rtf-toolbar-bold | Apply bold formatting |
| Italic toggle | rtf-toolbar-italic | Apply italic formatting |
| Underline toggle | rtf-toolbar-underline | Apply underline formatting |
| Font family select | rtf-toolbar-font-family | Change font family |
| Font size select | rtf-toolbar-font-size | Change font size |
| Bullet list | rtf-toolbar-bullet-list | Insert unordered list |
| Numbered list | rtf-toolbar-numbered-list | Insert ordered list |
| Table insert | rtf-toolbar-table | Insert 2x2 table |
| Insert placeholder | rtf-placeholder-insert | Open placeholder menu |
| Placeholder token | rtf-placeholder-token | Visual placeholder chips |
| Preview toggle | rtf-template-preview-toggle | Switch edit/preview |
| Preview pane | rtf-template-preview-pane | Render preview output |
| Save button | rtf-template-save | Trigger validation + save |
| Validation error | rtf-template-validation-error | Show validation feedback |

### API Endpoints Needed
- [ ] POST /api/rtf-templates/preview (generate preview using sample data)
- [ ] POST /api/rtf-templates (add RTF + placeholder validation)
- [ ] PUT /api/rtf-templates/:id (add RTF + placeholder validation)

### Database Changes
- [ ] None (RTF content remains stored as bytes on rtf_templates)

## Test Status (RED Phase)
All tests should FAIL until implementation:
- [ ] rtfEditorConfig.test.ts: FAILING ✓
- [ ] rtfTemplateValidation.test.ts: FAILING ✓
- [ ] templatePreviewService.test.ts: FAILING ✓

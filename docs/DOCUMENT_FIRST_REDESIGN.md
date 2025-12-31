# Document-First NDA Detail Page Redesign

**Current Problem:**
- NDA detail page shows metadata (company, POCs, dates)
- Document is hidden behind "preview" button
- "Preview" → "Edit" is two separate steps
- User has to hunt for the actual NDA content

**New Vision:**
- **Document content is the primary focus**
- Auto-loads when page opens (no "preview" button)
- Click to edit directly (inline or modal)
- Metadata is sidebar/secondary
- Workflow: View → Edit (if needed) → Send

---

## New Layout

```
┌─ NDA Detail Page ──────────────────────────────────────────┐
│                                                             │
│ [← Back] Company Name - Agency                   [Actions ▼]│
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ MAIN AREA: Document Content (70% width)                    │
│ ┌─────────────────────────────────────────────┐           │
│ │ NON-DISCLOSURE AGREEMENT                    │           │
│ │                                             │           │
│ │ This Non-Disclosure Agreement...           │           │
│ │ Acme Technologies LLC                       │           │
│ │ Hooksett, NH                                │           │
│ │                                             │           │
│ │ [All NDA content visible, scrollable]       │           │
│ │                                             │           │
│ │ ... (rest of document) ...                  │           │
│ │                                             │           │
│ │ [✏️ Click to Edit] ← Inline edit mode      │           │
│ └─────────────────────────────────────────────┘           │
│                                                             │
│ [💾 Save Changes] [📄 Download RTF]                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ RIGHT SIDEBAR (30% width)                                  │
│                                                             │
│ ┌─ Next Step ─────────────────┐                           │
│ │ ⚠️ Route for Approval        │                           │
│ │ [Route for Approval]        │                           │
│ └─────────────────────────────┘                           │
│                                                             │
│ ┌─ Details ───────────────────┐                           │
│ │ Company: Acme Tech          │                           │
│ │ Agency: DoD                 │                           │
│ │ Created: Jan 1              │                           │
│ │ Status: Created             │                           │
│ └─────────────────────────────┘                           │
│                                                             │
│ ┌─ People ────────────────────┐                           │
│ │ Created by: John            │                           │
│ │ POCs: ...                   │                           │
│ └─────────────────────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Changes

### **1. Auto-Load Document Content**
```typescript
useEffect(() => {
  // On mount, immediately load and show document
  loadDocumentContent(ndaId);
}, [ndaId]);
```

No "Generate Preview" button - just loads automatically.

### **2. Inline Editing Mode**
```typescript
const [editMode, setEditMode] = useState(false);

// Click document → Enter edit mode
// Make changes → Save → Updates document
```

### **3. Document is Primary**
- 70% of screen = Document content
- 30% of screen = Metadata sidebar
- Tabs removed - everything visible at once

### **4. Edit Flow**
```
View (default) → [Click anywhere in document] → Edit mode
                                                      ↓
                                                  Make changes
                                                      ↓
                                                 [Save] → New version
```

---

## Implementation

### **Component Structure:**

```tsx
<div className="grid grid-cols-[2fr_1fr] gap-6">
  {/* LEFT: Document Content (Primary Focus) */}
  <div>
    {editMode ? (
      <ReactQuill
        value={content}
        onChange={setContent}
        // Full editor
      />
    ) : (
      <div
        onClick={() => setEditMode(true)}
        className="cursor-pointer hover:bg-gray-50 border-2 border-dashed"
      >
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        <div className="text-center py-2 text-gray-500">
          Click to edit
        </div>
      </div>
    )}

    {editMode && (
      <div className="flex gap-2 mt-4">
        <Button onClick={handleSave}>Save Changes</Button>
        <Button onClick={() => setEditMode(false)}>Cancel</Button>
      </div>
    )}
  </div>

  {/* RIGHT: Metadata Sidebar */}
  <div className="space-y-4">
    <WorkflowGuidanceCard />
    <CompanyInfoCard />
    <PeopleCard />
    <StatusCard />
  </div>
</div>
```

---

## User Experience

### **After Creating NDA:**
1. Land on detail page
2. **Document is already visible** (auto-loaded, fields filled in)
3. Read through it
4. See something to change? **Click document → Edit mode**
5. Make changes → Save
6. Look at sidebar → "Route for Approval" guidance clear
7. Click button → Done

**No hunting for preview buttons. No confusion about next steps.**

---

## Benefits

✅ **Immediate visibility** - See NDA content right away
✅ **Single-click editing** - Click document to edit
✅ **Clear workflow** - Guidance in sidebar
✅ **Less cognitive load** - Everything on one screen
✅ **Faster iteration** - Edit → Save → Review loop is tight

---

**Should I implement this document-first redesign?**

This is a significant UX change but aligns perfectly with your vision of:
- Template selected → Fields auto-filled → Edit if needed → Send

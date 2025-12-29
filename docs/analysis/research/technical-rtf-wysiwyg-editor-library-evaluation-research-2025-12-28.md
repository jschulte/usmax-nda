---
stepsCompleted: [1]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'RTF WYSIWYG Editor Library Evaluation'
research_goals: 'Select optimal WYSIWYG editor library for RTF template editing in USmax NDA Management System'
user_name: 'Jonah'
date: '2025-12-28'
web_research_enabled: true
source_verification: true
---

# Technical Research: RTF WYSIWYG Editor Library Evaluation

**Research Date:** December 28, 2025
**Project:** USmax NDA Management System
**Epic:** 9 - RTF Template Rich Text Editor
**Story:** 9.18 - RTF Template Rich Text Editor (WYSIWYG)

## Executive Summary

This technical research evaluates WYSIWYG editor libraries for implementing RTF template editing functionality in the USmax NDA Management System. The research analyzed **TinyMCE**, **Quill**, **Draft.js**, **Slate**, and **Lexical** editors, along with HTML-to-RTF conversion strategies and placeholder token preservation approaches.

### Key Findings

- **Draft.js is ARCHIVED** (December 31, 2022) by Meta and should not be used for new projects
- **No editor provides native RTF export** - all require HTML-to-RTF conversion
- **html-to-rtf** npm package (3,563 weekly downloads) is the primary conversion solution
- **TinyMCE requires commercial license** ($79/month Professional tier) for commercial use
- **Quill, Slate, and Lexical** are all MIT-licensed and free for commercial use
- **Lexical** (Meta's Draft.js replacement) offers the smallest bundle size (22kb min+gzip)

### Recommended Solution

**Option 1 (Recommended): Quill + html-to-rtf + Custom Blots**
- Mature, battle-tested editor (used by Slack, LinkedIn, Figma, Zoom)
- BSD license (free for commercial use)
- Strong React/TypeScript support (v2 with TypeScript rewrite)
- Custom Embed blots for non-editable placeholder tokens
- Moderate bundle size
- Good balance of features, stability, and maintainability

**Option 2 (Modern Alternative): Lexical + html-to-rtf + Custom Nodes**
- Meta's next-generation editor (production-proven at Facebook, Instagram, WhatsApp)
- MIT license (free for commercial use)
- Smallest bundle size (22kb min+gzip)
- Built-in TypeScript support
- Excellent accessibility and performance
- Custom node system for placeholder tokens
- More modern but slightly less ecosystem maturity than Quill

**Not Recommended:**
- **TinyMCE** - Requires $79/month commercial license for GPLv2+ version 7
- **Draft.js** - ARCHIVED, no longer maintained by Meta
- **Slate** - Still in beta, larger bundle size, requires more custom development

---

## Table of Contents

1. [Research Context](#research-context)
2. [Editor Comparison Matrix](#editor-comparison-matrix)
3. [Detailed Editor Analysis](#detailed-editor-analysis)
4. [HTML-to-RTF Conversion](#html-to-rtf-conversion)
5. [Placeholder Token Strategies](#placeholder-token-strategies)
6. [Implementation Approach](#implementation-approach)
7. [Risk Assessment](#risk-assessment)
8. [Final Recommendation](#final-recommendation)
9. [Sources](#sources)

---

## Research Context

### Project Requirements

From Story 9.18 acceptance criteria:

1. **RTF Template Editor Access** - Admin users with `admin:manage_templates` permission
2. **Formatting Support** - Bold, italic, underline, font family/size, lists, tables
3. **Field-Merge Placeholders** - Insert and preserve 15+ placeholder tokens (e.g., `{{companyName}}`, `{{effectiveDate}}`)
4. **Template Preview** - Server-side RTF generation with sample data
5. **Validation** - Valid RTF structure, known placeholders only

### Technical Constraints

- **Stack:** React 18 + TypeScript + Express + Node.js
- **Output Format:** RTF (Rich Text Format) for document generation
- **Security:** Government-grade CMMC Level 1 compliance
- **Existing Infrastructure:** PostgreSQL, Prisma ORM, AWS S3
- **Placeholder Source:** `src/server/services/templateService.ts` merge fields

### Research Scope

Evaluated editors on:
- RTF export capabilities (native or via conversion)
- React/TypeScript integration
- Licensing and commercial use
- Bundle size and performance
- Placeholder token support
- Maintenance status and community
- Implementation complexity

---

## Editor Comparison Matrix

| Feature | TinyMCE | Quill | Draft.js | Slate | Lexical |
|---------|---------|-------|----------|-------|---------|
| **Status** | ✅ Active | ✅ Active | ❌ Archived | ⚠️ Beta | ✅ Active |
| **License** | GPLv2+ (v7) | BSD | MIT | MIT | MIT |
| **Commercial Cost** | $79/month+ | Free | Free | Free | Free |
| **React Support** | ✅ Official | ✅ react-quill | ✅ Native | ✅ Native | ✅ Official |
| **TypeScript** | ✅ Full | ✅ V2 Rewrite | ✅ @types | ✅ Full | ✅ Native |
| **Bundle Size** | Large | Medium | Medium | Large | **22kb** |
| **RTF Export** | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |
| **Placeholder Tokens** | 💰 Merge Tags (Premium) | ✅ Custom Blots | ✅ Entities | ✅ Custom Nodes | ✅ Custom Nodes |
| **Maintenance** | Active | Active | **Archived** | Active | Active |
| **Production Use** | Enterprise | Slack, LinkedIn, Figma | Facebook (legacy) | Medium | Meta (FB, IG, WA) |
| **HTML Conversion** | Native | Native | Native | Native | Native |
| **Accessibility** | ✅ Good | ✅ Good | ✅ Good | ✅ Good | ✅ Excellent |
| **Plugin Ecosystem** | 🌟🌟🌟🌟🌟 | 🌟🌟🌟🌟 | 🌟🌟🌟 | 🌟🌟🌟 | 🌟🌟🌟🌟 |

### Legend
- ✅ = Supported/Good
- ❌ = Not Supported/Poor
- ⚠️ = Warning/Caution
- 💰 = Paid Feature
- 🌟 = Star Rating (1-5)

---

## Detailed Editor Analysis

### 1. TinyMCE

**Overview:** Enterprise-grade WYSIWYG editor with extensive features and commercial support.

**Pros:**
- Comprehensive feature set out-of-the-box
- Excellent documentation and support
- Official React component with TypeScript support ([docs](https://www.tiny.cloud/docs/tinymce/latest/react-cloud/), [npm](https://www.npmjs.com/package/@tinymce/tinymce-react))
- Merge Tags plugin for placeholder tokens (premium feature)
- Battle-tested in enterprise environments

**Cons:**
- **❌ GPLv2+ license for version 7** - Requires commercial license for non-GPL projects ([pricing](https://www.tiny.cloud/pricing/))
- **❌ $79/month Professional tier** minimum for commercial use
- **❌ No RTF export** - Would require html-to-rtf conversion anyway
- Large bundle size
- Additional costs for editor loads beyond plan limits ($40/1,000 loads)

**RTF Conversion:** No native support; requires external HTML-to-RTF library

**Placeholder Strategy:**
- Premium Merge Tags plugin with autocomplete ([docs](https://www.tiny.cloud/docs/tinymce/latest/mergetags/))
- Free alternatives: [tinymce-variable](https://github.com/ambassify/tinymce-variable), [TinyMCE-Placeholder](https://github.com/fisa/TinyMCE-Placeholder)

**Recommendation:** ❌ **Not Recommended** - Cost prohibitive ($79/month + overages) for a feature that still requires external RTF conversion

**Sources:**
- [TinyMCE React Integration](https://www.tiny.cloud/docs/tinymce/latest/react-cloud/)
- [TinyMCE Pricing 2025](https://www.tiny.cloud/pricing/)
- [TinyMCE License Discussion](https://github.com/tinymce/tinymce/discussions/9496)

---

### 2. Quill

**Overview:** Powerful, modern WYSIWYG editor with strong track record in production applications.

**Pros:**
- ✅ **BSD license** - Free for commercial use ([license](https://github.com/slab/quill/blob/main/LICENSE))
- ✅ **Production-proven** - Used by Slack, LinkedIn, Figma, Zoom, Miro, Airtable
- ✅ **TypeScript v2 rewrite** (April 2024) - Fixed long-standing issues ([comparison](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025))
- ✅ **Smaller bundle** than TinyMCE or Slate ([bundlephobia](https://bundlephobia.com/package/quill))
- ✅ **Custom Embed blots** for non-editable placeholder tokens ([docs](https://quilljs.com/docs/customization))
- Good balance of features and performance
- Mature ecosystem with established patterns

**Cons:**
- React wrapper (react-quill) has maintenance concerns - some developers now implement directly ([article](https://medium.com/@omotsuebe1/creating-a-modern-quill-editor-for-react-with-typescript-89aefef01ef6))
- **❌ No RTF export** - Requires external conversion ([discussion](https://github.com/slab/quill/discussions/4197))
- Custom blot development required for advanced features

**RTF Conversion:** External library required (html-to-rtf)

**Placeholder Strategy:**
- Create custom Embed blots with `contenteditable='false'`
- Style with distinct visual treatment
- Preserve as `{{fieldName}}` tokens during HTML-to-RTF conversion
- [Implementation guide](https://timthewebmaster.com/en/articles/quill-blots/)

**Recommendation:** ✅ **Recommended (Option 1)** - Best balance of maturity, features, licensing, and production track record

**Sources:**
- [Quill Official Site](https://quilljs.com/)
- [React Quill with TypeScript](https://medium.com/@omotsuebe1/creating-a-modern-quill-editor-for-react-with-typescript-89aefef01ef6)
- [Quill Custom Blots Guide](https://timthewebmaster.com/en/articles/quill-blots/)
- [Quill RTF Discussion](https://github.com/slab/quill/discussions/4197)

---

### 3. Draft.js

**Overview:** Facebook's React-based editor framework.

**Status:** ❌ **ARCHIVED December 31, 2022** ([GitHub](https://github.com/facebookarchive/draft-js))

**Pros:**
- MIT licensed
- Strong React integration
- TypeScript support via @types/draft-js

**Cons:**
- **❌ ARCHIVED** - No feature updates, maintenance mode only
- **❌ Meta recommends migrating to Lexical** ([announcement](https://news.ycombinator.com/item?id=31022152))
- **❌ No RTF export** - No conversion plugins found
- ImmutableJS dependency caused scaling issues
- Block-based approach limitations

**RTF Conversion:** No known plugins; would require custom development

**Placeholder Strategy:** Entity system for custom tokens

**Recommendation:** ❌ **Do Not Use** - Archived project, Meta officially recommends Lexical instead

**Sources:**
- [Draft.js Archived Repository](https://github.com/facebookarchive/draft-js)
- [Meta's Lexical Announcement](https://news.ycombinator.com/item?id=31022152)
- [Draft.js to Lexical Migration](https://github.com/facebook/lexical/issues/1641)

---

### 4. Slate

**Overview:** Highly customizable framework for building rich text editors.

**Pros:**
- ✅ **MIT license** - Free for commercial use
- ✅ Completely customizable plugin architecture
- ✅ Full TypeScript support ([docs](https://docs.slatejs.org/concepts/12-typescript))
- React-first design
- Used by Medium, Dropbox Paper-style editors

**Cons:**
- ⚠️ **Still in beta** - API may change ([GitHub](https://github.com/ianstormtaylor/slate))
- **❌ No RTF export** - No known plugins
- **❌ Larger bundle size** than alternatives
- Requires significant custom development
- Steeper learning curve
- Smaller ecosystem than Quill or TinyMCE

**RTF Conversion:** HTML serialization exists, but no RTF plugins

**Placeholder Strategy:** Custom inline nodes with `contenteditable: false`

**Recommendation:** ⚠️ **Use with Caution** - Beta status and higher complexity make it risky for production

**Sources:**
- [Slate Official Documentation](https://docs.slatejs.org/)
- [Slate TypeScript Guide](https://docs.slatejs.org/concepts/12-typescript)
- [Slate Bundle Size Discussion](https://github.com/ianstormtaylor/slate/issues/1555)

---

### 5. Lexical (Draft.js Successor)

**Overview:** Meta's next-generation extensible text editor framework, replacement for Draft.js.

**Pros:**
- ✅ **MIT license** - Free for commercial use
- ✅ **Smallest bundle** - Only 22kb min+gzip ([docs](https://lexical.dev/))
- ✅ **Production-proven** - Powers Facebook, Instagram, WhatsApp, Messenger ([GitHub](https://github.com/facebook/lexical))
- ✅ **Native TypeScript** support
- ✅ **Excellent accessibility** - WCAG compliant
- ✅ Framework-agnostic core with official React bindings
- Immutable state model (time-travel ready)
- Plugin-based architecture
- Real-time collaboration support (Yjs)
- JSON/Markdown/HTML serialization built-in

**Cons:**
- Newer than Quill (less mature ecosystem)
- **❌ No RTF export** - Would require html-to-rtf
- Learning curve for custom node development
- Fewer third-party plugins than established editors

**RTF Conversion:** External library required (html-to-rtf)

**Placeholder Strategy:**
- Create custom immutable nodes for placeholder tokens
- Style with distinct visual treatment
- Serialize to `{{fieldName}}` in HTML output
- [LexKit](https://lexkit.dev/) provides higher-level abstractions

**Recommendation:** ✅ **Recommended (Option 2)** - Modern, performant, actively maintained by Meta, excellent for new projects

**Sources:**
- [Lexical Official Site](https://lexical.dev/)
- [Lexical GitHub Repository](https://github.com/facebook/lexical)
- [Lexical Introduction](https://lexical.dev/docs/intro)
- [LexKit - Lexical Framework](https://lexkit.dev/)

---

## HTML-to-RTF Conversion

Since **no editor provides native RTF export**, all solutions require HTML-to-RTF conversion.

### Primary Solution: html-to-rtf

**Package:** [html-to-rtf](https://www.npmjs.com/package/html-to-rtf)

**Key Features:**
- ✅ Works in both browser and Node.js (v2.0.0+)
- ✅ TypeScript support via [@types/html-to-rtf](https://www.npmjs.com/package/@types/html-to-rtf)
- ✅ **3,563 weekly downloads** - Actively used
- ✅ MIT licensed
- Converts HTML to RTF bytes
- Preserves formatting (bold, italic, underline, fonts, lists, tables)

**Installation:**
```bash
npm install html-to-rtf
npm install --save-dev @types/html-to-rtf
```

**TypeScript Usage:**
```typescript
import { convertHtmlToRtf } from 'html-to-rtf';

const html = '<p>Hello <b>{{companyName}}</b></p>';
const rtf = convertHtmlToRtf(html);
// Returns RTF string with placeholders preserved
```

### Alternative: html-to-rtf-browser

**Package:** [html-to-rtf-browser](https://www.npmjs.com/package/html-to-rtf-browser)

- Browser-optimized fork of html-to-rtf
- 928 weekly downloads
- Adds font-family and image support
- Based on community contributions from 20+ forks

**Recommendation:** Use **html-to-rtf** for full-stack compatibility (client preview + server generation)

**Sources:**
- [html-to-rtf npm](https://www.npmjs.com/package/html-to-rtf)
- [@types/html-to-rtf](https://www.npmjs.com/package/@types/html-to-rtf)
- [html-to-rtf-browser](https://www.npmjs.com/package/html-to-rtf-browser)

---

## Placeholder Token Strategies

All editors require custom implementation for placeholder tokens. General approach:

### 1. Non-Editable Tokens

Make placeholders non-editable to prevent users from accidentally modifying or splitting them.

**TinyMCE Approach:**
- Premium Merge Tags plugin with dropdown/autocomplete ([docs](https://www.tiny.cloud/docs/tinymce/latest/mergetags/))
- Third-party plugins: [tinymce-variable](https://github.com/ambassify/tinymce-variable)

**Quill Approach:**
- Custom Embed blots extending the Embed class
- Set `contenteditable='false'` and `spellcheck='false'`
- [Implementation guide](https://timthewebmaster.com/en/articles/quill-blots/)
- [CodePen example](https://codepen.io/venom8/pen/NMRxmR)

**Lexical Approach:**
- Custom immutable nodes
- Built-in node type system prevents editing
- Strong TypeScript typing for node definitions

### 2. Visual Distinction

Style placeholders distinctly so users recognize them as tokens, not regular text.

```css
.placeholder-token {
  background-color: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 3px;
  padding: 2px 6px;
  color: #1976d2;
  font-family: monospace;
  cursor: default;
  user-select: none;
}
```

### 3. Insertion UI

Provide a dropdown or menu to insert allowed placeholders at cursor position.

**Required Placeholders (from Story 9.18):**
- `{{companyName}}`
- `{{companyCity}}`
- `{{companyState}}`
- `{{stateOfIncorporation}}`
- `{{agencyGroupName}}`
- `{{subagencyName}}`
- `{{agencyOfficeName}}`
- `{{abbreviatedName}}`
- `{{authorizedPurpose}}`
- `{{effectiveDate}}`
- `{{usMaxPosition}}`
- `{{opportunityPocName}}`
- `{{contractsPocName}}`
- `{{relationshipPocName}}`
- `{{generatedDate}}`

### 4. Preservation Through Conversion

Ensure placeholders survive HTML → RTF conversion:

```typescript
// Example: Preserve placeholders during conversion
const editorHTML = quill.root.innerHTML;
// editorHTML contains: <span class="placeholder">{{companyName}}</span>

const rtf = convertHtmlToRtf(editorHTML);
// RTF contains: {\field{{\*\fldinst { DOCPROPERTY "companyName" }}}
// Or simpler: {{companyName}} as literal text

// Server-side merge replaces {{companyName}} with actual value
```

**Sources:**
- [TinyMCE Merge Tags](https://www.tiny.cloud/docs/tinymce/latest/mergetags/)
- [Quill Custom Blots](https://quilljs.com/docs/customization)
- [Quill Blots Tutorial](https://timthewebmaster.com/en/articles/quill-blots/)
- [Quill Placeholders Example](https://codepen.io/venom8/pen/NMRxmR)

---

## Implementation Approach

### Recommended: Quill + html-to-rtf

**Architecture:**

```
┌─────────────────────────────────────────────┐
│  React Frontend (RTFTemplateEditor.tsx)     │
│  ┌───────────────────────────────────────┐  │
│  │ Quill Editor (react-quill or direct)  │  │
│  │  - Toolbar (bold, italic, font, etc.) │  │
│  │  - Custom Embed blots (placeholders)  │  │
│  │  - Event handlers (onChange)          │  │
│  └───────────────────────────────────────┘  │
│              ↓                               │
│  ┌───────────────────────────────────────┐  │
│  │ Client-Side Preview (optional)        │  │
│  │  - html-to-rtf (browser mode)         │  │
│  │  - Display in <iframe> or new window  │  │
│  └───────────────────────────────────────┘  │
│              ↓ POST /api/rtf-templates       │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  Express Backend (rtfTemplates.ts)          │
│  ┌───────────────────────────────────────┐  │
│  │ Validation                            │  │
│  │  - RTF structure check                │  │
│  │  - Placeholder whitelist validation   │  │
│  └───────────────────────────────────────┘  │
│              ↓                               │
│  ┌───────────────────────────────────────┐  │
│  │ Template Service                      │  │
│  │  - html-to-rtf (server-side)          │  │
│  │  - Store in PostgreSQL (RtfTemplate)  │  │
│  └───────────────────────────────────────┘  │
│              ↓ NDA Generation                │
│  ┌───────────────────────────────────────┐  │
│  │ Document Generation Service           │  │
│  │  - Load RTF template                  │  │
│  │  - Replace {{placeholders}} with data │  │
│  │  - Upload to S3                       │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Implementation Steps:**

1. **Install Dependencies**
   ```bash
   npm install quill html-to-rtf
   npm install --save-dev @types/html-to-rtf
   ```

2. **Create Custom Placeholder Blot**
   ```typescript
   // src/client/utils/placeholderBlot.ts
   import Quill from 'quill';
   const Embed = Quill.import('blots/embed');

   class PlaceholderBlot extends Embed {
     static blotName = 'placeholder';
     static tagName = 'span';
     static className = 'ql-placeholder';

     static create(value: string) {
       const node = super.create();
       node.setAttribute('contenteditable', 'false');
       node.setAttribute('spellcheck', 'false');
       node.setAttribute('data-placeholder', value);
       node.innerText = `{{${value}}}`;
       return node;
     }

     static value(node: HTMLElement) {
       return node.getAttribute('data-placeholder');
     }
   }

   Quill.register(PlaceholderBlot);
   ```

3. **Create RTFTemplateEditor Component**
   ```typescript
   // src/components/RTFTemplateEditor.tsx
   import React, { useState } from 'react';
   import ReactQuill from 'react-quill';
   import 'quill/dist/quill.snow.css';
   import './placeholderBlot'; // Register custom blot

   const ALLOWED_PLACEHOLDERS = [
     'companyName', 'companyCity', 'effectiveDate', // ...etc
   ];

   export const RTFTemplateEditor: React.FC = () => {
     const [content, setContent] = useState('');

     const modules = {
       toolbar: {
         container: [
           ['bold', 'italic', 'underline'],
           [{ 'font': [] }, { 'size': [] }],
           [{ 'list': 'ordered'}, { 'list': 'bullet' }],
           ['placeholder-insert'],
         ],
         handlers: {
           'placeholder-insert': insertPlaceholder
         }
       }
     };

     const insertPlaceholder = () => {
       const quill = reactQuillRef.current?.getEditor();
       const placeholder = prompt('Select placeholder:', ALLOWED_PLACEHOLDERS[0]);
       if (placeholder && ALLOWED_PLACEHOLDERS.includes(placeholder)) {
         const range = quill?.getSelection();
         quill?.insertEmbed(range?.index || 0, 'placeholder', placeholder);
       }
     };

     return <ReactQuill value={content} onChange={setContent} modules={modules} />;
   };
   ```

4. **Server-Side Validation & Conversion**
   ```typescript
   // src/server/services/templateService.ts
   import { convertHtmlToRtf } from 'html-to-rtf';

   const ALLOWED_PLACEHOLDERS = [
     'companyName', 'companyCity', // ... from templateService merge fields
   ];

   export async function saveRtfTemplate(html: string, name: string) {
     // Validate placeholders
     const placeholderRegex = /\{\{(\w+)\}\}/g;
     const matches = [...html.matchAll(placeholderRegex)];
     const unknownPlaceholders = matches
       .map(m => m[1])
       .filter(p => !ALLOWED_PLACEHOLDERS.includes(p));

     if (unknownPlaceholders.length > 0) {
       throw new Error(`Unknown placeholders: ${unknownPlaceholders.join(', ')}`);
     }

     // Convert to RTF
     const rtf = convertHtmlToRtf(html);

     // Validate RTF structure (basic check)
     if (!rtf.startsWith('{\\rtf')) {
       throw new Error('Invalid RTF format');
     }

     // Save to database
     return await prisma.rtfTemplate.create({
       data: { name, content: rtf, htmlSource: html }
     });
   }
   ```

**Alternative: Lexical + html-to-rtf**

Similar implementation pattern:
- Create custom immutable nodes for placeholders
- Use @lexical/react hooks
- Serialize to HTML using built-in serializers
- Convert HTML to RTF server-side

---

## Risk Assessment

### Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| RTF conversion quality | Medium | Test with complex formatting, validate output with Word/LibreOffice |
| Placeholder token corruption | High | Implement strict validation, use non-editable blots/nodes |
| Editor bundle size impact | Low | Quill/Lexical have acceptable sizes; lazy-load editor component |
| Browser compatibility | Low | All editors support modern browsers; test IE11 if required |
| Accessibility compliance | Low | Quill and Lexical have good a11y support; test with screen readers |

### Licensing Risks

| Editor | License | Commercial Risk |
|--------|---------|-----------------|
| TinyMCE | GPLv2+ (v7) | **HIGH** - Requires $79/month license |
| Quill | BSD | **NONE** - Permissive license |
| Draft.js | MIT | **MEDIUM** - Archived, no updates |
| Slate | MIT | **LOW** - Beta status |
| Lexical | MIT | **NONE** - Actively maintained by Meta |

### Maintenance Risks

| Editor | Risk Level | Notes |
|--------|------------|-------|
| TinyMCE | Low | Commercial support, active development |
| Quill | Low | Mature, stable, v2 released 2024 |
| Draft.js | **CRITICAL** | Archived, no feature updates |
| Slate | Medium | Beta status, API may change |
| Lexical | Low | Meta-backed, production-proven |

---

## Final Recommendation

### Primary Recommendation: **Quill + html-to-rtf**

**Rationale:**
1. ✅ **Production-Proven** - Used by Slack, LinkedIn, Figma, Zoom in production
2. ✅ **Free for Commercial Use** - BSD license, no recurring costs
3. ✅ **Mature & Stable** - TypeScript v2 rewrite (2024) addressed longstanding issues
4. ✅ **Good Balance** - Features, performance, bundle size, ecosystem
5. ✅ **Clear Implementation Path** - Custom Embed blots for placeholders well-documented
6. ✅ **Lower Risk** - Established patterns, active community

**Implementation Effort:** ~40 hours
- Editor integration: 8 hours
- Custom placeholder blots: 8 hours
- HTML-to-RTF conversion: 8 hours
- Validation logic: 4 hours
- Preview functionality: 8 hours
- Testing: 4 hours

### Secondary Recommendation: **Lexical + html-to-rtf**

**Rationale:**
1. ✅ **Modern & Performant** - 22kb bundle, excellent performance
2. ✅ **Meta-Backed** - Production use at Facebook, Instagram, WhatsApp
3. ✅ **Future-Proof** - Active development, replacing Draft.js
4. ✅ **Excellent TypeScript** - Native TypeScript support
5. ✅ **Superior Accessibility** - WCAG compliant out-of-the-box
6. ⚠️ **Newer Ecosystem** - Fewer third-party plugins than Quill

**Implementation Effort:** ~48 hours
- Learning curve: +8 hours over Quill
- Custom node development: 8 hours
- Rest similar to Quill

**When to Choose Lexical:**
- Prioritizing smallest possible bundle size
- Long-term maintainability is critical
- Accessibility is a top priority
- Team has capacity for learning curve

### Not Recommended

❌ **TinyMCE** - $79/month license cost not justified when free alternatives exist
❌ **Draft.js** - Archived by Meta, use Lexical instead
❌ **Slate** - Beta status too risky for production government application

---

## Implementation Checklist

- [ ] Select editor (Quill recommended, Lexical as alternative)
- [ ] Install dependencies (`quill`, `html-to-rtf`, TypeScript types)
- [ ] Create custom placeholder blot/node
- [ ] Build RTFTemplateEditor component with toolbar
- [ ] Implement placeholder insertion UI
- [ ] Add client-side preview (optional)
- [ ] Create server-side validation endpoint
- [ ] Implement HTML-to-RTF conversion service
- [ ] Add placeholder whitelist validation
- [ ] Create preview endpoint with sample data
- [ ] Update Prisma schema if needed (htmlSource column recommended)
- [ ] Write unit tests for placeholder blots
- [ ] Write integration tests for save/load flow
- [ ] Test RTF output in Microsoft Word
- [ ] Test RTF output in LibreOffice
- [ ] Validate accessibility with screen reader
- [ ] Performance test with large templates
- [ ] Security review (XSS prevention in HTML storage)

---

## Sources

### Editor Research
1. [TinyMCE React Integration](https://www.tiny.cloud/docs/tinymce/latest/react-cloud/)
2. [TinyMCE Pricing 2025](https://www.tiny.cloud/pricing/)
3. [TinyMCE GPLv2+ License Discussion](https://github.com/tinymce/tinymce/discussions/9496)
4. [Quill Official Documentation](https://quilljs.com/)
5. [Quill GitHub Repository](https://github.com/slab/quill)
6. [React Quill with TypeScript Guide](https://medium.com/@omotsuebe1/creating-a-modern-quill-editor-for-react-with-typescript-89aefef01ef6)
7. [Quill Bundle Size (Bundlephobia)](https://bundlephobia.com/package/quill)
8. [Rich Text Editor Comparison 2025](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025)
9. [Draft.js Archived Repository](https://github.com/facebookarchive/draft-js)
10. [Meta's Draft.js to Lexical Migration](https://github.com/facebook/lexical/issues/1641)
11. [Slate Official Documentation](https://docs.slatejs.org/)
12. [Slate TypeScript Guide](https://docs.slatejs.org/concepts/12-typescript)
13. [Lexical Official Documentation](https://lexical.dev/)
14. [Lexical GitHub Repository](https://github.com/facebook/lexical)
15. [LexKit - Lexical Framework](https://lexkit.dev/)

### HTML-to-RTF Conversion
16. [html-to-rtf npm package](https://www.npmjs.com/package/html-to-rtf)
17. [@types/html-to-rtf TypeScript Definitions](https://www.npmjs.com/package/@types/html-to-rtf)
18. [html-to-rtf-browser (browser-optimized fork)](https://www.npmjs.com/package/html-to-rtf-browser)

### Placeholder Token Strategies
19. [TinyMCE Merge Tags Plugin](https://www.tiny.cloud/docs/tinymce/latest/mergetags/)
20. [tinymce-variable Plugin](https://github.com/ambassify/tinymce-variable)
21. [Quill Custom Blots Tutorial](https://timthewebmaster.com/en/articles/quill-blots/)
22. [Quill Customization Documentation](https://quilljs.com/docs/customization)
23. [Quill Placeholders CodePen Example](https://codepen.io/venom8/pen/NMRxmR)

---

**Research Completed:** December 28, 2025
**Next Steps:** Review with development team, select editor, proceed to Step 5 (Implementation) of Story 9.18

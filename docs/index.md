# Project Documentation Index

**USmax NDA Management System**
Government NDA Lifecycle Application (Prototype)

**Generated:** 2025-12-12
**Scan Type:** Deep Scan
**Status:** Figma Make Prototype - UI Skeleton Only

---

## 🎯 Quick Start

**New to this project?** Start here:
1. Read the [Project Overview](#project-overview) for context
2. Understand this is a **prototype** (UI only, no backend)
3. Review [Component Inventory](#component-inventory) to see what's built
4. Check [Development Guide](#development-guide) to run locally

**Planning next steps?** Use this prototype as input for:
- BMad Method discovery workflows (brainstorming, research)
- Requirements gathering with stakeholders
- Architecture and design planning

---

## Project Overview

**Type:** Monolith - Single-part React Web Application
**Primary Language:** TypeScript
**Architecture:** Component-based SPA (Single Page Application)
**Framework:** React 18 + Vite 6
**UI Library:** Radix UI + Tailwind CSS

### Quick Reference

- **Tech Stack:** React 18.3.1, TypeScript, Vite 6.3.5, Radix UI, Tailwind CSS
- **Entry Point:** `src/main.tsx` → `src/App.tsx`
- **Architecture Pattern:** Component-based SPA with client-side routing
- **Components:** 69 total (50 UI primitives, 18 feature screens)
- **Data Models:** 7 domain models (NDA, Task, Activity, Template, Clause, Workflow, WorkflowStep)
- **State Management:** Component-local state only (React hooks)
- **Backend:** None - UI prototype using mock data

### Future Tech Preferences

- **React Version:** 19.x (upgrade planned)
- **Bundler:** Vite (or Next.js if SSR/advanced routing needed)

---

## Generated Documentation

### Core Documentation

- **[Project Overview](./project-overview.md)**
  Executive summary, tech stack, project classification, and next steps

- **[Legacy Screenshot Requirements](./legacy-screens-requirements.md)**
  Reverse-engineered requirements from the customer’s legacy USmax NDA Management System screenshots

- **[Legacy vs Prototype Gap + Backlog](./legacy-prototype-gap-backlog.md)**
  Coverage matrix, prototype-only features, prioritized epics/user stories, and proposed API surface

- **[Technical Clarifications](./technical-clarifications.md)**
  Implementation details: POC structure, RBAC options, database choice, API surface, status enums, and acceptance criteria

- **[Component Inventory](./component-inventory-main.md)**
  Complete catalog of all 69 React components with sizing, categorization, and analysis

- **[Data Models](./data-models-main.md)**
  TypeScript domain model documentation including NDA, workflows, tasks, and relationships

- **[Source Tree Analysis](./source-tree-analysis.md)**
  Annotated directory structure with explanations of each folder and file

- **[Development Guide](./development-guide-main.md)**
  Setup instructions, development workflow, commands, and troubleshooting

### Technical Documentation (Figma Make Generated)

- **[Backend Architecture](../src/docs/backend-architecture.md)** (75KB)
  Backend architecture documentation (Figma Make generated - for reference)

- **[Frontend-Backend Integration](../src/docs/frontend-backend-integration.md)** (50KB)
  Integration patterns (Figma Make generated - for reference)

- **[Mobile & Responsive Guide](../src/docs/mobile-responsive-guide.md)** (16KB)
  Responsive design guidelines (Figma Make generated)

---

## Component Architecture

### Component Categories

| Category | Count | Location | Description |
|----------|-------|----------|-------------|
| **UI Primitives** | 50 | `/src/components/ui/` | Radix UI wrappers with Tailwind styling |
| **Main Screens** | 13 | `/src/components/screens/` | Feature screens (Dashboard, NDAs, Workflows, etc.) |
| **Admin Screens** | 5 | `/src/components/screens/admin/` | Administrative interfaces |
| **Layout** | 2 | `/src/components/layout/` | App shell (Sidebar + TopBar) |
| **Utilities** | 1 | `/src/components/figma/` | Shared utilities |

### Key Feature Screens

- **Dashboard** (9.1KB) - Main dashboard view
- **NDADetail** (30KB) - Comprehensive NDA management interface
- **WorkflowEditor** (39KB) - Visual workflow builder (largest component)
- **RequestWizard** (22KB) - Multi-step NDA request creation
- **Templates** (29KB) - NDA template management
- **UserManagement** (32KB) - User administration (admin)
- **AuditLogs** (23KB) - System audit log viewer (admin)

[→ See complete component catalog](./component-inventory-main.md)

---

## Data Architecture

### Domain Models

1. **NDA** - Core entity for Non-Disclosure Agreements
   - Fields: id, title, counterparty, type, status, risk level, dates, purpose, information types, ownership
   - Relationships: Has many Tasks, Activities

2. **Task** - Action items for workflow progression
   - Links to: NDA (via ndaId)

3. **Activity** - Audit trail and event log
   - Links to: NDA (optional, some are system-wide)

4. **Template** - Reusable NDA templates
   - Contains: Clauses

5. **Clause** - Standard contract language library

6. **Workflow** - Custom approval workflows
   - Contains: WorkflowStepConfig, WorkflowRules

7. **WorkflowStep** - Runtime workflow execution tracking

### Enumerations

- **NDAStatus:** Draft, In legal review, Pending approval, Waiting for signature, Executed, Expired, Terminated, Rejected
- **NDAType:** Mutual, One-way government disclosing, One-way counterparty disclosing, Visitor, Research, Vendor access
- **RiskLevel:** Low, Medium, High
- **InformationType:** PII, Financial data, Technical data, Source code, Facility access, Other

[→ See complete data model documentation](./data-models-main.md)

---

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm (bundled with Node.js)

### Installation & Running

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build
```

### Project Structure

```
src/
├── components/       # React components (69 total)
│   ├── ui/          # UI primitives (50)
│   ├── screens/     # Feature screens (18)
│   ├── layout/      # App shell (2)
│   └── figma/       # Utilities (1)
├── types/           # TypeScript domain models
├── data/            # Mock data
├── docs/            # Figma Make technical docs
└── styles/          # Global styles

Key Files:
├── App.tsx          # Main app component & routing
├── main.tsx         # Application entry point
└── index.css        # Global styles (Tailwind)
```

[→ See detailed source tree](./source-tree-analysis.md)

---

## Prototype Status

### ✅ What's Included

- Complete UI/UX demonstration
- 69 functional React components
- TypeScript type safety
- Mock data for all features
- Responsive layout
- Dark mode support
- Design system (Radix UI + Tailwind)

### ❌ What's NOT Included

- Backend API
- Database persistence
- Authentication/authorization
- Real business logic
- Data validation
- Error handling beyond basic UI
- Testing infrastructure
- Deployment configuration
- CI/CD pipelines

**Important:** This is a Figma Make prototype for design validation and requirements gathering only. Not suitable for production use.

---

## Next Steps

### For Discovery Phase

Use this prototype as input for BMad Method workflows:

1. **Brainstorming:** `/bmad:core:workflows:brainstorming-session`
   Explore additional features, identify gaps, creative ideation

2. **Research:** `/bmad:bmm:workflows:research`
   Domain analysis, competitive research, technical investigation

3. **Requirements:** Work with stakeholders to determine:
   - Must-have vs. nice-to-have features
   - Missing functionality
   - Correct vs. incorrect assumptions

### For Planning Phase

After discovery, proceed with:

1. **PRD:** `/bmad:bmm:workflows:create-prd`
   Document actual requirements

2. **Architecture:** `/bmad:bmm:workflows:create-architecture`
   Design real implementation architecture

3. **UX Design:** `/bmad:bmm:workflows:create-ux-design`
   Refine UX based on feedback

### For Implementation Phase

When ready to build:

1. Backend development (API + database)
2. Authentication & authorization
3. State management (Redux Toolkit / TanStack Query)
4. Form validation & error handling
5. Testing (Vitest + Playwright)
6. DevOps & deployment

---

## Documentation Maintenance

**Last Updated:** 2025-12-12
**Scan Level:** Deep (critical files read)
**Scan Mode:** Initial scan

### Files Generated by This Documentation Scan

- `index.md` (this file)
- `project-overview.md`
- `component-inventory-main.md`
- `data-models-main.md`
- `source-tree-analysis.md`
- `development-guide-main.md`
- `project-scan-report.json` (state file)

### How to Update

To regenerate this documentation after code changes:

```
Run: /bmad:bmm:workflows:document-project
```

This will re-scan the codebase and update all documentation files.

---

## BMad Method Workflow

**Current Workflow:** `bmm-workflow-status.yaml`

**Track:** BMad Method (Brownfield)

**Next Workflow:** Brainstorming Session (Discovery Phase)

[→ Check workflow status](./bmm-workflow-status.yaml)

---

## Resources

### Documentation
- Project README: `../README.md`
- Guidelines: `../src/guidelines/Guidelines.md`
- Attributions: `../src/Attributions.md`

### Configuration
- Package config: `../package.json`
- Vite config: `../vite.config.ts`
- TypeScript: Implied from `.ts`/`.tsx` extensions

### BMad Workflows
- Location: `../.bmad/bmm/workflows/`
- Commands: `../.claude/commands/bmad/bmm/workflows/`

---

## Warnings & Disclaimers

⚠️ **PROTOTYPE ONLY - NOT FOR PRODUCTION**

This Figma Make prototype demonstrates UI/UX concepts only:

- **DO USE** for design validation, customer demos, requirements gathering
- **DO NOT USE** for production, real data processing, or security testing

**Key Limitations:**
- No data persistence (all data lost on refresh)
- No backend or API integration
- No authentication or authorization
- No real validation or error handling
- Mock data only

---

**Questions?** Refer to the [Development Guide](./development-guide-main.md) or run BMad Method discovery workflows to explore further.

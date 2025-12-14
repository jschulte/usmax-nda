# Source Tree Analysis - USMax NDA Management System

**Project:** Government NDA Lifecycle Application (Prototype)
**Generated:** 2025-12-12
**Project Type:** Monolith - Single-part React web application

---

## Annotated Directory Structure

```
/Users/jonahschulte/git/usmax-nda/
│
├── .bmad/                          # BMad Method workflows and configuration
│   ├── core/                       # Core BMad workflows (brainstorming, party-mode, etc.)
│   └── bmm/                        # BMad Method Module (PRD, architecture, testing workflows)
│
├── .claude/                        # Claude Code configuration
│   ├── commands/                   # Custom slash commands for BMad workflows
│   ├── hooks/                      # Git/workflow hooks
│   └── personalities/              # TTS personality configurations
│
├── .git/                           # Git version control
│
├── docs/                           # 📁 PROJECT DOCUMENTATION OUTPUT FOLDER
│   ├── bmm-workflow-status.yaml    # BMad Method workflow tracking
│   ├── project-scan-report.json    # Scan state and progress tracking
│   ├── component-inventory-main.md # UI component catalog (THIS SCAN)
│   ├── data-models-main.md         # Data model documentation (THIS SCAN)
│   ├── source-tree-analysis.md     # This file
│   └── sprint-artifacts/           # Implementation phase artifacts (empty)
│
├── node_modules/                   # NPM dependencies (not tracked in git)
│
├── src/                            # 🔥 APPLICATION SOURCE CODE
│   │
│   ├── components/                 # React components (69 total)
│   │   │
│   │   ├── figma/                  # Figma Make utility components
│   │   │   └── ImageWithFallback.tsx  # Image component with fallback
│   │   │
│   │   ├── layout/                 # App shell layout components
│   │   │   ├── Sidebar.tsx         # Application sidebar navigation
│   │   │   └── TopBar.tsx          # Application top bar/header
│   │   │
│   │   ├── screens/                # Main application screen components (13 screens)
│   │   │   ├── Administration.tsx  # Admin dashboard
│   │   │   ├── Dashboard.tsx       # Main dashboard
│   │   │   ├── ExternalSigningPortal.tsx  # External party signing interface
│   │   │   ├── MyNDAs.tsx          # User's NDA list
│   │   │   ├── NDADetail.tsx       # Detailed NDA view (30KB - complex)
│   │   │   ├── Profile.tsx         # User profile management
│   │   │   ├── Reports.tsx         # Reporting and analytics
│   │   │   ├── Requests.tsx        # NDA request management
│   │   │   ├── RequestWizard.tsx   # Multi-step NDA request wizard
│   │   │   ├── Settings.tsx        # User settings
│   │   │   ├── Templates.tsx       # NDA template management
│   │   │   ├── WorkflowEditor.tsx  # Visual workflow editor (39KB - largest component)
│   │   │   ├── Workflows.tsx       # Workflow list/management
│   │   │   │
│   │   │   └── admin/              # Administrative screen components (5 screens)
│   │   │       ├── AuditLogs.tsx   # System audit log viewer
│   │   │       ├── NotificationSettings.tsx  # Notification configuration
│   │   │       ├── SecuritySettings.tsx      # Security and access controls
│   │   │       ├── SystemConfiguration.tsx   # System-wide settings
│   │   │       └── UserManagement.tsx        # User administration (32KB)
│   │   │
│   │   └── ui/                     # UI primitive components (50 components)
│       │                           # Radix UI wrappers with Tailwind styling
│       ├── accordion.tsx           # Collapsible sections
│       ├── alert.tsx               # Alert messages
│       ├── alert-dialog.tsx        # Confirmation dialogs
│       ├── aspect-ratio.tsx        # Aspect ratio containers
│       ├── avatar.tsx              # User avatars
│       ├── badge.tsx               # Status badges
│       ├── breadcrumb.tsx          # Breadcrumb navigation
│       ├── button.tsx              # Button component
│       ├── calendar.tsx            # Date picker
│       ├── card.tsx                # Card containers
│       ├── chart.tsx               # Recharts wrapper
│       ├── checkbox.tsx            # Checkbox inputs
│       ├── collapsible.tsx         # Collapsible containers
│       ├── command.tsx             # Command palette (⌘K)
│       ├── context-menu.tsx        # Context menus
│       ├── dialog.tsx              # Modal dialogs
│       ├── drawer.tsx              # Bottom drawer (mobile)
│       ├── dropdown-menu.tsx       # Dropdown menus
│       ├── hover-card.tsx          # Hover overlays
│       ├── input.tsx               # Text inputs
│       ├── input-otp.tsx           # OTP/PIN inputs
│       ├── label.tsx               # Form labels
│       ├── menubar.tsx             # Menu bars
│       ├── navigation-menu.tsx     # Navigation menus
│       ├── pagination.tsx          # Pagination controls
│       ├── popover.tsx             # Popover overlays
│       ├── progress.tsx            # Progress bars
│       ├── radio-group.tsx         # Radio button groups
│       ├── resizable.tsx           # Resizable panels
│       ├── scroll-area.tsx         # Custom scrollbar areas
│       ├── select.tsx              # Dropdown selects
│       ├── separator.tsx           # Divider lines
│       ├── sheet.tsx               # Slide-out panels
│       ├── sidebar.tsx             # Sidebar component
│       ├── skeleton.tsx            # Loading skeletons
│       ├── slider.tsx              # Range sliders
│       ├── sonner.tsx              # Toast notifications
│       ├── switch.tsx              # Toggle switches
│       ├── table.tsx               # Data tables
│       ├── tabs.tsx                # Tab navigation
│       ├── textarea.tsx            # Multi-line text inputs
│       ├── toggle.tsx              # Toggle buttons
│       ├── toggle-group.tsx        # Toggle button groups
│       ├── tooltip.tsx             # Tooltips
│       ├── Stepper.tsx             # Multi-step wizard
│       ├── AppBadge.tsx            # Custom badge variant
│       ├── AppButton.tsx           # Custom button variant
│       ├── AppCard.tsx             # Custom card variant
│       ├── AppInput.tsx            # Custom input variant
│       ├── use-mobile.ts           # Mobile detection hook
│       └── utils.ts                # Styling utility functions
│
├── data/                           # Mock data for prototype
│   └── mockData.ts                 # Sample NDAs, tasks, activities, etc.
│
├── docs/                           # Figma Make generated documentation
│   ├── backend-architecture.md     # Backend architecture (75KB - Figma Make)
│   ├── frontend-backend-integration.md  # Integration patterns (50KB)
│   └── mobile-responsive-guide.md  # Responsive design guide (16KB)
│
├── guidelines/                     # Design system guidelines
│   └── Guidelines.md               # Template for design guidelines (mostly empty)
│
├── styles/                         # Global styles
│   └── [style files]               # CSS/SCSS files
│
├── types/                          # TypeScript type definitions
│   └── index.ts                    # Core domain types (NDA, Task, Activity, etc.)
│
├── App.tsx                         # 🎯 Main application component (4.1KB)
│   │                               # - Root component
│   │                               # - Routing setup
│   │                               # - Layout shell (Sidebar + TopBar + content)
│   │                               # - Mobile menu state
│   │
├── main.tsx                        # 🎯 Application entry point
│   │                               # - ReactDOM render
│   │                               # - Root element mounting
│   │
├── index.css                       # Global styles (61KB - Tailwind base + custom)
│
└── Attributions.md                 # Attribution information

├── package.json                    # NPM dependencies and scripts
├── package-lock.json / pnpm-lock.yaml  # Dependency lock file
├── vite.config.ts                  # Vite build configuration
├── tsconfig.json                   # TypeScript configuration (implied)
├── tailwind.config.js              # Tailwind CSS configuration (implied)
├── README.md                       # Project README
└── .gitignore                      # Git ignore rules
```

---

## Critical Directories

### Source Code (`/src/`)

| Directory | Purpose | File Count | Notes |
|-----------|---------|------------|-------|
| `/src/components/ui/` | UI Primitives | 50 | Radix UI wrappers, design system foundation |
| `/src/components/screens/` | Main Screens | 13 | Feature screens (Dashboard, NDAs, Requests, etc.) |
| `/src/components/screens/admin/` | Admin Screens | 5 | Administrative interfaces |
| `/src/components/layout/` | Layout Shell | 2 | Sidebar + TopBar |
| `/src/components/figma/` | Utilities | 1 | Figma Make utilities |
| `/src/types/` | Type Definitions | 1 | Domain model types |
| `/src/data/` | Mock Data | 1 | Prototype data |
| `/src/styles/` | Global Styles | Multiple | CSS/Tailwind styles |
| `/src/docs/` | Tech Docs | 3 | Figma Make generated docs |
| `/src/guidelines/` | Design Guidelines | 1 | Template (empty) |

---

## Entry Points

### Application Entry

```
main.tsx (172 bytes)
   ↓
   Renders: <App />
   ↓
App.tsx (4.1KB)
   ↓
   Layout: Sidebar + TopBar + Router
   ↓
   Routes to: Screen Components
```

**Main Application Component (`App.tsx`):**
- Sets up React Router routing
- Renders layout shell (Sidebar + TopBar)
- Manages mobile menu state
- Contains route definitions for all screens

**Entry Point (`main.tsx`):**
- Minimal - just React 18 rendering
- Mounts `<App />` to `#root` element

---

## Integration Points

**Since this is a monolith prototype:**
- ✗ No backend integration
- ✗ No API layer
- ✗ No external services
- ✗ No multi-part communication

**Data Flow:**
```
Mock Data (mockData.ts)
   ↓
   Imported by Screen Components
   ↓
   Rendered in UI Components
```

**Routing:**
```
User Navigation
   ↓
   React Router (in App.tsx)
   ↓
   Screen Component
   ↓
   UI Primitives (from /components/ui/)
```

---

## Development Workflow

### Running the Application

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build
```

**Development Server:**
- Tool: Vite
- Port: 3000
- Auto-open: Yes (configured in vite.config.ts)
- HMR: Enabled (Fast Refresh via React SWC)

---

## Key Files

| File | Size | Purpose |
|------|------|---------|
| `src/App.tsx` | 4.1KB | Main app component & routing |
| `src/main.tsx` | 172B | Application entry point |
| `src/index.css` | 61KB | Global styles (Tailwind + custom) |
| `src/types/index.ts` | 2.5KB | Domain model types |
| `src/data/mockData.ts` | 8.8KB | Mock data for prototype |
| `package.json` | 2.3KB | Dependencies & scripts |
| `vite.config.ts` | 2.9KB | Build configuration |

---

## Largest Components (Complexity Indicators)

| Component | Size | Location |
|-----------|------|----------|
| WorkflowEditor.tsx | 39KB | `/src/components/screens/` |
| UserManagement.tsx | 32KB | `/src/components/screens/admin/` |
| NDADetail.tsx | 30KB | `/src/components/screens/` |
| Templates.tsx | 29KB | `/src/components/screens/` |
| SystemConfiguration.tsx | 28KB | `/src/components/screens/admin/` |
| NotificationSettings.tsx | 28KB | `/src/components/screens/admin/` |
| Settings.tsx | 26KB | `/src/components/screens/` |

**Implication:** These large components indicate complex UIs that will likely need:
- Decomposition into smaller sub-components
- State management refactoring
- Performance optimization
- Comprehensive testing

---

## Prototype Characteristics

**What's Present:**
- ✅ Complete UI component library (Radix UI + Tailwind)
- ✅ 13 main feature screens
- ✅ 5 admin screens
- ✅ Type-safe domain model (TypeScript)
- ✅ Mock data for demonstration
- ✅ Responsive layout structure

**What's Missing (For Production):**
- ❌ Backend API integration
- ❌ Database persistence
- ❌ Authentication/authorization
- ❌ Real business logic
- ❌ Error handling
- ❌ Loading states
- ❌ Form validation
- ❌ API contracts
- ❌ Testing infrastructure
- ❌ Deployment configuration
- ❌ CI/CD pipelines
- ❌ Monitoring/logging

---

## Next Steps for Implementation

When transitioning from prototype to production:

1. **Backend Development**
   - Design database schema (see data-models-main.md)
   - Implement REST/GraphQL API
   - Add authentication (OAuth2/OIDC)
   - Implement authorization (RBAC)

2. **State Management**
   - Evaluate Redux Toolkit / Zustand / TanStack Query
   - Implement global state for user session
   - Add data fetching/caching layer
   - Handle optimistic updates

3. **Form Handling**
   - Add validation schemas (Zod/Yup)
   - Implement error display
   - Add field-level validation
   - Handle submission states

4. **Testing**
   - Unit tests for components
   - Integration tests for workflows
   - E2E tests for critical paths
   - API contract testing

5. **Performance**
   - Code splitting by route
   - Lazy loading for large components
   - Optimize bundle size
   - Add loading skeletons

6. **DevOps**
   - Containerization (Docker)
   - CI/CD pipelines
   - Environment configuration
   - Deployment automation

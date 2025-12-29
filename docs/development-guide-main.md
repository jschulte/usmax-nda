# Development Guide - USmax NDA Management System

**Project:** Government NDA Lifecycle Application (Prototype)
**Generated:** 2025-12-12
**Status:** Figma Make prototype - UI skeleton only

---

## Quick Start

### Prerequisites

- **Node.js:** 18.x or later
- **Package Manager:** npm (bundled with Node.js)
- **Git:** For version control

### Installation

```bash
# Clone the repository (if not already cloned)
git clone <repository-url>
cd usmax-nda

# Install dependencies
npm install
```

### Running the Development Server

```bash
# Start Vite development server
npm run dev

# Server will start on http://localhost:3000
# Browser will open automatically
```

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server (port 3000) |
| `npm run build` | Build for production → `/build` directory |

**Note:** No test commands are configured in this prototype.

---

## Development Workflow

### Making Changes

1. Edit files in `/src` directory
2. Vite Hot Module Replacement (HMR) will auto-refresh browser
3. Check browser console for errors
4. Commit changes with descriptive messages

### Project Structure

```
src/
├── components/       # React components
│   ├── ui/          # UI primitives (Radix UI + Tailwind)
│   ├── screens/     # Feature screens
│   ├── layout/      # App shell
│   └── figma/       # Utilities
├── types/           # TypeScript type definitions
├── data/            # Mock data
├── docs/            # Technical documentation
├── styles/          # Global styles
├── App.tsx          # Main app component (routing)
└── main.tsx         # Entry point
```

### Adding New Components

1. Create component in appropriate directory:
   - UI primitives → `/src/components/ui/`
   - Screens → `/src/components/screens/`
   - Layout → `/src/components/layout/`

2. Follow naming conventions:
   - PascalCase for components: `MyComponent.tsx`
   - Use `.tsx` extension for components with JSX
   - Use `.ts` for utilities/hooks

3. Import and use in App.tsx or parent components

### Working with Mock Data

Mock data is located in `/src/data/mockData.ts`.

**To add new mock data:**
1. Define type in `/src/types/index.ts`
2. Create mock instances in `/src/data/mockData.ts`
3. Export and import where needed

---

## Technology Stack

### Core

- **React:** 18.3.1 - UI library
- **TypeScript:** Implied - Type safety
- **Vite:** 6.3.5 - Build tool & dev server

### UI & Styling

- **Radix UI:** Accessible UI primitives
- **Tailwind CSS:** Utility-first styling
- **Lucide React:** Icon library
- **next-themes:** Dark mode support

### Forms & Data

- **React Hook Form:** 7.55.0 - Form state management
- **React Day Picker:** 8.10.1 - Date picker
- **Recharts:** 2.15.2 - Charts/visualizations

### Routing

- **React Router DOM:** Client-side routing

### Notifications

- **Sonner:** Toast notifications

---

## Configuration Files

### `vite.config.ts`

Vite configuration including:
- React SWC plugin for Fast Refresh
- Path aliases (`@/` → `/src/`)
- Build output directory: `/build`
- Dev server port: 3000
- Auto-open browser on start

### `package.json`

Dependencies and scripts. Key dependencies:
- React 18
- Vite 6
- Radix UI components
- Tailwind CSS
- TypeScript types

---

## Building for Production

```bash
# Create production build
npm run build

# Output directory: /build
# - Optimized bundles
# - Minified code
# - Source maps
```

**Deployment:**

This prototype has no deployment configuration. For production:

1. Build static files: `npm run build`
2. Serve `/build` directory with any static file server
3. Configure server for SPA routing (redirect all routes to index.html)

---

## Debugging

### Browser DevTools

1. Open browser DevTools (F12)
2. Check Console for errors
3. Use React DevTools extension for component inspection
4. Use Network tab to see (lack of) API calls

### Common Issues

**Port 3000 already in use:**
```bash
# Kill process on port 3000
# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

**Module not found:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## IDE Setup

### Recommended

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

### Editor Configuration

- Tab size: 2 spaces
- Format on save: Recommended
- Auto-import: Enabled

---

## Git Workflow

### Branching Strategy

Not defined in prototype. For production, consider:
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

### Commit Messages

Follow conventional commit format:
```
feat: add new dashboard widget
fix: resolve mobile menu toggle issue
docs: update development guide
style: format code with prettier
```

---

## Known Limitations (Prototype)

This is a Figma Make UI prototype. Key limitations:

1. **No Backend** - No API integration, all data is mock
2. **No Authentication** - No login/logout functionality
3. **No Persistence** - Data resets on page refresh
4. **No Validation** - Forms accept any input
5. **No Error Handling** - No error boundaries or loading states
6. **No Testing** - No test infrastructure
7. **No Deployment** - Development mode only

---

## Future Implementation Needs

When moving to production:

### Backend Integration

- [ ] Design and implement REST/GraphQL API
- [ ] Set up database (PostgreSQL recommended)
- [ ] Implement authentication (OAuth2/OIDC)
- [ ] Add authorization (RBAC)
- [ ] Create API client layer

### State Management

- [ ] Evaluate Redux Toolkit / Zustand / TanStack Query
- [ ] Implement global state
- [ ] Add data fetching/caching
- [ ] Handle optimistic updates

### Testing

- [ ] Set up Vitest or Jest
- [ ] Add React Testing Library
- [ ] Implement Playwright/Cypress for E2E
- [ ] Write unit tests for components
- [ ] Add integration tests

### DevOps

- [ ] Containerize with Docker
- [ ] Set up CI/CD pipelines
- [ ] Configure environment variables
- [ ] Implement deployment automation
- [ ] Add monitoring/logging

### Code Quality

- [ ] Configure ESLint
- [ ] Set up Prettier
- [ ] Add pre-commit hooks (Husky)
- [ ] Implement code review process

---

## Getting Help

### Documentation

- Component inventory: `docs/component-inventory-main.md`
- Data models: `docs/data-models-main.md`
- Source tree: `docs/source-tree-analysis.md`
- Figma Make docs: `src/docs/`

### Common Questions

**Q: How do I add a new screen?**
A: Create component in `/src/components/screens/`, add route in `App.tsx`

**Q: How do I modify mock data?**
A: Edit `/src/data/mockData.ts`

**Q: How do I add a new UI component?**
A: Check if Radix UI has it, add wrapper in `/src/components/ui/`

**Q: Can I connect to a real API?**
A: Not in this prototype. Requires backend development.

---

## Prototype Context

**Remember:** This is a Figma Make prototype showcasing UI/UX only.

- ✅ Use for design validation
- ✅ Use for customer demos
- ✅ Use as baseline for requirements gathering
- ❌ Do not deploy to production
- ❌ Do not expect real functionality
- ❌ Do not use for security testing

**Next Steps:**
Use this prototype as input for BMad Method discovery workflows (brainstorming, research) to determine actual customer requirements before implementing real functionality.

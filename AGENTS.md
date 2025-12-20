# Repository Guidelines

This project uses the BMAD method and you can load the metadata file for BMAD from this URL:

https://raw.githubusercontent.com/bmad-code-org/bmad-bundles/main/bmm/agents/pm.xml

## Project Structure & Module Organization
- `src/` holds application code.
  - `src/client/` is the front-end services and auth context.
  - `src/components/` contains React UI components and screens.
  - `src/server/` contains Express routes, services, middleware, and jobs.
- `prisma/` contains `schema.prisma`, migrations, and seed scripts.
- `docs/` includes architecture notes and sprint artifacts.
- `dist/` is the build output, `build/` contains compiled artifacts.

## Build, Test, and Development Commands
- `npm run dev` starts client + server together (Vite + TSX watch).
- `npm run dev:client` runs the Vite front-end only.
- `npm run dev:server` runs the Express server only.
- `npm run build` builds the client and TypeScript server output.
- `npm run start` runs the compiled server from `dist/`.
- `npm run test` runs Vitest in watch mode.
- `npm run test:run` runs the full Vitest suite once.
- `npm run db:generate` regenerates Prisma client.
- `npm run db:migrate` runs Prisma migrations.
- `npm run db:seed` seeds the database (see `prisma/seed.ts`).

## Coding Style & Naming Conventions
- TypeScript + React with 2‑space indentation and existing import order.
- Use descriptive, domain-specific names (e.g., `ndaService`, `generateDocument`).
- Prefer explicit types for service interfaces and API responses.
- No formatter/linter is configured; match the surrounding file style.

## Testing Guidelines
- Tests use Vitest. Patterns are in `src/**/__tests__/*.test.ts`.
- Service tests live in `src/server/services/__tests__`.
- Route tests live in `src/server/routes/__tests__`.
- Run a focused test via `npx vitest run path/to/test`.

## Commit & Pull Request Guidelines
- Recent commits mix plain messages and conventional prefixes (e.g., `feat:`, `fix:`).
- Recommended: use short, imperative messages (`feat: add draft autosave`).
- PRs should include: purpose, key changes, and testing performed.
- Add screenshots for UI changes and link related issues/stories.

## Security & Configuration Tips
- Server uses environment variables (e.g., database/S3/Sentry). Keep secrets out of git.
- Prisma migrations should accompany schema changes.
- Verify agency-scoped access rules when touching NDA or agency endpoints.

# Project Context - USmax NDA Management System

## Tech Stack
- Frontend: React 18 + Vite + TypeScript
- Backend: Express + TypeScript
- Database: PostgreSQL + Prisma ORM
- Auth: AWS Cognito (MFA required)
- Storage: AWS S3
- Email: AWS SES
- IaC: Terraform

## Core Patterns
- Service layer handles business logic (no raw HTTP in services).
- Protected routes use middleware order:
  authenticateJWT -> attachUserContext -> requirePermission -> scopeToAgencies -> handler.
- Every NDA query must include agency scoping by authorized subagency IDs.
- Mutations require audit logging.

## Security Requirements
- MFA required for all users.
- Tokens stored in HttpOnly cookies (never localStorage).
- SameSite=Strict, Secure in production.
- Row-level security enforced by agency scoping.

## Testing
- Tests live in __tests__/ adjacent to source.
- Run: pnpm test:run

# Story 1.1: AWS Cognito MFA Integration

Status: ready-for-dev

## Story

As a **USmax staff member**,
I want **to log in with my email and MFA code**,
so that **I can securely access the NDA system**.

## Acceptance Criteria

### AC1: Successful MFA Authentication Flow
**Given** I have a valid USmax email account
**When** I enter my email and password on the login page
**Then** I receive an MFA challenge (SMS or authenticator app)
**And** After entering the correct MFA code, I receive a JWT access token
**And** I am redirected to the dashboard

### AC2: Invalid MFA Code Handling
**Given** I enter an incorrect MFA code
**When** I submit the code
**Then** I see an error message "Invalid MFA code, please try again"
**And** I can retry up to 3 times before lockout

### AC3: Session Timeout with Warning
**Given** I am logged in
**When** My session reaches the configured timeout (default 4 hours)
**Then** I see a warning 5 minutes before expiration
**And** I am logged out and redirected to login if I don't refresh

## Tasks / Subtasks

- [x] **Task 1: AWS Cognito User Pool Configuration** (AC: 1, 2)
  - [x] 1.1: Create Terraform configuration for Cognito User Pool
  - [x] 1.2: Configure MFA requirement (TOTP preferred, SMS fallback)
  - [x] 1.3: Configure password policy (CMMC Level 1 requirements)
  - [x] 1.4: Create App Client for SPA (no client secret)
  - [x] 1.5: Set token expiration (access: 4 hours, refresh: 30 days)
  - [x] 1.6: Deploy User Pool to AWS or document for later deployment

- [x] **Task 2: Backend Authentication Endpoints** (AC: 1, 2)
  - [x] 2.1: Install AWS Cognito SDK (@aws-sdk/client-cognito-identity-provider)
  - [x] 2.2: Create cognitoService for AWS interactions
  - [x] 2.3: Implement POST /api/auth/login (initiates auth, returns MFA challenge)
  - [x] 2.4: Implement POST /api/auth/mfa-challenge (verifies MFA, returns tokens)
  - [x] 2.5: Implement POST /api/auth/refresh (refreshes access token)
  - [x] 2.6: Implement POST /api/auth/logout (clears cookies)

- [x] **Task 3: JWT Token Handling** (AC: 1)
  - [x] 3.1: Install cookie-parser middleware
  - [x] 3.2: Configure HttpOnly cookies (NOT localStorage)
  - [x] 3.3: Set Secure flag for HTTPS
  - [x] 3.4: Set SameSite=Strict for CSRF protection
  - [x] 3.5: Store access_token and refresh_token in separate cookies

- [x] **Task 4: JWT Validation Middleware** (AC: 1)
  - [x] 4.1: Install aws-jwt-verify library
  - [x] 4.2: Create authenticateJWT middleware
  - [x] 4.3: Validate JWT signature against Cognito public keys (JWKS)
  - [x] 4.4: Extract user ID (sub) and email from token
  - [x] 4.5: Populate req.user with basic info (full context in Story 1.2)
  - [x] 4.6: Return 401 for missing, expired, or invalid tokens

- [x] **Task 5: Mock Authentication Mode** (AC: Development)
  - [x] 5.1: Create mock auth mode for development (USE_MOCK_AUTH=true)
  - [x] 5.2: Mock users: admin@usmax.com, test@usmax.com with test passwords
  - [x] 5.3: Mock MFA code: 123456 (always succeeds)
  - [x] 5.4: Generate mock JWT tokens for development
  - [x] 5.5: Allow switching between mock and real Cognito

- [ ] **Task 6: Frontend Login Components** (AC: 1, 2)
  - [x] 6.1: Create LoginPage component with email/password form
  - [x] 6.2: Create MFAChallengePage component for MFA code entry
  - [ ] 6.3: Implement form validation with React Hook Form + Zod
  - [x] 6.4: Show loading states during authentication
  - [x] 6.5: Display error messages for invalid credentials/MFA
  - [x] 6.6: Show retry counter (X of 3 attempts remaining)

- [x] **Task 7: Frontend Auth Context** (AC: 1, 3)
  - [x] 7.1: Create AuthContext for React app
  - [x] 7.2: Implement login(), verifyMFA(), logout() functions
  - [x] 7.3: Store user state in context (not tokens - those in cookies)
  - [x] 7.4: Create useAuth() hook
  - [x] 7.5: Create ProtectedRoute component (redirect to login if not authenticated)

- [x] **Task 8: Session Timeout Warning** (AC: 3)
  - [x] 8.1: Create SessionWarningModal component
  - [x] 8.2: Calculate time until expiration from token
  - [x] 8.3: Show modal 5 minutes before expiration
  - [x] 8.4: Implement "Extend Session" button (calls refresh endpoint)
  - [x] 8.5: Auto-logout on timeout with redirect

- [x] **Task 9: Audit Logging for Auth Events** (AC: 2)
  - [x] 9.1: Create auditService if not exists
  - [x] 9.2: Log login_success, login_failed events
  - [x] 9.3: Log mfa_success, mfa_failed events with attempt count
  - [x] 9.4: Log logout events
  - [x] 9.5: Capture IP address, user agent, timestamp

- [ ] **Task 10: Testing** (AC: All)
  - [x] 10.1: Unit tests for cognitoService (with mocked AWS SDK)
  - [x] 10.2: Unit tests for authenticateJWT middleware
  - [x] 10.3: Integration tests for auth endpoints (login, MFA, refresh, logout)
  - [ ] 10.4: Component tests for LoginPage and MFAChallengePage
  - [ ] 10.5: E2E test for complete login flow (Playwright)

### Added from Gap Analysis
- [ ] Add `.env.example` with Cognito auth environment variables and mock auth flags

## Gap Analysis

### Pre-Development Analysis
- **Date:** 2026-01-02T23:14:44-05:00
- **Development Type:** hybrid
- **Existing Files:** 9
- **New Files:** 1

**Findings:**
- Tasks ready: 0
- Tasks partially done: 2
- Tasks already complete: 8
- Tasks refined: 0
- Tasks added: 1

**Codebase Scan:**
- Terraform: `infrastructure/cognito.tf`, `infrastructure/modules/cognito/main.tf`
- Backend: `src/server/services/cognitoService.ts`, `src/server/routes/auth.ts`, `src/server/middleware/authenticateJWT.ts`
- Frontend: `src/client/pages/LoginPage.tsx`, `src/client/pages/MFAChallengePage.tsx`, `src/client/contexts/AuthContext.tsx`, `src/client/components/SessionWarningModal.tsx`
- Audit: `src/server/services/auditService.ts`

**Notes:**
- Login/MFA UI exists but does not yet use React Hook Form + Zod schemas.
- Component tests and Playwright E2E coverage are still missing.
- `.env.example` is missing for Cognito and mock auth settings.

**Status:** Ready for implementation

## Smart Batching Plan

**Pattern Groups Detected:** None (all remaining tasks are independent and higher risk)

### Individual Tasks (4 tasks)
- Implement React Hook Form + Zod validation for Login/MFA forms
- Add component tests for LoginPage and MFAChallengePage
- Add Playwright E2E test for login flow (or link to Story 1-5)
- Add `.env.example` with Cognito auth environment variables

**Time Estimate:**
- With batching: 2 hours
- Without batching: 2 hours
- Savings: 0 hours

## Dev Notes

### Technical Stack for Authentication

**Backend:**
- AWS Cognito SDK: `@aws-sdk/client-cognito-identity-provider`
- JWT Verification: `aws-jwt-verify` (official AWS library)
- Cookie handling: `cookie-parser` middleware
- CORS: `cors` middleware with `credentials: true`

**Frontend:**
- Form handling: React Hook Form + Zod validation
- Auth state: React Context API
- HTTP client: Axios with cookie support

### Authentication Flow

```
1. User enters email + password → POST /api/auth/login
2. Backend calls Cognito InitiateAuth
3. Cognito returns MFA challenge
4. Frontend shows MFA page with code input
5. User enters MFA code → POST /api/auth/mfa-challenge
6. Backend calls Cognito RespondToAuthChallenge
7. Cognito returns access + refresh tokens
8. Backend sets HttpOnly cookies
9. Frontend redirects to dashboard
```

### Security Requirements (CMMC Level 1)

**Mandatory:**
- MFA required for ALL users (no exceptions)
- HttpOnly cookies ONLY (never localStorage - prevents XSS)
- Secure flag on cookies (HTTPS only)
- SameSite=Strict (prevents CSRF)
- No client secrets in SPA
- Session timeout after 4 hours
- Failed attempt logging

### Cookie Configuration

```typescript
res.cookie('access_token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 4 * 60 * 60 * 1000 // 4 hours
});

res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
});
```

### Mock Authentication for Development

```typescript
// Enable with: USE_MOCK_AUTH=true in .env
if (process.env.USE_MOCK_AUTH === 'true') {
  // Mock users
  const MOCK_USERS = {
    'admin@usmax.com': { password: 'Admin123!@#$', role: 'Admin' },
    'test@usmax.com': { password: 'Test1234!@#$', role: 'NDA User' }
  };

  // Mock MFA code: 123456 (always succeeds)
  const MOCK_MFA_CODE = '123456';

  // Generate mock JWT with same structure as real Cognito tokens
}
```

### Environment Variables

```bash
# AWS Cognito
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1

# Session
SESSION_TIMEOUT_HOURS=4
SESSION_WARNING_MINUTES=5

# Development
USE_MOCK_AUTH=true  # Set to false for real AWS
```

### Terraform Infrastructure

```hcl
resource "aws_cognito_user_pool" "main" {
  name = "usmax-nda-users-${var.environment}"

  mfa_configuration = "ON"  # MFA required

  password_policy {
    minimum_length    = 12
    require_uppercase = true
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  auto_verified_attributes = ["email"]
}

resource "aws_cognito_user_pool_client" "spa" {
  name         = "usmax-nda-spa"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  # No client secret (public SPA)
  generate_secret = false

  token_validity_units {
    access_token  = "hours"
    refresh_token = "days"
  }

  access_token_validity  = 4   # 4 hours
  refresh_token_validity = 30  # 30 days
}
```

### Project Structure Notes

**New Files:**
- `infrastructure/modules/cognito/main.tf` - Cognito User Pool IaC
- `src/server/services/cognitoService.ts` - Cognito SDK wrapper
- `src/server/routes/auth.ts` - Authentication endpoints
- `src/server/middleware/authenticateJWT.ts` - JWT validation
- `src/client/pages/LoginPage.tsx` - Login form
- `src/client/pages/MFAChallengePage.tsx` - MFA code entry
- `src/client/contexts/AuthContext.tsx` - Auth state management
- `src/client/components/SessionWarningModal.tsx` - Timeout warning

**Follows patterns:**
- Express route → service layer → AWS SDK
- React Context for global auth state
- Middleware pipeline architecture
- Mock mode for development velocity

### References

- [Source: docs/epics.md#Epic 1: Foundation & Authentication - Story 1.1]
- [Source: docs/architecture.md#Authentication Flow (AWS Cognito + MFA)]
- [Source: docs/architecture.md#Security Architecture]
- [Source: docs/prd.md#FR32: MFA Enforcement]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- First story in epic (no previous story context)
- Unanchored from existing implementation
- All requirements extracted from epics.md
- Security requirements emphasized (CMMC Level 1)
- Mock mode for development velocity specified

### File List

Files to be created/modified during implementation:
- `infrastructure/modules/cognito/main.tf` - NEW
- `src/server/services/cognitoService.ts` - NEW
- `src/server/routes/auth.ts` - NEW
- `src/server/middleware/authenticateJWT.ts` - NEW
- `src/client/pages/LoginPage.tsx` - NEW
- `src/client/pages/MFAChallengePage.tsx` - NEW
- `src/client/contexts/AuthContext.tsx` - NEW
- `src/client/components/SessionWarningModal.tsx` - NEW
- `src/server/services/auditService.ts` - NEW (for auth logging)
- `.env.example` - ADD Cognito environment variables

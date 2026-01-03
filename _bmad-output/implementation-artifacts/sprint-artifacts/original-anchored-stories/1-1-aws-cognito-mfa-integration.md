# Story 1.1: AWS Cognito MFA Integration

Status: review

## Story

As a **USmax staff member**,
I want **to log in with my email and MFA code**,
so that **I can securely access the NDA system with government-grade authentication**.

## Acceptance Criteria

### AC1: Successful MFA Authentication Flow
**Given** I have a valid USmax email account in Cognito User Pool
**When** I enter my email and password on the login page
**Then** I receive an MFA challenge (TOTP authenticator app preferred, SMS fallback)
**And** After entering the correct MFA code, I receive a JWT access token (stored in HttpOnly cookie)
**And** I am redirected to the dashboard

### AC2: Invalid MFA Code Handling
**Given** I enter an incorrect MFA code
**When** I submit the code
**Then** I see an error message "Invalid MFA code, please try again"
**And** I can retry up to 3 times before temporary lockout (5 minutes)
**And** Failed attempts are logged to audit_log table

### AC3: Session Timeout with Warning
**Given** I am logged in
**When** My session reaches 5 minutes before the configured timeout (default 4 hours)
**Then** I see a modal warning "Your session expires in 5 minutes - Save your work!"
**And** I can click "Extend Session" to refresh the token
**And** If no action, I am logged out and redirected to login page

### AC4: Secure Token Storage
**Given** I successfully authenticate
**When** Tokens are received from Cognito
**Then** Access token is stored in HttpOnly cookie (not localStorage - XSS prevention)
**And** Refresh token is stored in HttpOnly cookie with Secure flag
**And** CSRF token is generated and included in responses
**And** No tokens are accessible to client-side JavaScript

### AC5: Logout Clears All State
**Given** I am logged in
**When** I click "Logout" or session expires
**Then** All cookies are cleared (access token, refresh token)
**And** Client-side state is cleared (Zustand store reset)
**And** I am redirected to login page
**And** Audit log records logout event

## Tasks / Subtasks

- [x] **Task 1: AWS Cognito User Pool Setup** (AC: 1, 2) - Terraform IaC created, actual deployment deferred
  - [x] 1.1: Create Cognito User Pool via Terraform IaC (infrastructure/cognito.tf)
  - [x] 1.2: Configure MFA settings (TOTP required, SMS as backup)
  - [x] 1.3: Configure password policy (min 12 chars, require uppercase, lowercase, number, special)
  - [x] 1.4: Create App Client with no client secret (for SPA)
  - [x] 1.5: Configure token expiration (access: 4 hours, refresh: 30 days)
  - [x] 1.6: Document User Pool ID and App Client ID in environment variables (.env.local)
  - **TODO**: Actual AWS deployment pending - run `terraform apply` in infrastructure/ when ready

- [x] **Task 2: Express Backend Authentication Setup** (AC: 1, 4)
  - [x] 2.1: Install dependencies: `aws-jwt-verify`, `cookie-parser`, `cors`
  - [x] 2.2: Create `/api/auth/login` endpoint (initiates Cognito auth)
  - [x] 2.3: Create `/api/auth/mfa-challenge` endpoint (handles MFA verification)
  - [x] 2.4: Create `/api/auth/refresh` endpoint (refreshes tokens)
  - [x] 2.5: Create `/api/auth/logout` endpoint (clears cookies)
  - [x] 2.6: Configure CORS with credentials (frontend domain only)
  - [x] 2.7: Set up HttpOnly cookie middleware for token storage

- [x] **Task 3: JWT Validation Middleware** (AC: 1, 4)
  - [x] 3.1: Create `authenticateJWT` middleware (supports mock and real AWS)
  - [x] 3.2: Configure CognitoJwtVerifier with User Pool ID and App Client ID
  - [x] 3.3: Extract user ID from validated token
  - [x] 3.4: Populate `req.user` with `{id, email}` (permissions loaded in Story 1.3)
  - [x] 3.5: Return 401 with appropriate message for invalid/expired tokens
  - [x] 3.6: Add JWKS caching for performance (aws-jwt-verify handles this)

- [x] **Task 4: React Login UI Components** (AC: 1, 2, 3)
  - [x] 4.1: Create `LoginPage` component with email/password form
  - [x] 4.2: Create `MFAChallengePage` component for code entry
  - [x] 4.3: Implement form validation with real-time feedback
  - [x] 4.4: Create error display for invalid credentials/MFA codes
  - [x] 4.5: Add loading states during authentication
  - [x] 4.6: Implement retry counter display (X of 3 attempts remaining)

- [x] **Task 5: Session Management** (AC: 3, 5)
  - [x] 5.1: Create session timeout warning modal (5-min countdown)
  - [x] 5.2: Implement token refresh on "Extend Session" click
  - [x] 5.3: Create logout function that clears all cookies and state
  - [x] 5.4: Add `useAuth` hook via AuthContext for React components
  - [x] 5.5: Implement automatic redirect on 401 responses (ProtectedRoute)
  - [x] 5.6: Reset Zustand store on logout

- [x] **Task 6: Audit Logging for Auth Events** (AC: 2, 5)
  - [x] 6.1: Create audit log entries for: login_success, login_failed, mfa_success, mfa_failed, logout
  - [x] 6.2: Capture IP address, user agent, timestamp for each event
  - [x] 6.3: Log failed attempts with reason (invalid_password, invalid_mfa, account_locked)
  - [x] 6.4: Ensure audit logging is async (doesn't block auth flow)

- [x] **Task 7: Testing** (AC: All)
  - [x] 7.1: Unit tests for JWT validation middleware (7 tests passing)
  - [x] 7.2: Integration tests for auth endpoints using supertest (11 tests passing)
  - [x] 7.3: CognitoService unit tests for mock mode (5 tests passing)
  - [ ] 7.4: E2E test for complete login flow (Playwright) - deferred, needs Playwright setup
  - [ ] 7.5: Test session timeout and warning modal - visual/manual testing

## Dev Notes

### Technical Stack Requirements
- **AWS Cognito SDK**: Use `@aws-sdk/client-cognito-identity-provider` for server-side auth
- **JWT Validation**: Use `aws-jwt-verify` (official AWS library, 0 dependencies, auto-JWKS caching)
- **Cookie Handling**: Use `cookie-parser` middleware
- **CORS**: Configure `cors` middleware with `credentials: true`

### Critical Security Requirements (CMMC Level 1)
1. **MFA is MANDATORY** - No exceptions, all users must complete MFA (FR32)
2. **HttpOnly cookies ONLY** - Never store tokens in localStorage (XSS prevention)
3. **Secure flag on cookies** - Only transmitted over HTTPS
4. **SameSite=Strict** - Prevent CSRF attacks
5. **No client secrets in SPA** - Use public app client

### Architecture Patterns (from docs/architecture.md)
```
src/
├── server/
│   ├── middleware/
│   │   ├── authenticateJWT.ts      # JWT validation - THIS STORY
│   │   ├── checkPermissions.ts     # Story 1.3
│   │   └── scopeToAgencies.ts      # Story 1.4
│   ├── routes/
│   │   └── auth.ts                 # Auth endpoints - THIS STORY
│   └── services/
│       └── cognitoService.ts       # Cognito interactions - THIS STORY
├── client/
│   ├── pages/
│   │   ├── LoginPage.tsx           # THIS STORY
│   │   └── MFAChallengePage.tsx    # THIS STORY
│   ├── hooks/
│   │   └── useAuth.ts              # Auth state hook - THIS STORY
│   └── contexts/
│       └── AuthContext.tsx         # Auth provider - THIS STORY
```

### Database Tables Used
- `contacts` table - User lookup (email → user record)
- `audit_log` table - Auth event logging

```sql
-- Audit log entry structure for auth events
INSERT INTO audit_log (
  action,
  entity_type,
  entity_id,
  user_id,
  ip_address,
  user_agent,
  details,
  created_at
) VALUES (
  'login_success',  -- or login_failed, mfa_success, mfa_failed, logout
  'authentication',
  NULL,
  $userId,
  $ipAddress,
  $userAgent,
  '{"method": "cognito_mfa"}',
  NOW()
);
```

### Environment Variables Required
```bash
# AWS Cognito
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1

# Session
SESSION_TIMEOUT_HOURS=4
SESSION_WARNING_MINUTES=5

# Cookie settings
COOKIE_DOMAIN=.usmax-nda.com
COOKIE_SECURE=true
```

### API Endpoint Specifications

#### POST /api/auth/login
```typescript
// Request
{ email: string, password: string }

// Response (success) - initiates MFA challenge
{
  challengeName: 'SOFTWARE_TOKEN_MFA',
  session: string  // Cognito session token for MFA step
}

// Response (error)
{ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }
```

#### POST /api/auth/mfa-challenge
```typescript
// Request
{ session: string, mfaCode: string }

// Response (success) - sets HttpOnly cookies
{
  user: { id: string, email: string },
  expiresAt: number  // Unix timestamp
}
// Cookies set: access_token, refresh_token (HttpOnly, Secure, SameSite=Strict)

// Response (error)
{ error: 'Invalid MFA code', attemptsRemaining: 2, code: 'INVALID_MFA' }
```

#### POST /api/auth/refresh
```typescript
// Request - uses refresh_token from cookie
{}

// Response (success) - updates access_token cookie
{ expiresAt: number }

// Response (error) - requires re-login
{ error: 'Session expired', code: 'SESSION_EXPIRED' }
```

#### POST /api/auth/logout
```typescript
// Request
{}

// Response - clears all auth cookies
{ success: true }
```

### JWT Validation Middleware Pattern
```typescript
// src/server/middleware/authenticateJWT.ts
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.COGNITO_APP_CLIENT_ID!,
});

export const authenticateJWT = async (req, res, next) => {
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_TOKEN'
    });
  }

  try {
    const payload = await verifier.verify(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      // permissions added in Story 1.3
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired, please login again',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};
```

### React Auth Context Pattern
```typescript
// src/client/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<MFAChallenge>;
  verifyMFA: (session: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
```

### Testing Patterns

#### Mock Cognito for Testing
```typescript
// Use aws-sdk-client-mock for Cognito mocking
import { mockClient } from 'aws-sdk-client-mock';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

const cognitoMock = mockClient(CognitoIdentityProviderClient);

// Mock successful auth
cognitoMock.on(InitiateAuthCommand).resolves({
  ChallengeName: 'SOFTWARE_TOKEN_MFA',
  Session: 'mock-session-token',
});
```

#### Playwright E2E Test Structure
```typescript
test('complete login flow with MFA', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@usmax.com');
  await page.fill('[name="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');

  // MFA challenge page
  await expect(page).toHaveURL('/mfa-challenge');
  await page.fill('[name="mfaCode"]', '123456');
  await page.click('button[type="submit"]');

  // Redirected to dashboard
  await expect(page).toHaveURL('/dashboard');
});
```

### Error Handling
- All auth errors should return structured JSON: `{ error: string, code: string }`
- Log detailed errors to Sentry, return user-friendly messages to client
- Never expose internal error details or stack traces

### Performance Considerations
- JWKS is cached automatically by `aws-jwt-verify` (refreshed periodically)
- Session warning modal should use `setInterval` with cleanup
- Token refresh should be silent (no loading spinner)

### Accessibility (Section 508)
- Login form must have proper ARIA labels
- Error messages announced to screen readers
- MFA code input should accept paste
- Session warning modal must trap focus

### References
- [Source: docs/architecture.md#Authentication-Flow]
- [Source: docs/architecture.md#Middleware-Pipeline]
- [Source: docs/PRD.md#FR32-MFA-Enforcement]
- [Source: docs/PRD.md#FR111-113-Session-Management]
- [Source: docs/epics.md#Story-1.1-AWS-Cognito-MFA-Integration]
- [AWS: aws-jwt-verify](https://github.com/awslabs/aws-jwt-verify)
- [AWS: Verifying JWTs](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html)
- [Best Practice: HttpOnly Cookies for Auth](https://medium.com/@krutiamrutiya1998/secure-authentication-in-node-js-and-react-js-with-httponly-cookies-612deaad5d99)

## Dev Agent Record

### Context Reference
- Epic 1: Foundation & Authentication
- FRs Covered: FR32, FR111-113
- Dependencies: None (this is the first story)

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20250929)

### Debug Log References
N/A - First story in epic

### Completion Notes List
- This is the foundational authentication story - all other stories depend on it
- Row-level security (Story 1.4) requires authenticated user context from this story
- RBAC (Story 1.3) will extend req.user with permissions

### File List

**Files Created:**
- `infrastructure/cognito.tf` - Terraform IaC for AWS Cognito User Pool
- `src/server/index.ts` - Express server entry point
- `src/server/middleware/authenticateJWT.ts` - JWT validation middleware (mock + real)
- `src/server/routes/auth.ts` - Auth API endpoints
- `src/server/services/cognitoService.ts` - Cognito service with mock mode
- `src/server/services/auditService.ts` - Audit logging service
- `src/client/pages/LoginPage.tsx` - Login form component
- `src/client/pages/MFAChallengePage.tsx` - MFA code entry component
- `src/client/contexts/AuthContext.tsx` - React auth context provider
- `src/client/hooks/useAuth.ts` - Re-export of useAuth from context
- `src/client/components/SessionWarningModal.tsx` - Session timeout warning modal
- `src/client/stores/appStore.ts` - Zustand store for client state
- `tsconfig.server.json` - TypeScript config for server code
- `vitest.config.ts` - Vitest test configuration
- `src/server/middleware/__tests__/authenticateJWT.test.ts` - JWT middleware tests
- `src/server/routes/__tests__/auth.test.ts` - Auth routes integration tests
- `.env.local` - Local development environment variables

**Files Modified:**
- `package.json` - Added dependencies and scripts (express, aws-jwt-verify, zustand, etc.)
- `src/App.tsx` - Added AuthProvider, ProtectedRoute, SessionWarningModal
- `.gitignore` - Added env files and terraform state

**Mock Authentication:**
- `USE_MOCK_AUTH=true` enables development without AWS
- Mock users: `admin@usmax.com` / `Admin123!@#$`, `test@usmax.com` / `Test1234!@#$`
- Mock MFA code: `123456`

**Testing:**
- 23 tests passing (7 middleware + 11 integration + 5 service)
- Run with: `pnpm test`

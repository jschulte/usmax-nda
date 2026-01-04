# Story 8.1: Error Monitoring with Sentry

Status: ready-for-dev

## Story

As a **System Administrator**,
I want **all application errors captured and reported with full context**,
So that **I can identify and fix issues proactively before users are significantly impacted**.

## Acceptance Criteria

**AC1: Sentry Integration and Configuration**
**Given** Sentry is integrated into the application
**When** the server starts with a valid SENTRY_DSN environment variable
**Then** Sentry initializes with environment-specific configuration
**And** performance tracing is enabled (10% sample rate in production, 100% in dev)
**And** release versioning is configured from APP_VERSION environment variable
**And** sensitive data (cookies, authorization headers, passwords) is filtered from reports

**AC2: Error Capture with Message and Stack Trace**
**Given** an error occurs anywhere in the application
**When** the error is caught by Express error handler or explicitly reported
**Then** Sentry captures the complete error message
**And** Sentry captures the full stack trace
**And** the error is associated with the correct environment (development/production)

**AC3: User and Request Context Enrichment**
**Given** an error occurs during an authenticated request
**When** the error is reported to Sentry
**Then** user context is attached: user ID, email, contact ID
**And** request context is attached: request ID, path, method, user agent, IP address
**And** environment context is included: NODE_ENV, release version
**And** custom context is added: request body (non-GET), query params, route params
**And** sensitive data is excluded from all context

**AC4: Critical Error Alerting**
**Given** a critical error occurs (database failures, auth failures, security issues, 500+ status codes)
**When** the error is reported to Sentry
**Then** the error is marked with "fatal" severity level
**And** Sentry dashboard triggers immediate alerts (configured in Sentry project settings)
**And** non-critical errors use "error" or "warning" levels

**AC5: Error Reporting Status and Health**
**Given** an admin checks system health
**When** the error reporting status endpoint is queried
**Then** it returns: enabled status, environment, DSN status (masked)
**And** the system can detect if Sentry is properly configured

## Tasks / Subtasks

⚠️ **DRAFT TASKS** - Generated from requirements analysis. Will be validated and refined against actual codebase when dev-story runs.

- [ ] Review existing Sentry implementation in errorReportingService.ts (AC: 1-5)
  - [ ] Verify initializeErrorReporting() function initializes Sentry correctly
  - [ ] Confirm reportError() captures all required context (user, request, environment)
  - [ ] Validate sensitive data filtering (cookies, auth headers)
  - [ ] Check critical error detection logic in errorHandler.ts
  - [ ] Ensure Sentry DSN environment variable handling is correct
- [ ] Verify integration with Express error handler middleware (AC: 2-4)
  - [ ] Confirm errorHandler.ts calls reportError() with full context
  - [ ] Validate error severity level determination (fatal vs error)
  - [ ] Check user-friendly error messages are returned to client
  - [ ] Ensure 404 errors are handled separately (not reported to Sentry)
- [ ] Test error reporting with different scenarios (AC: 1-5)
  - [ ] Test with SENTRY_DSN configured (production-like)
  - [ ] Test with SENTRY_DSN missing (development/testing mode)
  - [ ] Test critical error reporting (database, auth, security errors)
  - [ ] Test non-critical error reporting (validation, business logic errors)
  - [ ] Test user context attachment (authenticated requests)
  - [ ] Test request context attachment (path, method, IP, user agent)
- [ ] Verify Sentry dashboard configuration (AC: 4)
  - [ ] Confirm alert rules are configured for fatal errors
  - [ ] Verify notification channels (email, Slack, PagerDuty)
  - [ ] Check Sentry project settings for environment separation
  - [ ] Validate performance monitoring configuration
- [ ] Add or update tests for error reporting service (AC: 1-5)
  - [ ] Unit tests for initializeErrorReporting() function
  - [ ] Unit tests for reportError() with various error types
  - [ ] Unit tests for context enrichment (user, request, environment)
  - [ ] Unit tests for sensitive data filtering
  - [ ] Integration tests for errorHandler middleware
  - [ ] Mock Sentry in tests to avoid external dependencies
- [ ] Document error reporting patterns and usage (AC: 1-5)
  - [ ] Update README or docs with Sentry configuration instructions
  - [ ] Document environment variables (SENTRY_DSN, APP_VERSION)
  - [ ] Provide examples of reportError() usage for custom error reporting
  - [ ] Document critical error categories and severity levels

## Gap Analysis

_This section will be populated by dev-story when gap analysis runs._

**Note:** Based on sprint-status.yaml comment, errorReportingService.ts already implements Sentry. Gap analysis will verify completeness against acceptance criteria and identify any missing pieces or hardening opportunities.

---

## Dev Notes

### Current Implementation Status

**Existing Files (Per Sprint Status):**
- `src/server/services/errorReportingService.ts` - Sentry integration service (182 lines, fully implemented)
- `src/server/middleware/errorHandler.ts` - Global Express error handler (83 lines, fully implemented)
- Tests: `src/server/services/__tests__/errorReportingService.test.ts`

**Implementation Overview:**
- Sentry SDK (@sentry/node) already integrated
- Error reporting service provides: initializeErrorReporting(), reportError(), isErrorReportingEnabled(), getErrorReportingStatus()
- Express error handler middleware calls reportError() with full context
- Critical error detection based on message content and status codes
- Sensitive data filtering implemented in beforeSend hook

**Expected Workflow:**
1. Verify existing implementation meets all acceptance criteria
2. Run existing tests and add coverage where needed
3. Test with actual Sentry DSN (staging/production environment)
4. Harden any edge cases or error scenarios
5. Document any configuration requirements not yet captured

### Architecture Patterns

**Error Handling Pipeline (Architecture Requirement):**
```
Error → Sentry (report) → Express error handler → User-friendly message → Frontend display
```

**Middleware Order (Critical for Security):**
```typescript
app.use(authenticateJWT);    // ← Cognito JWT validation
app.use(attachUserContext);  // ← Load user from DB
app.use(checkPermissions);   // ← RBAC permission check
app.use(scopeToAgencies);    // ← Row-level security filter

// Routes go here

app.use(errorHandler);       // ← Global error catch + Sentry reporting
```

**Retry Logic for Transient Failures:**
- Email (SES): pg-boss queue, 3 attempts, exponential backoff
- S3 Uploads: AWS SDK built-in retry (3 attempts)
- API Calls (Frontend): Axios interceptor (2 attempts on 5xx/network errors)

**Graceful Degradation:**
- If Sentry DSN not configured: errors logged to console, system continues
- If Sentry API unavailable: error reported to console, response still sent to client
- If audit_log write fails: fallback to CloudWatch Logs (failsafe logging)

### Technical Requirements

**Sentry Integration (FR97-98):**
- **FR97:** System sends alerts to administrators when critical errors occur (<5 minute response time)
- **FR98:** System tracks all errors with stack traces, context, and user session data (Sentry integration)

**Sentry SDK Configuration:**
- Package: `@sentry/node` (latest stable)
- Environment variable: `SENTRY_DSN` (required for production, optional for dev)
- Optional variable: `APP_VERSION` (for release tracking)
- Tracing sample rate: 0.1 (10%) in production, 1.0 (100%) in development

**Error Context Requirements:**
- User context: userId, email, contactId (if authenticated)
- Request context: requestId, path, method, userAgent, ipAddress
- Environment context: NODE_ENV, release version
- Custom context: request body, query params, route params (sanitized)

**Sensitive Data Filtering:**
- Remove: cookies, authorization headers, passwords, API keys
- Keep: user ID, email (safe identifiers), request path, error message

**Critical Error Criteria:**
- Database connection failures
- Authentication/authorization failures
- Security-related errors
- HTTP 500+ status codes
- Any error with "database", "auth", or "security" in message

### Architecture Constraints

**Error Handling Strategy (Architecture Decision):**
- **5-Layer Defense:** Frontend Zod → API validation → Business logic → DB constraints → Global handler
- **Centralized Reporting:** All errors flow through Express error handler, which calls Sentry
- **User-Friendly Messages:** Production errors return generic messages, development includes stack traces
- **Request IDs:** All requests get unique ID for tracing errors across logs and Sentry

**Monitoring Stack (Architecture Decision):**
- **Error Tracking:** Sentry (frontend + backend error reporting)
- **Logging:** Winston (structured JSON logs) + CloudWatch Logs
- **Metrics:** CloudWatch (infrastructure health) + Google Analytics (user behavior)

**Deployment Requirements:**
- **Environment:** SENTRY_DSN must be set in production .env file
- **Alerts:** Sentry project configured with alert rules for fatal errors
- **Notification Channels:** Email, Slack, or PagerDuty (configured in Sentry dashboard)
- **Health Monitoring:** Watch Sentry dashboard for 1 hour post-deployment

### File Structure Requirements

**Backend Services:**
- `src/server/services/errorReportingService.ts` - Sentry integration (EXISTING)
- `src/server/middleware/errorHandler.ts` - Express error handler (EXISTING)

**Tests:**
- `src/server/services/__tests__/errorReportingService.test.ts` (EXISTING)
- `src/server/middleware/__tests__/errorHandler.test.ts` (MAY NEED CREATION)

**Configuration:**
- `.env` file: SENTRY_DSN, APP_VERSION environment variables
- `package.json`: @sentry/node dependency

### Testing Requirements

**Unit Tests:**
- Test initializeErrorReporting() with and without SENTRY_DSN
- Test reportError() with various error types (Error, string, unknown)
- Test context enrichment (user, request, environment)
- Test sensitive data filtering
- Test severity level determination (fatal vs error vs warning)

**Integration Tests:**
- Test errorHandler middleware calls reportError()
- Test 404 errors are handled separately
- Test user context from req.userContext is attached
- Test request context from req object is captured

**Mocking Strategy:**
- Mock Sentry SDK to avoid external API calls in tests
- Use jest.mock('@sentry/node') to intercept Sentry calls
- Verify Sentry.captureException() called with correct parameters
- Verify Sentry.setUser() called with user context

**Test Coverage Goal:**
- ≥80% coverage for errorReportingService.ts
- ≥80% coverage for errorHandler.ts
- 100% coverage for critical paths (error capture, context enrichment)

### Previous Story Intelligence

**Note:** This is Story 8.1 (first story in Epic 8). No previous Epic 8 stories exist for context.

**Related Prior Work:**
- Epic 1-7 completed with comprehensive error handling patterns established
- auditService.ts includes failsafe logging to CloudWatch (Story 6.x reference)
- Express middleware pipeline order established in prior epics

### Project Structure Notes

**Existing Error Handling Patterns:**
- All routes use try/catch or delegate to Express error handler
- Services throw descriptive errors with context
- Controllers catch service errors and pass to next(error)
- Global error handler converts all errors to HTTP responses

**Integration Points:**
- Express app initialization: Sentry init must happen before routes registered
- Error handler: Must be registered AFTER all routes
- auditMiddleware: Works independently, has own failsafe to CloudWatch

**Code Conventions:**
- TypeScript strict mode enforced
- Async functions return Promise<T> with explicit type
- Error objects include statusCode property for HTTP codes
- All errors logged to console AND Sentry (redundant logging for safety)

### References

**Source Documents:**
- [Source: _bmad-output/planning-artifacts/epics-backup-20251223-155341.md#Epic-8-Story-8.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error-Handling-Pipeline]
- [Source: _bmad-output/planning-artifacts/architecture.md#Monitoring-Observability]
- [Source: _bmad-output/project-context.md#Error-Handling-Pattern]
- [Source: sprint-artifacts/sprint-status.yaml - Epic 8 comments]

**Functional Requirements:**
- FR97: System sends alerts to administrators when critical errors occur (<5 minute response time)
- FR98: System tracks all errors with stack traces, context, and user session data (Sentry integration)

**Non-Functional Requirements:**
- NFR-O1: All errors captured with stack traces (Sentry integration)
- NFR-O2: Critical errors alert within 5 minutes
- NFR-O5: Zero silent failures

**Architecture Decisions:**
- Sentry for error tracking (frontend + backend)
- CloudWatch for infrastructure logs
- Winston for structured JSON logs
- 5-layer error handling strategy

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

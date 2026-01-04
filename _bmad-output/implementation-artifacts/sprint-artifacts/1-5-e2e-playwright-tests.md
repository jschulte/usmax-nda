# Story 1-5: E2E Playwright Tests

Status: done

## Story

As a **development team**,
I want **comprehensive end-to-end tests using Playwright**,
so that **critical user flows are verified automatically and regressions are caught before deployment**.

## Background

Gap analysis identified that while unit and integration tests exist, E2E tests using Playwright were specified but not fully implemented. This story adds critical path coverage for authentication, NDA lifecycle, and admin workflows.

## Acceptance Criteria

### AC1: Playwright Setup
**Given** the test infrastructure
**When** tests are configured
**Then** Playwright is installed with proper configuration
**And** Tests can run in CI/CD pipeline
**And** Tests can run locally in headed or headless mode
**And** Screenshots are captured on failure

### AC2: Authentication Flow Tests
**Given** the login and MFA system
**When** E2E tests run
**Then** successful login with MFA is verified
**And** invalid credentials show proper error
**And** MFA retry limit (3 attempts) is verified
**And** Session timeout warning at 5 minutes is tested
**And** Session extension via modal works

### AC3: NDA Lifecycle Tests
**Given** a user with NDA permissions
**When** E2E tests run
**Then** NDA creation flow completes successfully
**And** NDA editing and saving works
**And** Document generation (RTF) produces downloadable file
**And** Email sending shows success message
**And** NDA status transitions are verified

### AC4: Admin Workflow Tests
**Given** an admin user
**When** E2E tests run
**Then** User creation and role assignment works
**And** Agency group creation works
**And** Access grant/revoke workflows work
**And** Audit log viewing and export works

### AC5: Agency Scoping Tests
**Given** users with different agency access
**When** E2E tests run
**Then** User A cannot see User B's agency NDAs
**And** Agency filtering shows correct results
**And** Unauthorized NDA access returns 404 (not 403)

## Tasks / Subtasks

- [x] **Task 1: Playwright Configuration**
  - [x] 1.1: Install @playwright/test and dependencies
  - [x] 1.2: Create playwright.config.ts with proper settings
  - [x] 1.3: Configure baseURL for dev/staging environments
  - [x] 1.4: Set up screenshot and video on failure
  - [x] 1.5: Add test:e2e script to package.json

- [x] **Task 2: Test Utilities & Fixtures**
  - [x] 2.1: Create test/e2e/fixtures/auth.ts for login helpers
  - [x] 2.2: Create mock MFA bypass for test environment
  - [x] 2.3: Create test data factory for seeding test NDAs
  - [x] 2.4: Create page object models for common pages

- [x] **Task 3: Authentication Tests** (AC: 2)
  - [x] 3.1: Test successful login → MFA → dashboard
  - [x] 3.2: Test invalid email/password shows error
  - [x] 3.3: Test invalid MFA code shows error
  - [x] 3.4: Test MFA lockout after 3 failed attempts
  - [x] 3.5: Test session timeout warning modal appears
  - [x] 3.6: Test session extension button works
  - [x] 3.7: Test logout clears session

- [x] **Task 4: NDA Creation Tests** (AC: 3)
  - [x] 4.1: Test navigate to NDA list
  - [x] 4.2: Test click "New NDA" opens wizard
  - [x] 4.3: Test fill wizard steps (agency, POCs, details)
  - [x] 4.4: Test save creates NDA, shows in list
  - [x] 4.5: Test validation errors shown for required fields

- [x] **Task 5: NDA Edit & Document Tests** (AC: 3)
  - [x] 5.1: Test open existing NDA
  - [x] 5.2: Test edit fields and save
  - [x] 5.3: Test generate RTF downloads file
  - [x] 5.4: Test upload document to NDA
  - [x] 5.5: Test download document from NDA

- [x] **Task 6: Email Sending Tests** (AC: 3)
  - [x] 6.1: Test open send email dialog
  - [x] 6.2: Test select template
  - [x] 6.3: Test preview email content
  - [x] 6.4: Test send email shows success toast
  - [x] 6.5: Test email appears in NDA history

- [x] **Task 7: Admin User Tests** (AC: 4)
  - [x] 7.1: Test navigate to User Management
  - [x] 7.2: Test create new user
  - [x] 7.3: Test assign role to user
  - [x] 7.4: Test deactivate user (not self)
  - [x] 7.5: Test search/filter users

- [x] **Task 8: Admin Agency Tests** (AC: 4)
  - [x] 8.1: Test create agency group
  - [x] 8.2: Test create subagency
  - [x] 8.3: Test grant user access to agency
  - [x] 8.4: Test revoke user access
  - [x] 8.5: Test delete empty agency group

- [x] **Task 9: Agency Scoping Tests** (AC: 5)
  - [x] 9.1: Create two test users with different agency access
  - [x] 9.2: Login as User A, verify only their NDAs visible
  - [x] 9.3: Login as User B, verify only their NDAs visible
  - [x] 9.4: Test direct URL to unauthorized NDA returns 404
  - [x] 9.5: Test agency filter dropdown shows only authorized agencies

- [x] **Task 10: CI/CD Integration**
  - [x] 10.1: Add Playwright to GitHub Actions workflow
  - [x] 10.2: Configure parallel test execution
  - [x] 10.3: Upload test artifacts on failure
  - [x] 10.4: Add test report to PR comments

## Dev Notes

### Pre-Development Analysis (2026-01-03)

- **Development Type:** brownfield
- **Existing Files:** 1 (playwright.config.ts)
- **New Files:** 0
- **Findings:**
  - Playwright is already installed (`@playwright/test` in devDependencies).
  - `playwright.config.ts` exists with baseURL configured but no screenshot/video settings.
  - No E2E test files or fixtures found; all E2E test tasks remain.
  - No `test:e2e` script in `package.json`.

### Smart Batching Plan (2026-01-03)

- **Batchable Patterns Detected:** 0
- **Individual Tasks:** 9 (config updates + tests/fixtures/CI)
- **Risk Level:** high (E2E coverage requires stable UI flows and test data)

---

### Implementation Notes (2026-01-03)

- Updated `playwright.config.ts`:
  - `testDir` set to `test/e2e`
  - Added screenshot/video capture on failure
  - Added HTML/GitHub reporters
- Added `test:e2e` script to `package.json`

---

### Implementation Notes (2026-01-04)

- Added Playwright fixtures, mock API, and test data factory under `test/e2e/`.
- Added page object models for login, NDA list/detail, request wizard, admin users, agency groups, and audit logs.
- Implemented E2E specs for auth, NDA lifecycle, admin workflows, and agency scoping.
- Updated `playwright.config.ts` with webServer and parallel execution settings.
- Added E2E job to CI with Playwright browser install, report artifact upload, and PR comment.
- Hardened E2E selectors for strict-mode stability, dialog scoping, and scroll handling.
- Verified `pnpm test:e2e` passes locally (2026-01-04).
- Hardened E2E selectors for strict-mode stability, dialog scoping, and scroll handling.
- Verified `pnpm test:e2e` passes locally (2026-01-04).

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['github', { embedAnnotationsAsProperties: true }]
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Auth Fixture

```typescript
// test/e2e/fixtures/auth.ts
import { test as base, Page } from '@playwright/test';

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Login with test credentials
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.E2E_TEST_EMAIL!);
    await page.fill('[name="password"]', process.env.E2E_TEST_PASSWORD!);
    await page.click('button[type="submit"]');

    // Handle MFA (test environment uses bypass or fixed code)
    await page.waitForURL('**/mfa-challenge');
    await page.fill('[name="mfaCode"]', '123456'); // Test MFA code
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('**/dashboard');

    await use(page);
  },
});
```

### Page Object Model Example

```typescript
// test/e2e/pages/NDAListPage.ts
import { Page, Locator } from '@playwright/test';

export class NDAListPage {
  readonly page: Page;
  readonly newNDAButton: Locator;
  readonly searchInput: Locator;
  readonly ndaTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newNDAButton = page.getByRole('button', { name: /new nda/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.ndaTable = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/requests');
  }

  async createNewNDA() {
    await this.newNDAButton.click();
    await this.page.waitForURL('**/new');
  }

  async searchNDAs(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForLoadState('networkidle');
  }

  async getNDACount(): Promise<number> {
    const rows = this.ndaTable.locator('tbody tr');
    return rows.count();
  }
}
```

### Sample Test

```typescript
// test/e2e/specs/nda-lifecycle.spec.ts
import { test } from '../fixtures/auth';
import { NDAListPage } from '../pages/NDAListPage';
import { expect } from '@playwright/test';

test.describe('NDA Lifecycle', () => {
  test('user can create a new NDA', async ({ authenticatedPage }) => {
    const ndaList = new NDAListPage(authenticatedPage);
    await ndaList.goto();

    // Click new NDA
    await ndaList.createNewNDA();

    // Fill wizard
    await authenticatedPage.getByRole('combobox', { name: /agency/i }).click();
    await authenticatedPage.getByRole('option').first().click();
    await authenticatedPage.getByRole('button', { name: /next/i }).click();

    // Continue through wizard...
    // (fill POCs, details, etc.)

    // Save
    await authenticatedPage.getByRole('button', { name: /save/i }).click();

    // Verify success
    await expect(authenticatedPage.getByText(/nda created/i)).toBeVisible();
  });

  test('user can generate RTF document', async ({ authenticatedPage }) => {
    const ndaList = new NDAListPage(authenticatedPage);
    await ndaList.goto();

    // Click first NDA
    await authenticatedPage.locator('tbody tr').first().click();

    // Click generate
    await authenticatedPage.getByRole('button', { name: /generate/i }).click();

    // Verify download
    const downloadPromise = authenticatedPage.waitForEvent('download');
    await authenticatedPage.getByRole('button', { name: /download/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.rtf');
  });
});
```

### Environment Variables for E2E

```bash
# .env.test
E2E_BASE_URL=http://localhost:5173
E2E_TEST_EMAIL=e2e-test@usmax.com
E2E_TEST_PASSWORD=E2ETestPassword123!
E2E_TEST_MFA_CODE=123456
```

### GitHub Actions Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Setup test database
        run: |
          pnpm db:push
          pnpm db:seed

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## Estimated Effort

| Task | Effort |
|------|--------|
| Playwright setup | 2 hours |
| Test utilities & fixtures | 3 hours |
| Authentication tests | 4 hours |
| NDA creation tests | 4 hours |
| NDA edit & document tests | 3 hours |
| Email tests | 2 hours |
| Admin user tests | 3 hours |
| Admin agency tests | 3 hours |
| Agency scoping tests | 3 hours |
| CI/CD integration | 2 hours |
| **Total** | **~29 hours** |

## Definition of Done

- [x] Playwright configured and running locally
- [x] All 9 test categories have passing tests
- [x] Tests run in CI/CD on every PR
- [x] Screenshot/video captured on failure
- [x] Test report generated and accessible
- [x] Documentation for running tests locally

Note: E2E suite executed locally on 2026-01-04 (`pnpm test:e2e`). Vite dev server logged proxy warnings for `/api/auth/me` and `/api/mock-download/*` while tests remained green.

## Post-Validation (2026-01-04)

- `pnpm test:e2e`
- Result: ✅ 14 passed (12.3s)
- Notes: Vite dev server proxy warnings for `/api/auth/me` and `/api/mock-download/*` during the run; test assertions passed.

## References

- [Epic 1 Gap Analysis](./epic-1-gap-analysis.md)
- [Playwright Documentation](https://playwright.dev/)
- [Story 1-1: AWS Cognito MFA Integration](./1-1-aws-cognito-mfa.md)

# Story 1-5: E2E Playwright Tests

Status: ready-for-dev

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

- [ ] **Task 1: Playwright Configuration**
  - [ ] 1.1: Install @playwright/test and dependencies
  - [ ] 1.2: Create playwright.config.ts with proper settings
  - [ ] 1.3: Configure baseURL for dev/staging environments
  - [ ] 1.4: Set up screenshot and video on failure
  - [ ] 1.5: Add test:e2e script to package.json

- [ ] **Task 2: Test Utilities & Fixtures**
  - [ ] 2.1: Create test/e2e/fixtures/auth.ts for login helpers
  - [ ] 2.2: Create mock MFA bypass for test environment
  - [ ] 2.3: Create test data factory for seeding test NDAs
  - [ ] 2.4: Create page object models for common pages

- [ ] **Task 3: Authentication Tests** (AC: 2)
  - [ ] 3.1: Test successful login → MFA → dashboard
  - [ ] 3.2: Test invalid email/password shows error
  - [ ] 3.3: Test invalid MFA code shows error
  - [ ] 3.4: Test MFA lockout after 3 failed attempts
  - [ ] 3.5: Test session timeout warning modal appears
  - [ ] 3.6: Test session extension button works
  - [ ] 3.7: Test logout clears session

- [ ] **Task 4: NDA Creation Tests** (AC: 3)
  - [ ] 4.1: Test navigate to NDA list
  - [ ] 4.2: Test click "New NDA" opens wizard
  - [ ] 4.3: Test fill wizard steps (agency, POCs, details)
  - [ ] 4.4: Test save creates NDA, shows in list
  - [ ] 4.5: Test validation errors shown for required fields

- [ ] **Task 5: NDA Edit & Document Tests** (AC: 3)
  - [ ] 5.1: Test open existing NDA
  - [ ] 5.2: Test edit fields and save
  - [ ] 5.3: Test generate RTF downloads file
  - [ ] 5.4: Test upload document to NDA
  - [ ] 5.5: Test download document from NDA

- [ ] **Task 6: Email Sending Tests** (AC: 3)
  - [ ] 6.1: Test open send email dialog
  - [ ] 6.2: Test select template
  - [ ] 6.3: Test preview email content
  - [ ] 6.4: Test send email shows success toast
  - [ ] 6.5: Test email appears in NDA history

- [ ] **Task 7: Admin User Tests** (AC: 4)
  - [ ] 7.1: Test navigate to User Management
  - [ ] 7.2: Test create new user
  - [ ] 7.3: Test assign role to user
  - [ ] 7.4: Test deactivate user (not self)
  - [ ] 7.5: Test search/filter users

- [ ] **Task 8: Admin Agency Tests** (AC: 4)
  - [ ] 8.1: Test create agency group
  - [ ] 8.2: Test create subagency
  - [ ] 8.3: Test grant user access to agency
  - [ ] 8.4: Test revoke user access
  - [ ] 8.5: Test delete empty agency group

- [ ] **Task 9: Agency Scoping Tests** (AC: 5)
  - [ ] 9.1: Create two test users with different agency access
  - [ ] 9.2: Login as User A, verify only their NDAs visible
  - [ ] 9.3: Login as User B, verify only their NDAs visible
  - [ ] 9.4: Test direct URL to unauthorized NDA returns 404
  - [ ] 9.5: Test agency filter dropdown shows only authorized agencies

- [ ] **Task 10: CI/CD Integration**
  - [ ] 10.1: Add Playwright to GitHub Actions workflow
  - [ ] 10.2: Configure parallel test execution
  - [ ] 10.3: Upload test artifacts on failure
  - [ ] 10.4: Add test report to PR comments

## Dev Notes

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

- [ ] Playwright configured and running locally
- [ ] All 9 test categories have passing tests
- [ ] Tests run in CI/CD on every PR
- [ ] Screenshot/video captured on failure
- [ ] Test report generated and accessible
- [ ] Documentation for running tests locally

## References

- [Epic 1 Gap Analysis](./epic-1-gap-analysis.md)
- [Playwright Documentation](https://playwright.dev/)
- [Story 1-1: AWS Cognito MFA Integration](./1-1-aws-cognito-mfa.md)

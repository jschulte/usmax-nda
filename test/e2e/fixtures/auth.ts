import { test as base, expect, type Page } from '@playwright/test';
import { createMockState, setupMockApi, type MockState, type UserKey } from '../utils/mockApi';
import { LoginPage } from '../pages/LoginPage';
import { MfaChallengePage } from '../pages/MfaChallengePage';

interface LoginOptions {
  userKey?: UserKey;
  password?: string;
  mfaCode?: string;
  expectFailure?: boolean;
}

type Fixtures = {
  mockState: MockState;
  login: (options?: LoginOptions) => Promise<void>;
  loginAs: (userKey: UserKey) => Promise<void>;
  authenticatedPage: Page;
  setSessionExpiresIn: (ms: number) => void;
};

export const test = base.extend<Fixtures>({
  mockState: async ({ page }, use) => {
    const state = createMockState();
    await setupMockApi(page, state);
    await use(state);
  },
  login: async ({ page, mockState }, use) => {
    const login = async (options: LoginOptions = {}) => {
      const userKey = options.userKey ?? 'ndaUser';
      const user = mockState.users[userKey];
      const password = options.password ?? (userKey === 'admin' ? 'Admin123!@#$' : 'Test1234!@#$');
      const mfaCode = options.mfaCode ?? '123456';

      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.email, password);

      if (options.expectFailure) {
        return;
      }

      const mfaPage = new MfaChallengePage(page);
      await mfaPage.waitFor();
      await mfaPage.submitCode(mfaCode);
      await page.waitForURL('**/');
    };

    await use(login);
  },
  loginAs: async ({ login }, use) => {
    const loginAs = async (userKey: UserKey) => {
      await login({ userKey });
    };
    await use(loginAs);
  },
  authenticatedPage: async ({ page, loginAs }, use) => {
    await loginAs('ndaUser');
    await use(page);
  },
  setSessionExpiresIn: async ({ mockState }, use) => {
    const setter = (ms: number) => {
      mockState.auth.sessionExpiresAt = Date.now() + ms;
    };
    await use(setter);
  },
});

export { expect };

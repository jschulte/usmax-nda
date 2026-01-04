import { test, expect } from './fixtures/auth';
import { LoginPage } from './pages/LoginPage';
import { MfaChallengePage } from './pages/MfaChallengePage';

test.describe('Authentication', () => {
  test('login -> MFA -> dashboard', async ({ page, loginAs }) => {
    await loginAs('ndaUser');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('invalid credentials show error', async ({ page, mockState }) => {
    mockState.auth.mfaBypass = true;
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@usmax.com', 'WrongPassword');

    const alert = page.getByRole('alert').filter({ hasText: 'Invalid credentials' });
    await expect(alert).toBeVisible();
  });

  test('invalid MFA code shows error', async ({ page, mockState }) => {
    mockState.auth.mfaBypass = false;
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@usmax.com', 'Test1234!@#$');

    const mfaPage = new MfaChallengePage(page);
    await mfaPage.waitFor();
    await mfaPage.submitCode('000000');

    const alert = page.getByRole('alert').filter({ hasText: 'Invalid MFA code' });
    await expect(alert).toBeVisible();
  });

  test('locks out after 3 failed MFA attempts', async ({ page, mockState }) => {
    mockState.auth.mfaBypass = false;
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@usmax.com', 'Test1234!@#$');

    const mfaPage = new MfaChallengePage(page);
    await mfaPage.waitFor();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await mfaPage.submitCode('000000');
      const alert = page.getByRole('alert').filter({ hasText: 'Invalid MFA code' });
      await expect(alert).toBeVisible();
    }

    await expect(page.getByText(/Account temporarily locked/i)).toBeVisible();
  });

  test('session timeout warning modal appears and can extend session', async ({ page, loginAs, setSessionExpiresIn }) => {
    setSessionExpiresIn(2 * 60_000);
    await loginAs('ndaUser');

    const dialog = page.getByRole('dialog', { name: /session expiring soon/i });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: /extend session/i }).click();
    await expect(dialog).toBeHidden();
  });

  test('logout clears session', async ({ page, loginAs, setSessionExpiresIn }) => {
    setSessionExpiresIn(2 * 60_000);
    await loginAs('ndaUser');

    const dialog = page.getByRole('dialog', { name: /session expiring soon/i });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: /logout now/i }).click();
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: /nda management system/i })).toBeVisible();
  });
});

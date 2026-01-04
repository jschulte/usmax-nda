import { test, expect } from './fixtures/auth';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AgencyGroupsPage } from './pages/AgencyGroupsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

test.describe('Admin workflows', () => {
  test('manage users and roles', async ({ page, loginAs }) => {
    await loginAs('admin');

    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();

    await usersPage.openAddUser();
    await usersPage.fillUserForm({
      firstName: 'Test',
      lastName: 'Operator',
      email: 'test.operator@agency.gov',
    });
    await usersPage.submitUserForm();

    const newUserRow = usersPage.userRow('test.operator@agency.gov');
    await expect(newUserRow).toBeVisible();

    await usersPage.openUserMenu('test.operator@agency.gov');
    await page.getByRole('menuitem', { name: /edit user/i }).click();
    await usersPage.selectRole('Admin');
    await usersPage.submitUserForm();

    await expect(newUserRow.getByText('Admin')).toBeVisible();

    await usersPage.openUserMenu('test.operator@agency.gov');
    await page.getByRole('menuitem', { name: /deactivate user/i }).click();
    await page.getByRole('button', { name: /deactivate user/i }).click();

    await expect(newUserRow.getByText('Inactive')).toBeVisible();

    await usersPage.searchFor('admin');
    await expect(usersPage.userRow('admin@usmax.com')).toBeVisible();
  });

  test('manage agency groups, access, and subagencies', async ({ page, loginAs }) => {
    await loginAs('admin');

    const agencyPage = new AgencyGroupsPage(page);
    await agencyPage.goto();

    await agencyPage.openCreateGroup();
    await agencyPage.fillGroupForm({ name: 'Test Agency', code: 'TEST' });
    await agencyPage.saveGroup();

    await expect(page.getByText('Test Agency')).toBeVisible();

    await agencyPage.openGroupMenu('Test Agency');
    await agencyPage.clickMenuItem('Add Subagency');
    await agencyPage.fillSubagencyForm({ name: 'Test Subagency', code: 'TS1' });
    await agencyPage.saveSubagency();

    await agencyPage.toggleGroup('Test Agency');
    await expect(page.getByText('Test Subagency')).toBeVisible();

    await agencyPage.openGroupMenu('Test Agency');
    await agencyPage.clickMenuItem('Manage Access');
    const accessDialog = page.getByRole('dialog', { name: /manage access/i });
    await expect(accessDialog).toBeVisible();
    await agencyPage.grantAccess('Grant access to user', 'tay', 'Taylor Grant');
    await expect(accessDialog.getByText('Taylor Grant')).toBeVisible();
    await agencyPage.revokeAccess('Taylor Grant');
    await page.getByRole('button', { name: /revoke access/i }).click();
    await expect(accessDialog.getByText('No users have access yet.')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /access/i }).first().click();
    const subagencyDialog = page.getByRole('dialog', { name: /subagency access/i });
    await expect(subagencyDialog).toBeVisible();
    await agencyPage.grantAccess('Grant subagency access', 'tay', 'Taylor Grant');
    await expect(subagencyDialog.getByText('Taylor Grant')).toBeVisible();
    await agencyPage.revokeAccess('Taylor Grant');
    await page.getByRole('button', { name: /revoke access/i }).click();
    await expect(subagencyDialog.getByText('No users have access yet.')).toBeVisible();
    await page.keyboard.press('Escape');

    await agencyPage.openCreateGroup();
    await agencyPage.fillGroupForm({ name: 'Empty Agency', code: 'EMPTY' });
    await agencyPage.saveGroup();
    await expect(page.getByText('Empty Agency')).toBeVisible();

    await agencyPage.openGroupMenu('Empty Agency');
    await agencyPage.clickMenuItem('Delete Group');
    await page.getByRole('button', { name: /^delete$/i }).click();
    await expect(page.getByText('Empty Agency')).toHaveCount(0);
  });

  test('view and export audit logs', async ({ page, loginAs }) => {
    await loginAs('admin');

    const auditPage = new AuditLogsPage(page);
    await auditPage.goto();

    await expect(page.getByRole('heading', { name: /audit logs/i })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await auditPage.exportLogs();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/audit-logs/i);
  });

  test('manage email templates', async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/administration/email-templates');

    await expect(page.getByRole('heading', { name: /email templates/i })).toBeVisible();

    await page.getByRole('button', { name: /create new template/i }).click();
    await page.getByPlaceholder('e.g., Standard NDA Email').fill('Ops Template');
    await page.getByPlaceholder('Optional description').fill('Ops description');
    await page
      .getByPlaceholder('e.g., NDA {{displayId}} - {{companyName}}')
      .fill('NDA {{displayId}} - {{companyName}}');
    await page
      .getByPlaceholder('Enter email body here. Use placeholders like {{companyName}} for dynamic content.')
      .fill('Hello {{companyName}}');
    const createTemplateButton = page.getByRole('button', { name: /create template/i }).last();
    await createTemplateButton.evaluate((button) => (button as HTMLButtonElement).click());

    await expect(page.getByText('Ops Template')).toBeVisible();

    const optionsButtons = page.getByLabel('Template options');
    await optionsButtons.first().click();
    await page.getByRole('menuitem', { name: /edit/i }).click();
    await page
      .getByPlaceholder('e.g., NDA {{displayId}} - {{companyName}}')
      .fill('Updated subject {{displayId}}');
    const saveChangesButton = page.getByRole('button', { name: /save changes/i });
    await saveChangesButton.evaluate((button) => (button as HTMLButtonElement).click());

    await expect(page.getByRole('heading', { name: /email templates/i })).toBeVisible();

    await optionsButtons.first().click();
    await page.getByRole('menuitem', { name: /duplicate/i }).click();

    await expect(page.getByText('Ops Template (Copy)')).toBeVisible();
    await page.getByLabel('Close editor').evaluate((button) => (button as HTMLButtonElement).click());

    page.once('dialog', (dialog) => dialog.accept());
    await optionsButtons.first().click();
    await page.getByRole('menuitem', { name: /^delete$/i }).click();

    await expect(page.getByText('Ops Template (Copy)')).toHaveCount(0);
  });
});

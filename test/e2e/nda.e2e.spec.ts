import { test, expect } from './fixtures/auth';
import { NdaListPage } from './pages/NdaListPage';
import { RequestWizardPage } from './pages/RequestWizardPage';
import { NdaDetailPage } from './pages/NdaDetailPage';

test.describe('NDA lifecycle', () => {
  test('create NDA via wizard and validate required fields', async ({ page, loginAs }) => {
    await loginAs('ndaUser');

    const listPage = new NdaListPage(page);
    await listPage.goto();
    await expect(listPage.heading).toBeVisible();

    await listPage.clickRequestNew();
    const wizard = new RequestWizardPage(page);
    await wizard.waitFor();

    await wizard.inputByLabel('Abbreviated name *').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByText('Abbreviated name is required')).toBeVisible();

    await wizard.fillStepOne('Orion NDA', 'Evaluate strategic partnership.');
    await wizard.nextButton.click();

    await wizard.fillStepTwo({
      companyName: 'Orion Labs',
      agencyGroup: 'Air Force',
      relationshipName: 'Jordan Blake',
      relationshipEmail: 'jordan.blake@orionlabs.com',
    });
    await wizard.nextButton.click();

    await wizard.confirmAndSubmit();
    await page.waitForURL(/\/nda\//);

    await expect(page.getByRole('heading', { name: /Orion Labs/i })).toBeVisible();

    await listPage.goto();
    await expect(listPage.rowByCompany('Orion Labs').first()).toBeVisible();
  });

  test('edit NDA details and change status', async ({ page, loginAs }) => {
    await loginAs('ndaUser');

    const detailPage = new NdaDetailPage(page);
    await detailPage.goto('nda-1');

    await page.getByRole('button', { name: /edit nda details/i }).click();

    const wizard = new RequestWizardPage(page);
    await wizard.waitFor();
    await wizard.fillStepOne('Acme NDA Updated', 'Updated purpose text.');
    await wizard.nextButton.click();
    await wizard.nextButton.click();
    await wizard.confirmAndSubmit();

    await page.waitForURL('**/nda/nda-1');

    await detailPage.openStatusChange();
    await detailPage.selectStatus('Pending Approval');
    await detailPage.confirmStatusChange();

    await expect(page.getByText('Pending Approval', { exact: true }).first()).toBeVisible();
  });

  test('generate, upload, and download documents', async ({ page, loginAs }) => {
    await loginAs('ndaUser');

    const detailPage = new NdaDetailPage(page);
    await detailPage.goto('nda-1');
    await detailPage.openDocumentTab();

    await detailPage.generateDocument();
    await expect(page.locator('span', { hasText: 'nda-nda-1.rtf' })).toBeVisible();

    await detailPage.uploadDocument();
    await expect(page.locator('span', { hasText: 'uploaded-document.rtf' })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await detailPage.downloadButton().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/document-/i);
  });

  test('send NDA email and verify history', async ({ page, loginAs }) => {
    await loginAs('ndaUser');

    const detailPage = new NdaDetailPage(page);
    await detailPage.goto('nda-1');

    page.once('popup', (popup) => popup.close());
    page.on('dialog', (dialog) => dialog.accept());

    await detailPage.openEmailComposer();
    await expect(page.getByRole('dialog', { name: /send nda email/i })).toBeVisible();

    await detailPage.selectEmailTemplate('Default Email Template (default)');
    await detailPage.addCustomRecipient('external.recipient@acme.com');
    await detailPage.sendEmail();

    await expect(page.getByText('Email sent')).toBeVisible();
    await expect(page.getByText(/NDA for nda-1/i).first()).toBeVisible();
  });
});

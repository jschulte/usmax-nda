import { type Page, type Locator } from '@playwright/test';

export class NdaDetailPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(ndaId: string) {
    await this.page.goto(`/nda/${ndaId}`);
  }

  private tabContainer(): Locator {
    return this.page.getByRole('button', { name: 'Overview' }).locator('..');
  }

  async openDocumentTab() {
    await this.tabContainer().getByRole('button', { name: 'Document' }).click();
  }

  async openActivityTab() {
    await this.tabContainer().getByRole('button', { name: 'Activity' }).click();
  }

  async generateDocument() {
    await this.page.getByRole('button', { name: /generate document/i }).first().click();
  }

  async uploadDocument(fileName = 'upload.rtf', mimeType = 'application/rtf', contents = '{\\rtf1 Test}') {
    const buffer = Buffer.from(contents, 'utf-8');
    await this.page.setInputFiles('#document-upload', {
      name: fileName,
      mimeType,
      buffer,
    });
  }

  downloadButton(): Locator {
    return this.page.getByRole('button', { name: /^download$/i }).first();
  }

  async openStatusChange() {
    await this.page.getByRole('button', { name: /change status/i }).first().click();
  }

  async selectStatus(label: string) {
    await this.page.getByLabel(label).check();
  }

  async confirmStatusChange() {
    await this.page.getByRole('button', { name: /^change status$/i }).click();
  }

  async openEmailComposer() {
    const quickActions = this.page.getByRole('heading', { name: /quick actions/i }).locator('..');
    await quickActions.getByRole('button', { name: /^send email$/i }).click();
  }

  async selectEmailTemplate(label: string) {
    const dialog = this.page.getByRole('dialog', { name: /send nda email/i });
    await dialog.getByText('Loading email preview...').waitFor({ state: 'hidden' });
    await dialog.locator('label:has-text("Email Template")').locator('..').locator('select').selectOption({ label });
    await dialog.getByText('Loading email preview...').waitFor({ state: 'hidden' });
  }

  async selectRecipient(name: string) {
    const dialog = this.page.getByRole('dialog', { name: /send nda email/i });
    await dialog.locator('div.cursor-pointer', { hasText: name }).first().click();
    await dialog.getByRole('button', { name: /^send email$/i }).waitFor({ state: 'visible' });
  }

  async addCustomRecipient(email: string) {
    const dialog = this.page.getByRole('dialog', { name: /send nda email/i });
    await dialog.getByRole('button', { name: /add recipient/i }).click();
    await dialog.getByPlaceholder('email@example.com').fill(email);
    await dialog.getByRole('button', { name: /^add$/i }).click();
    await dialog.getByRole('button', { name: /^send email$/i }).waitFor({ state: 'visible' });
  }

  async sendEmail() {
    const dialog = this.page.getByRole('dialog', { name: /send nda email/i });
    await dialog.getByText('Loading email preview...').waitFor({ state: 'hidden' });
    const sendButton = dialog.getByRole('button', { name: /^send email$/i });
    await sendButton.waitFor({ state: 'visible' });
    await dialog.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await sendButton.evaluate((el) => (el as HTMLButtonElement).click());
  }
}

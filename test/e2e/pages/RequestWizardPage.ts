import { type Page, type Locator } from '@playwright/test';

export class RequestWizardPage {
  readonly page: Page;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nextButton = page.getByRole('button', { name: /^next$/i });
    this.backButton = page.getByRole('button', { name: /^back$/i });
    this.submitButton = page.getByRole('button', { name: /create nda|save changes/i });
  }

  async waitFor() {
    await this.page.waitForURL((url) => {
      return url.pathname.includes('/request-wizard') || /\/nda\/[^/]+\/edit/.test(url.pathname);
    });
  }

  inputByLabel(label: string): Locator {
    return this.page.getByText(label, { exact: true }).locator('..').locator('input');
  }

  textareaByLabel(label: string): Locator {
    return this.page.getByText(label, { exact: true }).locator('..').locator('textarea');
  }

  selectByLabel(label: string): Locator {
    return this.page.getByText(label, { exact: true }).locator('..').locator('select');
  }

  async fillStepOne(abbreviatedName: string, authorizedPurpose: string) {
    await this.inputByLabel('Abbreviated name *').fill(abbreviatedName);
    await this.textareaByLabel('Authorized purpose *').fill(authorizedPurpose);
  }

  async fillStepTwo(options: {
    companyName: string;
    agencyGroup: string;
    relationshipName: string;
    relationshipEmail: string;
  }) {
    await this.inputByLabel('Company name *').fill(options.companyName);
    await this.selectByLabel('Agency group *').selectOption({ label: options.agencyGroup });
    await this.inputByLabel('Relationship POC * (Primary Point of Contact)').fill(options.relationshipName);
    await this.inputByLabel('Relationship POC Email *').fill(options.relationshipEmail);
  }

  async confirmAndSubmit() {
    await this.page.getByRole('checkbox').first().check();
    await this.submitButton.click();
  }
}

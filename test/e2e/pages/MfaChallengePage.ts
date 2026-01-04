import { type Page, type Locator } from '@playwright/test';

export class MfaChallengePage {
  readonly page: Page;
  readonly codeInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.codeInput = page.getByLabel(/authentication code/i);
    this.submitButton = page.getByRole('button', { name: /verify code/i });
  }

  async waitFor() {
    await this.page.waitForURL('**/mfa-challenge');
  }

  async submitCode(code: string) {
    await this.codeInput.fill(code);
    await this.submitButton.click();
  }
}

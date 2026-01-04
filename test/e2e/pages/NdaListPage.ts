import { type Page, type Locator } from '@playwright/test';

export class NdaListPage {
  readonly page: Page;
  readonly requestButton: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.requestButton = page.getByRole('button', { name: /request new nda/i });
    this.heading = page.getByRole('heading', { name: /all ndas/i });
  }

  async goto() {
    await this.page.goto('/ndas');
  }

  async clickRequestNew() {
    await this.requestButton.click();
  }

  async openFilters() {
    await this.page.getByRole('button', { name: /filters/i }).click();
  }

  rowByCompany(companyName: string): Locator {
    return this.page.getByRole('row', { name: new RegExp(companyName, 'i') });
  }

  agencyOptions(): Locator {
    return this.page.locator('#agency-group-options option');
  }

  async agencyOptionsCount(): Promise<number> {
    return this.page.locator('#agency-group-options option').count();
  }
}

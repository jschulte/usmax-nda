import { type Page } from '@playwright/test';

export class AuditLogsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/administration/audit-logs');
  }

  async exportLogs() {
    await this.page.getByRole('button', { name: /export logs/i }).click();
  }
}

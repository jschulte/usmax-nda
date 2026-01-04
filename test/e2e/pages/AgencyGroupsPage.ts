import { type Page, type Locator } from '@playwright/test';

export class AgencyGroupsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/administration/agency-groups');
  }

  async openCreateGroup() {
    await this.page.getByRole('button', { name: /add agency group/i }).click();
  }

  async fillGroupForm(data: { name: string; code: string }) {
    await this.page.locator('label', { hasText: 'Group name' }).locator('..').locator('input').fill(data.name);
    await this.page.locator('label', { hasText: 'Group code' }).locator('..').locator('input').fill(data.code);
  }

  async saveGroup() {
    await this.page.getByRole('button', { name: /save group/i }).click();
  }

  async toggleGroup(groupName: string) {
    const row = this.page.getByRole('row', { name: new RegExp(groupName, 'i') });
    await row.getByRole('button', { name: /toggle subagency list/i }).click();
  }

  async openGroupMenu(groupName: string) {
    const row = this.page.getByRole('row', { name: new RegExp(groupName, 'i') });
    await row.getByRole('button', { name: /agency options/i }).click();
  }

  async clickMenuItem(name: string) {
    await this.page.getByRole('menuitem', { name: new RegExp(name, 'i') }).click();
  }

  async fillSubagencyForm(data: { name: string; code: string }) {
    await this.page.locator('label', { hasText: 'Subagency name' }).locator('..').locator('input').fill(data.name);
    await this.page.locator('label', { hasText: 'Subagency code' }).locator('..').locator('input').fill(data.code);
  }

  async saveSubagency() {
    await this.page.getByRole('button', { name: /save subagency/i }).click();
  }

  private accessDialog(): Locator {
    return this.page.getByRole('dialog', { name: /manage access|subagency access/i });
  }

  async grantAccess(label: string, query: string, resultName: string) {
    const dialog = this.accessDialog();
    const input = dialog.locator('label', { hasText: label }).locator('..').locator('input');
    await input.fill(query);
    await dialog.getByRole('button', { name: new RegExp(resultName, 'i') }).click();
  }

  async revokeAccess(name: string) {
    const dialog = this.accessDialog();
    const entry = dialog.getByText(name, { exact: false }).first();
    await entry.locator('..').locator('..').getByRole('button', { name: /revoke/i }).click();
  }
}

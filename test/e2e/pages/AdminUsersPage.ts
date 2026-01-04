import { type Page, type Locator } from '@playwright/test';

export class AdminUsersPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/administration/users');
  }

  async openAddUser() {
    await this.page.getByRole('button', { name: /add user/i }).click();
  }

  async fillUserForm(data: { firstName: string; lastName: string; email: string }) {
    await this.page.getByLabel('First Name *').fill(data.firstName);
    await this.page.getByLabel('Last Name *').fill(data.lastName);
    await this.page.getByLabel('Email *').fill(data.email);
  }

  async submitUserForm() {
    await this.page.getByRole('button', { name: /create user|update user/i }).click();
  }

  userRow(email: string): Locator {
    return this.page.getByRole('row', { name: new RegExp(email, 'i') });
  }

  async openUserMenu(email: string) {
    await this.userRow(email).getByRole('button').last().click();
  }

  async searchFor(query: string) {
    await this.page.getByPlaceholder('Search users by name or email...').fill(query);
  }

  async selectRole(roleName: string) {
    const dialog = this.page.getByRole('dialog');
    await dialog.getByRole('checkbox', { name: new RegExp(roleName, 'i') }).check();
  }
}

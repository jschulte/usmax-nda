import { test, expect } from './fixtures/auth';
import { NdaListPage } from './pages/NdaListPage';


test.describe('Agency scoping', () => {
  test('users only see NDAs within their agency scope', async ({ page, login, mockState }) => {
    await login({ userKey: 'agencyUserA' });

    const listPage = new NdaListPage(page);
    await listPage.goto();
    await listPage.openFilters();

    await expect(listPage.rowByCompany('Acme Corp')).toBeVisible();
    await expect(listPage.rowByCompany('Blue Harbor')).toHaveCount(0);

    await expect(listPage.agencyOptions()).toHaveCount(1);

    await page.goto('/nda/nda-2');
    await expect(page.getByText(/NDA not found/i)).toBeVisible();

    mockState.auth.isAuthenticated = false;

    await login({ userKey: 'agencyUserB' });
    await listPage.goto();

    await expect(listPage.rowByCompany('Blue Harbor')).toBeVisible();
    await expect(listPage.rowByCompany('Acme Corp')).toHaveCount(0);
  });
});

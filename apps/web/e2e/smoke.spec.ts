import { test, expect } from '@playwright/test';

test.describe('Web Authentication Smoke Test', () => {
  test('redirects root route to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h1')).toContainText('ERP');
  });
});

import { test, expect } from '@playwright/test';

/**
 * Smoke test: confirms the EVOX app loads and renders the login page.
 * This is a Phase 3 baseline — more detailed E2E tests will be added per
 * verified feature flows from the knowledge base.
 *
 * Requirements: app must be running at PLAYWRIGHT_BASE_URL (default: http://localhost:3000)
 */

test.describe('App bootstrap', () => {
  test('login page loads without a server error', async ({ page }) => {
    const response = await page.goto('/');

    // HTTP response should be OK (not a 5xx)
    expect(response?.status()).toBeLessThan(500);

    // Body must be visible — confirms React mounted
    await expect(page.locator('body')).toBeVisible();

    // Login form must contain an email/username input
    await expect(page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')).toBeVisible({ timeout: 10000 });

    // Must not show a Laravel Whoops error
    await expect(page.locator('body')).not.toContainText('Whoops, looks like something went wrong');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('login page has a password field and submit button', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[type="submit"], input[type="submit"]')).toBeVisible();
  });
});

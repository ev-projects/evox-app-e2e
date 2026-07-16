// DRAFT — generated 2026-06-19, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Login (/login)', () => {
  test.describe('On Load', () => {
    test('responds with status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/login`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('page loads in under 500ms', async ({ page }) => {
      const start = Date.now();
      await page.goto(`${BASE_URL}/login`);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
    });

    test('no PHP errors in page body', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error/);
      expect(body).not.toMatch(/Fatal error/);
      expect(body).not.toMatch(/Parse error/);
    });
  });

  test.describe('Key UI Elements', () => {
    test('login form is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      const url = page.url();
      if (!url.includes('/login')) {
        return;
      }
      await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
    });

    test('username or email input is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      const url = page.url();
      if (!url.includes('/login')) {
        return;
      }
      const input = page.locator('input[type="email"], input[type="text"], input[name="email"], input[name="username"]').first();
      await expect(input).toBeVisible({ timeout: 10000 });
    });

    test('password input is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      const url = page.url();
      if (!url.includes('/login')) {
        return;
      }
      await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });
    });

    test('submit button is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      const url = page.url();
      if (!url.includes('/login')) {
        return;
      }
      const button = page.locator('button[type="submit"], input[type="submit"]').first();
      await expect(button).toBeVisible({ timeout: 10000 });
    });
  });
});

test.describe('ForgotPassword (/recover/password/)', () => {
  test.describe('On Load', () => {
    test('responds with status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/recover/password/`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/recover/password/`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('page loads in under 500ms', async ({ page }) => {
      const start = Date.now();
      await page.goto(`${BASE_URL}/recover/password/`);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
    });

    test('no PHP errors in page body', async ({ page }) => {
      await page.goto(`${BASE_URL}/recover/password/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error/);
      expect(body).not.toMatch(/Fatal error/);
      expect(body).not.toMatch(/Parse error/);
    });
  });

  test.describe('Key UI Elements', () => {
    test('email input is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/recover/password/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('submit button is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/recover/password/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const button = page.locator('button[type="submit"], input[type="submit"]').first();
        await expect(button).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

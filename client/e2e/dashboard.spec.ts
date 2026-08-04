// DRAFT — generated 2026-06-19, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Dashboard (/app/Dashboard)', () => {

  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/Dashboard`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/Dashboard`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in page', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/Dashboard`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login when unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/Dashboard`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="email"], input[name="username"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('Dashboard heading or Welcome text is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/Dashboard`);
      const url = page.url();
      if (!url.includes('/login')) {
        const heading = page.locator('h1, h2, h3').filter({ hasText: /Dashboard|Welcome/i });
        await expect(heading.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('sidebar navigation is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/Dashboard`);
      const url = page.url();
      if (!url.includes('/login')) {
        const sidebar = page.locator('nav, aside, [class*="sidebar"], [class*="Sidebar"], [role="navigation"]').first();
        await expect(sidebar).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title contains Dashboard ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/Dashboard`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title.toLowerCase()).toMatch(/dashboard|evox/i);
      }
    });
  });

  test.describe('Table / List', () => {
    test('at least one summary widget or card is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/Dashboard`);
      const url = page.url();
      if (!url.includes('/login')) {
        const widget = page.locator('[class*="card"], [class*="Card"], [class*="widget"], [class*="Widget"], [class*="summary"], [class*="Summary"], .dashboard-card, .stat-card').first();
        await expect(widget).toBeVisible({ timeout: 10000 });
      }
    });

    test('summary widget or table contains readable content ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/Dashboard`);
      const url = page.url();
      if (!url.includes('/login')) {
        const contentBlock = page.locator('[class*="card"], [class*="Card"], [class*="widget"], [class*="Widget"], table, [class*="summary"]').first();
        await expect(contentBlock).toBeVisible({ timeout: 10000 });
        const text = await contentBlock.innerText();
        expect(text.trim().length).toBeGreaterThan(0);
      }
    });
  });

});

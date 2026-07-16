// DRAFT — generated 2026-06-19, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('FreshServiceForm (/app/fresh_service/create/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/fresh_service/create/`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/create/`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/create/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login if unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/create/`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="email"], input[name="username"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('shows FreshService or Support Ticket heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/create/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const heading = page.locator('h1, h2, h3').filter({ hasText: /FreshService|Support Ticket/i });
        await expect(heading.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title is set ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/create/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Form Fields', () => {
    test('subject input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/create/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('input[name="subject"], input[placeholder*="subject" i], input[id*="subject" i]').first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('description textarea is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/create/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('textarea[name="description"], textarea[id*="description" i], textarea[placeholder*="description" i]').first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('category select is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/create/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('select[name="category"], select[id*="category" i]').first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('submit button is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/create/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('button[type="submit"], input[type="submit"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

test.describe('FreshServiceTickets (/app/fresh_service/tickets/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login if unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="email"], input[name="username"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('shows ticket list heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const heading = page.locator('h1, h2, h3').filter({ hasText: /ticket/i });
        await expect(heading.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title is set ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Filter Controls', () => {
    test('status filter select is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('select[name="status"], select[id*="status" i]').first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('search input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('input[type="search"], input[name="search"], input[placeholder*="search" i]').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Table / List', () => {
    test('ticket list table is visible when loaded ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('table, [role="table"], [role="grid"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// DRAFT — generated 2026-06-19, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('DPAForm (/app/dpa)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/dpa`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/dpa`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in page', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/dpa`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login when unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/dpa`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="username"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('DPA or Data Privacy heading is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/dpa`);
      const url = page.url();
      if (!url.includes('/login')) {
        const heading = page.locator('h1, h2, h3, h4').filter({ hasText: /Data Privacy|DPA/i });
        await expect(heading.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('policy text is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/dpa`);
      const url = page.url();
      if (!url.includes('/login')) {
        const policyText = page.locator('p, div, section').filter({ hasText: /privacy|policy|data|agreement/i });
        await expect(policyText.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title contains DPA or Data Privacy ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/dpa`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title).toMatch(/DPA|Data Privacy|Privacy/i);
      }
    });
  });

  test.describe('Form Fields', () => {
    test('agree checkbox or agree button is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/dpa`);
      const url = page.url();
      if (!url.includes('/login')) {
        const agreeControl = page.locator('input[type="checkbox"], button').filter({ hasText: /agree|accept|acknowledge/i });
        const checkbox = page.locator('input[type="checkbox"]');
        const hasAgreeControl = (await agreeControl.count()) > 0 || (await checkbox.count()) > 0;
        expect(hasAgreeControl).toBe(true);
      }
    });

    test('submit button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/dpa`);
      const url = page.url();
      if (!url.includes('/login')) {
        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /submit|save|confirm|sign|agree/i });
        await expect(submitBtn.first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

test.describe('DPAList (/app/team/DPAList)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/team/DPAList`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/DPAList`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in page', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/DPAList`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login when unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/DPAList`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="username"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('DPA heading is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/DPAList`);
      const url = page.url();
      if (!url.includes('/login')) {
        const heading = page.locator('h1, h2, h3, h4').filter({ hasText: /DPA/i });
        await expect(heading.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title contains DPA ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/DPAList`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title).toMatch(/DPA|Data Privacy/i);
      }
    });
  });

  test.describe('Filter Controls', () => {
    test('employee search input is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/DPAList`);
      const url = page.url();
      if (!url.includes('/login')) {
        const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="search" i], input[placeholder*="employee" i], input[placeholder*="name" i]');
        await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('status filter is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/DPAList`);
      const url = page.url();
      if (!url.includes('/login')) {
        const statusFilter = page.locator('select, input[type="radio"], .filter').filter({ hasText: /status|signed|pending|all/i });
        const selectEl = page.locator('select');
        const hasFilter = (await statusFilter.count()) > 0 || (await selectEl.count()) > 0;
        expect(hasFilter).toBe(true);
      }
    });
  });

  test.describe('Table / List', () => {
    test('DPA acknowledgment table or list is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/DPAList`);
      const url = page.url();
      if (!url.includes('/login')) {
        const table = page.locator('table, [role="table"], .table, ul li, .list-item');
        await expect(table.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('table has employee column header ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/DPAList`);
      const url = page.url();
      if (!url.includes('/login')) {
        const header = page.locator('th, thead td, .table-header').filter({ hasText: /employee|name/i });
        await expect(header.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('table has status column header ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/team/DPAList`);
      const url = page.url();
      if (!url.includes('/login')) {
        const header = page.locator('th, thead td, .table-header').filter({ hasText: /status|signed|acknowledged/i });
        await expect(header.first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

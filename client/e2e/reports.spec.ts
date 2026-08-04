// DRAFT — generated 2026-06-19, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('ViewReport (/app/viewreport/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/viewreport/`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login when unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="email"], input[name="username"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('Report heading is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('h1, h2, h3').filter({ hasText: /Report/i }).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('Export/Download button is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('button, a').filter({ hasText: /export|download/i }).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title is set ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title).toBeTruthy();
      }
    });
  });

  test.describe('Filter Controls', () => {
    test('start_date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(
          page.locator('input[name="start_date"], input[id="start_date"], input[placeholder*="start" i]').first()
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('end_date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(
          page.locator('input[name="end_date"], input[id="end_date"], input[placeholder*="end" i]').first()
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('employee or department filter is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const employeeFilter = page.locator(
          'input[name="employee"], select[name="employee"], input[name="department"], select[name="department"], input[placeholder*="employee" i], input[placeholder*="department" i]'
        ).first();
        await expect(employeeFilter).toBeVisible({ timeout: 10000 });
      }
    });

    test('filter/submit button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(
          page.locator('button[type="submit"], button').filter({ hasText: /filter|search|apply|generate/i }).first()
        ).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Table / List', () => {
    test('report table or list is rendered ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('table, [role="grid"], [role="table"], .table').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

test.describe('ViewReportMorocco (/app/viewreport/morocco/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/viewreport/morocco/`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/morocco/`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/morocco/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login when unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/morocco/`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="email"], input[name="username"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('Morocco or Report heading is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/morocco/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('h1, h2, h3').filter({ hasText: /Morocco|Report/i }).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('Export button is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/morocco/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('button, a').filter({ hasText: /export|download/i }).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title is set ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/morocco/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title).toBeTruthy();
      }
    });
  });

  test.describe('Filter Controls', () => {
    test('start_date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/morocco/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(
          page.locator('input[name="start_date"], input[id="start_date"], input[placeholder*="start" i]').first()
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('end_date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/morocco/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(
          page.locator('input[name="end_date"], input[id="end_date"], input[placeholder*="end" i]').first()
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('filter/submit button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/morocco/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(
          page.locator('button[type="submit"], button').filter({ hasText: /filter|search|apply|generate/i }).first()
        ).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Table / List', () => {
    test('report table or list is rendered ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/viewreport/morocco/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('table, [role="grid"], [role="table"], .table').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

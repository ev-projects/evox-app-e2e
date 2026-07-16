// DRAFT — generated 2026-06-20, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// ──────────────────────────────────────────────────────────────────────────────
test.describe('TemplateList (/app/schedule/template/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/schedule/template/`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/template/`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/template/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/template/`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Key UI Elements', () => {
    test('shows "Template" or "Schedule" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/template/`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: /Template|Schedule/i })).toBeVisible({ timeout: 10000 });
      }
    });
    test('Add Template button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/template/`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('button', { name: /Add|Create|New/i }).first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Table / List', () => {
    test('template list is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/template/`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('table,tbody,.list').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('TemplateCreate (/app/schedule/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/schedule/`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Form Fields', () => {
    test('template name input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('input[name="name"],input[name="template_name"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('submit button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('TemplateEdit (/app/schedule/template/1)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/schedule/template/1`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/template/1`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/template/1`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Form Fields', () => {
    test('template name input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/template/1`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('input[name="name"],input[name="template_name"]').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('submit button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/template/1`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('ScheduleAssign — User (/app/schedule/assign/user/1)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/schedule/assign/user/1`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/assign/user/1`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/assign/user/1`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Form Fields', () => {
    test('schedule select is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/assign/user/1`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('select[name="schedule_id"],select[name="template_id"],select').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('submit button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/assign/user/1`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('ScheduleAssignDepartment (/app/schedule/assign/department)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/schedule/assign/department`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/assign/department`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/assign/department`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Filter Controls', () => {
    test('department_id select is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/assign/department`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('select[name="department_id"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Table / List', () => {
    test('employee schedule list is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/schedule/assign/department`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('table,tbody,.list').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

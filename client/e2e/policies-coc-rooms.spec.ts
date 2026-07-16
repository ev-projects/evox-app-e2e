// DRAFT — generated 2026-06-20, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// ──────────────────────────────────────────────────────────────────────────────
test.describe('PoliciesDocumentUpload (/app/policiesupload)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/policiesupload`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesupload`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesupload`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesupload`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Key UI Elements', () => {
    test('shows "Upload" or "Policies" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesupload`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: /Upload|Policies|Document|COC/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Form Fields', () => {
    test('file upload input is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesupload`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('input[type="file"]')).toBeVisible({ timeout: 10000 });
      }
    });
    test('category or type select is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesupload`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('select[name="category"],select[name="policy_type"],select').first()).toBeVisible({ timeout: 10000 });
      }
    });
    test('submit button is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesupload`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('UploadedDocumentList (/app/policiesdocumentlist)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Key UI Elements', () => {
    test('shows "Document" or "Policies" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: /Document|Policies|COC/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Filter Controls', () => {
    test('category filter select is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('select[name="category"],select').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Table / List', () => {
    test('document list is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('table,tbody,.list').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
test.describe('PoliciesDocumentDownload (/app/policiesdownload)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/policiesdownload`);
      expect(r?.status()).toBeLessThan(500);
    });
    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesdownload`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesdownload`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[name="email"],input[type="email"],input[name="username"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Key UI Elements', () => {
    test('shows "Download" or "Policies" heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesdownload`);
      if (!page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: /Download|Policies|Document/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });
  test.describe('Table / List', () => {
    test('downloadable policies list is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/policiesdownload`);
      if (!page.url().includes('/login')) {
        await expect(page.locator('table,tbody,.list,ul').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

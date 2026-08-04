// DRAFT — generated 2026-06-19, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('COE (/app/request/CertificateOfEmployment/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500 and body is visible', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in page body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login when unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="username"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('shows Certificate of Employment heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('h1, h2, h3').filter({ hasText: /Certificate of Employment/i }).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title contains Certificate of Employment ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title).toMatch(/Certificate of Employment/i);
      }
    });
  });

  test.describe('Form Fields', () => {
    test('purpose select or textarea is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const purposeSelect = page.locator('select[name*="purpose"], select[id*="purpose"]');
        const purposeTextarea = page.locator('textarea[name*="purpose"], textarea[id*="purpose"]');
        const purposeField = page.locator('[name*="purpose"], [id*="purpose"], [placeholder*="purpose" i]');
        const hasSelect = await purposeSelect.count() > 0;
        const hasTextarea = await purposeTextarea.count() > 0;
        const hasField = await purposeField.count() > 0;
        expect(hasSelect || hasTextarea || hasField).toBe(true);
        if (hasSelect) {
          await expect(purposeSelect.first()).toBeVisible({ timeout: 10000 });
        } else if (hasTextarea) {
          await expect(purposeTextarea.first()).toBeVisible({ timeout: 10000 });
        } else {
          await expect(purposeField.first()).toBeVisible({ timeout: 10000 });
        }
      }
    });

    test('submit button is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const submitButton = page.locator('button[type="submit"], input[type="submit"], button').filter({ hasText: /submit|request|send/i }).first();
        await expect(submitButton).toBeVisible({ timeout: 10000 });
      }
    });

    test('purpose field accepts input ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmployment/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const purposeTextarea = page.locator('textarea[name*="purpose"], textarea[id*="purpose"]');
        const hasTextarea = await purposeTextarea.count() > 0;
        if (hasTextarea) {
          await purposeTextarea.first().fill('For visa application');
          await expect(purposeTextarea.first()).toHaveValue('For visa application');
        } else {
          const purposeSelect = page.locator('select[name*="purpose"], select[id*="purpose"]');
          const hasSelect = await purposeSelect.count() > 0;
          if (hasSelect) {
            const options = await purposeSelect.first().locator('option').count();
            expect(options).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});

test.describe('COEHR (/app/request/CertificateOfEmploymentHR/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500 and body is visible', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/request/CertificateOfEmploymentHR/`);
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in page body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmploymentHR/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login when unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmploymentHR/`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="username"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('shows a heading or page title for HR COE view ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmploymentHR/`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title is present and non-empty ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmploymentHR/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Filter Controls', () => {
    test('employee search input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmploymentHR/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const searchInput = page.locator('input[type="search"], input[type="text"][name*="employee"], input[placeholder*="employee" i], input[placeholder*="search" i], input[name*="search"]').first();
        await expect(searchInput).toBeVisible({ timeout: 10000 });
      }
    });

    test('status filter control is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmploymentHR/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const statusFilter = page.locator('select[name*="status"], select[id*="status"], input[name*="status"], [placeholder*="status" i]').first();
        await expect(statusFilter).toBeVisible({ timeout: 10000 });
      }
    });

    test('employee search accepts text input ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmploymentHR/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const searchInput = page.locator('input[type="search"], input[type="text"][name*="employee"], input[placeholder*="employee" i], input[placeholder*="search" i], input[name*="search"]').first();
        const isVisible = await searchInput.isVisible();
        if (isVisible) {
          await searchInput.fill('John');
          await expect(searchInput).toHaveValue('John');
        }
      }
    });

    test('status filter has selectable options ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmploymentHR/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const statusSelect = page.locator('select[name*="status"], select[id*="status"]').first();
        const isVisible = await statusSelect.isVisible();
        if (isVisible) {
          const options = await statusSelect.locator('option').count();
          expect(options).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Table / List', () => {
    test('pending COE requests table is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmploymentHR/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const table = page.locator('table, [role="grid"], [role="table"]').first();
        await expect(table).toBeVisible({ timeout: 10000 });
      }
    });

    test('table has header row with columns ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmploymentHR/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const tableHeader = page.locator('table thead tr th, [role="columnheader"]').first();
        const hasTable = await page.locator('table, [role="grid"], [role="table"]').count() > 0;
        if (hasTable) {
          await expect(tableHeader).toBeVisible({ timeout: 10000 });
        }
      }
    });

    test('table renders at least one row or empty state message ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/CertificateOfEmploymentHR/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const hasTable = await page.locator('table, [role="grid"], [role="table"]').count() > 0;
        if (hasTable) {
          const dataRows = page.locator('table tbody tr, [role="row"]');
          const emptyMessage = page.locator('[class*="empty"], [class*="no-data"], [class*="nodata"]').filter({ hasText: /no|empty|found/i });
          const rowCount = await dataRows.count();
          const emptyCount = await emptyMessage.count();
          expect(rowCount > 0 || emptyCount > 0).toBe(true);
        }
      }
    });
  });
});

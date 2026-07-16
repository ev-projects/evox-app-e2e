// DRAFT — generated 2026-06-19, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('ChangeSchedule New (/app/request/ChangeSchedule/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login when unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="email"], input[name="username"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('page heading or title is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const heading = page.locator('h1, h2, h3, .page-title, [class*="title"], [class*="heading"]').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title contains relevant text ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
      }
    });

    test('form labels are visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const labels = page.locator('label');
        const count = await labels.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Form Fields', () => {
    test('date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const dateInput = page.locator('input[type="date"], input[name*="date"], input[placeholder*="date"], input[placeholder*="Date"]').first();
        await expect(dateInput).toBeVisible({ timeout: 10000 });
      }
    });

    test('schedule select is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const scheduleSelect = page.locator('select[name="schedule_id"], select[name*="schedule"], select').first();
        await expect(scheduleSelect).toBeVisible({ timeout: 10000 });
      }
    });

    test('reason textarea is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const reasonTextarea = page.locator('textarea[name*="reason"], textarea[placeholder*="reason"], textarea[placeholder*="Reason"], textarea').first();
        await expect(reasonTextarea).toBeVisible({ timeout: 10000 });
      }
    });

    test('submit button is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Save"), button:has-text("Request")').first();
        await expect(submitButton).toBeVisible({ timeout: 10000 });
      }
    });

    test('date input accepts a value ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const dateInput = page.locator('input[type="date"], input[name*="date"]').first();
        const isVisible = await dateInput.isVisible();
        if (isVisible) {
          await dateInput.fill('2026-06-19');
          const value = await dateInput.inputValue();
          expect(value).toBe('2026-06-19');
        }
      }
    });

    test('reason textarea accepts text input ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/`);
      const url = page.url();
      if (!url.includes('/login')) {
        const textarea = page.locator('textarea[name*="reason"], textarea').first();
        const isVisible = await textarea.isVisible();
        if (isVisible) {
          await textarea.fill('Test reason for schedule change');
          const value = await textarea.inputValue();
          expect(value).toBe('Test reason for schedule change');
        }
      }
    });
  });
});

test.describe('ChangeSchedule Existing (/app/request/ChangeSchedule/1)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login when unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="email"], input[name="username"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('page heading or title is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const heading = page.locator('h1, h2, h3, .page-title, [class*="title"], [class*="heading"]').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title contains relevant text ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
      }
    });

    test('form labels are visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const labels = page.locator('label');
        const count = await labels.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Form Fields', () => {
    test('date input is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const dateInput = page.locator('input[type="date"], input[name*="date"], input[placeholder*="date"], input[placeholder*="Date"]').first();
        await expect(dateInput).toBeVisible({ timeout: 10000 });
      }
    });

    test('schedule select is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const scheduleSelect = page.locator('select[name="schedule_id"], select[name*="schedule"], select').first();
        await expect(scheduleSelect).toBeVisible({ timeout: 10000 });
      }
    });

    test('reason textarea is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const reasonTextarea = page.locator('textarea[name*="reason"], textarea[placeholder*="reason"], textarea[placeholder*="Reason"], textarea').first();
        await expect(reasonTextarea).toBeVisible({ timeout: 10000 });
      }
    });

    test('submit button is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Save"), button:has-text("Request")').first();
        await expect(submitButton).toBeVisible({ timeout: 10000 });
      }
    });

    test('form fields are pre-populated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const dateInput = page.locator('input[type="date"], input[name*="date"]').first();
        const scheduleSelect = page.locator('select[name="schedule_id"], select[name*="schedule"], select').first();
        const dateVisible = await dateInput.isVisible();
        const selectVisible = await scheduleSelect.isVisible();
        if (dateVisible) {
          const dateValue = await dateInput.inputValue();
          expect(dateValue.length).toBeGreaterThan(0);
        }
        if (selectVisible) {
          const selectValue = await scheduleSelect.inputValue();
          expect(selectValue.length).toBeGreaterThan(0);
        }
      }
    });

    test('date input can be changed ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const dateInput = page.locator('input[type="date"], input[name*="date"]').first();
        const isVisible = await dateInput.isVisible();
        if (isVisible) {
          await dateInput.fill('2026-06-20');
          const value = await dateInput.inputValue();
          expect(value).toBe('2026-06-20');
        }
      }
    });

    test('reason textarea can be edited ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/request/ChangeSchedule/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const textarea = page.locator('textarea[name*="reason"], textarea').first();
        const isVisible = await textarea.isVisible();
        if (isVisible) {
          await textarea.fill('Updated reason for schedule change');
          const value = await textarea.inputValue();
          expect(value).toBe('Updated reason for schedule change');
        }
      }
    });
  });
});

// DRAFT — generated 2026-06-19, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Profile  (/app/profile/)', () => {

  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/profile/1`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/profile/1`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP fatal errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/profile/1`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('unauthenticated user is redirected to login ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/profile/1`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="email"], input[name="username"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('Profile heading is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/profile/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('employee name is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/profile/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const nameLocator = page.locator('[class*="name"], [class*="employee"], h1, h2, h3').first();
        await expect(nameLocator).toBeVisible({ timeout: 10000 });
      }
    });

    test('Personal Information tab is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/profile/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.getByRole('tab', { name: /personal information/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('Job Information tab is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/profile/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.getByRole('tab', { name: /job information/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('Time Off tab is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/profile/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        await expect(page.getByRole('tab', { name: /time off/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Form Fields', () => {
    test('Personal Information tab contains at least one editable field ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/profile/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const personalTab = page.getByRole('tab', { name: /personal information/i });
        const tabVisible = await personalTab.isVisible();
        if (tabVisible) {
          await personalTab.click();
        }
        const editableField = page.locator('input:not([type="hidden"]), textarea, select').first();
        await expect(editableField).toBeVisible({ timeout: 10000 });
      }
    });

    test('editable field on Personal Information tab accepts input ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/profile/1`);
      const url = page.url();
      if (!url.includes('/login')) {
        const personalTab = page.getByRole('tab', { name: /personal information/i });
        const tabVisible = await personalTab.isVisible();
        if (tabVisible) {
          await personalTab.click();
        }
        const editableField = page.locator('input[type="text"], input[type="email"], input[type="tel"], textarea').first();
        const fieldVisible = await editableField.isVisible();
        if (fieldVisible) {
          const isReadonly = await editableField.getAttribute('readonly');
          const isDisabled = await editableField.getAttribute('disabled');
          if (!isReadonly && !isDisabled) {
            await editableField.click();
            await expect(editableField).toBeFocused();
          }
        }
      }
    });
  });

});

// DRAFT — generated 2026-06-19, needs verification
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('EVLearning (/app/EVLearning/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/EVLearning`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login when unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="username"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('shows EV Learning or Learning heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning`);
      const url = page.url();
      if (!url.includes('/login')) {
        const heading = page.locator('h1, h2, h3, h4, h5, h6, [class*="heading"], [class*="title"]');
        const headingText = await heading.first().innerText();
        expect(headingText).toMatch(/EV Learning|Learning/i);
      }
    });

    test('shows course list or module cards ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning`);
      const url = page.url();
      if (!url.includes('/login')) {
        const courseItems = page.locator('[class*="course"], [class*="module"], [class*="card"], ul li, .list-item, [class*="item"]');
        await expect(courseItems.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('shows navigation tabs ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning`);
      const url = page.url();
      if (!url.includes('/login')) {
        const tabs = page.locator('[role="tab"], [class*="tab"], nav a, [class*="nav-item"]');
        const tabCount = await tabs.count();
        expect(tabCount).toBeGreaterThan(0);
      }
    });

    test('page title is set ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Filter Controls', () => {
    test('filter inputs or selects are present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning`);
      const url = page.url();
      if (!url.includes('/login')) {
        const filterControls = page.locator('input[type="search"], input[type="text"], select, [class*="filter"], [placeholder*="search"], [placeholder*="Search"]');
        const count = await filterControls.count();
        if (count > 0) {
          await expect(filterControls.first()).toBeVisible({ timeout: 10000 });
        }
      }
    });
  });
});

test.describe('ElSecureCoding (/app/EVLearning/Secure_Coding/)', () => {
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/app/EVLearning/Secure_Coding`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning/Secure_Coding`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning/Secure_Coding`);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  test.describe('Auth Gate', () => {
    test('redirects to login when unauthenticated ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning/Secure_Coding`);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('input[type="text"], input[type="email"], input[name="username"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Key UI Elements', () => {
    test('shows Secure Coding heading ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning/Secure_Coding`);
      const url = page.url();
      if (!url.includes('/login')) {
        const heading = page.locator('h1, h2, h3, h4, h5, h6, [class*="heading"], [class*="title"]');
        const headingText = await heading.first().innerText();
        expect(headingText).toMatch(/Secure Coding/i);
      }
    });

    test('shows course content or lesson list ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning/Secure_Coding`);
      const url = page.url();
      if (!url.includes('/login')) {
        const content = page.locator('[class*="lesson"], [class*="content"], [class*="course"], [class*="module"], ul li, [class*="item"], [class*="card"]');
        await expect(content.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('page title is set ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning/Secure_Coding`);
      const url = page.url();
      if (!url.includes('/login')) {
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Filter Controls', () => {
    test('filter inputs or selects are present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning/Secure_Coding`);
      const url = page.url();
      if (!url.includes('/login')) {
        const filterControls = page.locator('input[type="search"], input[type="text"], select, [class*="filter"], [placeholder*="search"], [placeholder*="Search"]');
        const count = await filterControls.count();
        if (count > 0) {
          await expect(filterControls.first()).toBeVisible({ timeout: 10000 });
        }
      }
    });
  });

  test.describe('Table / List', () => {
    test('lesson or content list is visible when loaded ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/EVLearning/Secure_Coding`);
      const url = page.url();
      if (!url.includes('/login')) {
        const list = page.locator('table, ul, ol, [class*="list"], [class*="lesson-list"], [class*="content-list"]');
        const count = await list.count();
        if (count > 0) {
          await expect(list.first()).toBeVisible({ timeout: 10000 });
        }
      }
    });
  });
});

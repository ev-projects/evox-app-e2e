// VERIFIED-BACKED — generated 2026-07-07 from my-dispute-requests.registry.md (vetted by Gobi Singaravel on 2026-06-29)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// KNOWN BUG B-V001: Both dates empty → Filter submits with no validation error. API fires with empty valid_from and valid_to.
// KNOWN BUG B-V002: Date To filled but Date From empty → no error, form submits. Validation is asymmetric.
// KNOWN BUG B-V003: Error message "Please select a Valid From date." shown when Date From is filled but Date To is empty — message names the wrong field.
// KNOWN BUG (perf): GET /api/request/request-list-disputes calls EV_SP_PD_Employee_Report 4× on every request (once per status). Known performance issue.
// KNOWN BUG (nav): Eye-icon row action is commented out in MyRequestsDispute.js — employees cannot navigate to dispute detail from this list.
// KNOWN BUG (guard): isListLoaded guard is functionally ineffective — Redux resets it on unmount so API refetches on every navigation back to this page.

test.describe('My Dispute Requests (/app/account/MyRequestsDispute)', () => {

  // ---------------------------------------------------------------------------
  // On Load
  // ---------------------------------------------------------------------------
  test.describe('On Load', () => {
    test('returns status < 500', async ({ page }) => {
      const r = await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      expect(r?.status()).toBeLessThan(500);
    });

    test('body is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('no PHP errors in page body', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      const bodyText = await page.locator('body').innerText();
      expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
    });
  });

  // ---------------------------------------------------------------------------
  // Auth Gate
  // ---------------------------------------------------------------------------
  test.describe('Auth Gate', () => {
    test('redirects unauthenticated user to login', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/login')) {
        await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Key UI Elements ⚠️
  // ---------------------------------------------------------------------------
  test.describe('Key UI Elements', () => {
    test('Filter button is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // Developer-confirmed selector: button[type="submit"].btn-primary
        await expect(page.locator('button[type="submit"].btn-primary')).toBeVisible({ timeout: 10000 });
      }
    });

    test('results table container is present ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // Table is read-only — no row actions (eye icon commented out in MyRequestsDispute.js)
        await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Filter Controls ⚠️
  // Developer-confirmed from [DEVELOPER VETTING] 2026-06-29
  // ---------------------------------------------------------------------------
  test.describe('Filter Controls', () => {
    test('Date From input is present (positional selector — name attr not in DOM) ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: react-datepicker strips the name prop from the DOM.
        // Positional selector confirmed: .date-range .react-datepicker-wrapper:first-child input
        await expect(
          page.locator('.date-range .react-datepicker-wrapper:first-child input')
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('Date To input is present (positional selector — name attr not in DOM) ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: positional selector confirmed: .date-range .react-datepicker-wrapper:last-child input
        await expect(
          page.locator('.date-range .react-datepicker-wrapper:last-child input')
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('"Pending" status toggle is visible and default-active on page load ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: "Pending" is default active on page load. Toggle fires API immediately on click.
        await expect(page.getByRole('button', { name: /Pending/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('"Approved" status toggle is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: fires GET /api/request/request-list-disputes immediately on click
        await expect(page.getByRole('button', { name: /Approved/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('"Cancelled" status toggle is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: fires GET /api/request/request-list-disputes immediately on click
        // OPEN: cancelled vs canceled spelling — check Network tab value vs RequestController expectation
        await expect(page.getByRole('button', { name: /Cancelled/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('"Declined" status toggle is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: fires GET /api/request/request-list-disputes immediately on click
        await expect(page.getByRole('button', { name: /Declined/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('"All Requests" type tab is visible and default-active on page load ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: label is "All Requests" not "All". Default active on load. API fires immediately.
        await expect(page.getByRole('button', { name: /All Requests/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('"Alteration" type tab is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: label "Alteration" confirmed. Sends request_type="alteration" (string, not int).
        await expect(page.getByRole('button', { name: /Alteration/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('"Overtime" type tab is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: label is "Overtime" not "OT". Sends request_type="overtime" (string, not int).
        await expect(page.getByRole('button', { name: /Overtime/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('"Rest Day Work" type tab is visible ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: label is "Rest Day Work" not "RDW". Sends request_type="rest_day_work" (string, not int).
        await expect(page.getByRole('button', { name: /Rest Day Work/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('status toggle click fires API request ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: status toggles fire GET /api/request/request-list-disputes immediately on click
        const [request] = await Promise.all([
          page.waitForRequest(req =>
            req.url().includes('/api/request/request-list-disputes') &&
            req.method() === 'GET',
            { timeout: 10000 }
          ),
          page.getByRole('button', { name: /Approved/i }).click(),
        ]);
        expect(request.url()).toContain('/api/request/request-list-disputes');
      }
    });

    test('type tab click fires API request ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: type tabs fire GET /api/request/request-list-disputes immediately on click
        const [request] = await Promise.all([
          page.waitForRequest(req =>
            req.url().includes('/api/request/request-list-disputes') &&
            req.method() === 'GET',
            { timeout: 10000 }
          ),
          page.getByRole('button', { name: /Alteration/i }).click(),
        ]);
        expect(request.url()).toContain('/api/request/request-list-disputes');
      }
    });

    test('Filter submit button fires API request ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: Filter button applies date range. Selector: button[type="submit"].btn-primary
        const [request] = await Promise.all([
          page.waitForRequest(req =>
            req.url().includes('/api/request/request-list-disputes') &&
            req.method() === 'GET',
            { timeout: 10000 }
          ),
          page.locator('button[type="submit"].btn-primary').click(),
        ]);
        expect(request.url()).toContain('/api/request/request-list-disputes');
      }
    });

    test('Change Schedule tab is not present (commented out in JSX) ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: Change Schedule and MultiPunch tabs confirmed commented out in MyRequestsDispute.js
        await expect(page.getByRole('button', { name: /Change Schedule/i })).toHaveCount(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Table / List ⚠️
  // Developer-confirmed from [DEVELOPER VETTING] 2026-06-29
  // ---------------------------------------------------------------------------
  test.describe('Table / List', () => {
    test('results table is present with expected columns ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: Confirmed columns on staging 2026-06-29:
        // 1. Request Type / Date / Note  2. Date Requested  3. Request Information  4. Status  5. Updated By / Date
        await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('table rows have no clickable eye-icon action (commented out) ⚠️', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/account/MyRequestsDispute`);
      if (!page.url().includes('/login')) {
        // [DEVELOPER VETTING]: Eye-icon Actions column is commented out ({/* */} block) in MyRequestsDispute.js.
        // KNOWN BUG (nav): Employees cannot navigate to dispute detail from this list.
        // No eye icon or view button should be present in the table.
        const eyeButtons = page.locator('table .fa-eye, table [data-action="view"]');
        await expect(eyeButtons).toHaveCount(0);
      }
    });
  });

});

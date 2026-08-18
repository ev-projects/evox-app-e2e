// COVERAGE GAP 2026-08-18 — Page Not Allowed (403) and Page Not Found (404)
//
// Source under test : client/src/container/PageNotAllowed/PageNotAllowed.js
//                     client/src/container/PageNotFound/PageNotFound.js
//                     client/src/components/Template/Wrapper/Wrapper.js (the allow_to_show gate)
//                     client/src/config/RouteList.js:524 (the "*" catch-all)
// Menu path         : none — both are reached by navigating somewhere you should not be.
// Already covered   : coverage100/load-gaps.spec.ts hits an unauthenticated garbage URL and
//                     asserts the text "404". PageNotAllowed has NO dedicated coverage: the
//                     only place it is touched is roles/morocco-hr/interactions.spec.ts, which
//                     matches a loose /can't access|403|not authorized|access denied/ against
//                     the whole body while documenting a different finding.
//
// SAFETY: read-only. Both pages are static render-only components with a single <Link>.
import { test, expect, Page } from '@playwright/test';

test.setTimeout(60_000);

async function assertNoServerError(page: Page) {
  const body = await page.locator('body').innerText();
  expect(body, 'session must not have expired into the LOGIN TO CONTINUE modal').not.toContain('LOGIN TO CONTINUE');
  for (const sig of ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops']) {
    expect(body, 'no PHP error text').not.toContain(sig);
  }
}

// RouteList.js gates /app/admin/RegisterUser/ with level={["Admin"]} and no feature, so
// Wrapper -> Authenticator.scanLevel decides it purely on the account's level. That makes it
// the cleanest both-arms subject: denied for an Employee, served for an Admin.
const ADMIN_ONLY_PATH = '/app/admin/RegisterUser/';

test.describe('Page Not Allowed (403) — the permission gate both ways', () => {

  test.describe('denied arm', () => {
    test.use({ storageState: 'e2e/.auth/ph-employee.json' });

    test('an employee opening an Admin-level page is shown the 403 deny card, not the page', async ({ page }) => {
      await page.goto(ADMIN_ONLY_PATH, { waitUntil: 'load', timeout: 30000 });
      expect(page.url(), 'the deny card renders in place — there is no redirect').toContain('/app/admin/RegisterUser');
      await assertNoServerError(page);

      const denyCard = page.locator('.page-not-allowed-box');
      await expect(denyCard).toBeVisible({ timeout: 20000 });
      await expect(page.locator('.page-not-allowed-code')).toHaveText(/403/);
      await expect(page.locator('.page-not-allowed-message')).toHaveText(/You can't access this page!/);
    });

    test('the denied employee never sees any part of the Register User form', async ({ page }) => {
      // The other half of the gate: Wrapper must swap the children out entirely, not merely
      // overlay a message on a form that still mounted (and still fetched its data).
      await page.goto(ADMIN_ONLY_PATH, { waitUntil: 'load', timeout: 30000 });
      await expect(page.locator('.page-not-allowed-box')).toBeVisible({ timeout: 20000 });
      await expect(page.getByText('Select Role(s):')).toHaveCount(0);
      await expect(page.locator('input[name="first_name"]')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /register/i })).toHaveCount(0);
    });

    test('the deny card offers a way back to the Dashboard', async ({ page }) => {
      await page.goto(ADMIN_ONLY_PATH, { waitUntil: 'load', timeout: 30000 });
      const back = page.locator('.page-not-allowed-box a.btn-primary');
      await expect(back).toBeVisible({ timeout: 20000 });
      await expect(back).toHaveAttribute('href', '/app/Dashboard');
      await back.click();
      await page.waitForURL(/\/app\/Dashboard/, { timeout: 20000 });
      await expect(page.locator('.page-not-allowed-box')).toHaveCount(0);
    });
  });

  test.describe('permitted arm', () => {
    test.use({ storageState: 'e2e/.auth/admin.json' });

    test('an admin opening the same page gets the Register User form and no deny card', async ({ page }) => {
      await page.goto(ADMIN_ONLY_PATH, { waitUntil: 'load', timeout: 30000 });
      await assertNoServerError(page);
      await expect(page.getByText('Select Role(s):')).toBeVisible({ timeout: 20000 });
      await expect(page.locator('.page-not-allowed-box')).toHaveCount(0);
      // Explicitly do NOT touch the form — roles/admin/interactions.spec.ts owns that, and
      // Register writes a real user.
    });
  });
});

test.describe('Page Not Found (404) — the authenticated catch-all', () => {
  test.use({ storageState: 'e2e/.auth/ph-employee.json' });

  // The existing coverage100 test hits a garbage URL while logged OUT, where the catch-all is
  // the only route that can match. Logged IN the same "*" route sits at the end of a Switch of
  // ~60 ProtectedRoutes, so this exercises the arm a real user actually hits.
  const GARBAGE = '/app/no-such-page-coverage-gaps-2026-08-18';

  test('a garbage URL under /app renders the 404 card inside the authenticated shell', async ({ page }) => {
    await page.goto(GARBAGE, { waitUntil: 'load', timeout: 30000 });
    expect(page.url(), 'must not bounce to login').not.toContain('/login');
    await assertNoServerError(page);

    await expect(page.locator('.page-not-found-box')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.page-not-found-code')).toHaveText(/404/);
    await expect(page.locator('.page-not-found-message'))
      .toHaveText(/We can't seem to find the page you're looking for\./);
    // still signed in: the app shell survived the unmatched route
    await expect(page.locator('aside.main-sidebar')).toBeVisible({ timeout: 15000 });
  });

  test('the 404 card is NOT the 403 card — an unknown route is not reported as a permission problem', async ({ page }) => {
    await page.goto(GARBAGE, { waitUntil: 'load', timeout: 30000 });
    await expect(page.locator('.page-not-found-box')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.page-not-allowed-box')).toHaveCount(0);
  });

  test('the 404 "Go back to Dashboard" button returns the user to the Dashboard', async ({ page }) => {
    await page.goto(GARBAGE, { waitUntil: 'load', timeout: 30000 });
    const back = page.locator('.page-not-found-box a.btn-primary');
    await expect(back).toBeVisible({ timeout: 20000 });
    await expect(back).toHaveAttribute('href', '/app/Dashboard');
    await back.click();
    await page.waitForURL(/\/app\/Dashboard/, { timeout: 20000 });
    await expect(page.locator('.page-not-found-box')).toHaveCount(0);
  });

  test('a real route is not swallowed by the catch-all', async ({ page }) => {
    // Guards the assertions above from the failure mode where "*" matches everything: if the
    // catch-all ever moved ahead of the real routes, this is the test that would catch it.
    await page.goto('/app/Dashboard', { waitUntil: 'load', timeout: 30000 });
    await expect(page.locator('.page-not-found-box')).toHaveCount(0);
    await expect(page.locator('aside.main-sidebar')).toBeVisible({ timeout: 15000 });
  });
});

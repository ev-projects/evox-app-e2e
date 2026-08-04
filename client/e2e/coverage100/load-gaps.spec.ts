// DRAFT — generated 2026-07-09, closes the "no load test" gaps flagged in
// coverage-max/consolidated/findings/PAGE-COVERAGE-AUDIT.md §3a.
//
// Scope: LOAD tests only (page.goto + render/assert). No state-changing
// actions are performed anywhere in this file — see the RequestEmailApproval
// block below for the specific safeguard on that route.
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

const PHP_ERROR_SIGNATURES = [/Fatal error/, /Parse error/, /Uncaught Error/, /Whoops/];

function expectNoPhpError(body: string) {
  for (const sig of PHP_ERROR_SIGNATURES) {
    expect(body, `no PHP error text (${sig})`).not.toMatch(sig);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// PUBLIC: AuthenticateClient (/authenticate-client) — SSO handshake entry
// point. With no ?token= / ?code= query param it takes the "no-op" branch
// (componentWillMount does nothing) and just renders the "Authenticating,
// please wait..." holding card. That is the safe, non-mutating path to load.
// ──────────────────────────────────────────────────────────────────────────
test.describe('AuthenticateClient (/authenticate-client)', () => {
  test('loads without a server error, no query params (no-op SSO branch)', async ({ page }) => {
    const resp = await page.goto(`${BASE_URL}/authenticate-client`);
    expect(resp?.status(), 'HTTP status').toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    expectNoPhpError(await page.locator('body').innerText());
  });

  test('renders the authenticating holding card, does not bounce to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/authenticate-client`);
    expect(page.url(), 'this route is public — must not force a /login redirect').not.toContain('/login');
    await expect(page.getByText(/Authenticating, please wait/i)).toBeVisible({ timeout: 10000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PUBLIC, STATE-CHANGING ENDPOINT — READ-ONLY TEST ONLY.
// RequestEmailApproval (/request/approval/:hashCode/:status?)
//
// SAFETY: the hashCode below is a random string that cannot decode to any
// real request record (see parse_hash_code_to_request_detail_array() in
// RequestController::change_request_status_via_hash_code, server/app/
// Modules/Request/Http/Controllers/RequestController.php) — it is not a
// real employee's approval link, so no request's status can be changed by
// running this test. This test asserts the "invalid link" error state only;
// it never asserts or exercises an actual approve/reject.
// ──────────────────────────────────────────────────────────────────────────
test.describe('RequestEmailApproval (/request/approval/:hashCode/:status?) — public, dummy hash only', () => {
  const DUMMY_HASH = 'coverage100-load-test-invalid-hash-do-not-use';

  test('loads without a server error for an invalid hash', async ({ page }) => {
    const resp = await page.goto(`${BASE_URL}/request/approval/${DUMMY_HASH}/reject`);
    expect(resp?.status(), 'HTTP status').toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    expectNoPhpError(await page.locator('body').innerText());
  });

  test('shows the "invalid link" handled state, not a crash and not an approval confirmation', async ({ page }) => {
    await page.goto(`${BASE_URL}/request/approval/${DUMMY_HASH}/reject`);
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 15000 });
    // Must NOT render the "request is now APPROVED/REJECTED" success copy —
    // that copy only appears when isInstanceValid is true (a real request).
    await expect(page.locator('body')).not.toContainText(/is now\s+(APPROVED|REJECTED)/i);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROTECTED: ScheduleInfo (/app/profile/:user_id/schedule/:schedule_id)
// "Fully dark" per the audit — no load test, no render test, endpoint
// untested. This is a deep-link-only detail view (no menu surfaces it), so
// there is no real schedule_id to discover from the UI; a placeholder id is
// used purely to confirm the route loads the app shell without a server
// error. It is a GET-only detail view — no submit button is clicked.
// ──────────────────────────────────────────────────────────────────────────
test.describe('ScheduleInfo (/app/profile/:user_id/schedule/:schedule_id)', () => {
  test.use({ storageState: 'e2e/.auth/ph-employee.json' });

  // ph-employee's own user id, consistent with the traverse spec (dtr/1593/)
  const USER_ID = '1593';
  const SCHEDULE_ID = '1';

  test('loads the app shell without a server error (own profile, placeholder schedule id)', async ({ page }) => {
    const resp = await page.goto(`${BASE_URL}/app/profile/${USER_ID}/schedule/${SCHEDULE_ID}`, {
      waitUntil: 'load',
      timeout: 30000,
    });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    expect(page.url(), 'must not bounce to login').not.toContain('/login');
    expectNoPhpError(await page.locator('body').innerText());
    // sidebar present = authenticated app shell survived the route, even if
    // the schedule detail itself never resolves for a placeholder id.
    await expect(page.locator('aside.main-sidebar')).toBeVisible({ timeout: 10000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PUBLIC static pages
// ──────────────────────────────────────────────────────────────────────────
test.describe('EmailNotFound (/email-not-found)', () => {
  test('loads without a server error and shows the not-linked-account message', async ({ page }) => {
    const resp = await page.goto(`${BASE_URL}/email-not-found`);
    expect(resp?.status(), 'HTTP status').toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    expectNoPhpError(await page.locator('body').innerText());
    await expect(page.getByText(/not linked to an EVOX account/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('PageNotFound (*, unmatched routes)', () => {
  test('loads without a server error and shows the 404 message', async ({ page }) => {
    const resp = await page.goto(`${BASE_URL}/this-route-does-not-exist-coverage100`);
    expect(resp?.status(), 'HTTP status').toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    expectNoPhpError(await page.locator('body').innerText());
    await expect(page.getByText(/404/)).toBeVisible({ timeout: 10000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Completeness checks requested alongside the true gaps above. Both routes
// already have load coverage via forShare/playwright/ev-learning.spec.ts +
// the role traverse specs; these are cheap, low-risk duplicates so the
// coverage100 suite is a self-contained record of all 91 routes.
// ──────────────────────────────────────────────────────────────────────────
test.describe('EVLearning + Secure Coding — completeness (already covered elsewhere)', () => {
  test.use({ storageState: 'e2e/.auth/ph-employee.json' });

  test('/app/EVLearning loads without a server error', async ({ page }) => {
    const resp = await page.goto(`${BASE_URL}/app/EVLearning`, { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    expect(page.url(), 'must not bounce to login').not.toContain('/login');
    expectNoPhpError(await page.locator('body').innerText());
    await expect(page.locator('aside.main-sidebar')).toBeVisible({ timeout: 10000 });
  });

  test('/app/EVLearning/Secure_Coding loads without a server error', async ({ page }) => {
    const resp = await page.goto(`${BASE_URL}/app/EVLearning/Secure_Coding`, { waitUntil: 'load', timeout: 30000 });
    if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    expect(page.url(), 'must not bounce to login').not.toContain('/login');
    expectNoPhpError(await page.locator('body').innerText());
    await expect(page.locator('aside.main-sidebar')).toBeVisible({ timeout: 10000 });
  });
});

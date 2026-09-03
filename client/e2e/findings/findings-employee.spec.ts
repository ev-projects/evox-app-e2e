// FINDINGS VERIFICATION — employee surface (glenn.macasarte, ph-employee state).
//
// SAFETY: read-only BY CONSTRUCTION. Where a test must press a submit control to observe
// behaviour, every non-GET request is intercepted and ABORTED before it leaves the browser
// (recorded for assertions) — nothing can reach the staging database from this file.
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/ph-employee.json' });

test.setTimeout(90_000); // staging is slow under nightly cron load

const GLENN_ID = 1593; // ph-employee user id, confirmed by the traverse spec's DTR link

async function assertHealthyPage(page: Page) {
  expect(page.url(), 'must not bounce to login').not.toContain('/login');
  const body = await page.locator('body').innerText();
  expect(body, 'session must not have expired into the LOGIN TO CONTINUE modal').not.toContain('LOGIN TO CONTINUE');
  for (const sig of ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops']) {
    expect(body, 'no PHP error text').not.toContain(sig);
  }
}

// staging can sit on its "Loading" overlay for tens of seconds under nightly load —
// wait for it to clear (best-effort; never fails the test by itself)
async function waitForAppIdle(page: Page, ms = 45000) {
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading'),
    undefined, { timeout: ms },
  ).catch(() => {});
}

// Abort every mutating request before it leaves the browser; return the recorder.
async function armWriteBlocker(page: Page): Promise<string[]> {
  const attempted: string[] = [];
  await page.route('**/*', route => {
    const req = route.request();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method())) {
      // GA/analytics beacons are also POSTs — only app-origin requests are evidence
      if (new URL(req.url()).hostname !== 'evoxtest.eastvantage.com') return route.abort(); // substring match is fooled by the GA beacon's dl= param
      attempted.push(req.method() + ' ' + req.url() + ' ' + (req.postData() || '').slice(0, 300));
      return route.abort();
    }
    return route.continue();
  });
  return attempted;
}

test.describe('findings verification — employee', () => {

  test('FE_CPWD_NOVALIDATION (open): profile password form POSTs a 1-char, mismatched password', async ({ page }) => {
    // ChangePasswordFormComponent.js:81 binds validationSchema={this.validationSchema} — an
    // instance property that does not exist (the schema is a module const declared after the
    // class). Formik therefore runs with NO validation. If the bug is live, pressing Update
    // with garbage attempts the POST; if fixed, error messages appear and nothing fires.
    await page.goto(`/app/profile/${GLENN_ID}`, { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    // the button lives on the Personal Info tab (own profile only)
    const piTab = page.locator('a[role="tab"]', { hasText: /Personal Info/i }).first();
    if (await piTab.count()) await piTab.click();
    await page.waitForTimeout(3000);
    const openBtn = page.locator('button', { hasText: /Change Password/i }).first();
    if (!(await openBtn.count())) test.skip(true, 'Change Password button not found on this profile variant');
    await openBtn.click();
    await expect(page.locator('#change_password_id')).toBeVisible({ timeout: 10000 });

    const attempted = await armWriteBlocker(page);
    await page.locator('input[name="current_password"]').fill('x');
    await page.locator('input[name="new_password"]').fill('a');            // 1 char
    await page.locator('input[name="confirm_new_password"]').fill('b');   // mismatched
    await page.locator('#change_password_id button[type="submit"]').click();
    await page.waitForTimeout(2500);

    // characterization of the LIVE bug: THE PASSWORD write is attempted despite garbage
    // input. Filter to the change_password endpoint — EVOX serves several reads over POST,
    // so an unfiltered count can be satisfied by background traffic (audit #9).
    const pwAttempts = attempted.filter(a => /change_password/i.test(a));
    expect(pwAttempts.length,
      'BUG LIVE: the change_password request should have been attempted (and was aborted). ' +
      'If this failed, check whether validation errors now render — the fix has landed. ' +
      `All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).toBeGreaterThan(0);
  });

  test('DSP-CRT-1 (evolved): what does "Submit Dispute" actually send today?', async ({ page }) => {
    // Original finding: the whole create flow was commented out. The current tree renders a
    // "Submit Dispute" button again but /storedispute is still commented out in DisputeForm.js.
    // Record (with all writes aborted) what pressing it attempts — the verdict updates the register.
    await page.goto('/app/payrolldispute/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    await page.waitForTimeout(2000);

    // DSP-CRT-1 CONFIRMED in its ORIGINAL shape (observed on staging 2026-08-07): the
    // create screen renders NO "Submit Dispute" control for an employee at all — the
    // button in DisputeForm.js:1297 never mounts on this path. Creating a payroll dispute
    // is impossible in this build. When the create flow is restored the count() goes >0,
    // this fails, and the test flips into the regression guard for the restored flow.
    const submitBtn = page.locator('button', { hasText: /Submit Dispute/i });
    await page.waitForTimeout(3000); // give the form its render window before pinning absence
    expect(await submitBtn.count(),
      'BUG LIVE (DSP-CRT-1): no Submit Dispute control renders on the create screen. ' +
      'If this failed, the create flow came back — verify and flip this test.'
    ).toBe(0);
  });
});

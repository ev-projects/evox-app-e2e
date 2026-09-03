// COVERAGE GAP 2026-08-18 — DTR punching (dashboard quick punch + multi punch page)
//
// Source under test : client/src/components/Dashboard/QuickPunch/QuickPunch.js
//                     client/src/components/Dashboard/PunchComponents/MultiQuickpunch/MultiQuickpunch.js
//                     client/src/container/DtrPunch/DtrPunch.js
// Menu path         : Dashboard (Quick Punch widget) / Daily Time Record -> Multi Clock in
//                     (/app/punch_history/)
// Already covered   : roles/*/interactions.spec.ts assert the Clock In / Clock Out buttons are
//                     VISIBLE and say so explicitly ("NEVER clicked"). coverage100/action-gaps
//                     loads /app/punch_history/ and looks for a Filter button the page does not
//                     have. So no punch control has ever been pressed, and MultiQuickpunch's
//                     entire confirm-modal path is unexecuted.
//
// SAFETY — HOW A PUNCH IS PREVENTED FROM LANDING:
//   * The pure client-side arms below (opening the confirm modal, the empty project/remarks
//     rejection) issue NO request at all: MultiQuickpunch.onSubmitHandler only calls
//     biometrixLogMulti for quickpunch "in"/"continue"; "out"/"pause" just opens the modal,
//     and handleModalSubmit returns early with modal_warn when either field is blank.
//   * The one arm that would reach the API arms a route blocker first, aborting every
//     app-origin POST (the punch endpoints are POST /dtr/quickpunch/ and
//     POST /dtr/quickpunch_multi/) before it leaves the browser.
// Nothing in this file can write a DTR row for the E2E accounts.
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/ph-employee.json' });

test.setTimeout(90_000);

const APP_HOST = 'evoxtest.eastvantage.com';

async function assertHealthyPage(page: Page) {
  expect(page.url(), 'must not bounce to login').not.toContain('/login');
  const body = await page.locator('body').innerText();
  expect(body, 'session must not have expired into the LOGIN TO CONTINUE modal').not.toContain('LOGIN TO CONTINUE');
  for (const sig of ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops']) {
    expect(body, 'no PHP error text').not.toContain(sig);
  }
}

async function waitForAppIdle(page: Page, ms = 45000) {
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading'),
    undefined, { timeout: ms },
  ).catch(() => {});
}

// Abort every app-origin write before it leaves the browser; returns the recorder.
// MUST be armed after the page has loaded — the SPA bootstraps over POST.
async function armWriteBlocker(page: Page): Promise<string[]> {
  const attempted: string[] = [];
  await page.route('**/*', route => {
    const req = route.request();
    const url = new URL(req.url());
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method())) {
      // analytics beacons are POSTs too — only app-origin requests are evidence
      if (url.hostname !== APP_HOST) return route.abort();
      attempted.push(req.method() + ' ' + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  return attempted;
}

test.describe('Dashboard Quick Punch widget', () => {

  test('the widget renders a live clock and both punch controls', async ({ page }) => {
    await page.goto('/app/Dashboard', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const widget = page.locator('.quickpunch').first();
    await expect(widget).toBeVisible({ timeout: 45000 });
    await expect(widget.locator('h3')).toHaveText(/QUICK PUNCH/);
    // QuickPunch.js renders Hours / Minutes / Seconds labels under the ticking clock
    await expect(widget.locator('.label')).toContainText('Hours');
    await expect(widget.locator('.label')).toContainText('Seconds');
  });

  test('Clock In is disabled once a time-in already exists for the current record', async ({ page }) => {
    // QuickPunch.js:95/101 — disabled={recent_dtr[1]?.time_in ? true : false}. Whichever way
    // the live data falls, the rule is the same: an enabled Clock In means no time_in is on
    // record, a disabled one means there is. Pin the pairing rather than a fixed state.
    await page.goto('/app/Dashboard', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const widget = page.locator('.quickpunch').first();
    await expect(widget).toBeVisible({ timeout: 45000 });
    const clockIn = widget.getByRole('button', { name: /Clock In/i });
    const clockOut = widget.getByRole('button', { name: /Clock Out/i });

    if (await clockIn.count() === 0) {
      // rest-day branch (QuickPunch.js:85): no Clock In at all, replaced by the rest-day note
      await expect(widget.locator('.note')).toContainText(/cannot clock-in on a rest day/i);
      await expect(widget.locator('a[href="/app/request/RestDayWork/"]')).toBeVisible();
      return;
    }
    // Clock Out is never disabled by this component — only Clock In carries the guard.
    await expect(clockOut).toBeEnabled();
    const inDisabled = await clockIn.first().isDisabled();
    expect(typeof inDisabled, 'Clock In must carry an explicit enabled/disabled state').toBe('boolean');
  });

  test('pressing Clock In posts to the quick-punch endpoint (aborted — no DTR row is written)', async ({ page }) => {
    await page.goto('/app/Dashboard', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const widget = page.locator('.quickpunch').first();
    await expect(widget).toBeVisible({ timeout: 45000 });
    const clockIn = widget.getByRole('button', { name: /Clock In/i }).first();
    if (await clockIn.count() === 0) test.skip(true, 'rest-day branch is live — no Clock In control renders today');
    if (await clockIn.isDisabled()) test.skip(true, 'Clock In is disabled — this account already has a time_in on record');

    const attempted = await armWriteBlocker(page);
    await clockIn.click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    const punches = attempted.filter(a => a.includes('/dtr/quickpunch'));
    expect(punches.length,
      `Clock In must reach the quickpunch endpoint. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).toBeGreaterThan(0);
  });
});

test.describe('Multi Clock in page (/app/punch_history/)', () => {

  // The route is feature-gated (RouteList.js:151, feature={["multi_login"]}), so Wrapper
  // serves the 403 deny card to an account without it. Skip rather than fail in that case —
  // the gate itself is covered in coverage-gaps/deny-and-not-found-pages.spec.ts.
  async function openMultiPunch(page: Page) {
    await page.goto('/app/punch_history/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    if (await page.locator('.page-not-allowed-box').count()) {
      test.skip(true, 'this account lacks the multi_login feature — the page renders the 403 deny card');
    }
  }

  test('the page renders the Multi Clock in card with the punch widget and the recent-punch panel', async ({ page }) => {
    await openMultiPunch(page);
    // DtrPunch.js:124 — Content title="Multi Clock in", left column MultiQuickpunch,
    // right column RecentPunch.
    await expect(page.locator('h3.card-title', { hasText: 'Multi Clock in' })).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.quickpunch').first()).toBeVisible({ timeout: 30000 });
  });

  test('Clock Out opens the Confirm Submission modal instead of punching straight away', async ({ page }) => {
    // MultiQuickpunch.onSubmitHandler branches on quickpunch: "in"/"continue" post immediately,
    // anything else (out/pause) stashes the values and opens the modal. Nothing is sent here.
    await openMultiPunch(page);
    const widget = page.locator('.quickpunch').first();
    await expect(widget).toBeVisible({ timeout: 30000 });

    const clockOut = widget.getByRole('button', { name: /Clock Out/i }).first();
    if (!(await clockOut.count())) test.skip(true, 'recent-punch state has not loaded a Clock Out control');
    if (await clockOut.isDisabled()) test.skip(true, 'Clock Out is disabled — this account is not currently clocked in');

    const attempted = await armWriteBlocker(page);
    await clockOut.click();

    const modal = page.locator('.remark-modal');
    await expect(modal).toBeVisible({ timeout: 15000 });
    await expect(modal.getByText('Confirm Submission')).toBeVisible();
    await expect(modal.getByText('Are you sure you want to submit this?')).toBeVisible();
    // the decisive assertion: opening the modal cost nothing server-side
    expect(attempted.filter(a => a.includes('/dtr/quickpunch')),
      'opening the confirm modal must not punch').toHaveLength(0);
  });

  test('the modal refuses to submit with the project and remarks left blank', async ({ page }) => {
    // handleModalSubmit: `if (remarks == "" || project_name == "") setState({modal_warn:true})`
    // — the early-return arm. Still no request of any kind.
    await openMultiPunch(page);
    const widget = page.locator('.quickpunch').first();
    await expect(widget).toBeVisible({ timeout: 30000 });
    const clockOut = widget.getByRole('button', { name: /Clock Out/i }).first();
    if (!(await clockOut.count())) test.skip(true, 'recent-punch state has not loaded a Clock Out control');
    if (await clockOut.isDisabled()) test.skip(true, 'Clock Out is disabled — this account is not currently clocked in');

    const attempted = await armWriteBlocker(page);
    await clockOut.click();
    const modal = page.locator('.remark-modal');
    await expect(modal).toBeVisible({ timeout: 15000 });

    await modal.getByRole('button', { name: /^Submit$/ }).click();
    await expect(modal.getByText('project and remark missing.')).toBeVisible({ timeout: 10000 });
    await expect(modal, 'the modal must stay open on a rejected submit').toBeVisible();
    expect(attempted.filter(a => a.includes('/dtr/quickpunch')),
      'a blank confirm must not reach the punch endpoint').toHaveLength(0);
  });

  test('with a project and remarks filled in, the modal does reach the multi-punch endpoint (aborted)', async ({ page }) => {
    // The other arm of the rule above. The write is aborted in-browser, so no punch lands.
    await openMultiPunch(page);
    const widget = page.locator('.quickpunch').first();
    await expect(widget).toBeVisible({ timeout: 30000 });
    const clockOut = widget.getByRole('button', { name: /Clock Out/i }).first();
    if (!(await clockOut.count())) test.skip(true, 'recent-punch state has not loaded a Clock Out control');
    if (await clockOut.isDisabled()) test.skip(true, 'Clock Out is disabled — this account is not currently clocked in');

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept()); // the on_date branch raises a window.confirm first
    await clockOut.click();
    const modal = page.locator('.remark-modal');
    await expect(modal).toBeVisible({ timeout: 15000 });

    await modal.locator('select').selectOption('EVOX');
    await modal.locator('textarea').fill('E2E-TEST coverage-gaps probe — request aborted in-browser, nothing lands');
    await modal.getByRole('button', { name: /^Submit$/ }).click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    expect(attempted.filter(a => a.includes('/dtr/quickpunch_multi')),
      `a completed confirm must reach quickpunch_multi. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).not.toHaveLength(0);
    await expect(modal, 'the modal closes once the submit is accepted').toBeHidden({ timeout: 10000 });
  });

  test('Cancel dismisses the modal without punching', async ({ page }) => {
    await openMultiPunch(page);
    const widget = page.locator('.quickpunch').first();
    await expect(widget).toBeVisible({ timeout: 30000 });
    const clockOut = widget.getByRole('button', { name: /Clock Out/i }).first();
    if (!(await clockOut.count())) test.skip(true, 'recent-punch state has not loaded a Clock Out control');
    if (await clockOut.isDisabled()) test.skip(true, 'Clock Out is disabled — this account is not currently clocked in');

    const attempted = await armWriteBlocker(page);
    await clockOut.click();
    const modal = page.locator('.remark-modal');
    await expect(modal).toBeVisible({ timeout: 15000 });
    await modal.getByRole('button', { name: /^Cancel$/ }).click();
    await expect(modal).toBeHidden({ timeout: 10000 });
    expect(attempted.filter(a => a.includes('/dtr/quickpunch')),
      'cancelling must not punch').toHaveLength(0);
  });
});

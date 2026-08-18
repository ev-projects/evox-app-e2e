// COVERAGE GAP 2026-08-18 — Profile leave credits
//
// Source under test : client/src/container/Profile/LeaveCredits/LeaveCredits.js
//                     client/src/container/Profile/TimeOff/TimeOff.js (its only mount point)
//                     client/src/container/Profile/Profile.js (the time_off tab gate)
// Menu path         : Profile -> Time Off
// Already covered   : nothing. findings/findings-employee.spec.ts opens the profile but stays
//                     on the Personal Info tab; the Time Off tab — and with it the whole
//                     leave-credits card render — has never been opened by any spec.
//
// NB the leave-credits panel has no tab of its own: Profile.js renders tabs
// personal_information / job_information / time_off / schedule / schedule_history, and
// <LeaveCredits> lives inside the Time Off tab's left column (TimeOff.js:39).
//
// SAFETY: read-only. Neither component has a submit control; the date navigator issues a
// fetchTimeOff GET.
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/ph-employee.json' });

test.setTimeout(90_000);

const GLENN_ID = 1593; // ph-employee user id, per roles/ph-employee/traverse.spec.ts

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

async function openTimeOffTab(page: Page) {
  await page.goto(`/app/profile/${GLENN_ID}`, { waitUntil: 'load', timeout: 30000 });
  await assertHealthyPage(page);
  await waitForAppIdle(page);
  const tab = page.locator('a[role="tab"]', { hasText: /Time Off/i }).first();
  if (!(await tab.count())) test.skip(true, 'Time Off tab not offered to this account (allow_view_time_off is false)');
  await tab.click();
  // Profile.js swaps the card title to the active tab via Formatter.slug_to_title
  await expect(page.locator('h3.card-title', { hasText: /Time Off/i })).toBeVisible({ timeout: 30000 });
  await waitForAppIdle(page);
}

test.describe('Profile -> Time Off — leave credits', () => {

  test('the Time Off tab renders both columns: leave credits on the left, the leave log on the right', async ({ page }) => {
    await openTimeOffTab(page);
    await expect(page.locator('.leaves-col')).toBeVisible({ timeout: 30000 });
    // right column always carries the date navigator, whether or not there are leaves
    await expect(page.locator('.report-navigator')).toBeVisible({ timeout: 30000 });
  });

  test('each leave-credit card names its leave type and shows a DAYS AVAILABLE balance', async ({ page }) => {
    await openTimeOffTab(page);
    const cards = page.locator('.leave-credits .leave-card');
    const count = await cards.count();
    if (count === 0) test.skip(true, 'this account currently has no leave type with a positive balance');

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      await expect(card.locator('.leave-card-type'), 'card must name a leave type').not.toBeEmpty();
      await expect(card.locator('.leave-card-note')).toHaveText(/DAYS AVAILABLE/);
    }
  });

  test('only leave types with a positive balance are shown — a zero balance is filtered out', async ({ page }) => {
    // LeaveCredits.js:33 wraps the whole card in `if (leave_credit.balance > 0)`. The
    // consequence a user sees is that no card ever reads 0, so pin exactly that.
    await openTimeOffTab(page);
    const balances = page.locator('.leave-credits .leave-card-balance');
    const count = await balances.count();
    if (count === 0) test.skip(true, 'this account currently has no leave type with a positive balance');

    for (let i = 0; i < count; i++) {
      const raw = (await balances.nth(i).innerText()).trim();
      const value = parseFloat(raw);
      expect(Number.isNaN(value), `balance "${raw}" must be numeric`).toBe(false);
      expect(value, `a rendered leave card must never show a non-positive balance (saw ${raw})`).toBeGreaterThan(0);
    }
  });

  test('the leave log shows dated rows, or the explicit empty-state — never both, never neither', async ({ page }) => {
    // TimeOff.js:46 branches on leaves_list.length: rows, else the "no leaves in this range"
    // line. Both arms are legitimate live states, so assert the branch is exclusive rather
    // than assuming which one this account is in.
    await openTimeOffTab(page);
    const rows = page.locator('.leave-row');
    const emptyState = page.locator('.no-leaves-row');
    await expect(rows.first().or(emptyState)).toBeVisible({ timeout: 30000 });

    const rowCount = await rows.count();
    const emptyCount = await emptyState.count();
    if (rowCount > 0) {
      expect(emptyCount, 'the empty-state line must not render alongside leave rows').toBe(0);
    } else {
      expect(emptyCount, 'with no leave rows the empty-state line must render').toBe(1);
      await expect(emptyState).toHaveText(/You don't have any leaves within this date range\./);
    }
  });

  test('moving the date range re-fetches the leave log without disturbing the credit cards', async ({ page }) => {
    // handleChangeDate -> fetchTimeOff(id, start, end) is a GET; the credit cards come from a
    // different slice (profile.leave_credits) and must survive the refetch.
    await openTimeOffTab(page);
    const creditsBefore = await page.locator('.leave-credits .leave-card').count();

    const prev = page.locator('.report-navigator .fa-angle-left.view-navigate');
    if (!(await prev.count())) test.skip(true, 'report navigator arrows not rendered on this variant');
    await prev.first().click();
    await page.waitForTimeout(4000);
    await assertHealthyPage(page);

    await expect(page.locator('.report-navigator')).toBeVisible();
    expect(await page.locator('.leave-credits .leave-card').count(),
      'leave-credit cards must be unaffected by a date-range change').toBe(creditsBefore);
  });
});

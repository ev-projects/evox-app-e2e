// FINDINGS VERIFICATION — supervisor surface (gary.aure, ph-supervisor state).
//
// Purpose: the findings register holds jsdom-born hypotheses; only a real browser can turn
// them into verdicts. Each test here either VERIFIES a shipped fix still holds on staging,
// or CHARACTERIZES a still-open finding (test passes while the bug is live; when a fix
// lands the test fails — flip it into the regression guard, same convention as Jest).
//
// SAFETY: read-only. Nothing here clicks a mutating control; date navigation and view
// toggles only trigger GET/report fetches.
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/ph-supervisor.json' });

test.setTimeout(90_000); // staging is slow under nightly cron load

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

test.describe('findings verification — supervisor', () => {

  test('FE-TAS-1 FIX HOLDS: attendance date navigation requests the NEW range, not the stale one', async ({ page }) => {
    // The fix (comment "FE-TAS-1" in TeamAttendanceSummary.js) passes the new dates into
    // handleSubmit explicitly. If it regresses, the fetch after clicking "next" carries
    // TODAY's date again instead of tomorrow's.
    await page.goto('/app/report/TeamAttendanceSummary/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    await expect(page.locator('.report-navigator')).toBeVisible({ timeout: 15000 });
    // let the initial (today) fetch settle so we only capture the navigation fetch
    await page.waitForTimeout(3000);

    const captured: string[] = [];
    page.on('request', req => {
      if (req.method() === 'GET' || req.method() === 'POST') {
        captured.push(req.url() + ' ' + (req.postData() || ''));
      }
    });

    await page.locator('.fa-angle-right.view-navigate').click();
    await page.waitForTimeout(4000); // give the report fetch time to fire

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const hits = captured.filter(c => c.includes(fmt(tomorrow)));
    expect(hits.length, `a request after "next" must carry tomorrow (${fmt(tomorrow)}); captured: ${captured.length} requests`).toBeGreaterThan(0);
  });

  test('SD-LEAVES-1 (open): an empty leaves day renders a BLANK table, never "No Leaves Found"', async ({ page }) => {
    // SummaryDashbord.js:390 gates on `dashboard.todayleaves ? map : msg`; [] is truthy so
    // the empty-state message is unreachable. Only verifiable when today truly has 0 leaves.
    await page.goto('/app/Dashboard', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    // the summary lives under the "EVOX Summary" dashboard tab (DashboardTabs eventKey evox-summary)
    const summaryTab = page.locator('a[role="tab"]', { hasText: /Summary/i }).first();
    if (await summaryTab.count()) await summaryTab.click();
    await page.waitForTimeout(4000); // dashboard SP fetch is slow
    const todayTab = page.locator('a[role="tab"], a, button', { hasText: /Today \(\d+\)/ }).first();
    if (!(await todayTab.count())) test.skip(true, 'summary leaves tabs not on this dashboard variant');
    const label = await todayTab.innerText();
    const count = parseInt((label.match(/\((\d+)\)/) || [])[1] || '0', 10);
    test.skip(count > 0, `today has ${count} leaves — empty-state arm not reachable with live data`);
    // characterization: the message SHOULD show here, and does not (the bug)
    await expect(page.getByText('No Leaves Found')).toHaveCount(0);
  });

  test('MTS-SCOPE-1 / MTS-HOLIDAY-1 verdict: Week toggle works correctly in a REAL browser', async ({ page }) => {
    // Register hypotheses (from jsdom): SCOPE-1 says the day view keeps painting after
    // switching to Week (scope_type mutated without setState); HOLIDAY-1 says the week
    // repaint crashes to a blank page when the store holds a daily payload.
    // VERIFIED ON STAGING 2026-08-06: NEITHER reproduces. The Weekly click goes through the
    // navigator's handleChangeDate → redux dispatch → connected-props re-render, which
    // repaints with the mutated scope_type — the mutation is real in the source but masked
    // live. This test locks the healthy behaviour in as the regression guard.
    await page.goto('/app/team/MyTeamSchedule', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    const daySched = page.locator('.today-sched');
    await expect(daySched, 'day view is the default').toBeVisible({ timeout: 15000 });

    // ReportNavigator renders react-bootstrap Tabs titled Today / Weekly / Monthly / Custom
    const weekTab = page.locator('.view-type-tabs a[role="tab"]', { hasText: /^Weekly$/i }).first();
    if (!(await weekTab.count())) test.skip(true, 'Weekly tab not found — navigator variant differs');
    await weekTab.click();
    await page.waitForTimeout(3000);

    // HOLIDAY-1 arm: the page must not have unmounted to blank
    const rootText = await page.locator('#root').innerText();
    expect(rootText.trim().length, 'app must not unmount to a blank page').toBeGreaterThan(50);

    // SCOPE-1 arm: the day container must be REPLACED by the week grid
    await expect(daySched, 'day view must unmount after Weekly is selected').toBeHidden();
    // (the header renders "Monday" and uppercases it via CSS — match case-insensitively,
    // scoped to visible text to avoid hidden duplicates)
    await expect(page.locator('th,td,div').filter({ hasText: /^monday$/i }).last(),
      'week grid weekday header must render').toBeVisible({ timeout: 10000 });
  });

  test('BUG-7 hypothesis check: /app/schedule/template/:id (TemplateEdit) in a REAL browser', async ({ page }) => {
    // Register claims the route crashes on v3-style props.params. But ProtectedRoutes.js
    // clones `params: computedMatch.params` onto children, so the claim may be a
    // test-harness artifact. Discover a real template id from the list, open it, observe.
    await page.goto('/app/schedule/template/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    await page.waitForTimeout(2000);
    const edit = page.locator('a[href*="/app/schedule/template/"]').first();
    if (!(await edit.count())) test.skip(true, 'no template rows visible for this supervisor');
    const href = await edit.getAttribute('href');
    await page.goto(href!, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);
    const rootText = await page.locator('#root').innerText();
    // verdict assertion: if this PASSES, BUG-7's "crashes the whole route" claim is FALSE
    // for TemplateEdit in a real browser (ProtectedRoute injects params) — update register.
    expect(rootText.trim().length, `TemplateEdit at ${href} must render, not white-screen`).toBeGreaterThan(50);
    await assertHealthyPage(page);
    await waitForAppIdle(page);
  });
});

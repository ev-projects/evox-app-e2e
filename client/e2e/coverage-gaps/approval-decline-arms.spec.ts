// COVERAGE GAP 2026-08-18 — approve / decline from the approver's seat, and bulk actions
//
// Source under test : client/src/components/RequestComponent/RequestButtons/RequestButtons.js
//                     client/src/container/Request/RestDayWork, .../ChangeSchedule
//                     client/src/container/MyTeam/MyTeamRequests/MyTeamRequests.js (bulk action)
//                     client/src/store/actions/requests/{restDayWork,changeSchedule}Actions.js
//                     client/src/store/actions/filters/requestListActions.js (bulkRequest)
// Menu path         : My Team -> My Team Requests -> (open a request) -> Approve / Decline
// Already covered   : flows/overtime-submit-approve-cancel.spec.ts really approves and really
//                     declines — but only an OVERTIME request. roles/ph-supervisor asserts
//                     Approve/Decline are visible and says "never click". So the decline path
//                     for Rest Day Work and Change of Schedule, and the bulk-action control
//                     entirely, have never been pressed.
//
// SAFETY: no request status changes. Every click that could decide a real employee's request
// arms a route blocker first, aborting the app-origin POST
// (/request/rest_day_work/<status>/<id>, /request/change_schedule/<status>/<id>,
// /request/bulk-request/) before it leaves the browser.
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/ph-supervisor.json' });

test.setTimeout(120_000);

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

async function armWriteBlocker(page: Page): Promise<string[]> {
  const attempted: string[] = [];
  await page.route('**/*', route => {
    const req = route.request();
    const url = new URL(req.url());
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method())) {
      if (url.hostname !== APP_HOST) return route.abort();
      attempted.push(req.method() + ' ' + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  return attempted;
}

// Open the first request of a given type from My Team Requests. Returns false when this
// supervisor currently has none of that type to act on.
async function openFirstRequestOfType(page: Page, tabLabel: string): Promise<boolean> {
  await page.goto('/app/team/MyTeamRequests', { waitUntil: 'load', timeout: 30000 });
  await assertHealthyPage(page);
  await waitForAppIdle(page);

  const tab = page.getByRole('tab', { name: tabLabel, exact: true });
  if (!(await tab.count())) return false;
  await tab.click();
  await page.waitForTimeout(3000);

  // Pending is where Approve AND Decline are both offered (RequestButtons.js).
  const pending = page.locator('.request_list_btn', { hasText: 'Pending' }).first();
  if (await pending.count()) {
    await pending.click();
    await page.waitForTimeout(3000);
  }

  const viewLink = page.locator('tbody.request_list a.nav-link').first();
  if (!(await viewLink.count())) return false;
  await viewLink.click();
  await waitForAppIdle(page);
  await assertHealthyPage(page);
  return true;
}

for (const subject of [
  { tab: 'Rest Day Work',   endpoint: 'rest_day_work' },
  { tab: 'Change Schedule', endpoint: 'change_schedule' },
]) {

  test.describe(`${subject.tab} — approver actions`, () => {

    test(`a pending ${subject.tab} request offers its approver both Approve and Decline`, async ({ page }) => {
      const opened = await openFirstRequestOfType(page, subject.tab);
      if (!opened) test.skip(true, `no pending ${subject.tab} requests are waiting on this supervisor`);

      await expect(page.locator('textarea[name="approver_note"]')).toBeVisible({ timeout: 20000 });
      await expect(page.locator('button', { hasText: /Approve/i }).first()).toBeVisible();
      await expect(page.locator('button', { hasText: /Decline/i }).first()).toBeVisible();
      // and the employee-side controls are NOT offered to the approver
      await expect(page.locator('button', { hasText: /^\s*Submit\s*$/i })).toHaveCount(0);
    });

    test(`declining a ${subject.tab} request posts to its decline endpoint (aborted — status unchanged)`, async ({ page }) => {
      const opened = await openFirstRequestOfType(page, subject.tab);
      if (!opened) test.skip(true, `no pending ${subject.tab} requests are waiting on this supervisor`);

      const decline = page.locator('button', { hasText: /Decline/i }).first();
      if (!(await decline.count())) test.skip(true, 'this request is not in a state that offers Decline');

      const note = page.locator('textarea[name="approver_note"]');
      if (await note.count()) await note.fill('E2E-TEST coverage-gaps probe — request aborted in-browser, status unchanged');

      const attempted = await armWriteBlocker(page);
      page.on('dialog', d => d.accept());
      await decline.click();
      await page.waitForTimeout(4000);
      await assertHealthyPage(page);

      const writes = attempted.filter(a => a.includes(subject.endpoint));
      expect(writes,
        `Decline must reach /request/${subject.endpoint}/decline/<id>. All aborted writes: ${attempted.join(' | ') || 'none'}`
      ).not.toHaveLength(0);
      expect(writes.join(' '), 'the decline endpoint carries the decline status segment').toMatch(/decline/i);
    });

    test(`approving a ${subject.tab} request posts to its approve endpoint (aborted — status unchanged)`, async ({ page }) => {
      // The other arm: same button pair, different action value, different URL segment.
      const opened = await openFirstRequestOfType(page, subject.tab);
      if (!opened) test.skip(true, `no pending ${subject.tab} requests are waiting on this supervisor`);

      const approve = page.locator('button', { hasText: /Approve/i }).first();
      if (!(await approve.count())) test.skip(true, 'this request is not in a state that offers Approve');

      const attempted = await armWriteBlocker(page);
      page.on('dialog', d => d.accept());
      await approve.click();
      await page.waitForTimeout(4000);
      await assertHealthyPage(page);

      const writes = attempted.filter(a => a.includes(subject.endpoint));
      expect(writes,
        `Approve must reach /request/${subject.endpoint}/approve/<id>. All aborted writes: ${attempted.join(' | ') || 'none'}`
      ).not.toHaveLength(0);
      expect(writes.join(' '), 'the approve endpoint carries the approve status segment').toMatch(/approve/i);
    });
  });
}

test.describe('My Team Requests — bulk action', () => {

  test('the bulk-action control offers exactly Approved and Deny', async ({ page }) => {
    await page.goto('/app/team/MyTeamRequests', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const bulk = page.locator('select[name="bulk_action"]');
    if (!(await bulk.count())) test.skip(true, 'bulk action control not offered to this account');
    await expect(bulk).toBeVisible({ timeout: 20000 });
    await expect(bulk.locator('option[value="approve"]')).toHaveCount(1);
    await expect(bulk.locator('option[value="deny"]')).toHaveCount(1);
    // no third state — a bulk cancel/reopen would be a new capability, not a styling change
    await expect(bulk.locator('option')).toHaveCount(3); // "Select Action" placeholder + 2
  });

  test('pressing Update with nothing chosen is refused, and nothing is sent', async ({ page }) => {
    // MyTeamRequests.js validationSchema: when action == 'bulk_action', both checkedList
    // ("Select a record to be updated") and bulk_action ("Please choose action") are required.
    await page.goto('/app/team/MyTeamRequests', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const bulkUpdate = page.locator('.bulk-action button[type="submit"]', { hasText: /Update/i }).first();
    if (!(await bulkUpdate.count())) test.skip(true, 'bulk Update control not offered to this account');

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    await bulkUpdate.click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    await expect(page.getByText('Please choose action').or(page.getByText('Select a record to be updated')))
      .toBeVisible({ timeout: 15000 });
    expect(attempted.filter(a => a.includes('bulk-request')),
      `an empty bulk submit must not reach /request/bulk-request/. Saw: ${attempted.join(' | ') || 'none'}`
    ).toHaveLength(0);
  });

  test('with a row ticked and Deny chosen, Update does reach the bulk endpoint (aborted)', async ({ page }) => {
    // The passing arm of the rule above. The POST is aborted, so no employee's request is
    // touched — but the path from checkbox to endpoint is exercised end to end in the browser.
    await page.goto('/app/team/MyTeamRequests', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const bulk = page.locator('select[name="bulk_action"]');
    const bulkUpdate = page.locator('.bulk-action button[type="submit"]', { hasText: /Update/i }).first();
    if (!(await bulk.count()) || !(await bulkUpdate.count())) {
      test.skip(true, 'bulk action controls not offered to this account');
    }

    // MyTeamRequests.js:628 — cancelled rows render no checkbox, so any checkbox we find is
    // on an actionable row.
    const rowCheckbox = page.locator('tbody.request_list input[type="checkbox"]').first();
    if (!(await rowCheckbox.count())) test.skip(true, 'no actionable request rows in this list today');
    await rowCheckbox.check();
    await bulk.selectOption('deny');

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    await bulkUpdate.click();
    await page.waitForTimeout(4000);
    await assertHealthyPage(page);

    expect(attempted.filter(a => a.includes('bulk-request')),
      `a complete bulk submit must reach /request/bulk-request/. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).not.toHaveLength(0);
  });
});

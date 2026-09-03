// COVERAGE GAP 2026-08-18 — Alter Log Punch request
//
// Source under test : client/src/container/Request/AlterLogPunch/AlterLogPunch.js
//                     client/src/store/actions/requests/alterPunchLogActions.js
//                     client/src/components/RequestComponent/RequestButtons/RequestButtons.js
// Menu path         : Request Form -> Alter Log Punch (/app/request/AlterLogPunch/)
// Already covered   : alter-log.spec.ts and alter-punch-date.verified.spec.ts both target this
//                     page but neither sets a storageState, so they run signed out: every
//                     assertion sits behind `if (!url.includes('/login'))` and never executes.
//                     No authenticated spec touches this route at all.
//
// SAFETY: no request is created. The submit arms below arm a route blocker first, aborting
// every app-origin write (the create endpoint is POST /request/alter_log_punch) before it
// leaves the browser. The genuine create -> list -> cancel round trip is left as a fixme at
// the bottom, because landing a request on staging needs the same explicit sign-off the
// overtime write flow got (see flows/overtime-submit-approve-cancel.spec.ts).
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

// The route is feature-gated (RouteList.js:203, feature={['multi_login','view_multi_login']}),
// so an account without it gets the 403 deny card. Skip in that case — the gate itself is
// covered in coverage-gaps/deny-and-not-found-pages.spec.ts.
async function openAlterLogPunch(page: Page) {
  await page.goto('/app/request/AlterLogPunch/', { waitUntil: 'load', timeout: 30000 });
  await assertHealthyPage(page);
  await waitForAppIdle(page);
  if (await page.locator('.page-not-allowed-box').count()) {
    test.skip(true, 'this account lacks the multi_login feature — the page renders the 403 deny card');
  }
  await expect(page.locator('h3.card-title', { hasText: 'Alter Log Punch' })).toBeVisible({ timeout: 30000 });
}

// Pick the first selectable day in the datepicker (the field is capped at the user's server
// date, so "today" is always offered).
async function pickTodayInDatePicker(page: Page) {
  await page.locator('.form-group:has-text("Date:") input:visible').first().click();
  const today = page.locator('.react-datepicker__day--today').first();
  await today.waitFor({ state: 'visible', timeout: 15000 });
  await today.click();
  await page.waitForTimeout(2500); // showOriginalHandler refetches the day's punches (GET)
}

test.describe('Alter Log Punch — the request form', () => {

  test('before a date is picked the edit panel says so and offers no punch rows', async ({ page }) => {
    // AlterLogPunch.js:476 — the whole editor is behind `values.date !== null`, else the
    // "No Date Selected" placeholder. This is the arm a user always lands on.
    await openAlterLogPunch(page);
    await expect(page.getByText('No Date Selected')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.alter-punch-rows')).toHaveCount(0);
    await expect(page.locator('button:has(i.fa-plus)')).toHaveCount(0);
  });

  test('picking a date reveals the row controls, and the existing-punch panel resolves to a table or its empty line', async ({ page }) => {
    await openAlterLogPunch(page);
    await pickTodayInDatePicker(page);

    await expect(page.getByText('No Date Selected')).toHaveCount(0);
    await expect(page.locator('button:has(i.fa-plus)')).toBeVisible({ timeout: 20000 });

    // left panel: punchList.length > 0 ? table : "No  Punch logs on Date" (two spaces in source)
    const table = page.locator('.recent_punch-table');
    const emptyLine = page.getByText(/No\s+Punch logs on Date/);
    await expect(table.or(emptyLine)).toBeVisible({ timeout: 20000 });
    if (await table.count()) {
      const headers = await table.locator('thead').innerText();
      for (const col of ['Date', 'Clock In', 'Clock Out', 'Hour Count', 'Punch Status', 'Project']) {
        expect(headers, `punch table must carry the ${col} column`).toContain(col);
      }
    }
  });

  test('the remove-row button is disabled until a row exists, and enabled once one does', async ({ page }) => {
    // AlterLogPunch.js:480 — disabled={this.state.records.length === 0}. Both arms in one test
    // because the transition is the rule.
    await openAlterLogPunch(page);
    await pickTodayInDatePicker(page);

    const addBtn = page.locator('button:has(i.fa-plus)').first();
    const removeBtn = page.locator('button:has(i.fa-minus)').first();
    await expect(addBtn).toBeVisible({ timeout: 20000 });
    await expect(removeBtn, 'no rows yet — remove must be disabled').toBeDisabled();

    await addBtn.click();
    await expect(page.locator('.alter-punch-rows')).toHaveCount(1, { timeout: 15000 });
    await expect(removeBtn, 'a row exists — remove must become available').toBeEnabled();

    await removeBtn.click();
    await expect(page.locator('.alter-punch-rows')).toHaveCount(0, { timeout: 15000 });
    await expect(removeBtn, 'back to zero rows — remove is disabled again').toBeDisabled();
  });

  test('an added row asks for On Duty, Off Duty, a project and remarks', async ({ page }) => {
    await openAlterLogPunch(page);
    await pickTodayInDatePicker(page);
    await page.locator('button:has(i.fa-plus)').first().click();

    const row = page.locator('.alter-punch-rows').first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row.getByText('On Duty 1:')).toBeVisible();
    await expect(row.getByText('Off Duty:')).toBeVisible();

    const project = row.locator('select[name="new_punch.0.project_name"]');
    await expect(project).toBeVisible();
    // the option list is hard-coded in AlterLogPunch.js:530-534
    for (const value of ['EVOX', 'ODOO', 'LMS']) {
      await expect(project.locator(`option[value="${value}"]`)).toHaveCount(1);
    }
    await expect(row.locator('input[name="new_punch.0.remarks"]')).toBeVisible();
  });

  test('submitting a row with no project and no remarks is refused before anything is sent', async ({ page }) => {
    // validationSchema requires project_name ("Project worked should be stated") and remarks
    // ("Remarks are required") on every new_punch entry.
    await openAlterLogPunch(page);
    await pickTodayInDatePicker(page);
    await page.locator('button:has(i.fa-plus)').first().click();
    await expect(page.locator('.alter-punch-rows')).toHaveCount(1, { timeout: 15000 });

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    await page.locator('button[type="submit"]', { hasText: /Submit/i }).first().click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    const writes = attempted.filter(a => a.includes('alter_log_punch'));
    expect(writes,
      `an empty punch row must not reach the create endpoint. Saw: ${writes.join(' | ') || 'none'}`
    ).toHaveLength(0);
    // and the user is told why, rather than being left staring at an inert button
    await expect(page.locator('.input-feedback').first()).toBeVisible({ timeout: 10000 });
  });

  test('a completed row does reach the create endpoint (aborted — no request is filed)', async ({ page }) => {
    // The passing arm of the rule above. The POST is aborted in-browser so nothing lands.
    await openAlterLogPunch(page);
    await pickTodayInDatePicker(page);
    await page.locator('button:has(i.fa-plus)').first().click();
    const row = page.locator('.alter-punch-rows').first();
    await expect(row).toBeVisible({ timeout: 15000 });

    // InputDateTimeIndex renders react-datepicker inputs; fill the two visible ones in order.
    const times = row.locator('input.form-control:visible');
    const timeCount = await times.count();
    if (timeCount < 2) test.skip(true, 'On Duty / Off Duty inputs did not render as fillable fields');
    await times.nth(0).fill('08:00');
    await page.keyboard.press('Escape');
    await times.nth(1).fill('17:00');
    await page.keyboard.press('Escape');

    await row.locator('select[name="new_punch.0.project_name"]').selectOption('EVOX');
    await row.locator('input[name="new_punch.0.remarks"]')
      .fill('E2E-TEST coverage-gaps probe — request aborted in-browser, nothing lands');
    await page.locator('textarea[name="employee_note"]')
      .fill('E2E-TEST coverage-gaps probe — request aborted in-browser, nothing lands');

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    await page.locator('button[type="submit"]', { hasText: /Submit/i }).first().click();
    await page.waitForTimeout(4000);
    await assertHealthyPage(page);

    const writes = attempted.filter(a => a.includes('alter_log_punch'));
    expect(writes,
      `a completed punch row must reach POST /request/alter_log_punch. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).not.toHaveLength(0);
  });
});

test.describe('Alter Log Punch — the approver seat', () => {
  test.use({ storageState: 'e2e/.auth/ph-supervisor.json' });

  test('an existing punch-alteration opens with the approver note and the Approve/Decline pair', async ({ page }) => {
    // RequestButtons.js gives method='approval' a status-dependent button set: pending gets
    // Approve AND Decline, approved gets Decline only, declined gets Approve only, cancelled
    // gets neither. Discover a real row from My Team Requests rather than inventing an id.
    await page.goto('/app/team/MyTeamRequests', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const tab = page.getByRole('tab', { name: 'MultiPunch Alteration', exact: true });
    if (!(await tab.count())) test.skip(true, 'this supervisor has no MultiPunch Alteration tab (feature-gated)');
    await tab.click();
    await page.waitForTimeout(3000);

    const viewLink = page.locator('tbody.request_list a.nav-link').first();
    if (!(await viewLink.count())) test.skip(true, 'no punch-alteration rows currently awaiting this supervisor');
    await viewLink.click();
    await waitForAppIdle(page);
    await assertHealthyPage(page);

    await expect(page.locator('h3.card-title', { hasText: 'Alter Log Punch' })).toBeVisible({ timeout: 30000 });
    // the approval view swaps the employee note for a read-only echo plus an approver note box
    await expect(page.getByText("Employee's Note:")).toBeVisible({ timeout: 15000 });
    await expect(page.locator('textarea[name="approver_note"]')).toBeVisible();

    const approve = page.locator('button', { hasText: /Approve/i });
    const decline = page.locator('button', { hasText: /Decline/i });
    const buttons = (await approve.count()) + (await decline.count());
    expect(buttons,
      'a non-cancelled request must offer at least one of Approve / Decline to its approver'
    ).toBeGreaterThan(0);
    // Visibility only — clicking either one decides a real employee's request.
  });
});

test.describe('Alter Log Punch — full round trip', () => {

  // WRITE APPROVAL PRECONDITION — why this is fixme and not a running test:
  // Creating a punch alteration, seeing it listed and cancelling it means landing rows in the
  // staging database, which is a live-server backup dump. The one spec allowed to do that
  // (flows/overtime-submit-approve-cancel.spec.ts) carries an explicit "APPROVED BY VISHNU
  // 2026-08-06" note, a fixed far-future date so residue cannot grow across runs, an E2E-TEST
  // tag on every artifact and a documented cleanup step. This flow needs the same four things
  // agreed before it runs, in particular a decision on what the cleanup terminal state is:
  // AlterLogPunchRepository::destroy() and ::pending() both call AlterLog::findOrFail(), so a
  // cancel here may act on the wrong table entirely (registered as BUG-003 / BUG-004).
  // Until that is settled, cancelling an E2E punch alteration could mutate an unrelated
  // employee's alter-log record — which is why this stays unrun.
  test.fixme('an employee creates a punch alteration, sees it listed, then cancels it', async ({ page }) => {
    await openAlterLogPunch(page);
    await pickTodayInDatePicker(page);
    await page.locator('button:has(i.fa-plus)').first().click();
    // ... fill the row as in the aborted-write test above, submit for real, then:
    await page.goto('/app/account/MyRequests', { waitUntil: 'load', timeout: 30000 });
    await page.getByRole('tab', { name: 'MultiPunch Alteration', exact: true }).click();
    await expect(page.locator('tr', { hasText: 'E2E-TEST' }).first()).toBeVisible({ timeout: 30000 });
    // ... open it and press Cancel (RequestButtons method='update', status != canceled)
  });
});

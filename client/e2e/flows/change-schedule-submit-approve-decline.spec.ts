// WRITE FLOW — Change Schedule: employee submits → supervisor approves → supervisor declines (cleanup).
//
// Same contract as flows/overtime-submit-approve-cancel.spec.ts (the audited template):
// real writes on staging, E2E persona accounts only (ph-employee → ph-supervisor), E2E-TEST
// tag in the note, ONE fixed date range so residue caps at a single reusable request,
// cyclic lifecycle (declined requests offer Approve again per RequestButtons.js).
//
// Change-schedule form study (ChangeSchedule.js + ScheduleDetails.js, 2026-08-12):
//  - valid_from / valid_to: InputDate fields.
//  - Work Days: seven checkboxes (WorkDay components); a FRESH request starts with NO days
//    selected (work_days: [] in initialValue). Ticking a day pushes an empty
//    cst_schedule_details row and renders that day's time pickers.
//  - Day-row pickers are react-datepicker TIME-SELECT-ONLY dropdowns (60-min steps, HH:mm):
//    typing does not commit a value — the option must be CLICKED from the time list.
//    Picking "On Duty" auto-fills Off Duty (+9h) and Break (01:00) via
//    onSelectTimeHandlerStd; picking "Flexi Start" auto-fills Flexi End (+9h).
//  - 09:00 start / 18:00 end passes every client gate: night-shift modal fires only for
//    start <06:00 or end >22:00, and the before-flex modal only when start_time differs
//    from start_flexy_time (both are 09:00 here).
//  - Approval APPLIES the schedule to the employee's DTR days — the knowledge base flags
//    this arm as data-dependent; the healthy-page assertion carries the verdict either way.
import { test, expect, Page, Browser } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(150_000);

const TAG = `E2E-TEST-${Date.now()}`;
// FIXED far-future Monday (two weeks after the overtime flow's subject; one after RDW's).
// A single-day range keeps the unique-dates overlap rule satisfied forever.
const csDate = new Date(2027, 5, 21);
const fmtDate = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

let requestId: string | null = null;
let residueNote = 'no request created';
let cleanupRan = false;

test.afterAll(() => {
  if (!cleanupRan) console.log(`[RESIDUE] cleanup did not run — current staging state: ${residueNote}`);
});

async function pageAs(browser: Browser, role: string): Promise<Page> {
  const ctx = await browser.newContext({ storageState: `e2e/.auth/${role}.json` });
  return ctx.newPage();
}
async function assertHealthyPage(page: Page) {
  expect(page.url(), 'must not bounce to login').not.toContain('/login');
  const body = await page.locator('body').innerText();
  expect(body, 'session must not have expired into the LOGIN TO CONTINUE modal').not.toContain('LOGIN TO CONTINUE');
  for (const sig of ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops']) {
    expect(body, 'no PHP error text').not.toContain(sig);
  }
}
async function waitForAppIdle(page: Page, ms = 45000) {
  await page.waitForFunction(() => !document.body.innerText.includes('Loading'), undefined, { timeout: ms }).catch(() => {});
}

/** Click a time-select-only react-datepicker and choose an option from its list.
 *  Typing into these inputs does not commit — the list item must be clicked. */
async function pickTime(page: Page, heading: string, hhmm: string) {
  const input = page.locator(`.form-group:has(h6:has-text("${heading}")) input`).first();
  await input.click();
  const option = page.locator('li.react-datepicker__time-list-item', { hasText: hhmm }).first();
  await option.waitFor({ state: 'visible', timeout: 10000 });
  await option.click();
  await page.keyboard.press('Escape');
}

// NB: the TAG must NOT appear in any test/describe title (runner/worker title matching).
test.describe('change schedule submit → approve → decline (WRITES, E2E-TEST tagged)', () => {

  test('1. employee submits a one-day change-schedule request', async ({ browser }) => {
    const page = await pageAs(browser, 'ph-employee');
    await page.goto('/app/request/ChangeSchedule/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    await page.locator('.form-group:has-text("Valid From") input:visible').first().fill(fmtDate(csDate));
    await page.keyboard.press('Escape');
    await page.locator('.form-group:has-text("Valid To") input:visible').first().fill(fmtDate(csDate));
    await page.keyboard.press('Escape');

    // tick Monday — this both adds 'mon' to work_days and creates the day's detail row
    const monday = page.locator('.form-group:has-text("Work Days") label', { hasText: /mon/i }).first();
    await monday.locator('input[type="checkbox"]').check();

    // one day row: On Duty 09:00 auto-fills Off Duty 18:00 + Break 01:00;
    // Flexi Start 09:00 auto-fills Flexi End 18:00. All five fields land set.
    await pickTime(page, 'On Duty', '09:00');
    await pickTime(page, 'Flexi Start', '09:00');

    await page.locator('textarea[name="employee_note"]').fill(`${TAG} automated submit/approve/decline flow — please ignore`);

    page.on('dialog', d => d.accept());
    await page.locator('button[type="submit"]', { hasText: /Submit/i }).first().click();
    await page.waitForTimeout(5000);
    await assertHealthyPage(page);

    // find OUR request in My Requests (cyclic reuse of ANY E2E-TEST change schedule; rows
    // for other request types also carry E2E-TEST notes, so the row is confirmed by the
    // URL it opens)
    await page.goto('/app/account/MyRequests', { waitUntil: 'load', timeout: 30000 });
    await waitForAppIdle(page);
    await page.waitForTimeout(3000);

    let found = false;
    for (const status of ['', 'Approved', 'Declined', 'Cancelled']) {
      if (status) {
        const toggle = page.locator('.request_list_btn, button, a', { hasText: new RegExp(status, 'i') }).first();
        if (!(await toggle.count())) continue;
        await toggle.click();
        await page.waitForTimeout(3000);
      }
      const rows = page.locator('tr', { hasText: 'E2E-TEST-' });
      const n = await rows.count();
      for (let i = 0; i < n; i++) {
        const row = rows.nth(i);
        if (!(await row.isVisible().catch(() => false))) continue;
        await row.locator('td').last().locator('i, button, a, svg').first().click();
        const opened = await page.waitForURL(/\/app\/request\/ChangeSchedule\/\d+/, { timeout: 10000 }).then(() => true).catch(() => false);
        if (opened) { found = true; break; }
        await page.goto('/app/account/MyRequests', { waitUntil: 'load', timeout: 30000 });
        await waitForAppIdle(page);
        await page.waitForTimeout(2000);
        if (status) {
          const toggle = page.locator('.request_list_btn, button, a', { hasText: new RegExp(status, 'i') }).first();
          if (await toggle.count()) { await toggle.click(); await page.waitForTimeout(2000); }
        }
      }
      if (found) break;
    }
    expect(found, 'an E2E-TEST change-schedule request must exist in some status list').toBe(true);
    requestId = page.url().split('/').filter(Boolean).pop() || null;
    expect(requestId, 'request id must be extractable from the opened URL').toBeTruthy();
    residueNote = `PENDING change schedule id=${requestId} (E2E employee, ${fmtDate(csDate)}, note ${TAG})`;
    await page.context().close();
  });

  test('2. supervisor opens the request and approves it', async ({ browser }) => {
    test.skip(!requestId, 'no request id from step 1');
    const page = await pageAs(browser, 'ph-supervisor');
    await page.goto(`/app/request/ChangeSchedule/${requestId}`, { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const approveBtn = page.locator('button', { hasText: /Approve/i }).first();
    const canApprove = await approveBtn.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
    page.on('dialog', d => d.accept());
    if (canApprove) {
      await approveBtn.click();
      await page.waitForTimeout(5000);
    } else {
      const declineVisible = await page.locator('button', { hasText: /Decline/i }).first().isVisible().catch(() => false);
      expect(declineVisible, 'subject must be approvable or already approved (Decline visible)').toBe(true);
    }

    // approval applies the schedule to the employee's DTR days for the range — an error
    // page here is the data-dependent arm the knowledge base flags; healthy means the
    // change-schedule → DTR hop worked live.
    await assertHealthyPage(page);
    const body = await page.locator('body').innerText();
    expect(body, 'approval must not surface a raw error to the supervisor (schedule-apply check)').not.toMatch(/server error|internal error/i);
    residueNote = `APPROVED change schedule id=${requestId} (${fmtDate(csDate)}, note ${TAG})`;
    await page.context().close();
  });

  test('3. supervisor declines the approved request (cleanup — terminal state)', async ({ browser }) => {
    test.skip(!requestId, 'no request id from step 1');
    const page = await pageAs(browser, 'ph-supervisor');
    await page.goto(`/app/request/ChangeSchedule/${requestId}`, { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const declineBtn = page.locator('button', { hasText: /Decline/i }).first();
    const hasDecline = await declineBtn.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
    if (!hasDecline) {
      throw new Error(`CLEANUP UNAVAILABLE — residue left on staging: ${residueNote}. Remove manually if unwanted.`);
    }
    const note = page.locator('textarea[name="approver_note"]');
    if (await note.count()) await note.fill(`${TAG} declined as automated-flow cleanup`);
    page.on('dialog', d => d.accept());
    await declineBtn.click();
    await page.waitForTimeout(5000);
    await assertHealthyPage(page);

    await page.goto(`/app/request/ChangeSchedule/${requestId}`, { waitUntil: 'load', timeout: 30000 });
    await waitForAppIdle(page);
    await page.waitForTimeout(2000);
    await expect(page.locator('button', { hasText: /Approve/i }).first(),
      'declined request must offer Approve again').toBeVisible({ timeout: 15000 });
    const declineStill = await page.locator('button', { hasText: /Decline/i }).first().isVisible().catch(() => false);
    expect(declineStill, `Decline must be gone after declining (residue if not: ${residueNote})`).toBe(false);
    residueNote = `DECLINED change schedule id=${requestId} — inert while untouched, tagged E2E-TEST`;
    cleanupRan = true;
    await page.context().close();
  });
});

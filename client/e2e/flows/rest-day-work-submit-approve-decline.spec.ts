// WRITE FLOW — Rest Day Work: employee submits → supervisor approves → supervisor declines (cleanup).
//
// Same contract as flows/overtime-submit-approve-cancel.spec.ts (the audited template):
// real writes on staging, E2E persona accounts only (ph-employee → ph-supervisor), every
// artifact tagged E2E-TEST in the note fields, ONE fixed far-future date so the server's
// duplicate-date rule caps residue at a single reusable request, cyclic lifecycle
// (declined requests offer Approve again per RequestButtons.js).
//
// Rest-day-work specifics (RestDayWork.js):
//  - HIDDEN input[name="date"] at line 233 plus a visible InputDate — the picker is matched
//    by its form-group label, never by name.
//  - start_time / end_time / break_time are InputTime fields ("HH:mm").
//  - Date is FIXED and FUTURE (2027-06-14, a Monday): requesting to work an upcoming rest
//    day is the natural direction for this request type.
import { test, expect, Page, Browser } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

const TAG = `E2E-TEST-${Date.now()}`;
// FIXED far-future Monday (one week after the overtime flow's 2027-06-07 subject so the
// two flows never share a date). A rolling date would grow residue without bound.
const rdwDate = new Date(2027, 5, 14);
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

// NB: the TAG must NOT appear in any test/describe title (runner/worker title matching).
test.describe('rest day work submit → approve → decline (WRITES, E2E-TEST tagged)', () => {

  test('1. employee submits a rest-day-work request for the fixed future date', async ({ browser }) => {
    const page = await pageAs(browser, 'ph-employee');
    await page.goto('/app/request/RestDayWork/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    // hidden input[name="date"] exists — target the visible picker via its form-group only
    await page.locator('.form-group:has-text("Date") input:visible').first().fill(fmtDate(rdwDate));
    await page.keyboard.press('Escape');
    await page.locator('.form-group:has-text("Start") input:visible').first().fill('08:00');
    await page.keyboard.press('Escape');
    await page.locator('.form-group:has-text("End") input:visible').first().fill('17:00');
    await page.keyboard.press('Escape');
    await page.locator('.form-group:has-text("Break") input:visible').first().fill('01:00');
    await page.keyboard.press('Escape');
    await page.locator('textarea[name="employee_note"]').fill(`${TAG} automated submit/approve/decline flow — please ignore`);

    page.on('dialog', d => d.accept());
    await page.locator('button[type="submit"]', { hasText: /Submit/i }).first().click();
    await page.waitForTimeout(5000);
    await assertHealthyPage(page);

    // find OUR request in My Requests. Reuse ANY E2E-TEST rest-day-work subject (cyclic
    // lifecycle). Rows for other request types also carry E2E-TEST notes, so the row is
    // confirmed by the URL it opens (/app/request/RestDayWork/<id>).
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
        const opened = await page.waitForURL(/\/app\/request\/RestDayWork\/\d+/, { timeout: 10000 }).then(() => true).catch(() => false);
        if (opened) { found = true; break; }
        // wrong type (another flow's subject) — go back and try the next row
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
    expect(found, 'an E2E-TEST rest-day-work request must exist in some status list').toBe(true);
    requestId = page.url().split('/').filter(Boolean).pop() || null;
    expect(requestId, 'request id must be extractable from the opened URL').toBeTruthy();
    residueNote = `PENDING rest-day-work id=${requestId} (E2E employee, ${fmtDate(rdwDate)}, note ${TAG})`;
    await page.context().close();
  });

  test('2. supervisor opens the request and approves it', async ({ browser }) => {
    test.skip(!requestId, 'no request id from step 1');
    const page = await pageAs(browser, 'ph-supervisor');
    await page.goto(`/app/request/RestDayWork/${requestId}`, { waitUntil: 'load', timeout: 30000 });
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

    await assertHealthyPage(page);
    const body = await page.locator('body').innerText();
    expect(body, 'approval must not surface a raw error to the supervisor').not.toMatch(/server error|internal error/i);
    residueNote = `APPROVED rest-day-work id=${requestId} (${fmtDate(rdwDate)}, note ${TAG})`;
    await page.context().close();
  });

  test('3. supervisor declines the approved request (cleanup — terminal state)', async ({ browser }) => {
    test.skip(!requestId, 'no request id from step 1');
    const page = await pageAs(browser, 'ph-supervisor');
    await page.goto(`/app/request/RestDayWork/${requestId}`, { waitUntil: 'load', timeout: 30000 });
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

    await page.goto(`/app/request/RestDayWork/${requestId}`, { waitUntil: 'load', timeout: 30000 });
    await waitForAppIdle(page);
    await page.waitForTimeout(2000);
    await expect(page.locator('button', { hasText: /Approve/i }).first(),
      'declined request must offer Approve again').toBeVisible({ timeout: 15000 });
    const declineStill = await page.locator('button', { hasText: /Decline/i }).first().isVisible().catch(() => false);
    expect(declineStill, `Decline must be gone after declining (residue if not: ${residueNote})`).toBe(false);
    residueNote = `DECLINED rest-day-work id=${requestId} — inert while untouched, tagged E2E-TEST`;
    cleanupRan = true;
    await page.context().close();
  });
});

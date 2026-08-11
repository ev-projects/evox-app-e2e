// WRITE FLOW — Alter Log: employee submits → supervisor approves → supervisor declines (cleanup).
//
// Same contract as flows/overtime-submit-approve-cancel.spec.ts (the audited template):
// real writes on staging, E2E persona accounts only (ph-employee → ph-supervisor), every
// artifact tagged E2E-TEST in the note fields, ONE fixed date so the server's duplicate-date
// rule caps residue at a single reusable request, cyclic lifecycle (declined requests offer
// Approve again per RequestButtons.js) so one request serves every run.
//
// Alter-log specifics:
//  - The form carries a HIDDEN input[name="date"] (AlterLog.js:248) like Overtime — the
//    visible picker is matched by its form-group label, never by name.
//  - new_time_in / new_time_out are InputDateTime fields bounded to the chosen date
//    (AlterLog.js:286,293) — filled as "MM/DD/YYYY HH:mm".
//  - The date is FIXED and PAST (2026-01-05): alter logs correct historical days, and the
//    backend approve path rewrites the DTR row for that date. The knowledge base warns the
//    approve can 500 when no dtrs row exists for the date (BUG-6 family) — that outcome is
//    signal, not noise; the healthy-page assertion carries the verdict.
import { test, expect, Page, Browser } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

const TAG = `E2E-TEST-${Date.now()}`;
// FIXED past Monday. A rolling date would create a new request every run (duplicate-date
// rule only blocks same-date repeats) and grow residue without bound.
const alDate = new Date(2026, 0, 5);
const fmtDate = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
const fmtDateTime = (d: Date, hhmm: string) => `${fmtDate(d)} ${hhmm}`;

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
test.describe('alter log submit → approve → decline (WRITES, E2E-TEST tagged)', () => {

  test('1. employee submits an alter log for the fixed past date', async ({ browser }) => {
    const page = await pageAs(browser, 'ph-employee');
    await page.goto('/app/request/AlterLog/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    // hidden input[name="date"] exists — target the visible picker via its form-group only
    await page.locator('.form-group:has-text("Date") input:visible').first().fill(fmtDate(alDate));
    await page.keyboard.press('Escape');
    await page.locator('.form-group:has-text("New Time In") input:visible, .form-group:has-text("Time In") input:visible')
      .first().fill(fmtDateTime(alDate, '08:00'));
    await page.keyboard.press('Escape');
    await page.locator('.form-group:has-text("New Time Out") input:visible, .form-group:has-text("Time Out") input:visible')
      .last().fill(fmtDateTime(alDate, '17:00'));
    await page.keyboard.press('Escape');
    await page.locator('textarea[name="employee_note"]').fill(`${TAG} automated submit/approve/decline flow — please ignore`);

    page.on('dialog', d => d.accept());
    await page.locator('button[type="submit"]', { hasText: /Submit/i }).first().click();
    await page.waitForTimeout(5000);
    await assertHealthyPage(page);

    // find OUR request in My Requests. Reuse ANY E2E-TEST alter log, not just this run's
    // tag — an earlier run's subject blocks a fresh submit (duplicate-date rule) AND is a
    // perfectly good cyclic subject itself. Rows for other types also carry E2E-TEST notes,
    // so the row must be confirmed by the URL it opens (/app/request/AlterLog/<id>).
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
        const opened = await page.waitForURL(/\/app\/request\/AlterLog\/\d+/, { timeout: 10000 }).then(() => true).catch(() => false);
        if (opened) { found = true; break; }
        // wrong type (e.g. the overtime flow's subject) — go back and try the next row
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
    expect(found, 'an E2E-TEST alter log request must exist in some status list').toBe(true);
    requestId = page.url().split('/').filter(Boolean).pop() || null;
    expect(requestId, 'request id must be extractable from the opened URL').toBeTruthy();
    residueNote = `PENDING alter log id=${requestId} (E2E employee, ${fmtDate(alDate)}, note ${TAG})`;
    await page.context().close();
  });

  test('2. supervisor opens the alter log and approves it', async ({ browser }) => {
    test.skip(!requestId, 'no request id from step 1');
    const page = await pageAs(browser, 'ph-supervisor');
    await page.goto(`/app/request/AlterLog/${requestId}`, { waitUntil: 'load', timeout: 30000 });
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

    // approval rewrites the DTR row for the date — an error page here confirms the
    // BUG-6-family finding live (approve 500s without a dtrs row); a healthy page means
    // the alter-log → DTR hop worked.
    await assertHealthyPage(page);
    const body = await page.locator('body').innerText();
    expect(body, 'approval must not surface a raw error to the supervisor (DTR-hop check)').not.toMatch(/server error|internal error/i);
    residueNote = `APPROVED alter log id=${requestId} (${fmtDate(alDate)}, note ${TAG})`;
    await page.context().close();
  });

  test('3. supervisor declines the approved alter log (cleanup — reverses the DTR write)', async ({ browser }) => {
    test.skip(!requestId, 'no request id from step 1');
    const page = await pageAs(browser, 'ph-supervisor');
    await page.goto(`/app/request/AlterLog/${requestId}`, { waitUntil: 'load', timeout: 30000 });
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

    await page.goto(`/app/request/AlterLog/${requestId}`, { waitUntil: 'load', timeout: 30000 });
    await waitForAppIdle(page);
    await page.waitForTimeout(2000);
    await expect(page.locator('button', { hasText: /Approve/i }).first(),
      'declined request must offer Approve again').toBeVisible({ timeout: 15000 });
    const declineStill = await page.locator('button', { hasText: /Decline/i }).first().isVisible().catch(() => false);
    expect(declineStill, `Decline must be gone after declining (residue if not: ${residueNote})`).toBe(false);
    residueNote = `DECLINED alter log id=${requestId} — inert while untouched, tagged E2E-TEST`;
    cleanupRan = true;
    await page.context().close();
  });
});

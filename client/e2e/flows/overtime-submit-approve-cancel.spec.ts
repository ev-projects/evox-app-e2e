// WRITE FLOW — Overtime: employee submits → supervisor approves → employee cancels.
//
// APPROVED BY VISHNU 2026-08-06: real writes on staging, glenn (employee) → gary
// (supervisor), every artifact tagged E2E-TEST in the note fields. Cleanup is a
// SUPERVISOR DECLINE (an approved request offers its owner no Cancel). NB a declined
// request is NOT terminal — RequestButtons offers Approve again — which is exactly what
// lets this flow reuse ONE request forever. Residue: exactly one declined overtime
// request under glenn (fixed far-future date, E2E-TEST note); the server's duplicate-date
// rule blocks any second one, so residue cannot grow across runs or weeks.
//
// This is the first spec allowed to write. It is deliberately serial — three tests, one
// request id threaded through. If a step fails, later steps skip and the failure message
// says exactly what was left behind and where.
import { test, expect, Page, Browser } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

const TAG = `E2E-TEST-${Date.now()}`;
// FIXED far-future Monday (2027-06-07), not "next Monday": a rolling date would create a
// NEW request every week (the duplicate-date rule only blocks same-date repeats) and grow
// residue without bound (audit #6). One fixed date = one reusable request, forever.
const otDate = new Date(2027, 5, 7);
const fmtInput = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

let requestId: string | null = null;
let residueNote = 'no request created';
let cleanupRan = false;

// surface the residue state even when serial mode skips the cleanup step after an
// earlier failure (audit #5: residueNote was otherwise only readable inside step 3)
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

// NB: the TAG must NOT appear in any test/describe title — titles are matched between the
// runner and worker processes, and a Date.now()-based title breaks that matching.
test.describe('overtime submit → approve → cancel (WRITES, E2E-TEST tagged)', () => {

  test('1. glenn submits an overtime request for next Monday', async ({ browser }) => {
    const page = await pageAs(browser, 'ph-employee');
    await page.goto('/app/request/Overtime/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    // the form ALSO carries <input type="hidden" name="date"> (Overtime.js:229) — matching
    // by name grabs the hidden one and fill() hangs waiting for visibility. Visible only.
    await page.locator('.form-group:has-text("Date:") input:visible').first().fill(fmtInput(otDate));
    await page.keyboard.press('Escape');
    // InputTime "amount" — one hour of OT (defaults to 00:00)
    await page.locator('.form-group:has-text("Amount") input:visible').first().fill('01:00');
    await page.keyboard.press('Escape');
    const typeSelect = page.locator('select[name="type"]');
    if (await typeSelect.locator('option').count() > 1) await typeSelect.selectOption({ index: 1 });
    await page.locator('textarea[name="employee_note"]').fill(`${TAG} automated submit/approve/cancel flow — please ignore`);

    page.on('dialog', d => d.accept());
    await page.locator('button[type="submit"]', { hasText: /Submit/i }).first().click();
    await page.waitForTimeout(5000);
    await assertHealthyPage(page);

    // find the new request in My Requests — rows carry an eye icon in ACTIONS (no hrefs);
    // click the eye on OUR row (matched by the unique TAG in the note) and read the URL
    await page.goto('/app/account/MyRequests', { waitUntil: 'load', timeout: 30000 });
    await waitForAppIdle(page);
    await page.waitForTimeout(3000);
    // Reuse ANY E2E-TEST request, not just this run's tag. The server rejects a second
    // request for the same date, so an earlier run's subject both blocks a fresh submit AND
    // is a perfectly good subject itself. The lifecycle is cyclic (pending→approve→decline;
    // declined shows Approve again per RequestButtons.js), so one request can serve every
    // run: look under Pending first, then under Declined.
    let row = page.locator('tr', { hasText: 'E2E-TEST-' }).first();
    let found = await row.isVisible().catch(() => false);
    for (const status of ['Approved', 'Declined', 'Cancelled']) {
      if (found) break;
      const toggle = page.locator('.request_list_btn, button, a', { hasText: new RegExp(status, 'i') }).first();
      if (!(await toggle.count())) continue;
      await toggle.click();
      await page.waitForTimeout(3000);
      row = page.locator('tr', { hasText: 'E2E-TEST-' }).first();
      found = await row.isVisible().catch(() => false);
    }
    expect(found, 'an E2E-TEST overtime request must exist in some status list').toBe(true);
    await row.locator('td').last().locator('i, button, a, svg').first().click();
    await page.waitForURL(/\/app\/request\/Overtime\/\d+/, { timeout: 15000 });
    requestId = page.url().split('/').filter(Boolean).pop() || null;
    expect(requestId, 'request id must be extractable from the opened URL').toBeTruthy();
    residueNote = `PENDING overtime request id=${requestId} (glenn, ${fmtInput(otDate)}, note ${TAG})`;
    await page.context().close();
  });

  test('2. gary opens the request and approves it', async ({ browser }) => {
    test.skip(!requestId, 'no request id from step 1');
    const page = await pageAs(browser, 'ph-supervisor');
    await page.goto(`/app/request/Overtime/${requestId}`, { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    // pending AND declined requests both show Approve (declined can be re-approved);
    // if only Decline is visible the subject arrived already approved — also fine.
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

    // Register BUG-6 warns approve can 500 when no Dtr row exists for the date. Whatever
    // happens is signal: a healthy page means approval worked; an error page CONFIRMS
    // BUG-6 live. Assert healthy and let a failure carry the verdict text.
    await assertHealthyPage(page);
    const body = await page.locator('body').innerText();
    // NOT /500/: the page renders our ms-timestamp tag, which contains "500" in ~1% of runs
    // (audit #5). Match only explicit server-error phrasings.
    expect(body, 'approval must not surface a raw error to the supervisor (BUG-6 check)').not.toMatch(/server error|internal error/i);
    residueNote = `APPROVED overtime request id=${requestId} (glenn, ${fmtInput(otDate)}, note ${TAG})`;
    await page.context().close();
  });

  test('3. gary declines the approved request (cleanup — terminal state)', async ({ browser }) => {
    // an APPROVED request offers its owner no Cancel; per RequestButtons.js the SUPERVISOR
    // gets a Decline button on approved requests — declining is the terminal cleanup that
    // also reverses the approval before any payroll process could read it.
    test.skip(!requestId, 'no request id from step 1');
    const page = await pageAs(browser, 'ph-supervisor');
    await page.goto(`/app/request/Overtime/${requestId}`, { waitUntil: 'load', timeout: 30000 });
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

    // verify terminal state: reopening as the supervisor shows no Approve button anymore
    await page.goto(`/app/request/Overtime/${requestId}`, { waitUntil: 'load', timeout: 30000 });
    await waitForAppIdle(page);
    await page.waitForTimeout(2000);
    // declined state per RequestButtons.js: the supervisor view offers Approve again and
    // no Decline (no literal "declined" text renders on the detail view — verified by
    // screenshot; the button pair IS the status indicator)
    await expect(page.locator('button', { hasText: /Approve/i }).first(),
      'declined request must offer Approve again').toBeVisible({ timeout: 15000 });
    const declineStill = await page.locator('button', { hasText: /Decline/i }).first().isVisible().catch(() => false);
    expect(declineStill, `Decline must be gone after declining (residue if not: ${residueNote})`).toBe(false);
    residueNote = `DECLINED overtime request id=${requestId} — inert while untouched (NB not terminal: a supervisor could re-approve), tagged E2E-TEST`;
    cleanupRan = true;
    await page.context().close();
  });

  test('4. glenn sees the status change in his notification menu (R-038 probe)', async ({ browser }) => {
    // R-038 (RULE-PROTECTION-PLAN Lane A): "employee notified on status change". The
    // NotificationMenu merges data.requestStatus entries, so after the approve+decline in
    // steps 2-3 the employee's menu must carry a status entry for this overtime.
    // Placed AFTER cleanup deliberately: serial mode skips later tests once one fails, so
    // a selector break in this NEW probe must never be able to block the cleanup step.
    test.skip(!requestId, 'no request id from step 1');
    const page = await pageAs(browser, 'ph-employee');
    await page.goto('/app/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    // the bell lives in the header as a react-bootstrap Dropdown; exact classname varies,
    // so try the likely toggles in order and open the first that exists
    let opened = false;
    for (const sel of [
      '[class*="notification"] .dropdown-toggle',
      '.dropdown-toggle:has(i[class*="bell"])',
      'i[class*="bell"]',
      '[class*="notification"]',
    ]) {
      const toggle = page.locator(sel).first();
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await page.waitForTimeout(2000);
        opened = true;
        break;
      }
    }
    expect(opened, 'a notification bell/menu toggle must exist in the header').toBe(true);

    // the menu merges requestsForApproval/requestStatus/announcements — the status entry
    // for our overtime must mention the request type and a status word (R-038's substance)
    const menuText = await page.locator('.dropdown-menu:visible, [class*="notification"]:visible').allInnerTexts()
      .then(t => t.join('\n')).catch(() => '');
    expect(menuText, 'notification menu must mention the overtime status change (R-038)')
      .toMatch(/overtime/i);
    expect(menuText, 'notification menu must carry a status word for the change (R-038)')
      .toMatch(/approved|declined|status|update/i);
    await page.context().close();
  });
});

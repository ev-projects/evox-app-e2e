// LANE A RULE PROBES — business-rule protection via the real browser.
// Companion to Latest-Test-30-07-2026/RULE-PROTECTION-PLAN.md. Each test protects (or
// upgrades the status of) an UNPROTECTED rule from BUSINESS-RULE-REGISTER.md.
//
// SAFETY: every mutating app request is route-aborted before it leaves the browser (and
// EVOX's GET-mutation screens are not touched by this file). Nothing lands in staging.
//
// Convention: a probe pins TODAY's observed behaviour. Where the observation shows the
// rule is not enforced client-side, that is register evidence (client arm UNPROTECTED) —
// the server arm stays unverified because verifying it would require landing the write.
import { test, expect, Page, Browser } from '@playwright/test';

test.setTimeout(90_000);

const APP_HOST = 'evoxtest.eastvantage.com';

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
async function armWriteBlocker(page: Page): Promise<string[]> {
  const attempted: string[] = [];
  await page.route('**/*', route => {
    const req = route.request();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method())) {
      if (new URL(req.url()).hostname === APP_HOST) attempted.push(req.method() + ' ' + new URL(req.url()).pathname);
      return route.abort();
    }
    return route.continue();
  });
  return attempted;
}

test.describe('Lane A rule probes (writes aborted)', () => {

  test('R-021: an AlterLog with time-out BEFORE time-in — is anything ordering the fields?', async ({ browser }) => {
    // Register: "nothing in AlterLogRequest.php orders the two fields" — UNPROTECTED.
    // Probe the CLIENT arm: submit reversed times; record whether validation blocks or the
    // request fires (aborted). Either observation is register evidence.
    const page = await pageAs(browser, 'ph-employee');
    await page.goto('/app/request/AlterLog/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    // NB the bare route has NO Date field — the date arrives via the DTR-row entry path
    // (values.date is empty here). The probe therefore tests the reversed times TOGETHER
    // with a missing date; a stricter DTR-entry variant is a Lane A follow-up.
    // The form also renders READONLY Current Time-In/Out — a loose "Time" match grabs one
    // and fill() hangs. Target the New Time-In / New Time-Out groups explicitly.
    const newIn = page.locator('.form-group:has-text("New Time-In") input:visible').first();
    const newOut = page.locator('.form-group:has-text("New Time-Out") input:visible').first();
    if (!(await newIn.count()) || !(await newOut.count())) test.skip(true, 'New Time-In/Out inputs not found — form variant differs');
    await newIn.fill('08/03/2026 17:00');  // new time-in LATER than
    await page.keyboard.press('Escape');
    await newOut.fill('08/03/2026 09:00'); // new time-out
    await page.keyboard.press('Escape');
    const note = page.locator('textarea:visible').first();
    if (await note.count()) await note.fill('E2E-TEST R-021 reversed-times probe — request is aborted in-browser, nothing lands');

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    await page.locator('button[type="submit"]', { hasText: /Submit/i }).first().click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    const alterWrites = attempted.filter(a => /alter/i.test(a));
    // Pinned hypothesis: with the date missing AND times reversed, the client must not
    // fire the write (a required-date rule alone should stop it). If this FAILS, the form
    // fired a dateless reversed-times request — worse than R-021 alone; register it.
    expect(alterWrites,
      `R-021 probe (bare route): submit with missing date + reversed times must not fire. Saw: ${alterWrites.join(' | ') || 'none'}`
    ).toHaveLength(0);
  });

  test('R-169: a COE request without a purpose must be refused before any request fires', async ({ browser }) => {
    // COERequest.php:30 requires a purpose server-side; the register says no rejection test
    // exists anywhere. Probe the client arm: submit with everything empty.
    const page = await pageAs(browser, 'ph-employee');
    await page.goto('/app/request/CertificateOfEmployment/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    const submit = page.locator('button[type="submit"]', { hasText: /Submit/i }).first();
    if (!(await submit.count())) test.skip(true, 'COE submit control not found');
    await submit.click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    const coeWrites = attempted.filter(a => /coe|certificate/i.test(a));
    // Pinned: a purposeless COE fires no request (client Yup blocks it). If this fails the
    // client guard is gone and only COERequest.php stands between a blank form and a PDF.
    expect(coeWrites,
      `R-169: a purposeless COE submit must be blocked client-side. Saw: ${coeWrites.join(' | ') || 'none'}`
    ).toHaveLength(0);
  });

  test('R-151/R-153/R-154: department announcement with 150-char title, no department, no country', async ({ browser }) => {
    // AnnouncementRequest.php enforces title<=100 + department + country server-side; the
    // register lists all of it UNPROTECTED. Probe what the CLIENT does with all three
    // violations at once.
    // gary's supervisor state does not render this form (permission-gated) — hr-head does
    const page = await pageAs(browser, 'hr-head');
    await page.goto('/app/team/DepartmentAnouncement/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const title = page.locator('input[name="title"]:visible, .form-group:has-text("Title") input:visible').first();
    await title.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    if (!(await title.count())) test.skip(true, 'announcement form title input not rendered for this role (permission-gated?)');
    await title.fill('E2E-TEST R-151 '.padEnd(150, 'x')); // 150 chars, over the 100 limit

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    const submit = page.locator('button[type="submit"]', { hasText: /Submit|Save|Post/i }).first();
    if (!(await submit.count())) test.skip(true, 'announcement submit control not found');
    await submit.click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    const annWrites = attempted.filter(a => /announcement/i.test(a));
    // Pinned to the observed run: record whether the client blocks the triple violation.
    // See the run log / register note for the recorded direction; the assertion pins it so
    // any change in either direction surfaces.
    expect(annWrites,
      `R-151/153/154: pinned — the invalid announcement must not fire a write client-side. Saw: ${annWrites.join(' | ') || 'none'}`
    ).toHaveLength(0);
  });

  test('R-090 canary: India and PH role states are served DIFFERENT payroll cutoff lists', async ({ browser }) => {
    // Register #3 risk: India/Morocco pay against EVOX_IND_PAYROLL_CUTOFF, everyone else
    // against payroll_cutoffs. Full proof is backend (Lane B); this canary asserts the
    // observable consequence — the cutoff windows served to an India employee differ from
    // the PH employee's. If both countries ever get served the SAME list, the routing
    // has collapsed to one table and someone is being paid against the wrong windows.
    async function cutoffPayload(role: string, dtrPath: string): Promise<string | null> {
      const page = await pageAs(browser, role);
      let payload: string | null = null;
      page.on('response', async resp => {
        if (/cutoff/i.test(resp.url()) && resp.status() === 200) {
          payload = await resp.text().catch(() => null);
        }
      });
      await page.goto(dtrPath, { waitUntil: 'load', timeout: 30000 });
      await waitForAppIdle(page);
      await page.waitForTimeout(5000);
      await page.context().close();
      return payload;
    }
    // user ids from the traverse specs' DTR links
    const ph = await cutoffPayload('ph-employee', '/app/dtr/1593/');
    const ind = await cutoffPayload('india-employee', '/app/dtr_in_mar/4193/');
    if (!ph || !ind) test.skip(true, `cutoff payload not captured (ph=${!!ph}, india=${!!ind}) — endpoint pattern or user id needs adjusting`);
    expect(ph!.length, 'PH cutoff payload must be non-trivial').toBeGreaterThan(50);
    expect(ind!.length, 'India cutoff payload must be non-trivial').toBeGreaterThan(50);
    expect(ind, 'R-090: India must NOT be served the same cutoff list as PH').not.toBe(ph);
  });
});

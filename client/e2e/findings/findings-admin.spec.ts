// FINDINGS VERIFICATION — admin surface (dummyman@ops, admin state).
//
// SAFETY: every non-GET request is intercepted and ABORTED before it leaves the browser.
// The staging database cannot be written from this file.
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

async function assertHealthyPage(page: Page) {
  expect(page.url(), 'must not bounce to login').not.toContain('/login');
  const body = await page.locator('body').innerText();
  for (const sig of ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops']) {
    expect(body, 'no PHP error text').not.toContain(sig);
  }
}

async function armWriteBlocker(page: Page): Promise<string[]> {
  const attempted: string[] = [];
  await page.route('**/*', route => {
    const req = route.request();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method())) {
      attempted.push(req.method() + ' ' + req.url() + ' ' + (req.postData() || '').slice(0, 300));
      return route.abort();
    }
    return route.continue();
  });
  return attempted;
}

test.describe('findings verification — admin', () => {

  test('PCF-DATE-1 (open): a payroll cut-off with start AFTER end passes validation and is submitted', async ({ page }) => {
    // PayrollCutoffForm.js:167-168 — start_date's max() references start_date itself and
    // end_date's min() references end_date itself, so both bounds are trivially true and a
    // backwards range validates clean. If the bug is live, Submit attempts the write (aborted
    // here); when the Yup refs are fixed, a validation error renders and nothing fires.
    await page.goto('/app/admin/PayrollCutoff/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await page.waitForTimeout(2000);

    // the form opens from the subtitle button on the list header
    const addBtn = page.locator('.content-header button, .card-header button, button', { hasText: /Add|Create|New/i }).first();
    if (!(await addBtn.count())) test.skip(true, 'Add cut-off button not found — list layout differs');
    await addBtn.click();

    const nameBox = page.locator('input[name="name"]').first();
    await expect(nameBox, 'cut-off form must open').toBeVisible({ timeout: 10000 });
    await nameBox.fill('E2E-TEST backwards range probe');

    // InputDate renders a picker input per form-group; fill start with a date AFTER end
    const dateInputs = page.locator('form input').filter({ hasNot: page.locator('[type="hidden"]') });
    const startInput = page.locator('input[name="start_date"], .form-group:has-text("Start") input').first();
    const endInput = page.locator('input[name="end_date"], .form-group:has-text("End") input').first();
    if (!(await startInput.count()) || !(await endInput.count())) {
      test.skip(true, `date inputs not found (form has ${await dateInputs.count()} inputs) — selector needs the real markup`);
    }
    await startInput.fill('09/30/2026');
    await endInput.fill('09/01/2026');
    await page.keyboard.press('Escape'); // close any open datepicker popover

    // onSubmitHandler only runs AFTER Yup validation passes, and its first act is a
    // window.confirm — so the dialog appearing IS the proof the backwards range validated.
    let confirmSeen = false;
    page.on('dialog', d => { confirmSeen = true; return d.accept(); });

    const attempted = await armWriteBlocker(page);
    await page.locator('form button[type="submit"]', { hasText: /Submit/i }).first().click();
    await page.waitForTimeout(2500);

    // characterization of the LIVE bug: the backwards range passes validation, the confirm
    // fires, and the write is attempted (aborted here). When the Yup cross-refs are fixed
    // this fails — flip to expect the validation message instead.
    expect(confirmSeen,
      'BUG LIVE: Yup let the backwards range through to the submit confirm. ' +
      'If this failed, check for a validation error — the Yup ref fix may have landed.'
    ).toBe(true);
    expect(attempted.length, 'the store request must have been attempted (and aborted)').toBeGreaterThan(0);
  });
});

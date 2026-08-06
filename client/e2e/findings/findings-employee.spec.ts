// FINDINGS VERIFICATION — employee surface (glenn.macasarte, ph-employee state).
//
// SAFETY: read-only BY CONSTRUCTION. Where a test must press a submit control to observe
// behaviour, every non-GET request is intercepted and ABORTED before it leaves the browser
// (recorded for assertions) — nothing can reach the staging database from this file.
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/ph-employee.json' });

const GLENN_ID = 1593; // ph-employee user id, confirmed by the traverse spec's DTR link

async function assertHealthyPage(page: Page) {
  expect(page.url(), 'must not bounce to login').not.toContain('/login');
  const body = await page.locator('body').innerText();
  for (const sig of ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops']) {
    expect(body, 'no PHP error text').not.toContain(sig);
  }
}

// Abort every mutating request before it leaves the browser; return the recorder.
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

test.describe('findings verification — employee', () => {

  test('FE_CPWD_NOVALIDATION (open): profile password form POSTs a 1-char, mismatched password', async ({ page }) => {
    // ChangePasswordFormComponent.js:81 binds validationSchema={this.validationSchema} — an
    // instance property that does not exist (the schema is a module const declared after the
    // class). Formik therefore runs with NO validation. If the bug is live, pressing Update
    // with garbage attempts the POST; if fixed, error messages appear and nothing fires.
    await page.goto(`/app/profile/${GLENN_ID}`, { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);

    // the button lives on the Personal Info tab (own profile only)
    const piTab = page.locator('a[role="tab"]', { hasText: /Personal Info/i }).first();
    if (await piTab.count()) await piTab.click();
    await page.waitForTimeout(3000);
    const openBtn = page.locator('button', { hasText: /Change Password/i }).first();
    if (!(await openBtn.count())) test.skip(true, 'Change Password button not found on this profile variant');
    await openBtn.click();
    await expect(page.locator('#change_password_id')).toBeVisible({ timeout: 10000 });

    const attempted = await armWriteBlocker(page);
    await page.locator('input[name="current_password"]').fill('x');
    await page.locator('input[name="new_password"]').fill('a');            // 1 char
    await page.locator('input[name="confirm_new_password"]').fill('b');   // mismatched
    await page.locator('#change_password_id button[type="submit"]').click();
    await page.waitForTimeout(2500);

    // characterization of the LIVE bug: the write is attempted despite garbage input.
    // When the schema is wired correctly this fails (no request; errors render) — flip it.
    expect(attempted.length,
      'BUG LIVE: a mutating request should have been attempted (and was aborted). ' +
      'If this failed, check whether validation errors now render — the fix has landed.'
    ).toBeGreaterThan(0);
  });

  test('DSP-CRT-1 (evolved): what does "Submit Dispute" actually send today?', async ({ page }) => {
    // Original finding: the whole create flow was commented out. The current tree renders a
    // "Submit Dispute" button again but /storedispute is still commented out in DisputeForm.js.
    // Record (with all writes aborted) what pressing it attempts — the verdict updates the register.
    await page.goto('/app/payrolldispute/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await page.waitForTimeout(2000);

    const submitBtn = page.locator('button', { hasText: /Submit Dispute/i }).first();
    if (!(await submitBtn.count())) {
      // button absent = original DSP-CRT-1 shape still fully live
      test.info().annotations.push({ type: 'verdict', description: 'DSP-CRT-1 CONFIRMED: no Submit Dispute control rendered' });
      return;
    }
    const disabled = await submitBtn.isDisabled();
    const attempted = await armWriteBlocker(page);
    if (!disabled) {
      await submitBtn.click();
      await page.waitForTimeout(2500);
    }
    test.info().annotations.push({
      type: 'verdict',
      description: `Submit Dispute present, disabled=${disabled}; attempted writes: ${attempted.length ? attempted.join(' | ') : 'none'}`,
    });
    // characterization of the LIVE defect: /storedispute is commented out in DisputeForm.js,
    // so no create request can be attempted. When the create flow is restored this fails —
    // flip it to expect the POST.
    const storeAttempts = attempted.filter(a => a.includes('/storedispute'));
    expect(storeAttempts, 'BUG LIVE: creating a dispute must not reach /storedispute (the flow is dead code)').toHaveLength(0);
  });
});

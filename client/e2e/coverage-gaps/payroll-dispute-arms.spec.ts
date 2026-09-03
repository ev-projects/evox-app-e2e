// COVERAGE GAP 2026-08-18 — payroll dispute: what Approve / Decline actually send
//
// Source under test : client/src/components/PayrollDispute/DisputeForm.js
//                     client/src/components/PayrollDispute/DisputeReport.js
// Menu path         : Payroll -> Payroll Dispute (/app/payrolldispute/) and
//                     Payroll Dispute Report (/app/payrolldisputeview/)
// Already covered   : payroll-dispute.spec.ts runs signed out (no storageState), so none of it
//                     executes. roles/{ph,india,morocco}-payroll cover the REPORT page — its
//                     heading, geo filter, date filter and GET-only export — and open the
//                     dispute form only to assert "Approve/Decline visible but never clicked".
//                     findings/findings-employee.spec.ts characterizes DSP-CRT-1 (an employee
//                     is offered no Submit Dispute control at all). Never covered: what those
//                     two buttons send when they ARE pressed.
//
// SAFETY: no dispute is decided. Every press below arms a route blocker first, aborting the
// app-origin PUT /updatedispute/<id> before it leaves the browser.
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/ph-payroll.json' });

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
      attempted.push(req.method() + ' ' + url.pathname + ' ' + (req.postData() || '').slice(0, 200));
      return route.abort();
    }
    return route.continue();
  });
  return attempted;
}

test.describe('Dispute create screen (/app/payrolldispute/, no id)', () => {

  async function openCreateScreen(page: Page) {
    await page.goto('/app/payrolldispute/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    await expect(page.getByRole('heading', { name: 'Create Dispute' })).toBeVisible({ timeout: 30000 });
  }

  test('the create screen is titled Create Dispute and offers an employee selector', async ({ page }) => {
    await openCreateScreen(page);
    await expect(page.locator('select[name="selectedUser"]')).toBeVisible({ timeout: 20000 });
  });

  // CHARACTERIZATION — DSP-UPD-1 (open defect, pinned as it behaves today).
  // DisputeForm.js:333 handleSubmit(e, action) performs NO validation whatsoever: it goes
  // straight to PUT /updatedispute/${props.params.id}. On the CREATE route there is no :id
  // segment, so props.params.id is undefined and the request is aimed at
  // /updatedispute/undefined — a decision on nothing, sent from a form where the user has
  // chosen no employee and no cutoff. The same handler is also how Approve and Decline work on
  // a real dispute, so it is not dead code.
  // When this is fixed — a guard, a disabled button, or wiring create to /storedispute — this
  // test fails, which is the signal to flip it into the regression guard.
  test('DSP-UPD-1: Approve on the create screen fires an update against an undefined dispute id', async ({ page }) => {
    await openCreateScreen(page);
    const approve = page.getByRole('button', { name: 'Approve' });
    if (!(await approve.count())) test.skip(true, 'Approve control is not rendered for this account on the create screen');

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    await approve.click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    const updates = attempted.filter(a => a.includes('/updatedispute/'));
    expect(updates.length,
      'BUG LIVE (DSP-UPD-1): pressing Approve with nothing selected should be refused, and today it is not. ' +
      `If this failed, a guard has landed — verify and flip this test. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).toBeGreaterThan(0);
    expect(updates.join(' '),
      'the update is aimed at an undefined id because the create route carries no :id segment'
    ).toMatch(/\/updatedispute\/undefined/);
  });

  test('DSP-UPD-1: Decline takes the same unguarded path, differing only in the status it sends', async ({ page }) => {
    // The second arm of the same handler: handleSubmit(e, 1) vs handleSubmit(e, 2). Both are
    // equally unguarded; the only difference on the wire is status.
    await openCreateScreen(page);
    const decline = page.getByRole('button', { name: 'Decline' });
    if (!(await decline.count())) test.skip(true, 'Decline control is not rendered for this account on the create screen');

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    await decline.click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    const updates = attempted.filter(a => a.includes('/updatedispute/'));
    expect(updates.length,
      `BUG LIVE (DSP-UPD-1): Decline is equally unguarded. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).toBeGreaterThan(0);
    expect(updates.join(' '), 'Decline sends status 2').toMatch(/"status"\s*:\s*2/);
  });
});

test.describe('Dispute detail screen (/app/payrolldispute/:id)', () => {

  // Find a real dispute to open, from the report the payroll role already has.
  async function openFirstDispute(page: Page): Promise<boolean> {
    await page.goto('/app/payrolldisputeview/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    await expect(page.getByRole('heading', { name: 'Payroll Dispute Report' })).toBeVisible({ timeout: 30000 });

    const hrefs = await page.locator('a[href*="/app/payrolldispute/"]').evaluateAll(
      els => els.map(e => (e as HTMLAnchorElement).getAttribute('href') || ''));
    const href = hrefs.find(h => /\/app\/payrolldispute\/\d+\/?$/.test(h));
    if (!href) return false;
    await page.goto(href, { waitUntil: 'load', timeout: 30000 });
    await waitForAppIdle(page);
    await assertHealthyPage(page);
    return true;
  }

  test('an existing dispute opens as a Dispute Form, not as a create screen', async ({ page }) => {
    const opened = await openFirstDispute(page);
    if (!opened) test.skip(true, 'no dispute rows link to a detail page for this account today');
    // DisputeForm.js:484 — the heading swaps to "Dispute Form" as soon as params.id exists.
    await expect(page.getByRole('heading', { name: 'Dispute Form' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'Create Dispute' })).toHaveCount(0);
  });

  test('Approve on a real dispute sends status 1 against that dispute id (aborted)', async ({ page }) => {
    const opened = await openFirstDispute(page);
    if (!opened) test.skip(true, 'no dispute rows link to a detail page for this account today');
    const disputeId = (page.url().match(/\/payrolldispute\/(\d+)/) || [])[1];
    expect(disputeId, 'dispute id must be readable from the URL').toBeTruthy();

    const approve = page.getByRole('button', { name: 'Approve' });
    if (!(await approve.count())) test.skip(true, 'this dispute is not in a state that offers Approve');

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    await approve.click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    const updates = attempted.filter(a => a.includes(`/updatedispute/${disputeId}`));
    expect(updates,
      `Approve must PUT /updatedispute/${disputeId}. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).not.toHaveLength(0);
    expect(updates.join(' '), 'Approve sends status 1').toMatch(/"status"\s*:\s*1/);
  });

  test('Decline on a real dispute sends status 2 against the same dispute id (aborted)', async ({ page }) => {
    const opened = await openFirstDispute(page);
    if (!opened) test.skip(true, 'no dispute rows link to a detail page for this account today');
    const disputeId = (page.url().match(/\/payrolldispute\/(\d+)/) || [])[1];

    const decline = page.getByRole('button', { name: 'Decline' });
    if (!(await decline.count())) test.skip(true, 'this dispute is not in a state that offers Decline');

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    await decline.click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    const updates = attempted.filter(a => a.includes(`/updatedispute/${disputeId}`));
    expect(updates,
      `Decline must PUT /updatedispute/${disputeId}. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).not.toHaveLength(0);
    expect(updates.join(' '), 'Decline sends status 2').toMatch(/"status"\s*:\s*2/);
  });
});

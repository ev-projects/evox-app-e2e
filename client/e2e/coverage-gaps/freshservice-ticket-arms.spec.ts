// COVERAGE GAP 2026-08-18 — EV Assist (FreshService): create-ticket validation, CC lookup,
//                            attachments, and the ticket detail / reply view
//
// Source under test : client/src/components/FreshService/FreshServiceForm.js
//                     client/src/components/FreshService/FreshServiceTickets.js
// Menu path         : EV Assist -> Create Ticket / My Tickets
// Already covered   : create-ticket.verified.spec.ts and my-tickets.verified.spec.ts run signed
//                     out (no storageState) so none of their assertions execute. The three
//                     employee interaction specs assert the workspace/subject/CC/file controls
//                     RENDER, fill the subject, and select a workspace to see the category
//                     cascade. Never covered: what happens when the form is submitted, the CC
//                     suggestion lookup, attaching a file, and the whole ticket detail view
//                     (conversations + reply), which no spec has ever opened.
//
// SAFETY: no ticket is created, no attachment is stored, no reply is posted. Every arm that
// could write arms a route blocker first, aborting the app-origin request before it leaves the
// browser (POST /freshservice/tickets, POST /freshservice/tickets/attachments/,
// POST /freshservice/tickets/<id>/reply). The CC suggestion lookup is a GET and is allowed
// through — it reads FreshService's directory and changes nothing.
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/ph-employee.json' });

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

test.describe('Create Ticket — validation arms', () => {

  async function openCreate(page: Page) {
    await page.goto('/app/fresh_service/create/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    await expect(page.locator('.card-title-fs', { hasText: 'Create New Ticket' })).toBeVisible({ timeout: 45000 });
  }

  test('submitting a blank form is refused, naming every missing field, and sends nothing', async ({ page }) => {
    // validateTicketData collects one message per missing field and handleSubmit only calls
    // the API when isValid. This is the arm a user hits by pressing the button on arrival.
    await openCreate(page);

    const attempted = await armWriteBlocker(page);
    await page.getByRole('button', { name: 'Create a Ticket' }).click();
    await page.waitForTimeout(2500);
    await assertHealthyPage(page);

    await expect(page.getByText('Workspace must be selected')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Description is required')).toBeVisible();
    expect(attempted.filter(a => a.includes('/freshservice/tickets') && !a.includes('attachments')),
      `a blank form must not create a ticket. Saw: ${attempted.join(' | ') || 'none'}`
    ).toHaveLength(0);
  });

  test('a subject shorter than five characters is rejected, and lengthening it clears the complaint', async ({ page }) => {
    // Both arms of the same rule in one test, because the transition is what the rule says.
    await openCreate(page);
    const subject = page.locator('.form-input[placeholder="Brief description"]');
    await expect(subject).toBeVisible({ timeout: 45000 });

    const attempted = await armWriteBlocker(page);
    await subject.fill('abc');
    await page.getByRole('button', { name: 'Create a Ticket' }).click();
    await page.waitForTimeout(2000);
    await expect(page.getByText('Subject must be at least 5 characters')).toBeVisible({ timeout: 10000 });

    // updateField clears a field's error as soon as it is edited again
    await subject.fill('E2E-TEST coverage-gaps subject — never submitted');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Subject must be at least 5 characters')).toHaveCount(0);
    expect(attempted.filter(a => a.includes('/freshservice/tickets') && !a.includes('attachments')),
      'nothing may be created while the form is still invalid').toHaveLength(0);
  });

  test('a description shorter than ten characters is rejected', async ({ page }) => {
    await openCreate(page);
    const description = page.locator('textarea').first();
    if (!(await description.count())) test.skip(true, 'description control is not a plain textarea on this build');

    const attempted = await armWriteBlocker(page);
    await description.fill('short');
    await page.getByRole('button', { name: 'Create a Ticket' }).click();
    await page.waitForTimeout(2500);

    await expect(page.getByText('Description must be at least 10 characters')).toBeVisible({ timeout: 10000 });
    expect(attempted.filter(a => a.includes('/freshservice/tickets') && !a.includes('attachments')),
      'a too-short description must not create a ticket').toHaveLength(0);
  });
});

test.describe('Create Ticket — CC email lookup', () => {

  async function openCreate(page: Page) {
    await page.goto('/app/fresh_service/create/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    await expect(page.locator('.card-title-fs', { hasText: 'Create New Ticket' })).toBeVisible({ timeout: 45000 });
  }

  test('typing at least two characters looks the address up in the directory', async ({ page }) => {
    // FreshServiceForm.js debounces 1000ms and then GETs /freshservice/users/suggestions.
    // The assertion is on the request, not on what the live directory happens to return —
    // the returned set is outside this suite's control and would make the test non-repeatable.
    await openCreate(page);
    const ccInput = page.locator('.cc-email-wrapper .form-input[placeholder="Type to search"]');
    await expect(ccInput).toBeVisible({ timeout: 45000 });

    const lookup = page.waitForRequest(
      req => req.url().includes('/freshservice/users/suggestions') && req.method() === 'GET',
      { timeout: 20000 },
    );
    await ccInput.fill('ea');
    const request = await lookup;
    expect(request.url(), 'the lookup must carry what was typed as its keyword').toContain('keyword=ea');
  });

  test('a single character does not trigger a lookup', async ({ page }) => {
    // The other arm: `if (lastTerm.length < 2) return;` inside the debounce. Waiting well past
    // the 1000ms debounce window makes the absence meaningful rather than a race.
    await openCreate(page);
    const ccInput = page.locator('.cc-email-wrapper .form-input[placeholder="Type to search"]');
    await expect(ccInput).toBeVisible({ timeout: 45000 });

    let lookups = 0;
    page.on('request', req => {
      if (req.url().includes('/freshservice/users/suggestions')) lookups++;
    });
    await ccInput.fill('e');
    await page.waitForTimeout(4000); // 4x the debounce window
    expect(lookups, 'one character is below the lookup threshold — no request may fire').toBe(0);
  });
});

test.describe('Create Ticket — attachments', () => {

  const DUMMY_TXT = {
    name: 'e2e-coverage-gaps-do-not-upload.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('E2E coverage-gaps probe — aborted in-browser, never stored.'),
  };

  test('the attachment picker only appears once a workspace is chosen', async ({ page }) => {
    // FreshServiceForm.js gates the file input on formData.selectedWorkspace — the attachment
    // upload needs a workspace_id, so the control must not be reachable before one is picked.
    await page.goto('/app/fresh_service/create/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    await expect(page.locator('.card-title-fs', { hasText: 'Create New Ticket' })).toBeVisible({ timeout: 45000 });

    await expect(page.locator('input[type="file"]'), 'no workspace yet — no attachment control')
      .toHaveCount(0);

    const workspace = page.locator('.form-select').first();
    await workspace.waitFor({ state: 'visible', timeout: 45000 });
    if (await workspace.locator('option').count() <= 1) {
      test.skip(true, 'no workspaces are offered to this account today');
    }
    await workspace.selectOption({ index: 1 });
    await expect(page.locator('input[type="file"]').first(), 'a workspace unlocks the attachment control')
      .toBeAttached({ timeout: 45000 });
  });

  test('choosing a file uploads it against the chosen workspace straight away (aborted)', async ({ page }) => {
    // The file input's onChange POSTs to /freshservice/tickets/attachments/ immediately —
    // before the ticket exists. That upload is aborted here, so nothing is stored; what is
    // proved is that picking a file is itself a write, which is worth knowing.
    await page.goto('/app/fresh_service/create/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const workspace = page.locator('.form-select').first();
    await workspace.waitFor({ state: 'visible', timeout: 45000 });
    if (await workspace.locator('option').count() <= 1) {
      test.skip(true, 'no workspaces are offered to this account today');
    }
    await workspace.selectOption({ index: 1 });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 45000 });

    const attempted = await armWriteBlocker(page);
    await fileInput.setInputFiles(DUMMY_TXT);
    await page.waitForTimeout(4000);
    await assertHealthyPage(page);

    expect(attempted.filter(a => a.includes('/freshservice/tickets/attachments')),
      `picking a file must attempt the attachment upload. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).not.toHaveLength(0);
  });
});

test.describe('My Tickets — detail view and reply', () => {

  // Open the first ticket in the list. Returns false when this account has no tickets.
  async function openFirstTicket(page: Page): Promise<boolean> {
    await page.goto('/app/fresh_service/tickets/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const row = page.locator('.ticket-subject').first();
    const appeared = await row.isVisible({ timeout: 30000 }).catch(() => false);
    if (!appeared) return false;
    await row.click();
    await page.waitForTimeout(3000);
    return true;
  }

  test('opening a ticket shows its number, subject and description', async ({ page }) => {
    const opened = await openFirstTicket(page);
    if (!opened) test.skip(true, 'this account has no FreshService tickets today');
    await assertHealthyPage(page);

    await expect(page.locator('.card-title-fs').filter({ hasText: /^Ticket #\d+$/ }))
      .toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Description:')).toBeVisible();
  });

  test('the detail view carries a Conversations panel that resolves to entries or an empty state', async ({ page }) => {
    const opened = await openFirstTicket(page);
    if (!opened) test.skip(true, 'this account has no FreshService tickets today');

    await expect(page.locator('.card-title-fs', { hasText: 'Conversations' })).toBeVisible({ timeout: 30000 });
    const items = page.locator('.conversation-item');
    const empty = page.getByText('No conversations yet.');
    await expect(items.first().or(empty)).toBeVisible({ timeout: 45000 });
    if (await items.count() > 0) {
      expect(await empty.count(), 'the empty state must not render alongside conversations').toBe(0);
    }
  });

  test('Add Reply stays disabled while the reply is empty', async ({ page }) => {
    // FreshServiceTickets.js: `disabled: loading || !reply.trim()`. The empty-reply arm is
    // enforced by disabling the control, so no click is needed — and none is made, since a
    // real reply would be emailed to the ticket's requester.
    const opened = await openFirstTicket(page);
    if (!opened) test.skip(true, 'this account has no FreshService tickets today');

    await expect(page.getByText('Add Reply').first()).toBeVisible({ timeout: 45000 });
    const replyBtn = page.getByRole('button', { name: 'Add Reply' });
    await expect(replyBtn).toBeVisible({ timeout: 30000 });
    await expect(replyBtn, 'an empty reply must not be submittable').toBeDisabled();
  });

  test('Back returns from the detail view to the ticket list', async ({ page }) => {
    const opened = await openFirstTicket(page);
    if (!opened) test.skip(true, 'this account has no FreshService tickets today');
    await expect(page.locator('.card-title-fs').filter({ hasText: /^Ticket #\d+$/ }))
      .toBeVisible({ timeout: 30000 });

    await page.getByRole('button', { name: /back/i }).first().click();
    await page.waitForTimeout(2500);
    await assertHealthyPage(page);
    await expect(page.locator('.card-title-fs').filter({ hasText: /^Ticket #\d+$/ })).toHaveCount(0);
    await expect(page.locator('.ticket-subject').first()).toBeVisible({ timeout: 30000 });
  });
});

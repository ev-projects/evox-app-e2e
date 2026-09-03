// COVERAGE GAP 2026-08-18 — policies documents: download list, upload validation, accessibility
//
// Source under test : client/src/components/PoliciesDocument/PoliciesDocumentDownload.js
//                     client/src/components/PoliciesDocument/PoliciesDocumentUpload.js
//                     client/src/components/PoliciesDocument/UploadedDocumentList.js
// Menu path         : Policies -> Download Policies / Upload Policies / Manage Policy Accessibility
// Already covered   : policies.spec.ts and policies-coc-rooms.spec.ts run signed out (no
//                     storageState), so every assertion they hold is skipped. The four HR role
//                     interaction specs goto('/app/policiesupload') and
//                     goto('/app/policiesdocumentlist') and assert only "HTTP status < 500" —
//                     they never look at what rendered. /app/policiesdownload is not opened by
//                     any spec at all.
//
// SAFETY: nothing is uploaded and no document's accessibility is changed. The upload arms use
// an in-memory file that never leaves the browser: a route blocker aborts every app-origin
// write, and the accessibility toggle (PUT /updatestatus/<id>/<flag>) is aborted the same way.
// No file is downloaded — the download control is asserted, not clicked, because
// PoliciesDocumentDownload builds a base64 data URL client-side and clicks it programmatically.
import { test, expect, Page } from '@playwright/test';

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

test.describe('Download Policies (/app/policiesdownload)', () => {
  test.use({ storageState: 'e2e/.auth/ph-employee.json' });

  test('the page resolves to either grouped document accordions or the No Document Found notice', async ({ page }) => {
    // PoliciesDocumentDownload branches on Object.values(policiesdocument).length: one
    // Accordion card per group, else a single "No Document Found" row. Both are legitimate
    // live states, so assert the branch is exclusive rather than assuming which one is up.
    await page.goto('/app/policiesdownload', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const cards = page.locator('.accordion-main .accordion-card');
    const empty = page.locator('.notfound');
    await expect(cards.first().or(empty)).toBeVisible({ timeout: 30000 });

    if (await cards.count() > 0) {
      expect(await empty.count(), 'the empty notice must not render alongside document groups').toBe(0);
    } else {
      await expect(empty).toContainText('No Document Found');
    }
  });

  test('opening a document group reveals a table titled Sno / Title / Geo / Action', async ({ page }) => {
    await page.goto('/app/policiesdownload', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    const toggle = page.locator('.accordion-card .tooglestyle').first();
    if (!(await toggle.count())) test.skip(true, 'no policy documents are published to this account today');
    await expect(toggle, 'the group header must be labelled').not.toBeEmpty();
    await toggle.click();
    await page.waitForTimeout(1500);

    const table = page.locator('.accordion-card table.table').first();
    await expect(table).toBeVisible({ timeout: 15000 });
    const headers = await table.locator('thead').innerText();
    for (const col of ['Sno', 'Title', 'Geo', 'Action']) {
      expect(headers, `document table must carry the ${col} column`).toContain(col);
    }
  });

  test('every document row names its document and offers exactly one view control', async ({ page }) => {
    await page.goto('/app/policiesdownload', { waitUntil: 'load', timeout: 30000 });
    await waitForAppIdle(page);
    const toggle = page.locator('.accordion-card .tooglestyle').first();
    if (!(await toggle.count())) test.skip(true, 'no policy documents are published to this account today');
    await toggle.click();
    await page.waitForTimeout(1500);

    const rows = page.locator('.accordion-card table.table tbody tr');
    const count = await rows.count();
    if (count === 0) test.skip(true, 'this document group is empty');

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      await expect(row.locator('th'), 'row must be numbered').toHaveText(String(i + 1));
      await expect(row.locator('td.tdcontent span'), 'row must name the document').not.toBeEmpty();
      await expect(row.locator('button.download-btn'), 'row must offer one view control').toHaveCount(1);
    }
    // The control is asserted, not clicked: handleviewer fetches the file and PoliciesDocument
    // Download then synthesises a base64 data-URL <a> and clicks it, i.e. it writes a file to
    // the runner's disk. Nothing here needs that to prove the row rendered.
  });
});

test.describe('Upload Policies (/app/policiesupload)', () => {
  test.use({ storageState: 'e2e/.auth/hr-head.json' });

  // A tiny in-memory PDF. It is only ever handed to the <input type="file">; the submit that
  // would send it is aborted by the route blocker, so it never reaches staging.
  const DUMMY_PDF = {
    name: 'e2e-coverage-gaps-do-not-upload.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'),
  };

  async function openUpload(page: Page) {
    await page.goto('/app/policiesupload', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    await expect(page.getByRole('heading', { name: 'Upload Policies Document' })).toBeVisible({ timeout: 30000 });
  }

  test('the form offers a Global/Geo choice, a country select, a title and a file picker', async ({ page }) => {
    await openUpload(page);
    await expect(page.locator('input[name="GlobalType"][value="Global"]')).toBeVisible();
    await expect(page.locator('input[name="GlobalType"][value="Geo"]')).toBeVisible();
    await expect(page.locator('input[name="GlobalType"][value="Global"]'), 'Global is the default')
      .toBeChecked();
    await expect(page.locator('select[name="CountryId"]')).toBeVisible();
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('input[name="FileData"]')).toBeAttached();
    await expect(page.getByRole('button', { name: 'Upload' })).toBeVisible();
  });

  test('the country select is disabled under Global and enabled under Geo', async ({ page }) => {
    // handleChange flips `radiovalidation`, which is bound to the select's disabled prop —
    // the country only matters for a geo-scoped document.
    await openUpload(page);
    const country = page.locator('select[name="CountryId"]');
    await expect(country, 'Global scope needs no country').toBeDisabled();

    await page.locator('input[name="GlobalType"][value="Geo"]').check();
    await expect(country, 'Geo scope must let a country be chosen').toBeEnabled();

    await page.locator('input[name="GlobalType"][value="Global"]').check();
    await expect(country, 'switching back to Global disables it again').toBeDisabled();
  });

  test('uploading with no file selected is refused and sends nothing', async ({ page }) => {
    await openUpload(page);
    const attempted = await armWriteBlocker(page);
    await page.getByRole('button', { name: 'Upload' }).click();
    await page.waitForTimeout(2500);
    await assertHealthyPage(page);

    await expect(page.getByText('Please choose a valid file (pdf, doc, jpg, jpeg, png, xlsx)'))
      .toBeVisible({ timeout: 10000 });
    expect(attempted, `a fileless upload must send nothing. Saw: ${attempted.join(' | ') || 'none'}`)
      .toHaveLength(0);
  });

  test('choosing Geo without a country is refused alongside the missing-file message', async ({ page }) => {
    // handleUpload's first branch sets BOTH flags when a Geo upload arrives with neither a
    // file nor a country — two complaints, not one.
    await openUpload(page);
    await page.locator('input[name="GlobalType"][value="Geo"]').check();

    const attempted = await armWriteBlocker(page);
    await page.getByRole('button', { name: 'Upload' }).click();
    await page.waitForTimeout(2500);

    await expect(page.getByText('Please Select Country')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Please choose a valid file (pdf, doc, jpg, jpeg, png, xlsx)')).toBeVisible();
    expect(attempted, 'a geo upload with no country must send nothing').toHaveLength(0);
  });

  test('a file with no title is refused — the title guard is reached once a file is attached', async ({ page }) => {
    // handleUpload's last guard reads `e.target.title.value`, i.e. the form's named-property
    // lookup for the title input. That lookup only resolves in a real browser, which is why
    // this arm cannot be proven anywhere but here.
    await openUpload(page);
    await page.locator('input[name="FileData"]').setInputFiles(DUMMY_PDF);
    await page.waitForTimeout(1000);

    const attempted = await armWriteBlocker(page);
    await page.getByRole('button', { name: 'Upload' }).click();
    await page.waitForTimeout(2500);
    await assertHealthyPage(page);

    await expect(page.getByText('Please provide a proper title for this document.'))
      .toBeVisible({ timeout: 10000 });
    expect(attempted, `an untitled upload must send nothing. Saw: ${attempted.join(' | ') || 'none'}`)
      .toHaveLength(0);
  });

  test('a titled Global file passes the client guards and reaches the upload endpoint (aborted)', async ({ page }) => {
    // The passing arm of the three refusals above. The POST is aborted in-browser, so no
    // document lands in the policies library.
    await openUpload(page);
    await page.locator('input[name="FileData"]').setInputFiles(DUMMY_PDF);
    await page.locator('input[name="title"]').fill('E2E-TEST coverage-gaps — aborted in-browser, never uploaded');
    await page.waitForTimeout(1000);

    const attempted = await armWriteBlocker(page);
    await page.getByRole('button', { name: 'Upload' }).click();
    await page.waitForTimeout(4000);
    await assertHealthyPage(page);

    expect(attempted,
      `a complete upload must attempt a write. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).not.toHaveLength(0);
    // and none of the three client-side complaints should be on screen
    await expect(page.getByText('Please provide a proper title for this document.')).toHaveCount(0);
    await expect(page.getByText('Please choose a valid file (pdf, doc, jpg, jpeg, png, xlsx)')).toHaveCount(0);
  });
});

test.describe('Manage Policy Accessibility (/app/policiesdocumentlist)', () => {
  test.use({ storageState: 'e2e/.auth/hr-head.json' });

  async function openList(page: Page) {
    await page.goto('/app/policiesdocumentlist', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    await expect(page.getByRole('heading', { name: 'Manage Policy Accessibility' })).toBeVisible({ timeout: 30000 });
  }

  test('the list resolves to document rows or the No Document Found notice', async ({ page }) => {
    await openList(page);
    const rows = page.locator('table tbody tr').filter({ hasNot: page.locator('.notfound') });
    const empty = page.locator('.notfound');
    await expect(rows.first().or(empty)).toBeVisible({ timeout: 30000 });
    if (await empty.count() > 0) {
      await expect(empty).toContainText('No Document Found');
    }
  });

  test('each row\'s toggle label matches that document\'s current state', async ({ page }) => {
    // UploadedDocumentList.js:178 — the button reads "Click to activate" when IsActive is 0
    // and "Click to deactivate" otherwise. A row can only ever offer one of the two.
    await openList(page);
    const buttons = page.locator('table tbody tr td button.btn-primary');
    const count = await buttons.count();
    if (count === 0) test.skip(true, 'no policy documents are listed for this account today');

    for (let i = 0; i < count; i++) {
      const label = (await buttons.nth(i).innerText()).trim();
      expect(['Click to activate', 'Click to deactivate'],
        `row ${i} offers an unexpected accessibility control: "${label}"`).toContain(label);
    }
  });

  test('pressing the toggle issues the status update for that document (aborted — accessibility unchanged)', async ({ page }) => {
    await openList(page);
    const toggle = page.locator('table tbody tr td button.btn-primary').first();
    if (!(await toggle.count())) test.skip(true, 'no policy documents are listed for this account today');

    const attempted = await armWriteBlocker(page);
    await toggle.click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    const updates = attempted.filter(a => a.startsWith('PUT') && a.includes('/updatestatus/'));
    expect(updates,
      `the toggle must PUT /updatestatus/<id>/<flag>. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).not.toHaveLength(0);
  });
});

// COVERAGE GAP 2026-08-18 — schedule templates: delete, edit-save, assign to a department
//
// Source under test : client/src/container/Schedule/TemplateList/TemplateList.js
//                     client/src/container/Schedule/TemplateEdit/TemplateEdit.js
//                     client/src/container/Schedule/ScheduleAssignDepartment/ScheduleAssignDepartment.js
//                     client/src/store/actions/scheduleActions.js
// Menu path         : Manage Department Schedule -> Template List / Assign Department Schedule
// Already covered   : add-template.verified.spec.ts runs signed out (no storageState), so all
//                     of its assertions sit behind an `if (!url.includes('/login'))` that never
//                     fires. roles/{ph,india,morocco}-supervisor open the template list and the
//                     assign-department page and assert Delete / Save / Update / Assign are
//                     VISIBLE, explicitly never clicking them. findings-supervisor opens one
//                     template in edit mode to check it does not white-screen. So no template
//                     action has ever been pressed.
//
// SAFETY: no template is deleted, saved or assigned. Every arm that could write arms a route
// blocker first, aborting the app-origin request before it leaves the browser:
//   DELETE /schedule/<id>/     (deleteSchedule)
//   PUT    /schedule/<id>/     (updateSchedule, the TemplateEdit save)
//   POST   /schedule/assign/   (scheduleAssign, both Update and Assign-to-all)
// NB TemplateList.onDeleteHandler splices the row out of the local array after the confirm, so
// the row disappears from the table even though nothing was deleted — client state only, and
// a reload restores it.
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/ph-supervisor.json' });

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

async function openTemplateList(page: Page) {
  await page.goto('/app/schedule/template/', { waitUntil: 'load', timeout: 30000 });
  await assertHealthyPage(page);
  await waitForAppIdle(page);
  await expect(page.locator('h3.card-title', { hasText: 'List of Template Schedules' }))
    .toBeVisible({ timeout: 30000 });
}

test.describe('Template list — rows and actions', () => {

  test('every template row is numbered, named, and carries both an Edit link and a Delete button', async ({ page }) => {
    await openTemplateList(page);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count === 0) test.skip(true, 'this supervisor has no schedule templates today');

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      await expect(row.locator('td').nth(0), 'row must be numbered').toHaveText(String(i + 1));
      await expect(row.locator('td').nth(1), 'row must name the template').not.toBeEmpty();
      await expect(row.locator('a.btn-primary', { hasText: 'Edit' })).toHaveCount(1);
      await expect(row.locator('button', { hasText: 'Delete' })).toHaveCount(1);
    }
  });

  test('each Edit link deep-links to that template by id', async ({ page }) => {
    await openTemplateList(page);
    const editLink = page.locator('table tbody tr a.btn-primary', { hasText: 'Edit' }).first();
    if (!(await editLink.count())) test.skip(true, 'this supervisor has no schedule templates today');
    await expect(editLink).toHaveAttribute('href', /\/app\/schedule\/template\/\d+$/);
  });

  test('dismissing the delete confirmation leaves the template in place', async ({ page }) => {
    // TemplateList.onDeleteHandler wraps deleteSchedule in window.confirm — the dismiss arm
    // must be a complete no-op, including the local splice.
    await openTemplateList(page);
    const deleteBtn = page.locator('table tbody tr button', { hasText: 'Delete' }).first();
    if (!(await deleteBtn.count())) test.skip(true, 'this supervisor has no schedule templates today');
    const rowsBefore = await page.locator('table tbody tr').count();

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.dismiss());
    await deleteBtn.click();
    await page.waitForTimeout(2500);
    await assertHealthyPage(page);

    expect(attempted.filter(a => a.startsWith('DELETE')),
      `dismissing the confirm must send nothing. Saw: ${attempted.join(' | ') || 'none'}`
    ).toHaveLength(0);
    expect(await page.locator('table tbody tr').count(),
      'the row must still be in the table').toBe(rowsBefore);
  });

  test('accepting the delete confirmation issues a DELETE for that template (aborted)', async ({ page }) => {
    await openTemplateList(page);
    const deleteBtn = page.locator('table tbody tr button', { hasText: 'Delete' }).first();
    if (!(await deleteBtn.count())) test.skip(true, 'this supervisor has no schedule templates today');

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    await deleteBtn.click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    const deletes = attempted.filter(a => a.startsWith('DELETE') && /\/schedule\/\d+\//.test(a));
    expect(deletes,
      `accepting the confirm must issue DELETE /schedule/<id>/. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).not.toHaveLength(0);
  });
});

test.describe('Template edit — saving', () => {

  async function openFirstTemplateForEdit(page: Page): Promise<boolean> {
    await openTemplateList(page);
    const editLink = page.locator('table tbody tr a.btn-primary', { hasText: 'Edit' }).first();
    if (!(await editLink.count())) return false;
    await editLink.click();
    await waitForAppIdle(page);
    await assertHealthyPage(page);
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 30000 });
    return true;
  }

  test('edit mode arrives pre-filled with the template it was opened from', async ({ page }) => {
    const opened = await openFirstTemplateForEdit(page);
    if (!opened) test.skip(true, 'this supervisor has no schedule templates today');
    await expect(page).toHaveURL(/\/app\/schedule\/template\/\d+/);
    await expect(page.locator('input[name="name"]'), 'the name must arrive populated, not blank')
      .not.toHaveValue('');
  });

  test('clearing the name blocks the save — nothing is sent', async ({ page }) => {
    // TemplateEdit shares TemplateCreate's schema, where name is required
    // ("This field is required"). The rejected arm must cost no request.
    const opened = await openFirstTemplateForEdit(page);
    if (!opened) test.skip(true, 'this supervisor has no schedule templates today');
    await page.locator('input[name="name"]').fill('');

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    expect(attempted.filter(a => a.startsWith('PUT')),
      `a nameless template must not be saved. Saw: ${attempted.join(' | ') || 'none'}`
    ).toHaveLength(0);
    await expect(page.getByText('This field is required').first()).toBeVisible({ timeout: 10000 });
  });

  test('saving a named template issues a PUT for that template id (aborted)', async ({ page }) => {
    // The passing arm. The PUT is aborted in-browser, so the live template is untouched.
    const opened = await openFirstTemplateForEdit(page);
    if (!opened) test.skip(true, 'this supervisor has no schedule templates today');
    const templateId = (page.url().match(/\/template\/(\d+)/) || [])[1];
    expect(templateId, 'template id must be readable from the edit URL').toBeTruthy();

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    const puts = attempted.filter(a => a.startsWith('PUT') && a.includes(`/schedule/${templateId}/`));
    expect(puts,
      `Save must PUT /schedule/${templateId}/. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).not.toHaveLength(0);
  });
});

test.describe('Assign a schedule to a whole department', () => {

  async function openAssignDepartment(page: Page) {
    await page.goto('/app/schedule/assign/department', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    await expect(page.getByText('Departments Handled')).toBeVisible({ timeout: 30000 });
  }

  // Picking a department only calls getDefaultSchedule (a GET) — safe, and it is what makes
  // the Update / Assign controls render at all.
  async function selectFirstDepartment(page: Page): Promise<boolean> {
    const deptSelect = page.locator('select').first();
    const optionCount = await deptSelect.locator('option').count();
    if (optionCount <= 1) return false;
    await deptSelect.selectOption({ index: 1 });
    await waitForAppIdle(page);
    await page.waitForTimeout(3000);
    return true;
  }

  test('choosing a department reveals both the Update and the Assign-to-all controls', async ({ page }) => {
    await openAssignDepartment(page);
    const picked = await selectFirstDepartment(page);
    if (!picked) test.skip(true, 'no departments are handled by this account');

    await expect(page.getByRole('button', { name: /^Update$/i }).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: /Assign to all employees/i }).first()).toBeVisible();
  });

  test('Update asks for confirmation and, when confirmed, posts the department schedule (aborted)', async ({ page }) => {
    // ScheduleAssignDepartment.onSubmitHandler builds a per-action confirm message and only
    // calls scheduleAssign once the user agrees. Confirming here is safe: the POST is aborted.
    await openAssignDepartment(page);
    const picked = await selectFirstDepartment(page);
    if (!picked) test.skip(true, 'no departments are handled by this account');

    const attempted = await armWriteBlocker(page);
    let confirmText = '';
    page.on('dialog', d => { confirmText = d.message(); return d.accept(); });

    await page.getByRole('button', { name: /^Update$/i }).first().click();
    await page.waitForTimeout(4000);
    await assertHealthyPage(page);

    expect(confirmText, 'Update must warn that it changes the department schedule')
      .toMatch(/Update Department Schedule/i);
    expect(attempted.filter(a => a.includes('/schedule/assign')),
      `a confirmed Update must POST /schedule/assign/. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).not.toHaveLength(0);
  });

  test('Assign to all employees warns that DTR records will change, and cancelling stops it', async ({ page }) => {
    // The denied arm of the same control — and the one that matters most, because this action
    // rewrites every employee's DTR for the department.
    await openAssignDepartment(page);
    const picked = await selectFirstDepartment(page);
    if (!picked) test.skip(true, 'no departments are handled by this account');

    const attempted = await armWriteBlocker(page);
    let confirmText = '';
    page.on('dialog', d => { confirmText = d.message(); return d.dismiss(); });

    await page.getByRole('button', { name: /Assign to all employees/i }).first().click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    expect(confirmText, 'the assign confirm must spell out the DTR consequence')
      .toMatch(/update their DTR records/i);
    expect(attempted.filter(a => a.includes('/schedule/assign')),
      `cancelling the confirm must send nothing. Saw: ${attempted.join(' | ') || 'none'}`
    ).toHaveLength(0);
  });
});

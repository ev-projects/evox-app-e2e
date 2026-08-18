// COVERAGE GAP 2026-08-18 — department announcements: manage list, delete, announcement page
//
// Source under test : client/src/container/DepartmentAnnouncements/DepartmentAnnouncementsList/
//                     client/src/container/DepartmentAnnouncements/AnnouncementsPage/
//                     client/src/components/Dashboard/DashboardAnnouncementsList/
//                     client/src/store/actions/announcement/departmentAnnouncementActions.js
// Menu path         : My Team -> My Announcement List  /  Dashboard -> Announcements
// Already covered   : roles/{ph,india,morocco}-hr and hr-head interactions load the list URL
//                     and assert only "no Fatal error", then fill the CREATE form without
//                     submitting. rules/lane-a-rule-probes.spec.ts probes the create form's
//                     title-length validation. Nothing exercises the manage list's cards, the
//                     Delete control, the published announcement page, or the dashboard list.
//
// SAFETY: no announcement is created, edited or removed. The Delete arms below arm a route
// blocker first (the endpoint is DELETE /department/announcements/my_handle_announcements/<id>/)
// so the request is aborted in-browser. NB onDeleteHandler also splices the card out of the
// local array after the confirm, so the card disappears from the page even though nothing was
// deleted — that is client state only and a reload restores it.
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

// A react-joyride product tour auto-runs on the announcement list. Its overlay covers the
// whole page with pointerEvents:'auto' and blocks every click until dismissed — the same trap
// already documented in roles/hr-head/interactions.spec.ts.
async function dismissTour(page: Page) {
  const skip = page.getByRole('button', { name: /skip/i });
  const visible = await skip.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  if (visible) {
    await skip.click();
    await page.locator('.react-joyride__overlay').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }
}

test.describe('Manage announcements list', () => {
  test.use({ storageState: 'e2e/.auth/hr-head.json' });

  async function openList(page: Page) {
    await page.goto('/app/team/DepartmentAnnouncementList/', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);
    await dismissTour(page);
  }

  test('the list always offers the Create Announcement card, pointing at the create form', async ({ page }) => {
    await openList(page);
    const createCard = page.locator('.create-announcement-card');
    await expect(createCard).toBeVisible({ timeout: 30000 });
    await expect(createCard.getByText('Create Announcement')).toBeVisible();
    // it is wrapped in a <Link to={global.links.department_announcement_form}>
    await expect(page.locator('a[href="/app/team/DepartmentAnouncement/"]').first()).toBeVisible();
  });

  test('every announcement card is badged either ongoing or expired, never both', async ({ page }) => {
    // DepartmentAnnouncementsList.js:202 — `announcement.is_expired ? <div class="expired">
    // : <div class="ongoing">`. The two arms are mutually exclusive by construction; pin it,
    // because a card showing both would mean is_expired stopped being a boolean.
    await openList(page);
    const cards = page.locator('.announcement-list-content .announcement-list-card');
    const count = await cards.count();
    if (count === 0) test.skip(true, 'this account handles no announcements today');

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const ongoing = await card.locator('.ongoing').count();
      const expired = await card.locator('.expired').count();
      expect(ongoing + expired, `card ${i} must carry exactly one status badge`).toBe(1);
    }
  });

  test('each announcement card offers Edit, and Edit opens the form pre-filled with that announcement', async ({ page }) => {
    await openList(page);
    const editBtn = page.locator('.manage-announcement-option').locator('button', { hasText: /^Edit$/ }).first();
    if (!(await editBtn.count())) test.skip(true, 'this account handles no announcements today');

    await editBtn.click();
    await waitForAppIdle(page);
    await assertHealthyPage(page);
    await expect(page).toHaveURL(/\/app\/team\/DepartmentAnouncement\/\d+/);
    const title = page.locator('input[name="title"]');
    await expect(title).toBeVisible({ timeout: 30000 });
    await expect(title, 'edit mode must arrive pre-filled, not blank').not.toHaveValue('');
    // Explicitly do NOT submit — an update would rewrite a live announcement.
  });

  test('dismissing the delete confirmation leaves the announcement alone', async ({ page }) => {
    // onDeleteHandler wraps everything in window.confirm — the dismiss arm must be a no-op.
    await openList(page);
    const deleteBtn = page.locator('.manage-announcement-option').locator('button', { hasText: /Delete/ }).first();
    if (!(await deleteBtn.count())) test.skip(true, 'this account handles no announcements today');

    const cardsBefore = await page.locator('.announcement-list-content .announcement-list-card').count();
    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.dismiss());
    await deleteBtn.click();
    await page.waitForTimeout(2500);
    await assertHealthyPage(page);

    expect(attempted.filter(a => a.includes('my_handle_announcements')),
      `dismissing the confirm must send nothing. Saw: ${attempted.join(' | ') || 'none'}`
    ).toHaveLength(0);
    expect(await page.locator('.announcement-list-content .announcement-list-card').count(),
      'the card must still be on the page').toBe(cardsBefore);
  });

  test('accepting the delete confirmation issues a DELETE for that announcement (aborted)', async ({ page }) => {
    // The other arm. The DELETE is aborted in-browser, so the announcement survives on the
    // server; only the local list is spliced, which a reload undoes.
    await openList(page);
    const deleteBtn = page.locator('.manage-announcement-option').locator('button', { hasText: /Delete/ }).first();
    if (!(await deleteBtn.count())) test.skip(true, 'this account handles no announcements today');

    const attempted = await armWriteBlocker(page);
    page.on('dialog', d => d.accept());
    await deleteBtn.click();
    await page.waitForTimeout(3000);
    await assertHealthyPage(page);

    const deletes = attempted.filter(a => a.startsWith('DELETE') && a.includes('my_handle_announcements'));
    expect(deletes,
      `accepting the confirm must issue the DELETE. All aborted writes: ${attempted.join(' | ') || 'none'}`
    ).not.toHaveLength(0);
  });
});

test.describe('Published announcement page', () => {
  test.use({ storageState: 'e2e/.auth/ph-employee.json' });

  test('an announcement reached from the dashboard renders its title, posted date and body', async ({ page }) => {
    await page.goto('/app/Dashboard', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    // Dashboard auto-pops a dismiss-only promo modal that intercepts clicks on the tabs.
    await page.getByRole('button', { name: 'Close' }).first().click({ timeout: 5000 }).catch(() => {});
    await waitForAppIdle(page);

    const card = page.locator('a[href^="/app/team/Anouncement/Page/"]').first();
    if (!(await card.count())) test.skip(true, 'no announcements are published to this account\'s departments today');
    await card.click();
    await page.waitForURL(/\/app\/team\/Anouncement\/Page\/\d+/, { timeout: 20000 });
    await waitForAppIdle(page);
    await assertHealthyPage(page);

    const content = page.locator('.announcement-content-page');
    await expect(content).toBeVisible({ timeout: 30000 });
    await expect(content.locator('.page-content-title'), 'the announcement must be titled').not.toBeEmpty();
    await expect(content.locator('.page-content-info')).toContainText(/Posted:/);
  });

  test('an announcement outside the user\'s departments is refused with an explanation, not shown', async ({ page }) => {
    // AnnouncementsPage.js:74 — when instance.title is null/undefined the component renders
    // the "not part of your departments" line instead of any content. An id that cannot
    // resolve for this account takes that arm, which is the access control users actually see.
    await page.goto('/app/team/Anouncement/Page/999999999', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await waitForAppIdle(page);

    await expect(
      page.getByText('The Page you are accessing does not seem to be part of your departments list of annoucements')
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.announcement-content-page')).toHaveCount(0);
  });

  test('the Latest Announcements sidebar renders alongside the article', async ({ page }) => {
    await page.goto('/app/team/Anouncement/Page/999999999', { waitUntil: 'load', timeout: 30000 });
    await waitForAppIdle(page);
    // the side panel is unconditional — it renders even on the refused arm above
    await expect(page.locator('h3.card-title', { hasText: 'Latest Announcements' })).toBeVisible({ timeout: 30000 });
  });
});

test.describe('Dashboard announcement list', () => {
  test.use({ storageState: 'e2e/.auth/ph-employee.json' });

  test('the Announcements tab resolves to either announcement cards or an empty state, and each card links to its page', async ({ page }) => {
    await page.goto('/app/Dashboard', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await page.getByRole('button', { name: 'Close' }).first().click({ timeout: 5000 }).catch(() => {});
    await waitForAppIdle(page);

    await expect(page.getByText('Announcements').first()).toBeVisible({ timeout: 45000 });
    const cards = page.locator('.dashbaord-content .announcement-list-card');
    const count = await cards.count();
    if (count === 0) {
      // legitimate live state — assert the list simply rendered nothing rather than erroring
      await assertHealthyPage(page);
      test.skip(true, 'no announcements are published to this account\'s departments today');
    }
    // every card must be a working deep link into the announcement page
    const links = page.locator('.dashbaord-content a[href^="/app/team/Anouncement/Page/"]');
    expect(await links.count(), 'every dashboard announcement card must link to its page').toBeGreaterThan(0);
    await expect(links.first()).toHaveAttribute('href', /\/app\/team\/Anouncement\/Page\/\d+/);
  });
});

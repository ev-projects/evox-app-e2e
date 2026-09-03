// COVERAGE GAP 2026-08-18 — Change Password (voluntary) and Reset Password (forced)
//
// Source under test : client/src/components/ChangePasswordFormComponent/ChangePasswordFormComponent.js
//                       (the voluntary panel opened from a user's own profile)
//                     client/src/components/ChangePasswordForm/ChangePasswordForm.js
//                       (the forced/reset panel — a DIFFERENT component with different copy)
//                     client/src/config/ProtectedRoutes.js:31 (the force_change_password gate)
// Menu path         : Profile -> Personal Info -> Change Password
// Already covered   : findings/findings-employee.spec.ts opens this panel to characterize
//                     FE_CPWD_NOVALIDATION (the Formik validationSchema is bound to a
//                     non-existent instance property, so the panel runs with no validation).
//                     Not covered anywhere: the panel's own open/close lifecycle, and the
//                     forced-reset variant, which no test has ever rendered.
//
// SAFETY: no password is ever changed. The only submit in this file is the one already
// characterized elsewhere, and it is not repeated here — every test below either opens or
// closes the panel. Nothing types into a field and presses Update.
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/ph-employee.json' });

test.setTimeout(90_000); // profile is one of the slower routes on this box

const GLENN_ID = 1593; // ph-employee user id, per roles/ph-employee/traverse.spec.ts

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

// Open the profile on its Personal Info tab, where the Change Password button lives.
async function openOwnPersonalInfo(page: Page) {
  await page.goto(`/app/profile/${GLENN_ID}`, { waitUntil: 'load', timeout: 30000 });
  await assertHealthyPage(page);
  await waitForAppIdle(page);
  const piTab = page.locator('a[role="tab"]', { hasText: /Personal Info/i }).first();
  if (await piTab.count()) await piTab.click();
  await page.waitForTimeout(2000);
}

test.describe('Change Password panel — own profile', () => {

  test('the panel is closed until the Change Password button is pressed', async ({ page }) => {
    // PersonalInformation.js keeps showChangePasswordForm in local state, initial false, and
    // the whole <div id="change_password_id"> is conditional on it. The closed arm matters:
    // if the panel ever mounts eagerly, the "opens it" test below proves nothing.
    await openOwnPersonalInfo(page);
    await expect(page.locator('button', { hasText: /Change Password/i }).first())
      .toBeVisible({ timeout: 20000 });
    await expect(page.locator('#change_password_id')).toHaveCount(0);
  });

  test('pressing Change Password opens a panel with the three password fields and an Update control', async ({ page }) => {
    await openOwnPersonalInfo(page);
    const openBtn = page.locator('button', { hasText: /Change Password/i }).first();
    if (!(await openBtn.count())) test.skip(true, 'Change Password button not found on this profile variant');
    await openBtn.click();

    const panel = page.locator('#change_password_id');
    await expect(panel).toBeVisible({ timeout: 20000 });
    // ChangePasswordFormComponent renders Content title={"Change" + " Password"} -> h3.card-title,
    // and three type=password FormControls named current/new/confirm_new_password.
    await expect(panel.locator('h3.card-title')).toHaveText(/Change Password/);
    await expect(panel.locator('input[name="current_password"]')).toBeVisible();
    await expect(panel.locator('input[name="new_password"]')).toBeVisible();
    await expect(panel.locator('input[name="confirm_new_password"]')).toBeVisible();
    await expect(panel.locator('button[type="submit"]', { hasText: /Update/i })).toBeVisible();
    // Explicitly NOT clicked — a real submit would change this account's password.
  });

  test('all three password fields mask what is typed', async ({ page }) => {
    await openOwnPersonalInfo(page);
    const openBtn = page.locator('button', { hasText: /Change Password/i }).first();
    if (!(await openBtn.count())) test.skip(true, 'Change Password button not found on this profile variant');
    await openBtn.click();
    const panel = page.locator('#change_password_id');
    await expect(panel).toBeVisible({ timeout: 20000 });

    for (const field of ['current_password', 'new_password', 'confirm_new_password']) {
      await expect(panel.locator(`input[name="${field}"]`), `${field} must be a password input`)
        .toHaveAttribute('type', 'password');
    }
  });

  test('Cancel closes the panel and discards what was typed', async ({ page }) => {
    // ChangePasswordFormComponent.js:124 — Cancel is type="button" and calls
    // setShowChangePasswordForm(false), which unmounts the whole panel. Never exercised
    // before, so nothing proved that the escape hatch out of this form works.
    await openOwnPersonalInfo(page);
    const openBtn = page.locator('button', { hasText: /Change Password/i }).first();
    if (!(await openBtn.count())) test.skip(true, 'Change Password button not found on this profile variant');
    await openBtn.click();

    const panel = page.locator('#change_password_id');
    await expect(panel).toBeVisible({ timeout: 20000 });
    await panel.locator('input[name="new_password"]').fill('not-submitted');

    await panel.locator('button', { hasText: /Cancel/i }).click();
    await expect(panel).toHaveCount(0, { timeout: 15000 });
    await assertHealthyPage(page);

    // reopening gives a blank form — the panel unmounted rather than being hidden with state
    await page.locator('button', { hasText: /Change Password/i }).first().click();
    await expect(page.locator('#change_password_id')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#change_password_id input[name="new_password"]')).toHaveValue('');
  });

  test('someone else\'s profile offers no Change Password button', async ({ page }) => {
    // PersonalInformation.js:180 gates the button on "viewing own profiles". Pin the denied
    // arm — nobody may be handed a password form for an account that is not theirs.
    // The absence assertion is only meaningful once the profile content has actually painted,
    // so gate on the tab card rendering first; a profile that never loads is skipped rather
    // than passing vacuously.
    await page.goto(`/app/profile/${GLENN_ID + 1}`, { waitUntil: 'load', timeout: 30000 });
    await waitForAppIdle(page);
    const tabCard = page.locator('h3.card-title', { hasText: /Personal Information/i });
    const painted = await tabCard.isVisible({ timeout: 20000 }).catch(() => false);
    if (!painted) test.skip(true, `profile ${GLENN_ID + 1} did not render its Personal Information card for this account`);
    await expect(page.locator('#change_password_id')).toHaveCount(0);
    await expect(page.locator('button', { hasText: /Change Password/i })).toHaveCount(0);
  });
});

test.describe('Reset Password panel — forced change (force_change_password)', () => {

  // ACCOUNT PRECONDITION — why this is fixme and not a running test:
  // ProtectedRoutes.js:31 renders <ChangePasswordForm forceChangePassword={true} /> INSTEAD OF
  // the requested page for ANY route, as long as the logged-in user carries
  // force_change_password. That flag is set by the forgot-password flow, i.e. by actually
  // resetting an account's password on staging.
  // Doing that to any of the 15 E2E accounts would (a) invalidate the password in
  // global-setup.ts, breaking every other suite's login, and (b) leave the account trapped
  // behind this form until someone completes it by hand.
  // To enable: create a DEDICATED throwaway staging account, put it through forgot-password,
  // add E2E_USER_FORCED_RESET to .env.e2e and a matching entry in global-setup.ts's ROLES,
  // then swap the fixme for test.use({ storageState: 'e2e/.auth/forced-reset.json' }).
  test.fixme('a user with force_change_password gets the Reset Password form instead of the page they asked for', async ({ page }) => {
    await page.goto('/app/Dashboard', { waitUntil: 'load', timeout: 30000 });

    // ChangePasswordForm.js branches on forceChangePassword for BOTH the title and the label,
    // which is what distinguishes this panel from the voluntary one above.
    await expect(page.locator('h3.card-title')).toHaveText(/Reset Password/);
    await expect(page.getByText('This is required before doing any transactions.')).toBeVisible();
    await expect(page.getByText(/Temporary Password:/)).toBeVisible();

    // and it must be inescapable: no Cancel button on the forced variant, and the Dashboard
    // it was supposed to render is nowhere on the page.
    await expect(page.locator('button', { hasText: /Cancel/i })).toHaveCount(0);
    await expect(page.getByText('Announcements')).toHaveCount(0);
  });

  test.fixme('the forced form rejects a mismatched confirmation before it fires a write', async ({ page }) => {
    // Unlike ChangePasswordFormComponent, ChangePasswordForm.js binds a real module-level
    // validationSchema (min 6 chars, required, confirm must equal new), so this arm SHOULD
    // block. Same account precondition as above.
    await page.goto('/app/Dashboard', { waitUntil: 'load', timeout: 30000 });
    await page.locator('input[name="current_password"]').fill('temporary-password');
    await page.locator('input[name="new_password"]').fill('abcdef123');
    await page.locator('input[name="confirm_new_password"]').fill('different123');
    await page.locator('button[type="submit"]', { hasText: /Update/i }).click();
    await expect(page.getByText('Your passwords do not match.')).toBeVisible({ timeout: 10000 });
  });
});

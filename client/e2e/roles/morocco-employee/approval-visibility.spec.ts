// ROLE × PERMISSION MATRIX — approval-control VISIBILITY (read-only, live-dump safe)
//
// WHY: line coverage says a page rendered; it does NOT say "the Approve button appears for the
// right role and is absent for the wrong one". This spec asserts exactly that, per role, without
// ever clicking a mutating control — the staging DB is a live backup dump.
//
// HOW TO DEPLOY: copy this file into each role folder as approval-visibility.spec.ts and set the
// two constants at the top (ROLE + EXPECTS). Roles and supervisor→employee links come from
// server/tests/Feature/BranchTests/_ROLE-ACCOUNTS.md:
//     ph:      gary.aure (supervisor)      → glenn.macasarte (employee)
//     india:   nidhi.shrivastava           → komal.prasad
//     morocco: hajar.alaoui                → mariam.elmakrini
//
// EXPECTS semantics per surface:
//   'visible' — the control MUST render for this role (permission granted)
//   'absent'  — the control MUST NOT render (permission correctly withheld)
//   'either'  — data-dependent (e.g. already-approved rows hide Approve); assert page health only
//
// The matrix intent mirrors the backend role tests (role.*ApprovalRoleTest.php): employees may not
// approve anything (not even their own request); supervisors may approve their own supervisees;
// admin/HR/payroll per each endpoint's gate. Any MISMATCH between this spec and the backend matrix
// is a real finding — report it, don't "fix" the assertion.

import { test, expect } from '@playwright/test';

// ── configure per role folder ────────────────────────────────────────────────
const ROLE = 'morocco-employee';
const EXPECTS: Record<string, 'visible' | 'absent' | 'either'> = {
  myTeamRequests: 'absent',
  approveControl: 'absent',
  bulkUpdate: 'absent',
  myOwnRequestPage: 'visible',
  ownRequestApprove: 'absent',
};
// ─────────────────────────────────────────────────────────────────────────────

test.use({ storageState: `e2e/.auth/${ROLE}.json` });

const NO_ERROR_SIGNATURES = ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops'];

async function assertHealthyPage(page: import('@playwright/test').Page) {
  expect(page.url(), 'must not bounce to login').not.toContain('/login');
  const body = await page.locator('body').innerText();
  for (const sig of NO_ERROR_SIGNATURES) {
    expect(body, 'no PHP error text').not.toContain(sig);
  }
}

async function assertPresence(
  locator: import('@playwright/test').Locator,
  expectation: 'visible' | 'absent' | 'either',
  label: string
) {
  const count = await locator.count();
  if (expectation === 'visible') {
    expect(count, `${label} must render for ${ROLE}`).toBeGreaterThan(0);
    await expect(locator.first()).toBeVisible();
  } else if (expectation === 'absent') {
    expect(count, `${label} must NOT render for ${ROLE} (permission withheld)`).toBe(0);
  }
  // 'either' → presence is data-dependent; page health is asserted separately
}

test.describe(`${ROLE} — approval control visibility (no clicks)`, () => {

  test('My Team Requests: list access + bulk control per role', async ({ page }) => {
    await page.goto('/app/team/MyTeamRequests', { waitUntil: 'load', timeout: 30000 });

    if (EXPECTS.myTeamRequests === 'absent') {
      // permission-gated away: either bounced, or the page renders without the team list
      const list = page.locator('tbody.request_list');
      expect(await list.count(), 'team list must not render for this role').toBe(0);
      return;
    }

    await assertHealthyPage(page);
    await expect(page.locator('h3.header_text', { hasText: 'My Team Request' })).toBeVisible();
    await assertPresence(
      page.getByRole('button', { name: /^Update$/i }), EXPECTS.bulkUpdate, 'bulk Update button');
  });

  test('Supervisee request detail: Approve/Decline visibility matches the role gate', async ({ page }) => {
    test.skip(EXPECTS.myTeamRequests === 'absent', 'role has no team request surface');

    await page.goto('/app/team/MyTeamRequests', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);

    const viewLink = page.locator('tbody.request_list a.nav-link').first();
    if (!(await viewLink.count())) {
      test.skip(true, 'no team request rows available in the current staging data');
      return;
    }
    await viewLink.click();
    await assertHealthyPage(page);

    await assertPresence(
      page.getByRole('button', { name: /Approve/i }), EXPECTS.approveControl, 'Approve button');
    await assertPresence(
      page.getByRole('button', { name: /Decline/i }), EXPECTS.approveControl, 'Decline button');
  });

  test('Own request detail: self-approval controls are never offered', async ({ page }) => {
    await page.goto('/app/request/MyRequests', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);

    const viewLink = page.locator('tbody a.nav-link, tbody a[href*="/request/"]').first();
    if (!(await viewLink.count())) {
      test.skip(true, 'no own-request rows available in the current staging data');
      return;
    }
    await viewLink.click();
    await assertHealthyPage(page);

    // The self-approval guard: even a supervisor must not see Approve on THEIR OWN request.
    await assertPresence(
      page.getByRole('button', { name: /Approve/i }), EXPECTS.ownRequestApprove,
      'Approve on own request (self-approval guard)');
  });
});

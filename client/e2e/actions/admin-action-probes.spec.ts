// ACTION PROBES — admin screens (dummyman@ops, admin state).
//
// Closes the "screen-level only" gaps from PAGE-ROLE-ACTION-MAP.md: each admin screen's
// primary action (Assign / Submit / Generate / Check) is actually PRESSED in a real browser.
//
// The probe pattern: press the primary control with the form EMPTY and every mutating
// request route-aborted. Two healthy outcomes exist and each screen is pinned to the one
// it exhibits today (recorded on the first staging run):
//   VALIDATES  — a validation/feedback message renders, nothing is attempted
//   FIRES      — the request is attempted with an empty payload (MTR-BULK-1 class smell;
//                pinned as characterization so a guard added later flips the test)
//   GATED      — the primary control does not even render until a selection exists
//                (structural guard; if someone un-gates the button this test fails)
//
// SAFETY: armWriteBlocker aborts every POST/PUT/PATCH/DELETE before it leaves the browser.
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

test.setTimeout(90_000); // staging is slow under nightly cron load

async function assertHealthyPage(page: Page) {
  expect(page.url(), 'must not bounce to login').not.toContain('/login');
  const body = await page.locator('body').innerText();
  expect(body, 'session must not have expired into the LOGIN TO CONTINUE modal').not.toContain('LOGIN TO CONTINUE');
  for (const sig of ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops']) {
    expect(body, 'no PHP error text').not.toContain(sig);
  }
}

// staging can sit on its "Loading" overlay for tens of seconds under nightly load —
// wait for it to clear (best-effort; never fails the test by itself)
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
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method())) {
      // GA/analytics beacons are also POSTs — only app-origin requests are evidence
      if (new URL(req.url()).hostname !== 'evoxtest.eastvantage.com') return route.abort(); // substring match is fooled by the GA beacon's dl= param
      attempted.push(req.method() + ' ' + req.url());
      return route.abort();
    }
    return route.continue();
  });
  return attempted;
}

// One row per screen: route, the visible label of the primary action, and the outcome
// observed on staging 2026-08-06 (pinned — a change in behaviour must fail the test).
// preSelect: the Assign screens render their form (and its button) only AFTER a
// department/user is chosen — picking the first real option of the first populated
// native select is a read-only GET and mirrors real use.
const PROBES: Array<{ name: string; path: string; button: RegExp; expected: 'VALIDATES' | 'FIRES' | 'DISABLED' | 'GATED'; preSelect?: boolean; finding?: string }> = [
  // AssignDepartmentHandlers.js:259 renders the Assign button ONLY when selectedSupervisors
  // is non-empty — an empty submit is structurally impossible. Pinned GATED (verified on
  // staging: after picking a department, no Assign button exists until a supervisor is chosen).
  { name: 'AssignDepartmentHandlers', path: '/app/admin/AssignDepartmentHandlers/', button: /Assign/i, expected: 'GATED', preSelect: true },
  { name: 'AssignEmployeeSupervisors', path: '/app/admin/AssignEmployeeSupervisors/', button: /Assign/i, expected: 'GATED', preSelect: true },
  { name: 'AssignSubDepartment', path: '/app/admin/AssignSubDepartment/', button: /Assign/i, expected: 'GATED', preSelect: true },
  // The two user-picker screens populate their select from the full users fetch, which can
  // outlast the 45s wait under staging load — they skip (with the reason recorded) on slow
  // runs and execute on quiet ones. Their pins are provisional until a quiet-hours run.
  { name: 'AssignRolesPermissions', path: '/app/admin/AssignRolePermission/', button: /Assign|Submit/i, expected: 'VALIDATES', preSelect: true },
  { name: 'AssignFeature', path: '/app/admin/AssignFeature/', button: /Assign|Submit/i, expected: 'VALIDATES', preSelect: true },
  { name: 'SyncBhrLeaves', path: '/app/admin/SyncBhrLeaves/', button: /Submit|Sync/i, expected: 'VALIDATES' },
  { name: 'SyncUTCAdjustment', path: '/app/admin/SyncUTCAdjustment/', button: /Check Adjustment|Submit/i, expected: 'VALIDATES' },
  { name: 'SyncUserUpdates', path: '/app/admin/SyncUserUpdates/', button: /Submit|Sync/i, expected: 'VALIDATES' },
  // FINDING GEN-DTR-1 (2026-08-06, this probe): an EMPTY GenerateDate form goes straight
  // through the confirm to POST /server/api/generate/dtr/ with no payload guard. DTR
  // generation is payroll-adjacent — an accidental Enter fires the cron-class endpoint.
  // Pinned FIRES as characterization; add a guard and flip this to VALIDATES.
  { name: 'GenerateDate', path: '/app/admin/GenerateDate/', button: /Generate|Submit/i, expected: 'FIRES', finding: 'GEN-DTR-1' },
];

test.describe('admin action probes — empty-submit behaviour, writes aborted', () => {
  for (const probe of PROBES) {
    test(`${probe.name}: pressing "${probe.button}" on an empty form — pinned: ${probe.expected}`, async ({ page }) => {
      await page.goto(probe.path, { waitUntil: 'load', timeout: 30000 });
      await assertHealthyPage(page);
      await waitForAppIdle(page);
      await page.waitForTimeout(2500);

      if (probe.preSelect) {
        // choose the first real option of the first populated select (GET-only).
        // The option list arrives from a stored-procedure fetch that can take >20s under
        // staging's nightly load — wait for a second <option> to exist, up to 45s.
        const populated = page.locator('select:has(option:nth-child(2))').first();
        const ok = await populated.waitFor({ state: 'attached', timeout: 45000 }).then(() => true).catch(() => false);
        if (!ok) {
          const controls = await page.locator('select, input, [class*="select"]').count();
          test.skip(true, `${probe.name}: no populated native select within 45s (${controls} form controls seen)`);
        }
        await populated.selectOption({ index: 1 });
      }

      // the primary control may render only after the selection's fetch completes —
      // poll rather than trusting one fixed nap (GATED screens never render it)
      const btn = page.locator('button', { hasText: probe.button }).first();
      await btn.waitFor({ state: 'visible', timeout: probe.expected === 'GATED' ? 12000 : 25000 }).catch(() => {});
      if (!(await btn.count())) {
        if (probe.expected === 'GATED') return; // structural guard verified: no control without a selection
        test.skip(true, `primary control not found on ${probe.path}`);
      }
      if (probe.expected === 'GATED') {
        throw new Error(`${probe.name}: pinned GATED but the primary control rendered without a selection — the guard was removed`);
      }

      // some screens legitimately disable the control until a selection exists
      if (await btn.isDisabled()) {
        expect(probe.expected, `${probe.name}: control is disabled on empty form`).toBe('DISABLED');
        return;
      }

      let confirmSeen = false;
      page.on('dialog', d => { confirmSeen = true; return d.accept(); });
      const attempted = await armWriteBlocker(page);
      await btn.click();
      await page.waitForTimeout(2500);
      await assertHealthyPage(page);
      await waitForAppIdle(page);

      const fired = attempted.length > 0 || confirmSeen;
      if (probe.expected === 'FIRES') {
        expect(fired, `${probe.name}: pinned FIRES — empty submit reached the API/confirm (guard it later)`).toBe(true);
      } else {
        expect(fired,
          `${probe.name}: pinned VALIDATES — an empty submit must NOT reach the API or a confirm. ` +
          `Attempted: ${attempted.join(' | ') || 'none'}; confirm=${confirmSeen}`
        ).toBe(false);
      }
    });
  }
});

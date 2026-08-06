// ACTION PROBES — admin screens (dummyman@ops, admin state).
//
// Closes the "screen-level only" gaps from PAGE-ROLE-ACTION-MAP.md: each admin screen's
// primary action is actually PRESSED in a real browser with its API calls intercepted.
//
// ⚠ HISTORY (2026-08-07 audit): the first version of this file blocked only
// POST/PUT/PATCH/DELETE and pressed the Sync buttons believing that was read-safe.
// EVOX MUTATES OVER GET on those screens (SyncUTCAdjustment → GET /utc/sync_adjustment/
// updates every utc_timelogs row; SyncBhrLeaves → GET /cron/sync_leaves/...; SyncUserUpdates
// → GET /cron/sync_users/...), so the probe fired real staging mutations. Registered as
// SYNC-GET-1. The blocker now also aborts app-origin GETs matching each probe's endpoint.
//
// Outcomes pinned per screen:
//   VALIDATES — pressing the control with nothing filled reaches neither its endpoint nor a
//               window.confirm (client-side guard works)
//   FIRES     — the endpoint request (or its confirm) IS attempted with nothing filled —
//               characterized defect; add a guard and flip the pin
//   SMOKE     — data-dependent screens (the Assign trio): the button may or may not render
//               depending on existing assignments; whatever renders is exercised with all
//               writes aborted and the page must stay healthy
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

test.setTimeout(90_000); // staging is slow under nightly cron load

const APP_HOST = 'evoxtest.eastvantage.com';

async function assertHealthyPage(page: Page) {
  expect(page.url(), 'must not bounce to login').not.toContain('/login');
  const body = await page.locator('body').innerText();
  expect(body, 'session must not have expired into the LOGIN TO CONTINUE modal').not.toContain('LOGIN TO CONTINUE');
  for (const sig of ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops']) {
    expect(body, 'no PHP error text').not.toContain(sig);
  }
}

// staging can sit on its "Loading" overlay for tens of seconds under nightly load
async function waitForAppIdle(page: Page, ms = 45000) {
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading'),
    undefined, { timeout: ms },
  ).catch(() => {});
}

/**
 * Abort every app-origin non-GET request, AND every app-origin API GET whose path matches
 * `endpoint` (EVOX mutates over GET — see SYNC-GET-1). Records only requests matching
 * `endpoint`, so assertions are about THIS screen's action, not background traffic.
 *
 * MUST be armed AFTER the page has loaded (and after any read-only pre-select): the SPA
 * bootstraps over POST (fetchUser etc.), and arming before goto leaves the page
 * half-rendered with no gated content — that broke every probe in this file once.
 * Endpoint matching is restricted to /server/ API paths so a pattern like /assign/i can
 * never match the SPA page URL itself (aborting the document navigation).
 */
async function armBlocker(page: Page, endpoint: RegExp): Promise<string[]> {
  const attempted: string[] = [];
  await page.route('**/*', route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname !== APP_HOST) {
      // analytics beacons etc. — abort writes, let reads through
      return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method()) ? route.abort() : route.continue();
    }
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method());
    const isApi = url.pathname.startsWith('/server/');
    const isTarget = isApi && endpoint.test(url.pathname);
    if (isTarget) attempted.push(req.method() + ' ' + url.pathname);
    if (isWrite || isTarget) return route.abort();
    return route.continue();
  });
  return attempted;
}

const PROBES: Array<{ name: string; path: string; button: RegExp; endpoint: RegExp; expected: 'VALIDATES' | 'FIRES' | 'SMOKE'; preSelect?: boolean }> = [
  // Assign screens are data-dependent: AssignDepartmentHandlers pre-fills the supervisor
  // MultiSelect from the department's EXISTING handlers (componentWillReceiveProps), so
  // after picking a department the Assign button may legitimately render. SMOKE mode.
  { name: 'AssignDepartmentHandlers', path: '/app/admin/AssignDepartmentHandlers/', button: /Assign/i, endpoint: /assign/i, expected: 'SMOKE', preSelect: true },
  { name: 'AssignEmployeeSupervisors', path: '/app/admin/AssignEmployeeSupervisors/', button: /Assign/i, endpoint: /assign/i, expected: 'SMOKE', preSelect: true },
  { name: 'AssignSubDepartment', path: '/app/admin/AssignSubDepartment/', button: /Assign/i, endpoint: /assign/i, expected: 'SMOKE', preSelect: true },
  { name: 'AssignRolesPermissions', path: '/app/admin/AssignRolePermission/', button: /Assign|Submit/i, endpoint: /assign|role/i, expected: 'SMOKE', preSelect: true },
  { name: 'AssignFeature', path: '/app/admin/AssignFeature/', button: /Assign|Submit/i, endpoint: /assign|feature/i, expected: 'SMOKE', preSelect: true },
  // FINDING SYNC-GET-1: ALL THREE Sync screens mutate over GET and ALL THREE fire on an
  // empty submit — the forms pre-fill default date windows, so "empty" still launches the
  // sync for the current cutoff range (verified 2026-08-07 with the endpoint recorder:
  // GET /server/api/cron/sync_leaves/2026-07-16/2026-08-15 and
  // GET /server/api/cron/sync_users/2026-07-16T00:00:00-00:00 both fired, no confirm).
  // The blocker aborts the endpoint GETs before they leave the browser.
  { name: 'SyncBhrLeaves', path: '/app/admin/SyncBhrLeaves/', button: /Submit|Sync/i, endpoint: /sync_leaves|cron\/sync/i, expected: 'FIRES' },
  // SyncUTCAdjustment.js additionally has its validationSchema COMMENTED OUT.
  { name: 'SyncUTCAdjustment', path: '/app/admin/SyncUTCAdjustment/', button: /Check Adjustment|Submit/i, endpoint: /sync_adjustment/i, expected: 'FIRES' },
  { name: 'SyncUserUpdates', path: '/app/admin/SyncUserUpdates/', button: /Submit|Sync/i, endpoint: /sync_users/i, expected: 'FIRES' },
  // FINDING GEN-DTR-1: the Generate button's onClick calls generate(values) DIRECTLY,
  // bypassing Formik/Yup entirely (GenerateDate.js:87; the schema at :120 is never consulted
  // on that path), and the form arrives PRE-FILLED with the current payroll cutoff dates —
  // one confirm away from regenerating DTRs for the whole current cutoff. Pinned FIRES.
  { name: 'GenerateDate', path: '/app/admin/GenerateDate/', button: /Generate|Submit/i, endpoint: /generate\/dtr/i, expected: 'FIRES' },
];

test.describe('admin action probes — primary action pressed, endpoint + writes aborted', () => {
  for (const probe of PROBES) {
    test(`${probe.name}: primary action with nothing filled — pinned: ${probe.expected}`, async ({ page }) => {
      await page.goto(probe.path, { waitUntil: 'load', timeout: 30000 });
      await assertHealthyPage(page);
      await waitForAppIdle(page);
      await page.waitForTimeout(2500);

      if (probe.preSelect) {
        const populated = page.locator('select:has(option:nth-child(2))').first();
        const ok = await populated.waitFor({ state: 'attached', timeout: 45000 }).then(() => true).catch(() => false);
        if (!ok) {
          const controls = await page.locator('select, input, [class*="select"]').count();
          test.skip(true, `${probe.name}: no populated native select within 45s (${controls} form controls seen)`);
        }
        await populated.selectOption({ index: 1 });
      }

      const btn = page.locator('button', { hasText: probe.button }).first();
      await btn.waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
      const btnRendered = (await btn.count()) > 0 && await btn.isVisible().catch(() => false);

      // armed after load/pre-select (both read-only), strictly BEFORE any click
      const attempted = await armBlocker(page, probe.endpoint);
      let confirmSeen = false;
      page.on('dialog', d => { confirmSeen = true; return d.accept(); });

      if (probe.expected === 'SMOKE') {
        // data-dependent: exercise whatever rendered; the invariant is page health with
        // every write and every endpoint call aborted
        if (btnRendered && !(await btn.isDisabled())) {
          await btn.click();
          await page.waitForTimeout(2500);
        }
        await assertHealthyPage(page);
        test.info().annotations.push({ type: 'observed', description: `${probe.name}: button=${btnRendered}, endpoint attempts=${attempted.length}, confirm=${confirmSeen}` });
        return;
      }

      expect(btnRendered, `${probe.name}: primary control must render`).toBe(true);
      if (await btn.isDisabled()) {
        throw new Error(`${probe.name}: control is disabled on an empty form — repin as DISABLED if intentional`);
      }
      await btn.click();
      await page.waitForTimeout(2500);
      await assertHealthyPage(page);

      const fired = attempted.length > 0 || confirmSeen;
      if (probe.expected === 'FIRES') {
        expect(fired, `${probe.name}: pinned FIRES — the endpoint/confirm must have been attempted (aborted here). Attempts: ${attempted.join(' | ') || 'none'}`).toBe(true);
      } else {
        expect(fired,
          `${probe.name}: pinned VALIDATES — an empty submit must NOT reach ${probe.endpoint} or a confirm. ` +
          `Attempted: ${attempted.join(' | ') || 'none'}; confirm=${confirmSeen}`
        ).toBe(false);
      }
    });
  }
});

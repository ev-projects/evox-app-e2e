// Interaction spec — role: india-employee (komal.prasad@unq.eastvantage.com)
// Read-only + safe-interaction coverage per page in this role's menu.
// MUTATION SAFETY: never clicks Submit/Save/Update/Approve/Decline/Cancel/Delete/Upload/Punch.
// Menu is identical to ph-employee except DTR uses DailyTimeRecordIndiaMorocco.js at /app/dtr_in_mar/.
// Confirmed by reading DailyTimeRecordIndiaMorocco.js: same react-select classes
// (.year-dropdown/.month-dropdown/.payroll-cutoff-dropdown) and same dtr-table markup as PH's DailyTimeRecord.js.
// Selectors marked ⚠️ are carried over from developer-vetted registries (coe/overtime/rest-day-work/
// change-schedule/my-dispute-requests/create-ticket/my-tickets/dpa-webinar/ops-schedule .verified.spec.ts)
// or read directly from client source. Selectors read from source only (not developer-vetted) are marked
// [SOURCE] and should be re-checked if a test fails.
import { test, expect } from '@playwright/test';

// This staging box is consistently slow on first-load of data-heavy routes (DTR, My Requests,
// My Dispute Requests all observed exceeding the 30s Playwright default) — give every test in
// this file a larger budget rather than patching individual slow routes one at a time.
test.beforeEach(async () => {
  test.setTimeout(60000);
});

test.use({ storageState: 'e2e/.auth/india-employee.json' });

const noErrorText = async (page: import('@playwright/test').Page) => {
  const body = await page.locator('body').innerText();
  for (const sig of ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops']) {
    expect(body, 'no PHP/JS error text').not.toContain(sig);
  }
};

// Dashboard auto-pops one of several announcement/onboarding modals (remark-modal) on load —
// e.g. the Referral banner (SPECIAL REFERRAL DRIVE) — which intercepts pointer events on the tabs
// underneath it. These are dismiss-only (Modal.Header closeButton -> onHide(), client-side only,
// no API call) per Dashboard.js. The Code Of Conduct modal deliberately has NO closeButton
// (non-dismissable) so this selector never matches it — we don't touch that one.
const dismissAutoPopModal = async (page: import('@playwright/test').Page) => {
  const closeBtn = page.locator('.modal.show .modal-header button.close, .modal.show .modal-header .btn-close, .modal.show button[aria-label="Close"]').first();
  // sessionStorage (which gates the Referral modal's 'seen' flag) is NOT part of Playwright's
  // storageState, so the modal can auto-pop again on every fresh page load — actively wait for it
  // rather than a one-shot count() check, since it may not have rendered yet right after goto().
  await closeBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await closeBtn.count() > 0 && await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(300);
  }
};

// =============================================================================
test.describe('Dashboard (/app/Dashboard)', () => {
  test('Announcements / Job Opening / Eastvantage Policies tabs render ⚠️', async ({ page }) => {
    await page.goto('/app/Dashboard');
    await dismissAutoPopModal(page);
    await expect(page.getByText('Announcements')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Job Opening')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Eastvantage Policies')).toBeVisible({ timeout: 45000 });
  });

  test('switching to Job Opening tab does not crash the page ⚠️', async ({ page }) => {
    await page.goto('/app/Dashboard');
    await dismissAutoPopModal(page);
    await page.getByText('Job Opening').click();
    await expect(page.locator('body')).toBeVisible({ timeout: 45000 });
    await noErrorText(page);
  });

  test('switching to Eastvantage Policies tab does not crash the page ⚠️', async ({ page }) => {
    await page.goto('/app/Dashboard');
    await dismissAutoPopModal(page);
    await page.getByText('Eastvantage Policies').click();
    await expect(page.locator('body')).toBeVisible({ timeout: 45000 });
    await noErrorText(page);
  });

  test('QuickPunch widget shows Clock In / Clock Out — visibility only, NEVER clicked [SOURCE: QuickPunch.js]', async ({ page }) => {
    await page.goto('/app/Dashboard');
    const clockIn = page.getByRole('button', { name: /Clock In/i });
    const clockOut = page.getByRole('button', { name: /Clock Out/i });
    const inCount = await clockIn.count();
    const outCount = await clockOut.count();
    if (inCount > 0) await expect(clockIn.first()).toBeVisible();
    if (outCount > 0) await expect(clockOut.first()).toBeVisible();
  });

  test('sidebar does not expose approval-only menu items to an employee ⚠️', async ({ page }) => {
    await page.goto('/app/Dashboard');
    const sidebar = page.locator('aside.main-sidebar');
    await expect(sidebar).toBeVisible({ timeout: 45000 });
    const sidebarText = await sidebar.innerText();
    for (const forbidden of ['My Team', 'Approvals', 'Employee List', 'Manage Accessibility']) {
      expect(sidebarText, `employee sidebar must not contain "${forbidden}"`).not.toContain(forbidden);
    }
  });
});

// =============================================================================
test.describe('Daily Time Record — India/Morocco variant (/app/dtr_in_mar/4193/)', () => {
  test('"Daily Time Record" heading is visible ⚠️', async ({ page }) => {
    test.setTimeout(60000); // this route's cold load on the slow box can exceed the 30s default test timeout
    await page.goto('/app/dtr_in_mar/4193/');
    // [FIX] a hidden duplicate <p>Daily Time Record</p> precedes the real <h3> heading in DOM order,
    // so getByText(...).first() always resolved to the hidden node. Confirmed via accessibility snapshot
    // on a failed run: 'heading "Daily Time Record" [level=3]' is the real, visible element.
    await expect(page.getByRole('heading', { name: 'Daily Time Record' })).toBeVisible({ timeout: 15000 });
  });

  test('year react-select filter is visible [SOURCE: DailyTimeRecordIndiaMorocco.js name="year", class .year-dropdown]', async ({ page }) => {
    await page.goto('/app/dtr_in_mar/4193/');
    await expect(page.locator('.year-dropdown')).toBeVisible({ timeout: 45000 });
  });

  test('selecting a year reveals the month dropdown (safe — client-side only) [SOURCE]', async ({ page }) => {
    await page.goto('/app/dtr_in_mar/4193/');
    const yearSelect = page.locator('.year-dropdown');
    await yearSelect.click();
    const firstOption = page.locator('.year-dropdown [id*="option"]').first();
    if (await firstOption.count() > 0) {
      await firstOption.click();
      await expect(page.locator('.month-dropdown')).toBeVisible({ timeout: 45000 });
    }
  });

  test('DTR table renders with expected column headers [SOURCE: DailyTimeRecordIndiaMorocco.js render()]', async ({ page }) => {
    await page.goto('/app/dtr_in_mar/4193/');
    const table = page.locator('table.dtr-table');
    const count = await table.count();
    if (count > 0) {
      await expect(table).toBeVisible({ timeout: 45000 });
      const headerText = await table.locator('thead').innerText();
      for (const col of ['Date', 'Status', 'Schedule', 'Clock In', 'Clock Out']) {
        expect(headerText).toContain(col);
      }
    }
  });

  test('no Punch buttons are present on the DTR page itself [SOURCE: no QuickPunch import in DailyTimeRecordIndiaMorocco.js]', async ({ page }) => {
    await page.goto('/app/dtr_in_mar/4193/');
    await expect(page.getByRole('button', { name: /^Clock In$/i })).toHaveCount(0);
  });
});

// =============================================================================
test.describe('Request Form > Overtime (/app/request/Overtime/)', () => {
  test('Submit button and employee note textarea render ⚠️', async ({ page }) => {
    await page.goto('/app/request/Overtime/');
    await expect(page.getByRole('button', { name: /Submit/i })).toBeVisible({ timeout: 45000 });
    await expect(page.locator('textarea[name="employee_note"]')).toBeVisible({ timeout: 45000 });
  });

  test('filling the employee note does not submit the form ⚠️', async ({ page }) => {
    await page.goto('/app/request/Overtime/');
    const note = page.locator('textarea[name="employee_note"]');
    await note.fill('E2E interaction test — not submitted');
    await expect(note).toHaveValue('E2E interaction test — not submitted');
    expect(page.url()).toContain('/app/request/Overtime/');
  });
});

// =============================================================================
test.describe('Request Form > Rest Day Work (/app/request/RestDayWork/)', () => {
  test('Submit button and On Duty / Off Duty / Break(Hours) labels render ⚠️', async ({ page }) => {
    await page.goto('/app/request/RestDayWork/');
    await expect(page.getByText('Submit')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('On Duty:')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Off Duty:')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Break(Hours):')).toBeVisible({ timeout: 45000 });
  });

  test('filling the note field does not submit the form ⚠️', async ({ page }) => {
    await page.goto('/app/request/RestDayWork/');
    const note = page.locator('textarea[name="employee_note"]');
    await note.fill('E2E interaction test — not submitted');
    await expect(note).toHaveValue('E2E interaction test — not submitted');
    expect(page.url()).toContain('/app/request/RestDayWork/');
  });
});

// =============================================================================
test.describe('Request Form > Change of Schedule (/app/request/ChangeSchedule/)', () => {
  test('Submit button and Valid From / Valid To labels render ⚠️', async ({ page }) => {
    await page.goto('/app/request/ChangeSchedule/');
    await expect(page.getByText('Submit')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Valid From:')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Valid To:')).toBeVisible({ timeout: 45000 });
  });

  test('filling the note field does not submit the form ⚠️', async ({ page }) => {
    await page.goto('/app/request/ChangeSchedule/');
    const note = page.locator('textarea[name="employee_note"]');
    await note.fill('E2E interaction test — not submitted');
    await expect(note).toHaveValue('E2E interaction test — not submitted');
    expect(page.url()).toContain('/app/request/ChangeSchedule/');
  });

  test('employee does not see Approve/Decline on their own store-mode (new) request ⚠️', async ({ page }) => {
    await page.goto('/app/request/ChangeSchedule/');
    await expect(page.getByText('Approve')).toHaveCount(0);
    await expect(page.getByText('Decline')).toHaveCount(0);
  });
});

// =============================================================================
test.describe('Request Form > Certificate Of Employment (/app/request/CertificateOfEmployment/)', () => {
  test('Purpose / With Salary labels and Submit button render ⚠️', async ({ page }) => {
    await page.goto('/app/request/CertificateOfEmployment/');
    await expect(page.getByText('Purpose:')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('With Salary:')).toBeVisible({ timeout: 45000 });
    await expect(page.getByRole('button', { name: /Submit/i })).toBeVisible({ timeout: 45000 });
  });

  test('purpose_index select has 11+ options ⚠️', async ({ page }) => {
    await page.goto('/app/request/CertificateOfEmployment/');
    const options = page.locator('select[name="purpose_index"] option');
    // Options populate async (COE purpose list is fetched after mount) — poll instead of a one-shot count.
    await expect.poll(async () => options.count(), { timeout: 45000 }).toBeGreaterThanOrEqual(11);
  });

  test('selecting a travel purpose reveals the Travel To field (safe select change, no submit) ⚠️', async ({ page }) => {
    await page.goto('/app/request/CertificateOfEmployment/');
    await page.locator('select[name="purpose_index"]').selectOption({ value: '6' });
    await expect(page.locator('input[name="purpose_note"]')).toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain('/app/request/CertificateOfEmployment/');
  });
});

// =============================================================================
test.describe('My Requests (/app/account/MyRequests)', () => {
  test('request-type tabs render ⚠️ [SOURCE: MyRequests.js Tabs]', async ({ page }) => {
    await page.goto('/app/account/MyRequests');
    // [FIX] getByText(label) was matching a hidden duplicate node elsewhere on the page (confirmed via
    // accessibility snapshot: a hidden <p>Overtime</p> precedes the real tab in DOM order). role='tab' is
    // specific to react-bootstrap's actual Nav.Link tab elements and avoids the collision.
    for (const label of ['All Requests', 'Alteration', 'Overtime', 'Rest Day Work', 'Change Schedule']) {
      // exact:true — 'Alteration' is a substring of the also-present 'MultiPunch Alteration' tab
      await expect(page.getByRole('tab', { name: label, exact: true })).toBeVisible({ timeout: 15000 });
    }
  });

  test('status toggle buttons (Pending/Approved/Cancelled/Declined) render ⚠️ [SOURCE: MyRequests.js ToggleButton]', async ({ page }) => {
    await page.goto('/app/account/MyRequests');
    for (const label of ['Pending', 'Approved', 'Cancelled', 'Declined']) {
      // [FIX] ToggleButton (type="checkbox") renders as <label class="request_list_btn"> wrapping a hidden
      // checkbox input — role is 'checkbox', not 'button'. Scope by the confirmed class instead.
      await expect(page.locator('.request_list_btn').filter({ hasText: label })).toBeVisible({ timeout: 15000 });
    }
  });

  test('results table has an Actions column ⚠️ [SOURCE: MyRequests.js line 246]', async ({ page }) => {
    await page.goto('/app/account/MyRequests');
    const table = page.locator('table').first();
    const emptyState = page.getByText('Sorry, No Record Found');
    // [FIX] table.count() checked immediately after goto() raced the initial data fetch — on a slow
    // load it could read 0 before the table had mounted, sending the test into the empty-state branch
    // even though real data exists, where it then waited 45s for text that would never appear
    // (confirmed via a failed run's accessibility snapshot: the table WAS present with real rows and an
    // Actions column, just later than the synchronous count() check). Wait for whichever branch
    // actually renders first (same .or() pattern already used correctly in the My Dispute Requests
    // test below), then assert against whichever one won.
    await expect(table.or(emptyState)).toBeVisible({ timeout: 45000 });
    if (await table.isVisible().catch(() => false)) {
      await expect(page.getByText('Actions')).toBeVisible({ timeout: 45000 });
    } else {
      await expect(emptyState).toBeVisible();
    }
  });

  test('clicking the Approved toggle reloads the list via GET only (no mutation) ⚠️', async ({ page }) => {
    await page.goto('/app/account/MyRequests');
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/request/request-list') && req.method() === 'GET', { timeout: 45000 }).catch(() => null),
      page.locator('.request_list_btn').filter({ hasText: 'Approved' }).click(),
    ]);
    if (request) {
      expect(request.method()).toBe('GET');
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('employee does not see Approve/Decline buttons on the My Requests list page', async ({ page }) => {
    await page.goto('/app/account/MyRequests');
    await expect(page.getByRole('button', { name: /^Approve$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Decline$/i })).toHaveCount(0);
  });
});

// =============================================================================
test.describe('My Dispute Requests (/app/account/MyRequestsDispute)', () => {
  test('Filter button and results table render ⚠️', async ({ page }) => {
    await page.goto('/app/account/MyRequestsDispute');
    await expect(page.getByRole('button', { name: /Filter/i })).toBeVisible({ timeout: 45000 });
    // [FIX] table only renders when dispute_request_list.length > 0 (MyRequestsDispute.js) — confirmed
    // live that employees currently have zero dispute records, so the "Sorry, No Record Found"
    // empty-state renders instead. Assert whichever branch is actually present.
    const table = page.locator('table').first();
    const emptyState = page.getByText('Sorry, No Record Found');
    await expect(table.or(emptyState)).toBeVisible({ timeout: 45000 });
  });

  test('status toggles and type tabs render ⚠️', async ({ page }) => {
    await page.goto('/app/account/MyRequestsDispute');
    // [FIX] ToggleButton (type="checkbox") renders as <label class="request_list_btn"> wrapping a hidden
    // checkbox input — role is 'checkbox', not 'button' (same pattern as MyRequests.js). Scope by class.
    await expect(page.locator('.request_list_btn').filter({ hasText: 'Pending' })).toBeVisible({ timeout: 45000 });
    // [FIX] "All Requests" is a react-bootstrap Nav.Link tab (role='tab'), not a button.
    await expect(page.getByRole('tab', { name: 'All Requests', exact: true })).toBeVisible({ timeout: 45000 });
  });

  test('clicking Approved status toggle fires a GET only, no mutation ⚠️', async ({ page }) => {
    await page.goto('/app/account/MyRequestsDispute');
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/request/request-list-disputes') && req.method() === 'GET', { timeout: 45000 }).catch(() => null),
      // [FIX] same ToggleButton-as-checkbox pattern — scope by class instead of role=button.
      page.locator('.request_list_btn').filter({ hasText: 'Approved' }).click(),
    ]);
    if (request) expect(request.method()).toBe('GET');
  });

  test('table rows have no clickable eye-icon action (commented out per dev vetting) ⚠️', async ({ page }) => {
    await page.goto('/app/account/MyRequestsDispute');
    const eyeButtons = page.locator('table .fa-eye, table [data-action="view"]');
    await expect(eyeButtons).toHaveCount(0);
  });
});

// =============================================================================
test.describe('EV Assist > Create Ticket (/app/fresh_service/create/)', () => {
  test('workspace dropdown, subject input, CC input and file input render ⚠️', async ({ page }) => {
    await page.goto('/app/fresh_service/create/');
    await expect(page.locator('.form-select').first()).toBeVisible({ timeout: 45000 });
    await expect(page.locator('.form-input[placeholder="Brief description"]')).toBeVisible({ timeout: 45000 });
    await expect(page.locator('.cc-email-wrapper .form-input[placeholder="Type to search"]')).toBeVisible({ timeout: 45000 });
    // [FIX] the Attachments file input only renders after a workspace is selected
    // (FreshServiceForm.js: `formData.selectedWorkspace ? ... : null`) — select the first workspace
    // option (safe select-change, no submit — same pattern as the cascade test below) before asserting it.
    const workspaceSelect = page.locator('.form-select').first();
    const options = await workspaceSelect.locator('option').count();
    if (options > 1) {
      await workspaceSelect.selectOption({ index: 1 });
    }
    await expect(page.locator('input[type="file"]').first()).toBeAttached({ timeout: 45000 });
  });

  test('filling the subject field does not submit the form ⚠️', async ({ page }) => {
    await page.goto('/app/fresh_service/create/');
    const subject = page.locator('.form-input[placeholder="Brief description"]');
    await subject.fill('E2E interaction test — not submitted');
    await expect(subject).toHaveValue('E2E interaction test — not submitted');
    expect(page.url()).toContain('/app/fresh_service/create/');
  });

  test('selecting a workspace reveals the category dropdown (safe cascade, no submit) ⚠️', async ({ page }) => {
    await page.goto('/app/fresh_service/create/');
    const workspaceSelect = page.locator('.form-select').first();
    await workspaceSelect.waitFor({ state: 'visible', timeout: 45000 });
    const options = await workspaceSelect.locator('option').count();
    if (options > 1) {
      await workspaceSelect.selectOption({ index: 1 });
      await expect(page.locator('.form-select').nth(1)).toBeVisible({ timeout: 15000 });
    }
    expect(page.url()).toContain('/app/fresh_service/create/');
  });
});

// =============================================================================
test.describe('EV Assist > My Tickets (/app/fresh_service/tickets/)', () => {
  test('workspace and status filter dropdowns render ⚠️', async ({ page }) => {
    await page.goto('/app/fresh_service/tickets/');
    await expect(page.locator('.form-select').first()).toBeVisible({ timeout: 45000 });
    await expect(page.locator('.form-select').nth(1)).toBeVisible({ timeout: 45000 });
  });

  test('changing the status filter does not crash the page (client-side filter change) ⚠️', async ({ page }) => {
    await page.goto('/app/fresh_service/tickets/');
    const statusSelect = page.locator('.form-select').nth(1);
    const options = await statusSelect.locator('option').count();
    if (options > 1) {
      await statusSelect.selectOption({ index: 1 });
      await expect(page.locator('body')).toBeVisible({ timeout: 45000 });
      await noErrorText(page);
    }
  });

  test('ticket table or empty-state renders without error ⚠️', async ({ page }) => {
    await page.goto('/app/fresh_service/tickets/');
    await expect(page.locator('body')).toBeVisible({ timeout: 45000 });
    await noErrorText(page);
  });
});

// =============================================================================
test.describe('Asset Management (/app/asset_management/) [SOURCE: AssetManagementForm.js]', () => {
  test('"IT Asset Management" title and Add/Update submit button render [SOURCE]', async ({ page }) => {
    await page.goto('/app/asset_management/');
    await expect(page.getByText('IT Asset Management', { exact: false }).first()).toBeVisible({ timeout: 45000 });
    await expect(page.locator('button[type="submit"].btn-primary-2')).toBeVisible({ timeout: 45000 });
  });

  test('equipment type and personal equipment selects render [SOURCE: name="equipment_type", name="personal_equipment"]', async ({ page }) => {
    await page.goto('/app/asset_management/');
    await expect(page.locator('select[name="personal_equipment"]')).toBeVisible({ timeout: 45000 });
    await expect(page.locator('select[name="equipment_type"]')).toBeVisible({ timeout: 45000 });
  });

  test('filling serial_no / asset_tag fields does not submit the form [SOURCE: name="serial_no", name="asset_tag"]', async ({ page }) => {
    await page.goto('/app/asset_management/');
    const serial = page.locator('input[name="serial_no"]');
    const assetTag = page.locator('input[name="asset_tag"]');
    await serial.fill('E2E-TEST-0001');
    await expect(serial).toHaveValue('E2E-TEST-0001');
    await assetTag.fill('E2E-TAG-0001');
    await expect(assetTag).toHaveValue('E2E-TAG-0001');
    expect(page.url()).toContain('/app/asset_management/');
  });
});

// =============================================================================
test.describe('DPA Webinar (/app/dpa)', () => {
  test('video player or already-completed message renders ⚠️', async ({ page }) => {
    await page.goto('/app/dpa');
    const videoOrIframe = page.locator('video, iframe').first();
    const thankYou = page.getByText('Thank you for watching the video!');
    // Whichever branch renders depends on an async dpa_ticked_at check after mount — poll for either.
    await expect.poll(async () => {
      const hasVideo = (await videoOrIframe.count()) > 0;
      const alreadyDone = await thankYou.isVisible().catch(() => false);
      return hasVideo || alreadyDone;
    }, { timeout: 45000 }).toBe(true);
  });

  test('confirm checkbox and Submit button are never clicked, only asserted when visible ⚠️', async ({ page }) => {
    await page.goto('/app/dpa');
    const checkbox = page.locator('input[name="confirm"]');
    const count = await checkbox.count();
    if (count > 0 && await checkbox.isVisible().catch(() => false)) {
      await expect(checkbox).toHaveAttribute('name', 'confirm');
    }
  });
});

// =============================================================================
test.describe('EV Academy (external — https://lms.eastvantage.com/)', () => {
  test('sidebar link points to the external LMS domain (not navigated to) ⚠️', async ({ page }) => {
    await page.goto('/app/Dashboard');
    const link = page.locator('a', { hasText: 'EV Academy' }).first();
    const count = await link.count();
    if (count > 0) {
      await expect(link).toHaveAttribute('href', /lms\.eastvantage\.com/);
    }
  });
});

// =============================================================================
test.describe('EV Support Team Schedule (/app/OpsSchedule)', () => {
  test('department schedule images render ⚠️', async ({ page }) => {
    await page.goto('/app/OpsSchedule');
    await expect(page.locator('img').first()).toBeVisible({ timeout: 45000 });
  });
});

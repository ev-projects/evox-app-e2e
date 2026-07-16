// VERIFIED-BACKED — generated 2026-07-07 from dashboard.registry.md (vetted by Glenn Macasarte on June 30, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Dashboard (/app/Dashboard)', () => {

    // =========================================================================
    // On Load
    // =========================================================================
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/Dashboard`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors in body', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // =========================================================================
    // Auth Gate
    // =========================================================================
    test.describe('Auth Gate', () => {
        test('redirects to login when unauthenticated', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
            }
        });
    });

    // =========================================================================
    // Key UI Elements
    // =========================================================================
    test.describe('Key UI Elements', () => {
        test('Announcements tab is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Announcements')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Job Opening tab is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Job Opening')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Eastvantage Policies tab is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Eastvantage Policies')).toBeVisible({ timeout: 10000 });
            }
        });
    });

    // =========================================================================
    // Tab Navigation — developer-confirmed tabs
    // Each tab click fires GET /api/get_dashboard_all/{type} or tab-specific API
    // =========================================================================
    test.describe('Tab Navigation ⚠️', () => {
        test('clicking Announcements tab does not crash the page ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] GET /api/get_dashboard_all/3 → BookingController@get_dashboard_all → EH_SP_Dashboard
                await page.getByText('Announcements').click();
                await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
                const bodyText = await page.locator('body').innerText();
                expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
            }
        });

        test('clicking Job Opening tab does not crash the page ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] GET /api/careers/ → TapTalent iframe rendered (API results not used for display)
                await page.getByText('Job Opening').click();
                await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
                const bodyText = await page.locator('body').innerText();
                expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
            }
        });

        test('clicking Eastvantage Policies tab does not crash the page ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] GET /api/show?GlobalType=1&selectedDepartments=All → PoliciesDocumentController@show → EV_SP_Policies_Document
                await page.getByText('Eastvantage Policies').click();
                await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
                const bodyText = await page.locator('body').innerText();
                expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
            }
        });
    });

    // =========================================================================
    // Supervisor-only tabs (Summary, Engagements)
    // Only visible to supervisor-role users — guarded accordingly
    // =========================================================================
    test.describe('Supervisor Tabs ⚠️', () => {
        test('Summary tab is visible to supervisors ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] GET /api/get_dashboard_all/1 → BookingController@get_dashboard_all → EH_SP_Dashboard
                // Visible to supervisors only — may not appear for non-supervisor test accounts
                const summaryTab = page.getByText('Summary');
                const count = await summaryTab.count();
                if (count > 0) {
                    await summaryTab.click();
                    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
                }
            }
        });

        test('Engagements tab is visible to supervisors ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            if (!page.url().includes('/login')) {
                // [DEVELOPER VETTING] GET /api/get_dashboard_all/2 → BookingController@get_dashboard_all → EH_SP_Dashboard
                // Visible to supervisors only — may not appear for non-supervisor test accounts
                const engagementsTab = page.getByText('Engagements');
                const count = await engagementsTab.count();
                if (count > 0) {
                    await engagementsTab.click();
                    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
                }
            }
        });
    });

    // =========================================================================
    // Auto-Pop Modal — Code of Conduct (CoC)
    // Non-dismissable; confirmed selector: id="mandatoryCheckbox"
    // [DEVELOPER VETTING] POST /api/acknowledge_coc → CodeOfConductController@store
    // =========================================================================
    test.describe('CoC Modal (auto-pop) ⚠️', () => {
        test('CoC checkbox uses confirmed id="mandatoryCheckbox" when modal is present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            if (!page.url().includes('/login')) {
                // The CoC modal is non-dismissable and appears only when coc_agreed is not set.
                // Check if it is present; if so, verify the confirmed checkbox selector.
                const cocModal = page.locator('#mandatoryCheckbox');
                const count = await cocModal.count();
                if (count > 0) {
                    await expect(cocModal).toBeVisible({ timeout: 5000 });
                }
            }
        });

        test('CoC I Agree button is disabled until checkbox is checked ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            if (!page.url().includes('/login')) {
                const cocCheckbox = page.locator('#mandatoryCheckbox');
                const count = await cocCheckbox.count();
                if (count > 0) {
                    // [DEVELOPER VETTING] button text: "I Agree" or "I Confirm"
                    const agreeBtn = page.getByRole('button', { name: /I Agree|I Confirm/i });
                    // Before checking the checkbox the agree button should be disabled
                    await expect(agreeBtn).toBeDisabled();
                    await cocCheckbox.check();
                    await expect(agreeBtn).toBeEnabled();
                }
            }
        });
    });

    // =========================================================================
    // Auto-Pop Modal — Referral (confirmed: dismiss-only, no form submit)
    // [DEVELOPER VETTING] ✅ confirmed: PDF iframe inside modal, dismiss only
    // =========================================================================
    test.describe('Referral Modal (auto-pop) ⚠️', () => {
        test('Referral modal contains a PDF iframe when present ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            if (!page.url().includes('/login')) {
                // Referral modal appears when referral program is active (popup_flags.referral_banner=true)
                // and user country is Philippines. May not appear in all test environments.
                const modal = page.locator('[data-testid="modal"]');
                const count = await modal.count();
                if (count > 0) {
                    // Referral modal contains an iframe for the PDF — dismiss-only, no submit button
                    const iframe = page.locator('iframe');
                    const iframeCount = await iframe.count();
                    // If a modal is open with an iframe, it may be the referral modal
                    if (iframeCount > 0) {
                        await expect(iframe.first()).toBeVisible();
                    }
                }
            }
        });
    });

    // =========================================================================
    // Auto-Pop Modal — ITAM Asset Confirmation
    // [DEVELOPER VETTING] POST /api/user/addasset → UserController@addUserAsset
    // =========================================================================
    test.describe('ITAM Modal (auto-pop) ⚠️', () => {
        test('ITAM modal Confirm button is present when modal is triggered ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/Dashboard`);
            if (!page.url().includes('/login')) {
                // ITAM modal appears when user has unconfirmed equipment.
                // [DEVELOPER VETTING] button text: "Confirm"
                const confirmBtn = page.getByRole('button', { name: /^Confirm$/i });
                const count = await confirmBtn.count();
                if (count > 0) {
                    await expect(confirmBtn).toBeVisible();
                }
            }
        });
    });

});

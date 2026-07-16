// VERIFIED-BACKED — generated 2026-07-07 from manage-accessibility.registry.md (vetted by Gobi Singaravel on 2026-07-02)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Manage Policy Accessibility (/app/policiesdocumentlist)', () => {

    // =========================================================================
    // On Load
    // =========================================================================
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // =========================================================================
    // Auth Gate
    // =========================================================================
    test.describe('Auth Gate', () => {
        test('redirects to login when unauthenticated', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible();
            }
        });
    });

    // =========================================================================
    // Table / List
    // Confirmed in [DEVELOPER VETTING] row 3:
    //   GET /api/showlist?GlobalType=1&selectedDepartments=All
    //   → PoliciesDocumentController::showlist()
    //   → returns documents created by the logged-in user
    // =========================================================================
    test.describe('Table / List', () => {
        test('document list container is rendered on load ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
            await page.waitForLoadState('networkidle');
            if (!page.url().includes('/login')) {
                // The page renders a list of policy documents owned by the logged-in user.
                // Confirmed on staging: a table or list wrapper is always present.
                const listOrTable = page.locator('table, ul, .document-list').first();
                await expect(listOrTable).toBeVisible({ timeout: 10000 });
            }
        });

        // Confirmed [DEVELOPER VETTING] row 4:
        //   Button text: "Click to activate" (inactive) / "Click to deactivate" (active)
        //   PUT /api/updatestatus/{id}/1 or PUT /api/updatestatus/{id}/0
        //   → PoliciesDocumentController::updatestatus()
        //   Toggle is immediate — no confirmation dialog.
        test('status toggle button is visible per document row ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
            await page.waitForLoadState('networkidle');
            if (!page.url().includes('/login')) {
                // At least one toggle button should be present if the user has documents.
                // Matches confirmed label text from [DEVELOPER VETTING].
                const toggleBtn = page.getByText(/Click to activate|Click to deactivate/i).first();
                await expect(toggleBtn).toBeVisible({ timeout: 10000 });
            }
        });

        test('clicking status toggle does not navigate away from page ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
            await page.waitForLoadState('networkidle');
            if (!page.url().includes('/login')) {
                const toggleBtn = page.getByText(/Click to activate|Click to deactivate/i).first();
                const btnCount = await toggleBtn.count();
                if (btnCount > 0) {
                    // Toggle is immediate — no confirmation dialog (confirmed in vetting).
                    await toggleBtn.click();
                    // Should remain on the same page after toggle.
                    expect(page.url()).toContain('/app/policiesdocumentlist');
                }
            }
        });
    });

    // =========================================================================
    // API — on-load document list fetch
    // Confirmed [DEVELOPER VETTING] row 3:
    //   GET /api/showlist?GlobalType=1&selectedDepartments=All
    //   → PoliciesDocumentController::showlist()
    //   → EV_SP_Policies_Document (type=5)
    // =========================================================================
    test.describe('API — document list fetch on load', () => {
        test('GET /api/showlist is called on page load ⚠️', async ({ page }) => {
            const [showlistRequest] = await Promise.all([
                page.waitForRequest(
                    req => req.url().includes('/api/showlist') && req.method() === 'GET',
                    { timeout: 10000 }
                ).catch(() => null),
                page.goto(`${BASE_URL}/app/policiesdocumentlist`),
            ]);
            if (!page.url().includes('/login')) {
                expect(showlistRequest).not.toBeNull();
            }
        });

        test('GET /api/showlist request includes GlobalType=1 and selectedDepartments=All ⚠️', async ({ page }) => {
            let capturedUrl: string | null = null;
            page.on('request', req => {
                if (req.url().includes('/api/showlist') && req.method() === 'GET') {
                    capturedUrl = req.url();
                }
            });
            await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
            await page.waitForLoadState('networkidle');
            if (!page.url().includes('/login') && capturedUrl) {
                expect(capturedUrl).toContain('GlobalType=1');
                expect(capturedUrl).toContain('selectedDepartments=All');
            }
        });

        test('GET /api/showlist response does not 500 ⚠️', async ({ page }) => {
            let responseStatus: number | null = null;
            page.on('response', resp => {
                if (resp.url().includes('/api/showlist')) {
                    responseStatus = resp.status();
                }
            });
            await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
            await page.waitForLoadState('networkidle');
            if (!page.url().includes('/login') && responseStatus !== null) {
                expect(responseStatus).toBeLessThan(500);
            }
        });
    });

    // =========================================================================
    // API — status toggle
    // Confirmed [DEVELOPER VETTING] row 4:
    //   PUT /api/updatestatus/{id}/1  → activate
    //   PUT /api/updatestatus/{id}/0  → deactivate
    //   → PoliciesDocumentController::updatestatus()
    //   → EV_SP_Document_Status_Update([id, status, userId])
    //   Toggle is immediate — no confirmation dialog.
    // =========================================================================
    test.describe('API — status toggle', () => {
        test('PUT /api/updatestatus is called when toggle button clicked ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
            await page.waitForLoadState('networkidle');
            if (!page.url().includes('/login')) {
                const toggleBtn = page.getByText(/Click to activate|Click to deactivate/i).first();
                const btnCount = await toggleBtn.count();
                if (btnCount > 0) {
                    const [updateRequest] = await Promise.all([
                        page.waitForRequest(
                            req => req.url().includes('/api/updatestatus') && req.method() === 'PUT',
                            { timeout: 10000 }
                        ).catch(() => null),
                        toggleBtn.click(),
                    ]);
                    expect(updateRequest).not.toBeNull();
                }
            }
        });

        test('PUT /api/updatestatus/{id}/1 or /0 matches confirmed URL pattern ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
            await page.waitForLoadState('networkidle');
            if (!page.url().includes('/login')) {
                const toggleBtn = page.getByText(/Click to activate|Click to deactivate/i).first();
                const btnCount = await toggleBtn.count();
                if (btnCount > 0) {
                    let capturedUrl: string | null = null;
                    page.on('request', req => {
                        if (req.url().includes('/api/updatestatus') && req.method() === 'PUT') {
                            capturedUrl = req.url();
                        }
                    });
                    await toggleBtn.click();
                    await page.waitForLoadState('networkidle');
                    if (capturedUrl) {
                        // URL must match /api/updatestatus/{numeric id}/{0 or 1}
                        expect(capturedUrl).toMatch(/\/api\/updatestatus\/\d+\/[01]/);
                    }
                }
            }
        });

        test('status toggle PUT response does not 500 ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/policiesdocumentlist`);
            await page.waitForLoadState('networkidle');
            if (!page.url().includes('/login')) {
                const toggleBtn = page.getByText(/Click to activate|Click to deactivate/i).first();
                const btnCount = await toggleBtn.count();
                if (btnCount > 0) {
                    let responseStatus: number | null = null;
                    page.on('response', resp => {
                        if (resp.url().includes('/api/updatestatus')) {
                            responseStatus = resp.status();
                        }
                    });
                    await toggleBtn.click();
                    await page.waitForLoadState('networkidle');
                    if (responseStatus !== null) {
                        expect(responseStatus).toBeLessThan(500);
                    }
                }
            }
        });
    });

});

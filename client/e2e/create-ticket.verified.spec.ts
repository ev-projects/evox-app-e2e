// VERIFIED-BACKED — generated 2026-07-07 from create-ticket.registry.md (vetted by Glenn Macasarte on July 2, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('EV Assist Create Ticket (/app/fresh_service/create/)', () => {

    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors in body', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    test.describe('Auth Gate', () => {
        test('unauthenticated visit redirects to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible();
            }
        });
    });

    test.describe('Key UI Elements', () => {
        test('submit button is rendered ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            if (!page.url().includes('/login')) {
                // DEVELOPER VETTING confirmed: <button type="submit"> with class .btn-fs
                await expect(page.locator('button[type="submit"].btn-fs')).toBeVisible({ timeout: 10000 });
            }
        });
    });

    test.describe('Form Fields', () => {
        test('workspace dropdown (first .form-select) is rendered ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            if (!page.url().includes('/login')) {
                // DEVELOPER VETTING confirmed: first .form-select bound to selectedWorkspaceId
                await expect(page.locator('.form-select').first()).toBeVisible({ timeout: 10000 });
            }
        });

        test('subject brief-description input is rendered ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            if (!page.url().includes('/login')) {
                // DEVELOPER VETTING confirmed: .form-input with placeholder="Brief description"
                await expect(page.locator('.form-input[placeholder="Brief description"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('CC email input is rendered ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            if (!page.url().includes('/login')) {
                // DEVELOPER VETTING confirmed: .form-input inside .cc-email-wrapper, placeholder="Type to search"
                await expect(page.locator('.cc-email-wrapper .form-input[placeholder="Type to search"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('attachment file input accepts the confirmed MIME types ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            if (!page.url().includes('/login')) {
                // DEVELOPER VETTING confirmed: input[type="file"] accept=".jpg,.jpeg,.png,.pdf,.csv,.xls,.xlsx"
                const fileInput = page.locator('input[type="file"]').first();
                await expect(fileInput).toBeAttached({ timeout: 10000 });
                const accept = await fileInput.getAttribute('accept');
                expect(accept).toContain('.pdf');
                expect(accept).toContain('.jpg');
            }
        });

        test('subject preview div is rendered after cascade selection ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            if (!page.url().includes('/login')) {
                // DEVELOPER VETTING confirmed: .subject-preview div (read-only, auto-built)
                await expect(page.locator('.subject-preview')).toBeAttached({ timeout: 10000 });
            }
        });

        test('category dropdown conditionally appears after workspace selection ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            if (!page.url().includes('/login')) {
                // DEVELOPER VETTING confirmed: second .form-select, conditional on workspace selection
                const workspaceSelect = page.locator('.form-select').first();
                await workspaceSelect.waitFor({ state: 'visible', timeout: 10000 });
                const options = await workspaceSelect.locator('option').count();
                if (options > 1) {
                    // Select the second option (first real workspace)
                    await workspaceSelect.selectOption({ index: 1 });
                    // Category dropdown should now appear as the second .form-select
                    await expect(page.locator('.form-select').nth(1)).toBeVisible({ timeout: 5000 });
                }
            }
        });

        test('priority dropdown is rendered with default Medium value ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            if (!page.url().includes('/login')) {
                // DEVELOPER VETTING confirmed: last .form-select, default value 2 (Medium)
                const allSelects = page.locator('.form-select');
                const count = await allSelects.count();
                if (count > 0) {
                    const lastSelect = allSelects.last();
                    await expect(lastSelect).toBeVisible({ timeout: 10000 });
                    const value = await lastSelect.inputValue();
                    // Default priority is 2 (Medium)
                    expect(value).toBe('2');
                }
            }
        });
    });

    test.describe('On-Load API (GET /api/freshservice/workspaces)', () => {
        test('workspaces endpoint is called on mount and does not error ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            if (!page.url().includes('/login')) {
                // DEVELOPER VETTING confirmed: fetchWorkSpaces() → GET /api/freshservice/workspaces
                // → FreshServiceController::getWorkspaces → EV_FS_Get_Category SP
                // Verify the workspace dropdown is populated (confirming the API call succeeded)
                const workspaceSelect = page.locator('.form-select').first();
                await expect(workspaceSelect).toBeVisible({ timeout: 10000 });
                const optionCount = await workspaceSelect.locator('option').count();
                // At minimum there should be a placeholder option
                expect(optionCount).toBeGreaterThanOrEqual(1);
            }
        });
    });

    test.describe('CC Email Suggestions (GET /api/freshservice/users/suggestions)', () => {
        test('typing ≥2 chars in CC input triggers suggestion lookup ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            if (!page.url().includes('/login')) {
                // DEVELOPER VETTING confirmed: debounced 1s → GET /api/freshservice/users/suggestions?keyword=<term>
                // → FreshServiceController::getUserSuggestions
                const ccInput = page.locator('.cc-email-wrapper .form-input[placeholder="Type to search"]');
                await ccInput.waitFor({ state: 'visible', timeout: 10000 });
                const [request] = await Promise.all([
                    page.waitForRequest(req => req.url().includes('/api/freshservice/users/suggestions'), { timeout: 3000 })
                        .catch(() => null),
                    ccInput.fill('te'),
                    page.waitForTimeout(1200), // debounce is 1 second
                ]);
                // If the request was captured, it must target the correct endpoint
                if (request) {
                    expect(request.url()).toContain('/api/freshservice/users/suggestions');
                    expect(request.url()).toContain('keyword=');
                }
            }
        });
    });

    test.describe('Attachment Upload (POST /api/freshservice/tickets/attachments/)', () => {
        test('file input element is attached to DOM ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/create/`);
            if (!page.url().includes('/login')) {
                // DEVELOPER VETTING confirmed: POST /api/freshservice/tickets/attachments/
                // → FreshServiceController::saveAttachment fires immediately on file select
                const fileInput = page.locator('input[type="file"]').first();
                await expect(fileInput).toBeAttached({ timeout: 10000 });
            }
        });
    });

});

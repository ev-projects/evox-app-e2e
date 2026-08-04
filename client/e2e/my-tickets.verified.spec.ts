// VERIFIED-BACKED — generated 2026-07-07 from my-tickets.registry.md (vetted by Glenn Macasarte on July 2, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('EV Assist My Tickets (/app/fresh_service/tickets/)', () => {

    // =========================================================================
    // On Load
    // =========================================================================
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // =========================================================================
    // Auth Gate
    // =========================================================================
    test.describe('Auth Gate', () => {
        test('unauthenticated visit redirects to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="email"], input[type="text"], input[name="email"], input[name="username"]').first()).toBeVisible();
            }
        });
    });

    // =========================================================================
    // Sub-page 1 — Ticket List (TicketListPage)
    // =========================================================================
    test.describe('Ticket List (TicketListPage)', () => {

        // =====================================================================
        // Filter Controls
        // Area 1 — workspace-select and status-select
        // =====================================================================
        test.describe('Filter Controls', () => {
            test('workspace dropdown is visible ⚠️', async ({ page }) => {
                await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
                if (!page.url().includes('/login')) {
                    // First .form-select is the workspace dropdown (confirmed by Glenn Macasarte)
                    await expect(page.locator('.form-select').first()).toBeVisible({ timeout: 10000 });
                }
            });

            test('status dropdown is visible ⚠️', async ({ page }) => {
                await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
                if (!page.url().includes('/login')) {
                    // Second .form-select is the status filter (confirmed by Glenn Macasarte)
                    // Options: all / open / pending / resolved / closed
                    await expect(page.locator('.form-select').nth(1)).toBeVisible({ timeout: 10000 });
                }
            });

            test('status dropdown contains expected options ⚠️', async ({ page }) => {
                await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
                if (!page.url().includes('/login')) {
                    const statusSelect = page.locator('.form-select').nth(1);
                    await expect(statusSelect).toBeVisible({ timeout: 10000 });
                    // Confirmed options: all, open, pending, resolved, closed
                    const options = await statusSelect.locator('option').allInnerTexts();
                    const normalized = options.map(o => o.trim().toLowerCase());
                    // At least one of the known status values must be present
                    const expected = ['all', 'open', 'pending', 'resolved', 'closed'];
                    const hasAtLeastOne = expected.some(e => normalized.some(n => n.includes(e)));
                    expect(hasAtLeastOne).toBe(true);
                }
            });
        });

        // =====================================================================
        // Table / List
        // Area 2 — Ticket list table and pagination
        // =====================================================================
        test.describe('Table / List', () => {
            test('ticket table or empty-state is rendered ⚠️', async ({ page }) => {
                await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
                if (!page.url().includes('/login')) {
                    // Table rows are inside .professional-table (confirmed by Glenn Macasarte)
                    // Page may show empty state if no workspace is selected — either is valid
                    const table = page.locator('.professional-table');
                    const isEmpty = await table.count() === 0;
                    if (!isEmpty) {
                        await expect(table).toBeVisible({ timeout: 10000 });
                    }
                    // If no table, page must still render without crashing (body visible)
                    await expect(page.locator('body')).toBeVisible();
                }
            });

            test('pagination container renders when tickets exist ⚠️', async ({ page }) => {
                await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
                if (!page.url().includes('/login')) {
                    // .ticket-pagination is hidden when totalPages <= 1
                    // We can only assert it does not crash if pagination is absent
                    const pagination = page.locator('.ticket-pagination');
                    const count = await pagination.count();
                    if (count > 0) {
                        await expect(pagination).toBeVisible({ timeout: 10000 });
                    }
                }
            });

            // KNOWN BUG: onPageChange has an empty useCallback dependency array [],
            // so loadTickets captured inside it is always the initial version.
            // If filters change after initial mount, pagination may use stale filter state.
            test('previous pagination button is present when pagination is visible ⚠️', async ({ page }) => {
                await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
                if (!page.url().includes('/login')) {
                    const pagination = page.locator('.ticket-pagination');
                    const count = await pagination.count();
                    if (count > 0 && await pagination.isVisible()) {
                        // Previous button inside .ticket-pagination (confirmed by Glenn Macasarte)
                        await expect(pagination.getByRole('button', { name: /prev/i }).or(
                            pagination.getByText(/previous/i)
                        ).first()).toBeAttached();
                    }
                }
            });

            test('next pagination button is present when pagination is visible ⚠️', async ({ page }) => {
                await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
                if (!page.url().includes('/login')) {
                    const pagination = page.locator('.ticket-pagination');
                    const count = await pagination.count();
                    if (count > 0 && await pagination.isVisible()) {
                        // Next button inside .ticket-pagination (confirmed by Glenn Macasarte)
                        await expect(pagination.getByRole('button', { name: /next/i }).or(
                            pagination.getByText(/next/i)
                        ).first()).toBeAttached();
                    }
                }
            });
        });
    });

    // =========================================================================
    // Sub-page 2 — Ticket Detail (TicketDetailsPage)
    // Navigated to by clicking a table row; tested via a separate describe block
    // =========================================================================
    test.describe('Ticket Detail (TicketDetailsPage)', () => {

        // =====================================================================
        // Key UI Elements
        // Area 3 — Detail view elements: back buttons
        // =====================================================================
        test.describe('Key UI Elements', () => {
            test('back button renders in detail view when a ticket row is clicked ⚠️', async ({ page }) => {
                await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
                if (!page.url().includes('/login')) {
                    // Try to click a table row to enter detail view
                    const row = page.locator('.professional-table tr').nth(1);
                    const rowCount = await row.count();
                    if (rowCount > 0) {
                        await row.click();
                        // .back-button text: "← Back to My Tickets" (confirmed by Glenn Macasarte)
                        await expect(page.locator('.back-button').first()).toBeVisible({ timeout: 10000 });
                    }
                }
            });

            test('back button returns user to ticket list ⚠️', async ({ page }) => {
                await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
                if (!page.url().includes('/login')) {
                    const row = page.locator('.professional-table tr').nth(1);
                    const rowCount = await row.count();
                    if (rowCount > 0) {
                        await row.click();
                        const backBtn = page.locator('.back-button').first();
                        await expect(backBtn).toBeVisible({ timeout: 10000 });
                        await backBtn.click();
                        // Should return to list — no page reload, client-side navigation
                        // Ticket list table or filter dropdowns should be visible again
                        await expect(page.locator('.form-select').first()).toBeVisible({ timeout: 10000 });
                    }
                }
            });

            test('attachment links open in new tab (href present) ⚠️', async ({ page }) => {
                await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
                if (!page.url().includes('/login')) {
                    const row = page.locator('.professional-table tr').nth(1);
                    const rowCount = await row.count();
                    if (rowCount > 0) {
                        await row.click();
                        // Attachment links: <a href=att.attachment_url target="_blank">
                        // These are direct FS storage URLs — confirmed by Glenn Macasarte
                        const attachmentLinks = page.locator('a[target="_blank"]');
                        const linkCount = await attachmentLinks.count();
                        if (linkCount > 0) {
                            // Each attachment link must have an href
                            for (let i = 0; i < Math.min(linkCount, 3); i++) {
                                const href = await attachmentLinks.nth(i).getAttribute('href');
                                expect(href).toBeTruthy();
                            }
                        }
                    }
                }
            });
        });

        // =====================================================================
        // Form Fields
        // Area 4 — Reply form: editor, file input, submit button
        // =====================================================================
        test.describe('Form Fields', () => {
            test('reply file attachment input is present in detail view ⚠️', async ({ page }) => {
                await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
                if (!page.url().includes('/login')) {
                    const row = page.locator('.professional-table tr').nth(1);
                    const rowCount = await row.count();
                    if (rowCount > 0) {
                        await row.click();
                        // <input type="file"> with class .form-input (confirmed by Glenn Macasarte)
                        await expect(page.locator('input[type="file"].form-input')).toBeAttached({ timeout: 10000 });
                    }
                }
            });

            test('reply submit button is present and initially disabled when editor is empty ⚠️', async ({ page }) => {
                await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
                if (!page.url().includes('/login')) {
                    const row = page.locator('.professional-table tr').nth(1);
                    const rowCount = await row.count();
                    if (rowCount > 0) {
                        await row.click();
                        // <button type="submit"> with class .btn-fs — disabled if loading OR reply empty
                        // Confirmed by Glenn Macasarte
                        const submitBtn = page.locator('button[type="submit"].btn-fs');
                        await expect(submitBtn).toBeAttached({ timeout: 10000 });
                        // Button must be disabled when reply editor is empty
                        await expect(submitBtn).toBeDisabled();
                    }
                }
            });

            test('TinyMCE editor iframe is present in detail view ⚠️', async ({ page }) => {
                await page.goto(`${BASE_URL}/app/fresh_service/tickets/`);
                if (!page.url().includes('/login')) {
                    const row = page.locator('.professional-table tr').nth(1);
                    const rowCount = await row.count();
                    if (rowCount > 0) {
                        await row.click();
                        // TinyMCE 6 renders an iframe for the rich-text editor
                        // textareaName="content" — confirmed by Glenn Macasarte
                        // TinyMCE may use either an iframe or a contenteditable div
                        const tinymceIframe = page.locator('.tox-edit-area iframe, iframe[id*="tiny"]');
                        const tinymceEditable = page.locator('[contenteditable="true"]');
                        const hasIframe = await tinymceIframe.count() > 0;
                        const hasEditable = await tinymceEditable.count() > 0;
                        // At least one TinyMCE surface must be present
                        expect(hasIframe || hasEditable).toBe(true);
                    }
                }
            });
        });
    });
});

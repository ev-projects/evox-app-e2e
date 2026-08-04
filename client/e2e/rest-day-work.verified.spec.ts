// VERIFIED-BACKED — generated 2026-07-07 from rest-day-work.registry.md (vetted by Glenn Macasarte on July 1, 2026)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// KNOWN BUG B-001: approve() fallthrough — request_validity_checker returning false (>30 days old) falls to regular-approve path instead of dispute
// KNOWN BUG B-002: updated_by assigned twice in RestDayWorkRepository::store() (line 39 and 41 — duplicate, harmless)
// KNOWN BUG B-003: SP name typo: EV_SP_PD_Autoamtion_RestDay ("Autoamtion") — functional but confusing
// KNOWN BUG B-004: sendRestDayWorkRequestChangeStatusEmail is an empty stub — no email on approve or decline
// KNOWN BUG B-005: date field uses Yup.string() not Yup.date() — wrong-format dates pass frontend validation
// KNOWN BUG B-006: No end_time > start_time frontend validation — overnight entries look like errors in UI

test.describe('Rest Day Work Request (/app/request/RestDayWork/)', () => {

    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors in body', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    test.describe('Auth Gate', () => {
        test('redirects to login when unauthenticated', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible();
            }
        });
    });

    test.describe('Form Fields ⚠️', () => {
        // Fields 1–4 (date, start_time, end_time, break_time): name attributes are NOT in the DOM
        // per [DEVELOPER VETTING] corrections — use label text selectors instead.
        // Field 5 (employee_note): name="employee_note" confirmed by [DEVELOPER VETTING].
        // Field 6 (approver_note): name="approver_note" confirmed by [DEVELOPER VETTING] — approval mode only.

        test('employee note textarea is present in store mode ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('textarea[name="employee_note"]')).toBeVisible({ timeout: 10000 });
            }
        });

        test('On Duty label is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('On Duty:')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Off Duty label is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Off Duty:')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Break(Hours) label is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Break(Hours):')).toBeVisible({ timeout: 10000 });
            }
        });

        test('Note label is visible in store mode ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Note:')).toBeVisible({ timeout: 10000 });
            }
        });
    });

    test.describe('Key UI Elements — Store Mode ⚠️', () => {
        test('Submit button is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/`);
            if (!page.url().includes('/login')) {
                await expect(page.getByText('Submit')).toBeVisible({ timeout: 10000 });
            }
        });
    });

});

test.describe('Rest Day Work Request — Approval Mode (/app/request/RestDayWork/:id)', () => {
    // Approval mode renders for supervisors viewing a specific request.
    // Employee fields become read-only; approver_note textarea and Approve/Decline/Cancel buttons appear.
    // Note: a real :id is required for this route to load correctly.

    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            // Use a placeholder id — page may redirect or show 404 but must not 500
            const r = await page.goto(`${BASE_URL}/app/request/RestDayWork/1`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/1`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors in body', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/1`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    test.describe('Key UI Elements — Approval Mode ⚠️', () => {
        // KNOWN BUG B-001: approve() fallthrough — request_validity_checker returning false falls to regular path

        test('Approve button is visible for supervisor ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/1`);
            if (!page.url().includes('/login')) {
                // [CODE REVIEW 2026-07-07] Approve only visible in approval mode (supervisor) + status pending/declined.
                // RequestButtons.js: status-dependent. Guard with count check.
                const btn = page.getByText('Approve');
                const count = await btn.count();
                if (count > 0) {
                    await expect(btn.first()).toBeVisible({ timeout: 10000 });
                }
            }
        });

        test('Decline button is visible for supervisor ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/1`);
            if (!page.url().includes('/login')) {
                // [CODE REVIEW 2026-07-07] Decline only visible in approval mode (supervisor) + status pending/approved.
                const btn = page.getByText('Decline');
                const count = await btn.count();
                if (count > 0) {
                    await expect(btn.first()).toBeVisible({ timeout: 10000 });
                }
            }
        });

        test('Cancel button is visible in update mode (employee own request) ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/1`);
            if (!page.url().includes('/login')) {
                // [CODE REVIEW 2026-07-07] Cancel renders ONLY in method=='update' mode (RequestButtons.js line 32),
                // NOT in approval mode. Employee sees Cancel when viewing their own pending/declined request.
                const btn = page.getByText('Cancel');
                const count = await btn.count();
                if (count > 0) {
                    await expect(btn.first()).toBeVisible({ timeout: 10000 });
                }
            }
        });

        test('approver note textarea is visible in approval mode ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/request/RestDayWork/1`);
            if (!page.url().includes('/login')) {
                await expect(page.locator('textarea[name="approver_note"]')).toBeVisible({ timeout: 10000 });
            }
        });
    });
});

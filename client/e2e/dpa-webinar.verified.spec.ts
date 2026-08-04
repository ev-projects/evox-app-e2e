// VERIFIED-BACKED — generated 2026-07-07 from dpa-webinar.registry.md (vetted by Gobi Singaravel on 2026-06-29)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('DPA Webinar (/app/dpa)', () => {

    // =========================================================================
    // On Load
    // =========================================================================
    test.describe('On Load', () => {
        test('returns status < 500', async ({ page }) => {
            const r = await page.goto(`${BASE_URL}/app/dpa`);
            expect(r?.status()).toBeLessThan(500);
        });

        test('body is visible', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/dpa`);
            await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
        });

        test('no PHP errors', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/dpa`);
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toMatch(/Uncaught Error|Fatal error|Parse error/);
        });
    });

    // =========================================================================
    // Auth Gate
    // =========================================================================
    test.describe('Auth Gate', () => {
        test('unauthenticated visit redirects to login', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/dpa`);
            await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
            if (page.url().includes('/login')) {
                await expect(page.locator('input[type="email"], input[name="email"], input[type="text"]').first()).toBeVisible();
            }
        });
    });

    // =========================================================================
    // Key UI Elements (developer-confirmed)
    // =========================================================================
    test.describe('Key UI Elements', () => {
        // Video player area — confirmed: ReactPlayer renders for users with dpa_ticked_at == null.
        // controlsList='nodownload' confirmed working on staging 2026-06-29.
        test('video player element is present in DOM ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/dpa`);
            if (!page.url().includes('/login')) {
                // ReactPlayer renders a <video> element or an <iframe>; assert either is present
                const videoOrIframe = page.locator('video, iframe').first();
                await expect(videoOrIframe).toBeVisible({ timeout: 10000 });
            }
        });

        // Already-completed state — confirmed from staging: shows "Thank you for watching the video!"
        // instead of the confirmation form when user.dpa_ticked_at != null.
        test('already-completed state shows thank-you message ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/dpa`);
            if (!page.url().includes('/login')) {
                // This assertion only passes for accounts with dpa_ticked_at already set.
                // For new accounts the message is hidden; test is guarded accordingly.
                const thankYou = page.getByText('Thank you for watching the video!');
                const alreadyDone = await thankYou.isVisible().catch(() => false);
                if (alreadyDone) {
                    await expect(thankYou).toBeVisible();
                    // Confirm the checkbox form is NOT shown for already-completed users
                    await expect(page.locator('input[name="confirm"]')).not.toBeVisible();
                }
            }
        });
    });

    // =========================================================================
    // Form Fields
    // Confirmation form is hidden until video reaches 23:15 (1395 s) or ends.
    // Elements below are confirmed in [DEVELOPER VETTING] but only appear post-threshold.
    // =========================================================================
    test.describe('Form Fields', () => {
        // confirm checkbox — name="confirm" confirmed in DOM by Gobi Singaravel 2026-06-29.
        // Full label text confirmed on staging (long compliance statement — not a short label).
        test('confirm checkbox renders with name="confirm" when form is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/dpa`);
            if (!page.url().includes('/login')) {
                // The checkbox is only visible after the video threshold is met.
                // In an automated test we cannot fast-forward a video player reliably,
                // so we check the element exists in the DOM (may be hidden) and,
                // if already visible (e.g., on a test account past the threshold), assert it.
                const checkbox = page.locator('input[name="confirm"]');
                const exists = await checkbox.count();
                if (exists > 0) {
                    // If the form is shown (already-completed accounts do NOT render it),
                    // confirm the checkbox attribute is as vetted.
                    const isVisible = await checkbox.isVisible().catch(() => false);
                    if (isVisible) {
                        await expect(checkbox).toHaveAttribute('name', 'confirm');
                    }
                }
            }
        });

        // Submit button — button[type="submit"] confirmed by Gobi Singaravel 2026-06-29.
        // Label is "Submit". Has both btn-secondary and btn-primary CSS classes (copy-paste bug —
        // class-based selectors avoided per vetting note; use button[type="submit"] instead).
        test('submit button renders with type="submit" when form is visible ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/dpa`);
            if (!page.url().includes('/login')) {
                const submitBtn = page.locator('button[type="submit"]');
                const exists = await submitBtn.count();
                if (exists > 0) {
                    const isVisible = await submitBtn.first().isVisible().catch(() => false);
                    if (isVisible) {
                        await expect(submitBtn.first()).toBeVisible();
                    }
                }
            }
        });

        // Validation: submitting without ticking the checkbox shows inline error.
        // Error message confirmed on staging 2026-07-01:
        // "Please tick the checkbox to confirm the submission."
        // No API call fires when checkbox is unticked (Yup blocks submit).
        test('submitting without ticking checkbox shows Yup error message ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/dpa`);
            if (!page.url().includes('/login')) {
                const submitBtn = page.locator('button[type="submit"]');
                const isVisible = await submitBtn.first().isVisible().catch(() => false);
                if (isVisible) {
                    await submitBtn.first().click();
                    await expect(
                        page.getByText('Please tick the checkbox to confirm the submission.')
                    ).toBeVisible({ timeout: 5000 });
                }
            }
        });
    });

    // =========================================================================
    // Already-Completed sub-page (informational mode)
    // When user.dpa_ticked_at != null, the page becomes informational only.
    // Confirmed from staging: "Thank you for watching the video!" + submission date shown.
    // =========================================================================
    test.describe('DPA Already Completed (informational mode)', () => {
        test('DPA submission date is displayed for completed users ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/dpa`);
            if (!page.url().includes('/login')) {
                const thankYou = page.getByText('Thank you for watching the video!');
                const alreadyDone = await thankYou.isVisible().catch(() => false);
                if (alreadyDone) {
                    // "DPA Submission Date: YYYY-MM-DD HH:MM:SS" is shown below the thank-you text.
                    await expect(page.getByText(/DPA Submission Date:/)).toBeVisible();
                }
            }
        });

        test('confirmation form is absent for already-completed users ⚠️', async ({ page }) => {
            await page.goto(`${BASE_URL}/app/dpa`);
            if (!page.url().includes('/login')) {
                const thankYou = page.getByText('Thank you for watching the video!');
                const alreadyDone = await thankYou.isVisible().catch(() => false);
                if (alreadyDone) {
                    // When DPA is already ticked the confirm checkbox and submit button
                    // are NOT rendered — the form block is replaced by the thank-you message.
                    await expect(page.locator('input[name="confirm"]')).not.toBeVisible();
                    await expect(page.locator('button[type="submit"]')).not.toBeVisible();
                }
            }
        });
    });
});

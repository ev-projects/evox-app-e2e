// COVERAGE GAP 2026-08-18 — EV Learning -> Secure Coding
//
// Source under test : client/src/container/EVLearning/EVLearning.js (the Internal Resource
//                     <Link> at line 60), client/src/container/ElSecureCoding/ElSecureCoding.js
// Menu path         : EV Learning -> "Secure Coding - A Refresher"
// Already covered   : coverage100/load-gaps.spec.ts loads BOTH urls directly and asserts only
//                     "no server error + sidebar alive". Nothing anywhere clicks the link that
//                     is the only way a user reaches the page, and nothing asserts the page
//                     actually renders its deck rather than an empty card.
//
// SAFETY: read-only. This route has no form, no submit control and no API write of any kind
// (ElSecureCoding renders a static <iframe>; its tickDpa/showAlert dispatchers are unused).
import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/ph-employee.json' });

test.setTimeout(60_000); // staging is slow on first load of this asset-heavy page

async function assertHealthyPage(page: Page) {
  expect(page.url(), 'must not bounce to login').not.toContain('/login');
  const body = await page.locator('body').innerText();
  expect(body, 'session must not have expired into the LOGIN TO CONTINUE modal').not.toContain('LOGIN TO CONTINUE');
  for (const sig of ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops']) {
    expect(body, 'no PHP error text').not.toContain(sig);
  }
}

test.describe('EV Learning -> Secure Coding', () => {

  test('the EV Learning page offers Secure Coding as an internal resource, pointing at the in-app route', async ({ page }) => {
    await page.goto('/app/EVLearning', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);

    // EVLearning.js:60 — <Link to={global.links.ev_learning_secure_coding}> inside the
    // "Internal Resource" block. Every other course link on this page is an external <a>.
    const link = page.getByRole('link', { name: /Secure Coding - A Refresher/i });
    await expect(link).toBeVisible({ timeout: 30000 });
    await expect(link).toHaveAttribute('href', '/app/EVLearning/Secure_Coding');
  });

  test('the EV Learning page itself does not embed the Secure Coding deck — it only links to it', async ({ page }) => {
    // Negative arm of the test above: the deck belongs to the child route. If an iframe ever
    // shows up here the two pages have been merged and the link test above means nothing.
    await page.goto('/app/EVLearning', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await expect(page.getByRole('link', { name: /Secure Coding - A Refresher/i })).toBeVisible({ timeout: 30000 });
    await expect(page.locator('iframe[src*="sharepoint.com"]')).toHaveCount(0);
  });

  test('clicking the link navigates to the Secure Coding page and renders its titled card', async ({ page }) => {
    await page.goto('/app/EVLearning', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);

    await page.getByRole('link', { name: /Secure Coding - A Refresher/i }).click();
    await page.waitForURL(/\/app\/EVLearning\/Secure_Coding/, { timeout: 20000 });

    // AdminLte Content renders its `title` prop as <h3 class="card-title"> —
    // ElSecureCoding.js passes title="Secure Coding - A Refresher".
    await expect(page.locator('h3.card-title', { hasText: 'Secure Coding - A Refresher' }))
      .toBeVisible({ timeout: 30000 });
    await assertHealthyPage(page);
  });

  test('the Secure Coding page embeds the SharePoint deck in its slides container', async ({ page }) => {
    await page.goto('/app/EVLearning/Secure_Coding', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);

    // ElSecureCoding.js renders a single <iframe> inside <div className="slides"> pointing at
    // the eastvantage-my.sharepoint.com embedview URL. Asserting the container AND the host
    // proves the page rendered its payload, not just an empty card shell.
    const deck = page.locator('.slides iframe');
    await expect(deck).toHaveCount(1);
    await expect(deck).toHaveAttribute('src', /eastvantage-my\.sharepoint\.com/);
  });

  test('an employee reaching Secure Coding keeps the authenticated app shell (route is not permission-gated)', async ({ page }) => {
    // RouteList.js:163 wraps ElSecureCoding in a ProtectedRoute with NO level and NO feature
    // prop, so Wrapper's allow_to_show stays true for every logged-in role. Pin that: a plain
    // employee must get the page, never the 403 deny card.
    await page.goto('/app/EVLearning/Secure_Coding', { waitUntil: 'load', timeout: 30000 });
    await assertHealthyPage(page);
    await expect(page.locator('aside.main-sidebar')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.page-not-allowed-box')).toHaveCount(0);
  });
});

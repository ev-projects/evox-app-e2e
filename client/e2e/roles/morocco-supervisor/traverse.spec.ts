// AUTO-GENERATED from live menu dump 2026-07-08 — role: morocco-supervisor (hajar.alaoui@eastvantage.com)
// Read-only traversal: every menu item this role can see must load without error.
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/morocco-supervisor.json' });

const MENU: Array<{ label: string; href: string }> = [
  {
    "label": "Dashboard",
    "href": "/app/Dashboard"
  },
  {
    "label": "Daily Time Record",
    "href": "/app/dtr_in_mar/4884/"
  },
  {
    "label": "Request Form > Overtime",
    "href": "/app/request/Overtime/"
  },
  {
    "label": "Request Form > Rest Day Work",
    "href": "/app/request/RestDayWork/"
  },
  {
    "label": "Request Form > Change of Schedule",
    "href": "/app/request/ChangeSchedule/"
  },
  {
    "label": "Request Form > Certificate Of Employment",
    "href": "/app/request/CertificateOfEmployment/"
  },
  {
    "label": "My Requests",
    "href": "/app/account/MyRequests"
  },
  {
    "label": "My Dispute Requests",
    "href": "/app/account/MyRequestsDispute"
  },
  {
    "label": "EV Assist > Create Ticket",
    "href": "/app/fresh_service/create/"
  },
  {
    "label": "EV Assist > My Tickets",
    "href": "/app/fresh_service/tickets/"
  },
  {
    "label": "Asset Management",
    "href": "/app/asset_management/"
  },
  {
    "label": "DPA Webinar",
    "href": "/app/dpa"
  },
  {
    "label": "EV Support Team Schedule",
    "href": "/app/OpsSchedule"
  },
  {
    "label": "Manage Department Schedule > Template List",
    "href": "/app/schedule/template/"
  },
  {
    "label": "Manage Department Schedule > Assign Department Schedule",
    "href": "/app/schedule/assign/department"
  },
  {
    "label": "Manage Department Schedule > Add Template",
    "href": "/app/schedule/"
  },
  {
    "label": "My Team > Employee List",
    "href": "/app/team/MyTeamList"
  },
  {
    "label": "My Team > DPA List",
    "href": "/app/team/DPAList"
  },
  {
    "label": "My Team > My Team Request",
    "href": "/app/team/MyTeamRequests"
  },
  {
    "label": "My Team > DTR Summary",
    "href": "/app/team/DtrSummary"
  },
  {
    "label": "My Team > DTR Multi-clock in Summary",
    "href": "/app/team/DtrMultiLogsSummary"
  },
  {
    "label": "My Team > DTR Logs",
    "href": "/app/team/DtrLogs"
  },
  {
    "label": "Reports > Team Schedule",
    "href": "/app/team/MyTeamSchedule"
  },
  {
    "label": "Reports > Morocco Payroll Report",
    "href": "/app/viewreport/morocco/"
  },
  {
    "label": "Reports > Payroll Dispute Report",
    "href": "/app/payrolldisputeview/"
  }
];

test.describe('morocco-supervisor — menu traversal (25 pages)', () => {
  for (const item of MENU) {
    test(`loads: ${item.label} (${item.href})`, async ({ page }) => {
      const resp = await page.goto(item.href, { waitUntil: 'load', timeout: 30000 });
      if (resp) expect(resp.status(), 'HTTP status').toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      expect(page.url(), 'must not bounce to login').not.toContain('/login');
      const body = await page.locator('body').innerText();
      for (const sig of ['Fatal error', 'Parse error', 'Uncaught Error', 'Whoops']) {
        expect(body, 'no PHP error text').not.toContain(sig);
      }
      // sidebar still present = app shell alive for this role
      await expect(page.locator('aside.main-sidebar')).toBeVisible({ timeout: 10000 });
    });
  }
});

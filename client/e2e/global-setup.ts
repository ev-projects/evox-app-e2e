/**
 * global-setup.ts — logs in as each of the 15 role/geo combinations and saves
 * browser storage state to e2e/.auth/<role>.json.
 *
 * Run automatically before the Playwright suite via globalSetup in playwright.config.ts.
 * Auth files are consumed by roles/<role>/traverse.spec.ts and roles/<role>/interactions.spec.ts
 * via test.use({ storageState: 'e2e/.auth/<role>.json' }).
 * (NB: never write "slash-star-slash" glob patterns inside this block comment — the star-slash
 * terminates the comment and the file stops parsing; that exact bug shipped and blocked all E2E.)
 *
 * Roles without a matching env var are skipped with a warning — their specs will fail
 * (storageState file absent) unless the env var is supplied.
 */

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PASSWORD = process.env.E2E_PASSWORD || '{ev2010}';

const ROLES: Array<{ file: string; emailEnv: string }> = [
  { file: 'ph-employee',        emailEnv: 'E2E_USER_EMPLOYEE_PHILIPPINES' },
  { file: 'ph-supervisor',      emailEnv: 'E2E_USER_SUPERVISOR_PHILIPPINES' },
  { file: 'ph-hr',              emailEnv: 'E2E_USER_HR_PHILIPPINES' },
  { file: 'ph-payroll',         emailEnv: 'E2E_USER_PAYROLL_PHILIPPINES' },
  { file: 'india-employee',     emailEnv: 'E2E_USER_EMPLOYEE_INDIA' },
  { file: 'india-supervisor',   emailEnv: 'E2E_USER_SUPERVISOR_INDIA' },
  { file: 'india-hr',           emailEnv: 'E2E_USER_HR_INDIA' },
  { file: 'india-payroll',      emailEnv: 'E2E_USER_PAYROLL_INDIA' },
  { file: 'morocco-employee',   emailEnv: 'E2E_USER_EMPLOYEE_MOROCCO' },
  { file: 'morocco-supervisor', emailEnv: 'E2E_USER_SUPERVISOR_MOROCCO' },
  { file: 'morocco-hr',         emailEnv: 'E2E_USER_HR_MOROCCO' },
  { file: 'morocco-payroll',    emailEnv: 'E2E_USER_PAYROLL_MOROCCO' },
  { file: 'admin',              emailEnv: 'E2E_USER_ADMIN_PHILIPPINES' },
  { file: 'hr-head',            emailEnv: 'E2E_USER_HR_HEAD' },
  { file: 'payroll-head',       emailEnv: 'E2E_USER_PAYROLL_HEAD' },
];

async function loginAndSave(email: string, authFile: string, baseURL: string): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseURL}/`);
    await page.getByRole('textbox', { name: 'Email or Username' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: /Log In/i }).click();

    // Dismiss "Close alert" if a previous login attempt left an error banner
    const closeAlert = page.getByRole('button', { name: 'Close alert' });
    if (await closeAlert.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeAlert.click();
      await page.getByRole('button', { name: /Log In/i }).click();
    }

    await page.waitForURL(/\/app\//, { timeout: 20000 });

    // Dismiss any in-page dialog (Referral Drive, announcements modal, etc.)
    const dlgClose = page.getByRole('dialog').getByRole('button', { name: 'Close' });
    if (await dlgClose.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dlgClose.click();
    }

    await context.storageState({ path: authFile });
    console.log(`  ✓  ${email.padEnd(45)} → ${path.basename(authFile)}`);
  } catch (err) {
    console.error(`  ✗  ${email} — login failed: ${(err as Error).message}`);
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(): Promise<void> {
  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL ||
    'https://evoxtest.eastvantage.com';

  const authDir = path.resolve(__dirname, '.auth');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  console.log('\n[global-setup] Logging in as all 15 role/geo combinations…');
  console.log(`               Base URL: ${baseURL}\n`);

  for (const role of ROLES) {
    const email = process.env[role.emailEnv];
    if (!email) {
      console.warn(`  ⚠  ${role.emailEnv} not set — skipping ${role.file}.json`);
      continue;
    }
    const authFile = path.join(authDir, `${role.file}.json`);
    // staging is occasionally slow enough that the login form misses its timeout;
    // verified 2026-08-06: both "failed" accounts logged in fine on a retry. One retry
    // keeps a transient stall from silently dropping a role's auth state.
    await loginAndSave(email, authFile, baseURL);
    if (!fs.existsSync(authFile)) {
      console.log(`     retrying ${role.file} once…`);
      await loginAndSave(email, authFile, baseURL);
    }
  }

  console.log('\n[global-setup] Done.\n');
}

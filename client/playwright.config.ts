import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: path.resolve(process.cwd(), '.env.e2e') });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://evoxtest.eastvantage.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  globalSetup: './e2e/global-setup.ts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

import { devices, type PlaywrightTestConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

const config: PlaywrightTestConfig = {
  testDir: './',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
};

if (isCI) {
  config.workers = 1;
}

export default config;

import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  webServer: [
    {
      command:
        'node_modules/node/bin/node --conditions=react-server --import tsx scripts/e2e-server.ts',
      url: 'http://127.0.0.1:3100/sign-in',
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: 'node_modules/node/bin/node --import tsx scripts/public-preview.ts',
      url: 'http://127.0.0.1:3101',
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});

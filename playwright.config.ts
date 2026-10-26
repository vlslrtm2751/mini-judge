import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173/js-ide/#',
    headless: true,
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173/js-ide/#',
    timeout: 120000,
    reuseExistingServer: true,
  },
});

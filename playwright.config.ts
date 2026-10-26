import { defineConfig } from '@playwright/test';
import { BASE_PATH } from './src/domain/deploy';

const previewURL = `http://127.0.0.1:4173${BASE_PATH}#`;

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: previewURL,
    headless: true,
  },
  webServer: {
    command: 'npm run preview',
    url: previewURL,
    timeout: 120000,
    reuseExistingServer: true,
  },
});

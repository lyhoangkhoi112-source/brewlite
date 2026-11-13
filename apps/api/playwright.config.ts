import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { configureTestDatabase } from './test/test-database.js';

const apiDirectory = dirname(fileURLToPath(import.meta.url));
const testDatabaseUrl = configureTestDatabase();
const apiPort = 3101;
const webPort = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    browserName: 'chromium',
    headless: true,
  },
  webServer: [
    {
      command: 'npm run start:dev -- --preserveWatchOutput',
      cwd: apiDirectory,
      url: `http://127.0.0.1:${apiPort}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
        NODE_ENV: 'test',
        MOCK_PAYMENTS_ENABLED: 'true',
        PORT: String(apiPort),
      },
    },
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${webPort}`,
      cwd: resolve(apiDirectory, '../web'),
      url: `http://127.0.0.1:${webPort}`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: `http://127.0.0.1:${apiPort}`,
        NODE_ENV: 'development',
      },
    },
  ],
});

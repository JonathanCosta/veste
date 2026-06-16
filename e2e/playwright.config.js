import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173/veste/',
    headless: true,
    viewport: { width: 390, height: 844 }, // iPhone 14 size
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 15000,
  },
})

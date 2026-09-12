import { defineConfig, devices } from '@playwright/test'

/**
 * Браузерный прогон нужен для того, чего jsdom не считает: раскладки, ширин,
 * поведения на узком экране. Логика и тексты остаются за компонентными тестами.
 *
 * Сервер поднимает сам прогон, а API в тестах подменяется перехватом запросов,
 * поэтому ни бэкенда, ни базы для него не нужно.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})

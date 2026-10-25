import { defineConfig, devices } from '@playwright/test';

/**
 * Revisión de la tienda y el admin con Playwright.
 *   npx playwright test                  (tienda, escritorio y celular)
 *   npx playwright test --project=admin  (necesita FASTORE_E2E_CORREO y FASTORE_E2E_CLAVE: cuenta de identidad local con rol ADMIN en FASTORE)
 * Requiere fastore-api (8010) e identidad (8001/4300) levantados; ng serve lo levanta Playwright si no está.
 * Las capturas quedan en test-results/capturas.
 */
const canal = process.env['PW_CHANNEL'] ?? 'msedge';

export default defineConfig({
  testDir: './e2e',
  // php artisan serve atiende una petición a la vez: con muchas imágenes en cola las respuestas tardan.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env['FASTORE_E2E_URL'] ?? 'http://localhost:4700',
    channel: canal,
    locale: 'es-PE',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'escritorio', testMatch: /tienda\.spec/, use: { viewport: { width: 1366, height: 860 } } },
    { name: 'celular', testMatch: /tienda\.spec/, use: { ...devices['Pixel 7'], channel: canal } },
    { name: 'admin', testMatch: /admin\.spec/, use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npx ng serve --port 4700',
    url: 'http://localhost:4700',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

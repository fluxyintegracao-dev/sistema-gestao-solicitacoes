import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 2,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    // Setup: salva o estado de autenticação em arquivo
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },
    // Testes de autenticação (sem estado salvo — testa o próprio fluxo de login)
    // Depende do setup para garantir ordem sequencial e evitar race conditions no rate limit
    {
      name: 'auth-tests',
      testMatch: /auth\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    // Testes principais com Chrome (usa estado de autenticação salvo)
    {
      name: 'chromium',
      testMatch: /tests\/(?!auth).*\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    // Testes com Firefox (usa estado de autenticação salvo)
    {
      name: 'firefox',
      testMatch: /tests\/(?!auth).*\.spec\.js/,
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
        navigationTimeout: 30_000,
      },
      dependencies: ['setup'],
    },
  ],
  // Inicia o servidor de desenvolvimento antes dos testes (opcional)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   cwd: '../frontend',
  //   reuseExistingServer: !process.env.CI,
  // },
});

import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for SkillMap Product Demo
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  // Maximum time one test can run
  timeout: 120 * 1000, // 2 minutes for demo

  fullyParallel: false, // Run tests one at a time for demo recording

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests (0 for demo recording)
  retries: 0,

  // Number of workers (1 for smooth demo recording)
  workers: 1,

  // Reporter to use
  reporter: 'html',

  use: {
    // Base URL for your app
    baseURL: 'http://localhost:5173',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Video recording settings (for backup - OBS will be primary)
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 }
    },

    // Screenshot settings
    screenshot: 'only-on-failure',

    // Browser viewport
    viewport: { width: 1920, height: 1080 },

    // Slow down actions for demo (in milliseconds)
    // Adjust this to control demo speed
    // slowMo: 1000, // Uncomment to slow down by 1 second per action
  },

  // Configure projects for different browsers (for demo, use Chromium)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

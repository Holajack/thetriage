import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for HikeWise screenshot generation
 *
 * Screenshot sizes based on store requirements:
 * - iOS: iPhone 6.7", 6.5", 5.5", iPad 12.9"
 * - Android: Phone (1080x1920), Tablet (1200x1920)
 */
export default defineConfig({
  testDir: './screenshots',
  timeout: 60000,
  fullyParallel: false, // Run sequentially to avoid server overload
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'off', // We handle screenshots manually
    video: 'off',
  },

  projects: [
    // ==========================================
    // iOS Device Configurations
    // ==========================================
    {
      name: 'iphone-6.7',
      use: {
        // iPhone 15 Pro Max - 1290x2796 @ 3x = 430x932
        viewport: { width: 430, height: 932 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'iphone-6.5',
      use: {
        // iPhone 11 Pro Max - 1242x2688 @ 3x = 414x896
        viewport: { width: 414, height: 896 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'iphone-5.5',
      use: {
        // iPhone 8 Plus - 1242x2208 @ 3x = 414x736
        viewport: { width: 414, height: 736 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'ipad-12.9',
      use: {
        // iPad Pro 12.9" - 2048x2732 @ 2x = 1024x1366
        viewport: { width: 1024, height: 1366 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },

    // ==========================================
    // Android Device Configurations
    // ==========================================
    {
      name: 'android-phone',
      use: {
        // Standard phone - 1080x1920 @ 3x = 360x640
        viewport: { width: 360, height: 640 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'android-tablet',
      use: {
        // 7" Tablet - 1200x1920 @ 2x = 600x960
        viewport: { width: 600, height: 960 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  // Run Expo Web server before tests
  webServer: {
    command: 'npm run web',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

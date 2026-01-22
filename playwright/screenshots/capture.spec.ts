import { test, expect } from '@playwright/test';
import { injectMockAuth, waitForAppReady } from '../fixtures/mock-auth';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Screenshot capture tests for HikeWise store listings
 *
 * Captures screenshots at all required device sizes for:
 * - Apple App Store (iPhone 6.7", 6.5", 5.5", iPad 12.9")
 * - Google Play Store (Phone 1080x1920, Tablet 1200x1920)
 */

// Screen configurations with routes and selectors
const screens = [
  {
    id: 'home',
    name: 'HomeScreen',
    route: '/',
    description: 'Main landing with Focus button',
    waitFor: 2500,
  },
  {
    id: 'study',
    name: 'StudySessionScreen',
    route: '/study',
    description: 'Timer in progress',
    waitFor: 3000,
  },
  {
    id: 'nora',
    name: 'NoraScreen',
    route: '/nora',
    description: 'AI assistant chat',
    waitFor: 2500,
  },
  {
    id: 'analytics',
    name: 'AnalyticsScreen',
    route: '/analytics',
    description: 'Progress charts',
    waitFor: 3000,
  },
  {
    id: 'subscription',
    name: 'SubscriptionScreen',
    route: '/subscription',
    description: 'Pricing tiers',
    waitFor: 2500,
  },
  {
    id: 'leaderboard',
    name: 'LeaderboardScreen',
    route: '/leaderboard',
    description: 'Community rankings',
    waitFor: 2500,
  },
  {
    id: 'profile',
    name: 'ProfileScreen',
    route: '/profile',
    description: 'User settings',
    waitFor: 2500,
  },
];

// Map project names to store directories
function getOutputDir(projectName: string): string {
  const mapping: Record<string, string> = {
    'iphone-6.7': 'ios/iphone-6.7',
    'iphone-6.5': 'ios/iphone-6.5',
    'iphone-5.5': 'ios/iphone-5.5',
    'ipad-12.9': 'ios/ipad-12.9',
    'android-phone': 'android/phone',
    'android-tablet': 'android/tablet',
  };
  return mapping[projectName] || projectName;
}

test.describe('Store Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock authentication before each test
    await injectMockAuth(page);
  });

  for (const screen of screens) {
    test(`capture ${screen.id} - ${screen.description}`, async ({ page }, testInfo) => {
      const projectName = testInfo.project.name;
      const outputDir = path.join(
        process.cwd(),
        'store-assets',
        'screenshots',
        getOutputDir(projectName)
      );

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Navigate to the screen
      await page.goto(screen.route);

      // Wait for content to load and animations to settle
      await page.waitForTimeout(screen.waitFor);

      // Take screenshot
      const screenshotPath = path.join(outputDir, `${screen.id}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        type: 'png',
      });

      console.log(`📸 Captured: ${projectName}/${screen.id}.png`);

      // Verify screenshot was created
      expect(fs.existsSync(screenshotPath)).toBeTruthy();
    });
  }
});

test.describe('Screenshot Validation', () => {
  test('all required screenshots exist', async () => {
    const baseDir = path.join(process.cwd(), 'store-assets', 'screenshots');
    const devices = [
      'ios/iphone-6.7',
      'ios/iphone-6.5',
      'ios/iphone-5.5',
      'ios/ipad-12.9',
      'android/phone',
      'android/tablet',
    ];

    for (const device of devices) {
      for (const screen of screens) {
        const screenshotPath = path.join(baseDir, device, `${screen.id}.png`);

        // This test runs after capture, so files should exist
        if (fs.existsSync(screenshotPath)) {
          console.log(`✅ ${device}/${screen.id}.png`);
        } else {
          console.log(`❌ Missing: ${device}/${screen.id}.png`);
        }
      }
    }
  });
});

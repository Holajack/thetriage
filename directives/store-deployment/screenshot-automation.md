# Screenshot Automation

## Goal
Generate store-ready screenshots for all required device sizes using Playwright against the Expo Web version of HikeWise.

## Inputs
- **Required:**
  - `screens`: List of screens to capture (default: all key screens)
- **Optional:**
  - `theme`: light/dark (default: light)
  - `add_device_frames`: Whether to add device frames (default: false)
  - `devices`: Specific devices to capture (default: all)

## Prerequisites

### Install Playwright
```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Verify Expo Web Works
```bash
npm run web
# Should start on http://localhost:8081
```

## Execution

### Run All Screenshots
```bash
npx playwright test playwright/screenshots/capture.spec.ts
```

### Run Specific Device
```bash
npx playwright test --project=iphone-6.7
npx playwright test --project=android-phone
```

### Run Specific Screen
```bash
npx playwright test -g "capture home"
npx playwright test -g "capture analytics"
```

## Screenshot Specifications

### iOS (Apple App Store)

| Device | Display Size | Resolution | Scale | Viewport |
|--------|--------------|------------|-------|----------|
| iPhone 6.7" | iPhone 15 Pro Max | 1290x2796 | 3x | 430x932 |
| iPhone 6.5" | iPhone 11 Pro Max | 1242x2688 | 3x | 414x896 |
| iPhone 5.5" | iPhone 8 Plus | 1242x2208 | 3x | 414x736 |
| iPad 12.9" | iPad Pro 12.9" | 2048x2732 | 2x | 1024x1366 |

### Android (Google Play)

| Device | Resolution | Scale | Viewport |
|--------|------------|-------|----------|
| Phone | 1080x1920 | 3x | 360x640 |
| 7" Tablet | 1200x1920 | 2x | 600x960 |

## Screens to Capture

| ID | Screen | Route | Description |
|----|--------|-------|-------------|
| home | HomeScreen | / | Main landing with Focus button |
| study | StudySessionScreen | /study | Timer in progress |
| nora | NoraScreen | /nora | AI assistant chat |
| analytics | AnalyticsScreen | /analytics | Progress charts |
| subscription | SubscriptionScreen | /subscription | Pricing tiers |
| leaderboard | LeaderboardScreen | /leaderboard | Community rankings |
| profile | ProfileScreen | /profile | User settings |

## Output Structure

```
store-assets/screenshots/
├── ios/
│   ├── iphone-6.7/
│   │   ├── home.png
│   │   ├── study.png
│   │   └── ...
│   ├── iphone-6.5/
│   ├── iphone-5.5/
│   └── ipad-12.9/
└── android/
    ├── phone/
    └── tablet/
```

## Mock Authentication

Screenshots use mock authentication to show the app in an authenticated state with sample data:

- **User**: FocusMaster (Premium tier)
- **Stats**: 12,450 focus minutes, 342 sessions, 15-day streak
- **Level**: 24 (48,750 XP)
- **Leaderboard position**: #3

Mock data is injected via `playwright/fixtures/mock-auth.ts`.

## Edge Cases

### Animation Timing
- Default wait: 2-3 seconds after navigation
- Charts/analytics: 3 seconds for chart animations
- Study timer: May need manual timer state setup

### Network Images
- Mock authentication handles profile data
- If images fail to load, they'll show placeholders
- Consider pre-loading critical images

### Auth Redirects
- Mock auth token is injected before navigation
- If redirected to login, check mock-auth.ts injection

### Web Compatibility
Some React Native components may render differently on web:
- 3D components (Three.js) may have issues
- Native-only components will be skipped
- Check for "Platform.select" code paths

## Post-Processing (Optional)

### Add Device Frames
Use `execution/screenshots/process_screenshots.py` to:
- Add device frames around screenshots
- Add marketing text overlays
- Resize to exact store requirements

### Manual Steps
1. Review each screenshot for visual issues
2. Crop/adjust if needed in image editor
3. Verify file sizes (under 8MB for App Store)

## Troubleshooting

### Server Won't Start
```bash
# Clear cache and restart
rm -rf node_modules/.cache
npm run web
```

### Screenshots Are Blank
- Increase wait time in capture.spec.ts
- Check console for JavaScript errors
- Verify mock auth is being injected

### Wrong Resolution
- Check deviceScaleFactor in playwright.config.ts
- Playwright captures at viewport × scale

### Tests Timeout
- Increase timeout in playwright.config.ts
- Check if Expo Web is running
- Verify route exists in app

## CI/CD Integration

Screenshots are generated in the `full-release.yml` workflow when `generate_screenshots: true`:

```yaml
- name: Run Playwright screenshot tests
  run: npx playwright test playwright/screenshots/
```

Artifacts are uploaded for review before store submission.

## Related Files
- `playwright/playwright.config.ts` - Device configurations
- `playwright/screenshots/capture.spec.ts` - Capture tests
- `playwright/fixtures/mock-auth.ts` - Mock authentication
- `store-assets/metadata/store-config.json` - Screen definitions

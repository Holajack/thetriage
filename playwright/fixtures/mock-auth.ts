import { Page } from '@playwright/test';

/**
 * Mock authentication data for screenshot generation
 * Injects a fake Supabase session into localStorage
 */

export interface MockUser {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  subscription_tier: 'free' | 'premium' | 'pro';
}

export const mockUser: MockUser = {
  id: 'screenshot-user-12345',
  email: 'demo@hikewise.app',
  username: 'FocusMaster',
  avatar_url: null,
  subscription_tier: 'premium',
};

export const mockSession = {
  access_token: 'mock-access-token-for-screenshots',
  refresh_token: 'mock-refresh-token-for-screenshots',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: {
    id: mockUser.id,
    email: mockUser.email,
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

export const mockProfile = {
  id: mockUser.id,
  username: mockUser.username,
  email: mockUser.email,
  avatar_url: mockUser.avatar_url,
  subscription_tier: mockUser.subscription_tier,
  total_focus_minutes: 12450,
  total_sessions: 342,
  current_streak: 15,
  longest_streak: 28,
  level: 24,
  xp: 48750,
  created_at: '2024-01-15T10:30:00Z',
};

export const mockLeaderboardData = [
  { rank: 1, username: 'StudyChamp', focus_minutes: 18500, level: 32 },
  { rank: 2, username: 'FocusWizard', focus_minutes: 16200, level: 29 },
  { rank: 3, username: mockUser.username, focus_minutes: 12450, level: 24, isCurrentUser: true },
  { rank: 4, username: 'DeepWorker', focus_minutes: 11800, level: 23 },
  { rank: 5, username: 'ZenStudent', focus_minutes: 10500, level: 21 },
];

export const mockAnalyticsData = {
  weeklyMinutes: [120, 145, 90, 180, 165, 200, 155],
  monthlyMinutes: 4250,
  averageSessionLength: 38,
  peakHour: 14,
  completionRate: 87,
};

/**
 * Inject mock authentication into the page
 * Call this before navigating to authenticated routes
 */
export async function injectMockAuth(page: Page): Promise<void> {
  await page.addInitScript((data) => {
    const { session, profile, leaderboard, analytics } = data;

    // Set Supabase session in localStorage
    const supabaseKey = 'sb-ucculvnodabrfwbkzsnx-auth-token';
    localStorage.setItem(supabaseKey, JSON.stringify({
      currentSession: session,
      expiresAt: session.expires_at,
    }));

    // Set mock data for components to use
    localStorage.setItem('hikewise-mock-profile', JSON.stringify(profile));
    localStorage.setItem('hikewise-mock-leaderboard', JSON.stringify(leaderboard));
    localStorage.setItem('hikewise-mock-analytics', JSON.stringify(analytics));

    // Flag that we're in screenshot mode
    localStorage.setItem('hikewise-screenshot-mode', 'true');
  }, {
    session: mockSession,
    profile: mockProfile,
    leaderboard: mockLeaderboardData,
    analytics: mockAnalyticsData,
  });
}

/**
 * Wait for app to fully load and stabilize
 */
export async function waitForAppReady(page: Page, timeout = 10000): Promise<void> {
  // Wait for React to mount
  await page.waitForSelector('[data-testid="app-root"]', { timeout }).catch(() => {
    // Fallback: wait for any content
    return page.waitForSelector('body > div', { timeout });
  });

  // Wait for animations to settle
  await page.waitForTimeout(2000);
}

/**
 * Navigate to a specific screen and wait for it to load
 */
export async function navigateToScreen(
  page: Page,
  screenPath: string,
  waitSelector?: string
): Promise<void> {
  await page.goto(screenPath);

  if (waitSelector) {
    await page.waitForSelector(waitSelector, { timeout: 10000 });
  }

  // Wait for animations
  await page.waitForTimeout(2000);
}

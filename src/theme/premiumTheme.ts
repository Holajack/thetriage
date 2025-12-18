/**
 * Premium Theme System
 * Based on Chris Ro's Design Principles
 *
 * This extends the base theme with premium-quality design tokens
 * for typography, spacing, animations, and colors.
 */

import { Easing } from 'react-native-reanimated';

// ============================================
// TYPOGRAPHY SCALE
// ============================================
export const Typography = {
  // Display - Hero headlines
  display: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: 40,
  },

  // H1 - Primary headlines
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 34,
  },

  // H2 - Section headers
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 28,
  },

  // H3 - Card titles
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 24,
  },

  // Body - Regular text
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
    lineHeight: 22,
  },

  // Body Small
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },

  // Caption - Secondary text
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
    lineHeight: 16,
  },

  // Label - Buttons, tabs
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    lineHeight: 18,
    textTransform: 'uppercase' as const,
  },

  // Stats - Numbers, counters (tabular)
  stat: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: 0,
    fontVariant: ['tabular-nums'] as const,
  },

  // Stat Small
  statSmall: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0,
    fontVariant: ['tabular-nums'] as const,
  },
};

// ============================================
// SPACING SCALE (8px base)
// ============================================
export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// ============================================
// BORDER RADIUS
// ============================================
export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

// ============================================
// SHADOWS (Premium depth)
// ============================================
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  }),
};

// ============================================
// ANIMATION CONFIGS (Spring Physics)
// ============================================
export const AnimationConfig = {
  // Quick micro-interactions
  quick: {
    damping: 20,
    stiffness: 400,
    mass: 1,
  },

  // Standard interactions
  standard: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },

  // Bouncy (celebration, success)
  bouncy: {
    damping: 10,
    stiffness: 100,
    mass: 1,
  },

  // Gentle (page transitions)
  gentle: {
    damping: 20,
    stiffness: 80,
    mass: 1,
  },

  // Snappy (button press)
  snappy: {
    damping: 25,
    stiffness: 500,
    mass: 0.8,
  },
};

// Timing configs for non-spring animations
export const TimingConfig = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  entrance: 400,
  exit: 250,
};

// Easing curves
export const EasingConfig = {
  easeOut: Easing.bezier(0.33, 1, 0.68, 1),
  easeIn: Easing.bezier(0.32, 0, 0.67, 0),
  easeInOut: Easing.bezier(0.65, 0, 0.35, 1),
  bounce: Easing.bezier(0.68, -0.55, 0.265, 1.55),
};

// ============================================
// STAGGER DELAYS (for list entrances)
// ============================================
export const StaggerDelay = {
  fast: 50,    // Quick list items
  normal: 80,  // Standard list items
  slow: 120,   // Cards, larger items
};

// ============================================
// PREMIUM COLORS (Extended palette)
// ============================================
export const PremiumColors = {
  // Success states
  success: {
    light: '#4ADE80',
    main: '#22C55E',
    dark: '#16A34A',
  },

  // Warning states
  warning: {
    light: '#FCD34D',
    main: '#F59E0B',
    dark: '#D97706',
  },

  // Error states
  error: {
    light: '#F87171',
    main: '#EF4444',
    dark: '#DC2626',
  },

  // Info states
  info: {
    light: '#60A5FA',
    main: '#3B82F6',
    dark: '#2563EB',
  },

  // Gradients for premium feel
  gradients: {
    primary: ['#6366F1', '#8B5CF6'],
    success: ['#22C55E', '#16A34A'],
    gold: ['#FCD34D', '#F59E0B'],
    sunset: ['#F97316', '#EC4899'],
    ocean: ['#06B6D4', '#3B82F6'],
    premium: ['#8B5CF6', '#EC4899', '#F97316'],
  },

  // Holographic effect colors
  holographic: [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96E6A1',
    '#DDA0DD',
    '#FFE66D',
  ],
};

// ============================================
// MASCOT STATES (Nora & Patrick)
// ============================================
export type MascotState =
  | 'idle'      // Subtle breathing/blinking
  | 'thinking'  // Processing animation
  | 'excited'   // User achievement
  | 'concerned' // User struggling
  | 'sleeping'  // App backgrounded
  | 'waving'    // Greeting/onboarding
  | 'celebrating'; // Success celebration

export const MascotAnimationDurations = {
  idle: 3000,
  thinking: 1500,
  excited: 2000,
  concerned: 2500,
  sleeping: 4000,
  waving: 2000,
  celebrating: 2500,
};

// ============================================
// HAPTIC PATTERNS
// ============================================
export const HapticPatterns = {
  buttonPress: 'light' as const,
  success: 'success' as const,
  error: 'error' as const,
  warning: 'warning' as const,
  selection: 'selection' as const,
  milestone: 'notification' as const,
};

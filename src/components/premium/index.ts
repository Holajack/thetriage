/**
 * Premium Components Index
 * Based on Chris Ro's Design Principles
 *
 * Export all premium UI components for easy importing
 */

// Buttons
export { AnimatedButton, default as AnimatedButtonDefault } from './AnimatedButton';

// Loading states
export {
  ShimmerLoader,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatarRow,
  SkeletonStatsGrid,
  default as ShimmerLoaderDefault,
} from './ShimmerLoader';

// Achievements & Gamification
export { HolographicBadge, BadgeGrid, default as HolographicBadgeDefault } from './HolographicBadge';

// Tab Navigation
export {
  AnimatedTabIcon,
  HomeTabIcon,
  ProfileTabIcon,
  HistoryTabIcon,
  StatsTabIcon,
  BonusesTabIcon,
  CommunityTabIcon,
  SettingsTabIcon,
  ChatTabIcon,
  default as AnimatedTabIconDefault,
} from './AnimatedTabIcon';

// Lists & Grids
export {
  StaggeredList,
  StaggeredItem,
  AnimatedFlatList,
  CardListItem,
  StaggeredGrid,
  StaggeredSection,
  default as StaggeredListDefault,
} from './StaggeredList';

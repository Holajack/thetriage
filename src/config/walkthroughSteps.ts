import { WalkthroughStep } from '../components/InteractiveWalkthrough';

// ── HomeScreen ──

export const HOME_STEPS: WalkthroughStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to HikeWise!',
    description: "I'm Nora, your study guide. Let me show you around — it'll only take a sec!",
    spotlightKeys: [],
    spotlightShape: 'circle',
    spotlightPadding: 0,
    tooltipPosition: 'center',
    icon: 'paw-outline',
    iconColor: '#4CAF50',
  },
  {
    id: 'focus-button',
    title: 'Start a Focus Session',
    description: 'Tap here to begin studying. Pick your method and get in the zone.',
    spotlightKeys: ['focus-button'],
    spotlightShape: 'circle',
    spotlightPadding: 16,
    tooltipPosition: 'above',
    icon: 'timer-outline',
    iconColor: '#4CAF50',
  },
  {
    id: 'nora-button',
    title: 'Chat with Nora',
    description: "That's me! Ask questions, get study tips, or just say hi.",
    spotlightKeys: ['nora-button'],
    spotlightShape: 'circle',
    spotlightPadding: 12,
    tooltipPosition: 'above',
    icon: 'chatbubble-ellipses-outline',
    iconColor: '#2196F3',
  },
  {
    id: 'bottom-nav',
    title: 'Settings & Leaderboard',
    description: 'Gear for settings, trophy for leaderboard. Customize your trail and compete with friends.',
    spotlightKeys: ['settings-button', 'leaderboard-button'],
    spotlightShape: 'roundedRect',
    spotlightPadding: 12,
    tooltipPosition: 'above',
    icon: 'compass-outline',
    iconColor: '#FF9800',
  },
  {
    id: 'done',
    title: "You're Ready!",
    description: 'Start with a focus session and explore at your own pace. Happy hiking!',
    spotlightKeys: [],
    spotlightShape: 'circle',
    spotlightPadding: 0,
    tooltipPosition: 'center',
    icon: 'rocket-outline',
    iconColor: '#9C27B0',
  },
];

// ── FocusPreparationScreen ──

export const FOCUS_PREP_STEPS: WalkthroughStep[] = [
  {
    id: 'intro',
    title: 'Set Up Your Session',
    description: "Let's get you ready to focus! I'll walk you through the setup.",
    spotlightKeys: [],
    spotlightShape: 'circle',
    spotlightPadding: 0,
    tooltipPosition: 'center',
    icon: 'compass-outline',
    iconColor: '#4CAF50',
  },
  {
    id: 'mode-selector',
    title: 'Choose Your Mode',
    description: 'Basecamp is steady pacing with breaks. Summit is a focused sprint — pick what fits your energy.',
    spotlightKeys: ['mode-selector'],
    spotlightShape: 'roundedRect',
    spotlightPadding: 12,
    tooltipPosition: 'below',
    icon: 'trail-sign-outline',
    iconColor: '#FF9800',
  },
  {
    id: 'task-list',
    title: 'Pick Your Tasks',
    description: 'Select what you\'re working on, or tap + to add something new.',
    spotlightKeys: ['task-list'],
    spotlightShape: 'roundedRect',
    spotlightPadding: 10,
    tooltipPosition: 'below',
    icon: 'list-outline',
    iconColor: '#2196F3',
  },
  {
    id: 'timer-options',
    title: 'Set Your Timer',
    description: 'Choose how long to focus. Start small — you can always go longer!',
    spotlightKeys: ['timer-options'],
    spotlightShape: 'roundedRect',
    spotlightPadding: 10,
    tooltipPosition: 'above',
    icon: 'time-outline',
    iconColor: '#9C27B0',
  },
];

// ── StudySessionScreen ──

export const STUDY_SESSION_STEPS: WalkthroughStep[] = [
  {
    id: 'timer',
    title: 'Your Focus Timer',
    description: "This counts down your session. Stay focused — you've got this!",
    spotlightKeys: ['timer-display'],
    spotlightShape: 'roundedRect',
    spotlightPadding: 14,
    tooltipPosition: 'below',
    icon: 'timer-outline',
    iconColor: '#4CAF50',
  },
  {
    id: 'music',
    title: 'Study Sounds',
    description: 'Tap the music note to pick your study playlist. Find your flow!',
    spotlightKeys: ['music-button'],
    spotlightShape: 'circle',
    spotlightPadding: 10,
    tooltipPosition: 'below',
    icon: 'musical-notes-outline',
    iconColor: '#2196F3',
  },
  {
    id: 'end-session',
    title: 'End Your Session',
    description: 'Long-press the X button when you\'re done. Your progress will be saved!',
    spotlightKeys: ['end-button'],
    spotlightShape: 'circle',
    spotlightPadding: 10,
    tooltipPosition: 'below',
    icon: 'stop-circle-outline',
    iconColor: '#FF9800',
  },
];

// ── ProfileScreen ──

export const PROFILE_STEPS: WalkthroughStep[] = [
  {
    id: 'intro',
    title: 'Your Profile',
    description: "This is your home base! Let's see what's here.",
    spotlightKeys: [],
    spotlightShape: 'circle',
    spotlightPadding: 0,
    tooltipPosition: 'center',
    icon: 'person-outline',
    iconColor: '#4CAF50',
  },
  {
    id: 'trail-buddy',
    title: 'Your Trail Buddy',
    description: 'Your trail companion walks with you on every session. Tap to switch buddies or visit the Gear Shop!',
    spotlightKeys: ['buddy-section'],
    spotlightShape: 'roundedRect',
    spotlightPadding: 10,
    tooltipPosition: 'below',
    icon: 'paw-outline',
    iconColor: '#9C27B0',
  },
  {
    id: 'stats-and-flint',
    title: 'Stats & Flint',
    description: 'Track your streaks, focus hours, and Flint currency. Earn 1 Flint per focus minute and spend it in the Gear Shop!',
    spotlightKeys: ['stats-section'],
    spotlightShape: 'roundedRect',
    spotlightPadding: 10,
    tooltipPosition: 'above',
    icon: 'stats-chart-outline',
    iconColor: '#2196F3',
  },
  {
    id: 'elite-upsell',
    title: 'Go Elite?',
    description: "You're exploring all the free features. Elite members unlock Nora AI, exclusive trails, brain mapping, and more. Check it out in Settings anytime!",
    spotlightKeys: [],
    spotlightShape: 'circle',
    spotlightPadding: 0,
    tooltipPosition: 'center',
    icon: 'diamond-outline',
    iconColor: '#7B61FF',
  },
];

// ── BonusesScreen ──

export const BONUSES_STEPS: WalkthroughStep[] = [
  {
    id: 'feature-grid',
    title: 'Explore These Features',
    description: 'Dive into e-books, take a self-discovery quiz, or map your brain — all here to help you grow.',
    spotlightKeys: ['feature-grid'],
    spotlightShape: 'roundedRect',
    spotlightPadding: 10,
    tooltipPosition: 'above',
    icon: 'grid-outline',
    iconColor: '#2196F3',
  },
  {
    id: 'badge-award',
    title: 'You Earned a Badge!',
    description: "Congrats — you just unlocked the Explorer badge for completing your walkthrough! Check your achievements to see it.",
    spotlightKeys: [],
    spotlightShape: 'circle',
    spotlightPadding: 0,
    tooltipPosition: 'center',
    icon: 'trophy-outline',
    iconColor: '#FFD700',
  },
];

// ── CommunityScreen ──

export const COMMUNITY_STEPS: WalkthroughStep[] = [
  {
    id: 'intro',
    title: 'Your Community',
    description: "Connect with other hikers! Here's what you can do.",
    spotlightKeys: [],
    spotlightShape: 'circle',
    spotlightPadding: 0,
    tooltipPosition: 'center',
    icon: 'people-outline',
    iconColor: '#4CAF50',
  },
  {
    id: 'tabs',
    title: 'Three Tabs',
    description: 'Friends to connect, Messages to chat, and Study Rooms to focus together.',
    spotlightKeys: ['tab-bar'],
    spotlightShape: 'roundedRect',
    spotlightPadding: 8,
    tooltipPosition: 'below',
    icon: 'layers-outline',
    iconColor: '#2196F3',
  },
  {
    id: 'study-rooms',
    title: 'Study Rooms',
    description: 'Join a room to study with others in real-time. Create your own or jump into an active one!',
    spotlightKeys: ['study-rooms'],
    spotlightShape: 'roundedRect',
    spotlightPadding: 10,
    tooltipPosition: 'above',
    icon: 'school-outline',
    iconColor: '#FF9800',
  },
];

// ── All screen IDs for Settings replay ──

export const WALKTHROUGH_SCREENS = [
  { id: 'home', label: 'Home', navigateTo: 'Home' },
  { id: 'focus_prep', label: 'Focus Setup', navigateTo: 'FocusPreparation' },
  { id: 'study_session', label: 'Study Session', navigateTo: 'StudySessionScreen' },
  { id: 'profile', label: 'Profile', navigateTo: 'Profile' },
  { id: 'bonuses', label: 'Bonuses', navigateTo: 'Bonuses' },
  { id: 'community', label: 'Community', navigateTo: 'Community' },
] as const;

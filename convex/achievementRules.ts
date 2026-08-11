/**
 * Achievement rules, evaluated SERVER-SIDE from data the user actually produced.
 *
 * Previously nothing anywhere called `achievements.award`, so all 23 badges were
 * permanently unreachable while the session report cheerfully told people they
 * had "unlocked" them. Every rule below is checked against real stored metrics.
 *
 * The `type` strings must match ACHIEVEMENT_TYPE_MAP in
 * src/screens/bonuses/AchievementsScreen.tsx, or a badge is awarded but never
 * displayed.
 */

export interface AchievementMetrics {
  /** Lifetime focused minutes (paused time already excluded). */
  totalFocusMinutes: number;
  /** Completed sessions that earned credit. */
  sessionsCompleted: number;
  /** Current consecutive-day streak. */
  currentStreak: number;
  /** Distinct subjects the user has studied. */
  distinctSubjects: number;
  /** Study rooms the user has joined (ever). */
  roomsJoined: number;
  /** Breaks completed. */
  breaksTaken: number;
}

export interface AchievementRule {
  type: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  category: string;
  isEarned: (m: AchievementMetrics) => boolean;
}

const hours = (h: number) => h * 60;

export const ACHIEVEMENT_RULES: AchievementRule[] = [
  // --- Streaks (consecutive days with a session) ---
  {
    type: "streak_3",
    title: "Getting Warm",
    description: "Study 3 days in a row",
    icon: "flame",
    points: 30,
    category: "streaks",
    isEarned: (m) => m.currentStreak >= 3,
  },
  {
    type: "streak_7",
    title: "Week Warrior",
    description: "Study 7 days in a row",
    icon: "flame",
    points: 70,
    category: "streaks",
    isEarned: (m) => m.currentStreak >= 7,
  },
  {
    type: "streak_30",
    title: "Unbroken",
    description: "Study 30 days in a row",
    icon: "flame",
    points: 300,
    category: "streaks",
    isEarned: (m) => m.currentStreak >= 30,
  },
  {
    type: "streak_100",
    title: "Centurion",
    description: "Study 100 days in a row",
    icon: "flame",
    points: 1000,
    category: "streaks",
    isEarned: (m) => m.currentStreak >= 100,
  },
  {
    type: "streak_365",
    title: "Year of Focus",
    description: "Study 365 days in a row",
    icon: "flame",
    points: 3650,
    category: "streaks",
    isEarned: (m) => m.currentStreak >= 365,
  },

  // --- Focus time (lifetime hours) ---
  {
    type: "focus_10",
    title: "10 Hours Deep",
    description: "Focus for 10 hours in total",
    icon: "timer",
    points: 50,
    category: "focus",
    isEarned: (m) => m.totalFocusMinutes >= hours(10),
  },
  {
    type: "focus_50",
    title: "50 Hours Deep",
    description: "Focus for 50 hours in total",
    icon: "timer",
    points: 150,
    category: "focus",
    isEarned: (m) => m.totalFocusMinutes >= hours(50),
  },
  {
    type: "focus_100",
    title: "100 Hours Deep",
    description: "Focus for 100 hours in total",
    icon: "timer",
    points: 300,
    category: "focus",
    isEarned: (m) => m.totalFocusMinutes >= hours(100),
  },
  {
    type: "focus_250",
    title: "250 Hours Deep",
    description: "Focus for 250 hours in total",
    icon: "timer",
    points: 750,
    category: "focus",
    isEarned: (m) => m.totalFocusMinutes >= hours(250),
  },
  {
    type: "focus_1000",
    title: "1000 Hours Deep",
    description: "Focus for 1000 hours in total",
    icon: "timer",
    points: 3000,
    category: "focus",
    isEarned: (m) => m.totalFocusMinutes >= hours(1000),
  },

  // --- Sessions completed ---
  {
    type: "session_10",
    title: "Ten Trails",
    description: "Complete 10 focus sessions",
    icon: "checkmark-done",
    points: 40,
    category: "sessions",
    isEarned: (m) => m.sessionsCompleted >= 10,
  },
  {
    type: "session_50",
    title: "Fifty Trails",
    description: "Complete 50 focus sessions",
    icon: "checkmark-done",
    points: 150,
    category: "sessions",
    isEarned: (m) => m.sessionsCompleted >= 50,
  },
  {
    type: "session_200",
    title: "Two Hundred Trails",
    description: "Complete 200 focus sessions",
    icon: "checkmark-done",
    points: 600,
    category: "sessions",
    isEarned: (m) => m.sessionsCompleted >= 200,
  },
  {
    type: "session_500",
    title: "Five Hundred Trails",
    description: "Complete 500 focus sessions",
    icon: "checkmark-done",
    points: 1500,
    category: "sessions",
    isEarned: (m) => m.sessionsCompleted >= 500,
  },

  // --- Subject breadth ---
  {
    type: "subject_3",
    title: "Well Rounded",
    description: "Study 3 different subjects",
    icon: "layers",
    points: 30,
    category: "subjects",
    isEarned: (m) => m.distinctSubjects >= 3,
  },
  {
    type: "subject_7",
    title: "Polymath",
    description: "Study 7 different subjects",
    icon: "layers",
    points: 90,
    category: "subjects",
    isEarned: (m) => m.distinctSubjects >= 7,
  },
  {
    type: "subject_15",
    title: "Renaissance Mind",
    description: "Study 15 different subjects",
    icon: "layers",
    points: 250,
    category: "subjects",
    isEarned: (m) => m.distinctSubjects >= 15,
  },

  // --- Study rooms ---
  {
    type: "room_1",
    title: "Better Together",
    description: "Join your first study room",
    icon: "people",
    points: 20,
    category: "rooms",
    isEarned: (m) => m.roomsJoined >= 1,
  },
  {
    type: "room_10",
    title: "Regular",
    description: "Join 10 study rooms",
    icon: "people",
    points: 100,
    category: "rooms",
    isEarned: (m) => m.roomsJoined >= 10,
  },
  {
    type: "room_25",
    title: "Pillar of the Community",
    description: "Join 25 study rooms",
    icon: "people",
    points: 250,
    category: "rooms",
    isEarned: (m) => m.roomsJoined >= 25,
  },

  // --- Breaks (rest is part of the method) ---
  {
    type: "break_10",
    title: "Rest Is Training",
    description: "Take 10 breaks",
    icon: "cafe",
    points: 20,
    category: "breaks",
    isEarned: (m) => m.breaksTaken >= 10,
  },
  {
    type: "break_50",
    title: "Sustainable Pace",
    description: "Take 50 breaks",
    icon: "cafe",
    points: 80,
    category: "breaks",
    isEarned: (m) => m.breaksTaken >= 50,
  },
  {
    type: "break_150",
    title: "Marathon Mindset",
    description: "Take 150 breaks",
    icon: "cafe",
    points: 200,
    category: "breaks",
    isEarned: (m) => m.breaksTaken >= 150,
  },
];

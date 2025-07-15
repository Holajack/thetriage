export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  tier: number; // 1-7
  category: AchievementCategory;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tiers: AchievementTier[];
  currentTier: number;
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
  dateEarned?: Date;
}

export interface AchievementTier {
  tier: number;
  name: string;
  description: string;
  threshold: number;
  badge: Badge;
  reward?: string;
}

export type AchievementCategory = 
  | 'study_time'
  | 'streak'
  | 'quiz_completion'
  | 'focus_sessions'
  | 'community'
  | 'personal_growth'
  | 'consistency';

export interface UserAchievements {
  achievements: Achievement[];
  badges: Badge[];
  totalPoints: number;
  level: number;
  lastUpdated: Date;
}

// Achievement definitions with 7-tier system
export const ACHIEVEMENTS: Achievement[] = [
  // Study Time Achievements
  {
    id: 'total_study_time',
    name: 'Study Master',
    description: 'Total hours of focused study time',
    category: 'study_time',
    currentTier: 0,
    progress: 0,
    maxProgress: 500,
    isCompleted: false,
    tiers: [
      {
        tier: 1,
        name: 'Study Starter',
        description: 'Complete 1 hour of study time',
        threshold: 1,
        badge: {
          id: 'study_starter',
          name: 'Study Starter',
          description: 'First hour of study time completed!',
          icon: 'book-open-outline',
          color: '#81C784',
          tier: 1,
          category: 'study_time'
        }
      },
      {
        tier: 2,
        name: 'Focused Learner',
        description: 'Complete 5 hours of study time',
        threshold: 5,
        badge: {
          id: 'focused_learner',
          name: 'Focused Learner',
          description: 'Dedicated 5 hours to learning!',
          icon: 'book-open',
          color: '#66BB6A',
          tier: 2,
          category: 'study_time'
        }
      },
      {
        tier: 3,
        name: 'Study Enthusiast',
        description: 'Complete 25 hours of study time',
        threshold: 25,
        badge: {
          id: 'study_enthusiast',
          name: 'Study Enthusiast',
          description: 'Passionate about learning - 25 hours!',
          icon: 'book-multiple',
          color: '#4CAF50',
          tier: 3,
          category: 'study_time'
        }
      },
      {
        tier: 4,
        name: 'Knowledge Seeker',
        description: 'Complete 75 hours of study time',
        threshold: 75,
        badge: {
          id: 'knowledge_seeker',
          name: 'Knowledge Seeker',
          description: 'Actively pursuing knowledge - 75 hours!',
          icon: 'book-search',
          color: '#388E3C',
          tier: 4,
          category: 'study_time'
        }
      },
      {
        tier: 5,
        name: 'Academic Warrior',
        description: 'Complete 150 hours of study time',
        threshold: 150,
        badge: {
          id: 'academic_warrior',
          name: 'Academic Warrior',
          description: 'Fighting for knowledge - 150 hours!',
          icon: 'sword-cross',
          color: '#2E7D32',
          tier: 5,
          category: 'study_time'
        }
      },
      {
        tier: 6,
        name: 'Study Legend',
        description: 'Complete 300 hours of study time',
        threshold: 300,
        badge: {
          id: 'study_legend',
          name: 'Study Legend',
          description: 'Legendary dedication - 300 hours!',
          icon: 'crown',
          color: '#1B5E20',
          tier: 6,
          category: 'study_time'
        }
      },
      {
        tier: 7,
        name: 'Grandmaster Scholar',
        description: 'Complete 500 hours of study time',
        threshold: 500,
        badge: {
          id: 'grandmaster_scholar',
          name: 'Grandmaster Scholar',
          description: 'Ultimate academic achievement - 500 hours!',
          icon: 'trophy',
          color: '#FFD700',
          tier: 7,
          category: 'study_time'
        }
      }
    ]
  },

  // Study Streak Achievements
  {
    id: 'study_streak',
    name: 'Consistency Champion',
    description: 'Consecutive days of studying',
    category: 'streak',
    currentTier: 0,
    progress: 0,
    maxProgress: 100,
    isCompleted: false,
    tiers: [
      {
        tier: 1,
        name: 'Day One',
        description: 'Start your study streak',
        threshold: 1,
        badge: {
          id: 'day_one',
          name: 'Day One',
          description: 'Every journey begins with a single step!',
          icon: 'calendar-check',
          color: '#FFB74D',
          tier: 1,
          category: 'streak'
        }
      },
      {
        tier: 2,
        name: 'Three Days Strong',
        description: 'Study for 3 consecutive days',
        threshold: 3,
        badge: {
          id: 'three_days_strong',
          name: 'Three Days Strong',
          description: 'Building the habit - 3 days in a row!',
          icon: 'calendar-multiple-check',
          color: '#FF9800',
          tier: 2,
          category: 'streak'
        }
      },
      {
        tier: 3,
        name: 'Weekly Warrior',
        description: 'Study for 7 consecutive days',
        threshold: 7,
        badge: {
          id: 'weekly_warrior',
          name: 'Weekly Warrior',
          description: 'A full week of dedication!',
          icon: 'calendar-week',
          color: '#F57C00',
          tier: 3,
          category: 'streak'
        }
      },
      {
        tier: 4,
        name: 'Fortnight Fighter',
        description: 'Study for 14 consecutive days',
        threshold: 14,
        badge: {
          id: 'fortnight_fighter',
          name: 'Fortnight Fighter',
          description: 'Two weeks of consistent effort!',
          icon: 'calendar-range',
          color: '#EF6C00',
          tier: 4,
          category: 'streak'
        }
      },
      {
        tier: 5,
        name: 'Monthly Master',
        description: 'Study for 30 consecutive days',
        threshold: 30,
        badge: {
          id: 'monthly_master',
          name: 'Monthly Master',
          description: 'A full month of dedication!',
          icon: 'calendar-month',
          color: '#E65100',
          tier: 5,
          category: 'streak'
        }
      },
      {
        tier: 6,
        name: 'Streak Superior',
        description: 'Study for 60 consecutive days',
        threshold: 60,
        badge: {
          id: 'streak_superior',
          name: 'Streak Superior',
          description: 'Two months of unwavering commitment!',
          icon: 'fire',
          color: '#D84315',
          tier: 6,
          category: 'streak'
        }
      },
      {
        tier: 7,
        name: 'Unstoppable Force',
        description: 'Study for 100 consecutive days',
        threshold: 100,
        badge: {
          id: 'unstoppable_force',
          name: 'Unstoppable Force',
          description: '100 days of pure determination!',
          icon: 'lightning-bolt',
          color: '#BF360C',
          tier: 7,
          category: 'streak'
        }
      }
    ]
  },

  // Focus Session Achievements
  {
    id: 'focus_sessions',
    name: 'Focus Master',
    description: 'Total number of completed focus sessions',
    category: 'focus_sessions',
    currentTier: 0,
    progress: 0,
    maxProgress: 1000,
    isCompleted: false,
    tiers: [
      {
        tier: 1,
        name: 'First Focus',
        description: 'Complete your first focus session',
        threshold: 1,
        badge: {
          id: 'first_focus',
          name: 'First Focus',
          description: 'Completed your very first focus session!',
          icon: 'target',
          color: '#7986CB',
          tier: 1,
          category: 'focus_sessions'
        }
      },
      {
        tier: 2,
        name: 'Getting Focused',
        description: 'Complete 10 focus sessions',
        threshold: 10,
        badge: {
          id: 'getting_focused',
          name: 'Getting Focused',
          description: '10 sessions of concentrated effort!',
          icon: 'bullseye',
          color: '#5C6BC0',
          tier: 2,
          category: 'focus_sessions'
        }
      },
      {
        tier: 3,
        name: 'Concentration Champion',
        description: 'Complete 50 focus sessions',
        threshold: 50,
        badge: {
          id: 'concentration_champion',
          name: 'Concentration Champion',
          description: 'Master of focus - 50 sessions!',
          icon: 'crosshairs-gps',
          color: '#3F51B5',
          tier: 3,
          category: 'focus_sessions'
        }
      },
      {
        tier: 4,
        name: 'Focus Virtuoso',
        description: 'Complete 150 focus sessions',
        threshold: 150,
        badge: {
          id: 'focus_virtuoso',
          name: 'Focus Virtuoso',
          description: 'Virtuoso level concentration!',
          icon: 'meditation',
          color: '#3949AB',
          tier: 4,
          category: 'focus_sessions'
        }
      },
      {
        tier: 5,
        name: 'Attention Architect',
        description: 'Complete 350 focus sessions',
        threshold: 350,
        badge: {
          id: 'attention_architect',
          name: 'Attention Architect',
          description: 'Building attention like an architect!',
          icon: 'brain',
          color: '#303F9F',
          tier: 5,
          category: 'focus_sessions'
        }
      },
      {
        tier: 6,
        name: 'Mindfulness Master',
        description: 'Complete 650 focus sessions',
        threshold: 650,
        badge: {
          id: 'mindfulness_master',
          name: 'Mindfulness Master',
          description: 'Mastered the art of mindful focus!',
          icon: 'leaf',
          color: '#283593',
          tier: 6,
          category: 'focus_sessions'
        }
      },
      {
        tier: 7,
        name: 'Zen Grandmaster',
        description: 'Complete 1000 focus sessions',
        threshold: 1000,
        badge: {
          id: 'zen_grandmaster',
          name: 'Zen Grandmaster',
          description: 'Achieved zen-like focus mastery!',
          icon: 'yin-yang',
          color: '#1A237E',
          tier: 7,
          category: 'focus_sessions'
        }
      }
    ]
  },

  // Quiz Completion Achievements
  {
    id: 'quiz_completion',
    name: 'Self-Discovery Expert',
    description: 'Number of self-discovery quizzes completed',
    category: 'quiz_completion',
    currentTier: 0,
    progress: 0,
    maxProgress: 50,
    isCompleted: false,
    tiers: [
      {
        tier: 1,
        name: 'Self-Aware',
        description: 'Complete your first quiz',
        threshold: 1,
        badge: {
          id: 'self_aware',
          name: 'Self-Aware',
          description: 'Started your journey of self-discovery!',
          icon: 'mirror',
          color: '#AB47BC',
          tier: 1,
          category: 'quiz_completion'
        }
      },
      {
        tier: 2,
        name: 'Insight Seeker',
        description: 'Complete 3 quizzes',
        threshold: 3,
        badge: {
          id: 'insight_seeker',
          name: 'Insight Seeker',
          description: 'Seeking deeper understanding!',
          icon: 'eye',
          color: '#9C27B0',
          tier: 2,
          category: 'quiz_completion'
        }
      },
      {
        tier: 3,
        name: 'Pattern Recognizer',
        description: 'Complete 7 quizzes',
        threshold: 7,
        badge: {
          id: 'pattern_recognizer',
          name: 'Pattern Recognizer',
          description: 'Recognizing patterns in learning!',
          icon: 'puzzle',
          color: '#8E24AA',
          tier: 3,
          category: 'quiz_completion'
        }
      },
      {
        tier: 4,
        name: 'Self-Knowledge Scholar',
        description: 'Complete 15 quizzes',
        threshold: 15,
        badge: {
          id: 'self_knowledge_scholar',
          name: 'Self-Knowledge Scholar',
          description: 'Scholar of self-understanding!',
          icon: 'head-lightbulb',
          color: '#7B1FA2',
          tier: 4,
          category: 'quiz_completion'
        }
      },
      {
        tier: 5,
        name: 'Introspection Master',
        description: 'Complete 25 quizzes',
        threshold: 25,
        badge: {
          id: 'introspection_master',
          name: 'Introspection Master',
          description: 'Master of looking within!',
          icon: 'head-cog',
          color: '#6A1B9A',
          tier: 5,
          category: 'quiz_completion'
        }
      },
      {
        tier: 6,
        name: 'Wisdom Weaver',
        description: 'Complete 35 quizzes',
        threshold: 35,
        badge: {
          id: 'wisdom_weaver',
          name: 'Wisdom Weaver',
          description: 'Weaving wisdom from self-knowledge!',
          icon: 'head-heart',
          color: '#4A148C',
          tier: 6,
          category: 'quiz_completion'
        }
      },
      {
        tier: 7,
        name: 'Oracle of Self',
        description: 'Complete 50 quizzes',
        threshold: 50,
        badge: {
          id: 'oracle_of_self',
          name: 'Oracle of Self',
          description: 'Ultimate mastery of self-knowledge!',
          icon: 'crystal-ball',
          color: '#311B92',
          tier: 7,
          category: 'quiz_completion'
        }
      }
    ]
  },

  // Community Achievements
  {
    id: 'community_engagement',
    name: 'Community Builder',
    description: 'Active participation in the study community',
    category: 'community',
    currentTier: 0,
    progress: 0,
    maxProgress: 200,
    isCompleted: false,
    tiers: [
      {
        tier: 1,
        name: 'Community Newcomer',
        description: 'Join the study community',
        threshold: 1,
        badge: {
          id: 'community_newcomer',
          name: 'Community Newcomer',
          description: 'Welcome to the study community!',
          icon: 'account-group',
          color: '#26A69A',
          tier: 1,
          category: 'community'
        }
      },
      {
        tier: 2,
        name: 'Helpful Member',
        description: 'Make 5 community contributions',
        threshold: 5,
        badge: {
          id: 'helpful_member',
          name: 'Helpful Member',
          description: 'Making valuable contributions!',
          icon: 'hand-heart',
          color: '#00897B',
          tier: 2,
          category: 'community'
        }
      },
      {
        tier: 3,
        name: 'Study Supporter',
        description: 'Make 15 community contributions',
        threshold: 15,
        badge: {
          id: 'study_supporter',
          name: 'Study Supporter',
          description: 'Supporting fellow learners!',
          icon: 'account-heart',
          color: '#00796B',
          tier: 3,
          category: 'community'
        }
      },
      {
        tier: 4,
        name: 'Collaboration Catalyst',
        description: 'Make 35 community contributions',
        threshold: 35,
        badge: {
          id: 'collaboration_catalyst',
          name: 'Collaboration Catalyst',
          description: 'Catalyzing community collaboration!',
          icon: 'account-multiple-plus',
          color: '#00695C',
          tier: 4,
          category: 'community'
        }
      },
      {
        tier: 5,
        name: 'Mentor Material',
        description: 'Make 75 community contributions',
        threshold: 75,
        badge: {
          id: 'mentor_material',
          name: 'Mentor Material',
          description: 'Ready to mentor others!',
          icon: 'teach',
          color: '#004D40',
          tier: 5,
          category: 'community'
        }
      },
      {
        tier: 6,
        name: 'Community Champion',
        description: 'Make 125 community contributions',
        threshold: 125,
        badge: {
          id: 'community_champion',
          name: 'Community Champion',
          description: 'Champion of the study community!',
          icon: 'trophy-variant',
          color: '#00332A',
          tier: 6,
          category: 'community'
        }
      },
      {
        tier: 7,
        name: 'Study Sensei',
        description: 'Make 200 community contributions',
        threshold: 200,
        badge: {
          id: 'study_sensei',
          name: 'Study Sensei',
          description: 'Master teacher of the community!',
          icon: 'karate',
          color: '#1B5E20',
          tier: 7,
          category: 'community'
        }
      }
    ]
  },

  // Personal Growth Achievements
  {
    id: 'personal_growth',
    name: 'Growth Mindset',
    description: 'Personal development and improvement',
    category: 'personal_growth',
    currentTier: 0,
    progress: 0,
    maxProgress: 100,
    isCompleted: false,
    tiers: [
      {
        tier: 1,
        name: 'Growth Beginner',
        description: 'Start your growth journey',
        threshold: 1,
        badge: {
          id: 'growth_beginner',
          name: 'Growth Beginner',
          description: 'Beginning your growth journey!',
          icon: 'sprout',
          color: '#8BC34A',
          tier: 1,
          category: 'personal_growth'
        }
      },
      {
        tier: 2,
        name: 'Self-Improver',
        description: 'Show consistent improvement',
        threshold: 5,
        badge: {
          id: 'self_improver',
          name: 'Self-Improver',
          description: 'Dedicated to self-improvement!',
          icon: 'trending-up',
          color: '#689F38',
          tier: 2,
          category: 'personal_growth'
        }
      },
      {
        tier: 3,
        name: 'Progress Pioneer',
        description: 'Make significant progress',
        threshold: 15,
        badge: {
          id: 'progress_pioneer',
          name: 'Progress Pioneer',
          description: 'Pioneering your own progress!',
          icon: 'rocket-launch',
          color: '#558B2F',
          tier: 3,
          category: 'personal_growth'
        }
      },
      {
        tier: 4,
        name: 'Development Dynamo',
        description: 'Continuous development',
        threshold: 30,
        badge: {
          id: 'development_dynamo',
          name: 'Development Dynamo',
          description: 'Dynamo of personal development!',
          icon: 'chart-line',
          color: '#33691E',
          tier: 4,
          category: 'personal_growth'
        }
      },
      {
        tier: 5,
        name: 'Transformation Titan',
        description: 'Major personal transformation',
        threshold: 50,
        badge: {
          id: 'transformation_titan',
          name: 'Transformation Titan',
          description: 'Achieved major transformation!',
          icon: 'butterfly',
          color: '#1B5E20',
          tier: 5,
          category: 'personal_growth'
        }
      },
      {
        tier: 6,
        name: 'Evolution Expert',
        description: 'Expert in personal evolution',
        threshold: 75,
        badge: {
          id: 'evolution_expert',
          name: 'Evolution Expert',
          description: 'Expert in personal evolution!',
          icon: 'dna',
          color: '#0D4F0D',
          tier: 6,
          category: 'personal_growth'
        }
      },
      {
        tier: 7,
        name: 'Enlightened One',
        description: 'Reached enlightenment',
        threshold: 100,
        badge: {
          id: 'enlightened_one',
          name: 'Enlightened One',
          description: 'Achieved personal enlightenment!',
          icon: 'eye-circle',
          color: '#FF6F00',
          tier: 7,
          category: 'personal_growth'
        }
      }
    ]
  },

  // Consistency Achievements
  {
    id: 'weekly_goals',
    name: 'Goal Achiever',
    description: 'Weekly study goal completions',
    category: 'consistency',
    currentTier: 0,
    progress: 0,
    maxProgress: 52,
    isCompleted: false,
    tiers: [
      {
        tier: 1,
        name: 'Goal Setter',
        description: 'Complete your first weekly goal',
        threshold: 1,
        badge: {
          id: 'goal_setter',
          name: 'Goal Setter',
          description: 'Set and achieved your first goal!',
          icon: 'flag',
          color: '#FF5722',
          tier: 1,
          category: 'consistency'
        }
      },
      {
        tier: 2,
        name: 'Commitment Keeper',
        description: 'Complete 4 weekly goals',
        threshold: 4,
        badge: {
          id: 'commitment_keeper',
          name: 'Commitment Keeper',
          description: 'Keeping your commitments!',
          icon: 'handshake',
          color: '#E64A19',
          tier: 2,
          category: 'consistency'
        }
      },
      {
        tier: 3,
        name: 'Milestone Maker',
        description: 'Complete 12 weekly goals',
        threshold: 12,
        badge: {
          id: 'milestone_maker',
          name: 'Milestone Maker',
          description: 'Making important milestones!',
          icon: 'milestone',
          color: '#D84315',
          tier: 3,
          category: 'consistency'
        }
      },
      {
        tier: 4,
        name: 'Resolution Ruler',
        description: 'Complete 24 weekly goals',
        threshold: 24,
        badge: {
          id: 'resolution_ruler',
          name: 'Resolution Ruler',
          description: 'Ruler of resolutions!',
          icon: 'crown-outline',
          color: '#BF360C',
          tier: 4,
          category: 'consistency'
        }
      },
      {
        tier: 5,
        name: 'Dedication Deity',
        description: 'Complete 36 weekly goals',
        threshold: 36,
        badge: {
          id: 'dedication_deity',
          name: 'Dedication Deity',
          description: 'Divine level of dedication!',
          icon: 'star-circle',
          color: '#8C2F00',
          tier: 5,
          category: 'consistency'
        }
      },
      {
        tier: 6,
        name: 'Persistence Paragon',
        description: 'Complete 44 weekly goals',
        threshold: 44,
        badge: {
          id: 'persistence_paragon',
          name: 'Persistence Paragon',
          description: 'Paragon of persistence!',
          icon: 'shield-star',
          color: '#5D1A00',
          tier: 6,
          category: 'consistency'
        }
      },
      {
        tier: 7,
        name: 'Unwavering Legend',
        description: 'Complete 52 weekly goals',
        threshold: 52,
        badge: {
          id: 'unwavering_legend',
          name: 'Unwavering Legend',
          description: 'Legendary unwavering commitment!',
          icon: 'diamond-stone',
          color: '#FF8F00',
          tier: 7,
          category: 'consistency'
        }
      }
    ]
  }
];

// Helper functions
export const getAchievementProgress = (achievement: Achievement, userStats: any): number => {
  switch (achievement.id) {
    case 'total_study_time':
      return Math.floor(userStats.totalStudyHours || 0);
    case 'study_streak':
      return userStats.currentStreak || 0;
    case 'focus_sessions':
      return userStats.totalSessions || 0;
    case 'quiz_completion':
      return userStats.quizzesCompleted || 0;
    case 'community_engagement':
      return userStats.communityContributions || 0;
    case 'personal_growth':
      return userStats.growthScore || 0;
    case 'weekly_goals':
      return userStats.weeklyGoalsCompleted || 0;
    default:
      return 0;
  }
};

export const checkForNewAchievements = (
  currentAchievements: Achievement[],
  userStats: any
): { newBadges: Badge[], updatedAchievements: Achievement[] } => {
  const newBadges: Badge[] = [];
  const updatedAchievements: Achievement[] = [];

  currentAchievements.forEach(achievement => {
    const progress = getAchievementProgress(achievement, userStats);
    const updatedAchievement = { ...achievement, progress };

    // Check if user has progressed to a new tier
    for (let i = achievement.currentTier; i < achievement.tiers.length; i++) {
      const tier = achievement.tiers[i];
      if (progress >= tier.threshold) {
        updatedAchievement.currentTier = tier.tier;
        updatedAchievement.dateEarned = new Date();
        if (tier.tier > achievement.currentTier) {
          newBadges.push(tier.badge);
        }
      } else {
        break;
      }
    }

    // Update max progress based on highest tier
    const highestTier = achievement.tiers[achievement.tiers.length - 1];
    updatedAchievement.maxProgress = highestTier.threshold;
    updatedAchievement.isCompleted = progress >= highestTier.threshold;

    updatedAchievements.push(updatedAchievement);
  });

  return { newBadges, updatedAchievements };
};
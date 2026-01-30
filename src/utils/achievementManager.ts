import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Achievement, Badge, UserAchievements, ACHIEVEMENTS, checkForNewAchievements } from '../data/achievements';

const USER_ACHIEVEMENTS_KEY = 'user_achievements';
const USER_BADGES_KEY = 'user_badges';

// Configure notifications for achievements
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface UserStats {
  totalStudyHours: number;
  currentStreak: number;
  totalSessions: number;
  quizzesCompleted: number;
  communityContributions: number;
  growthScore: number;
  weeklyGoalsCompleted: number;
}

// Achievement management functions
export const initializeUserAchievements = async (userId: string): Promise<UserAchievements> => {
  try {
    const existingAchievements = await getUserAchievements(userId);
    
    if (existingAchievements.achievements.length === 0) {
      // Initialize with default achievements
      const initialAchievements: Achievement[] = ACHIEVEMENTS.map(achievement => ({
        ...achievement,
        currentTier: 0,
        progress: 0,
        isCompleted: false
      }));

      const userAchievements: UserAchievements = {
        achievements: initialAchievements,
        badges: [],
        totalPoints: 0,
        level: 1,
        lastUpdated: new Date()
      };

      await saveUserAchievements(userId, userAchievements);
      return userAchievements;
    }

    return existingAchievements;
  } catch (error) {
    console.error('Error initializing user achievements:', error);
    throw error;
  }
};

export const getUserAchievements = async (userId: string): Promise<UserAchievements> => {
  try {
    const achievementsJson = await AsyncStorage.getItem(`${USER_ACHIEVEMENTS_KEY}_${userId}`);
    
    if (achievementsJson) {
      const parsed = JSON.parse(achievementsJson);
      // Convert date strings back to Date objects
      parsed.lastUpdated = new Date(parsed.lastUpdated);
      parsed.achievements = parsed.achievements.map((achievement: any) => ({
        ...achievement,
        dateEarned: achievement.dateEarned ? new Date(achievement.dateEarned) : undefined
      }));
      return parsed;
    }

    return {
      achievements: [],
      badges: [],
      totalPoints: 0,
      level: 1,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return {
      achievements: [],
      badges: [],
      totalPoints: 0,
      level: 1,
      lastUpdated: new Date()
    };
  }
};

export const saveUserAchievements = async (userId: string, userAchievements: UserAchievements): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      `${USER_ACHIEVEMENTS_KEY}_${userId}`,
      JSON.stringify(userAchievements)
    );

    // Note: Achievement data is primarily stored in AsyncStorage
    // DB-side achievement tracking is handled separately via Convex achievements.award mutation
  } catch (error) {
    console.error('Error saving user achievements:', error);
  }
};

export const updateUserProgress = async (userId: string, userStats: UserStats): Promise<Badge[]> => {
  try {
    const currentAchievements = await getUserAchievements(userId);
    const { newBadges, updatedAchievements } = checkForNewAchievements(currentAchievements.achievements, userStats);

    if (newBadges.length > 0) {
      // Calculate new total points and level
      const totalPoints = calculateTotalPoints([...currentAchievements.badges, ...newBadges]);
      const level = calculateLevel(totalPoints);

      const updatedUserAchievements: UserAchievements = {
        achievements: updatedAchievements,
        badges: [...currentAchievements.badges, ...newBadges],
        totalPoints,
        level,
        lastUpdated: new Date()
      };

      await saveUserAchievements(userId, updatedUserAchievements);

      // Send achievement notifications
      for (const badge of newBadges) {
        await sendAchievementNotification(badge);
      }
    } else {
      // Update progress without new badges
      const updatedUserAchievements: UserAchievements = {
        ...currentAchievements,
        achievements: updatedAchievements,
        lastUpdated: new Date()
      };

      await saveUserAchievements(userId, updatedUserAchievements);
    }

    return newBadges;
  } catch (error) {
    console.error('Error updating user progress:', error);
    return [];
  }
};

export const calculateTotalPoints = (badges: Badge[]): number => {
  return badges.reduce((total, badge) => {
    // Points based on tier: Tier 1 = 10 points, Tier 7 = 70 points
    return total + (badge.tier * 10);
  }, 0);
};

export const calculateLevel = (totalPoints: number): number => {
  // Level calculation: Level 1-10 based on points
  // Level 1: 0-49 points
  // Level 2: 50-149 points
  // Level 3: 150-299 points
  // etc.
  if (totalPoints < 50) return 1;
  if (totalPoints < 150) return 2;
  if (totalPoints < 300) return 3;
  if (totalPoints < 500) return 4;
  if (totalPoints < 750) return 5;
  if (totalPoints < 1050) return 6;
  if (totalPoints < 1400) return 7;
  if (totalPoints < 1800) return 8;
  if (totalPoints < 2250) return 9;
  return 10; // Maximum level
};

export const sendAchievementNotification = async (badge: Badge): Promise<void> => {
  try {
    const isFirstBadge = badge.tier === 1;
    
    const notificationContent = {
      title: isFirstBadge ? '🎉 First Achievement Unlocked!' : '🏆 New Badge Earned!',
      body: isFirstBadge 
        ? `Congratulations! You've earned your first badge: "${badge.name}". This is just the beginning of your journey!`
        : `Amazing work! You've earned the "${badge.name}" badge. ${badge.description}`,
      sound: true,
      data: {
        type: 'achievement',
        badgeId: badge.id,
        tier: badge.tier,
        category: badge.category
      }
    };

    // Schedule immediate notification
    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // Immediate
    });

    // For first achievement, send an encouraging follow-up
    if (isFirstBadge) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌟 Keep Going!',
          body: 'You\'re on your way to building great study habits. Check out your profile to see your progress!',
          sound: false,
        },
        trigger: {
          seconds: 5,
        },
      });
    }

    console.log('Achievement notification sent for:', badge.name);
  } catch (error) {
    console.error('Error sending achievement notification:', error);
  }
};

export const getAchievementsByCategory = (achievements: Achievement[], category: string): Achievement[] => {
  return achievements.filter(achievement => achievement.category === category);
};

export const getBadgesByCategory = (badges: Badge[], category: string): Badge[] => {
  return badges.filter(badge => badge.category === category);
};

export const getHighestBadgeInCategory = (badges: Badge[], category: string): Badge | null => {
  const categoryBadges = getBadgesByCategory(badges, category);
  if (categoryBadges.length === 0) return null;
  
  return categoryBadges.reduce((highest, current) => 
    current.tier > highest.tier ? current : highest
  );
};

export const getUserLevel = async (userId: string): Promise<number> => {
  try {
    const userAchievements = await getUserAchievements(userId);
    return userAchievements.level;
  } catch (error) {
    console.error('Error getting user level:', error);
    return 1;
  }
};

export const getUserBadges = async (userId: string): Promise<Badge[]> => {
  try {
    const userAchievements = await getUserAchievements(userId);
    return userAchievements.badges;
  } catch (error) {
    console.error('Error getting user badges:', error);
    return [];
  }
};

export const getTopBadgesForDisplay = async (userId: string, limit: number = 3): Promise<Badge[]> => {
  try {
    const badges = await getUserBadges(userId);
    
    // Sort badges by tier (highest first) and then by category
    const sortedBadges = badges.sort((a, b) => {
      if (a.tier !== b.tier) return b.tier - a.tier;
      return a.category.localeCompare(b.category);
    });

    return sortedBadges.slice(0, limit);
  } catch (error) {
    console.error('Error getting top badges for display:', error);
    return [];
  }
};

// Database sync functions (deprecated - achievement data stored in AsyncStorage)
// DB-side achievement tracking is handled separately via Convex achievements.award mutation
export const saveAchievementsToDatabase = async (userId: string, userAchievements: UserAchievements): Promise<void> => {
  // No-op: Achievement data is primarily stored in AsyncStorage
  // The Convex achievements.award mutation handles DB-side achievement tracking separately
  console.log('[achievementManager] saveAchievementsToDatabase is deprecated (AsyncStorage only)');
};

export const syncAchievementsWithDatabase = async (userId: string): Promise<void> => {
  // No-op: Achievement data is primarily stored in AsyncStorage
  // The Convex achievements.award mutation handles DB-side achievement tracking separately
  console.log('[achievementManager] syncAchievementsWithDatabase is deprecated (AsyncStorage only)');
};

// Utility functions for specific achievements
export const recordStudySession = async (userId: string, sessionDurationMinutes: number): Promise<Badge[]> => {
  try {
    // Get current user stats (this would normally come from your user data)
    const userAchievements = await getUserAchievements(userId);
    
    // This is a simplified version - you'd integrate with your actual user stats
    const userStats: UserStats = {
      totalStudyHours: Math.floor(sessionDurationMinutes / 60), // This should be cumulative
      currentStreak: 1, // This should be calculated based on daily activity
      totalSessions: 1, // This should be cumulative
      quizzesCompleted: 0,
      communityContributions: 0,
      growthScore: 0,
      weeklyGoalsCompleted: 0
    };

    return await updateUserProgress(userId, userStats);
  } catch (error) {
    console.error('Error recording study session:', error);
    return [];
  }
};

export const recordQuizCompletion = async (userId: string): Promise<Badge[]> => {
  try {
    const userAchievements = await getUserAchievements(userId);
    
    // Get current quiz completion count
    const currentQuizAchievement = userAchievements.achievements.find(a => a.id === 'quiz_completion');
    const newQuizCount = (currentQuizAchievement?.progress || 0) + 1;

    const userStats: UserStats = {
      totalStudyHours: 0,
      currentStreak: 0,
      totalSessions: 0,
      quizzesCompleted: newQuizCount,
      communityContributions: 0,
      growthScore: 0,
      weeklyGoalsCompleted: 0
    };

    return await updateUserProgress(userId, userStats);
  } catch (error) {
    console.error('Error recording quiz completion:', error);
    return [];
  }
};
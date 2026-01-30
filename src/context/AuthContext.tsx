import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { scheduleWeeklyGoalChecks } from '../utils/weeklyGoalNotifications';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  onboarding: any;
  leaderboard: any;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
  justLoggedIn: boolean;
  isInitialLoading: boolean;
  hasSeenLanding: boolean;
  setHasSeenLanding: (seen: boolean) => Promise<void>;
  clearJustLoggedIn: () => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateOnboarding: (data: any) => Promise<void>;
  refreshUserData: () => Promise<void>;
  isRecentLogin: () => Promise<boolean>;
  setLastLoginTime: () => Promise<void>;
  isOffline: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Stable empty args object to prevent useQuery re-subscriptions
const EMPTY_ARGS = {} as Record<string, never>;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Clerk auth state
  const { isSignedIn, isLoaded: clerkLoaded, signOut: clerkSignOut } = useClerkAuth();

  // Convex queries (reactive, auto-updating) — skip when not signed in
  const queryArgs = isSignedIn ? EMPTY_ARGS : ("skip" as const);
  const convexUser = useQuery(api.users.me, queryArgs);
  const convexOnboarding = useQuery(api.onboarding.get, queryArgs);
  const convexLeaderboard = useQuery(api.leaderboard.getMyStats, queryArgs);

  // Convex mutations
  const updateOnboardingMutation = useMutation(api.onboarding.update);
  const initializeUserMutation = useMutation(api.initUser.initializeCurrentUser);

  // Local state
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [hasSeenLanding, setHasSeenLandingState] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Derived authentication state
  const isAuthenticated = isSignedIn ?? false;

  // Map Convex user to match legacy interface (memoized to prevent cascading re-renders)
  const user = useMemo(() => convexUser ? {
    id: convexUser._id,
    email: convexUser.email,
    username: convexUser.username,
    full_name: convexUser.fullName,
    first_name: convexUser.firstName,
    last_name: convexUser.lastName,
    avatar_url: convexUser.avatarUrl,
    bio: convexUser.bio,
    university: convexUser.university,
    major: convexUser.major,
    location: convexUser.location,
    classes: convexUser.classes,
    website: convexUser.website,
    time_zone: convexUser.timeZone,
    status: convexUser.status,
    sound_preference: convexUser.soundPreference,
    weekly_focus_goal: convexUser.weeklyFocusGoal,
    focus_duration: convexUser.focusDuration,
    break_duration: convexUser.breakDuration,
    subscription_tier: convexUser.subscriptionTier,
    trail_buddy_type: convexUser.trailBuddyType,
    trail_buddy_name: convexUser.trailBuddyName,
    flint_currency: convexUser.flintCurrency,
    first_session_bonus_claimed: convexUser.firstSessionBonusClaimed,
  } : null, [convexUser]);

  // Map Convex onboarding to match legacy interface (memoized)
  const onboarding = useMemo(() => convexOnboarding ? {
    id: convexOnboarding._id,
    user_id: convexOnboarding.userId,
    is_onboarding_complete: convexOnboarding.isOnboardingComplete,
    weekly_focus_goal: convexOnboarding.weeklyFocusGoal,
    welcome_completed: convexOnboarding.welcomeCompleted,
    goals_set: convexOnboarding.goalsSet,
    first_session_completed: convexOnboarding.firstSessionCompleted,
    profile_customized: convexOnboarding.profileCustomized,
    bio: convexOnboarding.bio,
    allow_direct_messages: convexOnboarding.allowDirectMessages,
    avatar_url: convexOnboarding.avatarUrl,
    focus_method: convexOnboarding.focusMethod,
    education_level: convexOnboarding.educationLevel,
    university: convexOnboarding.university,
    major: convexOnboarding.major,
    location: convexOnboarding.location,
    timezone: convexOnboarding.timezone,
    completed_at: convexOnboarding.completedAt,
  } : null, [convexOnboarding]);

  // Map Convex leaderboard to match legacy interface (memoized)
  const leaderboard = useMemo(() => convexLeaderboard ? {
    id: convexLeaderboard._id,
    user_id: convexLeaderboard.userId,
    total_focus_time: convexLeaderboard.totalFocusTime,
    weekly_focus_time: convexLeaderboard.weeklyFocusTime,
    monthly_focus_time: convexLeaderboard.monthlyFocusTime,
    level: convexLeaderboard.level,
    points: convexLeaderboard.points,
    current_streak: convexLeaderboard.currentStreak,
    longest_streak: convexLeaderboard.longestStreak,
    sessions_completed: convexLeaderboard.sessionsCompleted,
    total_sessions: convexLeaderboard.totalSessions,
    achievements_earned: convexLeaderboard.achievementsEarned,
  } : null, [convexLeaderboard]);

  // Landing page state management (stable reference)
  const setHasSeenLanding = useCallback(async (seen: boolean) => {
    try {
      await AsyncStorage.setItem('hasSeenLanding', JSON.stringify(seen));
      setHasSeenLandingState(seen);
    } catch (error) {
      console.error('Failed to update hasSeenLanding in AsyncStorage:', error);
      setHasSeenLandingState(seen);
    }
  }, []);

  // Check if user's last login was within 24 hours (stable reference)
  const isRecentLogin = useCallback(async (): Promise<boolean> => {
    try {
      const lastLoginTime = await AsyncStorage.getItem('lastLoginTime');
      if (!lastLoginTime) return false;

      const lastLogin = new Date(lastLoginTime);
      const now = new Date();
      const timeDiff = now.getTime() - lastLogin.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      return hoursDiff < 24;
    } catch (error) {
      console.error('Failed to check recent login:', error);
      return false;
    }
  }, []);

  // Set last login time (stable reference)
  const setLastLoginTime = useCallback(async () => {
    try {
      await AsyncStorage.setItem('lastLoginTime', new Date().toISOString());
    } catch (error) {
      console.error('Failed to set last login time:', error);
    }
  }, []);

  const loadHasSeenLanding = async () => {
    try {
      const stored = await AsyncStorage.getItem('hasSeenLanding');
      if (stored !== null) {
        setHasSeenLandingState(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load hasSeenLanding from AsyncStorage:', error);
    }
  };

  // Sign in function - now a no-op since auth screens use Clerk directly
  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    console.warn('AuthContext.signIn is deprecated - auth screens should use Clerk directly');
    return { error: 'Please use Clerk authentication directly' };
  };

  // Sign up function - now a no-op since auth screens use Clerk directly
  const signUp = async (email: string, password: string, userData: any): Promise<{ error?: string }> => {
    console.warn('AuthContext.signUp is deprecated - auth screens should use Clerk directly');
    return { error: 'Please use Clerk authentication directly' };
  };

  // Sign out (stable reference)
  const signOut = useCallback(async () => {
    try {
      await clerkSignOut();
      setJustLoggedIn(false);
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [clerkSignOut]);

  // Update onboarding using Convex mutation
  const updateOnboarding = async (data: any) => {
    try {
      console.log('Updating onboarding with data:', data);

      // Map snake_case to camelCase for Convex
      const convexData: any = {};

      if (data.is_onboarding_complete !== undefined) {
        convexData.isOnboardingComplete = data.is_onboarding_complete;
      }
      if (data.weekly_focus_goal !== undefined) {
        convexData.weeklyFocusGoal = data.weekly_focus_goal;
      }
      if (data.welcome_completed !== undefined) {
        convexData.welcomeCompleted = data.welcome_completed;
      }
      if (data.goals_set !== undefined) {
        convexData.goalsSet = data.goals_set;
      }
      if (data.first_session_completed !== undefined) {
        convexData.firstSessionCompleted = data.first_session_completed;
      }
      if (data.profile_customized !== undefined) {
        convexData.profileCustomized = data.profile_customized;
      }
      if (data.bio !== undefined) {
        convexData.bio = data.bio;
      }
      if (data.allow_direct_messages !== undefined) {
        convexData.allowDirectMessages = data.allow_direct_messages;
      }
      if (data.avatar_url !== undefined) {
        convexData.avatarUrl = data.avatar_url;
      }
      if (data.focus_method !== undefined) {
        convexData.focusMethod = data.focus_method;
      }
      if (data.education_level !== undefined) {
        convexData.educationLevel = data.education_level;
      }
      if (data.university !== undefined) {
        convexData.university = data.university;
      }
      if (data.major !== undefined) {
        convexData.major = data.major;
      }
      if (data.location !== undefined) {
        convexData.location = data.location;
      }
      if (data.timezone !== undefined) {
        convexData.timezone = data.timezone;
      }
      if (data.completed_at !== undefined) {
        convexData.completedAt = data.completed_at;
      }

      await updateOnboardingMutation(convexData);

      // Update local state if completion status changed
      if (data.is_onboarding_complete !== undefined) {
        setHasCompletedOnboarding(data.is_onboarding_complete);
        console.log('Onboarding completion status updated:', data.is_onboarding_complete);
      }

      console.log('Onboarding data updated successfully');
    } catch (error) {
      console.error('Update onboarding error:', error);
      throw error;
    }
  };

  // Refresh user data - Convex queries are reactive, so this is mostly a no-op (stable reference)
  const refreshUserData = useCallback(async () => {
    console.log('User data auto-refreshes with Convex reactivity');
    // Convex queries automatically update when data changes
    // This function exists for backward compatibility
  }, []);

  // Clear justLoggedIn flag (stable reference to prevent infinite re-renders)
  const clearJustLoggedIn = useCallback(() => {
    setJustLoggedIn(false);
  }, []);

  // Check network connectivity
  const checkNetworkConnectivity = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      setIsOffline(!networkState.isConnected);
    } catch (error) {
      console.error('Failed to check network connectivity:', error);
      setIsOffline(false);
    }
  };

  // Guard to prevent calling initializeUserMutation multiple times
  const hasInitializedUser = useRef(false);
  const hasScheduledGoals = useRef(false);

  // Initialize user data when authenticated
  useEffect(() => {
    const initializeUser = async () => {
      if (!isSignedIn || !clerkLoaded) {
        // Reset flags on sign out so re-login works
        hasInitializedUser.current = false;
        hasScheduledGoals.current = false;
        return;
      }
      if (!convexUser) {
        // User is signed in to Clerk but not in Convex yet
        // Try to initialize them (only once)
        if (!hasInitializedUser.current) {
          hasInitializedUser.current = true;
          try {
            console.log('Initializing user data in Convex...');
            await initializeUserMutation();
            console.log('User data initialized successfully');
          } catch (error) {
            console.error('Failed to initialize user data:', error);
            hasInitializedUser.current = false; // Allow retry on error
          }
        }
      } else {
        // User exists, schedule weekly goal notifications (only once)
        if (!hasScheduledGoals.current) {
          hasScheduledGoals.current = true;
          try {
            await scheduleWeeklyGoalChecks(convexUser._id);
            console.log('Weekly goal notifications initialized');
          } catch (error) {
            console.error('Failed to initialize weekly goal notifications:', error);
          }
        }
      }
    };

    initializeUser();
  }, [isSignedIn, clerkLoaded, convexUser]);

  // Update hasCompletedOnboarding when onboarding data changes
  // Guard with value comparison to prevent unnecessary state updates
  useEffect(() => {
    const newValue = convexOnboarding?.isOnboardingComplete || false;
    setHasCompletedOnboarding(prev => {
      if (prev === newValue) return prev; // No change, skip update
      return newValue;
    });
  }, [convexOnboarding?.isOnboardingComplete]);

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      await loadHasSeenLanding();
      await checkNetworkConnectivity();
      setIsInitializing(false);
    };

    initialize();
  }, []);

  // Clear justLoggedIn flag after timeout
  useEffect(() => {
    if (justLoggedIn) {
      const timer = setTimeout(() => {
        setJustLoggedIn(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [justLoggedIn]);

  // Check network connectivity periodically
  useEffect(() => {
    const interval = setInterval(checkNetworkConnectivity, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const isInitialLoading = isInitializing || !clerkLoaded;

  const value = useMemo(() => ({
    isAuthenticated,
    user,
    onboarding,
    leaderboard,
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
    justLoggedIn,
    isInitialLoading,
    hasSeenLanding,
    setHasSeenLanding,
    clearJustLoggedIn,
    signIn,
    signUp,
    signOut,
    updateOnboarding,
    refreshUserData,
    isRecentLogin,
    setLastLoginTime,
    isOffline,
  }), [
    isAuthenticated,
    user,
    onboarding,
    leaderboard,
    hasCompletedOnboarding,
    justLoggedIn,
    isInitialLoading,
    hasSeenLanding,
    clearJustLoggedIn,
    signOut,
    isRecentLogin,
    setLastLoginTime,
    isOffline,
    setHasSeenLanding,
    refreshUserData,
    // signIn, signUp, updateOnboarding are inline but rarely change
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

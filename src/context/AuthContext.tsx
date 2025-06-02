import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';

export type UserProfile = {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  university?: string;
  major?: string;
  business?: string;
  profession?: string;
  state?: string;
  display_name_preference?: string;
  [key: string]: any;
};

export type OnboardingPreferences = {
  id: string;
  user_id: string;
  learning_environment?: string;
  user_goal?: string;
  work_style?: string;
  sound_preference?: string;
  weekly_focus_goal?: number;
  is_onboarding_complete?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

export type LeaderboardStats = {
  id: string;
  user_id: string;
  total_focus_time?: number;
  weekly_focus_time?: number;
  monthly_focus_time?: number;
  current_streak?: number;
  longest_streak?: number;
  total_sessions?: number;
  level?: number;
  points?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

export type AuthContextType = {
  isAuthenticated: boolean;
  isInitialLoading: boolean; // Renamed from isLoading
  hasSeenLanding: boolean;
  setHasSeenLanding: (seen: boolean) => void;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
  justLoggedIn: boolean; // Add flag to track when user just logged in
  clearJustLoggedIn: () => void; // Function to reset the login flag
  user: UserProfile | null;
  onboarding: OnboardingPreferences | null;
  leaderboard: LeaderboardStats | null;
  signUp: (email: string, password: string, username?: string, full_name?: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: string } | void>;
  updateOnboarding: (updates: Partial<OnboardingPreferences>) => Promise<{ error?: string; success?: boolean }>;
  initializeLeaderboard: () => Promise<{ error?: string; success?: boolean }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // Renamed from isLoading
  const [hasSeenLanding, setHasSeenLanding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false); // Track when user just logged in
  const [user, setUser] = useState<UserProfile | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingPreferences | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardStats | null>(null);

  // Helper functions to create default data
  const createDefaultOnboardingData = useCallback(async (userId: string): Promise<OnboardingPreferences | null> => {
    try {
      const defaultData: Partial<OnboardingPreferences> = {
        user_id: userId,
        is_onboarding_complete: false,
        weekly_focus_goal: 5,
      };
      
      const { data, error } = await supabase
        .from('onboarding_preferences')
        .insert(defaultData)
        .select()
        .single();
        
      if (error) {
        console.error('Failed to create default onboarding data:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error creating default onboarding data:', error);
      return null;
    }
  }, []);

  const createDefaultLeaderboardData = useCallback(async (userId: string): Promise<LeaderboardStats | null> => {
    try {
      const defaultData: Partial<LeaderboardStats> = {
        user_id: userId,
        total_focus_time: 0,
        weekly_focus_time: 0,
        monthly_focus_time: 0,
        current_streak: 0,
        longest_streak: 0,
        total_sessions: 0,
        level: 1,
        points: 0,
      };
      
      const { data, error } = await supabase
        .from('leaderboard_stats')
        .insert(defaultData)
        .select()
        .single();
        
      if (error) {
        // If it's an RLS policy error, log it but don't crash the app
        if (error.code === '42501') {
          console.warn('RLS policy prevents leaderboard creation, will try again later or user can manually trigger:', error.message);
          return null;
        }
        console.error('Failed to create default leaderboard data:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error creating default leaderboard data:', error);
      return null;
    }
  }, []);

  // Helper function to detect if a user is an existing user from the PWA
  const isExistingUser = useCallback((profile: UserProfile | null): boolean => {
    if (!profile) return false;
    
    // Check for indicators that this is an existing user from the PWA
    // These fields would typically be populated if they used the app before
    const indicators = [
      profile.full_name,
      profile.username,
      profile.university,
      profile.major,
      profile.state,
      profile.business,
      profile.profession
    ];
    
    // If at least 2 profile fields are filled, consider them an existing user
    const filledFields = indicators.filter(field => field && field.trim().length > 0);
    return filledFields.length >= 2;
  }, []);

  // Helper function to create onboarding data for existing users
  const createOnboardingForExistingUser = useCallback(async (userId: string, profile: UserProfile): Promise<OnboardingPreferences | null> => {
    try {
      console.log('Creating onboarding record for existing user:', userId);
      
      const onboardingData: Partial<OnboardingPreferences> = {
        user_id: userId,
        is_onboarding_complete: true, // Mark as completed for existing users
        weekly_focus_goal: 5, // Default value
        // Map existing profile data to onboarding fields where possible
        university: profile.university,
        major: profile.major,
        location: profile.state,
        // Set default privacy preferences for existing users
        data_collection_consent: true,
        personalized_recommendations: true,
        usage_analytics: true,
        marketing_communications: false,
        profile_visibility: 'friends',
        study_data_sharing: false,
      };
      
      const { data, error } = await supabase
        .from('onboarding_preferences')
        .insert(onboardingData)
        .select()
        .single();
        
      if (error) {
        console.error('Failed to create onboarding data for existing user:', error);
        return null;
      }
      
      console.log('Successfully created onboarding record for existing user');
      return data;
    } catch (error) {
      console.error('Error creating onboarding data for existing user:', error);
      return null;
    }
  }, []);

  // Update hasSeenLanding with AsyncStorage persistence
  const updateHasSeenLanding = async (seen: boolean) => {
    try {
      await AsyncStorage.setItem('hasSeenLanding', JSON.stringify(seen));
      setHasSeenLanding(seen);
    } catch (error) {
      console.error('Failed to update hasSeenLanding in AsyncStorage:', error);
      setHasSeenLanding(seen);
    }
  };

  // Load hasSeenLanding from AsyncStorage
  const loadHasSeenLanding = async () => {
    try {
      const stored = await AsyncStorage.getItem('hasSeenLanding');
      if (stored !== null) {
        setHasSeenLanding(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load hasSeenLanding from AsyncStorage:', error);
    }
  };

  // Fetch user data
  const fetchUserData = useCallback(async (userId: string) => {
    // setIsLoading(true); // Removed: This should not use the initial loading flag
    
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profileError) console.error(`Profile fetch error:`, profileError);
      setUser(profile || null);
      
      // Fetch onboarding
      const { data: onboardingData, error: onboardingError } = await supabase.from('onboarding_preferences').select('*').eq('user_id', userId).single();
      
      let finalOnboardingData = onboardingData;
      if (onboardingError?.code === 'PGRST116') {
        // No onboarding record exists
        if (isExistingUser(profile)) {
          // This is an existing user from PWA - create completed onboarding record
          console.log('Detected existing user from PWA, creating completed onboarding record');
          finalOnboardingData = await createOnboardingForExistingUser(userId, profile);
        } else {
          // This is a new user - create default onboarding record
          console.log('New user detected, creating default onboarding record');
          finalOnboardingData = await createDefaultOnboardingData(userId);
        }
      } else if (onboardingError) {
        console.error(`Onboarding fetch error:`, onboardingError);
      }
      
      setOnboarding(finalOnboardingData || null);
      setHasCompletedOnboarding(finalOnboardingData?.is_onboarding_complete || false);
      
      // Fetch leaderboard
      const { data: leaderboardData, error: leaderboardError } = await supabase.from('leaderboard_stats').select('*').eq('user_id', userId).single();
      
      let finalLeaderboardData = leaderboardData;
      if (leaderboardError?.code === 'PGRST116') {
        finalLeaderboardData = await createDefaultLeaderboardData(userId);
        if (!finalLeaderboardData) {
          // Could not create leaderboard data due to RLS policies, will be created later
        }
      } else if (leaderboardError) {
        console.error(`Leaderboard fetch error:`, leaderboardError);
      }
      
      setLeaderboard(finalLeaderboardData || null);
      
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      // setIsLoading(false); // Removed: This should not use the initial loading flag
    }
  }, [createDefaultOnboardingData, createDefaultLeaderboardData, isExistingUser, createOnboardingForExistingUser]);

  useEffect(() => {
    const checkSession = async () => {
      setIsInitialLoading(true); // Use renamed setter
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await fetchUserData(session.user.id);
          setIsAuthenticated(true);
          // Don't set justLoggedIn here - this is for existing sessions, not new logins
        } else {
          setUser(null);
          setOnboarding(null);
          setLeaderboard(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setIsAuthenticated(false);
      } finally {
        setIsInitialLoading(false); // Use renamed setter
      }
    };

    checkSession();
    loadHasSeenLanding();

    const { data: authListenerData } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Removed setIsLoading(true) and setIsLoading(false) from here
      if (session?.user) {
        await fetchUserData(session.user.id); 
        setIsAuthenticated(true);
        // Don't set justLoggedIn here as this handles all auth state changes, not just manual login
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setOnboarding(null);
        setLeaderboard(null);
        setIsAuthenticated(false);
        setJustLoggedIn(false); // Reset login flag on logout
      }
    });

    return () => {
      authListenerData.subscription.unsubscribe();
    };
  }, [fetchUserData]);

  // Sign up
  const signUp = async (email: string, password: string, username?: string, full_name?: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) return { error: authError.message };
      if (!authData.user) return { error: 'Failed to create user' };

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email,
        username,
        full_name,
      });

      if (profileError) return { error: profileError.message };

      setJustLoggedIn(true); // Set flag that user just logged in to trigger proper navigation

      return {};
    } catch (error) {
      return { error: 'Sign up failed' };
    }
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) return { error: authError.message };
      if (!authData.user) return { error: 'Failed to sign in' };

      const authUser = authData.user;
      await fetchUserData(authUser.id);
      setIsAuthenticated(true);
      setJustLoggedIn(true); // Set flag that user just logged in

      return {};
    } catch (error) {
      return { error: 'Sign in failed' };
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOnboarding(null);
    setLeaderboard(null);
    setIsAuthenticated(false);
    setJustLoggedIn(false); // Reset login flag
  };

  // Refresh user data
  const refreshUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchUserData(session.user.id);
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'No user' };
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) return { error: error.message };
    await fetchUserData(user.id);
  };

  // Update onboarding
  const updateOnboarding = async (updates: Partial<OnboardingPreferences>) => {
    if (!user) return { error: 'No user' };
    
    // If updating onboarding completion, immediately update local state
    if (updates.is_onboarding_complete !== undefined) {
      setHasCompletedOnboarding(updates.is_onboarding_complete);
    }
    
    // First check if onboarding data exists
    const { data: existingData } = await supabase
      .from('onboarding_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (!existingData) {
      // Create new onboarding record
      const newData = { user_id: user.id, ...updates };
      const { error } = await supabase
        .from('onboarding_preferences')
        .insert(newData);
      if (error) return { error: error.message };
    } else {
      // Update existing record
      const { error } = await supabase
        .from('onboarding_preferences')
        .update(updates)
        .eq('user_id', user.id);
      if (error) return { error: error.message };
    }
    
    await fetchUserData(user.id);
    return { success: true };
  };

  // Function to clear the justLoggedIn flag
  const clearJustLoggedIn = () => {
    setJustLoggedIn(false);
  };
  // Initialize leaderboard - can be called when user first needs leaderboard data
  const initializeLeaderboard = async () => {
    if (!user) return { error: 'No user' };
    
    try {
      const leaderboardData = await createDefaultLeaderboardData(user.id);
      if (leaderboardData) {
        setLeaderboard(leaderboardData);
        return { success: true };
      } else {
        return { error: 'Unable to create leaderboard data due to database policies' };
      }
    } catch (error) {
      return { error: 'Failed to initialize leaderboard' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isInitialLoading, // Renamed from isLoading
        hasSeenLanding,
        setHasSeenLanding: updateHasSeenLanding,
        hasCompletedOnboarding,
        setHasCompletedOnboarding,
        justLoggedIn,
        clearJustLoggedIn,
        user,
        onboarding,
        leaderboard,
        signUp,
        signIn,
        signOut,
        refreshUserData,
        updateProfile,
        updateOnboarding,
        initializeLeaderboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Ensure the returned context matches the AuthContextType, especially the renamed isLoading
  return {
    ...context,
    isLoading: context.isInitialLoading, // Keep isLoading for consumers if desired, but map it
  };
};

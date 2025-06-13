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
  isInitialLoading: boolean;
  hasSeenLanding: boolean;
  setHasSeenLanding: (seen: boolean) => void;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
  justLoggedIn: boolean;
  clearJustLoggedIn: () => void;
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasSeenLanding, setHasSeenLanding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
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
        if (error.code === '42501') {
          console.warn('RLS policy prevents leaderboard creation, will try again later:', error.message);
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

  // Helper function to detect if a user is an existing user
  const isExistingUser = useCallback((profile: UserProfile | null): boolean => {
    if (!profile) return false;
    
    const indicators = [
      profile.full_name,
      profile.username,
      profile.university,
      profile.major,
      profile.state,
      profile.business,
      profile.profession
    ];
    
    const filledFields = indicators.filter(field => field && field.trim().length > 0);
    return filledFields.length >= 2;
  }, []);

  // Helper function to create onboarding data for existing users
  const createOnboardingForExistingUser = useCallback(async (userId: string, profile: UserProfile): Promise<OnboardingPreferences | null> => {
    try {
      console.log('Creating onboarding record for existing user:', userId);
      
      const onboardingData: Partial<OnboardingPreferences> = {
        user_id: userId,
        is_onboarding_complete: true,
        weekly_focus_goal: 5,
        university: profile.university,
        major: profile.major,
        location: profile.state,
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

  // AsyncStorage helpers
  const updateHasSeenLanding = async (seen: boolean) => {
    try {
      await AsyncStorage.setItem('hasSeenLanding', JSON.stringify(seen));
      setHasSeenLanding(seen);
    } catch (error) {
      console.error('Failed to update hasSeenLanding in AsyncStorage:', error);
      setHasSeenLanding(seen);
    }
  };

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

  // IMPROVED: Fetch user data with better timeout handling and fallback data
  const fetchUserData = useCallback(async (userId: string) => {
    console.log('AuthContext: Fetching user data for:', userId);
    
    try {
      // Helper function for timeout handling
      const fetchWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs/1000}s`)), timeoutMs);
        });
        
        try {
          return await Promise.race([promise, timeoutPromise]);
        } catch (error: any) {
          console.warn(`AuthContext: ${operation} failed:`, error?.message || 'Unknown error');
          throw error;
        }
      };

      // Fetch profile with 5s timeout
      let profile = null;
      try {
        const profileResponse = await fetchWithTimeout(
          supabase.from('profiles').select('*').eq('id', userId).single(),
          5000,
          'Profile fetch'
        );
        
        if (profileResponse.error) {
          console.error('Profile fetch error:', profileResponse.error);
        } else {
          profile = profileResponse.data;
          console.log('AuthContext: Profile loaded:', profile?.full_name || 'No name');
        }
      } catch (profileError: any) {
        console.warn('AuthContext: Profile fetch failed, continuing without profile:', profileError?.message || 'Unknown error');
      }
      
      setUser(profile);
      
      // Fetch onboarding with 3s timeout
      let finalOnboardingData = null;
      try {
        const onboardingResponse = await fetchWithTimeout(
          supabase.from('onboarding_preferences').select('*').eq('user_id', userId).single(),
          3000,
          'Onboarding fetch'
        );
        
        if (onboardingResponse.error?.code === 'PGRST116') {
          if (isExistingUser(profile)) {
            console.log('Creating onboarding for existing user');
            finalOnboardingData = await createOnboardingForExistingUser(userId, profile);
          } else {
            console.log('Creating default onboarding for new user');
            finalOnboardingData = await createDefaultOnboardingData(userId);
          }
        } else if (onboardingResponse.error) {
          console.error('Onboarding fetch error:', onboardingResponse.error);
        } else {
          finalOnboardingData = onboardingResponse.data;
        }
      } catch (onboardingError: any) {
        console.warn('AuthContext: Onboarding fetch failed, using fallback:', onboardingError?.message || 'Unknown error');
        // Create minimal fallback onboarding data
        finalOnboardingData = {
          id: `temp-${userId}`,
          user_id: userId,
          is_onboarding_complete: false,
          weekly_focus_goal: 5
        } as OnboardingPreferences;
      }
      
      setOnboarding(finalOnboardingData);
      setHasCompletedOnboarding(finalOnboardingData?.is_onboarding_complete || false);
      console.log('AuthContext: Onboarding status:', finalOnboardingData?.is_onboarding_complete ? 'complete' : 'incomplete');
      
      // Fetch leaderboard with 3s timeout
      let finalLeaderboardData = null;
      try {
        const leaderboardResponse = await fetchWithTimeout(
          supabase.from('leaderboard_stats').select('*').eq('user_id', userId).single(),
          3000,
          'Leaderboard fetch'
        );
        
        if (leaderboardResponse.error?.code === 'PGRST116') {
          console.log('Creating default leaderboard data');
          finalLeaderboardData = await createDefaultLeaderboardData(userId);
        } else if (leaderboardResponse.error) {
          console.error('Leaderboard fetch error:', leaderboardResponse.error);
        } else {
          finalLeaderboardData = leaderboardResponse.data;
        }
      } catch (leaderboardError: any) {
        console.warn('AuthContext: Leaderboard fetch failed, using fallback:', leaderboardError?.message || 'Unknown error');
        // Create minimal fallback leaderboard data
        finalLeaderboardData = {
          id: `temp-${userId}`,
          user_id: userId,
          total_focus_time: 0,
          level: 1,
          points: 0,
          current_streak: 0
        } as LeaderboardStats;
      }
      
      setLeaderboard(finalLeaderboardData);
      console.log('AuthContext: User data fetch completed successfully');
      
    } catch (error: any) {
      console.error('AuthContext: Critical error in fetchUserData:', error?.message || 'Unknown error');
      throw error;
    }
  }, [createDefaultOnboardingData, createDefaultLeaderboardData, isExistingUser, createOnboardingForExistingUser]);

  // IMPROVED: Session initialization with better error handling
  useEffect(() => {
    const checkSession = async () => {
      setIsInitialLoading(true);
      console.log('AuthContext: Starting session check...');
      
      try {
        // 6 second timeout for session check
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 6000);
        });
        
        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        console.log('AuthContext: Session check completed', { hasSession: !!session?.user });
        
        if (session?.user) {
          console.log('AuthContext: User session found, fetching user data...');
          try {
            // 8 second timeout for user data fetch
            await Promise.race([
              fetchUserData(session.user.id),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('User data fetch timeout')), 8000))
            ]);
            setIsAuthenticated(true);
            console.log('AuthContext: User data fetch completed, user authenticated');
          } catch (fetchError) {
            console.error('AuthContext: User data fetch failed:', fetchError);
            // CRITICAL FIX: Still authenticate the user with fallback data
            setIsAuthenticated(true);
            setUser({ id: session.user.id, email: session.user.email || '' });
            setOnboarding({ 
              id: `fallback-${session.user.id}`,
              user_id: session.user.id, 
              is_onboarding_complete: false, 
              weekly_focus_goal: 5 
            } as OnboardingPreferences);
            setLeaderboard({ 
              id: `fallback-${session.user.id}`,
              user_id: session.user.id, 
              total_focus_time: 0, 
              level: 1, 
              points: 0, 
              current_streak: 0 
            } as LeaderboardStats);
            console.log('AuthContext: Using fallback data, user authenticated');
          }
        } else {
          console.log('AuthContext: No user session found');
          setUser(null);
          setOnboarding(null);
          setLeaderboard(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("AuthContext: Critical error in session check:", error);
        setIsAuthenticated(false);
        setUser(null);
        setOnboarding(null);
        setLeaderboard(null);
      } finally {
        console.log('AuthContext: Session check complete');
        setIsInitialLoading(false);
      }
    };

    checkSession();
    loadHasSeenLanding();

    // IMPROVED: Auth state change listener with fallback data
    const { data: authListenerData } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event);
      
      if (session?.user) {
        try {
          await fetchUserData(session.user.id);
          setIsAuthenticated(true);
        } catch (fetchError) {
          console.error('AuthContext: Data fetch failed in auth state change:', fetchError);
          // Still authenticate user with fallback data
          setIsAuthenticated(true);
          setUser({ id: session.user.id, email: session.user.email || '' });
          setOnboarding({ 
            id: `fallback-${session.user.id}`,
            user_id: session.user.id, 
            is_onboarding_complete: false, 
            weekly_focus_goal: 5 
          } as OnboardingPreferences);
          setLeaderboard({ 
            id: `fallback-${session.user.id}`,
            user_id: session.user.id, 
            total_focus_time: 0, 
            level: 1, 
            points: 0, 
            current_streak: 0 
          } as LeaderboardStats);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setOnboarding(null);
        setLeaderboard(null);
        setIsAuthenticated(false);
        setJustLoggedIn(false);
      }
    });

    return () => {
      authListenerData.subscription.unsubscribe();
    };
  }, [fetchUserData]);

  // IMPROVED: Sign up with timeout protection
  const signUp = async (email: string, password: string, username?: string, full_name?: string) => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Sign up timeout')), 15000);
      });

      const signUpPromise = supabase.auth.signUp({
        email,
        password,
      });

      const { data: authData, error: authError } = await Promise.race([signUpPromise, timeoutPromise]);

      if (authError) return { error: authError.message };
      if (!authData.user) return { error: 'Failed to create user' };

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email,
        username,
        full_name,
      });

      if (profileError) return { error: profileError.message };

      setJustLoggedIn(true);
      return {};
    } catch (error: any) {
      return { error: error?.message || 'Sign up failed' };
    }
  };

  // IMPROVED: Sign in with timeout protection and fallback authentication
  const signIn = async (email: string, password: string) => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Sign in timeout')), 15000);
      });

      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { data: authData, error: authError } = await Promise.race([signInPromise, timeoutPromise]);

      if (authError) return { error: authError.message };
      if (!authData.user) return { error: 'Failed to sign in' };

      const authUser = authData.user;
      
      try {
        await fetchUserData(authUser.id);
      } catch (fetchError) {
        console.warn('AuthContext: Data fetch failed during sign in, using fallback data');
        // Set minimal user data to allow sign in to complete
        setUser({ id: authUser.id, email: authUser.email || '' });
        setOnboarding({ 
          id: `fallback-${authUser.id}`,
          user_id: authUser.id, 
          is_onboarding_complete: false, 
          weekly_focus_goal: 5 
        } as OnboardingPreferences);
        setLeaderboard({ 
          id: `fallback-${authUser.id}`,
          user_id: authUser.id, 
          total_focus_time: 0, 
          level: 1, 
          points: 0, 
          current_streak: 0 
        } as LeaderboardStats);
      }
      
      setIsAuthenticated(true);
      setJustLoggedIn(true);

      return {};
    } catch (error: any) {
      return { error: error?.message || 'Sign in failed' };
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOnboarding(null);
    setLeaderboard(null);
    setIsAuthenticated(false);
    setJustLoggedIn(false);
  };

  // Refresh user data
  const refreshUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      try {
        await fetchUserData(session.user.id);
      } catch (error) {
        console.warn('RefreshUserData failed, keeping existing data');
      }
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'No user' };
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) return { error: error.message };
    await refreshUserData();
  };

  // Update onboarding
  const updateOnboarding = async (updates: Partial<OnboardingPreferences>) => {
    if (!user) return { error: 'No user' };
    
    if (updates.is_onboarding_complete !== undefined) {
      setHasCompletedOnboarding(updates.is_onboarding_complete);
    }
    
    const { data: existingData } = await supabase
      .from('onboarding_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (!existingData) {
      const newData = { user_id: user.id, ...updates };
      const { error } = await supabase
        .from('onboarding_preferences')
        .insert(newData);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from('onboarding_preferences')
        .update(updates)
        .eq('user_id', user.id);
      if (error) return { error: error.message };
    }
    
    await refreshUserData();
    return { success: true };
  };

  const clearJustLoggedIn = () => {
    setJustLoggedIn(false);
  };

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
        isInitialLoading,
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
  return {
    ...context,
    isLoading: context.isInitialLoading, // Backward compatibility
  };
};

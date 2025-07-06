import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Timeout wrapper for all network requests
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 6000 // Reduced from 15s to 6s
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]);
};

// Add this enhanced version to your AuthContext.tsx:

// Enhanced timeout wrapper with retry capability
const withTimeoutAndRetry = <T>(
  promiseFactory: () => Promise<T>,
  timeoutMs: number = 6000,
  retries: number = 2
): Promise<T> => {
  return new Promise(async (resolve, reject) => {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        console.log(`🔄 Network attempt ${attempt}/${retries + 1}`);
        
        const result = await Promise.race([
          promiseFactory(),
          new Promise<never>((_, timeoutReject) =>
            setTimeout(() => timeoutReject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
          ),
        ]);
        
        console.log(`✅ Network request succeeded on attempt ${attempt}`);
        resolve(result);
        return;
        
      } catch (error: any) {
        console.log(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries + 1) {
          // Final attempt failed
          reject(new Error(`Network failed after ${retries + 1} attempts: ${error.message}`));
          return;
        }
        
        // Wait before retry with exponential backoff
        const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  });
};

// Network connectivity test
const testNetworkConnectivity = async (): Promise<boolean> => {
  try {
    console.log('🌐 Testing network connectivity...');
    
    // Test basic Supabase connection with minimal timeout
    await withTimeoutAndRetry(
      () => supabase.from('profiles').select('count').limit(1),
      3000, // 3 second timeout
      1     // 1 retry
    );
    
    console.log('✅ Network connectivity confirmed');
    return true;
  } catch (error) {
    console.log('❌ Network connectivity failed:', error.message);
    return false;
  }
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  onboarding: any;
  leaderboard: any;
  hasCompletedOnboarding: boolean;
  justLoggedIn: boolean;
  isInitialLoading: boolean;
  hasSeenLanding: boolean;
  setHasSeenLanding: (seen: boolean) => Promise<void>;
  clearJustLoggedIn: () => void;  // Add this line
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateOnboarding: (data: any) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [onboarding, setOnboarding] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasSeenLanding, setHasSeenLandingState] = useState(false);

  // Landing page state management
  const setHasSeenLanding = async (seen: boolean) => {
    try {
      await AsyncStorage.setItem('hasSeenLanding', JSON.stringify(seen));
      setHasSeenLandingState(seen);
    } catch (error) {
      console.error('Failed to update hasSeenLanding in AsyncStorage:', error);
      setHasSeenLandingState(seen);
    }
  };

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

  // Enhanced session check with timeout and fallback data
  const checkSession = async (showLogs = false) => {
    try {
      if (showLogs) console.log('🔐 AuthContext: Starting session check...');
      
      // Step 1: Get session with timeout
      const { data: { session }, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        5000 // 5 second timeout for session check
      );

      if (sessionError) {
        console.error('AuthContext: Session error:', sessionError);
        throw sessionError;
      }

      if (!session?.user) {
        if (showLogs) console.log('AuthContext: No session found');
        setUser(null);
        setOnboarding(null);
        setLeaderboard(null);
        setIsAuthenticated(false);
        setHasCompletedOnboarding(false);
        return;
      }

      if (showLogs) console.log('AuthContext: Session found, fetching user data...');

      // Step 2: Fetch user data with timeout and fallback
      const userData = await fetchUserDataWithFallback(session.user, showLogs);
      
      // Step 3: Set authentication state
      setIsAuthenticated(true);
      setUser(userData.profile);
      setOnboarding(userData.onboarding);
      setLeaderboard(userData.leaderboard);
      setHasCompletedOnboarding(userData.onboarding?.is_onboarding_complete || false);

      if (showLogs) {
        console.log('✅ AuthContext: User authenticated successfully');
        console.log('👤 User:', userData.profile?.full_name || userData.profile?.email);
        console.log('🎯 Onboarding complete:', userData.onboarding?.is_onboarding_complete);
      }

    } catch (error: any) {
      console.error("AuthContext: Session check failed:", error.message);
      
      // Don't set authentication to false if it's just a data fetch timeout
      // This allows users to stay logged in even with network issues
      if (error.message.includes('timeout') || error.message.includes('Network request failed')) {
        console.log('AuthContext: Using cached/fallback data due to network timeout');
        // Keep existing auth state if available
        if (!isAuthenticated) {
          setIsAuthenticated(false);
          setUser(null);
          setOnboarding(null);
          setLeaderboard(null);
        }
      } else {
        // For other errors, clear auth state
        setIsAuthenticated(false);
        setUser(null);
        setOnboarding(null);
        setLeaderboard(null);
        setHasCompletedOnboarding(false);
      }
    }
  };

  // Enhanced user data fetch with fallback
  const fetchUserDataWithFallback = async (sessionUser: any, showLogs = false) => {
    const fallbackData = {
      profile: {
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: sessionUser.user_metadata?.full_name || 'User',
        username: sessionUser.user_metadata?.username || sessionUser.email?.split('@')[0],
      },
      onboarding: {
        id: `fallback-${sessionUser.id}`,
        user_id: sessionUser.id,
        is_onboarding_complete: false,
        weekly_focus_goal: 5,
      },
      leaderboard: {
        id: `fallback-${sessionUser.id}`,
        user_id: sessionUser.id,
        total_focus_time: 0,
        level: 1,
        points: 0,
        current_streak: 0,
      }
    };

    try {
      // Try to fetch profile data with timeout
      if (showLogs) console.log('📊 Fetching profile data...');
      
      let profile;
      try {
        const { data: profileData, error: profileError } = await withTimeout(
          supabase.from('profiles').select('*').eq('id', sessionUser.id).single(),
          4000 // 4 second timeout
        );

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }
        
        profile = profileData || fallbackData.profile;
        if (showLogs) console.log('✅ Profile data loaded');
      } catch (profileError) {
        console.log('⚠️ Profile fetch failed, using fallback:', profileError.message);
        profile = fallbackData.profile;
      }

      // Try to fetch onboarding data with timeout
      let onboarding;
      try {
        if (showLogs) console.log('🎯 Fetching onboarding data...');
        
        const { data: onboardingData, error: onboardingError } = await withTimeout(
          supabase.from('onboarding_preferences').select('*').eq('user_id', sessionUser.id).single(),
          4000 // 4 second timeout
        );

        if (onboardingError && onboardingError.code !== 'PGRST116') {
          throw onboardingError;
        }

        onboarding = onboardingData || fallbackData.onboarding;
        if (showLogs) console.log('✅ Onboarding data loaded');
      } catch (onboardingError) {
        console.log('⚠️ Onboarding fetch failed, using fallback:', onboardingError.message);
        onboarding = fallbackData.onboarding;
      }

      // Try to fetch leaderboard data with timeout
      let leaderboard;
      try {
        if (showLogs) console.log('🏆 Fetching leaderboard data...');
        
        const { data: leaderboardData, error: leaderboardError } = await withTimeout(
          supabase.from('leaderboard_stats').select('*').eq('user_id', sessionUser.id).single(),
          4000 // 4 second timeout
        );

        if (leaderboardError && leaderboardError.code !== 'PGRST116') {
          throw leaderboardError;
        }

        leaderboard = leaderboardData || fallbackData.leaderboard;
        if (showLogs) console.log('✅ Leaderboard data loaded');
      } catch (leaderboardError) {
        console.log('⚠️ Leaderboard fetch failed, using fallback:', leaderboardError.message);
        leaderboard = fallbackData.leaderboard;
      }

      return { profile, onboarding, leaderboard };

    } catch (error) {
      console.log('❌ Critical error in data fetch, using complete fallback:', error.message);
      return fallbackData;
    }
  };

  // Enhanced sign in with comprehensive network handling
  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      console.log('🔐 Starting enhanced sign in process...');
      console.log('📧 Email:', email);
      
      // Step 1: Test network connectivity first
      const networkAvailable = await testNetworkConnectivity();
      if (!networkAvailable) {
        return { 
          error: 'No internet connection. Please check your network and try again.' 
        };
      }
      
      // Step 2: Attempt authentication with retry logic
      console.log('🔑 Attempting authentication with retry logic...');
      
      const authResult = await withTimeoutAndRetry(
        () => supabase.auth.signInWithPassword({ email, password }),
        8000, // 8 second timeout per attempt
        2     // 2 retries = 3 total attempts
      );
      
      const { data: authData, error: authError } = authResult;

      if (authError) {
        console.error('❌ Authentication failed:', authError.message);
        
        // Handle specific authentication errors
        if (authError.message.includes('Invalid login credentials')) {
          return { error: 'Invalid email or password. Please check your credentials and try again.' };
        } else if (authError.message.includes('Too many requests')) {
          return { error: 'Too many login attempts. Please wait a moment and try again.' };
        } else if (authError.message.includes('Email not confirmed')) {
          return { error: 'Please check your email and confirm your account before logging in.' };
        } else {
          return { error: `Authentication failed: ${authError.message}` };
        }
      }

      if (!authData.user) {
        return { error: 'Authentication failed - no user data returned. Please try again.' };
      }

      console.log('✅ Authentication successful');
      console.log('👤 User ID:', authData.user.id);

      // Step 3: Set login flag immediately
      setJustLoggedIn(true);
      
      // Step 4: Fetch user data with fallback (don't let this block authentication)
      try {
        console.log('📊 Fetching user data...');
        const userData = await fetchUserDataWithFallback(authData.user, true);
        
        // Step 5: Update auth state
        setIsAuthenticated(true);
        setUser(userData.profile);
        setOnboarding(userData.onboarding);
        setLeaderboard(userData.leaderboard);
        setHasCompletedOnboarding(userData.onboarding?.is_onboarding_complete || false);
        
        console.log('🎉 Sign in completed successfully with full data');
        return {};
        
      } catch (dataError: any) {
        console.log('⚠️ Data fetch failed during login, but authentication succeeded');
        console.log('📝 Using minimal fallback data to allow user login');
        
        // Still set user as authenticated with minimal data
        setIsAuthenticated(true);
        setUser({
          id: authData.user.id,
          email: authData.user.email,
          full_name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'User',
          username: authData.user.user_metadata?.username || authData.user.email?.split('@')[0],
        });
        setOnboarding({ 
          user_id: authData.user.id, 
          is_onboarding_complete: false,
          weekly_focus_goal: 5 
        });
        setLeaderboard({ 
          user_id: authData.user.id, 
          total_focus_time: 0, 
          level: 1, 
          points: 0,
          current_streak: 0 
        });
        setHasCompletedOnboarding(false);
        
        console.log('✅ User authenticated with fallback data');
        return {}; // Success, even with data fetch issues
      }

    } catch (error: any) {
      console.error('❌ Sign in failed completely:', error.message);
      
      // Provide specific user-friendly error messages
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.message.includes('Network failed after') || error.message.includes('Network request failed')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      } else if (error.message.includes('timeout') || error.message.includes('Request timeout')) {
        errorMessage = 'Login is taking too long. Please check your internet connection and try again.';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      }
      
      return { error: errorMessage };
    }
  };

  // Enhanced sign up with timeout
  const signUp = async (email: string, password: string, userData: any): Promise<{ error?: string }> => {
    try {
      console.log('📝 Starting sign up process...');
      
      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: userData
          }
        }),
        10000 // 10 second timeout for sign up
      );

      if (authError) {
        console.error('❌ Sign up failed:', authError.message);
        return { error: authError.message };
      }

      console.log('✅ Sign up successful');
      return {};

    } catch (error: any) {
      console.error('❌ Sign up error:', error.message);
      
      let errorMessage = 'Account creation failed. Please try again.';
      
      if (error.message.includes('timeout') || error.message.includes('Request timeout')) {
        errorMessage = 'Account creation is taking too long. Please check your internet connection and try again.';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      return { error: errorMessage };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await withTimeout(supabase.auth.signOut(), 5000);
      setIsAuthenticated(false);
      setUser(null);
      setOnboarding(null);
      setLeaderboard(null);
      setHasCompletedOnboarding(false);
      setJustLoggedIn(false);
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      // Still clear local state even if network request fails
      setIsAuthenticated(false);
      setUser(null);
      setOnboarding(null);
      setLeaderboard(null);
      setHasCompletedOnboarding(false);
      setJustLoggedIn(false);
    }
  };

  // Update onboarding
  const updateOnboarding = async (data: any) => {
    try {
      const { error } = await withTimeout(
        supabase.from('onboarding_preferences').upsert(data),
        8000
      );
      
      if (error) throw error;
      
      setOnboarding(prev => ({ ...prev, ...data }));
      console.log('✅ Onboarding data updated');
    } catch (error) {
      console.error('❌ Update onboarding error:', error);
    }
  };

  // Refresh user data
  const refreshUserData = async () => {
    try {
      if (!user) return;
      
      console.log('🔄 Refreshing user data...');
      const userData = await fetchUserDataWithFallback(user, true);
      
      setUser(userData.profile);
      setOnboarding(userData.onboarding);
      setLeaderboard(userData.leaderboard);
      setHasCompletedOnboarding(userData.onboarding?.is_onboarding_complete || false);
      
      console.log('✅ User data refreshed');
    } catch (error) {
      console.error('❌ Refresh user data error:', error);
    }
  };

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      await loadHasSeenLanding();
      await checkSession();
      setIsInitializing(false);
    };

    initialize();
  }, []);

  // Clear justLoggedIn state after initial load
  useEffect(() => {
    if (isInitializing) return;
    
    const timer = setTimeout(() => {
      setJustLoggedIn(false);
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, [isInitializing]);

  // Clear justLoggedIn flag after navigation
  useEffect(() => {
    if (justLoggedIn) {
      const timer = setTimeout(() => {
        setJustLoggedIn(false);
      }, 2000); // Clear after 2 seconds
    
      return () => clearTimeout(timer);
    }
  }, [justLoggedIn]);

  // Function to clear the justLoggedIn flag
  const clearJustLoggedIn = () => {
    setJustLoggedIn(false);
  };

  const value = {
    isAuthenticated,
    user,
    onboarding,
    leaderboard,
    hasCompletedOnboarding,
    justLoggedIn,
    isInitialLoading: isInitializing,
    hasSeenLanding,
    setHasSeenLanding,
    clearJustLoggedIn,  // This line is already there
    signIn,
    signUp,
    signOut,
    updateOnboarding,
    refreshUserData,
  };

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

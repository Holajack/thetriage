import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInitialUserData, ensureUserDataCompleteness } from '../utils/createUserData';
import * as Network from 'expo-network';
import { scheduleWeeklyGoalChecks } from '../utils/weeklyGoalNotifications';

// Simple timeout wrapper
const withTimeout = (promise: Promise<any>, timeoutMs: number = 6000): Promise<any> => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]);
};

// Enhanced timeout wrapper with retry capability
const withTimeoutAndRetry = (
  promiseFactory: () => Promise<any>,
  timeoutMs: number = 6000,
  retries: number = 2
): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        console.log(`🔄 Network attempt ${attempt}/${retries + 1}`);
        
        const result = await Promise.race([
          promiseFactory(),
          new Promise((_, timeoutReject) =>
            setTimeout(() => timeoutReject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
          ),
        ]);
        
        console.log(`✅ Network request succeeded on attempt ${attempt}`);
        resolve(result);
        return;
        
      } catch (error: any) {
        console.log(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries + 1) {
          reject(new Error(`Network failed after ${retries + 1} attempts: ${error.message}`));
          return;
        }
        
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  });
};

// In src/context/AuthContext.tsx - Update the timeout values
const NETWORK_TIMEOUT = 15000; // Increase from 8000ms to 15000ms
const MAX_RETRIES = 5; // Increase from 3 to 5 retries
const RETRY_DELAYS = [1000, 2000, 3000, 5000, 8000]; // Progressive backoff

// Enhanced network connectivity test
const testNetworkConnectivity = async (): Promise<boolean> => {
  console.log('🌐 Testing network connectivity...');
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 Network attempt ${attempt}/${MAX_RETRIES}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        .abortSignal(controller.signal);
        
      clearTimeout(timeoutId);
      
      if (!error) {
        console.log('✅ Network connectivity confirmed');
        return true;
      }
      
    } catch (error) {
      console.log(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt - 1];
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.log('❌ Network connectivity test failed after all attempts');
  return false;
};

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [onboarding, setOnboarding] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasSeenLanding, setHasSeenLandingState] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

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

  // Check if user's last login was within 24 hours
  const isRecentLogin = async (): Promise<boolean> => {
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
  };

  // Set last login time
  const setLastLoginTime = async () => {
    try {
      await AsyncStorage.setItem('lastLoginTime', new Date().toISOString());
    } catch (error) {
      console.error('Failed to set last login time:', error);
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
      
      // First check network status
      const networkAvailable = await testNetworkConnectivity();
      if (!networkAvailable) {
        console.log('⚠️ No network connectivity - working in offline mode');
        setIsOffline(true);
        
        // Try to load cached session data
        try {
          const cachedUser = await AsyncStorage.getItem('cachedUser');
          const cachedOnboarding = await AsyncStorage.getItem('cachedOnboarding');
          
          if (cachedUser) {
            console.log('📦 Using cached user data for offline mode');
            setUser(JSON.parse(cachedUser));
            setOnboarding(cachedOnboarding ? JSON.parse(cachedOnboarding) : null);
            setIsAuthenticated(true);
            setHasCompletedOnboarding(cachedOnboarding ? JSON.parse(cachedOnboarding)?.is_onboarding_complete || false : false);
            return;
          }
        } catch (cacheError) {
          console.log('⚠️ Could not load cached data:', cacheError);
        }
        
        // No cached data, stay signed out
        setIsAuthenticated(false);
        setUser(null);
        setOnboarding(null);
        setLeaderboard(null);
        setHasCompletedOnboarding(false);
        setJustLoggedIn(false);
        return;
      }
      
      setIsOffline(false);
      
      const { data: { session }, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        8000
      );

      if (sessionError) {
        console.error('AuthContext: Session error:', sessionError);
        
        // Handle specific refresh token errors
        if (sessionError.message?.includes('refresh_token_not_found') || 
            sessionError.message?.includes('Invalid Refresh Token') ||
            sessionError.message?.includes('Refresh Token Not Found')) {
          console.log('AuthContext: Invalid refresh token, clearing session...');
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.log('AuthContext: Sign out failed, continuing with cleanup');
          }
          setUser(null);
          setOnboarding(null);
          setLeaderboard(null);
          setIsAuthenticated(false);
          setHasCompletedOnboarding(false);
          return;
        }
        
        throw sessionError;
      }

      if (!session?.user) {
        if (showLogs) console.log('AuthContext: No session found');
        setUser(null);
        setOnboarding(null);
        setLeaderboard(null);
        setIsAuthenticated(false);
        setHasCompletedOnboarding(false);
        setJustLoggedIn(false);
        return;
      }

      if (showLogs) console.log('AuthContext: Session found, fetching user data...');

      const userData = await fetchUserDataWithFallback(session.user, showLogs);
      
      // Only set authenticated if we have real data, not fallback
      if (userData.usingFallback) {
        console.log('⚠️ Using fallback data - keeping user signed out');
        setIsAuthenticated(false);
        setUser(null);
        setOnboarding(null);
        setLeaderboard(null);
        setHasCompletedOnboarding(false);
        setJustLoggedIn(false);
        return;
      }
      
      setIsAuthenticated(true);
      setUser(userData.profile);
      setOnboarding(userData.onboarding);
      setLeaderboard(userData.leaderboard);
      setHasCompletedOnboarding(userData.onboarding?.is_onboarding_complete || false);

      // Cache user data for offline mode
      try {
        await AsyncStorage.setItem('cachedUser', JSON.stringify(userData.profile));
        await AsyncStorage.setItem('cachedOnboarding', JSON.stringify(userData.onboarding));
        console.log('💾 User data cached for offline use');
      } catch (cacheError) {
        console.log('⚠️ Failed to cache user data:', cacheError);
      }

      // Initialize weekly goal notifications
      try {
        if (userData.profile?.id) {
          await scheduleWeeklyGoalChecks(userData.profile.id);
          console.log('📅 Weekly goal notifications initialized');
        }
      } catch (notifError) {
        console.log('⚠️ Failed to initialize weekly goal notifications:', notifError);
      }

      if (showLogs) {
        console.log('✅ AuthContext: User authenticated successfully');
        console.log('👤 User:', userData.profile?.full_name || userData.profile?.email);
        console.log('🎯 Onboarding complete:', userData.onboarding?.is_onboarding_complete);
      }

    } catch (error: any) {
      console.error("AuthContext: Session check failed:", error.message);
      
      if (error.message.includes('timeout') || error.message.includes('Network request failed')) {
        console.log('AuthContext: Network error during session check - signing out user');
        setIsAuthenticated(false);
        setUser(null);
        setOnboarding(null);
        setLeaderboard(null);
        setHasCompletedOnboarding(false);
        setJustLoggedIn(false);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setOnboarding(null);
        setLeaderboard(null);
        setHasCompletedOnboarding(false);
        setJustLoggedIn(false);
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

    let usingFallback = false;

    try {
      if (showLogs) console.log('📊 Fetching profile data...');
      
      let profile;
      try {
        const { data: profileData, error: profileError } = await withTimeout(
          supabase.from('profiles').select('*').eq('id', sessionUser.id).single().then(res => res),
          4000
        );

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }
        
        profile = profileData || fallbackData.profile;
        if (showLogs) console.log('✅ Profile data loaded');
      } catch (profileError: any) {
        console.log('⚠️ Profile fetch failed, using fallback:', profileError.message);
        profile = fallbackData.profile;
        usingFallback = true;
      }

      let onboarding;
      try {
        if (showLogs) console.log('🎯 Fetching onboarding data...');
        
        const { data: onboardingData, error: onboardingError } = await withTimeout(
          supabase.from('onboarding_preferences').select('*').eq('user_id', sessionUser.id).single().then(res => res),
          4000
        );

        if (onboardingError && onboardingError.code !== 'PGRST116') {
          throw onboardingError;
        }

        onboarding = onboardingData || fallbackData.onboarding;
        if (showLogs) console.log('✅ Onboarding data loaded');
      } catch (onboardingError: any) {
        console.log('⚠️ Onboarding fetch failed, using fallback:', onboardingError.message);
        onboarding = fallbackData.onboarding;
        usingFallback = true;
      }

      let leaderboard;
      try {
        if (showLogs) console.log('🏆 Fetching leaderboard data...');
        
        const { data: leaderboardData, error: leaderboardError } = await withTimeout(
          supabase.from('leaderboard_stats').select('*').eq('user_id', sessionUser.id).single().then(res => res),
          4000
        );

        if (leaderboardError && leaderboardError.code !== 'PGRST116') {
          throw leaderboardError;
        }

        leaderboard = leaderboardData || fallbackData.leaderboard;
        if (showLogs) console.log('✅ Leaderboard data loaded');
      } catch (leaderboardError: any) {
        console.log('⚠️ Leaderboard fetch failed, using fallback:', leaderboardError.message);
        leaderboard = fallbackData.leaderboard;
        usingFallback = true;
      }

      return { profile, onboarding, leaderboard, usingFallback };

    } catch (error: any) {
      console.log('❌ Critical error in data fetch, using complete fallback:', error.message);
      return { ...fallbackData, usingFallback: true };
    }
  };

  // Sign in function (simplified, keeping essential parts)
  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      console.log('🔐 Starting sign in process...');
      
      const networkAvailable = await testNetworkConnectivity();
      if (!networkAvailable) {
        return { 
          error: 'No internet connection. Please check your network and try again.' 
        };
      }
      
      const authResult = await withTimeoutAndRetry(
        () => supabase.auth.signInWithPassword({ email, password }),
        10000,
        3
      );
      
      const { data: authData, error: authError } = authResult;

      if (authError) {
        console.error('❌ Authentication failed:', authError.message);
        
        // Provide more user-friendly error messages
        if (authError.message.includes('Network request failed')) {
          return { error: 'Network connection failed. Please check your internet connection and try again.' };
        } else if (authError.message.includes('Invalid login credentials')) {
          return { error: 'Invalid email or password. Please check your credentials and try again.' };
        } else if (authError.message.includes('Email not confirmed')) {
          return { error: 'Please verify your email address before signing in.' };
        } else if (authError.message.includes('Too many requests')) {
          return { error: 'Too many login attempts. Please wait a moment and try again.' };
        }
        
        return { error: `Authentication failed: ${authError.message}` };
      }

      if (!authData.user) {
        return { error: 'Authentication failed - no user data returned. Please try again.' };
      }

      setJustLoggedIn(true);
      
      // Set the login timestamp
      await setLastLoginTime();
      
      try {
        // Check for incomplete user data and ensure completeness
        await ensureUserDataCompleteness(authData.user.id);
        
        const userData = await fetchUserDataWithFallback(authData.user, true);
        
        setIsAuthenticated(true);
        setUser(userData.profile);
        setOnboarding(userData.onboarding);
        setLeaderboard(userData.leaderboard);
        setHasCompletedOnboarding(userData.onboarding?.is_onboarding_complete || false);
        
        return {};
        
      } catch (dataError: any) {
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
        
        return {};
      }

    } catch (error: any) {
      console.error('❌ Sign in failed completely:', error.message);
      return { error: 'Login failed. Please try again.' };
    }
  };

  // Enhanced sign up function with better iOS error handling
  const signUp = async (email: string, password: string, userData: any): Promise<{ error?: string }> => {
    try {
      console.log('📝 Starting sign up process...');
      
      const networkAvailable = await testNetworkConnectivity();
      if (!networkAvailable) {
        return { 
          error: 'No internet connection. Please check your network and try again.' 
        };
      }
      
      // Step 1: Create the auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: userData.username,
            full_name: userData.full_name
          }
        }
      });

      if (authError) {
        console.error('❌ Sign up failed:', authError.message);
        
        if (authError.message.includes('Network request failed')) {
          return { error: 'Network connection failed. Please check your internet connection and try again.' };
        } else if (authError.message.includes('User already registered')) {
          return { error: 'An account with this email already exists. Please try signing in instead.' };
        } else if (authError.message.includes('Invalid email')) {
          return { error: 'Please enter a valid email address.' };
        } else if (authError.message.includes('Password should be at least')) {
          return { error: 'Password must be at least 6 characters long.' };
        }
        
        return { error: authError.message };
      }

      if (!authData.user) {
        return { error: 'Account creation failed - no user data returned. Please try again.' };
      }

      console.log('✅ Auth account created, setting up database records...');
      
      // Step 2: Create database records (with enhanced error handling)
      try {
        const dbResult = await createInitialUserData(authData.user.id, {
          fullName: userData.full_name,
          username: userData.username,
          email: email,
          avatarUrl: null
        });
        
        if (!dbResult?.success) {
          console.error('❌ Database setup failed:', dbResult?.error || 'Unknown error');
          
          // Check if at least profile was created
          if (dbResult?.results?.created?.includes('profile')) {
            console.log('✅ Profile exists, user can login normally');
          } else {
            console.log('❌ No profile created - this will cause login issues');
            return { 
              error: 'Account was created but setup is incomplete. Please contact support or try signing in.' 
            };
          }
        } else {
          console.log('✅ Database records created successfully');
        }
      } catch (dbError: any) {
        console.error('❌ Database setup error:', dbError.message);
        
        // Try to ensure at least a basic profile exists
        try {
          console.log('🔧 Attempting to create minimal profile...');
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: email,
              full_name: userData.full_name,
              username: userData.username,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (profileError && !profileError.message.includes('already exists')) {
            console.error('❌ Minimal profile creation failed:', profileError);
            return { 
              error: 'Account was created but profile setup failed. Please try signing in or contact support.' 
            };
          } else {
            console.log('✅ Minimal profile created successfully');
          }
        } catch (minimalProfileError) {
          console.error('❌ Could not create minimal profile:', minimalProfileError);
          return { 
            error: 'Account was created but profile setup failed. Please try signing in or contact support.' 
          };
        }
      }

      console.log('🎉 Account creation process completed');
      return {};

    } catch (error: any) {
      console.error('❌ Sign up error:', error.message);
      return { error: 'Account creation failed. Please try again.' };
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
    } catch (error) {
      console.error('❌ Sign out error:', error);
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
      if (!user?.id) {
        console.error('❌ Cannot update onboarding: no user ID available');
        return;
      }

      // Ensure user_id is included in the data
      const updateData = {
        user_id: user.id,
        ...data,
        updated_at: new Date().toISOString()
      };

      console.log('🔄 Updating onboarding with data:', updateData);
      
      const { error } = await withTimeout(
        Promise.resolve(supabase.from('onboarding_preferences').upsert(updateData, { 
          onConflict: 'user_id' 
        }).select()),
        8000
      );
      
      if (error) throw error;
      
      setOnboarding((prev: any) => ({ ...prev, ...updateData }));
      
      // Update hasCompletedOnboarding if the update includes completion status
      if (data.is_onboarding_complete !== undefined) {
        setHasCompletedOnboarding(data.is_onboarding_complete);
        console.log('✅ Onboarding completion status updated:', data.is_onboarding_complete);
      }
      
      console.log('✅ Onboarding data updated successfully');
    } catch (error) {
      console.error('❌ Update onboarding error:', error);
      throw error; // Re-throw so calling code can handle the error
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

    // Listen for auth state changes to handle refresh token errors
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event);
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Token refreshed successfully');
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setUser(null);
        setOnboarding(null);
        setLeaderboard(null);
        setIsAuthenticated(false);
        setHasCompletedOnboarding(false);
      } else if (event === 'SIGNED_IN' && session) {
        console.log('👋 User signed in');
        await checkSession(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Clear justLoggedIn state after initial load
  useEffect(() => {
    if (isInitializing) return;
    
    const timer = setTimeout(() => {
      setJustLoggedIn(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInitializing]);

  // Clear justLoggedIn flag after navigation
  useEffect(() => {
    if (justLoggedIn) {
      const timer = setTimeout(() => {
        setJustLoggedIn(false);
      }, 2000);
    
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
    setHasCompletedOnboarding,
    justLoggedIn,
    isInitialLoading: isInitializing,
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

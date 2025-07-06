const React = require('react');
const { Platform } = require('react-native');
const { supabase } = require('./supabase');

// Import mock data helper
// Note: In production, you'd replace this with your actual Supabase service key
const mockDataHelper = require('../../scripts/mock-admin-data');

/**
 * Hooks and utilities for fetching and displaying user data from Supabase
 * This file contains functions to populate the main screens with user data
 */

// Configuration flags
const USE_MOCK_DATA = false;
const USE_DEMO_MODE = false; // Set to true to use demo data without authentication
const FORCE_DEMO_ON_MOBILE = false; // Set to true to bypass Supabase on mobile platforms
const DEMO_USER_ID = '11111111-2222-3333-4444-555555555555';

/**
 * Fetches user data from all important tables for the current user or specified user ID
 * @param {string} userId - Optional user ID (uses current session if not provided)
 * @returns {Promise<Object>} - Object containing data from all tables
 */
export async function fetchUserAppData(userId = null) {
  // Add authentication check with fallback
  if (!userId) {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session error in fetchUserAppData:', sessionError.message);
        return getMobileDemoData('demo-user-fallback');
      }
      
      if (!session?.user) {
        console.warn('No authenticated user found, using demo data');
        return getMobileDemoData('demo-user-fallback');
      }
      
      userId = session.user.id;
    } catch (authError) {
      console.warn('Authentication check failed, using demo data:', authError.message);
      return getMobileDemoData('demo-user-fallback');
    }
  }

  // Use demo mode if enabled or if no user ID
  if (USE_DEMO_MODE || !userId) {
    console.log('📱 Using demo data mode');
    return getMobileDemoData(userId || 'demo-user-fallback');
  }

  try {
    console.log('📊 Fetching user app data for user:', userId);
    
    // Enhanced parallel fetching with better error handling
    const fetchWithFallback = async (tableName, query) => {
      try {
        const result = await query;
        if (result.error) {
          console.warn(`Table '${tableName}' error:`, result.error.message);
          return { data: null, error: result.error };
        }
        return result;
      } catch (err) {
        console.warn(`Table '${tableName}' fetch failed:`, err.message);
        return { data: null, error: err };
      }
    };

    const [
      profileResult,
      onboardingResult,
      leaderboardResult,
      sessionsResult,
      tasksResult,
      achievementsResult,
      settingsResult,
      insightsResult,
      metricsResult,
      friendsResult
    ] = await Promise.all([
      fetchWithFallback('profiles', supabase.from('profiles').select('*').eq('id', userId).single()),
      fetchWithFallback('onboarding_preferences', supabase.from('onboarding_preferences').select('*').eq('user_id', userId).single()),
      fetchWithFallback('leaderboard_stats', supabase.from('leaderboard_stats').select('*').eq('user_id', userId).single()),
      fetchWithFallback('focus_sessions', supabase.from('focus_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)),
      fetchWithFallback('tasks', supabase.from('tasks').select(`
        *,
        subtasks:subtasks(*)
      `).eq('user_id', userId).order('created_at', { ascending: false })),
      fetchWithFallback('achievements', supabase.from('achievements').select('*').eq('user_id', userId).order('earned_at', { ascending: false })),
      fetchWithFallback('user_settings', supabase.from('user_settings').select('*').eq('user_id', userId).single()),
      fetchWithFallback('ai_insights', supabase.from('ai_insights').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)),
      fetchWithFallback('learning_metrics', supabase.from('learning_metrics').select('*').eq('user_id', userId).single()),
      fetchWithFallback('user_friends', supabase.from('user_friends').select('*').eq('user_id', userId))
    ]);

    // Process results with comprehensive fallbacks
    const profile = profileResult.data || { id: userId, email: '', full_name: 'Study User' };
    const onboarding = onboardingResult.data || { 
      user_id: userId,
      focus_method: 'Balanced',
      sound_preference: 'Lo-Fi',
      weekly_focus_goal: 10,
      is_onboarding_complete: true
    };
    const leaderboard = leaderboardResult.data || { 
      user_id: userId,
      total_focus_time: 0,
      level: 1,
      points: 0,
      current_streak: 0
    };
    const sessions = sessionsResult.data || [];
    const tasks = tasksResult.data || [];
    const achievements = achievementsResult.data || [];
    const settings = settingsResult.data || {
      user_id: userId,
      auto_play_sound: true,
      music_volume: 0.7,
      notifications_enabled: true
    };
    const insights = insightsResult.data || [];
    const metrics = metricsResult.data || { user_id: userId };
    const friends = friendsResult.data || [];

    // Calculate derived data
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weeklyFocusTime = (sessions || [])
      .filter(session => {
        const sessionDate = new Date(session.created_at);
        return sessionDate >= weekStart && session.status === 'completed';
      })
      .reduce((total, session) => total + (session.duration || 0), 0);

    // Daily focus data for the past 7 days
    const dailyFocusData = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = daysOfWeek[date.getDay()];
      
      const dateString = date.toISOString().split('T')[0];
      
      const daySessionsMinutes = (sessions || [])
        .filter(session => {
          const sessionDate = session.created_at ? session.created_at.split('T')[0] : '';
          return sessionDate === dateString && session.status === 'completed';
        })
        .reduce((total, session) => total + (session.duration || 0), 0);

      dailyFocusData.push({
        day: dayName,
        hours: Math.round(daySessionsMinutes / 60 * 10) / 10,
        date: dateString
      });
    }

    // Daily task completion data
    const dailyTasksCompleted = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = daysOfWeek[date.getDay()];
      const dateString = date.toISOString().split('T')[0];
      
      const completedCount = (tasks || [])
        .filter(task => {
          if (task.status !== 'completed') return false;
          const taskDate = (task.updated_at || task.created_at).split('T')[0];
          return taskDate === dateString;
        }).length;

      dailyTasksCompleted.push({
        day: dayName,
        count: completedCount,
        date: dateString
      });
    }

    console.log('📊 User data compiled successfully:', {
      tasksCount: tasks.length,
      sessionsCount: sessions.length,
      weeklyFocusTime: weeklyFocusTime
    });

    return {
      profile,
      onboarding,
      leaderboard,
      sessions,
      tasks,
      achievements,
      settings,
      insights,
      metrics,
      friends,
      
      // Derived data
      weeklyFocusTime,
      dailyFocusData,
      dailyTasksCompleted,
      
      // Helper data
      activeTasks: (tasks || []).filter(task => task.status !== 'completed'),
      completedTasks: (tasks || []).filter(task => task.status === 'completed'),
      activeSession: (sessions || []).find(session => session.status === 'active')
    };

  } catch (error) {
    console.error('Error fetching user app data:', error);
    console.log('📱 Falling back to demo data due to error');
    return getMobileDemoData(userId || 'demo-user-fallback');
  }
}

/**
 * React hook for fetching user data
 */
export function useUserAppData() {
  const [data, setData] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  const refreshData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userData = await fetchUserAppData();
      setData(userData);
    } catch (err) {
      console.error('Error in useUserAppData:', err);
      setError(err.message);
      // Even on error, provide demo data
      const fallbackData = getMobileDemoData('demo-user-fallback');
      setData(fallbackData);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  React.useEffect(() => {
    refreshData();
  }, [refreshData]);
  
  return { data, isLoading, error, refreshData };
}

/**
 * Get daily inspiration quote
 * @returns {Promise<string>} - A motivational quote
 */
export async function getDailyInspiration() {
  const quotes = [
    "The secret of getting ahead is getting started.",
    "Your focus determines your reality.",
    "The best way to predict your future is to create it.",
    "Learning is not attained by chance, it must be sought with ardor and attended to with diligence.",
    "The more that you read, the more things you will know. The more that you learn, the more places you'll go.",
    "It always seems impossible until it's done.",
    "The expert in anything was once a beginner.",
    "Knowledge is power.",
    "All our dreams can come true, if we have the courage to pursue them.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts."
  ];
  
  // Get a consistent quote based on the day
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const quoteIndex = dayOfYear % quotes.length;
  
  return quotes[quoteIndex];
}

/**
 * Get leaderboard data including friends and global rankings
 */
export async function getLeaderboardData() {
  // Use mock data for development if flag is set
  if (USE_MOCK_DATA) {
    console.log('Using mock leaderboard data');
    const mockData = mockDataHelper.getMockAdminData();
    
    // Format friends for leaderboard
    const friendsLeaderboard = mockData.friends.map(f => ({
      user_id: f.friend.id,
      total_focus_time: Math.floor(Math.random() * 6000) + 2000,
      weekly_focus_time: Math.floor(Math.random() * 600) + 200,
      points: Math.floor(Math.random() * 800) + 300,
      level: Math.floor(Math.random() * 4) + 1,
      current_streak: Math.floor(Math.random() * 6) + 1,
      is_current_user: false,
      display_name: f.friend.full_name,
      avatar_url: f.friend.avatar_url,
    }));
    
    // Add current user
    friendsLeaderboard.push({
      ...mockData.leaderboard,
      is_current_user: true,
      display_name: 'You',
      avatar_url: mockData.profile.avatar_url
    });
    
    // Sort by points
    friendsLeaderboard.sort((a, b) => (b.points || 0) - (a.points || 0));
    
    // Generate global leaderboard (slightly different scores)
    const globalLeaderboard = [...friendsLeaderboard];
    for (let i = 0; i < 5; i++) {
      globalLeaderboard.push({
        user_id: `global-user-${i}`,
        total_focus_time: Math.floor(Math.random() * 8000) + 4000,
        weekly_focus_time: Math.floor(Math.random() * 800) + 400,
        points: Math.floor(Math.random() * 1200) + 500,
        level: Math.floor(Math.random() * 5) + 3,
        current_streak: Math.floor(Math.random() * 8) + 3,
        is_current_user: false,
        display_name: `User ${i+1}`,
        avatar_url: null
      });
    }
    
    // Sort global by points
    globalLeaderboard.sort((a, b) => (b.points || 0) - (a.points || 0));
    
    return {
      userEntry: mockData.leaderboard,
      friendsLeaderboard,
      globalLeaderboard
    };
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('No authenticated user');
    }
    
    const userId = session.user.id;
    
    // Get current user's leaderboard entry using correct table name
    const { data: userEntry, error: userError } = await supabase
      .from('leaderboard_stats')
      .select('*, profiles!leaderboard_stats_user_id_fkey(username, full_name, avatar_url)')
      .eq('user_id', userId)
      .single();
      
    if (userError && userError.code !== 'PGRST116') {
      console.error('Error fetching user leaderboard:', userError);
    }
    
    // Try to get friends' leaderboard entries
    let friendsLeaderboard = [];
    try {
      // Check if user_friends table exists
      const { data: friendsData, error: friendsError } = await supabase
        .from('user_friends')
        .select('friend_id')
        .eq('user_id', userId)
        .eq('status', 'accepted');
        
      if (!friendsError && friendsData && friendsData.length > 0) {
        const friendIds = friendsData.map(f => f.friend_id);
        
        // Get leaderboard data for friends
        const { data: friendsLeaderboardData, error: friendsLeaderboardError } = await supabase
          .from('leaderboard_stats')
          .select('*, profiles!leaderboard_stats_user_id_fkey(username, full_name, avatar_url)')
          .in('user_id', friendIds);
          
        if (!friendsLeaderboardError) {
          friendsLeaderboard = (friendsLeaderboardData || []).map(entry => ({
            ...entry,
            is_current_user: false,
            display_name: entry.profiles?.full_name || entry.profiles?.username || 'Unknown User',
            avatar_url: entry.profiles?.avatar_url,
          }));
        }
      }
    } catch (friendsErr) {
      console.warn('Friends table not available, using empty friends list:', friendsErr);
      // Continue with empty friends list
    }
    
    // Add current user to friends leaderboard
    if (userEntry) {
      friendsLeaderboard.push({
        ...userEntry,
        is_current_user: true,
        display_name: 'You',
        avatar_url: userEntry.profiles?.avatar_url
      });
    }
    
    // Sort by points (descending)
    friendsLeaderboard.sort((a, b) => (b.points || 0) - (a.points || 0));
    
    // Get global leaderboard (top users) using correct table name
    const { data: globalData, error: globalError } = await supabase
      .from('leaderboard_stats')
      .select('*, profiles!leaderboard_stats_user_id_fkey(username, full_name, avatar_url)')
      .order('points', { ascending: false })
      .limit(10);
      
    if (globalError) {
      console.error('Error fetching global leaderboard:', globalError);
    }
    
    // Format global data for display
    const globalLeaderboard = (globalData || [])
      .map(entry => ({
        ...entry,
        is_current_user: entry.user_id === userId,
        display_name: entry.user_id === userId ? 'You' : (entry.profiles?.full_name || entry.profiles?.username || 'Unknown User'),
        avatar_url: entry.profiles?.avatar_url
      }));
    
    return {
      userEntry: userEntry || null,
      friendsLeaderboard,
      globalLeaderboard
    };
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    
    // Return fallback data to prevent app crashes
    return {
      userEntry: null,
      friendsLeaderboard: [],
      globalLeaderboard: []
    };
  }
}

/**
 * Returns demo data for mobile platforms without any Supabase calls
 * This ensures the app works reliably on iOS even with network issues
 */
function getMobileDemoData(userId) {
  console.log('Generating mobile demo data for user:', userId);
  
  // Use the same demo data that was added to fallbacks earlier
  const profile = {
    id: userId,
    username: 'demo_user',
    full_name: 'Demo User',
    avatar_url: null,
    university: 'Demo University',
    status: 'active'
  };
  
  const onboarding = {
    user_id: userId,
    preferred_study_duration: 25,
    preferred_break_duration: 5,
    study_goals: ['focus', 'productivity'],
    completed_at: new Date().toISOString(),
    is_onboarding_complete: true
  };
  
  const leaderboard = {
    user_id: userId,
    total_focus_time: 150,
    sessions_completed: 6,
    current_streak: 3,
    longest_streak: 7,
    total_points: 180,
    rank_position: 1,
    achievements_count: 3
  };
  
  const sessions = [
    {
      id: 'demo-session-1',
      user_id: userId,
      start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      duration: 45,
      intended_duration: 45,
      status: 'completed',
      focus_quality: 8,
      interruptions: 1,
      session_type: 'study',
      subject: 'Mathematics',
      notes: 'Great focus on algebra problems',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      session_reflections: []
    },
    {
      id: 'demo-session-2',
      user_id: userId,
      start_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000).toISOString(),
      duration: 25,
      intended_duration: 25,
      status: 'completed',
      focus_quality: 9,
      interruptions: 0,
      session_type: 'study',
      subject: 'Chemistry',
      notes: 'Solid session on chemical bonding',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      session_reflections: []
    }
  ];
  
  const tasks = [
    {
      id: 'demo-task-1',
      user_id: userId,
      title: 'Review Mathematics Chapter 5',
      description: 'Complete exercises 1-15 and review concept summary',
      priority: 'high',
      status: 'pending',
      category: 'Mathematics',
      estimated_minutes: 45,
      actual_minutes: null,
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: null,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      subtasks: [
        {
          id: 'demo-subtask-1',
          task_id: 'demo-task-1',
          title: 'Read theory section',
          completed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'demo-subtask-2',
          task_id: 'demo-task-1',
          title: 'Complete practice problems',
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    },
    {
      id: 'demo-task-2',
      user_id: userId,
      title: 'Prepare Chemistry Lab Report',
      description: 'Write up findings from last week\'s titration experiment',
      priority: 'medium',
      status: 'in_progress',
      category: 'Chemistry',
      estimated_minutes: 90,
      actual_minutes: 30,
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: null,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      subtasks: []
    },
    {
      id: 'demo-task-4',
      user_id: userId,
      title: 'Complete Programming Assignment',
      description: 'Implement binary search algorithm and write unit tests',
      priority: 'medium',
      status: 'completed',
      category: 'Computer Science',
      estimated_minutes: 180,
      actual_minutes: 165,
      due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      subtasks: []
    }
  ];
  
  const achievements = [
    {
      id: 'demo-achievement-1',
      user_id: userId,
      achievement_type: 'streak',
      title: 'Study Streak Starter',
      description: 'Completed 3 days of focused study sessions in a row',
      icon: '🔥',
      points_awarded: 50,
      unlocked_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'motivation',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  const insights = [
    {
      id: 'demo-insight-1',
      user_id: userId,
      insight_type: 'tip',
      title: 'Peak Focus Time',
      content: 'You tend to be most productive between 2-4 PM. Consider scheduling your most challenging tasks during this time.',
      priority: 'medium',
      category: 'productivity',
      read_at: null,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  const metrics = {
    user_id: userId,
    total_study_time: 300,
    average_session_length: 26,
    focus_score: 85,
    productivity_trend: 'improving',
    weekly_goal: 600,
    weekly_progress: 300
  };
  
  const settings = {
    user_id: userId,
    theme: 'auto',
    notifications_enabled: true,
    study_reminders: true,
    break_reminders: true,
    daily_goal_minutes: 120,
    preferred_session_length: 25,
    preferred_break_length: 5
  };
  
  // Calculate derived data
  const weeklyFocusTime = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
  const dailyFocusData = [
    { day: 'Mon', hours: 1.2, date: '2025-06-02' },
    { day: 'Tue', hours: 0.8, date: '2025-06-03' },
    { day: 'Wed', hours: 1.5, date: '2025-06-04' },
    { day: 'Thu', hours: 0.0, date: '2025-06-05' },
    { day: 'Fri', hours: 2.1, date: '2025-06-06' },
    { day: 'Sat', hours: 1.0, date: '2025-06-07' },
    { day: 'Sun', hours: 0.5, date: '2025-06-08' }
  ];
  const dailyTasksCompleted = [
    { day: 'Mon', count: 3, date: '2025-06-02' },
    { day: 'Tue', count: 2, date: '2025-06-03' },
    { day: 'Wed', count: 5, date: '2025-06-04' },
    { day: 'Thu', count: 1, date: '2025-06-05' },
    { day: 'Fri', count: 4, date: '2025-06-06' },
    { day: 'Sat', count: 2, date: '2025-06-07' },
    { day: 'Sun', count: 1, date: '2025-06-08' }
  ];
  
  return {
    profile,
    onboarding,
    leaderboard,
    sessions,
    tasks,
    achievements,
    insights,
    metrics,
    friends: [],
    settings,
    
    // Derived data
    weeklyFocusTime,
    dailyFocusData,
    dailyTasksCompleted,
    
    // Helper data
    activeTasks: tasks.filter(task => task.status !== 'completed'),
    completedTasks: tasks.filter(task => task.status === 'completed'),
    activeSession: null,
    errors: []
  };
}

// Explicit exports for CommonJS compatibility
module.exports = {
  fetchUserAppData,
  useUserAppData,
  getDailyInspiration,
  getLeaderboardData
};

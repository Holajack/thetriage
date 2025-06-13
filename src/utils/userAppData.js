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
  // Use mock data for development if flag is set
  if (USE_MOCK_DATA) {
    console.log('Using mock admin user data instead of Supabase API calls');
    return mockDataHelper.getMockAdminData();
  }
  
  // Force demo mode on mobile platforms to avoid iOS issues
  const shouldUseDemoMode = USE_DEMO_MODE || (FORCE_DEMO_ON_MOBILE && Platform.OS !== 'web');
  
  // Use demo mode for testing without authentication
  if (shouldUseDemoMode) {
    console.log('Using demo mode with test user ID (mobile platform detected)');
    userId = DEMO_USER_ID;
    
    // On mobile, skip Supabase calls entirely and return demo data directly
    if (Platform.OS !== 'web' && FORCE_DEMO_ON_MOBILE) {
      console.log('Mobile platform detected: returning demo data without Supabase calls');
      return getMobileDemoData(userId);
    }
  }
  
  try {
    // If no userId provided, get from current session
    if (!userId && !USE_DEMO_MODE) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No authenticated user found');
      }
      userId = session.user.id;
    }
    
    // Fetch data from multiple tables in parallel
    const [
      profileResult,
      onboardingResult,
      leaderboardResult,
      sessionsResult,
      tasksResult,
      achievementsResult,
      insightsResult,
      metricsResult,
      friendsResult,
      settingsResult
    ] = await Promise.all([
      // User profile
      supabase.from('profiles').select('*').eq('id', userId).single(),
      
      // Onboarding preferences
      supabase.from('onboarding_preferences').select('*').eq('user_id', userId).single(),
      
      // Leaderboard stats
      supabase.from('leaderboard_stats').select('*').eq('user_id', userId).single(),
      
      // Focus sessions (limited to recent)
      supabase.from('focus_sessions')
        .select('*, session_reflections(*)')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .limit(20),
      
      // Tasks with subtasks
      supabase.from('tasks')
        .select(`
          *,
          subtasks:subtasks(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // Achievements
      supabase.from('achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false }),
      
      // AI insights
      supabase.from('ai_insights')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Learning metrics
      supabase.from('learning_metrics')
        .select('*')
        .eq('user_id', userId)
        .single(),
        
      // Friends
      supabase.from('user_friends')
        .select(`
          *,
          friend:friend_id(id, username, full_name, avatar_url, university, status)
        `)
        .eq('user_id', userId)
        .eq('status', 'accepted'),
        
      // User settings
      supabase.from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()
    ]);
    
    // Handle any errors from the queries with fallback data
    const errors = [];
    
    // Create fallback data for missing or failed queries
    const getDataOrFallback = (result, tableName, fallbackData = null) => {
      if (result.error) {
        errors.push({ table: tableName, error: result.error });
        console.warn(`Table '${tableName}' error: ${result.error.message}`);
        
        // Provide fallback data for missing tables
        if (result.error.message.includes('does not exist')) {
          console.log(`Using fallback data for missing table: ${tableName}`);
          return fallbackData;
        }
        return null;
      }
      return result.data;
    };
    
    // Get data with fallbacks
    const profile = getDataOrFallback(profileResult, 'profiles', {
      id: userId,
      username: 'demo_user',
      full_name: 'Demo User',
      avatar_url: null,
      university: 'Demo University',
      status: 'active'
    });
    
    const onboarding = getDataOrFallback(onboardingResult, 'onboarding_preferences', {
      user_id: userId,
      preferred_study_duration: 25,
      preferred_break_duration: 5,
      study_goals: ['focus', 'productivity'],
      completed_at: new Date().toISOString()
    });
    
    const leaderboard = getDataOrFallback(leaderboardResult, 'leaderboard_stats', {
      user_id: userId,
      total_focus_time: 150,
      sessions_completed: 6,
      current_streak: 3,
      longest_streak: 7,
      total_points: 180,
      rank_position: 1,
      achievements_count: 3
    });
    
    const sessions = getDataOrFallback(sessionsResult, 'focus_sessions', [
      {
        id: 'demo-session-1',
        user_id: userId,
        start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        end_time: new Date(Date.now() - 75 * 60 * 1000).toISOString(), // 1h 15m ago
        duration: 45, // minutes
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
        start_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
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
      },
      {
        id: 'demo-session-3',
        user_id: userId,
        start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        end_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
        duration: 90,
        intended_duration: 60,
        status: 'completed',
        focus_quality: 7,
        interruptions: 2,
        session_type: 'deep_work',
        subject: 'Computer Science',
        notes: 'Long coding session, got into flow state',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        session_reflections: []
      },
      {
        id: 'demo-session-4',
        user_id: userId,
        start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
        duration: 30,
        intended_duration: 30,
        status: 'completed',
        focus_quality: 6,
        interruptions: 3,
        session_type: 'review',
        subject: 'History',
        notes: 'Review session with some distractions',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        session_reflections: []
      },
      {
        id: 'demo-session-5',
        user_id: userId,
        start_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
        end_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 50 * 60 * 1000).toISOString(),
        duration: 50,
        intended_duration: 45,
        status: 'completed',
        focus_quality: 9,
        interruptions: 0,
        session_type: 'study',
        subject: 'Mathematics',
        notes: 'Excellent focus on calculus derivatives',
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        session_reflections: []
      }
    ]);
    const tasks = getDataOrFallback(tasksResult, 'tasks', [
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
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        completed_at: null,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
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
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        completed_at: null,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        updated_at: new Date().toISOString(),
        subtasks: []
      },
      {
        id: 'demo-task-3',
        user_id: userId,
        title: 'Study for History Midterm',
        description: 'Review chapters 8-12, focus on key dates and figures',
        priority: 'high',
        status: 'pending',
        category: 'History',
        estimated_minutes: 120,
        actual_minutes: null,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        completed_at: null,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        subtasks: [
          {
            id: 'demo-subtask-3',
            task_id: 'demo-task-3',
            title: 'Review chapter 8',
            completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'demo-subtask-4',
            task_id: 'demo-task-3',
            title: 'Make timeline of events',
            completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
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
        due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        completed_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        subtasks: [
          {
            id: 'demo-subtask-5',
            task_id: 'demo-task-4',
            title: 'Write algorithm implementation',
            completed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'demo-subtask-6',
            task_id: 'demo-task-4',
            title: 'Write unit tests',
            completed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      }
    ]);
    const achievements = getDataOrFallback(achievementsResult, 'achievements', [
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
      },
      {
        id: 'demo-achievement-2',
        user_id: userId,
        achievement_type: 'task',
        title: 'Task Master',
        description: 'Completed 10 tasks this week',
        icon: '✅',
        points_awarded: 30,
        unlocked_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'productivity',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'demo-achievement-3',
        user_id: userId,
        achievement_type: 'focus',
        title: 'Deep Focus',
        description: 'Completed a 90-minute focused study session',
        icon: '🎯',
        points_awarded: 40,
        unlocked_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'focus',
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]);
    const insights = getDataOrFallback(insightsResult, 'ai_insights', [
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
      },
      {
        id: 'demo-insight-2',
        user_id: userId,
        insight_type: 'recommendation',
        title: 'Break Reminder',
        content: 'You\'ve been studying for 45 minutes. Taking a 5-10 minute break can help maintain focus and retention.',
        priority: 'high',
        category: 'wellness',
        read_at: null,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'demo-insight-3',
        user_id: userId,
        insight_type: 'suggestion',
        title: 'Study Method Variety',
        content: 'Try mixing active recall techniques with your current study methods. This can improve retention by up to 40%.',
        priority: 'medium',
        category: 'technique',
        read_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]);
    const metrics = getDataOrFallback(metricsResult, 'learning_metrics', {
      user_id: userId,
      total_study_time: 300,
      average_session_length: 26,
      focus_score: 85,
      productivity_trend: 'improving',
      weekly_goal: 600,
      weekly_progress: 300
    });
    
    const friends = getDataOrFallback(friendsResult, 'user_friends', []);
    const settings = getDataOrFallback(settingsResult, 'user_settings', {
      user_id: userId,
      theme: 'auto',
      notifications_enabled: true,
      study_reminders: true,
      break_reminders: true,
      daily_goal_minutes: 120,
      preferred_session_length: 25,
      preferred_break_length: 5
    });
    
    if (errors.length > 0) {
      console.warn('Errors fetching user data (using fallbacks where possible):', errors);
    }

    // Calculate weekly focus time from sessions
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyFocusSessions = (sessions || []).filter(session => {
      const sessionDate = new Date(session.start_time);
      return sessionDate >= weekAgo && session.status === 'completed';
    });
    
    const weeklyFocusTime = weeklyFocusSessions.reduce((sum, session) => {
      return sum + (session.duration || 0);
    }, 0);
    
    // Format daily focus time for charts
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const dailyFocusData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = daysOfWeek[date.getDay()];
      
      // Format date as YYYY-MM-DD for comparison
      const dateString = date.toISOString().split('T')[0];
      
      const daySessionsMinutes = (sessions || [])
        .filter(session => {
          const sessionDate = session.start_time.split('T')[0];
          return sessionDate === dateString && session.status === 'completed';
        })
        .reduce((sum, session) => sum + (session.duration || 0), 0);
      
      // Convert minutes to hours for better display
      dailyFocusData.push({
        day: dayName,
        hours: Math.round(daySessionsMinutes / 60 * 10) / 10, // Round to 1 decimal place
        date: dateString
      });
    }
    
    // Format task completion data
    const dailyTasksCompleted = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = daysOfWeek[date.getDay()];
      
      // Format date as YYYY-MM-DD for comparison
      const dateString = date.toISOString().split('T')[0];
      
      const completedCount = (tasks || [])
        .filter(task => {
          // For completed tasks, check updated_at date
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

    // Return the compiled data
    return {
      profile: profile || {},
      onboarding: onboarding || {},
      leaderboard: leaderboard || {},
      sessions: sessions || [],
      tasks: tasks || [],
      achievements: achievements || [],
      settings: settings || {},
      insights: insights || [],
      metrics: metrics || {},
      friends: friends || [],
      
      // Derived data for easy access
      weeklyFocusTime,
      dailyFocusData,
      dailyTasksCompleted,
      
      // Helper data
      activeTasks: (tasksResult.data || []).filter(task => task.status !== 'completed'),
      completedTasks: (tasksResult.data || []).filter(task => task.status === 'completed'),
      activeSession: (sessionsResult.data || []).find(session => session.status === 'active'),
      errors
    };
  } catch (error) {
    console.error('Error fetching user app data:', error);
    throw error;
  }
}

/**
 * React hook to fetch and use user data across the app
 */
export function useUserAppData() {
  const [data, setData] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const userData = await fetchUserAppData();
        setData(userData);
      } catch (err) {
        setError(err);
        console.error('Error in useUserAppData:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);
  
  const refreshData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const userData = await fetchUserAppData();
      setData(userData);
      return userData;
    } catch (err) {
      setError(err);
      console.error('Error refreshing user data:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
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
    
    // Get current user's leaderboard entry
    const { data: userEntry, error: userError } = await supabase
      .from('leaderboard_stats')
      .select('*, profiles:user_id(username, full_name, avatar_url)')
      .eq('user_id', userId)
      .single();
      
    if (userError) {
      console.error('Error fetching user leaderboard:', userError);
    }
    
    // Get friends' leaderboard entries
    const { data: friendsData, error: friendsError } = await supabase
      .from('friends')
      .select(`
        friend_id,
        leaderboard:friend_id(
          user_id,
          total_focus_time,
          weekly_focus_time,
          points,
          level,
          current_streak,
          profiles:user_id(username, full_name, avatar_url)
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');
      
    if (friendsError) {
      console.error('Error fetching friends leaderboard:', friendsError);
    }
    
    // Format friends data for display
    const friendsLeaderboard = (friendsData || [])
      .map(item => item.leaderboard)
      .filter(Boolean)
      .map(entry => ({
        ...entry,
        is_current_user: false,
        display_name: entry.profiles?.full_name || 'Unknown User',
        avatar_url: entry.profiles?.avatar_url,
      }));
    
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
    
    // Get global leaderboard (top users)
    const { data: globalData, error: globalError } = await supabase
      .from('leaderboard_stats')
      .select('*, profiles:user_id(username, full_name, avatar_url)')
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
        display_name: entry.is_current_user ? 'You' : entry.profiles?.full_name || 'Unknown User',
        avatar_url: entry.profiles?.avatar_url
      }));
    
    return {
      userEntry: userEntry || null,
      friendsLeaderboard,
      globalLeaderboard
    };
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    throw error;
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

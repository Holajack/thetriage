
/**
 * User Data Creation Utilities
 * 
 * This file contains functions to create initial data for new users
 * when they complete registration or onboarding.
 */

import { supabase } from './supabase';

/**
 * Creates initial data for a new user across all required tables
 * This is called after user registration to populate their account
 * @param {string} userId - The user's ID from Supabase Auth
 * @param {Object} profileData - Basic profile information
 * @returns {Promise<Object>} - Result of data creation
 */
export async function createInitialUserData(userId, profileData = {}) {
  console.log(`Creating initial data for user: ${userId}`);
  
  try {
    // 1. Create user profile
    const profileResult = await createUserProfile(userId, profileData);
    
    // 2. Create onboarding data
    const onboardingResult = await createUserOnboarding(userId);
    
    // 3. Create settings
    const settingsResult = await createUserSettings(userId);
    
    // 4. Create initial leaderboard stats
    const leaderboardResult = await createInitialLeaderboardStats(userId);
    
    // 5. Create initial learning metrics
    const metricsResult = await createInitialLearningMetrics(userId);
    
    // 6. Create welcome tasks
    const tasksResult = await createWelcomeTasks(userId);
    
    // 7. Create initial achievements
    const achievementsResult = await createInitialAchievements(userId);
    
    // 8. Create welcome insights
    const insightsResult = await createWelcomeInsights(userId);
    
    return {
      success: true,
      userId,
      results: {
        profile: profileResult,
        onboarding: onboardingResult,
        settings: settingsResult,
        leaderboard: leaderboardResult,
        metrics: metricsResult,
        tasks: tasksResult,
        achievements: achievementsResult,
        insights: insightsResult
      }
    };
    
  } catch (error) {
    console.error('Error creating user data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Creates user profile entry
 */
async function createUserProfile(userId, profileData) {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      full_name: profileData.fullName || 'New User',
      avatar_url: profileData.avatarUrl || null,
      current_streak: 0,
      longest_streak: 0,
      total_focus_time: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Creates user onboarding data
 */
async function createUserOnboarding(userId) {
  const { data, error } = await supabase
    .from('user_onboarding')
    .insert({
      user_id: userId,
      welcome_completed: true,
      goals_set: false,
      first_session_completed: false,
      profile_customized: false,
      completed_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Creates user settings with defaults
 */
async function createUserSettings(userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .insert({
      user_id: userId,
      notifications_enabled: true,
      daily_goal_minutes: 60,
      preferred_session_length: 25,
      break_length: 5,
      theme: 'light',
      sound_enabled: true,
      reminder_frequency: 'daily',
      privacy_mode: false,
      auto_start_breaks: true,
      show_motivational_quotes: true
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Creates initial leaderboard stats
 */
async function createInitialLeaderboardStats(userId) {
  const { data, error } = await supabase
    .from('user_leaderboard_stats')
    .insert({
      user_id: userId,
      total_focus_time: 0,
      sessions_completed: 0,
      current_streak: 0,
      achievements_unlocked: 0,
      rank_position: 1000, // Start with a high rank
      weekly_focus_time: 0,
      monthly_focus_time: 0,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Creates initial learning metrics
 */
async function createInitialLearningMetrics(userId) {
  const { data, error } = await supabase
    .from('learning_metrics')
    .insert({
      user_id: userId,
      total_study_time: 0,
      average_session_length: 0,
      focus_score: 0,
      productivity_rating: 0,
      subjects_studied: 0,
      goals_completed: 0,
      week_start: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Creates welcome/onboarding tasks
 */
async function createWelcomeTasks(userId) {
  const welcomeTasks = [
    {
      user_id: userId,
      title: 'Complete your first focus session',
      description: 'Start with a 25-minute Pomodoro session to get familiar with the timer',
      priority: 'high',
      status: 'pending',
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      category: 'onboarding',
      estimated_minutes: 25,
      created_at: new Date().toISOString()
    },
    {
      user_id: userId,
      title: 'Set your daily study goals',
      description: 'Define how much time you want to study each day',
      priority: 'medium',
      status: 'pending',
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      category: 'setup',
      estimated_minutes: 10,
      created_at: new Date().toISOString()
    },
    {
      user_id: userId,
      title: 'Explore the app features',
      description: 'Take a look at analytics, leaderboards, and brain mapping',
      priority: 'low',
      status: 'pending',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      category: 'exploration',
      estimated_minutes: 15,
      created_at: new Date().toISOString()
    }
  ];
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(welcomeTasks)
    .select();
  
  if (error) throw error;
  return data;
}

/**
 * Creates initial achievements for new users
 */
async function createInitialAchievements(userId) {
  const welcomeAchievement = {
    user_id: userId,
    achievement_type: 'welcome',
    title: 'Welcome to Study Tracker!',
    description: 'You\'ve successfully joined the Study Tracker community',
    icon: '🎉',
    points_awarded: 10,
    unlocked_at: new Date().toISOString(),
    category: 'milestone'
  };
  
  const { data, error } = await supabase
    .from('achievements')
    .insert(welcomeAchievement)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Creates welcome insights for new users
 */
async function createWelcomeInsights(userId) {
  const welcomeInsights = [
    {
      user_id: userId,
      insight_type: 'tip',
      title: 'Welcome to Study Tracker!',
      content: 'Start with short 25-minute focus sessions and gradually increase as you build your concentration muscle.',
      priority: 'high',
      category: 'onboarding',
      created_at: new Date().toISOString()
    },
    {
      user_id: userId,
      insight_type: 'recommendation',
      title: 'Set Your Daily Goal',
      content: 'Research shows that setting specific daily goals increases productivity by 25%. Start with a goal that feels achievable.',
      priority: 'medium',
      category: 'productivity',
      created_at: new Date().toISOString()
    }
  ];
  
  const { data, error } = await supabase
    .from('ai_insights')
    .insert(welcomeInsights)
    .select();
  
  if (error) throw error;
  return data;
}

/**
 * Checks if user has all required data, creates missing pieces
 * This is useful for existing users who might be missing some table entries
 */
export async function ensureUserDataCompleteness(userId) {
  console.log(`Checking data completeness for user: ${userId}`);
  
  try {
    const missingData = [];
    
    // Check each table and create missing data
    const tables = [
      { name: 'user_profiles', createFn: createUserProfile },
      { name: 'user_onboarding', createFn: createUserOnboarding },
      { name: 'user_settings', createFn: createUserSettings },
      { name: 'user_leaderboard_stats', createFn: createInitialLeaderboardStats },
      { name: 'learning_metrics', createFn: createInitialLearningMetrics }
    ];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') { // No rows returned
        console.log(`Creating missing ${table.name} for user ${userId}`);
        await table.createFn(userId);
        missingData.push(table.name);
      }
    }
    
    return {
      success: true,
      hadMissingData: missingData.length > 0,
      createdTables: missingData
    };
    
  } catch (error) {
    console.error('Error ensuring data completeness:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Demo data creation for testing (creates more realistic data)
 */
export async function createDemoUserData(userId) {
  console.log(`Creating demo data for user: ${userId}`);
  
  try {
    // First create initial data
    await createInitialUserData(userId, {
      fullName: 'Demo User',
      avatarUrl: null
    });
    
    // Then add some demo activities
    await createDemoSessions(userId);
    await createDemoTasks(userId);
    await createDemoAchievements(userId);
    
    return { success: true };
  } catch (error) {
    console.error('Error creating demo data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Creates demo focus sessions
 */
async function createDemoSessions(userId) {
  const sessions = [];
  const now = new Date();
  
  // Create sessions for the last week
  for (let i = 0; i < 7; i++) {
    const sessionDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const sessionCount = Math.floor(Math.random() * 4) + 1; // 1-4 sessions per day
    
    for (let j = 0; j < sessionCount; j++) {
      sessions.push({
        user_id: userId,
        duration_minutes: 25 + Math.floor(Math.random() * 35), // 25-60 minutes
        start_time: new Date(sessionDate.getTime() + j * 2 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(sessionDate.getTime() + j * 2 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
        focus_score: 70 + Math.floor(Math.random() * 30), // 70-100%
        session_type: 'focus',
        completed: true,
        created_at: sessionDate.toISOString()
      });
    }
  }
  
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert(sessions)
    .select();
  
  if (error) throw error;
  return data;
}

/**
 * Creates demo tasks
 */
async function createDemoTasks(userId) {
  const demoTasks = [
    {
      user_id: userId,
      title: 'Review calculus concepts',
      description: 'Go through derivatives and integrals',
      priority: 'high',
      status: 'completed',
      category: 'mathematics',
      estimated_minutes: 60,
      completed_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: userId,
      title: 'Write essay draft',
      description: 'First draft of English literature essay',
      priority: 'medium',
      status: 'in_progress',
      category: 'literature',
      estimated_minutes: 90,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: userId,
      title: 'Physics problem set',
      description: 'Complete chapter 12 problems',
      priority: 'high',
      status: 'pending',
      category: 'physics',
      estimated_minutes: 45,
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    }
  ];
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(demoTasks)
    .select();
  
  if (error) throw error;
  return data;
}

/**
 * Creates demo achievements
 */
async function createDemoAchievements(userId) {
  const demoAchievements = [
    {
      user_id: userId,
      achievement_type: 'streak',
      title: 'First Steps',
      description: 'Completed your first focus session',
      icon: '🚀',
      points_awarded: 25,
      unlocked_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'milestone'
    },
    {
      user_id: userId,
      achievement_type: 'time',
      title: 'Hour Scholar',
      description: 'Focused for a total of 1 hour',
      icon: '⏰',
      points_awarded: 50,
      unlocked_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      category: 'time'
    }
  ];
  
  const { data, error } = await supabase
    .from('achievements')
    .insert(demoAchievements)
    .select();
  
  if (error) throw error;
  return data;
}

/**
 * User Data Creation Utilities
 * 
 * This file contains functions to create initial data for new users
 * when they complete registration or onboarding.
 */

import { supabase } from './supabase';

/**
 * Creates initial data for a new user across all required tables
 * Enhanced with better error handling for iOS
 */
export async function createInitialUserData(userId, profileData = {}) {
  console.log(`Creating initial data for user: ${userId}`);
  
  const results = {
    success: true,
    created: [],
    failed: [],
    errors: []
  };
  
  try {
    // 1. Create user profile (CRITICAL - this must succeed)
    console.log('Creating user profile...');
    try {
      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!existingProfile) {
        const profileResult = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: profileData.fullName || 'New User',
            username: profileData.username || profileData.fullName || 'New User',
            email: profileData.email || null,
            avatar_url: profileData.avatarUrl || null,
            university: profileData.university || null,
            major: profileData.major || null,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (profileResult.error) throw profileResult.error;
        results.created.push('profile');
        console.log('✅ Profile created successfully');
      } else {
        results.created.push('profile');
        console.log('✅ Profile already exists, skipping creation');
      }
    } catch (profileError) {
      console.error('❌ Profile creation failed:', profileError);
      results.failed.push('profile');
      results.errors.push(`Profile: ${profileError.message}`);
      // Don't fail completely - continue with other records
    }
    
    // 2. Create onboarding data
    console.log('Creating onboarding data...');
    try {
      const onboardingResult = await supabase
        .from('onboarding_preferences')
        .insert({
          user_id: userId,
          is_onboarding_complete: false,
          weekly_focus_goal: 5,
          welcome_completed: false, // Start with onboarding needed
          goals_set: false,
          first_session_completed: false,
          profile_customized: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (onboardingResult.error) throw onboardingResult.error;
      results.created.push('onboarding');
      console.log('✅ Onboarding data created successfully');
    } catch (onboardingError) {
      console.error('❌ Onboarding creation failed:', onboardingError);
      results.failed.push('onboarding');
      results.errors.push(`Onboarding: ${onboardingError.message}`);
    }

    // 3. Create settings
    console.log('Creating user settings...');
    try {
      const settingsResult = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          theme: 'auto',
          notifications_enabled: true,
          study_reminders: true,
          break_reminders: true,
          daily_goal_minutes: 120,
          preferred_session_length: 25,
          preferred_break_length: 5,
          sound_enabled: true,
          auto_play_sound: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (settingsResult.error) throw settingsResult.error;
      results.created.push('settings');
      console.log('✅ Settings created successfully');
    } catch (settingsError) {
      console.error('❌ Settings creation failed:', settingsError);
      results.failed.push('settings');
      results.errors.push(`Settings: ${settingsError.message}`);
    }

    // 4. Create initial leaderboard stats
    console.log('Creating leaderboard stats...');
    try {
      const leaderboardResult = await supabase
        .from('leaderboard_stats')
        .upsert({
          user_id: userId,
          total_focus_time: 0,
          weekly_focus_time: 0,
          monthly_focus_time: 0,
          current_streak: 0,
          longest_streak: 0,
          total_sessions: 0,
          level: 1,
          points: 0,
          rank_position: null,
          achievements_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select()
        .single();
      
      if (leaderboardResult.error) throw leaderboardResult.error;
      results.created.push('leaderboard');
      console.log('✅ Leaderboard stats created successfully');
    } catch (leaderboardError) {
      console.error('❌ Leaderboard creation failed:', leaderboardError);
      results.failed.push('leaderboard');
      results.errors.push(`Leaderboard: ${leaderboardError.message}`);
    }

    // 5. Create initial learning metrics
    console.log('Creating learning metrics...');
    try {
      const metricsResult = await supabase
        .from('learning_metrics')
        .insert({
          user_id: userId,
          total_study_time: 0,
          average_session_length: 0,
          focus_score: 0,
          productivity_trend: 'stable',
          weekly_goal: 300, // 5 hours per week
          weekly_progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (metricsResult.error) throw metricsResult.error;
      results.created.push('metrics');
      console.log('✅ Learning metrics created successfully');
    } catch (metricsError) {
      console.error('❌ Learning metrics creation failed:', metricsError);
      results.failed.push('metrics');
      results.errors.push(`Metrics: ${metricsError.message}`);
    }

    // Return success if at least profile was created
    if (results.created.includes('profile')) {
      console.log(`✅ User data creation completed. Created: ${results.created.join(', ')}`);
      if (results.failed.length > 0) {
        console.log(`⚠️ Some records failed: ${results.failed.join(', ')}`);
      }
      return { success: true, results };
    } else {
      console.log('❌ Critical failure: Profile creation failed');
      return { success: false, error: 'Profile creation failed', results };
    }
    
  } catch (error) {
    console.error('❌ Critical error in createInitialUserData:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred during user data creation',
      results
    };
  }
}

/**
 * Checks if user has all required data, creates missing pieces
 * This fixes the login issue for users with incomplete profiles
 */
export async function ensureUserDataCompleteness(userId) {
  console.log(`🔍 Checking data completeness for user: ${userId}`);
  
  try {
    const missingData = [];
    const results = { created: [], failed: [], success: true };
    
    // Check profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError && profileError.code === 'PGRST116') {
      console.log('❌ Missing profile - creating basic profile...');
      try {
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: 'User',
            username: `user_${userId.slice(0, 8)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (createProfileError) {
          console.error('❌ Profile creation failed:', createProfileError);
          results.failed.push('profile');
          results.success = false;
        } else {
          console.log('✅ Profile created');
          results.created.push('profile');
        }
      } catch (error) {
        console.error('❌ Profile creation error:', error);
        results.failed.push('profile');
        results.success = false;
      }
    } else if (profile) {
      console.log('✅ Profile exists');
    }
    
    // Check onboarding exists
    const { data: onboarding, error: onboardingError } = await supabase
      .from('onboarding_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (onboardingError && onboardingError.code === 'PGRST116') {
      console.log('❌ Missing onboarding - creating...');
      try {
        const { error: createOnboardingError } = await supabase
          .from('onboarding_preferences')
          .insert({
            user_id: userId,
            is_onboarding_complete: false,
            weekly_focus_goal: 5,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (createOnboardingError) {
          console.error('❌ Onboarding creation failed:', createOnboardingError);
          results.failed.push('onboarding');
        } else {
          console.log('✅ Onboarding created');
          results.created.push('onboarding');
        }
      } catch (error) {
        console.error('❌ Onboarding creation error:', error);
        results.failed.push('onboarding');
      }
    } else if (onboarding) {
      console.log('✅ Onboarding exists');
    }
    
    // Check leaderboard stats exist
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('leaderboard_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (leaderboardError && leaderboardError.code === 'PGRST116') {
      console.log('❌ Missing leaderboard stats - creating...');
      try {
        const { error: createLeaderboardError } = await supabase
          .from('leaderboard_stats')
          .insert({
            user_id: userId,
            total_focus_time: 0,
            weekly_focus_time: 0,
            current_streak: 0,
            level: 1,
            points: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (createLeaderboardError) {
          console.error('❌ Leaderboard creation failed:', createLeaderboardError);
          results.failed.push('leaderboard');
        } else {
          console.log('✅ Leaderboard stats created');
          results.created.push('leaderboard');
        }
      } catch (error) {
        console.error('❌ Leaderboard creation error:', error);
        results.failed.push('leaderboard');
      }
    } else if (leaderboard) {
      console.log('✅ Leaderboard stats exist');
    }
    
    console.log(`✅ Data completeness check finished. Created: ${results.created.join(', ')}`);
    if (results.failed.length > 0) {
      console.log(`⚠️ Failed to create: ${results.failed.join(', ')}`);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Error checking user data completeness:', error);
    return { success: false, error: error.message, created: [], failed: [] };
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

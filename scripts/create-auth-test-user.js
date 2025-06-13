const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAuthUser() {
  console.log('🔐 Creating test auth user...\n');
  
  try {
    // Create a test user through authentication
    const testEmail = 'testuser@example.com';
    const testPassword = 'SecureTestPassword123!@#';
    
    console.log(`Creating auth user: ${testEmail}`);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          username: 'testuser'
        }
      }
    });
    
    if (authError) {
      console.log(`❌ Auth error: ${authError.message}`);
      
      // Try to sign in instead (user might already exist)
      console.log('Trying to sign in with existing user...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (signInError) {
        console.log(`❌ Sign in error: ${signInError.message}`);
        return;
      } else {
        console.log(`✅ Signed in successfully!`);
        console.log(`   User ID: ${signInData.user.id}`);
        return signInData.user.id;
      }
    } else {
      console.log(`✅ User created successfully!`);
      console.log(`   User ID: ${authData.user.id}`);
      console.log(`   Email confirmed: ${authData.user.email_confirmed_at ? 'Yes' : 'No'}`);
      
      return authData.user.id;
    }
    
  } catch (error) {
    console.error('❌ Failed to create user:', error.message);
  }
}

async function populateUserData(userId) {
  console.log(`\n📊 Populating data for user: ${userId}`);
  
  try {
    // 1. Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!existingProfile) {
      console.log('Creating profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: 'testuser',
          full_name: 'Test User',
          avatar_url: null,
          university: 'Test University',
          status: 'active'
        });
      
      if (profileError) {
        console.log(`❌ Profile error: ${profileError.message}`);
      } else {
        console.log(`✅ Profile created`);
      }
    } else {
      console.log(`✅ Profile already exists`);
    }
    
    // 2. Create onboarding preferences
    console.log('Creating onboarding preferences...');
    const { error: onboardingError } = await supabase
      .from('onboarding_preferences')
      .upsert({
        user_id: userId,
        preferred_study_duration: 25,
        preferred_break_duration: 5,
        study_goals: ['focus', 'productivity'],
        notification_preferences: {
          session_reminders: true,
          break_reminders: true,
          achievement_notifications: true
        },
        completed_at: new Date().toISOString()
      });
    
    if (onboardingError) {
      console.log(`❌ Onboarding error: ${onboardingError.message}`);
    } else {
      console.log(`✅ Onboarding preferences created`);
    }
    
    // 3. Create leaderboard stats
    console.log('Creating leaderboard stats...');
    const { error: leaderboardError } = await supabase
      .from('leaderboard_stats')
      .upsert({
        user_id: userId,
        total_focus_time: 120,
        sessions_completed: 5,
        current_streak: 3,
        longest_streak: 7,
        total_points: 150,
        rank_position: 1,
        achievements_count: 2
      });
    
    if (leaderboardError) {
      console.log(`❌ Leaderboard error: ${leaderboardError.message}`);
    } else {
      console.log(`✅ Leaderboard stats created`);
    }
    
    // 4. Create some focus sessions
    console.log('Creating focus sessions...');
    const sessions = [
      {
        user_id: userId,
        room_id: null,
        start_time: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        end_time: new Date(Date.now() - 84600000).toISOString(),   // 30 min session
        planned_duration: 30,
        actual_duration: 30,
        session_type: 'focus',
        status: 'completed'
      },
      {
        user_id: userId,
        room_id: null,
        start_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        end_time: new Date(Date.now() - 1800000).toISOString(),   // 30 min session
        planned_duration: 25,
        actual_duration: 25,
        session_type: 'focus',
        status: 'completed'
      }
    ];
    
    for (const session of sessions) {
      const { error: sessionError } = await supabase
        .from('focus_sessions')
        .insert(session);
      
      if (sessionError) {
        console.log(`❌ Session error: ${sessionError.message}`);
      }
    }
    console.log(`✅ Focus sessions created`);
    
    // 5. Create some tasks
    console.log('Creating tasks...');
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: 'Complete React Project',
        description: 'Finish the study tracker app',
        priority: 'high',
        status: 'in_progress',
        category: 'Development',
        estimated_minutes: 120
      })
      .select()
      .single();
    
    if (taskError) {
      console.log(`❌ Task error: ${taskError.message}`);
    } else {
      console.log(`✅ Task created`);
      
      // Create subtasks
      if (taskData?.id) {
        const { error: subtaskError } = await supabase
          .from('subtasks')
          .insert([
            {
              task_id: taskData.id,
              title: 'Set up database',
              completed: true
            },
            {
              task_id: taskData.id,
              title: 'Build UI components',
              completed: false
            }
          ]);
        
        if (subtaskError) {
          console.log(`❌ Subtask error: ${subtaskError.message}`);
        } else {
          console.log(`✅ Subtasks created`);
        }
      }
    }
    
    // 6. Create achievements
    console.log('Creating achievements...');
    const { error: achievementError } = await supabase
      .from('achievements')
      .insert([
        {
          user_id: userId,
          achievement_type: 'streak',
          title: 'First Focus Session',
          description: 'Completed your first focus session',
          icon: '🎯',
          points_awarded: 10,
          category: 'milestone'
        },
        {
          user_id: userId,
          achievement_type: 'time',
          title: 'Study Marathon',
          description: 'Studied for 2 hours in one day',
          icon: '🏃‍♂️',
          points_awarded: 25,
          category: 'time'
        }
      ]);
    
    if (achievementError) {
      console.log(`❌ Achievement error: ${achievementError.message}`);
    } else {
      console.log(`✅ Achievements created`);
    }
    
    // 7. Create learning metrics
    console.log('Creating learning metrics...');
    const { error: metricsError } = await supabase
      .from('learning_metrics')
      .upsert({
        user_id: userId,
        total_study_time: 300,
        average_session_length: 26,
        focus_score: 85,
        productivity_trend: 'improving',
        weekly_goal: 600,
        weekly_progress: 300,
        strongest_subject: 'Programming',
        areas_for_improvement: ['Time Management', 'Note Taking']
      });
    
    if (metricsError) {
      console.log(`❌ Metrics error: ${metricsError.message}`);
    } else {
      console.log(`✅ Learning metrics created`);
    }
    
    // 8. Create AI insights
    console.log('Creating AI insights...');
    const insights = [
      {
        user_id: userId,
        insight_type: 'tip',
        title: 'Optimize Your Study Schedule',
        content: 'Based on your focus patterns, you seem most productive in the morning. Consider scheduling your most challenging tasks between 9-11 AM.',
        priority: 'medium',
        category: 'productivity'
      },
      {
        user_id: userId,
        insight_type: 'achievement',
        title: 'Great Progress!',
        content: 'You\'ve maintained a 3-day focus streak. Keep it up!',
        priority: 'low',
        category: 'motivation'
      }
    ];
    
    for (const insight of insights) {
      const { error: insightError } = await supabase
        .from('ai_insights')
        .insert(insight);
      
      if (insightError) {
        console.log(`❌ Insight error: ${insightError.message}`);
      }
    }
    console.log(`✅ AI insights created`);
    
    console.log('\n🎉 Test data creation completed!');
    console.log(`\nYou can now test the app with user ID: ${userId}`);
    
  } catch (error) {
    console.error('❌ Failed to populate data:', error.message);
  }
}

async function main() {
  const userId = await createAuthUser();
  if (userId) {
    await populateUserData(userId);
  }
}

main();

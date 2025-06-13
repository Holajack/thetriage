#!/usr/bin/env node

/**
 * Test User Registration Script
 * 
 * Creates a test user through normal authentication flow and populates data
 * This simulates what happens when a real user signs up
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Test User Registration with Data Population');
console.log('===============================================\n');

async function createTestUser() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const testUser = {
    email: 'testuser@studytracker.com',
    password: 'SecureTest123!',
    fullName: 'Test User'
  };
  
  console.log('1. Creating test user account...');
  
  try {
    // Sign up the user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          full_name: testUser.fullName
        }
      }
    });
    
    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('✅ User already exists, signing in...');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password
        });
        
        if (signInError) {
          throw signInError;
        }
        
        return signInData.user;
      } else {
        throw signUpError;
      }
    }
    
    console.log('✅ Test user created successfully');
    console.log(`   User ID: ${signUpData.user.id}`);
    console.log(`   Email: ${signUpData.user.email}`);
    
    return signUpData.user;
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    throw error;
  }
}

async function populateUserData(userId) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('\n2. Populating user data...');
  
  try {
    // Create user profile
    console.log('   Creating user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        full_name: 'Test User',
        current_streak: 3,
        longest_streak: 7,
        total_focus_time: 450, // 7.5 hours
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (profileError && profileError.code !== '23505') { // Not duplicate
      throw profileError;
    }
    console.log('   ✅ Profile created');
    
    // Create user onboarding
    console.log('   Creating onboarding data...');
    const { data: onboarding, error: onboardingError } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: userId,
        welcome_completed: true,
        goals_set: true,
        first_session_completed: true,
        profile_customized: true,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (onboardingError && onboardingError.code !== '23505') {
      throw onboardingError;
    }
    console.log('   ✅ Onboarding data created');
    
    // Create user settings
    console.log('   Creating user settings...');
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        notifications_enabled: true,
        daily_goal_minutes: 120,
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
    
    if (settingsError && settingsError.code !== '23505') {
      throw settingsError;
    }
    console.log('   ✅ Settings created');
    
    // Create leaderboard stats
    console.log('   Creating leaderboard stats...');
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('user_leaderboard_stats')
      .upsert({
        user_id: userId,
        total_focus_time: 450,
        sessions_completed: 18,
        current_streak: 3,
        achievements_unlocked: 5,
        rank_position: 47,
        weekly_focus_time: 180,
        monthly_focus_time: 900,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (leaderboardError && leaderboardError.code !== '23505') {
      throw leaderboardError;
    }
    console.log('   ✅ Leaderboard stats created');
    
    // Create learning metrics
    console.log('   Creating learning metrics...');
    const { data: metrics, error: metricsError } = await supabase
      .from('learning_metrics')
      .upsert({
        user_id: userId,
        total_study_time: 450,
        average_session_length: 25,
        focus_score: 87,
        productivity_rating: 4.2,
        subjects_studied: 6,
        goals_completed: 12,
        week_start: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (metricsError && metricsError.code !== '23505') {
      throw metricsError;
    }
    console.log('   ✅ Learning metrics created');
    
    // Create sample focus sessions
    console.log('   Creating focus sessions...');
    const sessions = [];
    for (let i = 0; i < 7; i++) {
      const sessionDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      sessions.push({
        user_id: userId,
        duration_minutes: 25 + Math.floor(Math.random() * 35),
        start_time: new Date(sessionDate.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9 AM
        end_time: new Date(sessionDate.getTime() + 9.5 * 60 * 60 * 1000).toISOString(), // 9:30 AM
        focus_score: 75 + Math.floor(Math.random() * 25),
        session_type: 'focus',
        completed: true,
        created_at: sessionDate.toISOString()
      });
    }
    
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('focus_sessions')
      .upsert(sessions, { onConflict: 'user_id,start_time' })
      .select();
    
    if (sessionsError) {
      console.log('   ⚠️ Some sessions may already exist, continuing...');
    } else {
      console.log(`   ✅ Created ${sessionsData?.length || 0} focus sessions`);
    }
    
    // Create sample tasks
    console.log('   Creating sample tasks...');
    const tasks = [
      {
        user_id: userId,
        title: 'Review calculus concepts',
        description: 'Study derivatives and integrals for upcoming exam',
        priority: 'high',
        status: 'completed',
        category: 'mathematics',
        estimated_minutes: 60,
        completed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        title: 'Write history essay',
        description: 'Essay on World War II causes',
        priority: 'medium',
        status: 'in_progress',
        category: 'history',
        estimated_minutes: 90,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        title: 'Physics problem set',
        description: 'Complete chapter 15 exercises',
        priority: 'high',
        status: 'pending',
        category: 'physics',
        estimated_minutes: 45,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      }
    ];
    
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .upsert(tasks, { onConflict: 'user_id,title' })
      .select();
    
    if (tasksError) {
      console.log('   ⚠️ Some tasks may already exist, continuing...');
    } else {
      console.log(`   ✅ Created ${tasksData?.length || 0} tasks`);
    }
    
    // Create achievements
    console.log('   Creating achievements...');
    const achievements = [
      {
        user_id: userId,
        achievement_type: 'welcome',
        title: 'Welcome to Study Tracker!',
        description: 'Successfully joined the community',
        icon: '🎉',
        points_awarded: 10,
        unlocked_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'milestone'
      },
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
        title: 'Time Warrior',
        description: 'Focused for 5+ hours total',
        icon: '⚔️',
        points_awarded: 100,
        unlocked_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        category: 'time'
      }
    ];
    
    const { data: achievementsData, error: achievementsError } = await supabase
      .from('achievements')
      .upsert(achievements, { onConflict: 'user_id,title' })
      .select();
    
    if (achievementsError) {
      console.log('   ⚠️ Some achievements may already exist, continuing...');
    } else {
      console.log(`   ✅ Created ${achievementsData?.length || 0} achievements`);
    }
    
    // Create AI insights
    console.log('   Creating AI insights...');
    const insights = [
      {
        user_id: userId,
        insight_type: 'tip',
        title: 'Optimal Study Time',
        content: 'Your focus is highest between 9-11 AM. Try scheduling important study sessions during this time.',
        priority: 'high',
        category: 'productivity',
        created_at: new Date().toISOString()
      },
      {
        user_id: userId,
        insight_type: 'achievement',
        title: 'Great Progress!',
        content: 'You\'ve completed 18 focus sessions this month. You\'re on track to beat your personal record!',
        priority: 'medium',
        category: 'motivation',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    const { data: insightsData, error: insightsError } = await supabase
      .from('ai_insights')
      .upsert(insights, { onConflict: 'user_id,title' })
      .select();
    
    if (insightsError) {
      console.log('   ⚠️ Some insights may already exist, continuing...');
    } else {
      console.log(`   ✅ Created ${insightsData?.length || 0} insights`);
    }
    
    console.log('\n✅ All user data populated successfully!');
    
  } catch (error) {
    console.error('❌ Error populating user data:', error.message);
    throw error;
  }
}

async function testUserLogin() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('\n3. Testing user login and data fetch...');
  
  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'testuser@studytracker.com',
      password: 'SecureTest123!'
    });
    
    if (signInError) {
      throw signInError;
    }
    
    console.log('✅ Login successful');
    
    // Test data fetch
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', signInData.user.id)
      .single();
    
    if (profileError) {
      throw profileError;
    }
    
    console.log('✅ Profile data retrieved');
    console.log(`   Name: ${profile.full_name}`);
    console.log(`   Streak: ${profile.current_streak} days`);
    console.log(`   Total focus time: ${profile.total_focus_time} minutes`);
    
    // Test tasks fetch
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', signInData.user.id)
      .limit(3);
    
    if (tasksError) {
      throw tasksError;
    }
    
    console.log(`✅ Found ${tasks.length} tasks`);
    
    // Test achievements fetch
    const { data: achievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', signInData.user.id);
    
    if (achievementsError) {
      throw achievementsError;
    }
    
    console.log(`✅ Found ${achievements.length} achievements`);
    
    await supabase.auth.signOut();
    console.log('✅ Signed out successfully');
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
    throw error;
  }
}

async function main() {
  try {
    const user = await createTestUser();
    await populateUserData(user.id);
    await testUserLogin();
    
    console.log('\n🎉 Test user registration and data population complete!');
    console.log('\nTest User Credentials:');
    console.log('   Email: testuser@studytracker.com');
    console.log('   Password: SecureTest123!');
    console.log('\nYou can now use these credentials to test the app with real data.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

#!/usr/bin/env node

/**
 * Manual Test Data Creation Script
 * 
 * Creates test data directly in the database using mock user IDs
 * This is useful for testing the app screens with real data from Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Manual Test Data Creation');
console.log('=============================\n');

// Using a fake UUID for testing (this would normally come from auth)
const testUserId = '550e8400-e29b-41d4-a716-446655440000';

async function createTestData() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log(`Creating test data for user ID: ${testUserId}`);
  
  try {
    // 1. Create user profile
    console.log('1. Creating user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: testUserId,
        full_name: 'Demo Student',
        avatar_url: null,
        current_streak: 5,
        longest_streak: 12,
        total_focus_time: 720, // 12 hours
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (profileError) {
      console.log(`   Error: ${profileError.message}`);
    } else {
      console.log('   ✅ Profile created');
    }
    
    // 2. Create user onboarding
    console.log('2. Creating onboarding data...');
    const { data: onboarding, error: onboardingError } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: testUserId,
        welcome_completed: true,
        goals_set: true,
        first_session_completed: true,
        profile_customized: true,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (onboardingError) {
      console.log(`   Error: ${onboardingError.message}`);
    } else {
      console.log('   ✅ Onboarding data created');
    }
    
    // 3. Create user settings
    console.log('3. Creating user settings...');
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: testUserId,
        notifications_enabled: true,
        daily_goal_minutes: 180,
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
    
    if (settingsError) {
      console.log(`   Error: ${settingsError.message}`);
    } else {
      console.log('   ✅ Settings created');
    }
    
    // 4. Create leaderboard stats
    console.log('4. Creating leaderboard stats...');
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('user_leaderboard_stats')
      .upsert({
        user_id: testUserId,
        total_focus_time: 720,
        sessions_completed: 29,
        current_streak: 5,
        achievements_unlocked: 8,
        rank_position: 23,
        weekly_focus_time: 240,
        monthly_focus_time: 1200,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (leaderboardError) {
      console.log(`   Error: ${leaderboardError.message}`);
    } else {
      console.log('   ✅ Leaderboard stats created');
    }
    
    // 5. Create learning metrics
    console.log('5. Creating learning metrics...');
    const { data: metrics, error: metricsError } = await supabase
      .from('learning_metrics')
      .upsert({
        user_id: testUserId,
        total_study_time: 720,
        average_session_length: 25,
        focus_score: 92,
        productivity_rating: 4.5,
        subjects_studied: 8,
        goals_completed: 15,
        week_start: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (metricsError) {
      console.log(`   Error: ${metricsError.message}`);
    } else {
      console.log('   ✅ Learning metrics created');
    }
    
    // 6. Create focus sessions
    console.log('6. Creating focus sessions...');
    const sessions = [];
    for (let i = 0; i < 14; i++) { // 2 weeks of data
      const sessionDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const sessionsPerDay = Math.floor(Math.random() * 3) + 1; // 1-3 sessions per day
      
      for (let j = 0; j < sessionsPerDay; j++) {
        sessions.push({
          user_id: testUserId,
          duration_minutes: 25 + Math.floor(Math.random() * 35),
          start_time: new Date(sessionDate.getTime() + (9 + j * 2) * 60 * 60 * 1000).toISOString(),
          end_time: new Date(sessionDate.getTime() + (9.5 + j * 2) * 60 * 60 * 1000).toISOString(),
          focus_score: 70 + Math.floor(Math.random() * 30),
          session_type: 'focus',
          completed: true,
          created_at: sessionDate.toISOString()
        });
      }
    }
    
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('focus_sessions')
      .upsert(sessions, { onConflict: 'user_id,start_time' })
      .select();
    
    if (sessionsError) {
      console.log(`   Error: ${sessionsError.message}`);
    } else {
      console.log(`   ✅ Created ${sessionsData?.length || 0} focus sessions`);
    }
    
    // 7. Create tasks
    console.log('7. Creating tasks...');
    const tasks = [
      {
        user_id: testUserId,
        title: 'Mathematics: Calculus Review',
        description: 'Review derivatives and integration techniques for midterm exam',
        priority: 'high',
        status: 'completed',
        category: 'mathematics',
        estimated_minutes: 90,
        completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: testUserId,
        title: 'Physics: Quantum Mechanics',
        description: 'Study wave functions and probability distributions',
        priority: 'high',
        status: 'in_progress',
        category: 'physics',
        estimated_minutes: 120,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: testUserId,
        title: 'Chemistry: Organic Reactions',
        description: 'Memorize synthesis pathways and reaction mechanisms',
        priority: 'medium',
        status: 'pending',
        category: 'chemistry',
        estimated_minutes: 75,
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      },
      {
        user_id: testUserId,
        title: 'Literature: Essay Writing',
        description: 'Write comparative analysis of modern poetry',
        priority: 'medium',
        status: 'pending',
        category: 'literature',
        estimated_minutes: 180,
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      },
      {
        user_id: testUserId,
        title: 'History: Research Project',
        description: 'Research the causes of World War I for term paper',
        priority: 'low',
        status: 'pending',
        category: 'history',
        estimated_minutes: 240,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      }
    ];
    
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .upsert(tasks, { onConflict: 'user_id,title' })
      .select();
    
    if (tasksError) {
      console.log(`   Error: ${tasksError.message}`);
    } else {
      console.log(`   ✅ Created ${tasksData?.length || 0} tasks`);
    }
    
    // 8. Create achievements
    console.log('8. Creating achievements...');
    const achievements = [
      {
        user_id: testUserId,
        achievement_type: 'welcome',
        title: 'Welcome Scholar',
        description: 'Joined the Study Tracker community',
        icon: '🎓',
        points_awarded: 10,
        unlocked_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'milestone'
      },
      {
        user_id: testUserId,
        achievement_type: 'streak',
        title: 'Consistent Learner',
        description: 'Maintained a 5-day study streak',
        icon: '🔥',
        points_awarded: 50,
        unlocked_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        category: 'streak'
      },
      {
        user_id: testUserId,
        achievement_type: 'time',
        title: 'Time Master',
        description: 'Accumulated 10+ hours of focus time',
        icon: '⏰',
        points_awarded: 100,
        unlocked_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'time'
      },
      {
        user_id: testUserId,
        achievement_type: 'focus',
        title: 'Focus Champion',
        description: 'Achieved 90%+ focus score in 10 sessions',
        icon: '🎯',
        points_awarded: 75,
        unlocked_at: new Date().toISOString(),
        category: 'performance'
      }
    ];
    
    const { data: achievementsData, error: achievementsError } = await supabase
      .from('achievements')
      .upsert(achievements, { onConflict: 'user_id,title' })
      .select();
    
    if (achievementsError) {
      console.log(`   Error: ${achievementsError.message}`);
    } else {
      console.log(`   ✅ Created ${achievementsData?.length || 0} achievements`);
    }
    
    // 9. Create AI insights
    console.log('9. Creating AI insights...');
    const insights = [
      {
        user_id: testUserId,
        insight_type: 'tip',
        title: 'Peak Performance Hours',
        content: 'Your focus scores are highest between 9-11 AM. Consider scheduling challenging subjects during this time.',
        priority: 'high',
        category: 'productivity',
        created_at: new Date().toISOString()
      },
      {
        user_id: testUserId,
        insight_type: 'achievement',
        title: 'Excellent Progress!',
        content: 'You\'ve completed 29 focus sessions this month. You\'re 87% ahead of your previous month!',
        priority: 'medium',
        category: 'motivation',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: testUserId,
        insight_type: 'recommendation',
        title: 'Study Break Suggestion',
        content: 'Try the 50/10 technique for your longer study sessions - 50 minutes of focus followed by 10-minute breaks.',
        priority: 'medium',
        category: 'technique',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    const { data: insightsData, error: insightsError } = await supabase
      .from('ai_insights')
      .upsert(insights, { onConflict: 'user_id,title' })
      .select();
    
    if (insightsError) {
      console.log(`   Error: ${insightsError.message}`);
    } else {
      console.log(`   ✅ Created ${insightsData?.length || 0} insights`);
    }
    
    console.log('\n✅ Test data creation completed!');
    console.log(`\nTest User ID: ${testUserId}`);
    console.log('You can now test the app screens with this data.');
    
  } catch (error) {
    console.error('\n❌ Error creating test data:', error.message);
    throw error;
  }
}

async function verifyTestData() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('\n🔍 Verifying test data...');
  
  const tables = [
    'user_profiles',
    'user_onboarding', 
    'user_settings',
    'user_leaderboard_stats',
    'learning_metrics',
    'focus_sessions',
    'tasks',
    'achievements',
    'ai_insights'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', testUserId);
      
      if (error) {
        console.log(`   ${table}: ❌ ${error.message}`);
      } else {
        console.log(`   ${table}: ✅ ${data.length} records`);
      }
    } catch (err) {
      console.log(`   ${table}: ❌ ${err.message}`);
    }
  }
}

async function main() {
  try {
    await createTestData();
    await verifyTestData();
    
    console.log('\n🎉 Manual test data creation successful!');
    console.log(`\n💡 To use this data in the app:`);
    console.log(`   1. Update userAppData.js to use this test user ID: ${testUserId}`);
    console.log(`   2. Or modify the app to use this as the default user for testing`);
    
  } catch (error) {
    console.error('\n❌ Test data creation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

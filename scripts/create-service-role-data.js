const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🎯 Testing with Enhanced Service Key Permissions...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createServiceRoleTestData() {
  const testUserId = '11111111-2222-3333-4444-555555555555';
  
  console.log(`🧪 Creating comprehensive test data for user: ${testUserId}\n`);
  
  try {
    // 1. Create profile using service role (bypasses RLS)
    console.log('1. Creating profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: testUserId,
        username: 'demo_user',
        full_name: 'Demo User',
        avatar_url: null,
        university: 'Demo University',
        status: 'active'
      })
      .select()
      .single();
    
    if (profileError) {
      console.log(`   ❌ Error: ${profileError.message}`);
    } else {
      console.log(`   ✅ Profile created: ${profile.full_name}`);
    }
    
    // 2. Create minimal onboarding preferences (discover correct schema)
    console.log('2. Creating onboarding preferences...');
    const { data: onboarding, error: onboardingError } = await supabase
      .from('onboarding_preferences')
      .upsert({
        user_id: testUserId,
        is_onboarding_complete: true
      })
      .select()
      .single();
    
    if (onboardingError) {
      console.log(`   ❌ Error: ${onboardingError.message}`);
    } else {
      console.log(`   ✅ Onboarding created`);
      console.log(`   📋 Available columns: ${Object.keys(onboarding).join(', ')}`);
    }
    
    // 3. Create minimal leaderboard stats
    console.log('3. Creating leaderboard stats...');
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('leaderboard_stats')
      .upsert({
        user_id: testUserId,
        total_focus_time: 150,
        sessions_completed: 6,
        current_streak: 3,
        longest_streak: 7,
        total_points: 180
      })
      .select()
      .single();
    
    if (leaderboardError) {
      console.log(`   ❌ Error: ${leaderboardError.message}`);
    } else {
      console.log(`   ✅ Leaderboard created`);
      console.log(`   📋 Available columns: ${Object.keys(leaderboard).join(', ')}`);
    }
    
    // 4. Create focus sessions
    console.log('4. Creating focus sessions...');
    const sessions = [
      {
        user_id: testUserId,
        start_time: new Date(Date.now() - 2 * 86400000).toISOString(),
        end_time: new Date(Date.now() - 2 * 86400000 + 1800000).toISOString(),
        duration: 30,
        session_type: 'focus',
        status: 'completed'
      },
      {
        user_id: testUserId,
        start_time: new Date(Date.now() - 86400000).toISOString(),
        end_time: new Date(Date.now() - 86400000 + 1500000).toISOString(),
        duration: 25,
        session_type: 'focus',
        status: 'completed'
      }
    ];
    
    let sessionCount = 0;
    for (const session of sessions) {
      const { data: sessionData, error: sessionError } = await supabase
        .from('focus_sessions')
        .insert(session)
        .select()
        .single();
      
      if (sessionError) {
        console.log(`   ❌ Session error: ${sessionError.message}`);
      } else {
        sessionCount++;
        if (sessionCount === 1) {
          console.log(`   📋 Session columns: ${Object.keys(sessionData).join(', ')}`);
        }
      }
    }
    console.log(`   ✅ Created ${sessionCount}/${sessions.length} focus sessions`);
    
    // 5. Create minimal tasks
    console.log('5. Creating tasks...');
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: testUserId,
        title: 'Complete Study Tracker',
        description: 'Finish the app implementation',
        priority: 'high',
        status: 'in_progress'
      })
      .select()
      .single();
    
    if (taskError) {
      console.log(`   ❌ Task error: ${taskError.message}`);
    } else {
      console.log(`   ✅ Task created: ${task.title}`);
      console.log(`   📋 Task columns: ${Object.keys(task).join(', ')}`);
      
      // Create subtasks
      const subtasks = [
        { task_id: task.id, title: 'Database setup', completed: true },
        { task_id: task.id, title: 'UI implementation', completed: false }
      ];
      
      let subtaskCount = 0;
      for (const subtask of subtasks) {
        const { error: subtaskError } = await supabase
          .from('subtasks')
          .insert(subtask);
        if (!subtaskError) subtaskCount++;
      }
      console.log(`   ✅ Created ${subtaskCount}/${subtasks.length} subtasks`);
    }
    
    // 6. Create achievements
    console.log('6. Creating achievements...');
    const { data: achievement, error: achievementError } = await supabase
      .from('achievements')
      .insert({
        user_id: testUserId,
        achievement_type: 'streak',
        title: 'First Focus Session',
        description: 'Completed your first focus session',
        points_awarded: 10
      })
      .select()
      .single();
    
    if (achievementError) {
      console.log(`   ❌ Achievement error: ${achievementError.message}`);
    } else {
      console.log(`   ✅ Achievement created: ${achievement.title}`);
      console.log(`   📋 Achievement columns: ${Object.keys(achievement).join(', ')}`);
    }
    
    // 7. Create learning metrics
    console.log('7. Creating learning metrics...');
    const { data: metrics, error: metricsError } = await supabase
      .from('learning_metrics')
      .upsert({
        user_id: testUserId,
        total_study_time: 300,
        average_session_length: 26,
        focus_score: 85,
        productivity_trend: 'improving'
      })
      .select()
      .single();
    
    if (metricsError) {
      console.log(`   ❌ Metrics error: ${metricsError.message}`);
    } else {
      console.log(`   ✅ Learning metrics created`);
      console.log(`   📋 Metrics columns: ${Object.keys(metrics).join(', ')}`);
    }
    
    // 8. Create AI insights
    console.log('8. Creating AI insights...');
    const { data: insight, error: insightError } = await supabase
      .from('ai_insights')
      .insert({
        user_id: testUserId,
        insight_type: 'tip',
        title: 'Optimize Your Schedule',
        content: 'You seem most productive in the morning. Try scheduling challenging tasks then.',
        priority: 'medium'
      })
      .select()
      .single();
    
    if (insightError) {
      console.log(`   ❌ Insight error: ${insightError.message}`);
    } else {
      console.log(`   ✅ AI insight created: ${insight.title}`);
      console.log(`   📋 Insight columns: ${Object.keys(insight).join(', ')}`);
    }
    
    console.log('\n🎉 Test data creation completed!');
    console.log(`\n🧪 Test the app now with user ID: ${testUserId}`);
    
    // Test data retrieval
    console.log('\n📊 Testing data retrieval...');
    const { data: testProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single();
    
    if (testProfile) {
      console.log(`✅ Profile retrieval working: ${testProfile.full_name}`);
    }
    
    const { data: testSessions } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', testUserId);
    
    console.log(`✅ Sessions retrieval working: ${testSessions?.length || 0} sessions found`);
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

createServiceRoleTestData();

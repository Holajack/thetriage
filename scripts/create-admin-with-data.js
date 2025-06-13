// This script creates an admin user with a complete profile and all associated data
// which will automatically populate the main screens in the app

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Check for dry run mode
const isDryRun = process.argv.includes('--dry-run');
if (isDryRun) {
  console.log('🧪 Running in DRY RUN mode - no actual data will be created');
}

// Initialize Supabase client
const supabaseUrl = 'https://ucculvnodabrfwbkzsnx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY'; // Replace with actual key if not in .env

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Admin user details - feel free to customize
const adminUser = {
  email: 'admin@studytracker.app',
  password: 'StudyAdmin2023!',
  username: 'admin',
  fullName: 'Admin User',
  university: 'Stanford University',
  major: 'Computer Science',
  location: 'California, USA',
  timezone: 'America/Los_Angeles',
  classes: ['CS101', 'MATH202', 'PSYCH110', 'ECON101'],
};

async function createAdminUser() {
  console.log('🔄 Creating comprehensive admin user with mock data...');
  
  try {
    // 1. Create user in auth.users
    let userData = null;
    let userError = null;
    
    if (isDryRun) {
      console.log(`👤 Would create user: ${adminUser.email}`);
      userData = { user: { id: 'dry-run-user-id-12345' } };
    } else {
      const result = await supabase.auth.admin.createUser({
        email: adminUser.email,
        password: adminUser.password,
        email_confirm: true, // Auto-confirms the email
        user_metadata: {
          full_name: adminUser.fullName,
        },
      });
      userData = result.data;
      userError = result.error;
    }
    
    if (userError) {
      if (userError.code === '23505') { // Unique constraint violation - user already exists
        console.log('✅ Admin user already exists. Continuing with data population...');
        
        // Try to sign in
        const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
          email: adminUser.email,
          password: adminUser.password,
        });
        
        if (signInError) {
          console.error('❌ Error signing in as admin:', signInError);
          return null;
        }
        
        return { userId: session.user.id };
      } else {
        console.error('❌ Error creating auth user:', userError);
        return null;
      }
    }
    
    const userId = userData.user.id;
    console.log('✅ Auth user created with ID:', userId);
    
    // 2. Update profile data with rich information
    let profileError = null;
    const profileData = {
      username: adminUser.username,
      full_name: adminUser.fullName,
      university: adminUser.university,
      major: adminUser.major,
      location: adminUser.location,
      timezone: adminUser.timezone,
      classes: adminUser.classes,
      avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin',
      status: 'available',
      display_name_preference: 'full_name',
      theme_environment: 'library',
      updated_at: new Date().toISOString(),
      weekly_focus_goal: 15,
      sound_preference: 'Lo-Fi',
      focus_duration: 45, // 45-minute focus sessions
      break_duration: 15, // 15-minute break
      main_goal: 'Academic Excellence',
      work_style: 'Deep Work',
      environment: 'Library',
      fullname_visibility: 'everyone',
      university_visibility: 'everyone',
      location_visibility: 'friends',
      classes_visibility: 'friends',
      last_selected_environment: 'library',
      bio: 'CS major passionate about creating educational tools and studying machine learning.',
      study_preferences: JSON.stringify({
        preferredSubjects: ['Computer Science', 'Mathematics', 'Psychology'],
        preferredTimes: ['Morning', 'Evening'],
        preferredLocations: ['Library', 'Home Office']
      })
    };
    
    if (isDryRun) {
      console.log('👤 Would update profile with:', JSON.stringify(profileData, null, 2).substring(0, 200) + '...');
    } else {
      const result = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId);
      profileError = result.error;
    }
    
    if (profileError) {
      console.error('❌ Error updating profile:', profileError);
    } else {
      console.log('✅ Profile updated with rich data');
    }
    
    // 3. Complete onboarding preferences to skip onboarding flow
    const { error: onboardingError } = await supabase
      .from('onboarding_preferences')
      .upsert({
        user_id: userId,
        is_onboarding_complete: true,
        learning_environment: 'Library',
        sound_preference: 'Lo-Fi',
        work_style: 'Deep Focus',
        user_goal: 'Academic Excellence',
        weekly_focus_goal: 15,
        focus_method: 'Balanced Work-Rest Cycle', // Matches our app flow
        education_level: 'University',
        university: adminUser.university,
        major: adminUser.major,
        location: adminUser.location,
        timezone: adminUser.timezone,
        data_collection_consent: true,
        personalized_recommendations: true,
        usage_analytics: true,
        marketing_communications: false,
        profile_visibility: 'friends',
        study_data_sharing: true,
        updated_at: new Date().toISOString()
      });
    
    if (onboardingError) {
      console.error('❌ Error updating onboarding preferences:', onboardingError);
    } else {
      console.log('✅ Onboarding marked as complete');
    }
    
    // 4. Create leaderboard stats with impressive numbers
    const { error: leaderboardError } = await supabase
      .from('leaderboard_stats')
      .upsert({
        user_id: userId,
        total_focus_time: 8750, // In minutes (about 146 hours)
        total_sessions: 85,
        current_streak: 7,
        longest_streak: 12,
        weekly_focus_time: 840, // 14 hours this week
        monthly_focus_time: 3600, // 60 hours this month
        points: 1240,
        level: 5,
        weekly_focus_goal: 15 // 15 hours per week
      });
    
    if (leaderboardError) {
      console.error('❌ Error creating leaderboard stats:', leaderboardError);
    } else {
      console.log('✅ Leaderboard stats populated');
    }
    
    // 5. Create focus sessions across different days of the week (for charts)
    const now = new Date();
    
    // Create a session for each of the last 7 days
    const sessionDays = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      sessionDays.push(date);
    }
    
    const subjects = ['Computer Science', 'Mathematics', 'Psychology', 'Economics'];
    const environments = ['library', 'home', 'coffee_shop', 'office', 'outdoors'];
    
    // Create varied sessions across the week
    for (let i = 0; i < sessionDays.length; i++) {
      const day = sessionDays[i];
      
      // 1-3 sessions per day
      const sessionsPerDay = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < sessionsPerDay; j++) {
        const startHour = 9 + Math.floor(Math.random() * 8); // Between 9 AM and 5 PM
        const startDate = new Date(day);
        startDate.setHours(startHour, 0, 0, 0);
        
        const duration = [25, 45, 60, 90][Math.floor(Math.random() * 4)]; // Common durations
        const endDate = new Date(startDate.getTime() + duration * 60000);
        
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const environment = environments[Math.floor(Math.random() * environments.length)];
        
        // Only the most recent session might be active
        const isActive = i === sessionDays.length - 1 && j === sessionsPerDay - 1 && Math.random() < 0.3;
        
        const sessionData = {
          user_id: userId,
          start_time: startDate.toISOString(),
          end_time: isActive ? null : endDate.toISOString(),
          duration: isActive ? null : duration,
          milestone_count: isActive ? 0 : Math.floor(duration / 15),
          environment: environment,
          completed: !isActive,
          subject: subject,
          status: isActive ? 'active' : 'completed',
          session_type: Math.random() < 0.8 ? 'individual' : 'group'
        };
        
        const { data: sessionResult, error: sessionError } = await supabase
          .from('focus_sessions')
          .insert(sessionData)
          .select();
          
        if (sessionError) {
          console.error(`❌ Error creating focus session:`, sessionError);
        } else if (!isActive && sessionResult && sessionResult[0]) {
          // Add reflection for completed sessions
          await supabase
            .from('session_reflections')
            .insert({
              session_id: sessionResult[0].id,
              user_id: userId,
              user_notes: `Reflection on ${subject} study session`,
              mood_rating: Math.floor(Math.random() * 3) + 3, // 3-5 rating
              productivity_rating: Math.floor(Math.random() * 3) + 3, // 3-5 rating
              ai_summary: `You had a productive ${duration} minute session working on ${subject}. Your focus was good and you completed several key tasks.`
            });
        }
      }
    }
    console.log('✅ Created varied focus sessions across the week');
    
    // 6. Create tasks with different statuses
    const taskData = [
      {
        title: 'Complete CS101 Assignment',
        description: 'Finish the data structures homework by implementing a binary search tree',
        status: 'pending',
        priority: 'High',
        due_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        subtasks: [
          'Read chapter 5 on tree structures',
          'Implement insert() method',
          'Implement delete() method',
          'Write test cases',
          'Submit to Gradescope'
        ]
      },
      {
        title: 'Study for Math Midterm',
        description: 'Focus on linear algebra concepts from chapters 3-5',
        status: 'in-progress',
        priority: 'High',
        due_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        subtasks: [
          'Review eigenvalues and eigenvectors',
          'Practice determinant calculations',
          'Do practice problems 1-10',
          'Review professor\'s lecture notes'
        ]
      },
      {
        title: 'Psychology reading',
        description: 'Read chapters 7-8 on cognitive psychology before next lecture',
        status: 'pending',
        priority: 'Medium',
        due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        subtasks: [
          'Read chapter 7 on memory',
          'Read chapter 8 on problem solving',
          'Take notes on key concepts',
          'Prepare questions for discussion'
        ]
      },
      {
        title: 'Economics project research',
        description: 'Gather data for the market analysis project',
        status: 'pending',
        priority: 'Medium',
        due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        subtasks: [
          'Find 5 recent articles on the topic',
          'Download latest economic indicators',
          'Create data visualization',
          'Draft introduction'
        ]
      },
      {
        title: 'Complete weekly coding challenge',
        description: 'Solve the leetcode problem of the week',
        status: 'completed',
        priority: 'Low',
        due_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        subtasks: [
          'Understand the problem',
          'Plan solution approach',
          'Implement solution',
          'Optimize for better time complexity',
          'Submit solution'
        ]
      },
      {
        title: 'Review project feedback',
        description: 'Go through professor\'s comments on the last project submission',
        status: 'completed',
        priority: 'Medium',
        due_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        subtasks: [
          'Read all comments',
          'Note areas for improvement',
          'Schedule office hours if needed',
          'Update project document'
        ]
      }
    ];
    
    for (const task of taskData) {
      const { data: taskResult, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
          order: taskData.indexOf(task) + 1
        })
        .select();
      
      if (taskError) {
        console.error(`❌ Error creating task:`, taskError);
      } else if (taskResult && taskResult[0]) {
        // Add subtasks
        for (const subtaskText of task.subtasks) {
          // Randomly mark some subtasks as completed
          const completed = 
            task.status === 'completed' ? true : 
            task.status === 'in-progress' ? Math.random() < 0.4 : false;
            
          await supabase
            .from('subtasks')
            .insert({
              task_id: taskResult[0].id,
              user_id: userId,
              text: subtaskText,
              completed: completed,
              order: task.subtasks.indexOf(subtaskText) + 1
            });
        }
      }
    }
    console.log('✅ Created varied tasks with subtasks');
    
    // 7. Create achievements for badges/display
    const achievementData = [
      {
        achievement_type: 'First Focus Session',
        description: 'Completed your first focus session',
        earned_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        achievement_type: 'Week Streak',
        description: 'Maintained a 7-day focus streak',
        earned_at: new Date().toISOString()
      },
      {
        achievement_type: '5 Tasks Completed',
        description: 'Completed 5 tasks',
        earned_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        achievement_type: 'Time Milestone',
        description: 'Reached 100 hours of focused study time',
        earned_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        achievement_type: 'Subject Master',
        description: 'Spent 50+ hours studying Computer Science',
        earned_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const achievement of achievementData) {
      const { error: achievementError } = await supabase
        .from('achievements')
        .insert({
          user_id: userId,
          achievement_type: achievement.achievement_type,
          description: achievement.description,
          earned_at: achievement.earned_at
        });
      
      if (achievementError) {
        console.error(`❌ Error creating achievement:`, achievementError);
      }
    }
    console.log('✅ Created varied achievements');
    
    // 8. Create AI insights for the insights panel
    const insightData = [
      {
        insight_type: 'Focus Pattern',
        content: 'You seem to be most productive between 9-11 AM. Consider scheduling your most important tasks during this morning productivity window.',
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        insight_type: 'Break Suggestion',
        content: 'Your sessions lasting over 60 minutes show declining productivity near the end. Try using a 45/15 minute work/break ratio for better sustained focus.',
        is_read: true,
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        insight_type: 'Subject Analysis',
        content: 'You\'ve spent 40% of your study time on Computer Science. Based on your course load, you might want to increase focus on Mathematics.',
        is_read: false,
        created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        insight_type: 'Achievement',
        content: 'Great job maintaining your 7-day study streak! This consistency is linked to better long-term knowledge retention.',
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        insight_type: 'Environment Impact',
        content: 'Your focus scores are 15% higher when studying in Library environments compared to Home. Consider using the library for challenging material.',
        is_read: true,
        created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const insight of insightData) {
      const { error: insightError } = await supabase
        .from('ai_insights')
        .insert({
          user_id: userId,
          insight_type: insight.insight_type,
          content: insight.content,
          is_read: insight.is_read,
          created_at: insight.created_at
        });
      
      if (insightError) {
        console.error(`❌ Error creating AI insight:`, insightError);
      }
    }
    console.log('✅ Created AI insights for the dashboard');
    
    // 9. Create learning metrics for statistics/charts
    const { error: metricsError } = await supabase
      .from('learning_metrics')
      .upsert({
        user_id: userId,
        cognitive_memory: JSON.stringify([
          { date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), score: 65 },
          { date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(), score: 72 },
          { date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), score: 78 },
          { date: new Date().toISOString(), score: 85 }
        ]),
        cognitive_problem_solving: JSON.stringify([
          { date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), score: 70 },
          { date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(), score: 75 },
          { date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), score: 80 },
          { date: new Date().toISOString(), score: 82 }
        ]),
        weekly_data: JSON.stringify([
          { week: 'Week 1', focus_hours: 10, tasks_completed: 5 },
          { week: 'Week 2', focus_hours: 12, tasks_completed: 7 },
          { week: 'Week 3', focus_hours: 15, tasks_completed: 9 },
          { week: 'Current Week', focus_hours: 8, tasks_completed: 4 }
        ]),
        focus_distribution: JSON.stringify([
          { subject: 'Computer Science', percentage: 45 },
          { subject: 'Mathematics', percentage: 30 },
          { subject: 'Psychology', percentage: 15 },
          { subject: 'Economics', percentage: 10 }
        ]),
        time_of_day_data: JSON.stringify([
          { time: 'Morning', average_focus_score: 85 },
          { time: 'Afternoon', average_focus_score: 75 },
          { time: 'Evening', average_focus_score: 65 },
          { time: 'Night', average_focus_score: 60 }
        ])
      });
    
    if (metricsError) {
      console.error('❌ Error creating learning metrics:', metricsError);
    } else {
      console.log('✅ Created learning metrics for charts and analytics');
    }
    
    // 10. Set user as admin
    const { error: adminRoleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'admin'
      });
    
    if (adminRoleError) {
      console.error('❌ Error setting admin role:', adminRoleError);
    } else {
      console.log('✅ Admin role assigned');
    }
    
    // 11. Create mock friends/social data
    const mockFriends = [
      {
        name: "Alex Johnson",
        username: "alexj",
        university: "Stanford University",
        status: "studying"
      },
      {
        name: "Taylor Smith",
        username: "tsmith",
        university: "MIT",
        status: "available"
      },
      {
        name: "Jordan Lee",
        username: "jlee",
        university: "Stanford University",
        status: "busy"
      }
    ];
    
    for (const friend of mockFriends) {
      // First create the mock user
      const { data: mockUserData } = await supabase.auth.admin.createUser({
        email: `${friend.username}@studytracker.app`,
        password: "MockUser2023!",
        email_confirm: true
      });
      
      if (mockUserData && mockUserData.user) {
        // Create profile
        await supabase
          .from('profiles')
          .update({
            username: friend.username,
            full_name: friend.name,
            university: friend.university,
            status: friend.status
          })
          .eq('id', mockUserData.user.id);
        
        // Create friendship connection
        await supabase
          .from('friends')
          .insert([
            {
              user_id: userId,
              friend_id: mockUserData.user.id,
              status: 'accepted'
            }
          ]);
      }
    }
    console.log('✅ Created mock friend connections');

    // 10. Create user settings for app preferences
    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        notifications: true,
        daily_reminder: "08:00",
        session_end_reminder: true,
        sound: true,
        auto_play_sound: false,
        ambient_noise: 0.5,
        auto_start_next: false,
        tts: false,
        high_contrast: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (settingsError) {
      console.error('❌ Error creating user settings:', settingsError);
    } else {
      console.log('✅ Created user settings for app preferences');
    }
    
    return {
      success: true,
      userId,
      email: adminUser.email,
      password: adminUser.password
    };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return {
      success: false,
      error
    };
  }
}

// Run the function
createAdminUser()
  .then((result) => {
    if (result && result.success) {
      console.log('\n🎉 Admin user creation complete!');
      console.log(`📧 Email: ${result.email}`);
      console.log(`🔑 Password: ${result.password}`);
      console.log(`🆔 User ID: ${result.userId}`);
      console.log('\nThe app will now be automatically populated when signing in with these credentials.');
    } else {
      console.log('\n❌ Admin user creation failed');
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });

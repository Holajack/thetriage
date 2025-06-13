// Path: scripts/create-admin-user.js
// This script creates an admin user with a complete profile and all associated data across tables
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client 
const supabaseUrl = 'https://ucculvnodabrfwbkzsnx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY is required. Please add it to your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Admin user details
const adminUser = {
  email: 'admin@studytracker.app',
  password: 'StudyAdmin2023!',
  username: 'admin',
  fullName: 'Admin User',
  university: 'Stanford University',
  major: 'Computer Science',
  location: 'California, USA',
  timezone: 'America/Los_Angeles',
  classes: ['CS101', 'MATH202', 'PSYCH110'],
};

async function createAdminUser() {
  console.log('🔄 Creating admin user...');
  
  try {
    // 1. Create user in auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true, // Auto-confirms the email
      user_metadata: {
        full_name: adminUser.fullName,
      },
    });
    
    if (userError) {
      console.error('❌ Error creating auth user:', userError);
      return null;
    }
    
    const userId = userData.user.id;
    console.log('✅ Auth user created with ID:', userId);
    
    // 2. Update profile data
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
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
        weeklyfocusgoal: 15,
        soundpreference: 'Lo-Fi',
        focusduration: 25,
        breakduration: 5,
        maingoal: 'Deep Work',
        workstyle: 'Deep Work',
        environment: 'Home',
        fullnamevisibility: 'everyone',
        universityvisibility: 'everyone',
        locationvisibility: 'friends',
        classesvisibility: 'friends',
        last_selected_environment: 'library'
      })
      .eq('id', userId);
    
    if (profileError) {
      console.error('❌ Error updating profile:', profileError);
    } else {
      console.log('✅ Profile updated successfully');
    }
    
    // 3. Complete onboarding preferences
    const { error: onboardingError } = await supabase
      .from('onboarding_preferences')
      .update({
        is_onboarding_complete: true,
        learning_environment: 'Quiet Space',
        sound_preference: 'Lo-Fi',
        work_style: 'Deep Focus',
        user_goal: 'Academic Excellence',
        weekly_focus_goal: 15,
        focus_method: 'Pomodoro',
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
      })
      .eq('user_id', userId);
    
    if (onboardingError) {
      console.error('❌ Error updating onboarding preferences:', onboardingError);
    } else {
      console.log('✅ Onboarding preferences updated successfully');
    }
    
    // 4. Create leaderboard stats
    const { error: leaderboardError } = await supabase
      .from('leaderboard_stats')
      .insert({
        user_id: userId,
        total_focus_time: 8750, // In minutes (about 146 hours)
        total_sessions: 85,
        current_streak: 7,
        longest_streak: 12,
        weekly_focus_time: 840, // 14 hours this week
        monthly_focus_time: 3600, // 60 hours this month
        points: 1240,
        level: 5
      });
    
    if (leaderboardError) {
      console.error('❌ Error creating leaderboard stats:', leaderboardError);
    } else {
      console.log('✅ Leaderboard stats created successfully');
    }
    
    // 5. Create focus sessions (3 completed, 1 active)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    const dayBefore = new Date(now);
    dayBefore.setDate(now.getDate() - 2);
    
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 6);
    
    // Create completed sessions
    const sessions = [
      {
        user_id: userId,
        start_time: lastWeek.toISOString(),
        end_time: new Date(lastWeek.getTime() + 50 * 60000).toISOString(), // 50 min session
        duration: 50,
        milestone_count: 2,
        environment: 'library',
        completed: true,
        subject: 'Computer Science',
        status: 'completed',
        session_type: 'individual'
      },
      {
        user_id: userId,
        start_time: dayBefore.toISOString(),
        end_time: new Date(dayBefore.getTime() + 75 * 60000).toISOString(), // 75 min session
        duration: 75,
        milestone_count: 3,
        environment: 'home',
        completed: true,
        subject: 'Mathematics',
        status: 'completed',
        session_type: 'individual'
      },
      {
        user_id: userId,
        start_time: yesterday.toISOString(),
        end_time: new Date(yesterday.getTime() + 25 * 60000).toISOString(), // 25 min session
        duration: 25,
        milestone_count: 1,
        environment: 'office',
        completed: true,
        subject: 'Psychology',
        status: 'completed',
        session_type: 'individual'
      },
      {
        user_id: userId,
        start_time: now.toISOString(),
        end_time: null,
        duration: null,
        milestone_count: 0,
        environment: 'library',
        completed: false,
        subject: 'Computer Science',
        status: 'active',
        session_type: 'individual'
      }
    ];
    
    for (const session of sessions) {
      const { data: sessionData, error: sessionError } = await supabase
        .from('focus_sessions')
        .insert(session)
        .select();
      
      if (sessionError) {
        console.error(`❌ Error creating focus session:`, sessionError);
      } else {
        console.log(`✅ Focus session created successfully`);
        
        // If the session is completed, add reflection
        if (session.completed && sessionData && sessionData[0]) {
          const { error: reflectionError } = await supabase
            .from('session_reflections')
            .insert({
              session_id: sessionData[0].id,
              user_id: userId,
              user_notes: `Reflection on ${session.subject} study session`,
              mood_rating: Math.floor(Math.random() * 3) + 3, // 3-5 rating
              productivity_rating: Math.floor(Math.random() * 3) + 3, // 3-5 rating
              ai_summary: `You had a productive ${session.duration} minute session working on ${session.subject}. Your focus was good and you completed several key tasks.`
            });
          
          if (reflectionError) {
            console.error(`❌ Error creating reflection:`, reflectionError);
          } else {
            console.log(`✅ Session reflection created successfully`);
          }
        }
      }
    }
    
    // 6. Create tasks
    const tasks = [
      {
        user_id: userId,
        title: 'Complete CS101 Assignment',
        description: 'Finish the data structures homework',
        status: 'pending',
        priority: 'high',
        due_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        order: 1
      },
      {
        user_id: userId,
        title: 'Study for Math Midterm',
        description: 'Focus on chapters 3-5',
        status: 'in-progress',
        priority: 'high',
        due_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        order: 2
      },
      {
        user_id: userId,
        title: 'Psychology reading',
        description: 'Read chapters 7-8 before next lecture',
        status: 'pending',
        priority: 'medium',
        due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        order: 3
      }
    ];
    
    for (const task of tasks) {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert(task)
        .select();
      
      if (taskError) {
        console.error(`❌ Error creating task:`, taskError);
      } else {
        console.log(`✅ Task "${task.title}" created successfully`);
        
        if (taskData && taskData[0]) {
          // Add subtasks
          const subtasks = [
            {
              task_id: taskData[0].id,
              user_id: userId,
              text: `Step 1 for ${task.title}`,
              completed: false,
              order: 1
            },
            {
              task_id: taskData[0].id,
              user_id: userId,
              text: `Step 2 for ${task.title}`,
              completed: false,
              order: 2
            }
          ];
          
          for (const subtask of subtasks) {
            const { error: subtaskError } = await supabase
              .from('subtasks')
              .insert(subtask);
            
            if (subtaskError) {
              console.error(`❌ Error creating subtask:`, subtaskError);
            } else {
              console.log(`✅ Subtask created successfully`);
            }
          }
        }
      }
    }
    
    // 7. Create achievements
    const achievements = [
      {
        user_id: userId,
        achievement_type: 'streak',
        description: 'Maintained a 7-day focus streak',
        earned_at: new Date().toISOString()
      },
      {
        user_id: userId,
        achievement_type: 'milestone',
        description: 'Completed 50 focus sessions',
        earned_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days ago
      },
      {
        user_id: userId,
        achievement_type: 'time',
        description: 'Reached 100 hours of focused study time',
        earned_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
      }
    ];
    
    for (const achievement of achievements) {
      const { error: achievementError } = await supabase
        .from('achievements')
        .insert(achievement);
      
      if (achievementError) {
        console.error(`❌ Error creating achievement:`, achievementError);
      } else {
        console.log(`✅ Achievement "${achievement.description}" created successfully`);
      }
    }
    
    // 8. Create AI insights
    const insights = [
      {
        user_id: userId,
        insight_type: 'focus_pattern',
        content: 'You seem to be most productive in the morning hours between 9-11 AM. Consider scheduling your most important tasks during this time.',
        is_read: false
      },
      {
        user_id: userId,
        insight_type: 'break_suggestion',
        content: 'Your productivity tends to decrease after 90 minutes of continuous focus. Try taking a 10-minute break after each 90-minute session.',
        is_read: true
      },
      {
        user_id: userId,
        insight_type: 'achievement',
        content: 'Great job maintaining your study streak! You\'re in the top 15% of users this week.',
        is_read: false
      }
    ];
    
    for (const insight of insights) {
      const { error: insightError } = await supabase
        .from('ai_insights')
        .insert(insight);
      
      if (insightError) {
        console.error(`❌ Error creating AI insight:`, insightError);
      } else {
        console.log(`✅ AI insight created successfully`);
      }
    }
    
    // 9. Create a study room
    const { data: roomData, error: roomError } = await supabase
      .from('study_rooms')
      .insert({
        name: 'CS Study Group',
        description: 'A group for discussing computer science concepts and problems',
        creator_id: userId,
        is_private: false,
        max_participants: 10,
        current_participants: 1,
        room_code: 'CS101-ROOM',
        topic: 'Computer Science',
        schedule: 'Weekly on Tuesdays and Thursdays',
        duration: '2 hours'
      })
      .select();
    
    if (roomError) {
      console.error('❌ Error creating study room:', roomError);
    } else if (roomData && roomData[0]) {
      console.log('✅ Study room created successfully');
      
      // Add admin as participant
      const { error: participantError } = await supabase
        .from('study_room_participants')
        .insert({
          room_id: roomData[0].id,
          user_id: userId,
          joined_at: new Date().toISOString(),
          last_active_at: new Date().toISOString()
        });
      
      if (participantError) {
        console.error('❌ Error adding participant:', participantError);
      } else {
        console.log('✅ Room participant added successfully');
      }
    }
    
    // 10. Create learning metrics
    const { error: metricsError } = await supabase
      .from('learning_metrics')
      .insert({
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
          { subject: 'Psychology', percentage: 25 }
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
      console.log('✅ Learning metrics created successfully');
    }
    
    // 11. Create learning styles
    const { error: stylesError } = await supabase
      .from('learning_styles')
      .insert({
        user_id: userId,
        physical: 15,
        auditory: 25,
        visual: 40,
        logical: 35,
        vocal: 10,
        primary_style: 'visual'
      });
    
    if (stylesError) {
      console.error('❌ Error creating learning styles:', stylesError);
    } else {
      console.log('✅ Learning styles created successfully');
    }
    
    // Set user as admin
    const { error: adminRoleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin'
      });
    
    if (adminRoleError) {
      console.error('❌ Error setting admin role:', adminRoleError);
    } else {
      console.log('✅ Admin role assigned successfully');
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
    } else {
      console.log('\n❌ Admin user creation failed');
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });

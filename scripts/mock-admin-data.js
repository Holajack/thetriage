// This script adds mock data to the local state of the app for testing purposes
// No actual Supabase API calls are made

/**
 * This function returns mock data for an admin user
 * Import and call this in the userAppData.js file when Supabase calls fail
 */
function getMockAdminData() {
  const userId = 'mock-admin-user-id';
  const now = new Date();
  
  return {
    profile: {
      id: userId,
      username: "admin",
      full_name: "Admin User",
      university: "Stanford University",
      major: "Computer Science",
      location: "California, USA",
      timezone: "America/Los_Angeles",
      classes: ['CS101', 'MATH202', 'PSYCH110', 'ECON101'],
      avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin',
      status: 'available',
      email: 'admin@studytracker.app',
      theme_environment: 'library',
      theme: 'System Default',
      font_size: 'Medium',
      app_icon: 'Default'
    },
    onboarding: {
      user_id: userId,
      is_onboarding_complete: true,
      learning_environment: 'Library',
      sound_preference: 'Lo-Fi',
      work_style: 'Deep Focus',
      user_goal: 'Academic Excellence',
      weekly_focus_goal: 15,
      focus_method: 'Balanced Work-Rest Cycle'
    },
    settings: {
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
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    },
    leaderboard: {
      user_id: userId,
      total_focus_time: 8750,
      total_sessions: 85,
      current_streak: 7,
      longest_streak: 12,
      weekly_focus_time: 840,
      monthly_focus_time: 3600,
      points: 1240,
      level: 5,
      weekly_focus_goal: 15
    },
    sessions: generateMockSessions(userId),
    tasks: generateMockTasks(userId),
    achievements: generateMockAchievements(userId),
    insights: generateMockInsights(userId),
    metrics: generateMockMetrics(userId),
    friends: generateMockFriends(userId),
    
    // Derived data for easy access
    weeklyFocusTime: 840,
    dailyFocusData: generateMockDailyFocusData(),
    dailyTasksCompleted: generateMockDailyTasksCompleted(),
    
    // Helper data
    activeTasks: generateMockTasks(userId).filter(task => task.status !== 'completed'),
    completedTasks: generateMockTasks(userId).filter(task => task.status === 'completed'),
    activeSession: null,
    errors: []
  };
}

function generateMockSessions(userId) {
  const now = new Date();
  const sessions = [];
  
  // Create sessions for the past 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    
    // 1-3 sessions per day
    const sessionsPerDay = Math.floor(Math.random() * 3) + 1;
    
    for (let j = 0; j < sessionsPerDay; j++) {
      const startHour = 9 + Math.floor(Math.random() * 8); // Between 9 AM and 5 PM
      const startDate = new Date(date);
      startDate.setHours(startHour, 0, 0, 0);
      
      const duration = [25, 45, 60, 90][Math.floor(Math.random() * 4)]; // Common durations
      const endDate = new Date(startDate.getTime() + duration * 60000);
      
      const subjects = ['Computer Science', 'Mathematics', 'Psychology', 'Economics'];
      const environments = ['library', 'home', 'coffee_shop', 'office', 'outdoors'];
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      const environment = environments[Math.floor(Math.random() * environments.length)];
      
      sessions.push({
        id: `session-${i}-${j}`,
        user_id: userId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        duration: duration,
        milestone_count: Math.floor(duration / 15),
        environment: environment,
        completed: true,
        subject: subject,
        status: 'completed',
        session_type: Math.random() < 0.8 ? 'individual' : 'group',
        session_reflections: [{
          id: `reflection-${i}-${j}`,
          session_id: `session-${i}-${j}`,
          user_id: userId,
          user_notes: `Reflection on ${subject} study session`,
          mood_rating: Math.floor(Math.random() * 3) + 3, // 3-5 rating
          productivity_rating: Math.floor(Math.random() * 3) + 3, // 3-5 rating
          ai_summary: `You had a productive ${duration} minute session working on ${subject}. Your focus was good and you completed several key tasks.`
        }]
      });
    }
  }
  
  return sessions;
}

function generateMockTasks(userId) {
  const now = new Date();
  
  return [
    {
      id: 'task-1',
      user_id: userId,
      title: 'Complete CS101 Assignment',
      description: 'Finish the data structures homework by implementing a binary search tree',
      status: 'pending',
      priority: 'High',
      due_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      order: 1,
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      subtasks: [
        { id: 'subtask-1-1', task_id: 'task-1', user_id: userId, text: 'Read chapter 5 on tree structures', completed: true, order: 1 },
        { id: 'subtask-1-2', task_id: 'task-1', user_id: userId, text: 'Implement insert() method', completed: false, order: 2 },
        { id: 'subtask-1-3', task_id: 'task-1', user_id: userId, text: 'Implement delete() method', completed: false, order: 3 },
        { id: 'subtask-1-4', task_id: 'task-1', user_id: userId, text: 'Write test cases', completed: false, order: 4 },
        { id: 'subtask-1-5', task_id: 'task-1', user_id: userId, text: 'Submit to Gradescope', completed: false, order: 5 }
      ]
    },
    {
      id: 'task-2',
      user_id: userId,
      title: 'Study for Math Midterm',
      description: 'Focus on linear algebra concepts from chapters 3-5',
      status: 'in-progress',
      priority: 'High',
      due_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      order: 2,
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      subtasks: [
        { id: 'subtask-2-1', task_id: 'task-2', user_id: userId, text: 'Review eigenvalues and eigenvectors', completed: true, order: 1 },
        { id: 'subtask-2-2', task_id: 'task-2', user_id: userId, text: 'Practice determinant calculations', completed: true, order: 2 },
        { id: 'subtask-2-3', task_id: 'task-2', user_id: userId, text: 'Do practice problems 1-10', completed: false, order: 3 },
        { id: 'subtask-2-4', task_id: 'task-2', user_id: userId, text: "Review professor's lecture notes", completed: false, order: 4 }
      ]
    },
    {
      id: 'task-3',
      user_id: userId,
      title: 'Psychology reading',
      description: 'Read chapters 7-8 on cognitive psychology before next lecture',
      status: 'pending',
      priority: 'Medium',
      due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      order: 3,
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      subtasks: [
        { id: 'subtask-3-1', task_id: 'task-3', user_id: userId, text: 'Read chapter 7 on memory', completed: false, order: 1 },
        { id: 'subtask-3-2', task_id: 'task-3', user_id: userId, text: 'Read chapter 8 on problem solving', completed: false, order: 2 },
        { id: 'subtask-3-3', task_id: 'task-3', user_id: userId, text: 'Take notes on key concepts', completed: false, order: 3 },
        { id: 'subtask-3-4', task_id: 'task-3', user_id: userId, text: 'Prepare questions for discussion', completed: false, order: 4 }
      ]
    },
    {
      id: 'task-4',
      user_id: userId,
      title: 'Complete weekly coding challenge',
      description: 'Solve the leetcode problem of the week',
      status: 'completed',
      priority: 'Low',
      due_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      order: 4,
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      subtasks: [
        { id: 'subtask-4-1', task_id: 'task-4', user_id: userId, text: 'Understand the problem', completed: true, order: 1 },
        { id: 'subtask-4-2', task_id: 'task-4', user_id: userId, text: 'Plan solution approach', completed: true, order: 2 },
        { id: 'subtask-4-3', task_id: 'task-4', user_id: userId, text: 'Implement solution', completed: true, order: 3 },
        { id: 'subtask-4-4', task_id: 'task-4', user_id: userId, text: 'Optimize for better time complexity', completed: true, order: 4 },
        { id: 'subtask-4-5', task_id: 'task-4', user_id: userId, text: 'Submit solution', completed: true, order: 5 }
      ]
    },
    {
      id: 'task-5',
      user_id: userId,
      title: 'Review project feedback',
      description: "Go through professor's comments on the last project submission",
      status: 'completed',
      priority: 'Medium',
      due_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      order: 5,
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      subtasks: [
        { id: 'subtask-5-1', task_id: 'task-5', user_id: userId, text: 'Read all comments', completed: true, order: 1 },
        { id: 'subtask-5-2', task_id: 'task-5', user_id: userId, text: 'Note areas for improvement', completed: true, order: 2 },
        { id: 'subtask-5-3', task_id: 'task-5', user_id: userId, text: 'Schedule office hours if needed', completed: true, order: 3 },
        { id: 'subtask-5-4', task_id: 'task-5', user_id: userId, text: 'Update project document', completed: true, order: 4 }
      ]
    }
  ];
}

function generateMockAchievements(userId) {
  const now = new Date();
  
  return [
    {
      id: 'achievement-1',
      user_id: userId,
      achievement_type: 'First Focus Session',
      description: 'Completed your first focus session',
      earned_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'achievement-2',
      user_id: userId,
      achievement_type: 'Week Streak',
      description: 'Maintained a 7-day focus streak',
      earned_at: new Date().toISOString()
    },
    {
      id: 'achievement-3',
      user_id: userId,
      achievement_type: '5 Tasks Completed',
      description: 'Completed 5 tasks',
      earned_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'achievement-4',
      user_id: userId,
      achievement_type: 'Time Milestone',
      description: 'Reached 100 hours of focused study time',
      earned_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'achievement-5',
      user_id: userId,
      achievement_type: 'Subject Master',
      description: 'Spent 50+ hours studying Computer Science',
      earned_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

function generateMockInsights(userId) {
  const now = new Date();
  
  return [
    {
      id: 'insight-1',
      user_id: userId,
      insight_type: 'Focus Pattern',
      content: 'You seem to be most productive between 9-11 AM. Consider scheduling your most important tasks during this morning productivity window.',
      is_read: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'insight-2',
      user_id: userId,
      insight_type: 'Break Suggestion',
      content: 'Your sessions lasting over 60 minutes show declining productivity near the end. Try using a 45/15 minute work/break ratio for better sustained focus.',
      is_read: true,
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'insight-3',
      user_id: userId,
      insight_type: 'Subject Analysis',
      content: "You've spent 40% of your study time on Computer Science. Based on your course load, you might want to increase focus on Mathematics.",
      is_read: false,
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'insight-4',
      user_id: userId,
      insight_type: 'Achievement',
      content: 'Great job maintaining your 7-day study streak! This consistency is linked to better long-term knowledge retention.',
      is_read: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'insight-5',
      user_id: userId,
      insight_type: 'Environment Impact',
      content: 'Your focus scores are 15% higher when studying in Library environments compared to Home. Consider using the library for challenging material.',
      is_read: true,
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

function generateMockMetrics(userId) {
  const now = new Date();
  
  return {
    id: 'metrics-1',
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
  };
}

function generateMockFriends(userId) {
  return [
    {
      id: 'friend-1',
      user_id: userId,
      friend_id: 'friend-user-1',
      status: 'accepted',
      created_at: new Date().toISOString(),
      friend: {
        id: 'friend-user-1',
        username: 'alexj',
        full_name: 'Alex Johnson',
        avatar_url: null,
        university: 'Stanford University',
        status: 'studying'
      }
    },
    {
      id: 'friend-2',
      user_id: userId,
      friend_id: 'friend-user-2',
      status: 'accepted',
      created_at: new Date().toISOString(),
      friend: {
        id: 'friend-user-2',
        username: 'tsmith',
        full_name: 'Taylor Smith',
        avatar_url: null,
        university: 'MIT',
        status: 'available'
      }
    },
    {
      id: 'friend-3',
      user_id: userId,
      friend_id: 'friend-user-3',
      status: 'accepted',
      created_at: new Date().toISOString(),
      friend: {
        id: 'friend-user-3',
        username: 'jlee',
        full_name: 'Jordan Lee',
        avatar_url: null,
        university: 'Stanford University',
        status: 'busy'
      }
    }
  ];
}

function generateMockDailyFocusData() {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const result = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dayName = daysOfWeek[date.getDay()];
    const dateString = date.toISOString().split('T')[0];
    
    // Generate random hours but make a pattern (higher mid-week)
    let hours;
    if (i === 3 || i === 4) {
      // Mid-week peak
      hours = 2 + Math.random() * 2;
    } else if (i === 0 || i === 6) {
      // Weekend lower
      hours = 0.5 + Math.random() * 1.5;
    } else {
      // Regular days
      hours = 1 + Math.random() * 2;
    }
    
    result.push({
      day: dayName,
      hours: Math.round(hours * 10) / 10, // Round to 1 decimal place
      date: dateString
    });
  }
  
  return result;
}

function generateMockDailyTasksCompleted() {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const result = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dayName = daysOfWeek[date.getDay()];
    const dateString = date.toISOString().split('T')[0];
    
    // Generate random tasks completed
    let count;
    if (i === 2 || i === 3) {
      // Mid-week peak
      count = Math.floor(Math.random() * 3) + 2;
    } else if (i === 0 || i === 6) {
      // Weekend lower
      count = Math.floor(Math.random() * 2);
    } else {
      // Regular days
      count = Math.floor(Math.random() * 2) + 1;
    }
    
    result.push({
      day: dayName,
      count: count,
      date: dateString
    });
  }
  
  return result;
}

module.exports = { getMockAdminData };

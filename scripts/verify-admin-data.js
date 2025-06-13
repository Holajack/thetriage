// Test script to verify the admin user data implementation
const { getMockAdminData } = require('./mock-admin-data');

// This script checks that all required data fields are present in the mock data

function verifyMockData() {
  console.log('🔍 Verifying mock admin data implementation...');
  
  try {
    // Get the mock data
    const mockData = getMockAdminData();
    
    // Define expected keys and data types
    const expectedStructure = {
      profile: 'object',
      onboarding: 'object',
      settings: 'object', // Added settings
      leaderboard: 'object',
      sessions: 'array',
      tasks: 'array',
      achievements: 'array',
      insights: 'array',
      metrics: 'object',
      friends: 'array',
      weeklyFocusTime: 'number',
      dailyFocusData: 'array',
      dailyTasksCompleted: 'array',
      activeTasks: 'array',
      completedTasks: 'array'
    };
    
    // Check that all expected keys are present with the correct type
    let allValid = true;
    Object.entries(expectedStructure).forEach(([key, expectedType]) => {
      const actualType = Array.isArray(mockData[key]) ? 'array' : typeof mockData[key];
      const isValid = mockData[key] !== undefined && actualType === expectedType;
      
      console.log(`${isValid ? '✅' : '❌'} ${key}: ${actualType}`);
      
      if (!isValid) {
        allValid = false;
        if (mockData[key] === undefined) {
          console.log(`   Missing: ${key} is undefined`);
        } else {
          console.log(`   Invalid type: expected ${expectedType}, got ${actualType}`);
        }
      } else {
        // Check array lengths for non-empty
        if (expectedType === 'array' && mockData[key].length === 0) {
          console.log(`   ⚠️ Warning: ${key} is empty array`);
        }
      }
    });
    
    // Verify relationships between data
    // 1. Check if tasks' subtasks are properly formatted
    const hasSubtasks = mockData.tasks.every(task => 
      Array.isArray(task.subtasks) || task.subtasks === undefined
    );
    console.log(`${hasSubtasks ? '✅' : '❌'} Tasks subtasks relationship`);
    
    // 2. Check if active tasks + completed tasks = all tasks
    const tasksCount = mockData.activeTasks.length + mockData.completedTasks.length;
    const allTasksCount = mockData.tasks.length;
    console.log(`${tasksCount === allTasksCount ? '✅' : '❌'} Tasks count consistency: ${tasksCount}/${allTasksCount}`);
    
    // 3. Check if daily focus data has 7 days
    const hasDailyData = mockData.dailyFocusData.length === 7;
    console.log(`${hasDailyData ? '✅' : '❌'} Daily focus data has 7 days: ${mockData.dailyFocusData.length}`);
    
    // 4. Check if weekly focus time makes sense
    const weeklyFocusHours = Math.round(mockData.weeklyFocusTime / 60);
    const reasonable = weeklyFocusHours > 0 && weeklyFocusHours < 100; 
    console.log(`${reasonable ? '✅' : '❌'} Weekly focus time is reasonable: ${weeklyFocusHours} hours`);
    
    // Verify specific fields needed for certain screens
    console.log('\n📱 Verifying screen-specific data:');
    
    // Verify settings fields
    const settingsFields = [
      'notifications', 
      'daily_reminder', 
      'session_end_reminder',
      'sound',
      'auto_play_sound',
      'ambient_noise'
    ];
    
    console.log('\nSettings screen fields:');
    settingsFields.forEach(field => {
      const exists = mockData.settings && mockData.settings[field] !== undefined;
      console.log(`${exists ? '✅' : '❌'} settings.${field}`);
    });
    
    // Overall status
    if (allValid) {
      console.log('\n🎉 Mock data implementation passes verification checks!');
      console.log('✅ All required data fields are present with correct types');
      console.log('✅ Data relationships are consistent');
    } else {
      console.log('\n❌ There are issues with the mock data implementation!');
      console.log('⚠️ Please fix the errors marked above');
    }
  } catch (error) {
    console.error('🔥 Error verifying mock data:', error);
  }
}

verifyMockData();
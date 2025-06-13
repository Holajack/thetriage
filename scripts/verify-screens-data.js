// Script to verify that all required data for main app screens is available
// This helps ensure the admin user has all the data needed to display screens properly
const { getMockAdminData } = require('./mock-admin-data');

// Object defining what data is needed for each screen
const SCREEN_DATA_REQUIREMENTS = {
  HomeScreen: {
    requiredData: ['profile', 'tasks', 'insights', 'leaderboard', 'achievements'],
    optionalData: ['sessions', 'weeklyFocusTime'],
    dataTests: {
      'Has active tasks': (data) => (data.activeTasks?.length > 0),
      'Has insights': (data) => (data.insights?.length > 0),
      'Has achievements': (data) => (data.achievements?.length > 0),
      'Has weekly goal': (data) => (data.leaderboard?.weekly_focus_goal > 0)
    }
  },
  ProfileScreen: {
    requiredData: ['profile', 'leaderboard', 'achievements'],
    optionalData: ['sessions'],
    dataTests: {
      'Has profile fields': (data) => (data.profile?.username && data.profile?.full_name),
      'Has avatar URL': (data) => (!!data.profile?.avatar_url),
      'Has stats data': (data) => (data.leaderboard?.total_sessions > 0 && data.leaderboard?.total_focus_time > 0)
    }
  },
  LeaderboardScreen: {
    requiredData: ['leaderboard', 'friends'],
    optionalData: [],
    dataTests: {
      'Has friends data': (data) => (data.friends?.length > 0),
      'Has points': (data) => (data.leaderboard?.points > 0),
      'Has streaks': (data) => (data.leaderboard?.current_streak > 0)
    }
  },
  AnalyticsScreen: {
    requiredData: ['sessions', 'metrics'],
    optionalData: ['tasks'],
    dataTests: {
      'Has session data': (data) => (data.sessions?.length > 0),
      'Has metrics data': (data) => (!!data.metrics),
      'Has weekly focus data': (data) => (data.weeklyFocusTime > 0),
      'Has daily focus data': (data) => (data.dailyFocusData?.length > 0)
    }
  },
  SettingsScreen: {
    requiredData: ['profile', 'onboarding', 'settings'],
    optionalData: [],
    dataTests: {
      'Has theme settings': (data) => (data.profile?.theme !== undefined),
      'Has sound preferences': (data) => (data.onboarding?.sound_preference),
      'Has notification settings': (data) => (data.settings?.notifications !== undefined),
      'Has focus method': (data) => (!!data.onboarding?.focus_method)
    }
  },
  BrainMappingScreen: {
    requiredData: ['sessions', 'tasks'],
    optionalData: ['metrics'],
    dataTests: {
      'Has subject data': (data) => {
        if (!data.tasks?.length) return false;
        return data.tasks.some(task => task.title?.includes(' '));
      },
      'Has session data': (data) => (data.sessions?.length > 0)
    }
  },
  StudySessionScreen: {
    requiredData: ['profile', 'settings', 'sessions'],
    optionalData: ['tasks'],
    dataTests: {
      'Has sound settings': (data) => (data.settings?.sound !== undefined),
      'Has focus method settings': (data) => (!!data.onboarding?.focus_method)
    }
  }
};

function verifyAdminDataForScreens() {
  console.log('🔍 Verifying admin data for all app screens...\n');
  
  // Get the mock admin data
  const userData = getMockAdminData();
  
  let overallSuccess = true;
  
  // Test each screen
  Object.entries(SCREEN_DATA_REQUIREMENTS).forEach(([screenName, requirements]) => {
    console.log(`📱 Testing ${screenName}:`);
    console.log('-'.repeat(screenName.length + 10));
    
    // Check required data
    let screenSuccess = true;
    requirements.requiredData.forEach(dataKey => {
      const hasData = userData[dataKey] !== undefined && 
        (userData[dataKey] !== null) &&
        !(Array.isArray(userData[dataKey]) && userData[dataKey].length === 0);
      
      console.log(`${hasData ? '✅' : '❌'} Required: ${dataKey}`);
      if (!hasData) screenSuccess = false;
    });
    
    // Check optional data
    requirements.optionalData.forEach(dataKey => {
      const hasData = userData[dataKey] !== undefined && 
        (userData[dataKey] !== null) &&
        !(Array.isArray(userData[dataKey]) && userData[dataKey].length === 0);
      
      console.log(`${hasData ? '✓' : '⚠️'} Optional: ${dataKey}`);
    });
    
    // Run specific data tests
    console.log('\nData Quality Tests:');
    Object.entries(requirements.dataTests).forEach(([testName, testFn]) => {
      const testResult = testFn(userData);
      console.log(`${testResult ? '✅' : '❌'} ${testName}`);
      if (!testResult) screenSuccess = false;
    });
    
    // Screen summary
    if (screenSuccess) {
      console.log(`\n✅ ${screenName} data is complete\n`);
    } else {
      console.log(`\n❌ ${screenName} has missing or incomplete data\n`);
      overallSuccess = false;
    }
  });
  
  // Overall summary
  if (overallSuccess) {
    console.log('🎉 SUCCESS: Admin user data is complete for all screens!');
    console.log('You can safely use the admin user to test and demo the app.');
  } else {
    console.log('⚠️ WARNING: Some screens may not display correctly with current admin data.');
    console.log('Check the issues above and update the mock data or database records.');
  }
  
  return overallSuccess;
}

// Run the verification
verifyAdminDataForScreens();

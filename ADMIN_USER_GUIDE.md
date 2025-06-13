# Study Tracker Admin User Implementation Guide

## Overview

This guide explains the complete implementation of the admin user data system for the Study Tracker app. The system is designed to populate all the main app screens with realistic mock data for testing and development purposes.

## Components

### 1. Data Access Layer
- **Location**: `/src/utils/userAppData.js`
- **Purpose**: Central utilities for accessing user data across the app
- **Key Functions**:
  - `fetchUserAppData()`: Gets all data for a user from Supabase or mock data
  - `useUserAppData()`: React hook wrapper for the fetch function
  - `getDailyInspiration()`: Provides motivational quotes
  - `getLeaderboardData()`: Gets leaderboard statistics

### 2. Mock Data System
- **Location**: `/scripts/mock-admin-data.js`
- **Purpose**: Provides realistic mock data when Supabase is unavailable
- **Usage**: Set `USE_MOCK_DATA = true` in userAppData.js to enable
- **Data Types**:
  - User profile
  - Onboarding settings
  - Focus sessions history
  - Tasks with subtasks
  - Achievements
  - AI insights
  - Leaderboard stats
  - Friends list

### 3. Admin User Creation
- **Location**: `/scripts/create-admin-with-data.js`
- **Purpose**: Creates a full admin user with test data in a real Supabase instance
- **Features**:
  - Supports dry-run mode with `--dry-run` flag
  - Creates data with proper relationships
  - Admin login: `admin@studytracker.app` / `StudyAdmin2023!`

### 4. Test Scripts
- **Locations**:
  - `/scripts/verify-admin-data.js`: Validates mock data quality
  - `/scripts/test-admin-login-fixed.js`: Tests admin login and data access
  - `/scripts/verify-screens-data.js`: Verifies data for all main screens

### 5. Updated Screens
The following screens were updated to use the unified data system:
- **HomeScreen**: `/src/screens/main/HomeScreen.tsx`
- **ProfileScreen**: `/src/screens/main/ProfileScreen.tsx`
- **LeaderboardScreen**: `/src/screens/main/LeaderboardScreen.tsx`
- **AnalyticsScreen**: `/src/screens/main/AnalyticsScreen.tsx`
- **SettingsScreen**: `/src/screens/main/SettingsScreen.tsx`
- **BrainMappingScreen**: `/src/screens/main/BrainMappingScreen.tsx`
- **StudySessionScreen**: `/src/screens/main/StudySessionScreen.tsx`

## How to Use

### Development Mode with Mock Data
1. Set `USE_MOCK_DATA = true` in `src/utils/userAppData.js` (already set by default)
2. Run the app normally - all screens will display mock data without requiring Supabase access
3. Run `node scripts/verify-screens-data.js` to check if all screens have the necessary data

### Production Mode with Real Admin User
1. Set `SUPABASE_SERVICE_KEY` in your `.env` file
2. Run `node scripts/create-admin-with-data.js` to create the admin user in Supabase
3. Set `USE_MOCK_DATA = false` in `src/utils/userAppData.js`
4. Login with admin credentials:
   - Email: `admin@studytracker.app`
   - Password: `StudyAdmin2023!`

### Testing the Implementation
1. Run `node scripts/verify-admin-data.js` to verify mock data quality
2. Run `node scripts/test-admin-login-fixed.js` to test admin login and data access
3. Run `node scripts/verify-screens-data.js` to ensure all screens have required data

### For Development (Without Supabase)
1. Set `USE_MOCK_DATA = true` in `/src/utils/userAppData.js`
2. Run the app normally - all screens will use mock data
3. Test with: `node scripts/verify-admin-data.js`

### For Production Testing (With Supabase)
1. Set `USE_MOCK_DATA = false` in `/src/utils/userAppData.js`
2. Update `.env` with your Supabase service key:
   ```
   SUPABASE_SERVICE_KEY=your_actual_service_key
   ```
3. Create admin user: `node scripts/create-admin-with-data.js`
4. Login with admin credentials

## Data Schema

The data structure follows this format:

```javascript
{
  profile: { /* User profile info */ },
  onboarding: { /* Onboarding preferences */ },
  leaderboard: { /* Stats and rankings */ },
  sessions: [ /* Focus session history */ ],
  tasks: [ /* Task list with subtasks */ ],
  achievements: [ /* User achievements */ ],
  insights: [ /* AI insights for improvement */ },
  metrics: { /* Learning metrics data */ },
  friends: [ /* Friend connections */ },
  
  // Derived data
  weeklyFocusTime: 840, // minutes
  dailyFocusData: [ /* Chart data by day */ ],
  dailyTasksCompleted: [ /* Tasks by day */ ],
  
  // Helper collections
  activeTasks: [ /* Non-completed tasks */ ],
  completedTasks: [ /* Completed tasks */ ]
}
```

## Fallback Mechanism

The system includes a built-in fallback:

1. It first tries to fetch real data from Supabase
2. If that fails (or if USE_MOCK_DATA is true), it uses the mock data
3. Components receive the same data structure regardless of source

This ensures the app can be developed and tested without requiring constant Supabase connection.

## Next Steps

1. **Testing**: Add test cases for edge conditions and error states
2. **Extend Implementation**: Apply the unified data pattern to additional screens
3. **Performance**: Add caching for frequently accessed data
4. **Offline Support**: Expand mock data system to handle offline usage

## Troubleshooting

- **API Key Issues**: Check that `SUPABASE_SERVICE_KEY` is correctly set in `.env`
- **Missing Data**: Verify tables exist in your Supabase instance
- **Mock Data Problems**: Run `verify-admin-data.js` to check data integrity

## Credits

Implementation completed on June 2, 2025 for the Study Tracker app.

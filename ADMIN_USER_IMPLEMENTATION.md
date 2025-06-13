# Admin User Data Implementation

This document explains the implementation of the admin user data system for the Study Tracker app.

## Overview

The admin user implementation provides a comprehensive set of mock data to populate all screens in the app. This ensures that developers and testers can see how the app looks and functions with realistic data without requiring a fully configured Supabase backend.

## Implementation Details

### 1. Data Access Layer

Created a unified data access layer in `src/utils/userAppData.js`:

- **`fetchUserAppData()`** - Fetches data from all important tables for a user
- **`useUserAppData()`** - React hook wrapper for the fetch function
- **`getDailyInspiration()`** - Helper for motivational quotes
- **`getLeaderboardData()`** - Fetches and formats leaderboard data

### 2. Mock Data System

Created `scripts/mock-admin-data.js` to provide offline mock data when Supabase is unavailable:

- Generates realistic mock data for all tables
- Follows the same data structure as the real Supabase backend
- Includes sample data for:
  - User profile
  - Onboarding preferences
  - Focus sessions across days of week
  - Tasks with varied statuses
  - Subtasks with completion states
  - Achievements and badges
  - AI insights
  - Learning metrics
  - Leaderboard statistics
  - Friend connections

### 3. Screen Implementations

Updated key screens to use the unified data layer:

- **HomeScreen** - Charts, tasks, insights, achievements
- **ProfileScreen** - User stats, streak information
- **LeaderboardScreen** - Ranking and focus stats

### 4. Fallback Mechanism

Implemented a fallback system for development environments:

- **`USE_MOCK_DATA`** flag in userAppData.js controls whether to use mock data
- When true, the app functions identically but uses local data instead of API calls
- When false, the app uses real Supabase connections

### 5. Real Data Implementation

For production environments:

- Created `scripts/create-admin-with-data.js` which populates all tables with proper relationships
- Supports dry-run mode for testing the data creation process (`--dry-run` flag)

## Usage

1. **Development Environment**:
   - Set `USE_MOCK_DATA = true` in userAppData.js
   - All screens will automatically use mock data

2. **Production/Testing Environment**:
   - Set `USE_MOCK_DATA = false`
   - Run `node scripts/create-admin-with-data.js` to create admin user
   - Sign in with admin credentials: admin@studytracker.app / StudyAdmin2023!

3. **Data Updating**:
   - Each screen implements a refresh mechanism
   - Actions like adding tasks, completing focus sessions update the data

## Data Schema

The mock and real data implementations follow this schema:

```javascript
{
  profile: { /* User profile data */ },
  onboarding: { /* Onboarding preferences */ },
  leaderboard: { /* Ranking and statistics */ },
  sessions: [ /* Focus session history */ ],
  tasks: [ /* Tasks with subtasks */ ],
  achievements: [ /* User achievements and badges */ ],
  insights: [ /* AI-powered insights */ ],
  metrics: { /* Learning metrics and statistics */ },
  friends: [ /* Friend connections */ ],
  
  // Derived data for convenience
  weeklyFocusTime: 840, // in minutes
  dailyFocusData: [ /* Formatted data for charts */ ],
  dailyTasksCompleted: [ /* Task completion by day */ ],
  
  // Helper groupings
  activeTasks: [ /* Pending and in-progress tasks */ ],
  completedTasks: [ /* Completed tasks */ ]
}
```

## Next Steps

1. **Testing**: Verify that all screens correctly display data in both mock and real data modes
2. **Performance**: Add pagination or lazy loading for large data sets
3. **Caching**: Implement data caching to reduce API calls
4. **Offline Support**: Extend mock data system to support offline functionality
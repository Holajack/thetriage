# Triage System: Study Tracker App

A powerful study tracking application designed to help students stay focused, track their progress, and achieve academic goals.

## Features

- **Focus Sessions**: Multiple focus methods (Balanced, Sprint, Deep Work)
- **Study Rooms**: Collaborate with others in virtual study rooms
- **Progress Tracking**: Track your study time and achievements
- **Leaderboards**: Compare your progress with friends
- **Analytics**: Gain insights into your study habits
- **Personalized Experience**: Customizable settings and preferences

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **State Management**: React Context API
- **Navigation**: React Navigation v6
- **Styling**: StyleSheet API with custom theming

## Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/StudyTrackerNew.git
cd StudyTrackerNew
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables by creating a `.env` file:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm start
```

5. Apply database migrations:
```bash
# In Supabase SQL Editor, run:
# 1. create_onboarding_tables.sql
# 2. 20240729000000_add_rls_to_leaderboard_stats.sql
```

## Deployment

### GitHub

```bash
./deploy.sh
```

### Expo

```bash
./publish-expo.sh
```

## Screenshots

[Coming soon]

## Credits

© The Triage System

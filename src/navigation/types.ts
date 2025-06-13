import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: { showSignupTab?: boolean } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  EmailVerification: { email: string };
};

export type OnboardingStackParamList = {
  FocusMethodIntro: undefined;
  AccountCreation: { focusMethod?: string } | undefined;
  ProfileCreation: { focusMethod?: string; email?: string } | undefined;
  PrivacySettings: { focusMethod?: string } | undefined;
  AppTutorial: { focusMethod?: string } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Community: { initialTab?: string } | undefined;
  Patrick: undefined;
  Bonuses: undefined;
  Results: undefined;
  Leaderboard: undefined;
  Profile: undefined;
  Settings: undefined;
  ProfileMain: undefined;
  PersonalInformation: undefined;
  Education: undefined;
  LocationAndTime: undefined;
  Privacy: undefined;
  Preferences: undefined;
  PatrickSpeak: {
    initialMessage?: string;
    isResponse?: boolean;
    responseMessage?: string;
  };
  QuizPrompt?: undefined;
  HistoryPrompt?: undefined;
  EBooks?: undefined;
  SelfDiscoveryQuiz?: undefined;
  BrainMapping?: undefined;
  Achievements?: undefined;
  SessionReport?: undefined;
};

export type MessageContact = {
  name: string;
  avatar: string;
  status: string;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  BreakTimerScreen: undefined;
  StudySessionScreen: { task?: Task };
  SessionReportScreen: {
    sessionDuration: number;
    breakCount: number;
    taskCompleted: boolean;
    focusRating: number;
    notes?: string;
    sessionType: string;
  };
  SessionHistory: undefined; // Add this line
  PatrickSpeak: undefined;
  MessageScreen: undefined;
  StudyRoomScreen: undefined;
};
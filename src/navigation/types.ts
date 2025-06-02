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
  Landing: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  StudySessionScreen: { group?: boolean; room?: any } | undefined;
  SessionReportScreen: undefined;
  MessageScreen: { contact: MessageContact } | undefined;
  StudyRoomScreen: { room: any };
  PatrickSpeak: {
    initialMessage?: string;
    isResponse?: boolean;
    responseMessage?: string;
  };
};
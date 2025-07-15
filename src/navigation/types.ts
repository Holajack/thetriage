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

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  BreakTimerScreen: {
    sessionData?: {
      duration: number;
      task: string;
      focusRating: number;
      productivityRating: number;
      notes?: string;
      completedFullSession: boolean;
      sessionType: 'auto' | 'manual';
      subject: string;
      plannedDuration: number;
    };
  } | undefined;
  StudySessionScreen: { 
    task?: Task;
    group?: boolean; 
    room?: any;
    autoStart?: boolean;
    selectedTask?: any;
    manualSelection?: boolean;
  } | undefined;
  SessionReportScreen: {
    sessionDuration: number;
    breakDuration: number;
    taskCompleted: boolean;
    focusRating: number;
    notes?: string;
    sessionType: 'auto' | 'manual';
    subject: string;
    plannedDuration: number;
    productivity: number;
  } | undefined;
  SessionHistory: undefined;
  NoraSpeak: {
    initialMessage?: string;
    isResponse?: boolean;
    responseMessage?: string;
    pdfContext?: {
      title: string;
      url: string;
      fileSize?: number;
    };
  };
  QuizPrompt?: undefined;
  HistoryPrompt?: undefined;
  EBooks?: undefined;
  PDFViewer: {
    url: string;
    title: string;
    bookData: any;
  };
  Nora: {
    initialMessage?: string;
    pdfContext?: {
      title: string;
      url: string;
      fileSize?: number;
    };
  };
  Achievements: undefined;
  SelfDiscoveryQuiz: undefined;
  BrainMapping: undefined;
  Quizzes: undefined;
  Landing: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
};

export type MainTabParamList = {
  Home: undefined;
  Community: { initialTab?: string } | undefined;
  Nora: undefined;
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
  NoraSpeak: {
    initialMessage?: string;
    isResponse?: boolean;
    responseMessage?: string;
    pdfContext?: {
      title: string;
      url: string;
      fileSize?: number;
    };
  };
  QuizPrompt?: undefined;
  HistoryPrompt?: undefined;
  EBooks?: undefined;
  PDFViewer: {
    url: string;
    title: string;
    bookData: any;
  };
  Nora: {
    initialMessage?: string;
    pdfContext?: {
      title: string;
      url: string;
      fileSize?: number;
    };
  };
  Achievements: undefined;
  SelfDiscoveryQuiz: undefined;
  BrainMapping: undefined;
  Quizzes: undefined;
  SessionReport: undefined;
};

export type MessageContact = {
  name: string;
  avatar: string;
  status: string;
};

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'High' | 'Medium' | 'Low';
  subject?: string;
  created_at: string;
  completed?: boolean;
}
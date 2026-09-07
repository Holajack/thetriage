import { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: { showSignupTab?: boolean } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { access_token?: string; refresh_token?: string } | undefined;
  EmailVerification: { email: string };
  SignInVerification: { email: string };
  TwoFactorVerification: { email: string };
};

export type OnboardingStackParamList = {
  AgeGate: undefined;
  AccountCreation: undefined;
  EmailVerification: {
    email: string;
    password?: string;
    username?: string;
    fullName?: string;
  };
  ProfileCreation:
    | { email?: string; username?: string; fullName?: string }
    | undefined;
  TrailBuddyOnboarding: undefined;
  FocusSoundSetup: undefined;
  FocusMethodIntro: undefined;
  StudyPreferences: { focusMethod?: string } | undefined;
  PrivacySettings: { focusMethod?: string } | undefined;
  AppTutorial: { focusMethod?: string } | undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: { showWalkthrough?: boolean; screen?: string } | undefined;
  BreakTimerScreen:
    | {
        sessionData?: {
          duration: number;
          task: string;
          focusRating: number;
          productivityRating: number;
          notes?: string;
          completedFullSession: boolean;
          sessionType: "auto" | "manual";
          subject: string;
          plannedDuration: number;
        };
        focusMode?: "basecamp" | "summit";
        tasks?: any[];
        nextTaskIndex?: number;
        completedTasksData?: any[];
        duration?: number;
        autoProgress?: boolean;
        breakDuration?: number;
        /** The focus session this break follows (achievements.recordBreak). */
        sessionId?: string;
      }
    | undefined;
  StudySessionScreen:
    | {
        task?: Task;
        group?: boolean;
        room?: any;
        autoStart?: boolean;
        selectedTask?: any;
        manualSelection?: boolean;
        selectionMode?: "auto" | "manual";
        focusMode?: "basecamp" | "summit";
        tasks?: any[];
        duration?: number;
        breakDuration?: number;
        autoProgress?: boolean;
        currentTaskIndex?: number;
        completedTasksData?: any[];
        sessionType?: "deep_work" | "balanced" | "sprint";
      }
    | undefined;
  SessionReportScreen:
    | {
        sessionDuration: number;
        breakDuration: number;
        taskCompleted: boolean;
        focusRating: number;
        notes?: string;
        sessionType: "auto" | "manual";
        subject: string;
        plannedDuration: number;
        productivity: number;
        focusMode?: "basecamp" | "summit";
        completedTasksData?: any[];
        /** Badges focusSessions.end actually awarded for this session. */
        newAchievements?: {
          achievementType: string;
          title: string;
          description: string;
          category: string;
        }[];
      }
    | undefined;
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
  PatrickSpeak: { initialMessage?: string } | undefined;
  MessageScreen: { contact: MessageContact } | undefined;
  StudyRoomScreen: { room?: any; roomCode?: string } | undefined;
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
  NineLayerPreview: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
};

export type MainTabParamList = {
  Home: undefined;
  Community: { initialTab?: string } | undefined;
  Nora:
    | {
        initialMessage?: string;
        pdfContext?: {
          title: string;
          url: string;
          fileSize?: number;
        };
      }
    | undefined;
  Bonuses: undefined;
  Results: undefined;
  Leaderboard: undefined;
  Profile: undefined;
  Shop: undefined;
  Settings: undefined;
  TrailBuddySelection: undefined;
  ProfileMain: undefined;
  ProfileCustomization: undefined;
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
  Patrick: undefined;
  PatrickSpeak: { initialMessage?: string } | undefined;
  MessageScreen: { contact: MessageContact } | undefined;
  StudyRoomScreen: { room?: any; roomCode?: string } | undefined;
  SessionHistory: undefined;
  FocusPreparation: undefined;
  StudySessionScreen:
    | {
        task?: Task;
        group?: boolean;
        room?: any;
        autoStart?: boolean;
        selectedTask?: any;
        manualSelection?: boolean;
        selectionMode?: "auto" | "manual";
        focusMode?: "basecamp" | "summit";
        tasks?: any[];
        duration?: number;
        breakDuration?: number;
        autoProgress?: boolean;
        currentTaskIndex?: number;
        completedTasksData?: any[];
        sessionType?: "deep_work" | "balanced" | "sprint";
      }
    | undefined;
  QuizPrompt?: undefined;
  HistoryPrompt?: undefined;
  EBooks?: undefined;
  PDFViewer: {
    url: string;
    title: string;
    bookData: any;
  };
  Achievements: undefined;
  SelfDiscoveryQuiz: undefined;
  BrainMapping: undefined;
  Quizzes: undefined;
  SessionReport: undefined;
  Subscription: undefined;
  QRScanner: undefined;
  SoundSettings: undefined;
  ThemeSettings: undefined;
  AISettings: undefined;
  NotificationSettings: undefined;
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
  priority: "High" | "Medium" | "Low";
  subject?: string;
  created_at: string;
  completed?: boolean;
}

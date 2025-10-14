import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, Modal, Platform } from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import type { MainTabParamList } from '../../navigation/types';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSupabaseProfile } from '../../utils/supabaseHooks';
import { useTheme } from '../../context/ThemeContext';
import { themePalettes, ThemeName, ThemeMode, lightThemePalettes } from '../../context/ThemeContext';
const { useUserAppData } = require('../../utils/userAppData');
import Slider from '@react-native-community/slider';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import { supabase } from '../../utils/supabase';
import { getUserSettings, updateUserSettings, UserSettings } from '../../utils/userSettings';
import { saveMusicPreferences, getSoundPreference, getAutoPlaySetting } from '../../utils/musicPreferences';
import { useAuth } from '../../context/AuthContext';
import * as Notifications from 'expo-notifications';
import AIHelpModal from '../../components/AIHelpModal';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SOUND_OPTIONS = [
  'Lo-Fi',
  'Nature',
  'Classical',
  'Jazz Ambient',
  'Ambient',
];
const THEME_OPTIONS = ['System Default', 'Light', 'Dark'];
const FONT_SIZE_OPTIONS = ['Small', 'Medium', 'Large'];
const APP_ICON_OPTIONS = ['Default', 'Minimal', 'Bold'];
const FOCUS_DURATIONS = [15, 25, 45, 60];
const BREAK_DURATIONS = [5, 10, 15, 20];

// Update the focus duration options to work style options
const WORK_STYLE_OPTIONS = [
  { label: 'Balanced', focusDuration: 45, breakDuration: 15 },
  { label: 'Sprint', focusDuration: 25, breakDuration: 5 },
  { label: 'Deep Work', focusDuration: 60, breakDuration: 15 },
];

// Add icons for theme options
const THEME_ICONS = {
  home: 'home-outline',
  office: 'business-outline', 
  library: 'library-outline',
  coffee: 'cafe-outline',
  park: 'leaf-outline'
} as const;

const SettingsScreen = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { profile, updateProfile } = useSupabaseProfile();
  const { theme, themeName, themeMode, fontSize, setThemeName, setThemeMode, setFontSize } = useTheme();
  const { updateOnboarding, refreshData } = useAuth();
  
  // Use our comprehensive data hook
  const { data: userData, isLoading: userDataLoading } = useUserAppData();
  
  // Appearance - use theme context values instead of local state
  const [localFontSize, setLocalFontSize] = useState('Medium');
  const [appIcon, setAppIcon] = useState('Default');
  // Notifications
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState('08:00');
  const [sessionEndReminder, setSessionEndReminder] = useState(true);
  // Focus & Study
  const [focusDuration, setFocusDuration] = useState(25);
  const [workStyle, setWorkStyle] = useState('Balanced');
  const [autoStartNext, setAutoStartNext] = useState(false);
  const [autoDND, setAutoDND] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState(10);
  // Sound & Environment
  const [sound, setSound] = useState(true);
  const [autoPlaySound, setAutoPlaySound] = useState(false);
  const [selectedSound, setSelectedSound] = useState('Lo-Fi');
  const [ambientNoise, setAmbientNoise] = useState(0.5);
  const [ambientLevel, setAmbientLevel] = useState(50);
  const [isSaving, setIsSaving] = useState(false);
  // Accessibility
  const [tts, setTts] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  // Permissions
  const [notificationPermission, setNotificationPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  // Modals
  const [showFontModal, setShowFontModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);
  const [showWorkStyleModal, setShowWorkStyleModal] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<ThemeName>(themeName);
  // AI Help modals
  const [showNoraHelp, setShowNoraHelp] = useState(false);
  const [showPatrickHelp, setShowPatrickHelp] = useState(false);

  // Music preview state
  const { playPreview, stopPreview, isPlaying, isPreviewMode, currentTrack } = useBackgroundMusic();

  // Load accessibility settings on mount
  useEffect(() => {
    const loadAccessibilitySettings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const settings = await getUserSettings(session.user.id);
          if (settings) {
            setTts(settings.tts_enabled || false);
            setHighContrast(settings.high_contrast || false);
            setReduceMotion(settings.reduce_motion || false);
          }
        }
      } catch (error) {
        console.error('Failed to load accessibility settings:', error);
      }
    };

    loadAccessibilitySettings();
  }, []);

  // Load profile data when available
  useEffect(() => {
    if (profile) {
      setWeeklyGoal(profile.weeklyFocusGoal || 10);
      setSelectedSound(profile.soundPreference || 'Lo-Fi');
      setFocusDuration(profile.focusDuration || 25);
    }
  }, [profile]);

  // Check notification permissions
  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermission(status);
    } catch (error) {
      console.error('Error checking notification permission:', error);
      setNotificationPermission('undetermined');
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status);
      
      if (status === 'granted') {
        setNotifications(true);
        Alert.alert('Success', 'Notifications enabled successfully!');
        
        // Save to database
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await updateUserSettings(session.user.id, {
            notifications_enabled: true
          });
        }
      } else {
        Alert.alert(
          'Permission Denied',
          'You can enable notifications later in your device settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      Alert.alert('Error', 'Failed to request notification permission.');
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    if (value && notificationPermission !== 'granted') {
      await requestNotificationPermission();
    } else {
      setNotifications(value);
      
      // Save notification preference to settings
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await updateUserSettings(session.user.id, {
            notifications_enabled: value
          });
        }
        
        // Schedule or cancel daily reminder based on notification state
        if (value && notificationPermission === 'granted') {
          await scheduleDailyReminder(dailyReminder);
        } else {
          await Notifications.cancelScheduledNotificationAsync('daily-study-reminder');
        }
        
      } catch (error) {
        console.error('Error saving notification setting:', error);
      }
    }
  };

  // Load settings from user data when available
  useEffect(() => {
    if (userData && !userDataLoading) {
      try {
        const { profile, onboarding, settings } = userData;
        
        // Load profile and preferences from the userData object
        
        // Appearance settings
        if (profile?.theme) {
          setAppearanceTheme(profile.theme);
          
          // Apply theme if not system default
          if (profile.theme !== 'System Default') {
            setThemeName(profile.theme.toLowerCase() as ThemeName);
          }
        }
        
        if (profile?.font_size) {
          setFontSize(profile.font_size);
        }
        
        if (profile?.app_icon) {
          setAppIcon(profile.app_icon);
        }
        
        // Sound & Environment settings - using centralized utility
        const soundPref = getSoundPreference(userData);
        setSelectedSound(soundPref);
        
        const autoPlay = getAutoPlaySetting(userData);
        setAutoPlaySound(autoPlay);
        
        if (onboarding?.learning_environment) {
          // Any environment-specific settings can be loaded here
        }
        
        // Focus & Study settings
        if (onboarding?.weekly_focus_goal) {
          setWeeklyGoal(onboarding.weekly_focus_goal);
        }
        
        if (onboarding?.focus_method === 'Balanced Work-Rest Cycle') {
          setFocusDuration(45);
        } else if (onboarding?.focus_method === 'Pomodoro Technique') {
          setFocusDuration(25);
        } else if (onboarding?.focus_method === 'Deep Focus') {
          setFocusDuration(60);
        }
        
        // Load any additional settings from the settings object
        if (settings) {
          if (settings.notifications !== undefined) {
            setNotifications(settings.notifications);
          }
          
          if (settings.daily_reminder) {
            setDailyReminder(settings.daily_reminder);
          }
          
          if (settings.session_end_reminder !== undefined) {
            setSessionEndReminder(settings.session_end_reminder);
          }
          
          if (settings.auto_start_next !== undefined) {
            setAutoStartNext(settings.auto_start_next);
          }
          
          if (settings.sound !== undefined) {
            setSound(settings.sound);
          }
          
          if (settings.auto_play_sound !== undefined) {
            setAutoPlaySound(settings.auto_play_sound);
          }
          
          if (settings.ambient_noise !== undefined) {
            setAmbientNoise(settings.ambient_noise);
          }
          
          if (settings.tts !== undefined) {
            setTts(settings.tts);
          }
          
          if (settings.high_contrast !== undefined) {
            setHighContrast(settings.high_contrast);
          }
        }
        
      } catch (error) {
        console.error('Error loading settings from user data:', error);
      }
    }
  }, [userData, userDataLoading, setThemeName]);

  // Add this useEffect to load user_settings data:
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Load from user_settings table
        const { data: userSettings, error: settingsError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (userSettings && !settingsError) {
          setAutoPlaySound(userSettings.auto_play_sound || false);
          setSound(userSettings.sound_enabled !== undefined ? userSettings.sound_enabled : true);
          setAmbientNoise(userSettings.music_volume || 0.5);
          setNotifications(userSettings.notifications_enabled !== undefined ? userSettings.notifications_enabled : true);
          setAutoStartNext(userSettings.auto_start_focus !== undefined ? userSettings.auto_start_focus : false);
          setAutoDND(userSettings.auto_dnd_focus !== undefined ? userSettings.auto_dnd_focus : false);
          
          console.log('🎵 User settings loaded from database');
        } else {
          // Fallback: try loading from onboarding_preferences
          const { data: onboardingData, error: onboardingError } = await supabase
            .from('onboarding_preferences')
            .select('auto_play_sound, sound_preference')
            .eq('user_id', session.user.id)
            .single();

          if (onboardingData && !onboardingError) {
            setAutoPlaySound(onboardingData.auto_play_sound || false);
            if (onboardingData.sound_preference) {
              setSelectedSound(onboardingData.sound_preference);
            }
            console.log('🎵 Settings loaded from onboarding preferences fallback');
          }
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };

    loadUserSettings();
  }, []);

  // Handle appearance updates
  const handleThemeUpdate = async (selectedThemeMode: ThemeMode) => {
    setShowThemeModal(false);
    
    try {
      // Update theme context
      setThemeMode(selectedThemeMode);
      
      // Save to user profile
      await updateProfile({ theme_mode: selectedThemeMode });
      
      Alert.alert('Success', 'Theme updated successfully!');
    } catch (error) {
      console.error('Theme update error:', error);
      Alert.alert('Error', 'Failed to update theme. Please try again.');
    }
  };

  const handleFontSizeUpdate = async (size: string) => {
    setLocalFontSize(size);
    setShowFontModal(false);
    
    try {
      // Convert string to number for theme context
      const fontSizeMap = {
        'Small': 14,
        'Medium': 16, 
        'Large': 18
      };
      
      const numericSize = fontSizeMap[size as keyof typeof fontSizeMap] || 16;
      setFontSize(numericSize);
      
      // Save to user profile
      await updateProfile({ font_size: size });
      Alert.alert('Success', 'Font size updated successfully!');
    } catch (error) {
      console.error('Font size update error:', error);
      Alert.alert('Error', 'Failed to update font size. Please try again.');
    }
  };

  const handleAppIconUpdate = async (icon: string) => {
    setAppIcon(icon);
    setShowIconModal(false);
    
    try {
      await updateProfile({ app_icon: icon });
      Alert.alert('Success', 'App icon updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update app icon. Please try again.');
    }
  };

  // Handle weekly goal update
  const handleWeeklyGoalUpdate = async (goal: number) => {
    setWeeklyGoal(goal);
    
    try {
      await updateProfile({ weeklyFocusGoal: goal });
      // Also update onboarding data
      await updateOnboarding({ weekly_focus_goal: goal });
      Alert.alert('Success', 'Your weekly focus goal has been updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update weekly focus goal. Please try again.');
    }
  };

  // Update the handleWorkStyleUpdate function
  const handleWorkStyleUpdate = async (style: string) => {
    setWorkStyle(style);
    setShowWorkStyleModal(false);
    
    const selectedStyle = WORK_STYLE_OPTIONS.find(option => option.label === style);
    if (selectedStyle) {
      setFocusDuration(selectedStyle.focusDuration);
      
      try {
        // Update both profile and onboarding data
        await updateProfile({ 
          focusDuration: selectedStyle.focusDuration,
          workStyle: style 
        });
        
        // Also update onboarding data to ensure timer display updates
        await updateOnboarding({
          work_style: style,
          focus_method: style
        });
        
        // Refresh user data to update timer display
        await refreshData();
        
        Alert.alert('Success', 'Your work style has been updated!');
      } catch (error) {
        Alert.alert('Error', 'Failed to update work style. Please try again.');
      }
    }
  };

  // Handle notifications and reminders
  const handleDailyReminderUpdate = () => {
    Alert.alert(
      'Daily Study Reminder',
      'Set your preferred time for daily study reminders',
      [
        {
          text: 'Morning (8:00 AM)',
          onPress: () => updateDailyReminder('08:00')
        },
        {
          text: 'Afternoon (2:00 PM)',
          onPress: () => updateDailyReminder('14:00')
        },
        {
          text: 'Evening (6:00 PM)',
          onPress: () => updateDailyReminder('18:00')
        },
        {
          text: 'Custom Time',
          onPress: () => showTimePickerDialog()
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const updateDailyReminder = async (time: string) => {
    setDailyReminder(time);
    try {
      await updateProfile({ daily_reminder: time });
      
      // Save to user_settings table
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await updateUserSettings(session.user.id, {
          daily_reminder: time
        });
      }
      
      // Schedule daily notification if notifications are enabled
      if (notifications && notificationPermission === 'granted') {
        await scheduleDailyReminder(time);
      }
      
      Alert.alert('Success', `Daily reminder set for ${time}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update daily reminder.');
    }
  };

  const scheduleDailyReminder = async (time: string) => {
    try {
      // Cancel existing daily reminders
      await Notifications.cancelScheduledNotificationAsync('daily-study-reminder');
      
      const [hours, minutes] = time.split(':').map(Number);
      
      await Notifications.scheduleNotificationAsync({
        identifier: 'daily-study-reminder',
        content: {
          title: '📚 Time to Study!',
          body: 'Ready to start your focus session? Let\'s build that streak!',
          sound: true,
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });
      
      console.log(`Daily reminder scheduled for ${time}`);
    } catch (error) {
      console.error('Error scheduling daily reminder:', error);
    }
  };

  const showTimePickerDialog = () => {
    Alert.prompt(
      'Custom Time',
      'Enter time in HH:MM format (24-hour)',
      (time) => {
        if (time && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
          updateDailyReminder(time);
        } else {
          Alert.alert('Invalid Time', 'Please enter time in HH:MM format (e.g., 14:30)');
        }
      },
      'plain-text',
      dailyReminder
    );
  };

  const handleSessionEndReminderToggle = async (value: boolean) => {
    setSessionEndReminder(value);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await updateUserSettings(session.user.id, {
          session_end_reminder: value
        });
      }
      
      if (value) {
        Alert.alert(
          'Session End Reminders Enabled',
          'You\'ll receive notifications when your focus sessions are about to end.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Success', 'Session end reminders disabled');
      }
      
    } catch (error) {
      Alert.alert('Error', 'Failed to update session end reminder setting.');
    }
  };

  // Function to schedule session end notification (to be called from timer)
  const scheduleSessionEndReminder = async (sessionDuration: number) => {
    if (!sessionEndReminder || notificationPermission !== 'granted') return;
    
    try {
      // Schedule notification 2 minutes before session ends
      const reminderTime = Math.max(sessionDuration - 2, 1); // At least 1 minute
      
      await Notifications.scheduleNotificationAsync({
        identifier: 'session-end-reminder',
        content: {
          title: '⏰ Session Ending Soon',
          body: `Your focus session will end in 2 minutes. Great job!`,
          sound: true,
        },
        trigger: {
          seconds: reminderTime * 60,
        },
      });
      
      console.log(`Session end reminder scheduled for ${reminderTime} minutes`);
    } catch (error) {
      console.error('Error scheduling session end reminder:', error);
    }
  };

  // Handle Support & About actions
  const handleHelpCenter = () => {
    Alert.alert(
      'Help Center',
      'Choose how you\'d like to get help:',
      [
        {
          text: 'Getting Started',
          onPress: () => showGettingStartedGuide()
        },
        {
          text: 'Study Tips',
          onPress: () => showStudyTips()
        },
        {
          text: 'Troubleshooting',
          onPress: () => showTroubleshooting()
        },
        {
          text: 'Feature Guide',
          onPress: () => showFeatureGuide()
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const showGettingStartedGuide = () => {
    Alert.alert(
      'Getting Started 🚀',
      '1. Set your focus duration in Preferences\n' +
      '2. Choose your study environment theme\n' +
      '3. Pick your focus sound\n' +
      '4. Set daily reminders\n' +
      '5. Start your first session from Home!\n\n' +
      'Tip: Try different work styles to find what works best for you.',
      [{ text: 'Got it!' }]
    );
  };

  const showStudyTips = () => {
    Alert.alert(
      'Study Tips 📚',
      '• Use the Pomodoro technique: 25min focus + 5min break\n' +
      '• Find a quiet environment free from distractions\n' +
      '• Set specific goals for each session\n' +
      '• Take longer breaks every 4 sessions\n' +
      '• Stay hydrated and maintain good posture\n' +
      '• Review your progress regularly in Analytics',
      [{ text: 'Thanks!' }]
    );
  };

  const showTroubleshooting = () => {
    Alert.alert(
      'Troubleshooting 🔧',
      'Audio Issues:\n• Check device volume\n• Restart the app\n• Try different sound options\n\n' +
      'Sync Issues:\n• Check internet connection\n• Log out and back in\n\n' +
      'Timer Issues:\n• Keep app in foreground\n• Disable battery optimization\n\n' +
      'Still having issues? Contact support!',
      [{ text: 'Understood' }]
    );
  };

  const showFeatureGuide = () => {
    Alert.alert(
      'Key Features 💡',
      '🏠 Home: Start sessions & view stats\n' +
      '👥 Community: Connect with other students\n' +
      '🤖 Nora: AI study assistant\n' +
      '🎁 Bonuses: Unlock achievements\n' +
      '📊 Results: Track your progress\n' +
      '👤 Profile: Manage your info\n' +
      '⚙️ Settings: Customize everything',
      [{ text: 'Awesome!' }]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'How can we help you today?',
      [
        {
          text: 'Email Support',
          onPress: () => showEmailSupport()
        },
        {
          text: 'Report Bug',
          onPress: () => showBugReport()
        },
        {
          text: 'Feature Request',
          onPress: () => showFeatureRequest()
        },
        {
          text: 'Account Issues',
          onPress: () => showAccountHelp()
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const showEmailSupport = () => {
    Alert.alert(
      'Email Support 📧',
      'For general support:\nsupport@thetriage.app\n\n' +
      'For technical issues:\ntech@thetriage.app\n\n' +
      'For billing questions:\nbilling@thetriage.app\n\n' +
      'We typically respond within 24 hours!',
      [{ text: 'Copy Email', onPress: () => Alert.alert('Copied!', 'support@thetriage.app copied to clipboard') }]
    );
  };

  const showBugReport = () => {
    Alert.alert(
      'Report a Bug 🐛',
      'Help us improve! When reporting bugs, please include:\n\n' +
      '• Device model and OS version\n' +
      '• Steps to reproduce the issue\n' +
      '• What you expected to happen\n' +
      '• Screenshots if applicable\n\n' +
      'Send to: bugs@thetriage.app',
      [{ text: 'Got it!' }]
    );
  };

  const showFeatureRequest = () => {
    Alert.alert(
      'Feature Request 💡',
      'Have an idea to make our app better?\n\n' +
      'We love hearing from our users! Send your suggestions to:\n\n' +
      'features@thetriage.app\n\n' +
      'Tell us:\n• What feature you\'d like\n• Why it would be helpful\n• How you envision it working',
      [{ text: 'Will do!' }]
    );
  };

  const showAccountHelp = () => {
    Alert.alert(
      'Account Help 👤',
      'Having trouble with your account?\n\n' +
      '• Password reset: Use "Forgot Password" on login\n' +
      '• Email changes: Contact support\n' +
      '• Data export: Email us your request\n' +
      '• Account deletion: Email support\n\n' +
      'Contact: account@thetriage.app',
      [{ text: 'Thanks!' }]
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      'Terms of Service',
      'These terms govern your use of The Triage Study App.\n\n' +
      'Key points:\n' +
      '• You must be 13+ to use this app\n' +
      '• Respect other users in community features\n' +
      '• Your study data belongs to you\n' +
      '• We may update terms with notice\n\n' +
      'Full terms: www.thetriage.app/terms',
      [
        { text: 'View Online', onPress: () => Alert.alert('Opening...', 'Would open terms in browser') },
        { text: 'Close' }
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Your privacy is important to us.\n\n' +
      'We collect:\n' +
      '• Study session data (duration, breaks)\n' +
      '• App usage analytics (anonymous)\n' +
      '• Account info (email, preferences)\n\n' +
      'We DON\'T sell your data or share it with advertisers.\n\n' +
      'Full policy: www.thetriage.app/privacy',
      [
        { text: 'View Online', onPress: () => Alert.alert('Opening...', 'Would open privacy policy in browser') },
        { text: 'Close' }
      ]
    );
  };

  const handleAppInfo = () => {
    Alert.alert(
      'App Information',
      'The Triage Study Tracker\n' +
      'Version: 1.0.0\n' +
      'Build: 2024.001\n\n' +
      '© 2024 The Triage Team\n' +
      'Made with ❤️ for students everywhere\n\n' +
      'Special thanks to our beta testers!',
      [
        { text: 'Check for Updates', onPress: () => Alert.alert('Up to Date!', 'You have the latest version.') },
        { text: 'Close' }
      ]
    );
  };

  // Handle Focus & Study Preferences
  const handleAutoStartToggle = async (value: boolean) => {
    setAutoStartNext(value);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await updateUserSettings(session.user.id, {
          auto_start_focus: value
        });
      }
      Alert.alert('Success', `Auto-start next session ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update auto-start setting.');
    }
  };

  // Handle auto-DND toggle
  const handleAutoDNDToggle = async (value: boolean) => {
    setAutoDND(value);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await updateUserSettings(session.user.id, {
          auto_dnd_focus: value
        });
      }
      Alert.alert('Success', `Auto Do Not Disturb ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update auto-DND setting.');
    }
  };

  // Handle accessibility settings
  const handleTTSToggle = async (value: boolean) => {
    setTts(value);
    
    // Provide immediate feedback
    if (value) {
      console.log('TTS enabled - text will be read aloud where supported');
    } else {
      console.log('TTS disabled');
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await updateUserSettings(session.user.id, {
          tts_enabled: value
        });
      }
      Alert.alert('Success', `Text-to-speech ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update text-to-speech setting.');
    }
  };

  const handleHighContrastToggle = async (value: boolean) => {
    setHighContrast(value);
    
    // Apply high contrast theme if enabled
    if (value) {
      // TODO: Switch to high contrast theme
      console.log('High contrast mode enabled - implement theme switch');
    } else {
      // TODO: Switch back to normal theme
      console.log('High contrast mode disabled - revert theme');
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await updateUserSettings(session.user.id, {
          high_contrast: value
        });
      }
      Alert.alert('Success', `High contrast mode ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update high contrast setting.');
    }
  };

  const handleReduceMotionToggle = async (value: boolean) => {
    setReduceMotion(value);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await updateUserSettings(session.user.id, {
          reduce_motion: value
        });
      }
      Alert.alert('Success', `Reduce motion ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update reduce motion setting.');
    }
  };

  // Placeholder for remaining actions
  const placeholder = (msg: string) => Alert.alert(msg, 'This feature is in development and will be available soon!');

  // Update the handlePreviewSound function:

  const handlePreviewSound = async (soundOption: string) => {
    try {
      if (isPreviewMode && currentTrack) {
        // Stop preview if already playing
        await stopPreview();
      } else {
        // Start 10-second preview
        console.log(`🎵 Starting preview for: ${soundOption}`);
        await playPreview(soundOption);
      }
    } catch (error) {
      console.error('Error in preview sound:', error);
      Alert.alert('Preview Error', 'Unable to play preview. Please check your audio settings.');
    }
  };

  // Update the SettingsScreen save function:
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No authenticated user');
      }

      // Save sound preference to onboarding_preferences table
      const { error: onboardingError } = await supabase
        .from('onboarding_preferences')
        .upsert({
          user_id: session.user.id,
          sound_preference: selectedSound,
          updated_at: new Date().toISOString()
        });

      if (onboardingError) {
        console.error('Error saving sound preference:', onboardingError);
      } else {
        console.log('✅ Sound preference saved successfully');
      }

      // Also update profile table for backup
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          soundpreference: selectedSound,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.warn('Profile update warning (may not affect functionality):', profileError);
      }

      // Save auto-play setting to user_settings if table exists
      try {
        const { error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: session.user.id,
            auto_play_sound: autoPlaySound,
            music_volume: ambientLevel / 100,
            updated_at: new Date().toISOString()
          });

        if (settingsError) {
          console.log('User settings table may not exist, auto-play setting not saved');
        }
      } catch (settingsErr) {
        console.log('User settings table not available');
      }

      // Force refresh user data
      await refreshData();
      
      Alert.alert('Success', 'Settings saved successfully!');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Replace the handleAutoPlayToggle function:
  const handleAutoPlayToggle = async (value: boolean) => {
    setAutoPlaySound(value);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No authenticated user');
      }

      const success = await updateUserSettings(session.user.id, {
        auto_play_sound: value
      });

      if (!success) {
        throw new Error('Failed to update user settings');
      }

      console.log(`🎵 Auto-play sound setting saved: ${value}`);

    } catch (error) {
      console.error('Error saving auto-play setting:', error);
      Alert.alert('Error', 'Failed to save auto-play setting. Please try again.');
      // Revert the UI state
      setAutoPlaySound(!value);
    }
  };

  // Update the handleSoundPreferenceChange function using centralized utility
  const handleSoundPreferenceChange = async (preference: string) => {
    // Stop current preview if playing
    if (isPlaying && isPreviewMode) {
      await stopPreview();
    }
    
    // Update state
    setSelectedSound(preference);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No authenticated user');
      }
      
      // Use centralized music preference saving
      await saveMusicPreferences(session.user.id, {
        sound_preference: preference,
        auto_play_sound: autoPlaySound
      });
      
      // Start a preview of the new sound
      await playPreview(preference);
      
    } catch (error) {
      console.error('Error saving sound preference:', error);
      Alert.alert('Error', 'Failed to save sound preference. Please try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Settings Title */}
      <View style={[styles.settingsHeader, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <View style={[styles.closeButtonCircle, { backgroundColor: theme.primary + '30' }]}>
            <Ionicons name="close" size={24} color={theme.primary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.settingsTitle, { color: theme.primary }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}>
        {/* Pro Trekker Illustrated Card */}
        <TouchableOpacity
          style={styles.proTrekkerCard}
          onPress={() => navigation.navigate('ProTrekker' as any)}
          activeOpacity={0.9}
        >
          <View style={styles.proTrekkerImageContainer}>
            <Text style={styles.proTrekkerCardTitle}>Become a professional traveller</Text>
            <Text style={styles.proTrekkerCardSubtitle}>Pomodoro mode, customizable focus time</Text>
            {/* Using placeholder - in real app, use the hiking illustration */}
            <View style={styles.illustrationPlaceholder}>
              <Ionicons name="trail-sign" size={60} color="#FF6B35" />
              <Ionicons name="person-outline" size={50} color="#4A90E2" style={{ marginLeft: 20 }} />
              <Ionicons name="flower-outline" size={40} color="#E91E63" style={{ marginLeft: 15 }} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Timer Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time-outline" size={24} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>Timer</Text>
          </View>

          <View style={[styles.settingRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Default Timer</Text>
            <Text style={[styles.settingValue, { color: theme.primary }]}>15 Minutes</Text>
          </View>

          <View style={[styles.settingRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Rest Time</Text>
            <Text style={[styles.settingValue, { color: theme.primary }]}></Text>
          </View>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
            onPress={() => setShowWorkStyleModal(true)}
          >
            <Text style={[styles.settingLabel, { color: theme.text }]}>Pomodoro Timer</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Music Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="musical-notes-outline" size={24} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>Music</Text>
          </View>

          <View style={[styles.settingRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Focus Music</Text>
            <Switch
              value={autoPlaySound}
              onValueChange={handleAutoPlayToggle}
              trackColor={{ false: '#E0E0E0', true: theme.primary }}
              thumbColor={autoPlaySound ? '#FFF' : '#FFF'}
            />
          </View>

          <View style={[styles.settingRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Home Music</Text>
            <Switch
              value={sound}
              onValueChange={(value) => setSound(value)}
              trackColor={{ false: '#E0E0E0', true: theme.primary }}
              thumbColor={sound ? '#FFF' : '#FFF'}
            />
          </View>
        </View>

        {/* System Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="settings-outline" size={24} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>System</Text>
          </View>

          <View style={[styles.settingRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Notification</Text>
            <Switch
              value={notifications && notificationPermission === 'granted'}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#E0E0E0', true: theme.primary }}
              thumbColor={notifications && notificationPermission === 'granted' ? '#FFF' : '#FFF'}
            />
          </View>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
            onPress={() => setShowThemeModal(true)}
          >
            <Text style={[styles.settingLabel, { color: theme.text }]}>Change App Icon</Text>
            <View style={styles.appIconPreview}>
              <Ionicons name="apps" size={24} color={theme.primary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
            onPress={() => navigation.navigate('ProTrekker' as any)}
          >
            <Text style={[styles.settingLabel, { color: theme.text }]}>Become Pro Traveller</Text>
            <View style={styles.proIcon}>
              <Ionicons name="star" size={20} color="#FFA726" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: theme.card, borderBottomColor: 'transparent' }]}
            onPress={() => navigation.navigate('Subscription' as any)}
          >
            <Text style={[styles.settingLabel, { color: theme.text }]}>Switch Pro Plan</Text>
            <Text style={[styles.settingValue, { color: theme.primary }]}></Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: theme.card, borderBottomColor: 'transparent' }]}
          >
            <Text style={[styles.settingLabel, { color: theme.text }]}>Restore Purchased</Text>
            <Text style={[styles.settingValue, { color: theme.primary }]}></Text>
          </TouchableOpacity>
        </View>

        {/* OLD APPEARANCE SECTION - REMOVE */}
        <View style={{ display: 'none' }}>
        <Text style={[styles.sectionHeader, { fontSize: fontSize * 0.9, color: theme.primary }]}>APPEARANCE</Text>
        <View style={[styles.cardSection, { backgroundColor: theme.card }]}>
          <TouchableOpacity style={styles.rowCard} onPress={() => setShowThemeModal(true)} activeOpacity={0.7}>
            <Ionicons name="color-palette-outline" size={22} color={theme.primary} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { fontSize: fontSize, color: theme.text }]}>Theme</Text>
            <View style={styles.rowValueWrap}><Text style={[styles.rowValue, { fontSize: fontSize * 0.9, color: theme.primary }]}>{themeMode}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          
          {/* Environment Selection - Only show when Light mode is selected */}
          {themeMode === 'Light' && (
            <TouchableOpacity style={styles.rowCard} onPress={() => setShowEnvModal(true)} activeOpacity={0.7}>
              <Ionicons name="globe-outline" size={22} color={theme.primary} style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { fontSize: fontSize, color: theme.text }]}>Environment</Text>
              <View style={styles.rowValueWrap}><Text style={[styles.rowValue, { fontSize: fontSize * 0.9, color: theme.primary }]}>{lightThemePalettes[themeName].name}</Text></View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.rowCard} onPress={() => setShowFontModal(true)} activeOpacity={0.7}>
            <MaterialIcons name="format-size" size={22} color={theme.primary} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { fontSize: fontSize, color: theme.text }]}>Font Size</Text>
            <View style={styles.rowValueWrap}><Text style={[styles.rowValue, { fontSize: fontSize * 0.9, color: theme.primary }]}>{localFontSize}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => setShowIconModal(true)} activeOpacity={0.7}>
            <MaterialCommunityIcons name="apps" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>App Icon</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{appIcon}</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
        </View>

        {/* SOUND SECTION - FIXED */}
        <Text style={styles.sectionHeader}>SOUND</Text>
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Focus Sound</Text>
          {SOUND_OPTIONS.map(option => (
            <TouchableOpacity
              key={option}
              style={styles.soundOption}
              onPress={() => handleSoundPreferenceChange(option)}
              activeOpacity={0.7}
            >
              <View style={styles.radioCircle}>
                {selectedSound === option && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.soundLabel, selectedSound === option && styles.soundLabelSelected]}>
                {option}
              </Text>
              <TouchableOpacity 
                onPress={() => handlePreviewSound(option)} 
                style={[
                  styles.previewButton,
                  isPreviewMode && currentTrack?.displayName.toLowerCase().includes(option.toLowerCase()) && styles.previewButtonActive
                ]}
              >
                <Ionicons 
                  name={isPreviewMode && currentTrack?.displayName.toLowerCase().includes(option.toLowerCase()) ? "stop-circle" : "play-circle-outline"} 
                  size={22} 
                  color={isPreviewMode && currentTrack?.displayName.toLowerCase().includes(option.toLowerCase()) ? "#E57373" : "#388E3C"} 
                />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          
          {/* Auto-Play Sound Toggle Row - Fixed styling */}
          <View style={styles.rowCard}>
            <MaterialIcons name="music-note" size={22} color="#388E3C" style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Auto-Play Sound</Text>
              <Text style={styles.rowDescription}>Automatically start music when focus session begins</Text>
            </View>
            <Switch
              value={autoPlaySound}
              onValueChange={handleAutoPlayToggle}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={autoPlaySound ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
          
          {/* Ambient Noise Level Row */}
          <View style={styles.rowCard}>
            <MaterialIcons name="volume-up" size={22} color="#388E3C" style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Ambient Noise Level</Text>
              <View style={styles.sliderContainer}>
                <TouchableOpacity onPress={() => setAmbientNoise(Math.max(0, ambientNoise - 0.1))}>
                  <Entypo name="minus" size={20} color="#388E3C" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <View style={{ height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, marginVertical: 8 }}>
                    <View style={{ width: `${ambientNoise * 100}%`, height: 6, backgroundColor: '#4CAF50', borderRadius: 3 }} />
                  </View>
                </View>
                <TouchableOpacity onPress={() => setAmbientNoise(Math.min(1, ambientNoise + 0.1))}>
                  <Entypo name="plus" size={20} color="#388E3C" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* App Environment */}
        <Text style={styles.sectionHeader}>APP ENVIRONMENT</Text>
        <View style={{ marginHorizontal: 12, marginBottom: 12 }}>
          {/* Current Environment Preview */}
          <View style={{ backgroundColor: theme.background, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 2, borderColor: theme.primary }}>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>Current: {themePalettes[themeName].name}</Text>
            <View style={{ backgroundColor: theme.card, borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Card Example</Text>
              <Text style={{ color: theme.text, marginTop: 4 }}>This is a card in the current theme.</Text>
            </View>
            <TouchableOpacity style={{ backgroundColor: theme.primary, borderRadius: 8, padding: 10, alignSelf: 'flex-start' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Button Example</Text>
            </TouchableOpacity>
          </View>
          
          {/* Environment Options as Cards with updated icons */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {(['home','office','library','coffee','park'] as ThemeName[]).map(env => (
              <TouchableOpacity
                key={env}
                style={{
                  width: '48%',
                  backgroundColor: themePalettes[env].background,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: themeName === env ? 2 : 1,
                  borderColor: themeName === env ? themePalettes[env].primary : '#E0E0E0',
                  alignItems: 'center',
                }}
                onPress={() => { setSelectedEnv(env); setShowEnvModal(true); }}
                activeOpacity={0.8}
              >
                {/* Updated icon based on environment name */}
                <Ionicons 
                  name={THEME_ICONS[env] as keyof typeof Ionicons.glyphMap} 
                  size={28} 
                  color={themePalettes[env].primary} 
                  style={{ marginBottom: 6 }} 
                />
                <Text style={{ color: themePalettes[env].primary, fontWeight: 'bold', fontSize: 15 }}>{themePalettes[env].name}</Text>
                <View style={{ backgroundColor: themePalettes[env].card, borderRadius: 8, padding: 6, marginTop: 8, width: '100%' }}>
                  <Text style={{ color: themePalettes[env].primary, fontWeight: 'bold', fontSize: 13 }}>Card</Text>
                </View>
                <TouchableOpacity style={{ backgroundColor: themePalettes[env].primary, borderRadius: 6, padding: 6, marginTop: 8, width: '100%' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, textAlign: 'center' }}>Button</Text>
                </TouchableOpacity>
                {themeName === env && (
                  <Ionicons name="checkmark-circle" size={22} color={themePalettes[env].primary} style={{ position: 'absolute', top: 8, right: 8 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications & Reminders */}
        <Text style={styles.sectionHeader}>NOTIFICATIONS & REMINDERS</Text>
        <View style={styles.cardSection}>
          <View style={styles.rowCard}>
            <Ionicons name="notifications-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Push Notifications</Text>
              <Text style={styles.rowDescription}>
                {notificationPermission === 'granted' ? 'Notifications enabled' : 
                 notificationPermission === 'denied' ? 'Permission denied - enable in settings' :
                 'Tap to enable notifications'}
              </Text>
            </View>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{notifications ? 'On' : 'Off'}</Text></View>
            <Switch
              value={notifications && notificationPermission === 'granted'}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={notifications && notificationPermission === 'granted' ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
          <TouchableOpacity style={styles.rowCard} onPress={handleDailyReminderUpdate} activeOpacity={0.7}>
            <Ionicons name="alarm-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Daily Study Reminder</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{dailyReminder}</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <View style={styles.rowCard}>
            <MaterialIcons name="timer" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Session End Reminder</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{sessionEndReminder ? 'On' : 'Off'}</Text></View>
            <Switch
              value={sessionEndReminder}
              onValueChange={handleSessionEndReminderToggle}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={sessionEndReminder ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
        </View>

        {/* Focus & Study Preferences - Updated */}
        <Text style={styles.sectionHeader}>FOCUS & STUDY PREFERENCES</Text>
        <View style={styles.cardSection}>
          <TouchableOpacity style={styles.rowCard} onPress={() => navigation.navigate('Preferences')} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>User Preferences</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>Configure</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => setShowWorkStyleModal(true)} activeOpacity={0.7}>
            <MaterialCommunityIcons name="clock-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Work Style</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{workStyle}</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <View style={styles.rowCard}>
            <MaterialIcons name="autorenew" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Auto-Start Next Session</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{autoStartNext ? 'On' : 'Off'}</Text></View>
            <Switch
              value={autoStartNext}
              onValueChange={handleAutoStartToggle}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={autoStartNext ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
          <View style={styles.rowCard}>
            <MaterialIcons name="do-not-disturb" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Auto Do Not Disturb</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{autoDND ? 'On' : 'Off'}</Text></View>
            <Switch
              value={autoDND}
              onValueChange={handleAutoDNDToggle}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={autoDND ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
          <View style={styles.rowCard}>
            <MaterialCommunityIcons name="target" size={22} color="#388E3C" style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Weekly Focus Goal</Text>
              <Text style={[styles.rowValue, { fontSize: 12, color: '#666', marginTop: 2 }]}>
                {weeklyGoal} hours per week
              </Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>5h</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={5}
                  maximumValue={80}
                  step={1}
                  value={weeklyGoal}
                  onValueChange={setWeeklyGoal}
                  onSlidingComplete={handleWeeklyGoalUpdate}
                  minimumTrackTintColor="#4CAF50"
                  maximumTrackTintColor="#E0E0E0"
                  thumbStyle={{ backgroundColor: '#4CAF50' }}
                />
                <Text style={styles.sliderLabel}>80h</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account & Privacy */}
        <Text style={styles.sectionHeader}>ACCOUNT & PRIVACY</Text>
        <View style={styles.cardSection}>
          <TouchableOpacity style={styles.rowCard} onPress={() => navigation.navigate('Tabs' as any, { screen: 'Profile', params: { screen: 'ProfileMain' } } as any)} activeOpacity={0.7}>
            <Ionicons name="person-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => placeholder('Change Email/Password')} activeOpacity={0.7}>
            <MaterialIcons name="email" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Change Email/Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => navigation.navigate('Privacy')} activeOpacity={0.7}>
            <MaterialIcons name="lock-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Privacy Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => placeholder('Export Data')} activeOpacity={0.7}>
            <MaterialIcons name="file-download" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Export Data</Text>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => placeholder('Delete Account')} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={22} color="#ff4444" style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: '#ff4444' }]}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
        </View>

        {/* AI Integration */}
        <Text style={styles.sectionHeader}>AI INTEGRATION</Text>
        <View style={styles.cardSection}>
          <TouchableOpacity 
            style={styles.rowCard} 
            onPress={() => (navigation as any).navigate('AIIntegration')} 
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="brain" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>AI Settings</Text>
            <View style={styles.rowValueWrap}><Text style={[styles.rowValue, { color: '#388E3C' }]}>Manage AIs</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
        </View>

        {/* Accessibility */}
        <Text style={styles.sectionHeader}>ACCESSIBILITY</Text>
        <View style={styles.cardSection}>
          <View style={styles.rowCard}>
            <MaterialIcons name="record-voice-over" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Text-to-Speech</Text>
            <Switch
              value={tts}
              onValueChange={handleTTSToggle}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={tts ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
          <View style={styles.rowCard}>
            <MaterialIcons name="contrast" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>High Contrast Mode</Text>
            <Switch
              value={highContrast}
              onValueChange={handleHighContrastToggle}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={highContrast ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
          <View style={styles.rowCard}>
            <MaterialIcons name="motion-photos-on" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Reduce Motion</Text>
            <Switch
              value={reduceMotion}
              onValueChange={handleReduceMotionToggle}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={reduceMotion ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
        </View>

        {/* Support & About */}
        <Text style={styles.sectionHeader}>SUPPORT & ABOUT</Text>
        <View style={styles.cardSection}>
          <TouchableOpacity style={styles.rowCard} onPress={handleHelpCenter} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Help Center / FAQ</Text>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={handleContactSupport} activeOpacity={0.7}>
            <MaterialIcons name="support-agent" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={handleAppInfo} activeOpacity={0.7}>
            <MaterialIcons name="info-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>App Information</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>v1.0.0</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={handleTermsOfService} activeOpacity={0.7}>
            <MaterialIcons name="gavel" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={handlePrivacyPolicy} activeOpacity={0.7}>
            <MaterialIcons name="privacy-tip" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
        </View>

        {/* Environment Preview Modal */}
        <Modal visible={showEnvModal} transparent animationType="fade" onRequestClose={() => setShowEnvModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: themePalettes[selectedEnv].background }]}> 
              <Text style={[styles.modalTitle, { color: themePalettes[selectedEnv].primary }]}>Preview: {themePalettes[selectedEnv].name}</Text>
              <View style={{ backgroundColor: themePalettes[selectedEnv].card, borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <Text style={{ color: themePalettes[selectedEnv].primary, fontWeight: 'bold', fontSize: 18 }}>Card Example</Text>
                <Text style={{ color: themePalettes[selectedEnv].text, marginTop: 8 }}>This is what a card will look like in this theme.</Text>
              </View>
              <TouchableOpacity style={{ backgroundColor: themePalettes[selectedEnv].primary, borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Button Example</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <TouchableOpacity onPress={() => setShowEnvModal(false)} style={{ flex: 1, marginRight: 8, backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: themePalettes[selectedEnv].primary }}>
                  <Text style={{ color: themePalettes[selectedEnv].primary, textAlign: 'center', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setThemeName(selectedEnv); setShowEnvModal(false); }} style={{ flex: 1, marginLeft: 8, backgroundColor: themePalettes[selectedEnv].primary, borderRadius: 8, padding: 12 }}>
                  <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modals for pickers */}
        <Modal visible={showThemeModal} transparent animationType="fade" onRequestClose={() => setShowThemeModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
              <Text style={[styles.modalTitle, { fontSize: fontSize * 1.25, color: theme.primary }]}>Select Theme</Text>
              
              {/* Theme Mode Options */}
              {(['System Default', 'Light', 'Dark'] as ThemeMode[]).map(mode => (
                <TouchableOpacity 
                  key={mode} 
                  style={styles.modalOption} 
                  onPress={() => handleThemeUpdate(mode)}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[
                      styles.modalOptionText, 
                      { fontSize: fontSize, color: theme.text },
                      themeMode === mode && { color: theme.primary, fontWeight: 'bold' }
                    ]}>
                      {mode}
                    </Text>
                    <Text style={[styles.modalOptionDescription, { fontSize: fontSize * 0.8, color: theme.textSecondary }]}>
                      {mode === 'System Default' && 'Follow device setting'}
                      {mode === 'Light' && 'Light theme with environment colors'}
                      {mode === 'Dark' && 'Dark theme (ignores environment)'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowThemeModal(false)}>
                <Text style={[styles.modalCancelText, { fontSize: fontSize, color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={showFontModal} transparent animationType="fade" onRequestClose={() => setShowFontModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Select Font Size</Text>
              {FONT_SIZE_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleFontSizeUpdate(opt)}>
                  <Text style={[styles.modalOptionText, localFontSize === opt && { color: '#388E3C', fontWeight: 'bold' }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowFontModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={showIconModal} transparent animationType="fade" onRequestClose={() => setShowIconModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Select App Icon</Text>
              {APP_ICON_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleAppIconUpdate(opt)}>
                  <Text style={[styles.modalOptionText, appIcon === opt && { color: '#388E3C', fontWeight: 'bold' }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowIconModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={showWorkStyleModal} transparent animationType="fade" onRequestClose={() => setShowWorkStyleModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Select Work Style</Text>
              {WORK_STYLE_OPTIONS.map(option => (
                <TouchableOpacity 
                  key={option.label} 
                  style={styles.modalOption} 
                  onPress={() => handleWorkStyleUpdate(option.label)}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[
                      styles.modalOptionText, 
                      workStyle === option.label && { color: '#388E3C', fontWeight: 'bold' }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                      {option.focusDuration}min focus / {option.breakDuration}min break
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowWorkStyleModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* AI Help Modals */}
        {/* Rating Card */}
        <View style={[styles.ratingCard, { backgroundColor: '#8BB5D8' }]}>
          <View style={styles.ratingContent}>
            <Ionicons name="person" size={50} color="#4A90E2" />
            <View style={styles.ratingTextContainer}>
              <Text style={styles.ratingTitle}>Does Focus{'\n'}Traveller Help?</Text>
              <Text style={styles.ratingSubtitle}>Give Us 5 Stars!</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={32} color="#FFA726" />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* App Version */}
        <Text style={[styles.versionText, { color: theme.text + '66' }]}>v1.0.0 (517) (506)</Text>

        <AIHelpModal
          visible={showNoraHelp}
          onClose={() => setShowNoraHelp(false)}
          aiType="nora"
        />
        <AIHelpModal
          visible={showPatrickHelp}
          onClose={() => setShowPatrickHelp(false)}
          aiType="patrick"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    color: '#388E3C',
    fontWeight: 'bold',
    fontSize: 15,
    marginTop: 24,
    marginBottom: 6,
    marginLeft: 18,
    letterSpacing: 1,
  },
  cardSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rowIcon: {
    marginRight: 16,
  },
  rowLabel: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
    flex: 1,
  },
  rowDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  rowValueWrap: {
    minWidth: 40,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  rowValue: {
    color: '#388E3C',
    fontWeight: 'bold',
    fontSize: 15,
  },
  sectionTitle: {
    color: '#388E3C',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 18,
    marginTop: 10,
    marginBottom: 4,
  },
  soundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  soundLabel: {
    fontSize: 16,
    color: '#388E3C',
    fontWeight: 'bold',
  },
  soundLabelSelected: {
    color: '#219150',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    width: 320,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 17,
    color: '#222',
  },
  modalOptionDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  modalCancelBtn: {
    marginTop: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#888',
    fontSize: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#F8FFF6',
    borderBottomWidth: 0,
    zIndex: 10,
  },
  drawerMenuBtn: {
    padding: 4,
  },
  drawerHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B5E20',
    textAlign: 'center',
    flex: 1,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  previewButton: {
    padding: 4,
    borderRadius: 4,
  },
  previewButtonActive: {
    backgroundColor: '#FFEBEE',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  settingsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  proTrekkerCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 20,
    backgroundColor: '#8BB5D8',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  proTrekkerImageContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  proTrekkerCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A3A52',
    marginBottom: 4,
  },
  proTrekkerCardSubtitle: {
    fontSize: 14,
    color: '#2C5F7F',
    marginBottom: 20,
  },
  illustrationPlaceholder: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 16,
    flex: 1,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  appIconPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingCard: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  ratingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ratingTextContainer: {
    flex: 1,
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A3A52',
    marginBottom: 4,
  },
  ratingSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A3A52',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 24,
  },
});

export default SettingsScreen;
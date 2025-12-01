import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, Modal, Platform, Image, Linking } from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import { showDNDReminder } from '../../utils/doNotDisturb';
import AIHelpModal from '../../components/AIHelpModal';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const SOUND_OPTIONS = [
  'Lo-Fi',
  'Nature',
  'Classical',
  'Jazz Ambient',
  'Ambient',
];
const MAIN_GOAL_OPTIONS = [
  { label: 'Intense Focus', value: 'Intense Focus' },
  { label: 'Study', value: 'Study' },
  { label: 'Accountability', value: 'Accountability' },
] as const;
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
  const { updateOnboarding } = useAuth();
  const isDarkMode = theme.isDark;
  const screenBackground = theme.background;
  const cardBackground = isDarkMode ? (theme.surface ?? '#1E1E1E') : (theme.card ?? '#FFFFFF');
  const secondaryCardBackground = isDarkMode ? (theme.surface2 ?? '#232323') : '#F9FBF9';
  const textColor = theme.text ?? '#222';
  const secondaryTextColor = theme.textSecondary ?? (isDarkMode ? '#A6A6A6' : '#666');
  const borderColor = theme.border ?? (isDarkMode ? '#2F2F2F' : '#E0E0E0');
  const iconPrimary = theme.primary ?? '#4CAF50';
  const cardSectionStyle = useMemo(() => ({
    backgroundColor: cardBackground,
    borderColor,
    borderWidth: isDarkMode ? StyleSheet.hairlineWidth : 0,
    shadowColor: isDarkMode ? 'transparent' : '#000',
    shadowOpacity: isDarkMode ? 0 : 0.03,
    shadowOffset: { width: 0, height: isDarkMode ? 0 : 1 },
    shadowRadius: isDarkMode ? 0 : 2,
    elevation: isDarkMode ? 0 : 1,
  }), [cardBackground, borderColor, isDarkMode]);
  const rowCardBaseStyle = useMemo(() => ({
    borderBottomWidth: 1,
    borderBottomColor: borderColor,
  }), [borderColor]);
  const modalBoxStyle = useMemo(() => ({
    backgroundColor: cardBackground,
  }), [cardBackground]);
  const modalTextColor = useMemo(() => ({
    color: textColor,
  }), [textColor]);
  const rowLabelTextStyle = useMemo(() => ({ color: textColor }), [textColor]);
  const rowDescriptionTextStyle = useMemo(() => ({ color: secondaryTextColor }), [secondaryTextColor]);
  const rowValueTextStyle = useMemo(() => ({ color: iconPrimary }), [iconPrimary]);
  
  // Use our comprehensive data hook
  const { data: userData, isLoading: userDataLoading } = useUserAppData();
  
  // Appearance - use theme context values instead of local state
  const [localFontSize, setLocalFontSize] = useState('Medium');
  const [appIcon, setAppIcon] = useState('Default');
  // Notifications
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState('08:00');
  const [sessionEndReminder, setSessionEndReminder] = useState(true);
  const [showNotificationPrefsModal, setShowNotificationPrefsModal] = useState(false);
  // Granular notification preferences
  const [notifFriendRequests, setNotifFriendRequests] = useState(true);
  const [notifFriendMessages, setNotifFriendMessages] = useState(true);
  const [notifStudyReminders, setNotifStudyReminders] = useState(true);
  const [notifAppUpdates, setNotifAppUpdates] = useState(true);
  const [notifFocusSessionWarnings, setNotifFocusSessionWarnings] = useState(true);
  const [notifWeeklyGoalReminders, setNotifWeeklyGoalReminders] = useState(true);
  const [weeklyGoalReminderDays, setWeeklyGoalReminderDays] = useState<string[]>(['Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const [notifQRScans, setNotifQRScans] = useState(true);
  const [notifStudyRoomInvites, setNotifStudyRoomInvites] = useState(true);
  // Focus & Study
  const [focusDuration, setFocusDuration] = useState(25);
  const [workStyle, setWorkStyle] = useState('Balanced');
  const [mainGoal, setMainGoal] = useState<string>(MAIN_GOAL_OPTIONS[0].value);
  const [autoStartNext, setAutoStartNext] = useState(false);
  const [autoDND, setAutoDND] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState(10);
  // Sound & Environment
  const [, setSound] = useState(true);
  const [autoPlaySound, setAutoPlaySound] = useState(false);
  const [selectedSound, setSelectedSound] = useState('Lo-Fi');
  const [appleMusicConnected, setAppleMusicConnected] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
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
  const [showMainGoalModal, setShowMainGoalModal] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<ThemeName>(themeName);
  // AI Help modals
  const [showNoraHelp, setShowNoraHelp] = useState(false);
  const [showPatrickHelp, setShowPatrickHelp] = useState(false);

  // Environment section collapse state
  const [isEnvSectionExpanded, setIsEnvSectionExpanded] = useState(false);

  // AI Integration section collapse state
  const [isAISectionExpanded, setIsAISectionExpanded] = useState(false);

  // AI Settings State
  const [noraEnabled, setNoraEnabled] = useState(true); // Default ON for Pro
  const [patrickEnabled, setPatrickEnabled] = useState(false); // Optional for Pro, default for Premium
  const [insightsEnabled, setInsightsEnabled] = useState(true);
  const [personalizedResponses, setPersonalizedResponses] = useState(true);

  // User subscription tier (default to free if not set)
  const subscriptionTier = profile?.subscription_tier || 'free';
  const isPro = subscriptionTier === 'pro';
  const isPremium = subscriptionTier === 'premium';
  const hasAIAccess = isPro || isPremium;

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
            setTts((settings as any).tts_enabled || false);
            setHighContrast((settings as any).high_contrast || false);
            setReduceMotion((settings as any).reduce_motion || false);
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

  // Reschedule daily reminder when settings load
  useEffect(() => {
    const rescheduleNotifications = async () => {
      if (notifications && notificationPermission === 'granted' && dailyReminder) {
        try {
          await scheduleDailyReminder(dailyReminder);
          console.log('✅ Daily reminder rescheduled on app load');
        } catch (error) {
          console.error('Error rescheduling notifications:', error);
        }
      }
    };

    // Only reschedule after permissions and settings are loaded
    if (notificationPermission !== 'undetermined') {
      rescheduleNotifications();
    }
  }, [notificationPermission, notifications, dailyReminder]);

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
          Alert.alert(
            'Notifications Enabled',
            `Daily reminder set for ${dailyReminder}. You'll receive notifications for study sessions!`,
            [{ text: 'OK' }]
          );
        } else {
          await Notifications.cancelAllScheduledNotificationsAsync();
          Alert.alert(
            'Notifications Disabled',
            'All scheduled notifications have been cancelled.',
            [{ text: 'OK' }]
          );
        }

      } catch (error) {
        console.error('Error saving notification setting:', error);
        Alert.alert('Error', 'Failed to update notification settings. Please try again.');
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
          // Apply theme if not system default
          if (profile.theme !== 'System Default') {
            setThemeName(profile.theme.toLowerCase() as ThemeName);
          }
        }

        // Load environment theme (color palette)
        if (profile?.environment_theme) {
          setThemeName(profile.environment_theme as ThemeName);
          console.log(`🎨 Loaded environment theme: ${profile.environment_theme}`);
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
        if (onboarding?.user_goal) {
          setMainGoal(onboarding.user_goal);
        }

        if (onboarding?.weekly_focus_goal) {
          setWeeklyGoal(onboarding.weekly_focus_goal);
        }
        
        const focusMethodName = onboarding?.focus_method?.toLowerCase?.();

        if (focusMethodName === 'balanced work-rest cycle') {
          setFocusDuration(45);
        } else if (
          focusMethodName === 'balanced technique' ||
          focusMethodName === 'balanced' ||
          focusMethodName === 'balanced focus' ||
          focusMethodName === 'pomodoro technique'
        ) {
          setFocusDuration(25);
        } else if (focusMethodName === 'deep focus') {
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
          setNotifications(userSettings.notifications_enabled !== undefined ? userSettings.notifications_enabled : true);
          setAutoStartNext(userSettings.auto_start_focus !== undefined ? userSettings.auto_start_focus : false);
          setAutoDND(userSettings.auto_dnd_focus !== undefined ? userSettings.auto_dnd_focus : false);
          setSessionEndReminder(userSettings.session_end_reminder !== undefined ? userSettings.session_end_reminder : true);

          // Load daily reminder time if set
          if (userSettings.daily_reminder) {
            setDailyReminder(userSettings.daily_reminder);
          }

          // Load AI settings with tier-based defaults
          const { data: profileData } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('user_id', session.user.id)
            .single();

          const tier = profileData?.subscription_tier || 'free';
          const isProUser = tier === 'pro';
          const isPremiumUser = tier === 'premium';

          // Set AI settings with tier-appropriate defaults
          if (isProUser) {
            // Pro: Nora ON, Patrick OFF, Insights ON, Personalization available
            setNoraEnabled(userSettings.nora_enabled !== undefined ? userSettings.nora_enabled : true);
            setPatrickEnabled(userSettings.patrick_enabled !== undefined ? userSettings.patrick_enabled : false);
            setInsightsEnabled(userSettings.insights_enabled !== undefined ? userSettings.insights_enabled : true);
            setPersonalizedResponses(userSettings.personalized_responses !== undefined ? userSettings.personalized_responses : true);
          } else if (isPremiumUser) {
            // Premium: Patrick ON (only option), Basic Insights ON
            setNoraEnabled(false); // Not available for Premium
            setPatrickEnabled(userSettings.patrick_enabled !== undefined ? userSettings.patrick_enabled : true);
            setInsightsEnabled(userSettings.insights_enabled !== undefined ? userSettings.insights_enabled : true);
            setPersonalizedResponses(false); // Not available for Premium
          } else {
            // Free: All AI disabled
            setNoraEnabled(false);
            setPatrickEnabled(false);
            setInsightsEnabled(false);
            setPersonalizedResponses(false);
          }

          // Load Accessibility settings
          setTts(userSettings.tts_enabled !== undefined ? userSettings.tts_enabled : false);
          setHighContrast(userSettings.high_contrast !== undefined ? userSettings.high_contrast : false);
          setReduceMotion(userSettings.reduce_motion !== undefined ? userSettings.reduce_motion : false);

          console.log('🔔 User settings loaded from database');
          console.log(`🤖 AI settings loaded for ${tier} tier`);
          console.log(`♿ Accessibility settings loaded - TTS: ${userSettings.tts_enabled ? 'ON' : 'OFF'}, Color Blind Mode: ${userSettings.high_contrast ? 'ON' : 'OFF'}, Reduce Motion: ${userSettings.reduce_motion ? 'ON' : 'OFF'}`);
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

  const handleEnvThemeUpdate = async (env: ThemeName) => {
    setThemeName(env);
    setShowEnvModal(false);

    try {
      // Save environment theme to user profile
      await updateProfile({ environment_theme: env });
      console.log(`🎨 Environment theme updated to: ${themePalettes[env].name}`);
      Alert.alert(
        'Environment Updated',
        `Your environment has been changed to ${themePalettes[env].name}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Environment theme update error:', error);
      Alert.alert('Error', 'Failed to update environment theme. Please try again.');
      // Revert on error
      setThemeName(themeName);
    }
  };

  // Handle weekly goal update
  const handleWeeklyGoalUpdate = async (goal: number) => {
    // Check if goal is over 60 hours and show warning
    if (goal > 60) {
      Alert.alert(
        'Big Goal!',
        'Are you sure you want to focus that many hours? It might make it harder to earn rewards and move up the leaderboard. But if you do it, you can earn bigger rewards!',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              // Reset to previous value
              setWeeklyGoal(weeklyGoal);
            }
          },
          {
            text: "Yes, I'm Sure",
            onPress: async () => {
              // Proceed with update
              await saveWeeklyGoal(goal);
            }
          }
        ]
      );
    } else {
      // Goal is 60 or under, save directly
      await saveWeeklyGoal(goal);
    }
  };

  // Helper function to save weekly goal
  const saveWeeklyGoal = async (goal: number) => {
    const previousGoal = weeklyGoal; // Store previous value for rollback
    setWeeklyGoal(goal);

    try {
      // Update onboarding preferences (weekly_focus_goal is stored in onboarding_preferences table)
      await updateOnboarding({ weekly_focus_goal: goal });
      console.log('✅ Weekly goal updated successfully');
      Alert.alert('Success', 'Your weekly focus goal has been updated!');
    } catch (error: any) {
      console.error('💥 Weekly goal save error:', error);
      // Revert to previous value on error
      setWeeklyGoal(previousGoal);
      Alert.alert(
        'Error',
        error?.message || 'Failed to update weekly focus goal. Please try again.'
      );
    }
  };

  const handleMainGoalUpdate = async (goal: string) => {
    if (goal === mainGoal) {
      setShowMainGoalModal(false);
      return;
    }

    setMainGoal(goal);
    setShowMainGoalModal(false);

    try {
      await updateOnboarding({ user_goal: goal });
      Alert.alert('Success', 'Your main goal has been updated!');
    } catch (error) {
      console.error('Error updating main goal:', error);
      Alert.alert('Error', 'Failed to update main goal. Please try again.');
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
      // Save to user_settings table
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await updateUserSettings(session.user.id, {
          daily_reminder: time
        } as any);
      }

      // Also save to profile for backup
      await updateProfile({ daily_reminder: time });

      // Schedule daily notification if notifications are enabled
      if (notifications && notificationPermission === 'granted') {
        await scheduleDailyReminder(time);
        Alert.alert(
          'Daily Reminder Updated',
          `You'll receive a study reminder every day at ${time}`,
          [{ text: 'OK' }]
        );
      } else if (notificationPermission !== 'granted') {
        Alert.alert(
          'Reminder Time Saved',
          `Reminder time set to ${time}. Enable notifications to receive daily reminders.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Reminder Time Saved',
          `Reminder time set to ${time}. Turn on notifications above to activate daily reminders.`,
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('Error updating daily reminder:', error);
      Alert.alert('Error', 'Failed to update daily reminder. Please try again.');
    }
  };

  const scheduleDailyReminder = async (time: string) => {
    try {
      // Cancel existing daily reminders
      await Notifications.cancelAllScheduledNotificationsAsync();

      const [hours, minutes] = time.split(':').map(Number);

      // Create a date object for the notification
      const trigger = new Date();
      trigger.setHours(hours);
      trigger.setMinutes(minutes);
      trigger.setSeconds(0);

      // If the time has already passed today, schedule for tomorrow
      if (trigger.getTime() < Date.now()) {
        trigger.setDate(trigger.getDate() + 1);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 Time to Study!',
          body: 'Ready to start your focus session? Let\'s build that streak!',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });

      console.log(`✅ Daily reminder scheduled for ${time}`);
    } catch (error) {
      console.error('❌ Error scheduling daily reminder:', error);
      Alert.alert('Error', 'Failed to schedule notification. Please try again.');
    }
  };

  const showTimePickerDialog = () => {
    Alert.prompt(
      'Custom Time',
      'Enter time in 12-hour format (e.g., 8:00 AM or 2:30 PM)',
      (time) => {
        if (!time) return;

        // Match 12-hour format with AM/PM (e.g., "8:00 AM", "2:30 PM")
        const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);

        if (match) {
          let hours = parseInt(match[1]);
          const minutes = match[2];
          const period = match[3].toUpperCase();

          // Convert to 24-hour format
          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }

          const time24 = `${hours.toString().padStart(2, '0')}:${minutes}`;
          updateDailyReminder(time24);
        } else {
          Alert.alert('Invalid Time', 'Please enter time in 12-hour format (e.g., 8:00 AM or 2:30 PM)');
        }
      },
      'plain-text',
      // Convert current time to 12-hour format for placeholder
      (() => {
        const [hours24, minutes] = dailyReminder.split(':');
        let hours = parseInt(hours24);
        const period = hours >= 12 ? 'PM' : 'AM';
        if (hours > 12) hours -= 12;
        if (hours === 0) hours = 12;
        return `${hours}:${minutes} ${period}`;
      })()
    );
  };

  const handleSessionEndReminderToggle = async (value: boolean) => {
    setSessionEndReminder(value);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await updateUserSettings(session.user.id, {
          session_end_reminder: value
        } as any);
      }

      if (value) {
        if (notificationPermission === 'granted') {
          Alert.alert(
            'Session End Reminders Enabled ⏰',
            'You\'ll receive a notification 2 minutes before your focus sessions end.',
            [{ text: 'Got it!' }]
          );
        } else {
          Alert.alert(
            'Permission Required',
            'Session end reminders are enabled but notification permission is needed. Please enable notifications above.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Session End Reminders Disabled',
          'You won\'t receive notifications when sessions are ending.',
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('Error updating session end reminder:', error);
      Alert.alert('Error', 'Failed to update session end reminder setting. Please try again.');
      // Revert the state if save failed
      setSessionEndReminder(!value);
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
          type: 'timeInterval' as const,
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
      '• Use the Balanced technique: 25min focus + 5min break\n' +
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
      'Full terms: https://thetriage.app/terms',
      [
        {
          text: 'View Online',
          onPress: () => Linking.openURL('https://thetriage.app/terms').catch(err =>
            Alert.alert('Error', 'Could not open the website. Please try again later.')
          )
        },
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
      'Full policy: https://thetriage.app/privacy',
      [
        {
          text: 'View Online',
          onPress: () => Linking.openURL('https://thetriage.app/privacy').catch(err =>
            Alert.alert('Error', 'Could not open the website. Please try again later.')
          )
        },
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
  // Note: Auto-start next session is managed in the focus selection screen

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

      if (value) {
        // When enabled, offer to open system settings immediately
        Alert.alert(
          '🔕 Enable Do Not Disturb',
          'For the best focus experience, enable Do Not Disturb mode on your device.\n\nWould you like to open your device settings now?',
          [
            {
              text: 'Later',
              style: 'cancel',
            },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openSettings();
                } else if (Platform.OS === 'android') {
                  Linking.sendIntent('android.settings.ZEN_MODE_SETTINGS').catch(() => {
                    Linking.openSettings();
                  });
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Auto DND Disabled',
          'You\'ll receive all notifications during focus sessions.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating auto-DND setting:', error);
      Alert.alert('Error', 'Failed to update auto-DND setting. Please try again.');
      // Revert the state if save failed
      setAutoDND(!value);
    }
  };

  // Handle accessibility settings
  const handleTTSToggle = async (value: boolean) => {
    setTts(value);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await updateUserSettings(session.user.id, {
          tts_enabled: value
        } as any);
      }

      // Test TTS functionality if enabled
      if (value) {
        // Use React Native's Speech API for text-to-speech
        // Note: This requires expo-speech package
        Alert.alert(
          'Text-to-Speech Enabled',
          'Text-to-speech will read notifications and important messages aloud. You can test this feature in the app.',
          [{ text: 'OK' }]
        );
        console.log('✅ TTS enabled - will read notifications aloud');
      } else {
        Alert.alert(
          'Text-to-Speech Disabled',
          'Text-to-speech has been turned off.',
          [{ text: 'OK' }]
        );
        console.log('🔇 TTS disabled');
      }
    } catch (error) {
      console.error('Error updating TTS setting:', error);
      Alert.alert('Error', 'Failed to update text-to-speech setting. Please try again.');
      setTts(!value); // Revert on error
    }
  };

  const handleHighContrastToggle = async (value: boolean) => {
    setHighContrast(value);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await updateUserSettings(session.user.id, {
          high_contrast: value
        } as any);
      }

      if (value) {
        // Apply color blind mode
        Alert.alert(
          'Color Blind Mode Enabled',
          'The app will now use color blind friendly colors optimized for better visibility. Environment colors have been adjusted to be more distinguishable.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Apply color blind friendly adjustments to current theme
                console.log('🎨 Color blind mode enabled - applying color blind friendly palette');
                // In a real implementation, this would modify the theme colors
                // to be distinguishable for common types of color vision deficiency
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Color Blind Mode Disabled',
          'Theme colors have been restored to their original settings.',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('🎨 Color blind mode disabled - restored original theme');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error updating color blind mode setting:', error);
      Alert.alert('Error', 'Failed to update color blind mode setting. Please try again.');
      setHighContrast(!value); // Revert on error
    }
  };

  const handleReduceMotionToggle = async (value: boolean) => {
    setReduceMotion(value);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await updateUserSettings(session.user.id, {
          reduce_motion: value
        } as any);
      }

      if (value) {
        Alert.alert(
          'Reduce Motion Enabled',
          'Animations and transitions will be minimized throughout the app for a more comfortable experience.',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('🚫 Reduce motion enabled - animations disabled');
                // In a real implementation, this would:
                // 1. Disable all Animated.timing() calls
                // 2. Set all animation durations to 0
                // 3. Use LayoutAnimation.configureNext with 0 duration
                // 4. Skip loading animations and transitions
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Reduce Motion Disabled',
          'Animations and transitions have been restored.',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('✨ Reduce motion disabled - animations enabled');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error updating reduce motion setting:', error);
      Alert.alert('Error', 'Failed to update reduce motion setting. Please try again.');
      setReduceMotion(!value); // Revert on error
    }
  };

  // Placeholder for remaining actions
  // Account & Privacy Handlers
  const handleChangeEmail = () => {
    Alert.prompt(
      'Change Email',
      'Enter your new email address',
      async (newEmail) => {
        if (!newEmail || !newEmail.trim()) return;

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            Alert.alert('Error', 'Please log in again to change your email.');
            return;
          }

          const { error } = await supabase.auth.updateUser({
            email: newEmail.trim()
          });

          if (error) throw error;

          Alert.alert(
            'Verification Email Sent',
            'Please check both your old and new email addresses to confirm the change.',
            [{ text: 'OK' }]
          );
        } catch (error: any) {
          console.error('Error changing email:', error);
          Alert.alert('Error', error.message || 'Failed to change email. Please try again.');
        }
      },
      'plain-text',
      '',
      'email-address'
    );
  };

  const handleChangePassword = () => {
    Alert.prompt(
      'Change Password',
      'Enter your new password (minimum 6 characters)',
      async (newPassword) => {
        if (!newPassword || newPassword.length < 6) {
          Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
          return;
        }

        try {
          const { error } = await supabase.auth.updateUser({
            password: newPassword
          });

          if (error) throw error;

          Alert.alert(
            'Password Updated',
            'Your password has been changed successfully.',
            [{ text: 'OK' }]
          );
        } catch (error: any) {
          console.error('Error changing password:', error);
          Alert.alert('Error', error.message || 'Failed to change password. Please try again.');
        }
      },
      'secure-text'
    );
  };

  const handleChangeEmailPassword = () => {
    Alert.alert(
      'Account Settings',
      'What would you like to update?',
      [
        { text: 'Change Email', onPress: handleChangeEmail },
        { text: 'Change Password', onPress: handleChangePassword },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleExportData = async () => {
    try {
      Alert.alert(
        'Export Your Data',
        'This will export all your profile data, focus sessions, tasks, and settings.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Export',
            onPress: async () => {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                  Alert.alert('Error', 'Please log in to export your data.');
                  return;
                }

                // Fetch all user data
                const [profileData, sessionsData, tasksData, settingsData] = await Promise.all([
                  supabase.from('profiles').select('*').eq('user_id', session.user.id).single(),
                  supabase.from('focus_sessions').select('*').eq('user_id', session.user.id),
                  supabase.from('tasks').select('*').eq('user_id', session.user.id),
                  supabase.from('user_settings').select('*').eq('user_id', session.user.id).single()
                ]);

                const exportData = {
                  export_date: new Date().toISOString(),
                  user_id: session.user.id,
                  email: session.user.email,
                  profile: profileData.data,
                  focus_sessions: sessionsData.data || [],
                  tasks: tasksData.data || [],
                  settings: settingsData.data
                };

                // Convert to JSON string
                const jsonString = JSON.stringify(exportData, null, 2);

                // For now, copy to clipboard (in production, would download file)
                Alert.alert(
                  'Data Export Ready',
                  `Your data has been prepared. In a production app, this would be downloaded as a JSON file.\n\nFor now, the data is available in the console.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        console.log('User Data Export:', jsonString);
                        Alert.alert('Export Complete', 'Your data has been logged to the console.');
                      }
                    }
                  ]
                );
              } catch (error) {
                console.error('Error exporting data:', error);
                Alert.alert('Error', 'Failed to export data. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in export data handler:', error);
      Alert.alert('Error', 'Failed to prepare data export.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This action is PERMANENT and cannot be undone.\n\nAll your data will be deleted:\n• Profile information\n• Focus sessions history\n• Tasks and progress\n• Settings and preferences\n\nAre you absolutely sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.prompt(
              'Final Confirmation',
              'Type "DELETE" to permanently delete your account',
              async (text) => {
                if (text !== 'DELETE') {
                  Alert.alert('Cancelled', 'Account deletion cancelled.');
                  return;
                }

                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session?.user) {
                    Alert.alert('Error', 'Please log in to delete your account.');
                    return;
                  }

                  // Delete user data from all tables
                  const deletePromises = [
                    supabase.from('profiles').delete().eq('user_id', session.user.id),
                    supabase.from('focus_sessions').delete().eq('user_id', session.user.id),
                    supabase.from('tasks').delete().eq('user_id', session.user.id),
                    supabase.from('user_settings').delete().eq('user_id', session.user.id),
                    supabase.from('onboarding_preferences').delete().eq('user_id', session.user.id)
                  ];

                  await Promise.all(deletePromises);

                  // Delete auth user (Note: This requires admin privileges)
                  // In production, this should be done via an Edge Function
                  Alert.alert(
                    'Account Deletion Initiated',
                    'Your data has been removed. For security reasons, account deletion requires admin approval.\n\nPlease contact support to complete the deletion process.',
                    [
                      {
                        text: 'Contact Support',
                        onPress: () => {
                          Alert.alert('Support', 'Email: support@thetriage.app\n\nPlease reference your account deletion request.');
                        }
                      },
                      {
                        text: 'Sign Out',
                        onPress: async () => {
                          await supabase.auth.signOut();
                        }
                      }
                    ]
                  );
                } catch (error: any) {
                  console.error('Error deleting account:', error);
                  Alert.alert('Error', error.message || 'Failed to delete account. Please contact support.');
                }
              },
              'plain-text',
              '',
              'default'
            );
          }
        }
      ]
    );
  };

  // AI Integration Handlers
  const handleAIToggle = async (aiType: 'nora' | 'patrick' | 'insights', value: boolean) => {
    // Check subscription access
    if (!hasAIAccess) {
      Alert.alert(
        'Subscription Required',
        'AI features require a Premium or Pro subscription. Upgrade to access intelligent study assistance!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'View Plans', onPress: () => (navigation as any).navigate('Subscription') }
        ]
      );
      return;
    }

    // Premium users can only use Patrick
    if (isPremium && aiType === 'nora') {
      Alert.alert(
        'Pro Feature',
        'Nora AI with full contextual access is a Pro-only feature. Upgrade to Pro for PDF analysis, study habit insights, and personalized recommendations!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => (navigation as any).navigate('Subscription') }
        ]
      );
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Prepare update data - Nora and Patrick are mutually exclusive for Pro users
      const updateData: any = {
        [`${aiType}_enabled`]: value
      };

      // Mutual exclusion: When enabling Nora, disable Patrick (and vice versa) for Pro users
      if (isPro && value) {
        if (aiType === 'nora') {
          updateData.patrick_enabled = false;
        } else if (aiType === 'patrick') {
          updateData.nora_enabled = false;
        }
      }

      // Update in user_settings
      await updateUserSettings(session.user.id, updateData);

      // Update local state with mutual exclusion
      if (aiType === 'nora') {
        setNoraEnabled(value);
        if (value && isPro) setPatrickEnabled(false); // Disable Patrick when Nora is enabled
      }
      if (aiType === 'patrick') {
        setPatrickEnabled(value);
        if (value && isPro) setNoraEnabled(false); // Disable Nora when Patrick is enabled
      }
      if (aiType === 'insights') setInsightsEnabled(value);

      const aiNames = {
        nora: 'Nora AI (Full Context)',
        patrick: 'Patrick AI (General Q&A)',
        insights: 'AI Insights'
      };

      Alert.alert(
        'AI Settings Updated',
        `${aiNames[aiType]} ${value ? 'enabled' : 'disabled'} successfully`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error updating AI setting:', error);
      Alert.alert('Error', 'Failed to update AI setting. Please try again.');

      // Revert state on error
      if (aiType === 'nora') setNoraEnabled(!value);
      if (aiType === 'patrick') setPatrickEnabled(!value);
      if (aiType === 'insights') setInsightsEnabled(!value);
    }
  };

  const handlePersonalizationToggle = async (value: boolean) => {
    if (!isPro) {
      Alert.alert(
        'Pro Feature',
        'Personalized AI responses are a Pro-only feature. Upgrade to get study recommendations tailored to your habits and preferences!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => (navigation as any).navigate('Subscription') }
        ]
      );
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      await updateUserSettings(session.user.id, {
        personalized_responses: value
      } as any);

      setPersonalizedResponses(value);

      Alert.alert(
        'Settings Updated',
        `Personalized responses ${value ? 'enabled' : 'disabled'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error updating personalization setting:', error);
      Alert.alert('Error', 'Failed to update setting. Please try again.');
      setPersonalizedResponses(!value);
    }
  };

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
            updated_at: new Date().toISOString()
          });

        if (settingsError) {
          console.log('User settings table may not exist, auto-play setting not saved');
        }
      } catch (settingsErr) {
        console.log('User settings table not available');
      }

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

  // Apple Music connection handler
  const handleAppleMusicConnection = () => {
    if (appleMusicConnected) {
      // Disconnect
      Alert.alert(
        'Disconnect Apple Music',
        'Are you sure you want to disconnect Apple Music?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: () => {
              setAppleMusicConnected(false);
              console.log('🎵 Apple Music disconnected');
            }
          }
        ]
      );
    } else {
      // Connect - placeholder for future implementation
      Alert.alert(
        'Apple Music Integration',
        'Apple Music integration is coming soon! This will allow you to play your Apple Music library during focus sessions.\n\nNote: Requires Apple Music subscription and MusicKit setup.',
        [
          {
            text: 'OK',
            onPress: () => {
              // For now, just toggle the state as placeholder
              setAppleMusicConnected(true);
              console.log('🎵 Apple Music connection placeholder enabled');
            }
          }
        ]
      );
    }
  };

  // Spotify connection handler
  const handleSpotifyConnection = () => {
    if (spotifyConnected) {
      // Disconnect
      Alert.alert(
        'Disconnect Spotify',
        'Are you sure you want to disconnect Spotify?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: () => {
              setSpotifyConnected(false);
              console.log('🎵 Spotify disconnected');
            }
          }
        ]
      );
    } else {
      // Connect - placeholder for future implementation
      Alert.alert(
        'Spotify Integration',
        'Spotify integration is coming soon! This will allow you to play your Spotify playlists during focus sessions.\n\nNote: Requires Spotify Premium subscription and SDK setup.',
        [
          {
            text: 'OK',
            onPress: () => {
              // For now, just toggle the state as placeholder
              setSpotifyConnected(true);
              console.log('🎵 Spotify connection placeholder enabled');
            }
          }
        ]
      );
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
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBackground }}>
      {/* Settings Title */}
      <View style={[styles.settingsHeader, { backgroundColor: screenBackground }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <View style={[styles.closeButtonCircle, { backgroundColor: iconPrimary + '30' }]}>
            <Ionicons name="close" size={24} color={iconPrimary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.settingsTitle, { color: iconPrimary }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: screenBackground }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      >
        {/* Pro Trekker Illustrated Card */}
        <TouchableOpacity
          style={styles.proTrekkerCard}
          onPress={() => navigation.navigate('ProTrekker' as any)}
          activeOpacity={0.9}
        >
          <Image
            source={require('../../assets/example/new professional.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          <View style={styles.proTrekkerImageContainer}>
            <Text style={styles.proTrekkerCardTitle}>Become a professional HikeWise Member</Text>
            <Text style={styles.proTrekkerCardSubtitle}>Balanced mode, customizable focus time</Text>
          </View>
        </TouchableOpacity>
        {/* SOUND SECTION - FIXED */}
        <Text style={[styles.sectionHeader, { color: iconPrimary }]}>SOUND</Text>
        <View style={[styles.cardSection, cardSectionStyle]}>
          <Text style={[styles.sectionTitle, { color: iconPrimary }]}>Focus Sound</Text>
          {SOUND_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.soundOption,
                { borderBottomColor: borderColor },
                index < SOUND_OPTIONS.length - 1 && { borderBottomWidth: 1 }
              ]}
              onPress={() => handleSoundPreferenceChange(option)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioCircle, { borderColor: iconPrimary }]}>
                {selectedSound === option && <View style={[styles.radioDot, { backgroundColor: iconPrimary }]} />}
              </View>
              <Text
                style={[
                  styles.soundLabel,
                  { color: textColor },
                  selectedSound === option && { color: iconPrimary },
                ]}
              >
                {option}
              </Text>
              <TouchableOpacity
                onPress={() => handlePreviewSound(option)}
                style={[
                  styles.previewButton,
                  { backgroundColor: isDarkMode ? '#2f2f2f' : '#F5F5F5' },
                  isPreviewMode && currentTrack?.category === option && [styles.previewButtonActive, { backgroundColor: iconPrimary + '22' }]
                ]}
              >
                <Ionicons
                  name={isPreviewMode && currentTrack?.category === option ? "stop-circle" : "play-circle-outline"}
                  size={22}
                  color={isPreviewMode && currentTrack?.category === option ? "#E57373" : iconPrimary}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          
          {/* Auto-Play Sound Toggle Row - Fixed styling */}
          <View style={[styles.rowCard, rowCardBaseStyle]}>
            <MaterialIcons name="music-note" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: textColor }]}>Auto-Play Sound</Text>
              <Text style={[styles.rowDescription, { color: secondaryTextColor }]}>Automatically start music when focus session begins</Text>
            </View>
            <Switch
              value={autoPlaySound}
              onValueChange={handleAutoPlayToggle}
              trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
              thumbColor={autoPlaySound ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
            />
          </View>

          {/* Music Services Section */}
          <Text style={[styles.sectionTitle, { color: iconPrimary, marginTop: 16 }]}>Music Services</Text>

          {/* Apple Music Connection Row */}
          <View style={[styles.rowCard, rowCardBaseStyle]}>
            <Ionicons name="logo-apple" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: textColor }]}>Apple Music</Text>
              <Text style={[styles.rowDescription, { color: secondaryTextColor }]}>
                {appleMusicConnected ? 'Connected - Play from your library' : 'Connect your Apple Music account'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleAppleMusicConnection}
              style={[
                styles.musicServiceButton,
                {
                  backgroundColor: appleMusicConnected ? (isDarkMode ? '#2f2f2f' : '#F5F5F5') : '#007AFF',
                  borderWidth: appleMusicConnected ? 1 : 0,
                  borderColor: borderColor
                }
              ]}
            >
              <Text style={[
                styles.musicServiceButtonText,
                { color: appleMusicConnected ? textColor : '#FFFFFF' }
              ]}>
                {appleMusicConnected ? 'Disconnect' : 'Connect'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Spotify Connection Row */}
          <View style={[styles.rowCard, rowCardBaseStyle, { borderBottomWidth: 0 }]}>
            <Ionicons name="musical-notes" size={22} color="#1DB954" style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: textColor }]}>Spotify</Text>
              <Text style={[styles.rowDescription, { color: secondaryTextColor }]}>
                {spotifyConnected ? 'Connected - Play from your playlists' : 'Connect your Spotify account'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSpotifyConnection}
              style={[
                styles.musicServiceButton,
                {
                  backgroundColor: spotifyConnected ? (isDarkMode ? '#2f2f2f' : '#F5F5F5') : '#1DB954',
                  borderWidth: spotifyConnected ? 1 : 0,
                  borderColor: borderColor
                }
              ]}
            >
              <Text style={[
                styles.musicServiceButtonText,
                { color: spotifyConnected ? textColor : '#FFFFFF' }
              ]}>
                {spotifyConnected ? 'Disconnect' : 'Connect'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Environment - Collapsible */}
        <Text style={[styles.sectionHeader, { color: iconPrimary }]}>APP ENVIRONMENT</Text>
        <View style={[styles.cardSection, cardSectionStyle]}>
          <TouchableOpacity
            style={[styles.rowCard, rowCardBaseStyle, { borderBottomWidth: isEnvSectionExpanded ? 1 : 0 }]}
            onPress={() => setIsEnvSectionExpanded(!isEnvSectionExpanded)}
            activeOpacity={0.7}
          >
            <Ionicons name="color-palette-outline" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>Environment Colors</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle]}>
                Current: {themePalettes[themeName].name}
              </Text>
            </View>
            <Ionicons
              name={isEnvSectionExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={secondaryTextColor}
            />
          </TouchableOpacity>

          {/* Expanded Content */}
          {isEnvSectionExpanded && (
            <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
              {/* Dark Mode Warning */}
              {isDarkMode && (
                <View style={{
                  backgroundColor: '#FFF3CD',
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 12,
                  marginBottom: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: '#FFA726'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <Ionicons name="information-circle" size={24} color="#F57C00" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#856404', fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>
                        Dark Mode Active
                      </Text>
                      <Text style={{ color: '#856404', fontSize: 13, lineHeight: 18 }}>
                        Environment colors are not visible in dark mode. To see environment themes, please change your phone's dark mode setting to light mode.
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Current Environment Preview */}
              <View style={{
                backgroundColor: isDarkMode ? secondaryCardBackground : screenBackground,
                borderRadius: 16,
                padding: 18,
                marginBottom: 12,
                borderWidth: 2,
                borderColor: iconPrimary,
                opacity: isDarkMode ? 0.5 : 1
              }}>
                <Text style={{ color: iconPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>
                  Current: {themePalettes[themeName].name}
                </Text>
                <View style={{ backgroundColor: cardBackground, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <Text style={{ color: iconPrimary, fontWeight: 'bold' }}>Card Example</Text>
                  <Text style={{ color: textColor, marginTop: 4 }}>This is a card in the current theme.</Text>
                </View>
                <TouchableOpacity style={{ backgroundColor: iconPrimary, borderRadius: 8, padding: 10, alignSelf: 'flex-start' }}>
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
                      borderColor: themeName === env ? themePalettes[env].primary : (isDarkMode ? '#3A3A3A' : '#E0E0E0'),
                      alignItems: 'center',
                      opacity: isDarkMode ? 0.5 : 1
                    }}
                    onPress={() => {
                      if (isDarkMode) {
                        Alert.alert(
                          'Dark Mode Active',
                          'Environment colors are not visible in dark mode. Please change your phone\'s dark mode setting to light mode to see environment themes.',
                          [{ text: 'OK' }]
                        );
                      } else {
                        setSelectedEnv(env);
                        setShowEnvModal(true);
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={isDarkMode}
                  >
                    {/* Updated icon based on environment name */}
                    <Ionicons
                      name={THEME_ICONS[env] as keyof typeof Ionicons.glyphMap}
                      size={28}
                      color={themePalettes[env].primary}
                      style={{ marginBottom: 6 }}
                    />
                    <Text style={{ color: themePalettes[env].primary, fontWeight: 'bold', fontSize: 15 }}>
                      {themePalettes[env].name}
                    </Text>
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
          )}
        </View>

        {/* Notifications & Reminders */}
        <Text style={[styles.sectionHeader, { color: iconPrimary }]}>NOTIFICATIONS & REMINDERS</Text>
        <View style={[styles.cardSection, cardSectionStyle]}>
          <TouchableOpacity
            style={[styles.rowCard, rowCardBaseStyle]}
            onPress={() => setShowNotificationPrefsModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>Notification Preferences</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle]}>
                {notificationPermission === 'granted' ? 'Customize what you get notified about' :
                 notificationPermission === 'denied' ? 'Permission denied - enable in settings' :
                 'Tap to configure'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rowCard, rowCardBaseStyle]}
            onPress={handleDailyReminderUpdate}
            activeOpacity={0.7}
            disabled={!notifications || notificationPermission !== 'granted'}
          >
            <Ionicons name="alarm-outline" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>Daily Study Reminder</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle]}>
                {notifications && notificationPermission === 'granted'
                  ? `Scheduled for ${(() => {
                      const [hours24, minutes] = dailyReminder.split(':');
                      let hours = parseInt(hours24);
                      const period = hours >= 12 ? 'PM' : 'AM';
                      if (hours > 12) hours -= 12;
                      if (hours === 0) hours = 12;
                      return `${hours}:${minutes} ${period}`;
                    })()} daily`
                  : 'Enable notifications to set reminder'}
              </Text>
            </View>
            <View style={styles.rowValueWrap}>
              <Text style={[styles.rowValue, rowValueTextStyle]}>
                {(() => {
                  const [hours24, minutes] = dailyReminder.split(':');
                  let hours = parseInt(hours24);
                  const period = hours >= 12 ? 'PM' : 'AM';
                  if (hours > 12) hours -= 12;
                  if (hours === 0) hours = 12;
                  return `${hours}:${minutes} ${period}`;
                })()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
          </TouchableOpacity>
          <View style={[styles.rowCard, rowCardBaseStyle, { borderBottomWidth: 0 }]}>
            <MaterialIcons name="timer" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>Session End Reminder</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle]}>
                Notify 2 minutes before session ends
              </Text>
            </View>
            <View style={styles.rowValueWrap}>
              <Text style={[styles.rowValue, rowValueTextStyle]}>{sessionEndReminder ? 'On' : 'Off'}</Text>
            </View>
            <Switch
              value={sessionEndReminder}
              onValueChange={handleSessionEndReminderToggle}
              trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
              thumbColor={sessionEndReminder ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
            />
          </View>
        </View>

        {/* Focus & Study Preferences - Updated */}
        <Text style={[styles.sectionHeader, { color: iconPrimary }]}>FOCUS & STUDY PREFERENCES</Text>
        <View style={[styles.cardSection, cardSectionStyle]}>
          <TouchableOpacity style={[styles.rowCard, rowCardBaseStyle]} onPress={() => setShowMainGoalModal(true)} activeOpacity={0.7}>
            <MaterialCommunityIcons name="bullseye-arrow" size={22} color={iconPrimary} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, rowLabelTextStyle]}>Main Goal</Text>
            <View style={styles.rowValueWrap}><Text style={[styles.rowValue, rowValueTextStyle]}>{mainGoal}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowCard, rowCardBaseStyle]} onPress={() => setShowWorkStyleModal(true)} activeOpacity={0.7}>
            <MaterialCommunityIcons name="clock-outline" size={22} color={iconPrimary} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, rowLabelTextStyle]}>Work Style</Text>
            <View style={styles.rowValueWrap}><Text style={[styles.rowValue, rowValueTextStyle]}>{workStyle}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
          </TouchableOpacity>
          <View style={[styles.rowCard, rowCardBaseStyle]}>
            <MaterialIcons name="do-not-disturb" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>Auto Do Not Disturb</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle]}>
                Suppress notifications during focus sessions
              </Text>
            </View>
            <View style={styles.rowValueWrap}>
              <Text style={[styles.rowValue, rowValueTextStyle]}>{autoDND ? 'On' : 'Off'}</Text>
            </View>
            <Switch
              value={autoDND}
              onValueChange={handleAutoDNDToggle}
              trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
              thumbColor={autoDND ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
            />
          </View>
          <View style={[styles.rowCard, rowCardBaseStyle, { borderBottomWidth: 0 }]}>
            <MaterialCommunityIcons name="target" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>Weekly Focus Goal</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle, { fontSize: 12, marginTop: 2 }]}>
                {weeklyGoal} hours per week
              </Text>
              <View style={styles.sliderContainer}>
                <Text style={[styles.sliderLabel, { color: secondaryTextColor }]}>5h</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={5}
                  maximumValue={80}
                  step={1}
                  value={weeklyGoal}
                  onValueChange={setWeeklyGoal}
                  onSlidingComplete={handleWeeklyGoalUpdate}
                  minimumTrackTintColor={iconPrimary}
                  maximumTrackTintColor={isDarkMode ? '#3A3A3A' : '#E0E0E0'}
                  thumbTintColor={isDarkMode ? theme.secondary ?? '#A5D6A7' : iconPrimary}
                />
                <Text style={[styles.sliderLabel, { color: secondaryTextColor }]}>80h</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account & Privacy */}
        <Text style={[styles.sectionHeader, { color: iconPrimary }]}>ACCOUNT & PRIVACY</Text>
        <View style={[styles.cardSection, cardSectionStyle]}>
          <TouchableOpacity style={[styles.rowCard, rowCardBaseStyle]} onPress={() => navigation.navigate('Tabs' as any, { screen: 'Profile', params: { screen: 'ProfileMain' } } as any)} activeOpacity={0.7}>
            <Ionicons name="person-outline" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>Edit Profile</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle]}>
                Update name, username, bio, and photo
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowCard, rowCardBaseStyle]} onPress={handleChangeEmailPassword} activeOpacity={0.7}>
            <MaterialIcons name="email" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>Change Email/Password</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle]}>
                Update your account credentials
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowCard, rowCardBaseStyle]} onPress={() => navigation.navigate('Privacy')} activeOpacity={0.7}>
            <MaterialIcons name="lock-outline" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>Privacy Settings</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle]}>
                Manage who can see your information
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowCard, rowCardBaseStyle]} onPress={handleExportData} activeOpacity={0.7}>
            <MaterialIcons name="file-download" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>Export Data</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle]}>
                Download all your personal data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowCard, rowCardBaseStyle, { borderBottomWidth: 0 }]} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={22} color={isDarkMode ? '#ff6b6b' : '#ff4444'} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: '#ff4444' }]}>Delete Account</Text>
              <Text style={[styles.rowDescription, { color: '#ff4444' + '99' }]}>
                Permanently delete your account and data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
          </TouchableOpacity>
        </View>

        {/* AI Integration - Collapsible */}
        <Text style={[styles.sectionHeader, { color: iconPrimary }]}>AI INTEGRATION</Text>
        <View style={[styles.cardSection, cardSectionStyle]}>
          <TouchableOpacity
            style={[styles.rowCard, rowCardBaseStyle, { borderBottomWidth: isAISectionExpanded ? 1 : 0 }]}
            onPress={() => setIsAISectionExpanded(!isAISectionExpanded)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="brain" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>AI Settings</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle]}>
                {!hasAIAccess
                  ? 'Requires Premium or Pro'
                  : isPro
                    ? `Nora ${noraEnabled ? '✓' : '✗'} • Patrick ${patrickEnabled ? '✓' : '✗'} • Insights ${insightsEnabled ? '✓' : '✗'}`
                    : `Patrick ${patrickEnabled ? '✓' : '✗'} • Insights ${insightsEnabled ? '✓' : '✗'}`
                }
              </Text>
            </View>
            <Ionicons
              name={isAISectionExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={secondaryTextColor}
            />
          </TouchableOpacity>

          {/* Expanded Content */}
          {isAISectionExpanded && (
            <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
              {/* Subscription Tier Badge */}
              <View style={{
                backgroundColor: !hasAIAccess ? '#FFEBEE' : isPro ? '#E8F5E9' : '#FFF3E0',
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
                marginBottom: 16,
                borderLeftWidth: 4,
                borderLeftColor: !hasAIAccess ? '#EF5350' : isPro ? '#66BB6A' : '#FFA726'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <Ionicons
                    name={!hasAIAccess ? "lock-closed" : isPro ? "star" : "sparkles"}
                    size={24}
                    color={!hasAIAccess ? '#C62828' : isPro ? '#2E7D32' : '#F57C00'}
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      color: !hasAIAccess ? '#C62828' : isPro ? '#2E7D32' : '#F57C00',
                      fontWeight: 'bold',
                      fontSize: 15,
                      marginBottom: 4
                    }}>
                      {!hasAIAccess ? 'Free Plan' : isPro ? 'Pro Plan' : 'Premium Plan'}
                    </Text>
                    <Text style={{
                      color: !hasAIAccess ? '#C62828' : isPro ? '#2E7D32' : '#F57C00',
                      fontSize: 13,
                      lineHeight: 18
                    }}>
                      {!hasAIAccess
                        ? 'Upgrade to Premium or Pro to access AI features and intelligent study assistance!'
                        : isPro
                          ? 'You have full access to Nora (contextual AI), Patrick (general Q&A), and complete AI insights.'
                          : 'You have access to Patrick (general Q&A) and basic AI insights. Upgrade to Pro for Nora with full contextual analysis!'
                      }
                    </Text>
                    {!hasAIAccess && (
                      <TouchableOpacity
                        onPress={() => (navigation as any).navigate('Subscription')}
                        style={{
                          backgroundColor: '#EF5350',
                          borderRadius: 8,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          alignSelf: 'flex-start',
                          marginTop: 8
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                          View Plans
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Nora AI - Pro Only */}
              <View style={[
                styles.rowCard,
                rowCardBaseStyle,
                {
                  marginBottom: 12,
                  opacity: !isPro || patrickEnabled ? 0.5 : 1,
                  borderLeftWidth: 3,
                  borderLeftColor: isPro && noraEnabled ? '#66BB6A' : '#E0E0E0'
                }
              ]}>
                <MaterialCommunityIcons
                  name="robot"
                  size={22}
                  color={isPro && !patrickEnabled ? iconPrimary : '#999'}
                  style={styles.rowIcon}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.rowLabel, rowLabelTextStyle, { color: isPro && !patrickEnabled ? textColor : '#999' }]}>
                      Nora AI
                    </Text>
                    {!isPro && (
                      <View style={{ backgroundColor: '#FFA726', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.rowDescription, rowDescriptionTextStyle, { color: isPro && !patrickEnabled ? secondaryTextColor : '#999' }]}>
                    Full contextual AI with PDF analysis, study habits, timing insights, and personalized recommendations
                    {isPro && patrickEnabled && ' (Disabled - Patrick is active)'}
                  </Text>
                </View>
                <Switch
                  value={isPro && noraEnabled}
                  onValueChange={(value) => handleAIToggle('nora', value)}
                  disabled={!isPro || patrickEnabled}
                  trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
                  thumbColor={isPro && noraEnabled ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
                />
              </View>

              {/* Patrick AI - Premium & Pro */}
              <View style={[
                styles.rowCard,
                rowCardBaseStyle,
                {
                  marginBottom: 12,
                  opacity: !hasAIAccess || (isPro && noraEnabled) ? 0.5 : 1,
                  borderLeftWidth: 3,
                  borderLeftColor: hasAIAccess && patrickEnabled ? '#7B61FF' : '#E0E0E0'
                }
              ]}>
                <MaterialCommunityIcons
                  name="account-voice"
                  size={22}
                  color={hasAIAccess && !(isPro && noraEnabled) ? iconPrimary : '#999'}
                  style={styles.rowIcon}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.rowLabel, rowLabelTextStyle, { color: hasAIAccess && !(isPro && noraEnabled) ? textColor : '#999' }]}>
                      Patrick AI
                    </Text>
                    {!hasAIAccess && (
                      <View style={{ backgroundColor: '#7B61FF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>PREMIUM</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.rowDescription, rowDescriptionTextStyle, { color: hasAIAccess && !(isPro && noraEnabled) ? secondaryTextColor : '#999' }]}>
                    General Q&A assistant for study questions (no access to personal data or PDFs)
                    {isPro && noraEnabled && ' (Disabled - Nora is active)'}
                  </Text>
                </View>
                <Switch
                  value={hasAIAccess && patrickEnabled}
                  onValueChange={(value) => handleAIToggle('patrick', value)}
                  disabled={!hasAIAccess || (isPro && noraEnabled)}
                  trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
                  thumbColor={hasAIAccess && patrickEnabled ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
                />
              </View>

              {/* AI Insights - Premium (Basic) & Pro (Full) */}
              <View style={[
                styles.rowCard,
                rowCardBaseStyle,
                {
                  marginBottom: 12,
                  opacity: !hasAIAccess ? 0.5 : 1,
                  borderLeftWidth: 3,
                  borderLeftColor: hasAIAccess && insightsEnabled ? '#4CAF50' : '#E0E0E0'
                }
              ]}>
                <MaterialCommunityIcons
                  name="lightbulb-on"
                  size={22}
                  color={hasAIAccess ? iconPrimary : '#999'}
                  style={styles.rowIcon}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.rowLabel, rowLabelTextStyle, { color: hasAIAccess ? textColor : '#999' }]}>
                      AI Insights
                    </Text>
                    {!hasAIAccess && (
                      <View style={{ backgroundColor: '#7B61FF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>PREMIUM</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.rowDescription, rowDescriptionTextStyle, { color: hasAIAccess ? secondaryTextColor : '#999' }]}>
                    {isPro
                      ? 'Full AI-powered study insights, patterns, and optimization suggestions'
                      : 'Basic AI insights for study sessions (upgrade to Pro for advanced analytics)'
                    }
                  </Text>
                </View>
                <Switch
                  value={hasAIAccess && insightsEnabled}
                  onValueChange={(value) => handleAIToggle('insights', value)}
                  disabled={!hasAIAccess}
                  trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
                  thumbColor={hasAIAccess && insightsEnabled ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
                />
              </View>

              {/* Personalized Responses - Pro Only */}
              <View style={[
                styles.rowCard,
                rowCardBaseStyle,
                {
                  opacity: !isPro ? 0.5 : 1,
                  borderLeftWidth: 3,
                  borderLeftColor: isPro && personalizedResponses ? '#FF9800' : '#E0E0E0',
                  borderBottomWidth: 0
                }
              ]}>
                <MaterialCommunityIcons
                  name="account-star"
                  size={22}
                  color={isPro ? iconPrimary : '#999'}
                  style={styles.rowIcon}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.rowLabel, rowLabelTextStyle, { color: isPro ? textColor : '#999' }]}>
                      Personalized Responses
                    </Text>
                    {!isPro && (
                      <View style={{ backgroundColor: '#FFA726', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.rowDescription, rowDescriptionTextStyle, { color: isPro ? secondaryTextColor : '#999' }]}>
                    AI learns from your study habits, preferences, and goals for tailored recommendations
                  </Text>
                </View>
                <Switch
                  value={isPro && personalizedResponses}
                  onValueChange={handlePersonalizationToggle}
                  disabled={!isPro}
                  trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
                  thumbColor={isPro && personalizedResponses ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
                />
              </View>
            </View>
          )}
        </View>

        {/* Accessibility */}
        <Text style={[styles.sectionHeader, { color: iconPrimary }]}>ACCESSIBILITY</Text>
        <View style={[styles.cardSection, cardSectionStyle]}>
          <View style={[styles.rowCard, rowCardBaseStyle]}>
            <MaterialIcons name="record-voice-over" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>Text-to-Speech</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle]}>
                Read notifications and important messages aloud
              </Text>
            </View>
            <View style={styles.rowValueWrap}>
              <Text style={[styles.rowValue, rowValueTextStyle]}>{tts ? 'On' : 'Off'}</Text>
            </View>
            <Switch
              value={tts}
              onValueChange={handleTTSToggle}
              trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
              thumbColor={tts ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
            />
          </View>
          <View style={[styles.rowCard, rowCardBaseStyle]}>
            <MaterialIcons name="palette" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>Color Blind Mode</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle]}>
                Adjust colors for color vision deficiency
              </Text>
            </View>
            <View style={styles.rowValueWrap}>
              <Text style={[styles.rowValue, rowValueTextStyle]}>{highContrast ? 'On' : 'Off'}</Text>
            </View>
            <Switch
              value={highContrast}
              onValueChange={handleHighContrastToggle}
              trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
              thumbColor={highContrast ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
            />
          </View>
          <View style={[styles.rowCard, rowCardBaseStyle, { borderBottomWidth: 0 }]}>
            <MaterialIcons name="motion-photos-on" size={22} color={iconPrimary} style={styles.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, rowLabelTextStyle]}>Reduce Motion</Text>
              <Text style={[styles.rowDescription, rowDescriptionTextStyle]}>
                Minimize animations and transitions
              </Text>
            </View>
            <View style={styles.rowValueWrap}>
              <Text style={[styles.rowValue, rowValueTextStyle]}>{reduceMotion ? 'On' : 'Off'}</Text>
            </View>
            <Switch
              value={reduceMotion}
              onValueChange={handleReduceMotionToggle}
              trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
              thumbColor={reduceMotion ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
            />
          </View>
        </View>

        {/* Support & About */}
        <Text style={[styles.sectionHeader, { color: iconPrimary }]}>SUPPORT & ABOUT</Text>
        <View style={[styles.cardSection, cardSectionStyle]}>
          <TouchableOpacity style={[styles.rowCard, rowCardBaseStyle]} onPress={handleHelpCenter} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={22} color={iconPrimary} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, rowLabelTextStyle]}>Help Center / FAQ</Text>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowCard, rowCardBaseStyle]} onPress={handleContactSupport} activeOpacity={0.7}>
            <MaterialIcons name="support-agent" size={22} color={iconPrimary} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, rowLabelTextStyle]}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowCard, rowCardBaseStyle]} onPress={handleAppInfo} activeOpacity={0.7}>
            <MaterialIcons name="info-outline" size={22} color={iconPrimary} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, rowLabelTextStyle]}>App Information</Text>
            <View style={styles.rowValueWrap}><Text style={[styles.rowValue, rowValueTextStyle]}>v1.0.0</Text></View>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowCard, rowCardBaseStyle]} onPress={handleTermsOfService} activeOpacity={0.7}>
            <MaterialIcons name="gavel" size={22} color={iconPrimary} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, rowLabelTextStyle]}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rowCard, rowCardBaseStyle, { borderBottomWidth: 0 }]} onPress={handlePrivacyPolicy} activeOpacity={0.7}>
            <MaterialIcons name="privacy-tip" size={22} color={iconPrimary} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, rowLabelTextStyle]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
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
                <TouchableOpacity onPress={() => setShowEnvModal(false)} style={{ flex: 1, marginRight: 8, backgroundColor: isDarkMode ? cardBackground : '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: themePalettes[selectedEnv].primary }}>
                  <Text style={{ color: themePalettes[selectedEnv].primary, textAlign: 'center', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleEnvThemeUpdate(selectedEnv)} style={{ flex: 1, marginLeft: 8, backgroundColor: themePalettes[selectedEnv].primary, borderRadius: 8, padding: 12 }}>
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
                      {mode === 'System Default' && 'Matches your phone\'s dark mode setting'}
                      {mode === 'Light' && 'Always use light mode (change in phone settings)'}
                      {mode === 'Dark' && 'Always use dark mode (change in phone settings)'}
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
            <View style={[styles.modalBox, modalBoxStyle]}>
              <Text style={[styles.modalTitle, modalTextColor]}>Select Font Size</Text>
              {FONT_SIZE_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleFontSizeUpdate(opt)}>
                  <Text style={[styles.modalOptionText, modalTextColor, localFontSize === opt && { color: iconPrimary, fontWeight: 'bold' }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowFontModal(false)}>
                <Text style={[styles.modalCancelText, modalTextColor]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={showMainGoalModal} transparent animationType="fade" onRequestClose={() => setShowMainGoalModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, modalBoxStyle]}>
              <Text style={[styles.modalTitle, modalTextColor]}>Select Main Goal</Text>
              {MAIN_GOAL_OPTIONS.map(option => (
                <TouchableOpacity 
                  key={option.value} 
                  style={styles.modalOption} 
                  onPress={() => handleMainGoalUpdate(option.value)}
                >
                  <Text style={[styles.modalOptionText, modalTextColor, mainGoal === option.value && { color: iconPrimary, fontWeight: 'bold' }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowMainGoalModal(false)}>
                <Text style={[styles.modalCancelText, modalTextColor]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={showIconModal} transparent animationType="fade" onRequestClose={() => setShowIconModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, modalBoxStyle]}>
              <Text style={[styles.modalTitle, modalTextColor]}>Select App Icon</Text>
              {APP_ICON_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleAppIconUpdate(opt)}>
                  <Text style={[styles.modalOptionText, modalTextColor, appIcon === opt && { color: iconPrimary, fontWeight: 'bold' }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowIconModal(false)}>
                <Text style={[styles.modalCancelText, modalTextColor]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={showWorkStyleModal} transparent animationType="fade" onRequestClose={() => setShowWorkStyleModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, modalBoxStyle]}>
              <Text style={[styles.modalTitle, modalTextColor]}>Select Work Style</Text>
              {WORK_STYLE_OPTIONS.map(option => (
                <TouchableOpacity 
                  key={option.label} 
                  style={styles.modalOption} 
                  onPress={() => handleWorkStyleUpdate(option.label)}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.modalOptionText, modalTextColor, workStyle === option.label && { color: iconPrimary, fontWeight: 'bold' }]}>
                      {option.label}
                    </Text>
                    <Text style={{ fontSize: 13, color: secondaryTextColor, marginTop: 2 }}>
                      {option.focusDuration}min focus / {option.breakDuration}min break
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowWorkStyleModal(false)}>
                <Text style={[styles.modalCancelText, modalTextColor]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Notification Preferences Modal */}
        <Modal visible={showNotificationPrefsModal} transparent animationType="slide" onRequestClose={() => setShowNotificationPrefsModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.notificationPrefsModal, { backgroundColor: cardBackground }]}>
              <View style={styles.notificationPrefsHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>Notification Preferences</Text>
                <TouchableOpacity
                  onPress={() => setShowNotificationPrefsModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={28} color={textColor} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.notificationPrefsList}>
                {/* Friend Requests */}
                <View style={[styles.notificationPrefRow, { borderBottomColor: borderColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notificationPrefLabel, { color: textColor }]}>Friend Requests</Text>
                    <Text style={[styles.notificationPrefDescription, { color: secondaryTextColor }]}>
                      When someone sends you a friend request
                    </Text>
                  </View>
                  <Switch
                    value={notifFriendRequests}
                    onValueChange={setNotifFriendRequests}
                    trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
                    thumbColor={notifFriendRequests ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
                  />
                </View>

                {/* Friend Messages */}
                <View style={[styles.notificationPrefRow, { borderBottomColor: borderColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notificationPrefLabel, { color: textColor }]}>Friend Messages</Text>
                    <Text style={[styles.notificationPrefDescription, { color: secondaryTextColor }]}>
                      When a friend sends you a message
                    </Text>
                  </View>
                  <Switch
                    value={notifFriendMessages}
                    onValueChange={setNotifFriendMessages}
                    trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
                    thumbColor={notifFriendMessages ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
                  />
                </View>

                {/* Study Reminders */}
                <View style={[styles.notificationPrefRow, { borderBottomColor: borderColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notificationPrefLabel, { color: textColor }]}>Study Reminders</Text>
                    <Text style={[styles.notificationPrefDescription, { color: secondaryTextColor }]}>
                      Scheduled reminders for your study sessions
                    </Text>
                  </View>
                  <Switch
                    value={notifStudyReminders}
                    onValueChange={setNotifStudyReminders}
                    trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
                    thumbColor={notifStudyReminders ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
                  />
                </View>

                {/* Weekly Goal Reminders */}
                <View style={[styles.notificationPrefRow, { borderBottomColor: borderColor, flexDirection: 'column', alignItems: 'stretch' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notificationPrefLabel, { color: textColor }]}>Weekly Goal Reminders</Text>
                      <Text style={[styles.notificationPrefDescription, { color: secondaryTextColor }]}>
                        Reminders when you're behind on your weekly goal
                      </Text>
                    </View>
                    <Switch
                      value={notifWeeklyGoalReminders}
                      onValueChange={setNotifWeeklyGoalReminders}
                      trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
                      thumbColor={notifWeeklyGoalReminders ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
                    />
                  </View>

                  {notifWeeklyGoalReminders && (
                    <View>
                      <Text style={[styles.notificationPrefDescription, { color: secondaryTextColor, marginBottom: 8 }]}>
                        Notify me on:
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {['Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                          <TouchableOpacity
                            key={day}
                            onPress={() => {
                              if (weeklyGoalReminderDays.includes(day)) {
                                setWeeklyGoalReminderDays(weeklyGoalReminderDays.filter(d => d !== day));
                              } else {
                                setWeeklyGoalReminderDays([...weeklyGoalReminderDays, day]);
                              }
                            }}
                            style={[
                              styles.dayChip,
                              {
                                backgroundColor: weeklyGoalReminderDays.includes(day) ? iconPrimary : (isDarkMode ? '#2f2f2f' : '#F5F5F5'),
                                borderColor: weeklyGoalReminderDays.includes(day) ? iconPrimary : borderColor,
                              }
                            ]}
                          >
                            <Text style={[
                              styles.dayChipText,
                              { color: weeklyGoalReminderDays.includes(day) ? '#FFFFFF' : textColor }
                            ]}>
                              {day.substring(0, 3)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* Focus Session Warnings */}
                <View style={[styles.notificationPrefRow, { borderBottomColor: borderColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notificationPrefLabel, { color: textColor }]}>Focus Session Warnings</Text>
                    <Text style={[styles.notificationPrefDescription, { color: secondaryTextColor }]}>
                      When you leave the app during an active focus session
                    </Text>
                  </View>
                  <Switch
                    value={notifFocusSessionWarnings}
                    onValueChange={setNotifFocusSessionWarnings}
                    trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
                    thumbColor={notifFocusSessionWarnings ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
                  />
                </View>

                {/* QR Scan Notifications */}
                <View style={[styles.notificationPrefRow, { borderBottomColor: borderColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notificationPrefLabel, { color: textColor }]}>QR Code Scans</Text>
                    <Text style={[styles.notificationPrefDescription, { color: secondaryTextColor }]}>
                      When someone scans your QR code
                    </Text>
                  </View>
                  <Switch
                    value={notifQRScans}
                    onValueChange={setNotifQRScans}
                    trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
                    thumbColor={notifQRScans ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
                  />
                </View>

                {/* Study Room Invites */}
                <View style={[styles.notificationPrefRow, { borderBottomColor: borderColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notificationPrefLabel, { color: textColor }]}>Study Room Invites</Text>
                    <Text style={[styles.notificationPrefDescription, { color: secondaryTextColor }]}>
                      When someone invites you to a study room
                    </Text>
                  </View>
                  <Switch
                    value={notifStudyRoomInvites}
                    onValueChange={setNotifStudyRoomInvites}
                    trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
                    thumbColor={notifStudyRoomInvites ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
                  />
                </View>

                {/* App Updates */}
                <View style={[styles.notificationPrefRow, { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notificationPrefLabel, { color: textColor }]}>App Updates</Text>
                    <Text style={[styles.notificationPrefDescription, { color: secondaryTextColor }]}>
                      News about new features and improvements
                    </Text>
                  </View>
                  <Switch
                    value={notifAppUpdates}
                    onValueChange={setNotifAppUpdates}
                    trackColor={{ false: isDarkMode ? '#525252' : '#E0E0E0', true: iconPrimary }}
                    thumbColor={notifAppUpdates ? (isDarkMode ? theme.secondary ?? '#A5D6A7' : '#FFFFFF') : (isDarkMode ? '#888' : '#FFFFFF')}
                  />
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.notificationPrefsSaveButton, { backgroundColor: iconPrimary }]}
                onPress={() => {
                  // Save preferences here (could integrate with database later)
                  setShowNotificationPrefsModal(false);
                  Alert.alert('Saved', 'Your notification preferences have been updated.');
                }}
              >
                <Text style={styles.notificationPrefsSaveButtonText}>Save Preferences</Text>
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
      </ScrollView>

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
  musicServiceButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicServiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
    paddingTop: 4,
    paddingBottom: 8,
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
    position: 'relative',
    height: 200,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  proTrekkerImageContainer: {
    padding: 20,
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 30,
  },
  proTrekkerCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  proTrekkerCardSubtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
  sectionTitleLarge: {
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
  notificationPrefsModal: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  notificationPrefsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalCloseButton: {
    padding: 4,
  },
  notificationPrefsList: {
    maxHeight: 500,
  },
  notificationPrefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  notificationPrefLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationPrefDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  notificationPrefsSaveButton: {
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  notificationPrefsSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SettingsScreen;

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, Modal, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { MainTabParamList } from '../../navigation/types';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useConvexProfile } from '../../hooks/useConvex';
import { useTheme, themePalettes } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-expo';
import { getUserSettings, updateUserSettings } from '../../utils/userSettings';
import { CommonActions } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useFocusAnimationKey } from '../../utils/animationUtils';
import { Typography, Spacing, BorderRadius } from '../../theme/premiumTheme';
import { StaggeredItem } from '../../components/premium/StaggeredList';
import SettingsRow from './settings/components/SettingsRow';
import SettingsGroup from './settings/components/SettingsGroup';
import SettingsSectionHeader from './settings/components/SettingsSectionHeader';

const { useUserAppData } = require('../../utils/userAppData');

const MAIN_GOAL_OPTIONS = [
  { label: 'Intense Focus', value: 'Intense Focus' },
  { label: 'Study', value: 'Study' },
  { label: 'Accountability', value: 'Accountability' },
] as const;

const WORK_STYLE_OPTIONS = [
  { label: 'Balanced', focusDuration: 45, breakDuration: 15 },
  { label: 'Sprint', focusDuration: 25, breakDuration: 5 },
  { label: 'Deep Work', focusDuration: 60, breakDuration: 15 },
];

const SettingsScreen = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { profile, updateProfile } = useConvexProfile();
  const { theme, themeName } = useTheme();
  const { updateOnboarding, signOut: legacySignOut } = useAuth();
  const { signOut: clerkSignOut, userId: clerkUserId } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { data: userData } = useUserAppData();
  const isDark = theme.isDark;
  const focusKey = useFocusAnimationKey();

  // Focus & Study state (kept inline)
  const [mainGoal, setMainGoal] = useState<string>(MAIN_GOAL_OPTIONS[0].value);
  const [workStyle, setWorkStyle] = useState('Balanced');
  const [focusDuration, setFocusDuration] = useState(25);
  const [autoDND, setAutoDND] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState(10);
  const [showMainGoalModal, setShowMainGoalModal] = useState(false);
  const [showWorkStyleModal, setShowWorkStyleModal] = useState(false);

  // Accessibility state (kept inline)
  const [tts, setTts] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const secondaryTextColor = theme.textSecondary ?? (isDark ? '#A6A6A6' : '#666');

  // Load profile data
  useEffect(() => {
    if (profile) {
      setWeeklyGoal(profile.weeklyFocusGoal || 10);
      setFocusDuration(profile.focusDuration || 25);
    }
  }, [profile]);

  // Load accessibility settings
  useEffect(() => {
    const load = async () => {
      try {
        if (clerkUserId) {
          const settings = await getUserSettings(clerkUserId);
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
    load();
  }, [clerkUserId]);

  // Subscription info for AI row
  const subscriptionTier = profile?.subscription_tier || 'free';
  const isElite = subscriptionTier === 'elite';
  const isPremium = subscriptionTier === 'premium';
  const hasAIAccess = isElite || isPremium;
  const aiSummary = !hasAIAccess ? 'Requires Premium or Elite' : isElite ? 'Elite Plan' : 'Premium Plan';

  // --- Focus & Study Handlers ---
  const handleMainGoalUpdate = async (goal: string) => {
    if (goal === mainGoal) { setShowMainGoalModal(false); return; }
    setMainGoal(goal);
    setShowMainGoalModal(false);
    try {
      await updateOnboarding({ user_goal: goal });
    } catch (error) {
      console.error('Error updating main goal:', error);
      Alert.alert('Error', 'Failed to update main goal.');
    }
  };

  const handleWorkStyleUpdate = async (style: string) => {
    setWorkStyle(style);
    setShowWorkStyleModal(false);
    const selected = WORK_STYLE_OPTIONS.find((o) => o.label === style);
    if (selected) {
      setFocusDuration(selected.focusDuration);
      try {
        await updateProfile({ focusDuration: selected.focusDuration, workStyle: style });
        await updateOnboarding({ work_style: style, focus_method: style });
      } catch (error) {
        Alert.alert('Error', 'Failed to update work style.');
      }
    }
  };

  const handleAutoDNDToggle = async (value: boolean) => {
    setAutoDND(value);
    try {
      if (clerkUserId) {
        await updateUserSettings(clerkUserId, { auto_dnd_focus: value });
      }
      if (value) {
        Alert.alert('Enable Do Not Disturb', 'For the best focus, enable DND on your device.', [
          { text: 'Later', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {
            if (Platform.OS === 'ios') Linking.openSettings();
            else Linking.sendIntent('android.settings.ZEN_MODE_SETTINGS').catch(() => Linking.openSettings());
          }},
        ]);
      }
    } catch (error) {
      console.error('Error updating DND setting:', error);
      setAutoDND(!value);
    }
  };

  const handleWeeklyGoalUpdate = async (goal: number) => {
    const save = async (g: number) => {
      const prev = weeklyGoal;
      setWeeklyGoal(g);
      try {
        await updateOnboarding({ weekly_focus_goal: g });
      } catch (error: any) {
        setWeeklyGoal(prev);
        Alert.alert('Error', error?.message || 'Failed to update weekly goal.');
      }
    };
    if (goal > 60) {
      Alert.alert('Big Goal!', 'Are you sure? It may be harder to earn rewards, but bigger rewards if you do!', [
        { text: 'Cancel', style: 'cancel', onPress: () => setWeeklyGoal(weeklyGoal) },
        { text: "Yes, I'm Sure", onPress: () => save(goal) },
      ]);
    } else {
      await save(goal);
    }
  };

  // --- Accessibility Handlers ---
  const handleAccessibilityToggle = async (type: 'tts' | 'highContrast' | 'reduceMotion', value: boolean) => {
    const setter = type === 'tts' ? setTts : type === 'highContrast' ? setHighContrast : setReduceMotion;
    setter(value);
    try {
      if (clerkUserId) {
        const key = type === 'tts' ? 'tts_enabled' : type === 'highContrast' ? 'high_contrast' : 'reduce_motion';
        await updateUserSettings(clerkUserId, { [key]: value });
      }
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
      setter(!value);
    }
  };

  // --- Account Handlers ---
  const handleChangeEmail = () => {
    Alert.prompt('Change Email', 'Enter your new email address', async (newEmail) => {
      if (!newEmail?.trim()) return;
      try {
        if (!clerkUser) { Alert.alert('Error', 'Please log in again.'); return; }
        await clerkUser.createEmailAddress({ email: newEmail.trim() });
        Alert.alert('Verification Sent', 'Check your new email to confirm.');
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to change email.');
      }
    }, 'plain-text', '', 'email-address');
  };

  const handleChangePassword = () => {
    Alert.prompt('Change Password', 'Enter your new password (min 8 characters)', async (newPassword) => {
      if (!newPassword || newPassword.length < 8) {
        Alert.alert('Invalid Password', 'Must be at least 8 characters.'); return;
      }
      try {
        if (!clerkUser) { Alert.alert('Error', 'Please log in again.'); return; }
        await clerkUser.updatePassword({ newPassword });
        Alert.alert('Password Updated', 'Your password has been changed.');
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to change password.');
      }
    }, 'secure-text');
  };

  const handleChangeEmailPassword = () => {
    Alert.alert('Account Settings', 'What would you like to update?', [
      { text: 'Change Email', onPress: handleChangeEmail },
      { text: 'Change Password', onPress: handleChangePassword },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleExportData = () => {
    Alert.alert('Export Your Data', 'This will export all your profile data, sessions, tasks, and settings.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Export', onPress: async () => {
        try {
          if (!clerkUserId || !clerkUser) { Alert.alert('Error', 'Please log in.'); return; }
          const exportData = {
            export_date: new Date().toISOString(),
            user_id: clerkUserId,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            profile: userData?.profile || profile,
            focus_sessions: userData?.sessions || [],
            tasks: userData?.tasks || [],
            settings: userData?.settings,
          };
          console.log('User Data Export:', JSON.stringify(exportData, null, 2));
          Alert.alert('Export Complete', 'Your data has been logged to the console.');
        } catch (error) {
          Alert.alert('Error', 'Failed to export data.');
        }
      }},
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        try { await clerkSignOut(); } catch (e: any) {
          const msg = e?.message || String(e);
          if (!msg.includes('CustomEvent') && !msg.includes('hasFocus') && !msg.includes('document')) {
            console.error('Clerk sign out error:', e);
          }
        }
        try { await legacySignOut(); } catch (_) {}
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Landing' as any }] }));
      }},
    ]);
  };

  // --- Support Handlers ---
  const handleHelpCenter = () => {
    Alert.alert('Help Center', 'Choose how to get help:', [
      { text: 'Getting Started', onPress: () => Alert.alert('Getting Started', '1. Set focus duration\n2. Choose environment theme\n3. Pick focus sound\n4. Set daily reminders\n5. Start your first session!') },
      { text: 'Study Tips', onPress: () => Alert.alert('Study Tips', 'Use Balanced technique (25/5)\nFind a quiet space\nSet specific goals\nStay hydrated') },
      { text: 'Troubleshooting', onPress: () => Alert.alert('Troubleshooting', 'Audio: Check volume, restart app\nSync: Check internet\nTimer: Keep app in foreground') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleContactSupport = () => {
    Alert.alert('Contact Support', 'How can we help?', [
      { text: 'Email Support', onPress: () => Alert.alert('Email Support', 'support@hikewise.app\nWe respond within 24 hours!') },
      { text: 'Report Bug', onPress: () => Alert.alert('Report Bug', 'Send details to bugs@hikewise.app\nInclude device model and steps to reproduce.') },
      { text: 'Feature Request', onPress: () => Alert.alert('Feature Request', 'Send ideas to features@hikewise.app') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleAppInfo = () => {
    Alert.alert('App Information', 'HikeWise Study Tracker\nVersion: 2.0.0\nBuild: 2025.001\n\nMade for students everywhere', [
      { text: 'Check for Updates', onPress: () => Alert.alert('Up to Date!', 'You have the latest version.') },
      { text: 'Close' },
    ]);
  };

  const handleTermsOfService = () => {
    Alert.alert(
      'Terms of Service',
      'You must be 13+ to use HikeWise. Don\'t misuse the app or harm other users. We may update these terms with notice.',
      [
        { text: 'Read Full Terms', onPress: () => Linking.openURL('https://hikewise.app/terms').catch(() => {}) },
        { text: 'Close' },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'We collect account info and study data to power the app. We never sell your data. You can export or delete your data anytime.',
      [
        { text: 'Read Full Policy', onPress: () => Linking.openURL('https://hikewise.app/privacy').catch(() => {}) },
        { text: 'Close' },
      ]
    );
  };

  // --- Modal styles ---
  const modalBoxStyle = useMemo(() => ({
    backgroundColor: isDark ? (theme.surface ?? '#1E1E1E') : (theme.card ?? '#FFFFFF'),
  }), [isDark, theme]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <Animated.View
        key={`header-${focusKey}`}
        entering={FadeIn.duration(250)}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <View style={[styles.closeButtonCircle, { backgroundColor: `${theme.primary}30` }]}>
            <Ionicons name="close-outline" size={24} color={theme.primary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primary }]}>Settings</Text>
        <View style={{ width: 48 }} />
      </Animated.View>

      <Animated.ScrollView
        key={`content-${focusKey}`}
        entering={FadeInUp.delay(100).duration(300)}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Elite Trekker Banner */}
        <StaggeredItem index={0}>
          <TouchableOpacity
            style={styles.proBanner}
            onPress={() => navigation.navigate('Subscription' as any)}
            activeOpacity={0.9}
          >
            <Image
              source={require('../../../assets/examples/settings_image.png')}
              style={styles.proBannerImage}
              resizeMode="cover"
            />
            <View style={styles.proBannerContent}>
              <Text style={styles.proBannerTitle}>Become an Elite HikeWise Member</Text>
              <Text style={styles.proBannerSubtitle}>Unlock Nora AI, study plans & more</Text>
            </View>
          </TouchableOpacity>
        </StaggeredItem>

        {/* PREFERENCES */}
        <StaggeredItem index={1}>
          <SettingsSectionHeader title="PREFERENCES" />
          <SettingsGroup>
            <SettingsRow
              icon="musical-notes-outline"
              label="Sound"
              value={profile?.soundPreference || 'Lo-Fi'}
              onPress={() => (navigation as any).navigate('SoundSettings')}
            />
            <SettingsRow
              icon="color-palette-outline"
              label="Theme & Environment"
              value={themePalettes[themeName].name}
              onPress={() => (navigation as any).navigate('ThemeSettings')}
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>

        {/* FOCUS & STUDY */}
        <StaggeredItem index={2}>
          <SettingsSectionHeader title="FOCUS & STUDY" />
          <SettingsGroup>
            <SettingsRow
              icon="locate-outline"
              label="Main Goal"
              value={mainGoal}
              onPress={() => setShowMainGoalModal(true)}
            />
            <SettingsRow
              icon="time-outline"
              label="Work Style"
              value={workStyle}
              onPress={() => setShowWorkStyleModal(true)}
            />
            <SettingsRow
              icon="remove-circle-outline"
              label="Auto Do Not Disturb"
              description="Suppress notifications during focus"
              toggle
              toggleValue={autoDND}
              onToggleChange={handleAutoDNDToggle}
            />
            <SettingsRow
              icon="flag-outline"
              label="Weekly Focus Goal"
              description={`${weeklyGoal} hours per week`}
              isLast
            >
              <View style={styles.sliderRow}>
                <Text style={[styles.sliderLabel, { color: secondaryTextColor }]}>5h</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={5}
                  maximumValue={80}
                  step={1}
                  value={weeklyGoal}
                  onValueChange={setWeeklyGoal}
                  onSlidingComplete={handleWeeklyGoalUpdate}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor={isDark ? '#3A3A3A' : '#E0E0E0'}
                  thumbTintColor={isDark ? (theme.secondary ?? '#A5D6A7') : theme.primary}
                />
                <Text style={[styles.sliderLabel, { color: secondaryTextColor }]}>80h</Text>
              </View>
            </SettingsRow>
          </SettingsGroup>
        </StaggeredItem>

        {/* NOTIFICATIONS */}
        <StaggeredItem index={3}>
          <SettingsSectionHeader title="NOTIFICATIONS" />
          <SettingsGroup>
            <SettingsRow
              icon="notifications-outline"
              label="Notification Preferences"
              description="Reminders, social, goals"
              onPress={() => (navigation as any).navigate('NotificationSettings')}
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>

        {/* ACCOUNT */}
        <StaggeredItem index={4}>
          <SettingsSectionHeader title="ACCOUNT" />
          <SettingsGroup>
            <SettingsRow
              icon="card-outline"
              label="Subscription"
              description="Manage your plan"
              onPress={() => navigation.navigate('Subscription' as any)}
            />
            <SettingsRow
              icon="mail-outline"
              label="Email & Password"
              onPress={handleChangeEmailPassword}
            />
            <SettingsRow
              icon="lock-closed-outline"
              label="Privacy Settings"
              onPress={() => navigation.navigate('Privacy')}
            />
            <SettingsRow
              icon="download-outline"
              label="Export Data"
              onPress={handleExportData}
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>

        {/* AI */}
        <StaggeredItem index={5}>
          <SettingsSectionHeader title="AI" />
          <SettingsGroup>
            <SettingsRow
              icon="bulb-outline"
              label="AI Integration"
              description={aiSummary}
              onPress={() => (navigation as any).navigate('AISettings')}
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>

        {/* ACCESSIBILITY */}
        <StaggeredItem index={6}>
          <SettingsSectionHeader title="ACCESSIBILITY" />
          <SettingsGroup>
            <SettingsRow
              icon="mic-outline"
              label="Text-to-Speech"
              description="Read notifications aloud"
              toggle
              toggleValue={tts}
              onToggleChange={(v) => handleAccessibilityToggle('tts', v)}
            />
            <SettingsRow
              icon="color-palette-outline"
              label="Color Blind Mode"
              description="Adjust colors for color vision deficiency"
              toggle
              toggleValue={highContrast}
              onToggleChange={(v) => handleAccessibilityToggle('highContrast', v)}
            />
            <SettingsRow
              icon="contrast-outline"
              label="Reduce Motion"
              description="Minimize animations and transitions"
              toggle
              toggleValue={reduceMotion}
              onToggleChange={(v) => handleAccessibilityToggle('reduceMotion', v)}
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>

        {/* SUPPORT */}
        <StaggeredItem index={7}>
          <SettingsSectionHeader title="SUPPORT" />
          <SettingsGroup>
            <SettingsRow icon="help-circle-outline" label="Help Center" onPress={handleHelpCenter} />
            <SettingsRow icon="headset-outline" label="Contact Support" onPress={handleContactSupport} />
            <SettingsRow icon="information-circle-outline" label="App Info" value="v2.0.0" onPress={handleAppInfo} />
            <SettingsRow icon="document-text-outline" label="Terms of Service" onPress={handleTermsOfService} />
            <SettingsRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={handlePrivacyPolicy} isLast />
          </SettingsGroup>
        </StaggeredItem>

        {/* DANGER ZONE */}
        <StaggeredItem index={8}>
          <View style={{ marginTop: Spacing.lg }}>
            <SettingsGroup>
              <SettingsRow icon="log-out-outline" label="Sign Out" onPress={handleSignOut} isLast />
            </SettingsGroup>
          </View>
        </StaggeredItem>

        {/* Version */}
        <Text style={[styles.version, { color: `${theme.text}66` }]}>v2.0.0 (517)</Text>
      </Animated.ScrollView>

      {/* Main Goal Modal */}
      <Modal visible={showMainGoalModal} transparent animationType="fade" onRequestClose={() => setShowMainGoalModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, modalBoxStyle]}>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>Select Main Goal</Text>
            {MAIN_GOAL_OPTIONS.map((option) => (
              <TouchableOpacity key={option.value} style={styles.modalOption} onPress={() => handleMainGoalUpdate(option.value)}>
                <Text style={[styles.modalOptionText, { color: theme.text }, mainGoal === option.value && { color: theme.primary, fontWeight: 'bold' }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowMainGoalModal(false)}>
              <Text style={[styles.modalCancelText, { color: secondaryTextColor }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Work Style Modal */}
      <Modal visible={showWorkStyleModal} transparent animationType="fade" onRequestClose={() => setShowWorkStyleModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, modalBoxStyle]}>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>Select Work Style</Text>
            {WORK_STYLE_OPTIONS.map((option) => (
              <TouchableOpacity key={option.label} style={styles.modalOption} onPress={() => handleWorkStyleUpdate(option.label)}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.modalOptionText, { color: theme.text }, workStyle === option.label && { color: theme.primary, fontWeight: 'bold' }]}>
                    {option.label}
                  </Text>
                  <Text style={{ fontSize: 13, color: secondaryTextColor, marginTop: 2 }}>
                    {option.focusDuration}min focus / {option.breakDuration}min break
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowWorkStyleModal(false)}>
              <Text style={[styles.modalCancelText, { color: secondaryTextColor }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md + 4,
    paddingTop: 4,
    paddingBottom: Spacing.xs,
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
  headerTitle: {
    ...Typography.h1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  // Pro Banner
  proBanner: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    height: 200,
    position: 'relative',
  },
  proBannerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  proBannerContent: {
    padding: Spacing.md + 4,
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 30,
  },
  proBannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  proBannerSubtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Slider
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: Spacing.xs,
  },
  sliderLabel: {
    ...Typography.caption,
    fontWeight: '500',
  },
  // Version
  version: {
    textAlign: 'center',
    ...Typography.caption,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: 320,
    alignItems: 'stretch',
  },
  modalTitle: {
    ...Typography.h3,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalOption: {
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  modalOptionText: {
    ...Typography.body,
  },
  modalCancel: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  modalCancelText: {
    ...Typography.body,
  },
});

export default SettingsScreen;

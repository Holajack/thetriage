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
import { themePalettes, ThemeName } from '../../context/ThemeContext';

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

const SettingsScreen = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { profile, updateProfile } = useSupabaseProfile();
  const { theme, themeName, setThemeName } = useTheme();
  
  // Appearance
  const [appearanceTheme, setAppearanceTheme] = useState('System Default');
  const [fontSize, setFontSize] = useState('Medium');
  const [appIcon, setAppIcon] = useState('Default');
  // Notifications
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState('08:00');
  const [sessionEndReminder, setSessionEndReminder] = useState(true);
  // Focus & Study
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [autoStartNext, setAutoStartNext] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState(10);
  // Sound & Environment
  const [sound, setSound] = useState(true);
  const [autoPlaySound, setAutoPlaySound] = useState(false);
  const [selectedSound, setSelectedSound] = useState('Lo-Fi');
  const [ambientNoise, setAmbientNoise] = useState(0.5);
  // Accessibility
  const [tts, setTts] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  // Modals
  const [showFontModal, setShowFontModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<ThemeName>(themeName);

  // Load profile data when available
  useEffect(() => {
    if (profile) {
      setWeeklyGoal(profile.weeklyFocusGoal || 10);
      setSelectedSound(profile.soundPreference || 'Lo-Fi');
      setFocusDuration(profile.focusDuration || 25);
      setBreakDuration(profile.breakDuration || 5);
    }
  }, [profile]);

  // Handle weekly goal update
  const handleWeeklyGoalUpdate = async (goal: number) => {
    setWeeklyGoal(goal);
    setShowGoalModal(false);
    
    try {
      await updateProfile({ weeklyFocusGoal: goal });
      Alert.alert('Success', 'Your weekly focus goal has been updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update weekly focus goal. Please try again.');
    }
  };

  // Placeholder actions
  const placeholder = (msg: string) => Alert.alert(msg, 'Coming soon!');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Drawer Toggle Button */}
      <View style={styles.drawerHeader}>
        <View style={{ width: 28 }} />
        <Text style={styles.drawerHeaderTitle}>Settings</Text>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.drawerMenuBtn}
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu" size={28} color={theme.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}>
        {/* Appearance */}
        <Text style={styles.sectionHeader}>APPEARANCE</Text>
        <View style={styles.cardSection}>
          <TouchableOpacity style={styles.rowCard} onPress={() => setShowThemeModal(true)} activeOpacity={0.7}>
            <Ionicons name="color-palette-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Theme</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{appearanceTheme}</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => setShowFontModal(true)} activeOpacity={0.7}>
            <MaterialIcons name="format-size" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Font Size</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{fontSize}</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => setShowIconModal(true)} activeOpacity={0.7}>
            <MaterialCommunityIcons name="apps" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>App Icon</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{appIcon}</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
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
          {/* Environment Options as Cards */}
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
                <Ionicons name="color-palette-outline" size={28} color={themePalettes[env].primary} style={{ marginBottom: 6 }} />
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
            <Text style={styles.rowLabel}>Push Notifications</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{notifications ? 'On' : 'Off'}</Text></View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={notifications ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
          <TouchableOpacity style={styles.rowCard} onPress={() => placeholder('Daily Study Reminder')} activeOpacity={0.7}>
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
              onValueChange={setSessionEndReminder}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={sessionEndReminder ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
        </View>

        {/* Focus & Study Preferences */}
        <Text style={styles.sectionHeader}>FOCUS & STUDY PREFERENCES</Text>
        <View style={styles.cardSection}>
          <TouchableOpacity style={styles.rowCard} onPress={() => setShowFocusModal(true)} activeOpacity={0.7}>
            <MaterialCommunityIcons name="clock-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Default Focus Duration</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{focusDuration} min</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => setShowBreakModal(true)} activeOpacity={0.7}>
            <MaterialIcons name="free-breakfast" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Break Duration</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{breakDuration} min</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <View style={styles.rowCard}>
            <MaterialIcons name="autorenew" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Auto-Start Next Session</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{autoStartNext ? 'On' : 'Off'}</Text></View>
            <Switch
              value={autoStartNext}
              onValueChange={setAutoStartNext}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={autoStartNext ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
          <TouchableOpacity style={styles.rowCard} onPress={() => setShowGoalModal(true)} activeOpacity={0.7}>
            <MaterialCommunityIcons name="target" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Weekly Focus Goal</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>{weeklyGoal} hrs</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
        </View>

        {/* Sound & Environment */}
        <Text style={styles.sectionHeader}>SOUND & ENVIRONMENT</Text>
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Focus Sound</Text>
          {SOUND_OPTIONS.map(option => (
            <TouchableOpacity
              key={option}
              style={styles.soundOption}
              onPress={() => setSelectedSound(option)}
              activeOpacity={0.7}
            >
              <View style={styles.radioCircle}>
                {selectedSound === option && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.soundLabel, selectedSound === option && styles.soundLabelSelected]}>{option}</Text>
              <TouchableOpacity onPress={() => placeholder('Preview ' + option)} style={{ marginLeft: 10 }}>
                <Ionicons name="play-circle-outline" size={22} color="#388E3C" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          <View style={styles.rowCard}>
            <MaterialIcons name="music-note" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Auto-Play Sound</Text>
            <Switch
              value={autoPlaySound}
              onValueChange={setAutoPlaySound}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={autoPlaySound ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
          <View style={styles.rowCard}>
            <MaterialIcons name="volume-up" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Ambient Noise Level</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, marginVertical: 8 }}>
                <View style={{ width: `${ambientNoise * 100}%`, height: 6, backgroundColor: '#4CAF50', borderRadius: 3 }} />
              </View>
            </View>
            <TouchableOpacity onPress={() => setAmbientNoise(Math.max(0, ambientNoise - 0.1))}><Entypo name="minus" size={20} color="#388E3C" /></TouchableOpacity>
            <TouchableOpacity onPress={() => setAmbientNoise(Math.min(1, ambientNoise + 0.1))}><Entypo name="plus" size={20} color="#388E3C" /></TouchableOpacity>
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

        {/* App Integrations */}
        <Text style={styles.sectionHeader}>APP INTEGRATIONS</Text>
        <View style={styles.cardSection}>
          <TouchableOpacity style={styles.rowCard} onPress={() => placeholder('Calendar Sync')} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Calendar Sync</Text>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => placeholder('Chrome Extension')} activeOpacity={0.7}>
            <MaterialCommunityIcons name="google-chrome" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Chrome Extension</Text>
            <View style={styles.rowValueWrap}><Text style={[styles.rowValue, { color: '#BDBDBD' }]}>Try Beta</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => placeholder('Third-Party Integrations')} activeOpacity={0.7}>
            <MaterialCommunityIcons name="puzzle-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Third-Party Integrations</Text>
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
              onValueChange={setTts}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={tts ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
          <View style={styles.rowCard}>
            <MaterialIcons name="contrast" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>High Contrast Mode</Text>
            <Switch
              value={highContrast}
              onValueChange={setHighContrast}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={highContrast ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
          <View style={styles.rowCard}>
            <MaterialIcons name="motion-photos-on" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Reduce Motion</Text>
            <Switch
              value={reduceMotion}
              onValueChange={setReduceMotion}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={reduceMotion ? '#1B5E20' : '#BDBDBD'}
            />
          </View>
        </View>

        {/* Support & About */}
        <Text style={styles.sectionHeader}>SUPPORT & ABOUT</Text>
        <View style={styles.cardSection}>
          <TouchableOpacity style={styles.rowCard} onPress={() => placeholder('Help Center')} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Help Center / FAQ</Text>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => placeholder('Contact Support')} activeOpacity={0.7}>
            <MaterialIcons name="support-agent" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <View style={styles.rowCard}>
            <MaterialIcons name="info-outline" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>App Version</Text>
            <View style={styles.rowValueWrap}><Text style={styles.rowValue}>v1.0.0</Text></View>
          </View>
          <TouchableOpacity style={styles.rowCard} onPress={() => placeholder('Terms of Service')} activeOpacity={0.7}>
            <MaterialIcons name="gavel" size={22} color="#388E3C" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => placeholder('Privacy Policy')} activeOpacity={0.7}>
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
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Select Theme</Text>
              {THEME_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => { setAppearanceTheme(opt); setShowThemeModal(false); }}>
                  <Text style={[styles.modalOptionText, appearanceTheme === opt && { color: '#388E3C', fontWeight: 'bold' }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowThemeModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={showFontModal} transparent animationType="fade" onRequestClose={() => setShowFontModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Select Font Size</Text>
              {FONT_SIZE_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => { setFontSize(opt); setShowFontModal(false); }}>
                  <Text style={[styles.modalOptionText, fontSize === opt && { color: '#388E3C', fontWeight: 'bold' }]}>{opt}</Text>
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
                <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => { setAppIcon(opt); setShowIconModal(false); }}>
                  <Text style={[styles.modalOptionText, appIcon === opt && { color: '#388E3C', fontWeight: 'bold' }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowIconModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={showFocusModal} transparent animationType="fade" onRequestClose={() => setShowFocusModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Select Focus Duration</Text>
              {FOCUS_DURATIONS.map(opt => (
                <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => { setFocusDuration(opt); setShowFocusModal(false); }}>
                  <Text style={[styles.modalOptionText, focusDuration === opt && { color: '#388E3C', fontWeight: 'bold' }]}>{opt} min</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowFocusModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={showBreakModal} transparent animationType="fade" onRequestClose={() => setShowBreakModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Select Break Duration</Text>
              {BREAK_DURATIONS.map(opt => (
                <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => { setBreakDuration(opt); setShowBreakModal(false); }}>
                  <Text style={[styles.modalOptionText, breakDuration === opt && { color: '#388E3C', fontWeight: 'bold' }]}>{opt} min</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowBreakModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={showGoalModal} transparent animationType="fade" onRequestClose={() => setShowGoalModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Set Weekly Focus Goal</Text>
              {[5, 10, 15, 20, 25, 30].map(opt => (
                <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleWeeklyGoalUpdate(opt)}>
                  <Text style={[styles.modalOptionText, weeklyGoal === opt && { color: '#388E3C', fontWeight: 'bold' }]}>{opt} hrs</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowGoalModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
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
});

export default SettingsScreen; 
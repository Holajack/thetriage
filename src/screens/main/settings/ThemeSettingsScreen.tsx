import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, themePalettes, ThemeName } from '../../../context/ThemeContext';
import { useConvexProfile } from '../../../hooks/useConvex';
import { Typography, Spacing, BorderRadius } from '../../../theme/premiumTheme';
import { StaggeredItem } from '../../../components/premium/StaggeredList';
import SettingsSectionHeader from './components/SettingsSectionHeader';
import SettingsGroup from './components/SettingsGroup';

const THEME_ICONS: Record<ThemeName, string> = {
  home: 'home-outline',
  office: 'business-outline',
  library: 'library-outline',
  coffee: 'cafe-outline',
  park: 'leaf-outline',
};

const ThemeSettingsScreen = () => {
  const navigation = useNavigation();
  const { theme, themeName, setThemeName } = useTheme();
  const isDark = theme.isDark;
  const { updateProfile } = useConvexProfile();

  const [selectedEnv, setSelectedEnv] = useState<ThemeName>(themeName);
  const [showEnvModal, setShowEnvModal] = useState(false);

  const handleEnvThemeUpdate = async (env: ThemeName) => {
    setThemeName(env);
    setShowEnvModal(false);
    try {
      await updateProfile({ environment_theme: env });
      Alert.alert('Environment Updated', `Your environment has been changed to ${themePalettes[env].name}`, [
        { text: 'OK' },
      ]);
    } catch (error) {
      console.error('Environment theme update error:', error);
      Alert.alert('Error', 'Failed to update environment theme. Please try again.');
      setThemeName(themeName);
    }
  };

  const cardBg = isDark ? (theme.surface ?? '#1E1E1E') : (theme.card ?? '#FFFFFF');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Theme & Environment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {/* Dark Mode Notice */}
        {isDark && (
          <StaggeredItem index={0}>
            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={22} color="#F57C00" />
              <Text style={styles.noticeText}>
                Environment colors are not fully visible in dark mode. Switch to light mode in your phone settings to see theme previews.
              </Text>
            </View>
          </StaggeredItem>
        )}

        {/* Current Theme */}
        <StaggeredItem index={isDark ? 1 : 0}>
          <SettingsSectionHeader title="CURRENT THEME" />
          <SettingsGroup>
            <View style={styles.currentTheme}>
              <Ionicons
                name={THEME_ICONS[themeName] as any}
                size={32}
                color={theme.primary}
              />
              <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
                <Text style={[styles.currentName, { color: theme.text }]}>
                  {themePalettes[themeName].name}
                </Text>
                <Text style={[styles.currentDesc, { color: theme.textSecondary ?? '#666' }]}>
                  Active environment
                </Text>
              </View>
              <View style={[styles.colorDot, { backgroundColor: theme.primary }]} />
            </View>
          </SettingsGroup>
        </StaggeredItem>

        {/* Environment Options */}
        <StaggeredItem index={isDark ? 2 : 1}>
          <SettingsSectionHeader title="CHOOSE ENVIRONMENT" />
          <View style={styles.grid}>
            {(['home', 'office', 'library', 'coffee', 'park'] as ThemeName[]).map((env) => {
              const palette = themePalettes[env];
              const isSelected = themeName === env;
              return (
                <TouchableOpacity
                  key={env}
                  style={[
                    styles.envCard,
                    {
                      backgroundColor: palette.background,
                      borderColor: isSelected ? palette.primary : (isDark ? '#3A3A3A' : '#E0E0E0'),
                      borderWidth: isSelected ? 2 : 1,
                      opacity: isDark ? 0.6 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (isDark) {
                      Alert.alert(
                        'Dark Mode Active',
                        'Please switch to light mode in your phone settings to change environment themes.',
                        [{ text: 'OK' }]
                      );
                    } else {
                      setSelectedEnv(env);
                      setShowEnvModal(true);
                    }
                  }}
                  activeOpacity={0.8}
                  disabled={isDark}
                >
                  <Ionicons
                    name={THEME_ICONS[env] as any}
                    size={28}
                    color={palette.primary}
                    style={{ marginBottom: Spacing.xs }}
                  />
                  <Text style={[styles.envName, { color: palette.primary }]}>
                    {palette.name}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark-circle" size={20} color={palette.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </StaggeredItem>
      </ScrollView>

      {/* Environment Preview Modal */}
      <Modal visible={showEnvModal} transparent animationType="fade" onRequestClose={() => setShowEnvModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: themePalettes[selectedEnv].background }]}>
            <Text style={[styles.modalTitle, { color: themePalettes[selectedEnv].primary }]}>
              Preview: {themePalettes[selectedEnv].name}
            </Text>
            <View style={[styles.previewCard, { backgroundColor: themePalettes[selectedEnv].card }]}>
              <Text style={{ color: themePalettes[selectedEnv].primary, fontWeight: 'bold', fontSize: 18 }}>
                Card Example
              </Text>
              <Text style={{ color: themePalettes[selectedEnv].text, marginTop: 8 }}>
                This is what a card will look like in this theme.
              </Text>
            </View>
            <TouchableOpacity style={[styles.previewButton, { backgroundColor: themePalettes[selectedEnv].primary }]}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Button Example</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowEnvModal(false)}
                style={[styles.modalBtn, { borderColor: themePalettes[selectedEnv].primary, borderWidth: 1, backgroundColor: isDark ? cardBg : '#fff' }]}
              >
                <Text style={{ color: themePalettes[selectedEnv].primary, fontWeight: 'bold', textAlign: 'center' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleEnvThemeUpdate(selectedEnv)}
                style={[styles.modalBtn, { backgroundColor: themePalettes[selectedEnv].primary }]}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Apply</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h2,
  },
  content: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3CD',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  noticeText: {
    flex: 1,
    color: '#856404',
    fontSize: 13,
    lineHeight: 18,
  },
  currentTheme: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  currentName: {
    ...Typography.h3,
  },
  currentDesc: {
    ...Typography.caption,
    marginTop: 2,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  envCard: {
    width: '48%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  envName: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: 320,
  },
  modalTitle: {
    ...Typography.h3,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  previewCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md + 4,
    marginBottom: Spacing.md,
  },
  previewButton: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  modalBtn: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
  },
});

export default ThemeSettingsScreen;

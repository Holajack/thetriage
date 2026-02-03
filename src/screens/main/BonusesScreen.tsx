import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { BottomTabBar } from '../../components/BottomTabBar';
import { UnifiedHeader } from '../../components/UnifiedHeader';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { StaggeredItem } from '../../components/premium/StaggeredList';
import { Typography, Spacing } from '../../theme/premiumTheme';
import { useFocusAnimationKey, useCounterAnimation } from '../../utils/animationUtils';
import { glassStyles } from '../../components/premium/LiquidGlass';
import { useConvexAchievements } from '../../hooks/useConvex';

const TOTAL_ACHIEVEMENTS = 14;

const BonusesScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const focusKey = useFocusAnimationKey();
  const { achievements: earnedAchievements } = useConvexAchievements();

  const earnedCount = earnedAchievements.length;
  const completionPercent = Math.round((earnedCount / TOTAL_ACHIEVEMENTS) * 100);

  const earnedCounter = useCounterAnimation(earnedCount, 800);
  const percentCounter = useCounterAnimation(completionPercent, 1000);

  const bonusFeatures = [
    {
      id: 'achievements',
      title: 'Achievements',
      stat: `${earnedCount} / ${TOTAL_ACHIEVEMENTS} unlocked`,
      icon: 'trophy' as const,
      color: '#FFD700',
      onPress: () => navigation.navigate('Achievements'),
    },
    {
      id: 'ebooks',
      title: 'E-Book Library',
      stat: 'Upload & study anywhere',
      icon: 'book' as const,
      color: '#4CAF50',
      onPress: () => navigation.navigate('EBooks'),
    },
    {
      id: 'self-discovery',
      title: 'Self-Discovery',
      stat: '6 assessments',
      icon: 'bulb' as const,
      color: '#9C27B0',
      onPress: () => navigation.navigate('SelfDiscoveryQuiz'),
    },
    {
      id: 'brain-mapping',
      title: 'Brain Mapping',
      stat: 'Cognitive insights',
      icon: 'pulse' as const,
      color: '#E91E63',
      onPress: () => navigation.navigate('BrainMapping'),
    },
  ];

  // Simple circular progress ring using View-based approach
  const ProgressRing = () => {
    const size = 100;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    // We'll show the fill visually with a bordered circle approach
    // Since we don't have SVG, use a simpler representation

    return (
      <View style={[styles.progressRingOuter, { width: size, height: size }]}>
        {/* Background ring */}
        <View
          style={[
            styles.progressRingBg,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: theme.text + '12',
            },
          ]}
        />
        {/* Foreground ring (approximated) */}
        <View
          style={[
            styles.progressRingFg,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: theme.primary,
              // Show partial ring by making some borders transparent
              borderTopColor: completionPercent > 0 ? theme.primary : 'transparent',
              borderRightColor: completionPercent > 25 ? theme.primary : 'transparent',
              borderBottomColor: completionPercent > 50 ? theme.primary : 'transparent',
              borderLeftColor: completionPercent > 75 ? theme.primary : 'transparent',
            },
          ]}
        />
        {/* Center content */}
        <View style={styles.progressRingCenter}>
          <Ionicons name="trophy" size={20} color={theme.primary} />
          <Animated.Text style={[styles.progressRingPercent, { color: theme.text }]}>
            {Math.round(percentCounter.value)}%
          </Animated.Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <UnifiedHeader title="Bonuses" onClose={() => navigation.navigate('Home')} />

      <ScrollView
        key={focusKey}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== HERO PROGRESS CARD ===== */}
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={[styles.heroCard, glassStyles.mediumCard(isDark), { backgroundColor: theme.card }]}>
            <View style={styles.heroContent}>
              <ProgressRing />
              <View style={styles.heroStats}>
                <View style={styles.heroStatRow}>
                  <Animated.Text style={[styles.heroStatNumber, { color: theme.text }]}>
                    {Math.round(earnedCounter.value)}
                  </Animated.Text>
                  <Text style={[styles.heroStatLabel, { color: theme.textSecondary }]}>
                    {' '}/ {TOTAL_ACHIEVEMENTS} Unlocked
                  </Text>
                </View>
                <Text style={[styles.heroSubtext, { color: theme.textSecondary }]}>
                  {earnedCount === 0
                    ? 'Start earning achievements!'
                    : earnedCount < 5
                    ? 'Great start! Keep going.'
                    : earnedCount < 10
                    ? 'Nice progress! Over halfway.'
                    : 'Almost there! So close.'}
                </Text>
                <TouchableOpacity
                  style={[styles.viewAllButton, { backgroundColor: theme.primary + '15' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate('Achievements');
                  }}
                >
                  <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ===== SECTION: EXPLORE ===== */}
        <Animated.View entering={FadeIn.delay(100).duration(400)}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>EXPLORE</Text>
        </Animated.View>

        {/* ===== 2x2 FEATURE GRID ===== */}
        <View style={styles.featureGrid}>
          {bonusFeatures.map((feature, index) => (
            <StaggeredItem
              key={feature.id}
              index={index}
              delay="normal"
              direction="up"
              style={styles.featureCardWrapper}
            >
              <TouchableOpacity
                style={[styles.featureCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  feature.onPress();
                }}
                activeOpacity={0.8}
              >
                {/* Subtle color tint overlay */}
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: feature.color + '08', borderRadius: 14 },
                  ]}
                />

                <View style={[styles.featureIconCircle, { backgroundColor: feature.color + '18' }]}>
                  <Ionicons name={feature.icon} size={26} color={feature.color} />
                </View>

                <Text style={[styles.featureTitle, { color: theme.text }]}>
                  {feature.title}
                </Text>

                <Text style={[styles.featureStat, { color: theme.textSecondary }]}>
                  {feature.stat}
                </Text>
              </TouchableOpacity>
            </StaggeredItem>
          ))}
        </View>
      </ScrollView>

      <BottomTabBar currentRoute="Bonuses" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ===== HERO PROGRESS CARD =====
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStats: {
    flex: 1,
    marginLeft: 20,
  },
  heroStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroStatNumber: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heroStatLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  heroSubtext: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ===== PROGRESS RING =====
  progressRingOuter: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingBg: {
    position: 'absolute',
  },
  progressRingFg: {
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
  },
  progressRingCenter: {
    alignItems: 'center',
    gap: 2,
  },
  progressRingPercent: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // ===== SECTION LABEL =====
  sectionLabel: {
    ...Typography.label,
    paddingHorizontal: 16,
    marginTop: 28,
    marginBottom: 12,
  },

  // ===== 2x2 FEATURE GRID =====
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  featureCardWrapper: {
    width: '47%',
    flexGrow: 1,
  },
  featureCard: {
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    minHeight: 150,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  featureIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureStat: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default BonusesScreen;

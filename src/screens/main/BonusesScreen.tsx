import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { BottomTabBar } from '../../components/BottomTabBar';
import { UnifiedHeader } from '../../components/UnifiedHeader';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Typography } from '../../theme/premiumTheme';
import { useFocusAnimationKey, useCounterAnimation } from '../../utils/animationUtils';
import { glassStyles } from '../../components/premium/LiquidGlass';
import { useConvexAchievements, useConvexProfile } from '../../hooks/useConvex';
import { useAuth } from '../../context/AuthContext';
import { FlintIcon } from '../../components/FlintIcon';
import InteractiveWalkthrough from '../../components/InteractiveWalkthrough';
import { useScreenWalkthrough } from '../../hooks/useScreenWalkthrough';
import { BONUSES_STEPS } from '../../config/walkthroughSteps';

const WEEKLY_FOCUS_GOAL_MINUTES = 300; // 5 hours per week

const BonusesScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const focusKey = useFocusAnimationKey();
  const { achievements: earnedAchievements } = useConvexAchievements();
  const { leaderboard } = useAuth();
  const { profile } = useConvexProfile();

  const earnedCount = earnedAchievements.length;
  const earnedCounter = useCounterAnimation(earnedCount, 800);

  const currentStreak = leaderboard?.current_streak ?? 0;
  const weeklyFocusMinutes = leaderboard?.weekly_focus_time ?? 0;
  const weeklyFocusHours = Math.floor(weeklyFocusMinutes / 60);
  const weeklyFocusRemainingMins = weeklyFocusMinutes % 60;
  const weeklyProgress = Math.min((weeklyFocusMinutes / WEEKLY_FOCUS_GOAL_MINUTES) * 100, 100);
  const flintCurrency = profile?.flint_currency || 0;
  const userLevel = leaderboard?.level ?? 1;

  const streakCounter = useCounterAnimation(currentStreak, 800);
  const flintCounter = useCounterAnimation(flintCurrency, 1000);

  // Walkthrough refs and hook
  const statsBarRef = useRef<View>(null);
  const featureGridRef = useRef<View>(null);
  const comingSoonRef = useRef<View>(null);
  const walkthroughRefs = {
    'stats-bar': statsBarRef,
    'feature-grid': featureGridRef,
    'coming-soon': comingSoonRef,
  };
  const { visible: walkthroughVisible, measurements: walkthroughMeasurements, complete: walkthroughComplete } =
    useScreenWalkthrough('bonuses', walkthroughRefs);

  const features = [
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

  const comingSoonFeatures = [
    {
      id: 'challenges',
      title: 'Challenges',
      description: 'Daily & weekly',
      icon: 'flag' as const,
      color: '#FF6B35',
    },
    {
      id: 'daily-rewards',
      title: 'Daily Rewards',
      description: 'Login bonuses',
      icon: 'gift' as const,
      color: '#00BCD4',
    },
    {
      id: 'study-rooms',
      title: 'Study Rooms',
      description: 'Focus together',
      icon: 'people' as const,
      color: '#3F51B5',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <UnifiedHeader title="Bonuses" onClose={() => navigation.navigate('Home')} />

      <ScrollView
        key={focusKey}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== ACHIEVEMENT HERO CARD ===== */}
        <Animated.View entering={FadeIn.duration(400)}>
          <Pressable
            style={[styles.achievementCard, glassStyles.mediumCard(isDark), { backgroundColor: theme.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Achievements');
            }}
          >
            <View style={[styles.achievementIcon, { backgroundColor: '#FFD70018' }]}>
              <Ionicons name="trophy" size={24} color="#FFD700" />
            </View>
            <View style={styles.achievementInfo}>
              <View style={styles.achievementStatRow}>
                <Animated.Text style={[styles.achievementCount, { color: theme.text }]}>
                  {Math.round(earnedCounter.value)}
                </Animated.Text>
                <Text style={[styles.achievementLabel, { color: theme.textSecondary }]}>
                  {' '}Unlocked
                </Text>
              </View>
              <Text style={[styles.achievementSubtext, { color: theme.textSecondary }]}>
                {earnedCount === 0
                  ? 'Start earning achievements!'
                  : earnedCount < 5
                  ? 'Great start! Keep going.'
                  : 'Nice progress!'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </Pressable>
        </Animated.View>

        {/* ===== HIGHLIGHTS SECTION ===== */}
        <Animated.View entering={FadeIn.delay(80).duration(400)}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>HIGHLIGHTS</Text>
        </Animated.View>

        {/* Quick Stats Row */}
        <Animated.View ref={statsBarRef} collapsable={false} entering={FadeInUp.delay(120).duration(400)} style={styles.quickStatsRow}>
          <View style={[styles.quickStatCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}>
            <View style={[styles.quickStatIconWrap, { backgroundColor: '#F4433615' }]}>
              <Ionicons name="flame" size={18} color="#F44336" />
            </View>
            <Animated.Text style={[styles.quickStatNumber, { color: theme.text }]}>
              {Math.round(streakCounter.value)}
            </Animated.Text>
            <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>
              {currentStreak === 1 ? 'Day' : 'Days'}
            </Text>
          </View>

          <View style={[styles.quickStatCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}>
            <View style={[styles.quickStatIconWrap, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="shield" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.quickStatNumber, { color: theme.text }]}>
              {userLevel}
            </Text>
            <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>Level</Text>
          </View>

          <Pressable
            style={[styles.quickStatCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Shop' as any);
            }}
          >
            <View style={[styles.quickStatIconWrap, { backgroundColor: '#FF570015' }]}>
              <FlintIcon size={18} color="#FF5700" />
            </View>
            <Animated.Text style={[styles.quickStatNumber, { color: theme.text }]}>
              {Math.round(flintCounter.value)}
            </Animated.Text>
            <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>Flint</Text>
          </Pressable>
        </Animated.View>

        {/* Weekly Focus Progress */}
        <Animated.View entering={FadeInUp.delay(180).duration(400)}>
          <View style={[styles.weeklyCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}>
            <View style={styles.weeklyHeader}>
              <View style={styles.weeklyTitleRow}>
                <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                <Text style={[styles.weeklyTitle, { color: theme.text }]}>Weekly Focus</Text>
              </View>
              <Text style={[styles.weeklyTime, { color: theme.primary }]}>
                {weeklyFocusHours}h {weeklyFocusRemainingMins}m
              </Text>
            </View>
            <View style={[styles.weeklyProgressTrack, { backgroundColor: theme.text + '10' }]}>
              <View
                style={[
                  styles.weeklyProgressFill,
                  { width: `${weeklyProgress}%`, backgroundColor: theme.primary },
                ]}
              />
            </View>
            <Text style={[styles.weeklyGoalText, { color: theme.textSecondary }]}>
              {weeklyProgress >= 100
                ? 'Weekly goal reached!'
                : `${Math.round(WEEKLY_FOCUS_GOAL_MINUTES / 60)}h goal · ${Math.max(0, Math.ceil((WEEKLY_FOCUS_GOAL_MINUTES - weeklyFocusMinutes) / 60))}h remaining`}
            </Text>
          </View>
        </Animated.View>

        {/* ===== EXPLORE SECTION ===== */}
        <Animated.View entering={FadeIn.delay(220).duration(400)}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>EXPLORE</Text>
        </Animated.View>

        <View ref={featureGridRef} collapsable={false}>
          {features.map((feature, index) => (
            <Animated.View key={feature.id} entering={FadeInUp.delay(260 + index * 60).duration(400)}>
              <Pressable
                style={[styles.featureBar, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  feature.onPress();
                }}
              >
                <View style={[styles.featureBarIcon, { backgroundColor: feature.color + '15' }]}>
                  <Ionicons name={feature.icon} size={22} color={feature.color} />
                </View>
                <View style={styles.featureBarInfo}>
                  <Text style={[styles.featureBarTitle, { color: theme.text }]}>{feature.title}</Text>
                  <Text style={[styles.featureBarStat, { color: theme.textSecondary }]}>{feature.stat}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* ===== COMING SOON SECTION ===== */}
        <Animated.View entering={FadeIn.delay(450).duration(400)}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>COMING SOON</Text>
        </Animated.View>

        <Animated.View ref={comingSoonRef} collapsable={false} entering={FadeInUp.delay(500).duration(400)} style={styles.comingSoonRow}>
          {comingSoonFeatures.map((feature) => (
            <View
              key={feature.id}
              style={[styles.comingSoonCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}
            >
              <View style={[styles.comingSoonIcon, { backgroundColor: feature.color + '12' }]}>
                <Ionicons name={feature.icon} size={22} color={feature.color + '80'} />
              </View>
              <Text style={[styles.comingSoonTitle, { color: theme.text + 'AA' }]} numberOfLines={1}>
                {feature.title}
              </Text>
              <Text style={[styles.comingSoonDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                {feature.description}
              </Text>
              <View style={[styles.comingSoonBadge, { backgroundColor: theme.primary + '12' }]}>
                <Ionicons name="lock-closed" size={10} color={theme.primary + '80'} />
                <Text style={[styles.comingSoonBadgeText, { color: theme.primary + '80' }]}>Soon</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Walkthrough Overlay */}
      <InteractiveWalkthrough
        visible={walkthroughVisible}
        onComplete={walkthroughComplete}
        measurements={walkthroughMeasurements}
        steps={BONUSES_STEPS}
      />

      <BottomTabBar currentRoute="Bonuses" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ===== ACHIEVEMENT HERO CARD =====
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  achievementCount: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  achievementLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  achievementSubtext: {
    fontSize: 12,
    marginTop: 2,
  },

  // ===== SECTION LABEL =====
  sectionLabel: {
    ...Typography.label,
    paddingHorizontal: 16,
    marginTop: 28,
    marginBottom: 12,
  },

  // ===== QUICK STATS ROW =====
  quickStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  quickStatIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // ===== WEEKLY FOCUS =====
  weeklyCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 16,
    borderRadius: 14,
  },
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weeklyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weeklyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  weeklyTime: {
    fontSize: 15,
    fontWeight: '700',
  },
  weeklyProgressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  weeklyProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  weeklyGoalText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ===== FEATURE BARS =====
  featureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
  },
  featureBarIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureBarInfo: {
    flex: 1,
  },
  featureBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureBarStat: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ===== COMING SOON =====
  comingSoonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  comingSoonCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    opacity: 0.7,
  },
  comingSoonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  comingSoonTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  comingSoonDesc: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 8,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  comingSoonBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
});

export default BonusesScreen;

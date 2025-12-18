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
import { LinearGradient } from 'expo-linear-gradient';
import { StaggeredItem } from '../../components/premium/StaggeredList';
import { Typography, Spacing, BorderRadius, Shadows, PremiumColors } from '../../theme/premiumTheme';
import { useFocusAnimationKey } from '../../utils/animationUtils';

const BonusesScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  // Force animations to replay on every screen focus
  const focusKey = useFocusAnimationKey();

  const bonusFeatures = [
    {
      id: 'achievements',
      title: 'Achievements',
      description: 'Track your progress and unlock exclusive rewards',
      icon: 'trophy-outline',
      iconFamily: 'Ionicons',
      color: '#FFD700',
      gradient: ['#FFD700', '#FFA000'],
      onPress: () => navigation.navigate('Achievements'),
      stats: 'Unlock 50+ achievements'
    },
    {
      id: 'ebooks',
      title: 'E-Book Library',
      description: 'Upload and access your textbooks anywhere, anytime',
      icon: 'book-outline',
      iconFamily: 'Ionicons',
      color: '#4CAF50',
      gradient: ['#4CAF50', '#2E7D32'],
      onPress: () => navigation.navigate('EBooks'),
      stats: 'Support for 100MB+ files'
    },
    {
      id: 'self-discovery',
      title: 'Self-Discovery Quizzes',
      description: 'Discover your unique learning style and study patterns',
      icon: 'bulb-outline',
      iconFamily: 'Ionicons',
      color: '#9C27B0',
      gradient: ['#9C27B0', '#7B1FA2'],
      onPress: () => navigation.navigate('SelfDiscoveryQuiz'),
      stats: '5 comprehensive assessments'
    },
    {
      id: 'brain-mapping',
      title: 'Brain Activity Mapping',
      description: 'Visualize your cognitive patterns and learning zones',
      icon: 'pulse-outline',
      iconFamily: 'Ionicons',
      color: '#E91E63',
      gradient: ['#E91E63', '#C2185B'],
      onPress: () => navigation.navigate('BrainMapping'),
      stats: 'Real-time brain insights'
    }
  ];

  const renderFeatureCard = (feature: any, index: number) => {
    const IconComponent = Ionicons;

    return (
      <StaggeredItem
        key={feature.id}
        index={index}
        delay="normal"
        direction="up"
      >
        <TouchableOpacity
          style={[styles.featureCard, { backgroundColor: theme.card }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            feature.onPress();
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[feature.gradient[0] + '10', feature.gradient[1] + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.cardContent}>
            <Animated.View
              entering={FadeIn.delay(200 + index * 150)}
              style={[styles.iconContainer, { backgroundColor: feature.color + '20' }]}
            >
              <IconComponent
                name={feature.icon as any}
                size={32}
                color={feature.color}
              />
            </Animated.View>

            <View style={styles.textContent}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>
                {feature.title}
              </Text>
              <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                {feature.description}
              </Text>
              <Text style={[styles.featureStats, { color: feature.color }]}>
                {feature.stats}
              </Text>
            </View>

            <View style={styles.arrowContainer}>
              <Ionicons
                name="chevron-forward-outline"
                size={24}
                color={theme.textSecondary}
              />
            </View>
          </View>
        </TouchableOpacity>
      </StaggeredItem>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Unified Header */}
      <UnifiedHeader title="Bonuses" onClose={() => navigation.navigate('Home')} />

      <ScrollView
        key={focusKey}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Features Grid */}
        <View style={styles.featuresContainer}>
          {bonusFeatures.map((feature, index) => renderFeatureCard(feature, index))}
        </View>

        {/* Stats Card */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(400)}
          style={[styles.statsCard, { backgroundColor: theme.primary + '15' }]}
        >
          <LinearGradient
            colors={[theme.primary + '10', theme.primary + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsGradient}
          >
            <View style={styles.statsRow}>
              <Animated.View entering={FadeIn.delay(700)} style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>4</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Features</Text>
              </Animated.View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <Animated.View entering={FadeIn.delay(750)} style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>∞</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Possibilities</Text>
              </Animated.View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <Animated.View entering={FadeIn.delay(800)} style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>24/7</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Available</Text>
              </Animated.View>
            </View>
          </LinearGradient>
        </Animated.View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <BottomTabBar currentRoute="Bonuses" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
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
  navHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureCard: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  featureStats: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  arrowContainer: {
    marginLeft: 12,
  },
  statsCard: {
    borderRadius: BorderRadius.lg,
    marginBottom: 8,
    overflow: 'hidden',
    ...Shadows.md,
  },
  statsGradient: {
    padding: Spacing.lg,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 16,
  },
});

export default BonusesScreen;
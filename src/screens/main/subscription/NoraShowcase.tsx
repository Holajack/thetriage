import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedButton } from '../../../components/premium/AnimatedButton';
import { useTheme } from '../../../context/ThemeContext';
import { Typography, Spacing, BorderRadius, PremiumColors, TimingConfig } from '../../../theme/premiumTheme';

interface NoraShowcaseProps {
  onUpgradeToElite: () => void;
}

const NORA_FEATURES = [
  { icon: 'mic-outline' as const, text: 'Voice-powered study assistant' },
  { icon: 'document-text-outline' as const, text: 'Analyzes your eBook PDFs' },
  { icon: 'calendar-outline' as const, text: 'Creates personalized study plans' },
  { icon: 'bulb-outline' as const, text: 'Deep Think mode for complex topics' },
  { icon: 'chatbubbles-outline' as const, text: 'Available on every screen' },
];

const NoraShowcase: React.FC<NoraShowcaseProps> = ({ onUpgradeToElite }) => {
  const { theme } = useTheme();
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500 }),
        withTiming(0, { duration: 1500 }),
      ),
      -1,
      true,
    );
  }, []);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <Animated.View entering={FadeInUp.delay(550).duration(500)} style={styles.container}>
      <LinearGradient
        colors={['#06B6D4', '#3B82F6', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Animated.View style={[styles.iconContainer, floatingStyle]}>
            <Ionicons name="hardware-chip" size={32} color="#FFFFFF" />
          </Animated.View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Meet Nora AI</Text>
            <Text style={styles.subtitle}>Your intelligent study companion</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresList}>
          {NORA_FEATURES.map((feature, i) => (
            <Animated.View
              key={i}
              entering={FadeInUp.delay(650 + i * 60).duration(400)}
              style={styles.featureRow}
            >
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </Animated.View>
          ))}
        </View>

        {/* CTA */}
        <AnimatedButton
          title="Get Nora with Elite"
          onPress={onUpgradeToElite}
          variant="secondary"
          size="medium"
          fullWidth
          icon={<Ionicons name="sparkles" size={18} color="#8B5CF6" />}
          iconPosition="left"
        />
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  gradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Typography.h2,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  featuresList: {
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  featureText: {
    ...Typography.body,
    color: '#FFFFFF',
    flex: 1,
  },
});

export default NoraShowcase;

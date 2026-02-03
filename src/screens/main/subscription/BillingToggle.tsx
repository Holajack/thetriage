import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import { Typography, Spacing, BorderRadius, AnimationConfig, PremiumColors } from '../../../theme/premiumTheme';

export type BillingPeriod = 'monthly' | 'annual';

interface BillingToggleProps {
  billingPeriod: BillingPeriod;
  onToggle: (period: BillingPeriod) => void;
  savingsPercent?: number;
}

const BillingToggle: React.FC<BillingToggleProps> = ({
  billingPeriod,
  onToggle,
  savingsPercent = 40,
}) => {
  const { theme } = useTheme();
  const togglePosition = useSharedValue(billingPeriod === 'monthly' ? 0 : 1);

  const handleToggle = (period: BillingPeriod) => {
    if (period === billingPeriod) return;
    Haptics.selectionAsync();
    togglePosition.value = withSpring(period === 'monthly' ? 0 : 1, AnimationConfig.snappy);
    onToggle(period);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: togglePosition.value * 148 }],
  }));

  return (
    <Animated.View entering={FadeInUp.delay(250).duration(400)} style={styles.container}>
      <View style={[styles.toggleTrack, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <Animated.View style={[styles.indicator, indicatorStyle]}>
          <LinearGradient
            colors={PremiumColors.gradients.primary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.indicatorGradient}
          />
        </Animated.View>

        <TouchableOpacity
          style={styles.option}
          onPress={() => handleToggle('monthly')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.optionText,
            { color: billingPeriod === 'monthly' ? '#FFFFFF' : theme.textSecondary },
          ]}>
            Monthly
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => handleToggle('annual')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.optionText,
            { color: billingPeriod === 'annual' ? '#FFFFFF' : theme.textSecondary },
          ]}>
            Annual
          </Text>
          {billingPeriod !== 'annual' && (
            <View style={styles.savingsBadge}>
              <LinearGradient
                colors={PremiumColors.gradients.gold as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.savingsGradient}
              >
                <Text style={styles.savingsText}>-{savingsPercent}%</Text>
              </LinearGradient>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  toggleTrack: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: 4,
    position: 'relative',
    width: 300,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 148,
    height: 40,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  indicatorGradient: {
    flex: 1,
    borderRadius: BorderRadius.md,
  },
  option: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    zIndex: 1,
  },
  optionText: {
    ...Typography.label,
    fontSize: 14,
    textTransform: 'none',
    letterSpacing: 0.3,
  },
  savingsBadge: {
    marginLeft: 6,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  savingsGradient: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  savingsText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default BillingToggle;

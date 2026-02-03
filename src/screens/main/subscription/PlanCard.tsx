import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedButton } from '../../../components/premium/AnimatedButton';
import { useTheme } from '../../../context/ThemeContext';
import { Typography, Spacing, BorderRadius, Shadows, PremiumColors } from '../../../theme/premiumTheme';
import type { BillingPeriod } from './BillingToggle';

export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface PlanTier {
  name: string;
  tier: 'premium' | 'elite';
  monthlyPrice: number;
  annualPrice: number;
  annualMonthlyEquivalent: number;
  badge: string | null;
  tagline: string;
  features: PlanFeature[];
  gradient: string[];
}

interface PlanCardProps {
  plan: PlanTier;
  isRecommended?: boolean;
  isCurrent?: boolean;
  billingPeriod: BillingPeriod;
  onUpgrade: () => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isRecommended = false,
  isCurrent = false,
  billingPeriod,
  onUpgrade,
  isProcessing = false,
  disabled = false,
}) => {
  const { theme } = useTheme();

  const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  const priceLabel = billingPeriod === 'monthly'
    ? `$${price.toFixed(2)}/mo`
    : `$${price.toFixed(2)}/yr`;
  const monthlyEquivalent = billingPeriod === 'annual'
    ? `$${plan.annualMonthlyEquivalent.toFixed(2)}/mo`
    : null;

  return (
    <View style={[
      styles.card,
      { backgroundColor: theme.card, borderColor: theme.border },
      isRecommended && { ...Shadows.lg, borderColor: plan.gradient[0], borderWidth: 2 },
      isCurrent && { opacity: 0.7 },
    ]}>
      {/* Badge */}
      {plan.badge && (
        <Animated.View entering={FadeIn.delay(300)} style={styles.badgeContainer}>
          <LinearGradient
            colors={isRecommended
              ? (PremiumColors.gradients.premium as [string, string, ...string[]])
              : (PremiumColors.gradients.gold as [string, string])
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>{plan.badge}</Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.planName, { color: plan.gradient[0] }]}>{plan.name}</Text>
        <Text style={[styles.tagline, { color: theme.textSecondary }]}>{plan.tagline}</Text>
      </View>

      {/* Price */}
      <View style={styles.priceContainer}>
        <Text style={[styles.price, { color: theme.text }]}>{priceLabel}</Text>
        {monthlyEquivalent && (
          <Text style={[styles.monthlyEquivalent, { color: theme.textSecondary }]}>
            ({monthlyEquivalent} billed annually)
          </Text>
        )}
      </View>

      {/* Features */}
      <View style={styles.featuresList}>
        {plan.features.map((feature, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons
              name={feature.highlight ? 'sparkles' : 'checkmark-circle'}
              size={18}
              color={feature.highlight ? '#8B5CF6' : PremiumColors.success.main}
              style={{ marginRight: 8 }}
            />
            <Text style={[
              styles.featureText,
              { color: theme.text },
              feature.highlight && styles.featureHighlight,
            ]}>
              {feature.text}
            </Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      {isCurrent ? (
        <View style={[styles.currentBadge, { borderColor: theme.border }]}>
          <Ionicons name="checkmark-circle" size={20} color={PremiumColors.success.main} />
          <Text style={[styles.currentText, { color: theme.textSecondary }]}>Current Plan</Text>
        </View>
      ) : (
        <AnimatedButton
          title={`Upgrade to ${plan.name}`}
          onPress={onUpgrade}
          variant="primary"
          size="large"
          gradient
          gradientColors={plan.gradient as [string, string, ...string[]]}
          loading={isProcessing}
          disabled={disabled || isProcessing}
          fullWidth
          icon={<Ionicons name="arrow-forward" size={20} color="#FFF" />}
          iconPosition="right"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
  },
  badgeContainer: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  header: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  planName: {
    ...Typography.h2,
    marginBottom: 4,
  },
  tagline: {
    ...Typography.bodySmall,
  },
  priceContainer: {
    marginBottom: Spacing.md,
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  monthlyEquivalent: {
    ...Typography.caption,
    marginTop: 2,
  },
  featuresList: {
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  featureHighlight: {
    fontWeight: '600',
    color: '#8B5CF6',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  currentText: {
    ...Typography.label,
    textTransform: 'none',
    fontSize: 16,
  },
});

export default PlanCard;

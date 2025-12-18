import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { StaggeredItem } from '../../components/premium/StaggeredList';
import { usePulseAnimation } from '../../utils/animationUtils';
import { useTheme } from '../../context/ThemeContext';
import { Typography, Spacing, BorderRadius, Shadows, PremiumColors } from '../../theme/premiumTheme';

const plans = [
  {
    name: 'Basic',
    price: 'Free',
    features: [
      'Balanced Focus Timer (45/15 min cycles)',
      'Task & Subject Creation',
      'Weekly Progress Tracking',
      'Daily Inspiration Quotes',
      'Basic AI-Powered Insights (limited)',
      'Access to Community & Leaderboard',
      'Profile Customization',
    ],
    highlight: true,
    cta: 'Current Plan',
    badge: null,
  },
  {
    name: 'Premium',
    price: '$4.99/mo',
    features: [
      'Everything in Basic',
      'Unlimited AI-Powered Insights',
      'Advanced Task Prioritization',
      'Soundscapes for Focus',
      'Calendar Integration',
      'Chrome Extension Beta',
      'Priority Support',
    ],
    highlight: false,
    cta: 'Upgrade to Premium',
    badge: 'Most Popular',
  },
  {
    name: 'Pro',
    price: '$14.99/mo',
    features: [
      'Everything in Premium',
      'Personalized Study Plans (AI-generated)',
      'Brain Mapping & Motivation Profile',
      'Self-Discovery Quizzes',
      'E-Books Library Access',
      'Session Reports & Analytics',
      'App/Website Blocking (Protection Center)',
      'Early Access to New Features',
      'Pro Badge in Leaderboard',
    ],
    highlight: false,
    cta: 'Upgrade to Pro',
    badge: null,
  },
];

const SubscriptionScreen = () => {
  const { theme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<string | null>('Basic');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePlanSelect = (planName: string) => {
    if (planName !== 'Basic') {
      Haptics.selectionAsync();
      setSelectedPlan(planName);
    }
  };

  const handleUpgrade = async (planName: string) => {
    if (planName === 'Basic') return;

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // TODO: Implement actual purchase flow
    setTimeout(() => {
      setIsProcessing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInUp.delay(100).duration(400)}>
          <Text style={[styles.title, { color: theme.text }]}>Choose Your Plan</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Unlock your full potential with advanced features and insights.
          </Text>
        </Animated.View>

        <View style={styles.cardsColumn}>
          {plans.map((plan, idx) => {
            const isSelected = selectedPlan === plan.name;
            const isPremiumPlan = !plan.highlight;

            return (
              <StaggeredItem
                key={plan.name}
                index={idx}
                delay="normal"
                direction="up"
                style={styles.cardWrapper}
              >
                {plan.badge && (
                  <Animated.View
                    entering={FadeIn.delay(300 + idx * 150)}
                    style={[styles.badgeAboveCard, { backgroundColor: theme.primary }]}
                  >
                    <LinearGradient
                      colors={PremiumColors.gradients.gold as [string, string, ...string[]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.badgeGradient}
                    >
                      <Text style={styles.badgeText}>✨ {plan.badge}</Text>
                    </LinearGradient>
                  </Animated.View>
                )}

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => handlePlanSelect(plan.name)}
                >
                  <Animated.View
                    layout={Layout.duration(400)}
                    style={[
                      styles.card,
                      { backgroundColor: theme.card, borderColor: theme.border },
                      plan.highlight && styles.cardHighlight,
                      isSelected && isPremiumPlan && {
                        borderColor: theme.primary,
                        borderWidth: 2.5,
                        ...Shadows.glow(theme.primary),
                      },
                    ]}
                  >
                    <View style={styles.headerRow}>
                      <Text style={[styles.planName, { color: theme.primary }]}>{plan.name}</Text>
                      <Animated.View entering={FadeIn.delay(400 + idx * 150)}>
                        <Text style={[styles.planPrice, { color: theme.primary }]}>{plan.price}</Text>
                      </Animated.View>
                    </View>

                    <View style={styles.featuresList}>
                      {plan.features.map((feature, i) => (
                        <Animated.View
                          key={i}
                          entering={FadeInUp.delay(450 + idx * 150 + i * 50).duration(400)}
                          style={styles.featureRow}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={plan.highlight ? PremiumColors.success.main : theme.primary}
                            style={{ marginRight: 8 }}
                          />
                          <Text style={[styles.featureText, { color: theme.text }]}>{feature}</Text>
                        </Animated.View>
                      ))}
                    </View>

                    {plan.highlight ? (
                      <View style={[styles.ctaBtn, styles.ctaBtnCurrent, { borderColor: theme.border }]}>
                        <Ionicons name="checkmark-circle" size={20} color={PremiumColors.success.main} />
                        <Text style={[styles.ctaText, styles.ctaTextCurrent, { color: theme.textSecondary }]}>
                          {plan.cta}
                        </Text>
                      </View>
                    ) : (
                      <AnimatedButton
                        title={plan.cta}
                        onPress={() => handleUpgrade(plan.name)}
                        variant="primary"
                        size="large"
                        gradient
                        gradientColors={PremiumColors.gradients.primary as [string, string, ...string[]]}
                        loading={isProcessing && isSelected}
                        disabled={isProcessing}
                        fullWidth
                        icon={<Ionicons name="arrow-forward" size={20} color="#FFF" />}
                        iconPosition="right"
                      />
                    )}
                  </Animated.View>
                </TouchableOpacity>
              </StaggeredItem>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FCF8' },
  scrollContent: { padding: 24, alignItems: 'center' },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 24,
    textAlign: 'center',
    maxWidth: 320,
  },
  cardsColumn: {
    width: '100%',
    flexDirection: 'column',
    gap: 24,
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    width: '100%',
    maxWidth: 400,
  },
  cardHighlight: {
    borderColor: '#388E3C',
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#388E3C',
  },
  planPrice: {
    fontSize: 18,
    color: '#7B61FF',
    fontWeight: '600',
  },
  featuresList: {
    marginBottom: 18,
    marginTop: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  featureText: {
    fontSize: 15,
    color: '#222',
  },
  ctaBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  ctaBtnActive: {
    backgroundColor: '#7B61FF',
  },
  ctaBtnCurrent: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#BDBDBD',
  },
  ctaText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  ctaTextActive: {
    color: '#fff',
  },
  ctaTextCurrent: {
    color: '#888',
  },
  badgeAboveCard: {
    borderRadius: 8,
    marginBottom: -12,
    zIndex: 2,
    alignSelf: 'center',
    minWidth: 90,
    marginTop: 0,
    overflow: 'hidden',
  },
  badgeGradient: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  ctaBtnCurrent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

export default SubscriptionScreen; 

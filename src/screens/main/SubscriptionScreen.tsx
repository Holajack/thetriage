import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const plans = [
  {
    name: 'Basic',
    price: 'Free',
    features: [
      'Pomodoro Focus Timer (45/15 min cycles)',
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
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Unlock your full potential with advanced features and insights.</Text>
        <View style={styles.cardsColumn}>
          {plans.map((plan, idx) => (
            <View key={plan.name} style={styles.cardWrapper}>
              {plan.badge && (
                <View style={styles.badgeAboveCard}>
                  <Text style={styles.badgeText}>{plan.badge}</Text>
                </View>
              )}
              <View
                style={[styles.card, plan.highlight && styles.cardHighlight]}
              >
                <View style={styles.headerRow}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                </View>
                <View style={styles.featuresList}>
                  {plan.features.map((feature, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={plan.highlight ? '#388E3C' : '#7B61FF'}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={[
                    styles.ctaBtn,
                    plan.highlight && styles.ctaBtnCurrent,
                    !plan.highlight && styles.ctaBtnActive,
                  ]}
                  disabled={plan.highlight}
                  activeOpacity={plan.highlight ? 1 : 0.8}
                >
                  <Text style={[
                    styles.ctaText,
                    plan.highlight && styles.ctaTextCurrent,
                    !plan.highlight && styles.ctaTextActive,
                  ]}>
                    {plan.cta}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
    backgroundColor: '#7B61FF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: -12,
    zIndex: 2,
    alignSelf: 'center',
    minWidth: 90,
    marginTop: 0,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

export default SubscriptionScreen; 
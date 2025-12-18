import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { UnifiedHeader } from '../../components/UnifiedHeader';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useFocusAnimationKey } from '../../utils/animationUtils';

const { width } = Dimensions.get('window');

const ProTrekkerScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly' | 'lifetime'>('yearly');

  // Force animations to replay on every screen focus
  const focusKey = useFocusAnimationKey();

  const handleSubscribe = () => {
    // Handle subscription logic here
    console.log('Subscribe to:', selectedPlan);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Back Button */}
      <Animated.View
        key={`back-${focusKey}`}
        entering={FadeIn.duration(200)}
        style={styles.backButtonContainer}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Settings' as any)}
        >
          <View style={[styles.backButtonCircle, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="arrow-back-outline" size={24} color={theme.primary} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        key={`content-${focusKey}`}
        entering={FadeInUp.delay(100).duration(300)}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Section */}
        <View style={styles.heroSection}>
          <Image
            source={require('../../../assets/homescreen-image.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Ionicons name="star-outline" size={28} color="#FFA726" />
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.primary }]}>HikeWise Pro</Text>

        {/* Pricing Cards */}
        <View style={styles.pricingContainer}>
          {/* Premium Plan */}
          <TouchableOpacity
            style={[
              styles.priceCard,
              { backgroundColor: theme.surface },
              selectedPlan === 'monthly' && styles.priceCardSelected
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
          >
            <Text style={[styles.priceAmount, { color: theme.text }]}>Premium $4.99/mo</Text>
            <Text style={[styles.priceDescription, { color: theme.textSecondary }]}>3 Days Free Trial, Cancel Anytime</Text>
          </TouchableOpacity>

          {/* Pro Plan - Most Popular */}
          <TouchableOpacity
            style={[
              styles.priceCard,
              styles.priceCardRecommended,
              selectedPlan === 'yearly' && styles.priceCardSelected
            ]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.8}
          >
            <View style={styles.recommendBadge}>
              <Text style={styles.recommendText}>Most Popular</Text>
            </View>
            <View style={styles.checkmark}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
            </View>
            <Text style={[styles.priceAmount, { color: '#FFF' }]}>Pro $14.99/mo</Text>
            <Text style={[styles.priceDescription, { color: '#E3F2FD' }]}>Ultimate study experience with all features</Text>
          </TouchableOpacity>

          {/* Lifetime Plan */}
          <TouchableOpacity
            style={[
              styles.priceCard,
              { backgroundColor: theme.surface },
              selectedPlan === 'lifetime' && styles.priceCardSelected
            ]}
            onPress={() => setSelectedPlan('lifetime')}
            activeOpacity={0.8}
          >
            <View style={styles.saleBadge}>
              <Text style={styles.saleText}>Best Value</Text>
            </View>
            <Text style={[styles.priceAmount, { color: theme.text }]}>Lifetime Access</Text>
            <Text style={[styles.priceDescription, { color: theme.textSecondary }]}>$149.99, Pay once, use forever</Text>
          </TouchableOpacity>
        </View>

        {/* Get All Features Button */}
        <TouchableOpacity
          style={[styles.subscribeButton, { backgroundColor: theme.primary }]}
          onPress={handleSubscribe}
          activeOpacity={0.9}
        >
          <Text style={[styles.subscribeButtonText, { color: '#FFF' }]}>Unlock HikeWise Pro</Text>
        </TouchableOpacity>

        {/* Links */}
        <View style={styles.linksContainer}>
          <TouchableOpacity><Text style={[styles.linkText, { color: theme.textSecondary }]}>Terms of use</Text></TouchableOpacity>
          <Text style={[styles.linkSeparator, { color: theme.textSecondary }]}>|</Text>
          <TouchableOpacity><Text style={[styles.linkText, { color: theme.textSecondary }]}>Privacy</Text></TouchableOpacity>
          <Text style={[styles.linkSeparator, { color: theme.textSecondary }]}>|</Text>
          <TouchableOpacity><Text style={[styles.linkText, { color: theme.textSecondary }]}>Restore Purchased</Text></TouchableOpacity>
        </View>

        {/* Features Section */}
        <Text style={[styles.featuresTitle, { color: theme.primary }]}>What You'll Get</Text>

        <View style={styles.featuresList}>
          {/* Feature 1 - AI-Powered Insights */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#7B61FF' }]}>
              <Ionicons name="bulb-outline" size={32} color="#FFF" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Unlimited AI Insights</Text>
            <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>Get personalized study recommendations powered by AI</Text>
          </View>

          {/* Feature 2 - Personalized Study Plans */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="calendar-outline" size={32} color="#FFF" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>AI-Generated Study Plans</Text>
            <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>Custom schedules tailored to your learning style</Text>
          </View>

          {/* Feature 3 - E-Books Library */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#FF9500' }]}>
              <Ionicons name="book-outline" size={32} color="#FFF" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>E-Books Library Access</Text>
            <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>Exclusive study guides and educational resources</Text>
          </View>

          {/* Feature 4 - Session Analytics */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="stats-chart-outline" size={32} color="#FFF" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Advanced Analytics</Text>
            <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>Detailed reports and progress tracking</Text>
          </View>

          {/* Feature 5 - Soundscapes */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#00BCD4' }]}>
              <Ionicons name="musical-notes-outline" size={32} color="#FFF" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Focus Soundscapes</Text>
            <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>Curated audio for deep concentration</Text>
          </View>

          {/* Feature 6 - Brain Mapping */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#9C27B0' }]}>
              <Ionicons name="color-filter-outline" size={32} color="#FFF" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Brain Mapping Profile</Text>
            <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>Discover your unique learning patterns</Text>
          </View>

          {/* Feature 7 - Self-Discovery Quizzes */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#FF6B35' }]}>
              <Ionicons name="help-circle-outline" size={32} color="#FFF" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Self-Discovery Quizzes</Text>
            <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>Unlock insights about your study habits</Text>
          </View>

          {/* Feature 8 - Protection Center */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#EF5350' }]}>
              <Ionicons name="shield-checkmark-outline" size={32} color="#FFF" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>App Blocking</Text>
            <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>Block distracting apps and websites during focus time</Text>
          </View>

          {/* Feature 9 - Pro Badge */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#FFA726' }]}>
              <Ionicons name="trophy-outline" size={32} color="#FFF" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Pro Badge</Text>
            <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>Stand out in the community leaderboard</Text>
          </View>
        </View>

        {/* Testimonials Section */}
        <View style={styles.testimonialsSection}>
          <Text style={styles.recommendTitle}>What Students Say</Text>
          <Text style={styles.reviewCount}>Join thousands of successful students</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.testimonialScroll}
          >
            <View style={styles.testimonialCard}>
              <Text style={styles.testimonialText}>
                "HikeWise Pro transformed my study habits! The AI insights helped me identify my optimal study times and the personalized plans keep me on track. My grades have improved significantly since upgrading."
              </Text>
              <View style={styles.testimonialFooter}>
                <Text style={styles.testimonialAuthor}>Sarah K., College Student</Text>
                <View style={styles.testimonialAvatar}>
                  <Ionicons name="person-outline" size={20} color="#FFF" />
                </View>
              </View>
            </View>

            <View style={styles.testimonialCard}>
              <Text style={styles.testimonialText}>
                "The e-books library and brain mapping features are game-changers. I finally understand how I learn best, and the app blocking feature helps me stay focused during deep work sessions."
              </Text>
              <View style={styles.testimonialFooter}>
                <Text style={styles.testimonialAuthor}>Marcus T., Graduate Student</Text>
                <View style={styles.testimonialAvatar}>
                  <Ionicons name="person-outline" size={20} color="#FFF" />
                </View>
              </View>
            </View>

            <View style={styles.testimonialCard}>
              <Text style={styles.testimonialText}>
                "Best investment in my academic career! The analytics show me exactly where I'm making progress and where I need more focus. The soundscapes are perfect for concentration."
              </Text>
              <View style={styles.testimonialFooter}>
                <Text style={styles.testimonialAuthor}>Emma L., Medical Student</Text>
                <View style={styles.testimonialAvatar}>
                  <Ionicons name="person-outline" size={20} color="#FFF" />
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Success Badge */}
        <View style={styles.editorPicksContainer}>
          <Image
            source={require('../../../assets/homescreen-image.png')}
            style={styles.editorPicksImage}
            resizeMode="cover"
          />
          <View style={styles.editorPicksOverlay}>
            <Ionicons name="trophy-outline" size={40} color="#FFA726" style={styles.leftIcon} />
            <Ionicons name="star-outline" size={40} color="#FFA726" style={[styles.leftIcon, styles.rightIcon]} />
            <Text style={styles.editorPicksText}>HIKEWISE PRO</Text>
            <Text style={styles.editorPicksSubtext}>Unlock Your Potential</Text>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 100,
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroSection: {
    width: '100%',
    height: 250,
    position: 'relative',
    marginBottom: 20,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -30,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -40,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#FFA726',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A237E',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  pricingContainer: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
  },
  priceCard: {
    backgroundColor: '#BBE0FA',
    borderRadius: 20,
    padding: 20,
    position: 'relative',
  },
  priceCardRecommended: {
    backgroundColor: '#1E3A5F',
  },
  priceCardSelected: {
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  priceDescription: {
    fontSize: 14,
    color: '#5D6D7E',
  },
  recommendBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#EF5350',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkmark: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  saleBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#FFA726',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subscribeButton: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  linkText: {
    fontSize: 12,
    color: '#1A237E',
    textDecorationLine: 'underline',
  },
  linkSeparator: {
    color: '#1A237E',
    fontSize: 12,
  },
  featuresTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A237E',
    textAlign: 'center',
    marginBottom: 30,
  },
  featuresList: {
    paddingHorizontal: 20,
    gap: 24,
    marginBottom: 40,
  },
  featureCard: {
    alignItems: 'center',
  },
  featureIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#5D6D7E',
    textAlign: 'center',
  },
  testimonialsSection: {
    paddingVertical: 30,
    backgroundColor: '#FFF',
    marginBottom: 30,
  },
  recommendTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    textAlign: 'center',
    marginBottom: 8,
  },
  reviewCount: {
    fontSize: 14,
    color: '#5D6D7E',
    textAlign: 'center',
    marginBottom: 20,
  },
  testimonialScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  testimonialCard: {
    backgroundColor: '#1E3A5F',
    borderRadius: 16,
    padding: 20,
    width: width - 80,
    marginRight: 16,
  },
  testimonialText: {
    fontSize: 14,
    color: '#E3F2FD',
    lineHeight: 20,
    marginBottom: 16,
  },
  testimonialFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testimonialAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  testimonialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorPicksContainer: {
    marginHorizontal: 20,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  editorPicksImage: {
    width: '100%',
    height: '100%',
  },
  editorPicksOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    position: 'absolute',
    top: 40,
    left: 40,
  },
  rightIcon: {
    left: undefined,
    right: 40,
  },
  editorPicksText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 2,
  },
  editorPicksSubtext: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 4,
  },
});

export default ProTrekkerScreen;

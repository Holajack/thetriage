import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { UnifiedHeader } from '../../components/UnifiedHeader';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const ProTrekkerScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly' | 'lifetime'>('yearly');

  const handleSubscribe = () => {
    // Handle subscription logic here
    console.log('Subscribe to:', selectedPlan);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#3D9AE2' }]}>
      <UnifiedHeader title="Traveller" />

      <ScrollView
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
              <Ionicons name="star" size={28} color="#FFA726" />
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Become Pro Trekker</Text>

        {/* Pricing Cards */}
        <View style={styles.pricingContainer}>
          {/* Monthly Plan */}
          <TouchableOpacity
            style={[
              styles.priceCard,
              selectedPlan === 'monthly' && styles.priceCardSelected
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
          >
            <Text style={styles.priceAmount}>Monthly $0.99</Text>
            <Text style={styles.priceDescription}>Recurring payment</Text>
          </TouchableOpacity>

          {/* Yearly Plan - Recommended */}
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
              <Text style={styles.recommendText}>Recommend</Text>
            </View>
            <View style={styles.checkmark}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            </View>
            <Text style={[styles.priceAmount, { color: '#FFF' }]}>Yearly $7.99</Text>
            <Text style={[styles.priceDescription, { color: '#E3F2FD' }]}>3 Days Free Trial, Cancel Anytime</Text>
          </TouchableOpacity>

          {/* Lifetime Plan */}
          <TouchableOpacity
            style={[
              styles.priceCard,
              selectedPlan === 'lifetime' && styles.priceCardSelected
            ]}
            onPress={() => setSelectedPlan('lifetime')}
            activeOpacity={0.8}
          >
            <View style={styles.saleBadge}>
              <Text style={styles.saleText}>On sale</Text>
            </View>
            <Text style={styles.priceAmount}>Life Time Access</Text>
            <Text style={styles.priceDescription}>$9.99, No recurring payments</Text>
          </TouchableOpacity>
        </View>

        {/* Get All Features Button */}
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          activeOpacity={0.9}
        >
          <Text style={styles.subscribeButtonText}>Get All Features</Text>
        </TouchableOpacity>

        {/* Links */}
        <View style={styles.linksContainer}>
          <TouchableOpacity><Text style={styles.linkText}>Terms of use</Text></TouchableOpacity>
          <Text style={styles.linkSeparator}>|</Text>
          <TouchableOpacity><Text style={styles.linkText}>Privacy</Text></TouchableOpacity>
          <Text style={styles.linkSeparator}>|</Text>
          <TouchableOpacity><Text style={styles.linkText}>Restore Purchased</Text></TouchableOpacity>
        </View>

        {/* Features Section */}
        <Text style={styles.featuresTitle}>Features</Text>

        <View style={styles.featuresList}>
          {/* Feature 1 - More Scenery */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#FF6B35' }]}>
              <MaterialCommunityIcons name="leaf-maple" size={32} color="#FFF" />
            </View>
            <Text style={styles.featureTitle}>3 more scenery</Text>
            <Text style={styles.featureDesc}>Focus in spring, winter and autumn</Text>
          </View>

          {/* Feature 2 - All Characters */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#FF9500' }]}>
              <Ionicons name="happy" size={32} color="#FFF" />
            </View>
            <Text style={styles.featureTitle}>All characters</Text>
            <Text style={styles.featureDesc}>Fox, Bear, Corgi and more...</Text>
          </View>

          {/* Feature 3 - Customize Focus Time */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="time" size={32} color="#FFF" />
            </View>
            <Text style={styles.featureTitle}>Customize focus time</Text>
            <Text style={styles.featureDesc}>Set a single focus time freely</Text>
          </View>

          {/* Feature 4 - Notebook Cover */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#B8A88A' }]}>
              <Ionicons name="book" size={32} color="#FFF" />
            </View>
            <Text style={styles.featureTitle}>Notebook cover</Text>
            <Text style={styles.featureDesc}>16 unique covers</Text>
          </View>

          {/* Feature 5 - Customize Summit Time */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#7CB342' }]}>
              <MaterialCommunityIcons name="mountain" size={32} color="#FFF" />
            </View>
            <Text style={styles.featureTitle}>Customize summit time</Text>
            <Text style={styles.featureDesc}>Set the total length of the mountain trail</Text>
          </View>

          {/* Feature 6 - Pomodoro Mode */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#EF5350' }]}>
              <MaterialCommunityIcons name="tomato" size={32} color="#FFF" />
            </View>
            <Text style={styles.featureTitle}>Pomodoro mode</Text>
            <Text style={styles.featureDesc}>Classic Pomodoro technique</Text>
          </View>
        </View>

        {/* Testimonials Section */}
        <View style={styles.testimonialsSection}>
          <Text style={styles.recommendTitle}>Recommend</Text>
          <Text style={styles.reviewCount}>2000+ reviews</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.testimonialScroll}
          >
            <View style={styles.testimonialCard}>
              <Text style={styles.testimonialText}>
                "A great app with beautiful graphics. The music is also so lovely. I only wish there was a way to visually see how many mountains you've climbed, or have a different mountain type/different area. I love the little journals you get after each mountain."
              </Text>
              <View style={styles.testimonialFooter}>
                <Text style={styles.testimonialAuthor}>Traveller N</Text>
                <View style={styles.testimonialAvatar}>
                  <Ionicons name="person" size={20} color="#FFF" />
                </View>
              </View>
            </View>

            <View style={styles.testimonialCard}>
              <Text style={styles.testimonialText}>
                "I love the concept and the aesthetic! Perfect for building healthy study habits."
              </Text>
              <View style={styles.testimonialFooter}>
                <Text style={styles.testimonialAuthor}>Traveller M</Text>
                <View style={styles.testimonialAvatar}>
                  <Ionicons name="person" size={20} color="#FFF" />
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Editor's Picks Badge */}
        <View style={styles.editorPicksContainer}>
          <Image
            source={require('../../../assets/homescreen-image.png')}
            style={styles.editorPicksImage}
            resizeMode="cover"
          />
          <View style={styles.editorPicksOverlay}>
            <Ionicons name="leaf" size={32} color="#FFF" style={styles.leafIcon} />
            <Ionicons name="leaf" size={32} color="#FFF" style={[styles.leafIcon, styles.leafIconRight]} />
            <Text style={styles.editorPicksText}>APP STORE</Text>
            <Text style={styles.editorPicksSubtext}>Editor's Picks</Text>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: '#A8D5E2',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
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
  leafIcon: {
    position: 'absolute',
    top: 40,
    left: 40,
  },
  leafIconRight: {
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

import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  StatusBar, 
  TouchableOpacity,
  SafeAreaView,
  Image
} from 'react-native';
import { ThemedImage } from '../components/ThemedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation/types';

type LandingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

const { width, height } = Dimensions.get('window');

const TriageLogo = ({ style }: { style?: any }) => (
  <View style={[styles.logoContainer, style]}>
    <ThemedImage 
      source={require('../assets/transparent-triage.png')} 
      style={styles.logoImage}
      resizeMode="contain"
      applyFilter={true}
    />
  </View>
);

const LandingPage: React.FC = () => {
  const navigation = useNavigation<LandingNavigationProp>();
  const { setHasSeenLanding, isAuthenticated, hasCompletedOnboarding, isRecentLogin } = useAuth();
  const { theme } = useTheme();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;

  // Auto-redirect authenticated users who have completed onboarding (only if recent login)
  useEffect(() => {
    const checkAutoRedirect = async () => {
      if (isAuthenticated && hasCompletedOnboarding) {
        const recentLogin = await isRecentLogin();
        if (recentLogin) {
          console.log('LandingPage: Auto-redirecting authenticated user with recent login to Main');
          navigation.replace('Main');
        } else {
          console.log('LandingPage: Login expired (>24h), user needs to re-authenticate');
          // User needs to sign in again after 24 hours
        }
      }
    };
    
    checkAutoRedirect();
  }, [isAuthenticated, hasCompletedOnboarding, isRecentLogin, navigation]);

  useEffect(() => {
    const animationSequence = Animated.sequence([
      // Logo appears
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Title appears
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Tagline appears
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Button appears
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animationSequence.start();
  }, []);

  const handleGetStarted = () => {
    // Add a small animation before navigation
    Animated.parallel([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        setHasSeenLanding(true);
        // Navigate directly to onboarding flow for new users
        navigation.navigate('Onboarding', { screen: 'FocusMethodIntro' });
      });
    });
  };

  const handleSignIn = () => {
    setHasSeenLanding(true);
    // Navigate to Auth with login-only for existing users
    navigation.navigate('Auth', { screen: 'Login' });
  };

  // Dynamic colors based on theme
  const gradientColors = theme.isDark 
    ? ['#000000', '#1a1a1a', '#2a2a2a', '#1a1a1a']
    : ['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A'];
  
  const textColor = theme.isDark ? theme.text : '#E8F5E9';
  const secondaryTextColor = theme.isDark ? theme.textSecondary : '#B8E6C1';
  const buttonGradientColors = theme.isDark
    ? [theme.primary, theme.secondary || theme.primary, theme.primary]
    : ['#4CAF50', '#66BB6A', '#4CAF50'];

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.isDark ? '#000000' : '#1B4A3A'} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo Section */}
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <TriageLogo />
          </Animated.View>

          {/* Title Section */}
          <Animated.View
            style={[
              styles.textContainer,
              { opacity: titleOpacity },
            ]}
          >
            <Text style={[styles.title, { color: textColor }]}>TRIAGE</Text>
            <Text style={[styles.subtitle, { color: textColor }]}>SYSTEM</Text>
          </Animated.View>

          {/* Tagline Section */}
          <Animated.View
            style={[
              styles.taglineContainer,
              { opacity: taglineOpacity },
            ]}
          >
            <Text style={[styles.tagline, { color: textColor }]}>Focus Starts Here</Text>
            <Text style={[styles.description, { color: secondaryTextColor }]}>
              Transform your study sessions with focused learning and community support
            </Text>
          </Animated.View>

          {/* Action Button */}
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: buttonOpacity,
                transform: [{ scale: buttonScale }],
              },
            ]}
          >
            <TouchableOpacity 
              style={styles.getStartedButton}
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={buttonGradientColors}
                locations={[0, 0.5, 1]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Get Started</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secondaryButton, { borderColor: textColor }]}
              onPress={handleSignIn}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: textColor }]}>Sign In</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Features Preview */}
          <Animated.View
            style={[
              styles.featuresContainer,
              { opacity: buttonOpacity },
            ]}
          >
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.featureText, { color: secondaryTextColor }]}>Study Room Collaboration</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.featureText, { color: secondaryTextColor }]}>Focus Session Tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.featureText, { color: secondaryTextColor }]}>Community Leaderboards</Text>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoWrapper: {
    marginBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 130,
    height: 130,
    // Removed tintColor to show transparent logo as-is
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 6,
    textAlign: 'center',
  },
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  tagline: {
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  getStartedButton: {
    width: width * 0.7,
    height: 56,
    marginBottom: 15,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flex: 1,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  secondaryButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderRadius: 25,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  featuresContainer: {
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 280,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '400',
  },
});

export default LandingPage;

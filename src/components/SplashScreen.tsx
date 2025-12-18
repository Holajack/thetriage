import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, StatusBar, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedImage } from './ThemedImage';
import * as ExpoSplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

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

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    let animationRef: Animated.CompositeAnimation | null = null;
    
    // Add a reliable fallback timeout for iOS
    const fallbackTimeout = setTimeout(() => {
      console.log('SplashScreen: Fallback timeout reached, completing animation');
      if (isMounted) {
        onAnimationComplete();
      }
    }, Platform.OS === 'ios' ? 4000 : 5000); // 4 seconds for iOS, 5 for others
    
    // Hide the native splash screen when our custom one starts
    const initializeAnimation = async () => {
      try {
        console.log('SplashScreen: Starting animation sequence...');
        await ExpoSplashScreen.hideAsync();
        
        if (!isMounted) return;
        
        animationRef = Animated.sequence([
          // Logo appears
          Animated.parallel([
            Animated.timing(logoOpacity, {
              toValue: 1,
              duration: 800,
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
            duration: 600,
            useNativeDriver: true,
          }),
          // Tagline appears
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          // Hold for a moment
          Animated.delay(1500),
          // Fade out
          Animated.parallel([
            Animated.timing(logoOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(titleOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(taglineOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]);

        animationRef.start((finished) => {
          clearTimeout(fallbackTimeout); // Clear fallback timeout if animation completes normally
          if (isMounted && finished) {
            console.log('SplashScreen: Animation completed successfully');
            onAnimationComplete();
          }
        });
      } catch (error) {
        console.error('SplashScreen: Animation error:', error);
        clearTimeout(fallbackTimeout);
        // Fallback: complete immediately if there's an error
        if (isMounted) {
          onAnimationComplete();
        }
      }
    };
    
    initializeAnimation();
    
    return () => {
      isMounted = false;
      clearTimeout(fallbackTimeout); // Clear timeout on cleanup
      if (animationRef) {
        animationRef.stop();
      }
    };
  }, []);

  return (
    <LinearGradient
      colors={['#1B4A3A', '#2E5D4F', '#1B4A3A']}
      style={styles.container}
    >
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#1B4A3A" 
        translucent={Platform.OS === 'android'}
      />
      
      <View style={styles.content}>
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

        <Animated.View style={[styles.textContainer, { opacity: titleOpacity }]}>
          <Text style={styles.title}>Hike Wise</Text>
        </Animated.View>

        <Animated.View style={[styles.taglineContainer, { opacity: taglineOpacity }]}>
          <Text style={styles.tagline}>Focus • Learn • Succeed</Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoWrapper: {
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 200,
    height: 200,
    // Removed tintColor to show transparent logo as-is
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#E8F5E9',
    letterSpacing: 4,
    textAlign: 'center',
  },
  taglineContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 22,
    color: '#E8F5E9',
    fontWeight: '300',
    letterSpacing: 2,
    textAlign: 'center',
  },
});

export default SplashScreen;

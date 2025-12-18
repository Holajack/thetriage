import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { ShimmerLoader } from '../../components/premium/ShimmerLoader';
import { useEntranceAnimation, usePulseAnimation, triggerHaptic } from '../../utils/animationUtils';
import { AnimationConfig, Typography, Spacing, BorderRadius } from '../../theme/premiumTheme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Entrance animations
  const headerAnimation = useEntranceAnimation(0);
  const formAnimation = useEntranceAnimation(200);
  const buttonAnimation = useEntranceAnimation(400);
  const logoAnimation = usePulseAnimation(true);

  // Error shake animation
  const errorShake = useSharedValue(0);
  const errorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: errorShake.value }],
  }));

  const triggerErrorShake = () => {
    errorShake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    triggerHaptic('error');
  };

  const handleLogin = async () => {
    setLoading(true);
    setLoginError('');
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);
    if (error) {
      Alert.alert('Login Error', error);
      setLoginError(error);
      triggerErrorShake();
      return;
    }
    triggerHaptic('success');
    // Do not navigate; RootNavigator will handle the switch
  };

  // Dynamic colors based on theme
  const gradientColors = theme.isDark 
    ? ['#000000', '#1a1a1a', '#2a2a2a', '#1a1a1a']
    : ['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A'];
  
  const textColor = theme.isDark ? theme.text : '#E8F5E9';
  const secondaryTextColor = theme.isDark ? theme.textSecondary : '#B8E6C1';
  const inputBorderColor = theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(232, 245, 233, 0.3)';
  const inputBackground = theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)';

  // Helper to darken/lighten colors for gradient
  const adjustColor = (color: string, amount: number): string => {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={headerAnimation}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('buttonPress');
              navigation.dispatch(CommonActions.navigate('Landing'));
            }}
            style={styles.backButton}
          >
            <Text style={[styles.backArrow, { color: textColor }]}>{'<'} </Text>
            <Text style={[styles.backText, { color: textColor }]}>Back to Landing Page</Text>
          </TouchableOpacity>
          <Animated.View style={logoAnimation}>
            <Text style={[styles.header, { color: textColor }]}>Welcome Back</Text>
          </Animated.View>
          <Text style={[styles.subheader, { color: secondaryTextColor }]}>Log in to continue your focus journey.</Text>
        </Animated.View>

        <Animated.View style={[formAnimation, { marginTop: 24 }]}>
          <Text style={[styles.inputLabel, { color: textColor }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorderColor, color: textColor }]}
            placeholder="Enter your email"
            placeholderTextColor={secondaryTextColor}
            value={loginEmail}
            onChangeText={setLoginEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Text style={[styles.inputLabel, { color: textColor }]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: inputBackground, borderColor: inputBorderColor, color: textColor }]}
              placeholder="Enter your password"
              placeholderTextColor={secondaryTextColor}
              value={loginPassword}
              onChangeText={setLoginPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('selection');
                setShowPassword(!showPassword);
              }}
              style={{ position: 'absolute', right: 12, top: 12 }}
            >
              <Text style={{ fontSize: 18, color: secondaryTextColor }}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {loginError ? (
            <Animated.View style={errorStyle}>
              <Text style={styles.errorText}>{loginError}</Text>
            </Animated.View>
          ) : null}
        </Animated.View>

        <Animated.View style={buttonAnimation}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ShimmerLoader variant="button" width="100%" />
            </View>
          ) : (
            <AnimatedButton
              title="Log In"
              onPress={handleLogin}
              variant="primary"
              size="large"
              gradient={true}
              gradientColors={[theme.primary, adjustColor(theme.primary, -20)]}
              fullWidth={true}
              hapticFeedback={true}
              style={{ marginTop: 20 }}
            />
          )}
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('buttonPress');
              navigation.navigate('ForgotPassword');
            }}
            style={{ marginTop: 12, alignSelf: 'flex-end' }}
          >
            <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '500' }}>Forgot Password?</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32, // Adjusted padding for a cleaner look
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24, // Increased margin
  },
  backArrow: {
    fontSize: 20, // Slightly larger arrow
    marginRight: 8,
  },
  backText: {
    fontWeight: '600', // Bolder
    fontSize: 17, // Slightly larger
  },
  header: {
    fontSize: 32, // Larger header
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'left',
  },
  subheader: {
    fontSize: 17, // Slightly larger subheader
    // Removed background, padding, border for a cleaner look under "Welcome Back"
    marginBottom: 24, // Increased margin
    textAlign: 'left', // Align with header
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 16, // Slightly larger
    fontWeight: '500',
    marginBottom: 6, // Adjusted margin
  },
  input: {
    paddingVertical: 16, // Increased padding
    paddingHorizontal: 16,
    borderRadius: 10, // More rounded
    marginBottom: 18, // Adjusted margin
    fontSize: 16,
    borderWidth: 1,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  errorText: { // Renamed from error to errorText for clarity, ensure this is used or styles.error is suitable
    color: '#FF6B6B',
    marginBottom: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 10, // Adjusted padding
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    fontSize: 15, // Slightly larger
  },
  primaryButton: {
    paddingVertical: 18, // Increased padding
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20, // Adjusted margin
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  primaryButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17, // Slightly larger
    fontWeight: '700',
  },
  loadingContainer: {
    marginTop: 20,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSignIn } from '@clerk/clerk-expo';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/types';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { useEntranceAnimation, useSuccessAnimation, useProgressAnimation, triggerHaptic } from '../../utils/animationUtils';
import { AnimationConfig, Spacing, PremiumColors } from '../../theme/premiumTheme';

type ResetPasswordRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<ResetPasswordRouteProp>();
  const { signIn, setActive, isLoaded } = useSignIn();

  // Get email from route params (passed from ForgotPasswordScreen)
  const email = (route.params as any)?.email || '';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Entrance animations
  const headerAnimation = useEntranceAnimation(0);
  const iconAnimation = useEntranceAnimation(100);
  const codeAnimation = useEntranceAnimation(150);
  const passwordAnimation = useEntranceAnimation(200);
  const confirmPasswordAnimation = useEntranceAnimation(300);
  const buttonAnimation = useEntranceAnimation(400);
  const { animatedStyle: successStyle, celebrate } = useSuccessAnimation();

  // Password strength animation
  const passwordStrength = useSharedValue(0);
  const strengthStyle = useAnimatedStyle(() => ({
    width: `${passwordStrength.value * 100}%`,
  }));

  // Calculate password strength
  const calculatePasswordStrength = (pwd: string): number => {
    let strength = 0;
    if (pwd.length >= 8) strength += 0.25;
    if (/[A-Z]/.test(pwd)) strength += 0.25;
    if (/[a-z]/.test(pwd)) strength += 0.25;
    if (/[0-9]/.test(pwd)) strength += 0.25;
    return strength;
  };

  // Update password strength animation when password changes
  useEffect(() => {
    const strength = calculatePasswordStrength(password);
    passwordStrength.value = withSpring(strength, AnimationConfig.gentle);
  }, [password]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleResetPassword = useCallback(async () => {
    if (!isLoaded || !signIn) {
      setError('Authentication is not ready. Please try again.');
      return;
    }

    setError('');
    triggerHaptic('buttonPress');

    // Validate code is provided
    if (!code || code.length < 6) {
      setError('Please enter the 6-digit verification code from your email');
      triggerHaptic('error');
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      triggerHaptic('error');
      return;
    }

    // Validate password strength
    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      triggerHaptic('error');
      return;
    }

    setLoading(true);

    try {
      // Attempt to reset the password with Clerk using the verification code
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });

      if (result.status === 'complete') {
        // Password reset successful, set the session active
        try {
          await setActive({ session: result.createdSessionId });
          console.log('🔑 [ResetPassword] Session activated successfully');
        } catch (setActiveErr: any) {
          const errMsg = setActiveErr?.message || String(setActiveErr);
          if (errMsg.includes('CustomEvent') || errMsg.includes('hasFocus') || errMsg.includes('document') || errMsg.includes('dispatchEvent') || errMsg.includes('window')) {
            console.log('🔑 [ResetPassword] RN compatibility error (session likely active):', errMsg);
          } else {
            console.log('🔑 [ResetPassword] setActive error:', errMsg);
          }
        }

        setSuccess(true);
        triggerHaptic('success');
        celebrate();

        // Show success message and navigate to Main
        Alert.alert(
          'Success!',
          'Your password has been reset successfully. You are now logged in.',
          [
            {
              text: 'Continue',
              onPress: () => {
                console.log('🔑 [ResetPassword] Navigating to Main');
                navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main' as any }] }));
              }
            }
          ]
        );
      } else {
        // Handle other statuses
        setError('Password reset incomplete. Please try again.');
        triggerHaptic('error');
      }
    } catch (err: any) {
      const errorMessage = err?.errors?.[0]?.message || err?.message || 'An error occurred. Please try again.';
      setError(errorMessage);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  }, [isLoaded, signIn, setActive, code, password, confirmPassword, celebrate]);

  // Dynamic colors based on theme
  const gradientColors = theme.isDark 
    ? ['#000000', '#1a1a1a', '#2a2a2a', '#1a1a1a']
    : ['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A'];
  
  const textColor = theme.isDark ? theme.text : '#E8F5E9';
  const secondaryTextColor = theme.isDark ? theme.textSecondary : '#B8E6C1';
  const inputBorderColor = theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(232, 245, 233, 0.3)';
  const inputBackground = theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)';

  const isFormValid = code.length >= 6 && password.length >= 8 && confirmPassword.length >= 8 && !error && !success;

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
              navigation.navigate('Login');
            }}
            style={styles.backButton}
          >
            <Text style={[styles.backArrow, { color: textColor }]}>{'<'} </Text>
            <Text style={[styles.backText, { color: textColor }]}>Back to Login</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.content}>
          <Animated.View style={iconAnimation}>
            <Ionicons name="lock-closed" size={64} color={theme.primary} style={styles.icon} />
          </Animated.View>

          <Animated.View style={iconAnimation}>
            <Text style={[styles.title, { color: textColor }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
              Enter the verification code from your email{email ? ` (${email})` : ''} and your new password
            </Text>
          </Animated.View>

          {/* Verification Code Input */}
          <Animated.View style={[codeAnimation, styles.inputContainer]}>
            <Text style={[styles.label, { color: textColor }]}>Verification Code</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: inputBackground,
                borderColor: inputBorderColor,
                color: textColor,
                textAlign: 'center',
                fontSize: 24,
                letterSpacing: 8,
              }]}
              placeholder="000000"
              placeholderTextColor={secondaryTextColor}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              editable={!success}
            />
          </Animated.View>

          {/* New Password Input */}
          <Animated.View style={[passwordAnimation, styles.inputContainer]}>
            <Text style={[styles.label, { color: textColor }]}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, {
                  flex: 1,
                  backgroundColor: inputBackground,
                  borderColor: inputBorderColor,
                  color: textColor
                }]}
                placeholder="Enter new password"
                placeholderTextColor={secondaryTextColor}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!success}
              />
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('selection');
                  setShowPassword(!showPassword);
                }}
                style={styles.eyeIcon}
              >
                <Text style={{ fontSize: 18, color: secondaryTextColor }}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.strengthContainer}>
                <Text style={[styles.strengthLabel, { color: secondaryTextColor }]}>
                  Password Strength
                </Text>
                <View style={[styles.strengthBarBackground, { backgroundColor: inputBackground }]}>
                  <Animated.View
                    style={[
                      styles.strengthBarFill,
                      strengthStyle,
                      {
                        backgroundColor:
                          passwordStrength.value < 0.5
                            ? PremiumColors.error.main
                            : passwordStrength.value < 0.75
                            ? PremiumColors.warning.main
                            : PremiumColors.success.main,
                      },
                    ]}
                  />
                </View>
              </Animated.View>
            )}
          </Animated.View>

          {/* Confirm Password Input */}
          <Animated.View style={[confirmPasswordAnimation, styles.inputContainer]}>
            <Text style={[styles.label, { color: textColor }]}>Confirm Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, {
                  flex: 1,
                  backgroundColor: inputBackground,
                  borderColor: inputBorderColor,
                  color: textColor
                }]}
                placeholder="Confirm new password"
                placeholderTextColor={secondaryTextColor}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!success}
              />
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('selection');
                  setShowConfirmPassword(!showConfirmPassword);
                }}
                style={styles.eyeIcon}
              >
                <Text style={{ fontSize: 18, color: secondaryTextColor }}>
                  {showConfirmPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <Text style={[styles.requirementsTitle, { color: secondaryTextColor }]}>
              Password must contain:
            </Text>
            <Text style={[styles.requirement, { color: secondaryTextColor }]}>
              • At least 8 characters
            </Text>
            <Text style={[styles.requirement, { color: secondaryTextColor }]}>
              • One uppercase letter
            </Text>
            <Text style={[styles.requirement, { color: secondaryTextColor }]}>
              • One lowercase letter
            </Text>
            <Text style={[styles.requirement, { color: secondaryTextColor }]}>
              • One number
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          {/* Success Message */}
          {success ? (
            <Animated.View style={successStyle} entering={FadeIn} exiting={FadeOut}>
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.successText}>Password reset successful!</Text>
              </View>
            </Animated.View>
          ) : null}

          {/* Reset Button */}
          <Animated.View style={buttonAnimation}>
            <AnimatedButton
              title="Reset Password"
              onPress={handleResetPassword}
              variant="primary"
              size="large"
              disabled={!isFormValid || loading}
              loading={loading}
              gradient={true}
              gradientColors={[theme.primary, adjustColor(theme.primary, -20)]}
              fullWidth={true}
              hapticFeedback={true}
              style={{ marginTop: 8 }}
            />
          </Animated.View>
        </View>
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
    paddingTop: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backArrow: {
    fontSize: 20,
    marginRight: 8,
  },
  backText: {
    fontWeight: '600',
    fontSize: 17,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  requirementsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirement: {
    fontSize: 13,
    marginBottom: 4,
  },
  errorText: {
    color: '#FF6B6B',
    marginBottom: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    fontSize: 15,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginBottom: 12,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  strengthContainer: {
    marginTop: 12,
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  strengthBarBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});


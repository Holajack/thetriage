import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSignUp } from '@clerk/clerk-expo';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { useEntranceAnimation, useFloatingAnimation, useSuccessAnimation, triggerHaptic } from '../../utils/animationUtils';
import { Spacing } from '../../theme/premiumTheme';

const EmailVerificationScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { email, password, username, fullName } = route.params || {};
  const { signUp, setActive, isLoaded } = useSignUp();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Entrance animations
  const headerAnimation = useEntranceAnimation(0);
  const iconAnimation = useEntranceAnimation(100);
  const contentAnimation = useEntranceAnimation(200);
  const inputAnimation = useEntranceAnimation(300);
  const buttonAnimation = useEntranceAnimation(400);
  const floatingAnimation = useFloatingAnimation();
  const { animatedStyle: successStyle, celebrate } = useSuccessAnimation();

  // Debug: Log signUp state on mount
  useEffect(() => {
    console.log('📧 [EmailVerify] Screen mounted');
    console.log('📧 [EmailVerify] Params:', { email, username, fullName, hasPassword: !!password });
    console.log('📧 [EmailVerify] isLoaded:', isLoaded);
    console.log('📧 [EmailVerify] signUp exists:', !!signUp);
    console.log('📧 [EmailVerify] signUp status:', signUp?.status);
    console.log('📧 [EmailVerify] signUp emailAddress:', signUp?.emailAddress);
  }, [isLoaded, signUp, email, password, username, fullName]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = useCallback(async () => {
    console.log('📧 [EmailVerify] Starting verification...');
    console.log('📧 [EmailVerify] isLoaded:', isLoaded);
    console.log('📧 [EmailVerify] signUp exists:', !!signUp);
    console.log('📧 [EmailVerify] signUp status:', signUp?.status);
    console.log('📧 [EmailVerify] code entered:', code);

    if (!isLoaded || !signUp) {
      console.log('📧 [EmailVerify] ERROR: Not ready - isLoaded:', isLoaded, 'signUp:', !!signUp);
      setError('Verification is not ready. Please try again.');
      return;
    }

    if (!code.trim()) {
      setError('Please enter the verification code.');
      triggerHaptic('error');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');
    triggerHaptic('buttonPress');

    try {
      console.log('📧 [EmailVerify] Attempting verification with code:', code.trim());
      // Attempt to verify the email address with the code
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      console.log('📧 [EmailVerify] Verification result:', result.status);
      console.log('📧 [EmailVerify] Session ID:', result.createdSessionId);
      console.log('📧 [EmailVerify] Missing fields:', result.missingFields);
      console.log('📧 [EmailVerify] Unverified fields:', result.unverifiedFields);
      console.log('📧 [EmailVerify] Verifications:', JSON.stringify(result.verifications, null, 2));

      if (result.status === 'complete') {
        console.log('📧 [EmailVerify] SUCCESS! Setting active session...');

        // Try to set the active session, but handle React Native compatibility errors
        try {
          await setActive({ session: result.createdSessionId });
          console.log('📧 [EmailVerify] Session activated successfully');
        } catch (setActiveError: any) {
          // Handle known React Native incompatibility with document.hasFocus
          // The session is still valid even if setActive fails with this error
          console.log('📧 [EmailVerify] setActive error (may be RN compatibility):', setActiveError?.message);
          if (!setActiveError?.message?.includes('hasFocus')) {
            // If it's a different error, log but continue anyway
            console.log('📧 [EmailVerify] Unexpected setActive error, but session was created');
          }
        }

        triggerHaptic('success');
        celebrate();

        console.log('📧 [EmailVerify] Navigating to ProfileCreation...');
        // Navigate to profile creation to continue onboarding
        navigation.navigate('ProfileCreation', {
          email: email,
          username: username,
          fullName: fullName,
        });
      } else {
        // Handle other statuses
        console.log('📧 [EmailVerify] Incomplete status:', result.status);
        setError(`Verification incomplete. Status: ${result.status}`);
        triggerHaptic('error');
      }
    } catch (err: any) {
      console.log('📧 [EmailVerify] ERROR:', err);
      console.log('📧 [EmailVerify] Error details:', JSON.stringify(err?.errors || err, null, 2));

      // Check if this is the hasFocus error after successful verification
      if (err?.message?.includes('hasFocus')) {
        console.log('📧 [EmailVerify] hasFocus error but verification may have completed');
        triggerHaptic('success');
        celebrate();
        navigation.navigate('ProfileCreation', {
          email: email,
          username: username,
          fullName: fullName,
        });
        return;
      }

      const errorMessage = err?.errors?.[0]?.message || err?.message || 'Verification failed. Please try again.';
      setError(errorMessage);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  }, [isLoaded, signUp, setActive, code, email, password, username, fullName, navigation, celebrate]);

  const handleResend = useCallback(async () => {
    if (!isLoaded || !signUp) {
      setError('Authentication is not ready. Please try again.');
      return;
    }

    if (cooldown > 0) return;

    setResendLoading(true);
    setMessage('');
    setError('');
    triggerHaptic('buttonPress');

    try {
      // Resend the verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setMessage('Verification code resent! Check your inbox.');
      setCooldown(60); // 60 second cooldown
      triggerHaptic('success');
      celebrate();
    } catch (err: any) {
      const errorMessage = err?.errors?.[0]?.message || err?.message || 'Failed to resend code. Please try again.';
      setError(errorMessage);
      triggerHaptic('error');
    } finally {
      setResendLoading(false);
    }
  }, [isLoaded, signUp, cooldown, celebrate]);

  return (
    <LinearGradient
      colors={['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View style={headerAnimation}>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic('buttonPress');
                    navigation.goBack();
                  }}
                  style={styles.backButton}
                >
                  <Text style={styles.backArrow}>{'<'} </Text>
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.content}>
                <Animated.View style={[iconAnimation, floatingAnimation]}>
                  <Ionicons name="mail-outline" size={60} color="#4CAF50" style={styles.emailIcon} />
                </Animated.View>

                <Animated.View style={contentAnimation}>
                  <Text style={styles.title}>Verify Your Email</Text>
                  <Text style={styles.subtitle}>A verification code has been sent to:</Text>
                  <Text style={styles.email}>{email}</Text>
                  <Text style={styles.info}>Enter the 6-digit code from your email to verify your account.</Text>
                </Animated.View>

                <Animated.View style={[inputAnimation, styles.inputContainer]}>
                  <TextInput
                    style={styles.codeInput}
                    value={code}
                    onChangeText={setCode}
                    placeholder="000000"
                    placeholderTextColor="#B8E6C1"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus={true}
                    textContentType="oneTimeCode"
                    returnKeyType="done"
                    onSubmitEditing={handleVerify}
                  />
                </Animated.View>

                {error ? (
                  <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.fullWidth}>
                    <Text style={styles.error}>{error}</Text>
                  </Animated.View>
                ) : null}

                {message ? (
                  <Animated.View style={[successStyle, styles.fullWidth]} entering={FadeIn} exiting={FadeOut}>
                    <View style={styles.successContainer}>
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                      <Text style={styles.success}>{message}</Text>
                    </View>
                  </Animated.View>
                ) : null}

                <Animated.View style={[buttonAnimation, styles.buttonContainer]}>
                  <AnimatedButton
                    title="Verify Email"
                    onPress={handleVerify}
                    variant="primary"
                    size="large"
                    disabled={loading || !code.trim()}
                    loading={loading}
                    gradient={true}
                    gradientColors={['#4CAF50', '#45A049']}
                    fullWidth={true}
                    hapticFeedback={true}
                  />

                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resendLoading || cooldown > 0}
                    style={styles.resendButton}
                  >
                    <Text style={[styles.resendText, (resendLoading || cooldown > 0) && styles.resendTextDisabled]}>
                      {cooldown > 0
                        ? `Resend code in ${cooldown}s`
                        : resendLoading
                        ? 'Sending...'
                        : 'Resend verification code'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backArrow: {
    fontSize: 18,
    color: '#E8F5E9',
    marginRight: 8,
  },
  backText: {
    color: '#E8F5E9',
    fontWeight: '500',
    fontSize: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emailIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#E8F5E9',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#B8E6C1',
    marginBottom: 8,
    textAlign: 'center',
  },
  email: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  info: {
    fontSize: 15,
    color: '#B8E6C1',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  codeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232, 245, 233, 0.3)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 24,
    fontWeight: '600',
    color: '#E8F5E9',
    textAlign: 'center',
    letterSpacing: 8,
  },
  fullWidth: {
    width: '100%',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  resendButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  resendText: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '500',
  },
  resendTextDisabled: {
    color: 'rgba(76, 175, 80, 0.5)',
  },
  error: {
    color: '#FF6B6B',
    marginBottom: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    width: '100%',
  },
  success: {
    color: '#4CAF50',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginBottom: 12,
    width: '100%',
  },
});

export default EmailVerificationScreen;

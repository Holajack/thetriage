import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSignIn } from '@clerk/clerk-expo';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { useEntranceAnimation, useSuccessAnimation, triggerHaptic } from '../../utils/animationUtils';
import { Spacing } from '../../theme/premiumTheme';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const { signIn, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [successfulCreation, setSuccessfulCreation] = useState(false);

  // Entrance animations
  const headerAnimation = useEntranceAnimation(0);
  const formAnimation = useEntranceAnimation(200);
  const buttonAnimation = useEntranceAnimation(400);
  const { animatedStyle: successStyle, celebrate } = useSuccessAnimation();

  const handleReset = useCallback(async () => {
    if (!isLoaded || !signIn) {
      setError('Authentication is not ready. Please try again.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');
    triggerHaptic('buttonPress');

    try {
      // Start the password reset flow with Clerk
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });

      setSuccessfulCreation(true);
      setMessage('Password reset code sent! Check your inbox for the verification code.');
      triggerHaptic('success');
      celebrate();

      // Navigate to ResetPassword screen where they'll enter the code
      setTimeout(() => {
        navigation.navigate('ResetPassword', { email });
      }, 2000);
    } catch (err: any) {
      const errorMessage = err?.errors?.[0]?.message || err?.message || 'Failed to send reset email. Please try again.';
      setError(errorMessage);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  }, [isLoaded, signIn, email, navigation, celebrate]);

  return (
    <LinearGradient
      colors={['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={headerAnimation}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('buttonPress');
              navigation.goBack();
            }}
            style={styles.backButton}
          >
            <Text style={styles.backArrow}>{'<'} </Text>
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.content}>
          <Animated.View style={formAnimation}>
            <Ionicons name="mail-outline" size={64} color="#4CAF50" style={styles.icon} />
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>Enter your email to receive a password reset link.</Text>
          </Animated.View>

          <Animated.View style={[formAnimation, { width: '100%' }]}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#B8E6C1"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {error ? (
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <Text style={styles.error}>{error}</Text>
              </Animated.View>
            ) : null}
            {message ? (
              <Animated.View style={successStyle} entering={FadeIn} exiting={FadeOut}>
                <View style={styles.successContainer}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={styles.success}>{message}</Text>
                </View>
              </Animated.View>
            ) : null}
          </Animated.View>

          <Animated.View style={[buttonAnimation, { width: '100%' }]}>
            <AnimatedButton
              title="Send Reset Link"
              onPress={handleReset}
              variant="primary"
              size="large"
              disabled={loading || !email}
              loading={loading}
              gradient={true}
              gradientColors={['#4CAF50', '#45A049']}
              fullWidth={true}
              hapticFeedback={true}
            />
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
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 24,
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
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    color: '#E8F5E9',
    borderWidth: 1,
    borderColor: 'rgba(232, 245, 233, 0.3)',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
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
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
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
  },
});

export default ForgotPasswordScreen; 
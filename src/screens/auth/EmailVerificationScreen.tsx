import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { useEntranceAnimation, useFloatingAnimation, useSuccessAnimation, triggerHaptic } from '../../utils/animationUtils';
import { Spacing } from '../../theme/premiumTheme';

const EmailVerificationScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { email } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Entrance animations
  const headerAnimation = useEntranceAnimation(0);
  const iconAnimation = useEntranceAnimation(100);
  const contentAnimation = useEntranceAnimation(200);
  const buttonAnimation = useEntranceAnimation(400);
  const floatingAnimation = useFloatingAnimation();
  const { animatedStyle: successStyle, celebrate } = useSuccessAnimation();

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;

    setLoading(true);
    setMessage('');
    setError('');
    triggerHaptic('buttonPress');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      triggerHaptic('error');
    } else {
      setMessage('Verification email resent! Check your inbox.');
      setCooldown(60); // 60 second cooldown
      triggerHaptic('success');
      celebrate();
    }
  };

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
              navigation.navigate('Login');
            }}
            style={styles.backButton}
          >
            <Text style={styles.backArrow}>{'<'} </Text>
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.content}>
          <Animated.View style={[iconAnimation, floatingAnimation]}>
            <Ionicons name="mail-outline" size={80} color="#4CAF50" style={styles.emailIcon} />
          </Animated.View>

          <Animated.View style={contentAnimation}>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>A verification link has been sent to:</Text>
            <Text style={styles.email}>{email}</Text>
            <Text style={styles.info}>Please check your inbox and click the link to verify your account.</Text>
          </Animated.View>

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

          <Animated.View style={buttonAnimation}>
            <AnimatedButton
              title={
                cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : 'Resend Verification Email'
              }
              onPress={handleResend}
              variant="primary"
              size="large"
              disabled={loading || cooldown > 0}
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
  emailIcon: {
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
    width: '100%',
  },
});

export default EmailVerificationScreen; 
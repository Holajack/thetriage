import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import Animated, { FadeIn, FadeInRight, withSequence, withSpring, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { StaggeredItem } from '../../components/premium/StaggeredList';
import { useEntranceAnimation, useProgressAnimation } from '../../utils/animationUtils';

type AccountCreationNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'AccountCreation'>;
type AccountCreationRouteProp = RouteProp<OnboardingStackParamList, 'AccountCreation'>;

export default function AccountCreationScreen({ route }: { route: AccountCreationRouteProp }) {
  const navigation = useNavigation<AccountCreationNavigationProp>();
  const { signUp, updateOnboarding } = useAuth();
  const headerAnimation = useEntranceAnimation(0);
  const progressAnimation = useProgressAnimation(2 / 5); // Step 2 of 5

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [validationStates, setValidationStates] = useState({
    fullName: false,
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const validateEmail = (email: string) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setValidationStates(prev => ({ ...prev, email: isValid }));
    return isValid;
  }

  const validatePassword = (password: string) => {
    const isValid = password.length >= 6;
    setValidationStates(prev => ({ ...prev, password: isValid }));
    return isValid;
  }

  const handleFullNameChange = (text: string) => {
    setFullName(text);
    setValidationStates(prev => ({ ...prev, fullName: text.trim().length > 0 }));
  }

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    setValidationStates(prev => ({ ...prev, username: text.trim().length > 0 }));
  }

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (text.trim()) validateEmail(text);
  }

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (text) validatePassword(text);
    if (confirmPassword) {
      setValidationStates(prev => ({ ...prev, confirmPassword: text === confirmPassword }));
    }
  }

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    setValidationStates(prev => ({ ...prev, confirmPassword: text === password && text.length > 0 }));
  }

  const handleSignUp = async () => {
    setError('');
    if (!fullName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Please enter your full name.');
      return;
    }
    if (!username.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Please enter a username.');
      return;
    }
    if (!validateEmail(email)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Please enter a valid email address.');
      return;
    }
    if (!validatePassword(password)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Passwords do not match.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    const { error: signUpError } = await signUp(email, password, {
      username: username,
      full_name: fullName
    });
    setIsLoading(false);

    if (signUpError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(signUpError);
      Alert.alert('Sign Up Failed', signUpError);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Account created successfully! Please check your email to verify your account before logging in.');

      // Save focus method immediately after account creation
      if (route.params?.focusMethod) {
        try {
          await updateOnboarding({
            focus_method: route.params.focusMethod
          });
          console.log('✅ Focus method saved after account creation');
        } catch (error) {
          console.error('⚠️ Failed to save focus method after signup:', error);
          // Continue anyway - we'll retry in later screens
        }
      }

      // Navigate to next step in onboarding flow
      navigation.navigate('ProfileCreation', {
        focusMethod: route.params?.focusMethod,
        email: email
      });
    }
  };

  return (
    <LinearGradient
      colors={['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentInsetAdjustmentBehavior="automatic"
        >
          <Animated.View style={[styles.header, headerAnimation]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#E8F5E9" />
              <Text style={styles.backButtonText}>Focus Method</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Your Account</Text>
            <Text style={styles.headerSubtitle}>
              Step 2 of 5 • Let's get your account set up.
            </Text>
          </Animated.View>

          <View style={styles.formContainer}>
            <StaggeredItem index={0} delay="fast">
              <View>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={handleFullNameChange}
                    placeholder="Enter your full name"
                    placeholderTextColor="#B8E6C1"
                    autoCapitalize="words"
                  />
                  {validationStates.fullName && fullName.trim() && (
                    <Animated.View entering={FadeIn.duration(200)} style={styles.validationIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    </Animated.View>
                  )}
                </View>
              </View>
            </StaggeredItem>

            <StaggeredItem index={1} delay="fast">
              <View>
                <Text style={styles.inputLabel}>Username *</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={handleUsernameChange}
                    placeholder="Choose a unique username"
                    placeholderTextColor="#B8E6C1"
                    autoCapitalize="none"
                  />
                  {validationStates.username && username.trim() && (
                    <Animated.View entering={FadeIn.duration(200)} style={styles.validationIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    </Animated.View>
                  )}
                </View>
              </View>
            </StaggeredItem>

            <StaggeredItem index={2} delay="fast">
              <View>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={handleEmailChange}
                    placeholder="you@example.com"
                    placeholderTextColor="#B8E6C1"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {validationStates.email && email.trim() && (
                    <Animated.View entering={FadeIn.duration(200)} style={styles.validationIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    </Animated.View>
                  )}
                </View>
              </View>
            </StaggeredItem>

            <StaggeredItem index={3} delay="fast">
              <View>
                <Text style={styles.inputLabel}>Password *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={handlePasswordChange}
                    placeholder="Enter your password"
                    placeholderTextColor="#B8E6C1"
                    secureTextEntry={!isPasswordVisible}
                  />
                  {validationStates.password && password && (
                    <Animated.View entering={FadeIn.duration(200)} style={styles.validationIconPassword}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    </Animated.View>
                  )}
                  <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.showPasswordButton}>
                    <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={24} color="#B8E6C1" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.passwordHint}>Must be at least 6 characters.</Text>
              </View>
            </StaggeredItem>

            <StaggeredItem index={4} delay="fast">
              <View>
                <Text style={styles.inputLabel}>Confirm Password *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    placeholder="Confirm your password"
                    placeholderTextColor="#B8E6C1"
                    secureTextEntry={!isConfirmPasswordVisible}
                  />
                  {validationStates.confirmPassword && confirmPassword && (
                    <Animated.View entering={FadeIn.duration(200)} style={styles.validationIconPassword}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    </Animated.View>
                  )}
                  <TouchableOpacity onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} style={styles.showPasswordButton}>
                    <Ionicons name={isConfirmPasswordVisible ? "eye-off-outline" : "eye-outline"} size={24} color="#B8E6C1" />
                  </TouchableOpacity>
                </View>
              </View>
            </StaggeredItem>

            {error ? (
              <Animated.View entering={FadeInRight.duration(300)}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}
          </View>
        </ScrollView>
        <View style={styles.bottomContainer}>
          <AnimatedButton
            title="Create Account & Continue"
            onPress={handleSignUp}
            gradient={true}
            gradientColors={['#4CAF50', '#66BB6A', '#4CAF50']}
            size="large"
            fullWidth={true}
            loading={isLoading}
            disabled={isLoading}
            icon={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
            iconPosition="right"
          />
          <View style={styles.progressIndicator}>
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
          </View>
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 300, // Extra space for keyboard and confirm password field
  },
  header: {
    marginBottom: 30,
    alignItems: 'center', // Center header content
  },
  backButton: {
    position: 'absolute',
    top: 0, // Adjust as needed
    left: 0, // Adjust as needed
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10, // Add some padding for easier touch
  },
  backButtonText: {
    color: '#E8F5E9',
    fontSize: 16,
    marginLeft: 6,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E8F5E9',
    textAlign: 'center',
    marginTop: 40, // Add margin if back button is absolutely positioned
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#B8E6C1',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  formContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E8F5E9',
    marginBottom: 8,
    marginTop: 16,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#E8F5E9',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 245, 233, 0.2)',
    width: '100%',
  },
  validationIcon: {
    position: 'absolute',
    right: 15,
    top: '50%',
    marginTop: -10,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  validationIconPassword: {
    position: 'absolute',
    right: 50,
    top: '50%',
    marginTop: -10,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 15,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  passwordHint: {
    fontSize: 13,
    color: '#B8E6C1',
    marginTop: 6,
    marginLeft: 4, // Align with input text
  },
  errorText: {
    color: '#FF6B6B', // A common error color
    fontSize: 14,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 25,
    backgroundColor: 'rgba(15, 36, 25, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(232, 245, 233, 0.1)',
    gap: 20,
  },
  progressIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center', // Align dots vertically
    gap: 10, // Increased gap
    height: 10, // Explicit height for the container
  },
  progressDot: {
    width: 10, // Larger dots
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(232, 245, 233, 0.3)',
  },
  progressDotActive: {
    backgroundColor: '#4CAF50',
    width: 12, // Slightly larger active dot
    height: 12,
    borderRadius: 6,
  },
});

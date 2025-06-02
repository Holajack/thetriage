import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Animated, 
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

type AccountCreationNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'AccountCreation'>;
type AccountCreationRouteProp = RouteProp<OnboardingStackParamList, 'AccountCreation'>;

export default function AccountCreationScreen({ route }: { route: AccountCreationRouteProp }) {
  const navigation = useNavigation<AccountCreationNavigationProp>();
  const { signUp } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  const validatePassword = (password: string) => {
    return password.length >= 6; // Simplified for now
  }

  const handleSignUp = async () => {
    setError('');
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const { error: signUpError } = await signUp(email, password, username, fullName);
    setIsLoading(false);

    if (signUpError) {
      setError(signUpError);
      Alert.alert('Sign Up Failed', signUpError);
    } else {
      Alert.alert('Success', 'Account created successfully! Please check your email to verify your account before logging in.');
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
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
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor="#B8E6C1"
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>Username *</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Choose a unique username"
              placeholderTextColor="#B8E6C1"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#B8E6C1"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Password *</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#B8E6C1"
                secureTextEntry={!isPasswordVisible}
              />
              <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.showPasswordButton}>
                <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={24} color="#B8E6C1" />
              </TouchableOpacity>
            </View>
            <Text style={styles.passwordHint}>Must be at least 6 characters.</Text>


            <Text style={styles.inputLabel}>Confirm Password *</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                placeholderTextColor="#B8E6C1"
                secureTextEntry={!isConfirmPasswordVisible}
              />
              <TouchableOpacity onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} style={styles.showPasswordButton}>
                <Ionicons name={isConfirmPasswordVisible ? "eye-off-outline" : "eye-outline"} size={24} color="#B8E6C1" />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </ScrollView>
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <LinearGradient
                colors={['#4CAF50', '#66BB6A', '#4CAF50']}
                locations={[0, 0.5, 1]}
                style={styles.buttonGradient}
              >
                <Text style={styles.continueButtonText}>Create Account & Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
            )}
          </TouchableOpacity>
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
    paddingBottom: 120, // Ensure space for bottom container
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
    marginBottom: 20, // Add some space before the bottom container might overlap
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E8F5E9',
    marginBottom: 8,
    marginTop: 16, // Space between input fields
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
    width: '100%', // Ensure input takes full width of its container
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative', // For absolute positioning of the button
    width: '100%',
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
    paddingBottom: 25, // Adjusted for safe area and progress dots
    backgroundColor: 'rgba(15, 36, 25, 0.8)', // Slight dark overlay to distinguish
    borderTopWidth: 1,
    borderTopColor: 'rgba(232, 245, 233, 0.1)',
  },
  continueButton: {
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    height: 56, // Fixed height for the button
    justifyContent: 'center', // Center content vertically
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16, // This might be redundant if height is fixed on continueButton
    borderRadius: 12,
    height: '100%', // Ensure gradient fills the button
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
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

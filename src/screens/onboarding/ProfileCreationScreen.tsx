import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type ProfileCreationNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'ProfileCreation'>;
type ProfileCreationRouteProp = RouteProp<OnboardingStackParamList, 'ProfileCreation'>;

export default function ProfileCreationScreen({ route }: { route: ProfileCreationRouteProp }) {
  const { updateOnboarding, updateProfile, user } = useAuth();
  const navigation = useNavigation<ProfileCreationNavigationProp>();
  const { focusMethod, email } = route.params || {}; // Handle undefined params

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [profilePicUri, setProfilePicUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      }
    })();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfilePicUri(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    setError('');
    if (!fullName.trim() || !username.trim()) {
      setError('Please fill in your full name and username.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError(
        'Username must be 3-20 characters long and can only contain letters, numbers, and underscores.'
      );
      return;
    }

    setLoading(true);
    try {
      if (!user || !user.id) {
        setError('User session not found. Please try again.');
        setLoading(false);
        Alert.alert('Error', 'User session not found. Please go back and try creating your account again.');
        return;
      }

      await updateOnboarding({
        id: user.id,
        full_name: fullName,
        username: username,
        avatar_url: profilePicUri || undefined, // Corrected type
        focus_method: focusMethod,
        onboarding_completed: false, // Onboarding is not yet fully completed
      });
      setLoading(false);
      navigation.navigate('PrivacySettings', { focusMethod });
    } catch (e: any) {
      setLoading(false);
      setError(e.message || 'Failed to update profile.');
      Alert.alert('Profile Update Error', e.message || 'An unexpected error occurred.');
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
              <Text style={styles.backButtonText}>Account Creation</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Set Up Your Profile</Text>
            <Text style={styles.headerSubtitle}>
              Step 3 of 5 • Personalize your StudyTracker experience.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
              {profilePicUri ? (
                <Image source={{ uri: profilePicUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera-outline" size={40} color="#B8E6C1" />
                  <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Jane Doe"
              placeholderTextColor="#B8E6C1"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              textContentType="name"
            />

            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., janedoe99"
              placeholderTextColor="#B8E6C1"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              textContentType="username"
            />
            <Text style={styles.usernameHint}>
              3-20 characters. Letters, numbers, and underscores only.
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </ScrollView>

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <LinearGradient
                colors={['#4CAF50', '#66BB6A', '#4CAF50']}
                locations={[0, 0.5, 1]}
                style={styles.buttonGradient}
              >
                <Text style={styles.continueButtonText}>Save Profile & Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
            )}
          </TouchableOpacity>
          <View style={styles.progressIndicator}>
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
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
    paddingBottom: 120, 
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
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
    marginTop: 40, 
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
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(232, 245, 233, 0.3)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#B8E6C1',
    marginTop: 8,
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E8F5E9',
    marginBottom: 8,
    marginTop: 16,
    alignSelf: 'flex-start',
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
  usernameHint: {
    fontSize: 13,
    color: '#B8E6C1',
    marginTop: 6,
    marginLeft: 4,
    alignSelf: 'flex-start',
    width: '100%',
  },
  errorText: {
    color: '#FF6B6B',
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
    width: '100%',
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
  },
  continueButton: {
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    height: 56,
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    height: '100%',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  progressIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    height: 10,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(232, 245, 233, 0.3)',
  },
  progressDotActive: {
    backgroundColor: '#4CAF50',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

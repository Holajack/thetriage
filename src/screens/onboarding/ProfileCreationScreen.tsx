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
import { useTheme } from '../../context/ThemeContext';

type ProfileCreationNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'ProfileCreation'>;
type ProfileCreationRouteProp = RouteProp<OnboardingStackParamList, 'ProfileCreation'>;

export default function ProfileCreationScreen({ route }: { route: ProfileCreationRouteProp }) {
  const { updateOnboarding, updateProfile, user } = useAuth();
  const navigation = useNavigation<ProfileCreationNavigationProp>();
  const { focusMethod, email } = route.params || {}; // Handle undefined params
  const { theme } = useTheme();

  const [profilePicUri, setProfilePicUri] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status === 'granted') {
          setPermissionsGranted(true);
        } else {
          setPermissionsGranted(false);
          console.log('⚠️ Photo library permission not granted');
        }
      } catch (error) {
        console.error('❌ Permission request failed:', error);
        setPermissionsGranted(false);
      }
    })();
  }, []);

  const pickImage = async () => {
    if (!permissionsGranted) {
      Alert.alert(
        'Permission Required',
        'To add a profile photo, we need access to your photo library. You can still continue without adding a photo.',
        [
          { text: 'Continue Without Photo', style: 'cancel' },
          { 
            text: 'Grant Permission', 
            onPress: async () => {
              try {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status === 'granted') {
                  setPermissionsGranted(true);
                  pickImage(); // Recursively call after permission granted
                }
              } catch (error) {
                console.error('❌ Permission request failed:', error);
              }
            }
          }
        ]
      );
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfilePicUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ Image picker failed:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleContinue = async () => {
    setError('');
    setLoading(true);
    
    try {
      if (!user || !user.id) {
        setError('User session not found. Please try again.');
        setLoading(false);
        Alert.alert('Error', 'User session not found. Please go back and try creating your account again.');
        return;
      }

      // Only update profile picture and bio if provided
      const updateData: any = {
        id: user.id,
        focus_method: focusMethod,
        onboarding_completed: false, // Onboarding is not yet fully completed
      };

      if (profilePicUri) {
        updateData.avatar_url = profilePicUri;
      }

      if (bio.trim()) {
        updateData.bio = bio.trim();
      }

      await updateOnboarding(updateData);
      setLoading(false);
      navigation.navigate('StudyPreferences', { focusMethod });
    } catch (e: any) {
      setLoading(false);
      setError(e.message || 'Failed to update profile.');
      Alert.alert('Profile Update Error', e.message || 'An unexpected error occurred.');
    }
  };

  return (
    <LinearGradient
      colors={theme.isDark ? ['#000000', '#1a1a1a', '#2a2a2a', '#1a1a1a'] : ['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A']}
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
              <Ionicons name="arrow-back" size={24} color={theme.isDark ? theme.text : '#E8F5E9'} />
              <Text style={[styles.backButtonText, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>Account Creation</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>Add Your Profile Photo</Text>
            <Text style={[styles.headerSubtitle, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>
              Step 3 of 6 • Optional: Add a photo and bio to personalize your profile.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <TouchableOpacity style={[styles.avatarContainer, { backgroundColor: theme.isDark ? theme.card : 'rgba(255, 255, 255, 0.1)', borderColor: theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.3)' }]} onPress={pickImage}>
              {profilePicUri ? (
                <Image source={{ uri: profilePicUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera-outline" size={40} color={theme.isDark ? theme.textSecondary : '#B8E6C1'} />
                  <Text style={[styles.avatarPlaceholderText, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>Bio (Optional)</Text>
            <TextInput
              style={[styles.input, styles.bioInput, { backgroundColor: theme.isDark ? theme.card : 'rgba(255, 255, 255, 0.05)', color: theme.isDark ? theme.text : '#E8F5E9', borderColor: theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.2)' }]}
              placeholder="Tell us a bit about yourself..."
              placeholderTextColor={theme.isDark ? theme.textSecondary : '#B8E6C1'}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              maxLength={150}
              textAlignVertical="top"
            />
            <Text style={[styles.bioHint, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>
              {bio.length}/150 characters
            </Text>

            {error ? <Text style={[styles.errorText, { backgroundColor: theme.isDark ? 'rgba(255, 107, 107, 0.15)' : 'rgba(255, 107, 107, 0.1)', borderColor: theme.isDark ? 'rgba(255, 107, 107, 0.4)' : 'rgba(255, 107, 107, 0.3)' }]}>{error}</Text> : null}
          </View>
        </ScrollView>

        <View style={[styles.bottomContainer, { backgroundColor: theme.isDark ? theme.background + 'CC' : 'rgba(15, 36, 25, 0.8)', borderTopColor: theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.1)' }]}>
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
    fontSize: 16,
    marginLeft: 6,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40, 
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
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
    marginTop: 8,
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
    alignSelf: 'flex-start',
    width: '100%',
  },
  input: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    width: '100%',
  },
  bioInput: {
    height: 80,
    paddingTop: 15,
  },
  bioHint: {
    fontSize: 13,
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
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
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
    borderTopWidth: 1,
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

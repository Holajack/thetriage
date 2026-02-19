import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { StaggeredItem } from '../../components/premium/StaggeredList';
import { useEntranceAnimation } from '../../utils/animationUtils';
import { ShimmerLoader } from '../../components/premium/ShimmerLoader';
import { useConvexProfile } from '../../hooks/useConvex';
import NoraSpeechBubble from '../../components/onboarding/NoraSpeechBubble';

type ProfileCreationNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'ProfileCreation'>;
type ProfileCreationRouteProp = RouteProp<OnboardingStackParamList, 'ProfileCreation'>;

export default function ProfileCreationScreen({ route }: { route: ProfileCreationRouteProp }) {
  const { updateOnboarding } = useAuth();
  const { user: clerkUser } = useUser();
  const { updateProfile } = useConvexProfile();
  const navigation = useNavigation<ProfileCreationNavigationProp>();
  const { email } = route.params || {};
  const { theme } = useTheme();
  const headerAnimation = useEntranceAnimation(0);

  const [profilePicUri, setProfilePicUri] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [university, setUniversity] = useState('');
  const [location, setLocation] = useState('');
  const [classes, setClasses] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

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
                  pickImage();
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setImageLoading(true);
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfilePicUri(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setImageLoading(false);
    } catch (error) {
      console.error('❌ Image picker failed:', error);
      setImageLoading(false);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleContinue = async () => {
    setError('');
    setLoading(true);

    try {
      // Build profile data from form inputs
      const profileData: any = {};

      if (profilePicUri) profileData.avatarUrl = profilePicUri;
      if (bio.trim()) profileData.bio = bio.trim();
      if (university.trim()) profileData.university = university.trim();
      if (location.trim()) profileData.location = location.trim();
      if (classes.trim()) profileData.classes = classes.trim();

      // Update profile via Convex if there's data to save
      if (Object.keys(profileData).length > 0) {
        try {
          await updateProfile(profileData);
          console.log('✅ Profile data saved via Convex');
        } catch (profileError) {
          console.error('❌ Failed to update profile:', profileError);
          console.log('📸 [ProfileCreation] Profile update failed, continuing anyway');
        }
      }

      // Save avatar to onboarding preferences
      if (profilePicUri) {
        try {
          await updateOnboarding({ avatar_url: profilePicUri });
          console.log('✅ Onboarding avatar saved');
        } catch (onboardErr) {
          console.log('📸 [ProfileCreation] Onboarding update failed (non-critical):', onboardErr);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoading(false);
      navigation.navigate('TrailBuddyOnboarding');

    } catch (e: any) {
      setLoading(false);
      // Non-blocking: allow user to continue even if save fails
      console.error('📸 [ProfileCreation] Error:', e.message);
      Alert.alert(
        'Profile Save Issue',
        'Your profile info could not be saved right now. You can update it later in Settings. Continue anyway?',
        [
          { text: 'Try Again', onPress: () => handleContinue(), style: 'cancel' },
          { text: 'Continue', onPress: () => navigation.navigate('TrailBuddyOnboarding') },
        ]
      );
    }
  };

  return (
    <LinearGradient
      colors={theme.isDark ? ['#000000', '#1a1a1a', '#2a2a2a', '#1a1a1a'] : ['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.header, headerAnimation]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.isDark ? theme.text : '#E8F5E9'} />
              <Text style={[styles.backButtonText, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>Back</Text>
            </TouchableOpacity>
          </Animated.View>

          <NoraSpeechBubble message="Let's set up your profile! Add a photo and tell us a bit about yourself — you can always change this later." />

          <View style={styles.formContainer}>
            <StaggeredItem index={0} delay="normal">
              <TouchableOpacity style={[styles.avatarContainer, { backgroundColor: theme.isDark ? theme.card : 'rgba(255, 255, 255, 0.1)', borderColor: theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.3)' }]} onPress={pickImage}>
                {imageLoading ? (
                  <ShimmerLoader variant="circle" height={120} />
                ) : profilePicUri ? (
                  <Animated.Image entering={ZoomIn.duration(400)} source={{ uri: profilePicUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera-outline" size={40} color={theme.isDark ? theme.textSecondary : '#B8E6C1'} />
                    <Text style={[styles.avatarPlaceholderText, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </StaggeredItem>

            <StaggeredItem index={1} delay="fast" style={{ width: '100%' }}>
              <View>
                <Text style={[styles.inputLabel, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>Bio (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.bioInput, { backgroundColor: theme.isDark ? theme.card : 'rgba(255, 255, 255, 0.05)', color: theme.isDark ? theme.text : '#E8F5E9', borderColor: theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.2)' }]}
                  placeholder="Tell us a bit about yourself..."
                  placeholderTextColor={theme.isDark ? theme.textSecondary : '#B8E6C1'}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                  maxLength={180}
                  textAlignVertical="top"
                  scrollEnabled={true}
                />
                <Text style={[styles.bioHint, { color: theme.isDark ? theme.textSecondary : '#B8E6C1' }]}>
                  {bio.length}/180 characters
                </Text>
              </View>
            </StaggeredItem>

            <StaggeredItem index={2} delay="fast" style={{ width: '100%' }}>
              <View>
                <Text style={[styles.inputLabel, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>University / School (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.isDark ? theme.card : 'rgba(255, 255, 255, 0.05)', color: theme.isDark ? theme.text : '#E8F5E9', borderColor: theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.2)' }]}
                  placeholder="Enter your university or school"
                  placeholderTextColor={theme.isDark ? theme.textSecondary : '#B8E6C1'}
                  value={university}
                  onChangeText={setUniversity}
                />
              </View>
            </StaggeredItem>

            <StaggeredItem index={3} delay="fast" style={{ width: '100%' }}>
              <View>
                <Text style={[styles.inputLabel, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>Location (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.isDark ? theme.card : 'rgba(255, 255, 255, 0.05)', color: theme.isDark ? theme.text : '#E8F5E9', borderColor: theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.2)' }]}
                  placeholder="City, Country"
                  placeholderTextColor={theme.isDark ? theme.textSecondary : '#B8E6C1'}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </StaggeredItem>

            <StaggeredItem index={4} delay="fast" style={{ width: '100%' }}>
              <View>
                <Text style={[styles.inputLabel, { color: theme.isDark ? theme.text : '#E8F5E9' }]}>Current Classes (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.isDark ? theme.card : 'rgba(255, 255, 255, 0.05)', color: theme.isDark ? theme.text : '#E8F5E9', borderColor: theme.isDark ? theme.border : 'rgba(232, 245, 233, 0.2)' }]}
                  placeholder="e.g., Math 101, Physics 202"
                  placeholderTextColor={theme.isDark ? theme.textSecondary : '#B8E6C1'}
                  value={classes}
                  onChangeText={setClasses}
                />
              </View>
            </StaggeredItem>

            {error ? <Text style={[styles.errorText, { backgroundColor: theme.isDark ? 'rgba(255, 107, 107, 0.15)' : 'rgba(255, 107, 107, 0.1)', borderColor: theme.isDark ? 'rgba(255, 107, 107, 0.4)' : 'rgba(255, 107, 107, 0.3)' }]}>{error}</Text> : null}
          </View>
        </ScrollView>

        <View style={styles.bottomContainer}>
          <AnimatedButton
            title="Save Profile & Continue"
            onPress={handleContinue}
            gradient={true}
            gradientColors={['#4CAF50', '#66BB6A', '#4CAF50']}
            size="large"
            fullWidth={true}
            loading={loading}
            disabled={loading}
            icon={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
            iconPosition="right"
          />
          <View style={styles.progressIndicator}>
            <View style={[styles.progressDot, styles.progressDotCompleted]} />
            <View style={[styles.progressDot, styles.progressDotCompleted]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
          </View>
        </View>
        </KeyboardAvoidingView>
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
    paddingBottom: 20,
  },
  header: {
    marginBottom: 10,
    height: 44,
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 6,
    fontWeight: '500',
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
    minHeight: 80,
    maxHeight: 100,
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 16,
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
  progressDotCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.6)',
  },
});

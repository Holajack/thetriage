import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, Image, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useConvexProfile } from '../../../hooks/useConvex';
import * as Localization from 'expo-localization';
import Slider from '@react-native-community/slider';
import DropDownPicker from 'react-native-dropdown-picker';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
const { useUserAppData } = require('../../../utils/userAppData');

const PRIVACY_OPTIONS = [
  { label: 'Do Not Show', value: 'none' },
  { label: 'Only my Friends', value: 'friends' },
  { label: 'Everyone', value: 'everyone' },
];

export const ProfileCustomizationScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { profile, updateProfile, uploadProfileImage } = useConvexProfile();
  const { signOut, refreshUserData } = useAuth();
  const { refetch } = useUserAppData();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    fullNameVisibility: 'none',
    universityVisibility: 'none',
    locationVisibility: 'none',
    classesVisibility: 'none',
  });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Privacy dropdown states
  const [fullNameOpen, setFullNameOpen] = useState(false);
  const [universityOpen, setUniversityOpen] = useState(false);
  const [locationPrivacyOpen, setLocationPrivacyOpen] = useState(false);
  const [classesOpen, setClassesOpen] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Customize Profile',
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        fullNameVisibility: profile.fullNameVisibility || 'none',
        universityVisibility: profile.universityVisibility || 'none',
        locationVisibility: profile.locationVisibility || 'none',
        classesVisibility: profile.classesVisibility || 'none',
      });
      setAvatar(profile.avatar_url || null);
    }
  }, [profile]);

  // Only one privacy dropdown open at a time
  const onFullNameOpen = useCallback(() => {
    setUniversityOpen(false);
    setLocationPrivacyOpen(false);
    setClassesOpen(false);
  }, []);
  const onUniversityOpen = useCallback(() => {
    setFullNameOpen(false);
    setLocationPrivacyOpen(false);
    setClassesOpen(false);
  }, []);
  const onLocationPrivacyOpen = useCallback(() => {
    setFullNameOpen(false);
    setUniversityOpen(false);
    setClassesOpen(false);
  }, []);
  const onClassesOpen = useCallback(() => {
    setFullNameOpen(false);
    setUniversityOpen(false);
    setLocationPrivacyOpen(false);
  }, []);

  const secondaryTextColor = (theme as any).textSecondary || `${theme.text}99`;
  const borderColor = (theme as any).border || '#E0E0E0';
  const cardColor = (theme as any).card || '#FFFFFF';

  const handleInputChange = (key: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow access to your photos to update your profile image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploadingPhoto(true);
      const uri = result.assets[0].uri;
      const { publicUrl } = await uploadProfileImage(uri);
      await updateProfile({ avatar_url: publicUrl });
      setAvatar(publicUrl);
      if (typeof refetch === 'function') {
        try {
          await refetch();
        } catch (refetchError) {
          console.warn('ProfileCustomization: Failed to refetch user data:', refetchError);
        }
      }
      try {
        await refreshUserData();
      } catch (refreshError) {
        console.warn('ProfileCustomization: Failed to refresh auth context user:', refreshError);
      }
      Alert.alert('Success', 'Profile photo updated successfully.');
    } catch (error: any) {
      console.error('Profile photo update error:', error);
      Alert.alert('Error', 'We could not update your profile photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        full_name: formData.fullName.trim(),
        username: formData.username.trim(),
        bio: formData.bio.trim(),
        location: formData.location.trim(),
        website: formData.website.trim(),
        fullNameVisibility: formData.fullNameVisibility,
        universityVisibility: formData.universityVisibility,
        locationVisibility: formData.locationVisibility,
        classesVisibility: formData.classesVisibility,
      });
      if (typeof refetch === 'function') {
        try {
          await refetch();
        } catch (refetchError) {
          console.warn('ProfileCustomization: Failed to refetch user data:', refetchError);
        }
      }
      try {
        await refreshUserData();
      } catch (refreshError) {
        console.warn('ProfileCustomization: Failed to refresh auth context user:', refreshError);
      }
      Alert.alert('Profile Updated', 'Your profile and privacy settings have been saved.');
    } catch (error: any) {
      console.error('Profile save error:', error);
      Alert.alert('Error', 'Unable to save your profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
    } catch (error: any) {
      console.error('Sign out error:', error);
      setLoggingOut(false);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.customizationSafeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <KeyboardAwareScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          enableOnAndroid={true}
          extraScrollHeight={80}
        >
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={[
                styles.avatarTouch,
                { borderColor: theme.primary + '55' },
                uploadingPhoto && { opacity: 0.7 },
              ]}
              onPress={handlePickImage}
              activeOpacity={0.85}
              disabled={uploadingPhoto}
            >
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImageLarge} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '22' }]}>
                  <Ionicons name="person" size={52} color={theme.primary} />
                </View>
              )}
              <View style={[styles.avatarEditBadge, { backgroundColor: cardColor }]}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Ionicons name="camera" size={18} color={theme.primary} />
                )}
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarHelpText, { color: secondaryTextColor }]}>
              Tap to update your profile photo.
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>Profile Details</Text>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Display Name</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: cardColor, borderColor, color: theme.text },
                ]}
                value={formData.fullName}
                onChangeText={text => handleInputChange('fullName', text)}
                placeholder="Add your display name"
                placeholderTextColor={secondaryTextColor}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Username</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: cardColor, borderColor, color: theme.text },
                ]}
                value={formData.username}
                onChangeText={text => handleInputChange('username', text)}
                placeholder="Choose a username"
                placeholderTextColor={secondaryTextColor}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Bio</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  { backgroundColor: cardColor, borderColor, color: theme.text },
                ]}
                value={formData.bio}
                onChangeText={text => handleInputChange('bio', text)}
                placeholder="Share a bit about yourself, your goals, or your study focus."
                placeholderTextColor={secondaryTextColor}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Location</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: cardColor, borderColor, color: theme.text },
                ]}
                value={formData.location}
                onChangeText={text => handleInputChange('location', text)}
                placeholder="City, Country"
                placeholderTextColor={secondaryTextColor}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Website</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: cardColor, borderColor, color: theme.text },
                ]}
                value={formData.website}
                onChangeText={text => handleInputChange('website', text)}
                placeholder="https://your-site.com"
                placeholderTextColor={secondaryTextColor}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>Privacy Settings</Text>
            <Text style={[styles.privacyDescription, { color: secondaryTextColor }]}>
              Control who can see your profile information in the community.
            </Text>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Full Name Visibility</Text>
              <Text style={[styles.subtext, { color: secondaryTextColor }]}>
                Control who can see your full name
              </Text>
              <DropDownPicker
                open={fullNameOpen}
                setOpen={setFullNameOpen}
                onOpen={onFullNameOpen}
                value={formData.fullNameVisibility || ''}
                setValue={cb => setFormData(f => ({ ...f, fullNameVisibility: typeof cb === 'function' ? cb(f.fullNameVisibility) : cb }))}
                items={PRIVACY_OPTIONS}
                style={[styles.dropdown, { backgroundColor: cardColor, borderColor }]}
                dropDownContainerStyle={[styles.dropdownContainer, { backgroundColor: cardColor, borderColor, zIndex: 4000, elevation: 4000 }]}
                zIndex={4000}
                zIndexInverse={1000}
                listMode="SCROLLVIEW"
                onChangeValue={val => setFormData(f => ({ ...f, fullNameVisibility: val || '' }))}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>University Visibility</Text>
              <Text style={[styles.subtext, { color: secondaryTextColor }]}>
                Control who can see your university or school
              </Text>
              <DropDownPicker
                open={universityOpen}
                setOpen={setUniversityOpen}
                onOpen={onUniversityOpen}
                value={formData.universityVisibility || ''}
                setValue={cb => setFormData(f => ({ ...f, universityVisibility: typeof cb === 'function' ? cb(f.universityVisibility) : cb }))}
                items={PRIVACY_OPTIONS}
                style={[styles.dropdown, { backgroundColor: cardColor, borderColor }]}
                dropDownContainerStyle={[styles.dropdownContainer, { backgroundColor: cardColor, borderColor, zIndex: 3000, elevation: 3000 }]}
                zIndex={3000}
                zIndexInverse={2000}
                listMode="SCROLLVIEW"
                onChangeValue={val => setFormData(f => ({ ...f, universityVisibility: val || '' }))}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Location Visibility</Text>
              <Text style={[styles.subtext, { color: secondaryTextColor }]}>
                Control who can see your location
              </Text>
              <DropDownPicker
                open={locationPrivacyOpen}
                setOpen={setLocationPrivacyOpen}
                onOpen={onLocationPrivacyOpen}
                value={formData.locationVisibility || ''}
                setValue={cb => setFormData(f => ({ ...f, locationVisibility: typeof cb === 'function' ? cb(f.locationVisibility) : cb }))}
                items={PRIVACY_OPTIONS}
                style={[styles.dropdown, { backgroundColor: cardColor, borderColor }]}
                dropDownContainerStyle={[styles.dropdownContainer, { backgroundColor: cardColor, borderColor, zIndex: 2000, elevation: 2000 }]}
                zIndex={2000}
                zIndexInverse={3000}
                listMode="SCROLLVIEW"
                onChangeValue={val => setFormData(f => ({ ...f, locationVisibility: val || '' }))}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Classes Visibility</Text>
              <Text style={[styles.subtext, { color: secondaryTextColor }]}>
                Control who can see your current classes
              </Text>
              <DropDownPicker
                open={classesOpen}
                setOpen={setClassesOpen}
                onOpen={onClassesOpen}
                value={formData.classesVisibility || ''}
                setValue={cb => setFormData(f => ({ ...f, classesVisibility: typeof cb === 'function' ? cb(f.classesVisibility) : cb }))}
                items={PRIVACY_OPTIONS}
                style={[styles.dropdown, { backgroundColor: cardColor, borderColor }]}
                dropDownContainerStyle={[styles.dropdownContainer, { backgroundColor: cardColor, borderColor, zIndex: 1000, elevation: 1000 }]}
                zIndex={1000}
                zIndexInverse={4000}
                listMode="SCROLLVIEW"
                onChangeValue={val => setFormData(f => ({ ...f, classesVisibility: val || '' }))}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButtonLarge,
              { backgroundColor: theme.primary },
              (saving || uploadingPhoto) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            activeOpacity={0.9}
            disabled={saving || uploadingPhoto}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.logoutButton,
              { borderColor: '#E53935', backgroundColor: theme.background },
              loggingOut && styles.saveButtonDisabled,
            ]}
            onPress={handleLogout}
            activeOpacity={0.9}
            disabled={loggingOut}
          >
            <Text style={[styles.logoutButtonText, { color: '#E53935' }]}>
              {loggingOut ? 'Signing Out...' : 'Log Out'}
            </Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export const PersonalInformationScreen = () => {
  const { profile, updateProfile } = useConvexProfile();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
  });

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: 'Personal Information',
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        email: profile.email || '',
        fullName: profile.full_name || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile({
        username: formData.username,
        email: formData.email,
        full_name: formData.fullName,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Your information has been updated successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update your information. Please try again.');
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        email: profile.email || '',
        fullName: profile.full_name || '',
      });
    }
    setIsEditing(false);
  };

  const isDarkMode = theme.isDark;
  const formBackground = isDarkMode ? (theme.surface ?? '#1E1E1E') : '#fff';
  const disabledBackground = isDarkMode ? '#303030' : '#F5F5F5';
  const fieldBorderColor = theme.border ?? '#E0E0E0';
  const textColor = theme.text ?? '#333';
  const secondaryText = theme.textSecondary ?? '#666';
  const accentColor = theme.primary ?? '#4CAF50';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <KeyboardAwareScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ flexGrow: 1 }} enableOnAndroid={true} extraScrollHeight={80}>
        <View style={[styles.header, { borderBottomColor: fieldBorderColor, backgroundColor: theme.background }]}>
          <View style={{ flex: 1 }} />
          {!isEditing ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={20} color={accentColor} />
              <Text style={[styles.editButtonText, { color: accentColor }]}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5' }]}
                onPress={handleCancel}
              >
                <Text style={[styles.actionButtonText, { color: secondaryText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: accentColor }]}
                onPress={handleSave}
              >
                <Text style={[styles.actionButtonText, styles.saveButtonText]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: textColor }]}>Username</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: formBackground, borderColor: fieldBorderColor, color: textColor },
                !isEditing && { backgroundColor: disabledBackground, color: secondaryText },
              ]}
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              editable={isEditing}
              placeholder="Enter your username"
              placeholderTextColor={secondaryText}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: textColor }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: formBackground, borderColor: fieldBorderColor, color: textColor },
                !isEditing && { backgroundColor: disabledBackground, color: secondaryText },
              ]}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              editable={isEditing}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={secondaryText}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: textColor }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: formBackground, borderColor: fieldBorderColor, color: textColor },
                !isEditing && { backgroundColor: disabledBackground, color: secondaryText },
              ]}
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              editable={isEditing}
              placeholder="Enter your full name"
              placeholderTextColor={secondaryText}
            />
          </View>
          <Text style={[styles.infoText, { color: secondaryText }]}>
            Your personal information helps us personalize your experience and keep your account secure.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
};

export const EducationScreen = () => {
  const { profile, updateProfile } = useConvexProfile();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    university: '',
    major: '',
    classes: '',
  });

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: 'Education',
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  useEffect(() => {
    if (profile) {
      setFormData({
        university: profile.university || '',
        major: profile.major || '',
        classes: profile.classes || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile({
        university: formData.university,
        major: formData.major,
        classes: formData.classes,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Your education information has been updated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update your education information.');
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        university: profile.university || '',
        major: profile.major || '',
        classes: profile.classes || '',
      });
    }
    setIsEditing(false);
  };

  const isDarkMode = theme.isDark;
  const formBackground = isDarkMode ? (theme.surface ?? '#1E1E1E') : '#fff';
  const disabledBackground = isDarkMode ? '#303030' : '#F5F5F5';
  const fieldBorderColor = theme.border ?? '#E0E0E0';
  const textColor = theme.text ?? '#333';
  const secondaryText = theme.textSecondary ?? '#666';
  const accentColor = theme.primary ?? '#4CAF50';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <KeyboardAwareScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ flexGrow: 1 }} enableOnAndroid={true} extraScrollHeight={80}>
        <View style={[styles.header, { borderBottomColor: fieldBorderColor, backgroundColor: theme.background }]}>
          <View style={{ flex: 1 }} />
          {!isEditing ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={20} color={accentColor} />
              <Text style={[styles.editButtonText, { color: accentColor }]}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5' }]}
                onPress={handleCancel}
              >
                <Text style={[styles.actionButtonText, { color: secondaryText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: accentColor }]} 
                onPress={handleSave}
              >
                <Text style={[styles.actionButtonText, styles.saveButtonText]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: textColor }]}>University / School</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: formBackground, borderColor: fieldBorderColor, color: textColor },
                !isEditing && { backgroundColor: disabledBackground, color: secondaryText },
              ]}
              value={formData.university}
              onChangeText={(text) => setFormData({ ...formData, university: text })}
              editable={isEditing}
              placeholder="Enter your university or school"
              placeholderTextColor={secondaryText}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: textColor }]}>Major / Field of Study</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: formBackground, borderColor: fieldBorderColor, color: textColor },
                !isEditing && { backgroundColor: disabledBackground, color: secondaryText },
              ]}
              value={formData.major}
              onChangeText={(text) => setFormData({ ...formData, major: text })}
              editable={isEditing}
              placeholder="Enter your major or field of study"
              placeholderTextColor={secondaryText}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: textColor }]}>Current Classes</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: formBackground, borderColor: fieldBorderColor, color: textColor },
                !isEditing && { backgroundColor: disabledBackground, color: secondaryText },
              ]}
              value={formData.classes}
              onChangeText={(text) => setFormData({ ...formData, classes: text })}
              editable={isEditing}
              placeholder="List your current classes (comma separated)"
              multiline
              placeholderTextColor={secondaryText}
            />
          </View>
          <Text style={[styles.infoText, { color: secondaryText }]}> 
            Keeping your education information up to date helps us tailor your study experience.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
};

const TIME_ZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
];

export const LocationAndTimeScreen = () => {
  const { profile, updateProfile } = useConvexProfile();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    location: '',
    timeZone: '',
  });

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: 'Location and Time',
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  useEffect(() => {
    if (profile) {
      setFormData({
        location: profile.location || '',
        timeZone: profile.timeZone || '',
      });
    }
    
    if (!profile?.timeZone) {
      const deviceTimeZone = Localization.timezone;
      setFormData((prev) => ({ ...prev, timeZone: deviceTimeZone }));
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile({
        location: formData.location,
        timeZone: formData.timeZone,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Your location and time zone have been updated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update your location and time zone.');
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        location: profile.location || '',
        timeZone: profile.timeZone || Localization.timezone,
      });
    }
    setIsEditing(false);
  };

  const isDarkMode = theme.isDark;
  const formBackground = isDarkMode ? (theme.surface ?? '#1E1E1E') : '#fff';
  const disabledBackground = isDarkMode ? '#303030' : '#F5F5F5';
  const fieldBorderColor = theme.border ?? '#E0E0E0';
  const textColor = theme.text ?? '#333';
  const secondaryText = theme.textSecondary ?? '#666';
  const accentColor = theme.primary ?? '#4CAF50';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <KeyboardAwareScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ flexGrow: 1 }} enableOnAndroid={true} extraScrollHeight={80}>
        <View style={[styles.header, { borderBottomColor: fieldBorderColor, backgroundColor: theme.background }]}>
          <View style={{ flex: 1 }} />
          {!isEditing ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={20} color={accentColor} />
              <Text style={[styles.editButtonText, { color: accentColor }]}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5' }]}
                onPress={handleCancel}
              >
                <Text style={[styles.actionButtonText, { color: secondaryText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: accentColor }]} 
                onPress={handleSave}
              >
                <Text style={[styles.actionButtonText, styles.saveButtonText]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: textColor }]}>Location</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: formBackground, borderColor: fieldBorderColor, color: textColor },
                !isEditing && { backgroundColor: disabledBackground, color: secondaryText },
              ]}
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              editable={isEditing}
              placeholder="Enter your location"
              placeholderTextColor={secondaryText}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: textColor }]}>Time Zone</Text>
            {isEditing ? (
              <View style={styles.pickerWrapper}>
                <DropDownPicker
                  open={!!formData.timeZone}
                  setOpen={() => {}}
                  value={formData.timeZone || ''}
                  setValue={cb => setFormData(f => ({ ...f, timeZone: typeof cb === 'function' ? cb(f.timeZone) : cb }))}
                  items={TIME_ZONES.map((tz) => ({ label: tz, value: tz }))}
                  onChangeValue={val => setFormData(f => ({ ...f, timeZone: val || '' }))}
                  style={[styles.dropdown, { backgroundColor: formBackground, borderColor: fieldBorderColor }]}
                  dropDownContainerStyle={[styles.dropdownContainer, { backgroundColor: formBackground, borderColor: fieldBorderColor, zIndex: 5000, elevation: 5000 }]}
                  zIndex={5000}
                  zIndexInverse={500}
                  listMode="SCROLLVIEW"
                />
              </View>
            ) : (
              <Text style={[styles.valueText, { color: textColor }]}>{formData.timeZone || Localization.timezone}</Text>
            )}
          </View>
          <Text style={[styles.infoText, { color: secondaryText }]}>
            Keeping your location and time zone up to date helps us provide accurate scheduling and reminders.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
};

export const PrivacyScreen = () => {
  const { profile, updateProfile } = useConvexProfile();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: 'Privacy',
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  // Dropdown state for each field
  const [fullNameOpen, setFullNameOpen] = useState(false);
  const [universityOpen, setUniversityOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [classesOpen, setClassesOpen] = useState(false);

  const [formData, setFormData] = useState({
    fullNameVisibility: 'none',
    universityVisibility: 'none',
    locationVisibility: 'none',
    classesVisibility: 'none',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fullNameVisibility: profile.fullNameVisibility || 'none',
        universityVisibility: profile.universityVisibility || 'none',
        locationVisibility: profile.locationVisibility || 'none',
        classesVisibility: profile.classesVisibility || 'none',
      });
    }
  }, [profile]);

  // Only one dropdown open at a time
  const onFullNameOpen = useCallback(() => {
    setUniversityOpen(false);
    setLocationOpen(false);
    setClassesOpen(false);
  }, []);
  const onUniversityOpen = useCallback(() => {
    setFullNameOpen(false);
    setLocationOpen(false);
    setClassesOpen(false);
  }, []);
  const onLocationOpen = useCallback(() => {
    setFullNameOpen(false);
    setUniversityOpen(false);
    setClassesOpen(false);
  }, []);
  const onClassesOpen = useCallback(() => {
    setFullNameOpen(false);
    setUniversityOpen(false);
    setLocationOpen(false);
  }, []);

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      setIsEditing(false);
      Alert.alert('Success', 'Your privacy settings have been updated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update your privacy settings.');
    }
  };

  const handleCancel = () => {
    setFormData({
      fullNameVisibility: 'none',
      universityVisibility: 'none',
      locationVisibility: 'none',
      classesVisibility: 'none',
    });
    setIsEditing(false);
  };

  const isDarkMode = theme.isDark;
  const formBackground = isDarkMode ? (theme.surface ?? '#1E1E1E') : '#fff';
  const disabledBackground = isDarkMode ? '#303030' : '#F5F5F5';
  const fieldBorderColor = theme.border ?? '#E0E0E0';
  const textColor = theme.text ?? '#333';
  const secondaryText = theme.textSecondary ?? '#666';
  const accentColor = theme.primary ?? '#4CAF50';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <KeyboardAwareScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ flexGrow: 1 }} enableOnAndroid={true} extraScrollHeight={80}>
        <View style={[styles.header, { borderBottomColor: fieldBorderColor, backgroundColor: theme.background }]}>
          <View style={{ flex: 1 }} />
          {!isEditing ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={20} color={accentColor} />
              <Text style={[styles.editButtonText, { color: accentColor }]}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5' }]}
                onPress={handleCancel}
              >
                <Text style={[styles.actionButtonText, { color: secondaryText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: accentColor }]} 
                onPress={handleSave}
              >
                <Text style={[styles.actionButtonText, styles.saveButtonText]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          <View style={styles.fieldContainer}>
            <Text style={[styles.labelBold, { color: textColor }]}>Full Name</Text>
            <Text style={[styles.subtext, { color: secondaryText }]}>Control who can see your full name in the community.</Text>
            <DropDownPicker
              open={fullNameOpen}
              setOpen={setFullNameOpen}
              onOpen={onFullNameOpen}
              value={formData.fullNameVisibility || ''}
              setValue={cb => setFormData(f => ({ ...f, fullNameVisibility: typeof cb === 'function' ? cb(f.fullNameVisibility) : cb }))}
              items={PRIVACY_OPTIONS}
              disabled={!isEditing}
              style={[styles.dropdown, { backgroundColor: formBackground, borderColor: fieldBorderColor }]}
              dropDownContainerStyle={[styles.dropdownContainer, { backgroundColor: formBackground, borderColor: fieldBorderColor, zIndex: 4000, elevation: 4000 }]}
              zIndex={4000}
              zIndexInverse={1000}
              listMode="SCROLLVIEW"
              onChangeValue={val => setFormData(f => ({ ...f, fullNameVisibility: val || '' }))}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={[styles.labelBold, { color: textColor }]}>University</Text>
            <Text style={[styles.subtext, { color: secondaryText }]}>Control who can see your university or school in the community.</Text>
            <DropDownPicker
              open={universityOpen}
              setOpen={setUniversityOpen}
              onOpen={onUniversityOpen}
              value={formData.universityVisibility || ''}
              setValue={cb => setFormData(f => ({ ...f, universityVisibility: typeof cb === 'function' ? cb(f.universityVisibility) : cb }))}
              items={PRIVACY_OPTIONS}
              disabled={!isEditing}
              style={[styles.dropdown, { backgroundColor: formBackground, borderColor: fieldBorderColor }]}
              dropDownContainerStyle={[styles.dropdownContainer, { backgroundColor: formBackground, borderColor: fieldBorderColor, zIndex: 3000, elevation: 3000 }]}
              zIndex={3000}
              zIndexInverse={2000}
              listMode="SCROLLVIEW"
              onChangeValue={val => setFormData(f => ({ ...f, universityVisibility: val || '' }))}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={[styles.labelBold, { color: textColor }]}>Location</Text>
            <Text style={[styles.subtext, { color: secondaryText }]}>Control who can see your location in the community.</Text>
            <DropDownPicker
              open={locationOpen}
              setOpen={setLocationOpen}
              onOpen={onLocationOpen}
              value={formData.locationVisibility || ''}
              setValue={cb => setFormData(f => ({ ...f, locationVisibility: typeof cb === 'function' ? cb(f.locationVisibility) : cb }))}
              items={PRIVACY_OPTIONS}
              disabled={!isEditing}
              style={[styles.dropdown, { backgroundColor: formBackground, borderColor: fieldBorderColor }]}
              dropDownContainerStyle={[styles.dropdownContainer, { backgroundColor: formBackground, borderColor: fieldBorderColor, zIndex: 2000, elevation: 2000 }]}
              zIndex={2000}
              zIndexInverse={3000}
              listMode="SCROLLVIEW"
              onChangeValue={val => setFormData(f => ({ ...f, locationVisibility: val || '' }))}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={[styles.labelBold, { color: textColor }]}>Class</Text>
            <Text style={[styles.subtext, { color: secondaryText }]}>Control who can see your current classes in the community.</Text>
            <DropDownPicker
              open={classesOpen}
              setOpen={setClassesOpen}
              onOpen={onClassesOpen}
              value={formData.classesVisibility || ''}
              setValue={cb => setFormData(f => ({ ...f, classesVisibility: typeof cb === 'function' ? cb(f.classesVisibility) : cb }))}
              items={PRIVACY_OPTIONS}
              disabled={!isEditing}
              style={[styles.dropdown, { backgroundColor: formBackground, borderColor: fieldBorderColor }]}
              dropDownContainerStyle={[styles.dropdownContainer, { backgroundColor: formBackground, borderColor: fieldBorderColor, zIndex: 1000, elevation: 1000 }]}
              zIndex={1000}
              zIndexInverse={4000}
              listMode="SCROLLVIEW"
              onChangeValue={val => setFormData(f => ({ ...f, classesVisibility: val || '' }))}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
};

const MAIN_GOAL_OPTIONS = [
  { label: 'Deep Work', value: 'Deep Work' },
  { label: 'Study', value: 'Study' },
  { label: 'Accountability', value: 'Accountability' },
];
const WORK_STYLE_OPTIONS = [
  { label: 'Deep Work', value: 'Deep Work' },
  { label: 'Balanced', value: 'Balanced' },
  { label: 'Sprints', value: 'Sprints' },
];
const ENVIRONMENT_OPTIONS = [
  { label: 'Home', value: 'Home' },
  { label: 'Office', value: 'Office' },
  { label: 'Library', value: 'Library' },
  { label: 'Coffee Shop', value: 'Coffee Shop' },
  { label: 'Park/Outdoors', value: 'Park/Outdoors' },
];
const SOUND_OPTIONS = [
  { label: 'Lo-Fi', value: 'Lo-Fi' },
  { label: 'Jazz', value: 'Jazz' },
  { label: 'Ambient', value: 'Ambient' },
  { label: 'Nature', value: 'Nature' },
  { label: 'Classical', value: 'Classical' },
  { label: 'Silence', value: 'Silence' },
];

export const PreferencesScreen = () => {
  const { onboarding, updateOnboarding } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: 'Preferences',
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  // Dropdown state for each field
  const [mainGoalOpen, setMainGoalOpen] = useState(false);
  const [workStyleOpen, setWorkStyleOpen] = useState(false);
  const [environmentOpen, setEnvironmentOpen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);

  const [formData, setFormData] = useState({
    weeklyFocusGoal: onboarding?.weekly_focus_goal || 10,
    mainGoal: onboarding?.user_goal || 'Deep Work',
    workStyle: onboarding?.work_style || 'Deep Work',
    environment: onboarding?.learning_environment || 'Home',
    soundPreference: onboarding?.sound_preference || 'Lo-Fi',
  });

  useEffect(() => {
    if (onboarding) {
      setFormData({
        weeklyFocusGoal: onboarding.weekly_focus_goal || 10,
        mainGoal: onboarding.user_goal || 'Deep Work',
        workStyle: onboarding.work_style || 'Deep Work',
        environment: onboarding.learning_environment || 'Home',
        soundPreference: onboarding.sound_preference || 'Lo-Fi',
      });
    }
  }, [onboarding]);

  // Only one dropdown open at a time
  const onMainGoalOpen = useCallback(() => {
    setWorkStyleOpen(false);
    setEnvironmentOpen(false);
    setSoundOpen(false);
  }, []);
  const onWorkStyleOpen = useCallback(() => {
    setMainGoalOpen(false);
    setEnvironmentOpen(false);
    setSoundOpen(false);
  }, []);
  const onEnvironmentOpen = useCallback(() => {
    setMainGoalOpen(false);
    setWorkStyleOpen(false);
    setSoundOpen(false);
  }, []);
  const onSoundOpen = useCallback(() => {
    setMainGoalOpen(false);
    setWorkStyleOpen(false);
    setEnvironmentOpen(false);
  }, []);

  const handleSave = async () => {
    // Check if weekly focus goal is over 60 hours and show warning
    if (formData.weeklyFocusGoal > 60) {
      Alert.alert(
        'Big Goal!',
        'Are you sure you want to focus that many hours? It might make it harder to earn rewards and move up the leaderboard. But if you do it, you can earn bigger rewards!',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: "Yes, I'm Sure",
            onPress: async () => {
              // Proceed with saving
              await savePreferences();
            }
          }
        ]
      );
    } else {
      // Goal is 60 or under, save directly
      await savePreferences();
    }
  };

  // Helper function to save preferences
  const savePreferences = async () => {
    try {
      await updateOnboarding({
        weekly_focus_goal: formData.weeklyFocusGoal,
        user_goal: formData.mainGoal,
        work_style: formData.workStyle,
        learning_environment: formData.environment,
        sound_preference: formData.soundPreference,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Your preferences have been updated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update your preferences.');
    }
  };

  const handleCancel = () => {
    if (onboarding) {
      setFormData({
        weeklyFocusGoal: onboarding.weekly_focus_goal || 10,
        mainGoal: onboarding.user_goal || 'Deep Work',
        workStyle: onboarding.work_style || 'Deep Work',
        environment: onboarding.learning_environment || 'Home',
        soundPreference: onboarding.sound_preference || 'Lo-Fi',
      });
    }
    setIsEditing(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <KeyboardAwareScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }} enableOnAndroid={true} extraScrollHeight={80}>
        <View style={styles.header}>
          <View style={{ flex: 1 }} />
          {!isEditing ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={20} color="#4CAF50" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={[styles.actionButtonText, styles.saveButtonText]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.content}>
          <View style={styles.fieldContainer}>
            <Text style={styles.labelBold}>Weekly Focus Goal</Text>
            <Text style={styles.subtext}>How many hours would you like to focus this week?</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={80}
              step={1}
              value={formData.weeklyFocusGoal}
              onValueChange={value => setFormData({ ...formData, weeklyFocusGoal: value })}
              minimumTrackTintColor="#4CAF50"
              maximumTrackTintColor="#E0E0E0"
              disabled={!isEditing}
            />
            <Text style={styles.sliderValue}>{formData.weeklyFocusGoal} hours</Text>
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.labelBold}>Main Goal</Text>
            <DropDownPicker
              open={mainGoalOpen}
              setOpen={setMainGoalOpen}
              onOpen={onMainGoalOpen}
              value={formData.mainGoal || ''}
              setValue={cb => setFormData(f => ({ ...f, mainGoal: typeof cb === 'function' ? cb(f.mainGoal) : cb }))}
              items={MAIN_GOAL_OPTIONS}
              disabled={!isEditing}
              style={styles.dropdown}
              dropDownContainerStyle={[styles.dropdownContainer, { zIndex: 4000, elevation: 4000 }]}
              zIndex={4000}
              zIndexInverse={1000}
              listMode="SCROLLVIEW"
              onChangeValue={val => setFormData(f => ({ ...f, mainGoal: val || '' }))}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.labelBold}>Work Style</Text>
            <DropDownPicker
              open={workStyleOpen}
              setOpen={setWorkStyleOpen}
              onOpen={onWorkStyleOpen}
              value={formData.workStyle || ''}
              setValue={cb => setFormData(f => ({ ...f, workStyle: typeof cb === 'function' ? cb(f.workStyle) : cb }))}
              items={WORK_STYLE_OPTIONS}
              disabled={!isEditing}
              style={styles.dropdown}
              dropDownContainerStyle={[styles.dropdownContainer, { zIndex: 3000, elevation: 3000 }]}
              zIndex={3000}
              zIndexInverse={2000}
              listMode="SCROLLVIEW"
              onChangeValue={val => setFormData(f => ({ ...f, workStyle: val || '' }))}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.labelBold}>Environment</Text>
            <DropDownPicker
              open={environmentOpen}
              setOpen={setEnvironmentOpen}
              onOpen={onEnvironmentOpen}
              value={formData.environment || ''}
              setValue={cb => setFormData(f => ({ ...f, environment: typeof cb === 'function' ? cb(f.environment) : cb }))}
              items={ENVIRONMENT_OPTIONS}
              disabled={!isEditing}
              style={styles.dropdown}
              dropDownContainerStyle={[styles.dropdownContainer, { zIndex: 2000, elevation: 2000 }]}
              zIndex={2000}
              zIndexInverse={3000}
              listMode="SCROLLVIEW"
              onChangeValue={val => setFormData(f => ({ ...f, environment: val || '' }))}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.labelBold}>Sound Preference</Text>
            <DropDownPicker
              open={soundOpen}
              setOpen={setSoundOpen}
              onOpen={onSoundOpen}
              value={formData.soundPreference || ''}
              setValue={cb => setFormData(f => ({ ...f, soundPreference: typeof cb === 'function' ? cb(f.soundPreference) : cb }))}
              items={SOUND_OPTIONS}
              disabled={!isEditing}
              style={styles.dropdown}
              dropDownContainerStyle={[styles.dropdownContainer, { zIndex: 1000, elevation: 1000 }]}
              zIndex={1000}
              zIndexInverse={4000}
              listMode="SCROLLVIEW"
              onChangeValue={val => setFormData(f => ({ ...f, soundPreference: val || '' }))}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  customizationSafeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarTouch: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImageLarge: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  avatarHelpText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  formSection: {
    marginTop: 12,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  privacyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButtonLarge: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  editButtonText: {
    color: '#4CAF50',
    marginLeft: 4,
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#666',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    color: '#666',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginTop: 24,
    lineHeight: 20,
  },
  subtitle: {
    color: '#388E3C',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 24,
    marginTop: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 4,
    marginBottom: 8,
  },
  picker: {
    height: 48,
    width: '100%',
  },
  valueText: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  labelBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  pickerWrapperPrivacy: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 4,
    marginBottom: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  pickerPrivacy: {
    width: '100%',
    minWidth: 200,
    fontSize: 16,
    color: '#222',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pickerItemPrivacy: {
    fontSize: 16,
    color: '#222',
    height: 44,
    minWidth: 200,
    textAlign: 'left',
  },
  sliderValue: { fontSize: 16, color: '#388E3C', fontWeight: 'bold', marginTop: 4, marginBottom: 8, textAlign: 'right' },
  slider: {
    width: '100%',
    height: 46,
  },
  dropdown: {
    borderColor: '#E0E0E0',
    borderRadius: 8,
    minHeight: 44,
    backgroundColor: '#fff',
    marginTop: 4,
    marginBottom: 8,
    fontSize: 16,
    zIndex: 10,
  },
  dropdownContainer: {
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#fff',
    zIndex: 10,
  },
}); 

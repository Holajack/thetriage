import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSupabaseProfile } from '../../../utils/supabaseHooks';
import * as Localization from 'expo-localization';
import Slider from '@react-native-community/slider';
import DropDownPicker from 'react-native-dropdown-picker';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

export const PersonalInformationScreen = () => {
  const { profile, updateProfile } = useSupabaseProfile();
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
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              editable={isEditing}
              placeholder="Enter your username"
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              editable={isEditing}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              editable={isEditing}
              placeholder="Enter your full name"
            />
          </View>
          <Text style={styles.infoText}>
            Your personal information helps us personalize your experience and keep your account secure.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
};

export const EducationScreen = () => {
  const { profile, updateProfile } = useSupabaseProfile();
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
            <Text style={styles.label}>University / School</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={formData.university}
              onChangeText={(text) => setFormData({ ...formData, university: text })}
              editable={isEditing}
              placeholder="Enter your university or school"
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Major / Field of Study</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={formData.major}
              onChangeText={(text) => setFormData({ ...formData, major: text })}
              editable={isEditing}
              placeholder="Enter your major or field of study"
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Current Classes</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={formData.classes}
              onChangeText={(text) => setFormData({ ...formData, classes: text })}
              editable={isEditing}
              placeholder="List your current classes (comma separated)"
              multiline
            />
          </View>
          <Text style={styles.infoText}>
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
  const { profile, updateProfile } = useSupabaseProfile();
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
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              editable={isEditing}
              placeholder="Enter your location"
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Time Zone</Text>
            {isEditing ? (
              <View style={styles.pickerWrapper}>
                <DropDownPicker
                  open={!!formData.timeZone}
                  setOpen={() => {}}
                  value={formData.timeZone || ''}
                  setValue={cb => setFormData(f => ({ ...f, timeZone: typeof cb === 'function' ? cb(f.timeZone) : cb }))}
                  items={TIME_ZONES.map((tz) => ({ label: tz, value: tz }))}
                  onChangeValue={val => setFormData(f => ({ ...f, timeZone: val || '' }))}
                  style={styles.dropdown}
                  dropDownContainerStyle={[styles.dropdownContainer, { zIndex: 5000, elevation: 5000 }]}
                  zIndex={5000}
                  zIndexInverse={500}
                  listMode="SCROLLVIEW"
                />
              </View>
            ) : (
              <Text style={styles.valueText}>{formData.timeZone || Localization.timezone}</Text>
            )}
          </View>
          <Text style={styles.infoText}>
            Keeping your location and time zone up to date helps us provide accurate scheduling and reminders.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
};

const PRIVACY_OPTIONS = [
  { label: 'Do Not Show', value: 'none' },
  { label: 'Only my Friends', value: 'friends' },
  { label: 'Everyone', value: 'everyone' },
];

export const PrivacyScreen = () => {
  const { profile, updateProfile } = useSupabaseProfile();
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
            <Text style={styles.labelBold}>Full Name</Text>
            <Text style={styles.subtext}>Control who can see your full name in the community.</Text>
            <DropDownPicker
              open={fullNameOpen}
              setOpen={setFullNameOpen}
              onOpen={onFullNameOpen}
              value={formData.fullNameVisibility || ''}
              setValue={cb => setFormData(f => ({ ...f, fullNameVisibility: typeof cb === 'function' ? cb(f.fullNameVisibility) : cb }))}
              items={PRIVACY_OPTIONS}
              disabled={!isEditing}
              style={styles.dropdown}
              dropDownContainerStyle={[styles.dropdownContainer, { zIndex: 4000, elevation: 4000 }]}
              zIndex={4000}
              zIndexInverse={1000}
              listMode="SCROLLVIEW"
              onChangeValue={val => setFormData(f => ({ ...f, fullNameVisibility: val || '' }))}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.labelBold}>University</Text>
            <Text style={styles.subtext}>Control who can see your university or school in the community.</Text>
            <DropDownPicker
              open={universityOpen}
              setOpen={setUniversityOpen}
              onOpen={onUniversityOpen}
              value={formData.universityVisibility || ''}
              setValue={cb => setFormData(f => ({ ...f, universityVisibility: typeof cb === 'function' ? cb(f.universityVisibility) : cb }))}
              items={PRIVACY_OPTIONS}
              disabled={!isEditing}
              style={styles.dropdown}
              dropDownContainerStyle={[styles.dropdownContainer, { zIndex: 3000, elevation: 3000 }]}
              zIndex={3000}
              zIndexInverse={2000}
              listMode="SCROLLVIEW"
              onChangeValue={val => setFormData(f => ({ ...f, universityVisibility: val || '' }))}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.labelBold}>Location</Text>
            <Text style={styles.subtext}>Control who can see your location in the community.</Text>
            <DropDownPicker
              open={locationOpen}
              setOpen={setLocationOpen}
              onOpen={onLocationOpen}
              value={formData.locationVisibility || ''}
              setValue={cb => setFormData(f => ({ ...f, locationVisibility: typeof cb === 'function' ? cb(f.locationVisibility) : cb }))}
              items={PRIVACY_OPTIONS}
              disabled={!isEditing}
              style={styles.dropdown}
              dropDownContainerStyle={[styles.dropdownContainer, { zIndex: 2000, elevation: 2000 }]}
              zIndex={2000}
              zIndexInverse={3000}
              listMode="SCROLLVIEW"
              onChangeValue={val => setFormData(f => ({ ...f, locationVisibility: val || '' }))}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.labelBold}>Class</Text>
            <Text style={styles.subtext}>Control who can see your current classes in the community.</Text>
            <DropDownPicker
              open={classesOpen}
              setOpen={setClassesOpen}
              onOpen={onClassesOpen}
              value={formData.classesVisibility || ''}
              setValue={cb => setFormData(f => ({ ...f, classesVisibility: typeof cb === 'function' ? cb(f.classesVisibility) : cb }))}
              items={PRIVACY_OPTIONS}
              disabled={!isEditing}
              style={styles.dropdown}
              dropDownContainerStyle={[styles.dropdownContainer, { zIndex: 1000, elevation: 1000 }]}
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
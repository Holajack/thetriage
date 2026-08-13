import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useConvexProfile } from "../../../hooks/useConvex";
import * as Localization from "expo-localization";
import DropDownPicker from "react-native-dropdown-picker";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { Typography, Spacing } from "../../../theme/premiumTheme";
import { StaggeredItem } from "../../../components/premium/StaggeredList";
import SettingsSectionHeader from "../settings/components/SettingsSectionHeader";
import SettingsGroup from "../settings/components/SettingsGroup";
import SettingsRow from "../settings/components/SettingsRow";
const { useUserAppData } = require("../../../utils/userAppData");

const PRIVACY_OPTIONS = [
  { label: "Do Not Show", value: "none" },
  { label: "Only my Friends", value: "friends" },
  { label: "Everyone", value: "everyone" },
];

export const ProfileCustomizationScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { profile, updateProfile } = useConvexProfile();
  const { signOut, refreshUserData } = useAuth();
  const { refetch } = useUserAppData();
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    bio: "",
    location: "",
    website: "",
    fullNameVisibility: "none",
    universityVisibility: "none",
    locationVisibility: "none",
    classesVisibility: "none",
  });
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Privacy dropdown states
  const [fullNameOpen, setFullNameOpen] = useState(false);
  const [universityOpen, setUniversityOpen] = useState(false);
  const [locationPrivacyOpen, setLocationPrivacyOpen] = useState(false);
  const [classesOpen, setClassesOpen] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: "Customize Profile",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        location: profile.location || "",
        website: profile.website || "",
        fullNameVisibility: profile.fullNameVisibility || "none",
        universityVisibility: profile.universityVisibility || "none",
        locationVisibility: profile.locationVisibility || "none",
        classesVisibility: profile.classesVisibility || "none",
      });
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
  const borderColor = (theme as any).border || "#E0E0E0";
  const cardColor = (theme as any).card || "#FFFFFF";

  const handleInputChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
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
      if (typeof refetch === "function") {
        try {
          await refetch();
        } catch (refetchError) {
          // Failed to refetch user data
        }
      }
      try {
        await refreshUserData();
      } catch (refreshError) {
        // Failed to refresh auth context user
      }
      Alert.alert(
        "Profile Updated",
        "Your profile and privacy settings have been saved.",
      );
    } catch (error: any) {
      // Profile save error
      Alert.alert(
        "Error",
        "Unable to save your profile changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
    } catch (error: any) {
      // Sign out error
      setLoggingOut(false);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.customizationSafeArea,
        { backgroundColor: theme.background },
      ]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <KeyboardAwareScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          enableOnAndroid={true}
          extraScrollHeight={80}
        >
          <View style={styles.formSection}>
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>
              Profile Details
            </Text>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>
                Full Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: cardColor,
                    borderColor,
                    color: theme.text,
                  },
                ]}
                value={formData.fullName}
                onChangeText={(text) => handleInputChange("fullName", text)}
                placeholder="Add your full name"
                placeholderTextColor={secondaryTextColor}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>
                Username
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: cardColor,
                    borderColor,
                    color: theme.text,
                  },
                ]}
                value={formData.username}
                onChangeText={(text) => handleInputChange("username", text)}
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
                  {
                    backgroundColor: cardColor,
                    borderColor,
                    color: theme.text,
                  },
                ]}
                value={formData.bio}
                onChangeText={(text) => handleInputChange("bio", text)}
                placeholder="Share a bit about yourself, your goals, or your study focus."
                placeholderTextColor={secondaryTextColor}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>
                Location
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: cardColor,
                    borderColor,
                    color: theme.text,
                  },
                ]}
                value={formData.location}
                onChangeText={(text) => handleInputChange("location", text)}
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
                  {
                    backgroundColor: cardColor,
                    borderColor,
                    color: theme.text,
                  },
                ]}
                value={formData.website}
                onChangeText={(text) => handleInputChange("website", text)}
                placeholder="https://your-site.com"
                placeholderTextColor={secondaryTextColor}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>
              Privacy Settings
            </Text>
            <Text
              style={[styles.privacyDescription, { color: secondaryTextColor }]}
            >
              Control who can see your profile information in the community.
            </Text>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>
                Full Name Visibility
              </Text>
              <Text style={[styles.subtext, { color: secondaryTextColor }]}>
                Control who can see your full name
              </Text>
              <DropDownPicker
                open={fullNameOpen}
                setOpen={setFullNameOpen}
                onOpen={onFullNameOpen}
                value={formData.fullNameVisibility || ""}
                setValue={(cb) =>
                  setFormData((f) => ({
                    ...f,
                    fullNameVisibility:
                      typeof cb === "function" ? cb(f.fullNameVisibility) : cb,
                  }))
                }
                items={PRIVACY_OPTIONS}
                style={[
                  styles.dropdown,
                  { backgroundColor: cardColor, borderColor },
                ]}
                dropDownContainerStyle={[
                  styles.dropdownContainer,
                  {
                    backgroundColor: cardColor,
                    borderColor,
                    zIndex: 4000,
                    elevation: 4000,
                  },
                ]}
                zIndex={4000}
                zIndexInverse={1000}
                listMode="SCROLLVIEW"
                onChangeValue={(val) =>
                  setFormData((f) => ({ ...f, fullNameVisibility: val || "" }))
                }
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>
                University Visibility
              </Text>
              <Text style={[styles.subtext, { color: secondaryTextColor }]}>
                Control who can see your university or school
              </Text>
              <DropDownPicker
                open={universityOpen}
                setOpen={setUniversityOpen}
                onOpen={onUniversityOpen}
                value={formData.universityVisibility || ""}
                setValue={(cb) =>
                  setFormData((f) => ({
                    ...f,
                    universityVisibility:
                      typeof cb === "function"
                        ? cb(f.universityVisibility)
                        : cb,
                  }))
                }
                items={PRIVACY_OPTIONS}
                style={[
                  styles.dropdown,
                  { backgroundColor: cardColor, borderColor },
                ]}
                dropDownContainerStyle={[
                  styles.dropdownContainer,
                  {
                    backgroundColor: cardColor,
                    borderColor,
                    zIndex: 3000,
                    elevation: 3000,
                  },
                ]}
                zIndex={3000}
                zIndexInverse={2000}
                listMode="SCROLLVIEW"
                onChangeValue={(val) =>
                  setFormData((f) => ({
                    ...f,
                    universityVisibility: val || "",
                  }))
                }
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>
                Location Visibility
              </Text>
              <Text style={[styles.subtext, { color: secondaryTextColor }]}>
                Control who can see your location
              </Text>
              <DropDownPicker
                open={locationPrivacyOpen}
                setOpen={setLocationPrivacyOpen}
                onOpen={onLocationPrivacyOpen}
                value={formData.locationVisibility || ""}
                setValue={(cb) =>
                  setFormData((f) => ({
                    ...f,
                    locationVisibility:
                      typeof cb === "function" ? cb(f.locationVisibility) : cb,
                  }))
                }
                items={PRIVACY_OPTIONS}
                style={[
                  styles.dropdown,
                  { backgroundColor: cardColor, borderColor },
                ]}
                dropDownContainerStyle={[
                  styles.dropdownContainer,
                  {
                    backgroundColor: cardColor,
                    borderColor,
                    zIndex: 2000,
                    elevation: 2000,
                  },
                ]}
                zIndex={2000}
                zIndexInverse={3000}
                listMode="SCROLLVIEW"
                onChangeValue={(val) =>
                  setFormData((f) => ({ ...f, locationVisibility: val || "" }))
                }
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>
                Classes Visibility
              </Text>
              <Text style={[styles.subtext, { color: secondaryTextColor }]}>
                Control who can see your current classes
              </Text>
              <DropDownPicker
                open={classesOpen}
                setOpen={setClassesOpen}
                onOpen={onClassesOpen}
                value={formData.classesVisibility || ""}
                setValue={(cb) =>
                  setFormData((f) => ({
                    ...f,
                    classesVisibility:
                      typeof cb === "function" ? cb(f.classesVisibility) : cb,
                  }))
                }
                items={PRIVACY_OPTIONS}
                style={[
                  styles.dropdown,
                  { backgroundColor: cardColor, borderColor },
                ]}
                dropDownContainerStyle={[
                  styles.dropdownContainer,
                  {
                    backgroundColor: cardColor,
                    borderColor,
                    zIndex: 1000,
                    elevation: 1000,
                  },
                ]}
                zIndex={1000}
                zIndexInverse={4000}
                listMode="SCROLLVIEW"
                onChangeValue={(val) =>
                  setFormData((f) => ({ ...f, classesVisibility: val || "" }))
                }
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButtonLarge,
              { backgroundColor: theme.primary },
              saving && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            activeOpacity={0.9}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.logoutButton,
              { borderColor: "#E53935", backgroundColor: theme.background },
              loggingOut && styles.saveButtonDisabled,
            ]}
            onPress={handleLogout}
            activeOpacity={0.9}
            disabled={loggingOut}
          >
            <Text style={[styles.logoutButtonText, { color: "#E53935" }]}>
              {loggingOut ? "Signing Out..." : "Log Out"}
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
    username: "",
    email: "",
    fullName: "",
  });

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: "Personal Information",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || "",
        email: profile.email || "",
        fullName: profile.full_name || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      // Email is owned by Clerk and is not an accepted field on the profile
      // mutation. Sending it made Convex reject the whole call, so the name and
      // username could never be saved from this screen.
      await updateProfile({
        username: formData.username,
        full_name: formData.fullName,
      });
      setIsEditing(false);
      Alert.alert("Success", "Your information has been updated successfully.");
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to update your information. Please try again.",
      );
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        username: profile.username || "",
        email: profile.email || "",
        fullName: profile.full_name || "",
      });
    }
    setIsEditing(false);
  };

  const isDarkMode = theme.isDark;
  const formBackground = isDarkMode ? (theme.surface ?? "#1E1E1E") : "#fff";
  const disabledBackground = isDarkMode ? "#303030" : "#F5F5F5";
  const fieldBorderColor = theme.border ?? "#E0E0E0";
  const textColor = theme.text ?? "#333";
  const secondaryText = theme.textSecondary ?? "#666";
  const accentColor = theme.primary ?? "#4CAF50";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <KeyboardAwareScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid={true}
        extraScrollHeight={80}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: fieldBorderColor,
              backgroundColor: theme.background,
            },
          ]}
        >
          <View style={{ flex: 1 }} />
          {!isEditing ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={20} color={accentColor} />
              <Text style={[styles.editButtonText, { color: accentColor }]}>
                Edit
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: isDarkMode ? "#2C2C2C" : "#F5F5F5" },
                ]}
                onPress={handleCancel}
              >
                <Text
                  style={[styles.actionButtonText, { color: secondaryText }]}
                >
                  Cancel
                </Text>
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
                {
                  backgroundColor: formBackground,
                  borderColor: fieldBorderColor,
                  color: textColor,
                },
                !isEditing && {
                  backgroundColor: disabledBackground,
                  color: secondaryText,
                },
              ]}
              value={formData.username}
              onChangeText={(text) =>
                setFormData({ ...formData, username: text })
              }
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
                {
                  backgroundColor: disabledBackground,
                  borderColor: fieldBorderColor,
                  color: secondaryText,
                },
              ]}
              value={formData.email}
              editable={false}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={secondaryText}
            />
            <Text
              style={[styles.infoText, { color: secondaryText, marginTop: 4 }]}
            >
              Managed in Settings under Email & Password.
            </Text>
          </View>
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: textColor }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: formBackground,
                  borderColor: fieldBorderColor,
                  color: textColor,
                },
                !isEditing && {
                  backgroundColor: disabledBackground,
                  color: secondaryText,
                },
              ]}
              value={formData.fullName}
              onChangeText={(text) =>
                setFormData({ ...formData, fullName: text })
              }
              editable={isEditing}
              placeholder="Enter your full name"
              placeholderTextColor={secondaryText}
            />
          </View>
          <Text style={[styles.infoText, { color: secondaryText }]}>
            Your personal information helps us personalize your experience and
            keep your account secure.
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
    university: "",
    major: "",
    classes: "",
  });

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: "Education",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (profile) {
      setFormData({
        university: profile.university || "",
        major: profile.major || "",
        classes: profile.classes || "",
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
      Alert.alert("Success", "Your education information has been updated.");
    } catch (error) {
      Alert.alert("Error", "Failed to update your education information.");
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        university: profile.university || "",
        major: profile.major || "",
        classes: profile.classes || "",
      });
    }
    setIsEditing(false);
  };

  const isDarkMode = theme.isDark;
  const formBackground = isDarkMode ? (theme.surface ?? "#1E1E1E") : "#fff";
  const disabledBackground = isDarkMode ? "#303030" : "#F5F5F5";
  const fieldBorderColor = theme.border ?? "#E0E0E0";
  const textColor = theme.text ?? "#333";
  const secondaryText = theme.textSecondary ?? "#666";
  const accentColor = theme.primary ?? "#4CAF50";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <KeyboardAwareScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid={true}
        extraScrollHeight={80}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: fieldBorderColor,
              backgroundColor: theme.background,
            },
          ]}
        >
          <View style={{ flex: 1 }} />
          {!isEditing ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={20} color={accentColor} />
              <Text style={[styles.editButtonText, { color: accentColor }]}>
                Edit
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: isDarkMode ? "#2C2C2C" : "#F5F5F5" },
                ]}
                onPress={handleCancel}
              >
                <Text
                  style={[styles.actionButtonText, { color: secondaryText }]}
                >
                  Cancel
                </Text>
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
            <Text style={[styles.label, { color: textColor }]}>
              University / School
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: formBackground,
                  borderColor: fieldBorderColor,
                  color: textColor,
                },
                !isEditing && {
                  backgroundColor: disabledBackground,
                  color: secondaryText,
                },
              ]}
              value={formData.university}
              onChangeText={(text) =>
                setFormData({ ...formData, university: text })
              }
              editable={isEditing}
              placeholder="Enter your university or school"
              placeholderTextColor={secondaryText}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: textColor }]}>
              Major / Field of Study
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: formBackground,
                  borderColor: fieldBorderColor,
                  color: textColor,
                },
                !isEditing && {
                  backgroundColor: disabledBackground,
                  color: secondaryText,
                },
              ]}
              value={formData.major}
              onChangeText={(text) => setFormData({ ...formData, major: text })}
              editable={isEditing}
              placeholder="Enter your major or field of study"
              placeholderTextColor={secondaryText}
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: textColor }]}>
              Current Classes
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: formBackground,
                  borderColor: fieldBorderColor,
                  color: textColor,
                },
                !isEditing && {
                  backgroundColor: disabledBackground,
                  color: secondaryText,
                },
              ]}
              value={formData.classes}
              onChangeText={(text) =>
                setFormData({ ...formData, classes: text })
              }
              editable={isEditing}
              placeholder="List your current classes (comma separated)"
              multiline
              placeholderTextColor={secondaryText}
            />
          </View>
          <Text style={[styles.infoText, { color: secondaryText }]}>
            Keeping your education information up to date helps us tailor your
            study experience.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
};

const TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "America/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

export const LocationAndTimeScreen = () => {
  const { profile, updateProfile } = useConvexProfile();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    location: "",
    timeZone: "",
  });

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: "Location and Time",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (profile) {
      setFormData({
        location: profile.location || "",
        timeZone: profile.timeZone || "",
      });
    }

    if (!profile?.timeZone) {
      const deviceTimeZone = Localization.getCalendars()[0]?.timeZone ?? "UTC";
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
      Alert.alert("Success", "Your location and time zone have been updated.");
    } catch (error) {
      Alert.alert("Error", "Failed to update your location and time zone.");
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        location: profile.location || "",
        timeZone:
          profile.timeZone || Localization.getCalendars()[0]?.timeZone || "UTC",
      });
    }
    setIsEditing(false);
  };

  const isDarkMode = theme.isDark;
  const formBackground = isDarkMode ? (theme.surface ?? "#1E1E1E") : "#fff";
  const disabledBackground = isDarkMode ? "#303030" : "#F5F5F5";
  const fieldBorderColor = theme.border ?? "#E0E0E0";
  const textColor = theme.text ?? "#333";
  const secondaryText = theme.textSecondary ?? "#666";
  const accentColor = theme.primary ?? "#4CAF50";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <KeyboardAwareScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid={true}
        extraScrollHeight={80}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: fieldBorderColor,
              backgroundColor: theme.background,
            },
          ]}
        >
          <View style={{ flex: 1 }} />
          {!isEditing ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={20} color={accentColor} />
              <Text style={[styles.editButtonText, { color: accentColor }]}>
                Edit
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: isDarkMode ? "#2C2C2C" : "#F5F5F5" },
                ]}
                onPress={handleCancel}
              >
                <Text
                  style={[styles.actionButtonText, { color: secondaryText }]}
                >
                  Cancel
                </Text>
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
                {
                  backgroundColor: formBackground,
                  borderColor: fieldBorderColor,
                  color: textColor,
                },
                !isEditing && {
                  backgroundColor: disabledBackground,
                  color: secondaryText,
                },
              ]}
              value={formData.location}
              onChangeText={(text) =>
                setFormData({ ...formData, location: text })
              }
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
                  value={formData.timeZone || ""}
                  setValue={(cb) =>
                    setFormData((f) => ({
                      ...f,
                      timeZone: typeof cb === "function" ? cb(f.timeZone) : cb,
                    }))
                  }
                  items={TIME_ZONES.map((tz) => ({ label: tz, value: tz }))}
                  onChangeValue={(val) =>
                    setFormData((f) => ({ ...f, timeZone: val || "" }))
                  }
                  style={[
                    styles.dropdown,
                    {
                      backgroundColor: formBackground,
                      borderColor: fieldBorderColor,
                    },
                  ]}
                  dropDownContainerStyle={[
                    styles.dropdownContainer,
                    {
                      backgroundColor: formBackground,
                      borderColor: fieldBorderColor,
                      zIndex: 5000,
                      elevation: 5000,
                    },
                  ]}
                  zIndex={5000}
                  zIndexInverse={500}
                  listMode="SCROLLVIEW"
                />
              </View>
            ) : (
              <Text style={[styles.valueText, { color: textColor }]}>
                {formData.timeZone || Localization.getCalendars()[0]?.timeZone}
              </Text>
            )}
          </View>
          <Text style={[styles.infoText, { color: secondaryText }]}>
            Keeping your location and time zone up to date helps us provide
            accurate scheduling and reminders.
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

  const [formData, setFormData] = useState({
    fullNameVisibility: "none",
    universityVisibility: "none",
    locationVisibility: "none",
    classesVisibility: "none",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fullNameVisibility: profile.fullNameVisibility || "none",
        universityVisibility: profile.universityVisibility || "none",
        locationVisibility: profile.locationVisibility || "none",
        classesVisibility: profile.classesVisibility || "none",
      });
    }
  }, [profile]);

  const VISIBILITY_LABELS: Record<string, string> = {
    none: "Do Not Show",
    friends: "Only Friends",
    everyone: "Everyone",
  };

  const showVisibilityPicker = (
    field: keyof typeof formData,
    label: string,
  ) => {
    Alert.alert(`${label} Visibility`, "Choose who can see this information", [
      { text: "Do Not Show", onPress: () => handleUpdate(field, "none") },
      { text: "Only Friends", onPress: () => handleUpdate(field, "friends") },
      { text: "Everyone", onPress: () => handleUpdate(field, "everyone") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleUpdate = async (field: keyof typeof formData, value: string) => {
    const prev = formData[field];
    setFormData((f) => ({ ...f, [field]: value }));
    try {
      await updateProfile({ [field]: value });
    } catch (error) {
      setFormData((f) => ({ ...f, [field]: prev }));
      Alert.alert("Error", "Failed to update privacy setting.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={privacyStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={privacyStyles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[privacyStyles.title, { color: theme.text }]}>
          Privacy
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={privacyStyles.content}
      >
        <StaggeredItem index={0}>
          <SettingsSectionHeader title="PROFILE VISIBILITY" />
          <SettingsGroup>
            <SettingsRow
              icon="person-outline"
              label="Full Name"
              description="Control who can see your full name"
              value={
                VISIBILITY_LABELS[formData.fullNameVisibility] || "Do Not Show"
              }
              onPress={() =>
                showVisibilityPicker("fullNameVisibility", "Full Name")
              }
            />
            <SettingsRow
              icon="school-outline"
              label="University"
              description="Control who can see your university"
              value={
                VISIBILITY_LABELS[formData.universityVisibility] ||
                "Do Not Show"
              }
              onPress={() =>
                showVisibilityPicker("universityVisibility", "University")
              }
            />
            <SettingsRow
              icon="location-outline"
              label="Location"
              description="Control who can see your location"
              value={
                VISIBILITY_LABELS[formData.locationVisibility] || "Do Not Show"
              }
              onPress={() =>
                showVisibilityPicker("locationVisibility", "Location")
              }
            />
            <SettingsRow
              icon="book-outline"
              label="Classes"
              description="Control who can see your current classes"
              value={
                VISIBILITY_LABELS[formData.classesVisibility] || "Do Not Show"
              }
              onPress={() =>
                showVisibilityPicker("classesVisibility", "Classes")
              }
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>

        <StaggeredItem index={1}>
          <SettingsSectionHeader title="ABOUT" />
          <SettingsGroup>
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              description="Read our privacy policy"
              onPress={() =>
                Alert.alert(
                  "Privacy Policy",
                  "This will open the privacy policy in a future update.",
                )
              }
              isLast
            />
          </SettingsGroup>
        </StaggeredItem>
      </ScrollView>
    </SafeAreaView>
  );
};

const privacyStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...Typography.h2,
  },
  content: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
});

const ENVIRONMENT_OPTIONS = [
  { label: "Home", value: "Home" },
  { label: "Office", value: "Office" },
  { label: "Library", value: "Library" },
  { label: "Coffee Shop", value: "Coffee Shop" },
  { label: "Park/Outdoors", value: "Park/Outdoors" },
];

// Main Goal, Work Style, Weekly Focus Goal, and Sound Preference are edited
// in Settings > Focus & Study and Settings > Sound — this screen used to
// duplicate all four with a separate (and inconsistent) set of option values,
// and its reads from `onboarding` never actually picked up the saved value
// for any of them, so it silently showed defaults on every load. Environment
// is the only preference that's unique to Profile.
export const PreferencesScreen = () => {
  const { onboarding, updateOnboarding } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: "Preferences",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const [environmentOpen, setEnvironmentOpen] = useState(false);

  const [formData, setFormData] = useState({
    environment: onboarding?.learning_environment || "Home",
  });

  useEffect(() => {
    if (onboarding) {
      setFormData({
        environment: onboarding.learning_environment || "Home",
      });
    }
  }, [onboarding]);

  const handleSave = async () => {
    try {
      await updateOnboarding({
        learning_environment: formData.environment,
      });
      setIsEditing(false);
      Alert.alert("Success", "Your preferences have been updated.");
    } catch (error) {
      Alert.alert("Error", "Failed to update your preferences.");
    }
  };

  const handleCancel = () => {
    if (onboarding) {
      setFormData({
        environment: onboarding.learning_environment || "Home",
      });
    }
    setIsEditing(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid={true}
        extraScrollHeight={80}
      >
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
            <Text style={styles.labelBold}>Study Environment</Text>
            <Text style={styles.subtext}>
              Where you usually study — helps tailor tips to your setting.
            </Text>
            <DropDownPicker
              open={environmentOpen}
              setOpen={setEnvironmentOpen}
              value={formData.environment || ""}
              setValue={(cb) =>
                setFormData((f) => ({
                  ...f,
                  environment:
                    typeof cb === "function" ? cb(f.environment) : cb,
                }))
              }
              items={ENVIRONMENT_OPTIONS}
              disabled={!isEditing}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              listMode="SCROLLVIEW"
              onChangeValue={(val) =>
                setFormData((f) => ({ ...f, environment: val || "" }))
              }
            />
          </View>
          <Text style={styles.infoText}>
            Sound, main goal, work style, and weekly focus goal live in
            Settings, under Focus & Study and Sound.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  customizationSafeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  formSection: {
    marginTop: 12,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  privacyDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveButtonLarge: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  editButtonText: {
    color: "#4CAF50",
    marginLeft: 4,
    fontSize: 16,
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  actionButtonText: {
    fontSize: 16,
    color: "#666",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  disabledInput: {
    backgroundColor: "#F5F5F5",
    color: "#666",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginTop: 24,
    lineHeight: 20,
  },
  subtitle: {
    color: "#388E3C",
    fontSize: 16,
    textAlign: "center",
    marginHorizontal: 24,
    marginTop: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginTop: 4,
    marginBottom: 8,
  },
  picker: {
    height: 48,
    width: "100%",
  },
  valueText: {
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  subtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  labelBold: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  pickerWrapperPrivacy: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginTop: 4,
    marginBottom: 8,
    minHeight: 48,
    justifyContent: "center",
  },
  pickerPrivacy: {
    width: "100%",
    minWidth: 200,
    fontSize: 16,
    color: "#222",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pickerItemPrivacy: {
    fontSize: 16,
    color: "#222",
    height: 44,
    minWidth: 200,
    textAlign: "left",
  },
  sliderValue: {
    fontSize: 16,
    color: "#388E3C",
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 8,
    textAlign: "right",
  },
  slider: {
    width: "100%",
    height: 46,
  },
  dropdown: {
    borderColor: "#E0E0E0",
    borderRadius: 8,
    minHeight: 44,
    backgroundColor: "#fff",
    marginTop: 4,
    marginBottom: 8,
    fontSize: 16,
    zIndex: 10,
  },
  dropdownContainer: {
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#fff",
    zIndex: 10,
  },
});

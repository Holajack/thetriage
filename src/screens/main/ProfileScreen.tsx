import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, TextInput, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
const { useUserAppData } = require('../../utils/userAppData');
import { useAuth } from '../../context/AuthContext';
import { BottomTabBar } from '../../components/BottomTabBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UnifiedHeader } from '../../components/UnifiedHeader';
import { FlintIcon } from '../../components/FlintIcon';
import * as ImagePicker from 'expo-image-picker';
import { useConvexProfile } from '../../hooks/useConvex';
import { getUserBadges } from '../../utils/achievementManager';
import { Badge } from '../../data/achievements';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeIn,
  FadeInUp,
  SlideInRight,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimationConfig, TimingConfig, Typography } from '../../theme/premiumTheme';
import { useButtonPressAnimation, useNavigationSlideAnimation, useFocusAnimationKey } from '../../utils/animationUtils';
import { ShimmerLoader } from '../../components/premium/ShimmerLoader';
import { glassStyles } from '../../components/premium/LiquidGlass';
import { ImageSourcePropType } from 'react-native';

// Trail buddy portrait images (first frame of each animation)
const TRAIL_BUDDY_IMAGES: Record<string, ImageSourcePropType> = {
  fox: require('../../../assets/trail-buddies/fox-frames/fox_frame_00.png'),
  bear: require('../../../assets/trail-buddies/bear-frames/bear_frame_00.png'),
  deer: require('../../../assets/trail-buddies/deer-frames/deer_frame_00.png'),
  nora: require('../../../assets/trail-buddies/nora-frames/nora_frame_00.png'),
  wolf: require('../../../assets/trail-buddies/wolf-frames/wolf_frame_00.png'),
};

const ProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainTabParamList>>();
  const { user } = useAuth();
  const { data: userData, refetch } = useUserAppData();
  const { theme, isDark } = useTheme();
  const { profile, updateProfile, uploadProfileImage, refetch: refetchProfile } = useConvexProfile();

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedUsername, setEditedUsername] = useState('');
  const [editedUniversity, setEditedUniversity] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedClasses, setEditedClasses] = useState('');
  const [userBadges, setUserBadges] = useState<Badge[]>([]);

  // Force animations to replay on every screen focus
  const focusKey = useFocusAnimationKey();

  // Refetch profile when screen comes into focus (e.g., after changing trail buddy)
  useFocusEffect(
    useCallback(() => {
      refetchProfile();
    }, [refetchProfile])
  );

  // Navigation slide animations
  const shopSlideAnimation = useNavigationSlideAnimation();

  // Load user badges
  useEffect(() => {
    loadUserBadges();
  }, [user]);

  const loadUserBadges = async () => {
    if (!user?.id) return;

    try {
      const badges = await getUserBadges(user.id);
      setUserBadges(badges);
    } catch (error) {
      console.error('Error loading user badges:', error);
    }
  };

  // Initialize edit form with current values
  useEffect(() => {
    if (profile) {
      setEditedName(profile.full_name || '');
      setEditedUsername(profile.username || '');
      setEditedUniversity(profile.university || '');
      setEditedLocation(profile.location || '');
      setEditedClasses(profile.classes || '');
    }
  }, [profile]);

  // Calculate real stats from auth context leaderboard (Convex reactive data)
  const { leaderboard } = useAuth();
  const sessions = userData?.sessions ?? [];
  const totalSessions = leaderboard?.total_sessions ?? sessions.length ?? 0;
  const totalMinutes = leaderboard?.total_focus_time ?? 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const currentStreak = leaderboard?.current_streak ?? 0;

  // Count session types
  const completedSessions = leaderboard?.sessions_completed ?? sessions.filter((s: any) => s.completed === true || s.status === 'completed').length ?? 0;

  // Get Flint currency from profile
  const flintCurrency = profile?.flint_currency || 0;

  const avatarSource = profile?.avatar_url || user?.avatar_url;

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

      setUploading(true);
      const uri = result.assets[0].uri;
      const { publicUrl } = await uploadProfileImage(uri);
      await updateProfile({ avatar_url: publicUrl });

      if (typeof refetch === 'function') {
        await refetch();
      }

      Alert.alert('Success', 'Profile photo updated successfully.');
    } catch (error: any) {
      console.error('Profile photo update error:', error);
      Alert.alert('Error', 'Could not update your profile photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfileInfo = async () => {
    if (!editedName.trim() || !editedUsername.trim()) {
      Alert.alert('Error', 'Please fill in both name and username.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        full_name: editedName.trim(),
        username: editedUsername.trim(),
        university: editedUniversity.trim(),
        location: editedLocation.trim(),
        classes: editedClasses.trim(),
      });

      if (typeof refetch === 'function') {
        await refetch();
      }

      setShowEditModal(false);
      Alert.alert('Success', 'Profile information updated successfully.');
    } catch (error: any) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Could not update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Unified Header */}
      <UnifiedHeader title="Profile" onClose={() => navigation.navigate('Home')} />

      <ScrollView key={focusKey} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Card Section - Top Row */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.profileCardSection}
        >
          <View style={[styles.profileCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}>
            {uploading ? (
              <View style={[styles.profileCardImage, { justifyContent: 'center', alignItems: 'center' }]}>
                <ShimmerLoader variant="custom" width="100%" height="100%" borderRadius={12} />
              </View>
            ) : (
              <Image
                source={avatarSource ? { uri: avatarSource } : require('../../../assets/homescreen-image.png')}
                style={styles.profileCardImage}
                resizeMode="cover"
              />
            )}
            <Pressable
              style={[styles.changeButton, { backgroundColor: isDark ? theme.card : '#FFFFFF' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handlePickImage();
              }}
              disabled={uploading}
            >
              <Text style={[styles.changeButtonText, { color: theme.primary }]}>
                {uploading ? 'Uploading...' : 'Change'}
              </Text>
            </Pressable>
          </View>

          {/* Compact Info Card - Name & Username Only */}
          <Pressable
            style={[styles.infoCardCompact, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowEditModal(true);
            }}
          >
            <View style={styles.infoCardContent}>
              <Text style={[styles.infoCardLabel, { color: theme.text + '99' }]}>NAME</Text>
              <Text style={[styles.infoCardValue, { color: theme.text }]} numberOfLines={1}>
                {profile?.full_name || 'Set your name'}
              </Text>

              <Text style={[styles.infoCardLabel, { color: theme.text + '99', marginTop: 12 }]}>USERNAME</Text>
              <Text style={[styles.infoCardValue, { color: theme.text }]} numberOfLines={1}>
                @{profile?.username || 'username'}
              </Text>
            </View>
            <View style={styles.iconRow}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowQRModal(true);
                }}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="qr-code-outline" size={24} color={theme.primary} />
              </Pressable>
              <Ionicons name="create-outline" size={24} color={theme.primary} style={styles.editIcon} />
            </View>
          </Pressable>
        </Animated.View>

        {/* Full-Width Details Card - University, Location, Classes */}
        <Animated.View entering={FadeIn.delay(50).duration(400)}>
          <Pressable
            style={[styles.detailsCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowEditModal(true);
            }}
          >
            <View style={styles.detailsCardContent}>
              <Text style={[styles.infoCardLabel, { color: theme.text + '99' }]}>UNIVERSITY</Text>
              <Text style={[styles.infoCardValue, { color: theme.text }]} numberOfLines={1}>
                {profile?.university || 'Add your university'}
              </Text>

              <Text style={[styles.infoCardLabel, { color: theme.text + '99', marginTop: 12 }]}>LOCATION</Text>
              <Text style={[styles.infoCardValue, { color: theme.text }]} numberOfLines={1}>
                {profile?.location || 'Add your location'}
              </Text>

              <Text style={[styles.infoCardLabel, { color: theme.text + '99', marginTop: 12 }]}>CLASSES</Text>
              <Text style={[styles.infoCardValue, { color: theme.text }]} numberOfLines={1}>
                {profile?.classes || 'Add your classes'}
              </Text>
            </View>
            <Ionicons name="create-outline" size={24} color={theme.primary} style={styles.editIconDetails} />
          </Pressable>
        </Animated.View>

        {/* Gear Shop Button */}
        <Animated.View
          entering={FadeIn.delay(100).duration(400)}
          style={shopSlideAnimation.animatedStyle}
        >
          <Pressable
            style={[styles.shopButton, { backgroundColor: theme.card, borderColor: '#FF5700' }]}
            onPressIn={shopSlideAnimation.onPressIn}
            onPressOut={shopSlideAnimation.onPressOut}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Shop' as any);
            }}
          >
            <View style={[styles.shopIconContainer, { backgroundColor: '#FF570020' }]}>
              <Image
                source={require('../../../assets/trail-buddies/backpack for hikewise.png')}
                style={{ width: 36, height: 36 }}
                resizeMode="contain"
              />
            </View>
            <View style={styles.shopTextContainer}>
              <Text style={[styles.shopButtonTitle, { color: theme.text }]}>Gear Shop</Text>
              <Text style={[styles.shopButtonSubtitle, { color: theme.textSecondary }]}>
                Equip Nora for the trail ahead
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={24} color={theme.primary} />
          </Pressable>
        </Animated.View>

        {/* Trail Buddy Section */}
        <Animated.View entering={FadeIn.delay(150).duration(400)}>
          <Pressable
            style={[styles.partnerSection, { backgroundColor: theme.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('TrailBuddySelection' as any);
            }}
          >
            <View style={styles.trailBuddyContent}>
              <Text style={[styles.partnerTitle, { color: theme.text }]}>
                {profile?.trail_buddy_name ? `${profile.trail_buddy_name}` : 'Choose Your Trail Buddy'}
              </Text>
              {profile?.trail_buddy_type && (
                <Text style={[styles.trailBuddySubtitle, { color: theme.textSecondary }]}>
                  Your {profile.trail_buddy_type.charAt(0).toUpperCase() + profile.trail_buddy_type.slice(1)} companion
                </Text>
              )}
            </View>
            <View style={[styles.partnerIcon, { backgroundColor: isDark ? theme.primary + '20' : '#E3F2FD', overflow: 'hidden' }]}>
              {profile?.trail_buddy_type && TRAIL_BUDDY_IMAGES[profile.trail_buddy_type] ? (
                <Image
                  source={TRAIL_BUDDY_IMAGES[profile.trail_buddy_type]}
                  style={styles.trailBuddyImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={{ fontSize: 30 }}>🥾</Text>
              )}
            </View>
          </Pressable>
        </Animated.View>

        {/* Scene Card */}
        <Animated.View
          entering={FadeIn.delay(200).duration(400)}
          style={[styles.sceneCard, { backgroundColor: theme.card }]}
        >
          <Image
            source={require('../../../assets/homescreen-image.png')}
            style={styles.sceneImage}
            resizeMode="cover"
          />
          <Pressable
            style={[styles.changeButton, { backgroundColor: isDark ? theme.card : '#FFFFFF', position: 'absolute', bottom: 16, left: 16 }]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Text style={[styles.changeButtonText, { color: theme.primary }]}>Change</Text>
          </Pressable>
        </Animated.View>

        {/* Stats Grid - Row 1 */}
        <Animated.View
          entering={FadeIn.delay(250).duration(400)}
          style={styles.statsGrid}
        >
          <View style={[styles.statCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#FF570020' }]}>
              <FlintIcon size={32} color="#FF5700" />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{flintCurrency.toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: theme.primary }]}>Flint</Text>
          </View>

          <View style={[styles.statCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#FFD70020' }]}>
              {userBadges.length > 0 ? (
                <Text style={{ fontSize: 32 }}>{userBadges[0].icon}</Text>
              ) : (
                <Ionicons name="trophy-outline" size={32} color="#FFD700" />
              )}
            </View>
            <Text style={[styles.statNumber, { color: theme.text, fontSize: 16 }]} numberOfLines={1}>
              {userBadges.length > 0 ? userBadges[0].name : 'No Peak'}
            </Text>
            <Text style={[styles.statLabel, { color: theme.primary }]}>Peak Reached</Text>
          </View>

          <View style={[styles.statCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="timer-outline" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{totalSessions}</Text>
            <Text style={[styles.statLabel, { color: theme.primary }]}>Sessions</Text>
          </View>
        </Animated.View>

        {/* Stats Grid - Row 2 */}
        <Animated.View
          entering={FadeIn.delay(300).duration(400)}
          style={styles.statsGrid}
        >
          <View style={[styles.statCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="time-outline" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{totalHours}H</Text>
            <Text style={[styles.statLabel, { color: theme.primary }]}>{totalHours}H {remainingMinutes}M</Text>
          </View>

          <View style={[styles.statCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#4CAF5020' }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#4CAF50" />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{completedSessions}</Text>
            <Text style={[styles.statLabel, { color: theme.primary }]}>Completed</Text>
          </View>

          <View style={[styles.statCard, glassStyles.subtleCard(isDark), { backgroundColor: theme.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#FF851B20' }]}>
              <Text style={{ fontSize: 32 }}>🔥</Text>
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{currentStreak}</Text>
            <Text style={[styles.statLabel, { color: theme.primary }]}>Day Streak</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Edit Profile Info Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close-outline" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.primary + '44', color: theme.text }]}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter your full name"
                placeholderTextColor={theme.text + '66'}
              />

              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 16 }]}>Username</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.primary + '44', color: theme.text }]}
                value={editedUsername}
                onChangeText={setEditedUsername}
                placeholder="Enter your username"
                placeholderTextColor={theme.text + '66'}
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 16 }]}>University / School</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.primary + '44', color: theme.text }]}
                value={editedUniversity}
                onChangeText={setEditedUniversity}
                placeholder="Enter your university or school"
                placeholderTextColor={theme.text + '66'}
              />

              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 16 }]}>Location</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.primary + '44', color: theme.text }]}
                value={editedLocation}
                onChangeText={setEditedLocation}
                placeholder="City, Country"
                placeholderTextColor={theme.text + '66'}
              />

              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 16 }]}>Classes</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.primary + '44', color: theme.text }]}
                value={editedClasses}
                onChangeText={setEditedClasses}
                placeholder="e.g., Math 101, Physics 202"
                placeholderTextColor={theme.text + '66'}
                multiline
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={handleSaveProfileInfo}
              disabled={saving}
            >
              {saving ? (
                <ShimmerLoader variant="button" width="100%" height={20} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.qrModalContent, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={styles.qrCloseButton}
              onPress={() => setShowQRModal(false)}
            >
              <Ionicons name="close-outline" size={28} color={theme.text} />
            </TouchableOpacity>

            <Text style={[styles.qrModalTitle, { color: theme.text }]}>Share Your Profile</Text>
            <Text style={[styles.qrModalSubtitle, { color: theme.textSecondary }]}>
              Let others scan this QR code to connect with you
            </Text>

            <View style={styles.qrCodeContainer}>
              <QRCode
                value={JSON.stringify({
                  userId: user?.id,
                  username: profile?.username,
                  fullName: profile?.full_name,
                  profileUrl: `thetriage://profile/${user?.id}`
                })}
                size={250}
                backgroundColor="white"
                color={theme.primary}
              />
            </View>

            <View style={[styles.profileInfoQR, { backgroundColor: theme.background }]}>
              <Text style={[styles.profileNameQR, { color: theme.text }]}>
                {profile?.full_name || 'Your Name'}
              </Text>
              <Text style={[styles.profileUsernameQR, { color: theme.textSecondary }]}>
                @{profile?.username || 'username'}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Tab Bar */}
      <BottomTabBar currentRoute="Profile" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCardSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  profileCard: {
    width: 150,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  profileCardImage: {
    width: '100%',
    height: '100%',
  },
  changeButton: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    transform: [{ translateX: -35 }],
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    position: 'relative',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  editIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  infoCardCompact: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    position: 'relative',
    minHeight: 180,
  },
  detailsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  detailsCardContent: {
    paddingRight: 40,
  },
  editIconDetails: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  partnerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  partnerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  trailBuddyContent: {
    flex: 1,
  },
  trailBuddySubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  trailBuddyImage: {
    width: 46,
    height: 46,
  },
  partnerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneCard: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  sceneImage: {
    width: '100%',
    height: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  statIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  shopIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  shopTextContainer: {
    flex: 1,
  },
  shopButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  shopButtonSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  qrCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  qrModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
  },
  qrModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  qrCodeContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 20,
  },
  profileInfoQR: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  profileNameQR: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileUsernameQR: {
    fontSize: 14,
  },
});

export default ProfileScreen;

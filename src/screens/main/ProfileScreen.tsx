import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Pressable,
  ImageSourcePropType,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainTabParamList } from "../../navigation/types";
import { useTheme } from "../../context/ThemeContext";
const { useUserAppData } = require("../../utils/userAppData");
import { useAuth } from "../../context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { UnifiedHeader } from "../../components/UnifiedHeader";
import { FlintIcon } from "../../components/FlintIcon";
import * as ImagePicker from "expo-image-picker";
import { useConvexProfile } from "../../hooks/useConvex";
import { getUserBadges } from "../../utils/achievementManager";
import { Badge } from "../../data/achievements";
import QRCode from "react-native-qrcode-svg";
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Typography } from "../../theme/premiumTheme";
import {
  useNavigationSlideAnimation,
  useCounterAnimation,
} from "../../utils/animationUtils";
import { ShimmerLoader } from "../../components/premium/ShimmerLoader";
import { glassStyles } from "../../components/premium/LiquidGlass";
import { AnimatedButton } from "../../components/premium/AnimatedButton";
import InteractiveWalkthrough from "../../components/InteractiveWalkthrough";
import { useScreenWalkthrough } from "../../hooks/useScreenWalkthrough";
import { PROFILE_STEPS } from "../../config/walkthroughSteps";
import { navigateHomeWithSlide } from "../../navigation/navHelpers";

// Trail buddy portrait images (first frame of each animation)
const TRAIL_BUDDY_IMAGES: Record<string, ImageSourcePropType> = {
  fox: require("../../../assets/trail-buddies/fox-frames/fox_frame_00.webp"),
  bear: require("../../../assets/trail-buddies/bear-frames/bear_frame_00.webp"),
  deer: require("../../../assets/trail-buddies/deer-frames/deer_frame_00.webp"),
  nora: require("../../../assets/trail-buddies/nora-frames/nora_frame_00.webp"),
  wolf: require("../../../assets/trail-buddies/wolf-frames/wolf_frame_00.webp"),
  lion: require("../../../assets/trail-buddies/lion-frames/lion_frame_00.webp"),
};

// Spritesheet configuration for walking animation
const BUDDY_SPRITESHEETS: Record<string, ImageSourcePropType> = {
  fox: require("../../../assets/trail-buddies/fox_walking_optimized.webp"),
  deer: require("../../../assets/trail-buddies/deer_walking_optimized.webp"),
  wolf: require("../../../assets/trail-buddies/wolf_walking_optimized.webp"),
  nora: require("../../../assets/trail-buddies/nora_walking_optimized.webp"),
  bear: require("../../../assets/trail-buddies/bear_walking_optimized.webp"),
  lion: require("../../../assets/trail-buddies/lion_walking_optimized.webp"),
};
const SPRITE_FRAME_WIDTH = 200;
const SPRITE_FRAME_HEIGHT = 200;
const SPRITE_TOTAL_FRAMES = 28;

const BUDDY_COLORS: Record<string, string> = {
  fox: "#FF6B35",
  bear: "#8B4513",
  deer: "#C4A484",
  nora: "#9B59B6",
  wolf: "#708090",
  lion: "#FFD700",
};

// Profile sub-screens reachable only from this row list — kept in the order
// they're most useful to a student setting up their profile.
type ProfileLinkRoute =
  | "ProfileCustomization"
  | "PersonalInformation"
  | "Education"
  | "LocationAndTime"
  | "Preferences";

const PROFILE_LINKS: {
  route: ProfileLinkRoute;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
}[] = [
  {
    route: "ProfileCustomization",
    icon: "color-palette-outline",
    label: "Customize Profile",
    subtitle: "Cover photo, bio, and highlights",
  },
  {
    route: "PersonalInformation",
    icon: "person-outline",
    label: "Personal Information",
    subtitle: "Name, contact, and account details",
  },
  {
    route: "Education",
    icon: "school-outline",
    label: "Education",
    subtitle: "University, major, and classes",
  },
  {
    route: "LocationAndTime",
    icon: "location-outline",
    label: "Location and Time",
    subtitle: "Timezone and study location",
  },
  {
    route: "Preferences",
    icon: "options-outline",
    label: "Preferences",
    subtitle: "How HikeWise works for you",
  },
];

// Walking animation sprite component - uses reanimated for smooth UI-thread animation
const BuddyWalkingSprite = ({
  buddyId,
  size = 90,
}: {
  buddyId: string;
  size?: number;
}) => {
  const spritesheet = BUDDY_SPRITESHEETS[buddyId] || BUDDY_SPRITESHEETS.bear;
  const displayScale = size / SPRITE_FRAME_HEIGHT;
  const totalWidth = SPRITE_FRAME_WIDTH * SPRITE_TOTAL_FRAMES * displayScale;
  const frameWidth = SPRITE_FRAME_WIDTH * displayScale;

  // Animate from 0 to SPRITE_TOTAL_FRAMES continuously on UI thread
  const frameProgress = useSharedValue(0);

  useEffect(() => {
    frameProgress.value = 0;
    frameProgress.value = withRepeat(
      withTiming(SPRITE_TOTAL_FRAMES, {
        duration: SPRITE_TOTAL_FRAMES * 80, // 80ms per frame for smooth walking
        easing: Easing.linear,
      }),
      -1, // infinite repeat
      false, // don't reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    // Snap to discrete frames for spritesheet stepping
    const frame = Math.floor(frameProgress.value) % SPRITE_TOTAL_FRAMES;
    return {
      transform: [{ translateX: -frame * frameWidth }],
    };
  });

  return (
    <View style={{ width: size, height: size, overflow: "hidden" }}>
      <Animated.Image
        source={spritesheet}
        style={[
          {
            width: totalWidth,
            height: size,
          },
          animatedStyle,
        ]}
        resizeMode="cover"
      />
    </View>
  );
};

const ProfileScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainTabParamList>>();
  const { user } = useAuth();
  const { data: userData, refetch } = useUserAppData();
  const { theme, isDark } = useTheme();
  const {
    profile,
    updateProfile,
    uploadProfileImage,
    refetch: refetchProfile,
  } = useConvexProfile();

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedUsername, setEditedUsername] = useState("");
  const [editedUniversity, setEditedUniversity] = useState("");
  const [editedLocation, setEditedLocation] = useState("");
  const [editedClasses, setEditedClasses] = useState("");
  const [userBadges, setUserBadges] = useState<Badge[]>([]);

  // Walkthrough refs and hook
  const scrollViewRef = useRef<ScrollView>(null);
  const statsRef = useRef<View>(null);
  const buddyRef = useRef<View>(null);
  const walkthroughRefs = {
    "stats-section": statsRef,
    "buddy-section": buddyRef,
  };
  const {
    visible: walkthroughVisible,
    measurements: walkthroughMeasurements,
    complete: walkthroughComplete,
    remeasure,
  } = useScreenWalkthrough("profile", walkthroughRefs);

  // Track y-offsets for scroll-to-section in walkthrough
  const sectionOffsets = useRef<Record<string, number>>({});

  const handleWalkthroughStepChange = useCallback(
    (stepIndex: number, step: any) => {
      const scrollTargets: Record<string, string> = {
        "trail-buddy": "buddy",
        "stats-and-flint": "stats",
      };
      const offsetKey = scrollTargets[step.id];
      const yOffset = offsetKey ? sectionOffsets.current[offsetKey] : undefined;
      if (yOffset !== undefined && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: Math.max(0, yOffset - 80),
          animated: true,
        });
        // Remeasure after scroll animation settles
        setTimeout(() => remeasure(), 450);
      }
    },
    [remeasure],
  );

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
    }, [refetchProfile]),
  );

  const shopSlideAnimation = useNavigationSlideAnimation();

  useEffect(() => {
    loadUserBadges();
  }, [user]);

  const loadUserBadges = async () => {
    if (!user?.id) return;
    try {
      const badges = await getUserBadges(user.id);
      setUserBadges(badges);
    } catch (error) {
      // Error loading user badges
    }
  };

  useEffect(() => {
    if (profile) {
      setEditedName(profile.full_name || "");
      setEditedUsername(profile.username || "");
      setEditedUniversity(profile.university || "");
      setEditedLocation(profile.location || "");
      setEditedClasses(profile.classes || "");
    }
  }, [profile]);

  // Real stats from Convex reactive data
  const { leaderboard } = useAuth();
  const sessions = userData?.sessions ?? [];
  const totalSessions = leaderboard?.total_sessions ?? sessions.length ?? 0;
  const totalMinutes = leaderboard?.total_focus_time ?? 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const currentStreak = leaderboard?.current_streak ?? 0;
  const completedSessions =
    leaderboard?.sessions_completed ??
    sessions.filter(
      (s: any) => s.completed === true || s.status === "completed",
    ).length ??
    0;
  const flintCurrency = profile?.flint_currency || 0;
  const userLevel = leaderboard?.level ?? 1;

  // Animated counters
  const streakCounter = useCounterAnimation(currentStreak, 800);
  const flintCounter = useCounterAnimation(flintCurrency, 1000);
  const sessionsCounter = useCounterAnimation(totalSessions, 1000);
  const completedCounter = useCounterAnimation(completedSessions, 1200);

  const avatarSource = profile?.avatar_url || user?.avatar_url;

  const handlePickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow access to your photos to update your profile image.",
        );
        return;
      }

      // iOS 14+ "Limited" access — let the user pick which photos the app can see
      // before opening the picker so we actually respect the limited subset.
      const isLimited =
        Platform.OS === "ios" &&
        ((permission as any).accessPrivileges === "limited" ||
          (permission as any).status === "limited");
      if (isLimited) {
        await new Promise<void>((resolve) => {
          Alert.alert(
            "Limited Photo Access",
            'You\'ve granted access to selected photos only. Tap "Select Photos" to choose which photos HikeWise can see, or tap "Use Current Selection" to pick from those you already shared.',
            [
              {
                text: "Select Photos",
                onPress: async () => {
                  try {
                    await (
                      ImagePicker as any
                    ).presentLimitedLibraryPickerAsync?.();
                  } catch (e) {
                    // presentLimitedLibraryPickerAsync failed
                  }
                  resolve();
                },
              },
              { text: "Use Current Selection", onPress: () => resolve() },
            ],
            { cancelable: false },
          );
        });
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

      if (typeof refetch === "function") {
        await refetch();
      }

      Alert.alert("Success", "Profile photo updated successfully.");
    } catch (error: any) {
      // Profile photo update error
      Alert.alert(
        "Error",
        "Could not update your profile photo. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfileInfo = async () => {
    if (!editedName.trim() || !editedUsername.trim()) {
      Alert.alert("Error", "Please fill in both name and username.");
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

      if (typeof refetch === "function") {
        await refetch();
      }

      setShowEditModal(false);
      Alert.alert("Success", "Profile information updated successfully.");
    } catch (error: any) {
      // Profile update error
      Alert.alert("Error", "Could not update your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Build detail chips from profile data
  const detailChips: { icon: keyof typeof Ionicons.glyphMap; text: string }[] =
    [];
  if (profile?.university)
    detailChips.push({ icon: "school-outline", text: profile.university });
  if (profile?.location)
    detailChips.push({ icon: "location-outline", text: profile.location });
  if (profile?.classes)
    detailChips.push({ icon: "book-outline", text: profile.classes });

  const buddyType = profile?.trail_buddy_type;
  const buddyColor = buddyType
    ? BUDDY_COLORS[buddyType] || theme.primary
    : theme.primary;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <UnifiedHeader
        title="Profile"
        onClose={() => navigateHomeWithSlide(navigation)}
      />

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ===== HERO SECTION ===== */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.heroSection}
        >
          {/* QR button - top left */}
          <Pressable
            style={[
              styles.heroActionButton,
              styles.heroActionLeft,
              { backgroundColor: theme.card },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowQRModal(true);
            }}
          >
            <Ionicons name="qr-code-outline" size={20} color={theme.primary} />
          </Pressable>

          {/* Edit button - top right */}
          <Pressable
            style={[
              styles.heroActionButton,
              styles.heroActionRight,
              { backgroundColor: theme.card },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowEditModal(true);
            }}
          >
            <Ionicons name="create-outline" size={20} color={theme.primary} />
          </Pressable>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={[styles.avatarRing, { borderColor: theme.primary }]}>
              {uploading ? (
                <View style={styles.avatarInner}>
                  <ShimmerLoader variant="circle" width={96} height={96} />
                </View>
              ) : (
                <Image
                  source={
                    avatarSource
                      ? { uri: avatarSource }
                      : require("../../../assets/homescreen-image.png")
                  }
                  style={styles.avatarInner}
                />
              )}
            </View>
            {/* Camera button overlay */}
            <Pressable
              style={[styles.cameraButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handlePickImage();
              }}
              disabled={uploading}
            >
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Name & Username */}
          <Text style={[styles.heroName, { color: theme.text }]}>
            {profile?.full_name || "Set your name"}
          </Text>
          <Text style={[styles.heroUsername, { color: theme.textSecondary }]}>
            @{profile?.username || "username"}
          </Text>

          {/* Detail Chips */}
          {detailChips.length > 0 && (
            <View style={styles.chipRow}>
              {detailChips.map((chip, i) => (
                <View
                  key={i}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.primary + "12" },
                  ]}
                >
                  <Ionicons
                    name={chip.icon}
                    size={12}
                    color={theme.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[styles.chipText, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {chip.text}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Prompt to add details if none set */}
          {detailChips.length === 0 && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowEditModal(true);
              }}
            >
              <Text style={[styles.addDetailsPrompt, { color: theme.primary }]}>
                Tap to add your details
              </Text>
            </Pressable>
          )}
        </Animated.View>

        {/* ===== SECTION: YOUR JOURNEY ===== */}
        <Animated.View entering={FadeIn.delay(100).duration(400)}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            YOUR JOURNEY
          </Text>
        </Animated.View>

        {/* Streak Banner */}
        <Animated.View entering={FadeInUp.delay(150).duration(400)}>
          <View
            style={[
              styles.streakBanner,
              glassStyles.subtleCard(isDark),
              { backgroundColor: theme.card },
            ]}
          >
            <View style={styles.streakLeft}>
              <Text style={styles.streakEmoji}>
                {currentStreak > 0 ? "\uD83D\uDD25" : "\u2728"}
              </Text>
              <View>
                <Animated.Text
                  style={[styles.streakCount, { color: theme.text }]}
                >
                  {Math.round(streakCounter.value)}
                </Animated.Text>
                <Text
                  style={[styles.streakLabel, { color: theme.textSecondary }]}
                >
                  {currentStreak > 0 ? "day streak" : "Start your streak!"}
                </Text>
              </View>
            </View>
            <Pressable
              style={[
                styles.levelBadge,
                { backgroundColor: theme.primary + "18" },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert(
                  `Level ${userLevel}`,
                  "Your level increases based on total focus time and achievements. Keep completing sessions to level up!\n\n• Level up every 60 minutes of focus\n• Unlock new badges at higher levels\n• Earn bonus rewards as you progress",
                );
              }}
            >
              <Ionicons name="shield" size={16} color={theme.primary} />
              <Text style={[styles.levelText, { color: theme.primary }]}>
                Lv. {userLevel}
              </Text>
              <Ionicons
                name="information-circle-outline"
                size={12}
                color={theme.primary}
                style={{ marginLeft: 2 }}
              />
            </Pressable>
          </View>
        </Animated.View>

        {/* Trail Buddy Feature Card */}
        <Animated.View
          ref={buddyRef}
          collapsable={false}
          entering={FadeInUp.delay(200).duration(400)}
          onLayout={(e) => {
            sectionOffsets.current["buddy"] = e.nativeEvent.layout.y;
          }}
        >
          <Pressable
            style={[
              styles.buddyCard,
              glassStyles.mediumCard(isDark),
              { backgroundColor: theme.card },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("TrailBuddySelection" as any);
            }}
          >
            <View style={styles.buddyInfo}>
              <Text style={[styles.buddyName, { color: theme.text }]}>
                {profile?.trail_buddy_name || "Choose Your Trail Buddy"}
              </Text>
              {buddyType && (
                <Text
                  style={[styles.buddyType, { color: theme.textSecondary }]}
                >
                  Your {buddyType.charAt(0).toUpperCase() + buddyType.slice(1)}{" "}
                  companion
                </Text>
              )}
              <View
                style={[
                  styles.buddyChevronPill,
                  { backgroundColor: buddyColor + "18" },
                ]}
              >
                <Text style={[styles.buddyChevronText, { color: buddyColor }]}>
                  {buddyType ? "Change" : "Select"}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={buddyColor} />
              </View>
            </View>
            <View
              style={[
                styles.buddyAnimationContainer,
                { backgroundColor: buddyColor + "10" },
              ]}
            >
              {buddyType ? (
                <BuddyWalkingSprite buddyId={buddyType} size={90} />
              ) : (
                <Text style={{ fontSize: 48 }}>{"\uD83E\uDD7E"}</Text>
              )}
            </View>
          </Pressable>
        </Animated.View>

        {/* Gear Shop Button */}
        <Animated.View
          entering={FadeInUp.delay(250).duration(400)}
          style={shopSlideAnimation.animatedStyle}
        >
          <Pressable
            style={[
              styles.shopButton,
              glassStyles.subtleCard(isDark),
              { backgroundColor: theme.card },
            ]}
            onPressIn={shopSlideAnimation.onPressIn}
            onPressOut={shopSlideAnimation.onPressOut}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("Shop" as any);
            }}
          >
            <View
              style={[
                styles.shopIconContainer,
                { backgroundColor: "#FF570015" },
              ]}
            >
              <Image
                source={require("../../../assets/trail-buddies/backpack for hikewise.webp")}
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
              />
            </View>
            <View style={styles.shopTextContainer}>
              <Text style={[styles.shopButtonTitle, { color: theme.text }]}>
                Gear Shop
              </Text>
              <Text
                style={[
                  styles.shopButtonSubtitle,
                  { color: theme.textSecondary },
                ]}
              >
                Equip Nora for the trail ahead
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        </Animated.View>

        {/* ===== SECTION: YOUR STATS ===== */}
        <Animated.View entering={FadeIn.delay(300).duration(400)}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            YOUR STATS
          </Text>
        </Animated.View>

        {/* Level Progress Card */}
        <Animated.View entering={FadeInUp.delay(320).duration(400)}>
          <Pressable
            style={[
              styles.levelCard,
              glassStyles.subtleCard(isDark),
              { backgroundColor: theme.card },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                `Level ${userLevel}`,
                `Every 3 hours of focus time earns you a new level.\n\nTotal focus: ${totalHours}h ${remainingMinutes}m\nNext level in: ${180 - (totalMinutes % 180)} minutes`,
              );
            }}
          >
            <View style={styles.levelHeader}>
              <View
                style={[
                  styles.levelBadgeIcon,
                  { backgroundColor: theme.primary + "20" },
                ]}
              >
                <Ionicons
                  name="shield-outline"
                  size={20}
                  color={theme.primary}
                />
              </View>
              <View style={styles.levelInfo}>
                <Text style={[styles.levelTitle, { color: theme.text }]}>
                  Level {userLevel}
                </Text>
                <Text
                  style={[styles.levelSubtitle, { color: theme.textSecondary }]}
                >
                  {180 - (totalMinutes % 180)} min to Level {userLevel + 1}
                </Text>
              </View>
              <Text style={[styles.levelXp, { color: theme.primary }]}>
                {totalMinutes % 180}/180 XP
              </Text>
            </View>
            <View
              style={[
                styles.levelProgressBg,
                { backgroundColor: theme.text + "10" },
              ]}
            >
              <View
                style={[
                  styles.levelProgressFill,
                  {
                    width: `${((totalMinutes % 180) / 180) * 100}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
          </Pressable>
        </Animated.View>

        {/* Stats Row 1 - Featured (2 wide cards) */}
        <Animated.View
          ref={statsRef}
          collapsable={false}
          entering={FadeInUp.delay(350).duration(400)}
          style={styles.statsRowFeatured}
          onLayout={(e) => {
            sectionOffsets.current["stats"] = e.nativeEvent.layout.y;
          }}
        >
          <Pressable
            style={[
              styles.statCardFeatured,
              glassStyles.subtleCard(isDark),
              { backgroundColor: theme.card },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                "Flint Currency",
                `You have ${flintCurrency} Flint!\n\nEarn 1 Flint for every minute of completed focus time. Spend Flint in the Gear Shop to customize your trail buddy and unlock new trails.`,
              );
            }}
          >
            <View
              style={[styles.statIconSmall, { backgroundColor: "#FF570015" }]}
            >
              <FlintIcon size={22} color="#FF5700" />
            </View>
            <Animated.Text
              style={[styles.statNumberFeatured, { color: theme.text }]}
            >
              {Math.round(flintCounter.value * 10) / 10}
            </Animated.Text>
            <Text
              style={[styles.statLabelFeatured, { color: theme.textSecondary }]}
            >
              Flint
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.statCardFeatured,
              glassStyles.subtleCard(isDark),
              { backgroundColor: theme.card },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                "Total Focus Time",
                `You've focused for ${totalHours} hours and ${remainingMinutes} minutes total!\n\nThis is your lifetime focus time across all completed sessions. Keep building your focus habit!`,
              );
            }}
          >
            <View
              style={[
                styles.statIconSmall,
                { backgroundColor: theme.primary + "15" },
              ]}
            >
              <Ionicons name="time-outline" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.statNumberFeatured, { color: theme.text }]}>
              {totalHours}h {remainingMinutes}m
            </Text>
            <Text
              style={[styles.statLabelFeatured, { color: theme.textSecondary }]}
            >
              Focus Time
            </Text>
          </Pressable>
        </Animated.View>

        {/* Stats Row 2 - Compact (3 cards) */}
        <Animated.View
          entering={FadeInUp.delay(400).duration(400)}
          style={styles.statsRowCompact}
        >
          <Pressable
            style={[
              styles.statCardCompact,
              glassStyles.subtleCard(isDark),
              { backgroundColor: theme.card },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                "Total Sessions",
                "The total number of focus sessions you've started, including both completed and cancelled sessions.",
              );
            }}
          >
            <View
              style={[
                styles.statIconTiny,
                { backgroundColor: theme.primary + "15" },
              ]}
            >
              <Ionicons name="timer-outline" size={18} color={theme.primary} />
            </View>
            <Animated.Text
              style={[styles.statNumberCompact, { color: theme.text }]}
            >
              {Math.round(sessionsCounter.value)}
            </Animated.Text>
            <Text
              style={[styles.statLabelCompact, { color: theme.textSecondary }]}
            >
              Total Sessions
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.statCardCompact,
              glassStyles.subtleCard(isDark),
              { backgroundColor: theme.card },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                "Peak Reached",
                "Your highest achievement badge earned so far. Complete more focus sessions to unlock new achievements!",
              );
            }}
          >
            <View
              style={[styles.statIconTiny, { backgroundColor: "#FFD70015" }]}
            >
              {userBadges.length > 0 ? (
                <Text style={{ fontSize: 18 }}>{userBadges[0].icon}</Text>
              ) : (
                <Ionicons name="trophy-outline" size={18} color="#FFD700" />
              )}
            </View>
            <Text
              style={[
                styles.statNumberCompact,
                { color: theme.text, fontSize: 13 },
              ]}
              numberOfLines={1}
            >
              {userBadges.length > 0 ? userBadges[0].name : "No Peak"}
            </Text>
            <Text
              style={[styles.statLabelCompact, { color: theme.textSecondary }]}
            >
              Peak Reached
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.statCardCompact,
              glassStyles.subtleCard(isDark),
              { backgroundColor: theme.card },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                "Completed Sessions",
                "Focus sessions you finished successfully (not cancelled). Only completed sessions count toward your Flint earnings!",
              );
            }}
          >
            <View
              style={[styles.statIconTiny, { backgroundColor: "#4CAF5015" }]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#4CAF50"
              />
            </View>
            <Animated.Text
              style={[styles.statNumberCompact, { color: theme.text }]}
            >
              {Math.round(completedCounter.value)}
            </Animated.Text>
            <Text
              style={[styles.statLabelCompact, { color: theme.textSecondary }]}
            >
              Completed
            </Text>
          </Pressable>
        </Animated.View>

        {/* ===== SECTION: PROFILE SETTINGS ===== */}
        <Animated.View entering={FadeIn.delay(450).duration(400)}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            PROFILE SETTINGS
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(470).duration(400)}>
          <View
            style={[
              styles.profileLinksCard,
              glassStyles.subtleCard(isDark),
              { backgroundColor: theme.card },
            ]}
          >
            {PROFILE_LINKS.map((link, i) => (
              <Pressable
                key={link.route}
                style={[
                  styles.profileLinkRow,
                  i !== PROFILE_LINKS.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.text + "12",
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate(link.route as any);
                }}
              >
                <View
                  style={[
                    styles.profileLinkIcon,
                    { backgroundColor: theme.primary + "15" },
                  ]}
                >
                  <Ionicons name={link.icon} size={18} color={theme.primary} />
                </View>
                <View style={styles.profileLinkTextContainer}>
                  <Text
                    style={[styles.profileLinkLabel, { color: theme.text }]}
                  >
                    {link.label}
                  </Text>
                  <Text
                    style={[
                      styles.profileLinkSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {link.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.textSecondary}
                />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* ===== EDIT PROFILE MODAL ===== */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Edit Profile
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close-outline" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Full Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.primary + "44",
                    color: theme.text,
                  },
                ]}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter your full name"
                placeholderTextColor={theme.text + "66"}
              />

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.text, marginTop: 16 },
                ]}
              >
                Username
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.primary + "44",
                    color: theme.text,
                  },
                ]}
                value={editedUsername}
                onChangeText={setEditedUsername}
                placeholder="Enter your username"
                placeholderTextColor={theme.text + "66"}
                autoCapitalize="none"
              />

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.text, marginTop: 16 },
                ]}
              >
                University / School
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.primary + "44",
                    color: theme.text,
                  },
                ]}
                value={editedUniversity}
                onChangeText={setEditedUniversity}
                placeholder="Enter your university or school"
                placeholderTextColor={theme.text + "66"}
              />

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.text, marginTop: 16 },
                ]}
              >
                Location
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.primary + "44",
                    color: theme.text,
                  },
                ]}
                value={editedLocation}
                onChangeText={setEditedLocation}
                placeholder="City, Country"
                placeholderTextColor={theme.text + "66"}
              />

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.text, marginTop: 16 },
                ]}
              >
                Classes
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.primary + "44",
                    color: theme.text,
                  },
                ]}
                value={editedClasses}
                onChangeText={setEditedClasses}
                placeholder="e.g., Math 101, Physics 202"
                placeholderTextColor={theme.text + "66"}
                multiline
              />
            </ScrollView>

            <AnimatedButton
              title={saving ? "Saving..." : "Save Changes"}
              onPress={handleSaveProfileInfo}
              disabled={saving}
              variant="primary"
              size="large"
              gradient={true}
            />
          </View>
        </View>
      </Modal>

      {/* ===== QR CODE MODAL ===== */}
      <Modal
        visible={showQRModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.qrModalContent, { backgroundColor: theme.card }]}
          >
            <TouchableOpacity
              style={styles.qrCloseButton}
              onPress={() => setShowQRModal(false)}
            >
              <Ionicons name="close-outline" size={28} color={theme.text} />
            </TouchableOpacity>

            <Text style={[styles.qrModalTitle, { color: theme.text }]}>
              Share Your Profile
            </Text>
            <Text
              style={[styles.qrModalSubtitle, { color: theme.textSecondary }]}
            >
              Let others scan this QR code to connect with you
            </Text>

            <View style={styles.qrCodeContainer}>
              <QRCode
                value={JSON.stringify({
                  userId: user?.id,
                  username: profile?.username,
                  fullName: profile?.full_name,
                  profileUrl: `hikewise://profile/${user?.id}`,
                })}
                size={250}
                backgroundColor="white"
                color={theme.primary}
              />
            </View>

            <View
              style={[
                styles.profileInfoQR,
                { backgroundColor: theme.background },
              ]}
            >
              <Text style={[styles.profileNameQR, { color: theme.text }]}>
                {profile?.full_name || "Your Name"}
              </Text>
              <Text
                style={[
                  styles.profileUsernameQR,
                  { color: theme.textSecondary },
                ]}
              >
                @{profile?.username || "username"}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Walkthrough Overlay */}
      <InteractiveWalkthrough
        visible={walkthroughVisible}
        onComplete={walkthroughComplete}
        measurements={walkthroughMeasurements}
        steps={PROFILE_STEPS}
        onStepChange={handleWalkthroughStepChange}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ===== HERO =====
  heroSection: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 8,
    paddingHorizontal: 16,
    position: "relative",
  },
  heroActionButton: {
    position: "absolute",
    top: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  heroActionLeft: {
    left: 16,
  },
  heroActionRight: {
    right: 16,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatarRing: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  heroName: {
    ...Typography.h1,
    textAlign: "center",
  },
  heroUsername: {
    ...Typography.bodySmall,
    marginTop: 2,
    textAlign: "center",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 12,
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    maxWidth: 140,
  },
  addDetailsPrompt: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
  },

  // ===== SECTION LABELS =====
  sectionLabel: {
    ...Typography.label,
    paddingHorizontal: 16,
    marginTop: 28,
    marginBottom: 10,
  },

  // ===== STREAK BANNER =====
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  streakLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  streakEmoji: {
    fontSize: 28,
  },
  streakCount: {
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: -2,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  levelText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // ===== TRAIL BUDDY CARD =====
  buddyCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  buddyInfo: {
    flex: 1,
  },
  buddyName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  buddyType: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 10,
  },
  buddyChevronPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 2,
  },
  buddyChevronText: {
    fontSize: 12,
    fontWeight: "600",
  },
  buddyAnimationContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  // ===== GEAR SHOP =====
  shopButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
  },
  shopIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  shopTextContainer: {
    flex: 1,
  },
  shopButtonTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  shopButtonSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  // ===== LEVEL CARD =====
  levelCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  levelBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  levelInfo: {
    flex: 1,
    marginLeft: 12,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  levelSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  levelXp: {
    fontSize: 13,
    fontWeight: "600",
  },
  levelProgressBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  levelProgressFill: {
    height: "100%",
    borderRadius: 3,
  },

  // ===== STATS =====
  statsRowFeatured: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  statCardFeatured: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  statIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNumberFeatured: {
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginBottom: 2,
  },
  statLabelFeatured: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsRowCompact: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  statCardCompact: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statIconTiny: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statNumberCompact: {
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginBottom: 2,
  },
  statLabelCompact: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },

  // ===== PROFILE SETTINGS LINKS =====
  profileLinksCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    overflow: "hidden",
  },
  profileLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  profileLinkIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  profileLinkTextContainer: {
    flex: 1,
  },
  profileLinkLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 1,
  },
  profileLinkSubtitle: {
    fontSize: 12,
  },

  // ===== MODALS =====
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  qrModalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  qrCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
  },
  qrModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 8,
  },
  qrModalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  qrCodeContainer: {
    padding: 20,
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 20,
  },
  profileInfoQR: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  profileNameQR: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  profileUsernameQR: {
    fontSize: 14,
  },
});

export default ProfileScreen;

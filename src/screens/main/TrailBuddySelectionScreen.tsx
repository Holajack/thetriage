import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  FadeInDown,
  runOnJS,
  useDerivedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useConvexProfile } from "../../hooks/useConvex";
import { useSubscriptionTier } from "../../hooks/useSubscriptionTier";
import {
  isBuddyLocked,
  isProOrAbove,
  isElite as isEliteTier,
} from "../../utils/tierGating";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BUDDY_SIZE = 280;
const BUDDY_SPACING = -40;
const ITEM_WIDTH = BUDDY_SIZE + BUDDY_SPACING;

// Spritesheet configuration - each sheet is 5600x200 (28 frames of 200x200)
const FRAME_WIDTH = 200;
const FRAME_HEIGHT = 200;
const TOTAL_FRAMES = 28;

// Use spritesheets instead of individual frames (only 5 images vs 140)
const BUDDY_SPRITESHEETS: Record<string, ImageSourcePropType> = {
  // TODO: swap in dedicated Patrick spritesheet once art is delivered. Fox is a placeholder.
  patrick: require("../../../assets/trail-buddies/fox_walking_optimized.webp"),
  fox: require("../../../assets/trail-buddies/fox_walking_optimized.webp"),
  deer: require("../../../assets/trail-buddies/deer_walking_optimized.webp"),
  wolf: require("../../../assets/trail-buddies/wolf_walking_optimized.webp"),
  nora: require("../../../assets/trail-buddies/nora_walking_optimized.webp"),
  bear: require("../../../assets/trail-buddies/bear_walking_optimized.webp"),
  lion: require("../../../assets/trail-buddies/lion_walking_optimized.webp"),
};

interface TrailBuddy {
  id: string;
  name: string;
  color: string;
  description: string;
  hasAnimation: boolean;
}

const TRAIL_BUDDIES: TrailBuddy[] = [
  {
    id: "patrick",
    name: "Patrick",
    color: "#FF7043",
    description: "Your steady starter buddy",
    hasAnimation: true,
  },
  {
    id: "fox",
    name: "Fox",
    color: "#FF6B35",
    description: "Quick and clever",
    hasAnimation: true,
  },
  {
    id: "bear",
    name: "Bear",
    color: "#8B4513",
    description: "Strong and steady",
    hasAnimation: true,
  },
  {
    id: "deer",
    name: "Deer",
    color: "#C4A484",
    description: "Graceful and calm",
    hasAnimation: true,
  },
  {
    id: "nora",
    name: "Nora",
    color: "#9B59B6",
    description: "Wise and insightful",
    hasAnimation: true,
  },
  {
    id: "wolf",
    name: "Wolf",
    color: "#708090",
    description: "Loyal and determined",
    hasAnimation: true,
  },
  {
    id: "lion",
    name: "Lion",
    color: "#FFD700",
    description: "Regal and powerful",
    hasAnimation: true,
  },
];

const BUDDY_EMOJIS: Record<string, string> = {
  patrick: "🎒",
  fox: "🦊",
  bear: "🐻",
  deer: "🦌",
  nora: "🔮",
  wolf: "🐺",
  lion: "🦁",
};

// Animated Sprite Component using spritesheet - cycles through frames by offsetting the image
const AnimatedSprite = ({
  buddyId,
  isSelected,
  displaySize = 180,
}: {
  buddyId: string;
  isSelected: boolean;
  displaySize?: number;
}) => {
  const spritesheet = BUDDY_SPRITESHEETS[buddyId] || BUDDY_SPRITESHEETS.bear;

  // Frame index driven on the UI thread to avoid JS-thread re-renders (~20fps)
  const frame = useSharedValue(0);

  // Geometry scaled to the display size
  const displayScale = displaySize / FRAME_HEIGHT;
  const frameStride = FRAME_WIDTH * displayScale;
  const spritesheetWidth = frameStride * TOTAL_FRAMES;

  useEffect(() => {
    if (!isSelected) {
      cancelAnimation(frame);
      frame.value = 0;
      return;
    }

    // Smooth walking animation - ~50ms per frame (~20 fps for a smooth 28-frame loop)
    // Full cycle takes ~1.4 seconds (28 frames * 50ms)
    frame.value = withRepeat(
      withTiming(TOTAL_FRAMES, {
        duration: TOTAL_FRAMES * 50,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(frame);
    };
  }, [isSelected]);

  // Offset the spritesheet to show the current frame
  const frameStyle = useAnimatedStyle(() => {
    const currentFrame = Math.floor(frame.value) % TOTAL_FRAMES;
    return {
      transform: [{ translateX: -currentFrame * frameStride }],
    };
  });

  return (
    <View
      style={[
        styles.spriteContainer,
        {
          width: displaySize,
          height: displaySize,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      {/* Clip container to show only one frame */}
      <View
        style={{ width: displaySize, height: displaySize, overflow: "hidden" }}
      >
        <Animated.Image
          source={spritesheet}
          style={[
            {
              width: spritesheetWidth,
              height: displaySize,
            },
            frameStyle,
          ]}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

// Parallax Buddy Item Component
const BuddyItem = ({
  buddy,
  index,
  scrollX,
  onSelect,
}: {
  buddy: TrailBuddy;
  index: number;
  scrollX: SharedValue<number>;
  onSelect: () => void;
}) => {
  const { theme, isDark } = useTheme();

  const inputRange = [
    (index - 1) * ITEM_WIDTH,
    index * ITEM_WIDTH,
    (index + 1) * ITEM_WIDTH,
  ];

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolation.CLAMP,
    );

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [60, 0, 60],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  const [selected, setSelected] = useState(
    Math.abs(scrollX.value / ITEM_WIDTH - index) < 0.5,
  );

  useDerivedValue(() => {
    const centerOffset = scrollX.value / ITEM_WIDTH;
    const isNowSelected = Math.abs(centerOffset - index) < 0.5;
    if (isNowSelected !== selected) {
      runOnJS(setSelected)(isNowSelected);
    }
  });

  const shadowStyle = useAnimatedStyle(() => {
    const width = interpolate(
      scrollX.value,
      inputRange,
      [60, 100, 60],
      Extrapolation.CLAMP,
    );
    const height = interpolate(
      scrollX.value,
      inputRange,
      [16, 24, 16],
      Extrapolation.CLAMP,
    );
    return { width, height };
  });

  const characterSize = BUDDY_SIZE - 80;

  return (
    <TouchableOpacity onPress={onSelect} activeOpacity={0.9}>
      <Animated.View style={[styles.buddyItem, animatedStyle]}>
        <View style={styles.characterContainer}>
          {buddy.hasAnimation ? (
            <AnimatedSprite
              buddyId={buddy.id}
              isSelected={selected}
              displaySize={characterSize}
            />
          ) : (
            <Text
              style={[styles.buddyEmoji, { fontSize: characterSize * 0.5 }]}
            >
              {BUDDY_EMOJIS[buddy.id]}
            </Text>
          )}
        </View>

        {/* Shadow ellipse */}
        <Animated.View
          style={[
            styles.shadowEllipse,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.08)",
            },
            shadowStyle,
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const TrailBuddySelectionScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { profile, updateProfile } = useConvexProfile();

  // Find initial index based on saved buddy type
  const getInitialIndex = () => {
    if (profile?.trail_buddy_type) {
      const savedIndex = TRAIL_BUDDIES.findIndex(
        (b) => b.id === profile.trail_buddy_type,
      );
      return savedIndex >= 0 ? savedIndex : 1;
    }
    return 1; // Default to bear (middle)
  };

  const [selectedIndex, setSelectedIndex] = useState(getInitialIndex());
  const [buddyName, setBuddyName] = useState(profile?.trail_buddy_name || "");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const scrollX = useSharedValue(getInitialIndex() * ITEM_WIDTH);
  const flatListRef = useRef<Animated.FlatList<TrailBuddy>>(null);

  // Update state when profile loads
  useEffect(() => {
    if (profile && !initialized) {
      const savedIndex = TRAIL_BUDDIES.findIndex(
        (b) => b.id === profile.trail_buddy_type,
      );
      if (savedIndex >= 0) {
        setSelectedIndex(savedIndex);
        scrollX.value = savedIndex * ITEM_WIDTH;
        // Correct the position immediately if the profile arrived after mount
        flatListRef.current?.scrollToOffset({
          offset: savedIndex * ITEM_WIDTH,
          animated: false,
        });
      }
      if (profile.trail_buddy_name) {
        setBuddyName(profile.trail_buddy_name);
      }
      setInitialized(true);
    }
  }, [profile, initialized]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
    onMomentumEnd: (event) => {
      const index = Math.round(event.contentOffset.x / ITEM_WIDTH);
      runOnJS(setSelectedIndex)(index);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const { currentTier } = useSubscriptionTier();
  const tier = currentTier;
  const isElite = isEliteTier(tier);
  const isPro = isProOrAbove(tier);

  const handleBuddySelect = useCallback(
    (index: number) => {
      const buddy = TRAIL_BUDDIES[index];
      if (isBuddyLocked(tier, buddy.id)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        const message =
          buddy.id === "lion"
            ? "The Lion is an exclusive trail buddy available only to Elite members."
            : isPro
              ? `${buddy.name} is available to Pro and Elite members.`
              : `${buddy.name} is available with a Pro or Elite subscription. Upgrade to unlock more buddies.`;
        Alert.alert("Locked", message);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedIndex(index);
      flatListRef.current?.scrollToOffset({
        offset: index * ITEM_WIDTH,
        animated: true,
      });
    },
    [tier, isPro],
  );

  const handleStart = async () => {
    if (!buddyName.trim()) {
      Alert.alert("Name Required", "Please give your trail buddy a name!");
      return;
    }

    const selectedBuddy = TRAIL_BUDDIES[selectedIndex];
    if (isBuddyLocked(tier, selectedBuddy.id)) {
      Alert.alert(
        "Locked",
        `${selectedBuddy.name} requires a higher subscription tier.`,
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      await updateProfile({
        trail_buddy_type: selectedBuddy.id,
        trail_buddy_name: buddyName.trim(),
      });

      Alert.alert(
        "Trail Buddy Selected!",
        `${buddyName} the ${selectedBuddy.name} is now your companion on your focus journeys!`,
        [{ text: "Awesome!", onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      // Error saving trail buddy
      Alert.alert(
        "Error",
        "Could not save your trail buddy. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderBuddy = useCallback(
    ({ item, index }: { item: TrailBuddy; index: number }) => (
      <BuddyItem
        buddy={item}
        index={index}
        scrollX={scrollX}
        onSelect={() => handleBuddySelect(index)}
      />
    ),
    [scrollX, handleBuddySelect],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    }),
    [],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.goBack();
        }}
      >
        <Ionicons name="chevron-back" size={28} color={theme.text} />
      </TouchableOpacity>

      {/* Title Section */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        style={styles.titleSection}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          Choose A Trail Buddy
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          You can change anytime
        </Text>
      </Animated.View>

      {/* Parallax Buddy Carousel */}
      <View style={styles.carouselContainer}>
        <Animated.FlatList
          ref={flatListRef}
          data={TRAIL_BUDDIES}
          renderItem={renderBuddy}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          contentContainerStyle={styles.carouselContent}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          getItemLayout={getItemLayout}
          initialScrollIndex={getInitialIndex()}
        />
      </View>

      {/* Selected Buddy Info */}
      <View style={styles.buddyInfoSection}>
        <Text
          style={[
            styles.buddyInfoName,
            { color: TRAIL_BUDDIES[selectedIndex]?.color || theme.text },
          ]}
        >
          {TRAIL_BUDDIES[selectedIndex]?.name}
        </Text>
        <Text style={[styles.buddyInfoDesc, { color: theme.textSecondary }]}>
          {TRAIL_BUDDIES[selectedIndex]?.description}
        </Text>
        {TRAIL_BUDDIES[selectedIndex] &&
          isBuddyLocked(tier, TRAIL_BUDDIES[selectedIndex].id) && (
            <View style={styles.eliteBadge}>
              <Ionicons name="lock-closed" size={14} color="#FFD700" />
              <Text style={styles.eliteBadgeText}>
                {TRAIL_BUDDIES[selectedIndex].id === "lion"
                  ? "ELITE ONLY"
                  : "PRO OR ELITE"}
              </Text>
            </View>
          )}
      </View>

      {/* Name Input */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(500)}
        style={styles.inputSection}
      >
        <TextInput
          style={[
            styles.nameInput,
            {
              color: theme.text,
              borderBottomColor: theme.textSecondary + "50",
            },
          ]}
          placeholder="Give a name"
          placeholderTextColor={theme.textSecondary + "80"}
          value={buddyName}
          onChangeText={setBuddyName}
          autoCapitalize="words"
          maxLength={20}
        />
      </Animated.View>

      {/* Start Button */}
      <Animated.View
        entering={FadeInDown.delay(400).duration(500)}
        style={styles.buttonSection}
      >
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: theme.primary }]}
          onPress={handleStart}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>
            {saving ? "Saving..." : "Start"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  titleSection: {
    alignItems: "center",
    marginTop: 70,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
  },
  carouselContainer: {
    height: BUDDY_SIZE + 40,
    marginBottom: 0,
  },
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - ITEM_WIDTH) / 2,
    alignItems: "center",
  },
  buddyItem: {
    width: ITEM_WIDTH,
    height: BUDDY_SIZE,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 20,
  },
  characterContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  buddyEmoji: {},
  spriteContainer: {
    overflow: "hidden",
  },
  shadowEllipse: {
    borderRadius: 50,
    marginTop: -5,
  },
  buddyInfoSection: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 0,
  },
  buddyInfoName: {
    fontSize: 22,
    fontWeight: "700",
  },
  buddyInfoDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  eliteBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFD70020",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  eliteBadgeText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  inputSection: {
    paddingHorizontal: 50,
    marginTop: 20,
    marginBottom: 30,
  },
  nameInput: {
    fontSize: 18,
    textAlign: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  buttonSection: {
    paddingHorizontal: 60,
    alignItems: "center",
  },
  startButton: {
    paddingVertical: 16,
    paddingHorizontal: 70,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default TrailBuddySelectionScreen;

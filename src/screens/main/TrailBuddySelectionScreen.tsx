import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  FadeInDown,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSupabaseProfile } from '../../utils/supabaseHooks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUDDY_SIZE = 280;
const BUDDY_SPACING = -40;
const ITEM_WIDTH = BUDDY_SIZE + BUDDY_SPACING;

// Spritesheet configuration - each sheet is 5600x200 (28 frames of 200x200)
const FRAME_WIDTH = 200;
const FRAME_HEIGHT = 200;
const TOTAL_FRAMES = 28;

// Use spritesheets instead of individual frames (only 5 images vs 140)
const BUDDY_SPRITESHEETS: Record<string, ImageSourcePropType> = {
  fox: require('../../../assets/trail-buddies/fox_walking_optimized.png'),
  deer: require('../../../assets/trail-buddies/deer_walking_optimized.png'),
  wolf: require('../../../assets/trail-buddies/wolf_walking_optimized.png'),
  nora: require('../../../assets/trail-buddies/nora_walking_optimized.png'),
  bear: require('../../../assets/trail-buddies/bear_walking_optimized.png'),
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
    id: 'fox',
    name: 'Fox',
    color: '#FF6B35',
    description: 'Quick and clever',
    hasAnimation: true,
  },
  {
    id: 'bear',
    name: 'Bear',
    color: '#8B4513',
    description: 'Strong and steady',
    hasAnimation: true,
  },
  {
    id: 'deer',
    name: 'Deer',
    color: '#C4A484',
    description: 'Graceful and calm',
    hasAnimation: true,
  },
  {
    id: 'nora',
    name: 'Nora',
    color: '#9B59B6',
    description: 'Wise and insightful',
    hasAnimation: true,
  },
  {
    id: 'wolf',
    name: 'Wolf',
    color: '#708090',
    description: 'Loyal and determined',
    hasAnimation: true,
  },
];

const BUDDY_EMOJIS: Record<string, string> = {
  fox: '🦊',
  bear: '🐻',
  deer: '🦌',
  nora: '🔮',
  wolf: '🐺',
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
  const [currentFrame, setCurrentFrame] = useState(0);
  const spritesheet = BUDDY_SPRITESHEETS[buddyId] || BUDDY_SPRITESHEETS.bear;

  useEffect(() => {
    if (!isSelected) {
      setCurrentFrame(0);
      return;
    }

    // Smooth walking animation - 50ms per frame (~20 fps for smooth 28-frame loop)
    // Full cycle takes ~1.4 seconds (28 frames * 50ms)
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % TOTAL_FRAMES);
    }, 50);

    return () => clearInterval(interval);
  }, [isSelected]);

  // Calculate the offset to show the current frame (scaled to display size)
  const displayScale = displaySize / FRAME_HEIGHT;
  const frameOffset = -currentFrame * FRAME_WIDTH * displayScale;
  const spritesheetWidth = FRAME_WIDTH * TOTAL_FRAMES * displayScale;

  return (
    <View
      style={[
        styles.spriteContainer,
        {
          width: displaySize,
          height: displaySize,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      {/* Clip container to show only one frame */}
      <View style={{ width: displaySize, height: displaySize, overflow: 'hidden' }}>
        <Image
          source={spritesheet}
          style={{
            width: spritesheetWidth,
            height: displaySize,
            transform: [{ translateX: frameOffset }],
          }}
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
  scrollX: Animated.SharedValue<number>;
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
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [60, 0, 60],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  const [selected, setSelected] = useState(index === 1);

  useDerivedValue(() => {
    const centerOffset = scrollX.value / ITEM_WIDTH;
    const isNowSelected = Math.abs(centerOffset - index) < 0.5;
    if (isNowSelected !== selected) {
      runOnJS(setSelected)(isNowSelected);
    }
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
            <Text style={[styles.buddyEmoji, { fontSize: characterSize * 0.5 }]}>
              {BUDDY_EMOJIS[buddy.id]}
            </Text>
          )}
        </View>

        {/* Shadow ellipse */}
        <View
          style={[
            styles.shadowEllipse,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              width: selected ? 100 : 60,
              height: selected ? 24 : 16,
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const TrailBuddySelectionScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { profile, updateProfile } = useSupabaseProfile();

  // Find initial index based on saved buddy type
  const getInitialIndex = () => {
    if (profile?.trail_buddy_type) {
      const savedIndex = TRAIL_BUDDIES.findIndex(b => b.id === profile.trail_buddy_type);
      return savedIndex >= 0 ? savedIndex : 1;
    }
    return 1; // Default to bear (middle)
  };

  const [selectedIndex, setSelectedIndex] = useState(getInitialIndex());
  const [buddyName, setBuddyName] = useState(profile?.trail_buddy_name || '');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const scrollX = useSharedValue(getInitialIndex() * ITEM_WIDTH);
  const flatListRef = useRef<Animated.FlatList<TrailBuddy>>(null);

  // Update state when profile loads
  useEffect(() => {
    if (profile && !initialized) {
      const savedIndex = TRAIL_BUDDIES.findIndex(b => b.id === profile.trail_buddy_type);
      if (savedIndex >= 0) {
        setSelectedIndex(savedIndex);
        scrollX.value = savedIndex * ITEM_WIDTH;
        // Scroll to saved buddy after a short delay to ensure FlatList is ready
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: savedIndex * ITEM_WIDTH,
            animated: false,
          });
        }, 100);
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

  const handleBuddySelect = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIndex(index);
    flatListRef.current?.scrollToOffset({
      offset: index * ITEM_WIDTH,
      animated: true,
    });
  }, []);

  const handleStart = async () => {
    if (!buddyName.trim()) {
      Alert.alert('Name Required', 'Please give your trail buddy a name!');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      const selectedBuddy = TRAIL_BUDDIES[selectedIndex];
      await updateProfile({
        trail_buddy_type: selectedBuddy.id,
        trail_buddy_name: buddyName.trim(),
      });

      Alert.alert(
        'Trail Buddy Selected!',
        `${buddyName} the ${selectedBuddy.name} is now your companion on your focus journeys!`,
        [{ text: 'Awesome!', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving trail buddy:', error);
      Alert.alert('Error', 'Could not save your trail buddy. Please try again.');
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
    [scrollX, handleBuddySelect]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    }),
    []
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
      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.titleSection}>
        <Text style={[styles.title, { color: theme.text }]}>Choose A Trail Buddy</Text>
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
          initialScrollIndex={1}
        />
      </View>

      {/* Name Input */}
      <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.inputSection}>
        <TextInput
          style={[
            styles.nameInput,
            {
              color: theme.text,
              borderBottomColor: theme.textSecondary + '50',
            },
          ]}
          placeholder="Give a name"
          placeholderTextColor={theme.textSecondary + '80'}
          value={buddyName}
          onChangeText={setBuddyName}
          autoCapitalize="words"
          maxLength={20}
        />
      </Animated.View>

      {/* Start Button */}
      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.buttonSection}>
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: theme.primary }]}
          onPress={handleStart}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>{saving ? 'Saving...' : 'Start'}</Text>
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
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  titleSection: {
    alignItems: 'center',
    marginTop: 70,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
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
    alignItems: 'center',
  },
  buddyItem: {
    width: ITEM_WIDTH,
    height: BUDDY_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  characterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddyEmoji: {},
  spriteContainer: {
    overflow: 'hidden',
  },
  shadowEllipse: {
    borderRadius: 50,
    marginTop: -5,
  },
  inputSection: {
    paddingHorizontal: 50,
    marginTop: 20,
    marginBottom: 30,
  },
  nameInput: {
    fontSize: 18,
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  buttonSection: {
    paddingHorizontal: 60,
    alignItems: 'center',
  },
  startButton: {
    paddingVertical: 16,
    paddingHorizontal: 70,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default TrailBuddySelectionScreen;

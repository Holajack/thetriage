import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
import { useTheme } from '../../context/ThemeContext';
import { useConvexProfile } from '../../hooks/useConvex';
import NoraSpeechBubble from '../../components/onboarding/NoraSpeechBubble';
import { AnimatedButton } from '../../components/premium/AnimatedButton';

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

const DEFAULT_NAMES: Record<string, string> = {
  fox: 'Scout',
  bear: 'Bruno',
  deer: 'Willow',
  nora: 'Nora',
  wolf: 'Shadow',
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
  isDark,
}: {
  buddy: TrailBuddy;
  index: number;
  scrollX: Animated.SharedValue<number>;
  onSelect: () => void;
  isDark: boolean;
}) => {
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

const OnboardingTrailBuddyScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { updateProfile } = useConvexProfile();

  const [selectedIndex, setSelectedIndex] = useState(1); // Default to bear (middle)
  const [buddyName, setBuddyName] = useState(DEFAULT_NAMES['bear']);
  const [saving, setSaving] = useState(false);

  const scrollX = useSharedValue(ITEM_WIDTH);
  const flatListRef = useRef<Animated.FlatList<TrailBuddy>>(null);

  // Update default name when selected buddy changes
  useEffect(() => {
    const selectedBuddyId = TRAIL_BUDDIES[selectedIndex]?.id;
    if (selectedBuddyId) {
      setBuddyName(DEFAULT_NAMES[selectedBuddyId]);
    }
  }, [selectedIndex]);

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

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      const selectedBuddy = TRAIL_BUDDIES[selectedIndex];
      await updateProfile({
        trailBuddyType: selectedBuddy.id,
        trailBuddyName: buddyName.trim() || DEFAULT_NAMES[selectedBuddy.id],
      });

      navigation.navigate('FocusSoundSetup' as any);
    } catch (error) {
      console.error('Error saving trail buddy:', error);
      alert('Could not save your trail buddy. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const renderBuddy = useCallback(
    ({ item, index }: { item: TrailBuddy; index: number }) => (
      <BuddyItem
        buddy={item}
        index={index}
        scrollX={scrollX}
        onSelect={() => handleBuddySelect(index)}
        isDark={isDark}
      />
    ),
    [scrollX, handleBuddySelect, isDark]
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
    <LinearGradient
      colors={
        isDark
          ? ['#000000', '#1a1a1a', '#2a2a2a', '#1a1a1a']
          : ['#0F2419', '#1B4A3A', '#2E5D4F', '#1B4A3A']
      }
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Step Indicator */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={styles.stepIndicator}>Step 3 of 5</Text>
        </Animated.View>

        {/* Nora Speech Bubble */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          style={styles.speechBubbleContainer}
        >
          <NoraSpeechBubble
            message="Choose a study buddy to walk with you on your learning journey!"
            size={80}
          />
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
        <Animated.View
          entering={FadeInDown.delay(400).duration(500)}
          style={styles.nameInputContainer}
        >
          <Text style={styles.nameLabel}>Give your buddy a name (optional)</Text>
          <TextInput
            style={[
              styles.nameInput,
              {
                color: '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)',
              },
            ]}
            placeholder={DEFAULT_NAMES[TRAIL_BUDDIES[selectedIndex]?.id || 'bear']}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={buddyName}
            onChangeText={setBuddyName}
            autoCapitalize="words"
            maxLength={20}
          />
        </Animated.View>

        {/* Continue Button */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(500)}
          style={styles.buttonContainer}
        >
          <AnimatedButton
            title={saving ? 'Saving...' : 'Continue'}
            onPress={handleContinue}
            variant="primary"
            size="large"
            disabled={saving}
            fullWidth
            gradient
            gradientColors={[theme.primary, '#4CAF50']}
          />
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  stepIndicator: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 16,
    fontWeight: '600',
  },
  speechBubbleContainer: {
    marginBottom: 24,
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
  nameInputContainer: {
    marginBottom: 32,
    marginTop: 20,
  },
  nameLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  nameInput: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: 20,
  },
});

export default OnboardingTrailBuddyScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

// Spritesheet config — matches TrailBuddySelectionScreen
const FRAME_WIDTH = 200;
const FRAME_HEIGHT = 200;
const TOTAL_FRAMES = 28;

const noraSpritesheet = require('../../../assets/trail-buddies/nora_walking_optimized.png');

interface NoraSpeechBubbleProps {
  message: string;
  size?: number;
  animate?: boolean;
}

export default function NoraSpeechBubble({
  message,
  size = 100,
  animate = true,
}: NoraSpeechBubbleProps) {
  const { theme } = useTheme();
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % TOTAL_FRAMES);
    }, 50);
    return () => clearInterval(interval);
  }, [animate]);

  const scale = size / FRAME_HEIGHT;

  return (
    <View style={styles.container}>
      {/* Nora sprite */}
      <Animated.View
        entering={FadeIn.duration(600)}
        style={[styles.spriteWrapper, { width: size, height: size }]}
      >
        <View
          style={{
            width: size,
            height: size,
            overflow: 'hidden',
            borderRadius: size / 2,
            backgroundColor: theme.isDark ? 'rgba(155,89,182,0.15)' : 'rgba(155,89,182,0.1)',
          }}
        >
          <Image
            source={noraSpritesheet}
            style={{
              width: FRAME_WIDTH * TOTAL_FRAMES * scale,
              height: size,
              transform: [{ translateX: -currentFrame * FRAME_WIDTH * scale }],
            }}
            resizeMode="cover"
          />
        </View>
      </Animated.View>

      {/* Speech bubble */}
      <Animated.View
        entering={FadeInRight.duration(500).delay(300)}
        style={[
          styles.bubble,
          {
            backgroundColor: theme.isDark ? '#2a2a3a' : '#FFFFFF',
            borderColor: theme.isDark ? '#3a3a4a' : '#E0E0E0',
          },
        ]}
      >
        <View style={styles.bubbleTail}>
          <View
            style={[
              styles.tailTriangle,
              {
                borderRightColor: theme.isDark ? '#2a2a3a' : '#FFFFFF',
              },
            ]}
          />
        </View>
        <Text
          style={[
            styles.messageText,
            { color: theme.isDark ? '#E0E0E0' : '#333333' },
          ]}
        >
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  spriteWrapper: {
    marginRight: 8,
  },
  bubble: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'relative',
  },
  bubbleTail: {
    position: 'absolute',
    left: -8,
    top: '50%',
    marginTop: -6,
  },
  tailTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});

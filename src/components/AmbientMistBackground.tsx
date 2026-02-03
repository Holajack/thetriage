import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MistBlobConfig {
  size: number;
  startX: number;
  startY: number;
  driftX: [number, number];
  driftY: [number, number];
  durationX: [number, number];
  durationY: [number, number];
  opacityRange: [number, number];
  opacityDuration: number;
  color: string;
  delay: number;
}

const EASING = Easing.inOut(Easing.ease);

const MistBlob: React.FC<{ config: MistBlobConfig }> = ({ config }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(config.opacityRange[0]);

  React.useEffect(() => {
    translateX.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.driftX[0], { duration: config.durationX[0], easing: EASING }),
          withTiming(config.driftX[1], { duration: config.durationX[1], easing: EASING }),
        ),
        -1,
        true,
      ),
    );

    translateY.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.driftY[0], { duration: config.durationY[0], easing: EASING }),
          withTiming(config.driftY[1], { duration: config.durationY[1], easing: EASING }),
        ),
        -1,
        true,
      ),
    );

    opacity.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.opacityRange[1], { duration: config.opacityDuration, easing: EASING }),
          withTiming(config.opacityRange[0], { duration: config.opacityDuration, easing: EASING }),
        ),
        -1,
        true,
      ),
    );

    // Cleanup: cancel animations on unmount
    return () => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.blob,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          left: config.startX,
          top: config.startY,
        },
        animStyle,
      ]}
    />
  );
};

interface AmbientMistBackgroundProps {
  isDark: boolean;
}

const getDarkBlobs = (): MistBlobConfig[] => [
  {
    size: 280,
    startX: -40,
    startY: SCREEN_HEIGHT * 0.1,
    driftX: [60, -30],
    driftY: [40, -20],
    durationX: [8000, 7000],
    durationY: [6000, 9000],
    opacityRange: [0.06, 0.14],
    opacityDuration: 5000,
    color: 'rgb(76, 175, 80)',
    delay: 0,
  },
  {
    size: 240,
    startX: SCREEN_WIDTH * 0.5,
    startY: SCREEN_HEIGHT * 0.05,
    driftX: [-50, 40],
    driftY: [30, -40],
    durationX: [9000, 6500],
    durationY: [7500, 8000],
    opacityRange: [0.04, 0.10],
    opacityDuration: 6000,
    color: 'rgb(6, 182, 212)',
    delay: 2000,
  },
  {
    size: 220,
    startX: SCREEN_WIDTH * 0.3,
    startY: SCREEN_HEIGHT * 0.25,
    driftX: [35, -45],
    driftY: [-30, 25],
    durationX: [7000, 8500],
    durationY: [8000, 6500],
    opacityRange: [0.03, 0.08],
    opacityDuration: 7000,
    color: 'rgb(139, 92, 246)',
    delay: 4000,
  },
];

const getLightBlobs = (): MistBlobConfig[] => [
  {
    size: 280,
    startX: -40,
    startY: SCREEN_HEIGHT * 0.1,
    driftX: [60, -30],
    driftY: [40, -20],
    durationX: [8000, 7000],
    durationY: [6000, 9000],
    opacityRange: [0.05, 0.12],
    opacityDuration: 5000,
    color: 'rgb(56, 142, 60)',
    delay: 0,
  },
  {
    size: 240,
    startX: SCREEN_WIDTH * 0.5,
    startY: SCREEN_HEIGHT * 0.05,
    driftX: [-50, 40],
    driftY: [30, -40],
    durationX: [9000, 6500],
    durationY: [7500, 8000],
    opacityRange: [0.04, 0.10],
    opacityDuration: 6000,
    color: 'rgb(252, 211, 77)',
    delay: 2000,
  },
  {
    size: 220,
    startX: SCREEN_WIDTH * 0.3,
    startY: SCREEN_HEIGHT * 0.25,
    driftX: [35, -45],
    driftY: [-30, 25],
    durationX: [7000, 8500],
    durationY: [8000, 6500],
    opacityRange: [0.04, 0.10],
    opacityDuration: 7000,
    color: 'rgb(200, 230, 201)',
    delay: 4000,
  },
];

export const AmbientMistBackground: React.FC<AmbientMistBackgroundProps> = ({ isDark }) => {
  const blobs = React.useMemo(() => (isDark ? getDarkBlobs() : getLightBlobs()), [isDark]);

  return (
    <>
      {blobs.map((blob, index) => (
        <MistBlob key={index} config={blob} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
  },
});

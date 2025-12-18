import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

// Create animated circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularChartProps {
  percentage: number;
  totalHours: number;
  totalMinutes: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

interface SubjectSegment {
  subject: string;
  percentage: number;
  color: string;
}

interface AnimatedCircularChartProps {
  segments: SubjectSegment[];
  totalHours: number;
  totalMinutes: number;
  size?: number;
  strokeWidth?: number;
}

// Single segment component for animation - fills full circle then positions by offset
const AnimatedSegment: React.FC<{
  size: number;
  radius: number;
  circumference: number;
  color: string;
  percentage: number; // This segment's portion of the full circle
  startOffset: number; // Where this segment starts on the circle
  strokeWidth: number;
  index: number;
  totalSegments: number;
}> = ({ size, radius, circumference, color, percentage, startOffset, strokeWidth, index, totalSegments }) => {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    // Animate each segment with staggered delay - fills its portion
    animatedProgress.value = withDelay(
      index * 150, // Stagger each segment
      withTiming(1, {
        duration: 600 + (index * 100), // Slightly longer for later segments
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => {
    // Calculate the arc length for this segment's percentage of the circle
    const targetArcLength = (percentage / 100) * circumference;
    const currentArcLength = targetArcLength * animatedProgress.value;
    return {
      strokeDasharray: `${currentArcLength} ${circumference}`,
    };
  });

  return (
    <AnimatedCircle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDashoffset={startOffset}
      strokeLinecap="round"
      fill="none"
      animatedProps={animatedProps}
    />
  );
};

// Multi-segment animated circular chart - fills complete circle with subject colors
export const AnimatedCircularChart: React.FC<AnimatedCircularChartProps> = ({
  segments,
  totalHours,
  totalMinutes,
  size = 200,
  strokeWidth = 20,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Normalize segments so they fill the entire circle (100%)
  const totalPercentage = segments.reduce((sum, seg) => sum + seg.percentage, 0);
  const normalizedSegments = totalPercentage > 0
    ? segments.map(seg => ({
        ...seg,
        percentage: (seg.percentage / totalPercentage) * 100 // Normalize to 100%
      }))
    : segments;

  // Calculate start offsets for each segment
  let accumulatedPercentage = 0;
  const segmentsWithOffsets = normalizedSegments.map((segment) => {
    const startOffset = -circumference * (accumulatedPercentage / 100);
    accumulatedPercentage += segment.percentage;
    return { ...segment, startOffset };
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#2C3E50"
            strokeWidth={strokeWidth}
            fill="none"
            opacity={0.2}
          />
          {/* Animated segments - each fills its portion of the circle */}
          {segmentsWithOffsets.map((segment, index) => (
            <AnimatedSegment
              key={segment.subject}
              size={size}
              radius={radius}
              circumference={circumference}
              color={segment.color}
              percentage={segment.percentage}
              startOffset={segment.startOffset}
              strokeWidth={strokeWidth}
              index={index}
              totalSegments={segmentsWithOffsets.length}
            />
          ))}
        </G>
      </Svg>
      <View style={styles.textContainer}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalTime}>{totalHours}h {totalMinutes}m</Text>
      </View>
    </View>
  );
};

// Original simple chart (backward compatible)
export const CircularChart: React.FC<CircularChartProps> = ({
  percentage,
  totalHours,
  totalMinutes,
  color,
  size = 200,
  strokeWidth = 20,
  label = 'The triage',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Animation
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(percentage / 100, {
      duration: 1000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - animatedProgress.value * circumference;
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#2C3E50"
            strokeWidth={strokeWidth}
            fill="none"
            opacity={0.2}
          />
          {/* Animated progress circle */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
            fill="none"
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
      <View style={styles.textContainer}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalTime}>{totalHours}h {totalMinutes}m</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
    marginBottom: 4,
  },
  totalTime: {
    fontSize: 20,
    color: '#4A90E2',
    fontWeight: 'bold',
  },
});

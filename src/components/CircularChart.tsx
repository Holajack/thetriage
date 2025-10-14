import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Circle, G } from 'react-native-svg';

interface CircularChartProps {
  percentage: number;
  totalHours: number;
  totalMinutes: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

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
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

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
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
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

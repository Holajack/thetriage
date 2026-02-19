/**
 * RadarChart Component
 *
 * Renders a radar/spider chart visualization for quiz results using react-native-svg.
 * Shows sub-dimension scores in a visually appealing format.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

interface RadarDataPoint {
  axis: string;
  slug: string;
  value: number; // 0-1 scale
  displayValue: number; // percentage
  percentile?: number;
  description: string;
  order: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
  color?: string;
  showLabels?: boolean;
  showPercentiles?: boolean;
  showGrid?: boolean;
  animated?: boolean;
  comparisonData?: RadarDataPoint[]; // Optional overlay for comparison
}

const RadarChart: React.FC<RadarChartProps> = ({
  data,
  size = 280,
  color,
  showLabels = true,
  showPercentiles = false,
  showGrid = true,
  comparisonData,
}) => {
  const { theme } = useTheme();
  const chartColor = color || theme.primary;

  // Sort data by order
  const sortedData = [...data].sort((a, b) => a.order - b.order);
  const sortedComparisonData = comparisonData
    ? [...comparisonData].sort((a, b) => a.order - b.order)
    : null;

  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = (size / 2) * 0.78; // Big polygon — fills the chart
  const labelRadius = (size / 2) * 0.88; // Initials outside polygon, within SVG bounds

  const numAxes = sortedData.length;
  const angleStep = (Math.PI * 2) / numAxes;

  // Generate points for the radar polygon
  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2; // Start from top
    const radius = maxRadius * value;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  // Generate polygon points string
  const polygonPoints = sortedData
    .map((d, i) => {
      const point = getPoint(i, d.value);
      return `${point.x},${point.y}`;
    })
    .join(' ');

  const comparisonPolygonPoints = sortedComparisonData
    ? sortedComparisonData
        .map((d, i) => {
          const point = getPoint(i, d.value);
          return `${point.x},${point.y}`;
        })
        .join(' ')
    : null;

  // Grid levels (0.2, 0.4, 0.6, 0.8, 1.0)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Generate label position (outside the chart)
  const getLabelPosition = (index: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: centerX + labelRadius * Math.cos(angle),
      y: centerY + labelRadius * Math.sin(angle),
    };
  };

  // Get text anchor based on position
  const getTextAnchor = (index: number): 'start' | 'middle' | 'end' => {
    const angle = angleStep * index - Math.PI / 2;
    const x = Math.cos(angle);
    if (Math.abs(x) < 0.1) return 'middle';
    return x > 0 ? 'start' : 'end';
  };

  // Initials only — full names shown in Dimension Scores legend below
  const abbreviateLabel = (text: string) => {
    const words = text.split(/[\s_]+/);
    if (words.length >= 2) {
      return words.map(w => w.charAt(0).toUpperCase()).join('');
    }
    // Single word: first 4 chars
    return text.length <= 4 ? text.toUpperCase() : text.substring(0, 4).toUpperCase();
  };

  // Entry animation — scale up from center with spring
  const chartScale = useSharedValue(0.3);
  const chartOpacity = useSharedValue(0);
  const labelOpacity = useSharedValue(0);

  useEffect(() => {
    chartScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    chartOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    labelOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, []);

  const animatedChartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chartScale.value }],
    opacity: chartOpacity.value,
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Animated chart — springs in from center */}
      <Animated.View style={[{ width: size, height: size }, animatedChartStyle]}>
        <Svg width={size} height={size}>
          {/* Grid */}
          {showGrid && (
            <G>
              {gridLevels.map((level, i) => (
                <Circle
                  key={`grid-circle-${i}`}
                  cx={centerX}
                  cy={centerY}
                  r={maxRadius * level}
                  fill="none"
                  stroke={theme.text + '20'}
                  strokeWidth={1}
                  strokeDasharray={level === 1.0 ? undefined : '4,4'}
                />
              ))}
              {sortedData.map((_, i) => {
                const endPoint = getPoint(i, 1);
                return (
                  <Line
                    key={`axis-${i}`}
                    x1={centerX}
                    y1={centerY}
                    x2={endPoint.x}
                    y2={endPoint.y}
                    stroke={theme.text + '30'}
                    strokeWidth={1}
                  />
                );
              })}
            </G>
          )}

          {/* Comparison polygon */}
          {comparisonPolygonPoints && (
            <Polygon
              points={comparisonPolygonPoints}
              fill={theme.textSecondary + '15'}
              stroke={theme.textSecondary}
              strokeWidth={2}
              strokeDasharray="4,4"
            />
          )}

          {/* Main data polygon */}
          <Polygon
            points={polygonPoints}
            fill={chartColor + '30'}
            stroke={chartColor}
            strokeWidth={2.5}
          />

          {/* Data points */}
          {sortedData.map((d, i) => {
            const point = getPoint(i, d.value);
            return (
              <Circle
                key={`point-${i}`}
                cx={point.x}
                cy={point.y}
                r={5}
                fill={chartColor}
                stroke="#FFF"
                strokeWidth={2}
              />
            );
          })}

          {/* Center dot */}
          <Circle cx={centerX} cy={centerY} r={3} fill={chartColor} />
        </Svg>
      </Animated.View>

      {/* Labels overlay — fades in after chart expands */}
      {showLabels && (
        <Animated.View style={[styles.labelsOverlay, { width: size, height: size }, animatedLabelStyle]}>
          <Svg width={size} height={size}>
            {sortedData.map((d, i) => {
              const labelPos = getLabelPosition(i);
              const textAnchor = getTextAnchor(i);
              const displayLabel = abbreviateLabel(d.axis);
              const valueText = `${d.displayValue}%`;

              const angle = angleStep * i - Math.PI / 2;
              const isTop = Math.sin(angle) < -0.5;
              const isBottom = Math.sin(angle) > 0.5;
              const yOffset = isTop ? -4 : isBottom ? 8 : 3;

              return (
                <G key={`label-${i}`}>
                  <SvgText
                    x={labelPos.x}
                    y={labelPos.y + yOffset - 6}
                    fontSize={10}
                    fontWeight="700"
                    fill={theme.text}
                    textAnchor={textAnchor}
                  >
                    {displayLabel}
                  </SvgText>
                  <SvgText
                    x={labelPos.x}
                    y={labelPos.y + yOffset + 6}
                    fontSize={9}
                    fontWeight="600"
                    fill={chartColor}
                    textAnchor={textAnchor}
                  >
                    {valueText}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </Animated.View>
      )}
    </View>
  );
};

// Legend component for the radar chart
interface RadarLegendProps {
  data: RadarDataPoint[];
  color?: string;
  comparisonLabel?: string;
}

export const RadarLegend: React.FC<RadarLegendProps> = ({
  data,
  color,
  comparisonLabel,
}) => {
  const { theme } = useTheme();
  const chartColor = color || theme.primary;
  const sortedData = [...data].sort((a, b) => a.order - b.order);

  return (
    <View style={styles.legendContainer}>
      {sortedData.map((d, index) => (
        <View key={d.slug} style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: chartColor },
            ]}
          />
          <View style={styles.legendTextContainer}>
            <Text style={[styles.legendLabel, { color: theme.text }]}>
              {d.axis}
            </Text>
            <Text style={[styles.legendValue, { color: theme.textSecondary }]}>
              {d.displayValue}%
              {d.percentile && ` (${d.percentile}th percentile)`}
            </Text>
          </View>
        </View>
      ))}
      {comparisonLabel && (
        <View style={styles.comparisonLegend}>
          <View
            style={[
              styles.legendLine,
              { backgroundColor: theme.textSecondary },
            ]}
          />
          <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>
            {comparisonLabel}
          </Text>
        </View>
      )}
    </View>
  );
};

// Mini radar chart for compact displays
interface MiniRadarChartProps {
  data: RadarDataPoint[];
  size?: number;
  color?: string;
}

export const MiniRadarChart: React.FC<MiniRadarChartProps> = ({
  data,
  size = 80,
  color,
}) => {
  const { theme } = useTheme();
  const chartColor = color || theme.primary;

  const sortedData = [...data].sort((a, b) => a.order - b.order);
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2 - 4;
  const numAxes = sortedData.length;
  const angleStep = (Math.PI * 2) / numAxes;

  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const radius = maxRadius * value;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  const polygonPoints = sortedData
    .map((d, i) => {
      const point = getPoint(i, d.value);
      return `${point.x},${point.y}`;
    })
    .join(' ');

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={maxRadius}
          fill="none"
          stroke={theme.text + '15'}
          strokeWidth={1}
        />

        {/* Data polygon */}
        <Polygon
          points={polygonPoints}
          fill={chartColor + '30'}
          stroke={chartColor}
          strokeWidth={1.5}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  labelsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  legendContainer: {
    marginTop: 16,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    marginRight: 10,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 12,
    marginTop: 2,
  },
  comparisonLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  legendLine: {
    width: 16,
    height: 2,
    marginRight: 10,
  },
  comparisonLabel: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default RadarChart;

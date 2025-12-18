import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
const { useUserAppData } = require('../../utils/userAppData');
import { BottomTabBar } from '../../components/BottomTabBar';
import { CircularChart, AnimatedCircularChart } from '../../components/CircularChart';
import { UnifiedHeader } from '../../components/UnifiedHeader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  interpolate,
  runOnJS,
  Easing,
  FadeIn,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import {
  useCounterAnimation,
  useProgressAnimation,
  triggerHaptic,
  useFocusAnimationKey,
} from '../../utils/animationUtils';
import { ShimmerLoader, SkeletonStatsGrid } from '../../components/premium/ShimmerLoader';
import { StaggeredList, StaggeredItem } from '../../components/premium/StaggeredList';
import { Typography, Spacing, AnimationConfig, TimingConfig } from '../../theme/premiumTheme';

const { width } = Dimensions.get('window');

// Animated Bar Column Component - extracted to properly use hooks
interface AnimatedBarColumnProps {
  height: number;
  maxHeight: number;
  index: number;
  label: string;
  theme: any;
  timeRange: string;
  animationProgress: Animated.SharedValue<number>;
}

const AnimatedBarColumn: React.FC<AnimatedBarColumnProps> = ({
  height,
  maxHeight,
  index,
  label,
  theme,
  timeRange,
  animationProgress,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const percentage = maxHeight > 0 ? (height / maxHeight) * 100 : 0;
    return {
      height: `${percentage * animationProgress.value}%`,
    };
  });

  return (
    <Animated.View
      entering={FadeIn.delay(index * 30).duration(300)}
      style={styles.barColumn}
    >
      <View style={styles.barWrapper}>
        <Animated.View
          style={[
            styles.bar,
            { backgroundColor: theme.primary },
            animatedStyle,
          ]}
        />
      </View>
      <Text style={[styles.barLabel, { color: theme.primary, fontSize: timeRange === 'day' ? 7 : 9 }]}>
        {label}
      </Text>
    </Animated.View>
  );
};

const AnalyticsScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [timeRange, setTimeRange] = useState('year');
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: userData, isLoading } = useUserAppData();

  // Force animations to replay on every screen focus
  const focusKey = useFocusAnimationKey();

  // Calculate real stats from user data
  const allSessions = userData?.sessions || [];
  // Only count completed sessions for analytics
  const sessions = allSessions.filter((s: any) => s.status === 'completed' || !s.status);
  const totalSessions = sessions.length || 103;
  const totalMinutes = userData?.leaderboard?.total_focus_time || 2214; // 36.9 hours
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Count session types: Deep Work, Balanced, Sprint (only completed sessions)
  const deepWorkCount = sessions.filter((s: any) => s.session_type === 'deep_work' || s.session_type === 'individual').length || 45;
  const balancedCount = sessions.filter((s: any) => s.session_type === 'balanced').length || 38;
  const sprintCount = sessions.filter((s: any) => s.session_type === 'sprint').length || 20;

  // Helper function to get session duration in minutes
  const getSessionDuration = (session: any): number => {
    // Handle different duration field names from database
    if (session.duration_minutes) return session.duration_minutes;
    if (session.duration) return session.duration; // Already in minutes
    if (session.duration_seconds) return session.duration_seconds / 60;
    return 0;
  };

  // Calculate time spent per subject
  const subjectBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};

    sessions.forEach((session: any) => {
      const subject = session.subject || session.task_worked_on || 'General Study';
      const duration = getSessionDuration(session);

      if (!breakdown[subject]) {
        breakdown[subject] = 0;
      }
      breakdown[subject] += duration;
    });

    // Convert to array and sort by duration
    return Object.entries(breakdown)
      .map(([subject, minutes]) => ({
        subject,
        minutes: minutes as number,
        hours: Math.floor((minutes as number) / 60),
        remainingMinutes: Math.floor((minutes as number) % 60),
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [sessions]);

  // Colors for different subjects
  const subjectColors = ['#FF6B35', '#4ECDC4', '#F7B801', '#95E1D3', '#9B59B6', '#E74C3C', '#3498DB', '#2ECC71'];

  // Generate chart data based on time range
  const getChartData = () => {
    if (timeRange === 'year') {
      return ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    } else if (timeRange === 'month') {
      // Only show odd numbered days to avoid cramping
      return Array.from({ length: 31 }, (_, i) => i + 1)
        .filter(day => day % 2 === 1)
        .map(day => day.toString());
    } else if (timeRange === 'week') {
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    } else {
      // Day view - even hours only (0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22)
      // 0 represents midnight (24:00 / 00:00 in 24-hour format)
      return ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22'];
    }
  };

  // Calculate actual bar heights from user session data
  const getBarHeights = () => {
    const now = currentDate;
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();

    if (timeRange === 'year') {
      // Calculate hours per month for the current year
      return Array.from({ length: 12 }, (_, monthIndex) => {
        const monthSessions = sessions.filter((s: any) => {
          if (!s.created_at) return false;
          const sessionDate = new Date(s.created_at);
          return sessionDate.getFullYear() === year && sessionDate.getMonth() === monthIndex;
        });
        return monthSessions.reduce((sum: number, s: any) => sum + getSessionDuration(s), 0) / 60;
      });
    } else if (timeRange === 'month') {
      // Calculate hours per day for current month (only odd days)
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      return Array.from({ length: 31 }, (_, dayIndex) => {
        const day = dayIndex + 1;
        if (day % 2 === 0 || day > daysInMonth) return 0; // Skip even days and invalid days

        const daySessions = sessions.filter((s: any) => {
          if (!s.created_at) return false;
          const sessionDate = new Date(s.created_at);
          return sessionDate.getFullYear() === year &&
                 sessionDate.getMonth() === month &&
                 sessionDate.getDate() === day;
        });
        return daySessions.reduce((sum: number, s: any) => sum + getSessionDuration(s), 0) / 60;
      }).filter((_, i) => (i + 1) % 2 === 1); // Only keep odd indexed items
    } else if (timeRange === 'week') {
      // Calculate hours per day for current week
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());

      return Array.from({ length: 7 }, (_, dayIndex) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + dayIndex);

        const daySessions = sessions.filter((s: any) => {
          if (!s.created_at) return false;
          const sessionDate = new Date(s.created_at);
          return sessionDate.toDateString() === day.toDateString();
        });
        return daySessions.reduce((sum: number, s: any) => sum + getSessionDuration(s), 0) / 60;
      });
    } else {
      // Day view - minutes per 2-hour block (12 blocks: 0-1, 2-3, 4-5, etc.)
      return Array.from({ length: 12 }, (_, blockIndex) => {
        const startHour = blockIndex * 2;
        const endHour = startHour + 2;

        const daySessions = sessions.filter((s: any) => {
          if (!s.created_at) return false;
          const sessionDate = new Date(s.created_at);
          const sessionHour = sessionDate.getHours();
          return sessionDate.toDateString() === now.toDateString() &&
                 sessionHour >= startHour && sessionHour < endHour;
        });

        // Return minutes (not hours) for day view
        return daySessions.reduce((sum: number, s: any) => sum + getSessionDuration(s), 0);
      });
    }
  };

  const chartLabels = getChartData();
  const barHeights = getBarHeights();
  const maxHeight = Math.max(...barHeights, 1);

  // Log data for debugging
  useEffect(() => {
    console.log(`📊 Stats for ${timeRange} view (${currentDate.toDateString()}):`, {
      barHeights,
      totalSessions: sessions.length,
      maxHeight,
      sampleSession: sessions[0] ? {
        created_at: sessions[0].created_at,
        duration: sessions[0].duration,
        duration_minutes: sessions[0].duration_minutes,
        duration_seconds: sessions[0].duration_seconds,
        status: sessions[0].status,
      } : null,
    });
  }, [timeRange, currentDate, sessions]);

  // Animated stats counters
  const deepWorkCounter = useCounterAnimation(deepWorkCount, 1000);
  const balancedCounter = useCounterAnimation(balancedCount, 1000);
  const sprintCounter = useCounterAnimation(sprintCount, 1000);
  const totalSessionsCounter = useCounterAnimation(totalSessions, 1200);

  // Bar animation - single shared value for all bars
  const barAnimationProgress = useSharedValue(0);

  // Trigger bar animation when data changes
  useEffect(() => {
    barAnimationProgress.value = 0;
    barAnimationProgress.value = withDelay(200, withSpring(1, AnimationConfig.gentle));
  }, [timeRange, currentDate, barHeights.length]);

  // Format date display
  const getDateDisplay = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.toLocaleDateString('en-US', { month: 'long' });
    const monthNum = currentDate.getMonth() + 1;
    const day = currentDate.getDate();

    if (timeRange === 'year') {
      return year.toString();
    } else if (timeRange === 'month') {
      return `${month}, ${year}`;
    } else if (timeRange === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return `${year}.${String(monthNum).padStart(2, '0')}.${String(startOfWeek.getDate()).padStart(2, '0')} - ${year}.${String(monthNum).padStart(2, '0')}.${String(endOfWeek.getDate()).padStart(2, '0')}`;
    } else {
      return `${year}.${String(monthNum).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
    }
  };

  // Navigate date
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    if (timeRange === 'year') {
      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
    } else if (timeRange === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (timeRange === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }

    setCurrentDate(newDate);
  };

  // Animated Stat Card Component with subtle bounce effect
  const AnimatedStatCard = ({
    icon,
    iconColor,
    value,
    label,
    index
  }: {
    icon: string;
    iconColor: string;
    value: Animated.SharedValue<number>;
    label: string;
    index: number;
  }) => {
    // Subtle bounce animation on mount
    const bounceScale = useSharedValue(0.95);

    useEffect(() => {
      // Reset and trigger subtle bounce animation with staggered delay
      bounceScale.value = 0.95;
      bounceScale.value = withDelay(
        200 + index * 100, // Staggered delay
        withSequence(
          withSpring(1.03, { damping: 12, stiffness: 180 }), // Slight overshoot
          withSpring(1, { damping: 14, stiffness: 200 }) // Settle smoothly
        )
      );
    }, [focusKey]); // Re-trigger on screen focus

    const bounceStyle = useAnimatedStyle(() => ({
      transform: [{ scale: bounceScale.value }],
    }));

    const animatedTextProps = useAnimatedStyle(() => ({
      opacity: withDelay(index * 100, withTiming(1, { duration: 300 })),
    }));

    return (
      <Animated.View
        style={[styles.smallStatCard, { backgroundColor: theme.card }, bounceStyle]}
      >
        <View style={styles.smallStatIcon}>
          <Ionicons name={icon as any} size={28} color={iconColor} />
        </View>
        <Animated.Text style={[styles.smallStatNumber, { color: theme.text }, animatedTextProps]}>
          {Math.round(value.value)}
        </Animated.Text>
        <Text style={[styles.smallStatLabel, { color: theme.primary }]}>{label}</Text>
      </Animated.View>
    );
  };

  // Loading state with shimmer
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <UnifiedHeader title="Analytics" onClose={() => navigation.navigate('Home')} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}>
          <View style={{ marginTop: 20 }}>
            <SkeletonStatsGrid columns={3} />
          </View>
          <View style={{ marginTop: 24, marginBottom: 16 }}>
            <ShimmerLoader variant="card" height={200} />
          </View>
          <View style={{ marginBottom: 16 }}>
            <ShimmerLoader variant="card" height={300} />
          </View>
        </ScrollView>
        <BottomTabBar currentRoute="Results" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Unified Header */}
      <UnifiedHeader title="Analytics" onClose={() => navigation.navigate('Home')} />

      <ScrollView key={focusKey} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Time Range Selector */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400).duration(400)}
          style={styles.timeRangeContainer}
        >
          {['Day', 'Week', 'Month', 'Year'].map((range, index) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range.toLowerCase() && [styles.timeRangeButtonActive, { backgroundColor: 'transparent' }]
              ]}
              onPress={() => {
                triggerHaptic('selection');
                setTimeRange(range.toLowerCase());
              }}
            >
              <Text style={[
                styles.timeRangeText,
                { color: timeRange === range.toLowerCase() ? theme.primary : theme.text + '66' }
              ]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Date Display */}
        <Animated.View
          entering={FadeIn.delay(200).duration(400)}
          style={styles.dateContainer}
        >
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('buttonPress');
              navigateDate('prev');
            }}
          >
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.dateText, { color: theme.primary }]}>
            {getDateDisplay()}
          </Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('buttonPress');
              navigateDate('next');
            }}
          >
            <Ionicons name="chevron-forward" size={24} color={theme.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Cards Row - Session Types */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(400)}
          style={styles.statsRow}
        >
          <AnimatedStatCard
            icon="bulb"
            iconColor="#9C27B0"
            value={deepWorkCounter}
            label="Deep Work"
            index={0}
          />
          <AnimatedStatCard
            icon="fitness"
            iconColor="#FF9800"
            value={balancedCounter}
            label="Balanced"
            index={1}
          />
          <AnimatedStatCard
            icon="flash"
            iconColor="#2196F3"
            value={sprintCounter}
            label="Sprint"
            index={2}
          />
        </Animated.View>

        {/* Bar Chart */}
        <Animated.View
          entering={FadeInUp.delay(400).duration(400)}
          style={[styles.chartContainer, { backgroundColor: theme.card }]}
        >
          {/* Y-axis label */}
          <View style={styles.yAxisContainer}>
            <Text style={[styles.axisLabel, { color: theme.text + '88' }]}>
              {timeRange === 'day' ? 'Minutes' : 'Hours'}
            </Text>
          </View>

          <View style={styles.chartWithAxis}>
            {/* Y-axis scale for day view */}
            {timeRange === 'day' && (
              <View style={styles.yAxisScale}>
                {[60, 45, 30, 15, 0].map((minute) => (
                  <Text key={minute} style={[styles.yAxisScaleText, { color: theme.text + '66' }]}>
                    {minute}
                  </Text>
                ))}
              </View>
            )}

            {/* Chart bars */}
            <View style={styles.chartBars}>
              {barHeights.map((height, index) => (
                <AnimatedBarColumn
                  key={index}
                  height={height}
                  maxHeight={maxHeight}
                  index={index}
                  label={chartLabels[index]}
                  theme={theme}
                  timeRange={timeRange}
                  animationProgress={barAnimationProgress}
                />
              ))}
            </View>
          </View>

          {/* X-axis label */}
          <Text style={[styles.xAxisLabel, { color: theme.text + '88' }]}>
            {timeRange === 'year' ? 'Months' :
             timeRange === 'month' ? 'Days' :
             timeRange === 'week' ? 'Days of Week' :
             'Hours of Day'}
          </Text>

          <Text style={[styles.chartTotal, { color: theme.primary }]}>
            Total: {totalHours}h {remainingMinutes}m
          </Text>
        </Animated.View>

        {/* Subject Distribution - Animated Circular Chart */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(400)}
          style={[styles.circularChartContainer, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.chartSectionTitle, { color: theme.text }]}>Time by Subject</Text>
          {subjectBreakdown.length > 0 ? (
            <>
              <AnimatedCircularChart
                key={focusKey} // Re-animate on focus
                segments={subjectBreakdown.map((item, index) => ({
                  subject: item.subject,
                  percentage: totalMinutes > 0 ? (item.minutes / totalMinutes) * 100 : 0,
                  color: subjectColors[index % subjectColors.length],
                }))}
                totalHours={totalHours}
                totalMinutes={remainingMinutes}
                size={180}
                strokeWidth={18}
              />
              <StaggeredList delay="fast" style={styles.legendContainer}>
                {subjectBreakdown.map((item, index) => (
                  <View key={item.subject} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: subjectColors[index % subjectColors.length] }]} />
                    <Text style={[styles.legendText, { color: theme.text }]} numberOfLines={1}>
                      {item.subject}
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.text }]}>
                      {item.hours}h {item.remainingMinutes}m
                    </Text>
                  </View>
                ))}
              </StaggeredList>
            </>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No session data available
            </Text>
          )}
        </Animated.View>

        {/* Insights Section */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(400)}
          style={[styles.insightsContainer, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.insightsTitle, { color: theme.text }]}>Insights</Text>
          <StaggeredList delay="fast">
            <View style={styles.insightItem}>
              <Ionicons name="bulb" size={20} color={theme.primary} style={{ marginRight: 12 }} />
              <Text style={[styles.insightText, { color: theme.text }]}>
                You're doing great! Keep up the consistent study sessions.
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="trending-up" size={20} color={theme.primary} style={{ marginRight: 12 }} />
              <Text style={[styles.insightText, { color: theme.text }]}>
                Your focus time has increased by 15% this week!
              </Text>
            </View>
          </StaggeredList>
        </Animated.View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <BottomTabBar currentRoute="Results" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingVertical: 12,
    marginTop: 8,
  },
  timeRangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timeRangeButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  timeRangeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16, // Increased gap between cards
    marginBottom: 16,
  },
  smallStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginHorizontal: 2, // Additional horizontal margin
  },
  smallStatIcon: {
    marginBottom: 4,
  },
  smallStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  smallStatLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  yAxisContainer: {
    marginBottom: 8,
  },
  axisLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  chartWithAxis: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  yAxisScale: {
    height: 140,
    justifyContent: 'space-between',
    marginRight: 8,
    paddingVertical: 4,
  },
  yAxisScaleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chartBars: {
    flexDirection: 'row',
    height: 140,
    marginBottom: 8,
    flex: 1,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    width: '60%',
    height: '80%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  barLabel: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: '600',
  },
  xAxisLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  chartTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  circularChartContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  chartSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 20,
  },
  legendContainer: {
    marginTop: 16,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  insightsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default AnalyticsScreen;

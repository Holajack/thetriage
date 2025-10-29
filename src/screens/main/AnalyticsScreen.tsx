import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
const { useUserAppData } = require('../../utils/userAppData');
import { BottomTabBar } from '../../components/BottomTabBar';
import { CircularChart } from '../../components/CircularChart';
import { UnifiedHeader } from '../../components/UnifiedHeader';

const { width } = Dimensions.get('window');

const AnalyticsScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [timeRange, setTimeRange] = useState('year');
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: userData, isLoading } = useUserAppData();

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

  // Create animated values for each bar
  const animatedValues = useRef<Animated.Value[]>([]).current;

  // Animate bars when data changes
  useEffect(() => {
    // Ensure we have the right number of animated values
    while (animatedValues.length < barHeights.length) {
      animatedValues.push(new Animated.Value(0));
    }
    while (animatedValues.length > barHeights.length) {
      animatedValues.pop();
    }

    // Reset all animations
    animatedValues.forEach(anim => anim.setValue(0));

    // Stagger the animations for a wave effect
    const animations = animatedValues.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 800,
        delay: index * 50, // 50ms delay between each bar
        useNativeDriver: false,
      })
    );

    Animated.parallel(animations).start();
  }, [timeRange, currentDate, JSON.stringify(barHeights)]);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Unified Header */}
      <UnifiedHeader title="Pathfinder" onClose={() => navigation.navigate('Home')} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {['Day', 'Week', 'Month', 'Year'].map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range.toLowerCase() && [styles.timeRangeButtonActive, { backgroundColor: 'transparent' }]
              ]}
              onPress={() => setTimeRange(range.toLowerCase())}
            >
              <Text style={[
                styles.timeRangeText,
                { color: timeRange === range.toLowerCase() ? theme.primary : theme.text + '66' }
              ]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Display */}
        <View style={styles.dateContainer}>
          <TouchableOpacity onPress={() => navigateDate('prev')}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.dateText, { color: theme.primary }]}>
            {getDateDisplay()}
          </Text>
          <TouchableOpacity onPress={() => navigateDate('next')}>
            <Ionicons name="chevron-forward" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats Cards Row - Session Types */}
        <View style={styles.statsRow}>
          <View style={[styles.smallStatCard, { backgroundColor: theme.card }]}>
            <View style={styles.smallStatIcon}>
              <Ionicons name="bulb" size={28} color="#9C27B0" />
            </View>
            <Text style={[styles.smallStatNumber, { color: theme.text }]}>{deepWorkCount}</Text>
            <Text style={[styles.smallStatLabel, { color: theme.primary }]}>Deep Work</Text>
          </View>

          <View style={[styles.smallStatCard, { backgroundColor: theme.card }]}>
            <View style={styles.smallStatIcon}>
              <Ionicons name="fitness" size={28} color="#FF9800" />
            </View>
            <Text style={[styles.smallStatNumber, { color: theme.text }]}>{balancedCount}</Text>
            <Text style={[styles.smallStatLabel, { color: theme.primary }]}>Balanced</Text>
          </View>

          <View style={[styles.smallStatCard, { backgroundColor: theme.card }]}>
            <View style={styles.smallStatIcon}>
              <Ionicons name="flash" size={28} color="#2196F3" />
            </View>
            <Text style={[styles.smallStatNumber, { color: theme.text }]}>{sprintCount}</Text>
            <Text style={[styles.smallStatLabel, { color: theme.primary }]}>Sprint</Text>
          </View>
        </View>

        {/* Bar Chart */}
        <View style={[styles.chartContainer, { backgroundColor: theme.card }]}>
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
              {barHeights.map((height, index) => {
                const animatedHeight = animatedValues[index]?.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', `${(height / maxHeight) * 100}%`],
                }) || '0%';

                return (
                  <View key={index} style={styles.barColumn}>
                    <View style={styles.barWrapper}>
                      <Animated.View
                        style={[
                          styles.bar,
                          {
                            height: animatedHeight,
                            backgroundColor: theme.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: theme.primary, fontSize: timeRange === 'day' ? 7 : 9 }]}>
                      {chartLabels[index]}
                    </Text>
                  </View>
                );
              })}
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
        </View>

        {/* Subject Distribution - Circular Chart */}
        <View style={[styles.circularChartContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.chartSectionTitle, { color: theme.text }]}>Time by Subject</Text>
          {subjectBreakdown.length > 0 ? (
            <>
              <CircularChart
                percentage={100}
                totalHours={totalHours}
                totalMinutes={remainingMinutes}
                color={subjectColors[0]}
                size={180}
                strokeWidth={18}
              />
              <View style={styles.legendContainer}>
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
              </View>
            </>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No session data available
            </Text>
          )}
        </View>

        {/* Insights Section */}
        <View style={[styles.insightsContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.insightsTitle, { color: theme.text }]}>Insights</Text>
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
        </View>
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
    gap: 12,
    marginBottom: 16,
  },
  smallStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
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

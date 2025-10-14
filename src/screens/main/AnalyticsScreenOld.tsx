import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
const { useUserAppData } = require('../../utils/userAppData');
import { BottomTabBar } from '../../components/BottomTabBar';

interface StudyData {
  totalHours: number;
  averageSessionLength: number;
  mostProductiveTime: string;
  mostStudiedSubject: string;
  studyDays: number;
  consistencyScore: number;
}

interface WeeklyDataPoint {
  day: string;
  hours: number;
}

interface SubjectDataPoint {
  subject: string;
  hours: number;
  percentage: number;
}

const AnalyticsScreen = () => {
  const navigation = useNavigation();
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use our comprehensive data hook
  const { data: userData, isLoading: userDataLoading, error: userDataError, refreshData } = useUserAppData();
  
  // Analytics Data
  const [studyData, setStudyData] = useState<StudyData>({
    totalHours: 0,
    averageSessionLength: 0,
    mostProductiveTime: 'Not available',
    mostStudiedSubject: 'Not available',
    studyDays: 0,
    consistencyScore: 0,
  });
  const [weeklyData, setWeeklyData] = useState<WeeklyDataPoint[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectDataPoint[]>([]);

  // Update data when userData changes
  useEffect(() => {
    if (userData && !userDataLoading) {
      processUserAppData(userData);
    }
  }, [userData, userDataLoading, timeRange]);
  // Process userData to extract analytics information
  const processUserAppData = (userData: any) => {
    try {
      if (!userData) {
        console.error('No user data available');
        return;
      }

      const { sessions, metrics, tasks } = userData;

      // Get current date for filtering
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay()); // Start of week (Sunday)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Filter sessions based on timeRange
      let filteredSessions = sessions || [];
      
      if (timeRange === 'day') {
        // Filter for current day only
        filteredSessions = sessions?.filter((session: any) => {
          if (!session.created_at) return false;
          const sessionDate = new Date(session.created_at);
          return sessionDate >= startOfDay && sessionDate < new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        }) || [];
      } else if (timeRange === 'week') {
        // Filter for current week (7 days)
        filteredSessions = sessions?.filter((session: any) => {
          if (!session.created_at) return false;
          const sessionDate = new Date(session.created_at);
          return sessionDate >= startOfWeek && sessionDate <= now;
        }) || [];
      } else if (timeRange === 'month') {
        // Filter for current month
        filteredSessions = sessions?.filter((session: any) => {
          if (!session.created_at) return false;
          const sessionDate = new Date(session.created_at);
          return sessionDate >= startOfMonth && sessionDate <= now;
        }) || [];
      }

      console.log(`Analytics: Processing ${filteredSessions.length} sessions for ${timeRange} view`);

      // Calculate total hours from filtered sessions
      const totalMinutes = filteredSessions
        .filter((session: any) => session.duration_minutes)
        .reduce((sum: number, session: any) => sum + (session.duration_minutes || 0), 0);
      const totalHours = totalMinutes / 60;

      // Calculate average session length from filtered sessions
      const completedSessions = filteredSessions.filter((session: any) => session.duration_minutes > 0);
      const averageSessionLength = completedSessions.length > 0 
        ? Math.round(completedSessions.reduce((sum: number, session: any) => sum + (session.duration_minutes || 0), 0) / completedSessions.length)
        : 0;

      // Find most productive hour (from all sessions, not filtered by time range)
      const hourCountMap: { [key: string]: number } = {};
      (sessions || []).forEach((session: any) => {
        if (session.created_at) {
          const hour = new Date(session.created_at).getHours().toString();
          hourCountMap[hour] = (hourCountMap[hour] || 0) + 1;
        }
      });

      const mostProductiveHour = Object.entries(hourCountMap).sort((a, b) => b[1] - a[1])[0]?.[0];
      const mostProductiveTime = mostProductiveHour 
        ? `${mostProductiveHour}:00 - ${parseInt(mostProductiveHour) + 1}:00`
        : 'Not available';

      // Find most studied subject from tasks or sessions
      const subjectCountMap: { [key: string]: number } = {};
      
      // If we have tasks with subjects/categories
      if (tasks?.length > 0) {
        tasks.forEach((task: any) => {
          if (task.title) {
            // Extract subject from task title (basic approach)
            const subject = task.title.split(' ')[0] || 'General';
            subjectCountMap[subject] = (subjectCountMap[subject] || 0) + 1;
          }
        });
      }

      const mostStudiedSubject = Object.entries(subjectCountMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Not enough data';

      // Calculate study days from filtered sessions
      const studyDaysSet = new Set(
        filteredSessions
          .filter((session: any) => session.created_at)
          .map((session: any) => new Date(session.created_at).toDateString())
      );
      const studyDays = studyDaysSet.size;

      // Calculate consistency score based on time range
      let maxPossibleDays = 1;
      if (timeRange === 'day') {
        maxPossibleDays = 1;
      } else if (timeRange === 'week') {
        maxPossibleDays = 7;
      } else if (timeRange === 'month') {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        maxPossibleDays = Math.min(daysInMonth, now.getDate()); // Only count days that have passed
      }
      
      const consistencyScore = Math.min(100, Math.round((studyDays / maxPossibleDays) * 100));

      // Generate weekly data for chart (always show 7 days for week view)
      const weeklyChartData = generateWeeklyDataFromSessions(filteredSessions);

      // Generate subject data for chart
      const subjectChartData = generateSubjectData(subjectCountMap);

      // Update state with processed data
      setStudyData({
        totalHours: Math.round(totalHours * 10) / 10,
        averageSessionLength: Math.round(averageSessionLength),
        mostProductiveTime,
        mostStudiedSubject,
        studyDays,
        consistencyScore
      });

      setWeeklyData(weeklyChartData);
      setSubjectData(subjectChartData);
      setError(null);
      setLoading(false);

    } catch (error) {
      console.error('Error processing user data for analytics:', error);
      setError('Failed to process analytics data');
      setLoading(false);
    }
  };

  const generateWeeklyDataFromSessions = (sessions: any[]) => {
    const weeklyData: WeeklyDataPoint[] = [];
    const now = new Date();
    
    if (timeRange === 'week') {
      // Show last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateString = date.toDateString();
        
        const dayHours = sessions
          .filter((session: any) => session.created_at && new Date(session.created_at).toDateString() === dateString)
          .reduce((sum: number, session: any) => sum + (session.duration_minutes || 0), 0) / 60;
        
        weeklyData.push({
          day: dayName,
          hours: Math.round(dayHours * 10) / 10
        });
      }
    } else if (timeRange === 'month') {
      // Show weeks in current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const weeksInMonth = Math.ceil((now.getDate() + startOfMonth.getDay()) / 7);
      
      for (let week = 1; week <= weeksInMonth; week++) {
        const weekStart = new Date(startOfMonth);
        weekStart.setDate(1 + (week - 1) * 7 - startOfMonth.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekHours = sessions
          .filter((session: any) => {
            if (!session.created_at) return false;
            const sessionDate = new Date(session.created_at);
            return sessionDate >= weekStart && sessionDate <= weekEnd;
          })
          .reduce((sum: number, session: any) => sum + (session.duration_minutes || 0), 0) / 60;
        
        weeklyData.push({
          day: `W${week}`,
          hours: Math.round(weekHours * 10) / 10
        });
      }
    } else {
      // Day view - show hours of the day
      for (let hour = 0; hour < 24; hour += 3) { // Show every 3 hours
        const hourSessions = sessions.filter((session: any) => {
          if (!session.created_at) return false;
          const sessionHour = new Date(session.created_at).getHours();
          return sessionHour >= hour && sessionHour < hour + 3;
        });
        
        const hours = hourSessions.reduce((sum: number, session: any) => sum + (session.duration_minutes || 0), 0) / 60;
        
        weeklyData.push({
          day: `${hour}:00`,
          hours: Math.round(hours * 10) / 10
        });
      }
    }
    
    return weeklyData;
  };

  const generateSubjectData = (subjectCountMap: { [key: string]: number }): SubjectDataPoint[] => {
    const totalCount = Object.values(subjectCountMap).reduce((sum, count) => sum + count, 0);
    
    if (totalCount === 0) return [];

    return Object.entries(subjectCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Top 5 subjects
      .map(([subject, count]) => ({
        subject,
        hours: Math.round(count * 10) / 10, // Approximate hours
        percentage: Math.round((count / totalCount) * 100)
      }));
  };

  if (authLoading || userDataLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header with X button and Title */}
        <View style={[styles.navHeader, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.navigate('Home')}
          >
            <View style={[styles.closeButtonCircle, { backgroundColor: theme.text + '20' }]}>
              <Ionicons name="close" size={24} color={theme.text} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.navHeaderTitle, { color: theme.text }]}>Traveller</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading analytics...</Text>
        </View>

        <BottomTabBar currentRoute="Results" />
      </SafeAreaView>
    );
  }

  if (error || userDataError) {
    const errorMessage = error || (userDataError as Error)?.message || 'Error loading analytics data';
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header with X button and Title */}
        <View style={[styles.navHeader, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.navigate('Home')}
          >
            <View style={[styles.closeButtonCircle, { backgroundColor: theme.text + '20' }]}>
              <Ionicons name="close" size={24} color={theme.text} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.navHeaderTitle, { color: theme.text }]}>Traveller</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF5252" />
          <Text style={[styles.errorText, { color: theme.text }]}>{errorMessage}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={refreshData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>

        <BottomTabBar currentRoute="Results" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with X button and Title */}
      <View style={[styles.navHeader, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <View style={[styles.closeButtonCircle, { backgroundColor: theme.text + '20' }]}>
            <Ionicons name="close" size={24} color={theme.text} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.navHeaderTitle, { color: theme.text }]}>Traveller</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Analytics</Text>
          
          {/* Time Range Selector */}
          <View style={styles.timeRangeContainer}>
            {['day', 'week', 'month'].map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && { backgroundColor: theme.primary },
                  { borderColor: theme.primary }
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text style={[
                  styles.timeRangeText,
                  { color: timeRange === range ? '#FFFFFF' : theme.text }
                ]}>
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary Cards - Updated to show only 3 cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <Ionicons name="time" size={24} color={theme.primary} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{studyData.totalHours}h</Text>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>Total Hours</Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <Ionicons name="timer" size={24} color={theme.primary} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{studyData.averageSessionLength}m</Text>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>Avg Session</Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <Ionicons name="trending-up" size={24} color={theme.primary} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{studyData.consistencyScore}%</Text>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>Consistency</Text>
          </View>
        </View>

        {/* Weekly Study Chart - Updated title */}
        <View style={[styles.chartContainer, { backgroundColor: theme.card, borderColor: theme.primary }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>
            {timeRange === 'day' ? 'Daily Study Hours' : 
             timeRange === 'week' ? 'Weekly Study Hours' : 
             'Monthly Study Hours'}
          </Text>
          <View style={styles.chart}>
            {weeklyData.map((day, index) => {
              const maxHours = Math.max(...weeklyData.map(d => d.hours), 1);
              const heightPercentage = (day.hours / maxHours) * 100;
              
              return (
                <View key={index} style={styles.chartBarContainer}>
                  <View style={[styles.chartBar, { height: `${heightPercentage}%`, backgroundColor: theme.primary }]} />
                  <Text style={[styles.chartLabel, { color: theme.text }]}>{day.day}</Text>
                  <Text style={[styles.chartValue, { color: theme.text }]}>{day.hours}h</Text>
                </View>
              );
            })}
          </View>
        </View>
        
        {/* Subject Distribution */}
        {subjectData.length > 0 && (
          <View style={[styles.subjectContainer, { backgroundColor: theme.card, borderColor: theme.primary }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Subject Distribution</Text>
            {subjectData.map((subject, index) => (
              <View key={index} style={styles.subjectRow}>
                <View style={styles.subjectInfo}>
                  <Text style={[styles.subjectName, { color: theme.text }]}>{subject.subject}</Text>
                  <Text style={[styles.subjectHours, { color: theme.text }]}>{subject.hours}h</Text>
                </View>
                <View style={styles.subjectProgressContainer}>
                  <View style={[styles.subjectProgressBar, { width: `${subject.percentage}%`, backgroundColor: theme.primary }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Insights */}
        <View style={[styles.insightsContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Insights</Text>
          
          <View style={styles.insightRow}>
            <Ionicons name="sunny" size={20} color={theme.primary} />
            <Text style={[styles.insightText, { color: theme.text }]}>
              Most productive time: {studyData.mostProductiveTime}
            </Text>
          </View>
          
          <View style={styles.insightRow}>
            <Ionicons name="book" size={20} color={theme.primary} />
            <Text style={[styles.insightText, { color: theme.text }]}>
              Most studied subject: {studyData.mostStudiedSubject}
            </Text>
          </View>
          
          <View style={styles.insightRow}>
            <Ionicons name="trophy" size={20} color={theme.primary} />
            <Text style={[styles.insightText, { color: theme.text }]}>
              Consistency score: {studyData.consistencyScore}% - {
                studyData.consistencyScore >= 80 ? 'Excellent!' :
                studyData.consistencyScore >= 60 ? 'Good!' :
                studyData.consistencyScore >= 40 ? 'Improving!' : 'Keep going!'
              }
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF5252',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  subtitle: {
    fontSize: 16,
    color: '#388E3C',
    marginTop: 5,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#FFF',
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  timeRangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
  },
  activeTimeRange: {
    backgroundColor: '#4CAF50',
  },
  timeRangeText: {
    color: '#1B5E20',
    fontWeight: '500',
  },
  activeTimeRangeText: {
    color: '#FFF',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#FFF',
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#388E3C',
    marginTop: 5,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 15,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  chartBarContainer: {
    alignItems: 'center',
    width: '12%',
  },
  chartBar: {
    width: '100%',
    backgroundColor: '#4CAF50',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  chartLabel: {
    fontSize: 12,
    color: '#388E3C',
    marginTop: 5,
  },
  chartValue: {
    fontSize: 10,
    color: '#1B5E20',
    marginTop: 2,
  },
  subjectContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 15,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '40%',
  },
  subjectName: {
    fontSize: 14,
    color: '#1B5E20',
  },
  subjectHours: {
    fontSize: 14,
    fontWeight: '600',
    color: '#388E3C',
  },
  subjectProgressContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  subjectProgressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  subjectPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
    width: '15%',
    textAlign: 'right',
  },
  insightsContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    marginBottom: 10,
  },
  insightIcon: {
    marginRight: 10,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
  },
  insightText: {
    fontSize: 14,
    color: '#388E3C',
    marginTop: 2,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
});

export default AnalyticsScreen;
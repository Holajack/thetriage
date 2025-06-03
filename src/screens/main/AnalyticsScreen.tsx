import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
const { useUserAppData } = require('../../utils/userAppData');

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

      // Calculate total hours
      const totalHours = (metrics?.total_focus_time ?? 0) / 60;

      // Get completed sessions
      const completedSessions = sessions?.filter((session: any) => 
        session.completed && session.duration_minutes
      ) || [];

      // Calculate average session length
      const averageSessionLength = completedSessions.length > 0 
        ? completedSessions.reduce((sum: number, session: any) => sum + (session.duration_minutes || 0), 0) / completedSessions.length
        : 0;

      // Find most productive time based on session start times
      const hourCounts: { [key: number]: number } = {};
      completedSessions.forEach((session: any) => {
        if (session.created_at) {
          const hour = new Date(session.created_at).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });

      const mostProductiveHour = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
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

      // Calculate study days (unique days with sessions)
      const studyDaysSet = new Set(
        completedSessions
          .filter((session: any) => session.created_at)
          .map((session: any) => new Date(session.created_at).toDateString())
      );
      const studyDays = studyDaysSet.size;

      // Calculate consistency score
      const daysInRange = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      const consistencyScore = Math.min(100, Math.round((studyDays / daysInRange) * 100));

      // Generate weekly data for chart
      const weeklyChartData = generateWeeklyDataFromSessions(sessions || []);

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

    } catch (err: any) {
      console.error('Error processing user app data:', err);
      setError(err.message || 'Error processing analytics data');
      setLoading(false);
    }
  };

  const generateWeeklyDataFromSessions = (sessions: any[]): WeeklyDataPoint[] => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekData = days.map(day => ({ day, hours: 0 }));
    
    sessions.forEach((session: any) => {
      if (session.completed && session.duration_minutes && session.created_at) {
        try {
          const dayIndex = new Date(session.created_at).getDay();
          weekData[dayIndex].hours += (session.duration_minutes || 0) / 60;
        } catch (e) {
          console.error('Error processing session date:', e);
        }
      }
    });

    return weekData.map(data => ({
      ...data,
      hours: Math.round(data.hours * 10) / 10
    }));
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || userDataError) {
    const errorMessage = error || (userDataError as Error)?.message || 'Error loading analytics data';
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
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

        {/* Summary Cards */}
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
            <Ionicons name="calendar" size={24} color={theme.primary} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{studyData.studyDays}</Text>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>Study Days</Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <Ionicons name="trending-up" size={24} color={theme.primary} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{studyData.consistencyScore}%</Text>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>Consistency</Text>
          </View>
        </View>

        {/* Weekly Study Chart */}
        <View style={[styles.chartContainer, { backgroundColor: theme.card, borderColor: theme.primary }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>Weekly Study Hours</Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
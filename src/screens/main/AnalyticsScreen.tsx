import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { useTheme } from '../../context/ThemeContext';

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
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  
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

  useEffect(() => {
    if (user && !authLoading) {
      fetchAnalyticsData();
    }
  }, [user, timeRange, authLoading]);

  const getTimeRangeFilter = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return startDate.toISOString();
  };

  const fetchAnalyticsData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const startDate = getTimeRangeFilter();
      
      // Fetch focus sessions data
      const { data: sessions, error: sessionsError } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate)
        .order('created_at', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Fetch tasks data for subject analysis
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          focus_session_id,
          focus_sessions!inner(duration, environment, created_at)
        `)
        .eq('user_id', user.id)
        .gte('created_at', startDate);

      if (tasksError) throw tasksError;

      // Fetch leaderboard stats for additional metrics
      const { data: leaderboardStats, error: leaderboardError } = await supabase
        .from('leaderboard_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (leaderboardError && leaderboardError.code !== 'PGRST116') {
        throw leaderboardError;
      }

      // Process the data
      await processAnalyticsData(sessions || [], tasks || [], leaderboardStats);
      
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = async (sessions: any[], tasks: any[], leaderboardStats: any) => {
    // Calculate total hours and session metrics
    const completedSessions = sessions.filter(session => session.completed && session.duration);
    const totalMinutes = completedSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const totalHours = totalMinutes / 60;
    
    // Calculate average session length
    const averageSessionLength = completedSessions.length > 0 
      ? totalMinutes / completedSessions.length 
      : 0;

    // Calculate study days (unique days with sessions)
    const studyDaysSet = new Set(
      completedSessions.map(session => 
        new Date(session.created_at).toDateString()
      )
    );
    const studyDays = studyDaysSet.size;

    // Calculate consistency score (study days / total days in period)
    const daysInPeriod = timeRange === 'day' ? 1 : 
                        timeRange === 'week' ? 7 : 
                        timeRange === 'month' ? 30 : 365;
    const consistencyScore = Math.round((studyDays / daysInPeriod) * 100);

    // Find most productive time
    const hourCounts: { [key: number]: number } = {};
    completedSessions.forEach(session => {
      const hour = new Date(session.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + (session.duration || 0);
    });
    
    const mostProductiveHour = Object.keys(hourCounts).length > 0 
      ? Object.keys(hourCounts).reduce((a, b) => 
          hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b
        )
      : '12';
    
    const mostProductiveTime = getMostProductiveTimeLabel(parseInt(mostProductiveHour));

    // Process subject data from tasks
    const subjectMinutes: { [key: string]: number } = {};
    tasks.forEach(task => {
      if (task.focus_sessions?.duration) {
        const subject = task.title.split(' ')[0] || 'General'; // Simple subject extraction
        subjectMinutes[subject] = (subjectMinutes[subject] || 0) + task.focus_sessions.duration;
      }
    });
    
    // If still no subjects, create a general category
    if (Object.keys(subjectMinutes).length === 0 && totalMinutes > 0) {
      subjectMinutes['General Study'] = totalMinutes;
    }

    // Convert to hours and percentages
    const totalSubjectMinutes = Object.values(subjectMinutes).reduce((sum, minutes) => sum + minutes, 0);
    const processedSubjectData = Object.entries(subjectMinutes)
      .map(([subject, minutes]) => ({
        subject,
        hours: Math.round((minutes / 60) * 10) / 10,
        percentage: totalSubjectMinutes > 0 ? Math.round((minutes / totalSubjectMinutes) * 100) : 0
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5); // Top 5 subjects

    const mostStudiedSubject = processedSubjectData.length > 0 
      ? processedSubjectData[0].subject 
      : 'Not available';

    // Generate weekly data
    const weeklyDataPoints = generateWeeklyData(completedSessions);

    // Update state
    setStudyData({
      totalHours: Math.round(totalHours * 10) / 10,
      averageSessionLength: Math.round(averageSessionLength),
      mostProductiveTime,
      mostStudiedSubject,
      studyDays,
      consistencyScore: Math.min(consistencyScore, 100)
    });

    setSubjectData(processedSubjectData);
    setWeeklyData(weeklyDataPoints);
  };

  const getMostProductiveTimeLabel = (hour: number): string => {
    if (hour >= 5 && hour < 12) return 'Morning (5AM-12PM)';
    if (hour >= 12 && hour < 17) return 'Afternoon (12PM-5PM)';
    if (hour >= 17 && hour < 22) return 'Evening (5PM-10PM)';
    return 'Night (10PM-5AM)';
  };

  const generateWeeklyData = (sessions: any[]): WeeklyDataPoint[] => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekData = days.map(day => ({ day, hours: 0 }));
    
    sessions.forEach(session => {
      if (session.completed && session.duration) {
        const dayIndex = new Date(session.created_at).getDay();
        weekData[dayIndex].hours += (session.duration || 0) / 60;
      }
    });

    return weekData.map(data => ({
      ...data,
      hours: Math.round(data.hours * 10) / 10
    }));
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF5252" />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.primary }]} onPress={fetchAnalyticsData}>
            <Text style={[styles.retryButtonText, { color: theme.card }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.primary }]}>
          <Text style={[styles.title, { color: theme.text }]}>Analytics</Text>
          <Text style={[styles.subtitle, { color: theme.text }]}>Track your study patterns and progress</Text>
        </View>
        
        {/* Time Range Selector */}
        <View style={[styles.timeRangeContainer, { backgroundColor: theme.card, borderColor: theme.primary }]}>
          {['day', 'week', 'month', 'year'].map((range) => (
            <TouchableOpacity 
              key={range}
              style={[styles.timeRangeButton, { backgroundColor: timeRange === range ? theme.primary : theme.background }]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.timeRangeText, { color: timeRange === range ? theme.card : theme.text }]}>
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Summary Stats */}
        <View style={[styles.summaryContainer, { backgroundColor: theme.card, borderColor: theme.primary }]}>
          <View style={[styles.summaryCard, { backgroundColor: theme.background }]}>
            <Ionicons name="time" size={24} color={theme.primary} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{studyData.totalHours}h</Text>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>Total Study Time</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.background }]}>
            <Ionicons name="calendar" size={24} color={theme.primary} />
            <Text style={[styles.summaryValue, { color: theme.text }]}>{studyData.studyDays}</Text>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>Study Days</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.background }]}>
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
                <Text style={[styles.subjectPercentage, { color: theme.text }]}>{subject.percentage}%</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Study Insights */}
        <View style={[styles.insightsContainer, { backgroundColor: theme.card, borderColor: theme.primary }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Study Insights</Text>
          <View style={[styles.insightCard, { backgroundColor: theme.background }]}>
            <Ionicons name="bulb" size={24} color={theme.primary} style={styles.insightIcon} />
            <View style={styles.insightContent}>
              <Text style={[styles.insightTitle, { color: theme.text }]}>Most Productive Time</Text>
              <Text style={[styles.insightText, { color: theme.text }]}>{studyData.mostProductiveTime}</Text>
            </View>
          </View>
          <View style={[styles.insightCard, { backgroundColor: theme.background }]}>
            <Ionicons name="book" size={24} color={theme.primary} style={styles.insightIcon} />
            <View style={styles.insightContent}>
              <Text style={[styles.insightTitle, { color: theme.text }]}>Most Studied Subject</Text>
              <Text style={[styles.insightText, { color: theme.text }]}>{studyData.mostStudiedSubject}</Text>
            </View>
          </View>
          <View style={[styles.insightCard, { backgroundColor: theme.background }]}>
            <Ionicons name="timer" size={24} color={theme.primary} style={styles.insightIcon} />
            <View style={styles.insightContent}>
              <Text style={[styles.insightTitle, { color: theme.text }]}>Average Session Length</Text>
              <Text style={[styles.insightText, { color: theme.text }]}>{studyData.averageSessionLength} minutes</Text>
            </View>
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
});

export default AnalyticsScreen; 
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../utils/supabase';
import { BottomTabBar } from '../../components/BottomTabBar';
import { UnifiedHeader } from '../../components/UnifiedHeader';

interface SessionHistoryItem {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number; // We'll calculate this from duration_seconds
  intended_duration?: number; // Optional since not in current schema
  status: 'completed' | 'cancelled' | 'paused' | 'active';
  focus_quality?: number; // Optional since not in current schema
  interruptions?: number; // Optional since not in current schema
  session_type: string;
  subject?: string; // Optional since not in current schema
  notes?: string; // Optional since not in current schema
  created_at: string;
  task_title?: string;
  productivity_rating?: number; // Optional since not in current schema
}

const SessionHistoryScreen = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');

  const onRefresh = () => {
    fetchSessionHistory(true);
  };
  
  // Configure header with refresh button
  useEffect(() => {
    navigation.setOptions({
      title: 'Session History',
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('Home' as never)} 
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={onRefresh} style={{ marginRight: 8 }}>
          <Ionicons name="refresh" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  useEffect(() => {
    if (user) {
      fetchSessionHistory();
    }
  }, [user, timeFilter]);

  const fetchSessionHistory = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Calculate date filter
      let dateFilter = '';
      if (timeFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = weekAgo.toISOString();
      } else if (timeFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = monthAgo.toISOString();
      }

      // Build query with correct column names
      let query = supabase
        .from('focus_sessions')
        .select(`
          id,
          user_id,
          start_time,
          end_time,
          duration_seconds,
          session_type,
          status,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: sessionsData, error: sessionsError } = await query;

      if (sessionsError) {
        throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
      }

      // Transform the data to match the expected interface
      const transformedSessions: SessionHistoryItem[] = (sessionsData || [])
        .map(session => {
          // Generate a friendly session name based on session_type
          let sessionName = 'Study Session';
          if (session.session_type === 'individual') {
            sessionName = 'Focus Session';
          } else if (session.session_type === 'group') {
            sessionName = 'Group Study Session';
          } else if (session.session_type === 'deep_work') {
            sessionName = 'Deep Work Session';
          } else if (session.session_type === 'sprint') {
            sessionName = 'Sprint Session';
          } else if (session.session_type === 'balanced') {
            sessionName = 'Balanced Session';
          }

          return {
            id: session.id,
            user_id: session.user_id,
            start_time: session.start_time,
            end_time: session.end_time || '',
            duration_minutes: session.duration_seconds ? Math.round(session.duration_seconds / 60) : 0,
            intended_duration: 0,
            status: session.status as 'completed' | 'cancelled' | 'paused',
            focus_quality: 0,
            interruptions: 0,
            session_type: session.session_type,
            subject: sessionName,
            notes: '',
            created_at: session.created_at,
            task_title: sessionName,
            productivity_rating: 0,
          };
        })
        .filter(session => session.duration_minutes >= 5); // Filter out sessions less than 5 minutes

      setSessions(transformedSessions);
      console.log(`SessionHistory: Loaded ${transformedSessions.length} sessions`);

    } catch (error) {
      console.error('Error fetching session history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load session history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#FF5252';
      case 'paused': return '#FF9800';
      default: return theme.text;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      case 'paused': return 'pause-circle';
      default: return 'help-circle';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Ionicons
        key={index}
        name={index < rating ? 'star' : 'star-outline'}
        size={14}
        color="#FFD700"
        style={{ marginRight: 2 }}
      />
    ));
  };

  const renderSessionCard = (session: SessionHistoryItem) => (
    <TouchableOpacity
      key={session.id}
      style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.primary }]}
      onPress={() => {
        // Navigate to session detail view (could extend SessionReportScreen)
        console.log('Session tapped:', session.id);
      }}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.sessionHeader}>
        <View style={styles.sessionTitleRow}>
          <Text style={[styles.sessionTitle, { color: theme.text }]}>
            {session.task_title || session.subject || `${session.session_type} Session`}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session.status) }]}>
            <Ionicons 
              name={getStatusIcon(session.status) as any} 
              size={12} 
              color="#FFF" 
              style={{ marginRight: 4 }} 
            />
            <Text style={styles.statusText}>{session.status}</Text>
          </View>
        </View>
        <Text style={[styles.sessionDate, { color: theme.text }]}>
          {formatDate(session.created_at)}
        </Text>
      </View>

      {/* Session Stats */}
      <View style={styles.sessionStats}>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={16} color={theme.primary} />
          <Text style={[styles.statLabel, { color: theme.text }]}>Duration</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {formatDuration(session.duration_minutes || 0)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={16} color={theme.primary} />
          <Text style={[styles.statLabel, { color: theme.text }]}>Type</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {session.session_type === 'individual' ? 'Solo' : 'Group'}
          </Text>
        </View>

        {session.focus_quality && (
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={16} color={theme.primary} />
            <Text style={[styles.statLabel, { color: theme.text }]}>Focus</Text>
            <View style={styles.starsContainer}>
              {renderStars(session.focus_quality)}
            </View>
          </View>
        )}
      </View>

      {/* Notes Preview - only show if notes exist */}
      {session.notes && (
        <View style={styles.notesPreview}>
          <Ionicons name="document-text-outline" size={14} color={theme.primary} />
          <Text style={[styles.notesText, { color: theme.text }]} numberOfLines={2}>
            {session.notes}
          </Text>
        </View>
      )}

      {/* Session Footer */}
      <View style={styles.sessionFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="time-outline" size={14} color={theme.primary} />
          <Text style={[styles.footerText, { color: theme.text }]}>
            {new Date(session.start_time).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </Text>
        </View>
        {session.end_time && (
          <View style={styles.footerItem}>
            <Ionicons name="checkmark-circle-outline" size={14} color={theme.primary} />
            <Text style={[styles.footerText, { color: theme.text }]}>
              Completed
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header with X button and Title */}
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.navigate('Home')}
          >
            <View style={[styles.closeButtonCircle, { backgroundColor: theme.text + '20' }]}>
              <Ionicons name="close" size={24} color={theme.text} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Traveller</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading session history...</Text>
        </View>

        <BottomTabBar currentRoute="SessionHistory" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Unified Header */}
      <UnifiedHeader title="Pathfinder" onClose={() => navigation.navigate('Home')} />

      {/* Time Filter */}
      <View style={[styles.filterContainer, { backgroundColor: theme.card }]}>
        {(['all', 'week', 'month'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              timeFilter === filter && { backgroundColor: theme.primary },
              { borderColor: theme.primary }
            ]}
            onPress={() => setTimeFilter(filter)}
          >
            <Text style={[
              styles.filterText,
              { color: timeFilter === filter ? '#FFFFFF' : theme.text }
            ]}>
              {filter === 'all' ? 'All Time' : filter === 'week' ? 'This Week' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF5252" />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.primary }]} 
            onPress={() => fetchSessionHistory()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sessions List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
        }
      >
        {sessions.length === 0 && !loading && !error ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={64} color="#BDBDBD" />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Sessions Yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.text }]}>
              Complete your first focus session to see it here
            </Text>
            <TouchableOpacity
              style={[styles.startSessionButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('Main' as never, { screen: 'Home' } as never)}
            >
              <Text style={styles.startSessionButtonText}>Start Your First Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary Stats */}
            <View style={[styles.summaryContainer, { backgroundColor: theme.card }]}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>
                {timeFilter === 'all' ? 'All Time' : 
                 timeFilter === 'week' ? 'This Week' : 'This Month'} Summary
              </Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: theme.primary }]}>
                    {sessions.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: theme.text }]}>Sessions</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: theme.primary }]}>
                    {Math.round(sessions.reduce((total, session) => total + (session.duration_minutes || 0), 0) / 60 * 10) / 10}h
                  </Text>
                  <Text style={[styles.summaryLabel, { color: theme.text }]}>Total Time</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: theme.primary }]}>
                    {sessions.filter(s => s.status === 'completed').length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: theme.text }]}>Completed</Text>
                </View>
              </View>
            </View>

            {/* Sessions List */}
            {sessions.map(renderSessionCard)}
          </>
        )}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <BottomTabBar currentRoute="SessionHistory" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
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
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
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
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  summaryContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  sessionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  sessionHeader: {
    marginBottom: 12,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sessionDate: {
    fontSize: 14,
    opacity: 0.7,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  notesText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  startSessionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startSessionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SessionHistoryScreen;
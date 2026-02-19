import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BottomTabBar } from '../../components/BottomTabBar';
import { UnifiedHeader } from '../../components/UnifiedHeader';
import Animated, { FadeIn, FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useButtonPressAnimation, useCounterAnimation, triggerHaptic, useFocusAnimationKey } from '../../utils/animationUtils';
import { ShimmerLoader, SkeletonCard } from '../../components/premium/ShimmerLoader';
import { AnimatedFlatList, StaggeredItem } from '../../components/premium/StaggeredList';
import { Typography, Spacing, AnimationConfig } from '../../theme/premiumTheme';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

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

  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');
  const [selectedSession, setSelectedSession] = useState<SessionHistoryItem | null>(null);

  // Force animations to replay on every screen focus
  const focusKey = useFocusAnimationKey();

  // Fetch sessions from Convex using reactive query
  const rawSessions = useQuery(api.focusSessions.list, {});

  // Transform and filter sessions based on time filter
  const sessions = useMemo(() => {
    if (!rawSessions) return [];

    // Calculate date filter threshold
    let dateThreshold: Date | null = null;
    if (timeFilter === 'week') {
      dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - 7);
    } else if (timeFilter === 'month') {
      dateThreshold = new Date();
      dateThreshold.setMonth(dateThreshold.getMonth() - 1);
    }

    return rawSessions
      .filter(session => {
        // Filter by date if threshold is set
        if (dateThreshold) {
          const sessionDate = new Date(session.startTime);
          if (sessionDate < dateThreshold) return false;
        }
        return true;
      })
      .map(session => {
        // Map sessionType to user-friendly display name
        const typeLabels: Record<string, string> = {
          deep_work: 'Deep Work',
          balanced: 'Balance',
          sprint: 'Sprint',
          group: 'Group Study',
          individual: 'Focus Session',
        };
        const sessionName = typeLabels[session.sessionType || ''] || 'Focus Session';

        return {
          id: session._id,
          user_id: session.userId,
          start_time: session.startTime,
          end_time: session.endTime || '',
          duration_minutes: session.durationSeconds ? Math.round(session.durationSeconds / 60) : 0,
          intended_duration: 0,
          status: (session.status || 'completed') as 'completed' | 'cancelled' | 'paused' | 'active',
          focus_quality: 0,
          interruptions: 0,
          session_type: session.sessionType || 'individual',
          subject: sessionName,
          notes: '',
          created_at: session.startTime,
          task_title: sessionName,
          productivity_rating: 0,
        } as SessionHistoryItem;
      });
  }, [rawSessions, timeFilter]);

  const loading = rawSessions === undefined;
  const error = null; // Convex handles errors via query state
  const refreshing = false; // Convex queries auto-refresh

  const onRefresh = () => {
    // Convex queries are reactive and auto-refresh
    // This is a no-op but kept for UI consistency
  };

  // Configure header with refresh button
  useEffect(() => {
    navigation.setOptions({
      title: 'Session History',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Main' as never, { screen: 'Home' })}
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
  }, [navigation]);

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

  // Animated session card component - MUST be a separate component to use hooks properly
  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  // SessionCard as a proper component to follow Rules of Hooks
  const SessionCard: React.FC<{ session: SessionHistoryItem; index: number }> = ({ session, index }) => {
    const { animatedStyle, onPressIn, onPressOut } = useButtonPressAnimation();

    return (
      <StaggeredItem index={index} delay="normal" direction="up">
        <AnimatedTouchable
          style={[
            styles.sessionCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            animatedStyle,
          ]}
          onPress={() => {
            triggerHaptic('buttonPress');
            setSelectedSession(session);
          }}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={1}
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
            <Text style={[styles.sessionDate, { color: theme.textSecondary ?? theme.text }]}>
              {formatDate(session.created_at)}
            </Text>
          </View>

          {/* Session Stats */}
          <View style={styles.sessionStats}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color={theme.primary} />
              <Text style={[styles.statLabel, { color: theme.textSecondary ?? theme.text }]}>Duration</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {formatDuration(session.duration_minutes || 0)}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={16} color={theme.primary} />
              <Text style={[styles.statLabel, { color: theme.textSecondary ?? theme.text }]}>Type</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {session.subject || 'Focus'}
              </Text>
            </View>

            {session.focus_quality ? (
              <View style={styles.statItem}>
                <Ionicons name="eye-outline" size={16} color={theme.primary} />
                <Text style={[styles.statLabel, { color: theme.textSecondary ?? theme.text }]}>Focus</Text>
                <View style={styles.starsContainer}>
                  {renderStars(session.focus_quality)}
                </View>
              </View>
            ) : null}
          </View>

          {/* Notes Preview - only show if notes exist */}
          {session.notes ? (
            <View style={[styles.notesPreview, { borderTopColor: theme.border }]}>
              <Ionicons name="document-text-outline" size={14} color={theme.primary} />
              <Text style={[styles.notesText, { color: theme.text }]} numberOfLines={2}>
                {session.notes}
              </Text>
            </View>
          ) : null}

          {/* Session Footer */}
          <View style={[styles.sessionFooter, { borderTopColor: theme.border }]}>
            <View style={styles.footerItem}>
              <Ionicons name="time-outline" size={14} color={theme.primary} />
              <Text style={[styles.footerText, { color: theme.textSecondary ?? theme.text }]}>
                {new Date(session.start_time).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={[styles.footerText, { color: theme.textSecondary ?? theme.text }]}>
                Tap for details
              </Text>
              <Ionicons name="chevron-forward" size={14} color={theme.textSecondary ?? theme.text} style={{ marginLeft: 4 }} />
            </View>
          </View>
        </AnimatedTouchable>
      </StaggeredItem>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <UnifiedHeader title="History" onClose={() => navigation.navigate('Main' as never, { screen: 'Home' })} />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.loadingContainer}>
            <ShimmerLoader variant="card" height={100} style={{ marginBottom: 16 }} />
            <SkeletonCard showImage={false} style={{ marginBottom: 16 }} />
            <SkeletonCard showImage={false} style={{ marginBottom: 16 }} />
            <SkeletonCard showImage={false} style={{ marginBottom: 16 }} />
          </View>
        </ScrollView>

        <BottomTabBar currentRoute="SessionHistory" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Unified Header */}
      <UnifiedHeader title="History" onClose={() => navigation.navigate('Main' as never, { screen: 'Home' })} />

      {/* Time Filter */}
      <Animated.View
        key={`filter-${focusKey}`}
        entering={FadeInDown.delay(100).duration(400).duration(400)}
        style={[styles.filterContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
      >
        {(['all', 'week', 'month'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              timeFilter === filter && { backgroundColor: theme.primary },
              { borderColor: theme.primary }
            ]}
            onPress={() => {
              triggerHaptic('selection');
              setTimeFilter(filter);
            }}
          >
            <Text style={[
              styles.filterText,
              { color: timeFilter === filter ? '#FFFFFF' : theme.text }
            ]}>
              {filter === 'all' ? 'All Time' : filter === 'week' ? 'This Week' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

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
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary ?? theme.text }]}>
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
            <Animated.View
              entering={FadeInUp.delay(300).duration(400)}
              style={[styles.summaryContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={[styles.summaryTitle, { color: theme.text }]}>
                {timeFilter === 'all' ? 'All Time' :
                 timeFilter === 'week' ? 'This Week' : 'This Month'} Summary
              </Text>
              <View style={styles.summaryStats}>
                <Animated.View
                  entering={FadeIn.delay(400).duration(400)}
                  style={styles.summaryItem}
                >
                  <Text style={[styles.summaryValue, { color: theme.primary }]}>
                    {sessions.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary ?? theme.text }]}>Sessions</Text>
                </Animated.View>
                <Animated.View
                  entering={FadeIn.delay(500).duration(400)}
                  style={styles.summaryItem}
                >
                  <Text style={[styles.summaryValue, { color: theme.primary }]}>
                    {Math.round(sessions.reduce((total, session) => total + (session.duration_minutes || 0), 0) / 60 * 10) / 10}h
                  </Text>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary ?? theme.text }]}>Total Time</Text>
                </Animated.View>
                <Animated.View
                  entering={FadeIn.delay(600).duration(400)}
                  style={styles.summaryItem}
                >
                  <Text style={[styles.summaryValue, { color: theme.primary }]}>
                    {sessions.filter(s => s.status === 'completed').length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary ?? theme.text }]}>Completed</Text>
                </Animated.View>
              </View>
            </Animated.View>

            {/* Sessions List */}
            {sessions.map((session, index) => (
              <SessionCard key={session.id} session={session} index={index} />
            ))}
          </>
        )}
      </ScrollView>

      {/* Session Detail Modal */}
      <Modal
        visible={!!selectedSession}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedSession(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedSession(null)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
            {selectedSession && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {selectedSession.task_title || 'Focus Session'}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedSession(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="close" size={24} color={theme.textSecondary ?? theme.text} />
                  </TouchableOpacity>
                </View>

                {/* Status Badge */}
                <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedSession.status) }]}>
                  <Ionicons name={getStatusIcon(selectedSession.status) as any} size={14} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalStatusText}>{selectedSession.status}</Text>
                </View>

                {/* Detail Rows */}
                <View style={[styles.modalDivider, { borderBottomColor: theme.border }]} />

                <View style={styles.modalDetailRow}>
                  <Ionicons name="time-outline" size={18} color={theme.primary} />
                  <Text style={[styles.modalDetailLabel, { color: theme.textSecondary ?? theme.text }]}>Duration</Text>
                  <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                    {formatDuration(selectedSession.duration_minutes || 0)}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Ionicons name="fitness-outline" size={18} color={theme.primary} />
                  <Text style={[styles.modalDetailLabel, { color: theme.textSecondary ?? theme.text }]}>Session Type</Text>
                  <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                    {selectedSession.subject || 'Focus Session'}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                  <Text style={[styles.modalDetailLabel, { color: theme.textSecondary ?? theme.text }]}>Date</Text>
                  <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                    {new Date(selectedSession.start_time).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Ionicons name="play-outline" size={18} color={theme.primary} />
                  <Text style={[styles.modalDetailLabel, { color: theme.textSecondary ?? theme.text }]}>Started</Text>
                  <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                    {new Date(selectedSession.start_time).toLocaleTimeString('en-US', {
                      hour: '2-digit', minute: '2-digit', hour12: true
                    })}
                  </Text>
                </View>

                {selectedSession.end_time ? (
                  <View style={styles.modalDetailRow}>
                    <Ionicons name="stop-outline" size={18} color={theme.primary} />
                    <Text style={[styles.modalDetailLabel, { color: theme.textSecondary ?? theme.text }]}>Ended</Text>
                    <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                      {new Date(selectedSession.end_time).toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit', hour12: true
                      })}
                    </Text>
                  </View>
                ) : null}

                {/* Notes Section */}
                <View style={[styles.modalDivider, { borderBottomColor: theme.border }]} />
                <View style={styles.modalNotesSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="document-text-outline" size={18} color={theme.primary} />
                    <Text style={[styles.modalDetailLabel, { color: theme.textSecondary ?? theme.text, marginLeft: 8 }]}>Notes</Text>
                  </View>
                  <Text style={[styles.modalNotesText, { color: theme.textSecondary ?? theme.text }]}>
                    {selectedSession.notes || 'No notes recorded for this session.'}
                  </Text>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  style={[styles.modalCloseButton, { backgroundColor: theme.primary }]}
                  onPress={() => setSelectedSession(null)}
                >
                  <Text style={styles.modalCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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
  // ─── Detail Modal ────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalStatusText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  modalDivider: {
    borderBottomWidth: 1,
    marginVertical: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalDetailLabel: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  modalDetailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalNotesSection: {
    marginTop: 4,
  },
  modalNotesText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  modalCloseButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SessionHistoryScreen;
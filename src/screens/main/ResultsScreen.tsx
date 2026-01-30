import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useCounterAnimation, useProgressAnimation } from '../../utils/animationUtils';
import { ShimmerLoader, SkeletonCard } from '../../components/premium/ShimmerLoader';
import { StaggeredList, StaggeredItem } from '../../components/premium/StaggeredList';
import { HolographicBadge } from '../../components/premium/HolographicBadge';
import { Typography, Spacing, AnimationConfig } from '../../theme/premiumTheme';

const ResultsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const { theme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        // Provide demo data if no user
        setResults([
          { id: 1, title: 'Demo Result', score: 85, date: new Date().toISOString() },
          { id: 2, title: 'Sample Test', score: 92, date: new Date().toISOString() },
        ]);
        return;
      }

      // TODO: Fetch actual results from Convex
      // Quiz results will be migrated to Convex in a future phase
      // For now, use demo data
      setResults([]);
    } catch (error) {
      console.error('Error fetching results:', error);
      // Fallback to demo data on error
      setResults([
        { id: 1, title: 'Demo Result', score: 85, date: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Animated counters for results
  const totalResults = results.length;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;
  const highestScore = results.length > 0
    ? Math.max(...results.map(r => r.score))
    : 0;

  const totalCounter = useCounterAnimation(totalResults, 1000);
  const avgCounter = useCounterAnimation(avgScore, 1200);
  const highestCounter = useCounterAnimation(highestScore, 1400);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <ShimmerLoader variant="text" width={200} height={32} />
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <ShimmerLoader variant="card" height={120} style={{ marginBottom: 16 }} />
          <SkeletonCard showImage={false} style={{ marginBottom: 16 }} />
          <SkeletonCard showImage={false} style={{ marginBottom: 16 }} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Your Results</Text>
      </Animated.View>

      {results.length === 0 ? (
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.centered}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>📊</Text>
          <Text style={[styles.emptyText, { color: theme.text }]}>No results yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.text + '99' }]}>
            Complete some quizzes to see your results here!
          </Text>
        </Animated.View>
      ) : (
        <>
          {/* Stats Summary */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(400)}
            style={[styles.statsContainer, { backgroundColor: theme.card }]}
          >
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Animated.Text style={[styles.statNumber, { color: theme.primary }]}>
                  {Math.round(totalCounter.value)}
                </Animated.Text>
                <Text style={[styles.statLabel, { color: theme.text }]}>Total Results</Text>
              </View>
              <View style={styles.statBox}>
                <Animated.Text style={[styles.statNumber, { color: theme.primary }]}>
                  {Math.round(avgCounter.value)}%
                </Animated.Text>
                <Text style={[styles.statLabel, { color: theme.text }]}>Avg Score</Text>
              </View>
              <View style={styles.statBox}>
                <Animated.Text style={[styles.statNumber, { color: theme.primary }]}>
                  {Math.round(highestCounter.value)}%
                </Animated.Text>
                <Text style={[styles.statLabel, { color: theme.text }]}>Best Score</Text>
              </View>
            </View>
          </Animated.View>

          {/* Achievement Badges */}
          {highestScore >= 90 && (
            <Animated.View
              entering={FadeInUp.delay(300).duration(400)}
              style={styles.badgeContainer}
            >
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Achievements</Text>
              <View style={styles.badgeRow}>
                <HolographicBadge
                  title="Top Scorer"
                  icon={<Text style={{ fontSize: 32 }}>🏆</Text>}
                  unlocked={true}
                  rarity="legendary"
                  size="small"
                  showCelebration={true}
                />
                {avgScore >= 85 && (
                  <HolographicBadge
                    title="Consistent"
                    icon={<Text style={{ fontSize: 32 }}>⭐</Text>}
                    unlocked={true}
                    rarity="epic"
                    size="small"
                  />
                )}
              </View>
            </Animated.View>
          )}

          {/* Results List */}
          <StaggeredList delay="normal">
            {results.map((result, index) => {
              const progressValue = result.score / 100;
              const progressStyle = useProgressAnimation(progressValue);

              return (
                <View key={result.id} style={[styles.resultCard, { backgroundColor: theme.card }]}>
                  <View style={styles.resultHeader}>
                    <Text style={[styles.resultTitle, { color: theme.text }]}>{result.title}</Text>
                    <Text style={[styles.resultScore, { color: theme.primary }]}>
                      {result.score}%
                    </Text>
                  </View>

                  {/* Animated progress bar */}
                  <View style={[styles.progressBar, { backgroundColor: theme.text + '20' }]}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        { backgroundColor: theme.primary },
                        progressStyle,
                      ]}
                    />
                  </View>

                  <Text style={[styles.resultDate, { color: theme.text + '99' }]}>
                    {new Date(result.date).toLocaleDateString()}
                  </Text>
                </View>
              );
            })}
          </StaggeredList>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  statsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  badgeContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  resultCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  resultScore: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  resultDate: {
    fontSize: 12,
  },
});

export default ResultsScreen;
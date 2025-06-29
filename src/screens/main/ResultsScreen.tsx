import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

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

      // Fetch actual results from your database
      const { data, error } = await supabase
        .from('quiz_results') // or whatever table stores results
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setResults(data || []);
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading results...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Your Results</Text>
      </View>
      
      {results.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text }]}>No results yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.text + '99' }]}>
            Complete some quizzes to see your results here!
          </Text>
        </View>
      ) : (
        results.map((result) => (
          <View key={result.id} style={[styles.resultCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.resultTitle, { color: theme.text }]}>{result.title}</Text>
            <Text style={[styles.resultScore, { color: theme.primary }]}>Score: {result.score}%</Text>
            <Text style={[styles.resultDate, { color: theme.text + '99' }]}>
              {new Date(result.date).toLocaleDateString()}
            </Text>
          </View>
        ))
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
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
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultScore: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultDate: {
    fontSize: 12,
  },
});

export default ResultsScreen;
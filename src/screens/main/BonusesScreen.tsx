import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { BottomTabBar } from '../../components/BottomTabBar';
import { UnifiedHeader } from '../../components/UnifiedHeader';

const BonusesScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const bonusFeatures = [
    {
      id: 'achievements',
      title: 'Achievements',
      description: 'Track your progress and unlock exclusive rewards',
      icon: 'trophy',
      iconFamily: 'Ionicons',
      color: '#FFD700',
      gradient: ['#FFD700', '#FFA000'],
      onPress: () => navigation.navigate('Achievements'),
      stats: 'Unlock 50+ achievements'
    },
    {
      id: 'ebooks',
      title: 'E-Book Library',
      description: 'Upload and access your textbooks anywhere, anytime',
      icon: 'book',
      iconFamily: 'Ionicons',
      color: '#4CAF50',
      gradient: ['#4CAF50', '#2E7D32'],
      onPress: () => navigation.navigate('EBooks'),
      stats: 'Support for 100MB+ files'
    },
    {
      id: 'self-discovery',
      title: 'Self-Discovery Quizzes',
      description: 'Discover your unique learning style and study patterns',
      icon: 'brain',
      iconFamily: 'MaterialCommunityIcons',
      color: '#9C27B0',
      gradient: ['#9C27B0', '#7B1FA2'],
      onPress: () => navigation.navigate('SelfDiscoveryQuiz'),
      stats: '5 comprehensive assessments'
    },
    {
      id: 'brain-mapping',
      title: 'Brain Activity Mapping',
      description: 'Visualize your cognitive patterns and learning zones',
      icon: 'brain',
      iconFamily: 'MaterialCommunityIcons',
      color: '#E91E63',
      gradient: ['#E91E63', '#C2185B'],
      onPress: () => navigation.navigate('BrainMapping'),
      stats: 'Real-time brain insights'
    }
  ];

  const renderFeatureCard = (feature: any) => {
    const IconComponent = feature.iconFamily === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
    
    return (
      <TouchableOpacity
        key={feature.id}
        style={[styles.featureCard, { backgroundColor: theme.card }]}
        onPress={feature.onPress}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: feature.color + '15' }]}>
            <IconComponent 
              name={feature.icon as any} 
              size={32} 
              color={feature.color} 
            />
          </View>
          
          <View style={styles.textContent}>
            <Text style={[styles.featureTitle, { color: theme.text }]}>
              {feature.title}
            </Text>
            <Text style={[styles.featureDescription, { color: theme.text + '99' }]}>
              {feature.description}
            </Text>
            <Text style={[styles.featureStats, { color: feature.color }]}>
              {feature.stats}
            </Text>
          </View>
          
          <View style={styles.arrowContainer}>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={theme.text + '66'} 
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Unified Header */}
      <UnifiedHeader title="Traveller" onClose={() => navigation.navigate('Home')} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Features Grid */}
        <View style={styles.featuresContainer}>
          {bonusFeatures.map(renderFeatureCard)}
        </View>

        {/* Coming Soon Section */}
        <View style={[styles.comingSoonContainer, { backgroundColor: theme.card }]}>
          <View style={styles.comingSoonHeader}>
            <MaterialCommunityIcons 
              name="rocket-launch" 
              size={24} 
              color={theme.primary} 
            />
            <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
              Coming Soon
            </Text>
          </View>
          <Text style={[styles.comingSoonDescription, { color: theme.text + '99' }]}>
            We're constantly working on new features to help you study more effectively. 
            Stay tuned for exciting updates!
          </Text>
          
          <View style={styles.upcomingFeatures}>
            {[
              'Advanced Study Analytics',
              'Collaborative Study Sessions',
              'AI-Powered Study Recommendations',
              'Virtual Study Environments'
            ].map((feature, index) => (
              <View key={index} style={styles.upcomingFeature}>
                <Ionicons 
                  name="ellipse" 
                  size={6} 
                  color={theme.primary} 
                  style={styles.bulletPoint}
                />
                <Text style={[styles.upcomingFeatureText, { color: theme.text + '88' }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Stats Card */}
        <View style={[styles.statsCard, { backgroundColor: theme.primary + '15' }]}>
          <Text style={[styles.statsTitle, { color: theme.primary }]}>
            Your Progress
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>4</Text>
              <Text style={[styles.statLabel, { color: theme.text + '88' }]}>Features</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>∞</Text>
              <Text style={[styles.statLabel, { color: theme.text + '88' }]}>Possibilities</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>24/7</Text>
              <Text style={[styles.statLabel, { color: theme.text + '88' }]}>Available</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <BottomTabBar currentRoute="Bonuses" />
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
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  featureStats: {
    fontSize: 12,
    fontWeight: '600',
  },
  arrowContainer: {
    marginLeft: 12,
  },
  comingSoonContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  comingSoonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  comingSoonDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  upcomingFeatures: {
    marginTop: 8,
  },
  upcomingFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulletPoint: {
    marginRight: 12,
  },
  upcomingFeatureText: {
    fontSize: 14,
    flex: 1,
  },
  statsCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 16,
  },
});

export default BonusesScreen;
import React, { useState, useEffect, Suspense } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
const { useUserAppData } = require('../../utils/userAppData');
// Lazy load OBJBrain3D to avoid Three.js URL errors at module load time
const OBJBrain3D = React.lazy(() => import('../../components/OBJBrain3D'));
import { generateBrainVisualizationData, Brain3DRegion } from '../../utils/brain3DData';
import ReAnimated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useFocusAnimationKey } from '../../utils/animationUtils';

interface BrainActivity {
  id: string;
  subject: string;
  region: string;
  description: string;
  activity: number; // 0-1 scale
  color: string;
  coordinates: { x: number; y: number };
  icon: string;
  lastActive: string;
  studyTime: number; // in minutes
}

const BRAIN_ACTIVITIES: BrainActivity[] = [
  {
    id: '1',
    subject: 'Mathematics',
    region: 'Left Parietal Lobe',
    description: 'Responsible for logical reasoning, spatial processing, and mathematical calculations. This region shows high activity during problem-solving sessions.',
    activity: 0.85,
    color: '#2196F3',
    coordinates: { x: 120, y: 140 },
    icon: 'calculator',
    lastActive: '2 hours ago',
    studyTime: 45,
  },
  {
    id: '2',
    subject: 'History',
    region: 'Temporal Lobe',
    description: 'Critical for memory formation and language processing. Active during reading, memorization, and recall of historical events.',
    activity: 0.65,
    color: '#FF9800',
    coordinates: { x: 80, y: 180 },
    icon: 'book-outline',
    lastActive: '1 day ago',
    studyTime: 30,
  },
  {
    id: '3',
    subject: 'Biology',
    region: 'Occipital Lobe',
    description: 'Processes visual information essential for understanding diagrams, charts, and biological structures.',
    activity: 0.75,
    color: '#4CAF50',
    coordinates: { x: 200, y: 160 },
    icon: 'leaf-outline',
    lastActive: '3 hours ago',
    studyTime: 60,
  },
  {
    id: '4',
    subject: 'Music Theory',
    region: 'Right Temporal Lobe',
    description: 'Specialized in processing musical patterns, rhythm, and auditory information. Highly active during music practice.',
    activity: 0.55,
    color: '#9C27B0',
    coordinates: { x: 170, y: 180 },
    icon: 'musical-notes-outline',
    lastActive: '5 hours ago',
    studyTime: 25,
  },
  {
    id: '5',
    subject: 'Language Arts',
    region: 'Broca\'s Area',
    description: 'Controls speech production and language comprehension. Active during reading, writing, and vocabulary practice.',
    activity: 0.70,
    color: '#E91E63',
    coordinates: { x: 90, y: 150 },
    icon: 'chatbubble-outline',
    lastActive: '4 hours ago',
    studyTime: 35,
  },
];

const BrainMappingScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  // Force animations to replay on every screen focus
  const focusKey = useFocusAnimationKey();

  const [modalVisible, setModalVisible] = useState(false);
  const [brain3DData, setBrain3DData] = useState<Brain3DRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Brain3DRegion | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Get user data from our comprehensive hook
  const { data: userData, isLoading: userDataLoading } = useUserAppData();

  // Configure header - hide title and hamburger, keep back button
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);


  // Process user data to generate 3D brain activity data
  useEffect(() => {
    if (userData && !userDataLoading) {
      const brain3D = generateBrainVisualizationData(userData);
      setBrain3DData(brain3D);
    }
  }, [userData, userDataLoading]);

  const closeDetail = () => {
    setModalVisible(false);
    setSelectedRegion(null);
  };

  const handle3DRegionPress = (region: Brain3DRegion) => {
    setSelectedRegion(region);
    setModalVisible(true);
  };

  const getActivityLevel = (activity: number) => {
    if (activity >= 0.8) return 'Very High';
    if (activity >= 0.6) return 'High';
    if (activity >= 0.4) return 'Medium';
    return 'Low';
  };


  const render3DRegionCard = ({ item }: { item: Brain3DRegion }) => (
    <TouchableOpacity
      style={[styles.activityCard, { backgroundColor: theme.card }]}
      onPress={() => handle3DRegionPress(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.activityIcon, { backgroundColor: `${item.color}15` }]}>
        <Ionicons
          name="pulse-outline"
          size={24}
          color={item.color}
        />
      </View>

      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={[styles.activitySubject, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.activityLevel, { color: item.color }]}>
            {getActivityLevel(item.activity)}
          </Text>
        </View>

        {item.subject && (
          <Text style={[styles.activityRegion, { color: theme.text + '99' }]}>Subject: {item.subject}</Text>
        )}

        <View style={styles.activityMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={theme.text + '99'} />
            <Text style={[styles.metaText, { color: theme.text + '99' }]}>{item.lastActive}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="hourglass-outline" size={14} color={theme.text + '99'} />
            <Text style={[styles.metaText, { color: theme.text + '99' }]}>{item.studyTime}m studied</Text>
          </View>
        </View>

        <View style={styles.activityProgress}>
          <View style={[styles.progressBar, { backgroundColor: theme.background }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${item.activity * 100}%`,
                  backgroundColor: item.color,
                }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.text + '99' }]}>{Math.round(item.activity * 100)}% active</Text>
        </View>
      </View>
    </TouchableOpacity>
  );


  return (
    <ReAnimated.View
      key={`container-${focusKey}`}
      entering={FadeIn.duration(250)}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Custom Header */}
      <ReAnimated.View
        entering={FadeIn.delay(50).duration(200)}
        style={[styles.customHeader, { backgroundColor: theme.background }]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('Bonuses' as never)}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Brain Activity Mapping</Text>
        <View style={styles.headerSpacer} />
      </ReAnimated.View>

      <ReAnimated.ScrollView
        entering={FadeInUp.delay(100).duration(300)}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.subtitle, { color: theme.text + '99' }]}>
            Explore your brain in stunning 3D! Drag to rotate and discover which areas light up during your study sessions. Each region represents a different cognitive function.
          </Text>
        </View>

        <View style={styles.brain3DContainer}>
          <Suspense fallback={
            <View style={styles.brain3DFallback}>
              <ActivityIndicator size="large" color="#1B5E20" />
              <Text style={styles.brain3DFallbackText}>Loading 3D Brain Model...</Text>
            </View>
          }>
            <OBJBrain3D
              regions={brain3DData}
              onRegionPress={handle3DRegionPress}
              autoRotate={true}
              onInteractionStart={() => setScrollEnabled(false)}
              onInteractionEnd={() => setScrollEnabled(true)}
            />
          </Suspense>
        </View>

        <View style={styles.activitiesSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Brain Region Activity
          </Text>
          <FlatList
            data={brain3DData}
            renderItem={render3DRegionCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ReAnimated.ScrollView>

      {/* Brain Region Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDetail}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {selectedRegion && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIcon, {
                    backgroundColor: `${selectedRegion.color}15`
                  }]}>
                    <Ionicons
                      name="pulse-outline"
                      size={32}
                      color={selectedRegion.color}
                    />
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={closeDetail}>
                    <Ionicons name="close" size={24} color={theme.text + '99'} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedRegion.name}
                </Text>
                <Text style={[styles.modalRegion, { color: theme.text + '99' }]}>
                  {selectedRegion.subject ? `Subject: ${selectedRegion.subject}` : 'Brain Region'}
                </Text>

                <View style={styles.modalStats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {Math.round(selectedRegion.activity * 100)}%
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text + '99' }]}>Activity Level</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {selectedRegion.studyTime}m
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text + '99' }]}>Study Time</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {selectedRegion.lastActive}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text + '99' }]}>Last Active</Text>
                  </View>
                </View>

                <Text style={[styles.modalDescription, { color: theme.text + '99' }]}>
                  {selectedRegion.description}
                </Text>

                <TouchableOpacity style={[styles.viewDetailsButton, {
                  backgroundColor: selectedRegion.color
                }]}>
                  <Text style={styles.viewDetailsText}>View Study History</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ReAnimated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#B8B8B8',
    lineHeight: 22,
  },
  brainContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  brainRegion: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  brainLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 16,
  },
  brainSubLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  activitiesSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activitySubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  activityLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityRegion: {
    fontSize: 14,
    color: '#B8B8B8',
    marginBottom: 8,
  },
  activityMeta: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#B8B8B8',
    marginLeft: 4,
  },
  activityProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#B8B8B8',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2a2a3e',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalRegion: {
    fontSize: 16,
    color: '#B8B8B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#B8B8B8',
    marginTop: 4,
  },
  modalDescription: {
    fontSize: 16,
    color: '#B8B8B8',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  viewDetailsButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  brain3DContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  brain3DFallback: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 16,
  },
  brain3DFallbackText: {
    marginTop: 16,
    fontSize: 14,
    color: '#1B5E20',
    fontWeight: '500',
  },
});

export default BrainMappingScreen;
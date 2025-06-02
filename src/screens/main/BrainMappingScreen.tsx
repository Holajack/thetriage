import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';

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
  const [selectedActivity, setSelectedActivity] = useState<BrainActivity | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pulseAnimations] = useState(
    BRAIN_ACTIVITIES.reduce((acc, activity) => {
      acc[activity.id] = new Animated.Value(1);
      return acc;
    }, {} as Record<string, Animated.Value>)
  );

  useEffect(() => {
    // Create pulsing animations for active brain regions
    BRAIN_ACTIVITIES.forEach((activity) => {
      if (activity.activity > 0.6) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnimations[activity.id], {
              toValue: 1.3,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnimations[activity.id], {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    });
  }, []);

  const openActivityDetail = (activity: BrainActivity) => {
    setSelectedActivity(activity);
    setModalVisible(true);
  };

  const closeDetail = () => {
    setModalVisible(false);
    setSelectedActivity(null);
  };

  const getActivityLevel = (activity: number) => {
    if (activity >= 0.8) return 'Very High';
    if (activity >= 0.6) return 'High';
    if (activity >= 0.4) return 'Medium';
    return 'Low';
  };

  const renderBrainVisualization = () => (
    <View style={styles.brainContainer}>
      <Svg height="280" width="280" viewBox="0 0 280 280">
        {/* Brain outline */}
        <Path
          d="M140 40 C200 40, 240 80, 240 140 C240 180, 220 200, 200 220 C180 240, 160 240, 140 240 C120 240, 100 240, 80 220 C60 200, 40 180, 40 140 C40 80, 80 40, 140 40 Z"
          stroke="#E0E0E0"
          strokeWidth="2"
          fill="#F8F8F8"
        />
        
        {/* Brain regions */}
        {BRAIN_ACTIVITIES.map((activity) => (
          <Animated.View
            key={activity.id}
            style={{
              position: 'absolute',
              left: activity.coordinates.x - 15,
              top: activity.coordinates.y - 15,
              transform: [{ scale: pulseAnimations[activity.id] }],
            }}
          >
            <TouchableOpacity
              onPress={() => openActivityDetail(activity)}
              style={[
                styles.brainRegion,
                {
                  backgroundColor: activity.color,
                  opacity: 0.3 + (activity.activity * 0.7),
                }
              ]}
            >
              <Ionicons
                name={activity.icon as any}
                size={16}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </Svg>
      
      <Text style={styles.brainLabel}>Interactive Brain Map</Text>
      <Text style={styles.brainSubLabel}>Tap regions to see activity details</Text>
    </View>
  );

  const renderActivityCard = ({ item }: { item: BrainActivity }) => (
    <TouchableOpacity
      style={styles.activityCard}
      onPress={() => openActivityDetail(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.activityIcon, { backgroundColor: `${item.color}15` }]}>
        <Ionicons
          name={item.icon as any}
          size={24}
          color={item.color}
        />
      </View>
      
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.activitySubject}>{item.subject}</Text>
          <Text style={[styles.activityLevel, { color: item.color }]}>
            {getActivityLevel(item.activity)}
          </Text>
        </View>
        
        <Text style={styles.activityRegion}>{item.region}</Text>
        
        <View style={styles.activityMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={theme.text + '99'} />
            <Text style={styles.metaText}>{item.lastActive}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="hourglass-outline" size={14} color={theme.text + '99'} />
            <Text style={styles.metaText}>{item.studyTime}m studied</Text>
          </View>
        </View>
        
        <View style={styles.activityProgress}>
          <View style={styles.progressBar}>
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
          <Text style={styles.progressText}>{Math.round(item.activity * 100)}% active</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.title}>Brain Mapping</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContent}>
          <Text style={styles.subtitle}>
            Explore the areas of your brain activated during recent study sessions. Each highlighted region represents a different cognitive function.
          </Text>
        </View>

        {renderBrainVisualization()}

        <View style={styles.activitiesSection}>
          <Text style={styles.sectionTitle}>Brain Activity Breakdown</Text>
          <FlatList
            data={BRAIN_ACTIVITIES}
            renderItem={renderActivityCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>

      {/* Activity Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDetail}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedActivity && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIcon, { backgroundColor: `${selectedActivity.color}15` }]}>
                    <Ionicons
                      name={selectedActivity.icon as any}
                      size={32}
                      color={selectedActivity.color}
                    />
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={closeDetail}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>{selectedActivity.subject}</Text>
                <Text style={styles.modalRegion}>{selectedActivity.region}</Text>

                <View style={styles.modalStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{Math.round(selectedActivity.activity * 100)}%</Text>
                    <Text style={styles.statLabel}>Activity Level</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{selectedActivity.studyTime}m</Text>
                    <Text style={styles.statLabel}>Study Time</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{selectedActivity.lastActive}</Text>
                    <Text style={styles.statLabel}>Last Active</Text>
                  </View>
                </View>

                <Text style={styles.modalDescription}>{selectedActivity.description}</Text>

                <TouchableOpacity style={[styles.viewDetailsButton, { backgroundColor: selectedActivity.color }]}>
                  <Text style={styles.viewDetailsText}>View Study History</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
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
    color: '#666',
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
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 16,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    color: '#1B5E20',
    flex: 1,
  },
  activityLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityRegion: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
    marginLeft: 4,
  },
  activityProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
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
    color: '#666',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
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
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalRegion: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
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
});

export default BrainMappingScreen; 
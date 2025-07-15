import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Animated, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
const { useUserAppData } = require('../../utils/userAppData');
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import Brain3D from '../../components/Brain3D';
import RealisticBrain3D from '../../components/RealisticBrain3D';
import { generateBrainVisualizationData, Brain3DRegion } from '../../utils/brain3DData';

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
  const [is3DMode, setIs3DMode] = useState(false);
  const [useRealisticModel, setUseRealisticModel] = useState(true);
  const [brain3DData, setBrain3DData] = useState<Brain3DRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Brain3DRegion | null>(null);
  const [pulseAnimations] = useState(
    BRAIN_ACTIVITIES.reduce((acc, activity) => {
      acc[activity.id] = new Animated.Value(1);
      return acc;
    }, {} as Record<string, Animated.Value>)
  );
  const [activities, setActivities] = useState<BrainActivity[]>(BRAIN_ACTIVITIES);

  // Get user data from our comprehensive hook
  const { data: userData, isLoading: userDataLoading } = useUserAppData();

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: 'Brain Activity Mapping',
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('Bonuses' as never)} 
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          <Text style={[styles.viewModeText, { color: theme.text }]}>
            {is3DMode ? (useRealisticModel ? 'MRI' : '3D') : '2D'}
          </Text>
          <Switch
            value={is3DMode}
            onValueChange={setIs3DMode}
            trackColor={{ false: '#767577', true: theme.primary }}
            thumbColor={is3DMode ? '#f4f3f4' : '#f4f3f4'}
          />
          {is3DMode && (
            <TouchableOpacity
              style={[styles.modelToggle, { backgroundColor: theme.primary + '20' }]}
              onPress={() => setUseRealisticModel(!useRealisticModel)}
            >
              <Text style={[styles.modelToggleText, { color: theme.primary }]}>
                {useRealisticModel ? 'MRI' : 'Simple'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [navigation, theme, is3DMode, useRealisticModel]);

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

  // Process user data to generate brain activity data
  useEffect(() => {
    if (userData && !userDataLoading) {
      generateBrainActivityFromUserData(userData);
      // Generate 3D brain data
      const brain3D = generateBrainVisualizationData(userData);
      setBrain3DData(brain3D);
    }
  }, [userData, userDataLoading]);

  // Generate brain activity data from user subjects and sessions
  const generateBrainActivityFromUserData = (userData: any) => {
    try {
      if (!userData?.sessions || !userData?.tasks) {
        return;
      }

      const sessions = userData.sessions || [];
      const tasks = userData.tasks || [];

      // Extract unique subjects from tasks
      const subjectMap: Record<string, {
        time: number,
        lastActive: Date | null,
        region: string,
        description: string,
        color: string,
        coordinates: { x: number, y: number },
        icon: string
      }> = {};

      // Define brain regions for subjects
      const brainRegions = [
        {
          name: 'Left Prefrontal Cortex',
          description: 'Critical for planning complex behavior, decision making, and moderating social behavior.',
          coordinates: { x: 100, y: 100 },
          color: '#4CAF50'
        },
        {
          name: 'Right Temporal Lobe',
          description: 'Important for processing auditory information and language comprehension.',
          coordinates: { x: 180, y: 170 },
          color: '#FF9800'
        },
        {
          name: 'Left Parietal Lobe',
          description: 'Responsible for logical reasoning, spatial processing, and mathematical calculations.',
          coordinates: { x: 120, y: 140 },
          color: '#2196F3'
        },
        {
          name: 'Occipital Lobe',
          description: 'Processes visual information essential for understanding diagrams, charts, and structures.',
          coordinates: { x: 160, y: 210 },
          color: '#9C27B0'
        },
        {
          name: 'Broca\'s Area',
          description: 'Involved in speech production and language processing.',
          coordinates: { x: 90, y: 140 },
          color: '#F44336'
        },
        {
          name: 'Hippocampus',
          description: 'Essential for long-term memory formation and recall of information.',
          coordinates: { x: 140, y: 180 },
          color: '#00BCD4'
        }
      ];

      // Icons for different types of subjects
      const subjectIcons: Record<string, string> = {
        'Math': 'calculator',
        'Science': 'flask',
        'History': 'book',
        'English': 'text',
        'Art': 'color-palette',
        'Music': 'musical-notes',
        'Computer': 'code',
        'Language': 'language',
        'Physics': 'magnet',
        'Chemistry': 'flask',
        'Biology': 'leaf',
        'Economics': 'cash',
        'CS': 'code-slash',
        'Psychology': 'brain',
        'Geography': 'globe'
      };

      // Extract subjects from tasks and assign time from sessions
      tasks.forEach((task: any) => {
        if (!task.title) return;

        // Extract subject from task name (first word)
        const subject = task.title.split(' ')[0];

        // Find related session for this task
        const taskSessions = sessions.filter((session: any) =>
          session.task_id === task.id
        );

        // Calculate total time spent on this subject
        const timeSpent = taskSessions.reduce(
          (sum: number, session: any) => sum + (session.duration_minutes || 0),
          0
        );

        // Find the most recent activity for this subject
        const latestSession = taskSessions.length > 0
          ? taskSessions.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
          : null;

        const lastActive = latestSession?.created_at ? new Date(latestSession.created_at) : null;

        // Assign a brain region and other properties
        if (!subjectMap[subject]) {
          const regionIndex = Object.keys(subjectMap).length % brainRegions.length;
          const region = brainRegions[regionIndex];

          subjectMap[subject] = {
            time: 0,
            lastActive: null,
            region: region.name,
            description: region.description,
            color: region.color,
            coordinates: region.coordinates,
            icon: subjectIcons[subject] || 'book-outline'
          };
        }

        // Update time spent and last active
        subjectMap[subject].time += timeSpent;
        if (lastActive && (!subjectMap[subject].lastActive || lastActive > subjectMap[subject].lastActive)) {
          subjectMap[subject].lastActive = lastActive;
        }
      });

      // Convert to BrainActivity array for display
      const newActivities: BrainActivity[] = Object.entries(subjectMap).map(([subject, data], index) => {
        // Calculate activity level based on time spent (0-1 scale)
        const maxTime = Math.max(...Object.values(subjectMap).map(s => s.time));
        const activity = maxTime > 0 ? data.time / maxTime : 0.5;

        // Format last active time
        let lastActiveStr = 'Never';
        if (data.lastActive) {
          const now = new Date();
          const diffMs = now.getTime() - data.lastActive.getTime();
          const diffHrs = diffMs / (1000 * 60 * 60);

          if (diffHrs < 1) {
            lastActiveStr = `${Math.round(diffHrs * 60)} minutes ago`;
          } else if (diffHrs < 24) {
            lastActiveStr = `${Math.round(diffHrs)} hours ago`;
          } else {
            lastActiveStr = `${Math.round(diffHrs / 24)} days ago`;
          }
        }

        return {
          id: String(index + 1),
          subject,
          region: data.region,
          description: data.description,
          activity: Math.max(0.3, Math.min(0.95, activity)), // Min 0.3, max 0.95
          color: data.color,
          coordinates: data.coordinates,
          icon: data.icon,
          lastActive: lastActiveStr,
          studyTime: data.time
        };
      });

      // If we found activities, update state
      if (newActivities.length > 0) {
        setActivities(newActivities);
      }

    } catch (err) {
      console.error('Error generating brain activity data:', err);
    }
  };

  const openActivityDetail = (activity: BrainActivity) => {
    setSelectedActivity(activity);
    setModalVisible(true);
  };

  const closeDetail = () => {
    setModalVisible(false);
    setSelectedActivity(null);
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
        {activities.map((activity) => (
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

  const render3DRegionCard = ({ item }: { item: Brain3DRegion }) => (
    <TouchableOpacity
      style={styles.activityCard}
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
          <Text style={styles.activitySubject}>{item.name}</Text>
          <Text style={[styles.activityLevel, { color: item.color }]}>
            {getActivityLevel(item.activity)}
          </Text>
        </View>

        {item.subject && (
          <Text style={styles.activityRegion}>Subject: {item.subject}</Text>
        )}

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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContent}>
          <Text style={styles.subtitle}>
            Explore the areas of your brain activated during recent study sessions. Each highlighted region represents a different cognitive function.
          </Text>
        </View>

        {is3DMode ? (
          <View style={styles.brain3DContainer}>
            {useRealisticModel ? (
              <RealisticBrain3D 
                regions={brain3DData} 
                onRegionPress={handle3DRegionPress}
              />
            ) : (
              <Brain3D 
                regions={brain3DData} 
                onRegionPress={handle3DRegionPress}
              />
            )}
          </View>
        ) : (
          renderBrainVisualization()
        )}

        <View style={styles.activitiesSection}>
          <Text style={styles.sectionTitle}>
            {is3DMode ? '3D Brain Region Activity' : 'Brain Activity Breakdown'}
          </Text>
          <FlatList
            data={is3DMode ? brain3DData : activities}
            renderItem={is3DMode ? render3DRegionCard : renderActivityCard}
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
            {(selectedActivity || selectedRegion) && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIcon, { 
                    backgroundColor: `${(selectedActivity?.color || selectedRegion?.color)}15` 
                  }]}>
                    <Ionicons
                      name={(selectedActivity?.icon || 'pulse-outline') as any}
                      size={32}
                      color={selectedActivity?.color || selectedRegion?.color}
                    />
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={closeDetail}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>
                  {selectedActivity?.subject || selectedRegion?.name}
                </Text>
                <Text style={styles.modalRegion}>
                  {selectedActivity?.region || (selectedRegion?.subject ? `Subject: ${selectedRegion.subject}` : 'Brain Region')}
                </Text>

                <View style={styles.modalStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {Math.round((selectedActivity?.activity || selectedRegion?.activity || 0) * 100)}%
                    </Text>
                    <Text style={styles.statLabel}>Activity Level</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {selectedActivity?.studyTime || selectedRegion?.studyTime || 0}m
                    </Text>
                    <Text style={styles.statLabel}>Study Time</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {selectedActivity?.lastActive || selectedRegion?.lastActive}
                    </Text>
                    <Text style={styles.statLabel}>Last Active</Text>
                  </View>
                </View>

                <Text style={styles.modalDescription}>
                  {selectedActivity?.description || selectedRegion?.description}
                </Text>

                <TouchableOpacity style={[styles.viewDetailsButton, { 
                  backgroundColor: selectedActivity?.color || selectedRegion?.color 
                }]}>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  brain3DContainer: {
    height: 300,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8F8F8',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modelToggle: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modelToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default BrainMappingScreen;
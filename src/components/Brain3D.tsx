import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Modal, ScrollView } from 'react-native';
// import { GLView } from 'expo-gl';
// import { Renderer, THREE } from 'expo-three';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface BrainRegion {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  activity: number; // 0-1 scale
  color: string;
  subject?: string;
  studyTime: number;
  lastActive: string;
  description: string;
}

interface Brain3DProps {
  regions: BrainRegion[];
  onRegionPress?: (region: BrainRegion) => void;
}

const Brain3D: React.FC<Brain3DProps> = ({ regions, onRegionPress }) => {
  const { theme } = useTheme();
  const [selectedRegion, setSelectedRegion] = useState<BrainRegion | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleRegionPress = (region: BrainRegion) => {
    setSelectedRegion(region);
    setShowModal(true);
    onRegionPress?.(region);
  };

  return (
    <View style={styles.container}>
      {/* Temporary fallback - 3D disabled for iOS build compatibility */}
      <View style={styles.fallbackContainer}>
        <View style={styles.brainIconContainer}>
          <Ionicons name="analytics-outline" size={80} color={theme.primary} />
        </View>
        <Text style={[styles.fallbackTitle, { color: theme.text }]}>
          3D Brain Mapping
        </Text>
        <Text style={[styles.fallbackDescription, { color: theme.textSecondary }]}>
          Interactive brain visualization coming soon in the next update
        </Text>
        
        {/* Region List as Alternative */}
        <ScrollView style={styles.regionsList} showsVerticalScrollIndicator={false}>
          {regions.map((region) => (
            <TouchableOpacity 
              key={region.id}
              style={[styles.regionCard, { backgroundColor: theme.surface }]}
              onPress={() => handleRegionPress(region)}
              activeOpacity={0.7}
            >
              <View style={[styles.regionIndicator, { backgroundColor: region.color }]} />
              <View style={styles.regionInfo}>
                <Text style={[styles.regionName, { color: theme.text }]}>
                  {region.name}
                </Text>
                <Text style={[styles.regionActivity, { color: theme.textSecondary }]}>
                  Activity: {Math.round(region.activity * 100)}%
                </Text>
              </View>
              <Text style={[styles.studyTime, { color: region.color }]}>
                {region.studyTime}m
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Region Detail Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {selectedRegion && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={[styles.regionIndicator, { backgroundColor: selectedRegion.color }]} />
                  <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={() => setShowModal(false)}
                  >
                    <Ionicons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedRegion.name}
                </Text>
                
                <Text style={[styles.modalDescription, { color: theme.text + '99' }]}>
                  {selectedRegion.description}
                </Text>

                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: selectedRegion.color }]}>
                      {Math.round(selectedRegion.activity * 100)}%
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text + '99' }]}>
                      Activity Level
                    </Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: selectedRegion.color }]}>
                      {selectedRegion.studyTime}m
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text + '99' }]}>
                      Study Time
                    </Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: selectedRegion.color }]}>
                      {selectedRegion.lastActive}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text + '99' }]}>
                      Last Active
                    </Text>
                  </View>
                </View>

                {selectedRegion.subject && (
                  <View style={[styles.subjectBadge, { backgroundColor: selectedRegion.color + '20' }]}>
                    <Text style={[styles.subjectText, { color: selectedRegion.color }]}>
                      {selectedRegion.subject}
                    </Text>
                  </View>
                )}
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
    position: 'relative',
  },
  glView: {
    flex: 1,
  },
  // Fallback styles
  fallbackContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
  },
  brainIconContainer: {
    marginTop: 40,
    marginBottom: 20,
    padding: 20,
    borderRadius: 50,
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
  },
  fallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  fallbackDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  regionsList: {
    flex: 1,
    width: '100%',
  },
  regionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  regionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  regionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  regionActivity: {
    fontSize: 14,
  },
  studyTime: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  regionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  subjectBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 12,
  },
  subjectText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Brain3D;
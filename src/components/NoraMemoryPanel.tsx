/**
 * Memory Panel -- shows what Nora has learned about the user.
 * Accessible from the side nav in the Nora chat screen.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface NoraMemoryPanelProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORY_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  academic: { icon: 'school-outline', color: '#7B61FF', label: 'Academic' },
  preference: { icon: 'heart-outline', color: '#FF6B6B', label: 'Preferences' },
  struggle: { icon: 'warning-outline', color: '#FFA726', label: 'Struggles' },
  goal: { icon: 'flag-outline', color: '#4ECDC4', label: 'Goals' },
  personal: { icon: 'person-outline', color: '#42A5F5', label: 'Personal' },
};

const NoraMemoryPanel: React.FC<NoraMemoryPanelProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const memories = useQuery(api.noraMemory.getMemories);
  const deleteMemory = useMutation(api.noraMemory.deleteMemory);
  const clearAllMemories = useMutation(api.noraMemory.clearAllMemories);

  const handleDeleteMemory = async (memoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await deleteMemory({ memoryId: memoryId as Id<"noraMemory"> });
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Memories",
      "This will remove everything Nora has learned about you. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAllMemories();
          },
        },
      ]
    );
  };

  // Group memories by category
  const grouped: Record<string, any[]> = {};
  for (const memory of memories ?? []) {
    const cat = memory.category || 'personal';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(memory);
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          entering={SlideInDown.duration(300)}
          style={[styles.panel, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>What Nora Knows</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {(memories ?? []).length} memories
              </Text>
            </View>
            <View style={styles.headerActions}>
              {(memories ?? []).length > 0 && (
                <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                  <Text style={{ color: '#FF6B6B', fontSize: 14, fontWeight: '500' }}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {Object.entries(grouped).length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="sparkles-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No memories yet</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  As you chat with Nora, she'll learn about your study habits, preferences, and goals.
                </Text>
              </View>
            ) : (
              Object.entries(grouped).map(([category, mems]) => {
                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.personal;
                return (
                  <View key={category} style={styles.categorySection}>
                    <View style={styles.categoryHeader}>
                      <View style={[styles.categoryIcon, { backgroundColor: config.color + '20' }]}>
                        <Ionicons name={config.icon} size={16} color={config.color} />
                      </View>
                      <Text style={[styles.categoryLabel, { color: theme.text }]}>{config.label}</Text>
                    </View>
                    {mems.map((memory: any) => (
                      <Animated.View
                        key={memory._id}
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(150)}
                        style={[styles.memoryCard, { backgroundColor: isDark ? '#222222' : '#F8F8F8' }]}
                      >
                        <View style={styles.memoryContent}>
                          <Text style={[styles.memoryKey, { color: theme.textSecondary }]}>
                            {memory.key.replace(/_/g, ' ')}
                          </Text>
                          <Text style={[styles.memoryValue, { color: theme.text }]}>{memory.value}</Text>
                          {/* Confidence bar */}
                          <View style={styles.confidenceBar}>
                            <View
                              style={[
                                styles.confidenceFill,
                                {
                                  width: `${(memory.confidence || 0.5) * 100}%`,
                                  backgroundColor: config.color,
                                },
                              ]}
                            />
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteMemory(memory._id)}
                          style={styles.deleteButton}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  panel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '40%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memoryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memoryContent: {
    flex: 1,
  },
  memoryKey: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  memoryValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  confidenceBar: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginTop: 8,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 1.5,
    opacity: 0.6,
  },
  deleteButton: {
    paddingLeft: 8,
    paddingTop: 2,
  },
});

export default NoraMemoryPanel;

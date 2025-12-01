import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface AIHelpModalProps {
  visible: boolean;
  onClose: () => void;
  aiType: 'nora' | 'patrick';
}

export default function AIHelpModal({ visible, onClose, aiType }: AIHelpModalProps) {
  const { user } = useAuth();

  const aiData = {
    nora: {
      name: 'Nora AI Assistant',
      icon: 'chatbubble-ellipses-outline',
      color: '#7B61FF',
      description: 'Your intelligent study companion powered by advanced AI technology.',
      capabilities: [
        'Answer questions about your study topics',
        'Help create study plans and schedules',
        'Provide explanations and clarifications',
        'Assist with research and learning strategies',
        'Give motivational support and study tips',
        'Analyze uploaded PDF documents',
        'Generate practice questions from materials'
      ],
      limitations: [
        'Can make mistakes - always verify important information',
        'Cannot browse the internet or access real-time data',
        'Should not be your only source for critical decisions',
        'Cannot complete assignments for you or help with cheating',
        'Knowledge has limitations and may not be current',
        'Cannot provide professional medical, legal, or financial advice'
      ],
      dataCollected: [
        'Your chat messages and questions',
        'Study session preferences and goals',
        'Uploaded document content (temporarily)',
        'Usage patterns and interaction frequency',
        'Study performance metrics (when shared)'
      ],
      policies: [
        'Conversations are regularly reviewed for safety and quality',
        'Never share personal information like passwords or SSN',
        'Flagged conversations may be reviewed by our team',
        'We use conversations to improve our AI systems',
        'Our AI policies and capabilities may change over time'
      ]
    },
    patrick: {
      name: 'Patrick Speech Assistant',
      icon: 'microphone-outline',
      color: '#4CAF50',
      description: 'Voice-powered study assistant for hands-free learning support.',
      capabilities: [
        'Voice-to-text conversion for note taking',
        'Spoken study reminders and encouragement',
        'Audio-based quiz questions and feedback',
        'Voice-controlled timer functions',
        'Accessibility support for vision-impaired users',
        'Pronunciation practice for language learning'
      ],
      limitations: [
        'Requires microphone permissions to function',
        'May not work well in noisy environments',
        'Speech recognition accuracy varies by accent',
        'Cannot process complex audio content',
        'Limited to pre-programmed voice responses',
        'May not understand informal speech patterns'
      ],
      dataCollected: [
        'Voice recordings (processed locally when possible)',
        'Speech-to-text conversion results',
        'Voice command usage patterns',
        'Audio quality and clarity metrics',
        'Language and accent preferences'
      ],
      policies: [
        'Voice data is processed with privacy protection',
        'Audio recordings are not permanently stored',
        'Speech processing happens locally when possible',
        'Voice patterns are anonymized for improvements',
        'Users can disable voice features at any time'
      ]
    }
  };

  const currentAI = aiData[aiType];

  const handleContactSupport = () => {
    Alert.alert(
      'Contact AI Support',
      `Having issues with ${currentAI.name}? We're here to help!`,
      [
        {
          text: 'Report AI Issue',
          onPress: () => Alert.alert(
            'Report AI Issue',
            `To report an issue with ${currentAI.name}:\n\n` +
            '• Describe what happened\n' +
            '• Include the exact question/command\n' +
            '• Note the unexpected behavior\n' +
            '• Provide screenshots if helpful\n\n' +
            'Send to: ai-support@thetriage.app'
          )
        },
        {
          text: 'Request Feature',
          onPress: () => Alert.alert(
            'Request AI Feature',
            `Have an idea to improve ${currentAI.name}?\n\n` +
            'Tell us:\n' +
            '• What feature you\'d like\n' +
            '• How it would help your studies\n' +
            '• Examples of how it should work\n\n' +
            'Send to: ai-features@thetriage.app'
          )
        },
        {
          text: 'Privacy Concerns',
          onPress: () => Alert.alert(
            'Privacy & Data Concerns',
            'For questions about data collection, privacy, or to request data deletion:\n\n' +
            'Email: privacy@thetriage.app\n\n' +
            'Include your user ID for faster processing:\n' +
            user?.id || 'Not available'
          )
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <View style={[styles.iconContainer, { backgroundColor: currentAI.color + '20' }]}>
                <Ionicons name={currentAI.icon as any} size={24} color={currentAI.color} />
              </View>
              <Text style={styles.title}>{currentAI.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>{currentAI.description}</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ What I Can Do</Text>
              {currentAI.capabilities.map((capability, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.bullet}>
                    <Ionicons name="checkmark" size={16} color={currentAI.color} />
                  </View>
                  <Text style={styles.listText}>{capability}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚠️ Important Limitations</Text>
              {currentAI.limitations.map((limitation, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.bullet}>
                    <Ionicons name="alert-circle" size={16} color="#FF9800" />
                  </View>
                  <Text style={styles.listText}>{limitation}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Data We Collect</Text>
              {currentAI.dataCollected.map((data, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.bullet}>
                    <Ionicons name="information-circle" size={16} color="#2196F3" />
                  </View>
                  <Text style={styles.listText}>{data}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔒 Privacy & Safety</Text>
              {currentAI.policies.map((policy, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.bullet}>
                    <Ionicons name="shield-checkmark" size={16} color="#9C27B0" />
                  </View>
                  <Text style={styles.listText}>{policy}</Text>
                </View>
              ))}
            </View>

            <View style={styles.supportSection}>
              <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
                <MaterialCommunityIcons name="help-circle-outline" size={24} color="#FFF" />
                <Text style={styles.supportButtonText}>Need Help or Have Concerns?</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  supportSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  supportButton: {
    backgroundColor: '#7B61FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  supportButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
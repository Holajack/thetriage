import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal,
  Switch,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const AIIntegrationScreen = () => {
  const { theme, fontSize } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [showNoraModal, setShowNoraModal] = useState(false);
  const [showPatrickModal, setShowPatrickModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  
  // AI Settings State
  const [noraEnabled, setNoraEnabled] = useState(true);
  const [patrickEnabled, setPatrickEnabled] = useState(true);
  const [insightsEnabled, setInsightsEnabled] = useState(true);
  const [personalizedResponses, setPersonalizedResponses] = useState(true);
  const [contextualSuggestions, setContextualSuggestions] = useState(true);

  const handleAIToggle = async (aiType: string, value: boolean) => {
    try {
      // TODO: Save AI preference to Convex using api.settings.update
      // For now, just update local state

      // Update local state
      if (aiType === 'nora') setNoraEnabled(value);
      if (aiType === 'patrick') setPatrickEnabled(value);
      if (aiType === 'insights') setInsightsEnabled(value);

      Alert.alert('Success', `${aiType} AI ${value ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error updating AI setting:', error);
      Alert.alert('Error', 'Failed to update AI setting. Please try again.');
    }
  };

  const handlePersonalizationToggle = async (settingType: string, value: boolean) => {
    try {
      // TODO: Save personalization settings to Convex using api.settings.update
      // For now, just update local state

      if (settingType === 'personalized_responses') setPersonalizedResponses(value);
      if (settingType === 'contextual_suggestions') setContextualSuggestions(value);

      Alert.alert('Success', 'Setting updated successfully');
    } catch (error) {
      console.error('Error updating personalization setting:', error);
      Alert.alert('Error', 'Failed to update setting. Please try again.');
    }
  };

  const NoraModal = () => (
    <Modal visible={showNoraModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontSize: fontSize * 1.5, color: theme.primary }]}>
              Nora AI Assistant
            </Text>
            <TouchableOpacity 
              onPress={() => setShowNoraModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close-outline" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={[styles.description, { fontSize: fontSize, color: theme.text }]}>
            Nora is your intelligent study companion designed to help you achieve academic excellence. 
            She provides personalized study assistance, answers questions, and helps you develop effective learning strategies.
          </Text>

          {/* Features */}
          <Text style={[styles.sectionTitle, { fontSize: fontSize * 1.2, color: theme.primary }]}>Features</Text>
          
          <View style={[styles.featureItem, { borderLeftColor: theme.primary }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.featureTitle, { fontSize: fontSize * 1.1, color: theme.text }]}>Intelligent Chat</Text>
              <Text style={[styles.featureDesc, { fontSize: fontSize * 0.9, color: theme.textSecondary }]}>
                Natural conversation interface for asking study-related questions and getting detailed explanations
              </Text>
            </View>
          </View>

          <View style={[styles.featureItem, { borderLeftColor: theme.primary }]}>
            <Ionicons name="document-text-outline" size={20} color={theme.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.featureTitle, { fontSize: fontSize * 1.1, color: theme.text }]}>PDF Analysis</Text>
              <Text style={[styles.featureDesc, { fontSize: fontSize * 0.9, color: theme.textSecondary }]}>
                Upload study materials and get summaries, question generation, and content analysis
              </Text>
            </View>
          </View>

          <View style={[styles.featureItem, { borderLeftColor: theme.primary }]}>
            <Ionicons name="bulb-outline" size={20} color={theme.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.featureTitle, { fontSize: fontSize * 1.1, color: theme.text }]}>Study Strategies</Text>
              <Text style={[styles.featureDesc, { fontSize: fontSize * 0.9, color: theme.textSecondary }]}>
                Personalized learning techniques based on your study patterns and preferences
              </Text>
            </View>
          </View>

          {/* Settings */}
          <Text style={[styles.sectionTitle, { fontSize: fontSize * 1.2, color: theme.primary }]}>Settings</Text>
          
          <View style={[styles.settingItem, { backgroundColor: theme.card }]}>
            <Text style={[styles.settingLabel, { fontSize: fontSize, color: theme.text }]}>Enable Nora AI</Text>
            <Switch
              value={noraEnabled}
              onValueChange={(value) => handleAIToggle('nora', value)}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={noraEnabled ? '#FFFFFF' : theme.textSecondary}
            />
          </View>

          <View style={[styles.settingItem, { backgroundColor: theme.card }]}>
            <Text style={[styles.settingLabel, { fontSize: fontSize, color: theme.text }]}>Personalized Responses</Text>
            <Switch
              value={personalizedResponses}
              onValueChange={(value) => handlePersonalizationToggle('personalized_responses', value)}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={personalizedResponses ? '#FFFFFF' : theme.textSecondary}
            />
          </View>

          {/* Acknowledgements */}
          <Text style={[styles.sectionTitle, { fontSize: fontSize * 1.2, color: theme.primary }]}>Data & Privacy</Text>
          
          <View style={[styles.acknowledgement, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <Text style={[styles.ackText, { fontSize: fontSize * 0.9, color: theme.text }]}>
              • Nora processes your study data to provide personalized assistance{'\n'}
              • Chat conversations are stored to improve response quality{'\n'}  
              • PDF content is analyzed securely and not shared with third parties{'\n'}
              • You can disable data collection in Privacy Settings{'\n'}
              • All data processing complies with privacy regulations
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const PatrickModal = () => (
    <Modal visible={showPatrickModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontSize: fontSize * 1.5, color: theme.primary }]}>
              Patrick Speech Assistant
            </Text>
            <TouchableOpacity 
              onPress={() => setShowPatrickModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close-outline" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.description, { fontSize: fontSize, color: theme.text }]}>
            Patrick is your voice-activated study companion that provides audio feedback, 
            motivational support, and hands-free interaction during your focus sessions.
          </Text>

          <Text style={[styles.sectionTitle, { fontSize: fontSize * 1.2, color: theme.primary }]}>Features</Text>
          
          <View style={[styles.featureItem, { borderLeftColor: theme.primary }]}>
            <Ionicons name="mic-outline" size={20} color={theme.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.featureTitle, { fontSize: fontSize * 1.1, color: theme.text }]}>Voice Commands</Text>
              <Text style={[styles.featureDesc, { fontSize: fontSize * 0.9, color: theme.textSecondary }]}>
                Start timers, get progress updates, and control app functions using voice
              </Text>
            </View>
          </View>

          <View style={[styles.featureItem, { borderLeftColor: theme.primary }]}>
            <Ionicons name="volume-high-outline" size={20} color={theme.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.featureTitle, { fontSize: fontSize * 1.1, color: theme.text }]}>Audio Feedback</Text>
              <Text style={[styles.featureDesc, { fontSize: fontSize * 0.9, color: theme.textSecondary }]}>
                Spoken notifications, session summaries, and motivational messages
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { fontSize: fontSize * 1.2, color: theme.primary }]}>Settings</Text>
          
          <View style={[styles.settingItem, { backgroundColor: theme.card }]}>
            <Text style={[styles.settingLabel, { fontSize: fontSize, color: theme.text }]}>Enable Patrick</Text>
            <Switch
              value={patrickEnabled}
              onValueChange={(value) => handleAIToggle('patrick', value)}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={patrickEnabled ? '#FFFFFF' : theme.textSecondary}
            />
          </View>

          <Text style={[styles.sectionTitle, { fontSize: fontSize * 1.2, color: theme.primary }]}>Data & Privacy</Text>
          
          <View style={[styles.acknowledgement, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <Text style={[styles.ackText, { fontSize: fontSize * 0.9, color: theme.text }]}>
              • Voice commands are processed locally when possible{'\n'}
              • Audio data may be sent to speech recognition services{'\n'}
              • No voice recordings are permanently stored{'\n'}
              • You can disable voice features at any time
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const InsightsModal = () => (
    <Modal visible={showInsightsModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontSize: fontSize * 1.5, color: theme.primary }]}>
              AI Insights
            </Text>
            <TouchableOpacity 
              onPress={() => setShowInsightsModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close-outline" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.description, { fontSize: fontSize, color: theme.text }]}>
            AI Insights analyzes your study patterns, performance trends, and learning behaviors to provide 
            personalized recommendations for improving your academic performance.
          </Text>

          <Text style={[styles.sectionTitle, { fontSize: fontSize * 1.2, color: theme.primary }]}>Features</Text>
          
          <View style={[styles.featureItem, { borderLeftColor: theme.primary }]}>
            <Ionicons name="analytics-outline" size={20} color={theme.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.featureTitle, { fontSize: fontSize * 1.1, color: theme.text }]}>Performance Analytics</Text>
              <Text style={[styles.featureDesc, { fontSize: fontSize * 0.9, color: theme.textSecondary }]}>
                Track focus patterns, productivity trends, and learning efficiency metrics
              </Text>
            </View>
          </View>

          <View style={[styles.featureItem, { borderLeftColor: theme.primary }]}>
            <Ionicons name="bulb-outline" size={20} color={theme.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.featureTitle, { fontSize: fontSize * 1.1, color: theme.text }]}>Smart Recommendations</Text>
              <Text style={[styles.featureDesc, { fontSize: fontSize * 0.9, color: theme.textSecondary }]}>
                AI-powered suggestions for optimal study times, break intervals, and focus techniques
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { fontSize: fontSize * 1.2, color: theme.primary }]}>Settings</Text>
          
          <View style={[styles.settingItem, { backgroundColor: theme.card }]}>
            <Text style={[styles.settingLabel, { fontSize: fontSize, color: theme.text }]}>Enable AI Insights</Text>
            <Switch
              value={insightsEnabled}
              onValueChange={(value) => handleAIToggle('insights', value)}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={insightsEnabled ? '#FFFFFF' : theme.textSecondary}
            />
          </View>

          <Text style={[styles.sectionTitle, { fontSize: fontSize * 1.2, color: theme.primary }]}>Data & Privacy</Text>
          
          <View style={[styles.acknowledgement, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <Text style={[styles.ackText, { fontSize: fontSize * 0.9, color: theme.text }]}>
              • Study session data is analyzed to generate insights{'\n'}
              • All analysis is performed with anonymized data{'\n'}
              • Individual performance metrics are kept private{'\n'}
              • Aggregate data may be used to improve AI algorithms{'\n'}
              • You can opt-out of data analysis at any time
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card }]}>
          <TouchableOpacity onPress={() => navigation.navigate('Settings' as never)} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: fontSize * 1.3, color: theme.text }]}>AI Integration</Text>
        </View>

        <Text style={[styles.sectionHeader, { fontSize: fontSize * 0.9, color: theme.primary }]}>
          ARTIFICIAL INTELLIGENCE
        </Text>

        {/* AI Cards */}
        <View style={[styles.cardSection, { backgroundColor: theme.card }]}>
          <TouchableOpacity 
            style={styles.aiCard} 
            onPress={() => setShowNoraModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={theme.primary} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.aiTitle, { fontSize: fontSize * 1.1, color: theme.text }]}>Nora AI Assistant</Text>
              <Text style={[styles.aiSubtitle, { fontSize: fontSize * 0.9, color: theme.textSecondary }]}>
                Intelligent study companion with chat, PDF analysis, and personalized guidance
              </Text>
              <Text style={[styles.aiStatus, { 
                fontSize: fontSize * 0.8, 
                color: noraEnabled ? theme.primary : theme.textSecondary 
              }]}>
                {noraEnabled ? '● Active' : '○ Disabled'}
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.aiCard} 
            onPress={() => setShowPatrickModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="mic-outline" size={28} color={theme.primary} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.aiTitle, { fontSize: fontSize * 1.1, color: theme.text }]}>Patrick Speech Assistant</Text>
              <Text style={[styles.aiSubtitle, { fontSize: fontSize * 0.9, color: theme.textSecondary }]}>
                Voice-activated companion for hands-free study session control
              </Text>
              <Text style={[styles.aiStatus, { 
                fontSize: fontSize * 0.8, 
                color: patrickEnabled ? theme.primary : theme.textSecondary 
              }]}>
                {patrickEnabled ? '● Active' : '○ Disabled'}
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.aiCard} 
            onPress={() => setShowInsightsModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="bulb-outline" size={28} color={theme.primary} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.aiTitle, { fontSize: fontSize * 1.1, color: theme.text }]}>AI Insights</Text>
              <Text style={[styles.aiSubtitle, { fontSize: fontSize * 0.9, color: theme.textSecondary }]}>
                Performance analytics and personalized study recommendations
              </Text>
              <Text style={[styles.aiStatus, { 
                fontSize: fontSize * 0.8, 
                color: insightsEnabled ? theme.primary : theme.textSecondary 
              }]}>
                {insightsEnabled ? '● Active' : '○ Disabled'}
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Global AI Settings */}
        <Text style={[styles.sectionHeader, { fontSize: fontSize * 0.9, color: theme.primary }]}>
          GLOBAL SETTINGS
        </Text>
        
        <View style={[styles.cardSection, { backgroundColor: theme.card }]}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { fontSize: fontSize, color: theme.text }]}>Contextual Suggestions</Text>
            <Switch
              value={contextualSuggestions}
              onValueChange={(value) => handlePersonalizationToggle('contextual_suggestions', value)}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={contextualSuggestions ? '#FFFFFF' : theme.textSecondary}
            />
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <NoraModal />
      <PatrickModal />
      <InsightsModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  sectionHeader: {
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 20,
    letterSpacing: 1,
  },
  cardSection: {
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  aiTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aiSubtitle: {
    marginBottom: 4,
    lineHeight: 20,
  },
  aiStatus: {
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingLabel: {
    fontWeight: '500',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 8,
  },
  modalTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  description: {
    lineHeight: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
  },
  featureTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featureDesc: {
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  acknowledgement: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  ackText: {
    lineHeight: 22,
  },
});

export default AIIntegrationScreen;
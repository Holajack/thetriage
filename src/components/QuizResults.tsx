import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { QuizResult, STUDY_HABITS_RESULTS, LEARNING_STYLE_RESULTS } from '../data/quizData';

interface QuizResultsProps {
  result: QuizResult;
  onRetake: () => void;
  onClose: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ result, onRetake, onClose }) => {
  const { theme } = useTheme();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const getCategoryInfo = () => {
    const categories = result.quizId === 'study_habits' ? STUDY_HABITS_RESULTS.categories : LEARNING_STYLE_RESULTS.categories;
    return categories[result.category as keyof typeof categories];
  };

  const categoryInfo = getCategoryInfo();
  const scoreColor = getScoreColor(result.score);
  const scoreLabel = getScoreLabel(result.score);

  const getIconForCategory = (category: string, quizType: string) => {
    if (quizType === 'study_habits') {
      const icons = {
        time_management: 'clock-outline',
        environment: 'home-outline',
        information_processing: 'brain-outline',
        motivation: 'heart-outline',
        technology: 'laptop-outline',
        learning_strategies: 'lightbulb-outline',
        self_assessment: 'eye-outline'
      };
      return icons[category as keyof typeof icons] || 'help-circle-outline';
    } else {
      const icons = {
        visual: 'eye-outline',
        auditory: 'volume-high-outline',
        kinesthetic: 'hand-left-outline',
        reading_writing: 'pencil-outline',
        social: 'people-outline'
      };
      return icons[category as keyof typeof icons] || 'help-circle-outline';
    }
  };

  const showRecommendationDetail = (recommendation: string) => {
    setSelectedRecommendation(recommendation);
    setShowDetailModal(true);
  };

  const getDetailedRecommendation = (recommendation: string) => {
    // This could be expanded to provide more detailed explanations
    const details = {
      "Use time-blocking techniques to schedule specific study periods": 
        "Time-blocking involves scheduling specific time slots for different activities. For studying, this means setting aside dedicated blocks of time for each subject or task. This helps reduce decision fatigue and ensures you allocate enough time to each area.",
      
      "Try the Balanced Technique: 25 minutes focused study + 5 minute breaks":
        "The Balanced Technique is a time management method that breaks work into intervals (traditionally 25 minutes) separated by short breaks. This helps maintain focus and prevents mental fatigue. After 4 balanced sessions, take a longer 15-30 minute break.",
        
      "Use mind maps, charts, and diagrams to organize information":
        "Visual learners process information better when it's presented graphically. Mind maps help you see connections between concepts, while charts and diagrams can simplify complex information. Try using colors and symbols to make your visual aids even more effective.",
        
      "Read your notes aloud when reviewing":
        "Auditory learners benefit from hearing information. Reading aloud engages your auditory processing and can help with retention. You can also record yourself reading key concepts and listen back during commutes or while exercising.",
        
      "Take frequent movement breaks during study sessions":
        "Kinesthetic learners need physical activity to optimize learning. Every 20-30 minutes, stand up, stretch, or take a short walk. You can also try studying while standing, using a standing desk, or incorporating fidget tools."
    };
    
    return details[recommendation as keyof typeof details] || "This recommendation can help improve your study effectiveness. Consider implementing it gradually into your routine.";
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-outline" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Quiz Results</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: theme.card }]}>
          <View style={styles.scoreHeader}>
            <Ionicons
              name={getIconForCategory(result.category, result.quizId) as any}
              size={48}
              color={scoreColor}
            />
            <View style={styles.scoreInfo}>
              <Text style={[styles.scoreValue, { color: scoreColor }]}>
                {result.score}%
              </Text>
              <Text style={[styles.scoreLabel, { color: scoreColor }]}>
                {scoreLabel}
              </Text>
            </View>
          </View>
          
          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryName, { color: theme.text }]}>
              {categoryInfo?.name}
            </Text>
            <Text style={[styles.categoryDescription, { color: theme.text + '99' }]}>
              {categoryInfo?.description}
            </Text>
          </View>
        </View>

        {/* Results Description */}
        <View style={[styles.descriptionCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.descriptionTitle, { color: theme.text }]}>
            What This Means
          </Text>
          <Text style={[styles.descriptionText, { color: theme.text }]}>
            {result.description}
          </Text>
        </View>

        {/* Recommendations */}
        <View style={[styles.recommendationsCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.recommendationsTitle, { color: theme.text }]}>
            Personalized Recommendations
          </Text>
          <Text style={[styles.recommendationsSubtitle, { color: theme.text + '99' }]}>
            Based on your results, here are specific strategies to improve your {result.quizId === 'study_habits' ? 'study habits' : 'learning approach'}:
          </Text>
          
          {result.recommendations.map((recommendation, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.recommendationItem, { borderColor: theme.primary + '20' }]}
              onPress={() => showRecommendationDetail(recommendation)}
              activeOpacity={0.7}
            >
              <View style={styles.recommendationContent}>
                <View style={[styles.recommendationNumber, { backgroundColor: theme.primary }]}>
                  <Text style={styles.recommendationNumberText}>{index + 1}</Text>
                </View>
                <Text style={[styles.recommendationText, { color: theme.text }]}>
                  {recommendation}
                </Text>
                <Ionicons name="chevron-forward-outline" size={20} color={theme.text + '66'} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.retakeButton, { borderColor: theme.primary }]}
            onPress={onRetake}
          >
            <Ionicons name="refresh-outline" size={20} color={theme.primary} />
            <Text style={[styles.retakeButtonText, { color: theme.primary }]}>
              Retake Quiz
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton, { backgroundColor: theme.primary }]}
            onPress={onClose}
          >
            <Ionicons name="checkmark-outline" size={20} color="#FFF" />
            <Text style={styles.saveButtonText}>
              Save Results
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quiz Info */}
        <View style={[styles.quizInfo, { backgroundColor: theme.card }]}>
          <Text style={[styles.quizInfoTitle, { color: theme.text }]}>
            Quiz Details
          </Text>
          <View style={styles.quizInfoRow}>
            <Text style={[styles.quizInfoLabel, { color: theme.text + '99' }]}>
              Completed:
            </Text>
            <Text style={[styles.quizInfoValue, { color: theme.text }]}>
              {result.completedAt.toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.quizInfoRow}>
            <Text style={[styles.quizInfoLabel, { color: theme.text + '99' }]}>
              Questions:
            </Text>
            <Text style={[styles.quizInfoValue, { color: theme.text }]}>
              15 randomly selected
            </Text>
          </View>
          <View style={styles.quizInfoRow}>
            <Text style={[styles.quizInfoLabel, { color: theme.text + '99' }]}>
              Type:
            </Text>
            <Text style={[styles.quizInfoValue, { color: theme.text }]}>
              {result.quizId === 'study_habits' ? 'Study Habits Assessment' : 'Learning Style Assessment'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Recommendation Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Recommendation Details
              </Text>
              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close-outline" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            {selectedRecommendation && (
              <>
                <Text style={[styles.modalRecommendation, { color: theme.primary }]}>
                  {selectedRecommendation}
                </Text>
                <Text style={[styles.modalDescription, { color: theme.text }]}>
                  {getDetailedRecommendation(selectedRecommendation)}
                </Text>
              </>
            )}
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.modalButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scoreCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreInfo: {
    marginLeft: 16,
    flex: 1,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryInfo: {
    marginTop: 8,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  descriptionCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 22,
  },
  recommendationsCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recommendationsSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  recommendationItem: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  recommendationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  recommendationNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendationNumberText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  retakeButton: {
    borderWidth: 2,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    // backgroundColor set dynamically
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  quizInfo: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  quizInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  quizInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quizInfoLabel: {
    fontSize: 14,
  },
  quizInfoValue: {
    fontSize: 14,
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
    borderRadius: 20,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalRecommendation: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    lineHeight: 22,
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default QuizResults;

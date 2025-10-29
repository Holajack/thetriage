import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import InteractiveQuiz from '../../components/InteractiveQuiz';
import QuizResults from '../../components/QuizResults';
import { QuizResult } from '../../data/quizData';
import { getQuizCompletionStatus } from '../../utils/quizStorage';
import { useAuth } from '../../context/AuthContext';

interface Quiz {
  id: string;
  name: string;
  description: string;
  detail: string;
  progress: number;
  icon: string;
  color: string;
  estimatedTime: string;
  questions: number;
}

const QUIZ_DATA: Quiz[] = [
  {
    id: '1',
    name: 'Study Habits Quiz',
    description: 'Assess your current study methods',
    detail: 'This comprehensive quiz will help you identify your best and worst study habits, providing personalized recommendations to improve your learning efficiency and academic performance.',
    progress: 0.7,
    icon: 'book-open-page-variant',
    color: '#2196F3',
    estimatedTime: '5-7 min',
    questions: 15,
  },
  {
    id: '2',
    name: 'Focus Type Quiz',
    description: 'Identify your optimal focus style',
    detail: 'Discover your unique focus patterns and learn what environmental factors, techniques, and strategies help you concentrate best during study sessions.',
    progress: 0.3,
    icon: 'target',
    color: '#F44336',
    estimatedTime: '4-6 min',
    questions: 12,
  },
  {
    id: '3',
    name: 'Motivation Profile',
    description: 'Understand what drives you',
    detail: 'Uncover your main sources of motivation and learn how to leverage them effectively to maintain consistent study habits and achieve your academic goals.',
    progress: 1.0,
    icon: 'heart',
    color: '#FF9800',
    estimatedTime: '6-8 min',
    questions: 18,
  },
  {
    id: '4',
    name: 'Learning Style Quiz',
    description: 'Discover how you learn best',
    detail: 'Determine whether you\'re a visual, auditory, or kinesthetic learner, and get tailored study strategies that match your preferred learning style.',
    progress: 0.5,
    icon: 'brain',
    color: '#4CAF50',
    estimatedTime: '5-7 min',
    questions: 14,
  },
];

const SelfDiscoveryQuizScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [quizData, setQuizData] = useState(QUIZ_DATA);
  const [isLoading, setIsLoading] = useState(true);

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: 'Self-Discovery Quizzes',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Bonuses' as never)}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
      headerRight: () => null, // Remove hamburger menu
    });
  }, [navigation, theme]);

  // Load quiz progress
  useEffect(() => {
    loadQuizProgress();
  }, [user]);

  const loadQuizProgress = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const updatedQuizData = await Promise.all(
        QUIZ_DATA.map(async (quiz) => {
          const quizTypeMap: { [key: string]: string } = {
            '1': 'study_habits',
            '4': 'learning_style'
          };
          
          const quizType = quizTypeMap[quiz.id];
          if (quizType) {
            const completionStatus = await getQuizCompletionStatus(user.id, quizType);
            return {
              ...quiz,
              progress: completionStatus.completed ? 1.0 : 0.0
            };
          }
          
          return quiz;
        })
      );

      setQuizData(updatedQuizData);
    } catch (error) {
      console.error('Error loading quiz progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openQuizDetail = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setModalVisible(true);
  };

  const closeDetail = () => {
    setModalVisible(false);
    setSelectedQuiz(null);
  };

  const startQuiz = () => {
    closeDetail();
    setShowQuiz(true);
  };

  const handleQuizComplete = (result: QuizResult) => {
    setQuizResult(result);
    setShowQuiz(false);
    setShowResults(true);
  };

  const handleCloseQuiz = () => {
    setShowQuiz(false);
    setSelectedQuiz(null);
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setQuizResult(null);
    setSelectedQuiz(null);
    // Refresh quiz progress to show completion
    loadQuizProgress();
  };

  const handleRetakeQuiz = () => {
    setShowResults(false);
    setQuizResult(null);
    setShowQuiz(true);
  };

  const getQuizType = (quizId: string): 'study_habits' | 'learning_style' | 'motivation_profile' | 'focus_type' => {
    if (quizId === '1') return 'study_habits';
    if (quizId === '2') return 'focus_type';
    if (quizId === '3') return 'motivation_profile';
    if (quizId === '4') return 'learning_style';
    return 'study_habits'; // Default fallback
  };

  const getProgressColor = (progress: number) => {
    if (progress === 1.0) return '#4CAF50';
    if (progress > 0.5) return '#FF9800';
    return '#2196F3';
  };

  const renderQuizCard = ({ item }: { item: Quiz }) => (
    <TouchableOpacity 
      style={styles.quizCard}
      onPress={() => openQuizDetail(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
        <MaterialCommunityIcons 
          name={item.icon as any} 
          size={32} 
          color={item.color} 
        />
      </View>
      
      <View style={styles.quizContent}>
        <View style={styles.quizHeader}>
          <Text style={styles.quizTitle}>{item.name}</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
        
        <Text style={styles.quizDescription}>{item.description}</Text>
        
        <View style={styles.quizMeta}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{item.estimatedTime}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="help-circle-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{item.questions} questions</Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={[styles.progressValue, { color: getProgressColor(item.progress) }]}>
              {Math.round(item.progress * 100)}%
            </Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${item.progress * 100}%`,
                  backgroundColor: getProgressColor(item.progress)
                }
              ]} 
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Show quiz interface if quiz is active
  if (showQuiz && selectedQuiz) {
    return (
      <InteractiveQuiz
        quizType={getQuizType(selectedQuiz.id)}
        onComplete={handleQuizComplete}
        onClose={handleCloseQuiz}
      />
    );
  }

  // Show results if quiz is completed
  if (showResults && quizResult) {
    return (
      <QuizResults
        result={quizResult}
        onRetake={handleRetakeQuiz}
        onClose={handleCloseResults}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerContent}>
        <Text style={styles.subtitle}>
          Discover your unique learning style, study habits, and motivation patterns through our comprehensive self-assessment quizzes.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Available Quizzes</Text>

      <FlatList
        data={quizData}
        renderItem={renderQuizCard}
        keyExtractor={(item) => item.id}
        style={styles.quizList}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={loadQuizProgress}
      />

      {/* Quiz Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDetail}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedQuiz && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIcon, { backgroundColor: `${selectedQuiz.color}15` }]}>
                    <MaterialCommunityIcons 
                      name={selectedQuiz.icon as any} 
                      size={40} 
                      color={selectedQuiz.color} 
                    />
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={closeDetail}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>{selectedQuiz.name}</Text>
                <Text style={styles.modalDescription}>{selectedQuiz.detail}</Text>

                <View style={styles.modalMeta}>
                  <View style={styles.modalMetaItem}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color="#666" />
                    <Text style={styles.modalMetaText}>{selectedQuiz.estimatedTime}</Text>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <MaterialCommunityIcons name="help-circle-outline" size={20} color="#666" />
                    <Text style={styles.modalMetaText}>{selectedQuiz.questions} questions</Text>
                  </View>
                </View>

                <View style={styles.modalProgress}>
                  <Text style={styles.modalProgressLabel}>
                    Current Progress: {Math.round(selectedQuiz.progress * 100)}%
                  </Text>
                  <View style={styles.modalProgressBar}>
                    <View 
                      style={[
                        styles.modalProgressFill, 
                        { 
                          width: `${selectedQuiz.progress * 100}%`,
                          backgroundColor: getProgressColor(selectedQuiz.progress)
                        }
                      ]} 
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.startButton}
                  onPress={startQuiz}
                >
                  <Text style={styles.startButtonText}>
                    {selectedQuiz.progress === 1.0 ? 'Retake Quiz' :
                     selectedQuiz.progress > 0 ? 'Continue Quiz' : 'Start Quiz'}
                  </Text>
                </TouchableOpacity>
              </>
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
  headerContent: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  quizList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  quizCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  quizContent: {
    flex: 1,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    flex: 1,
  },
  quizDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  quizMeta: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  modalMetaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  modalProgress: {
    marginBottom: 32,
  },
  modalProgressLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalProgressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  startButton: {
    backgroundColor: '#1B5E20',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});

export default SelfDiscoveryQuizScreen; 
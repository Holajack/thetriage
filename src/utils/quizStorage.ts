import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { QuizResult } from '../data/quizData';

interface StoredQuizResult extends QuizResult {
  userId: string;
  id: string;
}

interface QuizProgress {
  userId: string;
  quizId: string;
  completedCount: number;
  lastCompleted?: Date;
  results: StoredQuizResult[];
}

const QUIZ_RESULTS_KEY = 'quiz_results';
const QUIZ_PROGRESS_KEY = 'quiz_progress';

// Local storage functions
export const saveQuizResultLocally = async (result: QuizResult, userId: string): Promise<void> => {
  try {
    const storedResult: StoredQuizResult = {
      ...result,
      userId,
      id: `${userId}_${result.quizId}_${Date.now()}`
    };

    // Get existing results
    const existingResults = await getLocalQuizResults(userId);
    const updatedResults = [...existingResults, storedResult];

    // Save updated results
    await AsyncStorage.setItem(
      `${QUIZ_RESULTS_KEY}_${userId}`,
      JSON.stringify(updatedResults)
    );

    // Update progress
    await updateQuizProgress(result.quizId, userId);
    
    console.log('Quiz result saved locally:', storedResult.id);
  } catch (error) {
    console.error('Error saving quiz result locally:', error);
    throw error;
  }
};

export const getLocalQuizResults = async (userId: string): Promise<StoredQuizResult[]> => {
  try {
    const results = await AsyncStorage.getItem(`${QUIZ_RESULTS_KEY}_${userId}`);
    return results ? JSON.parse(results) : [];
  } catch (error) {
    console.error('Error getting local quiz results:', error);
    return [];
  }
};

export const getQuizResultsByType = async (userId: string, quizType: string): Promise<StoredQuizResult[]> => {
  try {
    const allResults = await getLocalQuizResults(userId);
    return allResults.filter(result => result.quizId === quizType);
  } catch (error) {
    console.error('Error getting quiz results by type:', error);
    return [];
  }
};

export const updateQuizProgress = async (quizId: string, userId: string): Promise<void> => {
  try {
    const progressKey = `${QUIZ_PROGRESS_KEY}_${userId}`;
    const existingProgress = await AsyncStorage.getItem(progressKey);
    const progressData: { [key: string]: QuizProgress } = existingProgress ? JSON.parse(existingProgress) : {};

    if (!progressData[quizId]) {
      progressData[quizId] = {
        userId,
        quizId,
        completedCount: 0,
        results: []
      };
    }

    progressData[quizId].completedCount += 1;
    progressData[quizId].lastCompleted = new Date();

    await AsyncStorage.setItem(progressKey, JSON.stringify(progressData));
  } catch (error) {
    console.error('Error updating quiz progress:', error);
  }
};

export const getQuizProgress = async (userId: string): Promise<{ [key: string]: QuizProgress }> => {
  try {
    const progressKey = `${QUIZ_PROGRESS_KEY}_${userId}`;
    const progress = await AsyncStorage.getItem(progressKey);
    return progress ? JSON.parse(progress) : {};
  } catch (error) {
    console.error('Error getting quiz progress:', error);
    return {};
  }
};

export const getQuizCompletionStatus = async (userId: string, quizId: string): Promise<{ completed: boolean, count: number, lastCompleted?: Date }> => {
  try {
    const progress = await getQuizProgress(userId);
    const quizProgress = progress[quizId];
    
    return {
      completed: quizProgress ? quizProgress.completedCount > 0 : false,
      count: quizProgress ? quizProgress.completedCount : 0,
      lastCompleted: quizProgress?.lastCompleted
    };
  } catch (error) {
    console.error('Error getting quiz completion status:', error);
    return { completed: false, count: 0 };
  }
};

// Database functions (for syncing with Supabase)
export const saveQuizResultToDatabase = async (result: QuizResult, userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('quiz_results')
      .insert({
        user_id: userId,
        quiz_id: result.quizId,
        score: result.score,
        category: result.category,
        description: result.description,
        recommendations: result.recommendations,
        completed_at: result.completedAt.toISOString(),
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    console.log('Quiz result saved to database');
  } catch (error) {
    console.error('Error saving quiz result to database:', error);
    // Don't throw error - local storage is primary, database is backup
  }
};

export const syncQuizResultsWithDatabase = async (userId: string): Promise<void> => {
  try {
    // Get local results
    const localResults = await getLocalQuizResults(userId);
    
    // Get database results
    const { data: dbResults, error } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) throw error;

    // Find results that exist locally but not in database
    const dbResultIds = new Set(dbResults?.map(r => `${r.quiz_id}_${r.completed_at}`) || []);
    const unsyncedResults = localResults.filter(local => 
      !dbResultIds.has(`${local.quizId}_${local.completedAt.toISOString()}`)
    );

    // Upload unsynced results
    for (const result of unsyncedResults) {
      await saveQuizResultToDatabase(result, userId);
    }

    console.log(`Synced ${unsyncedResults.length} quiz results with database`);
  } catch (error) {
    console.error('Error syncing quiz results with database:', error);
  }
};

export const getQuizHistory = async (userId: string, quizType?: string): Promise<StoredQuizResult[]> => {
  try {
    if (quizType) {
      return await getQuizResultsByType(userId, quizType);
    } else {
      return await getLocalQuizResults(userId);
    }
  } catch (error) {
    console.error('Error getting quiz history:', error);
    return [];
  }
};

export const getQuizImprovement = async (userId: string, quizType: string): Promise<{
  hasImproved: boolean;
  firstScore: number;
  latestScore: number;
  improvement: number;
  totalAttempts: number;
}> => {
  try {
    const results = await getQuizResultsByType(userId, quizType);
    
    if (results.length < 2) {
      return {
        hasImproved: false,
        firstScore: results[0]?.score || 0,
        latestScore: results[0]?.score || 0,
        improvement: 0,
        totalAttempts: results.length
      };
    }

    // Sort by completion date
    const sortedResults = results.sort((a, b) => 
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );

    const firstScore = sortedResults[0].score;
    const latestScore = sortedResults[sortedResults.length - 1].score;
    const improvement = latestScore - firstScore;

    return {
      hasImproved: improvement > 0,
      firstScore,
      latestScore,
      improvement,
      totalAttempts: results.length
    };
  } catch (error) {
    console.error('Error calculating quiz improvement:', error);
    return {
      hasImproved: false,
      firstScore: 0,
      latestScore: 0,
      improvement: 0,
      totalAttempts: 0
    };
  }
};

// Clear all quiz data (for testing or account deletion)
export const clearAllQuizData = async (userId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(`${QUIZ_RESULTS_KEY}_${userId}`);
    await AsyncStorage.removeItem(`${QUIZ_PROGRESS_KEY}_${userId}`);
    console.log('All quiz data cleared for user:', userId);
  } catch (error) {
    console.error('Error clearing quiz data:', error);
  }
};
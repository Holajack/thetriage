import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Animated, Alert, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { sendNoraChatMessage } from '../../utils/convexAIChatService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import NoraOnboarding from '../../components/NoraOnboarding';
import { NoraSideNav, NavItem } from '../../components/NoraSideNav';
// NoraLoupeAnimation temporarily disabled for stability
// import NoraLoupeAnimation from '../../components/NoraLoupeAnimation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import { ShimmerLoader } from '../../components/premium/ShimmerLoader';
import { MascotState, MascotAnimationDurations } from '../../theme/premiumTheme';
const { useUserAppData } = require('../../utils/userAppData');

interface NoraMessage {
  id: string;
  content: string;
  sender: 'user' | 'nora';
  timestamp: string;
  user_id: string;
}

const NORA_MODES = [
  {
    title: "Study Assistant",
    description: "Get personalized study help and guidance",
    icon: "happy-outline",
    color: "#7B61FF"
  },
  {
    title: "PDF Reader",
    description: "Analyze and extract questions from documents",
    icon: "document-text-outline",
    color: "#7B61FF"
  },
  {
    title: "Focus Timer",
    description: "Start productive study sessions",
    icon: "timer-outline",
    color: "#7B61FF"
  },
  {
    title: "Progress Tracker",
    description: "View your study analytics and insights",
    icon: "trophy-outline",
    color: "#7B61FF"
  }
];

const NoraScreen = () => {
  const { user } = useAuth();
  const { data: userData } = useUserAppData();
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  const handleNewChat = useCallback(() => {
    console.log('NoraScreen: Starting new chat - clearing current state');
    setChat([]);
    setInput('');
    setShowLandingScreen(true);
    setSelectedMode(null);
    setSelectedPdf(null);
    setIsFirstLoad(false); // Don't show loading screen for new chat
    setIsLoading(false); // Clear any loading state
    console.log('NoraScreen: New chat initialized');
  }, []);

  // Configure header
  useEffect(() => {
    navigation.setOptions({
      title: 'Nora Assistant',
      headerShown: true,
      headerStyle: {
        backgroundColor: theme.surface,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(123, 97, 255, 0.1)',
      },
      headerTitleStyle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.text,
      },
      headerTintColor: theme.text,
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('Home' as never)} 
          activeOpacity={0.7}
          style={{
            marginLeft: 16,
            padding: 8,
            borderRadius: 8,
            backgroundColor: 'rgba(123, 97, 255, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(123, 97, 255, 0.2)',
          }}
        >
          <Ionicons name="arrow-back" size={20} color={theme.primary} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings' as never)}
            activeOpacity={0.7}
            style={{
              marginRight: 8,
              padding: 8,
              borderRadius: 8,
              backgroundColor: 'rgba(123, 97, 255, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(123, 97, 255, 0.2)',
            }}
          >
            <Ionicons name="help-circle-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowChatDrawer(true)}
            activeOpacity={0.7}
            style={{
              marginRight: 8,
              padding: 8,
              borderRadius: 8,
              backgroundColor: 'rgba(123, 97, 255, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(123, 97, 255, 0.2)',
            }}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
          <NoraSideNav
            items={navItems}
            activeItemId={activeNavItem}
            onItemSelect={handleNavItemSelect}
            onNewChat={handleNewChat}
          />
        </View>
      ),
    });
    fetchChatHistory();
    fetchUploadedPdfs();
  }, [navigation, theme, handleNewChat, activeNavItem, navItems, handleNavItemSelect]);
  
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<NoraMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLandingScreen, setShowLandingScreen] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [chatHistory, setChatHistory] = useState<NoraMessage[][]>([]);
  const [uploadedPdfs, setUploadedPdfs] = useState<any[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<any>(null);
  const [showNoraOnboarding, setShowNoraOnboarding] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [thinkingMode, setThinkingMode] = useState<'fast' | 'deep'>('fast');
  const [lastNoraResponse, setLastNoraResponse] = useState<string>(''); // Track last response for context
  const [mascotState, setMascotState] = useState<MascotState>('waving');
  const [activeNavItem, setActiveNavItem] = useState<string>('chat');

  // Navigation items for side nav
  const navItems: NavItem[] = [
    {
      id: 'chat',
      label: 'Study Assistant',
      icon: 'chatbubbles-outline',
    },
    {
      id: 'pdf',
      label: 'PDF Reader',
      icon: 'document-text-outline',
    },
    {
      id: 'focus',
      label: 'Focus Timer',
      icon: 'timer-outline',
    },
    {
      id: 'progress',
      label: 'Progress Tracker',
      icon: 'trophy-outline',
    },
  ];

  const handleNavItemSelect = useCallback((itemId: string) => {
    setActiveNavItem(itemId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (itemId) {
      case 'chat':
        setShowLandingScreen(true);
        setSelectedMode('Study Assistant');
        break;
      case 'pdf':
        setShowPdfModal(true);
        break;
      case 'focus':
        navigation.navigate('StudySession' as never);
        break;
      case 'progress':
        navigation.navigate('Analytics' as never);
        break;
    }
  }, [navigation]);

  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchChatHistory();
    checkNoraOnboardingStatus();

    // Wave on screen entry, then transition to idle
    setTimeout(() => {
      setMascotState('idle');
    }, MascotAnimationDurations.waving);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollViewRef.current && !showLandingScreen) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [chat, showLandingScreen]);

  // Development helper - call this function manually if you need to reset onboarding for testing
  // This is NOT called automatically - only when manually invoked
  const resetNoraOnboardingForTesting = async () => {
    if (!user) return;
    try {
      await AsyncStorage.removeItem(`nora_onboarding_${user.id}`);
      console.log('NoraScreen: DEVELOPMENT - Onboarding reset for user', user.id);
    } catch (error) {
      console.error('Failed to reset Nora onboarding:', error);
    }
  };

  const checkNoraOnboardingStatus = async () => {
    if (!user) return;
    
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem(`nora_onboarding_${user.id}`);
      console.log('NoraScreen: Checking onboarding status for user', user.id, 'hasSeenOnboarding:', hasSeenOnboarding);
      
      // Only show onboarding for new users who haven't seen it
      if (!hasSeenOnboarding) {
        console.log('NoraScreen: First time user - showing Nora onboarding');
        // Small delay to ensure the screen has loaded
        setTimeout(() => {
          setShowNoraOnboarding(true);
        }, 500);
      } else {
        console.log('NoraScreen: User has already seen onboarding');
      }
    } catch (error) {
      console.error('Failed to check Nora onboarding status:', error);
    }
  };

  const fetchChatHistory = async () => {
    if (!user) return;

    // TODO: Load chat history from Convex
    // Will be implemented when chat history tables are added to Convex schema
    setIsFirstLoad(false);
  };

  const groupMessagesBySessions = (messages: NoraMessage[]) => {
    const sessions: NoraMessage[][] = [];
    let currentSession: NoraMessage[] = [];
    
    messages.forEach((message, index) => {
      if (index === 0 || 
          new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 3600000) {
        // New session if more than 1 hour gap
        if (currentSession.length > 0) {
          sessions.push(currentSession);
        }
        currentSession = [message];
      } else {
        currentSession.push(message);
      }
    });
    
    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }
    
    return sessions.reverse(); // Latest sessions first
  };

  const fetchUploadedPdfs = async () => {
    if (!user) return;

    // TODO: Load PDFs from Convex file storage
    // PDF storage will be migrated to Convex in a future phase
    setUploadedPdfs([]);
  };

  const saveMessage = async (content: string, sender: 'user' | 'nora') => {
    if (!user) return;

    // TODO: Save messages to Convex
    // Chat history will be implemented when chat tables are added to Convex schema
    console.log('Nora message (not saved):', content.substring(0, 50));
  };

  const transitionToChatMode = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowLandingScreen(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  // Detect vague follow-ups that need context from previous response
  const isVagueFollowUp = (message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim();
    const wordCount = message.split(/\s+/).length;

    // Short messages (1-10 words) with vague references
    if (wordCount <= 10) {
      // Transformation commands
      const transformationCommands = [
        'shorter', 'longer', 'simplify', 'expand', 'elaborate', 'more detail',
        'less detail', 'summarize', 'break it down', 'explain', 'clarify',
        'rephrase', 'rewrite', 'change', 'modify', 'adjust', 'make it'
      ];

      // Vague pronouns/references
      const vagueReferences = [
        'it', 'this', 'that', 'these', 'those', 'them', 'the above',
        'your answer', 'your response', 'what you said', 'what you just said'
      ];

      // Question words that might reference previous content
      const referenceQuestions = [
        'why', 'how', 'what about', 'can you', 'could you', 'would you',
        'please', 'give me', 'show me', 'tell me'
      ];

      // Check if message contains any vague indicators
      const hasTransformation = transformationCommands.some(cmd => lowerMessage.includes(cmd));
      const hasVagueReference = vagueReferences.some(ref => lowerMessage.includes(ref));
      const hasReferenceQuestion = referenceQuestions.some(q => lowerMessage.includes(q));

      // Consider it vague if it has transformation commands or vague references
      if (hasTransformation || (hasVagueReference && hasReferenceQuestion)) {
        console.log('🔗 Vague follow-up detected:', message);
        return true;
      }
    }

    return false;
  };

  // Detect question complexity automatically
  const detectQuestionComplexity = (message: string): 'fast' | 'deep' => {
    const lowerMessage = message.toLowerCase();

    // Keywords that suggest deep thinking is needed
    const deepThinkingKeywords = [
      'research', 'explain in detail', 'analyze', 'compare', 'comprehensive',
      'detailed analysis', 'investigate', 'explore', 'thorough', 'in-depth',
      'breakdown', 'examine', 'evaluate', 'assess', 'elaborate'
    ];

    // Keywords that suggest user data is needed
    const userDataKeywords = [
      'my progress', 'my sessions', 'my goals', 'my statistics', 'my performance',
      'my history', 'my achievements', 'how am i doing', 'track my', 'show my'
    ];

    // Check for deep thinking indicators
    const hasDeepKeywords = deepThinkingKeywords.some(keyword => lowerMessage.includes(keyword));
    const needsUserData = userDataKeywords.some(keyword => lowerMessage.includes(keyword));
    const isLongQuestion = message.length > 150; // Long questions often need deeper analysis
    const hasMultipleQuestions = (message.match(/\?/g) || []).length > 1;
    const hasTechnicalLanguage = /\b(algorithm|methodology|framework|paradigm|hypothesis|empirical)\b/i.test(message);

    // If any indicator suggests complexity, use deep mode
    if (hasDeepKeywords || needsUserData || hasMultipleQuestions || hasTechnicalLanguage) {
      console.log('🔍 Deep thinking mode automatically detected');
      return 'deep';
    }

    // For medium-length questions with academic context
    if (isLongQuestion && /\b(study|learn|understand|practice|review)\b/i.test(message)) {
      console.log('🔍 Deep thinking mode detected (long academic question)');
      return 'deep';
    }

    // Simple, short questions get fast mode
    console.log('⚡ Quick question mode automatically detected');
    return 'fast';
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || !user) return;

    // Transition from landing screen to chat mode
    if (showLandingScreen) {
      transitionToChatMode();
    }

    // Clear input if it came from the input field
    if (!messageText) {
      setInput('');
    }

    // Check if this is a vague follow-up that needs context
    let enhancedMessage = textToSend;
    const isVague = isVagueFollowUp(textToSend);

    if (isVague && lastNoraResponse) {
      // Create a summary of the last response (first 200 chars)
      const responseSummary = lastNoraResponse.substring(0, 200) + (lastNoraResponse.length > 200 ? '...' : '');

      // Enhance the message with context
      enhancedMessage = `${textToSend}

[Context: User is referring to your previous response: "${responseSummary}"]`;

      console.log('🔗 Enhanced vague follow-up with context from previous response');
    }

    // Automatically detect question complexity (user's manual selection overrides)
    const detectedMode = detectQuestionComplexity(enhancedMessage);
    const finalThinkingMode = thinkingMode; // Use user's manual selection if they chose one

    // If using deep mode, show indicator
    if (detectedMode === 'deep' && thinkingMode === 'fast') {
      // Auto-switch to deep mode for complex questions
      setThinkingMode('deep');
    }

    // Add user message to chat immediately
    const userMsg: NoraMessage = {
      id: Math.random().toString(36).slice(2),
      content: textToSend,
      sender: 'user',
      timestamp: new Date().toISOString(),
      user_id: user.id,
    };
    setChat(prev => [...prev, userMsg]);

    // Save user message
    await saveMessage(textToSend, 'user');

    // Start loading for Nora's response with mode indicator
    setIsLoading(true);
    setMascotState('thinking');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Add "thinking deeply" message if in deep mode
    if (detectedMode === 'deep' || thinkingMode === 'deep') {
      const thinkingMsg: NoraMessage = {
        id: 'thinking-indicator',
        content: '🔍 Thinking deeply about your question...',
        sender: 'nora',
        timestamp: new Date().toISOString(),
        user_id: user.id,
      };
      setChat(prev => [...prev, thinkingMsg]);
    }

    try {
      // Prepare conversation context (last 10 messages for context)
      const conversationHistory = chat.slice(-10).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Send message to Nora via Convex action
      console.log('NoraScreen: Making Convex action call');
      console.log(`NoraScreen: Using ${detectedMode === 'deep' ? 'Deep Think' : 'Quick Question'} mode`);
      console.log('NoraScreen: Including', conversationHistory.length, 'messages for context');
      const data = await sendNoraChatMessage({
        message: enhancedMessage,
        thinkingMode: detectedMode as 'fast' | 'deep',
        conversationHistory,
        userSettings: {
          focus_method: userData?.onboarding?.focus_method,
          weekly_focus_goal: userData?.onboarding?.weekly_focus_goal,
          onboarding: userData?.onboarding
        },
        pdfContext: selectedPdf ? {
          title: selectedPdf.title,
          file_path: selectedPdf.file_path
        } : null,
      });

      // Handle function results (navigation, actions, etc.)
      if (data.function_result) {
        const { function_result } = data;
        
        // Handle navigation
        if (function_result.navigation) {
          setTimeout(() => {
            navigation.navigate(function_result.navigation.route, function_result.navigation.params);
          }, 1000);
        }
        
        console.log('Nora executed function:', function_result.action);
      }

      if (data.response) {
        // Remove the "thinking deeply" indicator if present
        setChat(prev => prev.filter(msg => msg.id !== 'thinking-indicator'));

        // Store the full response for context in future vague follow-ups
        setLastNoraResponse(data.response);

        // Clean response by removing markdown formatting, emojis, and asterisks
        const cleanResponse = data.response
          .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold markdown
          .replace(/\*(.*?)\*/g, '$1')       // Remove italic markdown
          .replace(/__(.*?)__/g, '$1')       // Remove underline markdown
          .replace(/\*/g, '')                // Remove remaining asterisks
          // Remove emojis (all Unicode emoji ranges)
          .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
          .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
          .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
          .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
          .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
          .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
          .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
          .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
          .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
          .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation Selectors
          .replace(/[\u{200D}]/gu, '')            // Zero Width Joiner
          .trim()
          .replace(/\s+/g, ' ');                  // Normalize whitespace

        const noraMsg: NoraMessage = {
          id: Math.random().toString(36).slice(2),
          content: cleanResponse,
          sender: 'nora',
          timestamp: new Date().toISOString(),
          user_id: user.id,
        };

        setChat(prev => [...prev, noraMsg]);
        await saveMessage(cleanResponse, 'nora');
        setMascotState('idle');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error('No response from Nora');
      }

    } catch (error) {
      console.error('Nora request error:', error);
      setMascotState('idle');
      
      // Add fallback response
      const fallbackMsg: NoraMessage = {
        id: Math.random().toString(36).slice(2),
        content: "I'm experiencing some technical difficulties right now. As your advanced AI study companion, I should be back online shortly. Please try again in a moment!",
        sender: 'nora',
        timestamp: new Date().toISOString(),
        user_id: user.id,
      };
      setChat(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModePress = (mode: any) => {
    setSelectedMode(mode.title);
    const message = `I want to use ${mode.title}: ${mode.description}`;
    handleSend(message);
  };

  const renderLandingScreen = () => {
    return (
      <View style={styles.landingContainer}>
        <View style={styles.welcomeSection}>
          <View style={styles.noraAvatar}>
            <Ionicons name="chatbubble-ellipses" size={40} color="#7B61FF" />
          </View>
          <View>
            <Text style={[styles.welcomeTitle, { color: theme.text }]}>
              Hi! I'm Nora
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
              Your AI study assistant. How can I help you today?
            </Text>
          </View>
        </View>

        <View style={styles.modesContainer}>
          {NORA_MODES.map((mode, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.modeCard, { backgroundColor: theme.surface }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleModePress(mode);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.modeIcon, { backgroundColor: mode.color + '20' }]}>
                <Ionicons name={mode.icon as any} size={24} color={mode.color} />
              </View>
              <View style={styles.modeContent}>
                <Text style={[styles.modeTitle, { color: theme.text }]}>
                  {mode.title}
                </Text>
                <Text style={[styles.modeDescription, { color: theme.textSecondary }]}>
                  {mode.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };


  const handlePdfUpload = async () => {
    // Refresh PDF list before showing modal
    await fetchUploadedPdfs();
    setShowPdfModal(true);
  };

  const uploadNewPdf = async () => {
    try {
      setShowPdfModal(false);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      const MAX_SIZE = 100 * 1024 * 1024; // 100MB

      if (file.size && file.size > MAX_SIZE) {
        Alert.alert('File too large', 'Please choose a file smaller than 100 MB.');
        return;
      }

      // Show uploading indicator
      setIsLoading(true);

      // TODO: Upload to Convex file storage
      // PDF upload will be migrated to Convex in a future phase
      if (!user) {
        Alert.alert('Error', 'You must be logged in to upload files.');
        setIsLoading(false);
        return;
      }

      const userId = user.id;
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `${userId}/${fileName}`;

      console.log('Starting PDF upload using EBooksScreen method...');

      // TODO: Implement PDF upload via Convex file storage
      // For now, show a message that PDF upload is being enhanced
      Alert.alert(
        'PDF Upload Coming Soon',
        'PDF upload functionality is being enhanced. This feature will be available in the next update!',
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('Upload error:', error);

      let errorMessage = 'There was an error uploading your PDF.';

      if (error.message.includes('Network request failed')) {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      } else if (error.message.includes('Unable to upload')) {
        errorMessage = 'Upload failed. Please try selecting a different file or check your internet connection.';
      } else if (error.message.includes('logged in')) {
        errorMessage = 'Please sign in again to upload files.';
      } else if (error.message.includes('too large')) {
        errorMessage = 'File is too large. Please choose a file smaller than 100MB.';
      }

      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const selectPdfFromLibrary = (pdf: any) => {
    setSelectedPdf(pdf);
    setShowPdfModal(false);
    Alert.alert(
      'PDF Selected',
      `"${pdf.name}" is now attached to your conversation.\n\nNora will provide comprehensive study assistance for this document, including:\n• Study strategies and learning plans\n• Practice questions and quizzes\n• Summarization techniques\n• Note-taking guidance\n• Active recall exercises\n\nFull PDF text extraction is being enhanced. For now, Nora will help based on the document title and your study needs.`,
      [{ text: 'Got it!' }]
    );
  };

  const removePdfSelection = () => {
    setSelectedPdf(null);
    Alert.alert('PDF Removed', 'PDF context has been removed from the conversation.');
  };

  const handleNoraOnboardingComplete = async () => {
    if (!user) return;
    
    try {
      console.log('NoraScreen: Saving onboarding completion for user', user.id);
      await AsyncStorage.setItem(`nora_onboarding_${user.id}`, 'true');
      setShowNoraOnboarding(false);
      console.log('NoraScreen: Onboarding completed and saved successfully');
    } catch (error) {
      console.error('Failed to save Nora onboarding completion:', error);
      setShowNoraOnboarding(false);
    }
  };

  const handleNoraOnboardingSkip = async () => {
    if (!user) return;
    
    try {
      console.log('NoraScreen: Saving onboarding skip for user', user.id);
      await AsyncStorage.setItem(`nora_onboarding_${user.id}`, 'true');
      setShowNoraOnboarding(false);
      console.log('NoraScreen: Onboarding skipped and saved successfully');
    } catch (error) {
      console.error('Failed to save Nora onboarding skip:', error);
      setShowNoraOnboarding(false);
    }
  };

  const renderMessage = (message: NoraMessage, index: number) => {
    const isUser = message.sender === 'user';

    // Dynamic colors based on theme for better visibility
    const noraBackgroundColor = theme.mode === 'dark'
      ? '#2D2440'  // Dark purple background for dark mode
      : '#F3F2FF'; // Light purple background for light mode

    const noraTextColor = theme.mode === 'dark'
      ? '#E8E4FF'  // Light purple-tinted white for dark mode
      : '#1A1A1A'; // Dark gray for light mode

    return (
      <View
        key={`${message.id}-${index}`}
        style={[
          styles.messageBubble,
          isUser ? styles.userMessage : styles.noraMessage,
          // Theme-aware background for Nora messages
          !isUser && { backgroundColor: noraBackgroundColor }
        ]}
      >
        <Text style={[
          styles.messageText,
          { color: isUser ? '#FFFFFF' : noraTextColor }
        ]}>
          {message.content}
        </Text>
        <Text style={[
          styles.timestamp,
          {
            color: isUser
              ? 'rgba(255,255,255,0.7)'
              : (theme.mode === 'dark' ? '#B8B0D9' : '#666666')
          }
        ]}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })}
        </Text>
      </View>
    );
  };


  const renderChatScreen = () => (
    <Animated.View style={[styles.chatScreenContainer, { opacity: fadeAnim, flex: 1 }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => {
          // Auto-scroll to bottom when content size changes (new messages)
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }}
        onLayout={() => {
          // Scroll to bottom on initial layout
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }}
      >
        {chat.map((message, index) => renderMessage(message, index))}

        {/* Loading Indicator - Simple version for stability */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={[styles.simpleLoadingDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.loadingDots, { color: theme.textSecondary, marginTop: 12 }]}>
              {selectedPdf
                ? `Analyzing "${selectedPdf.name}"...`
                : mascotState === 'thinking' ? 'Thinking...' : 'Processing...'}
            </Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );

  if (isFirstLoad) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ShimmerLoader variant="circle" height={48} />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Loading Nora...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.contentContainer}>
        {showLandingScreen ? renderLandingScreen() : renderChatScreen()}

        {/* Selected PDF Indicator */}
        {selectedPdf && (
          <View style={[styles.selectedPdfBanner, {
            backgroundColor: theme.primary + '15',
            borderTopColor: theme.primary + '40'
          }]}>
            <Ionicons name="document-text" size={20} color={theme.primary} />
            <Text style={[styles.selectedPdfBannerText, { color: theme.text }]} numberOfLines={1}>
              PDF attached: {selectedPdf.name}
            </Text>
            <TouchableOpacity onPress={removePdfSelection}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        <View style={[styles.inputContainer, {
          backgroundColor: theme.surface,
          borderTopColor: theme.border
        }]}>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: '#FFFFFF',
              color: '#000000',
              borderColor: '#7B61FF',
              borderWidth: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }]}
            placeholder={showLandingScreen ? "Ask Anything" : "Type your message..."}
            placeholderTextColor="#666666"
            value={input}
            onChangeText={setInput}
            multiline={true}
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            autoCorrect={true}
            spellCheck={true}
            selectionColor="#7B61FF"
          />

          {/* Thinking Mode Selector */}
          <View style={styles.thinkingModeContainer}>
            <Text style={[styles.thinkingModeLabel, { color: theme.textSecondary }]}>
              Thinking Mode:
            </Text>
            <View style={styles.thinkingModeButtons}>
              <TouchableOpacity
                style={[
                  styles.thinkingModeButton,
                  thinkingMode === 'fast' && styles.thinkingModeButtonActive,
                  {
                    borderColor: thinkingMode === 'fast' ? theme.primary : theme.border,
                    backgroundColor: thinkingMode === 'fast' ? theme.primary + '15' : 'transparent'
                  }
                ]}
                onPress={() => setThinkingMode('fast')}
              >
                <Ionicons
                  name="flash"
                  size={16}
                  color={thinkingMode === 'fast' ? theme.primary : theme.textSecondary}
                />
                <Text style={[
                  styles.thinkingModeText,
                  { color: thinkingMode === 'fast' ? theme.primary : theme.textSecondary }
                ]}>
                  Quick Question
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.thinkingModeButton,
                  thinkingMode === 'deep' && styles.thinkingModeButtonActive,
                  {
                    borderColor: thinkingMode === 'deep' ? theme.primary : theme.border,
                    backgroundColor: thinkingMode === 'deep' ? theme.primary + '15' : 'transparent'
                  }
                ]}
                onPress={() => setThinkingMode('deep')}
              >
                <Ionicons
                  name="sparkles"
                  size={16}
                  color={thinkingMode === 'deep' ? theme.primary : theme.textSecondary}
                />
                <Text style={[
                  styles.thinkingModeText,
                  { color: thinkingMode === 'deep' ? theme.primary : theme.textSecondary }
                ]}>
                  Deep Dive
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handlePdfUpload}
            >
              <Ionicons name="document-text" size={20} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryActionButton, { backgroundColor: theme.primary }]}
              onPress={() => Alert.alert('Voice Input', 'Voice input feature coming soon!')}
            >
              <Ionicons name="mic" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            {input.trim().length > 0 && (
              <AnimatedButton
                title=""
                onPress={() => handleSend()}
                disabled={isLoading}
                loading={isLoading}
                variant="primary"
                size="small"
                icon={<Ionicons name="send" size={20} color="#FFFFFF" />}
                hapticFeedback={true}
                style={{ paddingHorizontal: 12, paddingVertical: 8 }}
              />
            )}
          </View>
        </View>

        {/* Chat History Drawer */}
        <Modal
          visible={showChatDrawer}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowChatDrawer(false)}
        >
          <View style={[styles.drawerContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.drawerHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <Text style={[styles.drawerTitle, { color: theme.text }]}>Chat History</Text>
              <TouchableOpacity onPress={() => setShowChatDrawer(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={chatHistory}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item: session, index }) => (
                <TouchableOpacity 
                  style={[styles.chatHistoryItem, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
                  onPress={() => {
                    setChat(session);
                    setShowLandingScreen(false);
                    setShowChatDrawer(false);
                  }}
                >
                  <Text style={[styles.chatHistoryTitle, { color: theme.text }]}>Chat Session {chatHistory.length - index}</Text>
                  <Text style={[styles.chatHistoryDate, { color: theme.textSecondary }]}>
                    {new Date(session[0]?.timestamp).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.chatHistoryPreview, { color: theme.textSecondary }]} numberOfLines={2}>
                    {session[0]?.content.substring(0, 100)}...
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="chatbox-outline" size={48} color={theme.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>No chat history yet</Text>
                </View>
              }
            />
          </View>
        </Modal>

        {/* Nora Onboarding */}
        <NoraOnboarding
          visible={showNoraOnboarding}
          onComplete={handleNoraOnboardingComplete}
          onSkip={handleNoraOnboardingSkip}
        />

        {/* PDF Selection Modal */}
        <Modal
          visible={showPdfModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPdfModal(false)}
        >
          <View style={[styles.pdfModalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.pdfModalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <Text style={[styles.pdfModalTitle, { color: theme.text }]}>Select PDF</Text>
              <TouchableOpacity onPress={() => setShowPdfModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.pdfModalContent}>
              {/* Upload New PDF Button */}
              <TouchableOpacity
                style={[styles.uploadPdfButton, { backgroundColor: theme.primary }]}
                onPress={uploadNewPdf}
              >
                <Ionicons name="cloud-upload-outline" size={24} color="#FFFFFF" />
                <Text style={styles.uploadPdfButtonText}>Upload New PDF</Text>
              </TouchableOpacity>

              {/* PDF List */}
              <Text style={[styles.pdfListTitle, { color: theme.text }]}>
                Your PDFs ({uploadedPdfs.length})
              </Text>

              <FlatList
                data={uploadedPdfs}
                keyExtractor={(item) => item.id}
                renderItem={({ item: pdf }) => (
                  <TouchableOpacity
                    style={[
                      styles.pdfListItem,
                      {
                        backgroundColor: theme.surface,
                        borderColor: selectedPdf?.id === pdf.id ? theme.primary : theme.border,
                        borderWidth: selectedPdf?.id === pdf.id ? 2 : 1
                      }
                    ]}
                    onPress={() => selectPdfFromLibrary(pdf)}
                  >
                    <View style={[styles.pdfIconContainer, { backgroundColor: theme.primary + '20' }]}>
                      <Ionicons name="document-text" size={28} color={theme.primary} />
                    </View>
                    <View style={styles.pdfInfo}>
                      <Text style={[styles.pdfName, { color: theme.text }]} numberOfLines={2}>
                        {pdf.name}
                      </Text>
                      <Text style={[styles.pdfSize, { color: theme.textSecondary }]}>
                        {(pdf.file_size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                      <Text style={[styles.pdfDate, { color: theme.textSecondary }]}>
                        {new Date(pdf.upload_date).toLocaleDateString()}
                      </Text>
                    </View>
                    {selectedPdf?.id === pdf.id && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyPdfState}>
                    <Ionicons name="document-outline" size={64} color={theme.textSecondary} />
                    <Text style={[styles.emptyPdfText, { color: theme.textSecondary }]}>
                      No PDFs uploaded yet
                    </Text>
                    <Text style={[styles.emptyPdfSubtext, { color: theme.textSecondary }]}>
                      Upload your first PDF to get started
                    </Text>
                  </View>
                }
                contentContainerStyle={styles.pdfListContent}
              />
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grokIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
    marginRight: 8,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerToggle: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  newChatButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 4,
  },
  contentContainer: {
    flex: 1,
  },
  
  // Landing Screen Styles
  landingContainer: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  noraAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(123, 97, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  modesContainer: {
    flex: 1,
  },
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeContent: {
    flex: 1,
    marginLeft: 12,
  },
  modeDescription: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  voiceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  voiceText: {
    fontSize: 14,
    marginLeft: 8,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Chat Screen Styles
  chatScreenContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginVertical: 4,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#7B61FF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  noraMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  loadingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  simpleLoadingDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.7,
  },
  loadingDots: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  // Input Styles
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    maxHeight: 100,
    minHeight: 44,
    fontSize: 16,
    fontWeight: '400',
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E9EA',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  primaryActionButton: {
    borderWidth: 0,
  },
  selectedPdfContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedPdfText: {
    flex: 1,
    fontSize: 14,
    marginHorizontal: 8,
  },
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatHistoryItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  chatHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  chatHistoryDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  chatHistoryPreview: {
    fontSize: 14,
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
  },
  selectedPdfBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  selectedPdfBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    marginRight: 8,
  },

  // Thinking Mode Selector Styles
  thinkingModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  thinkingModeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  thinkingModeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  thinkingModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  thinkingModeButtonActive: {
    borderWidth: 1.5,
  },
  thinkingModeText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default NoraScreen;
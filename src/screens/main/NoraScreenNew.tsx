/**
 * Nora AI Screen - Premium ChatGPT/Claude Style Design
 *
 * Features:
 * - Voice-first with Whisper AI transcription
 * - Claude iOS-style floating voice recording panel
 * - Dark mode support
 * - Chat history via Claude-style side navigation
 * - PDF attachment from ebook library
 * - Deep think toggle (clock icon)
 * - Gradient shimmer loading animation
 * - Clean text output (no markdown symbols)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { sendNoraChatMessage, transcribeAudio } from '../../utils/convexAIChatService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
  FadeInUp,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  Easing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { NoraSideNav, NavItem, ChatSession } from '../../components/NoraSideNav';
import { useFocusAnimationKey } from '../../utils/animationUtils';
import { NoraThinkingAnimation } from '../../components/NoraThinkingAnimation';

const { width, height } = Dimensions.get('window');

// Types
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'nora';
  timestamp: string;
  sources?: Source[];
  isSearching?: boolean;
  searchSteps?: string[];
}

interface Source {
  title: string;
  url?: string;
  type: 'web' | 'document' | 'memory';
}

// ChatSession is imported from NoraSideNav

// Quick Action Suggestions
const QUICK_ACTIONS = [
  { id: '1', text: 'Help me study for my exam', icon: 'school-outline' },
  { id: '2', text: 'Create a study plan for this week', icon: 'calendar-outline' },
  { id: '3', text: 'Explain a difficult concept', icon: 'bulb-outline' },
  { id: '4', text: 'Quiz me on what I learned', icon: 'help-circle-outline' },
];

// Helper to strip markdown formatting
const stripMarkdown = (text: string): string => {
  return text
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s*[-*+]\s/gm, '• ')
    .replace(/^\s*\d+\.\s/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/>\s?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// ============================================
// APPLE-STYLE DYNAMIC WAVE BAR
// Inspired by Apple's Voice Memos with spring physics
// ============================================
const AnimatedWaveBar: React.FC<{
  index: number;
  amplitude: number;
  isActive: boolean;
  color?: string;
  totalBars: number;
}> = ({ index, amplitude, isActive, color = 'rgba(255,255,255,0.7)', totalBars = 24 }) => {
  const heightValue = useSharedValue(0.08);
  const scaleX = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      // Apple-style: center bars are taller, edges shorter (bell curve distribution)
      const centerIndex = totalBars / 2;
      const distanceFromCenter = Math.abs(index - centerIndex) / centerIndex;
      const bellCurve = Math.exp(-distanceFromCenter * distanceFromCenter * 2);

      // Add organic randomness like Apple's visualizer
      const phaseOffset = Math.sin(index * 0.7 + Date.now() * 0.001) * 0.15;
      const variation = bellCurve * (0.7 + phaseOffset);

      // Dynamic response to amplitude with spring physics
      const baseHeight = 0.08;
      const targetHeight = amplitude > 0.03
        ? Math.min(baseHeight + (amplitude * variation * 1.2), 0.95)
        : baseHeight + (variation * 0.05); // Subtle idle animation

      // Apple uses critically damped springs for smooth feel
      heightValue.value = withSpring(targetHeight, {
        damping: 15,
        stiffness: 300,
        mass: 0.5,
      });

      // Subtle horizontal pulse on loud sounds
      if (amplitude > 0.5) {
        scaleX.value = withSpring(1.15, { damping: 20, stiffness: 400 });
      } else {
        scaleX.value = withSpring(1, { damping: 15, stiffness: 200 });
      }
    } else {
      heightValue.value = withSpring(0.08, { damping: 20, stiffness: 150 });
      scaleX.value = withSpring(1, { damping: 15, stiffness: 150 });
    }
  }, [amplitude, isActive, index, totalBars]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${heightValue.value * 100}%`,
    transform: [{ scaleX: scaleX.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.voiceWaveBar,
        animatedStyle,
        { backgroundColor: color },
      ]}
    />
  );
};

// ============================================
// SEARCHING INDICATOR - Simplified (not currently used)
// ============================================
const SearchingIndicator: React.FC<{ steps: string[]; theme: any }> = ({ steps, theme }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % Math.max(steps.length, 1));
    }, 1200);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <View style={styles.searchingContainer}>
      <View style={styles.searchingContent}>
        <View style={styles.searchingDots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.searchingDot,
                { backgroundColor: theme.primary, opacity: i === currentStep % 3 ? 1 : 0.3 },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.searchingText, { color: theme.textSecondary }]}>
          {steps[currentStep] || 'Thinking...'}
        </Text>
      </View>
    </View>
  );
};

// ============================================
// APPLE-STYLE INLINE VOICE RECORDING BAR
// ============================================
const WAVE_BAR_COUNT = 32; // More bars for smoother Apple-like visualization
const barIndicesArray = Array.from({ length: WAVE_BAR_COUNT }, (_, i) => i);

const InlineVoiceBar: React.FC<{
  amplitude: number;
  duration: number;
  themeColor: string;
}> = ({ amplitude, duration, themeColor }) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.inlineVoiceBar}>
      {/* Duration on left side to avoid being hidden by button */}
      <Text style={[styles.inlineDuration, { color: themeColor }]}>{formatDuration(duration)}</Text>
      <View style={styles.inlineWaveContainer}>
        {barIndicesArray.map((index) => (
          <AnimatedWaveBar
            key={index}
            index={index}
            amplitude={amplitude}
            isActive={true}
            color={themeColor}
            totalBars={WAVE_BAR_COUNT}
          />
        ))}
      </View>
      {/* Spacer for the button area on the right */}
      <View style={{ width: 40 }} />
    </View>
  );
};

// ============================================
// SOURCE CITATION - Simple Style (No Reanimated)
// ============================================
const SimpleSourceBubble: React.FC<{
  source: Source;
  theme: any;
  isDark: boolean;
}> = ({ source, theme, isDark }) => {
  const iconColor = isDark ? '#A0C8E8' : '#5A7B9A';
  const bgColor = isDark ? 'rgba(160, 200, 232, 0.15)' : 'rgba(90, 123, 154, 0.1)';

  return (
    <View style={styles.simpleSourceWrapper}>
      <View style={[styles.simpleSourceBubble, { backgroundColor: bgColor }]}>
        <Ionicons
          name={
            source.type === 'web'
              ? 'globe-outline'
              : source.type === 'document'
              ? 'document-text-outline'
              : 'sparkles-outline'
          }
          size={14}
          color={iconColor}
        />
      </View>
      <Text style={[styles.simpleSourceLabel, { color: theme.textSecondary }]} numberOfLines={1}>
        {source.title}
      </Text>
    </View>
  );
};

const SourceCitation: React.FC<{ sources: Source[]; theme: any; isDark?: boolean }> = ({
  sources,
  theme,
  isDark = true,
}) => {
  if (!sources || sources.length === 0) return null;

  return (
    <View style={styles.sourcesContainer}>
      <Text style={[styles.sourcesTitle, { color: theme.textSecondary }]}>Sources</Text>
      <View style={styles.simpleSourcesList}>
        {sources.map((source, index) => (
          <SimpleSourceBubble
            key={index}
            source={source}
            theme={theme}
            isDark={isDark}
          />
        ))}
      </View>
    </View>
  );
};

// ============================================
// MESSAGE BUBBLE
// ============================================
const MessageBubble: React.FC<{
  message: Message;
  theme: any;
  isDeepThink: boolean;
  isDark: boolean;
}> = ({ message, theme, isDeepThink, isDark }) => {
  const isUser = message.sender === 'user';

  // Removed entering={FadeIn} to prevent animation conflicts with child components
  return (
    <View
      style={[
        styles.messageBubbleContainer,
        isUser ? styles.userBubbleContainer : styles.noraBubbleContainer,
      ]}
    >
      {!isUser && (
        <View style={styles.noraAvatarSmall}>
          <LinearGradient
            colors={isDeepThink ? ['#FF6B6B', '#FF8E53'] : ['#7B61FF', '#9D4EDD']}
            style={styles.noraAvatarGradient}
          >
            <Ionicons name={isDeepThink ? 'flash' : 'sparkles'} size={14} color="#FFFFFF" />
          </LinearGradient>
        </View>
      )}
      {message.isSearching ? (
        // Inline thinking animation - no bubble, just the text with shimmer
        <View style={styles.thinkingContainer}>
          <NoraThinkingAnimation
            steps={message.searchSteps || ['Thinking...', 'Analyzing...', 'Preparing response...']}
            isDark={isDark}
            textColor={theme.textSecondary}
            shineColor={theme.text}
          />
        </View>
      ) : (
        <View
          style={[
            styles.messageBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: theme.primary }]
              : [styles.noraBubble, { backgroundColor: theme.card }],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : [styles.noraMessageText, { color: theme.text }],
            ]}
          >
            {isUser ? message.content : stripMarkdown(message.content)}
          </Text>
          {message.sources && <SourceCitation sources={message.sources} theme={theme} isDark={isDark} />}
        </View>
      )}
    </View>
  );
};

// ============================================
// QUICK ACTION CARD
// ============================================
const QuickActionCard: React.FC<{
  action: typeof QUICK_ACTIONS[0];
  onPress: () => void;
  index: number;
  theme: any;
}> = ({ action, onPress, index, theme }) => {
  return (
    <Animated.View entering={FadeIn.delay(100 + index * 60).duration(300)}>
      <TouchableOpacity
        style={[styles.quickActionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: theme.primary + '15' }]}>
          <Ionicons name={action.icon as any} size={20} color={theme.primary} />
        </View>
        <Text style={[styles.quickActionText, { color: theme.text }]}>{action.text}</Text>
        <Ionicons name="arrow-forward" size={16} color={theme.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
};


// ============================================
// PDF PICKER MODAL
// ============================================
const PDFPickerModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  pdfs: any[];
  onSelect: (pdf: any) => void;
  theme: any;
}> = ({ visible, onClose, pdfs, onSelect, theme }) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeInUp.duration(250)}
          style={[styles.pdfModal, { backgroundColor: theme.background }]}
        >
          <View style={[styles.pdfModalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.pdfModalTitle, { color: theme.text }]}>Attach PDF</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={pdfs}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 300 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pdfItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Ionicons name="document-text" size={24} color={theme.primary} />
                <Text style={[styles.pdfName, { color: theme.text }]} numberOfLines={1}>
                  {item.title || item.name}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyPdfs}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No PDFs in your library
                </Text>
              </View>
            }
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const NoraScreenNew: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const scrollViewRef = useRef<ScrollView>(null);

  // Force animations to replay on every screen focus
  const focusKey = useFocusAnimationKey();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [deepThink, setDeepThink] = useState(false);
  const [showPdfPicker, setShowPdfPicker] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [uploadedPdfs, setUploadedPdfs] = useState<any[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<any>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);
  const [activeNavItem, setActiveNavItem] = useState<string>('chat');

  // Navigation items for side nav (New Chat is handled by the green button, not in nav items)
  const navItems: NavItem[] = [
    { id: 'pdf', label: 'PDF Reader', icon: 'document-text-outline' },
    { id: 'focus', label: 'Focus Timer', icon: 'timer-outline' },
    { id: 'progress', label: 'Progress Tracker', icon: 'trophy-outline' },
  ];

  const handleNavItemSelect = (itemId: string) => {
    setActiveNavItem(itemId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (itemId) {
      case 'pdf':
        setShowPdfPicker(true);
        break;
      case 'focus':
        navigation.navigate('FocusPreparation' as never);
        break;
      case 'progress':
        navigation.navigate('Results' as never);
        break;
    }
  };

  // Handle selecting a chat session from the side nav
  const handleSelectSession = (session: ChatSession) => {
    setMessages(session.messages);
    setShowWelcome(false);
  };

  // Handle deleting a chat session
  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    try {
      // sessionId is the date string - delete all messages from that day
      const sessionToDelete = chatSessions.find(s => s.id === sessionId);
      if (!sessionToDelete) return;

      // Get all message IDs from this session
      const messageIds = sessionToDelete.messages.map((m: any) => m.id);

      // TODO: Delete chat session from Convex
      // Chat history storage will be implemented in a future phase
      console.log('Chat deletion will be implemented when chat history is migrated to Convex');

      // Update local state
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));

      // If we deleted the current session, clear messages
      if (messages.some(m => messageIds.includes(m.id))) {
        setMessages([]);
        setShowWelcome(true);
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error);
    }
  };

  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const meteringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const logoScale = useSharedValue(0.9);

  // Apple-style recording animations
  const revealProgress = useSharedValue(0);
  const micRotation = useSharedValue(0);
  const checkmarkRotation = useSharedValue(-180);

  // Enhanced input area animations
  const inputContainerScale = useSharedValue(1);
  const sendButtonScale = useSharedValue(1);
  const sendButtonGlow = useSharedValue(0);
  const cancelButtonOpacity = useSharedValue(0);
  const cancelButtonScale = useSharedValue(0.8);
  const plusButtonRotation = useSharedValue(0);
  const deepThinkGlow = useSharedValue(0);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    logoScale.value = withSpring(1, { damping: 15 });
    loadChatHistory();
    loadPdfs();

    // Reset audio system on mount to clear any orphaned recordings
    const resetAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      } catch (e) {
        console.log('Audio reset on mount:', e);
      }
    };
    resetAudio();
  }, []);

  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (meteringIntervalRef.current) {
        clearInterval(meteringIntervalRef.current);
      }
      // Clean up any active recording
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  // Apple-style recording animation effects - subtle crossfade, no rotation
  useEffect(() => {
    if (isRecording) {
      // Reveal animation - expand from mic button
      revealProgress.value = withSpring(1, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      });
      // Simple crossfade - mic fades out
      micRotation.value = withTiming(1, { duration: 200 });
      // Checkmark fades in
      checkmarkRotation.value = withTiming(1, { duration: 200 });
      // Cancel button appears
      cancelButtonOpacity.value = withDelay(100, withTiming(1, { duration: 200 }));
      cancelButtonScale.value = withDelay(100, withSpring(1, { damping: 15, stiffness: 200 }));
      // Input container subtle pulse
      inputContainerScale.value = withSequence(
        withSpring(1.02, { damping: 15, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 200 })
      );
    } else {
      // Reset animations
      revealProgress.value = withTiming(0, { duration: 200 });
      micRotation.value = withTiming(0, { duration: 150 });
      checkmarkRotation.value = withTiming(0, { duration: 150 });
      cancelButtonOpacity.value = withTiming(0, { duration: 150 });
      cancelButtonScale.value = withTiming(0.8, { duration: 150 });
    }
  }, [isRecording]);

  // Send button pulse when text is entered
  useEffect(() => {
    if (input.trim()) {
      sendButtonScale.value = withSequence(
        withSpring(1.15, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      sendButtonGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      sendButtonScale.value = withSpring(1, { damping: 15 });
      sendButtonGlow.value = withTiming(0, { duration: 200 });
    }
  }, [input]);

  // Deep think glow animation
  useEffect(() => {
    if (deepThink) {
      deepThinkGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      deepThinkGlow.value = withTiming(0, { duration: 200 });
    }
  }, [deepThink]);

  // Circular reveal animation style
  const revealAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(revealProgress.value, [0, 1], [0, 1]);
    return {
      transform: [{ scale }],
      opacity: interpolate(revealProgress.value, [0, 0.1, 1], [0, 1, 1]),
    };
  });

  // Mic icon style - simple fade out (no rotation)
  const micRotationStyle = useAnimatedStyle(() => ({
    opacity: interpolate(micRotation.value, [0, 1], [1, 0]),
    transform: [{ scale: interpolate(micRotation.value, [0, 1], [1, 0.8]) }],
  }));

  // Checkmark icon style - simple fade in (no rotation)
  const checkmarkRotationStyle = useAnimatedStyle(() => ({
    opacity: interpolate(checkmarkRotation.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(checkmarkRotation.value, [0, 1], [0.8, 1]) }],
  }));

  // Enhanced input area animated styles
  const inputContainerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputContainerScale.value }],
  }));

  const cancelButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cancelButtonOpacity.value,
    transform: [{ scale: cancelButtonScale.value }],
  }));

  const sendButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));

  const sendButtonGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sendButtonGlow.value, [0, 1], [0, 0.5]),
    transform: [{ scale: interpolate(sendButtonGlow.value, [0, 1], [1, 1.4]) }],
  }));

  const deepThinkGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(deepThinkGlow.value, [0, 1], [0, 0.6]),
    transform: [{ scale: interpolate(deepThinkGlow.value, [0, 1], [0.8, 1.3]) }],
  }));

  const loadChatHistory = async () => {
    if (!user) return;

    // TODO: Load chat history from Convex
    // Will be implemented when chat history tables are added to Convex schema
    console.log('Chat history loading from Convex will be implemented in a future update');
  };

  const groupByDay = (data: any[]): ChatSession[] => {
    const groups: { [key: string]: any[] } = {};
    data.forEach((msg) => {
      const date = new Date(msg.timestamp).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });

    return Object.entries(groups).map(([date, msgs]) => ({
      id: date,
      date,
      preview: msgs[0]?.content || '',
      messages: msgs.map((m) => ({
        id: m.id,
        content: m.content,
        sender: m.sender,
        timestamp: m.timestamp,
      })),
    }));
  };

  const loadPdfs = async () => {
    if (!user) return;

    // TODO: Load PDFs from Convex file storage
    // PDF storage will be migrated to Convex in a future phase
    setUploadedPdfs([]);
  };

  // Voice recording with Whisper
  const isStartingRecording = useRef(false);

  const startRecording = async () => {
    // Prevent concurrent recording starts
    if (isStartingRecording.current) {
      console.log('Already starting a recording, ignoring...');
      return;
    }

    isStartingRecording.current = true;

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission not granted');
        isStartingRecording.current = false;
        return;
      }

      // Aggressively clean up any existing recording first
      if (recordingRef.current) {
        console.log('Cleaning up existing recording...');
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {
          console.log('Cleanup error (ignored):', e);
        }
        recordingRef.current = null;
        setRecording(null);
      }

      // Disable recording mode first to force release any system resources
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      // Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 150));

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Recording options with metering enabled
      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      };

      // Create recording with explicit new instance
      const newRecording = new Audio.Recording();

      try {
        await newRecording.prepareToRecordAsync(recordingOptions);
      } catch (prepareError: any) {
        // If prepare fails, try unloading this recording and retry once
        if (prepareError.message?.includes('Only one Recording')) {
          console.log('Recording conflict detected, attempting cleanup retry...');
          try {
            await newRecording.stopAndUnloadAsync();
          } catch (e) {}

          // Wait a bit longer
          await new Promise(resolve => setTimeout(resolve, 300));

          // Try with a fresh recording object
          const retryRecording = new Audio.Recording();
          await retryRecording.prepareToRecordAsync(recordingOptions);
          await retryRecording.startAsync();

          recordingRef.current = retryRecording;
          setRecording(retryRecording);
          setIsRecording(true);
          setRecordingDuration(0);
          setVoiceAmplitude(0);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          // Start metering and duration intervals
          startMeteringInterval(retryRecording);
          recordingTimerRef.current = setInterval(() => {
            setRecordingDuration((prev) => prev + 1);
          }, 1000);
          return;
        }
        throw prepareError;
      }

      await newRecording.startAsync();

      recordingRef.current = newRecording;
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      setVoiceAmplitude(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Start metering interval for voice detection
      startMeteringInterval(newRecording);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      // Reset state on error
      recordingRef.current = null;
      setRecording(null);
      setIsRecording(false);
      setVoiceAmplitude(0);
    } finally {
      isStartingRecording.current = false;
    }
  };

  // Metering interval for voice activity visualization
  const startMeteringInterval = (rec: Audio.Recording) => {
    // Clear any existing interval
    if (meteringIntervalRef.current) {
      clearInterval(meteringIntervalRef.current);
    }

    meteringIntervalRef.current = setInterval(async () => {
      try {
        const status = await rec.getStatusAsync();
        if (status.isRecording && status.metering !== undefined) {
          // Convert dB to 0-1 amplitude (metering is typically -160 to 0 dB)
          const db = status.metering;
          // Sensitive amplitude conversion for responsive visual feedback
          const normalizedAmplitude = Math.max(0, Math.min(1, (db + 50) / 50));
          setVoiceAmplitude(normalizedAmplitude);
        }
      } catch (e) {
        // Recording might have stopped
      }
    }, 50); // Poll every 50ms for smooth animation
  };

  const clearRecordingIntervals = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (meteringIntervalRef.current) {
      clearInterval(meteringIntervalRef.current);
      meteringIntervalRef.current = null;
    }
  };

  const cancelRecording = async () => {
    clearRecordingIntervals();
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        // Ignore
      }
    }
    recordingRef.current = null;
    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setVoiceAmplitude(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Stop recording and send the message
  const stopAndSendRecording = async () => {
    clearRecordingIntervals();
    if (!recordingRef.current) return;

    setIsRecording(false);
    setVoiceAmplitude(0);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setRecording(null);
      setRecordingDuration(0);

      if (uri) {
        await transcribeAudio(uri, true); // true = auto-send
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      recordingRef.current = null;
      setRecording(null);
      setRecordingDuration(0);
    }
  };

  // Stop recording and just transcribe to input box (auto-stop on silence)
  const stopAndTranscribe = async () => {
    clearRecordingIntervals();
    if (!recordingRef.current) return;

    setIsRecording(false);
    setVoiceAmplitude(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setRecording(null);
      setRecordingDuration(0);

      if (uri) {
        await transcribeAudio(uri, false); // false = just put in input box
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      recordingRef.current = null;
      setRecording(null);
      setRecordingDuration(0);
    }
  };

  const transcribeAudio = async (audioUri: string, autoSend: boolean = true) => {
    try {
      // Only show loading if we're going to auto-send
      if (autoSend) {
        setIsLoading(true);
      }

      // Read audio file as base64 for Convex action
      const fileExtension = audioUri.split('.').pop() || 'm4a';
      const mimeType = fileExtension === 'wav' ? 'audio/wav' : 'audio/m4a';
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const result = await transcribeAudio({
        audioBase64,
        mimeType,
        fileName: `recording.${fileExtension}`,
        model: 'whisper-1',
      });

      if (result.text) {
        setInput(result.text);
        // Only auto-send if requested (when user presses send button)
        if (autoSend) {
          handleSend(result.text);
        }
      } else {
        console.error('Transcription failed:', result.error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setIsLoading(false);
    }
  };

  const handleVoicePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isRecording) {
      await stopAndSendRecording();
    } else {
      await startRecording();
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || !user || isLoading) return;

    setInput('');
    setShowWelcome(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Note: User message is saved server-side by the Convex action

    const searchingMessage: Message = {
      id: 'searching',
      content: '',
      sender: 'nora',
      timestamp: new Date().toISOString(),
      isSearching: true,
      searchSteps: deepThink
        ? [
            'Analyzing your question deeply...',
            'Researching comprehensive sources...',
            'Cross-referencing information...',
            'Building detailed response...',
          ]
        : ['Understanding your question...', 'Finding relevant information...', 'Preparing response...'],
    };
    setMessages((prev) => [...prev, searchingMessage]);
    setIsLoading(true);

    try {
      // Call Nora via Convex action
      const data = await sendNoraChatMessage({
        message: messageText,
        thinkingMode: deepThink ? 'deep' : 'fast',
        pdfContext: selectedPdf ? { title: selectedPdf.title, file_path: selectedPdf.file_path } : null,
      });

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== 'searching');
        const noraMessage: Message = {
          id: Date.now().toString(),
          content: data.response || "I'm here to help! What would you like to know?",
          sender: 'nora',
          timestamp: new Date().toISOString(),
          sources: selectedPdf
            ? [{ title: selectedPdf.title, type: 'document' }]
            : [{ title: 'Study Assistant', type: 'memory' }],
        };
        return [...filtered, noraMessage];
      });

      // Note: Nora's response is saved server-side by the Convex action

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== 'searching');
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            content: "I'm having trouble connecting. Please try again.",
            sender: 'nora',
            timestamp: new Date().toISOString(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
      setSelectedPdf(null);
    }
  };

  const handleNewChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages([]);
    setShowWelcome(true);
    setInput('');
    setSelectedPdf(null);
  };

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Home');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return 'How can I help you this late night?';
    if (hour < 12) return 'Good morning! How can I help?';
    if (hour < 17) return 'Good afternoon! How can I help?';
    if (hour < 21) return 'Good evening! How can I help?';
    return 'How can I help you tonight?';
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar barStyle={theme.background === '#FFFFFF' ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.headerButton} onPress={handleGoHome}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
          <Text style={[styles.headerBackText, { color: theme.text }]}>Home</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Nora</Text>
        </View>

        <NoraSideNav
          items={navItems}
          activeItemId={activeNavItem}
          onItemSelect={handleNavItemSelect}
          onNewChat={handleNewChat}
          chatSessions={chatSessions}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
        />
      </View>

      {/* Project/Context indicator */}
      {selectedPdf && (
        <TouchableOpacity
          style={[styles.projectIndicator, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => setShowPdfPicker(true)}
        >
          <Ionicons name="document-text-outline" size={16} color={theme.text} />
          <Text style={[styles.projectText, { color: theme.text }]} numberOfLines={1}>
            {selectedPdf.title}
          </Text>
        </TouchableOpacity>
      )}

      {/* Main Content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          key={focusKey}
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {showWelcome ? (
            <View style={styles.welcomeContainer}>
              <Animated.View style={[styles.welcomeLogo, logoAnimatedStyle]}>
                <Text style={styles.welcomeEmoji}>✳️</Text>
              </Animated.View>

              <Animated.Text
                entering={FadeIn.delay(100).duration(300)}
                style={[styles.welcomeTitle, { color: theme.text }]}
              >
                {getGreeting()}
              </Animated.Text>

              <View style={styles.quickActions}>
                {QUICK_ACTIONS.map((action, index) => (
                  <QuickActionCard
                    key={action.id}
                    action={action}
                    index={index}
                    theme={theme}
                    onPress={() => handleSend(action.text)}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.messagesContainer}>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} theme={theme} isDeepThink={deepThink} isDark={theme.isDark ?? false} />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputArea, { backgroundColor: theme.background }]}>
          <Animated.View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }, inputContainerAnimatedStyle]}>
            {/* Circular reveal recording overlay - positioned behind everything */}
            <Animated.View
              style={[
                styles.recordingRevealOverlay,
                { backgroundColor: theme.primary + '15' },
                revealAnimatedStyle,
              ]}
              pointerEvents={isRecording ? 'auto' : 'none'}
            >
              {isRecording && (
                <InlineVoiceBar
                  amplitude={voiceAmplitude}
                  duration={recordingDuration}
                  themeColor={theme.primary}
                />
              )}
            </Animated.View>

            {/* Text input - hidden during recording */}
            {!isRecording && (
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Chat with Nora"
                placeholderTextColor={theme.textSecondary}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={1000}
              />
            )}

            {/* Bottom row with icons */}
            <View style={styles.inputIconsRow}>
              {isRecording ? (
                <>
                  {/* Cancel button - animated with scale/opacity instead of layout animation */}
                  <Animated.View style={cancelButtonAnimatedStyle}>
                    <TouchableOpacity
                      style={styles.inputIconButton}
                      onPress={cancelRecording}
                    >
                      <Ionicons name="close" size={22} color={theme.error || '#FF6B6B'} />
                    </TouchableOpacity>
                  </Animated.View>
                  <View style={{ flex: 1 }} />
                </>
              ) : (
                <>
                  {/* Plus button for PDFs */}
                  <TouchableOpacity style={styles.inputIconButton} onPress={() => setShowPdfPicker(true)}>
                    <Ionicons name="add" size={22} color={theme.textSecondary} />
                  </TouchableOpacity>

                  {/* Deep Think toggle with glow effect */}
                  <View style={styles.deepThinkWrapper}>
                    {/* Glow layer */}
                    <Animated.View
                      style={[
                        styles.deepThinkGlow,
                        { backgroundColor: '#FF6B6B' },
                        deepThinkGlowStyle,
                      ]}
                    />
                    <TouchableOpacity
                      style={[styles.inputIconButton, deepThink && styles.deepThinkActiveButton]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDeepThink(!deepThink);
                      }}
                    >
                      <Ionicons
                        name={deepThink ? 'flash' : 'flash-outline'}
                        size={20}
                        color={deepThink ? '#FF6B6B' : theme.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }} />
                </>
              )}

              {/* Rotating Mic/Checkmark/Send button with animations */}
              {input.trim() && !isRecording ? (
                <View style={styles.sendButtonWrapper}>
                  {/* Glow layer behind send button */}
                  <Animated.View
                    style={[
                      styles.sendButtonGlow,
                      { backgroundColor: theme.text },
                      sendButtonGlowStyle,
                    ]}
                  />
                  <Animated.View style={sendButtonAnimatedStyle}>
                    <TouchableOpacity
                      style={[styles.sendIconButton, { backgroundColor: theme.text }]}
                      onPress={() => handleSend()}
                      disabled={isLoading}
                    >
                      <Ionicons name="arrow-up" size={18} color={theme.background} />
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.sendIconButton, { backgroundColor: theme.primary }]}
                  onPress={isRecording ? stopAndTranscribe : handleVoicePress}
                  activeOpacity={0.8}
                >
                  {/* Rotating icon container */}
                  <View style={styles.rotatingIconContainer}>
                    {/* Mic icon - rotates out when recording */}
                    <Animated.View style={[styles.rotatingIcon, micRotationStyle]}>
                      <Ionicons name="mic" size={18} color="#FFFFFF" />
                    </Animated.View>
                    {/* Checkmark icon - rotates in when recording */}
                    <Animated.View style={[styles.rotatingIcon, styles.rotatingIconAbsolute, checkmarkRotationStyle]}>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    </Animated.View>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <PDFPickerModal
        visible={showPdfPicker}
        onClose={() => setShowPdfPicker(false)}
        pdfs={uploadedPdfs}
        onSelect={setSelectedPdf}
        theme={theme}
      />
    </SafeAreaView>
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
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 0,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
  },
  headerBackText: {
    fontSize: 17,
    marginLeft: 2,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  projectIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 6,
  },
  projectText: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 200,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  welcomeLogo: {
    marginBottom: 24,
  },
  welcomeEmoji: {
    fontSize: 56,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  quickActions: {
    width: '100%',
    gap: 10,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  messagesContainer: {
    paddingTop: 12,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userBubbleContainer: {
    justifyContent: 'flex-end',
  },
  noraBubbleContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  noraAvatarSmall: {
    marginRight: 8,
    marginTop: 2,
  },
  noraAvatarGradient: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    padding: 12,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  noraBubble: {
    borderBottomLeftRadius: 4,
  },
  thinkingContainer: {
    // No bubble - just the text floating naturally
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  noraMessageText: {},
  searchingContainer: {
    paddingVertical: 4,
  },
  searchingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchingDots: {
    flexDirection: 'row',
    marginRight: 10,
  },
  searchingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  searchingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  sourcesContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  sourcesTitle: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sourceText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
  // Liquid Glass Source Styles
  liquidSourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  liquidSourceWrapper: {
    alignItems: 'center',
    width: 52,
  },
  liquidSourceGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: 10,
    borderRadius: 22,
  },
  liquidSourceOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  liquidSourceBlur: {
    flex: 1,
  },
  liquidSourceGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liquidSourceLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  // Simple Source Styles (No Reanimated)
  simpleSourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  simpleSourceWrapper: {
    alignItems: 'center',
    width: 52,
  },
  simpleSourceBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleSourceLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 50,
  },
  // Thinking Bubble Container
  thinkingBubbleContainer: {
    flex: 1,
    maxWidth: '85%',
  },
  inputArea: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
  },
  inputContainer: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    borderWidth: 1,
  },
  textInput: {
    fontSize: 16,
    minHeight: 20,
    maxHeight: 100,
    marginBottom: 6,
  },
  inputIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputIconButton: {
    padding: 6,
  },
  deepThinkActiveButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 12,
  },
  sendIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Deep Think button glow effect
  deepThinkWrapper: {
    position: 'relative',
  },
  deepThinkGlow: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    top: 0,
    left: 0,
  },
  // Send button glow effect
  sendButtonWrapper: {
    position: 'relative',
  },
  sendButtonGlow: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  // Inline Voice Recording - Apple-style circular reveal
  recordingRevealOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    transformOrigin: 'right bottom', // Expand from mic button position
    overflow: 'hidden',
  },
  // Legacy - keep for backward compatibility
  recordingOverlay: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    minHeight: 50,
  },
  // Rotating icon for mic/checkmark transition
  rotatingIconContainer: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingIconAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineVoiceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  inlineWaveContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    gap: 2,
  },
  voiceWaveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  inlineDuration: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'left',
  },
  // PDF modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfModal: {
    width: width * 0.85,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pdfModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  pdfModalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  pdfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  pdfName: {
    flex: 1,
    fontSize: 14,
  },
  emptyPdfs: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default NoraScreenNew;

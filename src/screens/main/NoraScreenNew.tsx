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

import React, { useState, useEffect, useRef } from "react";
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
  Image,
  Linking,
  Alert,
  InteractionManager,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  sendNoraChatMessage,
  transcribeAudio as convexTranscribeAudio,
} from "../../utils/convexAIChatService";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from "expo-haptics";
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
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import {
  NoraSideNav,
  NavItem,
  ChatSession,
} from "../../components/NoraSideNav";
import { useFocusAnimationKey } from "../../utils/animationUtils";
import { NoraThinkingAnimation } from "../../components/NoraThinkingAnimation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  useNoraSessions,
  useNoraSessionMessages,
} from "../../hooks/useNoraSessions";
import NoraOnboarding from "../../components/NoraOnboarding";
import * as FileSystem from "expo-file-system/legacy";
import Markdown from "react-native-markdown-display";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

// Types
interface Message {
  id: string;
  content: string;
  sender: "user" | "nora";
  timestamp: string;
  sources?: Source[];
  isSearching?: boolean;
  searchSteps?: string[];
  isNew?: boolean;
  mode?: "auto" | "quick" | "deep" | "research";
}

interface Source {
  title: string;
  url?: string;
  type: "web" | "document" | "memory";
}

// ChatSession is imported from NoraSideNav

// Quick Action Suggestions
const QUICK_ACTIONS = [
  { id: "1", text: "Help me study for my exam", icon: "school-outline" },
  {
    id: "2",
    text: "Create a study plan for this week",
    icon: "calendar-outline",
  },
  { id: "3", text: "Learn something new", icon: "bulb-outline" },
  { id: "4", text: "Quiz me on what I learned", icon: "help-circle-outline" },
];

// Topic categories for the "Learn something new" chip — keeps OpenAI from
// returning the same concept twice in a session.
const LEARN_CATEGORIES = [
  "biology",
  "philosophy",
  "history",
  "mathematics",
  "physics",
  "language and linguistics",
  "visual art",
  "technology",
  "psychology",
  "finance and economics",
  "astronomy",
  "music theory",
  "chemistry",
];

const LEARN_RECENT_TOPICS_KEY = "@nora_recent_learn_topics";

async function buildLearnPrompt(): Promise<string> {
  let recent: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(LEARN_RECENT_TOPICS_KEY);
    if (raw) recent = JSON.parse(raw);
  } catch {}
  const seedCategory =
    LEARN_CATEGORIES[Math.floor(Math.random() * LEARN_CATEGORIES.length)];
  const exclusion = recent.length
    ? ` Do NOT pick any of these recently-shown topics: ${recent.join("; ")}.`
    : "";
  return (
    `Pick one fascinating concept from ${seedCategory} (or a related field if you prefer).` +
    `${exclusion} ` +
    `Teach me the concept in 3 short paragraphs: (1) what it is, (2) why it matters or how it works, (3) one surprising example. ` +
    `End with the topic name on its own line prefixed with "TOPIC: " so I can track it.`
  );
}

async function recordLearnTopic(noraResponse: string): Promise<void> {
  try {
    const match = noraResponse.match(/TOPIC:\s*(.+)/i);
    if (!match) return;
    const topic = match[1].trim().slice(0, 80);
    const raw = await AsyncStorage.getItem(LEARN_RECENT_TOPICS_KEY);
    const recent: string[] = raw ? JSON.parse(raw) : [];
    const next = [topic, ...recent.filter((t) => t !== topic)].slice(0, 10);
    await AsyncStorage.setItem(LEARN_RECENT_TOPICS_KEY, JSON.stringify(next));
  } catch {}
}

// Markdown styles are created per-theme in the component below

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
}> = ({
  index,
  amplitude,
  isActive,
  color = "rgba(255,255,255,0.7)",
  totalBars = 24,
}) => {
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
      const targetHeight =
        amplitude > 0.03
          ? Math.min(baseHeight + amplitude * variation * 1.2, 0.95)
          : baseHeight + variation * 0.05; // Subtle idle animation

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
      style={[styles.voiceWaveBar, animatedStyle, { backgroundColor: color }]}
    />
  );
};

// ============================================
// SEARCHING INDICATOR - Simplified (not currently used)
// ============================================
const SearchingIndicator: React.FC<{ steps: string[]; theme: any }> = ({
  steps,
  theme,
}) => {
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
                {
                  backgroundColor: theme.primary,
                  opacity: i === currentStep % 3 ? 1 : 0.3,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.searchingText, { color: theme.textSecondary }]}>
          {steps[currentStep] || "Thinking..."}
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
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.inlineVoiceBar}>
      {/* Duration on left side to avoid being hidden by button */}
      <Text style={[styles.inlineDuration, { color: themeColor }]}>
        {formatDuration(duration)}
      </Text>
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
// STREAMING MARKDOWN - Typing animation for AI responses
// ============================================
const StreamingMarkdown: React.FC<{
  content: string;
  isNew: boolean;
  markdownStyle: any;
  onComplete?: () => void;
}> = ({ content, isNew, markdownStyle, onComplete }) => {
  const [displayedContent, setDisplayedContent] = useState(
    isNew ? "" : content,
  );
  const indexRef = useRef(isNew ? 0 : content.length);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isNew || !content) {
      setDisplayedContent(content);
      return;
    }

    indexRef.current = 0;
    setDisplayedContent("");

    intervalRef.current = setInterval(() => {
      indexRef.current += 3; // ~3 characters at a time for smooth feel
      if (indexRef.current >= content.length) {
        indexRef.current = content.length;
        setDisplayedContent(content);
        if (intervalRef.current) clearInterval(intervalRef.current);
        onComplete?.();
      } else {
        // Find the next word boundary to avoid splitting mid-word
        let end = indexRef.current;
        while (
          end < content.length &&
          content[end] !== " " &&
          content[end] !== "\n"
        ) {
          end++;
        }
        indexRef.current = end;
        setDisplayedContent(content.slice(0, end));
      }
    }, 12);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [content, isNew]);

  if (!displayedContent) return null;

  return <Markdown style={markdownStyle}>{displayedContent}</Markdown>;
};

// ============================================
// SOURCE CITATION - Modern AI-style with favicons
// ============================================
const getDomain = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace("www.", "");
  } catch {
    return url;
  }
};

// Individual source row inside the expanded panel
const SourceRow: React.FC<{
  source: Source;
  index: number;
  theme: any;
  isDark: boolean;
}> = ({ source, index, theme, isDark }) => {
  const domain = source.url ? getDomain(source.url) : "";
  const faviconUrl = source.url
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    : "";

  const handlePress = () => {
    if (source.url) {
      Linking.openURL(source.url).catch(() => {});
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.sourceRow,
        {
          borderBottomColor: isDark
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.06)",
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {source.url ? (
        <Image
          source={{ uri: faviconUrl }}
          style={styles.sourceRowFavicon}
          defaultSource={require("../../../assets/icon.png")}
        />
      ) : (
        <View
          style={[
            styles.sourceRowFaviconFallback,
            { backgroundColor: theme.primary + "20" },
          ]}
        >
          <Ionicons
            name={source.type === "document" ? "document-text" : "sparkles"}
            size={14}
            color={theme.primary}
          />
        </View>
      )}
      <View style={styles.sourceRowText}>
        <Text
          style={[styles.sourceRowTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {source.title || domain}
        </Text>
        {source.url && (
          <Text
            style={[styles.sourceRowDomain, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {domain}
          </Text>
        )}
      </View>
      {source.url && (
        <Ionicons name="open-outline" size={14} color={theme.textSecondary} />
      )}
    </TouchableOpacity>
  );
};

// Bottom-sheet sources popup (like Claude/ChatGPT)
const SourceCitation: React.FC<{
  sources: Source[];
  theme: any;
  isDark?: boolean;
}> = ({ sources, theme, isDark = true }) => {
  const [showSheet, setShowSheet] = useState(false);

  if (!sources || sources.length === 0) return null;

  // Get up to 4 unique favicon URLs for the pill preview
  const webSources = sources.filter((s) => s.url);
  const previewFavicons = webSources.slice(0, 4).map((s) => ({
    url: `https://www.google.com/s2/favicons?domain=${getDomain(s.url!)}&sz=64`,
    domain: getDomain(s.url!),
  }));

  const glassBackground = isDark
    ? "rgba(255,255,255,0.06)"
    : "rgba(0,0,0,0.03)";
  const glassBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  return (
    <View style={styles.sourcesContainer}>
      {/* Pill: tap to open bottom sheet */}
      <TouchableOpacity
        style={[
          styles.sourcesCollapsedBar,
          {
            backgroundColor: glassBackground,
            borderColor: glassBorder,
            shadowColor: "#7B61FF",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.15 : 0.08,
            shadowRadius: 8,
            elevation: 2,
          },
        ]}
        onPress={() => setShowSheet(true)}
        activeOpacity={0.7}
      >
        <View style={styles.sourcesCollapsedLeft}>
          {/* Stacked favicon circles or Nora icon fallback */}
          <View style={styles.faviconStack}>
            {previewFavicons.length > 0 ? (
              previewFavicons.map((fav, i) => (
                <Image
                  key={fav.domain + i}
                  source={{ uri: fav.url }}
                  style={[
                    styles.faviconStackIcon,
                    {
                      marginLeft: i === 0 ? 0 : -6,
                      zIndex: previewFavicons.length - i,
                      borderColor: isDark ? "#1a1a2e" : "#f5f5f5",
                    },
                  ]}
                  defaultSource={require("../../../assets/icon.png")}
                />
              ))
            ) : (
              <View
                style={[
                  styles.faviconStackIcon,
                  {
                    backgroundColor: "#7B61FF20",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                <Ionicons name="sparkles" size={14} color="#7B61FF" />
              </View>
            )}
          </View>
          <Text style={[styles.sourcesCollapsedLabel, { color: theme.text }]}>
            {webSources.length > 0
              ? `${sources.length} ${sources.length === 1 ? "Source" : "Sources"}`
              : "Sources"}
          </Text>
        </View>
        <Ionicons name="chevron-up" size={16} color={theme.textSecondary} />
      </TouchableOpacity>

      {/* Bottom sheet modal */}
      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSheet(false)}
      >
        <TouchableOpacity
          style={styles.sourcesSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowSheet(false)}
        >
          <View onStartShouldSetResponder={() => true}>
            <View
              style={[
                styles.sourcesSheetContainer,
                { backgroundColor: isDark ? "#1a1a2e" : "#FFFFFF" },
              ]}
            >
              {/* Handle bar */}
              <View style={styles.sourcesSheetHandle}>
                <View
                  style={[
                    styles.sourcesSheetHandleBar,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.15)",
                    },
                  ]}
                />
              </View>

              {/* Header */}
              <View style={styles.sourcesSheetHeader}>
                <Text style={[styles.sourcesSheetTitle, { color: theme.text }]}>
                  {sources.length} {sources.length === 1 ? "Source" : "Sources"}
                </Text>
                <TouchableOpacity onPress={() => setShowSheet(false)}>
                  <Ionicons
                    name="close-circle"
                    size={26}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Source list */}
              <ScrollView style={styles.sourcesSheetList} bounces={false}>
                {sources.map((source, index) => (
                  <SourceRow
                    key={index}
                    source={source}
                    index={index}
                    theme={theme}
                    isDark={isDark}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ============================================
// MESSAGE BUBBLE
// ============================================
const MessageBubble: React.FC<{
  message: Message;
  theme: any;
  isDark: boolean;
}> = ({ message, theme, isDark }) => {
  const isUser = message.sender === "user";

  // Mode-specific avatar: icon and gradient colors match the mode used
  const mode = message.mode || "auto";
  const modeAvatarConfig: Record<
    string,
    { colors: [string, string]; icon: keyof typeof Ionicons.glyphMap }
  > = {
    auto: { colors: ["#7B61FF", "#9D4EDD"], icon: "sparkles" },
    quick: { colors: ["#7B61FF", "#9D4EDD"], icon: "flash" },
    research: { colors: ["#4ECDC4", "#2AB7A9"], icon: "globe-outline" },
    deep: { colors: ["#FF6B6B", "#FF8E53"], icon: "glasses-outline" },
  };
  const avatarConfig = modeAvatarConfig[mode] || modeAvatarConfig.auto;

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
            colors={avatarConfig.colors}
            style={styles.noraAvatarGradient}
          >
            <Ionicons name={avatarConfig.icon} size={14} color="#FFFFFF" />
          </LinearGradient>
        </View>
      )}
      {message.isSearching ? (
        <View style={styles.thinkingContainer}>
          <NoraThinkingAnimation
            steps={
              message.searchSteps || [
                "Thinking...",
                "Analyzing...",
                "Preparing response...",
              ]
            }
            isDark={isDark}
            textColor={theme.textSecondary}
            shineColor={isDark ? "#C0CDD8" : "#8A9DB0"}
          />
        </View>
      ) : isUser ? (
        <View
          style={[
            styles.messageBubble,
            styles.userBubble,
            { backgroundColor: theme.primary },
          ]}
        >
          <Text style={[styles.messageText, styles.userMessageText]}>
            {message.content}
          </Text>
        </View>
      ) : (
        <View style={styles.noraResponseContainer}>
          <StreamingMarkdown
            content={message.content}
            isNew={!!message.isNew}
            markdownStyle={{
              body: { color: theme.text, fontSize: 16, lineHeight: 26 },
              heading1: {
                color: theme.text,
                fontSize: 24,
                fontWeight: "700" as const,
                lineHeight: 32,
                marginBottom: 12,
                marginTop: 20,
              },
              heading2: {
                color: theme.text,
                fontSize: 20,
                fontWeight: "700" as const,
                lineHeight: 28,
                marginBottom: 8,
                marginTop: 18,
              },
              heading3: {
                color: theme.text,
                fontSize: 17,
                fontWeight: "600" as const,
                lineHeight: 24,
                marginBottom: 6,
                marginTop: 14,
              },
              strong: { fontWeight: "700" as const, color: theme.text },
              em: { fontStyle: "italic" as const },
              bullet_list: { marginBottom: 12, marginTop: 4 },
              ordered_list: { marginBottom: 12, marginTop: 4 },
              list_item: { marginBottom: 6 },
              code_block: {
                backgroundColor: isDark ? "#1a1a2e" : "#f5f5f5",
                borderRadius: 10,
                padding: 14,
                fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                fontSize: 14,
                lineHeight: 20,
                marginVertical: 10,
              },
              code_inline: {
                backgroundColor: isDark ? "#1a1a2e" : "#f0f0f0",
                borderRadius: 5,
                paddingHorizontal: 6,
                paddingVertical: 2,
                fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                fontSize: 14,
              },
              blockquote: {
                borderLeftWidth: 3,
                borderLeftColor: theme.primary,
                paddingLeft: 14,
                marginVertical: 10,
              },
              link: {
                color: theme.primary,
                textDecorationLine: "underline" as const,
              },
              paragraph: { marginBottom: 12 },
              hr: {
                backgroundColor: theme.text + "20",
                height: 1,
                marginVertical: 16,
              },
            }}
          />
          {message.sources && message.sources.length > 0 && (
            <SourceCitation
              sources={message.sources}
              theme={theme}
              isDark={isDark}
            />
          )}
        </View>
      )}
    </View>
  );
};

// ============================================
// QUICK ACTION CARD
// ============================================
const QuickActionCard: React.FC<{
  action: (typeof QUICK_ACTIONS)[0];
  onPress: () => void;
  index: number;
  theme: any;
}> = ({ action, onPress, index, theme }) => {
  return (
    <Animated.View entering={FadeIn.delay(100 + index * 60).duration(300)}>
      <TouchableOpacity
        style={[
          styles.quickActionCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.quickActionIcon,
            { backgroundColor: theme.primary + "15" },
          ]}
        >
          <Ionicons name={action.icon as any} size={20} color={theme.primary} />
        </View>
        <Text style={[styles.quickActionText, { color: theme.text }]}>
          {action.text}
        </Text>
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
}> = React.memo(({ visible, onClose, pdfs, onSelect, theme }) => {
  // Let Modal own the show/hide animation. Drop the inner FadeInUp so we don't
  // double-animate (which is what caused the "flash" on open).
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.pdfModal, { backgroundColor: theme.background }]}>
          <View
            style={[styles.pdfModalHeader, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.pdfModalTitle, { color: theme.text }]}>
              Attach PDF
            </Text>
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
                <Ionicons
                  name="document-text"
                  size={24}
                  color={theme.primary}
                />
                <Text
                  style={[styles.pdfName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {item.title || item.name}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyPdfs}>
                <Text
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  No PDFs in your library
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
});
PDFPickerModal.displayName = "PDFPickerModal";

// ============================================
// MAIN COMPONENT
// ============================================
const NoraScreenNew: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Force animations to replay on every screen focus
  const focusKey = useFocusAnimationKey();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [thinkingMode, setThinkingMode] = useState<
    "auto" | "quick" | "deep" | "research"
  >("quick");
  const [showPdfPicker, setShowPdfPicker] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  // Live ebook list — replaces the local `uploadedPdfs` state with a Convex query.
  const ebooks = useQuery(api.ebooks.listForCurrentUser, {});
  const uploadedPdfs = (ebooks ?? []).map((e: any) => ({
    id: e._id,
    title: e.title,
    file_path: e.storageId,
    vectorStoreId: e.vectorStoreId,
    status: e.status,
  }));
  const [selectedPdf, setSelectedPdf] = useState<any>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);
  const [activeNavItem, setActiveNavItem] = useState<string>("chat");

  // Session management
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Hooks
  const {
    sessions: noraSessions,
    groupedSessions,
    createSession,
    deleteSession: deleteNoraSess,
    requestTitleGeneration,
  } = useNoraSessions();
  const { messages: sessionMessages, isLoading: isLoadingSession } =
    useNoraSessionMessages(currentSessionId);

  // Onboarding status
  const onboardingStatus = useQuery(api.noraOnboarding.getStatus);

  // Navigation items for side nav (New Chat is handled by the green button, not in nav items)
  const navItems: NavItem[] = [
    { id: "pdf", label: "PDF Reader", icon: "document-text-outline" },
    { id: "focus", label: "Focus Timer", icon: "timer-outline" },
    { id: "progress", label: "Progress Tracker", icon: "trophy-outline" },
  ];

  const handleNavItemSelect = (itemId: string) => {
    setActiveNavItem(itemId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (itemId) {
      case "pdf":
        setShowPdfPicker(true);
        break;
      case "focus":
        navigation.navigate("FocusPreparation" as never);
        break;
      case "progress":
        navigation.navigate("Main" as never, { screen: "Results" });
        break;
    }
  };

  // Handle selecting a chat session from the side nav
  const handleSelectSession = (session: ChatSession) => {
    isRestoringSession.current = true;
    setCurrentSessionId(session.id);
    setMessages([]); // Clear while loading
    setShowWelcome(false);
  };

  // Handle deleting a chat session
  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    try {
      await deleteNoraSess(sessionId);

      // If we deleted the current session, reset to welcome
      if (sessionId === currentSessionId) {
        setMessages([]);
        setShowWelcome(true);
        setCurrentSessionId(null);
      }
    } catch {}
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

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    logoScale.value = withSpring(1, { damping: 15 });
    loadChatHistory();
    loadPdfs();
    // Check onboarding status
    // Will be handled reactively via onboardingStatus query

    // Reset audio system on mount to clear any orphaned recordings
    const resetAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      } catch {}
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

  // Load messages from Convex when a prior session is selected
  const isRestoringSession = useRef(false);
  useEffect(() => {
    if (isRestoringSession.current && sessionMessages.length > 0) {
      const loaded: Message[] = sessionMessages.map((m: any) => ({
        id: m._id,
        content: m.content,
        sender: m.role === "user" ? "user" : "nora",
        timestamp: m._creationTime
          ? new Date(m._creationTime).toISOString()
          : new Date().toISOString(),
      }));
      setMessages(loaded);
      isRestoringSession.current = false;
    }
  }, [sessionMessages]);

  // Enforce onboarding
  useEffect(() => {
    if (
      onboardingStatus !== undefined &&
      !onboardingStatus?.hasAcceptedPolicies
    ) {
      setShowOnboarding(true);
    }
  }, [onboardingStatus]);

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
      cancelButtonOpacity.value = withDelay(
        100,
        withTiming(1, { duration: 200 }),
      );
      cancelButtonScale.value = withDelay(
        100,
        withSpring(1, { damping: 15, stiffness: 200 }),
      );
      // Input container subtle pulse
      inputContainerScale.value = withSequence(
        withSpring(1.02, { damping: 15, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 200 }),
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
        withSpring(1, { damping: 12, stiffness: 200 }),
      );
      sendButtonGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      );
    } else {
      sendButtonScale.value = withSpring(1, { damping: 15 });
      sendButtonGlow.value = withTiming(0, { duration: 200 });
    }
  }, [input]);

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
    transform: [
      { scale: interpolate(checkmarkRotation.value, [0, 1], [0.8, 1]) },
    ],
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

  const loadChatHistory = async () => {
    // Chat history is now managed by Convex via useNoraSessions hook
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
      preview: msgs[0]?.content || "",
      messages: msgs.map((m) => ({
        id: m.id,
        content: m.content,
        sender: m.sender,
        timestamp: m.timestamp,
      })),
    }));
  };

  const loadPdfs = async () => {
    // PDFs are now loaded reactively via the ebooks Convex query
  };

  // Voice recording with Whisper
  const isStartingRecording = useRef(false);

  const startRecording = async () => {
    // Prevent concurrent recording starts
    if (isStartingRecording.current) {
      return;
    }

    isStartingRecording.current = true;

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        isStartingRecording.current = false;
        return;
      }

      // Aggressively clean up any existing recording first
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {}
        recordingRef.current = null;
        setRecording(null);
      }

      // Disable recording mode first to force release any system resources
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      // Small delay to ensure cleanup completes
      await new Promise((resolve) => setTimeout(resolve, 150));

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
        if (prepareError.message?.includes("Only one Recording")) {
          try {
            await newRecording.stopAndUnloadAsync();
          } catch (e) {}

          // Wait a bit longer
          await new Promise((resolve) => setTimeout(resolve, 300));

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
    } catch {
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
    } catch {
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
    } catch {
      recordingRef.current = null;
      setRecording(null);
      setRecordingDuration(0);
    }
  };

  const transcribeAudio = async (
    audioUri: string,
    autoSend: boolean = true,
  ) => {
    try {
      // Only show loading if we're going to auto-send
      if (autoSend) {
        setIsLoading(true);
      }

      // Read audio file as base64 for Convex action
      const fileExtension = audioUri.split(".").pop() || "m4a";
      const mimeType = fileExtension === "wav" ? "audio/wav" : "audio/m4a";
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: "base64",
      });

      const result = await convexTranscribeAudio({
        audioBase64,
        mimeType,
        fileName: `recording.${fileExtension}`,
        model: "whisper-1",
      });

      if (result.text) {
        setInput(result.text);
        // Only auto-send if requested (when user presses send button)
        if (autoSend) {
          handleSend(result.text);
        }
      } else {
        Alert.alert(
          "Voice Error",
          "Could not transcribe your audio. Please type your message instead or try again.",
        );
        setIsLoading(false);
      }
    } catch {
      Alert.alert(
        "Voice Error",
        "Something went wrong with voice input. Please type your message instead.",
      );
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

  const handleSend = async (
    text?: string,
    displayText?: string,
    modeOverride?: "auto" | "quick" | "deep" | "research",
  ) => {
    const messageText = text || input.trim();
    if (!messageText || !user || isLoading) {
      return;
    }
    // Quick Action chips always use Quick mode for the fastest response, even if the
    // user has previously toggled into Deep/Research.
    const effectiveThinkingMode = modeOverride ?? thinkingMode;

    // Block if onboarding not complete
    if (!onboardingStatus?.hasAcceptedPolicies) {
      setShowOnboarding(true);
      return;
    }

    setInput("");
    setShowWelcome(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: Message = {
      id: Date.now().toString(),
      // Show the friendly chip label in the bubble; send the full prompt to Nora.
      content: displayText ?? messageText,
      sender: "user",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const thinkingSteps: Record<string, string[]> = {
      auto: [
        "Analyzing your request...",
        "Choosing the best approach...",
        "Searching for sources...",
        "Working on it...",
      ],
      quick: ["Preparing response..."],
      deep: [
        "Analyzing in depth...",
        "Searching for authoritative sources...",
        "Cross-referencing research...",
        "Building comprehensive analysis...",
      ],
      research: [
        "Searching the web...",
        "Reading multiple sources...",
        "Cross-referencing data...",
        "Synthesizing findings...",
        "Preparing cited response...",
      ],
    };

    const searchingMessage: Message = {
      id: "searching",
      content: "",
      sender: "nora",
      timestamp: new Date().toISOString(),
      isSearching: true,
      searchSteps: thinkingSteps[effectiveThinkingMode] || thinkingSteps.quick,
      mode: effectiveThinkingMode,
    };
    setMessages((prev) => [...prev, searchingMessage]);
    setIsLoading(true);

    try {
      const data = await sendNoraChatMessage({
        message: messageText,
        thinkingMode: effectiveThinkingMode,
        sessionId: currentSessionId || undefined,
        pdfContext: selectedPdf
          ? { title: selectedPdf.title, file_path: selectedPdf.file_path }
          : null,
        vectorStoreId: selectedPdf?.vectorStoreId,
      });

      // Store the session ID returned from the backend
      if (data.sessionId && !currentSessionId) {
        setCurrentSessionId(data.sessionId);
        // Request title generation for new sessions after first exchange
        requestTitleGeneration(data.sessionId);
      }

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== "searching");

        // Build sources: prefer API-returned web sources, fall back to context-based, then Nora's knowledge
        let messageSources: Source[] = [];
        if (data.sources && data.sources.length > 0) {
          messageSources = data.sources.map((s: any) => ({
            title: s.title,
            url: s.url,
            type: "web" as const,
          }));
        } else if (selectedPdf) {
          messageSources = [{ title: selectedPdf.title, type: "document" }];
        }

        const responseText =
          data.response || "I'm here to help! What would you like to know?";
        const noraMessage: Message = {
          id: Date.now().toString(),
          // Strip the "TOPIC: …" trailer we ask for in the Learn-something-new prompt.
          content: responseText.replace(/\n?TOPIC:\s*.+$/i, "").trim(),
          sender: "nora",
          timestamp: new Date().toISOString(),
          sources: messageSources.length > 0 ? messageSources : undefined,
          isNew: true,
          mode: effectiveThinkingMode,
        };
        return [...filtered, noraMessage];
      });

      // Track the topic from a Learn-something-new response so we don't repeat it.
      if (displayText === "Learn something new" && data.response) {
        recordLearnTopic(data.response);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== "searching");
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            content: "I'm having trouble connecting. Please try again.",
            sender: "nora",
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
    isRestoringSession.current = false;
    setMessages([]);
    setShowWelcome(true);
    setInput("");
    setSelectedPdf(null);
    setCurrentSessionId(null);
  };

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Home");
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "How can I help you this late night?";
    if (hour < 12) return "Good morning! How can I help?";
    if (hour < 17) return "Good afternoon! How can I help?";
    if (hour < 21) return "Good evening! How can I help?";
    return "How can I help you tonight?";
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={
          theme.background === "#FFFFFF" ? "dark-content" : "light-content"
        }
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.headerButton} onPress={handleGoHome}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
          <Text style={[styles.headerBackText, { color: theme.text }]}>
            Home
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Nora</Text>
        </View>

        <NoraSideNav
          items={navItems}
          activeItemId={activeNavItem}
          onItemSelect={handleNavItemSelect}
          onNewChat={handleNewChat}
          chatSessions={noraSessions.map((s) => ({
            id: s._id,
            date: new Date(s.lastMessageAt).toLocaleDateString(),
            preview: s.title,
            messages: [],
          }))}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
        />
      </View>

      {/* Project/Context indicator */}
      {selectedPdf && (
        <TouchableOpacity
          style={[
            styles.projectIndicator,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          onPress={() => setShowPdfPicker(true)}
        >
          <Ionicons name="document-text-outline" size={16} color={theme.text} />
          <Text
            style={[styles.projectText, { color: theme.text }]}
            numberOfLines={1}
          >
            {selectedPdf.title}
          </Text>
        </TouchableOpacity>
      )}

      {/* Main Content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                <LinearGradient
                  colors={["#7B61FF", "#9D4EDD"]}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="sparkles" size={28} color="#FFFFFF" />
                </LinearGradient>
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
                    onPress={async () => {
                      // Quick Actions always use Quick mode — this gives the fastest
                      // response and is what users expect from a one-tap suggestion.
                      if (action.id === "3") {
                        // The "Learn something new" chip sends a richer, deduplicated prompt.
                        const prompt = await buildLearnPrompt();
                        handleSend(prompt, action.text, "quick");
                      } else {
                        handleSend(action.text, undefined, "quick");
                      }
                    }}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.messagesContainer}>
              {isRestoringSession.current && messages.length === 0 && (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
                    Loading conversation...
                  </Text>
                </View>
              )}
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  theme={theme}
                  isDark={theme.isDark ?? false}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View
          style={[
            styles.inputArea,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 4),
            },
          ]}
        >
          <Animated.View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.card, borderColor: theme.border },
              inputContainerAnimatedStyle,
            ]}
          >
            {/* Show voice bar when recording, text input otherwise */}
            {isRecording ? (
              <View
                style={[
                  styles.recordingInlineContainer,
                  { backgroundColor: theme.primary + "10" },
                ]}
              >
                <InlineVoiceBar
                  amplitude={voiceAmplitude}
                  duration={recordingDuration}
                  themeColor={theme.primary}
                />
              </View>
            ) : (
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
                  {/* Cancel button */}
                  <Animated.View style={cancelButtonAnimatedStyle}>
                    <TouchableOpacity
                      style={[
                        styles.inputIconButton,
                        {
                          backgroundColor: (theme.error || "#FF6B6B") + "15",
                          borderRadius: 12,
                          padding: 8,
                        },
                      ]}
                      onPress={cancelRecording}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="close"
                        size={22}
                        color={theme.error || "#FF6B6B"}
                      />
                    </TouchableOpacity>
                  </Animated.View>
                  <View style={{ flex: 1 }} />
                </>
              ) : (
                <>
                  {/* Plus button for PDFs */}
                  <TouchableOpacity
                    style={styles.inputIconButton}
                    onPress={() => {
                      Haptics.selectionAsync();
                      // Defer mount so press-feedback animation completes first.
                      InteractionManager.runAfterInteractions(() =>
                        setShowPdfPicker(true),
                      );
                    }}
                  >
                    <Ionicons
                      name="add"
                      size={22}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Mode selector pills — Quick (default), Auto, Research (web), Deep (thorough) */}
                  {(["quick", "auto", "research", "deep"] as const).map(
                    (mode) => {
                      const modeConfig = {
                        quick: {
                          icon: "flash-outline" as const,
                          color: theme.textSecondary,
                          label: "Quick",
                        },
                        auto: {
                          icon: "sparkles-outline" as const,
                          color: "#7B61FF",
                          label: "Auto",
                        },
                        research: {
                          icon: "globe-outline" as const,
                          color: "#4ECDC4",
                          label: "Research",
                        },
                        deep: {
                          icon: "glasses-outline" as const,
                          color: "#FF6B6B",
                          label: "Deep",
                        },
                      };
                      const config = modeConfig[mode];
                      const isActive = thinkingMode === mode;
                      return (
                        <TouchableOpacity
                          key={mode}
                          style={[
                            styles.inputIconButton,
                            isActive && {
                              backgroundColor: config.color + "20",
                              borderRadius: 12,
                            },
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                            setThinkingMode(mode);
                          }}
                        >
                          <Ionicons
                            name={config.icon}
                            size={18}
                            color={
                              isActive ? config.color : theme.textSecondary
                            }
                          />
                        </TouchableOpacity>
                      );
                    },
                  )}
                  <View style={{ flex: 1 }} />
                </>
              )}

              {/* Mic button - always visible */}
              <TouchableOpacity
                style={[
                  styles.sendIconButton,
                  { backgroundColor: theme.primary + "15", marginRight: 6 },
                ]}
                onPress={isRecording ? stopAndTranscribe : handleVoicePress}
                activeOpacity={0.8}
              >
                {/* Rotating icon container */}
                <View style={styles.rotatingIconContainer}>
                  {/* Mic icon - rotates out when recording */}
                  <Animated.View
                    style={[styles.rotatingIcon, micRotationStyle]}
                  >
                    <Ionicons name="mic" size={18} color={theme.primary} />
                  </Animated.View>
                  {/* Checkmark icon - rotates in when recording */}
                  <Animated.View
                    style={[
                      styles.rotatingIcon,
                      styles.rotatingIconAbsolute,
                      checkmarkRotationStyle,
                    ]}
                  >
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={theme.primary}
                    />
                  </Animated.View>
                </View>
              </TouchableOpacity>

              {/* Send button - appears next to mic when text exists */}
              {input.trim() && !isRecording && (
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
                      style={[
                        styles.sendIconButton,
                        { backgroundColor: theme.text },
                      ]}
                      onPress={() => handleSend()}
                      disabled={isLoading}
                    >
                      <Ionicons
                        name="arrow-up"
                        size={18}
                        color={theme.background}
                      />
                    </TouchableOpacity>
                  </Animated.View>
                </View>
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

      {/* Nora Onboarding - Required for first-time users */}
      <NoraOnboarding
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onSkip={() => setShowOnboarding(false)}
        isFirstTime={!onboardingStatus?.hasAcceptedPolicies}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 0,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 10,
  },
  headerBackText: {
    fontSize: 17,
    marginLeft: 2,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  projectIndicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 6,
  },
  projectText: {
    fontSize: 13,
    fontWeight: "500",
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
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "600",
    marginBottom: 40,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  quickActions: {
    width: "100%",
    gap: 10,
  },
  quickActionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  quickActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  messagesContainer: {
    paddingTop: 12,
  },
  messageBubbleContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  userBubbleContainer: {
    justifyContent: "flex-end",
  },
  noraBubbleContainer: {
    justifyContent: "flex-start",
    alignItems: "flex-start",
    flex: 1,
  },
  noraAvatarSmall: {
    marginRight: 8,
    marginTop: 2,
  },
  noraAvatarGradient: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 18,
    padding: 12,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  noraBubble: {
    borderBottomLeftRadius: 4,
  },
  noraResponseContainer: {
    flex: 1,
    paddingVertical: 4,
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
    color: "#FFFFFF",
  },
  noraMessageText: {},
  searchingContainer: {
    paddingVertical: 4,
  },
  searchingContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchingDots: {
    flexDirection: "row",
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
    fontStyle: "italic",
  },
  sourcesContainer: {
    marginTop: 12,
  },
  // Collapsed bar (tap to expand)
  sourcesCollapsedBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  sourcesCollapsedLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sourcesCollapsedLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Stacked favicon circles (overlap effect)
  faviconStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  faviconStackIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  // Bottom sheet modal
  sourcesSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sourcesSheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.6,
    paddingBottom: 34, // safe area
  },
  sourcesSheetHandle: {
    alignItems: "center",
    paddingVertical: 10,
  },
  sourcesSheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sourcesSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sourcesSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sourcesSheetList: {
    paddingHorizontal: 6,
  },
  // Individual source row
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  sourceRowFavicon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  sourceRowFaviconFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceRowText: {
    flex: 1,
  },
  sourceRowTitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  sourceRowDomain: {
    fontSize: 12,
    marginTop: 2,
  },
  // Thinking Bubble Container
  thinkingBubbleContainer: {
    flex: 1,
    maxWidth: "85%",
  },
  inputArea: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  inputContainer: {
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderWidth: 1,
  },
  textInput: {
    fontSize: 16,
    minHeight: 44,
    maxHeight: 120,
    marginBottom: 8,
    lineHeight: 22,
  },
  recordingInlineContainer: {
    minHeight: 44,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: "center",
    marginBottom: 8,
  },
  inputIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inputIconButton: {
    padding: 6,
  },
  deepThinkActiveButton: {
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    borderRadius: 12,
  },
  sendIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  // Deep Think button glow effect
  deepThinkWrapper: {
    position: "relative",
  },
  deepThinkGlow: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    top: 0,
    left: 0,
  },
  // Send button glow effect
  sendButtonWrapper: {
    position: "relative",
  },
  sendButtonGlow: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  // Inline Voice Recording - Apple-style circular reveal
  recordingRevealOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    transformOrigin: "right bottom", // Expand from mic button position
    overflow: "hidden",
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
    alignItems: "center",
    justifyContent: "center",
  },
  rotatingIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  rotatingIconAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineVoiceBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  inlineWaveContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    gap: 2,
  },
  voiceWaveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  inlineDuration: {
    fontSize: 14,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "left",
  },
  // PDF modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  pdfModal: {
    width: width * 0.85,
    borderRadius: 16,
    overflow: "hidden",
  },
  pdfModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  pdfModalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  pdfItem: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
});

export default NoraScreenNew;

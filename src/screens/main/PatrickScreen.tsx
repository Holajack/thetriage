/**
 * Patrick AI Chat — the everyday study coach for Basic, Pro, and Elite members.
 *
 * Deliberately simpler than the Nora screen: no thinking modes, no PDF
 * attachments, no voice input. Patrick answers in plain text from gpt-4o-mini
 * (enforced server-side in convex/patrickChat.ts) and keeps a single rolling
 * conversation per user, hydrated from the patrickChat table.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, RouteProp } from "@react-navigation/native";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { sendPatrickChatMessage } from "../../utils/convexAIChatService";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from "expo-haptics";
import { AnimatedButton } from "../../components/premium/AnimatedButton";
import { ShimmerLoader } from "../../components/premium/ShimmerLoader";
import { usePulseAnimation } from "../../utils/animationUtils";
import Animated from "react-native-reanimated";

type RootStackParamList = {
  PatrickSpeak: {
    initialMessage?: string;
  };
};

type PatrickSpeakRouteProp = RouteProp<RootStackParamList, "PatrickSpeak">;

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "patrick";
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Help me plan today's study session",
  "How do I stop procrastinating?",
  "Give me a focus technique to try",
];

const LOW_MESSAGE_WARNING_THRESHOLD = 15;

export const PatrickSpeakScreen = ({
  route,
}: {
  route: PatrickSpeakRouteProp;
}) => {
  const { initialMessage } = route.params || {};
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(
    null,
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = usePulseAnimation(streaming);

  // Hydrate from Convex once; after that, local state stays authoritative
  // for the session (new messages are persisted server-side as they're sent).
  const history = useQuery(api.patrickChat.getMyHistory);
  const hasHydrated = useRef(false);
  useEffect(() => {
    if (hasHydrated.current || history === undefined) return;
    hasHydrated.current = true;
    setChat(
      history.map((m: any) => ({
        id: m._id,
        content: m.content,
        sender: m.role === "user" ? "user" : "patrick",
        timestamp: new Date(m._creationTime).toISOString(),
      })),
    );
    if (initialMessage) {
      handleSend(initialMessage);
    }
  }, [history]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [chat]);

  const goToPlans = () => {
    navigation.navigate("Main", {
      screen: "Content",
      params: { screen: "Subscription" },
    });
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || !user || streaming) return;

    const userMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      content: textToSend,
      sender: "user",
      timestamp: new Date().toISOString(),
    };
    setChat((prev) => [...prev, userMsg]);
    if (!messageText) setInput("");

    setStreaming(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const data = await sendPatrickChatMessage({ message: textToSend });
    setStreaming(false);

    if (typeof data.remaining_messages === "number") {
      setRemainingMessages(data.remaining_messages);
    }

    if (data.error === "ACCESS_DENIED" && data.upgrade_required) {
      Alert.alert(
        "Membership Required",
        data.response ||
          "Patrick is included with every HikeWise membership (Basic and above).",
        [
          { text: "Not Now", style: "cancel" },
          { text: "View Plans", onPress: goToPlans },
        ],
      );
    }

    const patrickMsg: ChatMessage = {
      id: `local-${Date.now()}-p`,
      content:
        data.response ||
        "I'm having some technical difficulties right now. Please try again in a moment!",
      sender: "patrick",
      timestamp: new Date().toISOString(),
    };
    setChat((prev) => [...prev, patrickMsg]);
    if (data.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const renderBubble = (msg: ChatMessage) => {
    const isUser = msg.sender === "user";
    return (
      <View
        key={msg.id}
        style={[
          styles.bubble,
          isUser
            ? { alignSelf: "flex-end", backgroundColor: "#E8F5E9" }
            : { alignSelf: "flex-start", backgroundColor: theme.card },
        ]}
      >
        <Text style={{ color: theme.text, fontSize: 16, lineHeight: 23 }}>
          {msg.content}
        </Text>
        <Text
          style={[styles.bubbleMeta, { textAlign: isUser ? "right" : "left" }]}
        >
          {isUser ? "You" : "Patrick"}
        </Text>
      </View>
    );
  };

  const showWelcome = chat.length === 0 && history !== undefined && !streaming;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.card }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Patrick</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 18, paddingBottom: 130 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {showWelcome ? (
            <View style={styles.welcome}>
              <Text style={[styles.welcomeTitle, { color: theme.text }]}>
                Hey! I'm Patrick, your study coach.
              </Text>
              <Text style={[styles.welcomeSub, { color: theme.textSecondary }]}>
                Study plans, focus techniques, motivation — ask me anything.
              </Text>
              {QUICK_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={[
                    styles.quickPrompt,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleSend(prompt);
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 14, flex: 1 }}>
                    {prompt}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            chat.map(renderBubble)
          )}
          {streaming && (
            <Animated.View style={[styles.thinkingWrap, pulseAnim]}>
              <ShimmerLoader variant="custom" width={200} height={60} />
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                Patrick is thinking...
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        <View style={[styles.inputArea, { backgroundColor: theme.card }]}>
          {remainingMessages !== null &&
            remainingMessages <= LOW_MESSAGE_WARNING_THRESHOLD && (
              <Text
                style={[styles.remainingText, { color: theme.textSecondary }]}
              >
                {remainingMessages > 0
                  ? `${remainingMessages} Patrick messages left today`
                  : "Daily Patrick limit reached — resets tomorrow"}
              </Text>
            )}
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <TextInput
              style={[
                styles.textInput,
                { color: theme.text, backgroundColor: theme.background },
              ]}
              placeholder="Ask Patrick..."
              placeholderTextColor={theme.textSecondary}
              value={input}
              onChangeText={setInput}
              editable={!streaming}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              multiline
              maxLength={3000}
            />
            <AnimatedButton
              title=""
              onPress={() => handleSend()}
              disabled={!input.trim() || streaming}
              loading={streaming}
              variant="primary"
              size="medium"
              icon={<Ionicons name="send-outline" size={22} color="#fff" />}
              hapticFeedback={true}
              style={{ padding: 12 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 8,
  },
  backBtn: { borderRadius: 20, padding: 8 },
  title: { fontSize: 18, fontWeight: "bold", textAlign: "center" },
  welcome: { paddingTop: 40, alignItems: "stretch" },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  welcomeSub: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  quickPrompt: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  bubble: {
    borderRadius: 18,
    marginVertical: 4,
    padding: 14,
    maxWidth: "82%",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  bubbleMeta: {
    color: "#BDBDBD",
    fontSize: 11,
    marginTop: 4,
  },
  thinkingWrap: {
    alignSelf: "flex-start",
    marginVertical: 4,
    maxWidth: "80%",
  },
  inputArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  remainingText: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    borderRadius: 12,
    padding: 14,
    marginRight: 10,
    maxHeight: 100,
  },
});

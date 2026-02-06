import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as MessageService from '../../utils/convexMessagingService';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import Animated, { FadeInUp, FadeInDown, SlideInRight, useAnimatedStyle, withSpring, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import * as Haptics from 'expo-haptics';
import { AnimationConfig } from '../../theme/premiumTheme';
import { ShimmerLoader } from '../../components/premium/ShimmerLoader';

interface RouteParams {
  contact: {
    id?: string;
    name: string;
    avatar?: string;
    status?: string;
  };
}

const MessageScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { contact } = route.params as RouteParams;
  
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const prevMessagesLengthRef = useRef<number>(0);

  // Get recipient ID from contact
  const recipientId = contact.id || '';

  // Use Convex useQuery for real-time message updates
  const messagesQuery = useQuery(
    api.messages.getConversation,
    recipientId ? { otherUserId: recipientId as Id<"users"> } : "skip"
  );

  // Query user presence for real-time online status
  const presenceQuery = useQuery(
    api.users.getUserPresence,
    recipientId ? { userId: recipientId as Id<"users"> } : "skip"
  );

  const loading = messagesQuery === undefined;
  const isOnline = presenceQuery?.isOnline ?? false;

  // Transform Convex messages to the Message interface format
  const messages: MessageService.Message[] = useMemo(() => {
    if (!messagesQuery) return [];
    return messagesQuery.map((m: any) => ({
      id: m._id,
      sender_id: m.senderId,
      recipient_id: m.recipientId,
      content: m.content,
      message_type: (m.messageType || "text") as "text" | "image" | "file",
      is_read: m.isRead ?? false,
      created_at: new Date(m._creationTime).toISOString(),
      updated_at: new Date(m._creationTime).toISOString(),
    }));
  }, [messagesQuery]);

  // Mark messages as read when conversation loads or new messages arrive
  useEffect(() => {
    if (!user?.id || !recipientId || !messagesQuery) return;

    // Mark messages as read
    MessageService.markMessagesAsRead(recipientId);
  }, [user?.id, recipientId, messagesQuery]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  const sendMessage = async () => {
    if (!inputText.trim() || !user?.id || !recipientId) return;

    setSending(true);
    const messageContent = inputText.trim();
    setInputText('');

    try {
      const result = await MessageService.sendMessage(recipientId, messageContent);
      if (!result.success) {
        console.error('Error sending message:', result.error);
        // Restore the input text if sending failed
        setInputText(messageContent);
      }
      // No need for optimistic update - Convex useQuery will automatically
      // update with the new message in real-time
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the input text if sending failed
      setInputText(messageContent);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: MessageService.Message; index: number }) => {
    const isMyMessage = item.sender_id === user?.id;

    // Use spring physics for message entrance
    const AnimationDirection = isMyMessage ? SlideInRight : FadeInUp;

    return (
      <View style={[styles.messageRow, isMyMessage && styles.myMessageRow]}>
        {/* Show contact avatar for their messages */}
        {!isMyMessage && (
          <View style={styles.messageAvatar}>
            {contact.avatar ? (
              <Image source={{ uri: contact.avatar }} style={styles.messageAvatarImage} />
            ) : (
              <View style={[styles.messageAvatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="person" size={16} color={theme.primary} />
              </View>
            )}
          </View>
        )}

        <Animated.View
          entering={AnimationDirection.delay(index * 30).duration(400).stiffness(150)}
          style={[
            styles.messageContainer,
            isMyMessage ? [styles.myMessage, { backgroundColor: theme.primary }] : [styles.theirMessage, { backgroundColor: theme.card }]
          ]}
        >
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : [styles.theirMessageText, { color: theme.text }]
          ]}>
            {item.content}
          </Text>
          <Text style={[styles.timestamp, { color: isMyMessage ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        {/* Contact Avatar */}
        <View style={styles.headerAvatarContainer}>
          {contact.avatar ? (
            <Image source={{ uri: contact.avatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="person" size={24} color={theme.primary} />
            </View>
          )}
          {isOnline && <View style={styles.headerOnlineDot} />}
        </View>

        <View style={styles.headerInfo}>
          <Text style={[styles.contactName, { color: theme.text }]}>{contact.name}</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.status, { color: isOnline ? '#22c55e' : theme.textSecondary }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages List */}
      <KeyboardAvoidingView 
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ShimmerLoader variant="circular" size={48} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              sendMessage();
            }}
            style={[styles.sendButton, { backgroundColor: theme.primary, opacity: inputText.trim() && !sending ? 1 : 0.5 }]}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ShimmerLoader variant="circular" size={20} />
            ) : (
              <Animated.View entering={FadeInUp.duration(400)}>
                <Ionicons name="send" size={20} color="#fff" />
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    marginRight: 8,
    marginBottom: 4,
  },
  messageAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '75%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    // Color will be set dynamically
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8, // Reduced from 12 to 8
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 16,
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MessageScreen; 
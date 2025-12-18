import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as MessageService from '../../utils/messagingService';
import Animated, { FadeInUp, FadeInDown, SlideInRight, useAnimatedStyle, withSpring, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { AnimatedButton } from '../../components/premium/AnimatedButton';
import * as Haptics from 'expo-haptics';
import { AnimationConfig } from '../../theme/premiumTheme';
import { ShimmerLoader } from '../../components/premium/ShimmerLoader';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender?: any;
}

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
  
  const [messages, setMessages] = useState<MessageService.Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Get recipient ID from contact
  const recipientId = contact.id || '';

  // Fetch messages
  useEffect(() => {
    if (!user?.id || !recipientId) return;

    const fetchMessages = async () => {
      setLoading(true);
      
      try {
        const result = await MessageService.getConversation(recipientId);
        if (result.success) {
          setMessages(result.data || []);
          // Mark messages as read
          await MessageService.markMessagesAsRead(recipientId);
        } else {
          console.error('Error fetching messages:', result.error);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscription
    if (user?.id) {
      unsubscribeRef.current = MessageService.subscribeToConversation(
        recipientId,
        (newMessage) => {
          setMessages((prev) => [...prev, newMessage]);
          // Mark as read if it's from the other user
          if (newMessage.sender_id === recipientId) {
            MessageService.markMessagesAsRead(recipientId);
          }
          // Scroll to bottom
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      );
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user?.id, recipientId]);

  const sendMessage = async () => {
    if (!inputText.trim() || !user?.id || !recipientId) return;

    setSending(true);
    const messageContent = inputText.trim();
    setInputText('');

    try {
      const result = await MessageService.sendMessage(recipientId, messageContent);
      if (result.success && result.data) {
        // Immediately add the sent message to the state (optimistic update)
        setMessages((prev) => [...prev, result.data!]);
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.error('Error sending message:', result.error);
        // Restore the input text if sending failed
        setInputText(messageContent);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the input text if sending failed
      setInputText(messageContent);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMyMessage = item.sender_id === user?.id;

    // Use spring physics for message entrance
    const AnimationDirection = isMyMessage ? SlideInRight : FadeInUp;

    return (
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
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.contactName, { color: theme.text }]}>{contact.name}</Text>
          <Text style={[styles.status, { color: theme.textSecondary }]}>{contact.status || 'Offline'}</Text>
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
    marginRight: 16,
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
  messageContainer: {
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
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
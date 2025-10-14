import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
} from 'react-native';
import { ThemedImage } from './ThemedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../utils/supabase';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FloatingNoraChatbotProps {
  currentScreen?: string;
  contextData?: any;
  onNavigateToNora?: (messages: ChatMessage[]) => void;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'nora';
  timestamp: string;
}

export default function FloatingNoraChatbot({ 
  currentScreen = 'Unknown', 
  contextData = {},
  onNavigateToNora
}: FloatingNoraChatbotProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  
  // State management
  const [isVisible, setIsVisible] = useState(true);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = (event: any) => {
      setKeyboardHeight(event.endCoordinates.height);
    };

    const keyboardWillHide = () => {
      setKeyboardHeight(0);
    };

    const showListener = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideListener = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showListener, keyboardWillShow);
    const hideSubscription = Keyboard.addListener(hideListener, keyboardWillHide);

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  // Get screen-specific suggestions
  const getScreenSuggestions = () => {
    const suggestions: { [key: string]: string[] } = {
      'Home': [
        "What should I focus on today?",
        "Show me my study progress",
        "Help me plan my week"
      ],
      'EBooks': [
        "Help me understand this PDF",
        "Create study questions from this document",
        "Summarize the key concepts"
      ],
      'Leaderboard': [
        "How can I improve my ranking?",
        "What are effective study strategies?",
        "Help me set better goals"
      ],
      'Results': [
        "Analyze my study patterns",
        "How can I improve my focus?",
        "What does my progress show?"
      ],
      'Settings': [
        "Optimize my study preferences",
        "What settings work best for my goals?",
        "Help me customize my experience"
      ],
      'Community': [
        "How do I engage with study groups?",
        "Tips for collaborative learning",
        "Find study partners for my subjects"
      ]
    };

    return suggestions[currentScreen] || [
      "How can you help me study?",
      "What can you do for me?",
      "Give me study tips"
    ];
  };

  // Open chat window
  const openChatWindow = () => {
    setShowChatWindow(true);
    // Auto-focus on input after a small delay to allow the window to render
    setTimeout(() => {
      // The TextInput will auto-focus when the component renders
    }, 100);
  };

  // Close chat window
  const closeChatWindow = () => {
    setShowChatWindow(false);
  };

  // Open full Nora screen
  const openFullNoraScreen = () => {
    if (onNavigateToNora) {
      onNavigateToNora(messages);
    }
    setShowChatWindow(false);
  };

  // Send message to Nora
  const sendMessage = async (message: string) => {
    if (!message.trim() || !user) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      content: message,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      // Call the Nora edge function
      const response = await fetch('https://ucculvnodabrfwbkzsnx.supabase.co/functions/v1/nora-chat-auth-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjY3Vsdm5vZGFicmZ3Ymt6c254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNDQxODksImV4cCI6MjA1NzgyMDE4OX0._tWjZyUAafkMNi5fAOmrgJZu3yuzz_G--S0Wi0qVF1A',
        },
        body: JSON.stringify({
          message,
          userId: user.id,
          userSettings: {},
          screenContext: {
            currentScreen,
            contextData
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.response) {
        const noraMessage: ChatMessage = {
          id: Math.random().toString(36).slice(2),
          content: data.response,
          sender: 'nora',
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, noraMessage]);
      }
    } catch (error) {
      console.error('Floating Nora error:', error);
      
      // Fallback response
      const fallbackMessage: ChatMessage = {
        id: Math.random().toString(36).slice(2),
        content: "I'm having trouble connecting right now, but you can access my full capabilities by going to the Nora screen. How else can I help you?",
        sender: 'nora',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Show/hide floating button
  const toggleVisibility = () => {
    const toValue = isVisible ? screenWidth : 0;
    
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setIsVisible(!isVisible);
  };

  // Don't render if user is not authenticated
  if (!user) return null;

  return (
    <>
      {/* Floating Nora Button */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 30 + (showChatWindow ? keyboardHeight : 0),
          right: 20,
          transform: [{ translateX: slideAnim }],
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          onPress={openChatWindow}
          activeOpacity={0.8}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: theme.surface || '#FFFFFF',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 2,
            borderColor: theme.primary || '#4CAF50',
          }}
        >
          <ThemedImage
            source={require('../../assets/Nora-AI-Chatbot.png')}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
            }}
            resizeMode="cover"
            applyFilter={true}
          />
        </TouchableOpacity>

        {/* Hide button */}
        <TouchableOpacity
          onPress={toggleVisibility}
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#FFFFFF',
          }}
        >
          <Ionicons name="close" size={12} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Restore button when hidden */}
      {!isVisible && (
        <TouchableOpacity
          onPress={toggleVisibility}
          style={{
            position: 'absolute',
            bottom: 40,
            right: -20,
            width: 40,
            height: 80,
            backgroundColor: theme.primary || '#4CAF50',
            justifyContent: 'center',
            alignItems: 'center',
            borderTopLeftRadius: 20,
            borderBottomLeftRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
            zIndex: 1000,
          }}
        >
          <ThemedImage
            source={require('../../assets/Nora-AI-Chatbot.png')}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
            }}
            resizeMode="cover"
            applyFilter={true}
          />
        </TouchableOpacity>
      )}

      {/* Small Chat Window */}
      {showChatWindow && (
        <View
          style={{
            position: 'absolute',
            bottom: Math.max(50, 110 + keyboardHeight),
            right: 20,
            width: 320,
            height: Math.min(450, screenHeight - (110 + keyboardHeight + 50)),
            backgroundColor: theme.surface || '#FFFFFF',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.primary || '#4CAF50',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 12,
            zIndex: 999,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 15,
              paddingVertical: 12,
              backgroundColor: theme.primary || '#4CAF50',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <ThemedImage
                source={require('../../assets/Nora-AI-Chatbot.png')}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  marginRight: 10,
                }}
                resizeMode="cover"
                applyFilter={true}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }}>
                  Nora AI
                </Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                  {currentScreen} Screen
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                onPress={() => {
                  setMessages([]);
                }}
                style={{
                  padding: 6,
                  marginRight: 6,
                  borderRadius: 6,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={openFullNoraScreen}
                style={{
                  padding: 6,
                  marginRight: 6,
                  borderRadius: 6,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <Ionicons name="expand" size={16} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closeChatWindow}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Suggestions */}
          {messages.length === 0 && (
            <View style={{ padding: 12 }}>
              <Text 
                style={{ 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: theme.text || '#333333',
                  marginBottom: 8,
                }}
              >
                Quick suggestions:
              </Text>
              {getScreenSuggestions().slice(0, 3).map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => sendMessage(suggestion)}
                  style={{
                    backgroundColor: theme.primary + '20' || '#4CAF5020',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 12,
                    marginBottom: 6,
                    borderWidth: 1,
                    borderColor: theme.primary + '40' || '#4CAF5040',
                  }}
                >
                  <Text 
                    style={{ 
                      color: theme.primary || '#4CAF50', 
                      fontSize: 12,
                      textAlign: 'center',
                    }}
                  >
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Chat Messages */}
          <ScrollView
            style={{ 
              flex: 1, 
              paddingHorizontal: 12,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={{
                  alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: message.sender === 'user' 
                    ? theme.primary || '#4CAF50' 
                    : theme.surface2 || '#F5F5F5',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  marginVertical: 3,
                  maxWidth: '85%',
                }}
              >
                <Text
                  style={{
                    color: message.sender === 'user' 
                      ? '#FFFFFF' 
                      : theme.text || '#333333',
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                >
                  {message.content}
                </Text>
              </View>
            ))}

            {isLoading && (
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: theme.surface2 || '#F5F5F5',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  marginVertical: 3,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <ActivityIndicator size="small" color={theme.primary || '#4CAF50'} />
                <Text 
                  style={{ 
                    color: theme.textSecondary || '#666666', 
                    fontSize: 13, 
                    marginLeft: 6,
                  }}
                >
                  Thinking...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: theme.border || '#E0E0E0',
                backgroundColor: theme.surface || '#FFFFFF',
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  marginRight: 8,
                  maxHeight: 80,
                  minHeight: 36,
                  fontSize: 13,
                  borderWidth: 1.5,
                  borderColor: '#7B61FF',
                  fontWeight: '400',
                  textAlignVertical: 'top',
                }}
                placeholder="Ask Nora anything..."
                placeholderTextColor="#666666"
                value={inputText}
                onChangeText={setInputText}
                multiline
                onSubmitEditing={() => sendMessage(inputText)}
                selectionColor="#7B61FF"
                autoFocus={showChatWindow}
              />

              <TouchableOpacity
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isLoading}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: inputText.trim() 
                    ? theme.primary || '#4CAF50' 
                    : theme.border || '#E0E0E0',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons
                  name="send"
                  size={16}
                  color={inputText.trim() ? '#FFFFFF' : theme.textSecondary || '#666666'}
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </>
  );
}
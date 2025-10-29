import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Alert, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import NoraOnboarding from '../../components/NoraOnboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
            <Ionicons name="menu-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleNewChat}
            activeOpacity={0.8}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: theme.primary,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ),
    });
    fetchChatHistory();
    fetchUploadedPdfs();
  }, [navigation, theme, handleNewChat]);
  
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
  
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchChatHistory();
    checkNoraOnboardingStatus();
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
    
    try {
      const { data, error } = await supabase
        .from('nora_chat')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: true });
        
      if (error) throw error;
      
      const messages = data || [];
      setChat(messages);
      
      // Group messages into chat sessions (by day or conversation breaks)
      const grouped = groupMessagesBySessions(messages);
      setChatHistory(grouped);
      
      // If there are existing messages, skip landing screen
      if (messages.length > 0) {
        setShowLandingScreen(false);
      }
      
    } catch (error) {
      console.error('Failed to load Nora chat history:', error);
    } finally {
      setIsFirstLoad(false);
    }
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

    try {
      // Fetch from storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('e-books')
        .list(`${user.id}/`, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (storageError) {
        console.warn('Storage fetch error:', storageError);
      }

      // Fetch metadata from database with error handling
      let dbData = [];
      try {
        const { data, error: dbError } = await supabase
          .from('user_ebooks')
          .select('*')
          .eq('user_id', user.id)
          .order('upload_date', { ascending: false });

        if (dbError) {
          console.warn('Database fetch error:', dbError);
        } else {
          dbData = data || [];
        }
      } catch (dbError) {
        console.warn('Database table access error:', dbError);
      }

      // Combine storage and database data (matching EBooksScreen approach)
      const combinedData = (storageData || [])
        .filter((f) => f.metadata?.mimetype === 'application/pdf' || f.name.endsWith('.pdf'))
        .map((f) => {
          const dbRecord = dbData.find(record => record.file_path.endsWith(f.name));
          return {
            id: dbRecord?.id || f.id || f.name,
            name: dbRecord?.title || f.name.replace('.pdf', ''),
            title: dbRecord?.title || f.name.replace('.pdf', ''),
            file_size: f.metadata?.size || dbRecord?.file_size || 0,
            upload_date: dbRecord?.upload_date || f.created_at,
            file_path: dbRecord?.file_path || `${user.id}/${f.name}`,
            storage_path: f.name
          };
        });

      setUploadedPdfs(combinedData);
    } catch (error) {
      console.error('Failed to load PDFs:', error);
      setUploadedPdfs([]);
    }
  };

  const saveMessage = async (content: string, sender: 'user' | 'nora') => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('nora_chat')
        .insert([{
          content,
          sender,
          user_id: user.id,
          timestamp: new Date().toISOString(),
        }]);
        
      if (error) throw error;
    } catch (error) {
      console.error('Failed to save Nora message:', error);
    }
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
    
    // Start loading for Nora's response
    setIsLoading(true);

    try {
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('NoraScreen: No active session found');
        throw new Error('No active session');
      }
      
      if (!session.access_token) {
        console.error('NoraScreen: Session exists but no access token');
        throw new Error('No access token in session');
      }
      
      console.log('NoraScreen: Session valid, access_token present:', !!session.access_token);

      // Send message to enhanced Nora assistant edge function
      console.log('NoraScreen: Making API call to nora-chat-auth-fix with userId:', user.id);
      const response = await fetch('https://ucculvnodabrfwbkzsnx.supabase.co/functions/v1/nora-chat-auth-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjY3Vsdm5vZGFicmZ3Ymt6c254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNDQxODksImV4cCI6MjA1NzgyMDE4OX0._tWjZyUAafkMNi5fAOmrgJZu3yuzz_G--S0Wi0qVF1A',
        },
        body: JSON.stringify({
          message: textToSend,
          userId: user.id,
          userSettings: {
            focus_method: userData?.onboarding?.focus_method,
            weekly_focus_goal: userData?.onboarding?.weekly_focus_goal,
            onboarding: userData?.onboarding
          },
          pdfContext: selectedPdf ? {
            title: selectedPdf.title,
            file_path: selectedPdf.file_path
          } : null
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Nora Assistant Error:', response.status, errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

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
        // Clean response by removing markdown formatting
        const cleanResponse = data.response
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/__(.*?)__/g, '$1')
          .trim();

        const noraMsg: NoraMessage = {
          id: Math.random().toString(36).slice(2),
          content: cleanResponse,
          sender: 'nora',
          timestamp: new Date().toISOString(),
          user_id: user.id,
        };
        
        setChat(prev => [...prev, noraMsg]);
        await saveMessage(cleanResponse, 'nora');
      } else {
        throw new Error('No response from Nora');
      }
      
    } catch (error) {
      console.error('Nora request error:', error);
      
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
      <Animated.View style={[styles.landingContainer, { opacity: fadeAnim }]}>
        <View style={styles.welcomeSection}>
          <View style={styles.noraAvatar}>
            <Ionicons name="chatbubble-ellipses" size={40} color="#7B61FF" />
          </View>
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>
            Hi! I'm Nora
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
            Your AI study assistant. How can I help you today?
          </Text>
        </View>

        <View style={styles.modesContainer}>
          {NORA_MODES.map((mode, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.modeCard, { backgroundColor: theme.surface }]}
              onPress={() => handleModePress(mode)}
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
      </Animated.View>
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

      // Upload to Supabase storage
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Error', 'You must be logged in to upload files.');
        setIsLoading(false);
        return;
      }

      const userId = session.user.id;
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `${userId}/${fileName}`;

      console.log('Starting PDF upload using EBooksScreen method...');

      try {
        // Method 1: Direct FormData upload (React Native compatible)
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          type: 'application/pdf',
          name: fileName,
        } as any);

        // Upload using Supabase storage with FormData
        const { error: uploadError } = await supabase.storage
          .from('e-books')
          .upload(filePath, formData);

        if (uploadError) {
          console.log('FormData upload failed, trying alternative method...');

          // Method 2: Base64 string upload
          const base64Data = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Upload base64 string directly
          const { error: base64UploadError } = await supabase.storage
            .from('e-books')
            .upload(filePath, base64Data, {
              contentType: 'application/pdf',
              upsert: false
            });

          if (base64UploadError) {
            console.log('Base64 upload failed, trying file URI method...');

            // Method 3: Direct file URI (React Native specific)
            const { error: uriUploadError } = await supabase.storage
              .from('e-books')
              .upload(filePath, {
                uri: file.uri,
                type: 'application/pdf',
                name: fileName,
              } as any);

            if (uriUploadError) {
              throw new Error(`All upload methods failed. Last error: ${uriUploadError.message}`);
            }
          }
        }

        console.log('Upload successful, saving metadata...');

        // Save metadata to database
        try {
          const { error: dbError } = await supabase
            .from('user_ebooks')
            .insert({
              user_id: userId,
              title: file.name.replace('.pdf', ''),
              file_path: filePath,
              file_size: file.size,
              upload_date: new Date().toISOString()
            });

          if (dbError) {
            console.warn('Database save error:', dbError);
            Alert.alert(
              'File Uploaded',
              'Your PDF was uploaded successfully, but there was an issue saving the metadata.'
            );
          } else {
            Alert.alert('Success', 'Your PDF has been uploaded successfully! You can now select it.');
          }
        } catch (metadataError) {
          console.error('Metadata save failed:', metadataError);
          Alert.alert('File Uploaded', 'Your PDF was uploaded successfully.');
        }

        // Refresh PDF list
        await fetchUploadedPdfs();
        setShowPdfModal(true);

      } catch (uploadError) {
        console.error('All upload methods failed:', uploadError);
        throw new Error('Unable to upload the PDF. Please check your internet connection and try again.');
      }

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
    
    return (
      <View
        key={`${message.id}-${index}`}
        style={[
          styles.messageBubble,
          isUser ? styles.userMessage : styles.noraMessage,
        ]}
      >
        <Text style={[
          styles.messageText,
          { color: isUser ? '#FFFFFF' : theme.text }
        ]}>
          {message.content}
        </Text>
        <Text style={[
          styles.timestamp,
          { color: isUser ? 'rgba(255,255,255,0.7)' : theme.textSecondary }
        ]}>
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    );
  };


  const renderChatScreen = () => (
    <Animated.View style={[styles.chatScreenContainer, { opacity: fadeAnim }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {chat.map((message, index) => renderMessage(message, index))}
        
        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#7B61FF" />
            <Text style={[styles.loadingDots, { color: theme.textSecondary }]}>
              {selectedPdf
                ? `Nora is analyzing "${selectedPdf.name}" and your question...`
                : 'Nora is processing your request...'}
            </Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );

  if (isFirstLoad) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#7B61FF" />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Loading Nora...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Content */}
      <KeyboardAvoidingView 
        style={styles.contentContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        enabled={true}
      >
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
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={() => handleSend()}
                disabled={isLoading}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
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
      </KeyboardAvoidingView>
    </View>
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
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  modeCard: {
    width: '48%',
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#F3F2FF',
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
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  loadingDots: {
    marginLeft: 8,
    fontSize: 14,
    fontStyle: 'italic',
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
  // Landing Screen Styles
  landingContainer: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 60,
  },
  noraAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7B61FF20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  modesContainer: {
    flex: 1,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Chat Screen Styles
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#7B61FF',
  },
  noraMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  // PDF Modal Styles
  pdfModalContainer: {
    flex: 1,
  },
  pdfModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  pdfModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  pdfModalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  uploadPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  uploadPdfButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  pdfListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  pdfListContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  pdfListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  pdfIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  pdfInfo: {
    flex: 1,
  },
  pdfName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pdfSize: {
    fontSize: 14,
    marginBottom: 2,
  },
  pdfDate: {
    fontSize: 12,
  },
  emptyPdfState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyPdfText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyPdfSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
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
});

export default NoraScreen;
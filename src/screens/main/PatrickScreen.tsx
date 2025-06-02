import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, Modal, Platform, KeyboardAvoidingView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import SessionReportScreen from './SessionReportScreen';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

type RootStackParamList = {
  PatrickSpeak: {
    initialMessage?: string;
    isResponse?: boolean;
    responseMessage?: string;
  };
  Quizzes: undefined;
  SessionReportScreen: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PatrickSpeakRouteProp = RouteProp<RootStackParamList, 'PatrickSpeak'>;

const DEEP_GREEN = '#1B5E20';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'patrick';
  timestamp: string;
  user_id: string;
}

const FOCUS_TOPICS = [
  { title: 'Start a Pomodoro Session', subtitle: 'Last session 2 hours ago', action: 'pomodoro' },
  { title: 'Review My Tasks', subtitle: 'Last review 3 hours ago', action: 'tasks' },
  { title: 'Ask for Study Tips', subtitle: 'Last tip 3 hours ago', action: 'tips' },
  { title: 'Check Progress', subtitle: 'Last check 3 hours ago', action: 'progress' },
  { title: 'Join a Study Room', subtitle: 'Last joined 4 hours ago', action: 'study_room' },
  { title: 'Daily Focus Inspiration', subtitle: 'Last inspiration 5 hours ago', action: 'inspiration' },
];

const PatrickScreen = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  return <PatrickHomeScreen nickname={userProfile?.full_name || userProfile?.username || 'Friend'} />;
};

const PatrickHomeScreen = ({ nickname }: { nickname: string }) => {
  const { theme } = useTheme();
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const fetchChatHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('patrick_chat')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(10);
      if (error) throw error;
      setChatHistory(data || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleCardPress = (title: string, action: string) => {
    navigation.navigate('PatrickSpeak', { initialMessage: title });
  };

  const handleInputBarPress = () => {
    setChatModalVisible(true);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    navigation.navigate('PatrickSpeak', { initialMessage: chatInput });
    setChatInput('');
    setChatModalVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 32, marginBottom: 12, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: theme.text, flex: 1 }}>{getGreeting()}, {nickname}</Text>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 20 }}>{nickname ? nickname[0].toUpperCase() : '?'}</Text>
        </View>
      </View>
      
      <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} enableOnAndroid={true} extraScrollHeight={80}>
        {FOCUS_TOPICS.map((topic, idx) => (
          <TouchableOpacity
            key={topic.title}
            style={{ 
              backgroundColor: theme.card, 
              borderRadius: 20, 
              marginHorizontal: 16, 
              marginBottom: 18, 
              padding: 20, 
              shadowColor: '#000', 
              shadowOpacity: 0.03, 
              shadowRadius: 4, 
              elevation: 1
            }}
            activeOpacity={0.85}
            onPress={() => handleCardPress(topic.title, topic.action)}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 4 }}>{topic.title}</Text>
            <Text style={{ color: theme.text, fontSize: 15 }}>{topic.subtitle}</Text>
          </TouchableOpacity>
        ))}
        
        {/* Recent chat history */}
        {chatHistory.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 12 }}>Recent Conversations</Text>
            {chatHistory.slice(0, 3).map((msg) => (
              <View key={msg.id} style={{ marginBottom: 8 }}>
                <Text style={{ color: msg.sender === 'user' ? theme.primary : theme.primary, fontWeight: '600' }}>
                  {msg.sender === 'user' ? 'You' : 'Patrick'}:
                </Text>
                <Text style={{ color: theme.text, fontSize: 14 }} numberOfLines={2}>
                  {msg.content}
                </Text>
              </View>
            ))}
          </View>
        )}
      </KeyboardAwareScrollView>
      
      <TouchableOpacity
        style={{ 
          position: 'absolute', 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: theme.card, 
          borderTopLeftRadius: 24, 
          borderTopRightRadius: 24, 
          padding: 18, 
          flexDirection: 'row', 
          alignItems: 'center', 
          shadowColor: '#000', 
          shadowOpacity: 0.06, 
          shadowRadius: 8, 
          elevation: 8
        }}
        activeOpacity={0.85}
        onPress={handleInputBarPress}
      >
        <Ionicons name="create-outline" size={28} color={theme.primary} style={{ marginRight: 10 }} />
        <Text style={{ color: theme.text, fontSize: 18, flex: 1 }}>
          Chat with Patrick or start a focus session...
        </Text>
      </TouchableOpacity>
      
      <Modal visible={chatModalVisible} animationType="slide" transparent onRequestClose={() => setChatModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 12 }}>Start a new chat or focus session</Text>
            <TextInput
              style={{ fontSize: 17, color: theme.text, backgroundColor: '#F6F6E9', borderRadius: 12, padding: 14, marginBottom: 16 }}
              placeholder="Type your message or focus goal..."
              placeholderTextColor="#BDBDBD"
              value={chatInput}
              onChangeText={setChatInput}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={handleSendChat}
            />
            <TouchableOpacity
              style={{ backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 }}
              onPress={handleSendChat}
              disabled={!chatInput.trim()}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 2 }} onPress={() => setChatModalVisible(false)}>
              <Text style={{ color: theme.text, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export const PatrickSpeakScreen = ({ route }: { route: PatrickSpeakRouteProp }) => {
  const { initialMessage } = route.params || {};
  const { user } = useAuth();
  const navigation = useNavigation();
  const [input, setInput] = useState(initialMessage || '');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState('');
  const scrollViewRef = React.useRef<ScrollView>(null);
  const { theme } = useTheme();

  useEffect(() => {
    fetchChatHistory();
    if (initialMessage) {
      handleSend(initialMessage);
    }
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom on new message
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [chat, streamedText]);

  const fetchChatHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('patrick_chat')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: true });
      if (error) throw error;
      setChat(data || []);
    } catch (err) {
      setError('Failed to load chat history.');
    }
  };

  const saveMessage = async (content: string, sender: 'user' | 'patrick') => {
    if (!user) return;
    const { error } = await supabase.from('patrick_chat').insert([
      {
        content,
        sender,
        user_id: user.id,
        timestamp: new Date().toISOString(),
      },
    ]);
    if (error) console.error('Failed to save message:', error);
  };

  const handleSend = async (msg?: string) => {
    const messageToSend = (msg !== undefined ? msg : input).trim();
    if (!messageToSend || !user) return;
    setInput('');
    setError('');
    setStreaming(true);

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      content: messageToSend,
      sender: 'user',
      timestamp: new Date().toISOString(),
      user_id: user.id,
    };
    setChat((prev) => [...prev, userMsg]);
    await saveMessage(messageToSend, 'user');

    // Get the latest session access token (sync)
    const accessToken = supabase.auth.session?.()?.access_token || '';
    if (!accessToken) {
      setStreaming(false);
      setError('Could not get session token.');
      console.error('Session token error: No access token');
      return;
    }

    try {
      const response = await fetch('https://ucculvnodabrfwbkzsnx.supabase.co/functions/v1/patrick-response-function', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message: messageToSend, userId: user.id }),
      });

      const data = await response.json();
      setStreaming(false);

      if (data.response) {
        // Add Patrick's message to chat
        const patrickMsg: ChatMessage = {
          id: Math.random().toString(36).slice(2),
          content: data.response,
          sender: 'patrick',
          timestamp: new Date().toISOString(),
          user_id: user.id,
        };
        setChat((prev) => [...prev, patrickMsg]);
        await saveMessage(data.response, 'patrick');
      } else if (data.error) {
        setError('Patrick error: ' + data.error);
      } else {
        setError('No response from Patrick.');
      }
    } catch (err: any) {
      setStreaming(false);
      setError('Failed to get Patrick response.');
      console.error('Patrick fetch error:', err);
    }
  };

  const renderBubble = (msg: ChatMessage, idx: number) => {
    const isUser = msg.sender === 'user';
    return (
      <View
        key={msg.id + idx}
        style={{
          alignSelf: isUser ? 'flex-end' : 'flex-start',
          backgroundColor: isUser ? '#E8F5E9' : '#fff',
          borderRadius: 18,
          marginVertical: 4,
          marginHorizontal: 8,
          padding: 14,
          maxWidth: '80%',
          shadowColor: '#000',
          shadowOpacity: 0.03,
          shadowRadius: 2,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 16 }}>{msg.content}</Text>
        <Text style={{ color: '#BDBDBD', fontSize: 11, marginTop: 4, textAlign: isUser ? 'right' : 'left' }}>{isUser ? 'You' : 'Patrick'}</Text>
      </View>
    );
  };

  return (
    <View style={speakStyles.container}>
      <View style={speakStyles.headerRow}>
        <TouchableOpacity style={speakStyles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={speakStyles.speakTitle}>Patrick AI Chat</Text>
        <View style={speakStyles.gridBtn} />
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{ padding: 18, paddingBottom: 100 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {chat.map(renderBubble)}
        {streaming && (
          <View style={{ alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 18, marginVertical: 4, marginHorizontal: 8, padding: 14, maxWidth: '80%' }}>
            <Text style={{ color: theme.text, fontSize: 16 }}>{streamedText}<Text style={{ opacity: 0.5 }}>|</Text></Text>
            <Text style={{ color: '#BDBDBD', fontSize: 11, marginTop: 4 }}>Patrick is typing...</Text>
          </View>
        )}
      </ScrollView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 }}>
        <TextInput
          style={{ flex: 1, fontSize: 17, color: theme.text, backgroundColor: '#F6F6E9', borderRadius: 12, padding: 14, marginRight: 10 }}
          placeholder="Type your message..."
          placeholderTextColor="#BDBDBD"
          value={input}
          onChangeText={setInput}
          editable={!streaming}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={{ backgroundColor: theme.primary, borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center', opacity: input.trim() && !streaming ? 1 : 0.5 }}
          onPress={() => handleSend()}
          disabled={!input.trim() || streaming}
        >
          <Ionicons name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
      {error ? <Text style={{ color: 'red', textAlign: 'center', margin: 8 }}>{error}</Text> : null}
    </View>
  );
};

// Placeholder for QuizzesScreen
export const QuizzesScreen = () => (
  <View style={{ flex: 1, backgroundColor: '#FAFAF6', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1B5E20', marginBottom: 12 }}>My Quizzes</Text>
    <Text style={{ color: '#388E3C', fontSize: 16, textAlign: 'center', marginHorizontal: 24 }}>
      Here you can search for and manage quizzes you've created. (Feature coming soon!)
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF6', paddingHorizontal: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 0 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  headerIconBtn: { marginLeft: 12, backgroundColor: '#F6F6E9', borderRadius: 20, padding: 8 },
  greeting: { fontSize: 26, fontWeight: 'bold', color: '#1B5E20', marginLeft: 20, marginTop: 8 },
  subtitle: { fontSize: 22, fontWeight: 'bold', color: '#1B5E20', marginLeft: 20, marginTop: 2 },
  desc: { fontSize: 15, color: '#388E3C', marginLeft: 20, marginTop: 2, marginBottom: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 18 },
  searchInput: { flex: 1, backgroundColor: '#F6F6E9', borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, fontSize: 16, color: '#222', marginRight: 10 },
  speakBtn: { backgroundColor: '#1B5E20', borderRadius: 24, padding: 12, justifyContent: 'center', alignItems: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  seeAll: { color: '#388E3C', fontWeight: 'bold', fontSize: 15 },
  tasksGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 8 },
  taskCard: { width: '47%', borderRadius: 18, padding: 18, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2 },
  taskIconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  taskType: { marginLeft: 8, color: '#1B5E20', fontWeight: 'bold', fontSize: 15 },
  taskLabel: { fontSize: 16, color: '#222', fontWeight: '500', marginTop: 2 },
});

const speakStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF6', paddingHorizontal: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 0 },
  backBtn: { backgroundColor: '#F6F6E9', borderRadius: 20, padding: 8 },
  gridBtn: { backgroundColor: '#F6F6E9', borderRadius: 20, padding: 8 },
  speakTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', flex: 1, textAlign: 'center' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  speakImage: { width: 160, height: 160, borderRadius: 80, marginBottom: 24 },
  speakPrompt: { fontSize: 22, fontWeight: 'bold', color: '#1B5E20', textAlign: 'center', marginBottom: 12 },
  speakDesc: { fontSize: 15, color: '#222', textAlign: 'center', marginBottom: 24 },
  speakMicRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  speakMicBtn: { backgroundColor: '#E8F5E9', borderRadius: 40, padding: 18, justifyContent: 'center', alignItems: 'center' },
});

export default PatrickScreen; 
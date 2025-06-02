import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, FlatList, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RootStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const MOCK_MESSAGES = [
  { id: '1', sender: 'You', text: 'Welcome to the study room!' },
  { id: '2', sender: 'Nikolai', text: 'Ready to focus?' },
];

const StudyRoomScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // @ts-ignore
  const { room } = route.params || {};
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (input.trim()) {
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), sender: 'You', text: input.trim() },
      ]);
      setInput('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={26} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{room?.name || room?.title || 'Study Room'}</Text>
          <TouchableOpacity style={styles.leaveBtnTop} onPress={() => navigation.goBack()}>
            <Ionicons name="exit-outline" size={20} color="#E57373" style={{ marginRight: 4 }} />
            <Text style={styles.leaveBtnTopText}>Leave</Text>
          </TouchableOpacity>
        </View>
        {/* Info card and session button can scroll if needed */}
        <KeyboardAwareScrollView
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ flexGrow: 0 }}
          extraScrollHeight={80}
          enableOnAndroid={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.infoCard}>
            <Text style={styles.label}>Created by: <Text style={styles.value}>{room?.creator?.full_name || room?.creator?.username || room?.creator || 'Unknown'}</Text></Text>
            <Text style={styles.label}>Participants: <Text style={styles.value}>{room?.current_participants || room?.participants || 1} / {room?.max_participants || room?.participantLimit || 5}</Text></Text>
            <Text style={styles.label}>Topic: <Text style={styles.value}>{room?.topic || 'General Study'}</Text></Text>
            <View style={styles.avatarsRow}>
              {(room?.avatars || []).length > 0 ? (
                room.avatars.map((avatar: string, idx: number) =>
                  avatar ? (
                    <Image key={idx} source={{ uri: avatar }} style={styles.avatarImg} />
                  ) : (
                    <View key={idx} style={styles.avatarCircle}><Ionicons name="person" size={20} color="#fff" /></View>
                  )
                )
              ) : (
                <View style={styles.avatarCircle}><Ionicons name="person" size={20} color="#fff" /></View>
              )}
            </View>
          </View>
          {/* Start Group Study Session Button */}
          <TouchableOpacity style={styles.startSessionBtn} onPress={() => navigation.navigate('StudySessionScreen', { group: true, room })}>
            <Ionicons name="timer-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.startSessionBtnText}>Start Group Study Session</Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
        {/* FlatList for chat messages - NOT inside any ScrollView */}
        <View style={styles.chatContainerWrapper}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={[styles.messageBubble, item.sender === 'You' ? styles.messageBubbleMe : styles.messageBubbleOther]}>
                <Text style={styles.messageSender}>{item.sender}:</Text>
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            )}
            contentContainerStyle={{ padding: 12 }}
            style={styles.chatContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        </View>
        {/* Message Input above bottom safe area */}
        <View style={styles.inputRowSticky}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={!input.trim()}>
            <Ionicons name="send" size={22} color={input.trim() ? '#388E3C' : '#BDBDBD'} />
          </TouchableOpacity>
        </View>
        <View style={styles.bottomSpacer} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FCF8' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#388E3C', flex: 1, textAlign: 'center' },
  infoCard: { backgroundColor: '#fff', borderRadius: 16, margin: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  label: { fontSize: 16, color: '#222', marginBottom: 6 },
  value: { fontWeight: 'bold', color: '#388E3C' },
  avatarsRow: { flexDirection: 'row', marginTop: 10 },
  avatarImg: { width: 36, height: 36, borderRadius: 18, marginRight: 8, borderWidth: 2, borderColor: '#C8E6C9' },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  startSessionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#388E3C', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28, alignSelf: 'center', marginTop: 0, marginBottom: 12 },
  startSessionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  chatContainerWrapper: { flex: 1, minHeight: 180, maxHeight: 260 },
  chatContainer: { backgroundColor: '#F5F5F5', borderRadius: 16, marginHorizontal: 16, marginBottom: 16, flex: 1 },
  messageBubble: { marginBottom: 8, padding: 10, borderRadius: 10, maxWidth: '80%' },
  messageBubbleMe: { backgroundColor: '#C8E6C9', alignSelf: 'flex-end' },
  messageBubbleOther: { backgroundColor: '#fff', alignSelf: 'flex-start' },
  messageSender: { fontWeight: 'bold', color: '#388E3C', marginBottom: 2 },
  messageText: { color: '#222', fontSize: 15 },
  inputRowSticky: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E0E0E0', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20 },
  input: { flex: 1, fontSize: 16, color: '#222', backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  sendBtn: { padding: 6 },
  leaveBtnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E57373',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  leaveBtnTopText: {
    color: '#E57373',
    fontWeight: 'bold',
    fontSize: 15,
  },
  bottomSpacer: {
    height: 18,
    backgroundColor: 'transparent',
  },
});

export default StudyRoomScreen; 
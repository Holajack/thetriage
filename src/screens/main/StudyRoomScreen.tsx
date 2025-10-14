import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, FlatList, Platform, KeyboardAvoidingView, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RootStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as StudyRoomService from '../../utils/studyRoomService';
import * as FriendService from '../../utils/friendRequestService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';


const StudyRoomScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { theme } = useTheme();
  // @ts-ignore
  const { room } = route.params || {};
  const [messages, setMessages] = useState<StudyRoomService.StudyRoomMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [roomData, setRoomData] = useState<StudyRoomService.StudyRoom | null>(room || null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friends, setFriends] = useState<FriendService.Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [inviteMessage, setInviteMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Load messages and set up real-time subscription
  useEffect(() => {
    if (!roomData?.id || !user?.id) return;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const result = await StudyRoomService.getStudyRoomMessages(roomData.id);
        if (result.success) {
          setMessages(result.data || []);
        } else {
          console.error('Error loading messages:', result.error);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Set up real-time subscription
    unsubscribeRef.current = StudyRoomService.subscribeToStudyRoomMessages(
      roomData.id,
      (newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [roomData?.id, user?.id]);

  // Load friends for invitations
  useEffect(() => {
    const loadFriends = async () => {
      if (!user?.id) return;
      
      try {
        const result = await FriendService.getFriendsList();
        if (result.success) {
          setFriends(result.data || []);
        }
      } catch (error) {
        console.error('Error loading friends:', error);
      }
    };

    loadFriends();
  }, [user?.id]);

  const handleSendInvitations = async () => {
    if (!roomData?.id || selectedFriends.length === 0) {
      Alert.alert('Error', 'Please select at least one friend to invite');
      return;
    }

    try {
      const promises = selectedFriends.map(friendId => 
        StudyRoomService.sendStudyRoomInvitation(
          roomData.id,
          friendId,
          inviteMessage.trim() || undefined
        )
      );

      const results = await Promise.all(promises);
      const failedInvites = results.filter(result => !result.success);

      if (failedInvites.length === 0) {
        Alert.alert('Success', `Sent ${selectedFriends.length} invitation${selectedFriends.length !== 1 ? 's' : ''}!`);
      } else {
        Alert.alert('Partial Success', `Sent ${results.length - failedInvites.length} of ${results.length} invitations`);
      }

      // Reset form
      setSelectedFriends([]);
      setInviteMessage('');
      setShowInviteModal(false);
    } catch (error) {
      console.error('Error sending invitations:', error);
      Alert.alert('Error', 'Failed to send invitations');
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSend = async () => {
    if (!input.trim() || !roomData?.id || !user?.id) return;

    setSending(true);
    const messageContent = input.trim();
    setInput('');

    try {
      const result = await StudyRoomService.sendStudyRoomMessage(roomData.id, messageContent);
      if (result.success) {
        // Message will be added via real-time subscription
        flatListRef.current?.scrollToEnd({ animated: true });
      } else {
        console.error('Error sending message:', result.error);
        // Restore the input text if sending failed
        setInput(messageContent);
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the input text if sending failed
      setInput(messageContent);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomData?.id || !user?.id) return;

    Alert.alert(
      'Leave Study Room',
      'Are you sure you want to leave this study room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await StudyRoomService.leaveStudyRoom(roomData.id);
              if (result.success) {
                navigation.goBack();
              } else {
                Alert.alert('Error', result.error || 'Failed to leave room');
              }
            } catch (error) {
              console.error('Error leaving room:', error);
              Alert.alert('Error', 'Failed to leave room');
            }
          }
        }
      ]
    );
  };

  const renderMessage = ({ item }: { item: StudyRoomService.StudyRoomMessage }) => {
    const isMyMessage = item.sender_id === user?.id;
    const senderName = item.sender?.full_name || item.sender?.username || 'Unknown';
    
    if (item.message_type === 'join' || item.message_type === 'leave') {
      return (
        <View style={styles.systemMessage}>
          <Text style={[styles.systemMessageText, { backgroundColor: theme.background, color: theme.textSecondary }]}>
            {senderName} {item.content}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageBubble, isMyMessage ? [styles.messageBubbleMe, { backgroundColor: theme.primary + 'CC' }] : [styles.messageBubbleOther, { backgroundColor: theme.card }]]}>
        <Text style={[styles.messageSender, { color: isMyMessage ? '#fff' : theme.primary }]}>{isMyMessage ? 'You' : senderName}:</Text>
        <Text style={[styles.messageText, { color: isMyMessage ? '#fff' : theme.text }]}>{item.content}</Text>
        <Text style={[styles.messageTime, { color: isMyMessage ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>
          {new Date(item.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.headerRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.primary }]}>{roomData?.name || 'Study Room'}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.inviteBtn, { backgroundColor: theme.primary + '20' }]} onPress={() => setShowInviteModal(true)}>
              <Ionicons name="person-add-outline" size={18} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.leaveBtnTop, { backgroundColor: theme.card, borderColor: '#E57373' }]} onPress={handleLeaveRoom}>
              <Ionicons name="exit-outline" size={20} color="#E57373" style={{ marginRight: 4 }} />
              <Text style={styles.leaveBtnTopText}>Leave</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Info card and session button can scroll if needed */}
        <KeyboardAwareScrollView
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ flexGrow: 0 }}
          extraScrollHeight={80}
          enableOnAndroid={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.text }]}>Created by: <Text style={[styles.value, { color: theme.primary }]}>{roomData?.owner?.full_name || roomData?.owner?.username || 'Unknown'}</Text></Text>
            <Text style={[styles.label, { color: theme.text }]}>Participants: <Text style={[styles.value, { color: theme.primary }]}>{roomData?.current_participants || 1} / {roomData?.max_participants || 10}</Text></Text>
            <Text style={[styles.label, { color: theme.text }]}>Subject: <Text style={[styles.value, { color: theme.primary }]}>{roomData?.subject || 'General Study'}</Text></Text>
            {roomData?.description && (
              <Text style={[styles.label, { color: theme.text }]}>Description: <Text style={[styles.value, { color: theme.primary }]}>{roomData.description}</Text></Text>
            )}
            <View style={styles.avatarsRow}>
              <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}><Ionicons name="person" size={20} color="#fff" /></View>
            </View>
          </View>
          {/* Start Group Study Session Button */}
          <TouchableOpacity style={[styles.startSessionBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('StudySessionScreen', { group: true, room: roomData })}>
            <Ionicons name="timer-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.startSessionBtnText}>Start Group Study Session</Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
        {/* FlatList for chat messages - NOT inside any ScrollView */}
        <View style={styles.chatContainerWrapper}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.primary }]}>Loading messages...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentContainerStyle={{ padding: 12 }}
              style={[styles.chatContainer, { backgroundColor: theme.background }]}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.primary }]}>No messages yet</Text>
                  <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Start the conversation!</Text>
                </View>
              }
            />
          )}
        </View>
        {/* Message Input above bottom safe area */}
        <View style={[styles.inputRowSticky, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            placeholder="Type a message..."
            placeholderTextColor={theme.textSecondary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity 
            style={styles.sendBtn} 
            onPress={handleSend} 
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size={20} color={theme.primary} />
            ) : (
              <Ionicons name="send" size={22} color={input.trim() ? theme.primary : theme.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.bottomSpacer} />
      </KeyboardAvoidingView>

      {/* Invite Friends Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.primary }]}>Invite Friends</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowInviteModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Select friends to invite to {roomData?.name}
            </Text>

            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              style={styles.friendsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.friendItem,
                    { backgroundColor: theme.background },
                    selectedFriends.includes(item.id) && [styles.friendItemSelected, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]
                  ]}
                  onPress={() => toggleFriendSelection(item.id)}
                >
                  <View style={styles.friendInfo}>
                    <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
                      <Text style={styles.avatarText}>
                        {item.friend?.full_name?.[0] || item.friend?.username?.[0] || 'U'}
                      </Text>
                    </View>
                    <Text style={[styles.friendName, { color: theme.text }]}>
                      {item.friend?.full_name || item.friend?.username || 'Unknown'}
                    </Text>
                  </View>
                  {selectedFriends.includes(item.id) && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.primary }]}>No friends to invite</Text>
                  <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Add friends first to invite them!</Text>
                </View>
              }
            />

            <TextInput
              style={[styles.messageInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
              placeholder="Add a message (optional)"
              placeholderTextColor={theme.textSecondary}
              value={inviteMessage}
              onChangeText={setInviteMessage}
              multiline
              maxLength={200}
            />

            <TouchableOpacity
              style={[
                styles.sendInviteButton,
                { backgroundColor: theme.primary },
                selectedFriends.length === 0 && [styles.sendInviteButtonDisabled, { backgroundColor: theme.textSecondary }]
              ]}
              onPress={handleSendInvitations}
              disabled={selectedFriends.length === 0}
            >
              <Text style={styles.sendInviteButtonText}>
                Send Invitation{selectedFriends.length !== 1 ? 's' : ''} ({selectedFriends.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  infoCard: { borderRadius: 16, margin: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  label: { fontSize: 16, marginBottom: 6 },
  value: { fontWeight: 'bold' },
  avatarsRow: { flexDirection: 'row', marginTop: 10 },
  avatarImg: { width: 36, height: 36, borderRadius: 18, marginRight: 8, borderWidth: 2, borderColor: '#C8E6C9' },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  startSessionBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28, alignSelf: 'center', marginTop: 0, marginBottom: 12 },
  startSessionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  chatContainerWrapper: { flex: 1, minHeight: 180, maxHeight: 260 },
  chatContainer: { borderRadius: 16, marginHorizontal: 16, marginBottom: 16, flex: 1 },
  messageBubble: { marginBottom: 8, padding: 10, borderRadius: 10, maxWidth: '80%' },
  messageBubbleMe: { alignSelf: 'flex-end' },
  messageBubbleOther: { alignSelf: 'flex-start' },
  messageSender: { fontWeight: 'bold', marginBottom: 2 },
  messageText: { fontSize: 15 },
  inputRowSticky: { flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20 },
  input: { flex: 1, fontSize: 16, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  sendBtn: { padding: 6 },
  leaveBtnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviteBtn: {
    padding: 8,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  friendsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  friendItemSelected: {
    borderWidth: 2,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sendInviteButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendInviteButtonDisabled: {
    // Color set dynamically
  },
  sendInviteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default StudyRoomScreen; 
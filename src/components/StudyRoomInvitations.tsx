import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as StudyRoomService from '../utils/convexStudyRoomService';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

interface StudyRoomInvitationsProps {
  visible: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const StudyRoomInvitations: React.FC<StudyRoomInvitationsProps> = ({
  visible,
  onClose,
  onUpdate
}) => {
  const [invitations, setInvitations] = useState<StudyRoomService.StudyRoomInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (visible && user?.id) {
      loadInvitations();
    }
  }, [visible, user?.id]);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const result = await StudyRoomService.getPendingStudyRoomInvitations();
      if (result.success) {
        setInvitations(result.data || []);
      } else {
        console.error('Error loading invitations:', result.error);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: string) => {
    try {
      const result = await StudyRoomService.respondToStudyRoomInvitation(invitationId, 'accepted');
      if (result.success) {
        Alert.alert('Success', 'Study room invitation accepted!');
        await loadInvitations();
        onUpdate?.();
        
        // Navigate to the study room
        if (result.data?.room) {
          navigation.navigate('StudyRoomScreen' as any, { room: result.data.room });
          onClose();
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleDecline = async (invitationId: string) => {
    try {
      const result = await StudyRoomService.respondToStudyRoomInvitation(invitationId, 'declined');
      if (result.success) {
        Alert.alert('Success', 'Study room invitation declined');
        await loadInvitations();
        onUpdate?.();
      } else {
        Alert.alert('Error', result.error || 'Failed to decline invitation');
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      Alert.alert('Error', 'Failed to decline invitation');
    }
  };

  const renderInvitation = ({ item }: { item: StudyRoomService.StudyRoomInvitation }) => (
    <View style={styles.invitationItem}>
      <View style={styles.invitationInfo}>
        <Text style={styles.roomName}>{item.room?.name || 'Study Room'}</Text>
        <Text style={styles.inviterName}>
          From: {item.sender?.full_name || item.sender?.username || 'Unknown User'}
        </Text>
        {item.room?.subject && (
          <Text style={styles.roomSubject}>Subject: {item.room.subject}</Text>
        )}
        {item.message && (
          <Text style={styles.invitationMessage}>"{item.message}"</Text>
        )}
        <Text style={styles.invitationTime}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.invitationActions}>
        <TouchableOpacity
          onPress={() => handleAccept(item.id)}
          style={[styles.actionButton, styles.acceptButton]}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleDecline(item.id)}
          style={[styles.actionButton, styles.declineButton]}
        >
          <Ionicons name="close" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!visible || (!loading && invitations.length === 0)) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Study Room Invitations ({invitations.length})</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading invitations...</Text>
        </View>
      ) : (
        <FlatList
          data={invitations}
          renderItem={renderInvitation}
          keyExtractor={(item) => item.id}
          style={styles.invitationsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pending invitations</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#4CAF50',
    fontSize: 14,
  },
  invitationsList: {
    maxHeight: 280,
  },
  invitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  invitationInfo: {
    flex: 1,
    marginRight: 12,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inviterName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  roomSubject: {
    fontSize: 13,
    color: '#4CAF50',
    marginBottom: 2,
  },
  invitationMessage: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  invitationTime: {
    fontSize: 12,
    color: '#999',
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
});

export default StudyRoomInvitations;
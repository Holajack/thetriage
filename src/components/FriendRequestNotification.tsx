import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FriendService from '../utils/convexFriendRequestService';

interface FriendRequestNotificationProps {
  visible: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const FriendRequestNotification: React.FC<FriendRequestNotificationProps> = ({
  visible,
  onClose,
  onUpdate
}) => {
  const [requests, setRequests] = useState<FriendService.FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadRequests();
    }
  }, [visible]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const result = await FriendService.getPendingFriendRequests();
      if (result.success) {
        setRequests(result.data || []);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      const result = await FriendService.respondToFriendRequest(requestId, 'accepted');
      if (result.success) {
        Alert.alert('Success', 'Friend request accepted!');
        await loadRequests();
        onUpdate?.();
      } else {
        Alert.alert('Error', result.error || 'Failed to accept friend request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      const result = await FriendService.respondToFriendRequest(requestId, 'declined');
      if (result.success) {
        await loadRequests();
        onUpdate?.();
      } else {
        Alert.alert('Error', result.error || 'Failed to decline friend request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to decline friend request');
    }
  };

  if (!visible || requests.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friend Requests ({requests.length})</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      {requests.map((request) => (
        <View key={request.id} style={styles.requestItem}>
          <View style={styles.requestInfo}>
            <Text style={styles.requestName}>
              {request.sender?.full_name || request.sender?.username || 'Unknown User'}
            </Text>
            {request.message && (
              <Text style={styles.requestMessage}>{request.message}</Text>
            )}
          </View>
          
          <View style={styles.requestActions}>
            <TouchableOpacity
              onPress={() => handleAccept(request.id)}
              style={[styles.actionButton, styles.acceptButton]}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => handleDecline(request.id)}
              style={[styles.actionButton, styles.declineButton]}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 100, // Reduced z-index to be less intrusive
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 300, // Limit height to prevent taking over entire screen
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  requestInfo: {
    flex: 1,
    marginRight: 12,
  },
  requestName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  requestMessage: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
});

export default FriendRequestNotification;
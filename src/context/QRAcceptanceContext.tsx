import React, { createContext, useContext, useState, useEffect } from 'react';
import { Modal, View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import {
  subscribeToPendingQRRequests,
  acceptQRRequest,
  declineQRRequest,
  QRScanNotification,
} from '../utils/qrAcceptanceService';

interface QRAcceptanceContextType {
  // Currently empty, but can add methods here if needed
}

const QRAcceptanceContext = createContext<QRAcceptanceContextType>({});

export const useQRAcceptance = () => useContext(QRAcceptanceContext);

export const QRAcceptanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [notification, setNotification] = useState<QRScanNotification | null>(null);
  const [processing, setProcessing] = useState(false);

  // Subscribe to QR scan notifications
  useEffect(() => {
    if (!user?.id) return;

    console.log('👂 Starting QR acceptance listener for user:', user.id);

    const subscription = subscribeToPendingQRRequests(
      user.id,
      (newNotification) => {
        console.log('🔔 Received QR scan notification:', newNotification);
        setNotification(newNotification);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const handleAccept = async () => {
    if (!notification) return;

    setProcessing(true);
    const result = await acceptQRRequest(notification.requestId);

    if (result.success) {
      // Show success briefly then close
      setTimeout(() => {
        setNotification(null);
        setProcessing(false);
      }, 1000);
    } else {
      setProcessing(false);
      alert(result.error || 'Failed to accept request');
    }
  };

  const handleDecline = async () => {
    if (!notification) return;

    setProcessing(true);
    await declineQRRequest(notification.requestId);
    setNotification(null);
    setProcessing(false);
  };

  const handleDismiss = () => {
    // Dismiss without declining - request stays pending
    setNotification(null);
  };

  return (
    <QRAcceptanceContext.Provider value={{}}>
      {children}

      {/* QR Acceptance Modal */}
      <Modal
        visible={!!notification}
        animationType="slide"
        transparent={true}
        onRequestClose={handleDismiss}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
            >
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>

            {notification && (
              <>
                {/* Title */}
                <Text style={[styles.title, { color: theme.text }]}>
                  Accept this Hiker? 🏔️
                </Text>

                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  {notification.scannerProfile.avatar_url ? (
                    <Image
                      source={{ uri: notification.scannerProfile.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.avatarText, { color: theme.primary }]}>
                        {(notification.scannerProfile.full_name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* User Info */}
                <Text style={[styles.name, { color: theme.text }]}>
                  {notification.scannerProfile.full_name || 'User'}
                </Text>
                <Text style={[styles.username, { color: theme.textSecondary }]}>
                  @{notification.scannerProfile.username || 'user'}
                </Text>

                {notification.scannerProfile.university && notification.scannerProfile.university.trim() !== '' && (
                  <View style={styles.infoRow}>
                    <Ionicons name="school-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.infoText, { color: theme.text }]}>
                      {notification.scannerProfile.university}
                    </Text>
                  </View>
                )}

                {notification.scannerProfile.major && notification.scannerProfile.major.trim() !== '' && (
                  <View style={styles.infoRow}>
                    <Ionicons name="book-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.infoText, { color: theme.text }]}>
                      {notification.scannerProfile.major}
                    </Text>
                  </View>
                )}

                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Someone just scanned your QR code!
                </Text>

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.declineButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={handleDecline}
                    disabled={processing}
                  >
                    <Text style={[styles.declineButtonText, { color: theme.text }]}>
                      Decline
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: theme.primary }]}
                    onPress={handleAccept}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.laterButton}
                  onPress={handleDismiss}
                  disabled={processing}
                >
                  <Text style={[styles.laterButtonText, { color: theme.textSecondary }]}>
                    Decide Later
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </QRAcceptanceContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  dismissButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  username: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  laterButton: {
    paddingVertical: 8,
  },
  laterButtonText: {
    fontSize: 14,
  },
});

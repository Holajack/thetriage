import { supabase } from './supabase';
import { sendFriendRequest, respondToFriendRequest } from './friendRequestService';

export interface QRScanNotification {
  requestId: string;
  scannerId: string;
  scannerProfile: {
    username: string;
    full_name: string;
    avatar_url?: string;
    university?: string;
    major?: string;
  };
  timestamp: string;
}

/**
 * Send a friend request with QR scan metadata
 * This creates a pending request and notifies the QR owner in real-time
 */
export async function sendQRFriendRequest(
  recipientId: string,
  isGalleryUpload: boolean = false
): Promise<{
  success: boolean;
  error?: string;
  requestId?: string;
  requiresWait?: boolean;
}> {
  try {
    // Send friend request without message (column doesn't exist)
    const result = await sendFriendRequest(recipientId);

    if (!result.success) {
      return result;
    }

    const requestId = result.data?.id;
    if (!requestId) {
      return { success: false, error: 'Request created but ID not returned' };
    }

    // For live scanning (not gallery), wait for immediate acceptance
    const requiresWait = !isGalleryUpload;

    return {
      success: true,
      requestId,
      requiresWait
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Wait for the QR owner to accept the friend request in real-time
 * Uses polling to check if the request was accepted
 * Returns true if accepted within timeout, false otherwise
 */
export async function waitForQRAcceptance(
  requestId: string,
  timeoutSeconds: number = 30
): Promise<{ accepted: boolean; error?: string }> {
  const startTime = Date.now();
  const timeoutMs = timeoutSeconds * 1000;
  const pollIntervalMs = 2000; // Poll every 2 seconds

  console.log(`⏳ Waiting up to ${timeoutSeconds}s for QR acceptance...`);

  return new Promise((resolve) => {
    const checkInterval = setInterval(async () => {
      try {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > timeoutMs) {
          console.log('⏰ QR acceptance timeout - falling back to pending request');
          clearInterval(checkInterval);
          resolve({ accepted: false });
          return;
        }

        // Check the friend request status
        const { data, error } = await supabase
          .from('friend_requests')
          .select('status')
          .eq('id', requestId)
          .single();

        if (error) {
          console.error('Error checking request status:', error);
          return;
        }

        if (data?.status === 'accepted') {
          console.log('✅ QR request accepted immediately!');
          clearInterval(checkInterval);
          resolve({ accepted: true });
        } else if (data?.status === 'declined') {
          console.log('❌ QR request declined');
          clearInterval(checkInterval);
          resolve({ accepted: false, error: 'Request declined' });
        }
        // If still pending, continue polling
      } catch (error: any) {
        console.error('Error in polling loop:', error);
        clearInterval(checkInterval);
        resolve({ accepted: false, error: error.message });
      }
    }, pollIntervalMs);

    // Cleanup timeout
    setTimeout(() => {
      clearInterval(checkInterval);
    }, timeoutMs + 1000);
  });
}

/**
 * Accept a QR scan friend request immediately
 * This is called by the QR owner when they see the acceptance popup
 */
export async function acceptQRRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('🤝 Accepting QR friend request:', requestId);

  const result = await respondToFriendRequest(requestId, 'accepted');

  if (result.success) {
    console.log('✅ QR friend request accepted!');
  } else {
    console.error('❌ Failed to accept QR request:', result.error);
  }

  return result;
}

/**
 * Decline a QR scan friend request
 */
export async function declineQRRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('👋 Declining QR friend request:', requestId);

  const result = await respondToFriendRequest(requestId, 'declined');

  return result;
}

/**
 * Subscribe to pending QR friend requests
 * This allows the QR owner to be notified when someone scans their code
 */
export function subscribeToPendingQRRequests(
  userId: string,
  onNewRequest: (notification: QRScanNotification) => void
): { unsubscribe: () => void } {
  let pollInterval: NodeJS.Timeout;
  let lastCheckTime = new Date().toISOString();

  const checkForNewRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          created_at,
          status
        `)
        .eq('recipient_id', userId)
        .eq('status', 'pending')
        .gte('created_at', lastCheckTime)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking for QR requests:', error);
        return;
      }

      // All recent pending requests are treated as potential QR scans
      const qrRequests = data || [];

      if (qrRequests.length > 0) {
        // Fetch sender profiles
        const senderIds = qrRequests.map(req => req.sender_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, university, major')
          .in('id', senderIds);

        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));

          // Notify for each new request
          qrRequests.forEach(request => {
            const profile = profileMap.get(request.sender_id);
            if (profile) {
              console.log('📬 New QR scan request from:', profile.username);
              onNewRequest({
                requestId: request.id,
                scannerId: request.sender_id,
                scannerProfile: {
                  username: profile.username || 'user',
                  full_name: profile.full_name || 'User',
                  avatar_url: profile.avatar_url,
                  university: profile.university,
                  major: profile.major,
                },
                timestamp: request.created_at,
              });
            }
          });
        }

        // Update last check time
        lastCheckTime = new Date().toISOString();
      }
    } catch (error) {
      console.error('Error in QR request subscription:', error);
    }
  };

  // Check immediately
  checkForNewRequests();

  // Then poll every 5 seconds
  pollInterval = setInterval(checkForNewRequests, 5000);

  return {
    unsubscribe: () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        console.log('🔕 Unsubscribed from QR request notifications');
      }
    },
  };
}

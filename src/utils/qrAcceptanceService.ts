import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";
import { sendFriendRequest, respondToFriendRequest } from './convexFriendRequestService';

let _convexClient: ConvexReactClient | null = null;

export function setConvexClient(client: ConvexReactClient) {
  _convexClient = client;
}

function getClient(): ConvexReactClient {
  if (!_convexClient) {
    throw new Error("Convex client not initialized. Call setConvexClient first.");
  }
  return _convexClient;
}

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

        // Check the friend request status via Convex
        const client = getClient();
        const result = await client.query(api.friends.getRequestStatus, {
          requestId: requestId as any,
        });

        if (!result) {
          console.error('Request not found');
          clearInterval(checkInterval);
          resolve({ accepted: false, error: 'Request not found' });
          return;
        }

        if (result.status === 'accepted') {
          console.log('✅ QR request accepted immediately!');
          clearInterval(checkInterval);
          resolve({ accepted: true });
        } else if (result.status === 'declined') {
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
  let lastCheckTime = Date.now();

  const checkForNewRequests = async () => {
    try {
      const client = getClient();

      // Get all pending incoming requests
      const requests = await client.query(api.friends.listRequests, {
        type: "incoming",
      });

      if (!requests || requests.length === 0) {
        return;
      }

      // Filter for new requests since last check
      const newRequests = requests.filter(req => {
        const creationTime = req._creationTime || 0;
        return creationTime > lastCheckTime;
      });

      if (newRequests.length > 0) {
        // Fetch sender profiles for new requests
        for (const request of newRequests) {
          try {
            const senderProfile = await client.query(api.users.getByClerkId, {
              clerkId: request.senderId,
            });

            if (senderProfile) {
              console.log('📬 New QR scan request from:', senderProfile.username);
              onNewRequest({
                requestId: request._id,
                scannerId: request.senderId,
                scannerProfile: {
                  username: senderProfile.username || 'user',
                  full_name: senderProfile.fullName || 'User',
                  avatar_url: senderProfile.avatarUrl,
                  university: senderProfile.university,
                  major: senderProfile.major,
                },
                timestamp: new Date(request._creationTime || Date.now()).toISOString(),
              });
            }
          } catch (error) {
            console.error('Error fetching sender profile:', error);
          }
        }

        // Update last check time to now
        lastCheckTime = Date.now();
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

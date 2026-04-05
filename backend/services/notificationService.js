/**
 * Notification Service - People App Backend
 * 
 * Helper functions for creating and managing notifications.
 * Sends in-app (Socket.io) and push (Expo Push API) when user has registered token.
 */

const axios = require('axios');
const Notification = require('../models/Notification');
const PushToken = require('../models/PushToken');
// Do not require socketio at module load — it would cycle with routes that load this module first.
// getIO is lazy-required inside createNotification when emitting.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const VERBOSE_NOTIF_LOGS = process.env.VERBOSE_NOTIF_LOGS === 'true';

/** Must match bundled sound basename in mobile app (expo-notifications `sounds` in app.json). */
const EXPO_PUSH_SOUND = 'notification_sound.wav';

/** Must match `NOTIFICATION_CHANNEL_ID` + app.json `expo-notifications` → `android.defaultChannel`. */
const EXPO_PUSH_CHANNEL_ID = 'people-alerts';

function toUserIdString(userId) {
  if (userId == null) return '';
  try {
    return String(userId).trim();
  } catch {
    return '';
  }
}

/** FCM/Expo expect string values in `data` for reliable Android delivery. */
function stringifyPushData(data = {}) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  return out;
}

/**
 * Send push notification via Expo Push API (non-blocking)
 */
async function sendExpoPush(userId, title, body, data = {}) {
  try {
    const uid = toUserIdString(userId);
    if (!uid) return;

    const tokens = await PushToken.find({ user: uid }).select('expoPushToken').lean();
    if (!tokens.length) {
      // Always log — most common reason pushes “don’t work” in production
      console.warn(`📲 No Expo push tokens registered for user ${uid} – skipping push (recipient must open app once after login to register)`);
      return;
    }

    const flatData = stringifyPushData(data);

    const messages = tokens.map((t) => ({
      to: t.expoPushToken,
      title,
      body,
      data: flatData,
      // iOS: custom sound filename in app bundle (Expo Push API).
      sound: EXPO_PUSH_SOUND,
      // Android: sound + vibration come from the client channel with this id; high priority improves delivery.
      channelId: EXPO_PUSH_CHANNEL_ID,
      priority: 'high',
    }));

    if (VERBOSE_NOTIF_LOGS) {
      console.log(`📲 Sending Expo push to ${messages.length} device(s) for user ${uid}`);
    }
    const { data: result } = await axios.post(EXPO_PUSH_URL, messages, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (result?.data) {
      result.data.forEach((receipt, i) => {
        if (receipt?.status === 'ok') {
          if (VERBOSE_NOTIF_LOGS) {
            console.log(`📲 Expo push ok for user ${uid} ticket ${receipt.id || i}`);
          }
        }
        if (receipt?.status === 'error') {
          console.warn(`📲 Expo push error for user ${uid} token ${i}:`, receipt?.details?.error || receipt?.message);
          if (receipt?.details?.error === 'DeviceNotRegistered') {
            PushToken.deleteOne({ expoPushToken: messages[i].to }).catch(() => {});
          }
        }
      });
    } else {
      console.warn(`📲 Expo push unexpected response shape for user ${uid}`);
    }
  } catch (err) {
    console.error('Expo push send error:', err.message);
  }
}

/**
 * Create a notification and emit it via Socket.io
 * @param {Object} options - Notification options
 * @param {String} options.userId - User ID to send notification to
 * @param {String} options.type - Notification type
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {Object} options.data - Additional data for the notification
 * @returns {Promise<Object>} Created notification
 */
async function createNotification({ userId, type, title, message, data = {} }) {
  const userIdStr = toUserIdString(userId);
  if (!userIdStr) {
    throw new Error('createNotification: userId is required');
  }

  try {
    const notification = new Notification({
      user: userIdStr,
      type,
      title,
      message,
      data,
    });

    await notification.save();

    // Populate user field for response
    await notification.populate('user', 'fullName phone');

    const notificationData = {
      notification: {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: notification.read,
        createdAt: notification.createdAt,
      },
    };

    // Push even if socket emit fails (getIO can throw if misconfigured)
    sendExpoPush(userIdStr, title, message, {
      type,
      notificationId: notification._id.toString(),
      ...data,
    });

    try {
      const { getIO } = require('../config/socketio');
      const io = getIO();
      if (VERBOSE_NOTIF_LOGS) {
        console.log(`📤 Emitting notification to user ${userIdStr} via Socket.io`);
      }
      io.to(`notifications_${userIdStr}`).emit('new_notification', notificationData);
      if (VERBOSE_NOTIF_LOGS) {
        console.log(`✅ Notification emitted to room: notifications_${userIdStr}`);
      }
    } catch (emitErr) {
      console.warn('Socket emit for notification failed (push still attempted):', emitErr.message);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notification for offer received
 */
async function notifyOfferReceived(clientId, freelancerName, jobTitle, offerAmount) {
  return createNotification({
    userId: clientId,
    type: 'offer_received',
    title: 'New Offer Received',
    message: `${freelancerName} made an offer of ₹${offerAmount} for "${jobTitle}"`,
    data: {
      jobTitle,
      offerAmount,
      freelancerName,
    },
  });
}

/**
 * Create notification for offer accepted
 */
async function notifyOfferAccepted(freelancerId, clientName, jobTitle) {
  return createNotification({
    userId: freelancerId,
    type: 'offer_accepted',
    title: 'Offer Accepted',
    message: `${clientName} accepted your offer for "${jobTitle}"`,
    data: {
      jobTitle,
      clientName,
    },
  });
}

/**
 * Create notification for offer rejected
 */
async function notifyOfferRejected(freelancerId, clientName, jobTitle) {
  return createNotification({
    userId: freelancerId,
    type: 'offer_rejected',
    title: 'Offer Rejected',
    message: `${clientName} rejected your offer for "${jobTitle}"`,
    data: {
      jobTitle,
      clientName,
    },
  });
}

/**
 * Create notification for job assigned
 */
async function notifyJobAssigned(freelancerId, clientName, jobTitle) {
  return createNotification({
    userId: freelancerId,
    type: 'job_assigned',
    title: 'Job Assigned',
    message: `You have been assigned to "${jobTitle}" by ${clientName}`,
    data: {
      jobTitle,
      clientName,
    },
  });
}

/**
 * Create notification for job completed
 */
async function notifyJobCompleted(clientId, freelancerName, jobTitle) {
  return createNotification({
    userId: clientId,
    type: 'job_completed',
    title: 'Job Completed',
    message: `${freelancerName} marked "${jobTitle}" as completed`,
    data: {
      jobTitle,
      freelancerName,
    },
  });
}

/**
 * Create notification for payment received
 */
async function notifyPaymentReceived(freelancerId, clientName, amount, jobTitle) {
  return createNotification({
    userId: freelancerId,
    type: 'payment_received',
    title: 'Payment Received',
    message: `You received ₹${amount} from ${clientName} for "${jobTitle}"`,
    data: {
      amount,
      clientName,
      jobTitle,
    },
  });
}

/**
 * Create notification for payment sent
 */
async function notifyPaymentSent(clientId, freelancerName, amount, jobTitle) {
  return createNotification({
    userId: clientId,
    type: 'payment_sent',
    title: 'Payment Sent',
    message: `You paid ₹${amount} to ${freelancerName} for "${jobTitle}"`,
    data: {
      amount,
      freelancerName,
      jobTitle,
    },
  });
}

/**
 * Create notification for work done
 */
async function notifyWorkDone(clientId, freelancerName, jobTitle) {
  return createNotification({
    userId: clientId,
    type: 'work_done',
    title: 'Work Completed',
    message: `${freelancerName} marked work as done for "${jobTitle}"`,
    data: {
      jobTitle,
      freelancerName,
    },
  });
}

/**
 * Create notification for job picked up (client notification)
 */
async function notifyJobPickedUp(clientId, freelancerName, jobTitle) {
  return createNotification({
    userId: clientId,
    type: 'job_picked_up',
    title: 'Job Picked Up',
    message: `${freelancerName} picked up your job "${jobTitle}"`,
    data: {
      jobTitle,
      freelancerName,
    },
  });
}

/**
 * Client: new application on a non-delivery job
 */
async function notifyApplicationReceived(clientId, freelancerName, jobTitle) {
  return createNotification({
    userId: clientId,
    type: 'application_received',
    title: 'New Application',
    message: `${freelancerName} applied for "${jobTitle}"`,
    data: {
      jobTitle,
      freelancerName,
    },
  });
}

/**
 * Freelancer: application rejected or not selected
 */
async function notifyApplicationRejected(freelancerId, clientName, jobTitle, reason) {
  const msg =
    reason === 'other_selected'
      ? `${clientName} selected another freelancer for "${jobTitle}"`
      : `${clientName} did not select your application for "${jobTitle}"`;
  return createNotification({
    userId: freelancerId,
    type: 'application_rejected',
    title: 'Application Update',
    message: msg,
    data: {
      jobTitle,
      clientName,
      reason: reason || 'rejected',
    },
  });
}

/**
 * Client: freelancer was auto-selected (Auto pick)
 */
async function notifyAutoPickClient(clientId, freelancerName, jobTitle, ratingLabel, jobId) {
  return createNotification({
    userId: clientId,
    type: 'auto_pick',
    title: 'Freelancer auto-selected',
    message: `${freelancerName} was automatically selected for "${jobTitle}" based on experience and ratings (Auto pick: ${ratingLabel}).`,
    data: {
      jobId: jobId != null ? String(jobId) : null,
      jobTitle,
      freelancerName,
      ratingLabel,
    },
  });
}

module.exports = {
  createNotification,
  notifyOfferReceived,
  notifyOfferAccepted,
  notifyOfferRejected,
  notifyJobAssigned,
  notifyJobCompleted,
  notifyPaymentReceived,
  notifyPaymentSent,
  notifyWorkDone,
  notifyJobPickedUp,
  notifyApplicationReceived,
  notifyApplicationRejected,
  notifyAutoPickClient,
};


/**
 * Chat message notifications — isolated from socketio.js to avoid circular requires
 * (socketio → this → notificationService; notificationService must not load socketio at init).
 */

const { createNotification } = require('./notificationService');

function toUserIdString(userId) {
  if (userId == null) return '';
  try {
    return String(userId).trim();
  } catch {
    return '';
  }
}

/**
 * Create notification for chat message (push data must include senderId for opening ChatModal).
 */
async function notifyChatMessage(recipientId, senderName, messagePreview, senderId) {
  const rid = toUserIdString(recipientId);
  if (!rid) {
    return null;
  }
  const sid = senderId != null ? String(senderId) : null;
  return createNotification({
    userId: rid,
    type: 'chat_message',
    title: 'New Message',
    message: `${senderName}: ${messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview}`,
    data: {
      senderName,
      messagePreview,
      ...(sid ? { senderId: sid } : {}),
    },
  });
}

module.exports = { notifyChatMessage };

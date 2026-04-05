/**
 * Chat message notifications — no top-level require of notificationService so this module
 * always exports a real function even under circular load (socketio ↔ notification graph).
 * createNotification is required only when notifyChatMessage runs (after full boot).
 */

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
  const { createNotification } = require('./notificationService');
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

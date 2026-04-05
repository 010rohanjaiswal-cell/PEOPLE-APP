/**
 * When user taps a chat push notification (or in-app notification), dashboards register
 * a handler to load the sender profile and open ChatModal.
 */
let chatTapHandler = null;
/** @type {string|null} */
let queuedSenderId = null;

export function setChatNotificationTapHandler(handler) {
  chatTapHandler = handler;
  if (handler && queuedSenderId) {
    const id = queuedSenderId;
    queuedSenderId = null;
    try {
      handler(id);
    } catch (_) {
      /* ignore */
    }
  }
}

/**
 * @param {string} senderId - Other user's id (message sender)
 */
export function notifyChatNotificationTap(senderId) {
  if (senderId == null || senderId === '') return;
  const id = String(senderId);
  if (chatTapHandler) {
    try {
      chatTapHandler(id);
    } catch (_) {
      /* ignore */
    }
  } else {
    queuedSenderId = id;
  }
}

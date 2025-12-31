/**
 * Notification Service - People App Backend
 * 
 * Helper functions for creating and managing notifications
 */

const Notification = require('../models/Notification');
const { getIO } = require('../config/socketio');

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
  try {
    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      data,
    });

    await notification.save();

    // Populate user field for response
    await notification.populate('user', 'fullName phone');

    // Emit notification via Socket.io
    const io = getIO();
    if (io) {
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
      
      const userIdStr = userId.toString();
      console.log(`📤 Emitting notification to user ${userIdStr} via Socket.io`);
      
      // Emit to both notification room and user room for reliability
      io.to(`notifications_${userIdStr}`).emit('new_notification', notificationData);
      io.to(`user_${userIdStr}`).emit('new_notification', notificationData);
      
      console.log(`✅ Notification emitted to rooms: notifications_${userIdStr}, user_${userIdStr}`);
    } else {
      console.warn('⚠️ Socket.io not available, notification will only be saved to database');
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
 * Create notification for chat message
 */
async function notifyChatMessage(recipientId, senderName, messagePreview) {
  return createNotification({
    userId: recipientId,
    type: 'chat_message',
    title: 'New Message',
    message: `${senderName}: ${messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview}`,
    data: {
      senderName,
      messagePreview,
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
  notifyChatMessage,
};


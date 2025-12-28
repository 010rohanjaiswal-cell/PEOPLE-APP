/**
 * Chat Routes - People App Backend
 * 
 * Routes for real-time messaging
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * Get messages between current user and recipient
 * GET /api/chat/messages/:recipientId
 */
router.get('/messages/:recipientId', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const recipientId = req.params.recipientId;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        error: 'Recipient ID is required',
      });
    }

    // Get messages where current user is sender or recipient
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: recipientId },
        { sender: recipientId, recipient: userId },
      ],
    })
      .populate('sender', 'fullName profilePhoto phone')
      .populate('recipient', 'fullName profilePhoto phone')
      .sort({ createdAt: 1 })
      .lean();

    // Mark messages sent to current user as delivered if not already
    await Message.updateMany(
      {
        sender: recipientId,
        recipient: userId,
        status: { $in: ['sent', 'sending'] },
      },
      {
        $set: { status: 'delivered' },
      }
    );

    res.json({
      success: true,
      messages: messages.map((msg) => ({
        _id: msg._id,
        sender: msg.sender,
        recipient: msg.recipient,
        message: msg.message,
        status: msg.status,
        readAt: msg.readAt,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get messages',
    });
  }
});

/**
 * Send a message
 * POST /api/chat/send
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { recipientId, message } = req.body;

    if (!recipientId || !message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Recipient ID and message are required',
      });
    }

    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found',
      });
    }

    // Create message
    const newMessage = await Message.create({
      sender: userId,
      recipient: recipientId,
      message: message.trim(),
      status: 'sent',
    });

    // Populate sender and recipient
    await newMessage.populate('sender', 'fullName profilePhoto phone');
    await newMessage.populate('recipient', 'fullName profilePhoto phone');

    res.json({
      success: true,
      message: {
        _id: newMessage._id,
        sender: newMessage.sender,
        recipient: newMessage.recipient,
        message: newMessage.message,
        status: newMessage.status,
        readAt: newMessage.readAt,
        createdAt: newMessage.createdAt,
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message',
    });
  }
});

/**
 * Mark messages as read
 * POST /api/chat/mark-read
 */
router.post('/mark-read', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { senderId } = req.body;

    if (!senderId) {
      return res.status(400).json({
        success: false,
        error: 'Sender ID is required',
      });
    }

    // Mark all unread messages from sender as read
    const result = await Message.updateMany(
      {
        sender: senderId,
        recipient: userId,
        status: { $ne: 'read' },
      },
      {
        $set: {
          status: 'read',
          readAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark messages as read',
    });
  }
});

module.exports = router;


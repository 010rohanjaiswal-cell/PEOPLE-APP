/**
 * Socket.io Configuration - People App Backend
 * 
 * Handles real-time messaging via WebSockets
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
// Do not require notificationService at top level — it requires this module (getIO), which
// leaves notifyChatMessage undefined under circular load. Lazy-require inside send_message.
const VERBOSE_SOCKET_LOGS = process.env.VERBOSE_SOCKET_LOGS === 'true';

let io = null;

const setupSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // JWT token contains userId field (not id or _id)
      const userId = decoded.userId || decoded.id || decoded._id;
      
      if (!userId) {
        return next(new Error('Authentication error: Invalid token format'));
      }
      
      const user = await User.findById(userId);
      
      if (!user) {
        console.error('Socket.io auth: User not found for userId:', userId);
        console.error('Decoded token:', { userId: decoded.userId, id: decoded.id, _id: decoded._id });
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket.io authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    if (VERBOSE_SOCKET_LOGS) {
      console.log(`✅ User connected: ${socket.userId}`);
    }

    // Join user's personal room for receiving messages and notifications
    socket.join(`user_${socket.userId}`);
    socket.join(`notifications_${socket.userId}`);

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { recipientId, message } = data;

        if (!recipientId || !message || !message.trim()) {
          socket.emit('error', { message: 'Recipient ID and message are required' });
          return;
        }

        const recipientRoomId = String(recipientId).trim();

        // Verify recipient exists
        const recipient = await User.findById(recipientRoomId);
        if (!recipient) {
          socket.emit('error', { message: 'Recipient not found' });
          return;
        }

        // Create message
        const newMessage = await Message.create({
          sender: socket.userId,
          recipient: recipientRoomId,
          message: message.trim(),
          status: 'sent',
        });

        // Populate sender and recipient
        await newMessage.populate('sender', 'fullName profilePhoto phone');
        await newMessage.populate('recipient', 'fullName profilePhoto phone');

        const messageData = {
          _id: newMessage._id,
          sender: newMessage.sender,
          recipient: newMessage.recipient,
          message: newMessage.message,
          status: newMessage.status,
          readAt: newMessage.readAt,
          createdAt: newMessage.createdAt,
        };

        // Emit to sender (confirmation)
        socket.emit('message_sent', messageData);

        // Emit to recipient (new message)
        io.to(`user_${recipientRoomId}`).emit('new_message', messageData);

        // Create notification for recipient (includes push + in-app; senderId opens chat on tap)
        try {
          const { notifyChatMessage } = require('../services/notificationService');
          const senderName = newMessage.sender?.fullName || 'Someone';
          const messageText = newMessage.message || '';
          const senderOid =
            newMessage.sender?._id || newMessage.sender?.id || socket.userId;
          await notifyChatMessage(recipientRoomId, senderName, messageText, senderOid);
        } catch (notifError) {
          console.error('Error creating chat message notification:', notifError);
          // Don't fail message sending if notification fails
        }

        // Update status to delivered if recipient is online
        const recipientSocket = await io.in(`user_${recipientRoomId}`).fetchSockets();
        if (recipientSocket.length > 0) {
          await Message.findByIdAndUpdate(newMessage._id, { status: 'delivered' });
          messageData.status = 'delivered';
          // Update both sender and recipient with delivered status
          socket.emit('message_sent', messageData);
          io.to(`user_${recipientRoomId}`).emit('new_message', messageData);
        }
      } catch (error) {
        console.error('Error sending message via socket:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle marking messages as read
    socket.on('mark_read', async (data) => {
      try {
        const { senderId } = data;

        if (!senderId) {
          socket.emit('error', { message: 'Sender ID is required' });
          return;
        }

        // Mark all unread messages from sender as read
        const result = await Message.updateMany(
          {
            sender: senderId,
            recipient: socket.userId,
            status: { $ne: 'read' },
          },
          {
            $set: {
              status: 'read',
              readAt: new Date(),
            },
          }
        );

        // Notify sender that messages were read
        io.to(`user_${senderId}`).emit('messages_read', {
          recipientId: socket.userId,
          count: result.modifiedCount,
        });

        socket.emit('mark_read_success', { count: result.modifiedCount });
      } catch (error) {
        console.error('Error marking messages as read via socket:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { recipientId, isTyping } = data;
      if (recipientId) {
        socket.to(`user_${recipientId}`).emit('user_typing', {
          userId: socket.userId,
          isTyping,
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (VERBOSE_SOCKET_LOGS) {
        console.log(`❌ User disconnected: ${socket.userId}`);
      }
    });
  });

  if (VERBOSE_SOCKET_LOGS) {
    console.log('✅ Socket.io initialized');
  }
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call setupSocketIO first.');
  }
  return io;
};

module.exports = { setupSocketIO, getIO };


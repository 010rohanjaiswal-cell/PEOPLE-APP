/**
 * Chat Modal - People App
 * Real-time chat interface with message status indicators
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { chatAPI } from '../../api/chat';
import { useSocket } from '../../hooks/useSocket';

const ChatModal = ({ visible, recipient, onClose }) => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (visible && recipient) {
      loadMessages();
      setupSocketListeners();
      // Mark messages as read when opening chat
      if (recipient.id || recipient._id) {
        markAsRead(recipient.id || recipient._id);
      }
    } else {
      setMessages([]);
      setMessageText('');
      removeSocketListeners();
    }

    return () => {
      removeSocketListeners();
    };
  }, [visible, recipient, socket]);

  const setupSocketListeners = () => {
    if (!socket) return;

    const recipientId = recipient?.id || recipient?._id;

    const handleNewMessage = (messageData) => {
      console.log('Received new message:', messageData);
      // Check if message is for this chat
      const messageRecipientId = messageData.recipient?._id || messageData.recipient?.id || messageData.recipient;
      const messageSenderId = messageData.sender?._id || messageData.sender?.id || messageData.sender;
      const currentUserId = user?.id || user?._id;
      
      // Only process if message is from recipient to current user, or from current user to recipient
      if (
        (messageSenderId === recipientId && messageRecipientId === currentUserId) ||
        (messageSenderId === currentUserId && messageRecipientId === recipientId)
      ) {
        setMessages((prev) => {
          // Check if message already exists
          const exists = prev.some((msg) => msg._id === messageData._id);
          if (exists) {
            // Update existing message (for status updates like delivered/read)
            return prev.map((msg) =>
              msg._id === messageData._id ? messageData : msg
            );
          }
          // Add new message
          return [...prev, messageData];
        });
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Mark as read if message is from current recipient
        if (messageSenderId === recipientId) {
          markAsRead(recipientId);
        }
      }
    };

    const handleMessageSent = (messageData) => {
      console.log('Message sent confirmation:', messageData);
      setSending(false);
      const currentUserId = user?.id || user?._id;
      const messageSenderId = messageData.sender?._id || messageData.sender?.id || messageData.sender;
      
      // Check if this is a message we sent
      if (messageSenderId === currentUserId) {
        setMessages((prev) => {
          // First try to find and replace temp message
          const tempIndex = prev.findIndex((msg) => 
            msg._id?.startsWith('temp_') && 
            msg.message === messageData.message &&
            (msg.sender === currentUserId || msg.sender === messageData.sender?._id || msg.sender === messageData.sender?.id)
          );
          
          if (tempIndex !== -1) {
            // Replace temp message
            const newMessages = [...prev];
            newMessages[tempIndex] = messageData;
            return newMessages;
          }
          
          // If no temp message found, check if message already exists
          const exists = prev.some((msg) => msg._id === messageData._id);
          if (exists) {
            // Update existing message
            return prev.map((msg) =>
              msg._id === messageData._id ? messageData : msg
            );
          }
          
          // Add new message if it doesn't exist
          return [...prev, messageData];
        });
      }
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    const handleMessagesRead = (data) => {
      console.log('Messages read notification:', data);
      // Update message status to read for messages sent by current user
      const currentUserId = user?.id || user?._id;
      setMessages((prev) =>
        prev.map((msg) => {
          const senderId = msg.sender?._id || msg.sender?.id || msg.sender;
          // If this message was sent by current user and recipient has read it
          if (senderId === currentUserId && data.recipientId === recipientId && msg.status !== 'read') {
            return { ...msg, status: 'read' };
          }
          return msg;
        })
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('messages_read', handleMessagesRead);

    // Store handlers for cleanup
    socket._chatHandlers = {
      new_message: handleNewMessage,
      message_sent: handleMessageSent,
      messages_read: handleMessagesRead,
    };
  };

  const removeSocketListeners = () => {
    if (!socket || !socket._chatHandlers) return;
    
    socket.off('new_message', socket._chatHandlers.new_message);
    socket.off('message_sent', socket._chatHandlers.message_sent);
    socket.off('messages_read', socket._chatHandlers.messages_read);
    
    delete socket._chatHandlers;
  };

  const markAsRead = async (senderId) => {
    if (!senderId) return;
    
    try {
      if (socket && isConnected) {
        socket.emit('mark_read', { senderId });
      } else {
        await chatAPI.markAsRead(senderId);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const loadMessages = async () => {
    if (!recipient || !user) return;
    
    try {
      setLoading(true);
      const response = await chatAPI.getMessages(recipient.id || recipient._id);
      if (response.success) {
        setMessages(response.messages || []);
        // Scroll to bottom after loading
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !recipient || !user || sending) return;

    const messageContent = messageText.trim();
    setMessageText('');
    setSending(true);

    // Optimistically add message
    const tempMessage = {
      _id: `temp_${Date.now()}`,
      sender: user.id || user._id,
      recipient: recipient.id || recipient._id,
      message: messageContent,
      status: 'sending',
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      // Try Socket.io first if connected, fallback to REST API
      if (socket && (socket.connected || isConnected)) {
        const recipientId = recipient.id || recipient._id;
        console.log('Sending message via socket:', { recipientId, message: messageContent });
        socket.emit('send_message', {
          recipientId: recipientId,
          message: messageContent,
        });
        // Socket will emit 'message_sent' event with the actual message
        // The temp message will be replaced in handleMessageSent
        // Also set sending to false after a short delay if no confirmation
        setTimeout(() => {
          setSending(false);
        }, 5000);
      } else {
        // Fallback to REST API
        const response = await chatAPI.sendMessage(recipient.id || recipient._id, messageContent);
        if (response.success) {
          // Replace temp message with real one
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === tempMessage._id
                ? { ...response.message, status: 'sent' }
                : msg
            )
          );
          setSending(false);
        } else {
          // Remove temp message on error
          setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id));
          setSending(false);
        }
      }
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id));
      setSending(false);
    }
  };

  const renderMessageStatus = (status) => {
    switch (status) {
      case 'sending':
        return <ActivityIndicator size="small" color={colors.text.muted} />;
      case 'sent':
        return <MaterialIcons name="done" size={16} color={colors.text.muted} />;
      case 'delivered':
        return <MaterialIcons name="done-all" size={16} color={colors.text.muted} />;
      case 'read':
        return <MaterialIcons name="done-all" size={16} color="#4CAF50" />; // Green color for read
      default:
        return <MaterialIcons name="done" size={16} color={colors.text.muted} />;
    }
  };

  const renderMessage = ({ item }) => {
    const senderId = item.sender?._id || item.sender?.id || item.sender;
    const isMyMessage = senderId === (user?.id || user?._id);

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.message}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
              ]}
            >
              {new Date(item.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {isMyMessage && (
              <View style={styles.statusIcon}>
                {renderMessageStatus(item.status || 'sent')}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!recipient) return null;

  const recipientName = recipient?.verification?.fullName || recipient?.fullName || 'User';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.headerName}>{recipientName}</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Messages List */}
            <View style={styles.messagesContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary.main} />
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(item) => item._id || item.id || `msg_${item.createdAt}`}
                  renderItem={renderMessage}
                  contentContainerStyle={styles.messagesList}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No messages yet</Text>
                    </View>
                  }
                />
              )}
            </View>

            {/* Input Area */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor={colors.text.muted}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!messageText.trim() || sending) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialIcons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    height: '70%',
    backgroundColor: colors.background,
    borderRadius: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerName: {
    flex: 1,
    ...typography.h3,
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageContainer: {
    marginBottom: spacing.sm,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: spacing.md,
  },
  myMessageBubble: {
    backgroundColor: colors.primary.main,
  },
  otherMessageBubble: {
    backgroundColor: colors.cardBackground,
  },
  messageText: {
    ...typography.body,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: colors.text.primary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  messageTime: {
    ...typography.small,
    fontSize: 11,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: colors.text.muted,
  },
  statusIcon: {
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.muted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardBackground,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.background,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.text.muted,
    opacity: 0.5,
  },
});

export default ChatModal;

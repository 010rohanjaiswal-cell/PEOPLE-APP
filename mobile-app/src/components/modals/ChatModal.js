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

    const handleNewMessage = (messageData) => {
      setMessages((prev) => {
        // Check if message already exists
        const exists = prev.some((msg) => msg._id === messageData._id);
        if (exists) {
          // Update existing message
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
      const recipientId = recipient?.id || recipient?._id;
      if (messageData.sender?._id === recipientId || messageData.sender?.id === recipientId) {
        markAsRead(recipientId);
      }
    };

    const handleMessageSent = (messageData) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageData._id || (msg._id?.startsWith('temp_') && msg.message === messageData.message)
            ? messageData
            : msg
        )
      );
    };

    const handleMessagesRead = (data) => {
      // Update message status to read
      setMessages((prev) =>
        prev.map((msg) => {
          const senderId = msg.sender?._id || msg.sender?.id || msg.sender;
          if (senderId === (user?.id || user?._id) && msg.status !== 'read') {
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
      if (socket && isConnected) {
        socket.emit('send_message', {
          recipientId: recipient.id || recipient._id,
          message: messageContent,
        });
        // Socket will emit 'message_sent' event with the actual message
        // The temp message will be replaced in handleMessageSent
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
        } else {
          // Remove temp message on error
          setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id));
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
    } finally {
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
        return <MaterialIcons name="done-all" size={16} color={colors.primary.main} />;
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
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{recipientName}</Text>
              <Text style={[styles.headerStatus, isConnected ? styles.onlineStatus : styles.offlineStatus]}>
                {isConnected ? 'Online' : 'Offline'}
              </Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <MaterialIcons name="more-vert" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Messages List */}
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
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="chat-bubble-outline" size={48} color={colors.text.muted} />
                  <Text style={styles.emptyText}>No messages yet</Text>
                  <Text style={styles.emptySubtext}>Start the conversation!</Text>
                </View>
              }
            />
          )}

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
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: Platform.OS === 'ios' ? 40 : 0,
    borderTopLeftRadius: spacing.lg,
    borderTopRightRadius: spacing.lg,
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
  headerInfo: {
    flex: 1,
  },
  headerName: {
    ...typography.h3,
    color: colors.text.primary,
  },
  headerStatus: {
    ...typography.small,
    marginTop: 2,
  },
  onlineStatus: {
    color: colors.success.main,
  },
  offlineStatus: {
    color: colors.text.muted,
  },
  moreButton: {
    padding: spacing.xs,
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
    borderBottomRightRadius: spacing.xs,
  },
  otherMessageBubble: {
    backgroundColor: colors.cardBackground,
    borderBottomLeftRadius: spacing.xs,
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
    ...typography.h3,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.text.muted,
    marginTop: spacing.xs,
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


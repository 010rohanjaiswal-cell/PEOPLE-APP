/**
 * User Details Modal - People App
 * Reusable bottom-sheet style modal to show basic user info
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../common';

const UserDetailsModal = ({ visible, user, roleLabel, title, onClose }) => {
  if (!visible || !user) return null;

  const name = user.verification?.fullName || user.fullName || 'N/A';
  const profilePhoto = user.profilePhoto || user.verification?.profilePhoto || null;
  const phone = user.phone || null;

  const handleCall = () => {
    if (!phone) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }
    // Remove spaces but keep + for tel: link
    const phoneNumber = phone.replace(/\s/g, '');
    const telUrl = `tel:${phoneNumber}`;
    Linking.openURL(telUrl).catch((err) => {
      console.error('Error opening phone dialer:', err);
      Alert.alert('Error', 'Unable to open phone dialer');
    });
  };

  const handleChat = () => {
    if (!phone) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }
    // Remove spaces and + for WhatsApp (needs country code without +)
    const phoneNumber = phone.replace(/\s/g, '').replace(/\+/g, '');
    // Try WhatsApp first, fallback to SMS
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}`;
    const smsUrl = `sms:${phone.replace(/\s/g, '')}`; // Keep + for SMS
    
    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          // Fallback to SMS
          return Linking.openURL(smsUrl);
        }
      })
      .catch((err) => {
        console.error('Error opening chat:', err);
        // Fallback to SMS
        Linking.openURL(smsUrl).catch((smsErr) => {
          Alert.alert('Error', 'Unable to open messaging app');
        });
      });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{title || 'User Details'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.profileHeader}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
              ) : (
                <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                  <MaterialIcons name="person" size={40} color={colors.text.secondary} />
                </View>
              )}

              <Text style={styles.name}>{name}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.actionButtons}>
              {phone && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.callButton]}
                    onPress={handleCall}
                  >
                    <MaterialIcons name="phone" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.chatButton]}
                    onPress={handleChat}
                  >
                    <MaterialIcons name="chat" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Chat</Text>
                  </TouchableOpacity>
                </>
              )}
              <Button variant="outline" onPress={onClose} style={styles.closeButtonFooter}>
                Close
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  modal: {
    backgroundColor: colors.background,
    borderRadius: spacing.lg,
    maxHeight: '85%',
    width: '90%',
    marginBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  profilePhoto: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: spacing.md,
  },
  profilePhotoPlaceholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  role: {
    ...typography.body,
    color: colors.text.secondary,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.sm,
    marginBottom: spacing.sm,
  },
  callButton: {
    backgroundColor: colors.success.main,
  },
  chatButton: {
    backgroundColor: colors.primary.main,
  },
  actionButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  closeButtonFooter: {
    minHeight: 48,
    paddingVertical: spacing.md,
  },
});

export default UserDetailsModal;



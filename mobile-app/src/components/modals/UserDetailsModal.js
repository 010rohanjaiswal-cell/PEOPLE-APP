/**
 * User Details Modal - People App
 * Reusable bottom-sheet style modal to show basic user info
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../common';
import ChatModal from './ChatModal';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const UserDetailsModal = ({ visible, user, roleLabel, title, onClose }) => {
  const { t } = useLanguage();
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [photoPreviewVisible, setPhotoPreviewVisible] = useState(false);

  useEffect(() => {
    if (!visible) setPhotoPreviewVisible(false);
  }, [visible]);

  if (!visible || !user) return null;

  // Helper function to calculate age
  const calculateAge = (dob) => {
    if (!dob) return null;
    try {
      let birthDate;
      if (typeof dob === 'string' && dob.includes('-')) {
        const parts = dob.split('-');
        if (parts.length === 3) {
          birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          birthDate = new Date(dob);
        }
      } else {
        birthDate = new Date(dob);
      }
      
      if (isNaN(birthDate.getTime())) return null;
      
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 0 || age > 150) return null;
      return age;
    } catch (error) {
      return null;
    }
  };

  // Show full details when viewing freelancer (client viewing freelancer)
  const isFreelancerView = roleLabel === 'Freelancer';
  // Show Call/Chat buttons when viewing freelancer OR when viewing client (freelancer viewing client)
  const showContactButtons = roleLabel === 'Freelancer' || roleLabel === 'Client';

  const name = user.verification?.fullName || user.fullName || 'N/A';
  const profilePhoto = user.profilePhoto || user.verification?.profilePhoto || null;
  const phone = user.phone || 'N/A';
  const email = user.email || null;
  const age = calculateAge(user.verification?.dob || user.dob);
  const gender = user.verification?.gender || user.gender || null;
  const address = user.verification?.address || user.address || null;

  const handleCall = () => {
    if (!phone) {
      Alert.alert(t('common.error'), t('common.phoneNumberNotAvailable'));
      return;
    }
    // Remove spaces but keep + for tel: link
    const phoneNumber = phone.replace(/\s/g, '');
    const telUrl = `tel:${phoneNumber}`;
    Linking.openURL(telUrl).catch((err) => {
      console.error('Error opening phone dialer:', err);
      Alert.alert(t('common.error'), t('common.unableToOpenDialer'));
    });
  };

  const handleChat = () => {
    // Open chat modal instead of external apps
    setChatModalVisible(true);
  };

  return (
    <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{title || t('common.userDetails')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.profileHeader}>
              {profilePhoto ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setPhotoPreviewVisible(true)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={t('common.viewPhoto') || 'View profile photo'}
                >
                  <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
                  <Text style={styles.tapToEnlargeHint}>Tap to view</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                  <MaterialIcons name="person" size={40} color={colors.text.secondary} />
                </View>
              )}

              <Text style={styles.name}>{name}</Text>
              {roleLabel ? <Text style={styles.role}>{roleLabel}</Text> : null}
            </View>

            {/* Show full details only when viewing freelancer */}
            {isFreelancerView && (
              <View style={styles.infoSection}>
                {age ? (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="cake" size={20} color={colors.text.secondary} />
                    <Text style={styles.infoText}>{age} years old</Text>
                  </View>
                ) : null}
                {gender ? (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="person" size={20} color={colors.text.secondary} />
                    <Text style={styles.infoText}>{gender.charAt(0).toUpperCase() + gender.slice(1)}</Text>
                  </View>
                ) : null}
                <View style={styles.infoRow}>
                  <MaterialIcons name="phone" size={20} color={colors.text.secondary} />
                  <Text style={styles.infoText}>{phone}</Text>
                </View>
                {email ? (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="email" size={20} color={colors.text.secondary} />
                    <Text style={styles.infoText}>{email}</Text>
                  </View>
                ) : null}
                {address ? (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="location-on" size={20} color={colors.text.secondary} />
                    <Text style={[styles.infoText, styles.addressText]}>{address}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.actionButtons}>
              {/* Show Call/Chat buttons when viewing freelancer OR when viewing client */}
              {showContactButtons && phone && phone !== 'N/A' && (
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

      {/* Chat Modal */}
      <ChatModal
        visible={chatModalVisible}
        recipient={user}
        onClose={() => setChatModalVisible(false)}
      />
    </Modal>

    {/* Sibling modal avoids nested-Modal issues on some devices */}
    <Modal
      visible={photoPreviewVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setPhotoPreviewVisible(false)}
    >
      <Pressable style={styles.photoPreviewOverlay} onPress={() => setPhotoPreviewVisible(false)}>
        <View style={styles.photoPreviewInner} pointerEvents="box-none">
          <Image
            source={{ uri: profilePhoto }}
            style={styles.photoPreviewImage}
            resizeMode="contain"
          />
          <Text style={styles.photoPreviewHint}>Tap anywhere to close</Text>
        </View>
      </Pressable>
    </Modal>
    </>
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
    marginBottom: spacing.xs,
  },
  tapToEnlargeHint: {
    ...typography.small,
    fontSize: 11,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  photoPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  photoPreviewInner: {
    width: SCREEN_W,
    maxHeight: SCREEN_H * 0.88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreviewImage: {
    width: SCREEN_W - spacing.lg * 2,
    height: SCREEN_H * 0.7,
  },
  photoPreviewHint: {
    marginTop: spacing.lg,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
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
  infoSection: {
    marginTop: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.body,
    color: colors.text.primary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  addressText: {
    flexWrap: 'wrap',
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



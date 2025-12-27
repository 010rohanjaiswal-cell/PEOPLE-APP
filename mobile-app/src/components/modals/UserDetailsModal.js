/**
 * User Details Modal - People App
 * Reusable bottom-sheet style modal to show basic user info
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../common';

const UserDetailsModal = ({ visible, user, roleLabel, title, onClose }) => {
  if (!visible || !user) return null;

  // Debug logging
  console.log('UserDetailsModal - User data:', JSON.stringify({
    hasUser: !!user,
    fullName: user?.fullName,
    phone: user?.phone,
    email: user?.email,
    hasVerification: !!user?.verification,
    verificationKeys: user?.verification ? Object.keys(user.verification) : [],
    verificationData: user?.verification
  }, null, 2));

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

  const name = user.verification?.fullName || user.fullName || 'N/A';
  const phone = user.phone || 'N/A';
  const email = user.email || null;
  const age = calculateAge(user.verification?.dob || user.dob);
  const gender = user.verification?.gender || user.gender || null;
  const address = user.verification?.address || user.address || null;
  const profilePhoto = user.profilePhoto || user.verification?.profilePhoto || null;

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

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.profileHeader}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
              ) : (
                <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                  <MaterialIcons name="person" size={40} color={colors.text.secondary} />
                </View>
              )}

              <Text style={styles.name}>{name}</Text>
              {roleLabel ? <Text style={styles.role}>{roleLabel}</Text> : null}
            </View>

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
          </ScrollView>

          <View style={styles.footer}>
            <Button variant="outline" onPress={onClose}>
              Close
            </Button>
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
});

export default UserDetailsModal;



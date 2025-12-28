/**
 * Profile Tab - Freelancer Dashboard
 * Displays basic freelancer profile information
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/common';
import { verificationAPI, userAPI } from '../../api';

const Profile = () => {
  const { user } = useAuth();
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVerificationData = async () => {
      try {
        // Try verification API first
        const response = await verificationAPI.getVerificationStatus();
        
        // Handle different response structures
        let verificationData = null;
        if (response.success) {
          if (response.verification) {
            verificationData = response.verification;
          } else if (response.data?.verification) {
            verificationData = response.data.verification;
          } else if (response.data) {
            verificationData = response.data;
          }
        }
        
        // If no verification data from verification API, try user profile endpoint
        if (!verificationData || (!verificationData.dob && !verificationData.gender && !verificationData.address)) {
          try {
            const profileResponse = await userAPI.getProfile();
            if (profileResponse.success && profileResponse.user?.verification) {
              verificationData = profileResponse.user.verification;
            }
          } catch (profileError) {
            console.error('Error loading from user profile:', profileError);
          }
        }
        
        if (verificationData) {
          setVerification(verificationData);
        }
      } catch (error) {
        console.error('Error loading verification data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadVerificationData();
    }
  }, [user]);

  const calculateAge = (dob) => {
    if (!dob) {
      return null;
    }
    try {
      // Handle YYYY-MM-DD format (from verification form)
      let birthDate;
      if (typeof dob === 'string' && dob.includes('-')) {
        // Parse YYYY-MM-DD format
        const parts = dob.split('-');
        if (parts.length === 3) {
          birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          birthDate = new Date(dob);
        }
      } else {
        birthDate = new Date(dob);
      }
      
      if (isNaN(birthDate.getTime())) {
        return null;
      }
      
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 0 || age > 150) {
        return null;
      }
      
      return age;
    } catch (error) {
      return null;
    }
  };

  if (!user) {
    return null;
  }

  const displayName = verification?.fullName || user.fullName || 'Freelancer';
  const age = calculateAge(verification?.dob);
  const gender = verification?.gender || null;
  const address = verification?.address || null;
  const phone = user.phone || 'N/A';

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <CardContent>
          <View style={styles.profileHeader}>
            {user.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                <MaterialIcons name="person" size={48} color={colors.text.secondary} />
              </View>
            )}
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.role}>Freelancer</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary.main} />
            </View>
          ) : (
            <View style={styles.infoSection}>
              {!verification && (
                <View style={styles.infoMessage}>
                  <MaterialIcons name="info-outline" size={20} color={colors.text.secondary} />
                  <Text style={styles.infoMessageText}>
                    Verification details will appear here after you submit your verification.
                  </Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <MaterialIcons name="person" size={20} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoText}>{displayName}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialIcons name="cake" size={20} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>Age:</Text>
                <Text style={styles.infoText}>
                  {age !== null ? `${age} years` : verification?.dob ? `DOB: ${verification.dob}` : 'N/A'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialIcons name="wc" size={20} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>Gender:</Text>
                <Text style={styles.infoText}>{gender || 'N/A'}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={20} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoText}>{address || 'N/A'}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialIcons name="phone" size={20} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>Mobile:</Text>
                <Text style={styles.infoText}>{phone}</Text>
              </View>
            </View>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  card: {
    width: '100%',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  infoSection: {
    marginTop: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoLabel: {
    ...typography.body,
    color: colors.text.secondary,
    fontWeight: '500',
    minWidth: 70,
  },
  infoText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary.light,
    borderWidth: 1,
    borderColor: colors.primary.main,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoMessageText: {
    ...typography.small,
    color: colors.text.secondary,
    flex: 1,
  },
});

export default Profile;



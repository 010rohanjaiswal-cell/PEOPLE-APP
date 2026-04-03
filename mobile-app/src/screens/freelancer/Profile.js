/**
 * Profile Tab - Freelancer Dashboard
 * Displays basic freelancer profile information
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardContent } from '../../components/common';
import { verificationAPI, userAPI } from '../../api';

function createFreelancerProfileStyles(colors) {
  return StyleSheet.create({
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
}

const Profile = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useMemo(() => createFreelancerProfileStyles(colors), [colors]);


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
      const parseDob = (value) => {
        if (!value) return null;
        if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
        const s = String(value).trim();
        if (!s) return null;

        // YYYY-MM-DD or YYYY/MM/DD
        if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) {
          const [y, m, d] = s.split(/[-/]/).map((p) => parseInt(p, 10));
          const dt = new Date(y, m - 1, d);
          return isNaN(dt.getTime()) ? null : dt;
        }

        // DD-MM-YYYY or DD/MM/YYYY (common in Aadhaar)
        if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s)) {
          const [d, m, y] = s.split(/[-/]/).map((p) => parseInt(p, 10));
          const dt = new Date(y, m - 1, d);
          return isNaN(dt.getTime()) ? null : dt;
        }

        const dt = new Date(s);
        return isNaN(dt.getTime()) ? null : dt;
      };

      const birthDate = parseDob(dob);
      
      if (!birthDate) {
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

  const displayName = verification?.fullName || user.fullName || t('common.freelancer');
  const age = calculateAge(verification?.dob);
  const gender = verification?.gender || null;
  const address = verification?.address || null;
  const phone = user.phone || t('freelancerProfile.notAvailable');
  const na = t('freelancerProfile.notAvailable');

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
            <Text style={styles.role}>{t('common.freelancer')}</Text>
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
                  <Text style={styles.infoMessageText}>{t('freelancerProfile.verificationHint')}</Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <MaterialIcons name="person" size={20} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>{t('freelancerProfile.nameLabel')}</Text>
                <Text style={styles.infoText}>{displayName}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialIcons name="cake" size={20} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>{t('freelancerProfile.ageLabel')}</Text>
                <Text style={styles.infoText}>
                  {age !== null
                    ? t('freelancerProfile.yearsOld').replace('{age}', String(age))
                    : verification?.dob
                      ? t('freelancerProfile.dobLine').replace('{dob}', String(verification.dob))
                      : na}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialIcons name="wc" size={20} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>{t('freelancerProfile.genderLabel')}</Text>
                <Text style={styles.infoText}>{gender || na}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={20} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>{t('freelancerProfile.addressLabel')}</Text>
                <Text style={styles.infoText}>{address || na}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialIcons name="phone" size={20} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>{t('freelancerProfile.mobileLabel')}</Text>
                <Text style={styles.infoText}>{phone}</Text>
              </View>
            </View>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
};

export default Profile;



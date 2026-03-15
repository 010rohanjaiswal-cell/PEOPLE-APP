/**
 * Settings Screen - Freelancer Dashboard
 * Settings and preferences for freelancers
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardContent } from '../../components/common';
import PrivacyPolicy from '../common/PrivacyPolicy';
import TermsAndConditions from '../common/TermsAndConditions';
import About from '../common/About';
import RefundPolicy from '../common/RefundPolicy';
import HelpAndSupport from '../common/HelpAndSupport';

const Settings = ({ onNavigate }) => {
  const { user } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsAndConditions, setShowTermsAndConditions] = useState(false);
  const [showRefundPolicy, setShowRefundPolicy] = useState(false);
  const [showHelpAndSupport, setShowHelpAndSupport] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  if (showPrivacyPolicy) {
    return <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />;
  }

  if (showTermsAndConditions) {
    return <TermsAndConditions onClose={() => setShowTermsAndConditions(false)} />;
  }

  if (showRefundPolicy) {
    return <RefundPolicy onClose={() => setShowRefundPolicy(false)} />;
  }

  if (showHelpAndSupport) {
    return <HelpAndSupport onClose={() => setShowHelpAndSupport(false)} />;
  }

  if (showAbout) {
    return <About onClose={() => setShowAbout(false)} />;
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <CardContent>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <Text style={styles.settingDescription}>{t('settings.languageDesc')}</Text>
          <View style={styles.languageRow}>
            {['en', 'hi'].map((code) => (
              <TouchableOpacity
                key={code}
                style={[styles.languageOption, locale === code && styles.languageOptionActive]}
                onPress={() => setLocale(code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.languageOptionText, locale === code && styles.languageOptionTextActive]}>
                  {t('languages.' + code)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </CardContent>
      </Card>

      <Card style={styles.card}>
        <CardContent>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="notifications" size={24} color={colors.text.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{t('settings.pushNotifications')}</Text>
                <Text style={styles.settingDescription}>{t('settings.pushNotificationsDescFreelancer')}</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.primary.main }}
              thumbColor={colors.background}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="email" size={24} color={colors.text.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{t('settings.emailNotifications')}</Text>
                <Text style={styles.settingDescription}>{t('settings.emailNotificationsDesc')}</Text>
              </View>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: colors.border, true: colors.primary.main }}
              thumbColor={colors.background}
            />
          </View>
        </CardContent>
      </Card>

      <Card style={styles.card}>
        <CardContent>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowPrivacyPolicy(true)}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons name="lock" size={24} color={colors.text.primary} />
              <Text style={styles.settingLabel}>{t('settings.privacySecurity')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowTermsAndConditions(true)}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons name="description" size={24} color={colors.text.primary} />
              <Text style={styles.settingLabel}>{t('settings.termsAndConditions')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowRefundPolicy(true)}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons name="money-off" size={24} color={colors.text.primary} />
              <Text style={styles.settingLabel}>{t('settings.refundPolicy')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowHelpAndSupport(true)}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons name="help" size={24} color={colors.text.primary} />
              <Text style={styles.settingLabel}>{t('settings.helpSupport')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowAbout(true)}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons name="info" size={24} color={colors.text.primary} />
              <Text style={styles.settingLabel}>{t('settings.about')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </CardContent>
      </Card>

      <Card style={styles.card}>
        <CardContent>
          <Text style={styles.sectionTitle}>{t('settings.appVersion')}</Text>
          <Text style={styles.versionText}>1.0.0</Text>
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
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  settingDescription: {
    ...typography.small,
    color: colors.text.secondary,
  },
  versionText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  languageRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  languageOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  languageOptionActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light || colors.primary.main + '20',
  },
  languageOptionText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  languageOptionTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
});

export default Settings;


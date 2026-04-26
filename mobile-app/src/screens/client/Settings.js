/**
 * Settings Screen - Client Dashboard
 * Settings and preferences for clients
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardContent } from '../../components/common';
import PrivacyPolicy from '../common/PrivacyPolicy';
import TermsAndConditions from '../common/TermsAndConditions';
import About from '../common/About';
import RefundPolicy from '../common/RefundPolicy';
import HelpAndSupport from '../common/HelpAndSupport';

function buildSettingsStyles(colors) {
  return StyleSheet.create({
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
  });
}

const Settings = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { colors, isDark, setDarkMode } = useTheme();
  const styles = useMemo(() => buildSettingsStyles(colors), [colors]);
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
          <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="dark-mode" size={24} color={colors.text.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{t('settings.darkMode')}</Text>
                <Text style={styles.settingDescription}>{t('settings.darkModeDesc')}</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.border, true: colors.primary.main }}
              thumbColor={colors.cardBackground}
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
          <Text style={styles.versionText}>1.0.0 (9)</Text>
        </CardContent>
      </Card>
    </ScrollView>
  );
};

export default Settings;

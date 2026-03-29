import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { verificationAPI } from '../../api';

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
    header: { gap: spacing.xs },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    title: { ...typography.h2, color: colors.text.primary },
    subtitle: { ...typography.body, color: colors.text.secondary, lineHeight: 22 },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    codeLabel: { ...typography.small, color: colors.text.secondary, fontWeight: '600' },
    codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
    code: { fontSize: 22, fontWeight: '800', letterSpacing: 1.2, color: colors.primary.main },
    hint: { ...typography.small, color: colors.text.secondary, marginTop: spacing.md, lineHeight: 18 },
    bullet: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    bulletText: { ...typography.body, color: colors.text.primary, flex: 1, lineHeight: 22 },
    reloadButton: {
      flexDirection: 'row',
      gap: spacing.xs,
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primary.main,
      marginTop: spacing.md,
    },
    reloadText: { ...typography.small, color: colors.primary.main, fontWeight: '700' },
    loadingBox: { paddingVertical: spacing.xl, alignItems: 'center' },
    errorBox: {
      backgroundColor: colors.error.light,
      borderWidth: 1,
      borderColor: colors.error.main,
      borderRadius: 12,
      padding: spacing.md,
    },
    errorText: { ...typography.small, color: colors.error.main, textAlign: 'center' },
    actionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary.main,
      backgroundColor: colors.cardBackground,
    },
    actionButtonFilled: {
      backgroundColor: colors.primary.main,
      borderColor: colors.primary.main,
    },
    actionButtonText: { ...typography.small, color: colors.primary.main, fontWeight: '700' },
    actionButtonTextFilled: { ...typography.small, color: '#FFFFFF', fontWeight: '700' },
    copiedBanner: {
      marginTop: spacing.sm,
      ...typography.small,
      color: colors.success.main,
      fontWeight: '600',
    },
  });
}

const Referral = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [justCopied, setJustCopied] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const resp = await verificationAPI.getMyReferralCode();
      const c = resp?.referral?.code || '';
      if (!resp?.success || !c) throw new Error(resp?.error || 'Failed to load referral code');
      setCode(String(c));
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2200);
    } catch {
      setJustCopied(false);
    }
  };

  const handleShare = async () => {
    if (!code) return;
    try {
      await Share.share({
        message: t('referral.shareMessage').replace(/\{code\}/g, code),
      });
    } catch {
      // user dismissed share sheet
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <MaterialIcons name="celebration" size={26} color={colors.success.main} />
            <Text style={styles.title}>{t('referral.title')}</Text>
          </View>
          <Text style={styles.subtitle}>{t('referral.subtitle')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.codeLabel}>{t('referral.yourCode')}</Text>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.primary.main} />
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.reloadButton} onPress={load} activeOpacity={0.8}>
                <MaterialIcons name="refresh" size={16} color={colors.primary.main} />
                <Text style={styles.reloadText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.codeRow}>
                <Text selectable style={styles.code}>
                  {code}
                </Text>
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonFilled]}
                  onPress={handleCopy}
                  activeOpacity={0.85}
                  accessibilityLabel={t('referral.copyCode')}
                >
                  <MaterialIcons name="content-copy" size={18} color="#FFFFFF" />
                  <Text style={styles.actionButtonTextFilled}>{t('referral.copyCode')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShare}
                  activeOpacity={0.85}
                  accessibilityLabel={t('referral.shareCode')}
                >
                  <MaterialIcons name="share" size={18} color={colors.primary.main} />
                  <Text style={styles.actionButtonText}>{t('referral.shareCode')}</Text>
                </TouchableOpacity>
              </View>
              {justCopied ? <Text style={styles.copiedBanner}>{t('referral.copied')}</Text> : null}
              <Text style={styles.hint}>{t('referral.codeHint')}</Text>

              <View style={styles.bullet}>
                <MaterialIcons name="auto-awesome" size={18} color={colors.primary.main} />
                <Text style={styles.bulletText}>{t('referral.bulletLifetime')}</Text>
              </View>
              <View style={styles.bullet}>
                <MaterialIcons name="verified" size={18} color={colors.success.main} />
                <Text style={styles.bulletText}>{t('referral.bulletVerification')}</Text>
              </View>
              <View style={styles.bullet}>
                <MaterialIcons name="lock" size={18} color={colors.text.secondary} />
                <Text style={styles.bulletText}>{t('referral.bulletOneTime')}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Referral;


/**
 * About Screen
 * Displays information about People Enterprises
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

const About = ({ onClose }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <View style={styles.section}>
          <Text style={styles.title}>About People Enterprises</Text>
          <Text style={styles.paragraph}>
            We are a leading platform that connects skilled professionals with clients who need their expertise. Our mission is to create opportunities for both service providers and those seeking quality services.
          </Text>
          <Text style={styles.paragraph}>
            Whether you're a client looking for reliable professionals or a freelancer seeking rewarding projects, our platform provides the tools and support you need to succeed.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  backButton: {
    padding: spacing.xs,
  },
  backButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.primary.main,
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  paragraph: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
});

export default About;


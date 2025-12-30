/**
 * Help and Support Screen
 * Provides support information and contact details
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

const HelpAndSupport = ({ onClose }) => {
  const handleEmailPress = () => {
    Linking.openURL('mailto:rohanjaiswar2467@gmail.com?subject=Support Request - People App');
  };

  const handleCallPress = () => {
    Linking.openURL('tel:+917021098460');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Introduction */}
          <View style={styles.section}>
            <Text style={styles.title}>Welcome to People Support</Text>
            <Text style={styles.paragraph}>
              We're here to help you get the most out of the People platform. Whether you're a client looking for skilled professionals or a freelancer seeking opportunities, our support team is dedicated to assisting you with any questions, concerns, or issues you may encounter.
            </Text>
            <Text style={styles.paragraph}>
              Our comprehensive support system ensures that you receive timely and effective assistance whenever you need it. We understand that navigating a platform can sometimes be challenging, and we're committed to making your experience as smooth and enjoyable as possible.
            </Text>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Get in Touch</Text>
            <Text style={styles.paragraph}>
              We offer multiple ways to reach our support team. Choose the method that works best for you, and we'll respond as quickly as possible.
            </Text>

            {/* Email Support */}
            <View style={styles.contactCard}>
              <View style={styles.contactHeader}>
                <MaterialIcons name="email" size={24} color={colors.primary.main} />
                <Text style={styles.contactTitle}>Email Support</Text>
              </View>
              <Text style={styles.contactDescription}>
                For detailed inquiries, documentation requests, or issues that require screenshots or attachments, email is the best option. Our support team typically responds within 24-48 hours during business days.
              </Text>
              <TouchableOpacity style={styles.contactButton} onPress={handleEmailPress}>
                <Text style={styles.contactButtonText}>rohanjaiswar2467@gmail.com</Text>
                <MaterialIcons name="open-in-new" size={18} color={colors.primary.main} />
              </TouchableOpacity>
              <Text style={styles.contactNote}>
                When emailing, please include your account details, a clear description of your issue, and any relevant screenshots or information that might help us assist you better.
              </Text>
            </View>

            {/* Phone Support */}
            <View style={styles.contactCard}>
              <View style={styles.contactHeader}>
                <MaterialIcons name="phone" size={24} color={colors.primary.main} />
                <Text style={styles.contactTitle}>Phone Support</Text>
              </View>
              <Text style={styles.contactDescription}>
                For urgent matters or if you prefer speaking directly with our support team, give us a call. Our phone support is available during business hours, and we're happy to help you resolve issues quickly.
              </Text>
              <TouchableOpacity style={styles.contactButton} onPress={handleCallPress}>
                <Text style={styles.contactButtonText}>+91 7021098460</Text>
                <MaterialIcons name="phone" size={18} color={colors.primary.main} />
              </TouchableOpacity>
              <Text style={styles.contactNote}>
                Please have your account information ready when calling, as this helps us provide faster and more efficient support. Our team is available Monday through Friday, 9 AM to 6 PM IST.
              </Text>
            </View>
          </View>

          {/* Common Issues */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Common Questions & Solutions</Text>
            
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I create an account?</Text>
              <Text style={styles.faqAnswer}>
                Creating an account is simple! Download the People app, select whether you're a client or freelancer, and follow the registration process. You'll need to provide basic information and verify your phone number through OTP.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I post a job as a client?</Text>
              <Text style={styles.faqAnswer}>
                Navigate to the "Post Job" tab in your dashboard, fill in the job details including title, description, budget, location, and other requirements. Once submitted, your job will be visible to freelancers who can make offers or pick it up directly.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I get verified as a freelancer?</Text>
              <Text style={styles.faqAnswer}>
                Freelancers need to complete the verification process by providing personal information, uploading government-issued identification documents (Aadhar, PAN), and submitting professional credentials. Our team reviews and approves verification requests.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>What payment methods are accepted?</Text>
              <Text style={styles.faqAnswer}>
                We support various payment methods including UPI, credit/debit cards, and net banking through our secure payment gateway. All transactions are processed securely, and payments are held in escrow until job completion.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I resolve a dispute?</Text>
              <Text style={styles.faqAnswer}>
                If you encounter any issues with a job or service, first try to communicate directly with the other party through our in-app messaging system. If that doesn't resolve the issue, contact our support team via email or phone, and we'll help mediate the situation.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Can I edit or delete a posted job?</Text>
              <Text style={styles.faqAnswer}>
                Yes, you can edit or delete jobs that are still in "open" status and haven't received any accepted offers. Once a job is assigned or has accepted offers, you'll need to contact support for modifications.
              </Text>
            </View>
          </View>

          {/* Account Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Management</Text>
            <Text style={styles.paragraph}>
              Managing your account is straightforward through the Settings section. You can update your profile information, change notification preferences, review privacy settings, and access important documents like Terms and Conditions and Privacy Policy.
            </Text>
            <Text style={styles.paragraph}>
              If you need to update sensitive information like your phone number or email address, or if you're experiencing issues accessing your account, please contact our support team directly for assistance.
            </Text>
          </View>

          {/* Technical Support */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical Support</Text>
            <Text style={styles.paragraph}>
              Experiencing technical issues? Our technical support team can help with app crashes, login problems, payment processing issues, or any other technical difficulties you might encounter.
            </Text>
            <Text style={styles.paragraph}>
              When reporting technical issues, please provide:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Your device model and operating system version</Text>
              <Text style={styles.bulletPoint}>• App version (found in Settings)</Text>
              <Text style={styles.bulletPoint}>• A detailed description of the issue</Text>
              <Text style={styles.bulletPoint}>• Steps to reproduce the problem</Text>
              <Text style={styles.bulletPoint}>• Screenshots or error messages if available</Text>
            </View>
          </View>

          {/* Safety & Security */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safety & Security</Text>
            <Text style={styles.paragraph}>
              Your safety and security are our top priorities. If you encounter any suspicious activity, receive inappropriate messages, or believe your account has been compromised, contact us immediately.
            </Text>
            <Text style={styles.paragraph}>
              We have strict policies against harassment, fraud, and any form of abuse. All reports are taken seriously and investigated promptly. Your privacy is protected, and we never share your personal information without your consent.
            </Text>
          </View>

          {/* Response Times */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Response Times</Text>
            <Text style={styles.paragraph}>
              We strive to respond to all inquiries as quickly as possible:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Email Support: Within 24-48 hours (business days)</Text>
              <Text style={styles.bulletPoint}>• Phone Support: Available during business hours (9 AM - 6 PM IST, Monday-Friday)</Text>
              <Text style={styles.bulletPoint}>• Urgent Issues: We prioritize critical issues and security concerns</Text>
            </View>
            <Text style={styles.paragraph}>
              For urgent matters that require immediate attention, please use phone support. For non-urgent inquiries or detailed questions, email is recommended as it allows us to provide more comprehensive responses.
            </Text>
          </View>

          {/* Feedback */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Feedback & Suggestions</Text>
            <Text style={styles.paragraph}>
              We value your feedback and suggestions! If you have ideas for improving the platform, new features you'd like to see, or general feedback about your experience, we'd love to hear from you.
            </Text>
            <Text style={styles.paragraph}>
              Your input helps us make People better for everyone. Feel free to reach out via email with your suggestions, and our product team will review them carefully.
            </Text>
          </View>

          {/* Closing */}
          <View style={styles.section}>
            <Text style={styles.paragraph}>
              Thank you for being part of the People community. We're committed to providing you with the best possible experience and support. Don't hesitate to reach out if you need any assistance - we're here to help!
            </Text>
          </View>

          {/* Contact CTA */}
          <View style={styles.ctaSection}>
            <Text style={styles.ctaTitle}>Need Immediate Assistance?</Text>
            <Text style={styles.ctaText}>Contact our support team today</Text>
            <View style={styles.ctaButtons}>
              <TouchableOpacity style={styles.ctaButton} onPress={handleEmailPress}>
                <MaterialIcons name="email" size={20} color="#FFFFFF" />
                <Text style={styles.ctaButtonText}>Email Us</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ctaButton, styles.ctaButtonSecondary]} onPress={handleCallPress}>
                <MaterialIcons name="phone" size={20} color={colors.primary.main} />
                <Text style={[styles.ctaButtonText, styles.ctaButtonTextSecondary]}>Call Us</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.primary.main,
    fontWeight: '600',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  paragraph: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  contactCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  contactTitle: {
    ...typography.h4,
    color: colors.text.primary,
    fontWeight: '600',
  },
  contactDescription: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary.light,
    padding: spacing.md,
    borderRadius: spacing.sm,
    marginBottom: spacing.sm,
  },
  contactButtonText: {
    ...typography.body,
    color: colors.primary.main,
    fontWeight: '600',
  },
  contactNote: {
    ...typography.small,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  faqItem: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  faqQuestion: {
    ...typography.h4,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  faqAnswer: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  bulletList: {
    marginLeft: spacing.md,
    marginBottom: spacing.md,
  },
  bulletPoint: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: spacing.xs,
  },
  ctaSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary.main,
    alignItems: 'center',
  },
  ctaTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  ctaText: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    padding: spacing.md,
    borderRadius: spacing.sm,
    gap: spacing.xs,
  },
  ctaButtonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  ctaButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ctaButtonTextSecondary: {
    color: colors.primary.main,
  },
});

export default HelpAndSupport;


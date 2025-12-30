/**
 * Privacy Policy Screen
 * Displays the Privacy Policy content
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

const PrivacyPolicy = ({ onClose }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <Text style={styles.lastUpdated}>Last updated: August 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            Welcome to People Enterprises. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform that connects clients with freelancers.
          </Text>
          <Text style={styles.paragraph}>
            By using our platform, you consent to the data practices described in this policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          
          <Text style={styles.subsectionTitle}>Client Information</Text>
          <Text style={styles.paragraph}>
            When you register as a client on our platform, we collect the following personal information:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Name: Your full legal name</Text>
            <Text style={styles.listItem}>• Date of Birth: For age verification and legal compliance</Text>
            <Text style={styles.listItem}>• Gender: For demographic purposes and service matching</Text>
            <Text style={styles.listItem}>• Address: Your residential or business address</Text>
            <Text style={styles.listItem}>• Profile Photo: For identification and verification purposes</Text>
            <Text style={styles.listItem}>• Contact Information: Email address and phone number</Text>
            <Text style={styles.listItem}>• Payment Information: For processing transactions (handled securely by our payment partners)</Text>
          </View>

          <Text style={styles.subsectionTitle}>Freelancer Information</Text>
          <Text style={styles.paragraph}>
            When you register as a freelancer on our platform, we collect the following information:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Personal Information: Name, date of birth, gender, address, and profile photo</Text>
            <Text style={styles.listItem}>• Government Documents: We require consent to access and verify:</Text>
            <Text style={styles.listItem}>  - Aadhar card for identity verification</Text>
            <Text style={styles.listItem}>  - PAN card for tax purposes</Text>
            <Text style={styles.listItem}>  - Other government-issued identification documents</Text>
            <Text style={styles.listItem}>  - Professional certifications and licenses</Text>
            <Text style={styles.listItem}>• Skills and Experience: Professional background, qualifications, and expertise</Text>
            <Text style={styles.listItem}>• Banking Information: For payment processing and earnings distribution</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the collected information for the following purposes:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Platform Operation: To provide and maintain our services</Text>
            <Text style={styles.listItem}>• Identity Verification: To verify the identity of all users</Text>
            <Text style={styles.listItem}>• Service Matching: To connect clients with appropriate freelancers</Text>
            <Text style={styles.listItem}>• Payment Processing: To facilitate secure transactions</Text>
            <Text style={styles.listItem}>• Communication: To send important updates and notifications</Text>
            <Text style={styles.listItem}>• Legal Compliance: To meet regulatory and legal requirements</Text>
            <Text style={styles.listItem}>• Security: To protect against fraud and unauthorized access</Text>
            <Text style={styles.listItem}>• Improvement: To enhance our platform and services</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Information Sharing and Disclosure</Text>
          <Text style={styles.paragraph}>
            We may share your information in the following circumstances:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Service Providers: With trusted third-party service providers who assist in platform operations</Text>
            <Text style={styles.listItem}>• Legal Requirements: When required by law or to protect our rights</Text>
            <Text style={styles.listItem}>• Safety and Security: To prevent fraud and ensure platform security</Text>
            <Text style={styles.listItem}>• Business Transfers: In connection with a merger, acquisition, or sale of assets</Text>
            <Text style={styles.listItem}>• User Consent: With your explicit consent for specific purposes</Text>
          </View>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>We do not sell, rent, or trade your personal information to third parties for marketing purposes.</Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate technical and organizational measures to protect your personal information:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Encryption of sensitive data in transit and at rest</Text>
            <Text style={styles.listItem}>• Regular security assessments and updates</Text>
            <Text style={styles.listItem}>• Access controls and authentication measures</Text>
            <Text style={styles.listItem}>• Secure data storage and backup procedures</Text>
            <Text style={styles.listItem}>• Employee training on data protection</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your personal information for as long as necessary to:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Provide our services</Text>
            <Text style={styles.listItem}>• Comply with legal obligations</Text>
            <Text style={styles.listItem}>• Resolve disputes</Text>
            <Text style={styles.listItem}>• Enforce our agreements</Text>
          </View>
          <Text style={styles.paragraph}>
            You may request deletion of your account and associated data, subject to legal requirements.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the following rights regarding your personal information:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Access: Request a copy of your personal data</Text>
            <Text style={styles.listItem}>• Correction: Update or correct inaccurate information</Text>
            <Text style={styles.listItem}>• Deletion: Request deletion of your personal data</Text>
            <Text style={styles.listItem}>• Portability: Request transfer of your data to another service</Text>
            <Text style={styles.listItem}>• Objection: Object to certain processing activities</Text>
            <Text style={styles.listItem}>• Withdrawal: Withdraw consent where applicable</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Cookies and Tracking Technologies</Text>
          <Text style={styles.paragraph}>
            We use cookies and similar technologies to:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Remember your preferences and settings</Text>
            <Text style={styles.listItem}>• Analyze platform usage and performance</Text>
            <Text style={styles.listItem}>• Provide personalized content and features</Text>
            <Text style={styles.listItem}>• Ensure platform security</Text>
          </View>
          <Text style={styles.paragraph}>
            You can control cookie settings through your browser preferences.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Third-Party Services</Text>
          <Text style={styles.paragraph}>
            Our platform may integrate with third-party services for:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Payment processing</Text>
            <Text style={styles.listItem}>• Identity verification</Text>
            <Text style={styles.listItem}>• Analytics and monitoring</Text>
            <Text style={styles.listItem}>• Communication services</Text>
          </View>
          <Text style={styles.paragraph}>
            These services have their own privacy policies, and we encourage you to review them.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. International Data Transfers</Text>
          <Text style={styles.paragraph}>
            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data during such transfers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to This Privacy Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Posting the updated policy on our platform</Text>
            <Text style={styles.listItem}>• Sending email notifications to registered users</Text>
            <Text style={styles.listItem}>• Displaying prominent notices on our platform</Text>
          </View>
          <Text style={styles.paragraph}>
            Your continued use of our platform after changes become effective constitutes acceptance of the updated policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have questions about this Privacy Policy or our data practices, please contact us:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Data Protection Officer: rohanjaiswar2467@gmail.com</Text>
            <Text style={styles.listItem}>• General Privacy Inquiries: rohanjaiswar2467@gmail.com</Text>
            <Text style={styles.listItem}>• Phone: +91 7021098460</Text>
            <Text style={styles.listItem}>• Address: People, Mumbai, Maharashtra, India</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consent Confirmation</Text>
          <Text style={styles.paragraph}>
            By using our platform, you confirm that you have read and understood this Privacy Policy and consent to the collection, use, and sharing of your personal information as described herein. You also consent to the verification of your government documents, including Aadhar card, as required for platform participation.
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
  lastUpdated: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.primary.main,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  subsectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  paragraph: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  listContainer: {
    marginLeft: spacing.md,
    marginBottom: spacing.md,
  },
  listItem: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
  },
});

export default PrivacyPolicy;


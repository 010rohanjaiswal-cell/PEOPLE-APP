/**
 * Terms and Conditions Screen
 * Displays the Terms and Conditions content
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

const TermsAndConditions = ({ onClose }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms and Conditions</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <Text style={styles.lastUpdated}>Last updated: August 2025</Text>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>Important Notice</Text>
          <Text style={styles.noticeText}>
            By using our platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            These Terms and Conditions ("Terms") govern your use of the People Enterprises platform, including our website, mobile application, and related services (collectively, the "Service"). By accessing or using our Service, you agree to be bound by these Terms and all applicable laws and regulations.
          </Text>
          
          <Text style={styles.subsectionTitle}>1.1 Eligibility</Text>
          <Text style={styles.paragraph}>
            To use our Service, you must be at least 18 years old and have the legal capacity to enter into binding agreements. By using our Service, you represent and warrant that you meet these eligibility requirements.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Service Description</Text>
          <Text style={styles.paragraph}>
            People operates a platform that connects clients seeking services with freelancers offering various professional services. Our platform facilitates:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Job posting and project management</Text>
            <Text style={styles.listItem}>• Freelancer profile creation and verification</Text>
            <Text style={styles.listItem}>• Payment processing and escrow services</Text>
            <Text style={styles.listItem}>• Communication tools between clients and freelancers</Text>
            <Text style={styles.listItem}>• Dispute resolution services</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Responsibilities and Disclaimers</Text>
          
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Critical Disclaimer</Text>
            <Text style={styles.warningText}>
              People acts solely as an intermediary platform. We do not directly provide services or employ freelancers. All services are provided by independent third-party freelancers.
            </Text>
          </View>

          <Text style={styles.subsectionTitle}>3.1 User Responsibility for Activities</Text>
          <Text style={styles.paragraph}>
            Users of our platform are solely responsible for:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• The nature and legality of all services offered or requested</Text>
            <Text style={styles.listItem}>• Compliance with all applicable local, state, national, and international laws</Text>
            <Text style={styles.listItem}>• Ensuring that their activities do not violate any third-party rights</Text>
            <Text style={styles.listItem}>• Maintaining appropriate insurance and licenses for their services</Text>
            <Text style={styles.listItem}>• Resolving disputes directly with other users</Text>
          </View>

          <Text style={styles.subsectionTitle}>3.2 Prohibited Activities</Text>
          <Text style={styles.paragraph}>
            The following activities are strictly prohibited on our platform:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Any illegal activities or services that violate applicable laws</Text>
            <Text style={styles.listItem}>• Fraud, deception, or misrepresentation</Text>
            <Text style={styles.listItem}>• Harassment, discrimination, or hate speech</Text>
            <Text style={styles.listItem}>• Intellectual property violations</Text>
            <Text style={styles.listItem}>• Services involving weapons, drugs, or other contraband</Text>
            <Text style={styles.listItem}>• Adult content or services without proper verification</Text>
            <Text style={styles.listItem}>• Any activity that could harm our platform or other users</Text>
          </View>

          <Text style={styles.subsectionTitle}>3.3 Legal Compliance</Text>
          <Text style={styles.paragraph}>
            Users must ensure that all services offered and transactions conducted through our platform comply with:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• All applicable labor laws and regulations</Text>
            <Text style={styles.listItem}>• Tax obligations and reporting requirements</Text>
            <Text style={styles.listItem}>• Professional licensing requirements</Text>
            <Text style={styles.listItem}>• Data protection and privacy laws</Text>
            <Text style={styles.listItem}>• Consumer protection regulations</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Limitation of Liability</Text>
          
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Liability Disclaimer</Text>
            <Text style={styles.warningText}>
              People shall not be liable for any damages, losses, or injuries arising from the use of our platform, including but not limited to:
            </Text>
            <View style={styles.listContainer}>
              <Text style={styles.listItem}>• Disputes between clients and freelancers</Text>
              <Text style={styles.listItem}>• Quality of services provided by freelancers</Text>
              <Text style={styles.listItem}>• Financial losses from failed transactions</Text>
              <Text style={styles.listItem}>• Personal injury or property damage</Text>
              <Text style={styles.listItem}>• Data breaches or security incidents</Text>
              <Text style={styles.listItem}>• Any illegal activities conducted by users</Text>
            </View>
          </View>

          <Text style={styles.subsectionTitle}>4.1 Maximum Liability</Text>
          <Text style={styles.paragraph}>
            In no event shall People's total liability exceed the amount paid by you to us in the twelve (12) months preceding the claim. This limitation applies to all causes of action, whether in contract, tort, or otherwise.
          </Text>

          <Text style={styles.subsectionTitle}>4.2 Indemnification</Text>
          <Text style={styles.paragraph}>
            You agree to indemnify, defend, and hold harmless People, its officers, directors, employees, and agents from and against any claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising from:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Your use of the platform</Text>
            <Text style={styles.listItem}>• Your violation of these Terms</Text>
            <Text style={styles.listItem}>• Your violation of any applicable laws</Text>
            <Text style={styles.listItem}>• Any services you provide or receive through the platform</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. User Accounts and Verification</Text>
          
          <Text style={styles.subsectionTitle}>5.1 Account Creation</Text>
          <Text style={styles.paragraph}>
            To use certain features of our platform, you must create an account. You are responsible for:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Providing accurate and complete information</Text>
            <Text style={styles.listItem}>• Maintaining the security of your account credentials</Text>
            <Text style={styles.listItem}>• All activities that occur under your account</Text>
            <Text style={styles.listItem}>• Notifying us immediately of any unauthorized use</Text>
          </View>

          <Text style={styles.subsectionTitle}>5.2 Freelancer Verification</Text>
          <Text style={styles.paragraph}>
            Freelancers must undergo verification processes, including:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Identity verification using government-issued documents</Text>
            <Text style={styles.listItem}>• Aadhar card verification for Indian residents</Text>
            <Text style={styles.listItem}>• Background checks where applicable</Text>
            <Text style={styles.listItem}>• Skill assessment and portfolio review</Text>
            <Text style={styles.listItem}>• Reference checks and testimonials</Text>
          </View>

          <Text style={styles.subsectionTitle}>5.3 Client Information</Text>
          <Text style={styles.paragraph}>
            Clients may be required to provide:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Personal identification information</Text>
            <Text style={styles.listItem}>• Contact details and address</Text>
            <Text style={styles.listItem}>• Payment method verification</Text>
            <Text style={styles.listItem}>• Project requirements and specifications</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Payment and Financial Terms</Text>
          
          <Text style={styles.subsectionTitle}>6.1 Payment Processing</Text>
          <Text style={styles.paragraph}>
            All payments are processed through secure third-party payment gateways. We may charge service fees for platform usage and payment processing.
          </Text>

          <Text style={styles.subsectionTitle}>6.2 Escrow Services</Text>
          <Text style={styles.paragraph}>
            We may hold payments in escrow until services are completed and approved by the client. This protects both parties and ensures fair transactions.
          </Text>

          <Text style={styles.subsectionTitle}>6.3 Refunds and Disputes</Text>
          <Text style={styles.paragraph}>
            Refund policies are determined on a case-by-case basis. Disputes between users should be resolved through our dispute resolution process before seeking external remedies.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
          
          <Text style={styles.subsectionTitle}>7.1 Platform Content</Text>
          <Text style={styles.paragraph}>
            All content on our platform, including text, graphics, logos, and software, is owned by People and protected by intellectual property laws.
          </Text>

          <Text style={styles.subsectionTitle}>7.2 User Content</Text>
          <Text style={styles.paragraph}>
            Users retain ownership of their content but grant us a license to use, display, and distribute it in connection with our services.
          </Text>

          <Text style={styles.subsectionTitle}>7.3 Service Deliverables</Text>
          <Text style={styles.paragraph}>
            Intellectual property rights for work products are determined by the agreement between clients and freelancers, subject to applicable laws.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Privacy and Data Protection</Text>
          <Text style={styles.paragraph}>
            Your privacy is important to us. Please review our Privacy Policy, which is incorporated into these Terms by reference. We collect, use, and protect your personal information in accordance with applicable data protection laws.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Termination</Text>
          
          <Text style={styles.subsectionTitle}>9.1 Account Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account at any time for:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Violation of these Terms</Text>
            <Text style={styles.listItem}>• Fraudulent or illegal activities</Text>
            <Text style={styles.listItem}>• Repeated complaints from other users</Text>
            <Text style={styles.listItem}>• Failure to pay fees or charges</Text>
          </View>

          <Text style={styles.subsectionTitle}>9.2 Effect of Termination</Text>
          <Text style={styles.paragraph}>
            Upon termination, your right to use the platform ceases immediately. We may retain certain information as required by law or for legitimate business purposes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Governing Law and Dispute Resolution</Text>
          
          <Text style={styles.subsectionTitle}>10.1 Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.
          </Text>

          <Text style={styles.subsectionTitle}>10.2 Dispute Resolution</Text>
          <Text style={styles.paragraph}>
            Before pursuing legal action, users must attempt to resolve disputes through our internal dispute resolution process. Mediation or arbitration may be required as a condition of using our platform.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use of the platform constitutes acceptance of the modified Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have questions about these Terms, please contact us at:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Email: rohanjaiswar2467@gmail.com</Text>
            <Text style={styles.listItem}>• Phone: +91 7021098460</Text>
            <Text style={styles.listItem}>• Address: People, Mumbai, Maharashtra, India</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.finalNoticeBox}>
            <Text style={styles.finalNoticeTitle}>Final Notice</Text>
            <Text style={styles.finalNoticeText}>
              By using our platform, you acknowledge that you understand these Terms and agree to be bound by them. You also acknowledge that People Enterprises is not responsible for any illegal activities conducted by users, and that users are solely responsible for ensuring compliance with all applicable laws and regulations.
            </Text>
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
  noticeBox: {
    backgroundColor: colors.primary.light || '#DBEAFE',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.main,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderRadius: 4,
  },
  noticeTitle: {
    ...typography.h4,
    color: colors.primary.main,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  noticeText: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 22,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: spacing.md,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 4,
  },
  warningTitle: {
    ...typography.h4,
    color: '#F59E0B',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  warningText: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  finalNoticeBox: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    padding: spacing.md,
    borderRadius: 4,
  },
  finalNoticeTitle: {
    ...typography.h4,
    color: '#DC2626',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  finalNoticeText: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 22,
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
});

export default TermsAndConditions;


/**
 * Refund Policy Screen
 * Displays the Refund Policy content
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

const RefundPolicy = ({ onClose }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refund Policy</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <Text style={styles.lastUpdated}>Last updated: August 2025</Text>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>Important Notice</Text>
          <Text style={styles.noticeText}>
            This refund policy applies to all transactions conducted through the People Enterprises platform. By using our services, you acknowledge that you have read, understood, and agree to be bound by this refund policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. General Refund Policy</Text>
          <Text style={styles.paragraph}>
            At People, we strive to ensure customer satisfaction and fair resolution of disputes. Our refund policy is designed to protect both clients and freelancers while maintaining the integrity of our platform.
          </Text>
          
          <Text style={styles.subsectionTitle}>1.1 Refund Eligibility</Text>
          <Text style={styles.paragraph}>
            Refunds may be considered under the following circumstances:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Service not delivered as agreed upon</Text>
            <Text style={styles.listItem}>• Significant deviation from project specifications</Text>
            <Text style={styles.listItem}>• Freelancer fails to complete the work within agreed timeframe</Text>
            <Text style={styles.listItem}>• Technical issues preventing service delivery</Text>
            <Text style={styles.listItem}>• Fraudulent activity or misrepresentation</Text>
            <Text style={styles.listItem}>• Platform technical errors affecting transactions</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Refund Process</Text>
          <Text style={styles.paragraph}>
            All refund requests must follow our established process to ensure fair resolution:
          </Text>
          
          <View style={styles.processContainer}>
            <View style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Submit Refund Request</Text>
                <Text style={styles.stepDescription}>
                  Contact our support team within 7 days of service completion or issue discovery. Provide detailed information about the problem and supporting evidence.
                </Text>
              </View>
            </View>

            <View style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Initial Review</Text>
                <Text style={styles.stepDescription}>
                  Our support team will review your request within 24-48 hours and may request additional information or documentation.
                </Text>
              </View>
            </View>

            <View style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Investigation</Text>
                <Text style={styles.stepDescription}>
                  We will investigate the matter by reviewing project details, communications, and deliverables. This process may take 3-5 business days.
                </Text>
              </View>
            </View>

            <View style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Resolution</Text>
                <Text style={styles.stepDescription}>
                  Based on our investigation, we will provide a resolution which may include full refund, partial refund, or alternative solutions.
                </Text>
              </View>
            </View>

            <View style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>5</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Processing</Text>
                <Text style={styles.stepDescription}>
                  If approved, refunds will be processed within 5-10 business days to your original payment method.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Refund Types and Conditions</Text>
          
          <Text style={styles.subsectionTitle}>3.1 Full Refunds</Text>
          <Text style={styles.paragraph}>
            Full refunds may be granted in the following situations:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Service not delivered at all</Text>
            <Text style={styles.listItem}>• Complete failure to meet project requirements</Text>
            <Text style={styles.listItem}>• Freelancer abandons project without completion</Text>
            <Text style={styles.listItem}>• Technical issues preventing service delivery</Text>
            <Text style={styles.listItem}>• Fraudulent activity or identity theft</Text>
          </View>

          <Text style={styles.subsectionTitle}>3.2 Partial Refunds</Text>
          <Text style={styles.paragraph}>
            Partial refunds may be considered when:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Service partially completed but not meeting full requirements</Text>
            <Text style={styles.listItem}>• Minor deviations from project specifications</Text>
            <Text style={styles.listItem}>• Delays in delivery affecting project timeline</Text>
            <Text style={styles.listItem}>• Quality issues that can be partially resolved</Text>
          </View>

          <Text style={styles.subsectionTitle}>3.3 No Refund Situations</Text>
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>No Refund Policy</Text>
            <Text style={styles.warningText}>
              Refunds will NOT be granted in the following circumstances:
            </Text>
            <View style={styles.listContainer}>
              <Text style={styles.listItem}>• Change of mind after service completion</Text>
              <Text style={styles.listItem}>• Failure to provide clear project requirements</Text>
              <Text style={styles.listItem}>• Unrealistic expectations not communicated upfront</Text>
              <Text style={styles.listItem}>• Services delivered as agreed but client dissatisfaction</Text>
              <Text style={styles.listItem}>• Delays caused by client's failure to provide necessary information</Text>
              <Text style={styles.listItem}>• Services used or consumed by the client</Text>
              <Text style={styles.listItem}>• Refund request submitted after 30 days of service completion</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Platform Fees and Charges</Text>
          
          <Text style={styles.subsectionTitle}>4.1 Service Fees</Text>
          <Text style={styles.paragraph}>
            Our platform charges service fees for facilitating transactions. These fees are generally non-refundable unless the refund is due to platform error or technical issues.
          </Text>

          <Text style={styles.subsectionTitle}>4.2 Payment Processing Fees</Text>
          <Text style={styles.paragraph}>
            Third-party payment processing fees may not be refundable. In case of approved refunds, we will refund the service amount, but payment processing fees may be deducted.
          </Text>

          <Text style={styles.subsectionTitle}>4.3 Escrow Protection</Text>
          <Text style={styles.paragraph}>
            For eligible projects, we offer escrow protection where payments are held securely until service completion. This provides additional protection for both parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Dispute Resolution</Text>
          
          <Text style={styles.subsectionTitle}>5.1 Internal Dispute Resolution</Text>
          <Text style={styles.paragraph}>
            Before requesting a refund, we encourage users to:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Communicate directly with the other party</Text>
            <Text style={styles.listItem}>• Attempt to resolve issues amicably</Text>
            <Text style={styles.listItem}>• Use our messaging system for all communications</Text>
            <Text style={styles.listItem}>• Document all interactions and agreements</Text>
          </View>

          <Text style={styles.subsectionTitle}>5.2 Mediation Process</Text>
          <Text style={styles.paragraph}>
            If direct communication fails, our support team can facilitate mediation between parties to reach a mutually acceptable resolution.
          </Text>

          <Text style={styles.subsectionTitle}>5.3 Arbitration</Text>
          <Text style={styles.paragraph}>
            For complex disputes, we may recommend binding arbitration as a final resolution method, with costs shared between parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Special Circumstances</Text>
          
          <Text style={styles.subsectionTitle}>6.1 Force Majeure</Text>
          <Text style={styles.paragraph}>
            Refunds may be considered for circumstances beyond anyone's control, including natural disasters, government actions, or other force majeure events.
          </Text>

          <Text style={styles.subsectionTitle}>6.2 Platform Maintenance</Text>
          <Text style={styles.paragraph}>
            If our platform experiences extended downtime affecting service delivery, we will work with affected users to find appropriate solutions.
          </Text>

          <Text style={styles.subsectionTitle}>6.3 Account Suspension</Text>
          <Text style={styles.paragraph}>
            If an account is suspended due to policy violations, refunds for pending work will be evaluated on a case-by-case basis.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Refund Timeline</Text>
          
          <View style={styles.timelineBox}>
            <Text style={styles.timelineTitle}>Refund Processing Times</Text>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Request Review:</Text>
              <Text style={styles.timelineValue}>24-48 hours</Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Investigation:</Text>
              <Text style={styles.timelineValue}>3-5 business days</Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Decision Communication:</Text>
              <Text style={styles.timelineValue}>Within 1 business day of investigation completion</Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Refund Processing:</Text>
              <Text style={styles.timelineValue}>5-10 business days after approval</Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Bank Processing:</Text>
              <Text style={styles.timelineValue}>Additional 2-5 business days (varies by bank)</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Documentation Required</Text>
          <Text style={styles.paragraph}>
            To process refund requests efficiently, please provide:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Project details and specifications</Text>
            <Text style={styles.listItem}>• Communication history with the freelancer</Text>
            <Text style={styles.listItem}>• Evidence of the issue (screenshots, files, etc.)</Text>
            <Text style={styles.listItem}>• Payment confirmation and transaction details</Text>
            <Text style={styles.listItem}>• Timeline of events leading to the refund request</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Contact Information</Text>
          <Text style={styles.paragraph}>
            For refund requests and related inquiries, please contact us through the following channels:
          </Text>
          
          <View style={styles.contactBox}>
            <Text style={styles.contactTitle}>Refund Support</Text>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Email:</Text>
              <Text style={styles.contactValue}>refunds@people.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Phone:</Text>
              <Text style={styles.contactValue}>+91 7021098460</Text>
            </View>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Support Hours:</Text>
              <Text style={styles.contactValue}>Monday-Friday, 9 AM - 6 PM IST</Text>
            </View>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Address:</Text>
              <Text style={styles.contactValue}>People, Mumbai, Maharashtra, India</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Policy Updates</Text>
          <Text style={styles.paragraph}>
            We reserve the right to update this refund policy at any time. Changes will be effective immediately upon posting on our platform. Users will be notified of significant changes via email or platform notifications.
          </Text>
          <Text style={styles.paragraph}>
            Your continued use of our platform after policy changes constitutes acceptance of the updated terms.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.finalNoticeBox}>
            <Text style={styles.finalNoticeTitle}>Final Notice</Text>
            <Text style={styles.finalNoticeText}>
              This refund policy is designed to ensure fair treatment for all users while maintaining the integrity of our platform. We are committed to resolving disputes fairly and efficiently. If you have any questions about this policy or need assistance with a refund request, please don't hesitate to contact our support team.
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
  processContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  processStep: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...typography.h4,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  stepDescription: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  timelineBox: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  timelineTitle: {
    ...typography.h4,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timelineLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  timelineValue: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
    textAlign: 'right',
  },
  contactBox: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  contactTitle: {
    ...typography.h4,
    color: colors.primary.main,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  contactItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  contactLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
    width: 100,
  },
  contactValue: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },
});

export default RefundPolicy;


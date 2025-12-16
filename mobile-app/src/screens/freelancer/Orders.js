/**
 * Orders Tab - Freelancer Dashboard
 * Shows completed orders (history) for freelancer
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import { freelancerJobsAPI } from '../../api/freelancerJobs';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await freelancerJobsAPI.getOrders();
      if (response?.success && Array.isArray(response.orders)) {
        setOrders(response.orders);
      } else if (Array.isArray(response)) {
        setOrders(response);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Error loading freelancer orders:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const renderOrderItem = ({ item }) => {
    const commission = item.commission || null;
    const client = item.client || {};

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.completedBadge}>
            <MaterialIcons name="check-circle" size={16} color={colors.success.main} />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        </View>

        <Text style={styles.orderCategory}>{item.category}</Text>
        <Text style={styles.orderAddress}>
          {item.address}, {item.pincode}
        </Text>

        <View style={styles.orderMetaRow}>
          <View style={styles.orderMeta}>
            <MaterialIcons name="currency-rupee" size={16} color={colors.text.secondary} />
            <Text style={styles.orderMetaText}>₹{item.budget}</Text>
          </View>
          <View style={styles.orderMeta}>
            <MaterialIcons name="person" size={16} color={colors.text.secondary} />
            <Text style={styles.orderMetaText}>{(item.gender || 'any').toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.orderDate}>
          Completed on {new Date(item.updatedAt || item.createdAt).toLocaleString()}
        </Text>

        {client.fullName || client.phone ? (
          <Text style={styles.clientInfo}>
            Client: {client.fullName || 'N/A'} {client.phone ? `(${client.phone})` : ''}
          </Text>
        ) : null}

        {commission && (
          <View style={styles.commissionCard}>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Job Amount</Text>
              <Text style={styles.commissionValue}>₹{commission.jobAmount}</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Platform Commission (10%)</Text>
              <Text style={[styles.commissionValue, styles.commissionNegative]}>
                -₹{commission.platformCommission}
              </Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Amount Received</Text>
              <Text style={[styles.commissionValue, styles.commissionPositive]}>
                ₹{commission.amountReceived}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon={<MaterialIcons name="receipt" size={64} color={colors.text.muted} />}
          title="No orders yet"
          description="Completed jobs will appear here as orders."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: colors.error.light,
    borderWidth: 1,
    borderColor: colors.error.main,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.small,
    color: colors.error.main,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  orderCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  orderTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    backgroundColor: colors.success.light,
  },
  completedText: {
    ...typography.small,
    color: colors.success.main,
    fontWeight: '600',
  },
  orderCategory: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  orderAddress: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  orderMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  orderMetaText: {
    ...typography.small,
    color: colors.text.secondary,
  },
  orderDate: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  clientInfo: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  commissionCard: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commissionLabel: {
    ...typography.small,
    color: colors.text.secondary,
  },
  commissionValue: {
    ...typography.small,
    fontWeight: '600',
    color: colors.text.primary,
  },
  commissionNegative: {
    color: colors.error.main,
  },
  commissionPositive: {
    color: colors.success.main,
  },
});

export default Orders;


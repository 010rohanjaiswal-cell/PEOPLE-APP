/**
 * Orders Tab - Freelancer Dashboard
 * Shows completed orders (history) for freelancer
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import { freelancerJobsAPI } from '../../api/freelancerJobs';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const loadOrders = async () => {
    try {
      if (!refreshing) setLoading(true);
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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter]);

  // Filter orders by date
  const filteredOrders = useMemo(() => {
    if (selectedFilter === 'all') {
      return orders;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return orders.filter((order) => {
      const orderDate = new Date(order.updatedAt || order.createdAt);
      const orderDateOnly = new Date(
        orderDate.getFullYear(),
        orderDate.getMonth(),
        orderDate.getDate()
      );

      switch (selectedFilter) {
        case 'today':
          return orderDateOnly.getTime() === today.getTime();
        case 'yesterday':
          return orderDateOnly.getTime() === yesterday.getTime();
        case 'week':
          return orderDate >= weekAgo;
        case 'month':
          return orderDate >= monthAgo;
        case '6months':
          return orderDate >= sixMonthsAgo;
        default:
          return true;
      }
    });
  }, [orders, selectedFilter]);

  // Paginate filtered orders
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredOrders.length, currentPage, totalPages]);

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: '6months', label: '6 Months' },
  ];

  const renderOrderItem = ({ item }) => {
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

        {client.fullName ? (
          <Text style={styles.clientInfo}>
            Client: {client.fullName || 'N/A'}
          </Text>
        ) : null}
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

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
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

      {/* Filter Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterButton,
              selectedFilter === option.key && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter(option.key)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedFilter === option.key && styles.filterButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<MaterialIcons name="receipt" size={64} color={colors.text.muted} />}
            title="No orders found"
            description={
              selectedFilter === 'all'
                ? 'Completed jobs will appear here as orders.'
                : `No orders found for ${filterOptions.find((f) => f.key === selectedFilter)?.label.toLowerCase() || 'selected period'}.`
            }
          />
        </View>
      ) : (
        <>
          <FlatList
            data={paginatedOrders}
            keyExtractor={(item) => item._id || item.id}
            renderItem={renderOrderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary.main]}
                tintColor={colors.primary.main}
              />
            }
            ListEmptyComponent={
              loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary.main} />
                </View>
              ) : null
            }
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <View style={styles.paginationButtons}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <TouchableOpacity
                    key={pageNum}
                    style={[
                      styles.paginationButton,
                      currentPage === pageNum && styles.paginationButtonActive,
                    ]}
                    onPress={() => setCurrentPage(pageNum)}
                  >
                    <Text
                      style={[
                        styles.paginationButtonText,
                        currentPage === pageNum && styles.paginationButtonTextActive,
                      ]}
                    >
                      {pageNum}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </>
      )}
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
  filterBar: {
    marginBottom: spacing.md,
  },
  filterBarContent: {
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  filterButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    height: 28,
    borderRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    marginRight: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  filterButtonText: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '500',
    fontSize: 12,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  paginationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  paginationButton: {
    minWidth: 36,
    height: 36,
    borderRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  paginationButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  paginationButtonText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  paginationButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default Orders;


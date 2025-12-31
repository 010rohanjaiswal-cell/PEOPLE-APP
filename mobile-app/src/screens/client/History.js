/**
 * History Screen - People App
 * Display completed jobs for client
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import { clientJobsAPI } from '../../api/clientJobs';

const History = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const loadHistory = async () => {
    try {
      if (!refreshing) setLoading(true);
      setError('');
      const response = await clientJobsAPI.getJobHistory();
      if (response?.success && Array.isArray(response.jobs)) {
        setJobs(response.jobs);
      } else if (Array.isArray(response)) {
        setJobs(response);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error('Error loading job history for client:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load job history');
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Paginate jobs
  const totalPages = Math.ceil(jobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedJobs = jobs.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [jobs.length, currentPage, totalPages]);

  const renderJobItem = ({ item }) => {
    return (
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.statusBadge}>
            <MaterialIcons name="check-circle" size={16} color={colors.success.main} />
            <Text style={styles.statusText}>COMPLETED</Text>
          </View>
        </View>

        <Text style={styles.jobCategory}>{item.category}</Text>
        <Text style={styles.jobAddress}>
          {item.address}, {item.pincode}
        </Text>

        <View style={styles.jobMetaRow}>
          <View style={styles.jobMeta}>
            <MaterialIcons name="currency-rupee" size={16} color={colors.text.secondary} />
            <Text style={styles.jobMetaText}>{item.budget}</Text>
          </View>
          {item.completedAt && (
            <View style={styles.jobMeta}>
              <MaterialIcons name="event" size={16} color={colors.text.secondary} />
              <Text style={styles.jobMetaText}>
                {new Date(item.completedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {item.description ? (
          <Text style={styles.jobDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['bottom']}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<MaterialIcons name="history" size={64} color={colors.text.muted} />}
            title="No completed jobs yet"
            description="Jobs that are fully completed and paid will appear here."
          />
        </View>
      ) : (
        <>
          <FlatList
            data={paginatedJobs}
            keyExtractor={(item) => item._id || item.id}
            renderItem={renderJobItem}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    margin: spacing.lg,
  },
  errorText: {
    ...typography.small,
    color: colors.error.main,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  jobTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    backgroundColor: colors.success.light,
  },
  statusText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.success.main,
  },
  jobCategory: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  jobAddress: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  jobMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  jobMetaText: {
    ...typography.small,
    color: colors.text.secondary,
  },
  jobDescription: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
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

export default History;



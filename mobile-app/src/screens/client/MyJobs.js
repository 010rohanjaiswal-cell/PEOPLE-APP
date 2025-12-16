/**
 * My Jobs Screen - People App
 * Display active jobs for client
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import { clientJobsAPI } from '../../api/clientJobs';

const MyJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await clientJobsAPI.getActiveJobs();
      // Expecting { success, jobs }
      if (response?.success && Array.isArray(response.jobs)) {
        setJobs(response.jobs);
      } else if (Array.isArray(response)) {
        // Fallback if API returns array directly
        setJobs(response);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error('Error loading client jobs:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const renderJobItem = ({ item }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle}>{item.title}</Text>
        <Text style={styles.jobStatus}>{(item.status || 'open').toUpperCase()}</Text>
      </View>
      <Text style={styles.jobCategory}>{item.category}</Text>
      <Text style={styles.jobAddress}>{item.address}</Text>
      <View style={styles.jobMetaRow}>
        <View style={styles.jobMeta}>
          <MaterialIcons name="location-on" size={16} color={colors.text.secondary} />
          <Text style={styles.jobMetaText}>{item.pincode}</Text>
        </View>
        <View style={styles.jobMeta}>
          <MaterialIcons name="currency-rupee" size={16} color={colors.text.secondary} />
          <Text style={styles.jobMetaText}>{item.budget}</Text>
        </View>
        <View style={styles.jobMeta}>
          <MaterialIcons name="person" size={16} color={colors.text.secondary} />
          <Text style={styles.jobMetaText}>{(item.gender || 'any').toUpperCase()}</Text>
        </View>
      </View>
      {item.description ? (
        <Text style={styles.jobDescription} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (jobs.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon={<MaterialIcons name="work" size={64} color={colors.text.muted} />}
          title="No active jobs found"
          description="Post your first job to get started!"
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
        data={jobs}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderJobItem}
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
  },
  jobStatus: {
    ...typography.small,
    color: colors.primary.main,
    fontWeight: '600',
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
    justifyContent: 'space-between',
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
  },
});

export default MyJobs;


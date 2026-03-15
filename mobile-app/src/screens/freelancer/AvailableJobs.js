/**
 * Available Jobs Tab - Freelancer Dashboard
 * Display open jobs that freelancers can see
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import { freelancerJobsAPI } from '../../api/freelancerJobs';
import { walletAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useLocation } from '../../context/LocationContext';
import { translateJobToHindi } from '../../utils/translate';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AvailableJobs = ({ onJobPickedUp }) => {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const { gpsEnabled, gpsDenied, getCurrentCoords } = useLocation();
  const freelancerId = user?.id || user?._id || null;
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canWork, setCanWork] = useState(false); // Default to false until wallet status is loaded
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [offerJob, setOfferJob] = useState(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [pickupModalVisible, setPickupModalVisible] = useState(false);
  const [pickupJob, setPickupJob] = useState(null);
  const [pickingUp, setPickingUp] = useState(false);
  const [pickupSuccessModalVisible, setPickupSuccessModalVisible] = useState(false);
  const [offerSuccessModalVisible, setOfferSuccessModalVisible] = useState(false);
  const [offerErrorModalVisible, setOfferErrorModalVisible] = useState(false);
  const [offerErrorMessage, setOfferErrorMessage] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [hasActiveJob, setHasActiveJob] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // When locale is Hindi, cache translated title/description/address/pincode per job
  const [translatedJobs, setTranslatedJobs] = useState({});

  const loadJobs = async () => {
    // Never fetch or show jobs when GPS is not granted
    if (!gpsEnabled) {
      setJobs([]);
      setLoading(false);
      setRefreshing(false);
      setError('');
      return;
    }
    try {
      if (!refreshing) setLoading(true);
      setError('');

      let lat = null;
      let lng = null;
      if (gpsEnabled) {
        const coords = await getCurrentCoords();
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      const sortParam = selectedFilter === 'farthest_first' ? 'farthest_first' : undefined;
      const response = await freelancerJobsAPI.getAvailableJobs(lat, lng, sortParam);
      if (response?.success && Array.isArray(response.jobs)) {
        setJobs(response.jobs);
      } else if (Array.isArray(response)) {
        setJobs(response);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error('Error loading available jobs for freelancer:', err);
      setError(err.response?.data?.error || err.message || t('jobs.failedLoadJobs'));
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    if (!gpsEnabled) {
      setJobs([]);
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    loadJobs();
    loadWalletStatus();
  };

  const loadWalletStatus = async () => {
    try {
      const response = await walletAPI.getWallet();
      console.log('Full wallet response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.wallet) {
        // Backend returns canWork based on 450rs threshold (< 450rs)
        const walletCanWork = response.wallet.canWork;
        const totalDues = response.wallet.totalDues || 0;
        
        // Robust parsing: handle boolean, string, undefined, null
        let parsedCanWork = false;
        if (typeof walletCanWork === 'boolean') {
          parsedCanWork = walletCanWork;
        } else if (typeof walletCanWork === 'string') {
          parsedCanWork = walletCanWork.toLowerCase() === 'true';
        } else if (walletCanWork != null) {
          parsedCanWork = Boolean(walletCanWork);
        }
        
        console.log('Wallet Status - canWork:', parsedCanWork, 'totalDues:', totalDues, 'raw canWork:', walletCanWork, 'type:', typeof walletCanWork);
        setCanWork(parsedCanWork);
      } else {
        // If no wallet data, default to false
        console.log('No wallet data in response, defaulting canWork to false');
        setCanWork(false);
      }
    } catch (err) {
      console.error('Error loading wallet for canWork:', err);
      console.error('Error details:', err.response?.data || err.message);
      // Default to false on error to be safe
      setCanWork(false);
    }
  };

  const checkActiveJob = async () => {
    try {
      const response = await freelancerJobsAPI.getAssignedJobs();
      if (response?.success && Array.isArray(response.jobs)) {
        // Check if there's any active job (not fully completed)
        const activeJobs = response.jobs.filter(
          job => job.freelancerCompleted !== true && 
          job.status !== 'cancelled'
        );
        setHasActiveJob(activeJobs.length > 0);
      } else if (Array.isArray(response)) {
        const activeJobs = response.filter(
          job => job.freelancerCompleted !== true && 
          job.status !== 'cancelled'
        );
        setHasActiveJob(activeJobs.length > 0);
      } else {
        setHasActiveJob(false);
      }
    } catch (err) {
      console.error('Error checking active jobs:', err);
      setHasActiveJob(false);
    }
  };

  useEffect(() => {
    if (gpsEnabled) {
      Promise.all([
        loadJobs(),
        loadWalletStatus(),
        checkActiveJob(),
      ]).catch((err) => {
        console.error('Error loading initial data:', err);
        setLoading(false);
      });
    } else {
      Promise.all([loadWalletStatus(), checkActiveJob()]).catch((err) => {
        console.error('Error loading wallet/active job:', err);
      });
      setLoading(false);
    }
  }, [gpsEnabled]);

  // When GPS becomes denied, clear jobs so we never show list with stale data
  useEffect(() => {
    if (gpsDenied) setJobs([]);
  }, [gpsDenied]);

  // When locale is Hindi, translate job title/description/address/pincode for display
  useEffect(() => {
    if (locale !== 'hi' || !jobs.length) {
      if (locale !== 'hi') setTranslatedJobs({});
      return;
    }
    let cancelled = false;
    const run = async () => {
      for (const job of jobs) {
        const id = job._id || job.id;
        if (!id) continue;
        try {
          const translated = await translateJobToHindi(job);
          if (!cancelled) setTranslatedJobs((prev) => ({ ...prev, [id]: translated }));
        } catch (e) {
          if (!cancelled) setTranslatedJobs((prev) => ({ ...prev, [id]: { title: job.title, description: job.description || '', address: job.address || '', pincode: job.pincode || '' } }));
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [locale, jobs]);

  const handlePickupJob = async (job) => {
    if (!canWork) {
      Alert.alert(t('jobs.cannotPickup'), t('jobs.cannotPickupPayDues'));
      return;
    }

    if (hasActiveJob) {
      Alert.alert(t('jobs.cannotPickup'), t('jobs.cannotPickupActiveJob'));
      return;
    }

    setPickupJob(job);
    setPickupModalVisible(true);
  };

  const confirmPickupJob = async () => {
    if (!pickupJob) return;

    try {
      setPickingUp(true);
      const response = await freelancerJobsAPI.pickupJob(pickupJob._id || pickupJob.id);
      if (response.success) {
        setPickupModalVisible(false);
        setPickupJob(null);
        setPickupSuccessModalVisible(true);
        loadJobs();
        checkActiveJob(); // Update active job status
      } else {
        Alert.alert(t('common.error'), response.error || t('jobs.failedPickup'));
      }
    } catch (err) {
      console.error('Error picking up job:', err);
      Alert.alert(
        t('common.error'),
        err.response?.data?.error || err.message || t('jobs.failedPickup')
      );
    } finally {
      setPickingUp(false);
    }
  };

  const applyFilter = (jobs) => {
    if (selectedFilter === 'none') return jobs;

    const sortedJobs = [...jobs];
    
    switch (selectedFilter) {
      case 'price_high_low':
        return sortedJobs.sort((a, b) => (b.budget || 0) - (a.budget || 0));
      case 'price_low_high':
        return sortedJobs.sort((a, b) => (a.budget || 0) - (b.budget || 0));
      case 'newest':
        return sortedJobs.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
      case 'oldest':
        return sortedJobs.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateA - dateB;
        });
      case 'nearest_first':
        return sortedJobs.sort((a, b) => {
          const da = a.distanceKm != null ? a.distanceKm : Infinity;
          const db = b.distanceKm != null ? b.distanceKm : Infinity;
          return da - db;
        });
      case 'farthest_first':
        return sortedJobs.sort((a, b) => {
          const da = a.distanceKm != null ? a.distanceKm : -1;
          const db = b.distanceKm != null ? b.distanceKm : -1;
          return db - da;
        });
      default:
        return sortedJobs;
    }
  };

  const openOfferModal = (job) => {
    if (!canWork) {
      Alert.alert(t('jobs.cannotMakeOffer'), t('jobs.cannotMakeOfferPayDues'));
      return;
    }

    if (hasActiveJob) {
      Alert.alert(t('jobs.cannotMakeOffer'), t('jobs.cannotMakeOfferActiveJob'));
      return;
    }

    if (job.assignedFreelancer || job.status !== 'open') {
      Alert.alert(t('jobs.cannotMakeOffer'), t('jobs.cannotMakeOfferNoLonger'));
      return;
    }

    setOfferJob(job);
    setOfferAmount('');
    setOfferMessage('');
    setOfferModalVisible(true);
  };

  const handleSubmitOffer = async () => {
    if (!offerJob) return;
    const amountNumber = Number(offerAmount);
    if (!amountNumber || amountNumber <= 0) {
      setOfferErrorMessage('Please enter a valid offer amount.');
      setOfferErrorModalVisible(true);
      return;
    }

    try {
      setSubmittingOffer(true);
      const response = await freelancerJobsAPI.makeOffer(offerJob._id || offerJob.id, {
        amount: amountNumber,
        message: offerMessage || null,
      });
      if (response.success) {
        setSubmittingOffer(false);
        setOfferModalVisible(false);
        setOfferSuccessModalVisible(true);
        // Reload jobs so we get updated offers array for cooldown calculation
        loadJobs();
      } else {
        setSubmittingOffer(false);
        setOfferErrorMessage(response.error || 'Failed to submit offer');
        setOfferErrorModalVisible(true);
      }
    } catch (err) {
      console.error('Error submitting offer:', err);
      setSubmittingOffer(false);
      setOfferErrorMessage(err.response?.data?.error || err.message || 'Failed to submit offer');
      setOfferErrorModalVisible(true);
    }
  };

  const getOfferCooldownMinutes = (job) => {
    try {
      if (!job?.offers || !Array.isArray(job.offers) || !freelancerId) return 0;
      const myOffers = job.offers.filter(
        (o) =>
          o.freelancer === freelancerId ||
          o.freelancer?._id === freelancerId ||
          o.freelancer?.toString?.() === freelancerId
      );
      if (!myOffers.length) return 0;
      const lastOffer = myOffers.reduce((latest, current) => {
        const latestTime = new Date(latest.createdAt || 0).getTime();
        const currentTime = new Date(current.createdAt || 0).getTime();
        return currentTime > latestTime ? current : latest;
      });
      const FIVE_MINUTES = 5 * 60 * 1000;
      const now = Date.now();
      const lastTime = new Date(lastOffer.createdAt || 0).getTime();
      const diff = now - lastTime;
      if (diff >= FIVE_MINUTES) return 0;
      return Math.ceil((FIVE_MINUTES - diff) / (60 * 1000));
    } catch {
      return 0;
    }
  };

  const renderJobItem = ({ item }) => {
    const cooldownMinutes = getOfferCooldownMinutes(item);
    // Check if job is already picked up (by any freelancer)
    const isPickedUp = item.assignedFreelancer || item.status !== 'open';
    // Can only pickup if: canWork is true, job is not picked up, and freelancer doesn't have active job
    const canPickup = canWork && !isPickedUp && !hasActiveJob;
    // Can make offer if: canWork is true, no cooldown, job not picked up, and no active job
    const canMakeOffer = canWork && cooldownMinutes === 0 && !isPickedUp && !hasActiveJob;

    const jobId = item._id || item.id;
    const tr = locale === 'hi' && translatedJobs[jobId];
    const title = tr ? tr.title : item.title;
    const description = tr ? tr.description : (item.description || '');
    const address = tr ? tr.address : (item.address || '');
    const pincode = tr ? tr.pincode : (item.pincode || '');
    
    // Debug log for first job only to avoid spam
    if (item._id === jobs[0]?._id || item.id === jobs[0]?.id) {
      console.log('Rendering job - canWork:', canWork, 'canPickup:', canPickup, 'canMakeOffer:', canMakeOffer, 'isPickedUp:', isPickedUp, 'hasActiveJob:', hasActiveJob);
    }

    return (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle}>{title}</Text>
        <Text style={styles.jobBudget}>₹{item.budget}</Text>
      </View>
      {description ? (
        <Text style={styles.jobDescription} numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      <View style={styles.jobAddressRow}>
        <MaterialIcons name="location-on" size={16} color={colors.text.secondary} />
        <Text style={styles.jobAddress}>{address}</Text>
      </View>
      <View style={styles.jobMetaRow}>
        <View style={styles.jobMeta}>
          <MaterialIcons name="person" size={16} color={colors.text.secondary} />
          <Text style={styles.jobMetaText}>{t('gender.' + (item.gender || 'any'))}</Text>
        </View>
        <View style={styles.jobMeta}>
          <MaterialIcons name="location-on" size={16} color={colors.text.secondary} />
          <Text style={styles.jobMetaText}>{pincode}</Text>
        </View>
        {item.distanceKm != null && (
          <View style={styles.jobMeta}>
            <MaterialIcons name="near-me" size={16} color={colors.text.secondary} />
            <Text style={styles.jobMetaText}>{item.distanceKm} {t('jobs.kmAway')}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.pickupButton,
            (!canPickup || isPickedUp) && styles.actionButtonDisabled,
          ]}
          onPress={() => handlePickupJob(item)}
          disabled={!canPickup || isPickedUp}
        >
          <MaterialIcons
            name="check-circle"
            size={18}
            color={canPickup && !isPickedUp ? colors.background : colors.text.muted}
          />
          <Text
            style={[
              styles.actionButtonText,
              styles.pickupButtonText,
              { color: canPickup ? colors.background : colors.text.muted },
            ]}
          >
            {!canWork 
              ? t('jobs.payDues') 
              : isPickedUp 
              ? t('jobs.alreadyTaken')
              : t('jobs.pickupJob')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.makeOfferButton,
            (!canMakeOffer || isPickedUp) && styles.actionButtonDisabled,
          ]}
          onPress={() => openOfferModal(item)}
          disabled={!canMakeOffer || isPickedUp}
        >
          <MaterialIcons
            name="local-offer"
            size={18}
            color={canMakeOffer && !isPickedUp ? colors.background : colors.text.muted}
          />
          <Text
            style={[
              styles.actionButtonText,
              styles.makeOfferButtonText,
              { color: canMakeOffer && !isPickedUp ? colors.background : colors.text.muted },
            ]}
          >
            {!canWork
              ? t('jobs.payDues')
              : isPickedUp
              ? t('jobs.alreadyTaken')
              : cooldownMinutes > 0
              ? `${cooldownMinutes}m`
              : t('jobs.makeOffer')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );};

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  // GPS off or not yet determined: show message, no job cards
  if (!gpsEnabled) {
    return (
      <View style={styles.container}>
        <View style={styles.gpsMessageCard}>
          <MaterialIcons name="location-off" size={48} color={colors.text.muted} />
          <Text style={styles.gpsMessageTitle}>{t('jobs.gpsOff')}</Text>
          <Text style={styles.gpsMessageText}>{t('jobs.gpsOffMessage')}</Text>
        </View>
      </View>
    );
  }

  if (jobs.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon={<MaterialIcons name="work" size={64} color={colors.text.muted} />}
          title={t('jobs.noAvailableJobs')}
          description={t('jobs.noAvailableJobsDesc')}
        />
      </View>
    );
  }

  const filteredJobs = applyFilter(jobs);

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <View style={styles.filterOptions}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedFilter === 'none' && styles.filterOptionActive,
              ]}
              onPress={() => setSelectedFilter('none')}
            >
              <Text style={[
                styles.filterOptionText,
                selectedFilter === 'none' && styles.filterOptionTextActive,
              ]}>
                {t('jobs.filterAll')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedFilter === 'price_high_low' && styles.filterOptionActive,
              ]}
              onPress={() => setSelectedFilter('price_high_low')}
            >
              <Text style={[
                styles.filterOptionText,
                selectedFilter === 'price_high_low' && styles.filterOptionTextActive,
              ]}>
                {t('jobs.filterPriceHighLow')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedFilter === 'price_low_high' && styles.filterOptionActive,
              ]}
              onPress={() => setSelectedFilter('price_low_high')}
            >
              <Text style={[
                styles.filterOptionText,
                selectedFilter === 'price_low_high' && styles.filterOptionTextActive,
              ]}>
                {t('jobs.filterPriceLowHigh')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedFilter === 'newest' && styles.filterOptionActive,
              ]}
              onPress={() => setSelectedFilter('newest')}
            >
              <Text style={[
                styles.filterOptionText,
                selectedFilter === 'newest' && styles.filterOptionTextActive,
              ]}>
                {t('jobs.filterNewestFirst')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedFilter === 'nearest_first' && styles.filterOptionActive,
              ]}
              onPress={() => setSelectedFilter('nearest_first')}
            >
              <Text style={[
                styles.filterOptionText,
                selectedFilter === 'nearest_first' && styles.filterOptionTextActive,
              ]}>
                {t('jobs.filterNearestToFar')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedFilter === 'farthest_first' && styles.filterOptionActive,
              ]}
              onPress={() => setSelectedFilter('farthest_first')}
            >
              <Text style={[
                styles.filterOptionText,
                selectedFilter === 'farthest_first' && styles.filterOptionTextActive,
              ]}>
                {t('jobs.filterFarToNearest')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={filteredJobs}
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
      />

      {/* Pickup Job Confirmation Modal */}
      <Modal
        visible={pickupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('jobs.pickupConfirmTitle')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('jobs.pickupConfirmMessage')}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setPickupModalVisible(false);
                  setPickupJob(null);
                }}
                disabled={pickingUp}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.pickupButtonModal]}
                onPress={confirmPickupJob}
                disabled={pickingUp}
              >
                {pickingUp ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>{t('jobs.pickupJob')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Make Offer Modal */}
      <Modal
        visible={offerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('jobs.makeOfferTitle')}</Text>
            {offerJob && (
              <Text style={styles.modalSubtitle}>
                {(locale === 'hi' && translatedJobs[offerJob._id || offerJob.id]?.title) || offerJob.title} · ₹{offerJob.budget}
              </Text>
            )}
            <Text style={styles.modalLabel}>{t('jobs.offerAmount')}</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder={t('jobs.enterOfferAmount')}
              value={offerAmount}
              onChangeText={setOfferAmount}
            />
            <Text style={styles.modalLabel}>{t('jobs.messageOptional')}</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              placeholder={t('jobs.writeMessage')}
              value={offerMessage}
              onChangeText={setOfferMessage}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setOfferModalVisible(false)}
                disabled={submittingOffer}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={handleSubmitOffer}
                disabled={submittingOffer}
              >
                {submittingOffer ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>{t('jobs.submitOffer')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pickup Job Success Modal */}
      <Modal
        visible={pickupSuccessModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPickupSuccessModalVisible(false);
          // Navigate to My Jobs tab after closing success modal
          if (onJobPickedUp) {
            onJobPickedUp();
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={64} color={colors.success.main} />
            </View>
            <Text style={styles.modalTitle}>{t('jobs.jobPickedUpSuccess')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('jobs.jobPickedUpSuccessMsg')}
            </Text>
            <View style={[styles.modalActions, styles.modalActionsCentered]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
                onPress={() => {
                  setPickupSuccessModalVisible(false);
                  // Navigate to My Jobs tab after closing success modal
                  if (onJobPickedUp) {
                    onJobPickedUp();
                  }
                }}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Make Offer Success Modal */}
      <Modal
        visible={offerSuccessModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOfferSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={64} color={colors.success.main} />
            </View>
            <Text style={styles.modalTitle}>{t('jobs.offerSubmitted')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('jobs.offerSubmittedMsg')}
            </Text>
            <View style={[styles.modalActions, styles.modalActionsCentered]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.successModalButton]}
                onPress={() => setOfferSuccessModalVisible(false)}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Make Offer Error Modal */}
      <Modal
        visible={offerErrorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOfferErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.errorIconContainer}>
              <MaterialIcons name="error" size={64} color={colors.error.main} />
            </View>
            <Text style={styles.modalTitle}>{t('common.error')}</Text>
            <Text style={styles.modalSubtitle}>
              {offerErrorMessage}
            </Text>
            <View style={[styles.modalActions, styles.modalActionsCentered]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={() => setOfferErrorModalVisible(false)}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: spacing.lg,
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
    paddingHorizontal: spacing.lg,
  },
  jobCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    width: SCREEN_WIDTH * 0.97,
    alignSelf: 'center',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  jobTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  jobBudget: {
    ...typography.body,
    color: colors.primary.main,
    fontWeight: '600',
  },
  jobCategory: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  jobAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  jobAddress: {
    ...typography.small,
    color: colors.text.primary,
    flex: 1,
  },
  jobMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
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
    marginBottom: spacing.xs,
  },
  actionsRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    borderWidth: 1,
    flex: 1,
  },
  pickupButton: {
    backgroundColor: colors.success.main,
    borderColor: colors.success.main,
  },
  makeOfferButton: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  actionButtonDisabled: {
    backgroundColor: 'transparent',
    borderColor: colors.text.muted,
  },
  actionButtonText: {
    ...typography.small,
    fontWeight: '600',
  },
  pickupButtonText: {
    color: colors.background,
  },
  makeOfferButtonText: {
    color: colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalLabel: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
  },
  modalTextarea: {
    height: 90,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalActionsCentered: {
    justifyContent: 'center',
  },
  modalButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.cardBackground,
  },
  modalSubmitButton: {
    backgroundColor: colors.primary.main,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.text.primary,
  },
  modalSubmitText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pickupButtonModal: {
    backgroundColor: colors.success.main,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  errorIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  successModalButton: {
    backgroundColor: colors.success.main,
  },
  filterBar: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xs,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  filterButtonActive: {
    color: colors.primary.main,
  },
  filterButtonText: {
    ...typography.body,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.primary.main,
  },
  filterOptions: {
    marginTop: 0,
    paddingBottom: spacing.xs,
  },
  filterScrollContent: {
    gap: spacing.sm,
  },
  filterOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  filterOptionActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  filterOptionText: {
    ...typography.small,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: colors.background,
  },
  gpsMessageCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  gpsMessageTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  gpsMessageText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default AvailableJobs;


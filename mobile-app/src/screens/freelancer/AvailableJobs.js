/**
 * Available Jobs Tab - Freelancer Dashboard
 * Display open jobs that freelancers can see
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  Linking,
  Animated,
  Dimensions,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import EmptyState from '../../components/common/EmptyState';
import { freelancerJobsAPI } from '../../api/freelancerJobs';
import { walletAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useLocation } from '../../context/LocationContext';
import { translateJobToHindi } from '../../utils/translate';
import { translateToHindi } from '../../utils/translate';
import { isDeliveryJob } from '../../utils/jobDisplay';
import { JobLocationBlock, JobMetaGenderOrDeliveryPins } from '../../components/job/JobLocationBlock';
import { buildGoogleMapsBikeDirectionsUrl } from '../../utils/mapsDirections';
import { JOB_CATEGORIES, JOB_CATEGORY_I18N_KEYS } from '../../constants/jobCategories';
import { readJobListCache, writeJobListCache } from '../../utils/jobListCache';

const { width: SCREEN_W } = Dimensions.get('window');

function normalizeOtherOption(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[.]/g, '')
    .replace(/[()]/g, '')
    .replace(/[/]/g, ' ')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Same list as client "Other" picker; "Others" first.
const OTHER_WORK_OPTIONS_RAW = [
  'Others',
  'Interior decorator',
  'Carpenter / furniture maker',
  'Floor tiler (tiles, marble, granite)',
  'Painter (wall, texture, spray)',
  'Plumber',
  'Electrician',
  'POP (Plaster of Paris) worker',
  'False ceiling installer',
  'Welder',
  'Mason (brick/block work)',
  'Glass & window installer (aluminum/uPVC)',
  'Cabinet maker',
  'Wood polisher / finisher',
  'Sofa maker / upholsterer',
  'Modular kitchen installer',
  'Door & window fabricator',
  'Bamboo craftsman',
  'Gardener / landscaper',
  'Nursery plant caretaker',
  'Irrigation system installer',
  'Lawn maintenance worker',
  'Tree trimmer / cutter',
  'Potter (clay items)',
  'Sculptor',
  'Handicraft maker',
  'Textile weaver',
  'Embroidery worker',
  'Leather goods maker',
  'Candle / soap maker',
  'Pest control technician',
  'Housekeeping staff',
  'Waste management worker',
  'Mobile repair technician',
  'HVAC (AC) technician',
  'Refrigeration mechanic',
  'AC & refrigerator mechanic',
  'TV / appliance repair technician',
  'Bike mechanic',
  'Car mechanic',
  'Generator technician',
  'Generator repair technician',
  'CCTV installation technician',
  'Warehouse handler',
  'Packing & moving labor',
  'Heavy equipment operator (JCB, crane, etc.)',
  'Makeup artist',
  'Mehndi artist',
  'Fitness trainer (skill-based)',
  'Solar panel installer',
  'Solar maintenance technician',
  'Wind turbine technician',
  'Transformer repair technician',
  'Electrical panel board fabricator',
  'Cable tray installer',
  'Lightning protection system installer',
  'Duct fabrication specialist',
  'Ventilation system installer',
  'Boiler operator',
  'Chiller plant technician',
  'Cooling tower technician',
  'Gas pipeline installer',
  'Compressed air system technician',
  'Elevator (lift) technician',
  'MIG/TIG welder',
  'CNC machine operator',
  'Lathe machine operator',
  'Sheet metal fabricator',
  'Aluminum fabricator',
  'Steel structure fabricator',
  'Pipe fitter',
  'Industrial rigging specialist',
  'Blacksmith',
  'Tool and die maker',
  'Industrial plumber',
  'Pipeline welder',
  'Drainage system specialist',
  'Fire sprinkler system installer',
  'Water treatment plant technician',
  'Borewell drilling technician',
  'Sewage treatment plant operator',
  'Irrigation system technician',
  'Scaffolding specialist',
  'Formwork (shuttering) carpenter',
  'Steel fixer (rebar worker)',
  'Concrete pump operator',
  'Tower crane operator',
  'Excavator / JCB operator',
  'Road roller operator',
  'Asphalt paving specialist',
  'Waterproofing technician',
  'Basement sealing expert',
  'High-voltage line technician',
  'Industrial electrician',
  'Electrical panel board fabricator',
  'Cable tray installer',
  'Lightning protection system installer',
  'HVAC (AC) technician',
  'Refrigeration mechanic',
  'Duct fabrication specialist',
  'Ventilation system installer',
  'Boiler operator',
  'Chiller plant technician',
  'Cooling tower technician',
  'Gas pipeline installer',
  'Compressed air system technician',
  'Elevator (lift) technician',
  'Fire alarm system technician',
  'Fire extinguisher technician',
  'Access control system installer',
  'Security system integrator',
  'Smoke detector installer',
  'False ceiling specialist',
  'Glass façade installer',
  'uPVC window fabricator',
  'Stone (granite/marble) polisher',
  'Epoxy flooring specialist',
  'Wooden flooring installer',
  'Acoustic panel installer',
  'Rainwater harvesting technician',
  'Waste recycling plant operator',
  'Biogas plant technician',
  'EV (electric vehicle) charging station installer',
  'Smart home automation technician',
  'Drone surveying operator',
  'Fiber optic cable technician',
  'Data cabling technician',
];

const OTHER_WORK_OPTIONS = (() => {
  const seen = new Set();
  const out = [];
  for (const opt of OTHER_WORK_OPTIONS_RAW) {
    const key = normalizeOtherOption(opt);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(opt.trim());
  }
  return out;
})();

/** Backend returns code + blockedUntil when support unassign cooldown is active */
function messageForFreelancerPickupBlocked(t, payload) {
  if (!payload || payload.code !== 'FREELANCER_PICKUP_BLOCKED') return null;
  if (!payload.blockedUntil) return null;
  const d = new Date(payload.blockedUntil);
  const timeStr = Number.isNaN(d.getTime()) ? String(payload.blockedUntil) : d.toLocaleString();
  return t('jobs.pickupApplyBlockedDetail', { time: timeStr });
}

function createAvailableJobsStyles(colors, isDark) {
  return StyleSheet.create({
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
  /** Small side inset so the card can be ~98% of screen; old `spacing.lg` made the list feel ~90% wide. */
  listContent: {
    paddingBottom: spacing.lg,
    paddingHorizontal: '1%',
    width: '100%',
  },
  jobCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  jobHeaderRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    flexShrink: 0,
    gap: 8,
  },
  jobTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    minWidth: 0,
    marginRight: spacing.xs,
  },
  jobBudget: {
    ...typography.body,
    color: colors.primary.main,
    fontWeight: '600',
    flexShrink: 0,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  categoryPill: {
    maxWidth: 170,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(37, 99, 235, 0.95)' : 'rgba(37, 99, 235, 0.35)',
    backgroundColor: isDark ? colors.primary.main : '#FFFFFF',
    justifyContent: 'center',
    marginBottom: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1,
  },
  categoryPillText: {
    ...typography.small,
    color: isDark ? '#FFFFFF' : colors.primary.main,
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 12,
    includeFontPadding: false,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  jobMetaLeftRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  jobMetaPinsInline: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  jobMetaMainInner: {
    flex: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  jobMetaDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
    marginLeft: spacing.xs,
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
  jobDirectionsIconButton: {
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    borderRadius: spacing.sm,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionBlock: {
    position: 'relative',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  jobDescription: {
    ...typography.small,
    color: colors.text.secondary,
    paddingRight: 0,
  },
  viewMoreButton: {
    paddingVertical: 2,
  },
  viewMoreButtonInline: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.cardBackground,
    paddingLeft: spacing.sm,
  },
  viewMoreButtonBlock: {
    marginTop: spacing.xs,
    width: '100%',
  },
  viewMoreText: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '600',
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
  applyButton: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  makeOfferButton: {
    backgroundColor: colors.success.main,
    borderColor: colors.success.main,
  },
  /** Keep solid fill while Apply request is in flight (avoid actionButtonDisabled transparent flash). */
  applyButtonBusy: {
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
  /** On primary/success fills, always white (light theme used `background` = white; dark `background` is near-black). */
  pickupButtonText: {
    color: '#FFFFFF',
  },
  applyButtonText: {
    color: '#FFFFFF',
  },
  makeOfferButtonText: {
    color: '#FFFFFF',
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
  applySuccessBanner: {
    backgroundColor: colors.success.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: spacing.sm,
    marginHorizontal: spacing.md,
  },
  applySuccessBannerText: {
    ...typography.small,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
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
  offerSubmittedModalContent: {
    alignItems: 'stretch',
  },
  offerSubmittedModalActions: {
    width: '100%',
    alignSelf: 'stretch',
  },
  offerSubmittedOkButton: {
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 52,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#FFFFFF',
  },
  categoryModalWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  categoryModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  categoryModalContent: {
    width: '100%',
    zIndex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    // Give the modal an actual height so flex children (body) can render.
    // Using a percent keeps it within the viewport across devices.
    height: '72%',
    maxHeight: '72%',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  categoryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryModalTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.text.primary,
    fontWeight: '700',
  },
  /** 3 columns × 4 rows (12 categories). */
  categoryModalGrid: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  categoryModalBody: {
    flex: 1,
  },
  categoryModalShiftRow: {
    flexDirection: 'row',
    flex: 1,
    width: '200%',
  },
  categoryModalPage: {
    width: '50%',
    flex: 1,
  },
  categoryModalPageInner: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  otherSearchInput: {
    borderWidth: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary.main + '80',
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 0,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  otherWorkItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  otherWorkItemActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  otherWorkItemText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  selectedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  selectedChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.primary,
  },
  categoryModalFooter: {
    // removed (no footer buttons)
  },
  categoryModalHintText: {
    ...typography.small,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  categoryModalFooterBtn: {},
  categoryModalFooterBtnPrimary: {},
  categoryModalFooterText: {},
  categoryModalFooterTextPrimary: {},
  categoryModalRowWrap: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  categoryModalCell: {
    flex: 1,
    minHeight: 68,
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryModalCellIcon: {
    marginBottom: 6,
  },
  categoryModalCellActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main,
  },
  categoryModalCellText: {
    ...typography.small,
    fontSize: 12,
    lineHeight: 16,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryModalCellTextActive: {
    color: '#FFFFFF',
  },
  categoryEmptyWrap: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  categoryEmptyText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
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
}

const AvailableJobs = ({
  onJobPickedUp,
  workCooldownRemainMs = 0,
  hasActiveAssignedJob = false,
  onActiveJobStatusChange,
}) => {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const { gpsEnabled, gpsDenied, getCurrentCoords, requestPermission } = useLocation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createAvailableJobsStyles(colors, isDark), [colors, isDark]);


  const freelancerId = user?.id || user?._id || null;
  const cacheUser = user;
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
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [applySuccessBannerVisible, setApplySuccessBannerVisible] = useState(false);
  const applySuccessBannerTimerRef = useRef(null);
  const [offerSuccessModalVisible, setOfferSuccessModalVisible] = useState(false);
  const [offerErrorModalVisible, setOfferErrorModalVisible] = useState(false);
  const [offerErrorMessage, setOfferErrorMessage] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('none');
  /** Multi-select categories; when empty, show all. */
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const categoryModalShift = useRef(new Animated.Value(0)).current; // 0 = main categories, 1 = Other list
  const [categoryModalPage, setCategoryModalPage] = useState('grid'); // 'grid' | 'other'
  const [otherQuery, setOtherQuery] = useState('');
  const [otherTranslated, setOtherTranslated] = useState({});
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [hasActiveJob, setHasActiveJob] = useState(false);
  const effectiveHasActiveJob = hasActiveAssignedJob || hasActiveJob;
  const [refreshing, setRefreshing] = useState(false);
  // When locale is Hindi, cache translated title/description/address/pincode per job
  const [translatedJobs, setTranslatedJobs] = useState({});
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState({});

  const fetchInFlightRef = useRef(false);
  const activeJobCheckInFlightRef = useRef(false);
  // NOTE: Do not auto-redirect tabs from here. Tab switching should be user-controlled.
  // The dashboard already prefers "My Jobs" once on initial mount when an active job exists.

  const withTimeout = useCallback((promise, ms, label) => {
    let timeoutId = null;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label || 'request'} timeout`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });
  }, []);

  const loadJobs = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    // Never fetch or show jobs when GPS is not granted
    if (!gpsEnabled) {
      setJobs([]);
      if (!silent) setLoading(false);
      setRefreshing(false);
      if (!silent) setError('');
      return;
    }
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    try {
      if (!silent && !refreshing) setLoading(true);
      if (!silent) setError('');

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
        void writeJobListCache({ user: cacheUser, scope: 'freelancer:available', data: response.jobs });
      } else if (Array.isArray(response)) {
        setJobs(response);
        void writeJobListCache({ user: cacheUser, scope: 'freelancer:available', data: response });
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error('Error loading available jobs for freelancer:', err);
      if (!silent) {
        setError(err.response?.data?.error || err.message || t('jobs.failedLoadJobs'));
        setJobs([]);
      }
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
      fetchInFlightRef.current = false;
    }
  }, [gpsEnabled, getCurrentCoords, refreshing, selectedFilter, t]);

  // Fast paint from cache (stale-while-revalidate)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await readJobListCache({ user: cacheUser, scope: 'freelancer:available', maxAgeMs: 10 * 60 * 1000 });
      if (cancelled) return;
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setJobs(cached);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cacheUser?.id, cacheUser?._id]);

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

  const checkActiveJob = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (activeJobCheckInFlightRef.current) return;
    activeJobCheckInFlightRef.current = true;
    try {
      // Guard: this endpoint can be slow during assignment; do not block UI.
      const response = await withTimeout(
        freelancerJobsAPI.getAssignedJobs(),
        15000,
        'getAssignedJobs'
      );
      if (response?.success && Array.isArray(response.jobs)) {
        // Check if there's any active job (not fully completed)
        const activeJobs = response.jobs.filter(
          job => job.freelancerCompleted !== true && 
          job.status !== 'cancelled'
        );
        const active = activeJobs.length > 0;
        setHasActiveJob(active);
        if (typeof onActiveJobStatusChange === 'function') onActiveJobStatusChange(active);
      } else if (Array.isArray(response)) {
        const activeJobs = response.filter(
          job => job.freelancerCompleted !== true && 
          job.status !== 'cancelled'
        );
        const active = activeJobs.length > 0;
        setHasActiveJob(active);
        if (typeof onActiveJobStatusChange === 'function') onActiveJobStatusChange(active);
      } else {
        setHasActiveJob(false);
        if (typeof onActiveJobStatusChange === 'function') onActiveJobStatusChange(false);
      }
    } catch (err) {
      console.error('Error checking active jobs:', err);
      if (!silent) setHasActiveJob(false);
    } finally {
      activeJobCheckInFlightRef.current = false;
    }
  }, [withTimeout, onActiveJobStatusChange]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Always allow UI to become interactive even if assigned-job check is slow.
        if (gpsEnabled) {
          await Promise.all([loadJobs(), loadWalletStatus()]);
        } else {
          await loadWalletStatus();
          if (mounted) setLoading(false);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        if (mounted) setLoading(false);
      } finally {
        // Run active job check in background; do not block initial render.
        void checkActiveJob({ silent: true });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [gpsEnabled]);

  // Silent refresh every 5s while this tab is focused.
  useFocusEffect(
    useCallback(() => {
      if (!gpsEnabled) return;
      const id = setInterval(() => {
        void loadJobs({ silent: true });
        void checkActiveJob({ silent: true });
      }, 5000);
      return () => clearInterval(id);
    }, [gpsEnabled, loadJobs, checkActiveJob])
  );

  // When GPS becomes denied, clear jobs so we never show list with stale data
  useEffect(() => {
    if (gpsDenied) setJobs([]);
  }, [gpsDenied]);

  useEffect(
    () => () => {
      if (applySuccessBannerTimerRef.current) {
        clearTimeout(applySuccessBannerTimerRef.current);
        applySuccessBannerTimerRef.current = null;
      }
    },
    []
  );

  const showApplySuccessBanner = useCallback(() => {
    if (applySuccessBannerTimerRef.current) {
      clearTimeout(applySuccessBannerTimerRef.current);
    }
    setApplySuccessBannerVisible(true);
    applySuccessBannerTimerRef.current = setTimeout(() => {
      setApplySuccessBannerVisible(false);
      applySuccessBannerTimerRef.current = null;
    }, 3000);
  }, []);

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
          if (!cancelled) {
            setTranslatedJobs((prev) => ({
              ...prev,
              [id]: {
                title: job.title,
                description: job.description || '',
                address: job.address || '',
                pincode: job.pincode || '',
                deliveryFromAddress: job.deliveryFromAddress || '',
                deliveryFromPincode: job.deliveryFromPincode || '',
                deliveryToAddress: job.deliveryToAddress || '',
                deliveryToPincode: job.deliveryToPincode || '',
              },
            }));
          }
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [locale, jobs]);

  const handlePickupJob = async (job) => {
    if (workCooldownRemainMs > 0) {
      Alert.alert(t('jobs.cannotPickup'), t('jobs.workCooldownBlocked'));
      return;
    }
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

  const submitApply = async (job) => {
    const jid = job._id || job.id;
    try {
      setApplyingJobId(jid);
      const response = await freelancerJobsAPI.applyJob(jid);
      if (response.success) {
        loadJobs();
        showApplySuccessBanner();
      } else {
        Alert.alert(
          t('common.error'),
          messageForFreelancerPickupBlocked(t, response) || response.error || t('jobs.failedApply')
        );
      }
    } catch (err) {
      console.error('Error applying to job:', err);
      const data = err.response?.data;
      Alert.alert(
        t('common.error'),
        messageForFreelancerPickupBlocked(t, data) || data?.error || err.message || t('jobs.failedApply')
      );
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleApplyJob = (job) => {
    if (workCooldownRemainMs > 0) {
      Alert.alert(t('jobs.cannotApply'), t('jobs.workCooldownBlocked'));
      return;
    }
    if (!canWork) {
      Alert.alert(t('jobs.cannotApply'), t('jobs.cannotApplyPayDues'));
      return;
    }
    if (hasActiveJob) {
      Alert.alert(t('jobs.cannotApply'), t('jobs.cannotApplyActiveJob'));
      return;
    }
    const myApp = job.myApplication;
    if (myApp?.status === 'pending') return;

    submitApply(job);
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
        Alert.alert(
          t('common.error'),
          messageForFreelancerPickupBlocked(t, response) || response.error || t('jobs.failedPickup')
        );
      }
    } catch (err) {
      console.error('Error picking up job:', err);
      const data = err.response?.data;
      Alert.alert(
        t('common.error'),
        messageForFreelancerPickupBlocked(t, data) || data?.error || err.message || t('jobs.failedPickup')
      );
    } finally {
      setPickingUp(false);
    }
  };

  const jobMatchesCategory = (job, cats) => {
    if (cats == null) return true;
    const list = Array.isArray(cats) ? cats : [cats];
    if (list.length === 0) return true;
    const a = String(job?.category || '')
      .trim()
      .toLowerCase();
    return list.some((cat) => a === String(cat).trim().toLowerCase());
  };

  const applyFilter = (jobList) => {
    let list = categoryFilters.length ? jobList.filter((j) => jobMatchesCategory(j, categoryFilters)) : [...jobList];

    if (selectedFilter === 'none') return list;

    const sortedJobs = [...list];
    
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

  const categoryLabel = (cat) => {
    const s = String(cat || '').trim();
    if (!s) return '';
    const keySuffix = JOB_CATEGORY_I18N_KEYS?.[s];
    if (keySuffix) return t('postJob.category' + keySuffix);
    // Custom categories (e.g. "Interior decorator") should show as-is
    return s;
  };

  const categoryIconName = (cat) => {
    const s = String(cat || '').trim();
    if (!s) return 'work-outline';
    if (s === 'Other') return 'more-horiz';
    // App categories (JOB_CATEGORIES)
    if (s === 'Delivery') return 'local-shipping';
    if (s === 'Cooking') return 'restaurant';
    if (s === 'Cleaning') return 'cleaning-services';
    if (s === 'Plumbing') return 'plumbing';
    if (s === 'Electrical') return 'electrical-services';
    if (s === 'Mechanic') return 'build';
    if (s === 'Driver') return 'drive-eta';
    if (s === 'Care taker') return 'volunteer-activism';
    if (s === 'Tailor') return 'checkroom';
    if (s === 'Salon') return 'content-cut';
    if (s === 'Laundry') return 'local-laundry-service';
    // Back-compat / unknown
    if (s === 'Barber') return 'content-cut';
    return 'work-outline';
  };

  const filteredOtherOptions = useMemo(() => {
    const q = String(otherQuery || '').trim().toLowerCase();
    if (!q) return OTHER_WORK_OPTIONS;
    return OTHER_WORK_OPTIONS.filter((opt) => {
      const en = opt.toLowerCase();
      const hi = String(otherTranslated[opt] || '').toLowerCase();
      return en.includes(q) || (hi && hi.includes(q));
    });
  }, [otherQuery, otherTranslated]);

  // Grid page: keep tighter so we don't show large empty space below 12 tiles.
  // Other page: taller to show more subcategories.
  const modalHeightPct = categoryModalPage === 'other' ? '84%' : '46%';

  const unselectCategory = (cat) => {
    setCategoryFilters((prev) => prev.filter((x) => x !== cat));
  };

  const labelForSelectedChip = (cat) => {
    const s = String(cat || '').trim();
    if (!s) return '';
    if (locale === 'hi') {
      // Show cached Hindi translation for "Other" options when available.
      if (otherTranslated[s]) return otherTranslated[s];
    }
    return categoryLabel(s);
  };

  useEffect(() => {
    if (!categoryModalVisible) return;
    if (locale !== 'hi') return;
    let cancelled = false;
    const toTranslate = filteredOtherOptions.filter((opt) => otherTranslated[opt] == null).slice(0, 20);
    if (toTranslate.length === 0) return;
    (async () => {
      const results = await Promise.all(toTranslate.map((s) => translateToHindi(s)));
      if (cancelled) return;
      setOtherTranslated((prev) => {
        const next = { ...prev };
        toTranslate.forEach((k, idx) => {
          next[k] = results[idx] || k;
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryModalVisible, locale, filteredOtherOptions, otherTranslated]);

  useEffect(() => {
    if (!categoryModalVisible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (categoryModalPage === 'other') {
        setCategoryModalPage('grid');
        Animated.timing(categoryModalShift, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }).start();
        return true;
      }
      // On grid page: close modal
      setCategoryModalVisible(false);
      categoryModalShift.setValue(0);
      setOtherQuery('');
      setMultiSelectMode(false);
      setCategoryModalPage('grid');
      return true;
    });
    return () => sub.remove();
  }, [categoryModalVisible, categoryModalPage, categoryModalShift]);

  const openOfferModal = (job) => {
    if (workCooldownRemainMs > 0) {
      Alert.alert(t('jobs.cannotMakeOffer'), t('jobs.workCooldownBlocked'));
      return;
    }
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
        setOfferErrorMessage(
          messageForFreelancerPickupBlocked(t, response) || response.error || 'Failed to submit offer'
        );
        setOfferErrorModalVisible(true);
      }
    } catch (err) {
      console.error('Error submitting offer:', err);
      setSubmittingOffer(false);
      const data = err.response?.data;
      setOfferErrorMessage(
        messageForFreelancerPickupBlocked(t, data) || data?.error || err.message || 'Failed to submit offer'
      );
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

  /** Google Maps: origin = job (client), destination = freelancer; travelmode bicycling. */
  const openDirectionsFromJob = useCallback(
    async (job) => {
      let dest = await getCurrentCoords();
      if (!dest) {
        const servicesOk = await requestPermission();
        if (servicesOk) {
          dest = await getCurrentCoords();
        }
      }
      if (!dest) {
        Alert.alert(t('jobs.gpsOff'), t('jobs.navigateNeedLocation'));
        return;
      }
      const addrParts = [job.address, job.pincode].filter(Boolean);
      const originQuery = addrParts.length ? `${addrParts.join(', ')}, India` : '';
      const url = buildGoogleMapsBikeDirectionsUrl({
        originLat: job.jobLat,
        originLng: job.jobLng,
        originQuery: originQuery || null,
        destLat: dest.lat,
        destLng: dest.lng,
      });
      if (!url) {
        Alert.alert(t('jobs.navigateNoOriginTitle'), t('jobs.navigateNoOriginMessage'));
        return;
      }
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert(t('common.error'), t('jobs.navigateOpenFailed'));
      }
    },
    [getCurrentCoords, requestPermission, t]
  );

  const renderJobItem = ({ item }) => {
    const cooldownMinutes = getOfferCooldownMinutes(item);
    // Check if job is already picked up (by any freelancer)
    const isPickedUp = item.assignedFreelancer || item.status !== 'open';
    // Can only pickup if: canWork is true, job is not picked up, and freelancer doesn't have active job
    const workCooldownActive = workCooldownRemainMs > 0;
    const canPickup = canWork && !isPickedUp && !effectiveHasActiveJob && !workCooldownActive;

    const jobId = item._id || item.id;
    const tr = locale === 'hi' && translatedJobs[jobId];
    const title = tr ? tr.title : item.title;
    const delivery = isDeliveryJob(item);
    const description = tr ? tr.description : (item.description || '');
    const myApp = item.myApplication;
    const appStatus = myApp?.status;
    const isWaitingApp = !delivery && appStatus === 'pending';
    // Same rules as backend myApplication: only null or rejected allows a new apply/offer on non-delivery jobs
    const applicationAllowsNewApply =
      myApp == null || appStatus === 'rejected';
    const canApply =
      canWork &&
      !isPickedUp &&
      !effectiveHasActiveJob &&
      !workCooldownActive &&
      !isWaitingApp &&
      applicationAllowsNewApply;
    // Offers are independent of apply flow; backend only enforces offer cooldown. Block only when application was accepted (parallel path closed).
    const canMakeOffer =
      canWork &&
      cooldownMinutes === 0 &&
      !isPickedUp &&
      !effectiveHasActiveJob &&
      !workCooldownActive &&
      (delivery || appStatus !== 'accepted');
    const applyingThis = applyingJobId === jobId;

    return (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>
        <View style={styles.jobHeaderRightCol}>
          <View style={styles.budgetRow}>
            <Text style={styles.jobBudget}>₹{item.budget}</Text>
          </View>
        </View>
      </View>
      {!delivery && description ? (
        <View style={styles.descriptionBlock}>
          <Text style={styles.jobDescription} numberOfLines={expandedDescriptionIds[jobId] ? undefined : 2}>
            {description}
          </Text>
          {description.length > 60 ? (
            <TouchableOpacity
              onPress={() => setExpandedDescriptionIds((prev) => ({ ...prev, [jobId]: !prev[jobId] }))}
              style={[
                styles.viewMoreButton,
                expandedDescriptionIds[jobId] ? styles.viewMoreButtonBlock : styles.viewMoreButtonInline,
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.viewMoreText}>
                {expandedDescriptionIds[jobId] ? t('jobs.viewLess') : t('jobs.viewMore')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      <JobLocationBlock
        job={item}
        translated={tr}
        t={t}
        compact
        hideLeadingIcon={!delivery}
      />
      <View style={styles.jobMetaRow}>
        <View style={styles.jobMetaLeftRow}>
          <JobMetaGenderOrDeliveryPins
            job={item}
            translated={tr}
            t={t}
              style={styles.jobMetaPinsInline}
          />
          {item?.category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText} numberOfLines={1}>
                {categoryLabel(item.category)}
              </Text>
            </View>
          ) : null}
        </View>
        {!delivery || item.distanceKm != null ? (
          <View style={styles.jobMetaDistance}>
            {!delivery ? (
              <Pressable
                onPress={() => openDirectionsFromJob(item)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.jobDirectionsIconButton,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('jobs.openDirectionsA11y')}
              >
                <MaterialIcons name="location-on" size={16} color={colors.primary.main} />
              </Pressable>
            ) : null}
            {item.distanceKm != null ? (
              <Text style={styles.jobMetaText}>
                {item.distanceKm} {t('jobs.kmAway')}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        {delivery ? (
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
            color={canPickup && !isPickedUp ? '#FFFFFF' : colors.text.muted}
          />
          <Text
            style={[
              styles.actionButtonText,
              styles.pickupButtonText,
              { color: canPickup ? '#FFFFFF' : colors.text.muted },
            ]}
          >
            {effectiveHasActiveJob
              ? t('jobs.alreadyTaken')
              : !canWork
              ? t('jobs.payDues')
              : workCooldownActive
              ? t('jobs.workCooldownShort')
              : isPickedUp
              ? t('jobs.alreadyTaken')
              : t('jobs.pickupJob')}
          </Text>
        </TouchableOpacity>
        ) : (
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.applyButton,
            applyingThis && styles.applyButtonBusy,
            (!canApply || isPickedUp) && !applyingThis && styles.actionButtonDisabled,
          ]}
          onPress={() => handleApplyJob(item)}
          disabled={!canApply || isPickedUp || applyingThis}
        >
          {applyingThis ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons
                name="assignment"
                size={18}
                color={canApply && !isPickedUp ? '#FFFFFF' : colors.text.muted}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  styles.applyButtonText,
                  { color: canApply && !isPickedUp ? '#FFFFFF' : colors.text.muted },
                ]}
              >
                {effectiveHasActiveJob
                  ? t('jobs.alreadyTaken')
                  : !canWork
                  ? t('jobs.payDues')
                  : workCooldownActive
                  ? t('jobs.workCooldownShort')
                  : isPickedUp
                  ? t('jobs.alreadyTaken')
                  : isWaitingApp
                  ? t('jobs.waitingForClient')
                  : appStatus === 'accepted'
                  ? t('jobs.applicationAcceptedShort')
                  : t('jobs.apply')}
              </Text>
            </>
          )}
        </TouchableOpacity>
        )}

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
            color={canMakeOffer && !isPickedUp ? '#FFFFFF' : colors.text.muted}
          />
          <Text
            style={[
              styles.actionButtonText,
              styles.makeOfferButtonText,
              { color: canMakeOffer && !isPickedUp ? '#FFFFFF' : colors.text.muted },
            ]}
          >
            {effectiveHasActiveJob
              ? t('jobs.alreadyTaken')
              : !canWork
              ? t('jobs.payDues')
              : workCooldownActive
              ? t('jobs.workCooldownShort')
              : isPickedUp
              ? t('jobs.alreadyTaken')
              : !delivery && appStatus === 'accepted'
              ? t('jobs.applicationAcceptedShort')
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
          <MaterialIcons name="location-off" size={48} color={colors.text.primary} />
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
          icon={<MaterialIcons name="work" size={64} color={colors.text.primary} />}
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

      {applySuccessBannerVisible ? (
        <View style={styles.applySuccessBanner} accessibilityLiveRegion="polite">
          <Text style={styles.applySuccessBannerText}>{t('jobs.appliedSuccessfully')}</Text>
        </View>
      ) : null}

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <View style={styles.filterOptions}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedFilter === 'none' && categoryFilters.length === 0 && styles.filterOptionActive,
              ]}
              onPress={() => {
                setSelectedFilter('none');
                setCategoryFilters([]);
              }}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  selectedFilter === 'none' && categoryFilters.length === 0 && styles.filterOptionTextActive,
                ]}
                numberOfLines={1}
              >
                {t('jobs.filterAll')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterOption,
                categoryFilters.length > 0 && styles.filterOptionActive,
              ]}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  categoryFilters.length > 0 && styles.filterOptionTextActive,
                ]}
                numberOfLines={1}
              >
                {categoryFilters.length > 0
                  ? `${t('jobs.filterCategory')}: ${categoryFilters.length}`
                  : t('jobs.filterCategory')}
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
        ListEmptyComponent={
          jobs.length > 0 ? (
            <View style={styles.categoryEmptyWrap}>
              <Text style={styles.categoryEmptyText}>{t('jobs.noJobsForCategory')}</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
      />

      {/* Category picker (filter) */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          // Android hardware back triggers onRequestClose.
          // If we're on the Other/Subcategories page, go back to grid instead of closing.
          if (categoryModalPage === 'other') {
            setCategoryModalPage('grid');
            Animated.timing(categoryModalShift, {
              toValue: 0,
              duration: 260,
              useNativeDriver: true,
            }).start();
            return;
          }
          setCategoryModalVisible(false);
          categoryModalShift.setValue(0);
          setOtherQuery('');
          setMultiSelectMode(false);
          setCategoryModalPage('grid');
        }}
      >
        <View style={styles.categoryModalWrap}>
          <Pressable
            style={styles.categoryModalBackdrop}
            onPress={() => setCategoryModalVisible(false)}
            accessibilityLabel={t('common.cancel')}
          />
          <View style={[styles.categoryModalContent, { height: modalHeightPct, maxHeight: modalHeightPct }]}>
            <View style={styles.categoryModalHeader}>
              <Text style={styles.categoryModalTitle}>{t('jobs.chooseCategoryTitle')}</Text>
              <TouchableOpacity
                onPress={() => setCategoryModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
              >
                <MaterialIcons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.categoryModalBody}>
              <Animated.View
                style={[
                  styles.categoryModalShiftRow,
                  {
                    transform: [
                      {
                        translateX: categoryModalShift.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -(SCREEN_W - spacing.lg * 2)],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Page 0: main categories (multi-select) */}
                <View style={styles.categoryModalPage}>
                  <View style={styles.categoryModalGrid}>
                    {Array.from({ length: Math.ceil(JOB_CATEGORIES.length / 3) }, (_, rowIndex) => (
                      <View key={rowIndex} style={styles.categoryModalRowWrap}>
                        {JOB_CATEGORIES.slice(rowIndex * 3, rowIndex * 3 + 3).map((cat) => {
                          const active = categoryFilters.includes(cat);
                          return (
                            <TouchableOpacity
                              key={cat}
                              style={[styles.categoryModalCell, active && styles.categoryModalCellActive]}
                              onPress={() => {
                                if (cat === 'Other') {
                                  setCategoryModalPage('other');
                                  Animated.timing(categoryModalShift, {
                                    toValue: 1,
                                    duration: 260,
                                    useNativeDriver: true,
                                  }).start();
                                  return;
                                }
                                if (!multiSelectMode) {
                                  setCategoryFilters([cat]);
                                  setCategoryModalVisible(false);
                                  categoryModalShift.setValue(0);
                                  setOtherQuery('');
                                  setCategoryModalPage('grid');
                                  return;
                                }
                                setCategoryFilters((prev) =>
                                  prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat]
                                );
                              }}
                              onLongPress={() => {
                                if (cat === 'Other') return;
                                if (!multiSelectMode) setMultiSelectMode(true);
                                setCategoryFilters((prev) =>
                                  prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat]
                                );
                              }}
                              activeOpacity={0.7}
                            >
                              <MaterialIcons
                                name={categoryIconName(cat)}
                                size={22}
                                color={active ? '#FFFFFF' : colors.primary.main}
                                style={styles.categoryModalCellIcon}
                              />
                              <Text
                                style={[
                                  styles.categoryModalCellText,
                                  active && styles.categoryModalCellTextActive,
                                ]}
                                numberOfLines={2}
                              >
                                {categoryLabel(cat)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </View>

                {/* Page 1: Other/subcategories (multi-select) */}
                <View style={styles.categoryModalPage}>
                  <View style={styles.categoryModalPageInner}>
                    <TouchableOpacity
                      onPress={() => {
                        setCategoryModalPage('grid');
                        Animated.timing(categoryModalShift, {
                          toValue: 0,
                          duration: 260,
                          useNativeDriver: true,
                        }).start();
                      }}
                      style={{ paddingVertical: 6 }}
                    >
                      <Text style={{ color: colors.primary.main, fontWeight: '800' }}>
                        {t('common.back') || 'Back'}
                      </Text>
                    </TouchableOpacity>

                    <TextInput
                      value={otherQuery}
                      onChangeText={setOtherQuery}
                      placeholder={t('postJob.searchOther')}
                      placeholderTextColor={colors.text.muted}
                      style={styles.otherSearchInput}
                    />

                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingBottom: spacing.lg }}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                    >
                      {multiSelectMode && categoryFilters.length > 0 ? (
                        <View style={styles.selectedChipsWrap}>
                          {categoryFilters.map((cat) => (
                            <TouchableOpacity
                              key={cat}
                              onPress={() => unselectCategory(cat)}
                              activeOpacity={0.85}
                              style={styles.selectedChip}
                            >
                              <Text style={styles.selectedChipText} numberOfLines={1}>
                                {labelForSelectedChip(cat)}
                              </Text>
                              <MaterialIcons name="close" size={16} color={colors.text.secondary} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}

                      {filteredOtherOptions.map((opt) => {
                        const active = categoryFilters.includes(opt) || (opt === 'Others' && categoryFilters.includes('Other'));
                        const displayText = locale === 'hi' ? otherTranslated[opt] || opt : opt;
                        return (
                          <TouchableOpacity
                            key={opt}
                            activeOpacity={0.75}
                            style={[styles.otherWorkItem, active && styles.otherWorkItemActive]}
                            onPress={() => {
                              // "Others" means generic Other category.
                              const value = opt === 'Others' ? 'Other' : opt;
                              if (!multiSelectMode) {
                                setCategoryFilters([value]);
                                setCategoryModalVisible(false);
                                categoryModalShift.setValue(0);
                                setOtherQuery('');
                                setCategoryModalPage('grid');
                                return;
                              }
                              setCategoryFilters((prev) =>
                                prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
                              );
                            }}
                            onLongPress={() => {
                              const value = opt === 'Others' ? 'Other' : opt;
                              if (!multiSelectMode) setMultiSelectMode(true);
                              setCategoryFilters((prev) =>
                                prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
                              );
                            }}
                          >
                            <Text style={styles.otherWorkItemText}>{displayText}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              </Animated.View>
            </View>

            <Text style={styles.categoryModalHintText}>
              Hold and tap to select multiple categories
            </Text>
          </View>
        </View>
      </Modal>

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
          <View style={[styles.modalContent, styles.offerSubmittedModalContent]}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={64} color={colors.success.main} />
            </View>
            <Text style={styles.modalTitle}>{t('jobs.offerSubmitted')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('jobs.offerSubmittedMsg')}
            </Text>
            <View style={[styles.modalActions, styles.modalActionsCentered, styles.offerSubmittedModalActions]}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalSubmitButton,
                  styles.successModalButton,
                  styles.offerSubmittedOkButton,
                ]}
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

export default AvailableJobs;


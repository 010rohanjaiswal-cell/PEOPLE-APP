/**
 * Post Job Screen - People App
 * Form to create a new job posting
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Image,
  BackHandler,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { Input, Card, CardContent } from '../../components/common';
import AddressPickerModal from '../../components/modals/AddressPickerModal';
import { validateRequired, validatePincode } from '../../utils/validation';
import {
  sanitizeJobTextInput,
  MAX_JOB_TITLE_LEN,
  MAX_JOB_DESCRIPTION_LEN,
  isValidJobTitle,
  isValidJobDescription,
  hasUnsupportedJobChars,
} from '../../utils/jobTextPolicy';
import { isJobTextBlockedByWords } from '../../utils/jobBlockedWords';
import { clientJobsAPI } from '../../api/clientJobs';
import { useLocation } from '../../context/LocationContext';
import { useLanguage } from '../../context/LanguageContext';
import { JOB_CATEGORIES, JOB_CATEGORY_I18N_KEYS } from '../../constants/jobCategories';
import { translateToHindi } from '../../utils/translate';

const { height: SCREEN_H, width: SCREEN_W } = require('react-native').Dimensions.get('window');
const PAGE_W = SCREEN_W;

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

const OTHER_WORK_OPTIONS_RAW = [
  // Keep first: "Others" should appear at the top in UI.
  'Others',

  // Existing options
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
  'Elevator (lift) technician',
  'Lift (elevator) technician',
  'Fire safety equipment installer',
  'Waterproofing specialist',
  'Roofing worker',
  'Drone operator',
  'Photographer / videographer',
  'Video editor (skill > degree)',
  'Social media content creator',
  'Freelance graphic designer',

  // Newly added options (deduped by normalizeOtherOption)
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

const CATEGORY_ICON_BY_LABEL = {
  Delivery: require('../../../assets/category-icons/delivery-29f0ecd4-7672-42da-8428-99aba3ef41a2.png'),
  Cooking: require('../../../assets/category-icons/cooking-d8e79234-d8ce-4963-a869-5a43c511e727.png'),
  Cleaning: require('../../../assets/category-icons/cleaning-4d1be5f5-6486-4639-bba4-7a9a6c62b3a1.png'),
  Plumbing: require('../../../assets/category-icons/plumbing-6dc8737a-6a3c-4319-9a88-d6cf7908aa89.png'),
  Electrical: require('../../../assets/category-icons/electrician-671976ab-ebc9-4f7f-b367-c41667c7ac3d.png'),
  Mechanic: require('../../../assets/category-icons/technician-c032818a-f250-4c06-a58c-3ce1ed68e653.png'),
  Driver: require('../../../assets/category-icons/driver-54f8dfaa-d227-49e9-ba55-c1c5d51bfc30.png'),
  'Care taker': require('../../../assets/category-icons/social-services-84ecf7be-9105-4a51-9abf-830f9262ed3b.png'),
  Tailor: require('../../../assets/category-icons/sewing-9fcc1742-c8b3-413d-88b4-08d6e7fca9c9.png'),
  Salon: require('../../../assets/category-icons/salon-89fc9921-c2e6-47ca-a608-42f77d04b88f.png'),
  // Back-compat: older jobs stored "Barber" in DB
  Barber: require('../../../assets/category-icons/salon-89fc9921-c2e6-47ca-a608-42f77d04b88f.png'),
  Laundry: require('../../../assets/category-icons/washing-212b8f18-6896-4f4f-8ea8-b9df9e9678b4.png'),
  Other: require('../../../assets/category-icons/other.png'),
};

function labelForCategory(t, cat) {
  const s = String(cat || '').trim();
  if (!s) return '';
  const keySuffix = JOB_CATEGORY_I18N_KEYS?.[s];
  if (keySuffix) return t('postJob.category' + keySuffix);
  return s;
}

function iconForCategory(cat) {
  const s = String(cat || '').trim();
  if (CATEGORY_ICON_BY_LABEL[s]) return CATEGORY_ICON_BY_LABEL[s];
  // If user picked a custom "Other" work, show the Other icon.
  if (OTHER_WORK_OPTIONS.includes(s)) return CATEGORY_ICON_BY_LABEL.Other;
  return null;
}

/**
 * Scroll so the focused field stays just below the top padding of the scroll area
 * (avoids scrollToEnd / fixed Y which jump to the bottom or wrong position).
 */
function createScrollFieldIntoView(scrollViewRef) {
  return (fieldWrapperRef) => {
    const scroll = scrollViewRef.current;
    const field = fieldWrapperRef?.current;
    if (!scroll || !field || typeof field.measureLayout !== 'function') return;

    const pad = Platform.OS === 'ios' ? 18 : 22;
    const delay = Platform.OS === 'ios' ? 110 : 160;

    const run = () => {
      field.measureLayout(
        scroll,
        (_x, y) => {
          scroll.scrollTo({ y: Math.max(0, y - pad), animated: true });
        },
        () => {}
      );
    };
    requestAnimationFrame(() => setTimeout(run, delay));
  };
}

function createPostJobStyles(colors, isDark) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    flex: 1,
    width: PAGE_W,
  },
  pageInner: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.sm,
    paddingBottom: spacing.xxl || 120,
  },
  card: {
    width: '100%',
  },
  categoryPickerContent: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  stageTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  stageSubTitle: {
    ...typography.body,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.secondary,
    lineHeight: 26,
    minHeight: 52,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  categoryTilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'flex-start',
  },
  categoryTileWrap: {
    width: '33.3333%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  categoryTile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryTilePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  categoryTileSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  categoryTileIcon: {},
  categoryTileIconImage: {
    width: 56,
    height: 56,
  },
  categoryTileLabel: {
    marginTop: spacing.sm,
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  otherHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  otherHeaderSideSpacer: {
    width: 76,
  },
  otherBackBtn: {
    minWidth: 76,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
  },
  otherBackText: {
    ...typography.small,
    color: isDark ? colors.text.primary : colors.primary.main,
    fontWeight: '800',
  },
  otherTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  otherSearchWrap: {
    marginBottom: spacing.md,
    width: '100%',
  },
  otherScroll: {
    flex: 1,
  },
  otherList: {
    gap: spacing.sm,
    width: '100%',
  },
  otherItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  otherItemText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: spacing.xs,
  },
  fieldWithErrorWrap: {
    position: 'relative',
    padding: 2,
    borderRadius: spacing.sm,
  },
  /** Wrapper for measureLayout + scrollTo (keyboard). No layout change. */
  measureFieldWrap: {},
  errorBorderBox: {
    ...StyleSheet.absoluteFillObject,
    // Disabled: user requested to remove red validation outline.
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: spacing.sm,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  inputField: {
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    marginBottom: spacing.xs,
  },
  descriptionWrapper: {
    marginBottom: spacing.xl,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  categoryButtonActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  categoryText: {
    ...typography.body,
    color: isDark ? colors.text.primary : colors.text.secondary,
  },
  categoryTextActive: {
    color: isDark ? colors.text.primary : colors.primary.main,
    fontWeight: '600',
  },
  selectedCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectedCategoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  selectedCategoryIcon: {
    width: 22,
    height: 22,
  },
  selectedCategoryText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
    flexShrink: 1,
  },
  changeCategoryBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  changeCategoryText: {
    ...typography.small,
    color: isDark ? colors.text.primary : colors.primary.main,
    fontWeight: '700',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
  },
  genderButtonActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  genderText: {
    ...typography.body,
    color: isDark ? colors.text.primary : colors.text.secondary,
  },
  genderTextActive: {
    color: isDark ? colors.text.primary : colors.primary.main,
    fontWeight: '600',
  },
  submitButton: {
    width: '100%',
    minHeight: 52,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.primary.main,
    borderRadius: spacing.borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },
  buttonIcon: {
    marginRight: spacing.sm,
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
    maxWidth: 400,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitButton: {
    backgroundColor: colors.primary.main,
  },
  modalSubmitText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  successModalButton: {
    backgroundColor: colors.success.main,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  errorModalButton: {
    backgroundColor: colors.error.main,
  },
  toast: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 30,
    elevation: 30,
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  verifyModalContent: {
    width: '88%',
    maxWidth: 400,
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  verifyProgressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  verifyProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary.main,
  },
  verifyModalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  verifyStatusText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.xs,
  },
  verifyProgressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  verifyProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary.main,
  },
  verifySpinnerWrap: {
    marginTop: spacing.xs,
  },
  gpsMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning.light,
    padding: spacing.md,
    borderRadius: spacing.sm,
    marginBottom: spacing.md,
  },
  gpsMessageBoxText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  deliveryRouteContainer: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  deliveryLegCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.cardBackground,
  },
  deliveryLegCardFrom: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.main,
  },
  deliveryLegCardTo: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success.main,
  },
  deliveryLegTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
    gap: spacing.xs,
  },
  deliveryLegLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  deliveryLegDash: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  deliveryLegHint: {
    ...typography.small,
    color: colors.text.secondary,
    flex: 1,
    flexShrink: 1,
  },
  deliveryMicroHint: {
    ...typography.small,
    color: colors.text.muted,
    marginBottom: spacing.sm,
  },
  deliveryPinRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deliveryPinField: {
    flex: 1,
    maxWidth: 240,
  },
});
}

const PostJob = ({ onJobPosted }) => {
  const { t, locale } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createPostJobStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const { gpsEnabled, gpsDenied } = useLocation();
  const scrollViewRef = useRef(null);
  const scrollFieldIntoView = useMemo(() => createScrollFieldIntoView(scrollViewRef), []);
  const fromAddrWrapRef = useRef(null);
  const toAddrWrapRef = useRef(null);
  const budgetWrapRef = useRef(null);
  const ndAddressWrapRef = useRef(null);
  const descriptionWrapRef = useRef(null);
  const titleWrapRef = useRef(null);
  const categoryWrapRef = useRef(null);
  const genderWrapRef = useRef(null);
  const [keyboardPad, setKeyboardPad] = useState(0);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef(null);
  const [toastMsg, setToastMsg] = useState('');

  const [postJobStep, setPostJobStep] = useState('categories'); // 'categories' | 'other' | 'form'
  const shiftAnim = useRef(new Animated.Value(0)).current; // 0 = categories, 1 = other, 2 = form
  const stepTransitioningRef = useRef(false);
  const [otherQuery, setOtherQuery] = useState('');
  const [otherTranslated, setOtherTranslated] = useState({});

  /** Android: KAV offset. iOS: rely on ScrollView automaticallyAdjustKeyboardInsets + measure scroll. */
  const keyboardVerticalOffset =
    Platform.OS === 'android' ? Math.max(insets.top, 12) + 100 : 0;

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardPad(e.endCoordinates?.height ?? 0)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardPad(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const showToast = (msg) => {
    if (!msg) return;
    setToastMsg(String(msg));
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    toastTimerRef.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setToastMsg(''));
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const focusScrollToField = (ref) => scrollFieldIntoView(ref);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    address: '',
    pincode: '',
    jobLat: null,
    jobLng: null,
    deliveryFromAddress: '',
    deliveryFromPincode: '',
    deliveryToAddress: '',
    deliveryToPincode: '',
    budget: '',
    gender: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [notAppropriateModalVisible, setNotAppropriateModalVisible] = useState(false);
  const [verifyingModalVisible, setVerifyingModalVisible] = useState(false);
  const [moderationRejectedVisible, setModerationRejectedVisible] = useState(false);
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const [addressPickerTarget, setAddressPickerTarget] = useState(null); // 'address'|'deliveryFrom'|'deliveryTo'
  const verifyProgressAnim = useRef(new Animated.Value(0)).current;
  const verifyProgressDriverRef = useRef(null);
  const titleBorderOpacity = useRef(new Animated.Value(0)).current;
  const categoryBorderOpacity = useRef(new Animated.Value(0)).current;
  const addressBorderOpacity = useRef(new Animated.Value(0)).current;
  const budgetBorderOpacity = useRef(new Animated.Value(0)).current;
  const genderBorderOpacity = useRef(new Animated.Value(0)).current;
  const fromAddrBorderOpacity = useRef(new Animated.Value(0)).current;
  const toAddrBorderOpacity = useRef(new Animated.Value(0)).current;
  const borderOpacity = {
    title: titleBorderOpacity,
    category: categoryBorderOpacity,
    address: addressBorderOpacity,
    budget: budgetBorderOpacity,
    gender: genderBorderOpacity,
    fromAddr: fromAddrBorderOpacity,
    toAddr: toAddrBorderOpacity,
  };

  // Shake animations for invalid fields (left-right) — 1.5s total.
  const titleShakeX = useRef(new Animated.Value(0)).current;
  const categoryShakeX = useRef(new Animated.Value(0)).current;
  const addressShakeX = useRef(new Animated.Value(0)).current;
  const budgetShakeX = useRef(new Animated.Value(0)).current;
  const genderShakeX = useRef(new Animated.Value(0)).current;
  const fromAddrShakeX = useRef(new Animated.Value(0)).current;
  const toAddrShakeX = useRef(new Animated.Value(0)).current;
  const shakeX = {
    title: titleShakeX,
    category: categoryShakeX,
    address: addressShakeX,
    budget: budgetShakeX,
    gender: genderShakeX,
    fromAddr: fromAddrShakeX,
    toAddr: toAddrShakeX,
  };

  const genders = ['Male', 'Female', 'Any'];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  useEffect(() => {
    if (postJobStep !== 'other') return;
    if (locale !== 'hi') return;
    let cancelled = false;

    const toTranslate = filteredOtherOptions.filter((opt) => otherTranslated[opt] == null);
    if (toTranslate.length === 0) return;

    (async () => {
      // Translate a limited batch to avoid spamming the API if user scrolls a lot.
      const batch = toTranslate.slice(0, 20);
      const results = await Promise.all(batch.map((s) => translateToHindi(s)));
      if (cancelled) return;
      setOtherTranslated((prev) => {
        const next = { ...prev };
        batch.forEach((k, idx) => {
          next[k] = results[idx] || k;
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [postJobStep, locale, filteredOtherOptions, otherTranslated]);

  const stepIndex = (step) => (step === 'categories' ? 0 : step === 'other' ? 1 : 2);

  const animateToStep = (nextStep) => {
    if (stepTransitioningRef.current) return;
    if (nextStep === postJobStep) return;
    stepTransitioningRef.current = true;

    // Update step immediately so the correct page is visible during the animation.
    // (Otherwise pages that are conditionally hidden via postJobStep can appear with a delay.)
    setPostJobStep(nextStep);

    const target = stepIndex(nextStep);
    Animated.timing(shiftAnim, {
      toValue: target,
      duration: 320,
      easing: Easing.bezier(0.22, 1, 0.36, 1), // smooth "push" shift
      useNativeDriver: true,
    }).start(() => {
      stepTransitioningRef.current = false;
      if (nextStep === 'form') {
        scrollViewRef.current?.scrollTo?.({ y: 0, animated: false });
      }
    });
  };

  const selectCategoryAndOpenForm = (cat) => {
    handleChange('category', cat);
    animateToStep('form');
  };

  const selectMainCategory = (cat) => {
    if (String(cat) === 'Other') {
      handleChange('category', 'Other');
      setOtherQuery('');
      animateToStep('other');
      return;
    }
    selectCategoryAndOpenForm(cat);
  };

  const selectOtherWorkAndOpenForm = (work) => {
    // "Others" means user didn't find a match; keep stored category as "Other"
    handleChange('category', work === 'Others' ? 'Other' : work);
    animateToStep('form');
  };

  useEffect(() => {
    // Android hardware back: move within PostJob flow instead of exiting screen
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (postJobStep === 'form') {
        const cat = String(formData.category || '').trim();
        const shouldGoOther = OTHER_WORK_OPTIONS.includes(cat) || cat === 'Other';
        animateToStep(shouldGoOther ? 'other' : 'categories');
        return true;
      }
      if (postJobStep === 'other') {
        animateToStep('categories');
        return true;
      }
      return false; // allow default behavior (exit/back)
    });
    return () => sub.remove();
  }, [postJobStep, formData.category]);

  const openAddressPicker = (target) => {
    setAddressPickerTarget(target);
    setAddressPickerVisible(true);
  };

  const applyPickedAddress = ({ address, pincode, lat, lng }, target) => {
    if (target === 'deliveryFrom') {
      setFormData((prev) => ({
        ...prev,
        deliveryFromAddress: String(address || ''),
        deliveryFromPincode: String(pincode || ''),
      }));
      return;
    }
    if (target === 'deliveryTo') {
      setFormData((prev) => ({
        ...prev,
        deliveryToAddress: String(address || ''),
        deliveryToPincode: String(pincode || ''),
        jobLat: lat ?? prev.jobLat,
        jobLng: lng ?? prev.jobLng,
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      address: String(address || ''),
      pincode: String(pincode || ''),
      jobLat: lat ?? prev.jobLat,
      jobLng: lng ?? prev.jobLng,
    }));
  };

  const handleTitleChange = (value) => {
    const cleaned = sanitizeJobTextInput(value).slice(0, MAX_JOB_TITLE_LEN);
    setFormData((prev) => ({ ...prev, title: cleaned }));
  };

  const handleDescriptionChange = (value) => {
    const cleaned = sanitizeJobTextInput(value).slice(0, MAX_JOB_DESCRIPTION_LEN);
    setFormData((prev) => ({ ...prev, description: cleaned }));
  };

  const runErrorBorderAnimation = (animValue) => {
    animValue.setValue(1);
    Animated.sequence([
      Animated.delay(100),
      Animated.timing(animValue, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const runShakeAnimation = (animValue) => {
    try {
      animValue.stopAnimation();
    } catch (_) {}
    animValue.setValue(0);
    const amp = 8;
    // 3 shakes in ~500ms: L-R-L-R-L then settle.
    const keyframes = [-amp, amp, -amp, amp, -amp, 0];
    const stepMs = Math.round(500 / keyframes.length);
    Animated.sequence(
      keyframes.map((toValue) =>
        Animated.timing(animValue, {
          toValue,
          duration: stepMs,
          useNativeDriver: true,
        })
      )
    ).start();
  };

  const scrollToAndShake = (fieldKey, ref) => {
    // 1) Scroll into view (if ref provided)
    if (ref?.current) {
      focusScrollToField(ref);
    }
    // 2) Shake after the scroll timing completes (matches createScrollFieldIntoView delay)
    const delay = Platform.OS === 'ios' ? 260 : 320;
    setTimeout(() => runShakeAnimation(shakeX[fieldKey]), delay);
  };

  const isDelivery = String(formData.category || '').trim().toLowerCase() === 'delivery';

  const handleSubmit = async () => {
    if (gpsDenied || !gpsEnabled) {
      scrollToAndShake('title', titleWrapRef);
      return;
    }
    if (!validateRequired(formData.title)) {
      scrollToAndShake('title', titleWrapRef);
      return;
    }
    if (!isValidJobTitle(formData.title)) {
      scrollToAndShake('title', titleWrapRef);
      Alert.alert(t('common.error'), t('postJob.titleInvalidAlphanumeric'));
      return;
    }
    if (hasUnsupportedJobChars(formData.title)) {
      scrollToAndShake('title', titleWrapRef);
      Alert.alert(t('common.error'), t('postJob.onlyEnglishHindi'));
      return;
    }
    if (!isDelivery && !isValidJobDescription(formData.description)) {
      Alert.alert(t('common.error'), t('postJob.descriptionInvalidAlphanumeric'));
      return;
    }
    if (!isDelivery && hasUnsupportedJobChars(formData.description)) {
      Alert.alert(t('common.error'), t('postJob.onlyEnglishHindi'));
      return;
    }
    if (!formData.category) {
      scrollToAndShake('category', categoryWrapRef);
      return;
    }

    if (isDelivery) {
      if (!validateRequired(formData.deliveryFromAddress)) {
        scrollToAndShake('fromAddr', fromAddrWrapRef);
        return;
      }
      if (!validatePincode(formData.deliveryFromPincode)) {
        scrollToAndShake('fromAddr', fromAddrWrapRef);
        return;
      }
      if (!validateRequired(formData.deliveryToAddress)) {
        scrollToAndShake('toAddr', toAddrWrapRef);
        return;
      }
      if (!validatePincode(formData.deliveryToPincode)) {
        scrollToAndShake('toAddr', toAddrWrapRef);
        return;
      }
    } else {
      if (!validateRequired(formData.address)) {
        scrollToAndShake('address', ndAddressWrapRef);
        return;
      }
      if (!validatePincode(formData.pincode)) {
        scrollToAndShake('address', ndAddressWrapRef);
        return;
      }
      if (!formData.gender) {
        scrollToAndShake('gender', genderWrapRef);
        return;
      }
    }

    const budgetNum = parseFloat(String(formData.budget || '').replace(/,/g, ''));
    if (!Number.isFinite(budgetNum) || budgetNum < 10) {
      scrollToAndShake('budget', budgetWrapRef);
      showToast(t('jobs.budgetMin10'));
      return;
    }

    const blocked = isJobTextBlockedByWords(formData.title, formData.description);
    if (blocked.blocked) {
      scrollToAndShake('title', titleWrapRef);
      setNotAppropriateModalVisible(true);
      return;
    }

    try {
      setVerifyingModalVisible(true);
      // Truthful loader: NO LOOP. Progress moves forward and only completes on success.
      try {
        verifyProgressDriverRef.current?.stop?.();
      } catch (_) {}
      verifyProgressAnim.stopAnimation();
      verifyProgressAnim.setValue(0);
      verifyProgressDriverRef.current = Animated.timing(verifyProgressAnim, {
        toValue: 0.9,
        duration: 12000,
        useNativeDriver: false,
      });
      verifyProgressDriverRef.current.start();
      setLoading(true);

      const categoryTrimmed = String(formData.category || '').trim();
      const base = {
        title: String(formData.title || '').trim(),
        category: categoryTrimmed,
        budget: budgetNum,
      };
      const jobData = isDelivery
        ? {
            ...base,
            category: categoryTrimmed || 'Delivery',
            deliveryFromAddress: formData.deliveryFromAddress.trim(),
            deliveryFromPincode: formData.deliveryFromPincode.trim(),
            deliveryToAddress: formData.deliveryToAddress.trim(),
            deliveryToPincode: formData.deliveryToPincode.trim(),
            jobLat: formData.jobLat,
            jobLng: formData.jobLng,
          }
        : {
            ...base,
            address: formData.address,
            pincode: formData.pincode,
            jobLat: formData.jobLat,
            jobLng: formData.jobLng,
            gender: formData.gender.toLowerCase(),
            description: formData.description || null,
          };

      const result = await clientJobsAPI.postJob(jobData);

      if (result.success) {
        try {
          verifyProgressDriverRef.current?.stop?.();
        } catch (_) {}
        await new Promise((r) => {
          Animated.timing(verifyProgressAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: false,
          }).start(() => r());
        });
        // Keep UX: clear form and switch to My Jobs, then toast.
        setFormData({
          title: '',
          category: '',
          address: '',
          pincode: '',
          jobLat: null,
          jobLng: null,
          deliveryFromAddress: '',
          deliveryFromPincode: '',
          deliveryToAddress: '',
          deliveryToPincode: '',
          budget: '',
          gender: '',
          description: '',
        });
        // After successful post, return to category picker for the next job.
        setPostJobStep('categories');
        shiftAnim.setValue(0);
        if (typeof onJobPosted === 'function') {
          onJobPosted();
        }
        showToast(t('postJob.jobPostedSuccessfully'));
      } else {
        throw new Error(result.error || t('postJob.failedToPostJob'));
      }
    } catch (err) {
      console.error('Error posting job:', err);
      const code = err.response?.data?.code;
      const serverErr = err.response?.data?.error;
      if (code === 'JOB_BLOCKED_WORD') {
        setNotAppropriateModalVisible(true);
      } else if (code === 'JOB_MODERATION_REJECTED' || code === 'JOB_SAFETY_REJECTED') {
        setModerationRejectedVisible(true);
      } else {
        Alert.alert(t('common.error'), serverErr || err.message || t('postJob.failedToPostJobTryAgain'));
      }
    } finally {
      setVerifyingModalVisible(false);
      try {
        verifyProgressDriverRef.current?.stop?.();
      } catch (_) {}
      verifyProgressAnim.stopAnimation();
      setLoading(false);
    }
  };

  const contentPaddingBottom = (spacing.xxl || 120) + keyboardPad + (Platform.OS === 'android' ? insets.bottom : 0);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'android' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {toastMsg ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { top: insets?.top || 0 },
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      ) : null}
      <View style={{ flex: 1 }}>
        {/* GPS banner is shown globally (ClientDashboard). Keep this screen uncluttered. */}
        <Animated.View
          style={{
            flex: 1,
            flexDirection: 'row',
            width: PAGE_W * 3,
            transform: [
              {
                translateX: shiftAnim.interpolate({
                  inputRange: [0, 2],
                  outputRange: [0, -PAGE_W * 2],
                }),
              },
            ],
          }}
        >
          {/* Page 0: Categories */}
          <View style={styles.page}>
            <View
              style={[
                styles.pageInner,
                styles.categoryPickerContent,
                { paddingBottom: spacing.md + (insets?.bottom || 0) },
              ]}
            >
              <Text style={styles.stageSubTitle}>{t('postJob.selectCategoryToContinue')}</Text>

              <View style={styles.categoryTilesGrid}>
                {JOB_CATEGORIES.map((cat) => {
                  const iconSrc = iconForCategory(cat);
                  const active = formData.category === cat;
                  return (
                    <View key={cat} style={styles.categoryTileWrap}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[styles.categoryTile, active && styles.categoryTileSelected]}
                        onPress={() => selectMainCategory(cat)}
                      >
                        {iconSrc ? (
                          <Image source={iconSrc} style={styles.categoryTileIconImage} resizeMode="contain" />
                        ) : (
                          <MaterialIcons
                            name="category"
                            size={52}
                            color={colors.primary.main}
                            style={styles.categoryTileIcon}
                          />
                        )}
                        <Text style={styles.categoryTileLabel} numberOfLines={2}>
                          {labelForCategory(t, cat)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Page 1: Other picker */}
          <View style={[styles.page, postJobStep !== 'other' && { opacity: 0 }]}>
            <View
              style={[
                styles.pageInner,
                styles.categoryPickerContent,
                { paddingBottom: spacing.md + (insets?.bottom || 0) },
              ]}
            >
              <View style={styles.otherHeaderRow}>
                <TouchableOpacity style={styles.otherBackBtn} onPress={() => animateToStep('categories')}>
                  <Text style={styles.otherBackText}>{t('common.back') || 'Back'}</Text>
                </TouchableOpacity>
                <Text style={styles.otherTitle} numberOfLines={1}>
                  {labelForCategory(t, 'Other')}
                </Text>
                <View style={styles.otherHeaderSideSpacer} />
              </View>

              <View style={styles.otherSearchWrap}>
                <Input
                  placeholder={t('postJob.searchOther')}
                  value={otherQuery}
                  onChangeText={setOtherQuery}
                  // Remove default Input bottom margin to keep size tight.
                  style={{ marginBottom: 0 }}
                  inputStyle={{ minHeight: 48, paddingVertical: 12 }}
                  inputContainerStyle={{
                    borderWidth: 0,
                    borderBottomWidth: 1.5,
                    borderBottomColor: colors.primary.main + '80',
                    borderRadius: 0,
                    backgroundColor: 'transparent',
                  }}
                />
              </View>

              <ScrollView
                style={styles.otherScroll}
                contentContainerStyle={styles.otherList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {filteredOtherOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.otherItem}
                    activeOpacity={0.75}
                    onPress={() => selectOtherWorkAndOpenForm(opt)}
                  >
                    <Text style={styles.otherItemText}>
                      {locale === 'hi' ? otherTranslated[opt] || opt : opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Page 2: Form */}
          <View style={styles.page}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              nestedScrollEnabled={true}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            >
              <Card style={styles.card}>
                <CardContent>
          {/* Job Title */}
          <View ref={titleWrapRef} collapsable={false} style={styles.measureFieldWrap}>
          <Animated.View style={[styles.fieldWithErrorWrap, { transform: [{ translateX: shakeX.title }] }]}>
            <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.title }]} pointerEvents="none" />
            <Input
              label={t('postJob.jobTitle')}
              placeholder={t('postJob.enterJobTitle')}
              value={formData.title}
              onChangeText={handleTitleChange}
              style={styles.inputField}
            />
          </Animated.View>
          </View>

          {/* Category */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('postJob.category')}</Text>
            <View ref={categoryWrapRef} collapsable={false} style={styles.measureFieldWrap}>
            <Animated.View style={[styles.fieldWithErrorWrap, { transform: [{ translateX: shakeX.category }] }]}>
              <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.category }]} pointerEvents="none" />
              <View style={styles.selectedCategoryRow}>
                <View style={styles.selectedCategoryLeft}>
                  {iconForCategory(formData.category) ? (
                    <Image
                      source={iconForCategory(formData.category)}
                      style={styles.selectedCategoryIcon}
                      resizeMode="contain"
                    />
                  ) : (
                    <MaterialIcons name="category" size={18} color={colors.text.secondary} />
                  )}
                  <Text style={styles.selectedCategoryText} numberOfLines={1}>
                    {labelForCategory(t, formData.category)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeCategoryBtn}
                  onPress={() => animateToStep(OTHER_WORK_OPTIONS.includes(String(formData.category || '').trim()) || String(formData.category) === 'Other' ? 'other' : 'categories')}
                  accessibilityRole="button"
                  accessibilityLabel={t('postJob.changeCategory')}
                >
                  <Text style={styles.changeCategoryText}>{t('postJob.change')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
            </View>
          </View>

          {isDelivery ? (
            <View style={styles.deliveryRouteContainer}>
              {/* From — address (pincode from Google selection) */}
              <View style={[styles.deliveryLegCard, styles.deliveryLegCardFrom]}>
                <View style={styles.deliveryLegTitleRow}>
                  <Text style={styles.deliveryLegLabel}>{t('jobs.fromShort')}</Text>
                  <Text style={styles.deliveryLegDash}>—</Text>
                  <Text style={styles.deliveryLegHint}>{t('postJob.deliveryFromHeading')}</Text>
                </View>
                <Text style={styles.deliveryMicroHint}>
                  {t('postJob.deliveryAddressHint')}
                </Text>
                <View
                  ref={fromAddrWrapRef}
                  collapsable={false}
                  style={styles.measureFieldWrap}
                >
                  <Animated.View style={[styles.fieldWithErrorWrap, { transform: [{ translateX: shakeX.fromAddr }] }]}>
                    <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.fromAddr }]} pointerEvents="none" />
                    <Input
                      label={t('postJob.address')}
                      placeholder={t('postJob.enterFromAddress')}
                      value={formData.deliveryFromAddress}
                      editable={false}
                      onPressIn={() => openAddressPicker('deliveryFrom')}
                      multiline
                      numberOfLines={2}
                      style={styles.inputField}
                      onFocus={() => focusScrollToField(fromAddrWrapRef)}
                    />
                  </Animated.View>
                </View>
              </View>

              {/* To — address (pincode from Google selection) */}
              <View style={[styles.deliveryLegCard, styles.deliveryLegCardTo]}>
                <View style={styles.deliveryLegTitleRow}>
                  <Text style={styles.deliveryLegLabel}>{t('jobs.toShort')}</Text>
                  <Text style={styles.deliveryLegDash}>—</Text>
                  <Text style={styles.deliveryLegHint}>{t('postJob.deliveryToHeading')}</Text>
                </View>
                <Text style={styles.deliveryMicroHint}>
                  {t('postJob.deliveryAddressHint')}
                </Text>
                <View
                  ref={toAddrWrapRef}
                  collapsable={false}
                  style={styles.measureFieldWrap}
                >
                  <Animated.View style={[styles.fieldWithErrorWrap, { transform: [{ translateX: shakeX.toAddr }] }]}>
                    <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.toAddr }]} pointerEvents="none" />
                    <Input
                      label={t('postJob.address')}
                      placeholder={t('postJob.enterToAddress')}
                      value={formData.deliveryToAddress}
                      editable={false}
                      onPressIn={() => openAddressPicker('deliveryTo')}
                      multiline
                      numberOfLines={2}
                      style={styles.inputField}
                      onFocus={() => focusScrollToField(toAddrWrapRef)}
                    />
                  </Animated.View>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View
                ref={ndAddressWrapRef}
                collapsable={false}
                style={styles.measureFieldWrap}
              >
                <Animated.View style={[styles.fieldWithErrorWrap, { transform: [{ translateX: shakeX.address }] }]}>
                  <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.address }]} pointerEvents="none" />
                  <Input
                    label={t('postJob.address')}
                    placeholder={t('postJob.enterAddress')}
                    value={formData.address}
                    editable={false}
                    onPressIn={() => openAddressPicker('address')}
                    style={styles.inputField}
                    onFocus={() => focusScrollToField(ndAddressWrapRef)}
                  />
                </Animated.View>
              </View>
            </>
          )}

          {/* Budget */}
          <Animated.View
            ref={budgetWrapRef}
            collapsable={false}
            style={[
              styles.inputWrapper,
              styles.fieldWithErrorWrap,
              styles.measureFieldWrap,
              { transform: [{ translateX: shakeX.budget }] },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.budget }]} pointerEvents="none" />
            <Input
              label={t('postJob.budget')}
              placeholder={t('postJob.budgetPlaceholder')}
              value={formData.budget}
              onChangeText={(value) => handleChange('budget', value.replace(/\D/g, ''))}
              keyboardType="number-pad"
              style={styles.inputField}
              onFocus={() => focusScrollToField(budgetWrapRef)}
            />
          </Animated.View>

          {!isDelivery ? (
            <>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('postJob.genderPreference')}</Text>
                <View ref={genderWrapRef} collapsable={false} style={styles.measureFieldWrap}>
                <Animated.View style={[styles.fieldWithErrorWrap, { transform: [{ translateX: shakeX.gender }] }]}>
                  <Animated.View style={[styles.errorBorderBox, { opacity: borderOpacity.gender }]} pointerEvents="none" />
                  <View style={styles.genderContainer}>
                    {genders.map((gen) => (
                      <TouchableOpacity
                        key={gen}
                        style={[styles.genderButton, formData.gender === gen && styles.genderButtonActive]}
                        onPress={() => handleChange('gender', gen)}
                      >
                        <Text style={[styles.genderText, formData.gender === gen && styles.genderTextActive]}>
                          {t('gender.' + (gen === 'Any' ? 'any' : gen.toLowerCase()))}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>
                </View>
              </View>

              <View
                ref={descriptionWrapRef}
                collapsable={false}
                style={[styles.descriptionWrapper, styles.measureFieldWrap]}
                onStartShouldSetResponder={() => true}
              >
                <Input
                  label={t('postJob.jobDescriptionOptional')}
                  placeholder={t('postJob.jobDescriptionPlaceholder')}
                  value={formData.description}
                  onChangeText={handleDescriptionChange}
                  multiline
                  numberOfLines={2}
                  style={styles.inputField}
                  onFocus={() => focusScrollToField(descriptionWrapRef)}
                />
              </View>
            </>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || gpsDenied}
            style={[
              styles.submitButton,
              (gpsDenied || loading) && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <View style={styles.buttonContent}>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>{t('postJob.postJobButton')}</Text>
              </View>
            )}
          </TouchableOpacity>
                </CardContent>
              </Card>
            </ScrollView>
          </View>
        </Animated.View>

      <Modal
        visible={notAppropriateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotAppropriateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="error" size={64} color={colors.error.main} />
            </View>
            <Text style={styles.modalTitle}>{t('common.error')}</Text>
            <Text style={styles.modalSubtitle}>{t('postJob.jobNotAppropriate')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.errorModalButton]}
                onPress={() => setNotAppropriateModalVisible(false)}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={verifyingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.verifyModalContent}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={[styles.verifyModalTitle, { marginTop: spacing.md }]}>{t('postJob.verifyModalTitle')}</Text>
            <Text style={styles.verifyStatusText}>{t('postJob.verifyReviewingPost')}</Text>
            <View style={styles.verifyProgressTrack}>
              <Animated.View
                style={[
                  styles.verifyProgressFill,
                  {
                    width: verifyProgressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={moderationRejectedVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModerationRejectedVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="error" size={64} color={colors.error.main} />
            </View>
            <Text style={styles.modalTitle}>{t('common.error')}</Text>
            <Text style={styles.modalSubtitle}>{t('postJob.jobModerationRejected')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, styles.errorModalButton]}
                onPress={() => setModerationRejectedVisible(false)}
              >
                <Text style={styles.modalSubmitText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AddressPickerModal
        visible={addressPickerVisible}
        onClose={() => setAddressPickerVisible(false)}
        initialValue={{
          address:
            addressPickerTarget === 'deliveryFrom'
              ? formData.deliveryFromAddress
              : addressPickerTarget === 'deliveryTo'
                ? formData.deliveryToAddress
                : formData.address,
          pincode:
            addressPickerTarget === 'deliveryFrom'
              ? formData.deliveryFromPincode
              : addressPickerTarget === 'deliveryTo'
                ? formData.deliveryToPincode
                : formData.pincode,
          lat: formData.jobLat,
          lng: formData.jobLng,
        }}
        onSelect={(picked) => applyPickedAddress(picked, addressPickerTarget)}
      />
      </View>
    </KeyboardAvoidingView>
  );
};

export default PostJob;


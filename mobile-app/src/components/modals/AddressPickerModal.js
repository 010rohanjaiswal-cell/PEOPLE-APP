import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  extractPincodeFromAddressComponents,
  placeDetails,
  placesAutocomplete,
  reverseGeocode,
} from '../../services/googlePlaces';
import { defaultIndiaMapRegion, getApproximateLatLng, regionAround } from '../../services/approximateLocation';

function randomToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function createStyles(colors, isDark) {
  return StyleSheet.create({
    /** Full-screen container; sheet is a sibling of backdrop so touches on the sheet never dismiss. */
    root: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
      maxHeight: '92%',
      width: '100%',
      alignSelf: 'center',
      backgroundColor: colors.background,
      borderRadius: spacing.lg,
      overflow: 'hidden',
      zIndex: 1,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      ...typography.h3,
      color: colors.text.primary,
    },
    headerBtn: {
      padding: 8,
      borderRadius: 10,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabs: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
    },
    tabActive: {
      borderColor: colors.primary.main,
      backgroundColor: colors.primary.light,
    },
    tabText: {
      ...typography.body,
      color: isDark ? colors.text.primary : colors.text.secondary,
      fontWeight: '700',
    },
    tabTextActive: {
      color: isDark ? colors.text.primary : colors.primary.main,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
      borderRadius: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text.primary,
      fontSize: 16,
      paddingVertical: 4,
    },
    hint: {
      ...typography.small,
      color: colors.text.secondary,
      marginTop: spacing.sm,
    },
    suggestionRow: {
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    suggestionMain: {
      ...typography.body,
      color: colors.text.primary,
      fontWeight: '700',
    },
    suggestionSecondary: {
      ...typography.small,
      color: colors.text.secondary,
      marginTop: 2,
    },
    previewCard: {
      marginTop: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
      borderRadius: spacing.md,
      padding: spacing.md,
    },
    previewTitle: {
      ...typography.body,
      color: colors.text.primary,
      fontWeight: '800',
    },
    previewSub: {
      ...typography.small,
      color: colors.text.secondary,
      marginTop: 4,
    },
    ctaRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    cta: {
      flex: 1,
      minHeight: 48,
      borderRadius: spacing.borderRadius.button,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    ctaPrimary: {
      backgroundColor: colors.primary.main,
      borderColor: colors.primary.main,
    },
    ctaText: {
      ...typography.body,
      fontWeight: '800',
      color: colors.text.primary,
    },
    ctaTextPrimary: {
      color: '#FFFFFF',
    },
    mapWrap: {
      height: 360,
      borderRadius: spacing.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
      marginTop: spacing.sm,
    },
    map: { flex: 1 },
    mapHint: {
      ...typography.small,
      color: colors.text.secondary,
      marginTop: spacing.sm,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    loadingText: {
      ...typography.small,
      color: colors.text.secondary,
    },
  });
}

/**
 * Result shape returned via onSelect:
 * { address, pincode, lat, lng, placeId?, source: 'places'|'map'|'gps' }
 */
export default function AddressPickerModal({ visible, onClose, onSelect, initialValue }) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState('search'); // 'search' | 'map'
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  /** Blocks confirm / GPS / place details — never tied to search TextInput editable (avoids keyboard dismiss). */
  const [loading, setLoading] = useState(false);
  /** Autocomplete in-flight only */
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const sessionTokenRef = useRef(randomToken());
  const debounceRef = useRef(null);
  const coarseBiasRef = useRef(null); // { lat, lng } for Places bias + map seed
  /** True for this open if job already had lat/lng — skip auto “zoom to me” on Map pin tab. */
  const openedWithSavedCoordsRef = useRef(false);
  const mapRef = useRef(null);

  const [mapRegion, setMapRegion] = useState(() => defaultIndiaMapRegion());
  const [marker, setMarker] = useState(null); // { latitude, longitude }
  /** Native blue dot (react-native-maps) when OS location permission is granted. */
  const [canShowUserLocation, setCanShowUserLocation] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setCanShowUserLocation(status === 'granted');
    })();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setError('');
    setLoading(false);
    setSearchLoading(false);
    setSuggestions([]);
    setQuery('');
    setTab('search');
    sessionTokenRef.current = randomToken();
    coarseBiasRef.current = null;

    const hasSavedCoords =
      initialValue?.lat != null &&
      initialValue?.lng != null &&
      !Number.isNaN(Number(initialValue.lat)) &&
      !Number.isNaN(Number(initialValue.lng));

    openedWithSavedCoordsRef.current = hasSavedCoords;

    if (hasSavedCoords) {
      const latitude = Number(initialValue.lat);
      const longitude = Number(initialValue.lng);
      setMapRegion(regionAround(latitude, longitude, 0.02));
      setMarker({ latitude, longitude });
      coarseBiasRef.current = { lat: latitude, lng: longitude };
    } else {
      setMarker(null);
      setMapRegion(defaultIndiaMapRegion());
      (async () => {
        const approx = await getApproximateLatLng();
        if (!approx) return;
        coarseBiasRef.current = { lat: approx.lat, lng: approx.lng };
        setMapRegion(regionAround(approx.lat, approx.lng, 0.08));
      })();
    }

    setSelected(
      initialValue?.address
        ? {
            address: initialValue.address,
            pincode: initialValue.pincode || null,
            lat: initialValue.lat ?? null,
            lng: initialValue.lng ?? null,
            source: 'initial',
          }
        : null
    );
  }, [visible]);

  /** Map pin tab: zoom to device GPS when permission + location services on (skip if editing saved coords). */
  useEffect(() => {
    if (!visible || tab !== 'map') return;
    if (openedWithSavedCoordsRef.current) return;

    let cancelled = false;
    const run = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      const servicesOn = await Location.hasServicesEnabledAsync();
      if (!servicesOn || cancelled) return;
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          maximumAge: 12000,
        });
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        const region = regionAround(latitude, longitude, 0.004);
        setMapRegion(region);
        requestAnimationFrame(() => {
          mapRef.current?.animateToRegion(region, 550);
        });
      } catch (_) {
        /* keep IP-approximate or default region */
      }
    };
    const t = setTimeout(run, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [visible, tab]);

  const runAutocomplete = (text) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const q = String(text || '').trim();
      if (q.length < 2) {
        setSuggestions([]);
        setSearchLoading(false);
        return;
      }
      const bias = coarseBiasRef.current;
      try {
        setSearchLoading(true);
        setError('');
        const preds = await placesAutocomplete({
          input: q,
          sessionToken: sessionTokenRef.current,
          language: 'en',
          country: 'in',
          locationBiasLat: bias?.lat,
          locationBiasLng: bias?.lng,
          locationBiasRadiusM: 50000,
        });
        setSuggestions(preds);
      } catch (e) {
        setSuggestions([]);
        setError(e.message || 'Failed to search address');
      } finally {
        setSearchLoading(false);
      }
    }, 250);
  };

  const selectPrediction = async (prediction) => {
    try {
      setLoading(true);
      setError('');
      const placeId = prediction?.place_id;
      if (!placeId) throw new Error('Invalid place selection');
      const details = await placeDetails({
        placeId,
        sessionToken: sessionTokenRef.current,
        language: 'en',
      });
      const address = details?.formatted_address || prediction?.description || '';
      const loc = details?.geometry?.location;
      const lat = loc?.lat;
      const lng = loc?.lng;
      const pincode = extractPincodeFromAddressComponents(details?.address_components) || null;
      const next = { address, pincode, lat, lng, placeId, source: 'places' };
      setSelected(next);
      if (lat != null && lng != null) {
        setMapRegion((r) => ({
          ...r,
          latitude: Number(lat),
          longitude: Number(lng),
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }));
        setMarker({ latitude: Number(lat), longitude: Number(lng) });
      }
    } catch (e) {
      setError(e.message || 'Failed to fetch place details');
    } finally {
      setLoading(false);
    }
  };

  const reverseFromMarker = async (latitude, longitude, source = 'map') => {
    try {
      setLoading(true);
      setError('');
      const res = await reverseGeocode({ lat: latitude, lng: longitude, language: 'en' });
      const address = res?.formatted_address || '';
      const pincode = extractPincodeFromAddressComponents(res?.address_components) || null;
      setSelected({
        address,
        pincode,
        lat: latitude,
        lng: longitude,
        source,
      });
    } catch (e) {
      setError(e.message || 'Failed to resolve address');
    } finally {
      setLoading(false);
    }
  };

  const onMapPress = (e) => {
    const latitude = e?.nativeEvent?.coordinate?.latitude;
    const longitude = e?.nativeEvent?.coordinate?.longitude;
    if (latitude == null || longitude == null) return;
    setMarker({ latitude, longitude });
    setMapRegion((r) => ({ ...r, latitude, longitude }));
    reverseFromMarker(latitude, longitude, 'map');
  };

  const useMyLocation = async () => {
    try {
      setLoading(true);
      setError('');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error(t('postJob.gpsForCurrentLocation'));
      }
      setCanShowUserLocation(true);
      const servicesOn = await Location.hasServicesEnabledAsync();
      if (!servicesOn) {
        throw new Error(t('postJob.gpsForCurrentLocation'));
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 5000,
      });
      const latitude = pos?.coords?.latitude;
      const longitude = pos?.coords?.longitude;
      if (latitude == null || longitude == null) throw new Error('Unable to get current location');
      const region = regionAround(latitude, longitude, 0.004);
      setMarker({ latitude, longitude });
      setMapRegion(region);
      setTab('map');
      requestAnimationFrame(() => {
        mapRef.current?.animateToRegion(region, 550);
      });
      await reverseFromMarker(latitude, longitude, 'gps');
    } catch (e) {
      setError(e.message || 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const confirmSelection = () => {
    if (!selected?.address) {
      setError('Please select an address from the list or the map.');
      return;
    }
    if (!selected?.pincode) {
      setError('Pincode not found for this location. Please choose a more specific address.');
      return;
    }
    onSelect?.({
      address: selected.address,
      pincode: selected.pincode,
      lat: selected.lat ?? null,
      lng: selected.lng ?? null,
      placeId: selected.placeId ?? null,
      source: selected.source,
    });
    onClose?.();
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity onPress={() => selectPrediction(item)} style={styles.suggestionRow}>
      <Text style={styles.suggestionMain} numberOfLines={2}>
        {item?.structured_formatting?.main_text || item?.description || ''}
      </Text>
      {item?.structured_formatting?.secondary_text ? (
        <Text style={styles.suggestionSecondary} numberOfLines={2}>
          {item.structured_formatting.secondary_text}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  const sheetMargin = {
    marginTop: Math.max(insets.top, 12),
    marginBottom: Math.max(insets.bottom, 12),
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, sheetMargin]} pointerEvents="auto">
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select address</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => {
                  useMyLocation();
                }}
                disabled={loading}
                activeOpacity={0.7}
              >
                <MaterialIcons name="my-location" size={20} color={colors.primary.main} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn} onPress={onClose} disabled={loading}>
                <MaterialIcons name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'search' && styles.tabActive]}
              onPress={() => setTab('search')}
            >
              <Text style={[styles.tabText, tab === 'search' && styles.tabTextActive]}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'map' && styles.tabActive]}
              onPress={() => setTab('map')}
            >
              <Text style={[styles.tabText, tab === 'map' && styles.tabTextActive]}>Map pin</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {error ? (
              <Text style={[styles.hint, { color: colors.error.main, fontWeight: '700' }]}>
                {error}
              </Text>
            ) : null}

            {tab === 'search' ? (
              <>
                <View style={styles.searchBox}>
                  <MaterialIcons name="search" size={20} color={colors.text.secondary} />
                  <TextInput
                    value={query}
                    onChangeText={(text) => {
                      setQuery(text);
                      runAutocomplete(text);
                    }}
                    placeholder="Start typing address..."
                    placeholderTextColor={colors.text.muted}
                    style={styles.searchInput}
                    blurOnSubmit={false}
                    autoCorrect={false}
                  />
                  {searchLoading ? <ActivityIndicator size="small" color={colors.primary.main} /> : null}
                </View>
                <Text style={styles.hint}>
                  You must select an address from the dropdown (manual address is not allowed).
                </Text>

                <FlatList
                  data={suggestions}
                  keyExtractor={(it) => it.place_id}
                  renderItem={renderSuggestion}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                  style={{ marginTop: spacing.sm, maxHeight: 260 }}
                />
              </>
            ) : (
              <>
                <View style={styles.mapWrap}>
                  <MapView
                    ref={mapRef}
                    style={styles.map}
                    region={mapRegion}
                    onRegionChangeComplete={(r) => setMapRegion(r)}
                    onPress={onMapPress}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    toolbarEnabled={false}
                    showsUserLocation={canShowUserLocation}
                    showsMyLocationButton={false}
                  >
                    {marker ? (
                      <Marker
                        coordinate={marker}
                        draggable
                        onDragEnd={(e) => {
                          const latitude = e?.nativeEvent?.coordinate?.latitude;
                          const longitude = e?.nativeEvent?.coordinate?.longitude;
                          if (latitude == null || longitude == null) return;
                          setMarker({ latitude, longitude });
                          reverseFromMarker(latitude, longitude, 'map');
                        }}
                      />
                    ) : null}
                  </MapView>
                </View>
                <Text style={styles.mapHint}>
                  Tap the map to drop a pin. Drag the pin to fine-tune.
                </Text>
              </>
            )}

            {selected?.address ? (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle} numberOfLines={3}>
                  {selected.address}
                </Text>
                <Text style={styles.previewSub}>
                  Pincode: {selected.pincode || '—'} {selected.lat != null ? '· GPS saved' : ''}
                </Text>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary.main} />
                <Text style={styles.loadingText}>Verifying location…</Text>
              </View>
            ) : null}

            <View style={styles.ctaRow}>
              <TouchableOpacity style={styles.cta} onPress={onClose} disabled={loading}>
                <Text style={styles.ctaText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cta, styles.ctaPrimary]}
                onPress={confirmSelection}
                disabled={loading}
              >
                <Text style={[styles.ctaText, styles.ctaTextPrimary]}>Use this address</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}


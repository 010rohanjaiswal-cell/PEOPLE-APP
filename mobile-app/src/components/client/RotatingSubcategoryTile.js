/**
 * Rotating category tile — cycles Other sub-categories with fade in/out.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, Easing } from 'react-native';
import { iconForOtherSubcategory, OTHER_SUBCATEGORY_DEFAULT_ICON } from '../../constants/otherSubcategoryIcons';

const FADE_MS = 400;

export function shuffleSubcategories(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const RotatingSubcategoryTile = ({
  categories,
  slotIndex,
  active,
  holdMs,
  originalCategory,
  originalLabel,
  originalIconSrc,
  selectedLabel,
  onSelect,
  onSelectOriginal,
  styles,
}) => {
  const originalOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const [showRotatingContent, setShowRotatingContent] = useState(false);
  const [crossfadeDone, setCrossfadeDone] = useState(false);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);
  const effectGenerationRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const categoriesRef = useRef(categories);

  categoriesRef.current = categories;

  const safeLen = Math.max(categories.length, 1);
  const currentLabel = categories.length ? categories[index % safeLen] : '';
  const isOriginalSelected = selectedLabel === originalCategory;
  const isRotatingSelected = !!currentLabel && selectedLabel === currentLabel;
  const rotatingIconSrc = currentLabel ? iconForOtherSubcategory(currentLabel) : OTHER_SUBCATEGORY_DEFAULT_ICON;
  const isSelected = active && crossfadeDone ? isRotatingSelected : isOriginalSelected;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fadeTo = (anim, toValue, onDone) => {
    Animated.timing(anim, {
      toValue,
      duration: FADE_MS,
      easing: toValue ? Easing.out(Easing.ease) : Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !mountedRef.current) return;
      if (onDone) onDone();
    });
  };

  const fadeContentTo = (toValue, onDone) => fadeTo(contentOpacity, toValue, onDone);

  const startRotationInterval = (generation, holdDuration) => {
    intervalRef.current = setInterval(() => {
      if (
        !mountedRef.current ||
        effectGenerationRef.current !== generation ||
        isTransitioningRef.current
      ) {
        return;
      }

      isTransitioningRef.current = true;
      const lenNow = categoriesRef.current.length;
      if (!lenNow) {
        isTransitioningRef.current = false;
        return;
      }

      fadeContentTo(0, () => {
        if (!mountedRef.current || effectGenerationRef.current !== generation) {
          isTransitioningRef.current = false;
          return;
        }
        setIndex((prev) => (prev + 1) % lenNow);
        fadeContentTo(1, () => {
          isTransitioningRef.current = false;
        });
      });
    }, holdDuration + FADE_MS * 2);
  };

  useEffect(() => {
    const generation = effectGenerationRef.current + 1;
    effectGenerationRef.current = generation;
    isTransitioningRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!active || categories.length === 0) {
      setShowRotatingContent(false);
      setCrossfadeDone(false);
      originalOpacity.setValue(1);
      contentOpacity.setValue(0);
      return undefined;
    }

    const holdDuration = holdMs ?? 6000;
    const len = categories.length;

    setIndex((slotIndex + Math.floor(Math.random() * len)) % len);
    setShowRotatingContent(false);
    setCrossfadeDone(false);
    originalOpacity.setValue(1);
    contentOpacity.setValue(0);

    fadeTo(originalOpacity, 0, () => {
      if (!mountedRef.current || effectGenerationRef.current !== generation) return;

      setShowRotatingContent(true);
      fadeContentTo(1, () => {
        if (!mountedRef.current || effectGenerationRef.current !== generation) return;
        setCrossfadeDone(true);
        startRotationInterval(generation, holdDuration);
      });
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      originalOpacity.stopAnimation();
      contentOpacity.stopAnimation();
      isTransitioningRef.current = false;
    };
  }, [active, categories.length, slotIndex, holdMs, originalOpacity, contentOpacity]);

  const handlePress = () => {
    if (!active || !crossfadeDone) {
      onSelectOriginal(originalCategory);
      return;
    }
    if (currentLabel) onSelect(currentLabel);
  };

  return (
    <View style={styles.categoryTileWrap}>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.categoryTile, isSelected && styles.categoryTileSelected]}
        onPress={handlePress}
      >
        {showRotatingContent && categories.length > 0 ? (
          <Animated.View
            style={[styles.rotatingTileInner, styles.rotatingTileContentLayer, { opacity: contentOpacity }]}
            pointerEvents={crossfadeDone ? 'auto' : 'none'}
          >
            <Image source={rotatingIconSrc} style={styles.categoryTileIconImage} resizeMode="contain" />
            <Text style={styles.categoryTileLabel} numberOfLines={2}>
              {currentLabel}
            </Text>
          </Animated.View>
        ) : null}
        {!showRotatingContent ? (
          <Animated.View
            style={[styles.rotatingTileInner, active ? styles.rotatingTileOriginalLayer : null, { opacity: originalOpacity }]}
          >
            {originalIconSrc ? (
              <Image source={originalIconSrc} style={styles.categoryTileIconImage} resizeMode="contain" />
            ) : null}
            <Text style={styles.categoryTileLabel} numberOfLines={2}>
              {originalLabel}
            </Text>
          </Animated.View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

export default RotatingSubcategoryTile;

/**
 * LanguageContext - App language and translations
 * Persists selected locale (en/hi) per user by phone number (or user id).
 * Each phone number has its own saved language.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en';
import hi from '../locales/hi';
import { useAuth } from './AuthContext';

const LOCALE_KEY_PREFIX = '@people_app_locale';
const locales = { en, hi };
const defaultLocale = 'en';

function getUserIdentifier(user) {
  if (!user) return null;
  const phone = (user.phone || user.phoneNumber || '').toString().replace(/\D/g, '');
  if (phone) return `phone_${phone}`;
  const id = (user._id || user.id || '').toString();
  if (id) return `id_${id}`;
  return null;
}

function getLocaleStorageKey(user) {
  const id = getUserIdentifier(user);
  return id ? `${LOCALE_KEY_PREFIX}_${id}` : null;
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const { user } = useAuth();
  const [locale, setLocaleState] = useState(defaultLocale);
  const [ready, setReady] = useState(false);

  const storageKey = getLocaleStorageKey(user);

  // Load locale for current user when user changes (login/logout). Use default first to avoid showing previous user's locale.
  useEffect(() => {
    if (!storageKey) {
      setLocaleState(defaultLocale);
      setReady(true);
      return;
    }
    setLocaleState(defaultLocale);
    setReady(false);
    let cancelled = false;
    AsyncStorage.getItem(storageKey).then((stored) => {
      if (cancelled) return;
      if (stored && locales[stored]) {
        setLocaleState(stored);
      } else {
        setLocaleState(defaultLocale);
      }
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [storageKey]);

  const setLocale = useCallback((newLocale) => {
    if (!locales[newLocale]) return;
    const key = getLocaleStorageKey(user);
    setLocaleState(newLocale);
    if (key) AsyncStorage.setItem(key, newLocale);
  }, [user]);

  const t = useCallback((key) => {
    const keys = key.split('.');
    let value = locales[locale];
    for (const k of keys) {
      value = value?.[k];
    }
    return typeof value === 'string' ? value : key;
  }, [locale]);

  const value = { locale, setLocale, t, ready, locales: Object.keys(locales) };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export default LanguageContext;

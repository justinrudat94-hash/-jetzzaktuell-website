import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { Platform } from 'react-native';

import de from '../locales/de.json';
import en from '../locales/en.json';
import tr from '../locales/tr.json';

const LANGUAGE_KEY = '@app_language';

const resources = {
  de: { translation: de },
  en: { translation: en },
  tr: { translation: tr },
};

const getStoredLanguage = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(LANGUAGE_KEY);
    }
    return null;
  } else {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  }
};

const setStoredLanguage = async (language: string): Promise<void> => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(LANGUAGE_KEY, language);
    }
  } else {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  }
};

const getDefaultLanguage = (): string => {
  try {
    const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'de';
    return ['de', 'en', 'tr'].includes(deviceLanguage) ? deviceLanguage : 'de';
  } catch {
    return 'de';
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDefaultLanguage(),
    fallbackLng: 'de',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
  });

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  getStoredLanguage().then((savedLanguage) => {
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  });
}

export const changeLanguage = async (language: string) => {
  await setStoredLanguage(language);
  await i18n.changeLanguage(language);
};

export const getCurrentLanguage = () => i18n.language;

export default i18n;

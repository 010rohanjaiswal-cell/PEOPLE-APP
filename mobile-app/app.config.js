/**
 * Dynamic Expo config: injects Google Maps native API keys from env.
 * Required for react-native-maps (AIRMap) on Android/iOS — REST-only keys in JS are not enough.
 *
 * Set in mobile-app/.env before `npx expo run:android` / EAS build:
 *   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
 * Required for in-app Hindi translation (any language → Hindi via OpenAI):
 *   EXPO_PUBLIC_OPENAI_API_KEY=sk-...
 *
 * Uses `({ config })` so Expo merges `app.json` first and expo-doctor recognizes static config usage.
 * `config` here is the flattened Expo config (not `{ expo: ... }`).
 */
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
  const msg91WidgetId = process.env.EXPO_PUBLIC_MSG91_WIDGET_ID || '';
  const msg91AuthToken = process.env.EXPO_PUBLIC_MSG91_AUTH_TOKEN || '';

  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      openaiApiKey,
      msg91WidgetId,
      msg91AuthToken,
    },
    android: {
      ...config.android,
      config: {
        ...(config.android?.config || {}),
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...(config.ios?.config || {}),
        googleMapsApiKey: googleMapsApiKey,
      },
    },
  };
};

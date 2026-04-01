/**
 * Dynamic Expo config: injects Google Maps native API keys from env.
 * Required for react-native-maps (AIRMap) on Android/iOS — REST-only keys in JS are not enough.
 *
 * Set in mobile-app/.env before `npx expo run:android` / EAS build:
 *   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
 */
const appJson = require('./app.json');

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

module.exports = {
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      config: {
        ...(appJson.expo.android?.config || {}),
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    ios: {
      ...appJson.expo.ios,
      config: {
        ...(appJson.expo.ios?.config || {}),
        googleMapsApiKey: googleMapsApiKey,
      },
    },
  },
};

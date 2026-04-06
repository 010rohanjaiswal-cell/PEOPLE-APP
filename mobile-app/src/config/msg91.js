import Constants from 'expo-constants';

function readExtra(key) {
  return (
    Constants?.expoConfig?.extra?.[key] ??
    Constants?.manifest?.extra?.[key] ??
    undefined
  );
}

export const msg91WidgetId =
  process.env.EXPO_PUBLIC_MSG91_WIDGET_ID ||
  readExtra('msg91WidgetId') ||
  '';

export const msg91AuthToken =
  process.env.EXPO_PUBLIC_MSG91_AUTH_TOKEN ||
  readExtra('msg91AuthToken') ||
  '';

